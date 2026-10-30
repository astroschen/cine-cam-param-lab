<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { PRESETS } from '@/schema/presets'

defineProps<{
  canUndo: boolean
  canRedo: boolean
  isDirty: boolean
  activePresetId: string | null
}>()

const emit = defineEmits<{
  undo: []
  redo: []
  reset: []
  share: []
  export: []
  'copy-prompt': []
  'apply-preset': [id: string]
}>()

const open = ref(false)
const rootEl = ref<HTMLElement | null>(null)

/** 预设按分类分组 */
const grouped = computed(() => {
  const map = new Map<string, typeof PRESETS>()
  for (const p of PRESETS) {
    if (!map.has(p.category)) map.set(p.category, [])
    map.get(p.category)!.push(p)
  }
  return [...map.entries()]
})

const CATEGORY_LABEL: Record<string, string> = {
  cinema: '电影质感',
  night: '夜景',
  natural: '自然光',
  commercial: '商业广告',
  documentary: '纪实',
  experimental: '实验风格',
}

function onDocClick(e: MouseEvent): void {
  if (rootEl.value && !rootEl.value.contains(e.target as Node)) open.value = false
}

function onKey(e: KeyboardEvent): void {
  const meta = e.ctrlKey || e.metaKey
  if (!meta) return
  if (e.key.toLowerCase() === 'z') {
    e.preventDefault()
    if (e.shiftKey) emit('redo')
    else emit('undo')
  }
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <header class="topbar">
    <div class="logo">
      <svg class="logo-mark" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9.2" stroke="var(--accent)" stroke-width="1.6" />
        <path d="M12 2.8 L12 12 L19.6 16.6" stroke="var(--accent)" stroke-width="1.6" stroke-linecap="round" />
        <path d="M2.5 20.4 L21.5 20.4" stroke="var(--text-tertiary)" stroke-width="1.3" stroke-linecap="round" />
      </svg>
      <div class="logo-txt">
        CineCam <span>Param Lab</span>
      </div>
    </div>

    <!-- 预设 -->
    <div ref="rootEl" class="preset-wrap">
      <button class="preset-btn" type="button" :aria-expanded="open" @click.stop="open = !open">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
          <path d="M6 9l6 6 6-6" />
        </svg>
        <span>{{ activePresetId ? '已套用预设' : '预设' }}</span>
      </button>

      <div v-if="open" class="preset-menu">
        <div v-for="[cat, list] in grouped" :key="cat" class="preset-cat">
          <div class="preset-cat-title">{{ CATEGORY_LABEL[cat] ?? cat }}</div>
          <button
            v-for="p in list"
            :key="p.id"
            class="preset-item"
            type="button"
            :class="{ active: p.id === activePresetId }"
            @click="emit('apply-preset', p.id); open = false"
          >
            <span class="preset-name">{{ p.label.cn }}</span>
            <span class="preset-desc">{{ p.description.cn }}</span>
          </button>
        </div>
      </div>
    </div>

    <div class="spacer"></div>

    <div class="actions">
      <button class="icon-btn" type="button" title="撤销 (Ctrl+Z)" :disabled="!canUndo" @click="emit('undo')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 8h11a6 6 0 010 12H8" stroke-linecap="round" />
          <path d="M7 4L3 8l4 4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <button class="icon-btn" type="button" title="重做 (Ctrl+Shift+Z)" :disabled="!canRedo" @click="emit('redo')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 8H10a6 6 0 000 12h6" stroke-linecap="round" />
          <path d="M17 4l4 4-4 4" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <button class="icon-btn" type="button" title="重置全部参数" :disabled="!isDirty" @click="emit('reset')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12a9 9 0 109-9" stroke-linecap="round" />
          <path d="M3 3v5h5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>

      <span class="divider-v"></span>

      <button class="icon-btn" type="button" title="复制分享链接" @click="emit('share')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10 13a5 5 0 007.5.5l2-2a5 5 0 00-7-7l-1.2 1.2" stroke-linecap="round" />
          <path d="M14 11a5 5 0 00-7.5-.5l-2 2a5 5 0 007 7l1.2-1.2" stroke-linecap="round" />
        </svg>
      </button>
      <button class="icon-btn" type="button" title="导出参数 JSON" @click="emit('export')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 3v12" stroke-linecap="round" />
          <path d="M7 11l5 5 5-5" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M4 20h16" stroke-linecap="round" />
        </svg>
      </button>

      <button class="btn-primary" type="button" @click="emit('copy-prompt')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="12" height="12" rx="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
        复制提示词
      </button>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  height: var(--topbar-h);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 14px;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border-subtle);
  flex: none;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
}

.logo-mark {
  width: 20px;
  height: 20px;
}

.logo-txt {
  font-size: var(--fs-md);
  font-weight: 600;
  letter-spacing: 0.02em;
}

.logo-txt span {
  color: var(--text-tertiary);
  font-weight: 400;
}

/* ── 预设 ── */
.preset-wrap {
  position: relative;
}

.preset-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  font-size: var(--fs-sm);
  color: var(--text-secondary);
}

.preset-btn:hover {
  border-color: var(--border-strong);
  color: var(--text-primary);
}

.preset-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  width: 320px;
  max-height: 60vh;
  overflow-y: auto;
  background: var(--bg-overlay);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-pop);
  padding: 6px;
  z-index: 50;
}

.preset-cat + .preset-cat {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--border-subtle);
}

.preset-cat-title {
  font-size: var(--fs-2xs);
  letter-spacing: 0.08em;
  color: var(--text-tertiary);
  padding: 4px 8px;
}

.preset-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
}

.preset-item:hover {
  background: var(--bg-raised-2);
}

.preset-item.active {
  background: var(--accent-glow);
}

.preset-name {
  display: block;
  font-size: var(--fs-sm);
  color: var(--text-primary);
}

.preset-item.active .preset-name {
  color: var(--accent);
}

.preset-desc {
  display: block;
  font-size: var(--fs-2xs);
  color: var(--text-tertiary);
  margin-top: 1px;
}

.spacer {
  flex: 1;
}

.actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.divider-v {
  width: 1px;
  height: 18px;
  background: var(--border-subtle);
  margin: 0 4px;
}

.icon-btn {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  color: var(--text-tertiary);
}

.icon-btn:hover:not(:disabled) {
  background: var(--bg-raised);
  color: var(--text-primary);
}

.icon-btn:disabled {
  opacity: 0.32;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 12px;
  margin-left: 6px;
  border-radius: var(--radius-md);
  background: var(--accent);
  color: #08131f;
  font-size: var(--fs-sm);
  font-weight: 500;
}

.btn-primary:hover {
  background: #66b1ff;
}
</style>
