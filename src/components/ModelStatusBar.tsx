import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { ModelRuntimeStatus } from '../types';
import { THEME } from '../constants/theme';

interface ModelStatusBarProps {
  status: ModelRuntimeStatus;
  onPressSettings: () => void;
}

export const ModelStatusBar: React.FC<ModelStatusBarProps> = ({
  status,
  onPressSettings,
}) => {
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  const displayName = status.activeModelId
    ? status.activeModelId.replace('qwen2.5-coder-', 'Qwen-').replace('-instruct', '')
    : 'Qwen-3B';

  return (
    <>
      {/* 极简状态圆点：无文字侵占，仅用一个小圆点指示就绪/加载 */}
      <TouchableOpacity
        style={[
          styles.dotBtn,
          status.isLoading
            ? styles.dotBtnLoading
            : status.isLoaded
            ? styles.dotBtnReady
            : styles.dotBtnError,
        ]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {status.isLoading ? (
          <ActivityIndicator size="small" color={THEME.colors.accentWarn} style={styles.spinner} />
        ) : (
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: status.isLoaded
                  ? THEME.colors.accentGreen
                  : THEME.colors.accentError,
              },
            ]}
          />
        )}
      </TouchableOpacity>

      {/* 点击弹出的端侧硬件与模型运行底座弹窗 */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View
                  style={[
                    styles.statusDotLg,
                    {
                      backgroundColor: status.isLoaded
                        ? THEME.colors.accentGreen
                        : status.isLoading
                        ? THEME.colors.accentWarn
                        : THEME.colors.accentError,
                    },
                  ]}
                />
                <Text style={styles.modalTitle}>端侧模型运行状态</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>当前模型</Text>
              <Text style={styles.infoValue}>
                {status.isLoaded ? displayName : status.isLoading ? '挂载中...' : '未加载'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>计算线程</Text>
              <Text style={styles.infoValue}>
                {status.threads ? `${status.threads} 线程` : '4 线程'}
                {status.gpuLayers > 0 ? ` (GPU ${status.gpuLayers}层)` : ' (CPU)'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>内存驻留 (RAM)</Text>
              <Text style={[styles.infoValue, { color: THEME.colors.accentGreen }]}>
                {status.isLoaded ? '~1.89 GB (DDR)' : '0 MB'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>上下文窗口</Text>
              <Text style={styles.infoValue}>
                {status.contextSize ? `${status.contextSize} Tokens` : '2048 Tokens'}
              </Text>
            </View>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.settingsBtn}
                onPress={() => {
                  setModalVisible(false);
                  onPressSettings();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.settingsBtnText}>进入模型与参数设置 ➔</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  dotBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  dotBtnReady: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  dotBtnLoading: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  dotBtnError: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  spinner: {
    transform: [{ scale: 0.6 }],
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: THEME.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderSubtle,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDotLg: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  modalTitle: {
    color: THEME.colors.textMain,
    fontSize: 14,
    fontWeight: '700',
  },
  modalCloseText: {
    color: THEME.colors.textMuted,
    fontSize: 16,
    paddingHorizontal: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
  },
  infoLabel: {
    color: THEME.colors.textSub,
    fontSize: 12,
  },
  infoValue: {
    color: THEME.colors.textMain,
    fontFamily: THEME.typography.fontMono,
    fontSize: 12,
    fontWeight: '600',
  },
  modalActionRow: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderSubtle,
  },
  settingsBtn: {
    backgroundColor: THEME.colors.primaryDim,
    paddingVertical: 9,
    borderRadius: THEME.radius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.borderActive,
  },
  settingsBtnText: {
    color: THEME.colors.primaryLight,
    fontSize: 13,
    fontWeight: '700',
  },
});