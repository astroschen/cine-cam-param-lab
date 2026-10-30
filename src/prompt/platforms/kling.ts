import type { TokenBuckets, Verbosity, PlatformMeta } from '@/types/prompt'
import { pickCn, firstCn } from './types'

/**
 * 可灵（Kling）渲染器
 * 风格：中文结构化分块，用【】标签划分语义段
 * 语法要点：可灵对「镜头/画面/光影/风格」分块的识别度高于连贯散文；
 *          运镜与时长等视频参数单独标注
 */

export const klingMeta: PlatformMeta = {
  id: 'kling',
  label: { cn: '可灵', en: 'Kling' },
  style: 'structured',
  maxLength: 2000,
  supportsNegative: false,
}

export function renderKling(
  buckets: TokenBuckets,
  verbosity: Verbosity,
  tech: { focal: string; aperture: string; movement: string; intensity: number },
): { body: string; flags: string; techLines: string[] } {
  void verbosity
  const blocks: string[] = []

  // 【镜头】景别 + 镜头参数 + 运镜
  const shot = firstCn(buckets, 'shot')
  const lens = pickCn(buckets, 'lens')
  const comp = pickCn(buckets, 'composition')
  const motion = pickCn(buckets, 'motion')
  const shotBlock = [
    shot,
    lens.join('、'),
    comp.join('、'),
    tech.focal && tech.aperture ? `${tech.focal} ${tech.aperture}` : '',
  ]
    .filter(Boolean)
    .join('，')
  blocks.push(`【镜头】${shotBlock}，${motion.join('、') || tech.movement}`)

  // 【画面】氛围 + 时段 + 天气
  const atmo = pickCn(buckets, 'atmosphere')
  const atmosphereBlock = atmo.join('、')
  blocks.push(`【画面】${atmosphereBlock || '主体与环境'}`)

  // 【光影】光线 + 影调
  const light = pickCn(buckets, 'light')
  const tone = pickCn(buckets, 'tone')
  const lightBlock = [...light, ...tone].join('，')
  blocks.push(`【光影】${lightBlock}`)

  // 【风格】色彩 + 质感 + 风格标签
  const color = pickCn(buckets, 'color')
  const texture = pickCn(buckets, 'texture')
  const style = pickCn(buckets, 'style')
  const styleBlock = [...color, ...texture, ...style].join('，')
  blocks.push(`【风格】${styleBlock}`)

  const body = blocks.join('\n')

  const techLines = [
    `运镜 ${tech.movement}`,
    `幅度 ${tech.intensity}%`,
    '时长 5 秒',
    '帧率 30fps',
    '画幅 16:9',
  ]

  return { body, flags: '', techLines }
}
