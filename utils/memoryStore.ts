import { Message } from '../types';

const STORAGE_KEY = 'milla_chat_history';

export const memoryStore = {
  saveHistory: (messages: Message[]) => {
    try {
      // Basic safeguard: If messages are getting too large for localStorage (approx 5MB),
      // we might want to trim old attachments or warn.
      // For now, we just attempt save.
      const serialized = JSON.stringify(messages);
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch (e) {
      console.warn("Failed to save memory to localStorage (likely full)", e);
    }
  },

  loadHistory: (): Message[] | null => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return null;
      return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to parse memory", e);
      return null;
    }
  },

  clearMemory: () => {
    localStorage.removeItem(STORAGE_KEY);
  }
};