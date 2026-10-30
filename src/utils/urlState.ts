import type { ParamValues } from '@/types/param'

/**
 * URL 状态编解码
 * 参数 JSON → deflate-raw → base64url，编码进 hash
 * 典型参数集约 400B 压缩后 → 约 540 字符 base64
 */

const PREFIX = '#p='

/** base64url 编码（UTF-8 安全） */
function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** base64url 解码 */
function fromBase64Url(b64: string): string {
  const norm = b64.replace(/-/g, '+').replace(/_/g, '/')
  const pad = norm + '='.repeat((4 - (norm.length % 4)) % 4)
  const bin = atob(pad)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

/** deflate-raw 压缩，不支持时返回 null */
async function deflateRaw(str: string): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null
  try {
    const cs = new CompressionStream('deflate-raw')
    const writer = cs.writable.getWriter()
    void writer.write(new TextEncoder().encode(str))
    void writer.close()
    const buf = await new Response(cs.readable).arrayBuffer()
    return new Uint8Array(buf)
  } catch {
    return null
  }
}

/** deflate-raw 解压 */
async function inflateRaw(bytes: Uint8Array): Promise<string | null> {
  if (typeof DecompressionStream === 'undefined') return null
  try {
    const ds = new DecompressionStream('deflate-raw')
    const writer = ds.writable.getWriter()
    void writer.write(bytes)
    void writer.close()
    const buf = await new Response(ds.readable).arrayBuffer()
    return new TextDecoder().decode(buf)
  } catch {
    return null
  }
}

/** 序列化状态 */
export interface ShareState {
  /** 参数值 */
  v: ParamValues
  /** 目标平台 */
  p?: string
  /** 详略级别 */
  l?: string
}

/** 编码为 hash 字符串（不含 #） */
export async function encodeState(state: ShareState): Promise<string> {
  const json = JSON.stringify(state)
  const packed = await deflateRaw(json)
  if (packed) {
    return 'z' + toBase64Url(String.fromCharCode(...packed))
  }
  return 'r' + toBase64Url(json)
}

/** 从 hash 解码，失败返回 null */
export async function decodeState(hash: string): Promise<ShareState | null> {
  if (!hash || !hash.startsWith(PREFIX)) return null
  const payload = hash.slice(PREFIX.length)
  const mode = payload.slice(0, 1)
  const data = payload.slice(1)

  try {
    if (mode === 'z') {
      const bin = fromBase64Url(data)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      const json = await inflateRaw(bytes)
      if (!json) return null
      return JSON.parse(json) as ShareState
    }
    if (mode === 'r') {
      return JSON.parse(fromBase64Url(data)) as ShareState
    }
  } catch {
    return null
  }
  return null
}

/** 写入地址栏（不产生历史记录） */
export async function writeState(state: ShareState): Promise<string> {
  const payload = await encodeState(state)
  const url = `${location.pathname}${location.search}${PREFIX}${payload}`
  history.replaceState(null, '', url)
  return url
}

/** 从当前地址栏读取 */
export async function readState(): Promise<ShareState | null> {
  return decodeState(location.hash)
}
