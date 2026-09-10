import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import { sessionManager } from '../services/session/SessionManager';
import { SessionMeta } from '../types/session';
import { THEME } from '../constants/theme';

interface SessionDrawerProps {
  visible: boolean;
  onClose: () => void;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onOpenSettings?: () => void;
}

export const SessionDrawer: React.FC<SessionDrawerProps> = ({
  visible,
  onClose,
  onSelectSession,
  onNewSession,
  onOpenSettings,
}) => {
  const [sessions, setSessions] = useState<SessionMeta[]>(() => sessionManager.getAllSessionMetas());
  const [activeSessionId, setActiveSessionId] = useState<string>(() => sessionManager.getActiveSession().id);

  // 监听全局会话变化（创建、切换、删除等），保证列表实时同步刷新
  useEffect(() => {
    const update = () => {
      setSessions(sessionManager.getAllSessionMetas());
      setActiveSessionId(sessionManager.getActiveSession().id);
    };
    update();
    const unsubscribe = sessionManager.subscribe(update);
    return () => {
      unsubscribe();
    };
  }, [visible]);

  const formatTime = (ts: number): string => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '刚刚';
    if (mins < 60) return `${mins} 分钟前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} 天前`;
    return new Date(ts).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
  };

  const handleDelete = (s: SessionMeta) => {
    Alert.alert('删除会话', `确定要删除“${s.title}”吗？此操作不可恢复。`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await sessionManager.deleteSession(s.id);
          // 立即就地更新状态，毫秒级局部刷新列表
          setSessions(sessionManager.getAllSessionMetas());
          setActiveSessionId(sessionManager.getActiveSession().id);
        },
      },
    ]);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.drawerCard}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>历史会话</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.newChatBtn}
            onPress={() => {
              onNewSession();
              onClose();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.newChatText}>＋ 开启新对话</Text>
          </TouchableOpacity>

          <FlatList
            data={sessions}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isActive = item.id === activeSessionId;
              return (
                <TouchableOpacity
                  style={[styles.sessionItem, isActive && styles.sessionItemActive]}
                  onPress={() => {
                    onSelectSession(item.id);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.sessionMain}>
                    <Text
                      style={[styles.sessionTitle, isActive && styles.sessionTitleActive]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.sessionTime}>{formatTime(item.updatedAt)}</Text>
                      <Text style={styles.dot}>·</Text>
                      <Text style={styles.messageBadge}>{item.messageCount} 条对话</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(item)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.deleteIcon}>✕</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            }}
          />

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.settingsFooterBtn}
              onPress={() => {
                onClose();
                onOpenSettings?.();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.settingsFooterText}>⚙ 设置与参数调优</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  drawerCard: {
    width: '78%',
    maxWidth: 320,
    backgroundColor: THEME.colors.surface,
    height: '100%',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderRightWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    color: THEME.colors.textMain,
    fontSize: 17,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
  },
  closeIcon: {
    color: THEME.colors.textMuted,
    fontSize: 16,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.primaryDim,
    borderWidth: 1,
    borderColor: THEME.colors.borderActive,
    paddingVertical: 10,
    borderRadius: THEME.radius.sm,
    marginBottom: 16,
  },
  newChatText: {
    color: THEME.colors.primaryLight,
    fontSize: 14,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 20,
    gap: 8,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: THEME.radius.sm,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  sessionItemActive: {
    backgroundColor: THEME.colors.primaryDim,
    borderColor: THEME.colors.primary,
  },
  sessionMain: {
    flex: 1,
    marginRight: 8,
  },
  sessionTitle: {
    color: THEME.colors.textMain,
    fontSize: 13.5,
    fontWeight: '500',
    marginBottom: 4,
  },
  sessionTitleActive: {
    color: THEME.colors.primaryLight,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionTime: {
    color: THEME.colors.textMuted,
    fontSize: 11,
  },
  dot: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    marginHorizontal: 4,
  },
  messageBadge: {
    color: THEME.colors.textSub,
    fontSize: 11,
  },
  deleteBtn: {
    padding: 6,
  },
  deleteIcon: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderSubtle,
    paddingTop: 12,
  },
  settingsFooterBtn: {
    paddingVertical: 11,
    borderRadius: THEME.radius.sm,
    backgroundColor: THEME.colors.surfaceElevated,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  settingsFooterText: {
    color: THEME.colors.textSub,
    fontSize: 13,
    fontWeight: '600',
  },
});