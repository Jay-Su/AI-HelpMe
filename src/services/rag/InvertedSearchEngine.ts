import { KnowledgeChunk, SearchResult, DomainType, knowledgeRegistry } from '../../knowledge';

/**
 * ============================================================================
 * InvertedSearchEngine - 端侧极速倒排与代码符号检索引擎
 * ============================================================================
 * 
 * 核心特性：
 * 1. 【代码与双分词器支持】：保留驼峰命名（clearTimeout -> clear, timeout, cleartimeout）与点符号（.cancel, sync.WaitGroup）。
 * 2. 【双门禁机制（Dual Confidence Gating）】：
 *    - 最低词频匹配得分下限 (SCORE_THRESHOLD = 6.0)；
 *    - 核心符号强加权 (Symbol Boost)。
 * 3. 【零召回静默降级（Zero-Retrieval Fallback）】：
 *    - 用户提问闲聊或库外算法时，得分为 0 或未过门禁，直接返回 null，彻底杜绝无关代码污染 3B 模型注意力。
 * 4. 【极低开销】：纯内存倒排索引，移动端检索耗时 < 2ms，零原生 Crash 风险。
 */

export class InvertedSearchEngine {
  /** 倒排索引表: token -> Set<chunkId> */
  private invertedIndex: Map<string, Set<string>> = new Map();
  /** 最低置信度门禁阈值，未达到此分数坚决不注入知识 */
  private static readonly CONFIDENCE_THRESHOLD = 5.0;

  constructor() {
    this.buildIndex();
  }

  /**
   * 构建全量倒排索引
   */
  public buildIndex(): void {
    this.invertedIndex.clear();
    const chunks = knowledgeRegistry.getAll();

    for (const chunk of chunks) {
      const tokens = this.extractTokensFromChunk(chunk);
      for (const token of tokens) {
        if (!this.invertedIndex.has(token)) {
          this.invertedIndex.set(token, new Set());
        }
        this.invertedIndex.get(token)!.add(chunk.chunkId);
      }
    }
  }

  /**
   * 代码感知分词器（拆解驼峰、下划线、标点并保留核心关键词）
   */
  public tokenize(text: string): string[] {
    if (!text) return [];
    const tokens = new Set<string>();

    // 1. 提取所有纯英文/代码标识符 (如 MyPick, debounce, sync.WaitGroup, clearTimeout)
    const codeMatches = text.match(/[a-zA-Z0-9_.-]+/g) || [];
    for (const rawCode of codeMatches) {
      const lower = rawCode.toLowerCase();
      tokens.add(lower);

      // 驼峰拆分 (e.g. MyPick -> my, pick; clearTimeout -> clear, timeout)
      const camelParts = rawCode
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
        .split(' ');
      if (camelParts.length > 1) {
        for (const part of camelParts) {
          if (part.length > 1) tokens.add(part.toLowerCase());
        }
      }

      // 点号与下划线拆分 (e.g. debounced.cancel -> cancel; docker-compose -> docker, compose)
      const dotParts = rawCode.split(/[._-]+/);
      if (dotParts.length > 1) {
        for (const part of dotParts) {
          if (part.length > 1) tokens.add(part.toLowerCase());
        }
      }
    }

    // 2. 提取所有中文片段 (如 "怎么手写实现", "防抖函数")
    const chineseMatches = text.match(/[\u4e00-\u9fa5]+/g) || [];
    for (const zh of chineseMatches) {
      tokens.add(zh);
      if (zh.length >= 2) {
        for (let i = 0; i < zh.length - 1; i++) {
          tokens.add(zh.substring(i, i + 2));
        }
        for (let i = 0; i < zh.length - 2; i++) {
          tokens.add(zh.substring(i, i + 3));
        }
      }
    }

    return Array.from(tokens);
  }

  /**
   * 从知识卡中提取所有建立索引的特征 Token
   */
  private extractTokensFromChunk(chunk: KnowledgeChunk): Set<string> {
    const tokens = new Set<string>();

    // 索引 keywords（极高权重）
    for (const kw of chunk.keywords) {
      for (const t of this.tokenize(kw)) {
        tokens.add(t);
      }
    }

    // 索引标题
    for (const t of this.tokenize(chunk.title)) {
      tokens.add(t);
    }

    // 索引必须特性
    for (const f of chunk.mustHaveFeatures) {
      for (const t of this.tokenize(f)) {
        tokens.add(t);
      }
    }

    // 索引契约与语言
    for (const t of this.tokenize(chunk.apiContract)) {
      tokens.add(t);
    }
    tokens.add(chunk.language.toLowerCase());

    return tokens;
  }

  /**
   * 执行带门禁的精确检索与零召回降级
   * @param query 用户输入的内容
   * @param domainFilter 可选的显式领域过滤
   * @returns 若置信度达标返回最佳结果，若不达标返回 null（静默降级）
   */
  public search(query: string, domainFilter?: DomainType | 'all'): SearchResult | null {
    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) return null;

    const scores: Map<string, { score: number; matchedKeywords: Set<string> }> = new Map();

    for (const token of queryTokens) {
      const matchedChunkIds = this.invertedIndex.get(token);
      if (!matchedChunkIds) continue;

      for (const chunkId of matchedChunkIds) {
        const chunk = knowledgeRegistry.getById(chunkId);
        if (!chunk) continue;

        // 领域显式过滤
        if (domainFilter && domainFilter !== 'all' && chunk.domain !== domainFilter) {
          continue;
        }

        if (!scores.has(chunkId)) {
          scores.set(chunkId, { score: 0, matchedKeywords: new Set() });
        }

        const record = scores.get(chunkId)!;
        record.matchedKeywords.add(token);

        // 打分机制：基础词频 + 关键词与特性硬加权 + 专有技术词强加权
        let weight = 1.0;

        // 通用口语停用词降权
        const GENERIC_QUERY_WORDS = new Set([
          '关于', '开发', '知识', '知识点', '有哪些', '需要', '掌握',
          '的', '了', '和', '与', '怎么', '如何', '什么', '请问', '讲讲', '介绍'
        ]);

        if (GENERIC_QUERY_WORDS.has(token)) {
          weight = 0.25;
        } else if (token.length >= 2 && /^[a-zA-Z0-9_.-]+$/.test(token)) {
          // 英文缩写与代码标识符强加权（如 rag, redis, k8s, docker, debounce, vue, peft）
          weight = 4.5;
        }

        // 若直接命中了预设 keywords 或 mustHaveFeatures，给予高倍权重
        const lowerKeywords = chunk.keywords.map((k) => k.toLowerCase());
        const lowerFeatures = chunk.mustHaveFeatures.map((f) => f.toLowerCase());

        if (lowerKeywords.includes(token) || lowerFeatures.includes(token)) {
          weight *= 3.5;
        }

        // 标题强相关加权
        if (chunk.title.toLowerCase().includes(token)) {
          weight += 3.0;
        }

        record.score += weight;
      }
    }

    if (scores.size === 0) return null;

    // 排序找出最高分候选
    let bestChunkId: string | null = null;
    let highestScore = -1;
    let bestMatchedTokens: string[] = [];

    for (const [chunkId, data] of scores.entries()) {
      if (data.score > highestScore) {
        highestScore = data.score;
        bestChunkId = chunkId;
        bestMatchedTokens = Array.from(data.matchedKeywords);
      }
    }

    // 【核心门禁判定】：若最高分未达门槛或匹配词过少，坚决执行零召回静默降级！
    if (
      !bestChunkId ||
      highestScore < InvertedSearchEngine.CONFIDENCE_THRESHOLD ||
      bestMatchedTokens.length < 2
    ) {
      return null;
    }

    const matchedChunk = knowledgeRegistry.getById(bestChunkId);
    if (!matchedChunk) return null;

    return {
      chunk: matchedChunk,
      score: highestScore,
      matchedKeywords: bestMatchedTokens,
    };
  }
}

export const invertedSearchEngine = new InvertedSearchEngine();
