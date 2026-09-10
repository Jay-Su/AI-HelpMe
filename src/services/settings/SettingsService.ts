import { NativeModules } from 'react-native';
import { MENTOR_SYSTEM_PROMPT } from '../../constants/prompts';

const { StorageBridge } = NativeModules;

export interface AppSettings {
  threads: number;
  contextSize: number;
  gpuLayers: number;
  temperature: number;
  topP: number;
  maxTokens: number;
  systemPrompt: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  threads: 4,
  contextSize: 2048,
  gpuLayers: 0,
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 2048,
  systemPrompt: MENTOR_SYSTEM_PROMPT,
};

const PROMPT_VERSION = 'v6_mentor_sweetspot';

class SettingsServiceClass {
  private settings: AppSettings = { ...DEFAULT_SETTINGS };
  private isLoaded: boolean = false;
  private listeners: Set<() => void> = new Set();

  public async init(): Promise<AppSettings> {
    if (this.isLoaded) return this.settings;

    try {
      if (StorageBridge?.getString) {
        const pVer = await StorageBridge.getString('setting_prompt_version', '');
        if (pVer === PROMPT_VERSION) {
          const t = await StorageBridge.getString('setting_threads', '');
          if (t) this.settings.threads = parseInt(t, 10);
          else this.settings.threads = DEFAULT_SETTINGS.threads;

          const ctx = await StorageBridge.getString('setting_context_size', '');
          if (ctx) this.settings.contextSize = parseInt(ctx, 10);
          else this.settings.contextSize = DEFAULT_SETTINGS.contextSize;

          const gpu = await StorageBridge.getString('setting_gpu_layers', '');
          if (gpu) this.settings.gpuLayers = parseInt(gpu, 10);

          const temp = await StorageBridge.getString('setting_temperature', '');
          if (temp) this.settings.temperature = parseFloat(temp);

          const topP = await StorageBridge.getString('setting_top_p', '');
          if (topP) this.settings.topP = parseFloat(topP);

          const maxTok = await StorageBridge.getString('setting_max_tokens', '');
          if (maxTok) this.settings.maxTokens = parseInt(maxTok, 10);
          else this.settings.maxTokens = DEFAULT_SETTINGS.maxTokens;

          const prompt = await StorageBridge.getString('setting_system_prompt', '');
          if (prompt) this.settings.systemPrompt = prompt;
        } else {
          // 彻底对齐 PocketPal：4大核极速无锁调度、2048轻量窗口、纯净提示词
          this.settings.systemPrompt = MENTOR_SYSTEM_PROMPT;
          this.settings.threads = 4;
          this.settings.contextSize = 2048;
          StorageBridge?.saveString?.('setting_prompt_version', PROMPT_VERSION);
          StorageBridge?.saveString?.('setting_system_prompt', MENTOR_SYSTEM_PROMPT);
          StorageBridge?.saveString?.('setting_threads', '4');
          StorageBridge?.saveString?.('setting_context_size', '2048');
        }
      }
    } catch (e) {
      console.warn('[SettingsService] 读取持久化配置失败，使用默认值:', e);
    }

    this.isLoaded = true;
    this.notify();
    return this.settings;
  }

  public getSettings(): AppSettings {
    return { ...this.settings };
  }

  public async updateSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
    this.settings = { ...this.settings, ...partial };

    if (StorageBridge?.saveString) {
      if (partial.threads !== undefined) {
        await StorageBridge.saveString('setting_threads', String(this.settings.threads));
      }
      if (partial.contextSize !== undefined) {
        await StorageBridge.saveString('setting_context_size', String(this.settings.contextSize));
      }
      if (partial.gpuLayers !== undefined) {
        await StorageBridge.saveString('setting_gpu_layers', String(this.settings.gpuLayers));
      }
      if (partial.temperature !== undefined) {
        await StorageBridge.saveString('setting_temperature', String(this.settings.temperature));
      }
      if (partial.topP !== undefined) {
        await StorageBridge.saveString('setting_top_p', String(this.settings.topP));
      }
      if (partial.maxTokens !== undefined) {
        await StorageBridge.saveString('setting_max_tokens', String(this.settings.maxTokens));
      }
      if (partial.systemPrompt !== undefined) {
        await StorageBridge.saveString('setting_system_prompt', this.settings.systemPrompt);
        await StorageBridge.saveString('setting_prompt_version', PROMPT_VERSION);
      }
    }

    this.notify();
    return this.settings;
  }

  public async resetToDefaults(): Promise<AppSettings> {
    this.settings = { ...DEFAULT_SETTINGS };
    await this.updateSettings(DEFAULT_SETTINGS);
    return this.settings;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }
}

export const SettingsService = new SettingsServiceClass();
