import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { QUICK_PROMPTS } from '../constants/prompts';
import { QuickPrompt } from '../types';
import { THEME } from '../constants/theme';

interface QuickPromptsProps {
  onSelectPrompt: (prefix: string) => void;
  disabled?: boolean;
}

export const QuickPrompts: React.FC<QuickPromptsProps> = ({ onSelectPrompt, disabled }) => {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {QUICK_PROMPTS.map((item: QuickPrompt) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.pill, disabled && styles.pillDisabled]}
            disabled={disabled}
            activeOpacity={0.7}
            onPress={() => onSelectPrompt(item.promptPrefix)}
          >
            <View style={styles.pillDot} />
            <Text style={[styles.pillText, disabled && styles.pillTextDisabled]}>
              {item.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 2,
  },
  scrollContent: {
    paddingHorizontal: 2,
    gap: 7,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 6,
  },
  pillDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.colors.primaryTeal,
  },
  pillDisabled: {
    opacity: 0.35,
  },
  pillText: {
    color: THEME.colors.textMain,
    fontSize: 12,
    fontWeight: '500',
  },
  pillTextDisabled: {
    color: THEME.colors.textMuted,
  },
});
