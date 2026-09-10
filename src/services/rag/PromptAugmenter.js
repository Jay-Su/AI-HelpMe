"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptAugmenter = void 0;
const prompts_1 = require("../../constants/prompts");
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
class PromptAugmenter {
    /**
     * 组装带 RAG 骨架的完整 ChatML 提示词
     */
    static buildChatMLPrompt(messages, groundingChunk, systemPrompt = prompts_1.MENTOR_SYSTEM_PROMPT) {
        let prompt = `<|im_start|>system\n${systemPrompt}`;
        // 如果命中了权威知识库，在 system 引导词尾部附加硬履约准则
        if (groundingChunk) {
            const isDoc = groundingChunk.language === 'markdown' || groundingChunk.language === 'text';
            if (isDoc) {
                prompt += `\n\n【本轮权威知识库参考】：
当前问题命中了《${groundingChunk.title}》权威知识库。
请基于下方用户提问中的参考知识，深入透彻、逻辑清晰、体系完整地为 J哥 讲透技术全貌、核心链路与关键步骤，该有的核心概念与流程必须讲全，绝不可太言简意赅，并在末尾附上 [WARN] 避坑指南。`;
            }
            else {
                prompt += `\n\n【本轮代码硬性履约准则】：
当前问题命中了《${groundingChunk.title}》权威代码规范。
代码实现要相对言简意赅、直奔核心，但绝非只有孤零零的代码，必须配备清晰透彻的原理解释文字与生产级完整实现，并在代码后附带 [CORE] 核心机制 与 [WARN] 避坑警示。`;
            }
        }
        prompt += `<|im_end|>\n`;
        // 极速 Prefill 优化：端侧 CPU 仅保留最近 2~3 轮关键上下文，杜绝数千 Token 预填充阻塞
        const recentMessages = messages.slice(-3);
        for (let i = 0; i < recentMessages.length; i++) {
            const msg = recentMessages[i];
            const isLastUserMsg = i === recentMessages.length - 1 && msg.role === 'user';
            if (msg.role === 'user') {
                prompt += `<|im_start|>user\n`;
                // 仅在最后一轮用户提问中注入该轮检索出的 <grounding_reference>
                if (isLastUserMsg && groundingChunk) {
                    const isDoc = groundingChunk.language === 'markdown' || groundingChunk.language === 'text';
                    prompt += `<grounding_reference domain="${groundingChunk.domain}" id="${groundingChunk.chunkId}">
<api_contract>
${groundingChunk.apiContract}
</api_contract>
<${isDoc ? 'knowledge_content' : 'skeleton_template'}>
${groundingChunk.skeletonTemplate}
</${isDoc ? 'knowledge_content' : 'skeleton_template'}>
<pitfall_warnings>
${groundingChunk.pitfalls}
</pitfall_warnings>
</grounding_reference>\n\n`;
                }
                prompt += `${msg.content}<|im_end|>\n`;
            }
            else if (msg.role === 'assistant') {
                // 历史 Assistant 回复做摘要截断（保留前 120 字），既有上下文记忆，又杜绝庞大 Prefill 延迟与复读幻觉
                const cleanContent = msg.content.length > 120
                    ? `${msg.content.slice(0, 120).trim()}...[已略去前轮部分细节]`
                    : msg.content;
                prompt += `<|im_start|>assistant\n${cleanContent}<|im_end|>\n`;
            }
        }
        // 引导大模型输出
        prompt += `<|im_start|>assistant\n`;
        return prompt;
    }
}
exports.PromptAugmenter = PromptAugmenter;
