import { ChatMessage } from './index';
import { DomainType } from '../knowledge';

/**
 * 单个聊天会话实体
 */
export interface ChatSession {
  /** 会话唯一标识符，如 session_178885... */
  id: string;
  /** 会话标题（默认从第 1 句用户提问自动提炼前 18 字） */
  title: string;
  /** 创建时间戳 */
  createdAt: number;
  /** 最近更新时间戳 */
  updatedAt: number;
  /** 关联的消息列表 */
  messages: ChatMessage[];
  /** 当前会话偏好的技术领域 */
  domain: DomainType | 'all';
}

/**
 * 会话轻量级摘要（供抽屉列表极速渲染）
 */
export interface SessionMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  domain: DomainType | 'all';
}

/**
 * 智能一键追问胶囊
 */
export interface FollowUpChip {
  id: string;
  label: string;
  prompt: string;
  icon?: string;
}
