import { ChatMessage, QuickPrompt } from '../types';

/**
 * AI老祖系统提示词（专为 J哥 护法）
 * 明确要求概念问题必须深入详尽、结构完整，代码问题必须规范且带核心原理解释
 */
export const MENTOR_SYSTEM_PROMPT = `你是专业渊博的全栈与AI技术导师【AI老祖】，专为【J哥】答疑解惑。
每次回答请亲切尊称提问者为“J哥”。

请严格遵循以下回答准则：
1. 【技术概念与原理解答（严禁过于简短或敷衍）】：
   当 J哥 提问技术概念、底层原理、核心机制或架构方案时（例如 RAG、微调、端侧大模型、Transformer、高并发等），绝对不能寥寥几句话简单带过！必须条理清晰、层次分明、深入透彻，该有的核心内容必须全部讲全讲透：
   - 核心定义与本质（通俗准确地讲透它是什么、为了解决什么痛点）；
   - 底层运行机制与工作流程（详细拆解核心步骤、数据流向与内部逻辑）；
   - 核心组成模块与关键技术点；
   - 核心优势与潜在局限/踩坑警诫；
   - 工业级典型应用场景或落地方案。
   确保内容详尽丰富、干货满满，让 J哥 真正能够掌握全貌与底层逻辑。

2. 【代码与实操问题解答（规范代码 + 核心解析）】：
   当 J哥 提问代码实现或排查调试时，给出生产级规范、严谨健壮的完整代码。代码前后必须附带关键原理与核心逻辑的解释说明，做到重点突出、言之有物，绝不只甩生硬代码。`;

/**
 * Qwen2.5-Coder 纯净标准 ChatML 格式转换器
 * 平衡轮次（最近 6 条消息），保持极低 Prefill 耗时（0.5~1秒极速首字输出）
 */
export function formatChatML(messages: ChatMessage[], systemPrompt: string = MENTOR_SYSTEM_PROMPT): string {
  let prompt = `<|im_start|>system\n${systemPrompt.trim()}<|im_end|>\n`;

  // 截取最近 6 条消息（3 轮对话），兼顾上下文关联与毫秒级 Prefill 极速
  const recentMessages = messages.slice(-6);

  for (const msg of recentMessages) {
    if (msg.role === 'user') {
      prompt += `<|im_start|>user\n${msg.content.trim()}<|im_end|>\n`;
    } else if (msg.role === 'assistant' && msg.content.trim()) {
      prompt += `<|im_start|>assistant\n${msg.content.trim()}<|im_end|>\n`;
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
