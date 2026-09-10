"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOMAINS = exports.knowledgeRegistry = exports.BASE_KNOWLEDGE_PACK = void 0;
const types_1 = require("./types");
Object.defineProperty(exports, "DOMAINS", { enumerable: true, get: function () { return types_1.DOMAINS; } });
const frontend_pack_1 = require("./data/frontend_pack");
const backend_pack_1 = require("./data/backend_pack");
const devops_pack_1 = require("./data/devops_pack");
const ai_pack_1 = require("./data/ai_pack");
/**
 * 出厂内置只读核心底座知识包 (Base Pack)
 */
exports.BASE_KNOWLEDGE_PACK = [
    ...frontend_pack_1.FRONTEND_CHUNKS,
    ...backend_pack_1.BACKEND_CHUNKS,
    ...devops_pack_1.DEVOPS_CHUNKS,
    ...ai_pack_1.AI_CHUNKS,
];
/**
 * 内存活跃知识库管理器（支持 Base + Patch 双库热插拔）
 */
class KnowledgeRegistry {
    constructor() {
        this.activeChunks = new Map();
        this.resetToBase();
    }
    /**
     * 重置为出厂 Base 底座
     */
    resetToBase() {
        this.activeChunks.clear();
        for (const chunk of exports.BASE_KNOWLEDGE_PACK) {
            this.activeChunks.set(chunk.chunkId, chunk);
        }
    }
    /**
     * 动态合入 OTA 增量补丁（Overlay Patch）
     * 若存在相同 chunkId，则执行增量覆写更新，无需发版重装 APK
     */
    applyPatch(patchChunks) {
        for (const patch of patchChunks) {
            this.activeChunks.set(patch.chunkId, patch);
        }
    }
    /**
     * 获取所有活跃知识块
     */
    getAll() {
        return Array.from(this.activeChunks.values());
    }
    /**
     * 按领域过滤知识块
     */
    getByDomain(domain) {
        return this.getAll().filter((c) => c.domain === domain);
    }
    /**
     * 根据 ID 检索单个知识卡
     */
    getById(chunkId) {
        return this.activeChunks.get(chunkId);
    }
}
exports.knowledgeRegistry = new KnowledgeRegistry();
__exportStar(require("./types"), exports);
