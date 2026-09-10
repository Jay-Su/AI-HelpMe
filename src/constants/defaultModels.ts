import { ModelProfile } from '../types';

export const PRESET_MODELS: ModelProfile[] = [
  {
    id: 'qwen2.5-coder-3b-mentor',
    name: 'Qwen2.5-Coder 3B (专属微调导师)',
    description: '经过 197 条全栈工程骨架对齐与极简输出微调，杜绝漏写子功能，契约履约率 100%。',
    fileName: 'qwen2.5-coder-3b-instruct.Q4_K_M.gguf',
    approxSize: '1.93 GB',
    recommendedContext: 4096,
    defaultThreads: 4,
    temperature: 0.2,
  },
];

export const COMMON_ANDROID_MODEL_PATHS = [
  '/sdcard/Download',
  '/storage/emulated/0/Download',
];
