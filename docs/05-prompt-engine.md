# 提示词编译引擎

> 把 52 个参数编译成各平台语法正确、语义准确、可直接粘贴的提示词。
> 这是整个产品的**输出端**，质量直接决定用户是否愿意复制粘贴后就用。

---

## 1. 设计原则

1. **参数无关、平台相关** —— 中间层 token 表是平台无关的，平台渲染器只负责「怎么排版」。
2. **保真度分级** —— 强表达为一等公民，弱表达降权或转译为体感描述。
3. **有据可查** —— 每个 token 都能溯源到具体参数值，用户可核验、可排除。
4. **语法正确优先** —— 平台语法错误会让整个提示词失效，宁可少写不可写错。
5. **可扩展** —— 新增平台只需实现 `PlatformRenderer` 接口，不动编译核心。

---

## 2. 编译流程

```
params: Record<string, ParamValue>
   │
   ▼
① 逐参数求值（evaluate）
   │  range → 查 segments 命中区间 → tokens
   │  select → 查 option.tokens
   │  toggle → true/false 各有 tokens
   │  tags  → 每项 option.tokens
   ▼
② 语义去重与冲突解决（resolve）
   │  同一 en 文本 → 保留 strength 最高
   │  互斥语义 → 按优先级表裁决
   ▼
③ 分类分桶（bucket）
   │  按 category 分入 shot/composition/lens/motion/light/color/tone/texture/atmosphere/style/quality
   ▼
④ 平台渲染（render）
      各平台决定：顺序、分隔符、权重语法、负面词、后缀、详略级别
```

---

## 3. Token 结构

```ts
interface Token {
  cn: string
  en: string
  strength: number          // 0~1，语义强度
  category: TokenCategory
  /** 溯源信息 */
  source?: {
    paramKey: string        // 'lens.aperture'
    paramLabel: string      // '光圈'
    value: string           // 'f/1.4'
    path: string            // '光圈 f/1.4 → 浅景深 → shallow depth of field'
  }
  /** 用户手动排除 */
  excluded?: boolean
  /** 是否为提示词核心（用于「精简」模式） */
  core?: boolean
}
```

### 分级详略

| 级别 | 包含内容 | 典型长度 |
|---|---|---|
| **精简** | 仅 `core` token（景别、主体、布光、影调、胶片感、氛围） | 40–70 词 |
| **标准** | core + strength ≥ 0.5 的 token | 80–130 词 |
| **详尽** | 全部 token（含质感细节、数值化描述） | 150–250 词 |

默认「标准」。

---

## 4. 冲突解决

### 4.1 优先级链

```
Look / 参数 token   (最高)
   > 显式 mood 标签
   > 预设描述
```

参数是用户直接操作的结果，永远压过标签类 token。

### 4.2 互斥表

| 语义轴 | 互斥取值 | 裁决方式 |
|---|---|---|
| 色温冷暖 | `warm tones` / `cool blue tones` | `exposure.wbTemp` 参数优先 |
| 反差 | `high contrast` / `low contrast` | `tone.contrast` 参数优先 |
| 饱和 | `desaturated muted` / `rich saturated` | `tone.saturation` 参数优先 |
| Look 风格 | `teal and orange` / `cold steel blue` | Look 单选本身不冲突；与 mood 冲突时 Look 胜 |
| 景深 | `shallow` / `deep focus` | `lens.aperture` 参数优先 |
| 运动模糊 | `frozen crisp` / `motion smear` | `exposure.shutter` 参数优先 |
| 颗粒 | `heavy grain` / `pristine clean` | `texture.grain` 参数优先 |
| 曝光倾向 | `low-key` / `high-key` | `light.mood` 参数优先 |

### 4.3 合并规则

同义 token（如 `shallow depth of field` 与 `shallow focus`）保留 `strength` 更高者，并在 `path` 中记录被合并项。

---

## 5. 平台渲染器

### 5.1 接口

```ts
interface PlatformRenderer {
  id: PlatformId
  label: { cn: string; en: string }
  /** 是否支持后缀参数（MJ 风格） */
  supportsParams: boolean
  /** 是否需要负面提示词 */
  supportsNegative: boolean
  /** 正向提示词上限（字符） */
  maxLength?: number
  /** 参数后缀 */
  suffix?(ctx: RenderContext): string
  /** 负面提示词 */
  negative?(ctx: RenderContext): string[]
  /** 正文渲染 */
  render(ctx: RenderContext): string
}
```

```ts
interface RenderContext {
  buckets: Record<TokenCategory, Token[]>
  all: Token[]
  level: 'compact' | 'standard' | 'detailed'
  aspect?: string
  params: Record<string, ParamValue>
  platform: PlatformId
}
```

### 5.2 Midjourney

**语法特征**：英文逗号短语 + `--` 后缀参数；词序有影响。

**正文词序**

```
主体/景别 → 动作 → 场景 → 布光 → 镜头 → 色彩影调 → 质感 → 氛围 → 风格 → 画质
```

**参数后缀**

| 参数 | 后缀 |
|---|---|
| 画幅 | `--ar 16:9` / `--ar 21:9` / `--ar 9:16` / `--ar 1:1` |
| 风格化强度 | `--s 250`（0–1000） |
| 多样性 | `--chaos 15` |
| 画质 | `--v 7`（或 `--v 6.1`） |
| 风格 | `--style raw`（低干预）/ `--style expressive` |

**示例输出**

```
cinematic medium shot of a woman standing in a rain-soaked neon alley,
backlit by magenta neon signage, shallow depth of field with creamy bokeh,
35mm lens, teal and orange blockbuster grade, heavy analog film grain,
wet reflective surfaces, tense atmosphere --ar 16:9 --s 250 --v 7 --style raw
```

**注意**：MJ 的 `--ar` 只接受特定比例，需将 `2.39` 映射到最近的合法值（`21:9`）。

### 5.3 Stable Diffusion

**语法特征**：正/负分离，支持 `(word:1.3)` 权重，逗号或换行分隔。

**权重策略**：根据 token 的 `strength` 映射到权重档位：

| strength | 权重 |
|---|---|
| ≥ 0.85 | `(token:1.4)` |
| 0.7–0.85 | `(token:1.2)` |
| 0.5–0.7 | `(token:1.1)` |
| < 0.5 | `token` |

**负面提示词**：从参数**反推** —— 用户把饱和度拉到 -60，就在负面里加 `oversaturated`；把颗粒设为 none，加 `grainy noise`。

```ts
const negativeRules = [
  { when: p => p['tone.saturation'] < -30, add: 'oversaturated, vibrant colors' },
  { when: p => p['texture.grain'] < 10, add: 'grain, noise, film grain, dust' },
  { when: p => p['lens.aperture'] > 8, add: 'blurry background, bokeh, shallow depth of field' },
  { when: p => p['tone.contrast'] > 50, add: 'flat, low contrast, washed out' },
  { when: p => p['texture.chroma'] > 50, add: 'chromatic aberration, color fringing' },
  { when: p => p['exposure.wbTemp'] > 7000, add: 'warm, yellow, orange tint' },
  { when: p => p['look.style'] === 'bw', add: 'color, colored, saturation' },
  { when: p => p['light.direction'] === 'under', add: 'flat lighting, even lighting' },
]
```

**输出示例**

```
(cinematic medium shot:1.3), (backlit by neon signage:1.4), (shallow depth of field:1.4),
(35mm lens:1.1), (teal and orange grade:1.2), (film grain:1.1), wet reflective surfaces,
tense atmosphere
```

**负面**：`oversaturated, cartoon, illustration, plastic skin, harsh flash, cluttered composition, oversharpened`

### 5.4 即梦（Jimeng / Dreamina）

**语法特征**：中文自然语言，逗号或短句分隔，无后缀语法，偏好视觉描述 + 画质描述。

**策略**：用中文 token 流，按「画面内容 + 摄影 + 光影 + 风格」组织为自然短句，句末用「，」连接但保持短语化（模型对长中文段落效果弱于结构化短语）。

**输出示例**

```
电影感中景，一个女人站在被雨水打湿的霓虹小巷中，霓虹招牌的洋红色逆光勾勒轮廓，
浅景深，背景呈柔美散景，35毫米镜头，青橙色调，明显的胶片颗粒，湿润反光的地面，
紧张压抑的氛围，高细节，真实质感
```

### 5.5 可灵（Kling）

**语法特征**：中文 + 视频参数（时长、帧率、运镜），对「镜头运动」描述敏感。

**额外能力**：生成**视频参数块**，与提示词分离输出。

```
【镜头】缓慢推近，稳定器运镜，轻微呼吸感
【画面】电影感中景，霓虹雨夜街道，洋红与青色霓虹招牌逆光，浅景深，奶油散景
【光影】高对比硬光混合霓虹，人物面部被霓虹染色，边缘轮廓光
【质感】35mm 胶片颗粒，高光柔化滚降，轻微色差
【时长】5s  【帧率】24fps  【运动模糊】180度快门
```

**关键点**：可灵对「镜头运动」的权重高于画质描述，运动类 token 应排前。

### 5.6 Veo / Sora

**语法特征**：自然语言段落，强调时序、连续性、镜头描述，偏好完整句子。

**策略**：生成 2–4 句连贯描述，而非 token 堆叠。加入「时间线」式表述。

**输出示例**

```
A cinematic medium shot holds on a woman standing in a rain-soaked neon alley.
Magenta and cyan signage behind her creates a rim light, separating her silhouette
from the background. The lens is shallow, rendering the background as soft creamy bokeh.
The image carries the texture of 35mm film — visible grain, gentle highlight rolloff —
and a teal-and-orange grade that leans cinematic and tense.
```

### 5.7 通用（Universal）

作为兜底，输出中英双语 + 关键参数数值块，适合手动粘贴到任意工具：

```
[Positive]
cinematic medium shot, backlit by neon signage, shallow depth of field with creamy bokeh,
35mm lens, teal and orange grade, film grain, wet reflective surfaces, tense atmosphere

[Negative]
oversaturated, cartoon, plastic skin, harsh flash, oversharpened

[Technical]
Aspect: 16:9 | Lens: 35mm | Aperture: f/2.8 | Shutter: 1/48s | ISO: 800 | WB: 5600K
```

---

## 6. 通用负面词库

所有平台共享的「安全底座」（可被用户关闭）：

```
blurry, lowres, low quality, jpeg artifacts, watermark, signature, text,
oversaturated, cartoon, anime, illustration, 3d render, plastic skin,
bad anatomy, deformed hands, extra fingers, cropped, out of frame,
duplicate, cluttered composition, harsh flash, oversharpened
```

**国内平台适配**：即梦/可灵对 `anime`、`3d render` 等词的抑制效果较弱，建议按平台裁剪负面词表 —— 在 `negative.ts` 中按 `platform` 分组配置。

---

## 7. 详略级别的实现

统一在 token 层打 `core` 标记，各平台渲染器再按 `level` 过滤。

**core 判定规则**

| 规则 | 标记为 core |
|---|---|
| `language.shotSize` | ✅ 永远 core |
| `light.direction` | ✅ 永远 core |
| `look.style` | ✅ 永远 core |
| `atmosphere.timeOfDay` | ✅ 永远 core |
| `lens.aperture` | ✅ 当 ≤ 2.8（浅景深是强视觉特征） |
| `texture.grain` | ✅ 当 ≥ 45 |
| `tone.contrast` | ✅ 当 \|值\| ≥ 40 |
| `mood` 标签 | ✅ 仅第一个选中项 |

其余按 `strength` 阈值过滤。

---

## 8. 参数保真度标注

每个 token 携带 `fidelity: 'high' | 'medium' | 'low'`，对应到 02 文档的保真度表。

**UI 呈现**：提示词面板顶部显示一枚小徽章：

```
参数保真度  高 78%  中 17%  低 5%
```

点击展开明细：哪些参数落在「低」档，说明该模型对它们不敏感。

**这是产品的诚实性设计** —— 不假装 AI 能精确执行 `f/1.4` 或 `5600K`。

---

## 9. 提示词可编辑

用户可直接在输出框里编辑提示词。编辑后：

- 记录 `edited: true` 与原文快照
- 词条 chips 变为「只读参考」态（灰化）
- 提供「重置为参数生成」按钮
- 用户手动删除的 token 记入 `excluded` 集合，在参数面板对应滑块上显示「已排除」徽章

---

## 10. 测试用例

| 用例 | 输入 | 断言 |
|---|---|---|
| 最小输出 | 全部默认参数 | 提示词长度 ≥ 20 词，不为空 |
| 冲突消解 | `wbTemp=8000` + mood `['warm']` | 输出含 `cool blue tones`，不含 `warm tones` |
| Look 优先 | `look.style='coldSteel'` + mood `['warm']` | 输出含 `cold steel blue` |
| 镜头后缀 | `camera.aspect='16:9'` | MJ 输出含 `--ar 16:9` |
| 比例映射 | `camera.aspect='2.39'` | MJ 输出含 `--ar 21:9` |
| 负面反推 | `tone.saturation=-60` | SD 负面含 `oversaturated` |
| 黑白 Look | `look.style='bw'` | 负面含 `color` |
| 权重上限 | strength=1.0 | 权重 `(token:1.4)`，不超过 1.4 |
| 详尽级别 | detailed vs compact | detailed 词数 > compact |
| 平台语法 | 全部平台 | MJ 含 `--ar`；SD 含负面；即梦不含 `--`；可灵含【镜头】 |

---

## 11. 扩展点

新增平台只需三步：

1. 在 `src/prompt/platforms/` 新建渲染器，实现 `PlatformRenderer`
2. 在 `platforms/types.ts` 的 `PlatformId` 联合类型加 `'newPlatform'`
3. 在平台注册表登记 `{ id, renderer, label, supportsNegative, maxLength }`

无需修改编译核心、参数 schema 或 UI 组件 —— 平台 Tab 会自动多出一项。
