/**
 * ============================================================================
 * 端侧离线编程导师 - 知识库 Schema 与领域规范定义
 * ============================================================================
 */

export type DomainType = 'frontend' | 'backend' | 'devops' | 'ai_engine';

export interface DomainMeta {
  id: DomainType;
  name: string;
  icon: string;
  description: string;
}

export const DOMAINS: Record<DomainType, DomainMeta> = {
  frontend: {
    id: 'frontend',
    name: '前端工程',
    icon: '🌐',
    description: 'React/Vue/TS/CSS 及浏览器闭包、事件循环等核心规范',
  },
  backend: {
    id: 'backend',
    name: '后端架构',
    icon: '⚙️',
    description: 'Go/Node.js/Python 并发模型、数据库事务与微服务设计',
  },
  devops: {
    id: 'devops',
    name: '运维DevOps',
    icon: '🚀',
    description: 'Docker 镜像瘦身、K8s 编排规范、Nginx 高性能反代与 CI/CD',
  },
  ai_engine: {
    id: 'ai_engine',
    name: 'AI开发',
    icon: '🤖',
    description: '大模型全栈体系、LoRA微调、Agent智能体、vLLM推理与高阶RAG实战',
  },
};

/**
 * 结构化父知识卡（Parent Knowledge Chunk）
 * 包含：精炼契约、注入 Prompt 的核心骨架（Skeleton）、完整源码与避坑指南
 */
export interface KnowledgeChunk {
  /** 唯一标识符，如 fe_js_debounce_01 */
  chunkId: string;
  /** 所属技术领域 */
  domain: DomainType;
  /** 规范标题 */
  title: string;
  /** 编程语言或技术栈，如 javascript / go / dockerfile */
  language: string;
  /** 适用版本规范，如 ES6+ / Go 1.20+ / Docker 24+ */
  frameworkVersion?: string;
  /** 检索倒排特征词与同义词 */
  keywords: string[];
  /** 接口契约说明 (1~2 句话讲清必选特性) */
  apiContract: string;
  /** 
   * 核心契约骨架模版（Skeleton Template，控制在 120~180 Tokens）
   * 专用于注入 Prompt 供 3B 模型进行“填空式补全”，杜绝 2.5s 的预填充卡顿
   */
  skeletonTemplate: string;
  /** 
   * 必须包含的特性清单（用于后置毫秒级 L1 正则断言）
   * 例如 ['leading', 'cancel', 'clearTimeout', 'apply']
   */
  mustHaveFeatures: string[];
  /** 核心避坑要点与深层原理简述 */
  pitfalls: string;
  /** 权威参考来源，如 MDN / Go Stdlib / Docker Docs */
  sourceAuthority?: string;
  /** 完整生产级实现源码（供后续在抽屉面板或离线文档中详细查阅） */
  fullImplementation?: string;
}

/**
 * 检索结果封装对象
 */
export interface SearchResult {
  chunk: KnowledgeChunk;
  score: number;
  matchedKeywords: string[];
}

/**
 * 后置断言验证结果
 */
export interface VerificationResult {
  isVerified: boolean;
  coveredFeatures: string[];
  missingFeatures: string[];
  summary: string;
}
