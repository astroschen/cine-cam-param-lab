import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PlatformId, Verbosity } from '@/types/prompt'

/**
 * UI 状态
 * 与参数状态分离：平台、详略级别属于「查看方式」而非「画面参数」，
 * 不进入撤销历史，也不参与 URL 分享的核心内容（但可选带上）。
 */
export const useUiStore = defineStore('ui', () => {
  /** 当前目标平台 */
  const platform = ref<PlatformId>('midjourney')
  /** 提示词详略级别 */
  const verbosity = ref<Verbosity>('standard')
  /** 溯源高亮的参数键（从提示词词条点击跳转到左侧滑块） */
  const focusKey = ref<string | null>(null)
  /** 移动端底部 Tab */
  const mobileTab = ref<'params' | 'preview' | 'prompt'>('preview')
  /** 预设下拉是否展开 */
  const presetOpen = ref(false)

  function setPlatform(id: PlatformId): void {
    platform.value = id
  }

  function setVerbosity(v: Verbosity): void {
    verbosity.value = v
  }

  /** 高亮某个参数（重复点击同一项则取消） */
  function focusParam(key: string | null): void {
    focusKey.value = focusKey.value === key ? null : key
  }

  function clearFocus(): void {
    focusKey.value = null
  }

  return {
    platform,
    verbosity,
    focusKey,
    mobileTab,
    presetOpen,
    setPlatform,
    setVerbosity,
    focusParam,
    clearFocus,
  }
})
