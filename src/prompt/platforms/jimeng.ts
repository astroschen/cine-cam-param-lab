import type { TokenBuckets, Verbosity, PlatformMeta } from '@/types/prompt'
import { pickCn, firstCn } from './types'

/**
 * 即梦（Dreamina）渲染器
 * 风格：中文自然语言长句，带逗号与顿号的段落
 * 语法要点：中文描述优先，避免英文；语义顺序为「主体 → 环境 → 光影 → 风格」
 */

export const jimengMeta: PlatformMeta = {
  id: 'jimeng',
  label: { cn: '即梦', en: 'Dreamina' },
  style: 'natural',
  maxLength: 2000,
  supportsNegative: false,
}

export function renderJimeng(
  buckets: TokenBuckets,
  verbosity: Verbosity,
  tech: { focal: string; aperture: string },
): { body: string; flags: string; techLines: string[] } {
  const sentences: string[] = []

  // 主体：景别 + 风格
  const shot = firstCn(buckets, 'shot')
  const style = pickCn(buckets, 'style')
  if (shot) {
    sentences.push(`${style.length ? style.join('、') : '电影感'}${shot}，`)
  } else if (style.length) {
    sentences.push(`${style.join('、')}，`)
  }

  // 镜头语言
  const lens = pickCn(buckets, 'lens')
  const comp = pickCn(buckets, 'composition')
  const motion = pickCn(buckets, 'motion')
  const lensText = [...lens, ...comp].join('、')
  if (lensText) sentences.push(`${lensText}。`)

  // 精确光学参数（中文平台用毫米 + 光圈中文表述）
  if (tech.focal && tech.aperture) {
    sentences.push(`使用 ${tech.focal} 焦段、${tech.aperture} 光圈拍摄。`)
  }

  if (motion.length) sentences.push(`${motion.join('、')}。`)

  // 环境与氛围
  const atmo = pickCn(buckets, 'atmosphere')
  if (atmo.length) sentences.push(`${atmo.join('、')}。`)

  // 光影
  const light = pickCn(buckets, 'light')
  if (light.length) sentences.push(`${light.join('、')}。`)

  // 影调与色彩
  const color = pickCn(buckets, 'color')
  const tone = pickCn(buckets, 'tone')
  const grade = [...color, ...tone].join('、')
  if (grade) sentences.push(`${grade}。`)

  // 质感
  const texture = pickCn(buckets, 'texture')
  if (texture.length) sentences.push(`${texture.join('、')}。`)

  // 画质（仅详尽）
  if (verbosity === 'verbose') {
    const quality = pickCn(buckets, 'quality')
    if (quality.length) sentences.push(`${quality.join('、')}。`)
  }

  const body = sentences.join('').replace(/，$/, '。')

  const techLines = [
    '画面比例 16:9',
    '模型 图片生成 v3',
    '精细度 中等',
    '中文自然语言，无权重语法',
  ]

  return { body, flags: '', techLines }
}
