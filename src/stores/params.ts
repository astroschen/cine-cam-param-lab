import { defineStore } from 'pinia'
import { computed, reactive, ref, watch } from 'vue'
import type { GroupId, ParamValue, ParamValues } from '@/types/param'
import {
  PARAM_GROUPS,
  PARAM_KEYS,
  PARAM_SCHEMA,
  defaultValues,
  paramsByGroup,
} from '@/schema/params'

/** 单键变更的历史条目 */
interface SingleEntry {
  type: 'single'
  key: string
  before: ParamValue
  after: ParamValue
}

/** 批量变更（预设 / 重置）的历史条目 */
interface SnapshotEntry {
  type: 'snapshot'
  /** 变更前的参数快照（只含被改动的键） */
  before: ParamValues
  /** 变更后的参数快照（只含被改动的键） */
  after: ParamValues
  label: string
}

type HistoryEntry = SingleEntry | SnapshotEntry

const HISTORY_LIMIT = 100
const STORAGE_KEY = 'ccl.params'

export const useParamsStore = defineStore('params', () => {
  /** 扁平键 → 参数值 */
  const values = reactive<ParamValues>(defaultValues())

  /** 撤销栈 */
  const history = ref<HistoryEntry[]>([])
  /** 重做栈 */
  const future = ref<HistoryEntry[]>([])

  /** 当前预设 id */
  const activePresetId = ref<string | null>(null)
  /** 预设覆盖过的键（用于软重置） */
  const presetTouchedKeys = ref<string[]>([])

  const groups = PARAM_GROUPS
  const groupKeys = paramsByGroup()

  const canUndo = computed(() => history.value.length > 0)
  const canRedo = computed(() => future.value.length > 0)

  /** 是否有非默认值的参数 */
  const isDirty = computed(() =>
    PARAM_KEYS.some((key) => !isEqual(values[key], PARAM_SCHEMA[key].default)),
  )

  function isEqual(a: unknown, b: unknown): boolean {
    if (Array.isArray(a) && Array.isArray(b)) {
      return a.length === b.length && a.every((v, i) => v === b[i])
    }
    return a === b
  }

  /** 设置参数 */
  function setParam(key: string, value: ParamValue, commit = true): void {
    const param = PARAM_SCHEMA[key]
    if (!param) return

    const before = values[key]
    if (isEqual(before, value)) return

    // range 类型需要钳制到合法区间
    let next = value
    if (param.type === 'range') {
      const n = Number(value)
      next = Math.min(param.max, Math.max(param.min, n))
    }

    values[key] = next

    if (commit) {
      history.value.push({ type: 'single', key, before, after: next })
      if (history.value.length > HISTORY_LIMIT) history.value.shift()
      future.value = []
    }
  }

  /** 拖动过程中更新，不入历史；松手时 commit */
  function previewParam(key: string, value: ParamValue): void {
    setParam(key, value, false)
  }

  /** 记录一次变更（松手时调用） */
  function commitParam(key: string, before: ParamValue, after: ParamValue): void {
    if (isEqual(before, after)) return
    history.value.push({ type: 'single', key, before, after })
    if (history.value.length > HISTORY_LIMIT) history.value.shift()
    future.value = []
  }

  function undo(): void {
    const entry = history.value.pop()
    if (!entry) return
    if (entry.type === 'single') {
      values[entry.key] = entry.before
    } else {
      for (const [k, v] of Object.entries(entry.before)) values[k] = v
    }
    future.value.push(entry)
  }

  function redo(): void {
    const entry = future.value.pop()
    if (!entry) return
    if (entry.type === 'single') {
      values[entry.key] = entry.after
    } else {
      for (const [k, v] of Object.entries(entry.after)) values[k] = v
    }
    history.value.push(entry)
  }

  /** 应用预设：只覆盖预设包含的键 */
  function applyPreset(presetId: string, presetValues: ParamValues): void {
    const before: ParamValues = {}
    for (const [key, value] of Object.entries(presetValues)) {
      if (!(key in PARAM_SCHEMA)) continue
      before[key] = values[key]
      setParam(key, value, false)
    }
    history.value.push({ type: 'snapshot', before: { ...before }, after: { ...presetValues }, label: 'preset' })
    if (history.value.length > HISTORY_LIMIT) history.value.shift()
    future.value = []

    activePresetId.value = presetId
    presetTouchedKeys.value = Object.keys(presetValues).filter((k) => k in PARAM_SCHEMA)
  }

  /** 软重置：只重置被该预设修改过的键 */
  function softReset(): void {
    if (!presetTouchedKeys.value.length) return
    const before: ParamValues = {}
    const after: ParamValues = {}
    for (const key of presetTouchedKeys.value) {
      const p = PARAM_SCHEMA[key]
      if (!p) continue
      before[key] = values[key]
      const resetValue = p.type === 'tags' ? [...p.default] : p.default
      after[key] = resetValue
      setParam(key, resetValue, false)
    }
    history.value.push({ type: 'snapshot', before: { ...before }, after, label: 'softReset' })
    future.value = []
    presetTouchedKeys.value = []
    activePresetId.value = null
  }

  /** 重置单个分组 */
  function resetGroup(groupId: GroupId): void {
    const before: ParamValues = {}
    const after: ParamValues = {}
    for (const key of groupKeys[groupId]) {
      const p = PARAM_SCHEMA[key]
      before[key] = values[key]
      const resetValue = p.type === 'tags' ? [...p.default] : p.default
      after[key] = resetValue
      setParam(key, resetValue, false)
    }
    history.value.push({ type: 'snapshot', before: { ...before }, after, label: 'resetGroup' })
    future.value = []
  }

  /** 重置全部 */
  function resetAll(): void {
    const before = { ...values }
    const defaults = defaultValues()
    for (const key of PARAM_KEYS) setParam(key, defaults[key], false)
    history.value.push({ type: 'snapshot', before, after: defaults, label: 'resetAll' })
    future.value = []
    activePresetId.value = null
    presetTouchedKeys.value = []
  }

  /** 序列化（用于分享与持久化） */
  function serialize(): ParamValues {
    const out: ParamValues = {}
    for (const key of PARAM_KEYS) out[key] = values[key]
    return out
  }

  /** 反序列化：只接受 schema 中存在的键 */
  function deserialize(input: ParamValues): void {
    for (const key of PARAM_KEYS) {
      if (!(key in input)) continue
      const param = PARAM_SCHEMA[key]
      const v = input[key]
      if (param.type === 'range') {
        const n = Number(v)
        if (Number.isFinite(n)) values[key] = Math.min(param.max, Math.max(param.min, n))
      } else if (param.type === 'select') {
        if (typeof v === 'string' && param.options.some((o) => o.value === v)) values[key] = v
      } else if (param.type === 'toggle') {
        if (typeof v === 'boolean') values[key] = v
      } else if (param.type === 'color') {
        if (typeof v === 'string') values[key] = v
      } else if (param.type === 'tags') {
        if (Array.isArray(v)) {
          values[key] = v.filter((t) => param.options.some((o) => o.value === t))
        }
      }
    }
  }

  // ── 持久化 ──
  function persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serialize()))
    } catch {
      // 隐私模式下 localStorage 可能不可用，忽略
    }
  }

  function restore(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      deserialize(JSON.parse(raw) as ParamValues)
    } catch {
      // 数据损坏时忽略，回退默认值
    }
  }

  watch(
    () => ({ ...values }),
    () => persist(),
    { deep: true },
  )

  return {
    values,
    history,
    future,
    activePresetId,
    presetTouchedKeys,
    groups,
    groupKeys,
    canUndo,
    canRedo,
    isDirty,
    setParam,
    previewParam,
    commitParam,
    undo,
    redo,
    applyPreset,
    softReset,
    resetGroup,
    resetAll,
    serialize,
    deserialize,
    restore,
  }
})
