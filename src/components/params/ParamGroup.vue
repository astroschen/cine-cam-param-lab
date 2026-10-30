<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { GroupId, ParamValue } from '@/types/param'
import { PARAM_SCHEMA, groupSummary } from '@/schema/params'
import ParamRow from './ParamRow.vue'

const props = defineProps<{
  groupId: GroupId
  groupLabel: { cn: string; en: string }
  keys: string[]
  values: Record<string, ParamValue>
  open: boolean
  /** 搜索关键词，用于过滤参数 */
  filter?: string
  /** 溯源高亮的参数键 */
  focusKey?: string | null
}>()

const emit = defineEmits<{
  'toggle': []
  'update:modelValue': [key: string, value: ParamValue]
  'drag-end': [key: string, before: ParamValue, after: ParamValue]
  'reset-group': [groupId: GroupId]
}>()

/** 过滤后的参数键 */
const visibleKeys = computed(() => {
  if (!props.filter) return props.keys
  const q = props.filter.toLowerCase()
  return props.keys.filter((key) => {
    const p = PARAM_SCHEMA[key]
    return (
      p.label.cn.toLowerCase().includes(q) ||
      p.label.en.toLowerCase().includes(q) ||
      key.toLowerCase().includes(q)
    )
  })
})

/** 分组摘要 */
const summary = computed(() => groupSummary(props.groupId, props.values))

/** 高亮行 DOM，用于滚动定位 */
const rowEls = ref<Record<string, HTMLElement | null>>({})

/** 高亮命中本组时，滚动到可视区域 */
watch(
  () => props.focusKey,
  async (key) => {
    if (!key) return
    await nextTick()
    const el = rowEls.value[key]
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  },
)

/** 该组是否全部为默认值 */
const isDefault = computed(() => {
  for (const key of props.keys) {
    const p = PARAM_SCHEMA[key]
    if (p.type === 'tags') {
      const arr = props.values[key] as string[]
      if (arr.length !== p.default.length || arr.some((v, i) => v !== p.default[i])) return false
    } else if (props.values[key] !== p.default) {
      return false
    }
  }
  return true
})
</script>

<template>
  <section v-if="visibleKeys.length" class="group" :data-open="String(open)">
    <button class="group-head" type="button" :aria-expanded="open" @click="emit('toggle')">
      <svg class="caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
        <path d="M6 9l6 6 6-6" />
      </svg>
      <span class="group-name">{{ groupLabel.cn }}</span>
      <span class="group-summary">{{ summary }}</span>
    </button>

    <div v-show="open" class="group-body">
      <div
        v-for="key in visibleKeys"
        :key="key"
        :ref="(el) => { rowEls[key] = (el as HTMLElement | null) ?? null }"
      >
        <ParamRow
          :param-key="key"
          :model-value="values[key]"
          :focused="focusKey === key"
          @update:model-value="emit('update:modelValue', key, $event)"
          @drag-end="(k, b, a) => emit('drag-end', k, b, a)"
        />
      </div>

      <button
        v-if="!isDefault"
        class="reset-group"
        type="button"
        @click="emit('reset-group', groupId)"
      >
        重置本组
      </button>
    </div>
  </section>
</template>

<style scoped>
.group {
  border-bottom: 1px solid var(--border-subtle);
}

.group-head {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 12px;
  text-align: left;
}

.group-head:hover {
  background: var(--bg-raised);
}

.caret {
  width: 8px;
  height: 8px;
  flex: none;
  color: var(--text-tertiary);
  transition: transform var(--dur-base) var(--ease-in-out);
}

.group[data-open='false'] .caret {
  transform: rotate(-90deg);
}

.group-name {
  font-size: var(--fs-sm);
  font-weight: 500;
}

.group-summary {
  margin-left: auto;
  font-size: var(--fs-xs);
  color: var(--text-tertiary);
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-body {
  padding: 2px 12px 14px;
}

.reset-group {
  margin-top: 10px;
  font-size: var(--fs-xs);
  color: var(--text-tertiary);
  padding: 3px 0;
}

.reset-group:hover {
  color: var(--accent);
}
</style>
