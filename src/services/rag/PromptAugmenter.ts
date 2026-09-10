import { ChatMessage } from '../../types';
import { KnowledgeChunk } from '../../knowledge';
import { formatChatML, MENTOR_SYSTEM_PROMPT } from '../../constants/prompts';

/**
 * ============================================================================
 * PromptAugmenter - RAG 槽位包装与动态 Token 预算装配器
 * ============================================================================
 * 
 * 核心设计：
 * 1. 【高置信度知识注入】：当倒排引擎命中领域知识卡时，精准注入核心骨架，约束模型严格基于事实回答。
 * 2. 【零召回静默优雅回退】：若 chunk 为空，绝不注入任何额外干扰，基座模型自然流式回答（对齐 PocketPal）。
 * 3. 【无损上下文】：保留完整消息轮次，杜绝字符级生硬截断造成的语义破碎与幻觉。
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
    return formatChatML(messages, systemPrompt, groundingChunk);
  }
}

