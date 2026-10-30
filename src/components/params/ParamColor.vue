<script setup lang="ts">
import type { ColorParam } from '@/types/param'

defineProps<{
  param: ColorParam
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function onInput(e: Event): void {
  const value = (e.target as HTMLInputElement).value
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="param-row">
    <div class="row-head">
      <span class="row-name">{{ param.label.cn }}</span>
      <span class="row-val mono">{{ modelValue.toUpperCase() }}</span>
    </div>

    <div class="color-row">
      <label class="swatch" :style="{ background: modelValue }">
        <input
          type="color"
          :value="modelValue"
          :aria-label="param.label.cn"
          @input="onInput"
        />
      </label>
      <span class="hint">{{ param.note.cn }}</span>
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
  font-size: var(--fs-sm);
  color: var(--text-primary);
}

.color-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.swatch {
  width: 22px;
  height: 22px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-strong);
  flex: none;
  cursor: pointer;
  overflow: hidden;
  position: relative;
}

.swatch input {
  position: absolute;
  inset: -4px;
  width: calc(100% + 8px);
  height: calc(100% + 8px);
  border: none;
  padding: 0;
  cursor: pointer;
  opacity: 0;
}

.hint {
  font-size: var(--fs-xs);
  color: var(--text-tertiary);
}
</style>
