export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string | null;
  timestamp: number;
}

export interface HistoryExchange {
  id: string;
  prompt: string;
  response: string;
  imageUrl: string | null;
  timestamp: number;
  // For multi-turn conversations
  conversationHistory: ConversationTurn[];
}
