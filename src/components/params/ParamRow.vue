<script setup lang="ts">
import { computed } from 'vue'
import type { Param, ParamValue } from '@/types/param'
import { PARAM_SCHEMA, needsApproxMark } from '@/schema/params'
import ParamSlider from './ParamSlider.vue'
import ParamSelect from './ParamSelect.vue'
import ParamToggle from './ParamToggle.vue'
import ParamColor from './ParamColor.vue'
import ParamTagSet from './ParamTagSet.vue'

const props = defineProps<{
  paramKey: string
  modelValue: ParamValue
  /** 低保真度提示文本 */
  approxNote?: string
  /** 由提示词词条溯源触发的高亮 */
  focused?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ParamValue]
  'drag-end': [key: string, before: ParamValue, after: ParamValue]
}>()

const param = computed(() => PARAM_SCHEMA[props.paramKey] as Param)

/** 是否与默认值不同 */
const changed = computed(() => {
  const p = param.value
  if (p.type === 'tags') {
    const arr = props.modelValue as string[]
    return arr.length !== p.default.length || arr.some((v, i) => v !== p.default[i])
  }
  return props.modelValue !== p.default
})

/** 是否显示 ≈ 角标 */
const showApprox = computed(() => needsApproxMark(props.paramKey))

function onSliderEnd(before: number, after: number): void {
  emit('drag-end', props.paramKey, before, after)
}
</script>

<template>
  <div class="param-item" :class="{ focused: props.focused }">
    <span v-if="showApprox" class="approx" :title="approxNote" aria-hidden="true">≈</span>

    <ParamSlider
      v-if="param.type === 'range'"
      :param="param"
      :model-value="props.modelValue as number"
      :changed="changed"
      @update:model-value="emit('update:modelValue', $event)"
      @drag-end="onSliderEnd"
    />

    <ParamSelect
      v-else-if="param.type === 'select'"
      :param="param"
      :model-value="props.modelValue as string"
      :changed="changed"
      @update:model-value="emit('update:modelValue', $event)"
    />

    <ParamToggle
      v-else-if="param.type === 'toggle'"
      :param="param"
      :model-value="props.modelValue as boolean"
      @update:model-value="emit('update:modelValue', $event)"
    />

    <ParamColor
      v-else-if="param.type === 'color'"
      :param="param"
      :model-value="props.modelValue as string"
      @update:model-value="emit('update:modelValue', $event)"
    />

    <ParamTagSet
      v-else-if="param.type === 'tags'"
      :param="param"
      :model-value="props.modelValue as string[]"
      @update:model-value="emit('update:modelValue', $event)"
    />
  </div>
</template>

<style scoped>
.param-item {
  position: relative;
}

.param-item.focused {
  background: var(--accent-glow);
  border-radius: var(--radius-sm);
  box-shadow: inset 2px 0 0 var(--accent);
}

.approx {
  position: absolute;
  left: -11px;
  top: 11px;
  font-size: var(--fs-2xs);
  color: var(--state-warn);
  cursor: help;
  z-index: 1;
}
</style>
