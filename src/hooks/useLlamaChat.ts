import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { formatChatML } from '../constants/prompts';
import { SettingsService } from '../services/settings/SettingsService';
import LlamaService from '../services/llama/LlamaService';
import { sessionManager } from '../services/session/SessionManager';

/**
 * 自动净化会话历史消息：
 * 过滤残存的中断标识与未闭合的 isStreaming
 */
const sanitizeMessages = (rawMessages: ChatMessage[]): ChatMessage[] => {
  return (rawMessages || [])
    .filter((msg) => {
      if (
        msg.role === 'assistant' &&
        (msg.content === '[上次推演已中断]' ||
          msg.content.includes('模型当前正在生成中') ||
          msg.content.includes('[未完成推演:'))
      ) {
        return false;
      }
      return true;
    })
    .map((msg) => {
      if (msg.isStreaming) {
        return {
          ...msg,
          isStreaming: false,
        };
      }
      return msg;
    });
};

export function useLlamaChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 原生原子锁与引用
  const isGeneratingRef = useRef<boolean>(false);
  const activeGenerationIdRef = useRef<string | null>(null);
  const currentAssistantTextRef = useRef<string>('');
  const currentSessionIdRef = useRef<string>('');

  useEffect(() => {
    let isMounted = true;

    // 初始化配置与会话
    SettingsService.init().catch(() => {});

    sessionManager.init().then(() => {
      if (!isMounted) return;
      const active = sessionManager.getActiveSession();
      currentSessionIdRef.current = active.id;
      const cleanMsgs = sanitizeMessages(active.messages || []);
      setMessages(cleanMsgs);
    });

    const unsubscribe = sessionManager.subscribe(() => {
      if (!isMounted) return;
      const active = sessionManager.getActiveSession();
      if (active.id !== currentSessionIdRef.current) {
        currentSessionIdRef.current = active.id;
        const cleanMsgs = sanitizeMessages(active.messages || []);
        setMessages(cleanMsgs);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const sendMessage = useCallback(
    async (userInput: string) => {
      const trimmedInput = userInput.trim();
      if (!trimmedInput) return;

      if (isGenerating || isGeneratingRef.current || LlamaService.getIsGenerating()) {
        console.warn('[useLlamaChat] 引擎正忙，丢弃重复调用');
        return;
      }

      const modelStatus = LlamaService.getStatus();
      if (modelStatus.isLoading) {
        setError('模型正在载入手机内存，请稍等片刻...');
        return;
      }
      if (!modelStatus.isLoaded) {
        setError('未检测到已挂载的模型，请点击右上角设置加载模型。');
        return;
      }

      const generationId = `${Date.now()}_${Math.random()}`;
      activeGenerationIdRef.current = generationId;

      setError(null);
      isGeneratingRef.current = true;
      setIsGenerating(true);

      const userMessageId = `user_${Date.now()}`;
      const assistantMessageId = `assistant_${Date.now()}`;

      const userMessage: ChatMessage = {
        id: userMessageId,
        role: 'user',
        content: trimmedInput,
        timestamp: Date.now(),
      };

      const placeholderAssistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      };

      const updatedMessages = [...messages, userMessage];
      setMessages([...updatedMessages, placeholderAssistantMessage]);
      currentAssistantTextRef.current = '';

      // 后台非阻塞持久化，绝不延迟原生推理调度
      sessionManager.saveActiveSessionMessages([...updatedMessages, placeholderAssistantMessage]).catch(() => {});

      const settings = SettingsService.getSettings();
      // 纯净标准 ChatML，无任何多余 XML 槽位，秒级响应
      const prompt = formatChatML(updatedMessages, settings.systemPrompt);

      try {
        await LlamaService.completion(
          prompt,
          {
            temperature: settings.temperature,
            topP: settings.topP,
            maxTokens: settings.maxTokens,
          },
          {
            onToken: (newToken: string) => {
              if (activeGenerationIdRef.current !== generationId) return;

              currentAssistantTextRef.current += newToken;
              const currentContent = currentAssistantTextRef.current;

              setMessages((prevMessages) =>
                prevMessages.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: currentContent }
                    : msg
                )
              );
            },

            onComplete: (stats) => {
              if (activeGenerationIdRef.current !== generationId) return;
              activeGenerationIdRef.current = null;

              setMessages((prevMessages) => {
                const finalMessages = prevMessages.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        isStreaming: false,
                        stats: {
                          totalTokens: stats.totalTokens,
                          tokensPerSecond: stats.tokensPerSecond,
                          durationMs: stats.durationMs,
                          timeToFirstTokenMs: stats.timeToFirstTokenMs,
                        },
                      }
                    : msg
                );
                sessionManager.saveActiveSessionMessages(finalMessages).catch(() => {});
                return finalMessages;
              });
              isGeneratingRef.current = false;
              setIsGenerating(false);
            },

            onError: (err: Error) => {
              if (activeGenerationIdRef.current !== generationId) return;
              activeGenerationIdRef.current = null;

              setError(err.message);
              isGeneratingRef.current = false;
              setIsGenerating(false);

              if (!currentAssistantTextRef.current) {
                setMessages((prev) => {
                  const clean = prev.filter((m) => m.id !== assistantMessageId);
                  sessionManager.saveActiveSessionMessages(clean).catch(() => {});
                  return clean;
                });
              } else {
                setMessages((prevMessages) => {
                  const finalMessages = prevMessages.map((msg) =>
                    msg.id === assistantMessageId
                      ? {
                          ...msg,
                          content: msg.content + `\n\n[⚠️ 生成中断: ${err.message}]`,
                          isStreaming: false,
                        }
                      : msg
                  );
                  sessionManager.saveActiveSessionMessages(finalMessages).catch(() => {});
                  return finalMessages;
                });
              }
            },
          }
        );
      } catch (err: any) {
        if (activeGenerationIdRef.current === generationId) {
          activeGenerationIdRef.current = null;
          const errorMsg = err?.message || '推理引擎执行发生异常';
          setError(errorMsg);
          isGeneratingRef.current = false;
          setIsGenerating(false);

          if (!currentAssistantTextRef.current) {
            setMessages((prev) => {
              const clean = prev.filter((m) => m.id !== assistantMessageId);
              sessionManager.saveActiveSessionMessages(clean).catch(() => {});
              return clean;
            });
          } else {
            setMessages((prevMessages) => {
              const finalMessages = prevMessages.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content: msg.content + `\n\n[⚠️ 执行异常: ${errorMsg}]`,
                      isStreaming: false,
                    }
                  : msg
              );
              sessionManager.saveActiveSessionMessages(finalMessages).catch(() => {});
              return finalMessages;
            });
          }
        }
      }
    },
    [messages, isGenerating]
  );

  /**
   * 重新生成（对齐 PocketPal 的重试功能）
   * 自动截断最后一条回答，重新发起推理
   */
  const regenerateLastMessage = useCallback(async () => {
    if (isGenerating || isGeneratingRef.current || messages.length === 0) return;

    // 找到最后一条用户提问
    let lastUserIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserIndex = i;
        break;
      }
    }

    if (lastUserIndex === -1) return;

    const userPrompt = messages[lastUserIndex].content;
    // 截取到该用户消息之前的列表
    const trimmedHistory = messages.slice(0, lastUserIndex);
    setMessages(trimmedHistory);
    await sessionManager.saveActiveSessionMessages(trimmedHistory);

    // 重新发送
    setTimeout(() => {
      sendMessage(userPrompt);
    }, 50);
  }, [messages, isGenerating, sendMessage]);

  /**
   * 删除单条消息（对齐 PocketPal）
   */
  const deleteMessage = useCallback(async (messageId: string) => {
    if (isGenerating) return;
    setMessages((prev) => {
      const updated = prev.filter((m) => m.id !== messageId);
      sessionManager.saveActiveSessionMessages(updated).catch(() => {});
      return updated;
    });
  }, [isGenerating]);

  const stopGenerating = useCallback(async () => {
    activeGenerationIdRef.current = null;
    isGeneratingRef.current = false;
    setIsGenerating(false);
    LlamaService.stop().catch(() => {});

    setMessages((prev) => {
      const finalMessages = prev
        .filter((m) => !(m.isStreaming && !m.content))
        .map((m) =>
          m.isStreaming ? { ...m, isStreaming: false, content: m.content || '[已主动中止]' } : m
        );
      sessionManager.saveActiveSessionMessages(finalMessages).catch(() => {});
      return finalMessages;
    });
  }, []);

  const resetEngine = useCallback(async () => {
    activeGenerationIdRef.current = null;
    isGeneratingRef.current = false;
    setIsGenerating(false);
    setError(null);
    LlamaService.stop().catch(() => {});

    setMessages((prev) => {
      const finalMessages = prev
        .filter((m) => !(m.isStreaming && !m.content))
        .map((m) =>
          m.isStreaming ? { ...m, isStreaming: false, content: m.content || '[已重置状态]' } : m
        );
      sessionManager.saveActiveSessionMessages(finalMessages).catch(() => {});
      return finalMessages;
    });
  }, []);

  const clearCurrentSession = useCallback(async () => {
    activeGenerationIdRef.current = null;
    isGeneratingRef.current = false;
    setIsGenerating(false);
    setError(null);
    LlamaService.stop().catch(() => {});

    setMessages([]);
    await sessionManager.saveActiveSessionMessages([]);
  }, []);

  const createNewSession = useCallback(async () => {
    activeGenerationIdRef.current = null;
    isGeneratingRef.current = false;
    setIsGenerating(false);
    setError(null);
    LlamaService.stop().catch(() => {});

    const newSession = await sessionManager.createSession('all');
    currentSessionIdRef.current = newSession.id;
    setMessages([]);
  }, []);

  const switchSession = useCallback(async (sessionId: string) => {
    activeGenerationIdRef.current = null;
    isGeneratingRef.current = false;
    setIsGenerating(false);
    setError(null);

    LlamaService.stop().catch(() => {});

    await sessionManager.switchSession(sessionId);
    const active = sessionManager.getActiveSession();
    currentSessionIdRef.current = active.id;
    const cleanMsgs = sanitizeMessages(active.messages || []).map((m) =>
      m.isStreaming ? { ...m, isStreaming: false } : m
    );
    setMessages(cleanMsgs);
  }, []);

  return {
    messages,
    isGenerating,
    error,
    sendMessage,
    regenerateLastMessage,
    deleteMessage,
    stopGenerating,
    resetEngine,
    clearCurrentSession,
    createNewSession,
    switchSession,
  };
}