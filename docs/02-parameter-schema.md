# 参数体系与语义映射

> 本文档是整个项目的**单一事实来源**。参数定义、渲染绑定、提示词映射全部由此派生。

---

## 1. 设计原则

1. **参数即光学/后期的真实变量**，不造无意义的伪参数。
2. **一个参数只做一件事**。若一个滑块同时改变多种视觉效果，必须拆分或标注。
3. **每个参数都有三层信息**：数值定义 → 视觉作用 → 语义 token。
4. **可预览与不可预览要分开**。有些参数（如镜头焦距的透视关系、快门角度的运动模糊）当前渲染器不做物理模拟，但仍需进入提示词——这类参数标记 `preview: false`。
5. **参数默认值构成一套「好看的基准」**，而不是全部为 0。

---

## 2. 分组总览

| 组 ID | 组名 | 参数量 | 作用范围 |
|---|---|---|---|
| `camera` | 摄影机 / 机身 | 3 | 画幅、传感器、色彩空间 |
| `lens` | 镜头 | 6 | 焦距、光圈、焦外、镜头性格 |
| `exposure` | 曝光 | 6 | 快门、ISO、曝光补偿、白平衡、ND |
| `tone` | 影调 | 7 | 反差、黑位、高光、饱和、暗角等 |
| `look` | 色彩风格 | 6 | Look 预设、强度、分离色调 |
| `texture` | 质感与光效 | 8 | 颗粒、泛光、光晕、色差、锐化 |
| `lighting` | 布光与光质 | 6 | 光质、光位、光比、补光 |
| `language` | 构图与镜头语言 | 6 | 景别、机位、运动、构图法 |
| `atmosphere` | 时间与氛围 | 4 | 时段、天气、空气介质、季节 |
| `mood` | 情绪标签 | 1 | 多选标签集合 |

**总计 53 个参数 + 1 个标签集合。**

---

## 3. 参数类型系统

```ts
type ParamValue = number | string | boolean | string[]

interface BaseParam {
  key: string
  label: { cn: string; en: string }
  group: GroupId
  /** 参数的人类可读解释，用于提示气泡 */
  note: { cn: string; en: string }
  /** 该参数是否参与实时画面渲染 */
  preview: boolean
  /** 该参数在提示词中的重要度 0~1，0 表示不进入提示词 */
  promptWeight: number
  /** 渲染 uniform 绑定；null 表示不直接绑定（由其他参数推导） */
  bind?: UniformBinding
}

interface RangeParam extends BaseParam {
  type: 'range'
  default: number
  min: number
  max: number
  step?: number
  unit?: string
  /** 对数刻度（如光圈、快门） */
  scale?: 'linear' | 'log'
  /** 滑块轨道上要标出的刻度点 */
  ticks?: { at: number; label: string }[]
  /** 分段语义映射：按区间给不同 token */
  segments?: Segment[]
}

interface SelectParam extends BaseParam {
  type: 'select'
  default: string
  options: ParamOption[]
}

interface ToggleParam extends BaseParam {
  type: 'toggle'
  default: boolean
}

interface TagSetParam extends BaseParam {
  type: 'tags'
  default: string[]
  options: ParamOption[]
}

interface ParamOption {
  value: string
  label: { cn: string; en: string }
  /** 选中该选项时额外注入的 token */
  tokens?: Token[]
  /** 该选项在渲染层的特殊处理标识 */
  preset?: Record<string, number | string>
}

interface Segment {
  /** 闭区间下界 */
  from: number
  /** 闭区间上界 */
  to: number
  tokens: Token[]
}

interface Token {
  cn: string
  en: string
  /** 语义强度 0~1，用于排序与去重 */
  strength?: number
  /** token 分类，用于平台渲染器分句 */
  category?: TokenCategory
}

type TokenCategory =
  | 'shot'        // 景别/主体
  | 'composition' // 构图
  | 'lens'        // 镜头与光圈
  | 'motion'      // 运动
  | 'light'       // 布光
  | 'color'       // 色彩
  | 'tone'        // 影调
  | 'texture'     // 质感
  | 'atmosphere'  // 氛围
  | 'style'       // 风格与情绪
  | 'quality'     // 画质/技术
  | 'negative'    // 负面词
```

---

## 4. 逐参数定义

> 为控制篇幅，下表用紧凑格式；完整 TS 定义见 `src/schema/params.ts`。

### 4.1 `camera` 摄影机 / 机身

| key | 名称 | 类型 | 默认 | 范围/选项 | 预览 | 权重 | 说明 |
|---|---|---|---|---|---|---|---|
| `camera.sensor` | 传感器 | select | `ff` | ff / apsc / m43 / s35 / 65 | ✓ | 0.5 | 影响颗粒尺度与景深基准 |
| `camera.aspect` | 画幅 | select | `2.39` | 16:9 / 2.39:1 / 4:3 / 3:2 / 1:1 / 9:16 | ✓ | 0.7 | 影响预览裁切与 `--ar` |
| `camera.filmBack` | 胶片背板 | toggle | `false` | — | ✗ | 0.3 | 开启后提示词偏向有机质感 |

**语义映射**

| 参数/选项 | 中文 token | 英文 token |
|---|---|---|
| sensor=ff | 全画幅质感，宽容度 | full-frame look, high latitude |
| sensor=apsc | APS-C 视角 | APS-C crop |
| sensor=m43 | 微型系统 | micro four thirds |
| sensor=s35 | Super35 电影机 | Super35 cinema camera |
| sensor=65 | 65mm 大画幅 | 65mm large format |
| aspect 各值 | 宽银幕画幅 / 竖幅构图 | widescreen 2.39:1 / vertical composition |
| filmBack=true | 胶片背板，边缘轻微晕影 | film back, organic vignetting |

### 4.2 `lens` 镜头

| key | 名称 | 类型 | 默认 | 范围 | 预览 | 权重 |
|---|---|---|---|---|---|---|
| `lens.focalLength` | 焦距 (mm) | range | 35 | 8–300，log | ✓(透视) | 0.8 |
| `lens.aperture` | 光圈 | range | 2.8 | 0.7–22，log | ✓ | 0.9 |
| `lens.focusDistance` | 对焦距离 (m) | range | 3 | 0.3–∞ | ✓ | 0.4 |
| `lens.lensType` | 镜头性格 | select | `standard` | ultraWide / wide / standard / tele / macro / tilt / anamorphic / fisheye | ✓ | 0.8 |
| `lens.bokehShape` | 焦外形态 | select | `round` | round / catEye / lemon / hexagon / oval | ✓ | 0.5 |
| `lens.vignette` | 镜头暗角 | range | 25 | 0–100 | ✓ | 0.4 |

**语义映射（关键）**

| 参数 | 中文 token | 英文 token |
|---|---|---|
| focal < 20 | 广角透视，空间纵深夸张 | wide-angle perspective, exaggerated depth |
| 20–35 | 广角，自然透视 | wide lens, natural perspective |
| 35–50 | 标准镜头，人眼视角 | 50mm lens, natural perspective |
| 50–85 | 中长焦，轻微压缩 | telephoto compression |
| 85–135 | 长焦压缩，背景贴近 | long lens compression, flattened background |
| >135 | 超长焦，主体与背景分离 | extreme telephoto, subject isolation |
| aperture ≤ 1.4 | 极浅景深，奶油虚化 | ultra shallow depth of field, creamy bokeh |
| ≤ 2.8 | 浅景深，背景柔化 | shallow depth of field, soft background |
| ≤ 5.6 | 中等景深 | moderate depth of field |
| > 11 | 大景深，全画面清晰 | deep focus, everything sharp |
| lensType=anamorphic | 变形宽银幕，椭圆焦外，横向拉丝 | anamorphic, oval bokeh, horizontal flares |
| lensType=tilt | 移轴，透视夸张 | tilt-shift, distorted perspective |
| lensType=macro | 微距，极浅景深 | macro, extreme shallow focus |
| bokehShape=oval | 椭圆焦外 | oval bokeh |
| bokehShape=catEye | 猫眼焦外 | cat-eye bokeh |

### 4.3 `exposure` 曝光

| key | 名称 | 类型 | 默认 | 范围 | 预览 | 权重 |
|---|---|---|---|---|---|---|
| `exposure.shutter` | 快门速度 | range | 1/48 | 1/8000–1/2，log | ✓(模糊) | 0.8 |
| `exposure.iso` | ISO | range | 800 | 50–102400，log | ✓(颗粒/噪点) | 0.6 |
| `exposure.ev` | 曝光补偿 (EV) | range | 0 | -3–+3，step 0.1 | ✓ | 0.5 |
| `exposure.wbTemp` | 色温 (K) | range | 5600 | 2000–12000 | ✓ | 0.5 |
| `exposure.wbTint` | 色调 (绿↔品) | range | 0 | -50–+50 | ✓ | 0.4 |
| `exposure.nd` | ND 减光 | range | 0 | 0–6 档 | ✓ | 0.2 |

**语义映射**

| 参数 | 中文 token | 英文 token |
|---|---|---|
| shutter ≥ 1/1000 | 高速凝固瞬间 | frozen motion, crisp freeze frame |
| 1/250–1/1000 | 轻微运动模糊 | subtle motion blur |
| 1/60–1/125 | 电影级自然运动模糊 | natural cinematic motion blur |
| ≤ 1/30 | 拖影，动态感 | motion smear, dynamic blur |
| iso < 200 | 干净画面，无噪点 | clean noise-free image |
| 200–1600 | 细腻颗粒 | fine grain |
| 1600–6400 | 明显胶片颗粒 | pronounced film grain |
| > 6400 | 高感颗粒，暗部粗糙 | heavy high-ISO grain, coarse shadows |
| wbTemp < 3200 | 暖调 tungsten | warm tungsten tones |
| 3200–4500 | 略暖 | slightly warm tones |
| 4500–6500 | 中性 | neutral white balance |
| > 6500 | 冷调 | cool blue tones |
| wbTint > 10 | 偏品红 | magenta tint |
| wbTint < -10 | 偏绿 | green tint |

### 4.4 `tone` 影调

| key | 名称 | 类型 | 默认 | 范围 | 预览 | 权重 |
|---|---|---|---|---|---|---|
| `tone.contrast` | 反差 | range | 18 | -100–100 | ✓ | 0.6 |
| `tone.blacks` | 黑位 | range | -12 | -100–100 | ✓ | 0.5 |
| `tone.whites` | 白位 | range | 8 | -100–100 | ✓ | 0.4 |
| `tone.highlightRolloff` | 高光滚降 | range | 55 | 0–100 | ✓ | 0.5 |
| `tone.shadowLift` | 暗部提亮 | range | 22 | 0–100 | ✓ | 0.4 |
| `tone.saturation` | 饱和度 | range | 8 | -100–100 | ✓ | 0.6 |
| `tone.vibrance` | 自然饱和 | range | 15 | -100–100 | ✓ | 0.4 |

**语义映射**

| 参数 | 中文 | English |
|---|---|---|
| contrast > 50 | 高反差，硬朗 | high contrast, punchy |
| contrast < -30 | 低反差，柔和 | low contrast, flat soft tonality |
| blacks < -30 | 扎实黑位 | deep crushed blacks |
| blacks > 30 | 灰雾 milky lift | milky lifted blacks, faded |
| whites > 30 | 高光干净 | clean bright highlights |
| highlightRolloff > 70 | 高光柔化过渡 | soft highlight rolloff, gentle bloom in highlights |
| shadowLift > 60 | 暗部提亮，胶片感 | lifted shadows, filmic shadow detail |
| saturation < -40 | 低饱和，胶片褪色 | desaturated, muted faded colors |
| saturation > 40 | 高饱和，浓郁 | rich saturated colors |
| vibrance > 40 | 自然饱和，皮肤保真 | vibrant yet natural skin tones |

### 4.5 `look` 色彩风格

| key | 名称 | 类型 | 默认 | 选项/范围 | 预览 | 权重 |
|---|---|---|---|---|---|---|
| `look.style` | 风格 Look | select | `neutral` | 见下表 16 项 | ✓ | 1.0 |
| `look.intensity` | 强度 | range | 70 | 0–100 | ✓ | 0.3 |
| `look.splitShadow` | 阴影色 | color | `#1a2a4a` | 拾色器 | ✓ | 0.4 |
| `look.splitHighlight` | 高光色 | color | `#ffd9a8` | 拾色器 | ✓ | 0.4 |
| `look.splitBalance` | 分离平衡 | range | 0 | -100–100 | ✓ | 0.2 |
| `look.splitAmount` | 分离强度 | range | 35 | 0–100 | ✓ | 0.2 |

**Look 预设清单**

| value | 中文名 | 关键 token（英文） |
|---|---|---|
| `neutral` | 中性电影 | `cinematic natural color, true to life` |
| `kodak250d` | Kodak Vision3 250D | `Kodak Vision3 250D film look, warm daylight tones` |
| `kodak500t` | Kodak Vision3 500T | `Kodak Vision3 500T tungsten film, warm nocturnal tones` |
| `fujiEterna` | Fuji Eterna | `Fuji Eterna cinematic look, cool muted palette` |
| `fujiProNeg` | Fuji Pro Neg. Hi | `Fuji Pro Neg Hi, soft pastel tones` |
| `alexaLogC` | ARRI Alexa LogC | `ARRI Alexa LogC color science, flat log profile` |
| `redLog3g10` | RED Log3G10 | `RED Log3G10 profile, sharp digital contrast` |
| `technicolor` | Technicolor 三色彩 | `Technicolor three-strip, saturated primaries` |
| `bleachBypass` | 漂白效果 | `bleach bypass, silver retained high contrast` |
| `crossProcess` | 交叉冲印 | `cross processed, unconventional color shift` |
| `bw` | 银盐黑白 | `black and white, silver gelatin, high monochrome contrast` |
| `sepia` | 复古棕调 | `sepia toned vintage photograph` |
| `tealOrange` | 青橙大片感 | `teal and orange blockbuster grade` |
| `coldSteel` | 冷钢调 | `cold steel blue grade, clinical cool tones` |
| `warmNoir` | 暖调黑色电影 | `warm film noir, amber shadows` |
| `cyberpunk` | 赛博霓虹 | `cyberpunk neon, magenta and cyan color palette` |

### 4.6 `texture` 质感与光效

| key | 名称 | 类型 | 默认 | 范围 | 预览 | 权重 |
|---|---|---|---|---|---|---|
| `texture.grain` | 颗粒强度 | range | 28 | 0–100 | ✓ | 0.7 |
| `texture.grainSize` | 颗粒尺寸 | range | 40 | 0–100 | ✓ | 0.3 |
| `texture.grainType` | 颗粒类型 | select | `film` | film / digital / none | ✓ | 0.4 |
| `texture.bloom` | 泛光 | range | 18 | 0–100 | ✓ | 0.5 |
| `texture.halation` | 光晕（红色溢散） | range | 12 | 0–100 | ✓ | 0.5 |
| `texture.chroma` | 色差 | range | 8 | 0–100 | ✓ | 0.3 |
| `texture.sharpness` | 锐度 | range | 35 | 0–100 | ✓ | 0.3 |
| `texture.dirt` | 镜头脏污/光斑 | range | 0 | 0–100 | ✓ | 0.2 |

**语义映射**

| 参数 | 中文 | English |
|---|---|---|
| grain > 60 | 明显胶片颗粒 | heavy analog film grain |
| grain 25–60 | 细腻颗粒 | fine film grain |
| grain < 10 | 极致干净 | pristine clean, noise-free |
| grainType=digital | 数码噪点 | digital sensor noise |
| bloom > 50 | 柔和泛光 | soft blooming glow |
| halation > 40 | 高光红晕 | halation, red-orange glow around highlights |
| chroma > 50 | 边缘色散 | chromatic aberration at edges |
| dirt > 0 | 镜头光斑 | lens dirt, light leaks |

### 4.7 `lighting` 布光与光质

| key | 名称 | 类型 | 默认 | 选项/范围 | 预览 | 权重 |
|---|---|---|---|---|---|---|
| `light.quality` | 光质 | select | `soft` | soft / diffused / hard / overcast / candle / neon / moonlight / street | ✓(部分) | 0.8 |
| `light.direction` | 光位 | select | `back` | front / side / rim / back / top / under | ✓(部分) | 0.8 |
| `light.ratio` | 光比 | range | 4 | 1–16（对数） | ✗ | 0.5 |
| `light.fill` | 补光 | range | 30 | 0–100 | ✗ | 0.3 |
| `light.practical` | 实用光源 | select | `none` | none / neon / practical / street / window / campfire | ✗ | 0.6 |
| `light.mood` | 曝光倾向 | select | `balanced` | under / balanced / over | ✓ | 0.6 |

**语义映射**

| 参数 | 中文 | English |
|---|---|---|
| quality=soft | 柔光，阴影过渡柔和 | soft diffused lighting, gentle shadow transitions |
| quality=hard | 硬光，强阴影 | hard directional light, defined shadows |
| quality=overcast | 阴天漫射光 | overcast diffused daylight, flat soft light |
| quality=candle | 烛光，暖弱摇曳 | warm flickering candlelight |
| quality=neon | 霓虹光 | colored neon lighting |
| quality=moonlight | 冷月光 | cool moonlight, blue-silver night light |
| direction=rim | 逆光轮廓 | rim lighting, backlit edge separation |
| direction=back | 逆光 | backlit, glowing halo around subject |
| direction=side | 侧光，明暗分割 | side lighting, chiaroscuro |
| direction=under | 底光，不祥感 | underlighting, ominous uplight |
| ratio > 8 | 高反差硬光 | dramatic high key-to-fill ratio |
| practical=neon | 霓虹招牌实景光 | neon signage practical lights |
| mood=under | 欠曝，暗调 | underexposed, low-key lighting |
| mood=over | 过曝，高调 | overexposed, high-key bright |

### 4.8 `language` 构图与镜头语言

| key | 名称 | 类型 | 默认 | 选项 | 预览 | 权重 |
|---|---|---|---|---|---|---|
| `language.shotSize` | 景别 | select | `medium` | macro / close / mediumClose / medium / full / wide / extremeWide | ✗ | 1.0 |
| `language.angle` | 机位 | select | `eye` | eye / high / low / top / dutch / overShoulder | ✗ | 0.7 |
| `language.movement` | 运镜 | select | `static` | static / handheld / dollyIn / dollyOut / pan / truck / crane / orbit / tracking / aerial | ✗ | 1.0 |
| `language.movementIntensity` | 运镜幅度 | range | 30 | 0–100 | ✗ | 0.3 |
| `language.composition` | 构图法 | select | `thirds` | thirds / centered / symmetrical / framed / leading / negativeSpace / foreground | ✗ | 0.6 |
| `language.fov` | 视野宽度 | select | `medium` | ultraWide / wide / normal / tight | ✗ | 0.5 |

**语义映射**

| 参数 | 中文 | English |
|---|---|---|
| shotSize=macro | 微距特写 | extreme macro close-up |
| shotSize=close | 特写 | close-up shot |
| shotSize=mediumClose | 近景 | medium close-up |
| shotSize=medium | 中景 | medium shot |
| shotSize=full | 全景 | full shot |
| shotSize=wide | 大远景 | wide establishing shot |
| shotSize=extremeWide | 极远景 | extreme wide shot, vast scale |
| angle=low | 低角度仰拍 | low angle hero shot |
| angle=top | 顶视俯瞰 | top-down overhead shot |
| angle=dutch | 荷兰角倾斜 | dutch angle, tilted horizon |
| movement=handheld | 手持晃动 | handheld camera, slight shake |
| movement=dollyIn | 缓慢推近 | slow dolly in, push in |
| movement=orbit | 环绕运镜 | orbiting camera arc |
| movement=aerial | 航拍俯冲 | aerial drone shot |
| composition=symmetrical | 中心对称构图 | symmetrical centered composition |
| composition=leading | 引导线构图 | leading lines composition |

### 4.9 `atmosphere` 时间与氛围

| key | 名称 | 类型 | 默认 | 选项 | 预览 | 权重 |
|---|---|---|---|---|---|---|
| `atmosphere.timeOfDay` | 时段 | select | `goldenHour` | dawn / morning / noon / afternoon / goldenHour / blueHour / dusk / night / lateNight | ✗ | 0.9 |
| `atmosphere.weather` | 天气 | select | `clear` | clear / cloudy / overcast / rain / snow / fog / dust | ✗ | 0.6 |
| `atmosphere.haze` | 空气介质 | select | `none` | none / thinMist / denseFog / smoke / steam / dustMotes / rainStreaks / godRays | ✗ | 0.6 |
| `atmosphere.season` | 季节 | select | `none` | none / spring / summer / autumn / winter | ✗ | 0.4 |

**语义映射**

| 参数 | 中文 | English |
|---|---|---|
| timeOfDay=goldenHour | 黄金时刻暖阳 | golden hour warm sunlight, long soft shadows |
| blueHour | 蓝调时刻 | blue hour twilight, cool ambient blue |
| night | 夜晚 | night scene, low ambient light |
| lateNight | 深夜 | late night, darkest ambient |
| weather=rain | 雨天，湿润反光 | rainy day, wet reflective surfaces |
| weather=fog | 雾天，能见度低 | foggy atmosphere, low visibility |
| haze=denseFog | 浓雾弥漫 | dense fog, hazy atmosphere |
| haze=godRays | 体积光束 | volumetric god rays, light shafts |
| haze=dustMotes | 空气尘埃 | visible dust motes in light |
| season=autumn | 秋季色调 | autumn palette, warm earthy tones |

### 4.10 `mood` 情绪标签

多选标签集合（可多选，默认 `['cinematic']`）：

| value | 中文 | English |
|---|---|---|
| `cinematic` | 电影感 | cinematic, filmic |
| `warm` | 温暖治愈 | warm, comforting |
| `cold` | 冷峻疏离 | cold, detached, austere |
| `nostalgic` | 怀旧 | nostalgic, vintage |
| `documentary` | 纪实粗粝 | raw documentary realism |
| `dreamy` | 梦幻 | dreamy, ethereal |
| `noir` | 黑色电影 | film noir, shadowy |
| `luxury` | 奢华商业 | luxury commercial, premium |
| `cyberpunk` | 赛博朋克 | cyberpunk, futuristic neon |
| `minimal` | 极简 | minimal, clean, uncluttered |
| `tense` | 压抑紧张 | tense, suspenseful, uneasy |
| `romantic` | 浪漫 | romantic, intimate tender |

---

## 5. 渲染绑定映射（Uniform Mapping）

参数通过 `bind` 字段直接映射到 WebGL uniform，无需手写同步代码。

| 参数 | Uniform | 类型 | 换算 |
|---|---|---|---|
| `exposure.ev` | `u.exposure` | float | `pow(2, ev)` |
| `exposure.wbTemp` | `u.wbTemp` | float | K/6500 |
| `exposure.wbTint` | `u.wbTint` | float | tint/50 |
| `tone.contrast` | `u.contrast` | float | value/100 |
| `tone.blacks` | `u.blacks` | float | value/100 |
| `tone.whites` | `u.whites` | float | value/100 |
| `tone.highlightRolloff` | `u.rolloff` | float | value/100 |
| `tone.shadowLift` | `u.shadowLift` | float | value/100 |
| `tone.saturation` | `u.saturation` | float | 1 + value/100 |
| `tone.vibrance` | `u.vibrance` | float | 1 + value/100 |
| `look.intensity` | `u.lookMix` | float | value/100 |
| `look.splitShadow` | `u.splitShadow` | vec3 | sRGB 直传 |
| `look.splitHighlight` | `u.splitHighlight` | vec3 | sRGB 直传 |
| `look.splitBalance` | `u.splitBalance` | float | value/100 |
| `look.splitAmount` | `u.splitAmount` | float | value/100 |
| `texture.grain` | `u.grain` | float | value/100 |
| `texture.grainSize` | `u.grainSize` | float | mix(1.5, 6.0, value/100) |
| `texture.bloom` | `u.bloom` | float | value/100 |
| `texture.halation` | `u.halation` | float | value/100 |
| `texture.chroma` | `u.chroma` | float | value/100 |
| `texture.sharpness` | `u.sharpness` | float | value/100 |
| `texture.dirt` | `u.dirt` | float | value/100 |
| `light.mood` | `u.exposureBias` | float | under −0.4 / over +0.35 |
| `light.quality` | `u.softness` | float | 0(硬)–1(柔) |
| `lens.aperture` | `u.aperture` | float | 用于径向景深近似 |
| `lens.focalLength` | `u.focal` | float | mm/50 |
| `lens.vignette` | `u.vignette` | float | value/100 |
| `lens.bokehShape` | `u.bokehShape` | int | 枚举 |
| `camera.aspect` | `u.aspect` | float | 裁切用 |
| `camera.sensor` | `u.sensorScale` | float | 颗粒尺度系数 |
| `look.style` | `u.lookId` | int | 枚举 → 曲线查表 |
| `texture.grainType` | `u.grainType` | int | 0 none / 1 film / 2 digital |

> Look 的实现方式：16 种 Look 各自定义一组**解析曲线参数**（RGB 三段 tone curve 的控制点 + 色调偏移），打包成 `u.lookParams[16][8]` 的 uniform 数组，避免为每种 Look 写独立 shader 分支。

---

## 6. 数值规范

### 6.1 单位与显示

| 参数 | 内部值 | 显示 |
|---|---|---|
| 光圈 | 数值 | `f/2.8` |
| 快门 | 数值（秒） | `1/48 s`（<1s）或 `2" s`（≥1s） |
| ISO | 数值 | `ISO 800` |
| 焦距 | 数值 | `35mm` |
| 色温 | 数值 | `5600K` |
| 曝光补偿 | 数值 | `+0.3 EV` |
| 光比 | 数值 | `4:1` |
| 距离 | 数值 | `3.0 m`（≥100m 显示 `∞`） |

### 6.2 对数刻度

光圈、快门、ISO、光比使用对数刻度：
`sliderValue = (log(v) - log(min)) / (log(max) - log(min))`

这保证 `f/0.7 → f/22` 的滑块行程分配与实际感知一致。

### 6.3 数值步进

- 连续参数拖动时使用「细调模式」：按住 `Shift` 进入 0.1× 精度；双击数值恢复默认。
- 快门与光圈在吸附点上提供刻度点（`f/1.4 f/2 f/2.8 f/4 f/5.6 f/8 f/11 f/16`）。

---

## 7. 预设库

### 7.1 内置预设（24 个）

按风格分组，每个预设是一组参数覆盖：

| 分组 | 预设 |
|---|---|
| **电影基础** | 经典 35mm、宽银幕大片、黑色电影、公路片 |
| **夜戏** | 霓虹夜雨、500T 街拍、深夜车内、月光下的蓝 |
| **自然光** | 阴天柔光、黄昏逆光、清晨薄雾、正午硬光 |
| **商业人像** | 美妆柔光、奢华质感、杂志封面、高调白 |
| **纪实** | 粗粝街拍、手持纪实、黑白新闻、低照度纪实 |
| **实验** | 赛博朋克、复古棕调、交叉冲印、故障风 |

每个预设包含：参数覆盖值、一句描述、推荐的目标平台与参数组合建议。

### 7.2 预设的叠加语义

「加载预设」= 覆盖预设包含的键，保留用户其他设置。
另有「软重置」按钮：只重置被该预设修改过的键 —— 避免用户丢失自己调整的焦距等。

---

## 8. 参数与提示词的保真度

并非所有参数都能被 AIGC 精确复现。工具需要**诚实告知**：

| 保真度 | 参数示例 | 提示 |
|---|---|---|
| **高**（模型强理解） | 景别、光位、影调、色彩、胶片感、氛围 | 直接描述 |
| **中**（可近似） | 光圈景深、快门动态、颗粒强度 | 描述化并放大强度 |
| **低**（模型常忽略） | 精确焦距毫米数、精确色温数值、光比数值 | 降权或转译为体感描述 |

在参数面板中对低保真度参数加一个「≈」标记，悬浮时显示说明；并在提示词面板提供「参数保真度」小徽章（高/中/低覆盖率统计）。
