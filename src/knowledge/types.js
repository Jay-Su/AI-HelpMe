"use strict";
/**
 * ============================================================================
 * 端侧离线编程导师 - 知识库 Schema 与领域规范定义
 * ============================================================================
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOMAINS = void 0;
exports.DOMAINS = {
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
