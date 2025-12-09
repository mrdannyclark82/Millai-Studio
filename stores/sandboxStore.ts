
import create from 'zustand';
import { VirtualFile } from '../components/Sandbox';
import { GitHubNode } from '../services/githubService';

interface SandboxState {
  sandboxCode: string;
  sandboxState: {
    files: Record<string, VirtualFile>;
    activeFile: string;
    fileTree: GitHubNode[];
  } | null;
  pinnedFiles: string[];
  setSandboxCode: (code: string) => void;
  setSandboxState: (state: {
    files: Record<string, VirtualFile>;
    activeFile: string;
    fileTree: GitHubNode[];
  } | null) => void;
  togglePin: (fileName: string) => void;
}

export const useSandboxStore = create<SandboxState>((set) => ({
  sandboxCode: '',
  sandboxState: null,
  pinnedFiles: [],
  setSandboxCode: (code) => set({ sandboxCode: code }),
  setSandboxState: (state) => set({ sandboxState: state }),
  togglePin: (fileName: string) =>
    set((state) => {
      const isPinned = state.pinnedFiles.includes(fileName);
      if (isPinned) {
        return { pinnedFiles: state.pinnedFiles.filter((f) => f !== fileName) };
      } else {
        return { pinnedFiles: [...state.pinnedFiles, fileName] };
      }
    }),
}));
