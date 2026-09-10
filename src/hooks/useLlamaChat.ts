import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { formatChatML, formatContinuationChatML } from '../constants/prompts';
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
      if (msg.role === 'assistant' && !msg.content?.trim() && !msg.isStreaming) {
        return false;
      }
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
    })
    .filter((msg) => {
      if (msg.role === 'assistant' && !msg.content?.trim()) {
        return false;
      }
      return true;
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
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFlushTimeRef = useRef<number>(0);

  const flushThrottledText = useCallback((messageId: string) => {
    if (throttleTimerRef.current) {
      clearTimeout(throttleTimerRef.current);
      throttleTimerRef.current = null;
    }
    const currentContent = currentAssistantTextRef.current;
    setMessages((prevMessages) =>
      prevMessages.map((msg) =>
        msg.id === messageId ? { ...msg, content: currentContent } : msg
      )
    );
    lastFlushTimeRef.current = Date.now();
  }, []);

  const queueThrottledToken = useCallback(
    (messageId: string, generationId: string, newToken: string) => {
      if (activeGenerationIdRef.current !== generationId) return;
      currentAssistantTextRef.current += newToken;

      const now = Date.now();
      const elapsed = now - lastFlushTimeRef.current;
      // 45ms 节流窗口：保证约 22 FPS 的极度顺滑视觉体验，同时减负 60% React 树重新渲染
      if (elapsed >= 45) {
        flushThrottledText(messageId);
      } else if (!throttleTimerRef.current) {
        throttleTimerRef.current = setTimeout(() => {
          throttleTimerRef.current = null;
          flushThrottledText(messageId);
        }, 45 - elapsed);
      }
    },
    [flushThrottledText]
  );

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
      // 纯净标准 ChatML：100% 交由 J哥 微调好的大模型原生推理，质量由 System Prompt 与设置参数调优
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
              queueThrottledToken(assistantMessageId, generationId, newToken);
            },

            onComplete: (stats) => {
              if (activeGenerationIdRef.current !== generationId) return;
              activeGenerationIdRef.current = null;
              flushThrottledText(assistantMessageId);

              setMessages((prevMessages) => {
                if (!currentAssistantTextRef.current.trim()) {
                  const clean = prevMessages.filter((msg) => msg.id !== assistantMessageId);
                  sessionManager.saveActiveSessionMessages(clean).catch(() => {});
                  return clean;
                }

                const finalMessages = prevMessages.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        content: currentAssistantTextRef.current,
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
              flushThrottledText(assistantMessageId);

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
   * 断点续写 / 进阶拓展（继续输出）
   * 1. 若上文被截断（句中未完结、未闭合代码块等）：采用前缀无缝断点续写；
   * 2. 若上文已完整回答：采用进阶深度展开推进模式，并自动追加优雅小标题与分割线。
   */
  const continueGenerating = useCallback(
    async (messageId: string) => {
      if (isGenerating || isGeneratingRef.current) return;

      const targetMsgIndex = messages.findIndex((m) => m.id === messageId);
      if (targetMsgIndex === -1) return;
      const targetMsg = messages[targetMsgIndex];
      if (targetMsg.role !== 'assistant' || !targetMsg.content) return;

      const modelStatus = LlamaService.getStatus();
      if (!modelStatus.isLoaded) {
        setError('未检测到已挂载的模型，请前往设置加载模型。');
        return;
      }

      const generationId = `${Date.now()}_${Math.random()}`;
      activeGenerationIdRef.current = generationId;
      setError(null);
      isGeneratingRef.current = true;
      setIsGenerating(true);

      const existingContent = targetMsg.content;
      currentAssistantTextRef.current = existingContent;

      const settings = SettingsService.getSettings();
      // 上下文为当前消息之前的所有消息
      const contextMessages = messages.slice(0, targetMsgIndex);

      // 纯净断点前缀续写：无缝接着上一 Token 继续向下生成
      const prompt = formatContinuationChatML(
        contextMessages,
        existingContent,
        settings.systemPrompt
      );

      // 标记该消息重新进入流式状态
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isStreaming: true } : m))
      );

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
              queueThrottledToken(messageId, generationId, newToken);
            },
            onComplete: (stats) => {
              if (activeGenerationIdRef.current !== generationId) return;
              activeGenerationIdRef.current = null;
              flushThrottledText(messageId);

              setMessages((prevMessages) => {
                const finalMessages = prevMessages.map((msg) =>
                  msg.id === messageId
                    ? {
                        ...msg,
                        content: currentAssistantTextRef.current,
                        isStreaming: false,
                        stats: {
                          totalTokens: (msg.stats?.totalTokens || 0) + stats.totalTokens,
                          tokensPerSecond: stats.tokensPerSecond,
                          durationMs: (msg.stats?.durationMs || 0) + stats.durationMs,
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
              flushThrottledText(messageId);
              setError(err.message);
              isGeneratingRef.current = false;
              setIsGenerating(false);
              setMessages((prevMessages) => {
                const finalMessages = prevMessages.map((msg) =>
                  msg.id === messageId
                    ? { ...msg, content: currentAssistantTextRef.current, isStreaming: false }
                    : msg
                );
                sessionManager.saveActiveSessionMessages(finalMessages).catch(() => {});
                return finalMessages;
              });
            },
          }
        );
      } catch (err: any) {
        if (activeGenerationIdRef.current === generationId) {
          activeGenerationIdRef.current = null;
          flushThrottledText(messageId);
          setError(err?.message || '续写推理执行异常');
          isGeneratingRef.current = false;
          setIsGenerating(false);
          setMessages((prevMessages) => {
            const finalMessages = prevMessages.map((msg) =>
              msg.id === messageId
                ? { ...msg, content: currentAssistantTextRef.current, isStreaming: false }
                : msg
            );
            sessionManager.saveActiveSessionMessages(finalMessages).catch(() => {});
            return finalMessages;
          });
        }
      }
    },
    [messages, isGenerating, queueThrottledToken, flushThrottledText]
  );

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
    if (throttleTimerRef.current) {
      clearTimeout(throttleTimerRef.current);
      throttleTimerRef.current = null;
    }
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
    continueGenerating,
    regenerateLastMessage,
    deleteMessage,
    stopGenerating,
    resetEngine,
    clearCurrentSession,
    createNewSession,
    switchSession,
  };
}