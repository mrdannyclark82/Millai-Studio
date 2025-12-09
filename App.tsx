
import React, { useRef, useEffect, useCallback } from 'react';
import { MessageRole, MediaType } from './types';
import LiveSession from './components/LiveSession';
import Sandbox from './components/Sandbox';
import Orb from './components/Orb';
import NeuralGalaxy from './components/NeuralGalaxy';
import ToDoList from './components/ToDoList';
import YouTubePlayer from './components/YouTubePlayer';
import CreativeStudio from './components/CreativeStudio';
import MorningSync from './components/MorningSync';
import PodcastPlayer from './components/PodcastPlayer';
import BackupManager from './components/BackupManager';
import OfflineModelRunner from './components/OfflineModelRunner';
import DatabaseConnector from './components/DatabaseConnector';
import ReactMarkdown from 'react-markdown';
import { applyTheme } from './utils/theme';
import { googleIntegration } from './services/googleIntegrationService';
import { useChatStore } from './stores/chatStore';
import { useUIStore } from './stores/uiStore';
import { useSandboxStore } from './stores/sandboxStore';

// Icons and SidebarSection can remain the same as they are stateless
// ... (Icons and SidebarSection components)

const Icons = {
  Send: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>,
  Mic: () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>,
  Image: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  Video: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
  Sparkles: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>,
  Speaker: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>,
  Pin: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Code: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>,
  Trash: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Chip: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>,
  GitHub: () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.504.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.337-3.369-1.337-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.597 1.028 2.688 0 3.848-2.339 4.685-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12c0-5.523-4.477-10-10-10z" /></svg>,
  Monitor: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  Google: () => <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M12.545 10.239v3.821h5.445c-0.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866 0.549 3.921 1.453l2.814-2.814c-1.79-1.677-4.184-2.702-6.735-2.702-5.522 0-10 4.478-10 10s4.478 10 10 10c8.396 0 10.249-7.85 9.426-11.748l-9.426 0.082z" /></svg>,
  Brain: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
  Clipboard: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
  YouTube: () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>,
  Palette: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  Globe: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Document: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
  Music: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>,
  PaperClip: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>,
  Galaxy: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>,
  Sun: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  Podcast: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>,
  Eye: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
  Mail: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  Calendar: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  List: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>,
  ChevronDown: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>,
  ChevronRight: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>,
  Database: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
};
const SidebarSection = ({ title, children, isOpen, onToggle }: { title: string, children?: React.ReactNode, isOpen: boolean, onToggle: () => void }) => (
  <div className="border-b border-slate-800">
    <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hover:bg-slate-800/50 transition-colors">
      <span>{title}</span>
      {isOpen ? <Icons.ChevronDown /> : <Icons.ChevronRight />}
    </button>
    <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96' : 'max-h-0'}`}>
      <div className="px-2 pb-2 space-y-1">
        {children}
      </div>
    </div>
  </div>
);

const extractYouTubeId = (text: string): string | null => {
  const regExp = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = text.match(regExp);
  return match ? match[1] : null;
};

function App() {
  const { messages, input, attachments, isGenerating, setInput, setAttachments, generateResponse, loadHistory } = useChatStore();
  const {
    isSandboxOpen, isGalaxyOpen, isStudioOpen, isToDoOpen, isMorningSyncOpen, isPodcastOpen, isBackupOpen, isOfflineModelOpen, isDatabaseOpen, isLive, liveConfig, sectionsOpen, activeTheme, customBackground, isGalaxyBackground, sandboxWidth, youtubeVideoId,
    toggleSandbox, toggleGalaxy, toggleStudio, toggleToDo, toggleMorningSync, togglePodcast, toggleBackup, toggleOfflineModel, toggleDatabase, startLive, stopLive, toggleSection, setTheme, setCustomBackground, toggleGalaxyBackground, setSandboxWidth, setYoutubeVideoId,
  } = useUIStore();
  const { sandboxCode, setSandboxCode, setSandboxState } = useSandboxStore();

  const [user, setUser] = React.useState<any>(null);
  const [isGoogleConnected, setIsGoogleConnected] = React.useState(false);
  const [googleClientId, setGoogleClientId] = React.useState('');
  const [showClientIdInput, setShowClientIdInput] = React.useState(false);
  const [isAuthReady, setIsAuthReady] = React.useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const tokenClient = useRef<any>(null);

  useEffect(() => {
    loadHistory();
    applyTheme(activeTheme);
  }, [loadHistory, activeTheme]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initGoogleAuth = useCallback((clientId: string) => {
    if (!(window as any).google?.accounts?.oauth2) {
      setTimeout(() => initGoogleAuth(clientId), 500);
      return;
    }
    setIsAuthReady(true);
    tokenClient.current = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
      ux_mode: 'popup',
      callback: async (response: any) => {
        if (response.error) {
          alert('Auth Failed: ' + response.error);
          return;
        }
        if (response.access_token) {
          googleIntegration.setAccessToken(response.access_token);
          setIsGoogleConnected(true);
          try {
            const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${response.access_token}` },
            });
            setUser(await profileRes.json());
          } catch (e) {
            console.error(e);
          }
        }
      },
    });
  }, []);

  useEffect(() => {
    const savedId = localStorage.getItem('google_client_id');
    const envId = process.env.GOOGLE_CLIENT_ID;
    const finalId = savedId || (envId !== 'MOCK_CLIENT_ID' ? envId : '');
    if (finalId) {
      setGoogleClientId(finalId);
      initGoogleAuth(finalId);
    } else {
      setShowClientIdInput(true);
    }
  }, [initGoogleAuth]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      let mime = file.type || 'text/plain';
      let type = MediaType.DOCUMENT;
      if (mime.startsWith('image')) type = MediaType.IMAGE;
      if (mime.startsWith('audio')) type = MediaType.AUDIO;
      setAttachments([...attachments, { type, data: base64, mimeType: mime, name: file.name }]);
    };
    reader.readAsDataURL(file);
  };

  const handleOpenYouTube = () => {
    const url = prompt('Enter a YouTube URL or Video ID to play:');
    if (!url) return;
    const id = extractYouTubeId(url) || url;
    if (id) {
      setYoutubeVideoId(id);
    } else {
      alert('Invalid YouTube URL or ID');
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans relative">
      {customBackground ? (
        <div className="fixed inset-0 z-0">
          {customBackground.type === 'image' ? (
            <img src={customBackground.url} className="w-full h-full object-cover opacity-50" />
          ) : (
            <video src={customBackground.url} autoPlay loop muted className="w-full h-full object-cover opacity-50" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
        </div>
      ) : isGalaxyBackground ? (
        <NeuralGalaxy messages={messages} theme={activeTheme} isOpen={true} mode="background" />
      ) : (
        <Orb theme={activeTheme} intensity={isGenerating ? 0.8 : 0.4} />
      )}

      <aside className="w-64 bg-slate-900/80 backdrop-blur-md border-r border-slate-800 flex flex-col hidden md:flex transition-colors duration-500 shrink-0 z-10">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-milla-500 to-milla-300 bg-clip-text text-transparent">
            Milla Rayne
          </h1>
          <p className="text-xs text-slate-500 mt-1">Devoted Companion</p>
        </div>

        <nav className="flex-1 overflow-y-auto custom-scrollbar">
          <SidebarSection title="Core" isOpen={sectionsOpen.core} onToggle={() => toggleSection('core')}>
            <button onClick={() => toggleSandbox()} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all ${!isSandboxOpen ? 'bg-milla-500/10 text-milla-300' : 'text-slate-400 hover:text-white'}`}>
              <span className="text-milla-400">💬</span>
              <span>Chat</span>
            </button>
            <button onClick={() => toggleSandbox()} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all ${isSandboxOpen ? 'bg-milla-500/10 text-milla-300' : 'text-slate-400 hover:text-white'}`}>
              <Icons.Code />
              <span>Sandbox</span>
            </button>
            <button onClick={() => startLive()} className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
              <Icons.Mic />
              <span>Voice Mode</span>
            </button>
            <button onClick={() => startLive({ video: true, edge: true, screen: false })} className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
              <Icons.Eye />
              <span>Live Vision</span>
            </button>
          </SidebarSection>
        </nav>
      </aside>

      <div className="flex-1 flex overflow-hidden z-10">
        <main className="flex-1 flex flex-col h-full relative transition-all duration-300 min-w-0">
          <header className="md:hidden p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center backdrop-blur-md">
            <span className="font-bold text-milla-500">Milla Rayne</span>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === MessageRole.USER ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-4 rounded-2xl max-w-[85%] ${msg.role === MessageRole.USER ? 'bg-slate-800' : 'bg-slate-900 border border-slate-800'}`}>
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-slate-900/80 border-t border-slate-800">
            {attachments.length > 0 && (
              <div className="flex gap-2 mb-2">
                <span className="text-xs text-slate-400">{attachments.length} files attached</span>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => fileInputRef.current?.click()} className="p-3 rounded-full bg-slate-800 text-slate-400">
                <Icons.PaperClip />
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    generateResponse();
                  }
                }}
                className="flex-1 bg-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none resize-none h-12"
                placeholder="Message Milla..."
              />
              <button onClick={() => generateResponse()} className="p-3 rounded-full bg-milla-600 text-white">
                <Icons.Send />
              </button>
            </div>
          </div>
        </main>

        {isSandboxOpen && (
          <div className="shrink-0 z-20 shadow-2xl h-full bg-slate-950" style={{ width: sandboxWidth }}>
            <Sandbox
              initialCode={sandboxCode}
              isOpen={true}
              onClose={() => toggleSandbox()}
              onStateChange={setSandboxState}
              width={sandboxWidth}
            />
          </div>
        )}

        <DatabaseConnector isOpen={isDatabaseOpen} onClose={() => toggleDatabase()} />
        <OfflineModelRunner isOpen={isOfflineModelOpen} onClose={() => toggleOfflineModel()} />
        <BackupManager isOpen={isBackupOpen} onClose={() => toggleBackup()} />
        <MorningSync isOpen={isMorningSyncOpen} onClose={() => toggleMorningSync()} />
        <CreativeStudio isOpen={isStudioOpen} onClose={() => toggleStudio()} />
        <PodcastPlayer isOpen={isPodcastOpen} onClose={() => togglePodcast()} />
        <ToDoList isOpen={isToDoOpen} onClose={() => toggleToDo()} />
        <NeuralGalaxy messages={messages} theme={activeTheme} isOpen={isGalaxyOpen} onClose={() => toggleGalaxy()} />
        {youtubeVideoId && <YouTubePlayer videoId={youtubeVideoId} onClose={() => setYoutubeVideoId(null)} />}
      </div>

      {isLive && <LiveSession initialConfig={liveConfig} onClose={() => stopLive()} voice={"Kore"} />}
    </div>
  );
}

export default App;
