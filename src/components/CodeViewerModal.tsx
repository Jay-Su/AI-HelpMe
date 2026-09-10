import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { THEME } from '../constants/theme';

interface CodeViewerModalProps {
  visible: boolean;
  code: string;
  language: string;
  onClose: () => void;
}

export const CodeViewerModal: React.FC<CodeViewerModalProps> = ({
  visible,
  code,
  language,
  onClose,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    Clipboard.setString(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code ? code.split('\n') : [];

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.bgDark} />
      <View style={styles.container}>
        {/* 顶部工具栏 */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.macDots}>
              <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
              <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
              <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
            </View>
            <Text style={styles.langTitle}>
              {language ? language.toUpperCase() : 'CODE'} · {lines.length} 行
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.btn, copied && styles.btnCopied]}
              onPress={handleCopy}
              activeOpacity={0.7}
            >
              <Text style={[styles.btnText, copied && styles.btnTextCopied]}>
                {copied ? '✓ 已复制' : '复制全文'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>✕ 关闭</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 代码展示视窗（带行号） */}
        <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={true}>
          <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.codeHorizontalScroll}>
            <View style={styles.codeRowContainer}>
              {/* 行号列 */}
              <View style={styles.lineNumbersCol}>
                {lines.map((_, idx) => (
                  <Text key={idx} style={styles.lineNumberText}>
                    {idx + 1}
                  </Text>
                ))}
              </View>

              {/* 代码文本列 */}
              <View style={styles.codeContentCol}>
                <Text style={styles.codeContentText} selectable>
                  {code}
                </Text>
              </View>
            </View>
          </ScrollView>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgDark,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: THEME.colors.surface,
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
    marginRight: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  langTitle: {
    color: THEME.colors.primaryTeal,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: THEME.typography.fontMono,
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radius.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  btnCopied: {
    backgroundColor: THEME.colors.accentGreenDim,
  },
  btnText: {
    color: THEME.colors.textSub,
    fontSize: 12,
    fontWeight: '600',
  },
  btnTextCopied: {
    color: THEME.colors.accentGreen,
  },
  closeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radius.xs,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  closeBtnText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '600',
  },
  bodyScroll: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceSubtle,
  },
  codeHorizontalScroll: {
    paddingVertical: 12,
  },
  codeRowContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  lineNumbersCol: {
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: THEME.colors.borderSubtle,
    alignItems: 'flex-end',
    userSelect: 'none',
  },
  lineNumberText: {
    color: THEME.colors.textMuted,
    fontFamily: THEME.typography.fontMono,
    fontSize: 13,
    lineHeight: 22,
  },
  codeContentCol: {
    paddingLeft: 12,
    paddingRight: 32,
  },
  codeContentText: {
    color: THEME.colors.textCode,
    fontFamily: THEME.typography.fontMono,
    fontSize: 13,
    lineHeight: 22,
  },
});
