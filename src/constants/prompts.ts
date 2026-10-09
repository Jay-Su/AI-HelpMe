import { ChatMessage, QuickPrompt } from '../types';
import { KnowledgeChunk } from '../knowledge';

/**
 * AI老祖系统提示词（专为 J哥 护法）
 * 要求实事求是、详尽专业、结构清晰，杜绝胡编乱造
 */
export const MENTOR_SYSTEM_PROMPT = `你是专业渊博的技术导师【AI老祖】。请每次回复开头亲切称呼提问者为“J哥”，为【J哥】提供详尽透彻、条理清晰的技术解答。结合核心架构原理与完整的实战工程代码，逻辑严谨，深入浅出，实事求是，切中要害。`;

/**
 * 从文本中提取关键技术实体词（用于指代消解与主题锚定）
 */
function extractTechnicalKeywords(text: string): string[] {
  if (!text) return [];
  // 匹配英文技术术语、连字符/点号命名（如 MCP, Docker, React-Native, SpringBoot, Agent 等）
  const matches = text.match(/[A-Za-z0-9_\-\.]{2,}/g) || [];
  const stopWords = new Set([
    'about', 'what', 'how', 'when', 'where', 'why', 'the', 'and', 'for', 'with',
    'this', 'that', 'code', 'help', 'can', 'you', 'app', 'run', 'make'
  ]);
  const filtered = matches.filter((w) => !stopWords.has(w.toLowerCase()));
  return Array.from(new Set(filtered));
}

/**
 * 历史会话主题锚定（轻量指代消解算法）
 * 从前序用户提问中倒叙追溯最近讨论的核心技术主题
 */
export function resolveTopicAnchor(messages: ChatMessage[]): string | null {
  const userMsgs = messages.filter((m) => m.role === 'user');
  // 从倒数第二个用户问题开始往前查找（排除当前这一条）
  for (let i = userMsgs.length - 2; i >= 0; i--) {
    const keywords = extractTechnicalKeywords(userMsgs[i].content);
    if (keywords.length > 0) {
      return keywords.slice(0, 3).join(' / ');
    }
  }
  return null;
}

/**
 * 助手回答内容非对称压缩（骨架脱水）
 * @param content 原始回答内容
 * @param isImmediatePrevious 是否为紧邻当前问题的上一轮回答
 */
export function compressAssistantContent(
  content: string,
  isImmediatePrevious: boolean = false
): string {
  if (!content) return '';
  let text = content.trim();

  // 1. 如果是紧邻上一轮回答：用户极可能正在进行调试、连续改动或基于其追问，因此保留实现架构
  if (isImmediatePrevious) {
    // 若代码块行数超过 16 行，适度折叠中间冗余实现，保留类/函数声明与尾部结构
    return text.replace(
      /```([a-zA-Z0-9_\-#]*)\n([\s\S]*?)```/g,
      (match, lang, code) => {
        const lines = code.trim().split('\n');
        if (lines.length > 16) {
          const head = lines.slice(0, 8).join('\n');
          const tail = lines.slice(-3).join('\n');
          return `\`\`\`${lang}\n${head}\n// ... (中间 ${lines.length - 11} 行实现已折叠) ...\n${tail}\n\`\`\``;
        }
        return match;
      }
    );
  }

  // 2. 更早的历史助手回答：启动强力骨架脱水（剥离巨幅代码块，节省 80%+ 算力）
  text = text.replace(/```([a-zA-Z0-9_\-#]*)\n[\s\S]*?```/g, (match, lang) => {
    const langLabel = lang ? ` ${lang.trim()} ` : ' ';
    return `[此处已提供${langLabel}模块核心实现代码与依赖配置]`;
  });

  // 如果剩余解释文本依然过长（超过 140 字符），仅保留前 120 字符核心结论
  if (text.length > 140) {
    text = text.slice(0, 120).trim() + '... [其余前置推演已折叠]';
  }
  return text;
}

/**
 * 智能上下文优化器（Asymmetric Context Optimizer）
 * 1. 【用户提问链路全保留】：优先保留最近 6 轮所有的用户输入，保证意图和话题演化不断代；
 * 2. 【历史回答智能脱水】：更早轮次的 Assistant 代码进行骨架压缩，大幅消减长上下文；
 * 3. 【轻量指代消解锚定】：当检测到短输入或指代代词时，自动注入前序技术主题锚点；
 * 4. 【算力预算保护】：将总 Prompt 锁定在端侧 CPU 黄金性能区间（~2000 字符，约 400~500 tokens）。
 */
export function optimizeContextMessages(
  messages: ChatMessage[],
  maxTotalChars: number = 2200
): ChatMessage[] {
  if (!messages || messages.length === 0) return [];

  const lastIndex = messages.length - 1;
  const lastMsg = messages[lastIndex];

  // 检测最后一条用户提问是否需要指代消解与主题锚定增强
  let enhancedLastContent = lastMsg.content ? lastMsg.content.trim() : '';
  if (lastMsg.role === 'user') {
    const isShortQuery = enhancedLastContent.length <= 16;
    const hasAmbiguousRef = /(怎么写|怎么用|怎么做|如何实现|怎么配|改成|它的|这个|上面那个|怎么写一个|如何引入)/.test(
      enhancedLastContent
    );
    if (isShortQuery || hasAmbiguousRef) {
      const topic = resolveTopicAnchor(messages);
      if (
        topic &&
        !enhancedLastContent.toLowerCase().includes(topic.toLowerCase().split(' / ')[0])
      ) {
        enhancedLastContent = `(承接关于【${topic}】的讨论) ${enhancedLastContent}`;
      }
    }
  }

  const result: ChatMessage[] = [];
  result.unshift({ ...lastMsg, content: enhancedLastContent });

  let accumulatedChars = enhancedLastContent.length;
  let assistantCountFromRecent = 0;

  // 倒序遍历更早的历史消息，直至填满安全预算
  for (let i = lastIndex - 1; i >= 0; i--) {
    const msg = messages[i];
    if (!msg.content || !msg.content.trim()) continue;

    let processedContent = msg.content.trim();
    if (msg.role === 'assistant') {
      assistantCountFromRecent++;
      const isImmediatePrevious = assistantCountFromRecent === 1;
      processedContent = compressAssistantContent(processedContent, isImmediatePrevious);
    } else if (msg.role === 'user') {
      // 用户问题短小精悍，完整保留
      processedContent = msg.content.trim();
    }

    if (accumulatedChars + processedContent.length > maxTotalChars) {
      // 达到端侧 CPU 舒适预算上限，停止纳入更旧历史
      break;
    }

    accumulatedChars += processedContent.length;
    result.unshift({ ...msg, content: processedContent });
  }

  return result;
}

/**
 * Qwen2.5 纯净标准 ChatML 格式转换器（已集成智能上下文优化与指代消解）
 */
export function formatChatML(
  messages: ChatMessage[],
  systemPrompt: string = MENTOR_SYSTEM_PROMPT
): string {
  let prompt = '';
  const trimmedSystem = systemPrompt ? systemPrompt.trim() : '';
  if (trimmedSystem.length > 0) {
    prompt += `<|im_start|>system\n${trimmedSystem}<|im_end|>\n`;
  }

  // 经过高阶上下文优化器脱水与锚定
  const optimizedMessages = optimizeContextMessages(messages);

  for (const msg of optimizedMessages) {
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
 * 纯净断点无缝续写 ChatML 格式转换器（已集成智能上下文优化）
 */
export function formatContinuationChatML(
  contextMessages: ChatMessage[],
  partialAssistantContent: string,
  systemPrompt: string = MENTOR_SYSTEM_PROMPT
): string {
  let prompt = '';
  const trimmedSystem = systemPrompt ? systemPrompt.trim() : '';
  if (trimmedSystem.length > 0) {
    prompt += `<|im_start|>system\n${trimmedSystem}<|im_end|>\n`;
  }

  // 历史对话上下文经过高阶优化
  const optimizedMessages = optimizeContextMessages(contextMessages);
  for (const msg of optimizedMessages) {
    const trimmed = msg.content ? msg.content.trim() : '';
    if (!trimmed) continue;
    if (msg.role === 'user') {
      prompt += `<|im_start|>user\n${trimmed}<|im_end|>\n`;
    } else if (msg.role === 'assistant') {
      prompt += `<|im_start|>assistant\n${trimmed}<|im_end|>\n`;
    }
  }

  // 关键：不闭合 assistant，直接带上未完成的半截内容，让模型无缝续吐！
  let contentToAppend = partialAssistantContent || '';
  if (/(```[a-zA-Z0-9_\-#]*)$/.test(contentToAppend.trimEnd())) {
    contentToAppend = contentToAppend.trimEnd() + '\n';
  }

  prompt += `<|im_start|>assistant\n${contentToAppend}`;
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

  // 历史对话上下文经过高阶优化
  const optimizedMessages = optimizeContextMessages(contextMessages);
  for (const msg of optimizedMessages) {
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
