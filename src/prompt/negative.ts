import type { ParamValues } from '@/types/param'
import { PARAM_SCHEMA } from '@/schema/params'

/**
 * 负面提示词生成
 *
 * 语义方向（与 docs/05-prompt-engine.md 第 5.3 节一致）：
 * 负面词是**从参数反推出来的「不要出现的东西」**。
 * 例如把饱和度拉到 -60，就要抑制「oversaturated」；
 * 把颗粒设为 none，就要抑制「grain, noise」；
 * 而不是把这些词加进负面（加进去等于要求模型出现它们）。
 */

/** 通用负面词（所有平台共享的底线） */
const BASE_NEGATIVE = [
  'cartoon',
  'anime',
  'illustration',
  'painting',
  'sketch',
  '3d render',
  'cgi',
  'plastic skin',
  'watermark',
  'text',
  'logo',
  'signature',
  'blurry',
  'low resolution',
  'jpeg artifacts',
  'deformed hands',
  'extra fingers',
  'extra limbs',
  'disfigured',
  'bad anatomy',
  'cropped',
  'worst quality',
]

/**
 * 参数反推规则
 * add: 当条件命中时加入负面词（用户明确不要的效果）
 * suppress: 当条件命中时从负面词中移除（用户想要的效果，抑制了反而有害）
 */
interface NegativeRule {
  /** 触发条件 */
  when: (values: ParamValues) => boolean
  /** 追加的负面词 */
  add?: string[]
  /** 从负面词中移除的条目 */
  suppress?: string[]
  /** 规则的说明（展示在 UI 上） */
  reason: string
}

const RULES: NegativeRule[] = [
  // ── 饱和度 ──
  {
    when: (v) => Number(v['tone.saturation']) <= -30,
    add: ['oversaturated', 'vivid colors', 'saturated colors'],
    reason: '饱和度压到 -30 以下 → 抑制过饱和与艳丽',
  },
  {
    when: (v) => Number(v['tone.saturation']) >= 40,
    suppress: ['oversaturated', 'vivid colors', 'saturated colors'],
    reason: '饱和度拉高 → 不再抑制艳丽',
  },

  // ── 反差 ──
  {
    when: (v) => Number(v['tone.contrast']) >= 50,
    add: ['flat', 'low contrast', 'washed out', 'hazy'],
    reason: '反差拉到 50 以上 → 抑制平淡与灰雾',
  },
  {
    when: (v) => Number(v['tone.contrast']) <= -20,
    add: ['harsh contrast', 'crushed blacks', 'overly punchy'],
    reason: '反差压到 -20 以下 → 抑制过硬对比',
  },

  // ── 颗粒 ──
  {
    when: (v) => v['texture.grainType'] === 'none' || Number(v['texture.grain']) <= 10,
    add: ['grain', 'noise', 'film grain', 'dust'],
    reason: '颗粒设为无/极低 → 抑制颗粒与噪点',
  },
  {
    when: (v) => Number(v['texture.grain']) >= 30,
    add: ['digital noise', 'denoised', 'too smooth', 'plastic'],
    reason: '胶片颗粒拉高 → 抑制数码噪点与过度平滑',
  },

  // ── Look ──
  {
    when: (v) => v['look.style'] === 'bw' || v['look.style'] === 'sepia',
    add: ['color', 'colored', 'saturation', 'vivid colors', 'saturated colors'],
    reason: '选中黑白/棕调 Look → 抑制彩色与饱和',
  },
  {
    when: (v) => v['look.style'] === 'tealOrange' || v['look.style'] === 'technicolor',
    suppress: ['desaturated', 'muted colors', 'washed out', 'flat color'],
    reason: '选中青橙/三色彩 Look → 不抑制低饱和',
  },
  {
    when: (v) => v['look.style'] === 'kodak500t' || v['look.style'] === 'kodak250d',
    add: ['digital look', 'over-sharpened', 'crushed digital contrast'],
    reason: '选中胶片 Look → 抑制数码感',
  },

  // ── 曝光倾向 ──
  {
    when: (v) => v['light.mood'] === 'under',
    add: ['overexposed', 'bright flat lighting', 'washed out'],
    reason: '选中欠曝 → 抑制过曝',
  },
  {
    when: (v) => v['light.mood'] === 'over',
    add: ['underexposed', 'crushed shadows', 'muddy'],
    reason: '选中过曝 → 抑制欠曝',
  },

  // ── 光比与光位 ──
  {
    when: (v) => Number(v['light.ratio']) >= 8,
    add: ['flat lighting', 'even lighting', 'low key to fill ratio'],
    reason: '光比拉到 8:1 以上 → 抑制平光',
  },
  {
    when: (v) => v['light.direction'] === 'under',
    add: ['flat lighting', 'even lighting', 'top lighting'],
    reason: '选中底光 → 抑制平光与顶光',
  },

  // ── 景深 ──
  {
    when: (v) => Number(v['lens.aperture']) <= 2,
    add: ['everything in focus', 'deep focus', 'flat depth'],
    reason: '光圈收到 f/2 以内 → 抑制全景深',
  },
  {
    when: (v) => Number(v['lens.aperture']) >= 11,
    add: ['shallow depth of field', 'creamy bokeh', 'blurry foreground'],
    reason: '光圈开到 f/11 以上 → 抑制浅景深与奶油虚化',
  },

  // ── 空气介质 ──
  {
    when: (v) => v['atmosphere.haze'] === 'none',
    add: ['fog', 'haze', 'mist', 'smoky'],
    reason: '选中通透空气 → 抑制雾霾与烟',
  },
  {
    when: (v) => v['atmosphere.haze'] === 'denseFog' || v['atmosphere.haze'] === 'smoke',
    suppress: ['fog', 'haze', 'mist', 'smoky'],
    reason: '选中浓雾/烟雾 → 不抑制雾气',
  },

  // ── 运镜 ──
  {
    when: (v) => v['language.movement'] === 'static',
    add: ['motion blur', 'motion smear', 'camera shake'],
    reason: '选中固定机位 → 抑制运动模糊与抖动',
  },
  {
    when: (v) => v['language.movement'] !== 'static',
    suppress: ['motion blur', 'motion smear', 'camera shake'],
    reason: '选中运动镜头 → 不抑制运动模糊',
  },

  // ── 色差 ──
  {
    when: (v) => Number(v['texture.chroma']) <= 10,
    add: ['chromatic aberration', 'color fringing'],
    reason: '色差归零 → 抑制色散与紫边',
  },
]

/** 负向词库全集（用于「移除」时校验） */
const NEGATIVE_ORDER = [
  ...BASE_NEGATIVE,
  'oversaturated',
  'vivid colors',
  'saturated colors',
  'desaturated',
  'muted colors',
  'washed out',
  'flat color',
  'color',
  'colored',
  'saturation',
  'flat',
  'low contrast',
  'hazy',
  'harsh contrast',
  'crushed blacks',
  'overly punchy',
  'grain',
  'noise',
  'film grain',
  'dust',
  'digital noise',
  'denoised',
  'too smooth',
  'plastic',
  'digital look',
  'over-sharpened',
  'crushed digital contrast',
  'overexposed',
  'bright flat lighting',
  'underexposed',
  'crushed shadows',
  'muddy',
  'flat lighting',
  'even lighting',
  'low key to fill ratio',
  'top lighting',
  'everything in focus',
  'deep focus',
  'flat depth',
  'shallow depth of field',
  'creamy bokeh',
  'blurry foreground',
  'fog',
  'haze',
  'mist',
  'smoky',
  'motion blur',
  'motion smear',
  'camera shake',
  'chromatic aberration',
  'color fringing',
]

/** 生成负面词 */
export function buildNegative(values: ParamValues): { text: string; rules: string[] } {
  const added = new Set<string>()
  const suppressed = new Set<string>()
  const reasons: string[] = []

  for (const rule of RULES) {
    let triggered = false
    try {
      triggered = rule.when(values)
    } catch {
      triggered = false
    }
    if (!triggered) continue

    for (const word of rule.add ?? []) added.add(word)
    for (const word of rule.suppress ?? []) suppressed.add(word)
    reasons.push(rule.reason)
  }

  // 规则互斥时，「抑制」优先于「追加」
  for (const word of suppressed) added.delete(word)

  // 基础负面词按固定顺序输出，被规则抑制的移除
  const kept = BASE_NEGATIVE.filter((w) => !suppressed.has(w))

  // 追加词按 NEGATIVE_ORDER 稳定排序输出
  const extras = NEGATIVE_ORDER.filter((w) => added.has(w) && !kept.includes(w))

  return {
    text: [...kept, ...extras].join(', '),
    rules: reasons,
  }
}

/** 判断某参数是否参与负面词反推（用于 UI 提示） */
export function affectsNegative(key: string): boolean {
  if (key === 'look.style' || key === 'light.mood') return true
  const p = PARAM_SCHEMA[key]
  if (!p) return false
  return [
    'tone.contrast',
    'tone.saturation',
    'texture.grain',
    'texture.grainType',
    'texture.chroma',
    'light.ratio',
    'light.direction',
    'lens.aperture',
    'atmosphere.haze',
    'language.movement',
  ].includes(key)
}
