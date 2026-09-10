import { ChatMessage, QuickPrompt } from '../types';
import { KnowledgeChunk } from '../knowledge';

/**
 * AI老祖系统提示词（专为 J哥 护法）
 * 要求实事求是、详尽专业、结构清晰，杜绝胡编乱造
 */
export const MENTOR_SYSTEM_PROMPT = `你是专业渊博的技术导师【AI老祖】。请每次回复开头亲切称呼提问者为“J哥”，为【J哥】提供深入透彻、条理分明、详尽清晰的专业技术解答（技术概念问题必须阐明核心定义、关键技术模块与完整流程链路；代码实操问题给出规范实现与原理解析）。严禁敷衍与胡编乱造。`;

/**
 * Qwen2.5 纯净标准 ChatML 格式转换器
 * 1. 保留最近 4 条完整上下文（2 轮对话），绝不机械硬截断，确保模型语义完整连贯；
 * 2. 命中知识卡时自然注入权威骨架，未命中时纯净自然放行；
 * 3. 极速 Prefill 响应（对齐 PocketPal 体验）。
 */
export function formatChatML(
  messages: ChatMessage[],
  systemPrompt: string = MENTOR_SYSTEM_PROMPT,
  groundingChunk?: KnowledgeChunk | null
): string {
  let prompt = `<|im_start|>system\n${systemPrompt.trim()}`;

  // 权威知识库注入：若命中高置信度知识卡，将核心骨架注入系统提示词，彻底杜绝幻觉
  if (groundingChunk) {
    prompt += `\n\n【权威技术参考知识 - ${groundingChunk.title}】：\n${groundingChunk.skeletonTemplate.trim()}`;
  }

  prompt += `<|im_end|>\n`;

  // 严格保留最近 4 条完整消息（2 轮问答），保持完整语义，杜绝因残句产生的注意力畸变
  const recentMessages = messages.slice(-4);

  for (const msg of recentMessages) {
    const trimmed = msg.content ? msg.content.trim() : '';
    if (!trimmed) continue;
    if (msg.role === 'user') {
      prompt += `<|im_start|>user\n${trimmed}<|im_end|>\n`;
    } else if (msg.role === 'assistant') {
      prompt += `<|im_start|>assistant\n${trimmed}<|im_end|>\n`;
    }
  }

  // 尾部引导模型开始生成助手回复
  prompt += `<|im_start|>assistant\n`;
  return prompt;
}

export const STOP_TOKENS = ['<|im_end|>', '<|endoftext|>'];

export const QUICK_PROMPTS: QuickPrompt[] = [
  {
    id: 'debug',
    title: '代码诊断',
    icon: 'bug',
    promptPrefix: '请为 J哥 分析以下代码存在的问题，指出潜在隐患并提供优化后的完整代码：\n\n',
  },
  {
    id: 'refactor',
    title: '架构重构',
    icon: 'flash',
    promptPrefix: '请帮 J哥 Review 以下代码，从性能、扩展性与现代工程规范角度进行重构：\n\n',
  },
  {
    id: 'concept',
    title: '核心原理',
    icon: 'bulb',
    promptPrefix: '请为 J哥 详细讲解以下技术方案的核心底层原理、运作机制与关键避坑指南：\n\n',
  },
  {
    id: 'solution',
    title: '方案设计',
    icon: 'cube',
    promptPrefix: '针对以下业务场景与需求，请为 J哥 设计一套生产级的技术落地方案：\n\n',
  },
];
