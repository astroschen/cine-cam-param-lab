import { computed, type ComputedRef, type Ref } from 'vue'
import type { ParamValues } from '@/types/param'
import type { PlatformId, PromptCompileResult, Verbosity } from '@/types/prompt'
import { compileTokens, pruneByVerbosity } from '@/prompt/compiler'
import { renderForPlatform } from '@/prompt/platforms'
import { buildNegative } from '@/prompt/negative'

/**
 * 响应式提示词
 * 参数变化 → token 重编译 → 平台渲染，全链路 < 5ms
 */
export function usePrompt(
  values: Ref<ParamValues> | ComputedRef<ParamValues>,
  platform: Ref<PlatformId>,
  verbosity: Ref<Verbosity>,
): ComputedRef<PromptCompileResult> {
  return computed(() => {
    const v = values.value
    const { tokens, buckets, fidelity } = compileTokens(v)
    const pruned = pruneByVerbosity(buckets, verbosity.value)

    const rendered = renderForPlatform(platform.value, pruned, verbosity.value, v)
    const negative = buildNegative(v)

    return {
      tokens,
      buckets: pruned,
      fidelity,
      render: {
        body: rendered.body,
        negative: negative.text,
        flags: rendered.flags,
        tech: rendered.tech,
        length: rendered.length,
      },
    }
  })
}
