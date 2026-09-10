import { KnowledgeChunk, DomainType, DOMAINS } from './types';
import { FRONTEND_CHUNKS } from './data/frontend_pack';
import { BACKEND_CHUNKS } from './data/backend_pack';
import { DEVOPS_CHUNKS } from './data/devops_pack';
import { AI_CHUNKS } from './data/ai_pack';

/**
 * 出厂内置只读核心底座知识包 (Base Pack)
 */
export const BASE_KNOWLEDGE_PACK: KnowledgeChunk[] = [
  ...FRONTEND_CHUNKS,
  ...BACKEND_CHUNKS,
  ...DEVOPS_CHUNKS,
  ...AI_CHUNKS,
];

/**
 * 内存活跃知识库管理器（支持 Base + Patch 双库热插拔）
 */
class KnowledgeRegistry {
  private activeChunks: Map<string, KnowledgeChunk> = new Map();

  constructor() {
    this.resetToBase();
  }

  /**
   * 重置为出厂 Base 底座
   */
  public resetToBase(): void {
    this.activeChunks.clear();
    for (const chunk of BASE_KNOWLEDGE_PACK) {
      this.activeChunks.set(chunk.chunkId, chunk);
    }
  }

  /**
   * 动态合入 OTA 增量补丁（Overlay Patch）
   * 若存在相同 chunkId，则执行增量覆写更新，无需发版重装 APK
   */
  public applyPatch(patchChunks: KnowledgeChunk[]): void {
    for (const patch of patchChunks) {
      this.activeChunks.set(patch.chunkId, patch);
    }
  }

  /**
   * 获取所有活跃知识块
   */
  public getAll(): KnowledgeChunk[] {
    return Array.from(this.activeChunks.values());
  }

  /**
   * 按领域过滤知识块
   */
  public getByDomain(domain: DomainType): KnowledgeChunk[] {
    return this.getAll().filter((c) => c.domain === domain);
  }

  /**
   * 根据 ID 检索单个知识卡
   */
  public getById(chunkId: string): KnowledgeChunk | undefined {
    return this.activeChunks.get(chunkId);
  }
}

export const knowledgeRegistry = new KnowledgeRegistry();
export { DOMAINS };
export * from './types';
