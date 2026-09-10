export type Role = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  stats?: {
    tokensPerSecond?: number;
    totalTokens?: number;
    durationMs?: number;
    timeToFirstTokenMs?: number;
  };
  ragMetadata?: {
    hitChunkId?: string;
    hitTitle?: string;
    domain?: string;
    score?: number;
    matchedKeywords?: string[];
    verification?: {
      isVerified: boolean;
      coveredFeatures: string[];
      missingFeatures: string[];
      summary: string;
    };
  };
}

export interface ModelProfile {
  id: string;
  name: string;
  description: string;
  fileName: string;
  approxSize: string;
  recommendedContext: number;
  defaultThreads: number;
  temperature: number;
}

export interface ModelRuntimeStatus {
  isLoaded: boolean;
  isLoading: boolean;
  activeModelId: string | null;
  loadedModelPath: string | null;
  gpuLayers: number;
  contextSize: number;
  threads: number;
  error: string | null;
}

export interface QuickPrompt {
  id: string;
  title: string;
  icon: string;
  promptPrefix: string;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  category: 'frontend' | 'backend' | 'devops' | 'ai';
  description: string;
  chunkCount: number;
  lastUpdated: string;
}
