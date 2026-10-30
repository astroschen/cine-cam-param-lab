/** 颜色工具：sRGB ↔ linear，hex 解析 */

export interface RGB {
  r: number
  g: number
  b: number
}

/** hex (#rgb 或 #rrggbb) → sRGB 分量 0~1 */
export function hexToSrgb(hex: string): RGB {
  let h = hex.trim().replace('#', '')
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  }
  if (h.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(h)) {
    return { r: 0, g: 0, b: 0 }
  }
  const n = parseInt(h, 16)
  return {
    r: ((n >> 16) & 255) / 255,
    g: ((n >> 8) & 255) / 255,
    b: (n & 255) / 255,
  }
}

/** 单分量 sRGB → linear */
export function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

/** 单分量 linear → sRGB */
export function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055
}

/** hex → linear RGB 三元组 */
export function hexToLinear(hex: string): [number, number, number] {
  const { r, g, b } = hexToSrgb(hex)
  return [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)]
}

/** 判断是否为深色文字背景 */
export function isDark(hex: string): boolean {
  const { r, g, b } = hexToSrgb(hex)
  return (r * 299 + g * 587 + b * 114) / 1000 < 0.5
}
