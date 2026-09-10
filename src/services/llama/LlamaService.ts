import { initLlama, loadLlamaModelInfo, LlamaContext } from 'llama.rn';
import { STOP_TOKENS } from '../../constants/prompts';
import { ModelRuntimeStatus } from '../../types';

/**
 * 流式生成过程中的回调事件接口定义
 */
export interface CompletionCallbacks {
  /** 每一个新的 Token 产生时的流式回调，用于驱动 UI 打字机效果 */
  onToken?: (token: string) => void;

  /** 首字延迟回调 (Time To First Token)，单位毫秒 */
  onFirstToken?: (latencyMs: number) => void;

  /** 推理彻底完成后的性能指标汇总回调 */
  onComplete?: (stats: {
    totalTokens: number;        // 总共生成的 Token 数
    durationMs: number;         // 总耗时（毫秒）
    tokensPerSecond: number;    // 生成速率 (T/s)
    timeToFirstTokenMs: number; // 首字响应耗时
  }) => void;

  /** 发生错误时的回调捕获 */
  onError?: (error: Error) => void;
}

/**
 * ============================================================================
 * LlamaService - 端侧大模型推理引擎核心服务类（单例）
 * ============================================================================
 */
class LlamaService {
  private static instance: LlamaService;
  
  /** 底层 C++ 原生上下文句柄 (通过 llama.rn 桥接) */
  private context: LlamaContext | null = null;
  
  /** 标记当前是否处于活跃的 Token 生成状态中 */
  private isGenerating = false;

  /** 标记当前是否正在挂载模型 */
  private isLoading = false;
  
  /** 记录当前加载的模型绝对路径 */
  private currentModelPath: string | null = null;
  
  /** 记录当前加载的模型唯一标识 */
  private currentModelId: string | null = null;

  /** 当前运行时参数配置 */
  private currentThreads = 4;
  private currentContextSize = 2048;
  private currentGpuLayers = 0;
  private lastError: string | null = null;

  private constructor() {}

  /**
   * 获取全局唯一实例
   */
  public static getInstance(): LlamaService {
    if (!LlamaService.instance) {
      LlamaService.instance = new LlamaService();
    }
    return LlamaService.instance;
  }

  /**
   * 清洗模型路径，去除 file:// 前缀并解码
   */
  public cleanPath(rawPath: string): string {
    let p = rawPath;
    if (p.startsWith('file://')) {
      p = p.slice(7);
    }
    return decodeURIComponent(p);
  }

  /**
   * 安全探测指定路径的模型文件是否可读且为合法 GGUF 格式
   */
  public async probeModel(modelPath: string): Promise<boolean> {
    try {
      const clean = this.cleanPath(modelPath);
      const info = await loadLlamaModelInfo(clean);
      return !!info && typeof info === 'object';
    } catch {
      return false;
    }
  }

  /**
   * 模型加载与原生上下文初始化
   */
  public async loadModel(
    modelPath: string,
    modelId: string,
    options: {
      contextSize?: number;
      threads?: number;
      gpuLayers?: number;
    } = {}
  ): Promise<void> {
    const { contextSize = 4096, threads = 6, gpuLayers = 0 } = options;
    const cleanPath = this.cleanPath(modelPath);

    const isValid = await this.probeModel(cleanPath);
    if (!isValid) {
      throw new Error(
        `模型文件无法被原生引擎打开：\n${cleanPath}\n\n请确认：\n1. 文件名与路径完全正确\n2. 手机已授予该应用“所有文件访问权限”`
      );
    }

    if (this.context) {
      await this.release();
    }

    this.isLoading = true;
    this.lastError = null;

    try {
      const initParams: any = {
        model: cleanPath,
        use_mlock: false,
        n_ctx: contextSize,
        n_threads: threads,
        n_gpu_layers: gpuLayers,
      };

      this.context = await initLlama(initParams);

      this.currentModelPath = cleanPath;
      this.currentModelId = modelId;
      this.currentThreads = threads;
      this.currentContextSize = contextSize;
      this.currentGpuLayers = gpuLayers;
    } catch (err: any) {
      this.context = null;
      this.currentModelPath = null;
      this.currentModelId = null;
      this.lastError = err?.message || String(err);
      throw new Error(`[LlamaService] 模型初始化失败: ${err?.message || err}`);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 流式文本生成 (completion)
   */
  public async completion(
    prompt: string,
    options: {
      temperature?: number;
      topP?: number;
      maxTokens?: number;
    } = {},
    callbacks: CompletionCallbacks = {}
  ): Promise<string> {
    if (!this.context) {
      throw new Error('未检测到已加载的模型，请先前往“设置”加载 GGUF 权重文件！');
    }

    if (this.isGenerating) {
      throw new Error('模型当前正在生成中，请等待其完成或先点击“停止”。');
    }

    this.isGenerating = true;
    const startTime = Date.now();
    let firstTokenTime: number | null = null;
    let tokenCount = 0;
    let fullGeneratedText = '';

    try {
      let result: any = null;
      let retries = 0;
      const maxRetries = 2;

      while (retries <= maxRetries) {
        try {
          const completionParams: any = {
            prompt,
            temperature: options.temperature ?? 0.7,
            n_predict: options.maxTokens ?? 1024,
            top_p: options.topP ?? 0.9,
            top_k: 40,
            penalty_repeat: 1.15,
            penalty_last_n: 64,
            stop: STOP_TOKENS,
          };

          result = await this.context.completion(
            completionParams,
            (data: { token: string }) => {
              if (!this.isGenerating) return;

              const now = Date.now();
              if (firstTokenTime === null) {
                firstTokenTime = now;
                const ttft = firstTokenTime - startTime;
                callbacks.onFirstToken?.(ttft);
              }

              tokenCount++;
              fullGeneratedText += data.token;
              callbacks.onToken?.(data.token);
            }
          );
          break;
        } catch (execErr: any) {
          const errMsg = execErr?.message || String(execErr);
          if (errMsg.includes('Context is busy') && retries < maxRetries) {
            retries++;
            console.warn(`[LlamaService] 原生上下文繁忙，正在进行第 ${retries} 次重试...`);
            try {
              await this.context.stopCompletion();
            } catch {}
            await new Promise((resolve) => setTimeout(() => resolve(null), 200));
            continue;
          }
          throw execErr;
        }
      }

      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      const ttft = (firstTokenTime ?? endTime) - startTime;
      const generationDuration = endTime - (firstTokenTime ?? startTime);

      const tokensPerSecond =
        generationDuration > 0
          ? Number(((tokenCount / generationDuration) * 1000).toFixed(2))
          : 0;

      callbacks.onComplete?.({
        totalTokens: tokenCount,
        durationMs: totalDuration,
        tokensPerSecond,
        timeToFirstTokenMs: ttft,
      });

      return result?.text || fullGeneratedText;
    } catch (err: any) {
      callbacks.onError?.(err);
      throw err;
    } finally {
      this.isGenerating = false;
    }
  }

  /**
   * 中断当前生成 (stop)
   */
  public async stop(): Promise<void> {
    this.isGenerating = false;
    if (this.context) {
      try {
        await Promise.race([
          this.context.stopCompletion(),
          new Promise((resolve) => setTimeout(() => resolve(null), 400)),
        ]);
      } catch (e) {
        console.warn('[LlamaService] stopCompletion error:', e);
      }
    }
  }

  /**
   * 释放模型显存与原生句柄 (release)
   */
  public async release(): Promise<void> {
    if (this.context) {
      await this.stop();
      await this.context.release();
      this.context = null;
      this.currentModelPath = null;
      this.currentModelId = null;
    }
  }

  /**
   * 获取当前引擎的运行状态快照
   */
  public getStatus(): ModelRuntimeStatus {
    return {
      isLoaded: this.context !== null,
      isLoading: this.isLoading,
      activeModelId: this.currentModelId,
      loadedModelPath: this.currentModelPath,
      gpuLayers: this.currentGpuLayers,
      contextSize: this.currentContextSize,
      threads: this.currentThreads,
      error: this.lastError,
    };
  }

  public setThreads(threads: number) {
    this.currentThreads = threads;
  }

  public setContextSize(contextSize: number) {
    this.currentContextSize = contextSize;
  }

  public setGpuLayers(gpuLayers: number) {
    this.currentGpuLayers = gpuLayers;
  }

  public getIsGenerating(): boolean {
    return this.isGenerating;
  }
}

export default LlamaService.getInstance();
