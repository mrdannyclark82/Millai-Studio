import { Message } from '../types';

import { db } from './database';
import { Message } from '../types';

const saveHistory = async (messages: Message[]): Promise<void> => {
  try {
    await db.messages.bulkPut(messages);
  } catch (error) {
    console.error('Failed to save history to IndexedDB', error);
  }
};

const loadHistory = async (): Promise<Message[]> => {
  try {
    return await db.messages.orderBy('timestamp').toArray();
  } catch (error) {
    console.error('Failed to load history from IndexedDB', error);
    return [];
  }
};

const clearHistory = async (): Promise<void> => {
  try {
    await db.messages.clear();
  } catch (error) {
    console.error('Failed to clear history from IndexedDB', error);
  }
};

export const memoryStore = {
  saveHistory,
  loadHistory,
  clearHistory,
};