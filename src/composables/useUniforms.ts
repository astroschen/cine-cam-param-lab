import { computed, type ComputedRef } from 'vue'
import type { ParamValues } from '@/types/param'
import { PARAM_SCHEMA } from '@/schema/params'
import { LOOK_ID } from '@/schema/looks'
import { hexToSrgb } from '@/utils/color'

/** 渲染器 uniform 集合 */
export interface Uniforms {
  // 曝光与白平衡
  exposure: number
  wbTemp: number
  wbTint: number
  nd: number
  // 影调
  contrast: number
  blacks: number
  whites: number
  rolloff: number
  shadowLift: number
  saturation: number
  vibrance: number
  // Look
  lookId: number
  lookMix: number
  splitShadow: [number, number, number]
  splitHighlight: [number, number, number]
  splitBalance: number
  splitAmount: number
  // 质感
  grain: number
  grainSize: number
  grainType: number
  bloom: number
  halation: number
  chroma: number
  sharpness: number
  dirt: number
  // 镜头
  aperture: number
  focal: number
  focusDist: number
  vignette: number
  bokehShape: number
  // 光
  softness: number
  exposureBias: number
  // 机身
  aspect: number
  sensorScale: number
  filmBack: number
}

const BOKEH_SHAPE_ID: Record<string, number> = {
  round: 0,
  oval: 1,
  catEye: 2,
  lemon: 3,
  hexagon: 4,
}

const GRAIN_TYPE_ID: Record<string, number> = {
  none: 0,
  film: 1,
  digital: 2,
}

const ASPECT_MAP: Record<string, number> = {
  '16:9': 16 / 9,
  '2.39:1': 2.39,
  '4:3': 4 / 3,
  '3:2': 3 / 2,
  '1:1': 1,
  '9:16': 9 / 16,
}

/** hex → sRGB 三元组（管线全程在 sRGB 空间运算） */
function srgbTriple(hex: string): [number, number, number] {
  const { r, g, b } = hexToSrgb(hex)
  return [r, g, b]
}

/**
 * 参数 → uniform
 * 与 docs/02-parameter-schema.md 第 5 节的映射表严格对应
 */
export function buildUniforms(values: ParamValues): Uniforms {
  const num = (key: string, fallback = 0): number => {
    const v = values[key]
    return typeof v === 'number' ? v : fallback
  }
  const str = (key: string, fallback = ''): string => {
    const v = values[key]
    return typeof v === 'string' ? v : fallback
  }

  // select 类型选项携带的 preset 覆写
  const presetOf = (key: string): Record<string, number | string> => {
    const p = PARAM_SCHEMA[key]
    if (p?.type !== 'select') return {}
    const v = values[key]
    const opt = p.options.find((o) => o.value === v)
    return opt?.preset ?? {}
  }
  const pick = (
    key: string,
    name: string,
    fallback: number,
  ): number => {
    const preset = presetOf(key)
    return name in preset ? Number(preset[name]) : fallback
  }

  const ev = num('exposure.ev', 0)
  const nd = num('exposure.nd', 0)

  return {
    // 曝光以 EV 档数传入，shader 内部再做 2^EV 换算
    exposure: ev - nd * 0.3,
    wbTemp: num('exposure.wbTemp', 5600) / 6500,
    wbTint: num('exposure.wbTint', 0) / 50,
    nd,

    contrast: num('tone.contrast', 0) / 100,
    blacks: num('tone.blacks', 0) / 100,
    whites: num('tone.whites', 0) / 100,
    rolloff: num('tone.highlightRolloff', 55) / 100,
    shadowLift: num('tone.shadowLift', 22) / 100,
    saturation: 1 + num('tone.saturation', 8) / 100,
    vibrance: 1 + num('tone.vibrance', 15) / 100,

    lookId: LOOK_ID[str('look.style', 'neutral')] ?? 0,
    lookMix: num('look.intensity', 70) / 100,
    splitShadow: srgbTriple(str('look.splitShadow', '#1a2a4a')),
    splitHighlight: srgbTriple(str('look.splitHighlight', '#ffd9a8')),
    splitBalance: num('look.splitBalance', 0) / 100,
    splitAmount: num('look.splitAmount', 35) / 100,

    grain: num('texture.grain', 28) / 100,
    grainSize: 1.5 + (num('texture.grainSize', 40) / 100) * 4.5,
    grainType: GRAIN_TYPE_ID[str('texture.grainType', 'film')] ?? 1,
    bloom: num('texture.bloom', 18) / 100,
    halation: num('texture.halation', 12) / 100,
    chroma: num('texture.chroma', 8) / 100,
    sharpness: num('texture.sharpness', 35) / 100,
    dirt: num('texture.dirt', 0) / 100,

    aperture: num('lens.aperture', 2.8),
    focal: num('lens.focalLength', 35) / 50,
    focusDist: num('lens.focusDistance', 3),
    vignette: num('lens.vignette', 25) / 100,
    bokehShape: BOKEH_SHAPE_ID[str('lens.bokehShape', 'round')] ?? 0,

    softness: pick('light.quality', 'softness', 0.6),
    exposureBias: pick('light.mood', 'exposureBias', 0),

    aspect: ASPECT_MAP[str('camera.aspect', '16:9')] ?? 16 / 9,
    sensorScale: pick('camera.sensor', 'sensorScale', 1),
    filmBack: values['camera.filmBack'] === true ? 1 : 0,
  }
}

/** 响应式 uniform 集合 */
export function useUniforms(values: ComputedRef<ParamValues> | (() => ParamValues)): ComputedRef<Uniforms> {
  return computed(() => buildUniforms(typeof values === 'function' ? values() : values.value))
}
