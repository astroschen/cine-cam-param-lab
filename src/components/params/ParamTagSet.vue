<script setup lang="ts">
import type { TagSetParam } from '@/types/param'

const props = defineProps<{
  param: TagSetParam
  modelValue: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

function toggle(value: string): void {
  const set = new Set(props.modelValue)
  if (set.has(value)) set.delete(value)
  else set.add(value)
  emit('update:modelValue', [...set])
}
</script>

<template>
  <div class="param-row">
    <div class="row-head">
      <span class="row-name">{{ param.label.cn }}</span>
      <span class="row-val">{{ modelValue.length }} 项</span>
    </div>

    <div class="tags">
      <button
        v-for="opt in param.options"
        :key="opt.value"
        class="tag"
        type="button"
        :aria-pressed="modelValue.includes(opt.value)"
        @click="toggle(opt.value)"
      >
        {{ opt.label.cn }}
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
  font-size: var(--fs-xs);
  color: var(--text-tertiary);
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.tag {
  font-size: var(--fs-xs);
  padding: 3px 8px;
  border-radius: 11px;
  border: 1px solid var(--border-default);
  color: var(--text-secondary);
  background: var(--bg-raised);
  transition: color var(--dur-fast), border-color var(--dur-fast), background var(--dur-fast);
}

.tag:hover {
  color: var(--text-primary);
  border-color: var(--border-strong);
}

.tag[aria-pressed='true'] {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--accent-glow);
}

.hint {
  font-size: var(--fs-xs);
  color: var(--text-tertiary);
  margin-top: 6px;
}
</style>
