import type { PlatformId, PlatformMeta, TokenBuckets, Verbosity } from '@/types/prompt'
import type { ParamValues } from '@/types/param'
import { PARAM_SCHEMA, formatValue } from '@/schema/params'
import { midjourneyMeta, renderMidjourney } from './midjourney'
import { stableDiffusionMeta, renderStableDiffusion } from './stableDiffusion'
import { jimengMeta, renderJimeng } from './jimeng'
import { klingMeta, renderKling } from './kling'
import { veoMeta, renderVeo } from './veo'

export const PLATFORMS: Record<PlatformId, PlatformMeta> = {
  midjourney: midjourneyMeta,
  stableDiffusion: stableDiffusionMeta,
  jimeng: jimengMeta,
  kling: klingMeta,
  veo: veoMeta,
}

export const PLATFORM_ORDER: PlatformId[] = [
  'midjourney',
  'stableDiffusion',
  'jimeng',
  'kling',
  'veo',
]

/** 从参数中提取各平台需要的附加信息 */
export function platformTech(values: ParamValues) {
  const aspect = String(values['camera.aspect'] ?? '16:9')
  const focal = `${Math.round(Number(values['lens.focalLength'] ?? 35))}mm`
  const aperture = `f/${Number(values['lens.aperture'] ?? 2.8).toFixed(1)}`
  const movementValue = String(values['language.movement'] ?? 'static')
  const intensity = Math.round(Number(values['language.movementIntensity'] ?? 30))

  const movementLabel =
    PARAM_SCHEMA['language.movement']?.type === 'select'
      ? (PARAM_SCHEMA['language.movement'].options.find((o) => o.value === movementValue)?.label.cn ??
        '固定机位')
      : '固定机位'

  // MJ 的 --s 值随反差与胶片感上浮
  const stylize = Math.round(
    Math.min(
      1000,
      Math.max(
        50,
        150 +
          Math.max(0, Number(values['tone.contrast'] ?? 0)) * 3 +
          (values['look.style'] === 'neutral' ? 0 : 100),
      ),
    ),
  )

  return { aspect, focal, aperture, movement: movementLabel, intensity, stylize }
}

/**
 * 按平台渲染
 * 每个平台的输出结构完全不同，不是简单换皮
 */
export function renderForPlatform(
  platform: PlatformId,
  buckets: TokenBuckets,
  verbosity: Verbosity,
  values: ParamValues,
): { body: string; negative: string; flags: string; tech: string[]; length: number } {
  const tech = platformTech(values)

  let result: { body: string; flags: string; techLines: string[] }
  switch (platform) {
    case 'midjourney':
      result = renderMidjourney(buckets, verbosity, tech)
      break
    case 'stableDiffusion':
      result = renderStableDiffusion(buckets, verbosity, tech)
      break
    case 'jimeng':
      result = renderJimeng(buckets, verbosity, tech)
      break
    case 'kling':
      result = renderKling(buckets, verbosity, tech)
      break
    case 'veo':
      result = renderVeo(buckets, verbosity, tech)
      break
  }

  const full = result.flags ? `${result.body}\n${result.flags}` : result.body

  return {
    body: result.body,
    negative: '',
    flags: result.flags,
    tech: result.techLines,
    length: full.length,
  }
}

/** 描述参数的当前显示值（供溯源链使用） */
export function describeParam(key: string, values: ParamValues): string {
  return formatValue(key, values[key])
}
