<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PromptCompileResult, ResolvedToken } from '@/types/prompt'
import type { TokenCategory } from '@/types/param'
import { TOKEN_CATEGORY_LABEL } from '@/types/param'
import { PLATFORMS, PLATFORM_ORDER } from '@/prompt/platforms'
import { BUCKET_ORDER } from '@/prompt/compiler'
import { buildNegative } from '@/prompt/negative'
import { PARAM_SCHEMA } from '@/schema/params'

const props = defineProps<{
  result: PromptCompileResult
  values: Record<string, unknown>
  platform: string
  verbosity: 'concise' | 'standard' | 'verbose'
}>()

const emit = defineEmits<{
  'update:platform': [value: string]
  'update:verbosity': [value: 'concise' | 'standard' | 'verbose']
  'focus-param': [key: string | null]
}>()

const copied = ref(false)
let copyTimer: number | null = null

/** 平台元信息 */
const platformMeta = computed(() => PLATFORMS[props.platform as keyof typeof PLATFORMS])

/** 负面词与反推规则 */
const negative = computed(() => buildNegative(props.values as never))

/** 词条列表：按分类分桶顺序平铺 */
const tokenList = computed(() => {
  const out: { token: ResolvedToken; category: TokenCategory }[] = []
  for (const cat of BUCKET_ORDER) {
    const list = props.result.buckets[cat]
    if (!list) continue
    for (const token of list) out.push({ token, category: cat })
  }
  return out
})

/** 词条总数（含被剪枝掉的） */
const totalTokens = computed(() => props.result.tokens.length)

/** 溯源链：展示前 6 个有来源的词条 */
const chain = computed(() => {
  const out: { key: string; label: string; value: string; token: string }[] = []
  for (const item of tokenList.value) {
    const src = item.token.source
    if (!src || src === 'mood.tags') continue
    const param = PARAM_SCHEMA[src]
    if (!param) continue
    out.push({
      key: src,
      label: param.label.cn,
      value: item.token.sourceValue ?? '',
      token: item.token.en,
    })
    if (out.length >= 6) break
  }
  return out
})

/** 分类色变量名 */
function catVar(cat: TokenCategory): string {
  return `var(--c-${cat})`
}

/** 复制到剪贴板 */
async function copy(): Promise<void> {
  const text = [props.result.render.body, props.result.render.flags, negative.value.text]
    .filter(Boolean)
    .join('\n')
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // 剪贴板不可用时回退到选中文本
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    try {
      document.execCommand('copy')
    } catch {
      /* 忽略 */
    }
    document.body.removeChild(ta)
  }
  copied.value = true
  if (copyTimer !== null) window.clearTimeout(copyTimer)
  copyTimer = window.setTimeout(() => {
    copied.value = false
    copyTimer = null
  }, 1300)
}

function onChipHover(key: string | undefined): void {
  if (key) emit('focus-param', key)
}

function onChipLeave(): void {
  emit('focus-param', null)
}
</script>

<template>
  <aside class="panel">
    <div class="panel-head">
      <div class="tabs" role="tablist" aria-label="目标平台">
        <button
          v-for="id in PLATFORM_ORDER"
          :key="id"
          class="tab"
          type="button"
          role="tab"
          :aria-selected="platform === id"
          :class="{ active: platform === id }"
          @click="emit('update:platform', id)"
        >
          {{ PLATFORMS[id].label.cn }}
        </button>
      </div>

      <div class="seg" role="group" aria-label="提示词详略级别">
        <button
          v-for="v in (['concise', 'standard', 'verbose'] as const)"
          :key="v"
          type="button"
          :aria-pressed="verbosity === v"
          :class="{ active: verbosity === v }"
          @click="emit('update:verbosity', v)"
        >
          {{ v === 'concise' ? '精简' : v === 'standard' ? '标准' : '详尽' }}
        </button>
      </div>
    </div>

    <div class="panel-scroll scroll-area">
      <!-- 正文提示词 -->
      <div class="sec-title">正文提示词</div>
      <div class="out">
        <div class="out-body" :lang="platform === 'jimeng' || platform === 'kling' ? 'zh-CN' : 'en'">
          {{ result.render.body }}
        </div>
        <div v-if="result.render.flags" class="out-flags mono">{{ result.render.flags }}</div>
        <div class="out-foot">
          <span class="mono">{{ result.render.length }} 字 · {{ platformMeta?.style }}</span>
          <button class="copy" type="button" :class="{ done: copied }" @click="copy">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="12" height="12" rx="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            <span>{{ copied ? '已复制' : '复制' }}</span>
          </button>
        </div>
      </div>

      <!-- 语义词条 -->
      <div class="sec-title">语义词条 · {{ totalTokens }}</div>
      <div class="chips">
        <button
          v-for="(item, i) in tokenList"
          :key="`${item.category}-${item.token.en}-${i}`"
          class="chip"
          type="button"
          :title="item.token.source ? `来源：${PARAM_SCHEMA[item.token.source]?.label.cn ?? item.token.source} · ${item.token.sourceValue}` : '语义基础词'"
          @mouseenter="onChipHover(item.token.source)"
          @mouseleave="onChipLeave"
          @focus="onChipHover(item.token.source)"
          @blur="onChipLeave"
          @click="emit('focus-param', item.token.source ?? null)"
        >
          <i class="dot" :style="{ background: catVar(item.category) }"></i>
          <span class="chip-text">{{ item.token.en }}</span>
          <span class="chip-cat">{{ TOKEN_CATEGORY_LABEL[item.category] }}</span>
        </button>
      </div>

      <!-- 溯源链 -->
      <div class="sec-title">溯源映射</div>
      <div class="mapping">
        <button
          v-for="item in chain"
          :key="item.key"
          class="chain"
          type="button"
          @click="emit('focus-param', item.key)"
          @mouseenter="emit('focus-param', item.key)"
          @mouseleave="emit('focus-param', null)"
        >
          <span class="k">{{ item.label }} {{ item.value }}</span>
          <span class="arrow">→</span>
          <span class="t">{{ item.token }}</span>
        </button>
        <p class="hint">参数优先级高于情绪标签 · 点击可定位到左侧滑块</p>
      </div>

      <!-- 保真度 -->
      <div class="sec-title">参数保真度</div>
      <div class="fidelity">
        <span class="fid high">高 <b>{{ result.fidelity.high }}%</b></span>
        <span class="fid medium">中 <b>{{ result.fidelity.medium }}%</b></span>
        <span class="fid low">低 <b>{{ result.fidelity.low }}%</b></span>
      </div>
      <p v-if="result.fidelity.lowParams.length" class="note">
        <template v-for="(p, i) in result.fidelity.lowParams" :key="p.key">
          <b>{{ p.label }} {{ p.value }}</b><span v-if="i < result.fidelity.lowParams.length - 1">、</span>
        </template>
        属低保真度，已转译为体感描述，模型响应更稳定。
      </p>

      <!-- 负面提示词 -->
      <div class="sec-title">负面提示词</div>
      <div class="neg">{{ negative.text }}</div>
      <div v-if="negative.rules.length" class="src">
        <b>反推规则：</b>{{ negative.rules.join('；') }}
      </div>

      <!-- 技术参数 -->
      <div v-if="result.render.tech.length" class="sec-title">技术参数</div>
      <div v-if="result.render.tech.length" class="out tech">
        <div v-for="line in result.render.tech" :key="line" class="tech-line mono">{{ line }}</div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.panel {
  width: var(--panel-w);
  flex: none;
  background: var(--bg-panel);
  border-left: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.panel-head {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: none;
}

.tabs {
  display: flex;
  gap: 2px;
  background: var(--bg-canvas);
  border-radius: var(--radius-md);
  padding: 2px;
}

.tab {
  flex: 1;
  height: 24px;
  font-size: var(--fs-xs);
  color: var(--text-tertiary);
  border-radius: var(--radius-sm);
  transition: background var(--dur-fast) var(--ease-in-out), color var(--dur-fast) var(--ease-in-out);
}

.tab:hover {
  color: var(--text-primary);
}

.tab.active {
  background: var(--bg-raised-2);
  color: var(--accent);
}

.seg {
  display: flex;
  gap: 2px;
  background: var(--bg-canvas);
  border-radius: var(--radius-md);
  padding: 2px;
}

.seg button {
  flex: 1;
  height: 22px;
  font-size: var(--fs-xs);
  color: var(--text-tertiary);
  border-radius: var(--radius-sm);
}

.seg button.active {
  background: var(--bg-raised-2);
  color: var(--text-primary);
}

.panel-scroll {
  flex: 1;
  padding: 14px 12px 32px;
  overflow-y: auto;
}

.sec-title {
  font-size: var(--fs-2xs);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-tertiary);
  margin: 0 0 8px;
}

.sec-title:not(:first-child) {
  margin-top: 18px;
}

/* ── 输出框 ── */
.out {
  background: var(--bg-canvas);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.out-body {
  padding: 11px 12px;
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  line-height: 1.75;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 260px;
  overflow-y: auto;
}

.out-flags {
  padding: 6px 12px;
  border-top: 1px dashed var(--border-subtle);
  font-size: var(--fs-xs);
  color: var(--accent);
}

.out-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 12px;
  border-top: 1px solid var(--border-subtle);
  font-size: var(--fs-2xs);
  color: var(--text-tertiary);
}

.copy {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: var(--fs-xs);
  color: var(--text-secondary);
  padding: 4px 8px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  transition: all var(--dur-fast) var(--ease-in-out);
}

.copy:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.copy.done {
  border-color: var(--state-ok);
  color: var(--state-ok);
}

/* ── 词条 chips ── */
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid var(--border-subtle);
  background: var(--bg-raised);
  font-size: var(--fs-2xs);
  color: var(--text-secondary);
  transition: border-color var(--dur-fast) var(--ease-in-out);
}

.chip:hover {
  border-color: var(--border-strong);
  color: var(--text-primary);
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex: none;
}

.chip-text {
  max-width: 190px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip-cat {
  color: var(--text-tertiary);
  font-size: 9px;
}

/* ── 溯源 ── */
.mapping {
  background: var(--bg-canvas);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 9px 10px;
}

.chain {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  text-align: left;
  padding: 3px 0;
  font-size: var(--fs-2xs);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
}

.chain:hover {
  color: var(--text-primary);
}

.chain .k {
  color: var(--text-primary);
  white-space: nowrap;
}

.chain .arrow {
  color: var(--text-tertiary);
}

.chain .t {
  color: var(--accent);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hint {
  margin-top: 7px;
  font-size: var(--fs-2xs);
  color: var(--text-tertiary);
}

/* ── 保真度 ── */
.fidelity {
  display: flex;
  gap: 6px;
}

.fid {
  flex: 1;
  text-align: center;
  padding: 6px 4px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
  font-size: var(--fs-2xs);
  color: var(--text-tertiary);
}

.fid b {
  display: block;
  font-size: var(--fs-lg);
  font-weight: 500;
  font-family: var(--font-mono);
}

.fid.high b {
  color: var(--state-ok);
}

.fid.medium b {
  color: var(--state-warn);
}

.fid.low b {
  color: var(--state-err);
}

.note {
  margin-top: 7px;
  font-size: var(--fs-2xs);
  line-height: 1.7;
  color: var(--text-tertiary);
}

.note b {
  color: var(--text-secondary);
  font-weight: 400;
}

/* ── 负面词 ── */
.neg {
  padding: 9px 11px;
  background: var(--bg-canvas);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: var(--fs-2xs);
  line-height: 1.8;
  color: var(--text-secondary);
  word-break: break-word;
}

.src {
  margin-top: 7px;
  font-size: var(--fs-2xs);
  line-height: 1.7;
  color: var(--text-tertiary);
}

.src b {
  color: var(--text-secondary);
  font-weight: 500;
}

/* ── 技术参数 ── */
.out.tech {
  padding: 9px 12px;
}

.tech-line {
  font-size: var(--fs-2xs);
  line-height: 1.9;
  color: var(--text-secondary);
}
</style>
