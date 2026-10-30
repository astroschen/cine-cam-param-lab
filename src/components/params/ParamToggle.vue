<script setup lang="ts">
import type { ToggleParam } from '@/types/param'

defineProps<{
  param: ToggleParam
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<template>
  <div class="param-row">
    <div class="row-head">
      <span class="row-name">{{ param.label.cn }}</span>
      <button
        class="toggle"
        type="button"
        role="switch"
        :aria-checked="modelValue"
        :aria-label="param.label.cn"
        :class="{ on: modelValue }"
        @click="emit('update:modelValue', !modelValue)"
      >
        <span class="knob"></span>
      </button>
    </div>
    <p class="hint">{{ param.note.cn }}</p>
  </div>
</template>

<style scoped>
.param-row {
  padding: 7px 0;
}

.row-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.row-name {
  font-size: var(--fs-sm);
  color: var(--text-secondary);
}

.toggle {
  margin-left: auto;
  width: 38px;
  height: 22px;
  border-radius: 11px;
  background: var(--bg-raised-2);
  border: 1px solid var(--border-default);
  position: relative;
  transition: background var(--dur-base) var(--ease-in-out), border-color var(--dur-base);
  flex: none;
}

.toggle.on {
  background: var(--accent);
  border-color: var(--accent);
}

.knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--text-primary);
  transition: transform var(--dur-base) var(--ease-in-out);
}

.toggle.on .knob {
  transform: translateX(16px);
  background: #08131f;
}

.hint {
  font-size: var(--fs-xs);
  color: var(--text-tertiary);
}
</style>
