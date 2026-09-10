import { Platform } from 'react-native';

export const THEME = {
  colors: {
    // 基础黑夜背景（PocketPal 现代深空暗夜）
    bgDark: '#0B0F17',
    surface: '#131B26',
    surfaceElevated: '#1A2536',
    surfaceSubtle: '#0E1622',

    // 科技蓝主色系（对齐现代极简大模型客户端）
    primary: '#3B82F6',
    primaryDark: '#2563EB',
    primaryDim: 'rgba(59, 130, 246, 0.15)',
    primaryLight: '#60A5FA',
    primaryTeal: '#60A5FA',
    primaryTealDim: 'rgba(59, 130, 246, 0.15)',

    // 辅助状态色
    accentGreen: '#10B981',
    accentGreenDim: 'rgba(16, 185, 129, 0.15)',
    accentGold: '#F59E0B',
    accentWarn: '#F59E0B',
    accentWarnDim: 'rgba(245, 158, 11, 0.15)',
    accentError: '#EF4444',
    accentErrorDim: 'rgba(239, 68, 68, 0.15)',

    // 文字阶梯
    textMain: '#F8FAFC',
    textSub: '#94A3B8',
    textMuted: '#64748B',
    textCode: '#E2E8F0',

    // 边框与分割线
    borderSubtle: 'rgba(255, 255, 255, 0.08)',
    borderActive: 'rgba(59, 130, 246, 0.5)',
    borderFocus: '#3B82F6',

    // 气泡专属色
    userBubble: '#1E3A8A',
    mentorBubble: '#141D2B',
  },

  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    pill: 999,
  },

  typography: {
    fontMono: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeightComfort: 24,
    lineHeightCode: 20,
  },
};
