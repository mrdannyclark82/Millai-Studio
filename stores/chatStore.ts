import create from 'zustand';
import { Message, Attachment } from '../types';
import { memoryStore } from '../utils/memoryStore';
import { geminiService } from '../services/geminiService';
import { useSandboxStore } from './sandboxStore';

interface ChatState {
  messages: Message[];
  attachments: Attachment[];
  isGenerating: boolean;
  input: string;
  isThinking: boolean;
  isMapsEnabled: boolean;
  isSearchEnabled: boolean;

  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  setAttachments: (attachments: Attachment[]) => void;
  setInput: (input: string) => void;
  generateResponse: () => Promise<void>;
  loadHistory: () => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  attachments: [],
  isGenerating: false,
  input: '',
  isThinking: false,
  isMapsEnabled: false,
  isSearchEnabled: false,

  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setAttachments: (attachments) => set({ attachments }),
  setInput: (input) => set({ input }),

  loadHistory: async () => {
    const messages = await memoryStore.loadHistory();
    set({ messages });
  },

  generateResponse: async () => {
    const { input, attachments, messages, isThinking, isMapsEnabled, isSearchEnabled, addMessage } = get();
    const { sandboxState, pinnedFiles } = useSandboxStore.getState();

    if (!input.trim() && attachments.length === 0) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      attachments: [...attachments],
      timestamp: Date.now(),
    };

    addMessage(userMsg);
    set({ input: '', attachments: [] });

    let codeContext = '';
    if (sandboxState && pinnedFiles.length > 0) {
      codeContext = 'The user has pinned the following files for context:\n\n';
      for (const fileName of pinnedFiles) {
        const file = sandboxState.files[fileName];
        if (file) {
          codeContext += `--- ${fileName} ---\n${file.content}\n\n`;
        }
      }
    } else if (sandboxState) {
      const activeFile = sandboxState.files[sandboxState.activeFile];
      if (activeFile) {
        codeContext = `The user has the following file open in the sandbox:\n\n--- ${activeFile.name} ---\n${activeFile.content}`;
      }
    }

    set({ isGenerating: true });
    try {
      const responseId = (Date.now() + 1).toString();
      const modelMsg: Message = {
        id: responseId,
        role: 'model',
        text: '',
        timestamp: Date.now(),
        isThinking: isThinking,
      };
      addMessage(modelMsg);

      const stream = await geminiService.sendMessageStream(
        userMsg.text + (codeContext ? `\n\n${codeContext}` : ''),
        messages
      );

      let currentResponseText = '';
      for await (const chunk of stream) {
        if (chunk.text) {
          currentResponseText += chunk.text;
          set((state) => ({
            messages: state.messages.map((m) =>
              m.id === responseId ? { ...m, text: currentResponseText } : m
            ),
          }));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      set({ isGenerating: false });
      const finalMessages = get().messages;
      await memoryStore.saveHistory(finalMessages);
    }
  },
}));
