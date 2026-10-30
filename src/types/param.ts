/**
 * 参数体系类型定义
 * 与 docs/02-parameter-schema.md 严格对应
 */

export type GroupId =
  | 'camera'
  | 'lens'
  | 'exposure'
  | 'tone'
  | 'look'
  | 'texture'
  | 'lighting'
  | 'language'
  | 'atmosphere'
  | 'mood'

export type TokenCategory =
  | 'shot'
  | 'composition'
  | 'lens'
  | 'motion'
  | 'light'
  | 'color'
  | 'tone'
  | 'texture'
  | 'atmosphere'
  | 'style'
  | 'quality'
  | 'negative'

/** 语义分类的中文名（用于 UI 展示） */
export const TOKEN_CATEGORY_LABEL: Record<TokenCategory, string> = {
  shot: '主体',
  composition: '构图',
  lens: '镜头',
  motion: '运动',
  light: '光线',
  color: '色彩',
  tone: '影调',
  texture: '质感',
  atmosphere: '氛围',
  style: '风格',
  quality: '画质',
  negative: '负面',
}

export interface Localized {
  cn: string
  en: string
}

/** 提示词 token —— 参数与提示词之间的中间表示 */
export interface Token {
  cn: string
  en: string
  /** 语义强度 0~1，用于排序、去重与剪枝 */
  strength?: number
  category?: TokenCategory
}

/** 数值区间映射：参数落在区间内时产出这些 token */
export interface Segment {
  from: number
  to: number
  tokens: Token[]
}

/** 参数选项 */
export interface ParamOption {
  value: string
  label: Localized
  /** 选中该选项时注入的 token */
  tokens?: Token[]
  /** 渲染层的特殊处理标识，透传到 uniform */
  preset?: Record<string, number | string>
  /** 该选项的语义说明 */
  note?: Localized
}

/** uniform 绑定 */
export interface UniformBinding {
  name: string
  type: 'float' | 'int' | 'vec3'
  /** 由参数值换算到 uniform 的公式标识 */
  convert:
    | 'identity'
    | 'exposure'
    | 'wbTemp'
    | 'wbTint'
    | 'signed01'
    | 'signed2x'
    | 'unit01'
    | 'plus1'
    | 'focal'
    | 'grainSize'
    | 'bokehShape'
    | 'lookId'
    | 'grainType'
    | 'sensorScale'
    | 'aspect'
    | 'colorHex'
    | 'enum'
}

interface BaseParam {
  key: string
  label: Localized
  group: GroupId
  /** 参数的人类可读解释 */
  note: Localized
  /** 是否参与实时画面渲染 */
  preview: boolean
  /** 在提示词中的重要度 0~1，0 表示不进入提示词 */
  promptWeight: number
  bind?: UniformBinding
}

export interface RangeParam extends BaseParam {
  type: 'range'
  default: number
  min: number
  max: number
  step?: number
  unit?: string
  /** 对数刻度（光圈/快门/ISO/光比） */
  scale?: 'linear' | 'log'
  ticks?: { at: number; label: string }[]
  segments?: Segment[]
}

export interface SelectParam extends BaseParam {
  type: 'select'
  default: string
  options: ParamOption[]
}

export interface ToggleParam extends BaseParam {
  type: 'toggle'
  default: boolean
}

export interface TagSetParam extends BaseParam {
  type: 'tags'
  default: string[]
  options: ParamOption[]
}

/** 颜色参数：分离色调的阴影色 / 高光色 */
export interface ColorParam extends BaseParam {
  type: 'color'
  default: string
}

export type Param = RangeParam | SelectParam | ToggleParam | TagSetParam | ColorParam

export type ParamValue = number | string | boolean | string[]

/** 扁平键 → 参数定义 */
export type ParamSchema = Record<string, Param>

/** 扁平键 → 当前值 */
export type ParamValues = Record<string, ParamValue>

export interface ParamGroup {
  id: GroupId
  label: Localized
  order: number
}
