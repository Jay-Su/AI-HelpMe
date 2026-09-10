import { NativeModules } from 'react-native';
import { ChatSession, SessionMeta } from '../../types/session';
import { ChatMessage } from '../../types';
import { DomainType } from '../../knowledge';

const { StorageBridge } = NativeModules;

const STORAGE_KEY_SESSIONS = 'mentor_chat_sessions_v1';
const STORAGE_KEY_ACTIVE_ID = 'mentor_active_session_id_v1';

/**
 * ============================================================================
 * SessionManager - 本地多会话生命周期与持久化管理引擎
 * ============================================================================
 * 
 * 核心特性：
 * 1. 【本地持久化】：对话数据通过 StorageBridge 自动持久化保存至手机本地。
 * 2. 【智能标题萃取】：在用户提问第一句时，自动提炼前 18 个字符作为会话标题。
 * 3. 【订阅发布模式】：支持 UI 组件通过 subscribe 监听会话切换与增删，自动驱动重绘。
 * 4. 【Markdown 导出引擎】：支持将整场会话导出为标准的 GitHub Flavored Markdown 文本。
 */
export class SessionManager {
  private static instance: SessionManager;
  private sessions: Map<string, ChatSession> = new Map();
  private activeSessionId: string | null = null;
  private isInitialized: boolean = false;
  private listeners: Set<() => void> = new Set();

  private constructor() {}

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * 初始化并从本地存储恢复会话列表
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      let rawJson = '';
      let savedActiveId = '';

      if (StorageBridge?.getString) {
        rawJson = await StorageBridge.getString(STORAGE_KEY_SESSIONS, '');
        savedActiveId = await StorageBridge.getString(STORAGE_KEY_ACTIVE_ID, '');
      }

      if (rawJson) {
        const parsed: ChatSession[] = JSON.parse(rawJson);
        this.sessions.clear();
        parsed.forEach((s) => this.sessions.set(s.id, s));
      }

      if (savedActiveId && this.sessions.has(savedActiveId)) {
        this.activeSessionId = savedActiveId;
      } else if (this.sessions.size > 0) {
        // 取最新更新的会话作为激活项
        const sorted = this.getAllSessionMetas();
        this.activeSessionId = sorted[0].id;
      } else {
        // 初始为空时自动创建首个新会话
        await this.createSession('all', false);
      }

      this.isInitialized = true;
      this.notifyListeners();
    } catch (err) {
      console.warn('[SessionManager] 初始化恢复失败，创建全新会话:', err);
      this.sessions.clear();
      await this.createSession('all', false);
      this.isInitialized = true;
      this.notifyListeners();
    }
  }

  /**
   * 注册监听器
   */
  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((l) => l());
  }

  /**
   * 获取当前激活会话
   */
  public getActiveSession(): ChatSession {
    if (!this.activeSessionId || !this.sessions.has(this.activeSessionId)) {
      const newSession = this.createDefaultSession('all');
      this.sessions.set(newSession.id, newSession);
      this.activeSessionId = newSession.id;
    }
    return this.sessions.get(this.activeSessionId)!;
  }

  /**
   * 切换当前激活会话
   */
  public async switchSession(sessionId: string): Promise<ChatSession> {
    if (!this.sessions.has(sessionId)) {
      throw new Error(`未找到会话: ${sessionId}`);
    }
    this.activeSessionId = sessionId;
    await this.persist();
    this.notifyListeners();
    return this.sessions.get(sessionId)!;
  }

  /**
   * 创建全新会话
   */
  public async createSession(
    domain: DomainType | 'all' = 'all',
    shouldNotify: boolean = true
  ): Promise<ChatSession> {
    const newSession = this.createDefaultSession(domain);
    this.sessions.set(newSession.id, newSession);
    this.activeSessionId = newSession.id;
    await this.persist();
    if (shouldNotify) this.notifyListeners();
    return newSession;
  }

  /**
   * 保存并同步当前会话的消息变更
   */
  public async saveActiveSessionMessages(messages: ChatMessage[]): Promise<void> {
    const session = this.getActiveSession();
    session.messages = messages;
    session.updatedAt = Date.now();

    // 智能标题提炼：如果当前标题仍为默认标题且已产生用户提问，自动抓取首句前 18 字符
    if (session.title === '新对话' || session.title.startsWith('新对话')) {
      const firstUserMsg = messages.find((m) => m.role === 'user');
      if (firstUserMsg && firstUserMsg.content.trim()) {
        const cleanContent = firstUserMsg.content
          .replace(/<[^>]+>/g, '') // 去除 XML 标签
          .replace(/\s+/g, ' ')
          .trim();
        session.title = cleanContent.slice(0, 18) || '编程辅导会话';
      }
    }

    await this.persist();
    this.notifyListeners();
  }

  /**
   * 删除指定会话
   */
  public async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);

    // 如果删除的是当前激活会话，自动切换至其他可用会话，或新建会话
    if (this.activeSessionId === sessionId) {
      if (this.sessions.size > 0) {
        const remaining = this.getAllSessionMetas();
        this.activeSessionId = remaining[0].id;
      } else {
        await this.createSession('all', false);
      }
    }

    await this.persist();
    this.notifyListeners();
  }

  /**
   * 清空所有历史会话
   */
  public async clearAll(): Promise<void> {
    this.sessions.clear();
    await this.createSession('all', false);
    await this.persist();
    this.notifyListeners();
  }

  /**
   * 获取按更新时间倒序排序的全部会话元数据
   */
  public getAllSessionMetas(): SessionMeta[] {
    const list: SessionMeta[] = [];
    this.sessions.forEach((s) => {
      list.push({
        id: s.id,
        title: s.title,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        messageCount: s.messages.length,
        domain: s.domain,
      });
    });
    return list.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * 将会话导出为标准的 GitHub Flavored Markdown 文本
   */
  public exportSessionMarkdown(sessionId?: string): string {
    const targetId = sessionId || this.activeSessionId;
    const session = targetId ? this.sessions.get(targetId) : null;
    if (!session || session.messages.length === 0) {
      return '# 编程辅导会话\n\n暂无对话记录。';
    }

    const dateStr = new Date(session.createdAt).toLocaleString('zh-CN');
    let md = `# ${session.title}\n\n`;
    md += `> 创建时间：${dateStr} | 消息数：${session.messages.length}\n\n---\n\n`;

    for (const msg of session.messages) {
      const roleLabel = msg.role === 'user' ? '**J哥**' : '**Qwen 导师**';
      const time = new Date(msg.timestamp).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      });

      md += `### ${roleLabel} (${time})\n\n`;

      if (msg.ragMetadata) {
        md += `> 📚 **权威规范引用**：\`${msg.ragMetadata.hitTitle}\` (${msg.ragMetadata.hitChunkId})\n\n`;
      }

      md += `${msg.content}\n\n`;

      if (msg.stats) {
        md += `*⏱️ 生成速度: ${msg.stats.tokensPerSecond || 0} T/s | Tokens: ${msg.stats.totalTokens || 0} | 耗时: ${((msg.stats.durationMs || 0) / 1000).toFixed(1)}s*\n\n`;
      }

      md += `---\n\n`;
    }

    return md;
  }

  private createDefaultSession(domain: DomainType | 'all'): ChatSession {
    const now = Date.now();
    return {
      id: `session_${now}_${Math.random().toString(36).slice(2, 7)}`,
      title: '新对话',
      createdAt: now,
      updatedAt: now,
      messages: [],
      domain,
    };
  }

  /**
   * 持久化保存至原生存储
   */
  private async persist(): Promise<void> {
    try {
      const arr = Array.from(this.sessions.values());
      const json = JSON.stringify(arr);
      if (StorageBridge?.saveString) {
        await StorageBridge.saveString(STORAGE_KEY_SESSIONS, json);
        if (this.activeSessionId) {
          await StorageBridge.saveString(STORAGE_KEY_ACTIVE_ID, this.activeSessionId);
        }
      }
    } catch (err) {
      console.warn('[SessionManager] 本地持久化保存失败:', err);
    }
  }
}

export const sessionManager = SessionManager.getInstance();
