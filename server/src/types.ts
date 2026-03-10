// Message types from Claude Code JSONL files
export interface ClaudeMessage {
  uuid: string;
  parentUuid?: string;
  sessionId: string;
  timestamp: string;
  type: 'user' | 'assistant' | 'system' | 'summary' | 'progress';
  message: {
    role: 'user' | 'assistant';
    content: string | ContentItem[];
    model?: string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
  };
  toolUse?: {
    name?: string;
    id?: string;
  };
  toolUseResult?: unknown;
  costUSD?: number;
  durationMs?: number;
}

export interface ContentItem {
  type: 'text' | 'thinking' | 'tool_use' | 'tool_result' | 'image' | 'document';
  text?: string;
  thinking?: string;
  name?: string;
  id?: string;
  content?: string;
  tool_use_id?: string;
  title?: string;
  context?: string;
}

export interface Session {
  id: string;
  projectName: string;
  filePath: string;
  messages: ClaudeMessage[];
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  totalTokens?: number;
  estimatedCost?: number;
}

export interface Project {
  name: string;
  path: string;
  sessions: Session[];
  sessionCount: number;
  lastUpdated: string;
}

export interface Bookmark {
  id: string;
  messageUuid: string;
  sessionId: string;
  projectName: string;
  note?: string;
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface SessionTag {
  sessionId: string;
  tagId: string;
}
