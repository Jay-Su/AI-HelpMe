import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  NativeModules,
  Alert,
  Image,
  Keyboard,
  ToastAndroid,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLlamaChat } from '../hooks/useLlamaChat';
import { ChatMessageItem } from '../components/ChatMessageItem';
import { SessionDrawer } from '../components/SessionDrawer';
import { ExportModal } from '../components/ExportModal';
import { CodeViewerModal } from '../components/CodeViewerModal';
import { AppUpdateModal } from '../components/AppUpdateModal';
import { UpdateService, RemoteVersionInfo, LocalVersionInfo } from '../services/update/UpdateService';
import { SettingsService } from '../services/settings/SettingsService';
import LlamaService from '../services/llama/LlamaService';
import { THEME } from '../constants/theme';

const { StorageBridge } = NativeModules;

interface ChatScreenProps {
  navigation: any;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [inputText, setInputText] = useState<string>('');
  const flatListRef = useRef<FlatList>(null);
  const textInputRef = useRef<TextInput>(null);
  const lastClickTimeRef = useRef<number>(0);

  // 弹窗与抽屉状态
  const [drawerVisible, setDrawerVisible] = useState<boolean>(false);
  const [exportModalVisible, setExportModalVisible] = useState<boolean>(false);

  // 全屏代码查看器状态
  const [codeModalData, setCodeModalData] = useState<{
    visible: boolean;
    code: string;
    language: string;
  }>({
    visible: false,
    code: '',
    language: 'text',
  });

  // 局域网应用更新状态
  const [updateModalVisible, setUpdateModalVisible] = useState<boolean>(false);
  const [remoteUpdateInfo, setRemoteUpdateInfo] = useState<RemoteVersionInfo | null>(null);
  const [localUpdateInfo, setLocalUpdateInfo] = useState<LocalVersionInfo | null>(null);

  // 智能滚动状态
  const [isAtBottom, setIsAtBottom] = useState<boolean>(true);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState<boolean>(false);
  const isUserScrollingRef = useRef<boolean>(false);

  // 核心 Chat Hook
  const {
    messages,
    isGenerating,
    error,
    sendMessage,
    continueGenerating,
    regenerateLastMessage,
    deleteMessage,
    stopGenerating,
    resetEngine,
    createNewSession,
    switchSession,
  } = useLlamaChat();

  const [modelStatus, setModelStatus] = useState(LlamaService.getStatus());
  const [isAutoRestoring, setIsAutoRestoring] = useState<boolean>(false);

  // 同步模型状态
  useEffect(() => {
    const syncStatus = () => {
      setModelStatus(LlamaService.getStatus());
    };
    syncStatus();

    const unsubscribeFocus = navigation?.addListener
      ? navigation.addListener('focus', syncStatus)
      : undefined;

    if (!LlamaService.getStatus().isLoaded && !LlamaService.getStatus().isLoading) {
      autoRestoreModel();
    }

    // 探测局域网更新
    const detectUpdate = async () => {
      try {
        const res = await UpdateService.checkUpdate(undefined, 1500);
        if (res.hasUpdate && res.remote) {
          setRemoteUpdateInfo(res.remote);
          setLocalUpdateInfo(res.local);
          setUpdateModalVisible(true);
        }
      } catch (e) {}
    };
    detectUpdate();

    return () => {
      if (typeof unsubscribeFocus === 'function') {
        unsubscribeFocus();
      }
    };
  }, [navigation]);

  // 软键盘联动平滑滚底
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
          setIsAtBottom(true);
          setShowScrollBottomBtn(false);
        }, 80);
      }
    );
    return () => showSub.remove();
  }, []);

  // 消息流变化自动平滑跟进
  useEffect(() => {
    if (isAtBottom && !isUserScrollingRef.current && messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: false });
    }
  }, [messages]);

  const handleScroll = (event: any) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    const atBottom = distanceFromBottom < 50;
    setIsAtBottom(atBottom);
    if (atBottom) {
      setShowScrollBottomBtn(false);
    } else {
      setShowScrollBottomBtn(messages.length > 0);
    }
  };

  const handleScrollToBottom = () => {
    isUserScrollingRef.current = false;
    flatListRef.current?.scrollToEnd({ animated: true });
    setIsAtBottom(true);
    setShowScrollBottomBtn(false);
  };

  const autoRestoreModel = async () => {
    setIsAutoRestoring(true);
    try {
      const settings = await SettingsService.init();
      let restoreThreads = settings.threads || 6;
      let restoreContextSize = settings.contextSize || 4096;
      let restoreGpuLayers = settings.gpuLayers || 0;
      let lastPath = '';
      let lastName = '';
      let lastId = '';

      if (StorageBridge?.getString) {
        lastPath = await StorageBridge.getString('last_model_path', '');
        lastName = await StorageBridge.getString('last_model_name', '');
        lastId = await StorageBridge.getString('last_model_id', '');
      }

      if (lastPath) {
        const canRead = await LlamaService.probeModel(lastPath);
        if (canRead) {
          const modelIdToUse = lastId || 'qwen2.5-coder-3b-mentor';
          await LlamaService.loadModel(lastPath, modelIdToUse, {
            contextSize: restoreContextSize,
            threads: restoreThreads,
            gpuLayers: restoreGpuLayers,
          });
          setModelStatus(LlamaService.getStatus());
          setIsAutoRestoring(false);
          return;
        }
      }

      let appFilesDir = '';
      if (StorageBridge?.getAppStoragePaths) {
        const paths = await StorageBridge.getAppStoragePaths();
        appFilesDir = paths.appExternalFilesDir;
      }

      const defaultProbes = [
        {
          name: 'Qwen2.5-Coder 3B (专属导师)',
          id: 'qwen2.5-coder-3b-mentor',
          fileName: 'qwen2.5-coder-3b-instruct.Q4_K_M.gguf',
        },
      ];

      for (const model of defaultProbes) {
        const candidates = [
          appFilesDir ? `${appFilesDir}/models/${model.fileName}` : '',
          appFilesDir ? `${appFilesDir}/${model.fileName}` : '',
          `/storage/emulated/0/Android/data/com.ondevicementor/files/models/${model.fileName}`,
          `/storage/emulated/0/Android/data/com.ondevicementor/files/${model.fileName}`,
          `/storage/emulated/0/Download/${model.fileName}`,
          `/sdcard/Download/${model.fileName}`,
        ].filter(Boolean);

        for (const p of candidates) {
          const ok = await LlamaService.probeModel(p);
          if (ok) {
            await LlamaService.loadModel(p, model.id, {
              contextSize: restoreContextSize,
              threads: restoreThreads,
              gpuLayers: restoreGpuLayers,
            });
            StorageBridge?.saveString?.('last_model_path', p);
            StorageBridge?.saveString?.('last_model_name', model.name);
            StorageBridge?.saveString?.('last_model_id', model.id);
            setModelStatus(LlamaService.getStatus());
            setIsAutoRestoring(false);
            return;
          }
        }
      }
    } catch (e) {
      console.warn('[AutoRestore] 自动恢复模型失败:', e);
    } finally {
      setIsAutoRestoring(false);
      setModelStatus(LlamaService.getStatus());
    }
  };

  const handleSend = () => {
    const now = Date.now();
    if (now - lastClickTimeRef.current < 400) return;
    lastClickTimeRef.current = now;

    if (isGenerating || LlamaService.getIsGenerating()) return;

    if (isAutoRestoring || modelStatus.isLoading) {
      Alert.alert('请稍候', '模型正在挂载就绪中...');
      return;
    }
    if (!modelStatus.isLoaded) {
      Alert.alert(
        '未检测到已加载模型',
        '请先在右上角“设置”中加载模型权重文件。',
        [
          { text: '取消', style: 'cancel' },
          { text: '前往设置', onPress: () => navigation.navigate('ModelSettings') },
        ]
      );
      return;
    }
    if (!inputText.trim()) return;

    const textToSend = inputText;
    setInputText('');
    isUserScrollingRef.current = false;
    setIsAtBottom(true);
    setShowScrollBottomBtn(false);
    sendMessage(textToSend);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 60);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* PocketPal 风格极简现代顶栏 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => setDrawerVisible(true)}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.headerIconText}>☰</Text>
        </TouchableOpacity>

        {/* 中央模型指示药丸舱（对齐 PocketPal） */}
        <TouchableOpacity
          style={styles.headerModelPill}
          onPress={() => {
            if (isGenerating) {
              ToastAndroid.show('正在回答中，请等待完成或点击停止', ToastAndroid.SHORT);
              return;
            }
            navigation.navigate('ModelSettings');
          }}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.headerStatusDot,
              {
                backgroundColor: modelStatus.isLoaded
                  ? THEME.colors.accentGreen
                  : modelStatus.isLoading || isAutoRestoring
                  ? THEME.colors.accentWarn
                  : THEME.colors.accentError,
              },
            ]}
          />
          <Text style={styles.headerModelText} numberOfLines={1}>
            {modelStatus.isLoaded
              ? 'AI老祖 · Qwen-3B'
              : isAutoRestoring
              ? '模型挂载中...'
              : '未加载模型'}
          </Text>
          <Text style={styles.headerModelChevron}>▾</Text>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => {
              if (isGenerating) {
                ToastAndroid.show('正在回答中，请等待完成或点击停止', ToastAndroid.SHORT);
                return;
              }
              if (messages.length === 0) return;
              Alert.alert('开启新对话', '确定要开启一段全新对话吗？', [
                { text: '取消', style: 'cancel' },
                { text: '确定', onPress: () => createNewSession() },
              ]);
            }}
            style={styles.headerIconBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.headerActionIcon, isGenerating && { opacity: 0.4 }]}>＋</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (isGenerating) {
                ToastAndroid.show('正在回答中，请等待完成或点击停止', ToastAndroid.SHORT);
                return;
              }
              setExportModalVisible(true);
            }}
            style={styles.headerIconBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.headerActionText, isGenerating && { opacity: 0.4 }]}>导出</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (isGenerating) {
                ToastAndroid.show('正在回答中，请等待完成或点击停止', ToastAndroid.SHORT);
                return;
              }
              navigation.navigate('ModelSettings');
            }}
            style={styles.headerIconBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.headerActionIcon, isGenerating && { opacity: 0.4 }]}>⚙</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 异常提示横幅 */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText} numberOfLines={2}>
            {error}
          </Text>
          <TouchableOpacity
            style={styles.errorClearBtn}
            onPress={resetEngine}
            activeOpacity={0.7}
          >
            <Text style={styles.errorClearText}>重置</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 消息对话列表 */}
      <View style={styles.listWrapper}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <ChatMessageItem
              message={item}
              isLastAssistant={index === messages.length - 1 && item.role === 'assistant'}
              onRegenerate={regenerateLastMessage}
              onContinue={continueGenerating}
              onDelete={deleteMessage}
              onExpandFullScreen={(code, lang) =>
                setCodeModalData({ visible: true, code, language: lang })
              }
            />
          )}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => {
            if (isAtBottom && !isUserScrollingRef.current) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
          onScroll={handleScroll}
          onScrollBeginDrag={() => {
            isUserScrollingRef.current = true;
          }}
          onScrollEndDrag={() => {
            isUserScrollingRef.current = false;
          }}
          onMomentumScrollEnd={() => {
            isUserScrollingRef.current = false;
          }}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyAvatarBox}>
                <Image
                  source={require('../assets/ai_avatar_robot.png')}
                  style={styles.emptyAvatarImg}
                />
              </View>
              <Text style={styles.emptyTitle}>AI老祖</Text>
              <Text style={styles.emptySubtitle}>
                纯离线端侧大模型推理 · 专为 J哥 护法答疑
              </Text>
            </View>
          }
        />

        {/* 触底悬浮按钮 */}
        {showScrollBottomBtn && (
          <TouchableOpacity
            style={styles.floatingBottomCircle}
            onPress={handleScrollToBottom}
            activeOpacity={0.8}
          >
            <Text style={styles.floatingBottomArrow}>↓</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* PocketPal 现代悬浮输入舱 */}
      <View style={styles.inputContainer}>
        <View style={styles.inputDock}>
          <TextInput
            ref={textInputRef}
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="给 AI老祖 发送消息..."
            placeholderTextColor={THEME.colors.textMuted}
            multiline
            maxLength={3000}
            textAlignVertical="center"
          />

          {isGenerating ? (
            <TouchableOpacity
              style={styles.stopButton}
              onPress={stopGenerating}
              activeOpacity={0.7}
            >
              <View style={styles.stopIconSquare} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.sendButton,
                !inputText.trim() && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!inputText.trim()}
              activeOpacity={0.7}
            >
              <Text style={styles.sendArrow}>↑</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 多会话抽屉 */}
      <SessionDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onSelectSession={switchSession}
        onNewSession={createNewSession}
        onOpenSettings={() => {
          setDrawerVisible(false);
          navigation.navigate('ModelSettings');
        }}
      />

      {/* 对话 Markdown 导出弹窗 */}
      <ExportModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
      />

      {/* 全屏代码沉浸查看器 */}
      <CodeViewerModal
        visible={codeModalData.visible}
        code={codeModalData.code}
        language={codeModalData.language}
        onClose={() => setCodeModalData({ visible: false, code: '', language: 'text' })}
      />

      {/* 局域网 OTA 自动更新弹窗 */}
      <AppUpdateModal
        visible={updateModalVisible}
        remoteInfo={remoteUpdateInfo}
        localInfo={localUpdateInfo}
        onClose={() => setUpdateModalVisible(false)}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgDark,
  },

  // 现代顶栏（对齐 PocketPal 布局）
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: THEME.colors.borderSubtle,
    backgroundColor: THEME.colors.bgDark,
  },
  headerIconBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconText: {
    fontSize: 20,
    color: THEME.colors.textMain,
    fontWeight: 'bold',
  },

  // 中央模型状态药丸
  headerModelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    gap: 6,
    maxWidth: '55%',
  },
  headerStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  headerModelText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textMain,
    flexShrink: 1,
  },
  headerModelChevron: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerActionIcon: {
    fontSize: 18,
    color: THEME.colors.textSub,
    fontWeight: '600',
  },
  headerActionText: {
    fontSize: 13,
    color: THEME.colors.textSub,
    fontWeight: '500',
  },

  // 错误提示条
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.accentErrorDim,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#FCA5A5',
    marginRight: 8,
  },
  errorClearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 6,
  },
  errorClearText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // 列表容器
  listWrapper: {
    flex: 1,
    position: 'relative',
  },
  messageList: {
    paddingVertical: 12,
    flexGrow: 1,
  },

  // 空白开屏态
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  emptyAvatarBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: THEME.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
  },
  emptyAvatarImg: {
    width: 44,
    height: 44,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.colors.textMain,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: THEME.colors.textSub,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  emptyQuickPrompts: {
    width: '100%',
  },

  // 触底悬浮圆键
  floatingBottomCircle: {
    position: 'absolute',
    right: 18,
    bottom: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  floatingBottomArrow: {
    fontSize: 16,
    color: THEME.colors.textMain,
    fontWeight: 'bold',
  },

  // PocketPal 现代极简悬浮输入舱
  inputContainer: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: THEME.colors.bgDark,
  },
  inputDock: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: THEME.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.colors.borderSubtle,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 8 : 5,
    minHeight: 48,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: THEME.colors.textMain,
    maxHeight: 120,
    paddingTop: 6,
    paddingBottom: 6,
    paddingRight: 10,
    lineHeight: 20,
  },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: THEME.colors.surfaceElevated,
    opacity: 0.5,
  },
  sendArrow: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
    lineHeight: 20,
  },
  stopButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: THEME.colors.accentError,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    marginBottom: 2,
  },
  stopIconSquare: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
});
