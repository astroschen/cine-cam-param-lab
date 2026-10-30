import type { ParamValues, Token, TokenCategory } from '@/types/param'
import type {
  ResolvedToken,
  TokenBuckets,
  PromptCompileResult,
  Verbosity,
} from '@/types/prompt'
import { PARAM_SCHEMA, isLowFidelity, formatValue } from '@/schema/params'

/**
 * 提示词编译核心
 * 参数 → 逐项求值 → 冲突消解 → 分类分桶 → 平台渲染
 */

/** 分类分桶的顺序（决定平台输出的语句顺序） */
export const BUCKET_ORDER: TokenCategory[] = [
  'shot',
  'composition',
  'lens',
  'motion',
  'light',
  'color',
  'tone',
  'texture',
  'atmosphere',
  'style',
  'quality',
]

/**
 * 冲突消解规则
 * 同一语义槽位内互斥的 token 只保留优先级最高的一个。
 * 冲突标识直接用 token 的英文文本（en），因为英文文本是跨平台通用的唯一标识。
 */
const CONFLICT_GROUPS: { id: string; entries: { en: string; priority: number }[] }[] = [
  {
    // 焦段语义槽：焦距区段（精确值）优先于镜头性格/视野宽度（粗略分类）
    id: 'focalFamily',
    entries: [
      { en: 'ultra wide lens, exaggerated perspective', priority: 4 },
      { en: 'wide lens, natural perspective', priority: 4 },
      { en: 'standard lens, natural perspective', priority: 4 },
      { en: 'telephoto compression', priority: 4 },
      { en: 'long lens compression, flattened background', priority: 4 },
      { en: 'extreme telephoto, subject isolation', priority: 4 },
    ],
  },
  {
    id: 'temperature',
    entries: [
      { en: 'cold steel blue grade, clinical cool tones', priority: 4 },
      { en: 'warm film noir, amber shadows', priority: 4 },
      { en: 'Fuji Eterna cinematic look, cool muted palette', priority: 4 },
      { en: 'warm tones', priority: 3 },
      { en: 'cool blue tones', priority: 3 },
      { en: 'slightly warm tones', priority: 3 },
      { en: 'neutral white balance', priority: 2 },
      { en: 'warm, comforting', priority: 1 },
      { en: 'cold, detached, austere', priority: 1 },
    ],
  },
  {
    id: 'contrast',
    entries: [
      { en: 'bleach bypass, silver retained high contrast', priority: 4 },
      { en: 'high contrast, punchy', priority: 3 },
      { en: 'low contrast, flat soft tonality', priority: 3 },
    ],
  },
  {
    id: 'saturation',
    entries: [
      { en: 'black and white, silver gelatin, high monochrome contrast', priority: 5 },
      { en: 'Technicolor three-strip, saturated primaries', priority: 4 },
      { en: 'rich saturated colors', priority: 3 },
      { en: 'desaturated, muted faded colors', priority: 3 },
    ],
  },
  {
    id: 'depth',
    entries: [
      { en: 'ultra shallow depth of field, creamy bokeh', priority: 3 },
      { en: 'shallow depth of field, soft background', priority: 3 },
      { en: 'moderate depth of field', priority: 2 },
      { en: 'deep focus, everything sharp', priority: 3 },
    ],
  },
  {
    id: 'motionBlur',
    entries: [
      { en: 'frozen motion, crisp freeze frame', priority: 3 },
      { en: 'subtle motion blur', priority: 3 },
      { en: 'natural cinematic motion blur', priority: 3 },
      { en: 'motion smear, dynamic blur', priority: 3 },
    ],
  },
  {
    id: 'grain',
    entries: [
      { en: 'digital sensor noise', priority: 3 },
      { en: 'heavy analog film grain', priority: 3 },
      { en: 'pristine clean, noise-free', priority: 3 },
      { en: 'fine film grain', priority: 2 },
    ],
  },
  {
    id: 'bokeh',
    entries: [
      { en: 'oval bokeh', priority: 4 },
      { en: 'cat-eye bokeh', priority: 3 },
      { en: 'round bokeh', priority: 3 },
    ],
  },
]

/** 从参数的 segments 中求出该参数当前生效的 token */
function tokensForRange(key: string, value: number): Token[] {
  const p = PARAM_SCHEMA[key]
  if (p.type !== 'range' || !p.segments) return []
  const out: Token[] = []
  for (const s of p.segments) {
    if (value >= s.from && value <= s.to) out.push(...s.tokens)
  }
  return out
}

/** 收集所有参数产生的 token */
function collectTokens(values: ParamValues): ResolvedToken[] {
  const out: ResolvedToken[] = []

  for (const [key, value] of Object.entries(values)) {
    const p = PARAM_SCHEMA[key]
    if (!p || p.promptWeight <= 0) continue

    let tokens: Token[] = []

    if (p.type === 'range') {
      tokens = tokensForRange(key, Number(value))
    } else if (p.type === 'select') {
      const opt = p.options.find((o) => o.value === value)
      tokens = opt?.tokens ?? []
    } else if (p.type === 'tags') {
      const arr = value as string[]
      for (const tag of arr) {
        const opt = p.options.find((o) => o.value === tag)
        if (opt?.tokens) tokens.push(...opt.tokens)
      }
    }
    // toggle 与 color 不产生 token（胶片背板已在 look 参数中体现）

    for (const token of tokens) {
      out.push({
        ...token,
        strength: token.strength ?? 1,
        source: key,
        sourceValue: formatValue(key, value),
      })
    }
  }

  return out
}

/**
 * 去重与冲突消解
 * 规则：同英文文本的 token 合并（保留 strength 最高者）；
 * 互斥冲突组内只保留优先级最高者，其余标记为 demoted
 */
export function resolveTokens(tokens: ResolvedToken[]): ResolvedToken[] {
  // 1. 英文文本完全相同的合并，保留 strength 最大与最可靠的 source
  const byText = new Map<string, ResolvedToken>()
  for (const token of tokens) {
    const key = token.en.toLowerCase()
    const exist = byText.get(key)
    if (!exist) {
      byText.set(key, { ...token })
    } else if ((token.strength ?? 1) > (exist.strength ?? 1)) {
      byText.set(key, { ...token })
    }
  }

  const merged = [...byText.values()]

  // 2. 冲突组消解
  for (const group of CONFLICT_GROUPS) {
    const present = merged.filter((t) => group.entries.some((e) => e.en === t.en))
    if (present.length <= 1) continue

    // 计算每个候选的优先级：参数来源优先于 mood 标签，Look 优先于其他参数
    const scored = present.map((t) => {
      const entry = group.entries.find((e) => e.en === t.en)
      let priority = entry?.priority ?? 1
      if (t.source === 'mood.tags') priority -= 0.5
      if (t.source === 'look.style') priority += 0.5
      // 焦段槽：精确焦距 > 镜头性格 > 视野宽度
      if (group.id === 'focalFamily') {
        if (t.source === 'lens.focalLength') priority += 1
        else if (t.source === 'lens.lensType') priority += 0.5
        else if (t.source === 'language.fov') priority += 0
      }
      return { t, priority }
    })

    scored.sort((a, b) => b.priority - a.priority)
    for (const s of scored.slice(1)) {
      const idx = merged.findIndex((m) => m === s.t)
      if (idx >= 0) merged[idx] = { ...s.t, demoted: true }
    }
  }

  return merged
}

/** 按分类分桶 */
export function bucketTokens(tokens: ResolvedToken[]): TokenBuckets {
  const buckets: TokenBuckets = {}
  for (const token of tokens) {
    if (token.demoted) continue
    const cat: TokenCategory = token.category ?? 'style'
    if (!buckets[cat]) buckets[cat] = []
    buckets[cat]!.push(token)
  }
  // 每个桶内按 strength 降序
  for (const key of Object.keys(buckets) as TokenCategory[]) {
    const list = buckets[key]
    if (list) list.sort((a, b) => (b.strength ?? 1) - (a.strength ?? 1))
  }
  return buckets
}

/** 计算保真度统计 */
export function computeFidelity(values: ParamValues): PromptCompileResult['fidelity'] {
  let high = 0
  let medium = 0
  let low = 0
  const lowParams: { key: string; label: string; value: string }[] = []

  for (const [key, value] of Object.entries(values)) {
    const p = PARAM_SCHEMA[key]
    if (!p || p.promptWeight <= 0) continue

    if (isLowFidelity(key)) {
      low += 1
      lowParams.push({ key, label: p.label.cn, value: formatValue(key, value) })
    } else if (p.promptWeight >= 0.6) {
      high += 1
    } else {
      medium += 1
    }
  }

  const total = high + medium + low || 1
  return {
    high: Math.round((high / total) * 100),
    medium: Math.round((medium / total) * 100),
    low: Math.round((low / total) * 100),
    lowParams,
  }
}

/** 详略级别对应的 token 剪枝阈值 */
const STRENGTH_THRESHOLD: Record<Verbosity, number> = {
  concise: 0.55,
  standard: 0.3,
  verbose: 0,
}

/** 按详略级别剪枝 token */
export function pruneByVerbosity(buckets: TokenBuckets, verbosity: Verbosity): TokenBuckets {
  const threshold = STRENGTH_THRESHOLD[verbosity]
  if (threshold <= 0) return buckets

  const out: TokenBuckets = {}
  for (const key of Object.keys(buckets) as TokenCategory[]) {
    const list = buckets[key]
    if (!list) continue
    const kept = list.filter((t) => (t.strength ?? 1) >= threshold)
    if (kept.length) out[key] = kept
  }
  // 主体与构图是提示词骨架，任何详略级别都保留
  for (const cat of ['shot', 'composition'] as TokenCategory[]) {
    if (!out[cat] && buckets[cat]) out[cat] = buckets[cat]!.slice(0, 1)
  }
  return out
}

/** 编译入口：参数 → token 集合（不含平台渲染） */
export function compileTokens(values: ParamValues): {
  tokens: ResolvedToken[]
  buckets: TokenBuckets
  fidelity: PromptCompileResult['fidelity']
} {
  const raw = collectTokens(values)
  const resolved = resolveTokens(raw)
  const buckets = bucketTokens(resolved)
  return { tokens: resolved, buckets, fidelity: computeFidelity(values) }
}
