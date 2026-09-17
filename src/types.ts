export type ChatMode = 'general' | 'deep' | 'fast';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  modelUsed?: string;
  audioBase64?: string;
  isStreaming?: boolean;
}

export interface ProverbPillar {
  id: string;
  title: string;
  georgianVerse: string;
  description: string;
  samplePrompt: string;
  iconName: string;
}

export interface AudioPlaybackState {
  isPlaying: boolean;
  messageId: string | null;
  isLoading: boolean;
}
