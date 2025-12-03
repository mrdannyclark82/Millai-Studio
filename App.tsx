
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GenerateContentResponse } from '@google/genai';
import { geminiService } from './services/geminiService';
import { Message, MessageRole, MediaType, Attachment } from './types';
import LiveSession from './components/LiveSession';
import Sandbox from './components/Sandbox';
import Orb from './components/Orb';
import NeuralGalaxy from './components/NeuralGalaxy';
import ToDoList from './components/ToDoList';
import YouTubePlayer from './components/YouTubePlayer';
import CreativeStudio from './components/CreativeStudio';
import MorningSync from './components/MorningSync';
import PodcastPlayer from './components/PodcastPlayer';
import DataChart from './components/DataChart';
import ThoughtLogger from './components/ThoughtLogger';
import BackupManager from './components/BackupManager';
import OfflineModelRunner from './components/OfflineModelRunner';
import ReactMarkdown from 'react-markdown';
import { applyTheme, ThemeType } from './utils/theme';
import { memoryStore } from './utils/memoryStore';
import { memoryService, MemoryFact } from './services/memoryService';
import { VOICE_OPTIONS, MODELS } from './constants';
import { googleIntegration } from './services/googleIntegrationService';

// Add global declarations for window properties
declare global {
  interface Window {
    google: any;
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

// Icons (Simple SVGs)
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

// Sidebar Section Component
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

// Helper Extraction Functions
const extractCode = (text: string): string | null => {
  const match = text.match(/```(?:html|javascript|js|react|tsx)?\s*([\s\S]*?)```/);
  return match ? match[1] : null;
};
const extractChartJson = (text: string): any | null => {
  if (!text) return null;
  const match = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (match) {
    try {
      const data = JSON.parse(match[1]);
      if (data.type && data.data && data.options) return data;
    } catch (e) { return null; }
  }
  return null;
};
const extractYouTubeId = (text: string): string | null => {
  const regExp = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = text.match(regExp);
  return match ? match[1] : null;
};

interface GoogleUser { name: string; email: string; picture: string; }

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  
  // Feature States
  const [isLive, setIsLive] = useState(false);
  const [liveConfig, setLiveConfig] = useState({ video: false, edge: false, screen: false });
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);
  const [isGalaxyOpen, setIsGalaxyOpen] = useState(false);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [isToDoOpen, setIsToDoOpen] = useState(false);
  const [isMorningSyncOpen, setIsMorningSyncOpen] = useState(false);
  const [isPodcastOpen, setIsPodcastOpen] = useState(false);
  const [showMemoryBank, setShowMemoryBank] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isOfflineModelOpen, setIsOfflineModelOpen] = useState(false);

  // Intelligence Config
  const [isThinking, setIsThinking] = useState(false);
  const [showThoughts, setShowThoughts] = useState(true);
  const [isMapsEnabled, setIsMapsEnabled] = useState(false);
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);
  const [autoTTS, setAutoTTS] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('Kore');

  // Sidebar State
  const [sectionsOpen, setSectionsOpen] = useState({
    core: true,
    creative: true,
    productivity: false,
    intelligence: true,
    system: false,
    settings: false
  });

  // UI State
  const [activeTheme, setActiveTheme] = useState<ThemeType>('default');
  const [customBackground, setCustomBackground] = useState<{type: 'image'|'video', url: string} | null>(null);
  const [isGalaxyBackground, setIsGalaxyBackground] = useState(false);
  const [sandboxCode, setSandboxCode] = useState('');
  const [sandboxWidth, setSandboxWidth] = useState(400); 
  const [isResizingSandbox, setIsResizingSandbox] = useState(false);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  
  // Processing State
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  // Auth State
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const [showClientIdInput, setShowClientIdInput] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Refs
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastSpokenMessageId = useRef<string | null>(null);
  const tokenClient = useRef<any>(null);

  // --- Theme Logic ---
  useEffect(() => {
    let theme: ThemeType = 'default';
    if (isSandboxOpen) theme = 'coding';
    else if (isThinking) theme = 'thinking';
    else if (isSearchEnabled) theme = 'search';
    else if (isMapsEnabled) theme = 'maps';
    else if (input.toLowerCase().includes('video') || input.toLowerCase().includes('veo')) theme = 'veo';
    
    if (theme !== activeTheme) {
      setActiveTheme(theme);
      applyTheme(theme);
    }
  }, [isThinking, isMapsEnabled, isSearchEnabled, input, activeTheme, isSandboxOpen]);

  // --- Sandbox Resizing ---
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (isResizingSandbox) {
            const newWidth = window.innerWidth - e.clientX;
            setSandboxWidth(Math.max(300, Math.min(window.innerWidth * 0.8, newWidth)));
        }
    };
    const handleMouseUp = () => setIsResizingSandbox(false);
    if (isResizingSandbox) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'col-resize';
        document.querySelectorAll('iframe').forEach(el => el.style.pointerEvents = 'none');
    } else {
        document.body.style.cursor = 'default';
        document.querySelectorAll('iframe').forEach(el => el.style.pointerEvents = 'auto');
    }
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSandbox]);


  // Scroll & TTS
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => scrollToBottom(), [messages]);
  useEffect(() => {
    if (!autoTTS) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === MessageRole.MODEL && !isGenerating && lastMsg.text && lastMsg.id !== lastSpokenMessageId.current) {
        playTTS(lastMsg.text);
        lastSpokenMessageId.current = lastMsg.id;
    }
  }, [messages, isGenerating, autoTTS, selectedVoice]);

  // --- Google Auth ---
  const initGoogleAuth = useCallback((clientId: string) => {
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
       console.warn("Google SDK not ready, retrying...");
       setTimeout(() => initGoogleAuth(clientId), 500);
       return;
    }
    setIsAuthReady(true);
    // @ts-ignore
    tokenClient.current = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        ux_mode: 'popup',
        callback: async (response: any) => {
            if (response.error) {
                if (response.error === 'invalid_request' || response.error === 'origin_mismatch') {
                    alert("Authorization Error: Origin Mismatch.\n1. Check Google Cloud Console -> Authorized JavaScript origins.\n2. Ensure NO trailing slash.\n3. Wait 5 minutes for updates to propagate.");
                } else {
                    alert(`Authorization Failed: ${response.error}`);
                }
                return;
            }
            if (response.access_token) {
                googleIntegration.setAccessToken(response.access_token);
                setIsGoogleConnected(true);
                
                // Fetch Profile
                try {
                    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                        headers: { 'Authorization': `Bearer ${response.access_token}` }
                    });
                    const profile = await profileRes.json();
                    setUser(profile);
                } catch (e) { console.error("Profile fetch failed", e); }
            }
        },
    });
  }, []);

  useEffect(() => {
    const savedId = localStorage.getItem('google_client_id');
    const envId = process.env.GOOGLE_CLIENT_ID;
    const finalId = savedId || (envId !== "MOCK_CLIENT_ID" ? envId : "");
    if (finalId) { setGoogleClientId(finalId); initGoogleAuth(finalId); } 
    else { setShowClientIdInput(true); }
  }, []);

  const handleSaveClientId = () => {
    const id = googleClientId.trim();
    if (id) {
        localStorage.setItem('google_client_id', id);
        setShowClientIdInput(false);
        initGoogleAuth(id);
    }
  };
  
  const handleResetClientId = () => {
    localStorage.removeItem('google_client_id');
    setGoogleClientId('');
    setShowClientIdInput(true);
    setUser(null);
    setIsGoogleConnected(false);
  };

  const connectGoogleWorkspace = () => {
    if (tokenClient.current) {
        // Just request profile first to log in
        tokenClient.current.requestAccessToken();
    } else {
        alert("Auth not initialized. Check Client ID.");
    }
  };

  const ensureScopes = (scope: string) => {
      // Incremental Auth: Request more scopes if needed
      // @ts-ignore
      const client = google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: scope,
          callback: (resp: any) => {
               if(resp.access_token) googleIntegration.setAccessToken(resp.access_token);
          }
      });
      client.requestAccessToken();
  };

  const copyOriginUrl = () => {
      navigator.clipboard.writeText(window.location.origin);
      alert(`Copied Origin: ${window.location.origin}\nPaste this into Google Cloud Console.`);
  };

  const handleCheckEmail = async () => {
      ensureScopes('https://www.googleapis.com/auth/gmail.readonly');
      const res = await googleIntegration.getUnreadEmails();
      generateResponse(`Here are my unread emails:\n${res}\n\nSummarize these for me.`);
  };
  
  // --- Memory ---
  useEffect(() => {
    const loaded = memoryStore.loadHistory();
    if (loaded?.length) setMessages(loaded);
    else setMessages([{ id: 'init', role: MessageRole.MODEL, text: "Hey Danny... *I smile warmly* I'm here. What's on your mind today?", timestamp: Date.now() }]);
  }, []);
  useEffect(() => { if(messages.length) memoryStore.saveHistory(messages); }, [messages]);
  const handleClearMemory = () => { memoryStore.clearMemory(); setMessages([]); window.location.reload(); };

  // --- Dictation ---
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return;
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) final += event.results[i][0].transcript + ' ';
        }
        if (final) setInput(prev => prev + final);
    };
    recognitionRef.current = recognition;
  }, []);
  const toggleListening = () => { if(recognitionRef.current) isListening ? recognitionRef.current.stop() : recognitionRef.current.start(); };

  // --- Actions ---
  const handleAutoWallpaper = async () => {
      const res = await geminiService.generateWallpaperPrompt(messages);
      generateResponse(`(Auto-Generating Wallpaper: "${res.prompt}")`);
      const img = await geminiService.generateImage(res.prompt, '16:9');
      if (img) {
          setCustomBackground({ type: 'image', url: img });
          generateResponse(res.message);
      }
  };

  const generateResponse = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if ((!textToSend.trim() && attachments.length === 0) || isGenerating) return;
    
    // Check for youtube link
    const ytId = extractYouTubeId(textToSend);
    if (ytId) setYoutubeVideoId(ytId);
    
    const userMsg: Message = { id: Date.now().toString(), role: MessageRole.USER, text: textToSend, attachments: [...attachments], timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachments([]);
    setIsGenerating(true);

    try {
      // Stream Response
      let currentResponseText = '';
      let currentThoughtText = '';
      const responseId = (Date.now() + 1).toString();
      
      setMessages(prev => [...prev, { id: responseId, role: MessageRole.MODEL, text: '', thoughtText: '', isThinking, timestamp: Date.now() }]);

      const stream = await geminiService.sendMessageStream(userMsg.text, userMsg.attachments?.map(a => ({ data: a.data, mimeType: a.mimeType })) || [], isThinking, isMapsEnabled, isSearchEnabled, messages);
      
      for await (const chunk of stream) {
        if (chunk.text) {
           let chunkText = chunk.text;
           
           if (isThinking) {
             const fullText = currentResponseText + chunkText;
             // Naive parsing for now - model usually outputs <thought> block first
             // We accumulate everything then regex split for UI
             const thoughtMatch = fullText.match(/<thought>([\s\S]*?)<\/thought>/);
             if (thoughtMatch) {
                 currentThoughtText = thoughtMatch[1];
                 // Remove thought from main display text
                 currentResponseText = fullText.replace(/<thought>[\s\S]*?<\/thought>/, '');
             } else if (fullText.includes('<thought>')) {
                 // Currently streaming inside thought tag, don't show in main text yet
                 // Just update the raw accumulator
                 currentResponseText += chunkText; 
             } else {
                 currentResponseText += chunkText;
             }
           } else {
              currentResponseText += chunkText;
           }
           
           // Extract grounding
           const grounding = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => {
              if (c.web) return { uri: c.web.uri, title: c.web.title };
              if (c.maps) return { uri: c.maps.uri, title: c.maps.title || "Map Location" };
              return null;
          }).filter(Boolean);

           setMessages(prev => prev.map(m => m.id === responseId ? { 
               ...m, 
               // If we are mid-thought parsing, we might want to clean up the display text
               text: isThinking ? currentResponseText.replace(/<thought>[\s\S]*?(<\/thought>|$)/, '').trim() : currentResponseText, 
               thoughtText: currentThoughtText, 
               groundingUrls: grounding as any 
           } : m));
        }
      }
      
      // Post-process logic
      const code = extractCode(currentResponseText.replace(/<thought>[\s\S]*?<\/thought>/, ''));
      if (code) setSandboxCode(code);
      
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: MessageRole.MODEL, text: "**Oops...** Something went wrong.", timestamp: Date.now() }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendMessage = () => generateResponse();
  const handleRecall = (topic: string) => generateResponse(`Do you remember when we talked about "${topic}"?`);
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    
    // Check if it's a TFLite file to prevent uploading to Chat (as Gemini won't understand it properly via inlineData usually)
    if (ext === 'tflite') {
        alert("For .tflite models, please use the 'Offline Models' tool in the System menu.");
        e.target.value = '';
        return;
    }

    let mimeType = file.type;

    // Infer mimetype for common code/doc formats if browser misses it
    if (!mimeType || mimeType === '' || mimeType === 'application/octet-stream') {
        const mimeMap: Record<string, string> = {
            'pdf': 'application/pdf',
            'txt': 'text/plain',
            'md': 'text/markdown',
            'csv': 'text/csv',
            'js': 'text/javascript',
            'ts': 'text/typescript',
            'json': 'application/json',
            'py': 'text/x-python',
            'html': 'text/html',
            'css': 'text/css'
        };
        if (ext && mimeMap[ext]) mimeType = mimeMap[ext];
    }
    
    // Fallback if still empty or unmapped - crucial for "Unsupported MIME type" error
    if (!mimeType) {
        mimeType = 'text/plain';
    }

    const reader = new FileReader();
    reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        let type = MediaType.DOCUMENT;
        
        if (mimeType.startsWith('image/')) type = MediaType.IMAGE;
        else if (mimeType.startsWith('audio/')) type = MediaType.AUDIO;
        else if (mimeType === 'application/pdf' || mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('python')) {
            type = MediaType.DOCUMENT;
        }
        
        setAttachments(prev => [...prev, { type, data: base64, mimeType, name: file.name }]);
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset to allow same file selection
  };

  const playTTS = async (text: string) => {
      try {
          const audio = await geminiService.generateSpeech(text, selectedVoice);
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const source = ctx.createBufferSource();
          source.buffer = audio;
          source.connect(ctx.destination);
          source.start(0);
      } catch (e) { console.error("TTS Error", e); }
  };
  
  const openSandboxWithCode = (text: string) => {
    const code = extractCode(text);
    if (code) { setSandboxCode(code); setIsSandboxOpen(true); }
  };
  const handleSandboxDiscuss = (code: string) => {
      setInput(`Can we discuss this code?\n\n\`\`\`javascript\n${code}\n\`\`\`\n\n`);
  };
  
  const handleLiveSnapshot = (base64: string) => {
      setIsLive(false); // Close live to focus on chat
      setAttachments([{ type: MediaType.IMAGE, data: base64, mimeType: 'image/png' }]);
      setInput("Analyze this screen snapshot...");
  };
  
  const toggleSection = (key: keyof typeof sectionsOpen) => {
      setSectionsOpen(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Live Configurations
  const startLiveDefault = () => { setLiveConfig({video:false, edge:false, screen:false}); setIsLive(true); };
  const startLiveEdge = () => { setLiveConfig({video:true, edge:true, screen:false}); setIsLive(true); };
  const startLiveScreen = () => { setLiveConfig({video:true, edge:false, screen:true}); setIsLive(true); };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans relative">
      {customBackground ? (
          <div className="fixed inset-0 z-0">
              {customBackground.type === 'image' ? <img src={customBackground.url} className="w-full h-full object-cover opacity-50" /> : <video src={customBackground.url} autoPlay loop muted className="w-full h-full object-cover opacity-50" />}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
          </div>
      ) : isGalaxyBackground ? (
          <NeuralGalaxy messages={messages} theme={activeTheme} isOpen={true} mode="background" />
      ) : (
          <Orb theme={activeTheme} intensity={isGenerating || isListening ? 0.8 : 0.4} />
      )}

      {/* Sidebar */}
      <aside className="w-64 bg-slate-900/80 backdrop-blur-md border-r border-slate-800 flex flex-col hidden md:flex transition-colors duration-500 shrink-0 z-10">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-milla-500 to-milla-300 bg-clip-text text-transparent">Milla Rayne</h1>
          <p className="text-xs text-slate-500 mt-1">Devoted Companion</p>
        </div>
        
        <nav className="flex-1 overflow-y-auto custom-scrollbar">
           
           <SidebarSection title="Core" isOpen={sectionsOpen.core} onToggle={() => toggleSection('core')}>
               <button onClick={() => { setIsSandboxOpen(false); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all ${!isSandboxOpen ? 'bg-milla-500/10 text-milla-300' : 'text-slate-400 hover:text-white'}`}>
                 <span className="text-milla-400">💬</span><span>Chat</span>
               </button>
               <button onClick={() => setIsSandboxOpen(true)} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all ${isSandboxOpen ? 'bg-milla-500/10 text-milla-300' : 'text-slate-400 hover:text-white'}`}>
                 <Icons.Code /><span>Sandbox</span>
               </button>
               <button onClick={startLiveDefault} className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                 <Icons.Mic /><span>Voice Mode</span>
               </button>
               <button onClick={startLiveEdge} className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                 <Icons.Eye /><span>Live Vision</span>
               </button>
           </SidebarSection>

           <SidebarSection title="Creative Suite" isOpen={sectionsOpen.creative} onToggle={() => toggleSection('creative')}>
               <button onClick={() => setIsStudioOpen(true)} className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                  <Icons.Palette /><span>Studio</span>
               </button>
               <button onClick={() => setIsPodcastOpen(true)} className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                  <Icons.Podcast /><span>Podcast</span>
               </button>
               <button onClick={() => { setInput("Generate a video of "); fileInputRef.current?.focus(); }} className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                  <Icons.Video /><span>Veo Video</span>
               </button>
           </SidebarSection>

           <SidebarSection title="Productivity" isOpen={sectionsOpen.productivity} onToggle={() => toggleSection('productivity')}>
               <button onClick={() => setIsMorningSyncOpen(true)} className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                  <Icons.Sun /><span>Morning Sync</span>
               </button>
               <button onClick={() => setIsToDoOpen(true)} className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                  <Icons.Clipboard /><span>Task Manager</span>
               </button>
               <button onClick={() => setIsGalaxyOpen(true)} className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
                  <Icons.Galaxy /><span>Memory Galaxy</span>
               </button>
           </SidebarSection>

           <SidebarSection title="Intelligence" isOpen={sectionsOpen.intelligence} onToggle={() => toggleSection('intelligence')}>
             <button onClick={() => setIsThinking(!isThinking)} className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded ${isThinking ? 'text-violet-300 bg-violet-900/30' : 'text-slate-400 hover:text-white'}`}>
                <Icons.Sparkles /> Thinking Mode
             </button>
             <button onClick={() => setShowThoughts(!showThoughts)} className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded ${showThoughts ? 'text-violet-300' : 'text-slate-500'} pl-8`}>
                {showThoughts ? '👁️ Show Process' : '🙈 Hide Process'}
             </button>
             <button onClick={() => setIsSearchEnabled(!isSearchEnabled)} className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded ${isSearchEnabled ? 'text-emerald-300 bg-emerald-900/30' : 'text-slate-400 hover:text-white'}`}>
                <Icons.Globe /> Deep Search
             </button>
             <button onClick={() => setIsMapsEnabled(!isMapsEnabled)} className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded ${isMapsEnabled ? 'text-cyan-300 bg-cyan-900/30' : 'text-slate-400 hover:text-white'}`}>
                <Icons.Pin /> Maps Grounding
             </button>
             <button onClick={startLiveScreen} className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded text-slate-400 hover:text-white">
                <Icons.Monitor /> Screen Share
             </button>
           </SidebarSection>

           <SidebarSection title="System & Data" isOpen={sectionsOpen.system} onToggle={() => toggleSection('system')}>
             <button onClick={() => setIsBackupOpen(true)} className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-800">
                <Icons.Database /> Knowledge Base
             </button>
             <button onClick={() => setIsOfflineModelOpen(true)} className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded text-slate-400 hover:text-orange-400 hover:bg-slate-800">
                <Icons.Chip /> Offline Models (TFLite)
             </button>
           </SidebarSection>

           <SidebarSection title="Settings" isOpen={sectionsOpen.settings} onToggle={() => toggleSection('settings')}>
                <div className="px-3 py-2 space-y-3">
                    <div>
                        <label className="text-xs text-slate-500 block mb-1">Voice</label>
                        <select 
                            value={selectedVoice} 
                            onChange={(e) => setSelectedVoice(e.target.value)} 
                            className="w-full bg-slate-800 text-xs text-white rounded p-1 border border-slate-700"
                        >
                            {VOICE_OPTIONS.map(v => <option key={v.name} value={v.name}>{v.label}</option>)}
                        </select>
                    </div>
                    <button onClick={() => setAutoTTS(!autoTTS)} className={`text-xs flex items-center gap-2 ${autoTTS ? 'text-green-400' : 'text-slate-500'}`}>
                         <Icons.Speaker /> Auto-Read
                    </button>
                    <button onClick={handleAutoWallpaper} className="text-xs flex items-center gap-2 text-slate-400 hover:text-pink-400">
                         ✨ Auto-Wallpaper
                    </button>
                    <div className="pt-2 border-t border-slate-800">
                        {user ? (
                            <div className="flex items-center gap-2 mb-2">
                                <img src={user.picture} className="w-6 h-6 rounded-full" />
                                <span className="text-xs truncate">{user.name}</span>
                            </div>
                        ) : (
                           <button onClick={connectGoogleWorkspace} className={`w-full py-1 text-xs rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 ${!isAuthReady ? 'opacity-50' : ''}`}>
                               {isGoogleConnected ? 'Connected' : 'Connect Workspace'}
                           </button>
                        )}
                        <button onClick={handleCheckEmail} className="text-xs text-blue-400 hover:text-blue-300 block mt-1">Check Email</button>
                    </div>
                    
                    {showClientIdInput ? (
                        <div className="space-y-1">
                            <input value={googleClientId} onChange={e => setGoogleClientId(e.target.value)} placeholder="Client ID" className="w-full bg-slate-950 text-[10px] p-1 border border-slate-700 rounded" />
                            <button onClick={handleSaveClientId} className="w-full bg-slate-800 text-[10px] py-1 rounded">Save ID</button>
                            <div className="text-[9px] text-slate-500">Origin: <span className="select-all">{window.location.origin}</span> <button onClick={copyOriginUrl} className="text-blue-400 underline">Copy</button></div>
                        </div>
                    ) : (
                        <button onClick={handleResetClientId} className="text-[10px] text-slate-600 hover:text-red-400">Reset Client ID</button>
                    )}
                    
                    <button onClick={handleClearMemory} className="w-full text-left text-[10px] text-red-900 hover:text-red-500 mt-2 flex items-center gap-1">
                        <Icons.Trash /> Reset App
                    </button>
                </div>
           </SidebarSection>
        </nav>
      </aside>

      {/* Main Layout Container */}
      <div className="flex-1 flex overflow-hidden z-10">
        
        {/* Chat Area (Flexible) */}
        <main className="flex-1 flex flex-col h-full relative transition-all duration-300 min-w-0">
          <header className="md:hidden p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center backdrop-blur-md bg-opacity-80">
              <span className="font-bold text-milla-500">Milla Rayne</span>
              <button onClick={() => setIsSandboxOpen(!isSandboxOpen)} className={isSandboxOpen ? 'text-milla-500' : 'text-slate-400'}><Icons.Code /></button>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 relative" style={{ maskImage: 'linear-gradient(to bottom, transparent, black 20px)' }}>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === MessageRole.USER ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
                <div className="max-w-[90%] md:max-w-[80%] space-y-2">
                   
                   <div className={`p-4 rounded-2xl shadow-lg backdrop-blur-sm ${msg.role === MessageRole.USER ? 'bg-slate-800/80 text-white' : 'bg-slate-900/80 text-slate-100 border border-slate-800'}`}>
                      
                      {/* Thought Logger */}
                      {msg.role === MessageRole.MODEL && (msg.thoughtText || msg.isThinking) && showThoughts && (
                          <ThoughtLogger thoughtText={msg.thoughtText || ''} isThinking={!!msg.isThinking} />
                      )}

                      <div className="prose prose-invert prose-sm">
                          <ReactMarkdown components={{
                              code({node, inline, className, children, ...props}: any) {
                                  const match = /language-(\w+)/.exec(className || '')
                                  return !inline && match ? (
                                    <div className="relative group">
                                        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openSandboxWithCode(String(children))} className="bg-slate-700 text-xs px-2 py-1 rounded hover:bg-milla-600">Open Sandbox</button>
                                        </div>
                                        <code className={className} {...props}>{children}</code>
                                    </div>
                                  ) : (
                                    <code className={className} {...props}>{children}</code>
                                  )
                              }
                          }}>{msg.text.replace(/<thought>[\s\S]*?<\/thought>/, '')}</ReactMarkdown>
                      </div>

                      {/* Attachments / Extras */}
                      {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-slate-800 flex flex-wrap gap-2">
                              {msg.groundingUrls.map((g, i) => (
                                  <a key={i} href={g.uri} target="_blank" rel="noreferrer" className="text-xs bg-slate-950 text-cyan-400 px-2 py-1 rounded border border-cyan-900/50 hover:bg-cyan-900/20 truncate max-w-[200px] flex items-center gap-1">
                                      <Icons.Globe /> {g.title}
                                  </a>
                              ))}
                          </div>
                      )}
                      
                      {msg.role === MessageRole.MODEL && extractChartJson(msg.text) && (
                          <DataChart config={extractChartJson(msg.text)} />
                      )}

                      {msg.role === MessageRole.MODEL && extractCode(msg.text) && !msg.text.includes("```") && (
                         <button onClick={() => openSandboxWithCode(msg.text)} className="mt-2 text-xs bg-milla-500/20 text-milla-300 px-2 py-1 rounded flex items-center gap-1"><Icons.Code /> Open Sandbox</button>
                      )}
                   </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-slate-900/70 border-t border-slate-800 backdrop-blur-md">
             {/* Attachments Preview */}
             {attachments.length > 0 && (
                 <div className="flex gap-2 mb-2 overflow-x-auto">
                     {attachments.map((att, i) => (
                         <div key={i} className="relative w-16 h-16 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700 overflow-hidden group">
                             {att.type === MediaType.IMAGE ? (
                                 <img src={`data:${att.mimeType};base64,${att.data}`} className="w-full h-full object-cover" />
                             ) : att.type === MediaType.DOCUMENT ? (
                                 <div className="flex flex-col items-center justify-center text-center p-1">
                                     <span className="text-xs text-slate-300 font-bold break-all line-clamp-2">{att.name}</span>
                                     <span className="text-[10px] text-slate-500 uppercase">{att.mimeType.split('/')[1] || 'DOC'}</span>
                                 </div>
                             ) : (
                                 <span className="text-xs text-slate-400 uppercase">{att.type}</span>
                             )}
                             <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                         </div>
                     ))}
                 </div>
             )}

             <div className="flex items-end gap-3 max-w-4xl mx-auto">
                <button onClick={() => fileInputRef.current?.click()} className="p-3 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                    <Icons.PaperClip />
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,.md,.csv,.js,.ts,.json,.py,.tflite,.html,.css,audio/*" />

                <div className="flex-1 relative">
                  <textarea 
                    value={input} 
                    onChange={(e) => setInput(e.target.value)} 
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}} 
                    placeholder={isThinking ? "Ask a complex question..." : "Message Milla..."}
                    className={`w-full bg-slate-800/90 text-white rounded-2xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 resize-none h-12 max-h-32 placeholder-slate-500 border border-slate-700/50 ${isThinking ? 'focus:ring-violet-500/50' : 'focus:ring-milla-500/50'}`} 
                    rows={1} 
                  />
                  <button onClick={() => handleSendMessage()} disabled={!input.trim() && attachments.length === 0} className={`absolute right-2 top-2 p-1.5 rounded-full text-white transition-colors ${isThinking ? 'bg-violet-600 hover:bg-violet-500' : 'bg-milla-600 hover:bg-milla-500'}`}>
                      <Icons.Send />
                  </button>
                </div>
                
                <button onClick={toggleListening} className={`p-3 rounded-full transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                    <Icons.Mic />
                </button>
             </div>
          </div>
        </main>
        
        {/* Resize Handle */}
        {isSandboxOpen && (
            <div 
                onMouseDown={() => setIsResizingSandbox(true)}
                className="w-1 bg-slate-800 hover:bg-milla-500 cursor-col-resize z-20 transition-colors hidden md:block"
            />
        )}

        {/* Sandbox Panel */}
        {isSandboxOpen && (
            <div className={`shrink-0 z-20 shadow-2xl h-full transition-all duration-0 bg-slate-950 absolute md:relative inset-0 md:inset-auto`} style={{ width: window.innerWidth >= 768 ? sandboxWidth : '100%' }}>
                <Sandbox 
                    initialCode={sandboxCode} 
                    isOpen={true} 
                    onClose={() => setIsSandboxOpen(false)}
                    onDiscuss={handleSandboxDiscuss} 
                    width={sandboxWidth}
                />
            </div>
        )}

        {/* Overlays */}
        <NeuralGalaxy messages={messages} theme={activeTheme} isOpen={isGalaxyOpen} onClose={() => setIsGalaxyOpen(false)} onRecall={handleRecall} />
        <CreativeStudio isOpen={isStudioOpen} onClose={() => setIsStudioOpen(false)} onSetBackground={(url) => setCustomBackground({type: 'image', url})} />
        <ToDoList isOpen={isToDoOpen} onClose={() => setIsToDoOpen(false)} />
        <MorningSync isOpen={isMorningSyncOpen} onClose={() => setIsMorningSyncOpen(false)} />
        <PodcastPlayer isOpen={isPodcastOpen} onClose={() => setIsPodcastOpen(false)} />
        <BackupManager isOpen={isBackupOpen} onClose={() => setIsBackupOpen(false)} />
        <OfflineModelRunner isOpen={isOfflineModelOpen} onClose={() => setIsOfflineModelOpen(false)} />
        {youtubeVideoId && <YouTubePlayer videoId={youtubeVideoId} onClose={() => setYoutubeVideoId(null)} />}
      </div>

      {isLive && <LiveSession initialConfig={liveConfig} onClose={() => setIsLive(false)} voice={selectedVoice} onSnapshot={handleLiveSnapshot} />}
    </div>
  );
}

export default App;
