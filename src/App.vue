<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useParamsStore } from '@/stores/params'
import { useUiStore } from '@/stores/ui'
import { useUniforms } from '@/composables/useUniforms'
import { usePrompt } from '@/composables/usePrompt'
import { PRESETS } from '@/schema/presets'
import { PARAM_SCHEMA } from '@/schema/params'
import { writeState, readState } from '@/utils/urlState'
import type { ParamValue } from '@/types/param'
import TopBar from '@/components/layout/TopBar.vue'
import SidePanel from '@/components/layout/SidePanel.vue'
import CanvasView from '@/components/preview/CanvasView.vue'
import PromptPanel from '@/components/prompt/PromptPanel.vue'

const params = useParamsStore()
const ui = useUiStore()

const uniforms = useUniforms(computed(() => params.values))
const prompt = usePrompt(
  computed(() => params.values),
  computed(() => ui.platform),
  computed(() => ui.verbosity),
)

const toast = ref<string | null>(null)
let toastTimer: number | null = null

function notify(msg: string): void {
  toast.value = msg
  if (toastTimer !== null) window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toast.value = null
    toastTimer = null
  }, 2200)
}

/* ── 参数变更 ── */
function onParamChange(key: string, value: ParamValue): void {
  params.setParam(key, value)
}

function onDragEnd(key: string, before: ParamValue, after: ParamValue): void {
  params.commitParam(key, before, after)
}

/* ── 预设 ── */
function applyPreset(id: string): void {
  const preset = PRESETS.find((p) => p.id === id)
  if (!preset) return
  params.applyPreset(id, preset.values)
  notify(`已套用预设「${preset.label.cn}」`)
}

/* ── 复制提示词 ── */
async function copyPrompt(): Promise<void> {
  const text = [prompt.value.render.body, prompt.value.render.flags].filter(Boolean).join('\n')
  try {
    await navigator.clipboard.writeText(text)
    notify('提示词已复制到剪贴板')
  } catch {
    notify('复制失败，请手动选中复制')
  }
}

/* ── 分享链接 ── */
async function share(): Promise<void> {
  const url = await writeState({
    v: params.serialize(),
    p: ui.platform,
    l: ui.verbosity,
  })
  try {
    await navigator.clipboard.writeText(url)
    notify('分享链接已复制')
  } catch {
    notify('已生成分享链接（复制失败，请手动复制地址栏）')
  }
}

/* ── 导出 JSON ── */
function exportJson(): void {
  const payload = {
    version: 1,
    platform: ui.platform,
    verbosity: ui.verbosity,
    preset: params.activePresetId,
    params: params.serialize(),
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cinecam-params-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  notify('参数 JSON 已导出')
}

/* ── 初始化：从 URL 恢复 ── */
onMounted(async () => {
  const state = await readState()
  if (state?.v) {
    params.deserialize(state.v)
    if (state.p && state.p in { midjourney: 1, stableDiffusion: 1, jimeng: 1, kling: 1, veo: 1 }) {
      ui.platform = state.p as typeof ui.platform
    }
    if (state.l === 'concise' || state.l === 'standard' || state.l === 'verbose') {
      ui.verbosity = state.l
    }
    notify('已从分享链接恢复参数')
  } else {
    params.restore()
  }
})

/** 移动端面板切换 */
function setMobileTab(tab: 'params' | 'preview' | 'prompt'): void {
  ui.mobileTab = tab
}

/** 参数数量与词条数量 */
const stat = computed(() => ({
  params: Object.keys(PARAM_SCHEMA).length,
  tokens: prompt.value.tokens.length,
}))
</script>

<template>
  <div class="app" :data-tab="ui.mobileTab">
    <TopBar
      class="topbar-slot"
      :can-undo="params.canUndo"
      :can-redo="params.canRedo"
      :is-dirty="params.isDirty"
      :active-preset-id="params.activePresetId"
      @undo="params.undo()"
      @redo="params.redo()"
      @reset="params.resetAll()"
      @share="share"
      @export="exportJson"
      @copy-prompt="copyPrompt"
      @apply-preset="applyPreset"
    />

    <div class="body">
      <SidePanel
        class="pane pane-params"
        :values="params.values"
        :group-keys="params.groupKeys"
        :focus-key="ui.focusKey"
        @update:model-value="onParamChange"
        @drag-end="onDragEnd"
        @reset-group="(id) => params.resetGroup(id)"
      />

      <CanvasView
        class="pane pane-preview"
        :uniforms="uniforms"
        :values="params.values"
      />

      <PromptPanel
        class="pane pane-prompt"
        :result="prompt"
        :values="params.values"
        :platform="ui.platform"
        :verbosity="ui.verbosity"
        @update:platform="(v) => ui.setPlatform(v as typeof ui.platform)"
        @update:verbosity="(v) => ui.setVerbosity(v)"
        @focus-param="(k) => ui.focusParam(k)"
      />
    </div>

    <!-- 移动端底部 Tab -->
    <nav class="mobile-tabs" aria-label="面板切换">
      <button
        v-for="t in (['params', 'preview', 'prompt'] as const)"
        :key="t"
        type="button"
        :aria-pressed="ui.mobileTab === t"
        :class="{ active: ui.mobileTab === t }"
        @click="setMobileTab(t)"
      >
        {{ t === 'params' ? '参数' : t === 'preview' ? '预览' : '提示词' }}
      </button>
    </nav>

    <div v-if="toast" class="toast" role="status">{{ toast }}</div>

    <div class="sr-only" aria-live="polite">
      {{ stat.params }} 个参数 · {{ stat.tokens }} 个语义词条
    </div>
  </div>
</template>

<style scoped>
.app {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.body {
  flex: 1;
  display: flex;
  min-height: 0;
}

.pane {
  min-height: 0;
}

.pane-preview {
  flex: 1;
  min-width: 0;
}

.mobile-tabs {
  display: none;
}

.toast {
  position: fixed;
  left: 50%;
  bottom: 28px;
  transform: translateX(-50%);
  padding: 8px 16px;
  background: var(--bg-overlay);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-pop);
  font-size: var(--fs-sm);
  color: var(--text-primary);
  z-index: 100;
  animation: toast-in var(--dur-base) var(--ease-out);
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translate(-50%, 8px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

/* ── 窄屏：单栏 + 底部 Tab ── */
@media (max-width: 1023px) {
  .body {
    position: relative;
  }

  .pane {
    position: absolute;
    inset: 0;
    width: 100% !important;
    border: none;
  }

  .pane-preview {
    z-index: 1;
  }

  .pane-params,
  .pane-prompt {
    z-index: 2;
    background: var(--bg-panel);
  }

  /* 只显示当前 Tab 对应的面板 */
  [data-tab='params'] .pane-preview,
  [data-tab='params'] .pane-prompt,
  [data-tab='preview'] .pane-params,
  [data-tab='preview'] .pane-prompt,
  [data-tab='prompt'] .pane-params,
  [data-tab='prompt'] .pane-preview {
    display: none;
  }

  .mobile-tabs {
    display: flex;
    height: 48px;
    flex: none;
    border-top: 1px solid var(--border-subtle);
    background: var(--bg-panel);
  }

  .mobile-tabs button {
    flex: 1;
    font-size: var(--fs-sm);
    color: var(--text-tertiary);
  }

  .mobile-tabs button.active {
    color: var(--accent);
    box-shadow: inset 0 2px 0 var(--accent);
  }

  .toast {
    bottom: 60px;
  }
}

/* ── 中屏：折叠提示词面板 ── */
@media (min-width: 1024px) and (max-width: 1279px) {
  .body {
    --panel-w: 320px;
    --sidebar-w: 260px;
  }
}
</style>
