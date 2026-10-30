/**
 * 16 种 Look 的色调曲线参数
 * 每种 Look 定义一组解析曲线参数，打包成 uniform 数组传入 shader，
 * 避免为每种 Look 编写独立 shader 分支。
 */

export interface LookParams {
  /** 标识 */
  id: number
  name: string
  /** RGB 三段 tone curve 的控制点（0~1，5 个点） */
  curve: [number, number, number, number, number][]
  /** 色相偏移（度） */
  hueShift: number
  /** 饱和度倍率 */
  saturation: number
  /** 高光偏色（RGB 增量） */
  highlightTint: [number, number, number]
  /** 阴影偏色（RGB 增量） */
  shadowTint: [number, number, number]
}

export const LOOKS: LookParams[] = [
  {
    id: 0,
    name: 'neutral',
    curve: [
      [0, 0.25, 0.5, 0.75, 1],
      [0, 0.25, 0.5, 0.75, 1],
      [0, 0.25, 0.5, 0.75, 1],
    ],
    hueShift: 0,
    saturation: 1,
    highlightTint: [0, 0, 0],
    shadowTint: [0, 0, 0],
  },
  {
    id: 1,
    name: 'kodak250d',
    curve: [
      [0, 0.18, 0.48, 0.8, 1],
      [0, 0.2, 0.5, 0.82, 1],
      [0, 0.24, 0.52, 0.78, 1],
    ],
    hueShift: 4,
    saturation: 1.06,
    highlightTint: [0.02, 0.01, -0.02],
    shadowTint: [0.01, 0, -0.01],
  },
  {
    id: 2,
    name: 'kodak500t',
    curve: [
      [0, 0.12, 0.44, 0.78, 1],
      [0, 0.14, 0.46, 0.8, 1],
      [0, 0.2, 0.5, 0.76, 1],
    ],
    hueShift: 6,
    saturation: 1.04,
    highlightTint: [0.03, 0.01, -0.02],
    shadowTint: [0.02, 0, -0.02],
  },
  {
    id: 3,
    name: 'fujiEterna',
    curve: [
      [0, 0.22, 0.48, 0.76, 1],
      [0, 0.24, 0.5, 0.78, 1],
      [0, 0.28, 0.52, 0.74, 1],
    ],
    hueShift: -4,
    saturation: 0.86,
    highlightTint: [-0.01, 0, 0.02],
    shadowTint: [-0.01, 0.005, 0.02],
  },
  {
    id: 4,
    name: 'fujiProNeg',
    curve: [
      [0, 0.28, 0.52, 0.76, 1],
      [0, 0.3, 0.53, 0.77, 1],
      [0, 0.33, 0.55, 0.74, 1],
    ],
    hueShift: 2,
    saturation: 0.9,
    highlightTint: [0.01, 0.005, 0],
    shadowTint: [0, 0, 0.01],
  },
  {
    id: 5,
    name: 'alexaLogC',
    curve: [
      [0, 0.32, 0.55, 0.74, 1],
      [0, 0.33, 0.56, 0.75, 1],
      [0, 0.35, 0.57, 0.73, 1],
    ],
    hueShift: 0,
    saturation: 0.82,
    highlightTint: [0, 0, 0],
    shadowTint: [0.005, 0.005, 0.008],
  },
  {
    id: 6,
    name: 'redLog3g10',
    curve: [
      [0, 0.2, 0.48, 0.82, 1],
      [0, 0.2, 0.47, 0.83, 1],
      [0, 0.2, 0.46, 0.84, 1],
    ],
    hueShift: 0,
    saturation: 1.1,
    highlightTint: [0.01, 0, -0.01],
    shadowTint: [0, 0, 0.005],
  },
  {
    id: 7,
    name: 'technicolor',
    curve: [
      [0, 0.12, 0.46, 0.84, 1],
      [0, 0.1, 0.44, 0.86, 1],
      [0, 0.16, 0.48, 0.8, 1],
    ],
    hueShift: 0,
    saturation: 1.25,
    highlightTint: [0.03, 0, -0.02],
    shadowTint: [-0.01, 0, 0.02],
  },
  {
    id: 8,
    name: 'bleachBypass',
    curve: [
      [0, 0.08, 0.42, 0.86, 1],
      [0, 0.09, 0.43, 0.85, 1],
      [0, 0.11, 0.44, 0.84, 1],
    ],
    hueShift: 0,
    saturation: 0.7,
    highlightTint: [0.01, 0.01, 0.01],
    shadowTint: [0.01, 0.01, 0.01],
  },
  {
    id: 9,
    name: 'crossProcess',
    curve: [
      [0, 0.16, 0.46, 0.8, 1],
      [0, 0.2, 0.5, 0.78, 1],
      [0, 0.3, 0.54, 0.72, 1],
    ],
    hueShift: -8,
    saturation: 1.15,
    highlightTint: [-0.02, 0.01, 0.03],
    shadowTint: [0.02, -0.01, -0.02],
  },
  {
    id: 10,
    name: 'bw',
    curve: [
      [0, 0.1, 0.46, 0.86, 1],
      [0, 0.1, 0.46, 0.86, 1],
      [0, 0.1, 0.46, 0.86, 1],
    ],
    hueShift: 0,
    saturation: 0,
    highlightTint: [0, 0, 0],
    shadowTint: [0, 0, 0],
  },
  {
    id: 11,
    name: 'sepia',
    curve: [
      [0, 0.14, 0.46, 0.82, 1],
      [0, 0.18, 0.48, 0.8, 1],
      [0, 0.28, 0.52, 0.74, 1],
    ],
    hueShift: 18,
    saturation: 0.55,
    highlightTint: [0.04, 0.02, -0.03],
    shadowTint: [0.02, 0, -0.02],
  },
  {
    id: 12,
    name: 'tealOrange',
    curve: [
      [0, 0.1, 0.44, 0.84, 1],
      [0, 0.13, 0.47, 0.82, 1],
      [0, 0.2, 0.52, 0.78, 1],
    ],
    hueShift: 0,
    saturation: 1.08,
    highlightTint: [0.04, 0.02, -0.03],
    shadowTint: [-0.03, 0.01, 0.04],
  },
  {
    id: 13,
    name: 'coldSteel',
    curve: [
      [0, 0.14, 0.46, 0.82, 1],
      [0, 0.15, 0.47, 0.83, 1],
      [0, 0.18, 0.5, 0.8, 1],
    ],
    hueShift: -6,
    saturation: 0.92,
    highlightTint: [-0.01, 0.005, 0.03],
    shadowTint: [-0.02, 0, 0.03],
  },
  {
    id: 14,
    name: 'warmNoir',
    curve: [
      [0, 0.06, 0.4, 0.88, 1],
      [0, 0.09, 0.43, 0.86, 1],
      [0, 0.16, 0.48, 0.8, 1],
    ],
    hueShift: 10,
    saturation: 0.75,
    highlightTint: [0.03, 0.015, -0.02],
    shadowTint: [0.02, 0, -0.015],
  },
  {
    id: 15,
    name: 'cyberpunk',
    curve: [
      [0, 0.08, 0.42, 0.86, 1],
      [0, 0.1, 0.44, 0.86, 1],
      [0, 0.14, 0.46, 0.82, 1],
    ],
    hueShift: -4,
    saturation: 1.22,
    highlightTint: [0.05, -0.02, 0.04],
    shadowTint: [-0.03, 0.02, 0.05],
  },
]

/** look value → id */
export const LOOK_ID: Record<string, number> = Object.fromEntries(
  LOOKS.map((l) => [l.name, l.id]),
)

/** 每种 Look 在 uniform 数组中占用的 float 数量 */
export const LOOK_STRIDE = 23

/**
 * 展平为 uniform 数组
 * 布局（每种 Look 23 个 float）：
 *   0        hueShift
 *   1        saturation
 *   2..4     highlightTint (rgb)
 *   5..7     shadowTint (rgb)
 *   8..12    R 曲线 5 控制点
 *   13..17   G 曲线 5 控制点
 *   18..22   B 曲线 5 控制点
 */
export function packLooks(): Float32Array {
  const out = new Float32Array(LOOKS.length * LOOK_STRIDE)
  LOOKS.forEach((l, i) => {
    const o = i * LOOK_STRIDE
    out[o] = l.hueShift
    out[o + 1] = l.saturation
    out[o + 2] = l.highlightTint[0]
    out[o + 3] = l.highlightTint[1]
    out[o + 4] = l.highlightTint[2]
    out[o + 5] = l.shadowTint[0]
    out[o + 6] = l.shadowTint[1]
    out[o + 7] = l.shadowTint[2]
    for (let ch = 0; ch < 3; ch++) {
      const curve = l.curve[ch]
      for (let p = 0; p < 5; p++) {
        out[o + 8 + ch * 5 + p] = curve[p] ?? 0
      }
    }
  })
  return out
}
