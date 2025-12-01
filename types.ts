export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system'
}

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document'
}

export interface Attachment {
  type: MediaType;
  data: string; // Base64
  mimeType: string;
  url?: string; // For display
  name?: string; // For documents
}

export interface Message {
  id: string;
  role: MessageRole;
  text: string;
  thoughtText?: string; // New: Stores the internal reasoning/thought process
  attachments?: Attachment[];
  timestamp: number;
  isThinking?: boolean;
  groundingUrls?: Array<{uri: string, title: string}>;
}

export interface ChatSession {
  id: string;
  messages: Message[];
}

// Configuration types
export interface GenerationConfig {
  useThinking: boolean;
  useGrounding: boolean; // Maps
  useSearch: boolean; // Deep Search
  useVeo: boolean;
  useNanoBanana: boolean;
}