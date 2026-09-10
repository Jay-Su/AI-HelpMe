import React, { useState } from 'react';
import { View, StatusBar, StyleSheet, BackHandler } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ChatScreen } from './src/screens/ChatScreen';
import { ModelSettingsScreen } from './src/screens/ModelSettingsScreen';

type ScreenType = 'chat' | 'settings';

/**
 * ============================================================================
 * App - 端侧 SLM 全栈编程导师根入口
 * ============================================================================
 * 
 * 架构优化说明：
 * 采用轻量化状态驱动的视图导航控制器（State-driven View Controller）：
 * 1. 彻底规避 Android 新架构 (Fabric) 下 react-native-screens 原生 Fragment 
 *    渲染时序导致的 dispatchDraw NullPointerException 闪退问题。
 * 2. 内存零开销，页面切换更快速平滑。
 * 3. 完美向下兼容 ChatScreen 与 ModelSettingsScreen 的 navigation.navigate 与 goBack 调用。
 */
export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('chat');

  const listenersRef = React.useRef<{ [key: string]: Set<() => void> }>({});

  // 模拟标准 navigation 接口，支持组件内部的路由调用与事件监听
  const navigation = React.useMemo(
    () => ({
      navigate: (screenName: string) => {
        if (screenName === 'ModelSettings') {
          setCurrentScreen('settings');
        } else {
          setCurrentScreen('chat');
          listenersRef.current['focus']?.forEach((cb) => cb());
        }
      },
      goBack: () => {
        setCurrentScreen('chat');
        listenersRef.current['focus']?.forEach((cb) => cb());
      },
      addListener: (event: string, callback: () => void) => {
        if (!listenersRef.current[event]) {
          listenersRef.current[event] = new Set();
        }
        listenersRef.current[event].add(callback);
        return () => {
          listenersRef.current[event]?.delete(callback);
        };
      },
    }),
    []
  );

  // 监听安卓物理返回键
  React.useEffect(() => {
    const onBackPress = () => {
      if (currentScreen === 'settings') {
        setCurrentScreen('chat');
        return true; // 拦截返回键
      }
      return false; // 退出应用
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress
    );
    return () => subscription.remove();
  }, [currentScreen]);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F17" />
      <View style={styles.rootContainer}>
        {currentScreen === 'chat' ? (
          <ChatScreen navigation={navigation} />
        ) : (
          <ModelSettingsScreen navigation={navigation} />
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#0B0F17',
  },
});
