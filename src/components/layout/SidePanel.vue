<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { GroupId, ParamValue } from '@/types/param'
import { PARAM_GROUPS, PARAM_SCHEMA } from '@/schema/params'
import ParamGroup from '@/components/params/ParamGroup.vue'

const props = defineProps<{
  values: Record<string, ParamValue>
  groupKeys: Record<GroupId, string[]>
  focusKey: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [key: string, value: ParamValue]
  'drag-end': [key: string, before: ParamValue, after: ParamValue]
  'reset-group': [groupId: GroupId]
}>()

const search = ref('')

/** 默认展开：曝光 / 镜头 / 影调 / 情绪，其余折叠 */
const openGroups = ref<Set<GroupId>>(
  new Set<GroupId>(['exposure', 'lens', 'tone', 'mood']),
)

function toggleGroup(id: GroupId): void {
  if (openGroups.value.has(id)) openGroups.value.delete(id)
  else openGroups.value.add(id)
}

/** 有多少组被搜索命中 */
const hitCount = computed(() => {
  if (!search.value) return 0
  const q = search.value.toLowerCase()
  let n = 0
  for (const g of PARAM_GROUPS) {
    const keys = props.groupKeys[g.id] ?? []
    for (const key of keys) {
      const p = PARAM_SCHEMA[key]
      if (
        key.toLowerCase().includes(q) ||
        p.label.cn.toLowerCase().includes(q) ||
        p.label.en.toLowerCase().includes(q)
      ) {
        n += 1
        break
      }
    }
  }
  return n
})

/** 溯源高亮时自动展开所属分组 */
watch(
  () => props.focusKey,
  (key) => {
    if (!key) return
    const param = PARAM_SCHEMA[key]
    if (param && !openGroups.value.has(param.group)) {
      openGroups.value.add(param.group)
    }
  },
)
</script>

<template>
  <aside class="sidebar">
    <div class="search">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
      <input v-model="search" type="search" placeholder="搜索参数…" aria-label="搜索参数" />
      <span v-if="search" class="hits">{{ hitCount }}</span>
    </div>

    <div class="scroll scroll-area">
      <ParamGroup
        v-for="g in PARAM_GROUPS"
        :key="g.id"
        :group-id="g.id"
        :group-label="g.label"
        :keys="groupKeys[g.id] ?? []"
        :values="values"
        :open="openGroups.has(g.id) || search.length > 0"
        :filter="search"
        :focus-key="focusKey"
        @toggle="toggleGroup(g.id)"
        @update:model-value="(k, v) => emit('update:modelValue', k, v)"
        @drag-end="(k, b, a) => emit('drag-end', k, b, a)"
        @reset-group="(id) => emit('reset-group', id)"
      />
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: var(--sidebar-w);
  flex: none;
  background: var(--bg-panel);
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.search {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 36px;
  padding: 0 12px;
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text-tertiary);
  flex: none;
}

.search input {
  flex: 1;
  min-width: 0;
  background: none;
  border: none;
  outline: none;
  font-size: var(--fs-sm);
  color: var(--text-primary);
}

.search input::placeholder {
  color: var(--text-tertiary);
}

.search input::-webkit-search-cancel-button {
  appearance: none;
}

.hits {
  font-size: var(--fs-2xs);
  font-family: var(--font-mono);
  color: var(--accent);
}

.scroll {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 24px;
}
</style>
