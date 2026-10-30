import type { TokenBuckets, Verbosity, PlatformMeta } from '@/types/prompt'
import { pick, joinWith, first, firstCn } from './types'

/**
 * Midjourney 渲染器
 * 风格：英文短语流，以逗号分隔，尾部接 --参数
 * 语法要点：短语而非句子；参数后缀不参与语义；权重用 :: 分隔
 */

export const midjourneyMeta: PlatformMeta = {
  id: 'midjourney',
  label: { cn: 'Midjourney', en: 'Midjourney' },
  style: 'phrase',
  maxLength: 4000,
  supportsNegative: false,
}

/** 画幅 → MJ 的 --ar 值 */
export const ASPECT_MJ: Record<string, string> = {
  '16:9': '16:9',
  '2.39:1': '21:9',
  '4:3': '4:3',
  '3:2': '3:2',
  '1:1': '1:1',
  '9:16': '9:16',
}

export function renderMidjourney(
  buckets: TokenBuckets,
  verbosity: Verbosity,
  tech: { aspect: string; stylize: number; focal: string; aperture: string },
): { body: string; flags: string; techLines: string[] } {
  const parts: string[] = []

  // 景别 + 主体（MJ 惯例：景别紧跟主体描述）
  const shot = first(buckets, 'shot')
  if (shot) parts.push(shot)

  // 构图
  parts.push(...pick(buckets, 'composition'))

  // 镜头与景深
  const lens = pick(buckets, 'lens')
  // 景深类放在镜头类之后，用 "with" 连接更自然
  const dofWords = lens.filter((w) => /depth of field|bokeh/.test(w))
  const otherLens = lens.filter((w) => !/depth of field|bokeh/.test(w))
  parts.push(...otherLens)
  if (dofWords.length) parts.push(...dofWords)

  // 精确光学参数（焦距 + 光圈），MJ 对数字光学参数响应好
  if (tech.focal && tech.aperture) parts.push(`${tech.focal} ${tech.aperture}`)

  // 运镜
  parts.push(...pick(buckets, 'motion'))

  // 光线
  parts.push(...pick(buckets, 'light'))

  // 色彩与影调
  parts.push(...pick(buckets, 'color'))
  parts.push(...pick(buckets, 'tone'))

  // 质感
  parts.push(...pick(buckets, 'texture'))

  // 氛围
  parts.push(...pick(buckets, 'atmosphere'))

  // 风格
  parts.push(...pick(buckets, 'style'))

  // 画质（仅详尽级别）
  if (verbosity === 'verbose') parts.push(...pick(buckets, 'quality'))

  const body = joinWith(parts)

  const flags: string[] = []
  const aspect = ASPECT_MJ[tech.aspect] ?? '16:9'
  flags.push(`--ar ${aspect}`)
  flags.push('--style raw')
  flags.push(`--s ${tech.stylize}`)
  flags.push('--v 7')

  const techLines = [`--ar ${aspect}`, '--style raw', `--s ${tech.stylize}`, '--v 7']

  return { body, flags: flags.join(' '), techLines }
}

/** 用于 UI 展示的中文对照 */
export function midjourneyChineseHint(buckets: TokenBuckets): string {
  const shot = firstCn(buckets, 'shot')
  const light = firstCn(buckets, 'light')
  return [shot, light].filter(Boolean).join(' · ')
}
