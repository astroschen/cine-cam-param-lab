import type { TokenBuckets, Verbosity, PlatformMeta } from '@/types/prompt'
import { pick, first } from './types'

/**
 * Veo 渲染器
 * 风格：英文连贯段落，句式完整，模拟自然语言描述
 * 语法要点：完整句子；镜头与光影用 because/creating 之类的连接；不堆砌短语
 */

export const veoMeta: PlatformMeta = {
  id: 'veo',
  label: { cn: 'Veo', en: 'Veo' },
  style: 'prose',
  maxLength: 2000,
  supportsNegative: false,
}

export function renderVeo(
  buckets: TokenBuckets,
  verbosity: Verbosity,
  tech: { focal: string; aperture: string },
): { body: string; flags: string; techLines: string[] } {
  const shot = first(buckets, 'shot')
  const comp = pick(buckets, 'composition')
  const lens = pick(buckets, 'lens')
  const motion = pick(buckets, 'motion')
  const light = pick(buckets, 'light')
  const color = pick(buckets, 'color')
  const tone = pick(buckets, 'tone')
  const texture = pick(buckets, 'texture')
  const atmo = pick(buckets, 'atmosphere')
  const style = pick(buckets, 'style')

  const sentences: string[] = []

  // 开头：景别 + 构图 + 氛围
  const opening = [shot, comp[0], atmo[0]].filter(Boolean).join(' ')
  sentences.push(`A ${opening} captures the scene.`)

  // 镜头与景深
  const dofWords = lens.filter((w) => /depth of field|bokeh/.test(w))
  const otherLens = lens.filter((w) => !/depth of field|bokeh/.test(w))
  const lensText = [...otherLens, ...dofWords].join(', ')
  if (tech.focal && tech.aperture) {
    sentences.push(
      lensText
        ? `The camera uses ${tech.focal} ${tech.aperture}, creating ${lensText}.`
        : `The camera uses ${tech.focal} ${tech.aperture}.`,
    )
  }

  // 运镜
  if (motion.length) {
    sentences.push(`The shot is captured with ${motion[0]}.`)
  }

  // 光线
  if (light.length) {
    sentences.push(`Lighting is ${light.join(', ')}.`)
  }

  // 影调与色彩
  const grade = [...color, ...tone]
  if (grade.length) {
    sentences.push(`The grade evokes ${grade.join(', ')}.`)
  }

  // 质感
  if (texture.length) {
    sentences.push(`Finishing touches include ${texture.join(', ')}.`)
  }

  // 风格
  if (style.length) {
    sentences.push(`Overall mood: ${style.join(', ')}.`)
  }

  let body = sentences.join(' ')

  if (verbosity === 'verbose') {
    const quality = pick(buckets, 'quality')
    if (quality.length) body += ` ${quality.join(', ')}.`
  }

  const techLines = [
    '时长 8 秒',
    '画幅 16:9',
    '分辨率 1080p',
    '音频生成 关闭',
    '完整句子，无权重语法',
  ]

  return { body, flags: '', techLines }
}
