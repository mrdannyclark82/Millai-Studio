
import create from 'zustand';
import { ThemeType } from '../utils/theme';

interface UIState {
  isSandboxOpen: boolean;
  isGalaxyOpen: boolean;
  isStudioOpen: boolean;
  isToDoOpen: boolean;
  isMorningSyncOpen: boolean;
  isPodcastOpen: boolean;
  isBackupOpen: boolean;
  isOfflineModelOpen: boolean;
  isDatabaseOpen: boolean;
  isLive: boolean;
  liveConfig: { video: boolean; edge: boolean; screen: boolean };
  sectionsOpen: {
    core: boolean;
    creative: boolean;
    productivity: boolean;
    intelligence: boolean;
    system: boolean;
    settings: boolean;
  };
  activeTheme: ThemeType;
  customBackground: { type: 'image' | 'video'; url: string } | null;
  isGalaxyBackground: boolean;
  sandboxWidth: number;
  isResizingSandbox: boolean;
  youtubeVideoId: string | null;
  showClientIdInput: boolean;

  toggleSandbox: () => void;
  toggleGalaxy: () => void;
  toggleStudio: () => void;
  toggleToDo: () => void;
  toggleMorningSync: () => void;
  togglePodcast: () => void;
  toggleBackup: () => void;
  toggleOfflineModel: () => void;
  toggleDatabase: () => void;
  startLive: (config?: { video: boolean; edge: boolean; screen: boolean }) => void;
  stopLive: () => void;
  toggleSection: (section: keyof UIState['sectionsOpen']) => void;
  setTheme: (theme: ThemeType) => void;
  setCustomBackground: (background: { type: 'image' | 'video'; url: string } | null) => void;
  toggleGalaxyBackground: () => void;
  setSandboxWidth: (width: number) => void;
  setIsResizingSandbox: (isResizing: boolean) => void;
  setYoutubeVideoId: (id: string | null) => void;
  setShowClientIdInput: (show: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSandboxOpen: false,
  isGalaxyOpen: false,
  isStudioOpen: false,
  isToDoOpen: false,
  isMorningSyncOpen: false,
  isPodcastOpen: false,
  isBackupOpen: false,
  isOfflineModelOpen: false,
  isDatabaseOpen: false,
  isLive: false,
  liveConfig: { video: false, edge: false, screen: false },
  sectionsOpen: {
    core: true,
    creative: true,
    productivity: false,
    intelligence: true,
    system: false,
    settings: false,
  },
  activeTheme: 'default',
  customBackground: null,
  isGalaxyBackground: false,
  sandboxWidth: 600,
  isResizingSandbox: false,
  youtubeVideoId: null,
  showClientIdInput: false,

  toggleSandbox: () => set((state) => ({ isSandboxOpen: !state.isSandboxOpen })),
  toggleGalaxy: () => set((state) => ({ isGalaxyOpen: !state.isGalaxyOpen })),
  toggleStudio: () => set((state) => ({ isStudioOpen: !state.isStudioOpen })),
  toggleToDo: () => set((state) => ({ isToDoOpen: !state.isToDoOpen })),
  toggleMorningSync: () => set((state) => ({ isMorningSyncOpen: !state.isMorningSyncOpen })),
  togglePodcast: () => set((state) => ({ isPodcastOpen: !state.isPodcastOpen })),
  toggleBackup: () => set((state) => ({ isBackupOpen: !state.isBackupOpen })),
  toggleOfflineModel: () => set((state) => ({ isOfflineModelOpen: !state.isOfflineModelOpen })),
  toggleDatabase: () => set((state) => ({ isDatabaseOpen: !state.isDatabaseOpen })),
  startLive: (config = { video: false, edge: false, screen: false }) => set({ isLive: true, liveConfig: config }),
  stopLive: () => set({ isLive: false }),
  toggleSection: (section) =>
    set((state) => ({
      sectionsOpen: { ...state.sectionsOpen, [section]: !state.sectionsOpen[section] },
    })),
  setTheme: (theme) => set({ activeTheme: theme }),
  setCustomBackground: (background) => set({ customBackground: background }),
  toggleGalaxyBackground: () => set((state) => ({ isGalaxyBackground: !state.isGalaxyBackground })),
  setSandboxWidth: (width) => set({ sandboxWidth: width }),
  setIsResizingSandbox: (isResizing) => set({ isResizingSandbox: isResizing }),
  setYoutubeVideoId: (id) => set({ youtubeVideoId: id }),
  setShowClientIdInput: (show) => set({ showClientIdInput: show }),
}));
