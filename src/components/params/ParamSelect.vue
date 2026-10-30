<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import type { SelectParam } from '@/types/param'

const props = defineProps<{
  param: SelectParam
  modelValue: string
  changed?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)

const current = computed(
  () => props.param.options.find((o) => o.value === props.modelValue) ?? props.param.options[0],
)

function select(value: string): void {
  emit('update:modelValue', value)
  open.value = false
}

function onDocumentClick(e: MouseEvent): void {
  if (!root.value) return
  if (!root.value.contains(e.target as Node)) open.value = false
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') open.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="param-row">
    <div class="row-head">
      <span class="row-name">{{ param.label.cn }}</span>
    </div>

    <div ref="root" class="select-wrap">
      <button
        class="select"
        type="button"
        :aria-expanded="open"
        :aria-haspopup="'listbox'"
        @click="open = !open"
      >
        <span class="label" :class="{ changed }">{{ current?.label.cn }}</span>
        <span v-if="current?.label.en !== current?.label.cn" class="en">{{ current?.label.en }}</span>
        <svg class="chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <Transition name="pop">
        <ul v-if="open" class="options" role="listbox">
          <li v-for="opt in param.options" :key="opt.value">
            <button
              class="option"
              type="button"
              role="option"
              :aria-selected="opt.value === modelValue"
              @click="select(opt.value)"
            >
              <span class="opt-cn">{{ opt.label.cn }}</span>
              <span class="opt-en">{{ opt.label.en }}</span>
            </button>
          </li>
        </ul>
      </Transition>
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

.select-wrap {
  position: relative;
}

.select {
  width: 100%;
  height: var(--control-h);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 9px;
  background: var(--bg-raised);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  font-size: var(--fs-sm);
  color: var(--text-primary);
  text-align: left;
}

.select:hover {
  border-color: var(--border-strong);
}

.label.changed {
  color: var(--accent);
}

.en {
  font-size: var(--fs-2xs);
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chevron {
  margin-left: auto;
  flex: none;
  color: var(--text-tertiary);
}

.options {
  position: absolute;
  z-index: 30;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 260px;
  overflow-y: auto;
  background: var(--bg-overlay);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-pop);
  padding: 3px;
}

.option {
  width: 100%;
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 5px 8px;
  border-radius: var(--radius-sm);
  text-align: left;
  font-size: var(--fs-sm);
  color: var(--text-primary);
}

.option:hover {
  background: var(--bg-raised-2);
}

.option[aria-selected='true'] {
  box-shadow: inset 2px 0 0 var(--accent);
  color: var(--accent);
}

.opt-en {
  font-size: var(--fs-2xs);
  color: var(--text-tertiary);
  margin-left: auto;
}

.pop-enter-active,
.pop-leave-active {
  transition: opacity var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
