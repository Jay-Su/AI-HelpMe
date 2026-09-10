import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { RemoteVersionInfo, LocalVersionInfo, DownloadProgress, UpdateService } from '../services/update/UpdateService';
import { THEME } from '../constants/theme';

interface AppUpdateModalProps {
  visible: boolean;
  remoteInfo: RemoteVersionInfo | null;
  localInfo: LocalVersionInfo | null;
  onClose: () => void;
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({
  visible,
  remoteInfo,
  localInfo,
  onClose,
}) => {
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [progress, setProgress] = useState<DownloadProgress>({
    bytesWritten: 0,
    totalBytes: 0,
    percent: 0,
  });
  const [downloadError, setDownloadError] = useState<string | null>(null);

  if (!remoteInfo) return null;

  const handleStartUpdate = async () => {
    setIsDownloading(true);
    setDownloadError(null);
    setProgress({ bytesWritten: 0, totalBytes: 0, percent: 0 });

    try {
      await UpdateService.downloadAndInstall(remoteInfo.downloadUrl, (p) => {
        setProgress(p);
      });
      // 成功调起安装器后可关闭弹窗
      setIsDownloading(false);
      onClose();
    } catch (e: any) {
      setIsDownloading(false);
      const errMsg = e?.message || '下载安装失败，请检查局域网连接';
      setDownloadError(errMsg);
      Alert.alert('破境中断', errMsg);
    }
  };

  const formatMB = (bytes: number): string => {
    if (!bytes || bytes <= 0) return '0.0';
    return (bytes / (1024 * 1024)).toFixed(1);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!isDownloading && !remoteInfo.forceUpdate) {
          onClose();
        }
      }}
    >
      <View style={styles.backdrop}>
        <View style={styles.cardContainer}>
          {/* 全幅竖向天青微光渐变背景 */}
          <Image
            source={require('../assets/card_gradient_bg.png')}
            style={styles.cardGradientBg}
            resizeMode="cover"
          />

          {/* 右上角天青微光一体化莲花角标 */}
          <View style={styles.cornerLotus} pointerEvents="none">
            <Image
              source={require('../assets/card_corner_tech_lotus.png')}
              style={styles.cornerLotusImg}
            />
          </View>

          {/* 弹窗内容主体 */}
          <View style={styles.cardBody}>
            <View style={styles.headerTagRow}>
              <View style={styles.headerTag}>
                <Text style={styles.headerTagText}>机缘破境</Text>
              </View>
              <Text style={styles.headerSubtitleText}>发现 AI 老祖新版本</Text>
            </View>

            <View style={styles.versionRow}>
              <Text style={styles.versionTitle}>v{remoteInfo.versionName}</Text>
              <View style={styles.versionBadge}>
                <Text style={styles.versionBadgeText}>
                  Build {localInfo?.versionCode || 1} ➔ {remoteInfo.versionCode}
                </Text>
              </View>
            </View>

            {/* 更新日志 */}
            <Text style={styles.notesTitle}>// 破境法卷日志</Text>
            <View style={styles.notesBox}>
              <ScrollView style={styles.notesScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.notesContent}>{remoteInfo.releaseNotes}</Text>
              </ScrollView>
            </View>

            {/* 下载进度条与指标 */}
            {isDownloading && (
              <View style={styles.progressSection}>
                <View style={styles.progressInfoRow}>
                  <Text style={styles.progressStatusText}>
                    内网极速飞升传输中...
                  </Text>
                  <Text style={styles.progressPercentText}>
                    {progress.percent.toFixed(0)}%
                  </Text>
                </View>

                {/* 进度槽 */}
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${Math.min(100, Math.max(3, progress.percent))}%` },
                    ]}
                  />
                </View>

                <View style={styles.progressBytesRow}>
                  <Text style={styles.progressBytesText}>
                    {formatMB(progress.bytesWritten)} MB / {formatMB(progress.totalBytes)} MB
                  </Text>
                  <Text style={styles.progressHintText}>预计 2~3 秒完成</Text>
                </View>
              </View>
            )}

            {downloadError && (
              <Text style={styles.errorText}>[重试提示] {downloadError}</Text>
            )}

            {/* 操作按键行 */}
            <View style={styles.actionsRow}>
              {!remoteInfo.forceUpdate && !isDownloading && (
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>暂不破境</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.updateBtn,
                  isDownloading && styles.updateBtnDisabled,
                  remoteInfo.forceUpdate && { flex: 1 },
                ]}
                onPress={handleStartUpdate}
                disabled={isDownloading}
                activeOpacity={0.8}
              >
                {isDownloading ? (
                  <View style={styles.btnLoadingRow}>
                    <ActivityIndicator size="small" color="#0A0D14" style={{ marginRight: 8 }} />
                    <Text style={styles.updateBtnText}>传输中...</Text>
                  </View>
                ) : (
                  <Text style={styles.updateBtnText}>立即破境升级 ➔</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* 底部天青渐变微光 + 莲台雕花横条（无缝贴底） */}
          <View style={styles.pedestalContainer} pointerEvents="none">
            <Image
              source={require('../assets/card_pedestal_with_glow.png')}
              style={styles.pedestalImg}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 16, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0B151D',
    borderRadius: 20,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: 'rgba(78, 159, 159, 0.45)',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: THEME.colors.primaryTeal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  cardGradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  cornerLotus: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 100,
    height: 80,
    zIndex: 10,
  },
  cornerLotusImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  cardBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 6,
  },
  headerTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingRight: 40,
  },
  headerTag: {
    backgroundColor: THEME.colors.primaryTealDim,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: THEME.colors.primaryTeal,
    marginRight: 8,
  },
  headerTagText: {
    color: THEME.colors.primaryTeal,
    fontSize: 10.5,
    fontWeight: '700',
  },
  headerSubtitleText: {
    color: THEME.colors.textSub,
    fontSize: 12,
    fontWeight: '600',
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 14,
    gap: 10,
  },
  versionTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    fontFamily: THEME.typography.fontMono,
  },
  versionBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  versionBadgeText: {
    color: THEME.colors.accentGold,
    fontSize: 11,
    fontFamily: THEME.typography.fontMono,
    fontWeight: '600',
  },
  notesTitle: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    marginBottom: 6,
    fontWeight: '600',
  },
  notesBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: THEME.radius.xs,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    maxHeight: 140,
    marginBottom: 16,
  },
  notesScroll: {
    flexGrow: 0,
  },
  notesContent: {
    color: THEME.colors.textMain,
    fontSize: 12.5,
    lineHeight: 20,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressStatusText: {
    color: THEME.colors.primaryTeal,
    fontSize: 11.5,
    fontWeight: '600',
  },
  progressPercentText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontFamily: THEME.typography.fontMono,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: THEME.colors.primaryTeal,
    borderRadius: 3,
  },
  progressBytesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressBytesText: {
    color: THEME.colors.textMuted,
    fontSize: 10.5,
    fontFamily: THEME.typography.fontMono,
  },
  progressHintText: {
    color: THEME.colors.accentGreen,
    fontSize: 10.5,
  },
  errorText: {
    color: THEME.colors.accentError,
    fontSize: 11.5,
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: THEME.colors.textSub,
    fontSize: 12.5,
    fontWeight: '600',
  },
  updateBtn: {
    flex: 1.5,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: '#357E80',
    borderWidth: 1.5,
    borderColor: '#E0A96D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateBtnDisabled: {
    opacity: 0.6,
  },
  updateBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  btnLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pedestalContainer: {
    width: '100%',
    height: 38,
    marginTop: 6,
    overflow: 'hidden',
  },
  pedestalImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'stretch',
  },
});
