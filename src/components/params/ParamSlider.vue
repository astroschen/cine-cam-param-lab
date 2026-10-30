<script setup lang="ts">
import { computed, ref } from 'vue'
import type { RangeParam } from '@/types/param'
import { isLogScale, logScale, logUnscale, clamp, round } from '@/utils/math'

const props = defineProps<{
  param: RangeParam
  modelValue: number
  /** 是否与默认值不同 */
  changed?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
  /** 拖动开始（记录起始值） */
  'drag-start': []
  /** 拖动结束（提交历史） */
  'drag-end': [before: number, after: number]
}>()

/** 拖动起始值 */
const startValue = ref(props.modelValue)
/** 是否正在拖动 */
const dragging = ref(false)

const useLog = computed(() => props.param.scale === 'log' || isLogScale(props.param.min, props.param.max))

/** 参数值 → 滑块位置 0~1 */
const position = computed(() => {
  const v = props.modelValue
  if (useLog.value) return clamp(logScale(v, props.param.min, props.param.max), 0, 1)
  return clamp((v - props.param.min) / (props.param.max - props.param.min), 0, 1)
})

/** 滑块位置 → 参数值 */
function valueFromPosition(pos: number): number {
  let v: number
  if (useLog.value) {
    v = logUnscale(pos, props.param.min, props.param.max)
  } else {
    v = props.param.min + (props.param.max - props.param.min) * pos
  }
  const step = props.param.step ?? 1
  // 对数刻度下按步进取整会失真，只在整数步进时取整
  if (!useLog.value || step < 1) {
    v = Math.round(v / step) * step
  } else {
    v = round(v, 1)
  }
  return clamp(v, props.param.min, props.param.max)
}

/** 显示文本 */
const display = computed(() => {
  const v = props.modelValue
  switch (props.param.key) {
    case 'lens.aperture':
      return `f/${v < 10 ? v.toFixed(1) : Math.round(v)}`
    case 'exposure.shutter':
      return v >= 1 ? `${v.toFixed(1)}"` : `1/${Math.round(v)} s`
    case 'exposure.wbTemp':
      return `${Math.round(v)} K`
    case 'exposure.ev':
      return `${v > 0 ? '+' : ''}${v.toFixed(1)} EV`
    case 'light.ratio':
      return `${v.toFixed(1)}:1`
    case 'lens.focusDistance':
      return v >= 100 ? '∞' : `${v.toFixed(1)} m`
    default:
      return props.param.unit === '%'
        ? `${Math.round(v)}%`
        : `${Math.round(v)}${props.param.unit ? ' ' + props.param.unit : ''}`
  }
})

/** 刻度位置 */
const ticks = computed(() => {
  if (!props.param.ticks?.length) return []
  return props.param.ticks.map((t) => ({
    ...t,
    pos: useLog.value
      ? logScale(t.at, props.param.min, props.param.max)
      : (t.at - props.param.min) / (props.param.max - props.param.min),
  }))
})

function handlePointerDown(e: PointerEvent): void {
  dragging.value = true
  startValue.value = props.modelValue
  emit('drag-start')
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  handlePointerMove(e)
}

function handlePointerMove(e: PointerEvent): void {
  if (!dragging.value) return
  const el = e.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const pos = clamp((e.clientX - rect.left) / rect.width, 0, 1)
  const next = valueFromPosition(pos)
  if (next !== props.modelValue) emit('update:modelValue', next)
}

function handlePointerUp(): void {
  if (!dragging.value) return
  dragging.value = false
  emit('drag-end', startValue.value, props.modelValue)
}

/** 键盘操作 */
function handleKeydown(e: KeyboardEvent): void {
  const step = props.param.step ?? 1
  const bigStep = e.shiftKey ? step * 0.1 : step
  let next: number | null = null

  switch (e.key) {
    case 'ArrowLeft':
    case 'ArrowDown':
      next = props.modelValue - bigStep
      break
    case 'ArrowRight':
    case 'ArrowUp':
      next = props.modelValue + bigStep
      break
    case 'Home':
      next = props.param.min
      break
    case 'End':
      next = props.param.max
      break
    default:
      return
  }

  e.preventDefault()
  const v = clamp(next, props.param.min, props.param.max)
  emit('update:modelValue', v)
  emit('drag-end', props.modelValue, v)
}

/** 双击数值恢复默认 */
function resetToDefault(): void {
  if (props.modelValue === props.param.default) return
  emit('update:modelValue', props.param.default)
  emit('drag-end', props.modelValue, props.param.default)
}
</script>

<template>
  <div class="param-row">
    <div class="row-head">
      <span class="row-name">{{ param.label.cn }}</span>
      <button
        class="row-val"
        :class="{ changed }"
        type="button"
        :title="`${param.label.en} · 双击恢复默认`"
        @dblclick="resetToDefault"
      >
        {{ display }}
      </button>
    </div>

    <div
      class="slider"
      role="slider"
      tabindex="0"
      :aria-label="param.label.cn"
      :aria-valuenow="modelValue"
      :aria-valuemin="param.min"
      :aria-valuemax="param.max"
      :aria-valuetext="display"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="handlePointerUp"
      @keydown="handleKeydown"
    >
      <div class="track"></div>
      <div class="fill" :style="{ width: `${position * 100}%` }"></div>
      <div class="thumb" :style="{ left: `${position * 100}%` }"></div>
    </div>

    <div v-if="ticks.length" class="ticks">
      <template v-for="t in ticks" :key="t.at">
        <i :style="{ left: `${t.pos * 100}%` }"></i>
        <span :style="{ left: `${t.pos * 100}%` }">{{ t.label }}</span>
      </template>
    </div>
  </div>
</template>

<style scoped>
.param-row {
  padding: 7px 0;
}

.row-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 7px;
}

.row-name {
  font-size: var(--fs-sm);
  color: var(--text-secondary);
}

.row-val {
  margin-left: auto;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: var(--fs-sm);
  color: var(--text-primary);
  padding: 0;
  border-radius: var(--radius-sm);
}

.row-val:hover {
  color: var(--accent);
}

.row-val.changed {
  color: var(--accent);
}

.slider {
  position: relative;
  height: 16px;
  cursor: pointer;
  touch-action: none;
}

.track {
  position: absolute;
  top: 6px;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--bg-raised-2);
  border-radius: 2px;
}

.fill {
  position: absolute;
  top: 6px;
  left: 0;
  height: 4px;
  background: var(--accent);
  border-radius: 2px;
}

.thumb {
  position: absolute;
  top: 3px;
  width: 14px;
  height: 14px;
  margin-left: -7px;
  border-radius: 50%;
  background: var(--accent);
  border: 2px solid var(--bg-canvas);
  transition: transform var(--dur-fast) var(--ease-spring);
}

.slider:hover .thumb {
  transform: scale(1.15);
}

.slider:focus-visible {
  outline: none;
}

.slider:focus-visible .thumb {
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.ticks {
  position: relative;
  height: 13px;
  margin-top: 3px;
}

.ticks i {
  position: absolute;
  top: 0;
  width: 1px;
  height: 3px;
  background: var(--border-strong);
}

.ticks span {
  position: absolute;
  top: 3px;
  transform: translateX(-50%);
  font-size: var(--fs-2xs);
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  white-space: nowrap;
}
</style>
