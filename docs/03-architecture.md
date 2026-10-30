# 技术架构

> Vue 3 + TypeScript + Vite，纯前端、零后端、零运行时依赖（除 Vue 本身）。

---

## 1. 技术选型理由

| 决策 | 选择 | 理由 |
|---|---|---|
| 框架 | **Vue 3 `<script setup>`** | 组合式 API 与「参数 → uniform → 提示词」的反应式数据流天然契合；模板语法适合大量滑块组件 |
| 类型 | **TypeScript** | 参数体系有 52 个键、多级嵌套，类型安全是刚需而非加分项 |
| 构建 | **Vite 6** | 冷启动快、配置简单、产出静态产物 |
| 状态 | **Pinia** | 需要跨组件读写的全局状态 + devtools 调试 + 时间旅行支持 |
| 渲染 | **原生 WebGL2** | 实时胶片模拟涉及多 pass（分离模糊 → 泛光 → 合成），Canvas2D 无法胜任；WebGL2 无依赖且完全可控 |
| UI 组件 | **自研轻量组件** | 滑块、参数卡、色板等高度定制，引入组件库反而被样式束缚 |
| 样式 | **原生 CSS + CSS 变量** | 设计感来自定制而非通用组件库；CSS 变量支持运行时主题 |
| 状态持久化 | **自定义 + `localStorage`** | 只存参数档案与偏好，不存图片 |
| URL 状态 | **自定义压缩编码** | 参数编码进 hash，天然可分享 |

**不引入的东西**：UI 组件库、状态管理库之外的任何依赖、图表库（曲线编辑器自研）、状态机库。

---

## 2. 目录结构

```
cine-cam-param-lab/
├─ index.html
├─ vite.config.ts
├─ tsconfig.json
├─ package.json
├─ public/
│  └─ fonts/                     # 自托管字体
├─ src/
│  ├─ main.ts
│  ├─ App.vue
│  ├─ styles/
│  │  ├─ tokens.css              # 设计令牌（颜色/间距/字号/阴影/动效）
│  │  ├─ base.css                # reset + 基础排版
│  │  └─ components.css          # 组件级样式
│  ├─ types/
│  │  ├─ param.ts                # 参数类型定义（与 02 文档对应）
│  │  ├─ prompt.ts               # 提示词相关类型
│  │  └─ preset.ts
│  ├─ schema/
│  │  ├─ params.ts               # 全部参数定义（唯一数据源）
│  │  ├─ tokens.ts               # token 词库（可复用的语义词条）
│  │  ├─ looks.ts                # 16 种 Look 的曲线参数
│  │  └─ presets.ts              # 24 个内置预设
│  ├─ stores/
│  │  ├─ params.ts               # 参数状态 + 历史 + 预设应用
│  │  ├─ ui.ts                   # UI 状态（面板开合、对比模式、缩放）
│  │  └─ prompt.ts               # 提示词编译结果缓存
│  ├─ engine/
│  │  ├─ renderer.ts             # WebGL2 渲染器主类
│  │  ├─ passes/
│  │  │  ├─ main.frag.wgsl?     # 主调色 pass
│  │  ├─ blur.frag               # 分离高斯模糊（泛光/景深源）
│  │  ├─ composite.frag          # 合成泛光/光晕
│  │  ├─ grain.frag              # 颗粒与光斑
│  │  ├─ passManager.ts          # pass 编排
│  │  └─ quad.ts                 # 全屏三角形
│  ├─ prompt/
│  │  ├─ compiler.ts             # 参数 → token 流
│  │  ├─ resolver.ts             # token 去重/合并/排序
│  │  ├─ platforms/
│  │  │  ├─ types.ts             # 平台接口
│  │  │  ├─ midjourney.ts
│  │  │  ├─ stableDiffusion.ts
│  │  │  ├─ jimeng.ts
│  │  │  ├─ kling.ts
│  │  │  └─ veo.ts
│  │  └─ negative.ts             # 负面提示词生成
│  ├─ utils/
│  │  ├─ color.ts                # sRGB↔linear、色相运算
│  │  ├─ math.ts                 # 对数刻度、插值、clamp
│  │  ├─ imageLoader.ts          # 解码/缩放/EXIF 方向
│  │  └─ urlState.ts             # 参数 ↔ URL hash
│  ├─ composables/
│  │  ├─ useUniforms.ts          # 参数 → uniform 对象
│  │  ├─ usePrompt.ts            # 响应式提示词
│  │  ├─ useUndoRedo.ts
│  │  └─ useDragCompare.ts
│  ├─ components/
│  │  ├─ layout/  TopBar, SidePanel, PreviewCanvas, PromptPanel, BottomDrawer
│  │  ├─ params/  ParamSlider, ParamSelect, ParamToggle, ParamColor, ParamTagSet, ParamGroup, ParamRow
│  │  ├─ preview/ CanvasView, CompareHandle, HudOverlay, Histogram, GridOverlay
│  │  ├─ prompt/  PlatformTabs, PromptOutput, TokenChip, NegativeBox, FidelityBadge
│  │  └─ common/  Tooltip, Popover, SegmentedControl, Toast, Icon
│  └─ types/global.d.ts
└─ docs/                          # 本设计文档集
```

---

## 3. 渲染管线

### 3.1 管线总览

```
                     ┌──────────────────────────┐
  参考图 (Texture) ──▶│  Pass 0: 景深模糊源      │
                     │  (径向深度近似 + 模糊)    │
                     │  → FBO_A                 │
                     └──────────────────────────┘
                                    │
  参考图 ──┬───────────────────────┤
           │                       │
           ▼                       ▼
    ┌─────────────┐        ┌──────────────┐
    │ Pass 1: 主调色│◀──────│              │
    │ 曝光/WB/影调/ │        │              │
    │ Look/饱和度  │        │              │
    │ → FBO_B     │        │              │
    └──────┬──────┘        │              │
           │               └──────────────┘
           ▼
    ┌─────────────┐
    │ Pass 2: 分离模糊│ (横向/纵向各一遍)
    │ 提取高光     │ → FBO_C
    └──────┬──────┘
           ▼
    ┌─────────────┐
    │ Pass 3: 合成 │ 泛光 + 光晕 + 色差 + 暗角
    └──────┬──────┘
           ▼
    ┌─────────────┐
    │ Pass 4: 颗粒 │ 胶片颗粒 + 数码噪点 + 光斑
    │ + 锐化       │
    └──────┬──────┘
           ▼
      最终画面 (默认帧缓冲)

  同时：Pass 0 产物 FBO_A 与原图做 Before/After 对比
```

### 3.2 Pass 0 — 景深与焦外

**深度图的近似**：不做过场景分割，使用「径向 + 垂直梯度」启发式：

- 画面中心为焦平面，越靠边缘/上方（天空）越远
- `depth(x,y) ≈ f(y) + r²·k`，`f(y)` 为垂直方向的近→远梯度

这条启发式对「主体居中」的构图有效，对复杂场景不准确 —— 但对**预览用途足够**，且要在 UI 中明示（预览为「感知模拟」）。

**景深模糊**：用 `u.aperture` 与 `u.focal` 计算 CoC（弥散圆）：
```
coc = clamp( (aperture_scale) * (depth - focusPlane) , 0, maxRadius )
```
然后对 `FBO_A` 做半径 ∝ coc 的模糊 —— 由于 coc 变化是连续的，采用「焦点平面内外两路高斯 + 按 coc 混合」的方式近似。

**焦外形态**：在模糊后叠加一个 `bokehShape` 形状的多边形遮罩（圆形/椭圆/猫眼/柠檬/六边形），使焦外呈现对应轮廓。

**变形宽银幕**：焦外为椭圆 + 高光横向拉丝（水平方向的额外模糊 + 横向 streak）。

### 3.3 Pass 1 — 主调色

顺序严格重要（模拟真实管线顺序）：

```
1. 曝光：  color *= pow(2, EV + exposureBias)
2. 白平衡：按色温/色调转换为 RGB 增益
3. Look：  应用 lookParams 的 tone curve + 色相偏移
4. 对比度：S 曲线
5. 黑位/白位：levels 调整
6. 高光滚降：highlights 处向压缩曲线混合
7. 暗部提亮：shadows 处提亮
8. 饱和度： HSL 饱和度调整
9. 自然饱和：保护已饱和与肤色区域
10. 分离色调：按明度掩码混合阴影/高光色
11. 锐化：unsharp mask（亮度通道）
```

### 3.4 Pass 2 — 分离模糊与泛光

- 提取高光：`highlight = max(color - threshold, 0)`
- 横向模糊 9 tap → FBO_C
- 纵向模糊 9 tap → FBO_D
- 泛光强度 = `u.bloom`
- **光晕（halation）**：在泛光基础上，只保留红色通道并额外扩散，产生高光周围的红晕 —— 这是胶片特征，单独一个 uniform。

### 3.5 Pass 3 — 合成

- 泛光叠加：`mix(base, bloom, strength)`
- 光晕叠加（红色通道优先）
- **色差（chroma）**：在图像边缘按半径偏移 R 与 B 通道采样
- **暗角**：径向亮度衰减，形状可选（圆形/椭圆，可选适配画幅）
- **光斑（dirt）**：程序化噪声遮罩乘以高光区域

### 3.6 Pass 4 — 颗粒与锐化

**胶片颗粒**：
```
grain = noise(uv * grainSize * resolution)
grain *= luminance-dependent amplitude   // 暗部颗粒更强
grain *= (1 - highlightsMask)          // 高光区颗粒弱
```
- `grainType=film`：噪声经低通（更粗更柔），中间调最强
- `grainType=digital`：噪声带轻微色度噪声（RGB 独立），暗部更强

**锐化**：unsharp mask，阈值 + 强度可调，避免产生明显光晕。

---

## 4. 状态管理与数据流

### 4.1 Pinia Store

```ts
// stores/params.ts
export const useParamsStore = defineStore('params', () => {
  const values = reactive<Record<string, ParamValue>>({})   // 扁平化键 'group.key'
  const history = ref<HistoryEntry[]>([])                     // 撤销栈
  const future = ref<HistoryEntry[]>([])                      // 重做栈
  const presetStack = ref<string[]>([])                       // 用于「软重置」

  // 派生
  const grouped = computed(() => groupByGroup(values))
  const uniforms = computed(() => buildUniforms(values))       // 参数 → uniform 对象

  // 动作
  function setParam(key: string, v: ParamValue, opts?: { commit?: boolean })
  function applyPreset(p: Preset, mode: 'hard' | 'soft')
  function resetGroup(groupId: GroupId)
  function resetAll()
  function undo() / redo()
  function serialize(): string
  function deserialize(s: string): boolean
})
```

**扁平键设计**：用 `'lens.aperture'` 这样的扁平字符串键而非嵌套对象，理由：
- 与 URL 编码天然对应
- uniform 映射表可直接用扁平键
- 预设覆盖用浅合并即可
- 序列化简单

### 4.2 数据流

```
        用户拖动滑块
              │
              ▼
    ParamSlider → paramsStore.setParam('lens.aperture', 1.4)
              │
     ┌────────┴─────────┐
     ▼                  ▼
  uniforms (computed)  promptTokens (computed)
     │                  │
     ▼                  ▼
 useUniforms()      promptCompiler.compile()
     │                  │
     ▼                  ▼
 renderer.setUniforms()  promptStore.render(platform)
     │                  │
     ▼                  ▼
 requestRender()     PromptPanel 更新（词条 diff 高亮）
  （rAF 合并，1 帧 1 次）
```

**关键性能约定**：
- `uniforms` 与 `promptTokens` 都是 `computed`，惰性求值，只在真正被读取时重算
- 渲染请求用 `requestAnimationFrame` 合并，拖动时不会堆积
- 提示词编译纯计算 < 5ms，不阻塞渲染帧

### 4.3 撤销/重做

- 在 `setParam` 中，若 `commit: true`（滑块 `pointerup` 时触发）则压入历史
- 拖动过程只更新值，不入栈；松手时压入一条 `{key, before, after}`
- 栈深 100，内存开销可忽略

---

## 5. 提示词编译管线

```
paramsStore.values
      │
      ▼
┌─────────────────────────────────────────────┐
│ Step 1  逐参数求值                          │
│  对每个参数：取 segments / option tokens    │
│  → 产出 RawToken[]                          │
└─────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────┐
│ Step 2  分级去重合并                        │
│  同语义 token 保留 strength 最高者           │
│  冲突 token 按 category 冲突表解决           │
└─────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────┐
│ Step 3  分类分桶                            │
│  按 TokenCategory 分入 8 个语义桶            │
└─────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────┐
│ Step 4  平台渲染                           │
│  PlatformRenderer.render(platform, buckets) │
│  → 拼正文 / 拼负面 / 拼参数后缀              │
└─────────────────────────────────────────────┘
```

冲突解决规则示例：

| 冲突 | 解决 |
|---|---|
| `cold` vs `warm`（色彩温度相关） | 由 `exposure.wbTemp` 的实际值决定，参数优先级高于标签 |
| `tealOrange` vs `coldSteel`（Look 互斥） | Look 是单选，天然不冲突；但 mood 标签可能冲突 → mood 强度低，Look 优先 |
| `high contrast` vs `low contrast` | `tone.contrast` 参数优先，标签让位 |

**优先级规则**：`Look/参数 > 显式 mood 标签 > 预设描述`

---

## 6. URL 状态与分享

### 6.1 编码格式

```
https://example.com/#p=<base64url(deflate-raw(JSON))>
```

- 参数 JSON → `deflate-raw` → base64url
- 典型参数集 JSON ≈ 1.5KB → 压缩后 ≈ 400B → base64 ≈ 540 字符
- 对可分享性完全够用（微信/IM 链接长度限制通常 2000+ 字符）

### 分享链接包含：参数值、Look、预设 ID、目标平台、提示词详略级别
### 分享链接不包含：参考图片（体积大且涉隐私）

**降级方案**：若 `CompressionStream` 不支持（旧浏览器），退化为纯 base64 的 JSON（约 2KB，仍可接受）。

### 6.2 localStorage

| 键 | 内容 | 保留策略 |
|---|---|---|
| `ccl.params` | 最近一次参数（非图片） | 永久 |
| `ccl.presets` | 用户自建预设 | 永久 |
| `ccl.platform` | 上次选的平台、详略级别 | 永久 |

---

## 7. 性能预算

| 指标 | 目标 | 手段 |
|---|---|---|
| 首屏可交互 | < 1.5s（本地） | 代码分割：渲染器与 prompt 引擎懒加载 |
| 滑块拖动帧率 | 60fps @ 1080p 参考图 | rAF 合并 + uniform 直传 + 渲染分辨率自适应 |
| 单次渲染耗时 | < 8ms | 多 pass 但每 pass 很简单 |
| 提示词编译 | < 5ms | 纯计算 + computed 缓存 |
| 初始包体积 | < 300KB gzip | 无第三方 UI 库、无图表库 |
| 参考图内存 | 1080p RGBA ≈ 8MB | 限制最大边长（默认 2400px），超出则降采样 |

**渲染分辨率自适应**：拖动滑块时以 0.75× 分辨率渲染，停止操作 150ms 后以 1.0× 重渲一次高质量版本。这是保证 60fps 的关键技巧，也是相机 App 普遍做法。

---

## 8. 浏览器兼容与降级

| 特性 | 检测 | 降级 |
|---|---|---|
| WebGL2 | `canvas.getContext('webgl2')` | 回退 WebGL1 + 简化 shader（去掉部分 pass） |
| `CompressionStream` | `window.CompressionStream` | 退化为纯 base64 编码 |
| `createImageBitmap` | 浏览器支持检测 | 退化为 `<img>` + `FileReader` |
| `OffscreenCanvas` | 可选特性 | 不用即可，不影响主流程 |
| `dvh` 单位 | `@supports` | 回退 `vh` |

**渐进增强原则**：核心链路（调参 → 提示词）必须在最老的目标浏览器（Chrome 90 / Safari 15 / Firefox 90）上可用。

---

## 9. 测试策略

### 9.1 单元测试（Vitest）

| 测试对象 | 断言 |
|---|---|
| 参数 schema | 每个参数有唯一 key、默认值在范围内、bind 指向存在的 uniform |
| token 编译 | 给定参数组合，产出的 token 符合预期（快照测试） |
| 平台渲染器 | 各平台输出符合各自的语法规则（正则断言） |
| URL 编解码 | 编解码往返一致（round-trip） |
| 对数刻度 | 滑块值 ↔ 实际值的映射正确 |

### 9.2 渲染快照测试

对固定测试图 + 固定参数集，渲染结果与基线图做像素对比（容差 2/255）。改动 shader 时能立刻发现视觉回归。

### 9.3 手动验收清单

- [ ] 拖动任一滑块，预览在 1 帧内更新
- [ ] 提示词在 100ms 内更新且高亮变化的词条
- [ ] 每个参数都有中文名、英文名、说明
- [ ] 5 个平台的提示词语法均正确
- [ ] 分享链接能完整还原参数
- [ ] 键盘可操作所有滑块
- [ ] 无网络请求（DevTools Network 面板验证）

---

## 10. 风险登记

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| 预览与 AI 实际出图差异大 | 高 | 高 | 明确标注「感知模拟」；提供参数保真度徽章；允许用户粘贴生成结果反推 |
| 景深近似在复杂场景不准 | 中 | 中 | 用作「提示词校准器」而非「效果保证」；文档明示局限 |
| 52 个参数造成 UI 认知负担 | 中 | 中 | 默认折叠大部分组、预设一键起步、参数注解 + 术语表 |
| WebGL 在低端设备掉帧 | 中 | 低 | 分辨率自适应 + 降低 pass 数开关 |
| 提示词语法随平台版本变化 | 高 | 中 | 平台模板外置为 JSON，易于用户自行更新/新增 |
