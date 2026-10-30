/** 数值工具：对数刻度、插值、钳制 */

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}

/** 对数刻度：把真实值映射到 0~1 的滑块位置 */
export function logScale(value: number, min: number, max: number): number {
  if (min <= 0) return (value - min) / (max - min)
  return (Math.log(value) - Math.log(min)) / (Math.log(max) - Math.log(min))
}

/** 对数刻度的逆运算：把滑块位置映射回真实值 */
export function logUnscale(t: number, min: number, max: number): number {
  if (min <= 0) return min + (max - min) * t
  return min * Math.pow(max / min, t)
}

/** 线性插值 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** 平滑步进 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

/** 保留指定小数位 */
export function round(v: number, digits = 0): number {
  const f = 10 ** digits
  return Math.round(v * f) / f
}

/** 是否为对数刻度参数 */
export function isLogScale(min: number, max: number): boolean {
  return min > 0 && max / min > 50
}

/** 生成 id */
let idCounter = 0
export function nextId(prefix = 'id'): string {
  idCounter += 1
  return `${prefix}-${idCounter}`
}
