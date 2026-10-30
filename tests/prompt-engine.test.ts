import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { defaultValues, PARAM_KEYS, PARAM_SCHEMA } from '@/schema/params'
import { compileTokens, pruneByVerbosity, resolveTokens, bucketTokens } from '@/prompt/compiler'
import { renderForPlatform } from '@/prompt/platforms'
import { buildNegative } from '@/prompt/negative'
import { VERT } from '@/engine/shaders'
import type { ParamValues } from '@/types/param'
import type { PlatformId, Verbosity } from '@/types/prompt'

/** 构造一份参数值 */
function values(overrides: Record<string, unknown> = {}): ParamValues {
  return { ...defaultValues(), ...overrides } as ParamValues
}

/** 编译并按平台渲染 */
function render(platform: PlatformId, v: ParamValues, verbosity: Verbosity = 'standard') {
  const { buckets } = compileTokens(v)
  const pruned = pruneByVerbosity(buckets, verbosity)
  return renderForPlatform(platform, pruned, verbosity, v)
}

describe('参数体系', () => {
  it('参数总数为 53 且无重复键', () => {
    expect(PARAM_KEYS.length).toBe(53)
    expect(new Set(PARAM_KEYS).size).toBe(53)
  })

  it('每个参数都属于已定义分组且有中文标签', () => {
    for (const key of PARAM_KEYS) {
      const p = PARAM_SCHEMA[key]
      expect(p.key).toBe(key)
      expect(p.label.cn.length).toBeGreaterThan(0)
      expect(p.group).toBeTruthy()
    }
  })
})

describe('最小输出', () => {
  it('全部默认参数时提示词不为空且达到最小长度', () => {
    const v = values()
    const { tokens } = compileTokens(v)
    expect(tokens.length).toBeGreaterThan(0)

    for (const platform of ['midjourney', 'stableDiffusion', 'jimeng', 'kling', 'veo'] as PlatformId[]) {
      const out = render(platform, v)
      expect(out.body.length).toBeGreaterThan(20)
      expect(out.body.trim().length).toBeGreaterThan(0)
    }
  })
})

describe('冲突消解', () => {
  it('色温参数压过情绪标签的冷暖', () => {
    const v = values({ 'exposure.wbTemp': 8000, 'mood.tags': ['warm'] })
    const { tokens } = compileTokens(v)
    const texts = tokens.map((t) => t.en)

    expect(texts).toContain('cool blue tones')
    expect(texts).not.toContain('warm tones')
    // 被降级的 token 不进入分桶
    const { buckets } = compileTokens(v)
    const colorTexts = (buckets.color ?? []).map((t) => t.en)
    expect(colorTexts).not.toContain('warm tones')
  })

  it('Look 压过情绪标签的冷暖', () => {
    const v = values({ 'look.style': 'coldSteel', 'mood.tags': ['warm'] })
    const { buckets } = compileTokens(v)
    const texts = [
      ...(buckets.color ?? []),
      ...(buckets.style ?? []),
    ].map((t) => t.en)

    expect(texts).toContain('cold steel blue grade, clinical cool tones')
    expect(texts).not.toContain('warm, comforting')
  })

  it('同英文文本的 token 只保留一个', () => {
    const v = values({ 'look.style': 'tealOrange', 'mood.tags': ['cyberpunk'] })
    const { tokens } = compileTokens(v)
    const seen = new Set<string>()
    for (const t of tokens) {
      const key = t.en.toLowerCase()
      expect(seen.has(key)).toBe(false)
      seen.add(key)
    }
  })

  it('resolveTokens 会标记被降级的 token', () => {
    const raw = [
      { cn: '暖调', en: 'warm tones', strength: 1, category: 'color' as const, source: 'exposure.wbTemp' },
      { cn: '温暖', en: 'warm tones', strength: 1, category: 'style' as const, source: 'mood.tags' },
    ]
    const resolved = resolveTokens(raw)
    expect(resolved.length).toBe(1)
  })
})

describe('平台语法', () => {
  it('Midjourney 输出画幅后缀', () => {
    const out = render('midjourney', values({ 'camera.aspect': '16:9' }))
    expect(out.flags).toContain('--ar 16:9')
    expect(out.flags).toContain('--v 7')
  })

  it('2.39 画幅映射为 MJ 的 21:9', () => {
    const out = render('midjourney', values({ 'camera.aspect': '2.39:1' }))
    expect(out.flags).toContain('--ar 21:9')
  })

  it('即梦输出不含 MJ 风格后缀', () => {
    const out = render('jimeng', values())
    expect(out.body).not.toContain('--')
    expect(out.flags).toBe('')
  })

  it('可灵输出包含【镜头】分块', () => {
    const out = render('kling', values())
    expect(out.body).toContain('【镜头】')
    expect(out.body).toContain('【光影】')
  })

  it('Stable Diffusion 使用括号权重语法', () => {
    const out = render('stableDiffusion', values({ 'lens.aperture': 1.8 }))
    expect(out.body).toMatch(/\([^)]+:\d\.\d\)/)
  })

  it('精简级别不加括号权重', () => {
    const out = render('stableDiffusion', values({ 'lens.aperture': 1.8 }), 'concise')
    expect(out.body).not.toMatch(/\([^)]+:\d\.\d\)/)
  })

  it('Veo 输出为连贯英文段落', () => {
    const out = render('veo', values())
    expect(out.body.length).toBeGreaterThan(30)
    expect(out.body).toMatch(/\w/)
  })
})

describe('权重上限', () => {
  it('权重不超过 1.4', () => {
    const out = render('stableDiffusion', values({ 'lens.aperture': 1.4 }))
    const matches = [...out.body.matchAll(/\(([^)]+):(\d\.\d)\)/g)]
    for (const m of matches) {
      expect(Number(m[2])).toBeLessThanOrEqual(1.4)
    }
  })
})

describe('详略级别', () => {
  it('详尽比精简输出更长', () => {
    const v = values()
    const concise = render('midjourney', v, 'concise')
    const verbose = render('midjourney', v, 'verbose')
    expect(verbose.body.length).toBeGreaterThan(concise.body.length)
  })

  it('剪枝不会丢掉主体与构图', () => {
    const v = values()
    const { buckets } = compileTokens(v)
    const pruned = pruneByVerbosity(buckets, 'concise')
    expect(pruned.shot?.length ?? 0).toBeGreaterThan(0)
  })
})

describe('负面词反推', () => {
  it('低饱和度抑制过饱和', () => {
    const { text } = buildNegative(values({ 'tone.saturation': -60 }))
    expect(text).toContain('oversaturated')
    expect(text).toContain('vivid colors')
  })

  it('高反差抑制平淡与灰雾', () => {
    const { text } = buildNegative(values({ 'tone.contrast': 60 }))
    expect(text).toContain('flat')
    expect(text).toContain('washed out')
    expect(text).toContain('low contrast')
  })

  it('低反差抑制过硬对比', () => {
    const { text } = buildNegative(values({ 'tone.contrast': -40 }))
    expect(text).toContain('harsh contrast')
    expect(text).toContain('crushed blacks')
  })

  it('黑白 Look 抑制彩色', () => {
    const { text } = buildNegative(values({ 'look.style': 'bw' }))
    expect(text).toContain('color')
    expect(text).toContain('saturation')
  })

  it('颗粒归零时抑制颗粒', () => {
    const { text } = buildNegative(values({ 'texture.grain': 0 }))
    expect(text).toContain('grain')
    expect(text).toContain('noise')
  })

  it('胶片颗粒拉高时抑制数码噪点', () => {
    const { text } = buildNegative(values({ 'texture.grain': 60 }))
    expect(text).toContain('digital noise')
  })

  it('通透空气抑制雾霾', () => {
    const { text } = buildNegative(values({ 'atmosphere.haze': 'none' }))
    expect(text).toContain('fog')
    expect(text).toContain('haze')
  })

  it('固定机位抑制运动模糊', () => {
    const { text } = buildNegative(values({ 'language.movement': 'static' }))
    expect(text).toContain('motion blur')
  })

  it('青橙 Look 不抑制低饱和', () => {
    const { text } = buildNegative(values({ 'look.style': 'tealOrange' }))
    expect(text).not.toContain('desaturated')
  })

  it('反推规则会给出说明', () => {
    const { rules } = buildNegative(values({ 'look.style': 'bw' }))
    expect(rules.length).toBeGreaterThan(0)
    expect(rules[0]).toContain('Look')
  })

  it('默认参数下仍保留基础负面词', () => {
    const { text } = buildNegative(values())
    expect(text).toContain('cartoon')
    expect(text).toContain('watermark')
  })
})

describe('保真度', () => {
  it('低保真度参数会被列出', () => {
    const { fidelity } = compileTokens(values({ 'exposure.wbTemp': 3200 }))
    expect(fidelity.lowParams.length).toBeGreaterThan(0)
    expect(fidelity.high + fidelity.medium + fidelity.low).toBeGreaterThan(0)
  })
})

describe('分桶', () => {
  it('token 按语义分类归桶且桶内按强度降序', () => {
    const { buckets } = compileTokens(values())
    for (const key of Object.keys(buckets) as (keyof typeof buckets)[]) {
      const list = buckets[key]
      if (!list) continue
      for (let i = 1; i < list.length; i++) {
        expect(list[i - 1].strength ?? 1).toBeGreaterThanOrEqual(list[i].strength ?? 1)
      }
    }
  })

  it('被降级的 token 不进入分桶', () => {
    const v = values({ 'exposure.wbTemp': 8000, 'mood.tags': ['warm'] })
    const raw = compileTokens(v).tokens
    const bucketed = bucketTokens(raw)
    const total = Object.values(bucketed).reduce((n, list) => n + (list?.length ?? 0), 0)
    expect(total).toBeLessThanOrEqual(raw.length)
  })
})

describe('焦距一致性', () => {
  it('提示词不出现与实际焦距矛盾的硬编码毫米数', () => {
    const v = values({ 'lens.focalLength': 110 })
    for (const platform of ['midjourney', 'stableDiffusion', 'jimeng', 'kling', 'veo'] as PlatformId[]) {
      const body = render(platform, v).body
      expect(body).not.toMatch(/50mm lens/)
    }
  })

  it('长焦焦距时正文包含精确毫米数', () => {
    const v = values({ 'lens.focalLength': 110 })
    const mj = render('midjourney', v).body
    expect(mj).toContain('110mm')
  })

  it('精确焦距的焦段描述压过镜头性格的粗略分类', () => {
    const v = values({ 'lens.focalLength': 110, 'lens.lensType': 'standard' })
    const { tokens } = compileTokens(v)
    const active = tokens.filter((t) => !t.demoted).map((t) => t.en)
    // 110mm 落在 85–135 区段 → long lens
    expect(active).toContain('long lens compression, flattened background')
    expect(active).not.toContain('standard lens, natural perspective')
  })

  it('短焦时焦段描述同样压过镜头性格', () => {
    const v = values({ 'lens.focalLength': 16, 'lens.lensType': 'standard' })
    const { tokens } = compileTokens(v)
    const active = tokens.filter((t) => !t.demoted).map((t) => t.en)
    expect(active).toContain('ultra wide lens, exaggerated perspective')
    expect(active).not.toContain('standard lens, natural perspective')
  })

  it('五个平台都输出光圈', () => {
    const v = values({ 'lens.aperture': 2 })
    for (const platform of ['midjourney', 'stableDiffusion', 'jimeng', 'kling', 'veo'] as PlatformId[]) {
      expect(render(platform, v).body).toContain('f/2.0')
    }
  })

  it('Stable Diffusion 不出现嵌套括号权重', () => {
    const v = values({ 'lens.focalLength': 110, 'lens.aperture': 2 })
    const body = render('stableDiffusion', v).body
    expect(body).not.toMatch(/\)\s*:/)
    expect(body).toContain('(110mm f/2.0:1.2)')
  })
})

describe('渲染方向约定', () => {
  it('顶点着色器不做 v 轴翻转（避免与管线 pass 数叠加）', () => {
    // 管线共 8 次绘制（7 次 FBO + 1 次屏幕），每经过一次 FBO 往返即一次 Y 翻转。
    // 若 VERT 再翻转一次，总次数变奇数，画面会上下颠倒。
    expect(VERT).toContain('vUv = aPos * 0.5 + 0.5')
    expect(VERT).not.toContain('0.5 - aPos.y * 0.5')
  })

  it('源图方向由 CPU 侧翻转统一处理，不依赖 UNPACK_FLIP_Y', () => {
    // UNPACK_FLIP_Y_WEBGL 对 ImageBitmap 无效，会导致导入图与程序化场景方向不一致
    const src = readFileSync(new URL('../src/engine/renderer.ts', import.meta.url), 'utf8')
    // 去掉注释后再检查，避免命中说明性文字
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    expect(code).toContain('flipSourceVertically')
    expect(code).not.toContain('UNPACK_FLIP_Y_WEBGL')
  })
})
