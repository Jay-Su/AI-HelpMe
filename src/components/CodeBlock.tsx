import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { THEME } from '../constants/theme';

interface CodeBlockProps {
  language?: string;
  code: string;
  onExpandFullScreen?: (code: string, language: string) => void;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  language = 'text',
  code,
  onExpandFullScreen,
}) => {
  // 对齐 PocketPal：手机屏幕代码默认开启自动折行，无需费劲横滑，清晰直观；
  const [softWrap, setSoftWrap] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    Clipboard.setString(code);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const displayLang = (language || 'text').toLowerCase();

  return (
    <View style={styles.container}>
      {/* 极客终端顶栏：Mac 三色点 + 语言标签 + 动作组 */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.macDots}>
            <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
            <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
            <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
          </View>
          <Text style={styles.langBadge}>{displayLang}</Text>
        </View>

        <View style={styles.actions}>
          {/* 折行/横滚切换 */}
          <TouchableOpacity
            onPress={() => setSoftWrap(!softWrap)}
            style={[styles.actionBtn, softWrap && styles.actionBtnActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionText, softWrap && styles.actionTextActive]}>
              {softWrap ? '折行' : '横滚'}
            </Text>
          </TouchableOpacity>

          {/* 全屏沉浸读代码 */}
          {onExpandFullScreen && (
            <TouchableOpacity
              onPress={() => onExpandFullScreen(code, displayLang)}
              style={styles.actionBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.actionText}>全屏</Text>
            </TouchableOpacity>
          )}

          {/* 一键复制 */}
          <TouchableOpacity
            onPress={handleCopy}
            style={[styles.actionBtn, copied && styles.actionBtnCopied]}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionText, copied && styles.actionTextCopied]}>
              {copied ? '✓ 已复制' : '复制'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 代码正文视区（对齐 PocketPal：禁用原生 selectable 避免 Android 排版死锁，长按/右上角复制） */}
      {softWrap ? (
        <View style={styles.codeWrapper}>
          <Text style={styles.codeTextSoftWrap}>
            {code}
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
          style={styles.codeWrapper}
        >
          <Text style={styles.codeText}>
            {code}
          </Text>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    borderRadius: THEME.radius.sm,
    backgroundColor: THEME.colors.surfaceSubtle,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderSubtle,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  macDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
    opacity: 0.85,
  },
  langBadge: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    fontFamily: THEME.typography.fontMono,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: THEME.radius.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionBtnActive: {
    backgroundColor: THEME.colors.primaryTealDim,
  },
  actionBtnCopied: {
    backgroundColor: THEME.colors.accentGreenDim,
  },
  actionText: {
    color: THEME.colors.textSub,
    fontSize: 11,
    fontWeight: '500',
  },
  actionTextActive: {
    color: THEME.colors.primaryTeal,
    fontWeight: '600',
  },
  actionTextCopied: {
    color: THEME.colors.accentGreen,
    fontWeight: '600',
  },
  codeWrapper: {
    padding: 10,
  },
  codeText: {
    color: THEME.colors.textCode,
    fontFamily: THEME.typography.fontMono,
    fontSize: 12.5,
    lineHeight: 19,
  },
  codeTextSoftWrap: {
    color: THEME.colors.textCode,
    fontFamily: THEME.typography.fontMono,
    fontSize: 12.5,
    lineHeight: 19,
  },
});
