import type { ParamValues, Localized } from './param'

export interface Preset {
  id: string
  label: Localized
  /** 预设分组 */
  category: 'cinema' | 'night' | 'natural' | 'commercial' | 'documentary' | 'experimental'
  /** 一句描述 */
  description: Localized
  /** 参数覆盖值（扁平键） */
  values: ParamValues
  /** 推荐的目标平台 */
  recommended?: string
  /** 推荐的参数组合说明 */
  hint?: Localized
}
