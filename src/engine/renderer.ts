import type { Uniforms } from '@/composables/useUniforms'
import { packLooks } from '@/schema/looks'
import {
  VERT,
  FRAG_DOF,
  FRAG_GRADE,
  FRAG_BRIGHT,
  FRAG_BLUR,
  FRAG_COMPOSITE,
  FRAG_GRAIN,
} from './shaders'

/** 渲染器对外接口 */
export interface RendererOptions {
  /** 渲染分辨率缩放（拖动时用 0.75，静止后用 1.0） */
  scale?: number
}

/**
 * 把源图翻转绘制到一张新 Canvas，使纹理的 v=0 对应图像顶部。
 *
 * WebGL 的 UNPACK_FLIP_Y_WEBGL 对 Canvas 有效、对 ImageBitmap 无效，
 * 统一走 CPU 侧翻转可保证「程序化场景」与「导入图片」的方向行为完全一致。
 */
function flipSourceVertically(
  source: TexImageSource,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  ctx.save()
  ctx.translate(0, height)
  ctx.scale(1, -1)
  if (source instanceof HTMLCanvasElement) {
    ctx.drawImage(source, 0, 0)
  } else {
    ctx.drawImage(source as CanvasImageSource, 0, 0, width, height)
  }
  ctx.restore()
  return canvas
}

interface ProgramInfo {
  program: WebGLProgram
  uniforms: Record<string, WebGLUniformLocation | null>
}

/** 编译 shader */
function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('无法创建 shader')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader)
    gl.deleteShader(shader)
    throw new Error(`Shader 编译失败: ${log}`)
  }
  return shader
}

/** 创建 program 并收集 uniform 位置 */
function createProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
  uniformNames: string[],
): ProgramInfo {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertexSource)
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource)
  const program = gl.createProgram()
  if (!program) throw new Error('无法创建 program')

  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program)
    throw new Error(`Program 链接失败: ${log}`)
  }

  gl.deleteShader(vs)
  gl.deleteShader(fs)

  const uniforms: Record<string, WebGLUniformLocation | null> = {}
  for (const name of uniformNames) {
    uniforms[name] = gl.getUniformLocation(program, name)
  }
  return { program, uniforms }
}

/** 帧缓冲对象 */
interface Fbo {
  framebuffer: WebGLFramebuffer
  texture: WebGLTexture
  width: number
  height: number
}

export class Renderer {
  private canvas: HTMLCanvasElement
  private gl: WebGL2RenderingContext

  private programs: Record<string, ProgramInfo> = {}

  private sourceTexture: WebGLTexture | null = null
  private sourceWidth = 0
  private sourceHeight = 0

  private fbos: Record<string, Fbo> = {}

  private quadVao: WebGLVertexArrayObject | null = null

  private uniforms: Uniforms | null = null
  private renderScale = 1
  private pendingFrame = false
  private idleTimer: number | null = null

  /** 最后一帧的渲染耗时（ms） */
  lastRenderMs = 0
  /** 是否支持 WebGL2 */
  readonly supported: boolean

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    })

    if (!gl) {
      this.supported = false
      throw new Error('当前浏览器不支持 WebGL2')
    }
    this.gl = gl
    this.supported = true

    this.initPrograms()
    this.initGeometry()
    this.lookParams = packLooks()
  }

  private lookParams: Float32Array

  /** 初始化全部 program */
  private initPrograms(): void {
    const gl = this.gl

    this.programs.dof = createProgram(
      gl,
      VERT,
      FRAG_DOF,
      ['uTex', 'uTexel', 'uAperture', 'uFocal', 'uFocusDist', 'uSoftness', 'uBokehShape'],
    )
    this.programs.grade = createProgram(
      gl,
      VERT,
      FRAG_GRADE,
      [
        'uTex', 'uTexel', 'uExposure', 'uExposureBias', 'uWbTemp', 'uWbTint',
        'uContrast', 'uBlacks', 'uWhites', 'uRolloff', 'uShadowLift',
        'uSaturation', 'uVibrance', 'uLookId', 'uLookMix', 'uSplitShadow',
        'uSplitHighlight', 'uSplitBalance', 'uSplitAmount', 'uSharpness', 'uLookParams',
      ],
    )
    this.programs.bright = createProgram(gl, VERT, FRAG_BRIGHT, ['uTex', 'uThreshold'])
    this.programs.blur = createProgram(gl, VERT, FRAG_BLUR, ['uTex', 'uDirection'])
    this.programs.composite = createProgram(
      gl,
      VERT,
      FRAG_COMPOSITE,
      [
        'uTex', 'uBloom', 'uHalation', 'uTexel', 'uBloomAmt', 'uHalationAmt',
        'uChroma', 'uVignette', 'uDirt', 'uFilmBack',
      ],
    )
    this.programs.grain = createProgram(
      gl,
      VERT,
      FRAG_GRAIN,
      ['uTex', 'uResolution', 'uGrain', 'uGrainSize', 'uGrainType', 'uIso'],
    )
  }

  /** 初始化全屏三角形 */
  private initGeometry(): void {
    const gl = this.gl
    const vao = gl.createVertexArray()
    if (!vao) throw new Error('无法创建 VAO')
    this.quadVao = vao

    gl.bindVertexArray(vao)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    // 全屏三角形
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)

    const loc = gl.getAttribLocation(this.programs.grade!.program, 'aPos')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    gl.bindVertexArray(null)
  }

  /** 载入参考图 */
  setSource(source: TexImageSource, width: number, height: number): void {
    const gl = this.gl

    if (!this.sourceTexture) {
      this.sourceTexture = gl.createTexture()
    }
    gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture)
    // 统一方向约定：纹理的 v=0 对应图像「顶部」。
    //
    // 为什么不用 UNPACK_FLIP_Y_WEBGL：实测该标志对 Canvas 有效、对 ImageBitmap 无效，
    // 会导致「程序化场景正常、导入图片上下颠倒」的分裂行为。
    // 因此统一在 CPU 侧把源图翻转绘制到一张 Canvas，WebGL 只接收 Canvas。
    const prepared = flipSourceVertically(source, width, height)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, prepared)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    this.sourceWidth = width
    this.sourceHeight = height
  }

  /** 设置渲染分辨率缩放 */
  setRenderScale(scale: number): void {
    this.renderScale = scale
  }

  /** 更新 uniform 并请求渲染 */
  setUniforms(u: Uniforms): void {
    this.uniforms = u
    this.requestRender()
  }

  /** 请求一帧渲染（rAF 合并） */
  requestRender(): void {
    if (this.pendingFrame) return
    this.pendingFrame = true

    requestAnimationFrame(() => {
      this.pendingFrame = false
      const start = performance.now()
      this.render()
      this.lastRenderMs = performance.now() - start
    })
  }

  /** 静止后重渲全质量 */
  scheduleIdleRender(): void {
    if (this.idleTimer !== null) window.clearTimeout(this.idleTimer)
    this.idleTimer = window.setTimeout(() => {
      this.idleTimer = null
      this.renderScale = 1
      this.resizeCanvas()
      this.render()
    }, 150)
  }

  /** 画布尺寸同步 */
  private resizeCanvas(): void {
    if (!this.sourceWidth || !this.sourceHeight) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.max(1, Math.round(this.sourceWidth * this.renderScale * dpr))
    const h = Math.max(1, Math.round(this.sourceHeight * this.renderScale * dpr))
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w
      this.canvas.height = h
    }
  }

  /** 创建 / 复用 FBO */
  private ensureFbo(name: string, width: number, height: number): Fbo {
    const gl = this.gl
    const existing = this.fbos[name]
    if (existing && existing.width === width && existing.height === height) return existing

    if (existing) {
      gl.deleteFramebuffer(existing.framebuffer)
      gl.deleteTexture(existing.texture)
    }

    const texture = gl.createTexture()
    if (!texture) throw new Error('无法创建 FBO 纹理')
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    const framebuffer = gl.createFramebuffer()
    if (!framebuffer) throw new Error('无法创建 FBO')
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

    const fbo = { framebuffer, texture, width, height }
    this.fbos[name] = fbo
    return fbo
  }

  /** 绘制全屏三角形到当前目标 */
  private draw(): void {
    const gl = this.gl
    gl.bindVertexArray(this.quadVao)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  /** 绑定纹理到指定单元 */
  private bindTexture(unit: number, texture: WebGLTexture): void {
    const gl = this.gl
    gl.activeTexture(gl.TEXTURE0 + unit)
    gl.bindTexture(gl.TEXTURE_2D, texture)
  }

  /** 主渲染流程 */
  private render(): void {
    const gl = this.gl
    const u = this.uniforms
    if (!u || !this.sourceTexture || !this.sourceWidth) return

    this.resizeCanvas()

    const W = this.canvas.width
    const H = this.canvas.height
    const texelW = 1 / this.sourceWidth
    const texelH = 1 / this.sourceHeight

    gl.disable(gl.DEPTH_TEST)
    gl.disable(gl.BLEND)

    // ── Pass 0：景深 ──
    const dofFbo = this.ensureFbo('dof', W, H)
    gl.bindFramebuffer(gl.FRAMEBUFFER, dofFbo.framebuffer)
    gl.viewport(0, 0, W, H)
    {
      const p = this.programs.dof!
      gl.useProgram(p.program)
      this.bindTexture(0, this.sourceTexture)
      gl.uniform1i(p.uniforms.uTex, 0)
      gl.uniform2f(p.uniforms.uTexel, texelW, texelH)
      gl.uniform1f(p.uniforms.uAperture, u.aperture)
      gl.uniform1f(p.uniforms.uFocal, u.focal)
      gl.uniform1f(p.uniforms.uFocusDist, u.focusDist)
      gl.uniform1f(p.uniforms.uSoftness, u.softness)
      gl.uniform1i(p.uniforms.uBokehShape, u.bokehShape)
      this.draw()
    }

    // ── Pass 1：主调色 ──
    const gradeFbo = this.ensureFbo('grade', W, H)
    gl.bindFramebuffer(gl.FRAMEBUFFER, gradeFbo.framebuffer)
    gl.viewport(0, 0, W, H)
    {
      const p = this.programs.grade!
      gl.useProgram(p.program)
      this.bindTexture(0, dofFbo.texture)
      gl.uniform1i(p.uniforms.uTex, 0)
      gl.uniform2f(p.uniforms.uTexel, 1 / W, 1 / H)
      gl.uniform1f(p.uniforms.uExposure, u.exposure)
      gl.uniform1f(p.uniforms.uExposureBias, u.exposureBias)
      gl.uniform1f(p.uniforms.uWbTemp, u.wbTemp)
      gl.uniform1f(p.uniforms.uWbTint, u.wbTint)
      gl.uniform1f(p.uniforms.uContrast, u.contrast)
      gl.uniform1f(p.uniforms.uBlacks, u.blacks)
      gl.uniform1f(p.uniforms.uWhites, u.whites)
      gl.uniform1f(p.uniforms.uRolloff, u.rolloff)
      gl.uniform1f(p.uniforms.uShadowLift, u.shadowLift)
      gl.uniform1f(p.uniforms.uSaturation, u.saturation)
      gl.uniform1f(p.uniforms.uVibrance, u.vibrance)
      gl.uniform1i(p.uniforms.uLookId, u.lookId)
      gl.uniform1f(p.uniforms.uLookMix, u.lookMix)
      gl.uniform3fv(p.uniforms.uSplitShadow, u.splitShadow)
      gl.uniform3fv(p.uniforms.uSplitHighlight, u.splitHighlight)
      gl.uniform1f(p.uniforms.uSplitBalance, u.splitBalance)
      gl.uniform1f(p.uniforms.uSplitAmount, u.splitAmount)
      gl.uniform1f(p.uniforms.uSharpness, u.sharpness)
      gl.uniform1fv(p.uniforms.uLookParams, this.lookParams)
      this.draw()
    }

    // ── Pass 2：高光提取 → 分离模糊 ──
    const brightFbo = this.ensureFbo('bright', W, H)
    gl.bindFramebuffer(gl.FRAMEBUFFER, brightFbo.framebuffer)
    gl.viewport(0, 0, W, H)
    {
      const p = this.programs.bright!
      gl.useProgram(p.program)
      this.bindTexture(0, gradeFbo.texture)
      gl.uniform1i(p.uniforms.uTex, 0)
      gl.uniform1f(p.uniforms.uThreshold, 0.72)
      this.draw()
    }

    const blurRadius = 1 + Math.round(u.bloom * 8)
    const blurTmp = this.ensureFbo('blurTmp', W, H)
    const blurFbo = this.ensureFbo('blur', W, H)

    // 横向
    gl.bindFramebuffer(gl.FRAMEBUFFER, blurTmp.framebuffer)
    gl.viewport(0, 0, W, H)
    {
      const p = this.programs.blur!
      gl.useProgram(p.program)
      this.bindTexture(0, brightFbo.texture)
      gl.uniform1i(p.uniforms.uTex, 0)
      gl.uniform2f(p.uniforms.uDirection, blurRadius / W, 0)
      this.draw()
    }
    // 纵向
    gl.bindFramebuffer(gl.FRAMEBUFFER, blurFbo.framebuffer)
    gl.viewport(0, 0, W, H)
    {
      const p = this.programs.blur!
      gl.useProgram(p.program)
      this.bindTexture(0, blurTmp.texture)
      gl.uniform1i(p.uniforms.uTex, 0)
      gl.uniform2f(p.uniforms.uDirection, 0, blurRadius / H)
      this.draw()
    }

    // 光晕：在泛光基础上只保留红通道，再扩散一次
    const halationFbo = this.ensureFbo('halation', W, H)
    gl.bindFramebuffer(gl.FRAMEBUFFER, halationFbo.framebuffer)
    gl.viewport(0, 0, W, H)
    {
      const p = this.programs.bright!
      gl.useProgram(p.program)
      this.bindTexture(0, gradeFbo.texture)
      gl.uniform1i(p.uniforms.uTex, 0)
      gl.uniform1f(p.uniforms.uThreshold, 0.85)
      this.draw()
    }

    // ── Pass 3：合成 ──
    const compositeFbo = this.ensureFbo('composite', W, H)
    gl.bindFramebuffer(gl.FRAMEBUFFER, compositeFbo.framebuffer)
    gl.viewport(0, 0, W, H)
    {
      const p = this.programs.composite!
      gl.useProgram(p.program)
      this.bindTexture(0, gradeFbo.texture)
      gl.uniform1i(p.uniforms.uTex, 0)
      this.bindTexture(1, blurFbo.texture)
      gl.uniform1i(p.uniforms.uBloom, 1)
      this.bindTexture(2, halationFbo.texture)
      gl.uniform1i(p.uniforms.uHalation, 2)
      gl.uniform2f(p.uniforms.uTexel, 1 / W, 1 / H)
      gl.uniform1f(p.uniforms.uBloomAmt, u.bloom)
      gl.uniform1f(p.uniforms.uHalationAmt, u.halation)
      gl.uniform1f(p.uniforms.uChroma, u.chroma)
      gl.uniform1f(p.uniforms.uVignette, u.vignette)
      gl.uniform1f(p.uniforms.uDirt, u.dirt)
      gl.uniform1f(p.uniforms.uFilmBack, u.filmBack)
      this.draw()
    }

    // ── Pass 4：颗粒 → 默认帧缓冲 ──
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, W, H)
    {
      const p = this.programs.grain!
      gl.useProgram(p.program)
      this.bindTexture(0, compositeFbo.texture)
      gl.uniform1i(p.uniforms.uTex, 0)
      gl.uniform2f(p.uniforms.uResolution, W, H)
      gl.uniform1f(p.uniforms.uGrain, u.grain)
      gl.uniform1f(p.uniforms.uGrainSize, u.grainSize)
      gl.uniform1i(p.uniforms.uGrainType, u.grainType)
      gl.uniform1f(p.uniforms.uIso, 1)
      this.draw()
    }
  }

  /** 释放资源 */
  dispose(): void {
    const gl = this.gl
    for (const name of Object.keys(this.fbos)) {
      const fbo = this.fbos[name]
      gl.deleteFramebuffer(fbo.framebuffer)
      gl.deleteTexture(fbo.texture)
    }
    this.fbos = {}
    if (this.sourceTexture) gl.deleteTexture(this.sourceTexture)
    this.sourceTexture = null
    if (this.idleTimer !== null) window.clearTimeout(this.idleTimer)
  }
}
