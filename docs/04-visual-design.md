# 视觉设计规范

> 设计目标：**像一台专业监视器 + 后期调色台**，而不是一个表单。
> 深色为底（影视工作流惯例），彩色只出现在「数据」上（滑块轨道、提示词词条、图表），绝不用于装饰。

---

## 1. 设计语言

### 1.1 关键词

`精密` `克制` `高对比` `工具感` `可信赖`

参考气质：
- 调色台（DaVinci / Premiere）的参数面板 —— 分区明确、密度高、即时反馈
- 电影监视器（SmallHD / Atomos）—— 黑场优先、读数清晰、状态色克制
- 高端硬件面板 —— 每个控件都有明确的物理隐喻

### 1.2 避免

- ❌ 大面积渐变、玻璃拟态、霓虹赛博风
- ❌ 圆润卡通字体、超过 3 种字体家族
- ❌ 纯黑 `#000` 大面积铺满（用 `#0B0D10` 更有层次）
- ❌ 用红色装饰（红色在本产品中被保留给「光晕 / 危险 / 删除」）

---

## 2. 色彩系统

### 2.1 背景层级

| Token | 值 | 用途 |
|---|---|---|
| `--bg-canvas` | `#0B0D10` | 应用底色、画布外区域 |
| `--bg-panel` | `#111419` | 面板背景 |
| `--bg-raised` | `#171B21` | 卡片、输入框、悬停态 |
| `--bg-raised-2` | `#1E232B` | 激活态、选中项 |
| `--bg-overlay` | `#222831` | 弹出层、tooltip |
| `--border-subtle` | `#242A33` | 细分隔线 |
| `--border-default` | `#2E3540` | 常规边框 |
| `--border-strong` | `#3C4451` | 聚焦边框 |

### 2.2 文字

| Token | 值 | 用途 |
|---|---|---|
| `--text-primary` | `#E8ECF2` | 标题、主要数值 |
| `--text-secondary` | `#A3ADBD` | 标签、次要说明 |
| `--text-tertiary` | `#6B7585` | 占位、禁用、单位 |
| `--text-inverse` | `#0B0D10` | 深色按钮上的文字 |

### 2.3 强调色（数据色）

只用于「可交互 / 活跃状态 / 数据可视化」，不用于装饰。

| Token | 值 | 语义 |
|---|---|---|
| `--accent` | `#4DA3FF` | 主交互色：聚焦、滑块填充、滑块拇指 |
| `--accent-dim` | `#2E6DA8` | 主交互色的低亮版本（轨道未填充段） |
| `--accent-glow` | `rgba(77,163,255,.18)` | 焦点光晕 |

**状态色**

| Token | 值 | 语义 |
|---|---|---|
| `--state-warn` | `#E8A33D` | 低保真度参数、中间态 |
| `--state-ok` | `#4FBF7B` | 高保真度、已保存 |
| `--state-err` | `#E5544B` | 错误、删除、红色光晕预览 |
| `--state-info` | `#7B8CE8` | 信息、提示 |

**语义色（仅用于提示词词条分类）**

| 分类 | 色值 | 中文 |
|---|---|---|
| `shot` | `#5FB8FF` | 主体 |
| `composition` | `#7B8CE8` | 构图 |
| `lens` | `#4FBF7B` | 镜头 |
| `motion` | `#4FD1C5` | 运动 |
| `light` | `#F2A93B` | 光线 |
| `color` | `#F2719F` | 色彩 |
| `tone` | `#C084FC` | 影调 |
| `texture` | `#E8A33D` | 质感 |
| `atmosphere` | `#68C9A8` | 氛围 |
| `style` | `#F5C563` | 风格 |
| `quality` | `#8D99AE` | 画质 |

> 词条色只用**小圆点 + 12% 透明度底色**表示，不要整块高亮 —— 大面积彩色会摧毁深色界面的高级感。

### 2.4 图表与数据色

- 亮度直方图：`#4DA3FF` 半透明填充
- RGB 波形（若实现）：R `#E5544B` / G `#4FBF7B` / B `#5FB8FF`
- 对比曲线：`--accent`

---

## 3. 字体

### 3.1 字族

```css
--font-sans: "Inter", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
--font-mono: "JetBrains Mono", "SF Mono", Consolas, monospace;
```

- 中文回退到系统字体（不打包中文字体，避免 5MB+ 体积）
- 西文与数字用 Inter（自托管 woff2 子集）

### 3.2 字号阶梯

| Token | 值 | 用途 |
|---|---|---|
| `--fs-2xs` | 10px | 单位、角标 |
| `--fs-xs` | 11px | 标签、辅助文字 |
| `--fs-sm` | 12px | 面板正文、参数名 |
| `--fs-md` | 13px | 默认正文 |
| `--fs-lg` | 15px | 区块标题 |
| `--fs-xl` | 18px | 面板标题 |
| `--fs-2xl` | 24px | 数值大读数、页面标题 |
| `--fs-3xl` | 32px | 标题（仅首页/空态） |

### 3.3 等宽数字

所有滑块数值使用 `font-variant-numeric: tabular-nums`，避免拖动时数字跳动导致布局抖动。

```css
.param-value {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
```

---

## 4. 间距系统

基于 4px 基准：

```
--sp-1: 4px   --sp-2: 8px   --sp-3: 12px  --sp-4: 16px
--sp-5: 20px  --sp-6: 24px  --sp-8: 32px  --sp-10: 40px  --sp-12: 48px
```

### 布局尺寸

| Token | 值 | 用途 |
|---|---|---|
| `--sidebar-w` | 320px | 参数侧栏 |
| `--panel-w` | 400px | 提示词面板 |
| `--topbar-h` | 52px | 顶栏 |
| `--drawer-h` | 320px | 底部抽屉 |
| `--row-h` | 52px | 单个参数行标准高度 |
| `--control-h` | 28px | 滑块轨道/输入框高度 |
| `--radius-sm` | 4px | 小控件 |
| `--radius-md` | 6px | 按钮、输入框 |
| `--radius-lg` | 10px | 卡片、面板 |

---

## 5. 核心组件规格

### 5.1 滑块 `ParamSlider`

**结构**

```
┌────────────────────────────────────────────┐
│ 光圈                                f/2.8  │  ← 名称(左) + 数值(右,等宽)
│ ▸ 浅景深，背景柔化                          │  ← 语义说明(可折叠)
│ ├──●───────────────┤                       │  ← 轨道 + 拇指
│  f/1.4    f/2.8    f/11                     │  ← 刻度(仅关键参数显示)
└────────────────────────────────────────────┘
```

**轨道规范**

- 高度 4px，轨道 `--bg-raised-2`
- 已填充段 `--accent`，未填充 `--border-default`
- 拇指 14px 圆，`--accent` 填充 + 2px `--bg-canvas` 描边 + hover 时 16px
- 拖动时拇指放大 1.15×（150ms ease-out）
- 聚焦时轨道外发光 `0 0 0 3px var(--accent-glow)`
- 刻度点：4px 竖线 + 10px 文字 `--text-tertiary`

**特殊状态**

| 状态 | 表现 |
|---|---|
| 默认值未改动 | 数值为 `--text-secondary` |
| 已改动 | 数值变为 `--text-primary` + 左侧出现 2px `--accent` 指示条 |
| 低保真度参数 | 标签后加 `≈` 角标（`--state-warn`），hover 提示 |
| 禁用 | 轨道 40% 透明 + 数值 `--text-tertiary` |

**交互**

- 拖动轨道任意位置即跳转（不用先点中拇指）
- `←` `→` 步进 1 档；`Shift+←/→` 步进 0.1 档
- `Home` / `End` 跳到最小/最大
- 双击数值 → 恢复默认
- 拖动中显示浮层读数（跟随拇指，含单位）

### 5.2 分段选择 `SegmentedControl`

用于 2–4 个互斥选项（如画幅、平台）：
- 容器 `--bg-raised`，圆角 `--radius-md`，内边 2px
- 每段 padding `6px 10px`，字号 `--fs-xs`
- 选中态：`--bg-raised-2` + 1px `--border-strong` + 文字 `--text-primary`
- 切换动效 150ms

### 5.3 下拉 `ParamSelect`

- 触发器高 `--control-h`，全宽，`--bg-raised`
- 右侧 12px chevron（`--text-tertiary`）
- 弹出层：`--bg-overlay` + 1px `--border-strong` + 阴影 `0 12px 32px rgba(0,0,0,.5)`
- 选项 hover：`--bg-raised-2`；选中项左侧 2px `--accent` 条

### 5.4 开关 `ParamToggle`

38×22px 轨道，圆角 11px；开启态 `--accent`，滑块白；动效 180ms cubic-bezier(.4,0,.2,1)。

### 5.5 颜色选择 `ParamColor`

- 16×16 方形色块 + hex 文本（等宽）
- 点击唤起系统取色器
- 附「阴影/高光」语义提示

### 5.6 标签集 `ParamTagSet`

多选胶囊标签，已选中：`--accent` 文字 + `--accent-glow` 底 + 1px `--accent` 边框。

### 5.7 提示词词条 `TokenChip`

**这是产品最重要的组件**，设计要求：

```
┌──────────────────────────┐
│ ● shallow depth of field  │  ← 分类色圆点 + 文本
└──────────────────────────┘
```

- 圆点 6px 分类色
- 底色：`color-mix(in srgb, <分类色> 12%, transparent)`
- 边框：`color-mix(in srgb, <分类色> 30%, transparent)`
- 字号 `--fs-xs`，圆角 `--radius-sm`
- Hover：底色提升到 20%，显示「来源参数」tooltip
- **点击**：展开映射链浮层 `光圈 f/1.4 → 浅景深 → shallow depth of field`
- **变化动效**：新 token 从下方 4px 淡入 + 透明度过渡（180ms）；移除的 token 淡出 + 上移
- 用户手动删除的 token：加删除线 + 50% 透明 + hover 显示「已手动排除」

### 5.8 提示词输出框 `PromptOutput`

- 等宽字体（提示词是「代码」）
- 自动换行，行高 1.7
- 语法着色：正文 token 弱化（`--text-secondary`），参数后缀 `--ar` 强化为 `--accent`
- 复制按钮：成功时 icon 变 ✓ 并显示「已复制」1.2s
- 「字数统计」显示在右下角（各平台有长度上限提示）

### 5.9 预览画布 `CanvasView`

- 容器 `--bg-canvas`，居中留白
- 画布有 1px `--border-subtle` 边框 + 轻微阴影
- 顶部 HUD 玻璃条：`backdrop-filter: blur(12px)`，`rgba(17,20,25,.72)`，圆角 `--radius-md`
- HUD 内容：`35mm` `f/2.8` `1/48s` `ISO 800` `5600K`，等宽小字，分隔用 1px 竖线
- 对比分割线：2px `--accent` 白线，圆形拖拽把手带左右箭头图标

### 5.10 工具提示 `Tooltip`

- 延迟 400ms 显示
- 背景 `--bg-overlay`，边框 `--border-strong`，阴影
- 箭头 6px
- 最大宽 280px，`--fs-xs`，行高 1.6

---

## 6. 动效规范

| Token | 值 | 用途 |
|---|---|---|
| `--ease-out` | `cubic-bezier(.16,1,.3,1)` | 进入、展开 |
| `--ease-in-out` | `cubic-bezier(.65,0,.35,1)` | 位移 |
| `--ease-spring` | `cubic-bezier(.34,1.56,.64,1)` | 强调（滑块拇指弹入） |
| `--dur-fast` | 120ms | 悬停、焦点 |
| `--dur-base` | 180ms | 常规状态切换 |
| `--dur-slow` | 280ms | 面板展开、抽屉 |

**原则**

- 只动 `transform` 与 `opacity`，避免触发 layout
- 滑块拖动过程不做缓动（要跟手）
- 提示词词条增删用 FLIP 动画，让其余词条平滑位移
- 尊重 `prefers-reduced-motion`：关闭所有过渡，保留状态变化

---

## 7. 布局与栅格

### 7.1 三栏

```
grid-template-columns: var(--sidebar-w) 1fr var(--panel-w);
grid-template-rows: var(--topbar-h) 1fr;
height: 100dvh;
```

- 侧栏与面板独立滚动（`overflow-y: auto` + 自定义滚动条）
- 画布区域 `min-height: 0`（grid 中防止溢出）—— 这是 flex/grid 布局最常见的坑

### 7.2 滚动条

```css
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: var(--border-default);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover { background: var(--border-strong); }
```

### 7.3 响应式断点

| 断点 | 变化 |
|---|---|
| <1440px | `--sidebar-w: 280px`，`--panel-w: 340px` |
| <1100px | 侧栏/面板转为 `position: fixed` 抽屉，顶栏出现汉堡按钮 |
| <768px | 单列；画布 sticky 顶部；提示词面板为底部弹出（高度 60dvh） |

---

## 8. 无障碍规范

| 项 | 要求 |
|---|---|
| 对比度 | 正文 ≥ 4.5:1，大字 ≥ 3:1；深色底上 `--text-secondary` 对 `--bg-panel` 为 6.2:1 ✓ |
| 焦点样式 | 全部可交互元素 `:focus-visible` 有 2px `--accent` 描边 + 2px offset，**不得移除** |
| 键盘 | 所有滑块、切换、抽屉均可键盘操作；画布对比把手支持方向键 |
| 语义标签 | `<main>` `<nav>` `<aside>` `<section>`；滑块用 `role="slider"` + `aria-valuenow/min/max/text` |
| 表单标签 | 每个输入有 `<label>` 或 `aria-label` |
| 提示 | tooltip 内容用 `role="tooltip"` + `aria-describedby` |
| 状态播报 | 参数变更用 `aria-live="polite"` 播报数值（节流 500ms） |
| 减少动效 | `@media (prefers-reduced-motion: reduce)` 关闭过渡 |
| 焦点陷阱 | 抽屉与弹出层打开时焦点锁定，Esc 关闭并归还焦点 |

---

## 9. 空态与引导

### 首次进入（无参考图）

画布区域显示引导卡：

```
        ┌─────────────────────────────┐
        │      [取景框图标]           │
        │   拖入一张参考图开始         │
        │   或使用内置测试场景 ↓       │
        │                             │
        │  [ 夜景霓虹 ] [ 灰阶测试 ]  │
        │  [ 逆光人像 ] [ 色彩条 ]    │
        └─────────────────────────────┘
```

背景为低对比的噪点纹理（暗示「胶片」），不要用插画。

### 提示词为空

不是空态，而是引导态：「调整左侧任一参数，提示词会在这里实时生长」+ 一个呼吸的占位光标。

---

## 10. 品牌与命名

| 项 | 建议 |
|---|---|
| 产品名 | CineCam Param Lab（中文名：**影调台** 或 **CineCam 参数实验室**） |
| Logo | 极简：光圈叶片几何图形 + 一条水平线（地平线），单色描边 |
| 字体风格 | 与正文同族，用字重与字距做区分 |

---

## 11. 设计检查清单

提交前逐项确认：

- [ ] 焦点样式未被移除，全流程可纯键盘操作
- [ ] 所有交互元素 hover / focus / active / disabled 四态齐全
- [ ] 数值使用等宽数字，拖动时不抖动
- [ ] 色彩仅用于数据，不用于装饰
- [ ] 对比度达标
- [ ] 拖动过程无过渡延迟（跟手）
- [ ] 移动端视口用 `100dvh`
- [ ] 网格/弹性子项设 `min-height: 0` / `min-width: 0`
- [ ] 空态有可操作的出路，不只是文字说明
