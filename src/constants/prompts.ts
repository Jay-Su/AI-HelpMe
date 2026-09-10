import { ChatMessage, QuickPrompt } from '../types';
import { KnowledgeChunk } from '../knowledge';

/**
 * AI老祖系统提示词（专为 J哥 护法）
 * 要求实事求是、详尽专业、结构清晰，杜绝胡编乱造
 */
export const MENTOR_SYSTEM_PROMPT = `你是专业渊博的技术导师【AI老祖】。请每次回复开头亲切称呼提问者为“J哥”，为【J哥】提供条理分明、精练透彻的技术解答。优先提炼3~4个核心要点，语言凝练紧凑，突出核心原理与架构本质，篇幅适中切中要害，严禁敷衍与胡编乱造。`;

/**
 * Qwen2.5 纯净标准 ChatML 格式转换器
 * 1. 保留最近 4 条完整上下文（2 轮对话），绝不机械硬截断，确保模型语义完整连贯；
 * 2. 命中知识卡时自然注入权威骨架，未命中时纯净自然放行；
 * 3. 极速 Prefill 响应（对齐 PocketPal 体验）。
 */
export function formatChatML(
  messages: ChatMessage[],
  systemPrompt: string = MENTOR_SYSTEM_PROMPT
): string {
  let prompt = `<|im_start|>system\n${systemPrompt.trim()}<|im_end|>\n`;

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

/**
 * 纯净断点无缝续写 ChatML 格式转换器
 * 核心原理：保持上下文一致，在 assistant 结尾不打 <|im_end|>，而是直接填入已生成的残文前缀，
 * 引导模型基于自回归机制严丝合缝地向下继续生成下一个 Token。
 */
export function formatContinuationChatML(
  contextMessages: ChatMessage[],
  partialAssistantContent: string,
  systemPrompt: string = MENTOR_SYSTEM_PROMPT
): string {
  let prompt = `<|im_start|>system\n${systemPrompt.trim()}<|im_end|>\n`;

  // 历史对话上下文（最多保留最近 4 条）
  const recentMessages = contextMessages.slice(-4);
  for (const msg of recentMessages) {
    const trimmed = msg.content ? msg.content.trim() : '';
    if (!trimmed) continue;
    if (msg.role === 'user') {
      prompt += `<|im_start|>user\n${trimmed}<|im_end|>\n`;
    } else if (msg.role === 'assistant') {
      prompt += `<|im_start|>assistant\n${trimmed}<|im_end|>\n`;
    }
  }

  // 关键：不闭合 assistant，直接带上未完成的半截内容，让模型无缝续吐！
  prompt += `<|im_start|>assistant\n${partialAssistantContent.trimEnd()}`;
  return prompt;
}

/**
 * 智能嗅探助手的回答是否未完成（被截断）
 * 返回 true 表示属于被中断的残文（需断点无缝续写）；
 * 返回 false 表示属于已完整输出的正常回答（点击“继续输出”时应转为深度展开与实战拓展）。
 */
export function isResponseIncomplete(content: string): boolean {
  if (!content) return false;
  const trimmed = content.trim();
  if (trimmed.length === 0) return false;

  // 1. 检查是否有未闭合的代码块 ```
  const codeBlockCount = (trimmed.match(/```/g) || []).length;
  if (codeBlockCount % 2 !== 0) {
    return true; // 代码块被硬截断
  }

  // 2. 如果末尾正好以 ``` 闭合代码块，说明代码块已完整输出
  if (/```$/.test(trimmed)) {
    return false;
  }

  // 3. 检查末尾是否处于英文单词/标识符中间（例如 "class", "from", "import", "func" 等）
  if (/[a-zA-Z0-9_]$/.test(trimmed)) {
    return true;
  }

  // 4. 检查末尾是否为未完结的标点（逗号、冒号、分号、破折号、括号等）
  if (/[,，:：;；、\-——~～(（\[{<"“'‘]\s*$/.test(trimmed)) {
    return true;
  }

  // 5. 检查末尾是否为常见连词/未完结词
  if (/(例如|比如|以及|并且|包括|第一|第二|第三|如下|步骤|原理|优势|痛点|但是|然而|因为)\s*$/.test(trimmed)) {
    return true;
  }

  // 6. 检查是否以正常的句末终结符结束
  const hasSentenceEnd = /[。！？!?…\.\n]$/.test(trimmed);
  if (!hasSentenceEnd) {
    return true;
  }

  return false;
}

/**
 * 已完结回答的进阶深度展开 ChatML 格式转换器
 * 当助手已完整回答上一问题、而用户点击“继续输出”时，
 * 绝不能把完整回答直接喂给模型做前缀续写（会导致模型预测到 <|im_end|> 瞬间 0 token 结束），
 * 而是构造一轮推进式用户指令，引导模型针对上述结论展开深度实战代码与避坑指南。
 */
export function formatAdvancingChatML(
  contextMessages: ChatMessage[],
  fullAssistantContent: string,
  followUpUserPrompt: string = '请针对上述内容，为 J哥 进一步展开补充更深度的生产级实战细节、完整工程代码与关键避坑指南。',
  systemPrompt: string = MENTOR_SYSTEM_PROMPT
): string {
  let prompt = `<|im_start|>system\n${systemPrompt.trim()}<|im_end|>\n`;

  // 历史对话上下文（最多保留最近 4 条）
  const recentMessages = contextMessages.slice(-4);
  for (const msg of recentMessages) {
    const trimmed = msg.content ? msg.content.trim() : '';
    if (!trimmed) continue;
    if (msg.role === 'user') {
      prompt += `<|im_start|>user\n${trimmed}<|im_end|>\n`;
    } else if (msg.role === 'assistant') {
      prompt += `<|im_start|>assistant\n${trimmed}<|im_end|>\n`;
    }
  }

  // 完整闭合当前助手回答，并注入跟进指令
  prompt += `<|im_start|>assistant\n${fullAssistantContent.trim()}<|im_end|>\n`;
  prompt += `<|im_start|>user\n${followUpUserPrompt.trim()}<|im_end|>\n`;
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
