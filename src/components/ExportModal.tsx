import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Share,
  Alert,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { sessionManager } from '../services/session/SessionManager';

interface ExportModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * ============================================================================
 * ExportModal - 会话 Markdown 一键复制与系统原生分享弹窗
 * ============================================================================
 */
export const ExportModal: React.FC<ExportModalProps> = ({ visible, onClose }) => {
  const [copied, setCopied] = useState<boolean>(false);

  const activeSession = sessionManager.getActiveSession();

  const handleCopyMarkdown = () => {
    const md = sessionManager.exportSessionMarkdown();
    Clipboard.setString(md);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      onClose();
    }, 1200);
  };

  const handleNativeShare = async () => {
    try {
      const md = sessionManager.exportSessionMarkdown();
      await Share.share({
        message: md,
        title: activeSession?.title || '编程导师解答记录',
      });
      onClose();
    } catch (err: any) {
      Alert.alert('分享失败', err?.message || '无法唤起系统分享');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
          <Text style={styles.title}>📤 导出与分享解决方案</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            当前会话: {activeSession?.title || '新对话'} ({activeSession?.messages.length || 0} 条记录)
          </Text>

          <View style={styles.btnGroup}>
            <TouchableOpacity
              style={[styles.actionBtn, copied && styles.actionBtnSuccess]}
              onPress={handleCopyMarkdown}
              activeOpacity={0.7}
            >
              <Text style={styles.btnIcon}>{copied ? '✅' : '📋'}</Text>
              <View style={styles.btnTextWrap}>
                <Text style={styles.btnTitle}>
                  {copied ? '已复制到剪贴板！' : '复制整场 Markdown'}
                </Text>
                <Text style={styles.btnDesc}>包含时间、代码块与规范引用的完整格式</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleNativeShare}
              activeOpacity={0.7}
            >
              <Text style={styles.btnIcon}>🚀</Text>
              <View style={styles.btnTextWrap}>
                <Text style={styles.btnTitle}>系统原生分享 (Share Sheet)</Text>
                <Text style={styles.btnDesc}>直接发送给微信、QQ、网盘、邮件或备忘录</Text>
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>取消</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  title: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 20,
  },
  btnGroup: {
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionBtnSuccess: {
    borderColor: '#10B981',
    backgroundColor: '#064E3B',
  },
  btnIcon: {
    fontSize: 24,
    marginRight: 14,
  },
  btnTextWrap: {
    flex: 1,
  },
  btnTitle: {
    color: '#F1F5F9',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  btnDesc: {
    color: '#64748B',
    fontSize: 11,
  },
  cancelBtn: {
    marginTop: 18,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
  },
});
