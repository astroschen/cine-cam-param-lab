# CineCam Param Lab · 影视相机参数模拟器

> 拖动摄影机与后期滑块 → 画面实时模拟 → 一键编译成 Midjourney / Stable Diffusion / 即梦 / 可灵 / Veo 各自语法正确的提示词

纯前端单页应用，零后端、零账号、无网络请求。所有计算在浏览器本地完成，参数可通过 URL 分享。

![技术栈](https://img.shields.io/badge/Vue-3.5-42b883?logo=vuedotjs) ![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?logo=typescript) ![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite) ![Pinia](https://img.shields.io/badge/Pinia-2-yellow?logo=pinia) ![WebGL2](https://img.shields.io/badge/WebGL2-black?logo=webgl)

---

## 这是什么

一个给 AIGC 创作者用的**摄影机参数翻译器**。

你在左侧调参数 —— 焦距、光圈、快门、ISO、白平衡、反差、黑位、饱和度、Look、颗粒、泛光、色差、布光、构图、氛围 —— 中间的画面实时反映出效果，右侧自动生成可以直接粘贴到 Midjourney、Stable Diffusion、即梦、可灵、Veo 的提示词。

它和「提示词抄写板」的根本区别：**提示词里的每个词条都能溯源回具体参数**。鼠标悬停提示词里的 `shallow depth of field`，左侧的「光圈」滑块会立刻高亮并滚动到视野中央，展开完整的 `参数 → 语义 → token` 映射链。

---

## 核心特性

### 🎛️ 53 个参数的实时模拟

| 分组 | 数量 | 涵盖 |
|---|---|---|
| 摄影机 / 机身 | 3 | 传感器、画幅、胶片背板 |
| 镜头 | 6 | 焦距、光圈、对焦距离、镜头性格、焦外形态、暗角 |
| 曝光 | 6 | 快门、ISO、曝光补偿、白平衡、色调、ND 减光 |
| 影调 | 7 | 反差、黑位、白位、高光滚降、暗部提亮、饱和度、自然饱和 |
| 色彩风格 | 6 | Look 预设、强度、分离色调（阴影/高光/平衡/强度） |
| 质感与光效 | 8 | 颗粒、颗粒大小、泛光、光晕、色差、锐化、镜头光斑、漏光 |
| 布光与光质 | 6 | 光质、光位、光比、补光、主光色、环境色 |
| 构图与镜头语言 | 6 | 景别、机位、运镜、运镜强度、构图法、视野宽度 |
| 时间与氛围 | 4 | 时段、天气、空气介质、季节 |
| 情绪标签 | 1 | 多选标签集合（电影感、温暖治愈、冷峻疏离…） |

光圈、快门、ISO、白平衡、光比使用**对数刻度**滑块 —— 线性刻度下 f/1.4→f/2 这一段几乎拖不动，对数刻度才能给出符合直觉的控制感。

### 🎨 WebGL2 五段渲染管线

```
源纹理 → 景深(DOF) → 主调色(Grade) → ┬ 高光提取 → 分离模糊 → 泛光 ┐
                                    ├ 光晕(Halation) ─────────────────┤→ 合成 → 颗粒/锐化 → 屏幕
```

- **景深**：径向梯度 + 垂直梯度近似深度图，径向/椭圆/猫眼/柠檬/六边形五种焦外形态采样核
- **主调色**：曝光 → 白平衡 → Look → 反差 → 黑位白位 → 高光滚降 → 暗部提亮 → 饱和度 → 自然饱和 → 分离色调
- **Look 系统**：16 种胶片/数字 Look，每种 23 个 float（色相偏移、三通道色调曲线、分离色），共 368 个 uniform
- **合成**：泛光 + 光晕 + 色差 + 暗角 + 镜头光斑
- **颗粒**：三种颗粒类型 + 尺寸控制 + 锐化

渲染分辨率自适应：拖动时 0.75×，停止 150ms 后 1.0× 重渲，保证拖拽跟手。

### 📝 五个平台的独立渲染器

**平台切换是重新编译，不是换皮。** 同一组参数在各平台的输出结构完全不同：

| 平台 | 输出结构 |
|---|---|
| **Midjourney** | 英文短语流 + `--ar 16:9 --style raw --s 250 --v 7` |
| **Stable Diffusion** | 逗号分隔 + 括号权重 `(kw:1.3)` + 独立负面提示词字段 |
| **即梦** | 中文自然语言长句，主体 → 环境 → 光影 → 风格 |
| **可灵** | `【镜头】【画面】【光影】【风格】` 结构化分块 |
| **Veo** | 连贯英文散文段落 |

### 🔗 双向溯源

```
悬停滑块  →  高亮对应的提示词词条
点击词条  →  高亮 + 滚动到对应滑块，展开映射链
```

词条用「6px 圆点 + 轻透明底」标注语义分类（11 类），不做整块高亮 —— 避免大面积彩色毁掉深色界面的质感。

### 🎁 其他

- **24 个内置预设**，按电影质感 / 夜景 / 自然光 / 商业广告 / 纪实 / 实验风格六类分组
- **URL 分享**：参数 JSON → `deflate-raw` → base64url 编码进 hash（典型约 1200 字符），图片不入链接
- **对比模式**：可拖动分割线，左原图右模拟
- **图片导入**：拖拽 / 点击 / 粘贴三种方式，自动处理 EXIF 方向与降采样
- **撤销 / 重做**：完整历史栈，`Ctrl+Z` / `Ctrl+Shift+Z`
- **JSON 导出**：`version / platform / verbosity / preset / params` 完整结构
- **诚实标注保真度**：精确色温、精确毫米数这类 AI 难执行的参数打「≈」角标，面板显示高/中/低占比

---

## 快速开始

### 环境要求

- Node.js ≥ 18（推荐 20+）
- 支持 WebGL2 的现代浏览器（Chrome / Edge / Firefox / Safari 16+）

### 安装与运行

```bash
# 克隆
git clone <repo-url> cine-cam-param-lab
cd cine-cam-param-lab

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

打开终端输出的地址（默认 `http://localhost:5173`）即可。

### 可用脚本

| 命令 | 说明 |
|---|---|
| `npm run dev` | 启动 Vite 开发服务器（HMR） |
| `npm run build` | 类型检查 + 生产构建，产物输出到 `dist/` |
| `npm run preview` | 本地预览生产构建产物 |
| `npm run typecheck` | 仅执行 `vue-tsc --noEmit` 类型检查 |
| `npm test` | 运行 Vitest 单元测试 |

---

## 部署

产物是**纯静态文件**，`dist/` 可直接托管到任意静态服务。

```bash
npm run build
# 将 dist/ 部署到任意静态托管平台
```

### 推荐平台

| 平台 | 适配度 | 说明 |
|---|---|---|
| **Cloudflare Pages** | ⭐⭐⭐ | 免费、全球 CDN、构建命令 `npm run build`，输出目录 `dist` |
| **Vercel** | ⭐⭐⭐ | 零配置识别 Vite 项目 |
| **Netlify** | ⭐⭐ | 拖拽 `dist/` 目录即可 |
| **GitHub Pages** | ⭐⭐ | 需将 `base` 设为仓库路径 |
| **自有服务器 / OSS** | ⭐⭐⭐ | `dist/` 是静态目录，配 Nginx 即可 |

### 部署注意事项

- **无需任何环境变量** —— 项目不请求后端接口，图片处理全在本地 Canvas 完成
- **`base` 路径**：部署到子路径时在 `vite.config.ts` 设置 `base: '/your-path/'`
- **HTTPS 强烈建议**：部分浏览器在非安全上下文下禁用 `CompressionStream`（URL 分享的 deflate 压缩依赖它），降级后链接长度会明显变长
- **SPA 路由**：本项目使用 hash 传参（`#p=...`），不需要 history fallback 重写规则

---

## 项目结构

```
cine-cam-param-lab/
├─ index.html                 # 入口 HTML（含完整 meta / OG / favicon）
├─ vite.config.ts             # Vite 配置（@ 别名指向 src）
├─ vitest.config.ts           # 独立的 Vitest 配置
├─ docs/                      # 设计文档
│  ├─ 00-overview.md          #   设计总览
│  ├─ 01-product-design.md    #   产品定位与交互流程
│  ├─ 02-parameter-schema.md  #   53 个参数完整定义
│  ├─ 03-architecture.md      #   架构与渲染管线
│  ├─ 04-visual-design.md     #   设计令牌与组件规格
│  ├─ 05-prompt-engine.md     #   提示词编译引擎
│  ├─ 06-roadmap.md           #   里程碑与验收标准
│  ├─ 07-implementation-notes.md #  开发落地记录与 bug 修复
│  └─ mockups/                #   可交互 UI 设计稿（双击即开）
├─ src/
│  ├─ schema/                 # ★ 单一事实来源
│  │  ├─ params.ts            #   53 个参数定义（含渲染绑定与提示词权重）
│  │  ├─ tokens.ts            #   157 个语义 Token
│  │  ├─ looks.ts             #   16 种 Look 的 368-float uniform 布局
│  │  └─ presets.ts           #   24 个内置预设
│  ├─ prompt/                 # 提示词编译
│  │  ├─ compiler.ts          #   求值 → 去重 → 冲突消解 → 分桶 → 剪枝
│  │  ├─ negative.ts          #   负面词反推（add / suppress 双语义）
│  │  └─ platforms/           #   5 个平台渲染器
│  ├─ engine/                 # WebGL 渲染
│  │  ├─ renderer.ts          #   5 pass 编排、FBO 复用、分辨率自适应
│  │  ├─ shaders.ts           #   GLSL 源码
│  │  └─ scenes.ts            #   5 个程序化测试场景
│  ├─ composables/            # useUniforms / usePrompt
│  ├─ stores/                 # Pinia：params（含历史栈）/ ui
│  ├─ components/
│  │  ├─ layout/              #   TopBar / SidePanel
│  │  ├─ params/              #   7 种参数控件（滑块/选择/颜色/标签/开关…）
│  │  ├─ preview/             #   CanvasView
│  │  └─ prompt/              #   PromptPanel
│  ├─ utils/                  # urlState / imageLoader / color / math
│  └─ styles/                 # tokens.css（设计令牌）/ base.css
└─ tests/
   └─ prompt-engine.test.ts   # 39 条单元测试
```

---

## 架构要点

### 参数用扁平键

```ts
'lens.aperture'      // ✅ 天然对应 URL 编码、uniform 映射、预设浅合并
{ lens: { aperture } }  // ❌ 每处都要写路径转换
```

53 个参数的键、类型、默认值、范围、中英文名、渲染绑定、提示词权重全部集中在 `src/schema/params.ts`。新增参数只改这一个文件。

### 提示词编译的四步

```
ParamValues
    ↓ 逐项求值      range 查 segments / select 查 options / tags 展开
SemanticToken[]
    ↓ 去重 + 冲突消解   优先级：Look/参数 > mood 标签 > 预设描述
TokenBuckets
    ↓ 剪枝          精简 / 标准 / 详尽三档
平台渲染器 → body + flags + negative + tech
```

冲突消解举例：用户设了 `exposure.wbTemp: 8000K`（暖）又勾选了「冷峻疏离」标签 —— 前者是显式参数，优先级更高，mood 标签被降级为 `demoted`，不进入最终桶。

### 冲突消解的焦段槽

精确焦距与镜头性格曾经会打架（110mm 焦距 + 「标准镜头」token 产出 "50mm lens"）。现在有独立的 `focalFamily` 冲突组：

```
焦距(lens.focalLength)  >  镜头性格(lens.lensType)  >  视野宽度(language.fov)
```

---

## 开发指南

### 添加一个新参数

1. 在 `src/schema/params.ts` 的对应分组里加定义（类型、默认值、范围、`bind` 渲染绑定、`promptWeight`）
2. 需要进入提示词的话，在 `src/schema/tokens.ts` 加语义 Token，并在参数的 `segments` / `options` 里引用
3. 在 `src/composables/useUniforms.ts` 加 uniform 映射
4. 在 `src/engine/shaders.ts` 里消费这个 uniform
5. 更新 `tests/prompt-engine.test.ts` 里的参数总数断言

### 添加一个新平台

实现 `src/prompt/platforms/` 下的渲染函数，导出 `PlatformMeta` 与 `render*`，然后在 `src/prompt/platforms/index.ts` 注册到 `PLATFORMS` 与 `PLATFORM_ORDER`。参考现有平台 —— 它们各自独立组织输出结构，不要试图抽象成同一套模板。

### 视觉调试技巧

WebGL 的方向问题**不能靠推理**。排查这类问题时：

1. 构造一张**只在一角画色块**的测试图
2. 截图肉眼确认色块落在哪个角
3. 再用 `readPixels` 做像素级量化

只靠 `readPixels` 推理极易出错 —— `readPixels` 的 `y=0` 是缓冲区第一行，而对默认帧缓冲来说是**屏幕底部**。这个语义差异在排查时会不断误导方向。

另外注意 `UNPACK_FLIP_Y_WEBGL` **对 Canvas 有效、对 ImageBitmap 无效**。项目里统一在 CPU 侧翻转（`renderer.ts` 的 `flipSourceVertically`），避免两条加载路径行为不一致。

---

## 测试

```bash
npm test
```

当前 **39 条**用例，覆盖：

- 参数体系完整性（数量、键唯一性、分组归属、中文标签）
- 默认参数下五个平台的最小输出
- 冲突消解（色温压过 mood 标签、Look 优先级、同文本去重）
- 平台语法（MJ 画幅映射 `2.39:1 → 21:9`、即梦无 `--` 后缀、可灵 `【镜头】` 分块、SD 括号权重、权重上限 1.4）
- 详略级别剪枝行为
- 负面词反推（抑制 / 追加双语义）
- 保真度统计与分桶顺序
- 焦距一致性（正文不含矛盾毫米数、精确焦距压过粗略分类）
- 渲染方向约定（顶点着色器不翻转、不依赖 `UNPACK_FLIP_Y`）

---

## 浏览器支持

| 浏览器 | 最低版本 | 备注 |
|---|---|---|
| Chrome / Edge | 90+ | WebGL2 + `CompressionStream` |
| Firefox | 90+ | 同上 |
| Safari | 16+ | Safari 15 及以下缺少 `CompressionStream`，URL 分享会降级为未压缩编码 |

---

## 已知限制

- **预览是「感知模拟」而非物理光线追踪** —— 景深用径向梯度近似，焦距的透视关系、快门角度的运动模糊不做物理模拟，但这些参数仍会进入提示词。UI 中常驻「非物理光线追踪」徽章说明这一点。
- **AI 模型对精确数值不敏感** —— `f/1.4` 或 `5600K` 这类参数模型通常无法精确执行，工具会诚实标注保真度而非假装精确。
- **分享链接不含图片** —— 只有参数，链接约 1200 字符。
- **分离色调默认强度 35% 时高光仍略偏暖** —— 已知待优化项。

---

## 文档

完整设计文档在 [`docs/`](./docs/)：

| 文档 | 内容 |
|---|---|
| [00-overview.md](./docs/00-overview.md) | 设计总览与三个关键决策 |
| [01-product-design.md](./docs/01-product-design.md) | 产品定位、用户旅程、信息架构 |
| [02-parameter-schema.md](./docs/02-parameter-schema.md) | 53 个参数完整定义与语义映射 |
| [03-architecture.md](./docs/03-architecture.md) | 技术选型、目录结构、性能预算 |
| [04-visual-design.md](./docs/04-visual-design.md) | 设计令牌、组件规格、无障碍规范 |
| [05-prompt-engine.md](./docs/05-prompt-engine.md) | 提示词编译流程与冲突消解规则 |
| [06-roadmap.md](./docs/06-roadmap.md) | 里程碑划分与验收标准 |
| [07-implementation-notes.md](./docs/07-implementation-notes.md) | 开发落地记录与 bug 修复复盘 |

另有可交互 UI 设计稿 [`docs/mockups/desktop.html`](./docs/mockups/desktop.html) 与 [`mobile.html`](./docs/mockups/mobile.html)，双击浏览器打开即可交互，**无需构建**。

---

## License

MIT
