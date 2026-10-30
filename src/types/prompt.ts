import type { Token, Localized } from './param'
import type { TokenCategory } from './param'

export type { TokenCategory }

/** 提示词详略级别 */
export type Verbosity = 'concise' | 'standard' | 'verbose'

/** 目标平台 */
export type PlatformId = 'midjourney' | 'stableDiffusion' | 'jimeng' | 'kling' | 'veo'

export interface PlatformMeta {
  id: PlatformId
  label: Localized
  /** 该平台的输出风格：短语流 / 自然语言 / 结构化分块 / 连贯段落 */
  style: 'phrase' | 'natural' | 'structured' | 'prose'
  /** 正文长度上限（字符），超出时提示 */
  maxLength: number
  /** 是否支持负向提示词 */
  supportsNegative: boolean
}

/** 已解析的 token，携带溯源信息 */
export interface ResolvedToken extends Token {
  /** 产生该 token 的参数键 */
  source?: string
  /** 产生该 token 的参数显示值 */
  sourceValue?: string
  /** 冲突时被降级 */
  demoted?: boolean
}

/** 按语义分类分桶 */
export type TokenBuckets = Partial<Record<TokenCategory, ResolvedToken[]>>

/** 编译结果 */
export interface PromptCompileResult {
  tokens: ResolvedToken[]
  buckets: TokenBuckets
  /** 保真度统计 */
  fidelity: {
    high: number
    medium: number
    low: number
    /** 低保真度参数清单 */
    lowParams: { key: string; label: string; value: string }[]
  }
  /** 平台渲染后的正文 */
  render: PlatformRender
}

/** 平台渲染结果 */
export interface PlatformRender {
  /** 正文提示词 */
  body: string
  /** 负向提示词 */
  negative: string
  /** 平台参数后缀（MJ 的 --ar 等） */
  flags: string
  /** 技术参数块 */
  tech: string[]
  /** 字数统计 */
  length: number
}

/** 平台渲染器接口 */
export interface PlatformRenderer {
  meta: PlatformMeta
  /** 由分桶 token 渲染为平台输出 */
  render(buckets: TokenBuckets, verbosity: Verbosity): Omit<PlatformRender, 'length'> & { length: number }
}
