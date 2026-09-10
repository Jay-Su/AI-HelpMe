import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  NativeModules,
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import Clipboard from '@react-native-clipboard/clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PRESET_MODELS } from '../constants/defaultModels';
import { ModelProfile } from '../types';
import { AppUpdateModal } from '../components/AppUpdateModal';
import { UpdateService, RemoteVersionInfo, LocalVersionInfo, DEFAULT_UPDATE_URL } from '../services/update/UpdateService';
import { SettingsService, AppSettings } from '../services/settings/SettingsService';
import LlamaService from '../services/llama/LlamaService';
import { THEME } from '../constants/theme';
import { MENTOR_SYSTEM_PROMPT } from '../constants/prompts';

const { StorageBridge } = NativeModules;

interface ModelSettingsScreenProps {
  navigation: any;
}

export const ModelSettingsScreen: React.FC<ModelSettingsScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [loadingModelId, setLoadingModelId] = useState<string | null>(null);
  const [activeModelId, setActiveModelId] = useState<string | null>(
    LlamaService.getStatus().activeModelId
  );
  const [loadedModelPath, setLoadedModelPath] = useState<string | null>(
    LlamaService.getStatus().loadedModelPath
  );

  // PocketPal 核心调优参数
  const [settings, setSettings] = useState<AppSettings>(SettingsService.getSettings());
  const [customPrompt, setCustomPrompt] = useState<string>(settings.systemPrompt);

  // 权限与存储
  const [isAllFilesGranted, setIsAllFilesGranted] = useState<boolean>(true);
  const [appSandboxDir, setAppSandboxDir] = useState<string>('');
  const [copiedPath, setCopiedPath] = useState<boolean>(false);

  // 应用更新状态
  const [localVersion, setLocalVersion] = useState<LocalVersionInfo>({
    versionCode: 1,
    versionName: '1.0.0',
    packageName: 'com.ondevicementor',
  });
  const [updateUrl, setUpdateUrl] = useState<string>(DEFAULT_UPDATE_URL);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false);
  const [updateModalVisible, setUpdateModalVisible] = useState<boolean>(false);
  const [remoteUpdateInfo, setRemoteUpdateInfo] = useState<RemoteVersionInfo | null>(null);

  useEffect(() => {
    const initSettings = async () => {
      const s = await SettingsService.init();
      setSettings(s);
      setCustomPrompt(s.systemPrompt);

      const status = LlamaService.getStatus();
      if (status.isLoaded) {
        setActiveModelId(status.activeModelId || 'qwen2.5-coder-3b-mentor');
        setLoadedModelPath(status.loadedModelPath);
      }

      if (StorageBridge?.getAppStoragePaths) {
        try {
          const res = await StorageBridge.getAppStoragePaths();
          setIsAllFilesGranted(!!res?.isAllFilesAccessGranted);
          setAppSandboxDir(res?.appExternalFilesDir || '');
        } catch (e) {}
      }

      try {
        const vInfo = await UpdateService.getLocalVersionInfo();
        setLocalVersion(vInfo);
        const savedUrl = await UpdateService.getUpdateServerUrl();
        setUpdateUrl(savedUrl);
      } catch (e) {}
    };

    initSettings();
  }, []);

  const handleUpdateSetting = async (partial: Partial<AppSettings>) => {
    const updated = await SettingsService.updateSettings(partial);
    setSettings(updated);

    // 同步到当前活跃引擎
    if (partial.threads !== undefined) {
      LlamaService.setThreads(partial.threads);
    }
    if (partial.contextSize !== undefined) {
      LlamaService.setContextSize(partial.contextSize);
    }
    if (partial.gpuLayers !== undefined) {
      LlamaService.setGpuLayers(partial.gpuLayers);
    }
  };

  const handleSaveSystemPrompt = async () => {
    await handleUpdateSetting({ systemPrompt: customPrompt.trim() || MENTOR_SYSTEM_PROMPT });
    Alert.alert('已保存', '系统提示词已更新，将在下一次对话中生效。');
  };

  const handleResetSystemPrompt = async () => {
    setCustomPrompt(MENTOR_SYSTEM_PROMPT);
    await handleUpdateSetting({ systemPrompt: MENTOR_SYSTEM_PROMPT });
    Alert.alert('已重置', '系统提示词已恢复为“AI老祖”默认人设。');
  };

  const handleSaveUpdateUrl = async () => {
    await UpdateService.setUpdateServerUrl(updateUrl);
    Alert.alert('保存成功', '局域网更新源地址已更新');
  };

  const handleManualCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    try {
      const res = await UpdateService.checkUpdate(updateUrl, 8000);
      if (res.hasUpdate && res.remote) {
        setRemoteUpdateInfo(res.remote);
        setUpdateModalVisible(true);
      } else if (!res.error) {
        Alert.alert(
          '已是最新版本',
          `当前运行版本为 v${localVersion.versionName} (Build ${localVersion.versionCode})，暂无更新。`
        );
      } else {
        Alert.alert(
          '局域网连接超时',
          `未能连接到开发电脑：${res.error}\n\n请核对：\n1. 手机与电脑是否处于同一 Wi-Fi\n2. 电脑后台是否已运行 HTTP 更新服务。`
        );
      }
    } catch (e: any) {
      Alert.alert('探测异常', e?.message || '未知错误');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleLoadPresetModel = async (model: ModelProfile) => {
    setLoadingModelId(model.id);

    try {
      let appFilesDir = appSandboxDir;
      if (!appFilesDir && StorageBridge?.getAppStoragePaths) {
        const paths = await StorageBridge.getAppStoragePaths();
        appFilesDir = paths.appExternalFilesDir;
        setAppSandboxDir(appFilesDir);
      }

      const candidates = [
        appFilesDir ? `${appFilesDir}/models/${model.fileName}` : '',
        appFilesDir ? `${appFilesDir}/${model.fileName}` : '',
        `/storage/emulated/0/Android/data/com.ondevicementor/files/models/${model.fileName}`,
        `/storage/emulated/0/Android/data/com.ondevicementor/files/${model.fileName}`,
        `/storage/emulated/0/Download/${model.fileName}`,
        `/sdcard/Download/${model.fileName}`,
      ].filter(Boolean);

      let foundPath = '';
      for (const p of candidates) {
        const ok = await LlamaService.probeModel(p);
        if (ok) {
          foundPath = p;
          break;
        }
      }

      if (!foundPath) {
        Alert.alert(
          '未找到专属模型文件',
          `请将模型权重放置于以下路径之一：\n\n1. 手机 Download 目录：\n/Download/${model.fileName}\n\n2. 应用专属免权限目录：\nAndroid/data/com.ondevicementor/files/models/`,
          [
            { text: '稍后放置', style: 'cancel' },
            {
              text: '手动挑选文件',
              onPress: () => handlePickCustomModel(model.id),
            },
          ]
        );
        return;
      }

      await LlamaService.loadModel(foundPath, model.id, {
        contextSize: settings.contextSize,
        threads: settings.threads,
        gpuLayers: settings.gpuLayers,
      });

      setActiveModelId(model.id);
      setLoadedModelPath(foundPath);
      StorageBridge?.saveString?.('last_model_path', foundPath);
      StorageBridge?.saveString?.('last_model_name', model.name);
      StorageBridge?.saveString?.('last_model_id', model.id);

      Alert.alert('挂载成功', `已就绪挂载：${model.name}`);
    } catch (err: any) {
      Alert.alert('挂载失败', err?.message || '无法挂载该模型');
    } finally {
      setLoadingModelId(null);
    }
  };

  const handlePickCustomModel = async (modelId: string = 'custom') => {
    try {
      const res = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.allFiles],
        copyTo: 'cachesDirectory',
      });

      setLoadingModelId(modelId);
      let targetPath = res.fileCopyUri || res.uri;
      targetPath = decodeURIComponent(targetPath);
      if (targetPath.startsWith('file://')) {
        targetPath = targetPath.slice(7);
      }

      const canRead = await LlamaService.probeModel(targetPath);
      if (!canRead) {
        Alert.alert(
          '无法直接读取该文件',
          `所选路径受系统安全沙盒限制，建议点击下方“开启所有文件权限”，或将 .gguf 文件移动至应用免权限目录：\nAndroid/data/com.ondevicementor/files/models/`,
          [{ text: '知道了' }]
        );
        return;
      }

      await LlamaService.loadModel(targetPath, modelId, {
        contextSize: settings.contextSize,
        threads: settings.threads,
        gpuLayers: settings.gpuLayers,
      });

      setActiveModelId(modelId);
      setLoadedModelPath(targetPath);
      StorageBridge?.saveString?.('last_model_path', targetPath);
      StorageBridge?.saveString?.('last_model_name', res.name || 'Custom Model');
      StorageBridge?.saveString?.('last_model_id', modelId);

      Alert.alert('挂载成功', `已成功挂载外部权重：\n${res.name}`);
    } catch (err: any) {
      if (!DocumentPicker.isCancel(err)) {
        Alert.alert('加载失败', err?.message || '发生未知错误');
      }
    } finally {
      setLoadingModelId(null);
    }
  };

  const handleReleaseModel = async () => {
    try {
      await LlamaService.release();
      setActiveModelId(null);
      setLoadedModelPath(null);
      Alert.alert('内存已释放', '当前模型句柄与原生显存已完全释放。');
    } catch (e: any) {
      Alert.alert('释放异常', e?.message || '释放失败');
    }
  };

  const handleOpenDirectPermission = () => {
    if (StorageBridge?.requestAllFilesAccess) {
      StorageBridge.requestAllFilesAccess();
    } else {
      Alert.alert('提示', '请在手机系统设置中手动授予该应用“所有文件管理权限”。');
    }
  };

  const handleCopySandboxPath = () => {
    const p = appSandboxDir ? `${appSandboxDir}/models/` : 'Android/data/com.ondevicementor/files/models/';
    Clipboard.setString(p);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  const isModelLoaded = LlamaService.getStatus().isLoaded;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* 顶栏 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>设置与参数看板</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 卡片 1：模型状态与选择 */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>模型管理与挂载</Text>

          <View style={styles.statusBox}>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isModelLoaded ? THEME.colors.accentGreen : THEME.colors.textMuted },
                ]}
              />
              <Text style={styles.statusTitle}>
                {isModelLoaded ? '模型已就绪运行' : '未挂载模型'}
              </Text>
            </View>
            {loadedModelPath && (
              <Text style={styles.statusPath} numberOfLines={2}>
                {loadedModelPath}
              </Text>
            )}
          </View>

          {/* 预设专属模型 */}
          {PRESET_MODELS.map((item) => {
            const isActive = isModelLoaded && activeModelId === item.id;
            const isLoading = loadingModelId === item.id;

            return (
              <View key={item.id} style={styles.modelItemCard}>
                <View style={styles.modelItemInfo}>
                  <Text style={styles.modelItemName}>{item.name}</Text>
                  <Text style={styles.modelItemDesc}>{item.description}</Text>
                  <Text style={styles.modelItemSize}>文件: {item.fileName} ({item.approxSize})</Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.primaryActionBtn,
                    isActive && styles.activeModelBtn,
                  ]}
                  onPress={() => handleLoadPresetModel(item)}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.actionBtnText}>
                      {isActive ? '✓ 当前挂载' : '载入该模型'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}

          {/* 挑选外部模型 / 释放显存 */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => handlePickCustomModel('custom')}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryBtnText}>📁 挑选本地 GGUF</Text>
            </TouchableOpacity>

            {isModelLoaded && (
              <TouchableOpacity
                style={styles.dangerBtn}
                onPress={handleReleaseModel}
                activeOpacity={0.7}
              >
                <Text style={styles.dangerBtnText}>释放内存</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 卡片 2：PocketPal 核心推理调优面板 */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>推理运行时调优 (PocketPal)</Text>
          <Text style={styles.cardDesc}>
            实时调控端侧 C++ 推理引擎核心参数，兼顾速率与回答灵活性。
          </Text>

          {/* 1. CPU 线程数 */}
          <View style={styles.paramGroup}>
            <View style={styles.paramHeader}>
              <Text style={styles.paramLabel}>CPU 线程数 (n_threads)</Text>
              <Text style={styles.paramValue}>{settings.threads} 线程</Text>
            </View>
            <View style={styles.pillGroup}>
              {[1, 2, 4, 6, 8].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.pillOption, settings.threads === t && styles.pillOptionActive]}
                  onPress={() => handleUpdateSetting({ threads: t })}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillOptionText, settings.threads === t && styles.pillOptionTextActive]}>
                    {t} 核
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.paramTip}>推荐 4~6 线程，充分调用手机大核算力，提升生成速率。</Text>
          </View>

          {/* 2. 上下文大小 */}
          <View style={styles.paramGroup}>
            <View style={styles.paramHeader}>
              <Text style={styles.paramLabel}>上下文长度 (n_ctx)</Text>
              <Text style={styles.paramValue}>{settings.contextSize} Tokens</Text>
            </View>
            <View style={styles.pillGroup}>
              {[1024, 2048, 4096].map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.pillOption, settings.contextSize === c && styles.pillOptionActive]}
                  onPress={() => handleUpdateSetting({ contextSize: c })}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillOptionText, settings.contextSize === c && styles.pillOptionTextActive]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.paramTip}>默认 2048 Tokens，极低内存消耗，杜绝 Prefill 算力墙与卡死。</Text>
          </View>

          {/* 3. GPU 卸载层数 */}
          <View style={styles.paramGroup}>
            <View style={styles.paramHeader}>
              <Text style={styles.paramLabel}>GPU 卸载层数 (n_gpu_layers)</Text>
              <Text style={styles.paramValue}>{settings.gpuLayers} 层</Text>
            </View>
            <View style={styles.pillGroup}>
              {[0, 8, 16, 24, 32, 99].map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.pillOption, settings.gpuLayers === g && styles.pillOptionActive]}
                  onPress={() => handleUpdateSetting({ gpuLayers: g })}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillOptionText, settings.gpuLayers === g && styles.pillOptionTextActive]}>
                    {g === 0 ? '0 (纯CPU)' : g === 99 ? '全部' : `${g}层`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.paramTip}>若芯片支持 GPU 加速可调高层数，纯 CPU 模式稳定性最高。</Text>
          </View>

          {/* 4. 采样温度 */}
          <View style={styles.paramGroup}>
            <View style={styles.paramHeader}>
              <Text style={styles.paramLabel}>采样温度 (Temperature)</Text>
              <Text style={styles.paramValue}>{settings.temperature.toFixed(1)}</Text>
            </View>
            <View style={styles.pillGroup}>
              {[0.1, 0.3, 0.7, 1.0].map((temp) => (
                <TouchableOpacity
                  key={temp}
                  style={[styles.pillOption, Math.abs(settings.temperature - temp) < 0.05 && styles.pillOptionActive]}
                  onPress={() => handleUpdateSetting({ temperature: temp })}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillOptionText, Math.abs(settings.temperature - temp) < 0.05 && styles.pillOptionTextActive]}>
                    {temp.toFixed(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.paramTip}>低温度输出严谨规整（适合代码），高温度回答更丰富自然。</Text>
          </View>

          {/* 5. Top-P 采样 */}
          <View style={styles.paramGroup}>
            <View style={styles.paramHeader}>
              <Text style={styles.paramLabel}>核采样 (Top-P)</Text>
              <Text style={styles.paramValue}>{settings.topP.toFixed(1)}</Text>
            </View>
            <View style={styles.pillGroup}>
              {[0.5, 0.7, 0.9, 1.0].map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.pillOption, Math.abs(settings.topP - p) < 0.05 && styles.pillOptionActive]}
                  onPress={() => handleUpdateSetting({ topP: p })}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillOptionText, Math.abs(settings.topP - p) < 0.05 && styles.pillOptionTextActive]}>
                    {p.toFixed(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 6. 最大输出 Token */}
          <View style={styles.paramGroup}>
            <View style={styles.paramHeader}>
              <Text style={styles.paramLabel}>最大生成限制 (Max Tokens)</Text>
              <Text style={styles.paramValue}>{settings.maxTokens}</Text>
            </View>
            <View style={styles.pillGroup}>
              {[512, 1024, 2048, 4096].map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.pillOption, settings.maxTokens === m && styles.pillOptionActive]}
                  onPress={() => handleUpdateSetting({ maxTokens: m })}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillOptionText, settings.maxTokens === m && styles.pillOptionTextActive]}>
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* 卡片 3：自定义系统提示词 */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>自定义系统提示词 (System Prompt)</Text>
          <Text style={styles.cardDesc}>
            编辑“AI老祖”人设与解答偏好，纯净注入，无任何模板八股文束缚。
          </Text>

          <TextInput
            style={styles.promptInput}
            value={customPrompt}
            onChangeText={setCustomPrompt}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={handleResetSystemPrompt}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryBtnText}>恢复默认人设</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={handleSaveSystemPrompt}
              activeOpacity={0.7}
            >
              <Text style={styles.actionBtnText}>保存提示词</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 卡片 4：手机存储与权限直达 */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>存储管理与权限</Text>

          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingRowTitle}>所有文件访问权限</Text>
              <Text style={styles.settingRowDesc}>
                {isAllFilesGranted ? '已开启（可直接寻址 Download 等目录）' : '未开启（建议开启以便读取外部权重）'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.permissionBtn}
              onPress={handleOpenDirectPermission}
              activeOpacity={0.7}
            >
              <Text style={styles.permissionBtnText}>
                {isAllFilesGranted ? '管理权限' : '直达开启'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sandboxBox}>
            <Text style={styles.sandboxTitle}>应用免权限沙盒目录：</Text>
            <Text style={styles.sandboxPath} numberOfLines={2}>
              {appSandboxDir ? `${appSandboxDir}/models/` : 'Android/data/com.ondevicementor/files/models/'}
            </Text>
            <TouchableOpacity
              style={styles.copyBtn}
              onPress={handleCopySandboxPath}
              activeOpacity={0.7}
            >
              <Text style={styles.copyBtnText}>
                {copiedPath ? '✓ 已复制路径' : '复制路径'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 卡片 5：局域网 OTA 自动更新体系 */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>局域网 OTA 自动升级</Text>
          <Text style={styles.cardDesc}>
            当前版本：v{localVersion.versionName} (Build {localVersion.versionCode})
          </Text>

          <View style={styles.updateUrlRow}>
            <TextInput
              style={styles.updateUrlInput}
              value={updateUrl}
              onChangeText={setUpdateUrl}
              placeholder="http://192.168.x.x:8888/version.json"
              placeholderTextColor={THEME.colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.saveUrlBtn}
              onPress={handleSaveUpdateUrl}
              activeOpacity={0.7}
            >
              <Text style={styles.saveUrlText}>保存</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.checkUpdateBtn}
            onPress={handleManualCheckUpdate}
            disabled={isCheckingUpdate}
            activeOpacity={0.7}
          >
            {isCheckingUpdate ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.checkUpdateText}>检查新版本</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 升级提示弹窗 */}
      <AppUpdateModal
        visible={updateModalVisible}
        remoteInfo={remoteUpdateInfo}
        localInfo={localVersion}
        onClose={() => setUpdateModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgDark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: THEME.colors.borderSubtle,
    backgroundColor: THEME.colors.bgDark,
  },
  backBtn: {
    padding: 6,
  },
  backArrow: {
    fontSize: 20,
    color: THEME.colors.textMain,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: THEME.colors.textMain,
  },
  headerPlaceholder: {
    width: 32,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },

  // 现代卡片
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  cardSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.colors.textMain,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: THEME.colors.textSub,
    lineHeight: 18,
    marginBottom: 14,
  },

  // 模型状态区
  statusBox: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusTitle: {
    fontSize: 13,
    color: THEME.colors.textMain,
    fontWeight: '600',
  },
  statusPath: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },

  // 模型条目
  modelItemCard: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  modelItemInfo: {
    marginBottom: 10,
  },
  modelItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textMain,
  },
  modelItemDesc: {
    fontSize: 12,
    color: THEME.colors.textSub,
    marginTop: 3,
    lineHeight: 17,
  },
  modelItemSize: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 4,
  },

  primaryActionBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeModelBtn: {
    backgroundColor: THEME.colors.accentGreen,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceElevated,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  secondaryBtnText: {
    fontSize: 12,
    color: THEME.colors.textMain,
    fontWeight: '500',
  },
  dangerBtn: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    backgroundColor: THEME.colors.accentErrorDim,
    borderRadius: 8,
    alignItems: 'center',
  },
  dangerBtnText: {
    fontSize: 12,
    color: THEME.colors.accentError,
    fontWeight: '600',
  },

  // 参数配置项
  paramGroup: {
    marginBottom: 16,
  },
  paramHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paramLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textMain,
  },
  paramValue: {
    fontSize: 12,
    color: THEME.colors.primaryLight,
    fontWeight: '700',
  },
  pillGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pillOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: THEME.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  pillOptionActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primaryLight,
  },
  pillOptionText: {
    fontSize: 12,
    color: THEME.colors.textSub,
    fontWeight: '500',
  },
  pillOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  paramTip: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 6,
  },

  // 系统提示词输入
  promptInput: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    color: THEME.colors.textMain,
    fontSize: 13,
    lineHeight: 19,
    padding: 12,
    minHeight: 100,
    marginBottom: 10,
  },

  // 存储与权限行
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  settingRowTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textMain,
  },
  settingRowDesc: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  permissionBtn: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  permissionBtnText: {
    fontSize: 12,
    color: THEME.colors.primaryLight,
    fontWeight: '600',
  },
  sandboxBox: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  sandboxTitle: {
    fontSize: 12,
    color: THEME.colors.textSub,
  },
  sandboxPath: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 3,
    marginBottom: 8,
  },
  copyBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  copyBtnText: {
    fontSize: 11,
    color: THEME.colors.textSub,
  },

  // 局域网 OTA
  updateUrlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  updateUrlInput: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: THEME.colors.textMain,
    fontSize: 12,
  },
  saveUrlBtn: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveUrlText: {
    fontSize: 12,
    color: THEME.colors.textMain,
    fontWeight: '600',
  },
  checkUpdateBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkUpdateText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
