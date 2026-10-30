<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Renderer } from '@/engine/renderer'
import { renderScene, SCENES } from '@/engine/scenes'
import { loadImageFile, extractImageFile, extractPastedImage } from '@/utils/imageLoader'
import type { Uniforms } from '@/composables/useUniforms'
import type { ParamValues } from '@/types/param'
import { PARAM_SCHEMA, PARAM_KEYS } from '@/schema/params'

const props = defineProps<{
  uniforms: Uniforms
  values: ParamValues
}>()

const canvasEl = ref<HTMLCanvasElement | null>(null)
const originalCanvasEl = ref<HTMLCanvasElement | null>(null)
const containerEl = ref<HTMLDivElement | null>(null)
const renderer = ref<Renderer | null>(null)
const error = ref<string | null>(null)
const compareMode = ref(true)
const splitPos = ref(52)
const showScenes = ref(true)
const dragging = ref(false)
const imageName = ref('')
const renderMs = ref(0)
/** 源素材宽高比，用于让画框跟随素材比例 */
const sourceAspect = ref(16 / 9)

/** HUD 读数 */
const hud = computed(() => {
  const v = props.values
  return [
    { label: '', value: `${Math.round(Number(v['lens.focalLength'] ?? 35))}mm` },
    { label: '', value: `f/${Number(v['lens.aperture'] ?? 2.8).toFixed(1)}` },
    { label: '', value: `1/${Math.round(Number(v['exposure.shutter'] ?? 48))}s` },
    { label: 'ISO ', value: String(Math.round(Number(v['exposure.iso'] ?? 800))) },
    { label: '', value: `${Math.round(Number(v['exposure.wbTemp'] ?? 5600))}K` },
    { label: '', value: lookShort(v['look.style']) },
  ]
})

function lookShort(style: unknown): string {
  const p = PARAM_SCHEMA['look.style']
  if (p?.type !== 'select') return ''
  const opt = p.options.find((o) => o.value === style)
  if (!opt) return ''
  // 取英文名里的品牌缩写
  const match = opt.label.en.match(/^([A-Za-z]+)/)
  return match ? match[1] : opt.label.en.slice(0, 6)
}

/** 初始化渲染器 */
onMounted(() => {
  if (!canvasEl.value) return
  try {
    const r = new Renderer(canvasEl.value)
    renderer.value = r
    loadDefaultScene()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '渲染器初始化失败'
  }
})

onBeforeUnmount(() => {
  renderer.value?.dispose()
})

/** 载入默认场景 */
function loadDefaultScene(): void {
  const scene = SCENES[0]
  const { canvas, width, height } = renderScene(scene)
  renderer.value?.setSource(canvas, width, height)
  imageName.value = scene.label.cn
  renderer.value?.setUniforms(props.uniforms)
  setOriginal(canvas, width, height)
}

/** 载入指定场景 */
function loadScene(index: number): void {
  const scene = SCENES[index]
  if (!scene) return
  const { canvas, width, height } = renderScene(scene)
  renderer.value?.setSource(canvas, width, height)
  imageName.value = scene.label.cn
  showScenes.value = false
  renderer.value?.setUniforms(props.uniforms)
  setOriginal(canvas, width, height)
}

/** 把原始素材画到「原图」图层 */
function setOriginal(source: HTMLCanvasElement, width: number, height: number): void {
  sourceAspect.value = width / height
  const el = originalCanvasEl.value
  if (!el) return
  el.width = width
  el.height = height
  const ctx = el.getContext('2d')
  if (!ctx) return
  ctx.drawImage(source, 0, 0)
}

/** uniform 变化 → 渲染 */
watch(
  () => props.uniforms,
  (u) => {
    renderer.value?.setUniforms(u)
    renderer.value?.scheduleIdleRender()
  },
  { deep: true },
)

/** 文件选择 */
function onFileChange(e: Event): void {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) void handleFile(file)
  input.value = ''
}

async function handleFile(file: File): Promise<void> {
  try {
    error.value = null
    const loaded = await loadImageFile(file)
    renderer.value?.setSource(loaded.source, loaded.width, loaded.height)
    imageName.value = loaded.name
    showScenes.value = false
    renderer.value?.setUniforms(props.uniforms)

    // 把导入的原图绘入「原图」图层
    sourceAspect.value = loaded.width / loaded.height
    const el = originalCanvasEl.value
    if (el) {
      el.width = loaded.width
      el.height = loaded.height
      const ctx = el.getContext('2d')
      if (ctx) {
        const src = loaded.source as CanvasImageSource
        if (src instanceof HTMLCanvasElement) {
          ctx.drawImage(src, 0, 0)
        } else {
          ctx.drawImage(src, 0, 0, loaded.width, loaded.height)
        }
      }
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : '图片加载失败'
  }
}

/** 拖拽导入 */
function onDrop(e: DragEvent): void {
  e.preventDefault()
  const file = extractImageFile(e.dataTransfer)
  if (file) void handleFile(file)
}

function onDragOver(e: DragEvent): void {
  e.preventDefault()
}

/** 粘贴导入 */
function onPaste(e: ClipboardEvent): void {
  const file = extractPastedImage(e)
  if (file) {
    e.preventDefault()
    void handleFile(file)
  }
}

onMounted(() => {
  document.addEventListener('paste', onPaste)
})

onBeforeUnmount(() => {
  document.removeEventListener('paste', onPaste)
})

/** 对比分割线拖动 */
function onDividerDown(e: PointerEvent): void {
  dragging.value = true
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function onDividerMove(e: PointerEvent): void {
  if (!dragging.value || !containerEl.value) return
  const rect = containerEl.value.getBoundingClientRect()
  const pos = ((e.clientX - rect.left) / rect.width) * 100
  splitPos.value = Math.max(2, Math.min(98, pos))
}

function onDividerUp(): void {
  dragging.value = false
}

/** 键盘调整分割线 */
function onDividerKey(e: KeyboardEvent): void {
  const step = e.shiftKey ? 5 : 1
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    splitPos.value = Math.max(2, splitPos.value - step)
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    splitPos.value = Math.min(98, splitPos.value + step)
  }
}

/** 渲染耗时显示 */
watch(
  () => renderer.value?.lastRenderMs,
  () => {
    renderMs.value = renderer.value?.lastRenderMs ?? 0
  },
)
</script>

<template>
  <div class="stage">
    <div class="stage-bar">
      <span class="stage-title">预览 · 感知模拟</span>
      <span class="badge-hint" title="本工具为感知模拟，不做物理光线追踪">非物理光线追踪</span>
      <div class="tools">
        <button
          class="tool"
          type="button"
          :aria-pressed="compareMode"
          @click="compareMode = !compareMode"
        >
          对比
        </button>
        <button class="tool" type="button" @click="showScenes = true">场景</button>
        <label class="tool file-tool">
          换图
          <input type="file" accept="image/*" hidden @change="onFileChange" />
        </label>
      </div>
    </div>

    <div
      ref="containerEl"
      class="viewport"
      @drop="onDrop"
      @dragover="onDragOver"
    >
      <!-- 场景选择（可关闭，默认场景已载入） -->
      <div v-if="showScenes" class="scene-picker">
        <button class="scene-close" type="button" aria-label="关闭场景选择" @click="showScenes = false">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <p class="scene-title">选择测试场景</p>
        <div class="scene-grid">
          <button
            v-for="(scene, i) in SCENES"
            :key="scene.id"
            class="scene-btn"
            type="button"
            @click="loadScene(i)"
          >
            {{ scene.label.cn }}
          </button>
        </div>
        <p class="scene-hint">也可以直接把图片拖进来，或点击「换图」</p>
      </div>

      <div class="frame" :class="{ comparing: compareMode }" :style="{ aspectRatio: String(sourceAspect) }">
        <canvas ref="canvasEl" class="canvas"></canvas>

        <!-- 原图覆盖层（对比模式左侧） -->
        <div
          v-if="compareMode"
          class="original-layer"
          :style="{ clipPath: `inset(0 ${100 - splitPos}% 0 0)` }"
        >
          <canvas ref="originalCanvasEl" class="canvas original"></canvas>
        </div>

        <div v-if="compareMode" class="divider" :style="{ left: `${splitPos}%` }">
          <button
            class="handle"
            type="button"
            role="separator"
            aria-label="对比分割位置"
            :aria-valuenow="Math.round(splitPos)"
            aria-valuemin="2"
            aria-valuemax="98"
            @pointerdown="onDividerDown"
            @pointermove="onDividerMove"
            @pointerup="onDividerUp"
            @pointercancel="onDividerUp"
            @keydown="onDividerKey"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0B0D10" stroke-width="2.4" stroke-linecap="round">
              <path d="M10 8l-4 4 4 4M14 8l4 4-4 4" />
            </svg>
          </button>
        </div>

        <div v-if="compareMode" class="corner-badge left">原图</div>
        <div v-if="compareMode" class="corner-badge right">模拟</div>

        <!-- HUD 读数 -->
        <div class="hud">
          <span v-for="(item, i) in hud" :key="i">
            <b>{{ item.label }}{{ item.value }}</b>
          </span>
        </div>

        <div v-if="error" class="error-box">{{ error }}</div>
      </div>
    </div>

    <div class="statusbar">
      <span>{{ imageName || '未载入' }}</span>
      <span>渲染 {{ renderMs.toFixed(1) }} ms</span>
      <span>0.75× 预览 · 停止操作后重渲全质量</span>
      <span style="margin-left: auto">{{ PARAM_KEYS.length }} 参数</span>
    </div>
  </div>
</template>

<style scoped>
.stage {
  background: var(--bg-canvas);
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}

.stage-bar {
  height: 38px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-panel);
  flex: none;
}

.stage-title {
  font-size: var(--fs-sm);
  color: var(--text-secondary);
}

.badge-hint {
  font-size: var(--fs-2xs);
  padding: 2px 6px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--text-tertiary);
  cursor: help;
}

.tools {
  display: flex;
  gap: 2px;
  margin-left: auto;
}

.tool {
  height: 24px;
  padding: 0 9px;
  border-radius: var(--radius-sm);
  font-size: var(--fs-xs);
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  cursor: pointer;
}

.tool:hover {
  background: var(--bg-raised);
  color: var(--text-primary);
}

.tool[aria-pressed='true'] {
  background: var(--bg-raised-2);
  color: var(--accent);
}

.file-tool {
  position: relative;
  cursor: pointer;
}

.viewport {
  flex: 1;
  display: grid;
  place-items: center;
  padding: 20px;
  min-height: 0;
  min-width: 0;
  position: relative;
}

.frame {
  position: relative;
  width: 100%;
  max-width: 760px;
  max-height: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  background: #05070a;
}

.canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.original-layer {
  position: absolute;
  inset: 0;
}

.original {
  filter: none;
}

.divider {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #fff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.4);
  transform: translateX(-1px);
}

.handle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #fff;
  display: grid;
  place-items: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  cursor: ew-resize;
  touch-action: none;
}

.corner-badge {
  position: absolute;
  top: 10px;
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  background: rgba(17, 20, 25, 0.78);
  backdrop-filter: blur(10px);
  font-size: var(--fs-2xs);
  color: var(--text-secondary);
  letter-spacing: 0.04em;
}

.corner-badge.left {
  left: 10px;
}

.corner-badge.right {
  right: 10px;
  color: var(--accent);
}

.hud {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  padding: 5px 4px;
  background: rgba(17, 20, 25, 0.72);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: var(--fs-2xs);
  color: var(--text-secondary);
  white-space: nowrap;
}

.hud span + span {
  border-left: 1px solid var(--border-default);
  padding-left: 8px;
  margin-left: 2px;
}

.hud b {
  color: var(--text-primary);
  font-weight: 400;
}

.error-box {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  padding: 10px 16px;
  background: rgba(229, 84, 75, 0.14);
  border: 1px solid var(--state-err);
  border-radius: var(--radius-md);
  color: var(--state-err);
  font-size: var(--fs-sm);
}

/* 场景选择 */
.scene-picker {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(11, 13, 16, 0.92);
  z-index: 5;
}

.scene-close {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  color: var(--text-tertiary);
  border: 1px solid var(--border-subtle);
}

.scene-close:hover {
  color: var(--text-primary);
  border-color: var(--border-strong);
}

.scene-title {
  font-size: var(--fs-lg);
  color: var(--text-primary);
}

.scene-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  max-width: 420px;
}

.scene-btn {
  padding: 10px 14px;
  background: var(--bg-raised);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: var(--fs-sm);
}

.scene-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.scene-hint {
  font-size: var(--fs-xs);
  color: var(--text-tertiary);
}

.statusbar {
  height: 26px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 14px;
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-panel);
  font-size: var(--fs-2xs);
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  flex: none;
}
</style>
