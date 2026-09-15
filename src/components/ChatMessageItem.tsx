import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
  ToastAndroid,
  Platform,
} from 'react-native';
import Markdown, { RenderRules } from 'react-native-markdown-display';
import Clipboard from '@react-native-clipboard/clipboard';
import { ChatMessage } from '../types';
import { CodeBlock } from './CodeBlock';
import { THEME } from '../constants/theme';
import { isResponseIncomplete } from '../constants/prompts';

interface ChatMessageItemProps {
  message: ChatMessage;
  onExpandFullScreen?: (code: string, language: string) => void;
  onRegenerate?: () => void;
  onContinue?: (id: string) => void;
  onDelete?: (id: string) => void;
  isLastAssistant?: boolean;
}

/**
 * 闭合未完成的 Markdown 代码块
 * 当模型在流式输出中生成 ``` 代码块但尚未输出结尾闭合 ``` 时，
 * 动态补全闭合标记，防止 react-native-markdown-display 产生未闭合的 AST 节点或引发 Android 高度塌陷重叠
 */
const closeUnfinishedMarkdown = (text: string): string => {
  if (!text) return '';
  const fenceMatches = text.match(/```/g);
  if (fenceMatches && fenceMatches.length % 2 !== 0) {
    return text + '\n```';
  }
  return text;
};

const createMarkdownRules = (
  onExpandFullScreen?: (code: string, language: string) => void
): RenderRules => ({
  fence: (node) => {
    const language = (node as any).sourceInfo || 'text';
    const code = node.content || '';
    return (
      <CodeBlock
        key={node.key}
        language={language}
        code={code}
        onExpandFullScreen={onExpandFullScreen}
      />
    );
  },
});

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  onExpandFullScreen,
  onRegenerate,
  onContinue,
  onDelete,
  isLastAssistant = false,
}) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState<boolean>(false);
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (message.isStreaming) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(cursorOpacity, {
            toValue: 0.2,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(cursorOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      cursorOpacity.setValue(1);
    }
  }, [message.isStreaming]);

  const handleCopy = () => {
    if (!message.content) return;
    Clipboard.setString(message.content);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 1800);

    if (Platform.OS === 'android') {
      ToastAndroid.show('已复制到剪贴板', ToastAndroid.SHORT);
    }
  };

  const markdownRules = createMarkdownRules(onExpandFullScreen);

  const isLikelyIncomplete =
    !isUser &&
    !message.isStreaming &&
    message.content.length > 0 &&
    isResponseIncomplete(message.content);

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.mentorContainer]}>
      {/* 头部身份区 */}
      {isUser ? (
        <View style={styles.userHeaderRow}>
          <Text style={styles.userName}>J哥</Text>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>J</Text>
          </View>
        </View>
      ) : (
        <View style={styles.mentorHeaderRow}>
          <Image
            source={require('../assets/ai_avatar_robot.png')}
            style={styles.mentorAvatarImg}
          />
          <Text style={styles.mentorName}>AI老祖</Text>
        </View>
      )}

      {/* 消息正文气泡 */}
      {isUser ? (
        <TouchableOpacity
          style={[styles.bubble, styles.userBubble]}
          onLongPress={handleCopy}
          delayLongPress={350}
          activeOpacity={0.92}
        >
          <Text style={styles.userMessageText}>{message.content}</Text>
        </TouchableOpacity>
      ) : (
        <View style={[styles.bubble, styles.mentorBubble]}>
          <View style={styles.mentorContentBox}>
            {message.content ? (
              <Markdown style={markdownStyles} rules={markdownRules}>
                {closeUnfinishedMarkdown(message.content)}
              </Markdown>
            ) : null}

            {/* 流式推演指示灯 */}
            {message.isStreaming && (
              <View style={styles.streamingRow}>
                <Animated.View style={[styles.pulsingDot, { opacity: cursorOpacity }]} />
                <Text style={styles.streamingText}>
                  {message.content ? '正在生成回答...' : 'AI老祖正在深入思考...'}
                </Text>
              </View>
            )}

            {/* PocketPal 性能指标与动作底栏 */}
            {!message.isStreaming && message.content.length > 0 && (
              <View style={styles.bubbleFooter}>
                <View style={styles.statsRow}>
                  {message.stats ? (
                    <Text style={styles.statsText}>
                      {isLikelyIncomplete ? '⚠️ 未完待续' : '✓ 回答完毕'} · ⚡{' '}
                      {message.stats.tokensPerSecond} T/s · {message.stats.totalTokens} tokens
                    </Text>
                  ) : (
                    <Text style={styles.statsText}>
                      {isLikelyIncomplete ? '⚠️ 未完待续' : '✓ 回答完毕'}
                    </Text>
                  )}
                </View>

                <View style={styles.actionButtonsRow}>
                  {/* 仅在非常罕见的残文截断场景下才提供接续按钮，杜绝状态混淆 */}
                  {isLastAssistant && isLikelyIncomplete && onContinue && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnContinueHighlight]}
                      onPress={() => onContinue(message.id)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Text style={[styles.actionBtnText, styles.actionBtnContinueHighlightText]}>
                        ⏩ 接续残文
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={handleCopy}
                    activeOpacity={0.7}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={[styles.actionBtnText, copied && styles.actionBtnTextActive]}>
                      {copied ? '✓ 已复制' : '复制'}
                    </Text>
                  </TouchableOpacity>

                  {isLastAssistant && onRegenerate && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={onRegenerate}
                      activeOpacity={0.7}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Text style={styles.actionBtnText}>重试</Text>
                    </TouchableOpacity>
                  )}

                  {onDelete && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => onDelete(message.id)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Text style={styles.actionBtnText}>删除</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    paddingHorizontal: 12,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  mentorContainer: {
    alignItems: 'stretch',
    width: '100%',
  },

  userHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 12,
    color: THEME.colors.textSub,
    marginRight: 6,
    fontWeight: '600',
  },
  userAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  mentorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  mentorAvatarImg: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: 6,
  },
  mentorName: {
    fontSize: 12,
    color: THEME.colors.primaryLight,
    fontWeight: '600',
  },

  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    maxWidth: '100%',
  },
  userBubble: {
    backgroundColor: THEME.colors.userBubble,
    borderTopRightRadius: 4,
    maxWidth: '85%',
  },
  mentorBubble: {
    backgroundColor: THEME.colors.mentorBubble,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    width: '100%',
    alignSelf: 'stretch',
  },
  mentorContentBox: {
    width: '100%',
  },

  userMessageText: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 22,
  },

  streamingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.primaryLight,
    marginRight: 8,
  },
  streamingText: {
    fontSize: 12,
    color: THEME.colors.textSub,
  },

  bubbleFooter: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: THEME.colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  statsRow: {
    flexShrink: 1,
  },
  statsText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionBtn: {
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  actionBtnText: {
    fontSize: 12,
    color: THEME.colors.textSub,
    fontWeight: '500',
  },
  actionBtnTextActive: {
    color: THEME.colors.accentGreen,
  },
  actionBtnContinueHighlight: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  actionBtnContinueText: {
    color: '#38BDF8',
    fontWeight: '600',
  },
  actionBtnContinueHighlightText: {
    color: '#7DD3FC',
    fontWeight: '700',
  },
});

const markdownStyles: any = {
  body: {
    color: '#F1F5F9',
    fontSize: 15,
    lineHeight: 24,
  },
  text: {
    color: '#F1F5F9',
    fontSize: 15,
    lineHeight: 24,
  },
  paragraph: {
    marginTop: 6,
    marginBottom: 6,
    color: '#F1F5F9',
    fontSize: 15,
    lineHeight: 24,
  },
  strong: {
    color: '#FFFFFF',
    fontWeight: '700' as const,
  },
  em: {
    fontStyle: 'italic' as const,
    color: '#E2E8F0',
  },
  heading1: {
    fontSize: 19,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginTop: 14,
    marginBottom: 8,
  },
  heading2: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 6,
  },
  heading3: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#93C5FD',
    marginTop: 10,
    marginBottom: 4,
  },
  code_inline: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '600' as const,
    fontFamily: THEME.typography.fontMono,
  },
  bullet_list: {
    marginVertical: 4,
    width: '100%',
  },
  ordered_list: {
    marginVertical: 4,
    width: '100%',
  },
  list_item: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    marginVertical: 2,
    width: '100%',
    color: '#F1F5F9',
  },
  bullet_list_icon: {
    color: THEME.colors.primaryLight,
    marginRight: 8,
  },
  ordered_list_icon: {
    color: THEME.colors.primaryLight,
    marginRight: 8,
  },
  bullet_list_content: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    flexDirection: 'column' as const,
  },
  ordered_list_content: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    flexDirection: 'column' as const,
  },
  blockquote: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderLeftColor: THEME.colors.primary,
    borderLeftWidth: 3,
    paddingLeft: 10,
    paddingVertical: 4,
    marginVertical: 6,
    borderRadius: 2,
  },
};