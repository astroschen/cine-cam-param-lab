/** 内置程序化测试场景：用户不导入图片也能体验完整流程 */

export interface Scene {
  id: string
  label: { cn: string; en: string }
  width: number
  height: number
  render: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
}

/** 夜景霓虹街道 */
const neonStreet: Scene = {
  id: 'neon',
  label: { cn: '夜景霓虹', en: 'Neon night' },
  width: 1280,
  height: 720,
  render: (ctx, w, h) => {
    // 天空
    const sky = ctx.createLinearGradient(0, 0, 0, h)
    sky.addColorStop(0, '#0a1626')
    sky.addColorStop(0.42, '#16283f')
    sky.addColorStop(0.68, '#241a2b')
    sky.addColorStop(1, '#120d16')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, w, h)

    // 月亮
    const moon = ctx.createRadialGradient(w * 0.82, h * 0.16, 4, w * 0.82, h * 0.16, 70)
    moon.addColorStop(0, 'rgba(255,233,192,0.95)')
    moon.addColorStop(0.35, 'rgba(255,220,170,0.28)')
    moon.addColorStop(1, 'rgba(255,220,170,0)')
    ctx.fillStyle = moon
    ctx.fillRect(0, 0, w, h)

    // 建筑剪影
    const horizon = h * 0.62
    ctx.fillStyle = '#0b1119'
    let x = 0
    let seed = 7
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }
    while (x < w) {
      const bw = 40 + rand() * 90
      const bh = 120 + rand() * 280
      ctx.fillRect(x, horizon - bh, bw, bh)
      // 窗户
      ctx.fillStyle = 'rgba(255,214,140,0.55)'
      for (let wy = horizon - bh + 14; wy < horizon - 20; wy += 26) {
        for (let wx = x + 8; wx < x + bw - 10; wx += 18) {
          if (rand() > 0.62) ctx.fillRect(wx, wy, 7, 11)
        }
      }
      ctx.fillStyle = '#0b1119'
      x += bw + 6
    }

    // 街道
    const street = ctx.createLinearGradient(0, horizon, 0, h)
    street.addColorStop(0, '#171320')
    street.addColorStop(0.55, '#221a26')
    street.addColorStop(1, '#0d0a12')
    ctx.fillStyle = street
    ctx.fillRect(0, horizon, w, h - horizon)

    // 霓虹招牌
    const signs: [number, number, number, string][] = [
      [w * 0.08, h * 0.44, 110, '#ff4d7e'],
      [w * 0.25, h * 0.38, 68, '#4fd1c5'],
      [w * 0.76, h * 0.41, 88, '#ffa63d'],
    ]
    for (const [sx, sy, sw, color] of signs) {
      ctx.save()
      ctx.shadowColor = color
      ctx.shadowBlur = 34
      ctx.fillStyle = color
      ctx.fillRect(sx, sy, sw, 14)
      ctx.restore()
    }

    // 湿地反射
    ctx.save()
    ctx.globalAlpha = 0.4
    ctx.filter = 'blur(6px)'
    for (const [sx, , sw, color] of signs) {
      ctx.fillStyle = color
      ctx.fillRect(sx, h * 0.72, sw * 0.5, 130)
    }
    ctx.restore()

    // 人物剪影
    ctx.fillStyle = '#05070a'
    ctx.beginPath()
    ctx.ellipse(w * 0.47, h * 0.44, 22, 26, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(w * 0.47 - 30, h * 0.86)
    ctx.lineTo(w * 0.47 - 26, h * 0.52)
    ctx.lineTo(w * 0.47 + 26, h * 0.52)
    ctx.lineTo(w * 0.47 + 30, h * 0.86)
    ctx.closePath()
    ctx.fill()
  },
}

/** 灰阶测试图 */
const grayscaleChart: Scene = {
  id: 'gray',
  label: { cn: '灰阶测试', en: 'Grayscale chart' },
  width: 1280,
  height: 720,
  render: (ctx, w, h) => {
    ctx.fillStyle = '#101010'
    ctx.fillRect(0, 0, w, h)
    const steps = 11
    const barW = w / steps
    for (let i = 0; i < steps; i++) {
      const v = Math.round((i / (steps - 1)) * 255)
      ctx.fillStyle = `rgb(${v},${v},${v})`
      ctx.fillRect(i * barW, 0, barW + 1, h * 0.72)
    }
    // 彩色块
    const swatches = ['#c0392b', '#27ae60', '#2980b9', '#f39c12', '#8e44ad', '#16a085']
    swatches.forEach((c, i) => {
      ctx.fillStyle = c
      ctx.fillRect(i * (w / swatches.length), h * 0.74, w / swatches.length + 1, h * 0.26)
    })
  },
}

/** 逆光人像 */
const backlightPortrait: Scene = {
  id: 'backlight',
  label: { cn: '逆光人像', en: 'Backlit portrait' },
  width: 1280,
  height: 720,
  render: (ctx, w, h) => {
    const bg = ctx.createRadialGradient(w * 0.5, h * 0.38, 20, w * 0.5, h * 0.38, w * 0.55)
    bg.addColorStop(0, '#ffd9a0')
    bg.addColorStop(0.3, '#c98a52')
    bg.addColorStop(0.7, '#4a3a3a')
    bg.addColorStop(1, '#1a1418')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)

    // 光斑
    ctx.save()
    ctx.globalAlpha = 0.35
    ctx.filter = 'blur(18px)'
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = '#ffe0b0'
      const cx = (Math.sin(i * 3.7) * 0.5 + 0.5) * w
      const cy = (Math.cos(i * 2.3) * 0.5 + 0.5) * h * 0.7
      ctx.beginPath()
      ctx.arc(cx, cy, 12 + (i % 4) * 8, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()

    // 人物
    ctx.fillStyle = '#160f10'
    ctx.beginPath()
    ctx.ellipse(w * 0.5, h * 0.38, 78, 96, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(w * 0.5 - 150, h)
    ctx.quadraticCurveTo(w * 0.5 - 120, h * 0.52, w * 0.5, h * 0.52)
    ctx.quadraticCurveTo(w * 0.5 + 120, h * 0.52, w * 0.5 + 150, h)
    ctx.closePath()
    ctx.fill()

    // 轮廓光
    ctx.save()
    ctx.strokeStyle = 'rgba(255,214,160,0.85)'
    ctx.lineWidth = 5
    ctx.filter = 'blur(3px)'
    ctx.beginPath()
    ctx.ellipse(w * 0.5, h * 0.38, 78, 96, 0, Math.PI * 1.05, Math.PI * 1.75)
    ctx.stroke()
    ctx.restore()
  },
}

/** 色彩条 */
const colorBars: Scene = {
  id: 'bars',
  label: { cn: '色彩条', en: 'Color bars' },
  width: 1280,
  height: 720,
  render: (ctx, w, h) => {
    const bars = [
      '#c0c0c0', '#c0c000', '#00c0c0', '#00c000',
      '#c000c0', '#c00000', '#0000c0', '#101010',
    ]
    const barW = w / bars.length
    bars.forEach((c, i) => {
      ctx.fillStyle = c
      ctx.fillRect(i * barW, 0, barW + 1, h * 0.75)
    })
    const lower = ['#0000c0', '#131313', '#c000c0', '#131313', '#c0c000', '#131313', '#c0c0c0', '#131313']
    lower.forEach((c, i) => {
      ctx.fillStyle = c
      ctx.fillRect(i * barW, h * 0.75, barW + 1, h * 0.25)
    })
  },
}

/** 自然风景 */
const landscape: Scene = {
  id: 'landscape',
  label: { cn: '自然风景', en: 'Landscape' },
  width: 1280,
  height: 720,
  render: (ctx, w, h) => {
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.6)
    sky.addColorStop(0, '#1e3a5f')
    sky.addColorStop(0.6, '#5a7a9a')
    sky.addColorStop(1, '#e8b87a')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, w, h)

    // 太阳
    const sun = ctx.createRadialGradient(w * 0.7, h * 0.5, 8, w * 0.7, h * 0.5, 120)
    sun.addColorStop(0, 'rgba(255,240,200,1)')
    sun.addColorStop(0.2, 'rgba(255,200,120,0.7)')
    sun.addColorStop(1, 'rgba(255,180,100,0)')
    ctx.fillStyle = sun
    ctx.fillRect(0, 0, w, h)

    // 远山
    ctx.fillStyle = '#3a4550'
    ctx.beginPath()
    ctx.moveTo(0, h * 0.62)
    ctx.lineTo(w * 0.18, h * 0.38)
    ctx.lineTo(w * 0.32, h * 0.52)
    ctx.lineTo(w * 0.5, h * 0.3)
    ctx.lineTo(w * 0.72, h * 0.55)
    ctx.lineTo(w * 0.88, h * 0.42)
    ctx.lineTo(w, h * 0.6)
    ctx.lineTo(w, h)
    ctx.lineTo(0, h)
    ctx.closePath()
    ctx.fill()

    // 地面
    const ground = ctx.createLinearGradient(0, h * 0.6, 0, h)
    ground.addColorStop(0, '#4a4032')
    ground.addColorStop(1, '#241f18')
    ctx.fillStyle = ground
    ctx.fillRect(0, h * 0.62, w, h * 0.38)
  },
}

export const SCENES: Scene[] = [neonStreet, grayscaleChart, backlightPortrait, colorBars, landscape]

/** 渲染场景为 Canvas */
export function renderScene(scene: Scene): { canvas: HTMLCanvasElement; width: number; height: number } {
  const canvas = document.createElement('canvas')
  canvas.width = scene.width
  canvas.height = scene.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建 2D 上下文')
  scene.render(ctx, scene.width, scene.height)
  return { canvas, width: scene.width, height: scene.height }
}
