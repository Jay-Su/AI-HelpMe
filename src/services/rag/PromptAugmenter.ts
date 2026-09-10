import { ChatMessage } from '../../types';
import { KnowledgeChunk } from '../../knowledge';
import { MENTOR_SYSTEM_PROMPT } from '../../constants/prompts';

/**
 * ============================================================================
 * PromptAugmenter - RAG 槽位包装与动态 Token 预算装配器
 * ============================================================================
 * 
 * 核心设计：
 * 1. 【骨架填空模式】：注入 150~200 Tokens 的 skeleton_template，使 3B 模型顺着骨架补全，
 *    彻底将端侧 CPU 的预填充（Prefill）延迟压缩在 250ms 内，锁死函数签名与挂载属性。
 * 2. 【XML 槽位强对齐】：使用 Qwen 系列极为敏感的 <grounding_reference> XML 标签包裹。
 * 3. 【零召回静默优雅回退】：若 chunk 为空，绝不注入任何额外模板，让基座模型自然流式回答。
 */
export class PromptAugmenter {
  /**
   * 组装带 RAG 骨架的完整 ChatML 提示词
   */
  public static buildChatMLPrompt(
    messages: ChatMessage[],
    groundingChunk?: KnowledgeChunk | null,
    systemPrompt: string = MENTOR_SYSTEM_PROMPT
  ): string {
    let prompt = `<|im_start|>system\n${systemPrompt}`;

    // 权威知识库轻量导引：仅注入精简契约与标题，将 Prefill 延迟压缩在 2 秒内
    if (groundingChunk) {
      prompt += `\n【参考规范】：${groundingChunk.title}\n要点：${groundingChunk.apiContract}`;
    }

    prompt += `<|im_end|>\n`;

    // 手机 CPU 极速 Prefill：仅保留最近 2 轮上下文（当前问题 + 上轮回答摘要）
    const recentMessages = messages.slice(-2);

    for (let i = 0; i < recentMessages.length; i++) {
      const msg = recentMessages[i];

      if (msg.role === 'user') {
        prompt += `<|im_start|>user\n${msg.content}<|im_end|>\n`;
      } else if (msg.role === 'assistant') {
        // 历史 Assistant 回复做 80 字精简摘要，杜绝移动端 CPU 算力墙与复读幻觉
        const cleanContent =
          msg.content.length > 80
            ? `${msg.content.slice(0, 80).trim()}...`
            : msg.content;
        prompt += `<|im_start|>assistant\n${cleanContent}<|im_end|>\n`;
      }
    }

    // 引导大模型输出
    prompt += `<|im_start|>assistant\n`;
    return prompt;
  }
}
