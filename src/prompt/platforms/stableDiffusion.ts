import type { TokenBuckets, Verbosity, PlatformMeta } from '@/types/prompt'
import { pick, joinWith, first } from './types'

/**
 * Stable Diffusion 渲染器
 * 风格：英文逗号分隔 + 括号权重语法
 * 语法要点：(keyword:1.3) 提升权重；negative prompt 单独字段
 */

export const stableDiffusionMeta: PlatformMeta = {
  id: 'stableDiffusion',
  label: { cn: 'Stable Diffusion', en: 'Stable Diffusion' },
  style: 'phrase',
  maxLength: 3000,
  supportsNegative: true,
}

/** 关键 token → 权重 */
const WEIGHTS: { match: RegExp; weight: number }[] = [
  { match: /cinematic|filmic|medium shot|close-up|wide/i, weight: 1.3 },
  { match: /depth of field|bokeh/i, weight: 1.3 },
  { match: /\d+mm|f\/\d/i, weight: 1.2 },
  { match: /rim lighting|backlit|neon/i, weight: 1.2 },
  { match: /film grain|grain/i, weight: 1.1 },
  { match: /halation|bloom/i, weight: 1.1 },
]

/** 给 token 加权 */
function weightize(text: string): string {
  for (const rule of WEIGHTS) {
    if (rule.match.test(text)) {
      const w = Math.round(rule.weight * 10) / 10
      return `(${text}:${w})`
    }
  }
  return text
}

export function renderStableDiffusion(
  buckets: TokenBuckets,
  verbosity: Verbosity,
  tech: { focal: string; aperture: string },
): { body: string; flags: string; techLines: string[] } {
  const parts: string[] = []

  const shot = first(buckets, 'shot')
  if (shot) parts.push(shot)

  parts.push(...pick(buckets, 'composition'))
  parts.push(...pick(buckets, 'lens'))

  // 精确光学参数，SD 对括号数字语法响应好
  // 注意：此处只推原文，加权统一在末尾的 parts.map 中完成，避免双重包裹
  if (tech.focal && tech.aperture) {
    parts.push(`${tech.focal} ${tech.aperture}`)
  }

  parts.push(...pick(buckets, 'motion'))
  parts.push(...pick(buckets, 'light'))
  parts.push(...pick(buckets, 'color'))
  parts.push(...pick(buckets, 'tone'))
  parts.push(...pick(buckets, 'texture'))
  parts.push(...pick(buckets, 'atmosphere'))
  parts.push(...pick(buckets, 'style'))

  if (verbosity === 'verbose') parts.push(...pick(buckets, 'quality'))

  const weighted = parts.map((p) => (verbosity === 'concise' ? p : weightize(p)))
  const body = joinWith(weighted)

  const techLines = [
    'CFG 7',
    'Steps 30',
    'Sampler DPM++ 2M Karras',
    verbosity === 'concise' ? '无权重语法' : '括号权重语法 (kw:1.3)',
  ]

  return { body, flags: '', techLines }
}
