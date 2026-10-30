import type { TokenBuckets, PlatformRenderer, PlatformMeta } from '@/types/prompt'
import type { TokenCategory } from '@/types/param'

export type { PlatformRenderer, PlatformMeta }
export type { TokenCategory }

/** 桶内 token 的英文文本列表 */
export function pick(buckets: TokenBuckets, ...cats: TokenCategory[]): string[] {
  const out: string[] = []
  for (const cat of cats) {
    const list = buckets[cat]
    if (!list) continue
    for (const t of list) out.push(t.en)
  }
  return out
}

/** 桶内 token 的中文文本列表 */
export function pickCn(buckets: TokenBuckets, ...cats: TokenCategory[]): string[] {
  const out: string[] = []
  for (const cat of cats) {
    const list = buckets[cat]
    if (!list) continue
    for (const t of list) out.push(t.cn)
  }
  return out
}

/** 用连接词拼接 */
export function joinWith(items: string[], sep = ', '): string {
  return items.filter(Boolean).join(sep)
}

/** 取桶内第一个 token 的英文 */
export function first(buckets: TokenBuckets, cat: TokenCategory): string | undefined {
  return buckets[cat]?.[0]?.en
}

/** 取桶内第一个 token 的中文 */
export function firstCn(buckets: TokenBuckets, cat: TokenCategory): string | undefined {
  return buckets[cat]?.[0]?.cn
}

/** 平台技术参数（MJ 的 --ar 等） */
export interface TechFlags {
  /** 画幅比例 */
  aspect?: string
  /** 风格化数值 */
  stylize?: number
  /** 版本号 */
  version?: string
  /** 额外标志 */
  extra?: string[]
}
