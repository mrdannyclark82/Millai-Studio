

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
import ReactMarkdown from 'react-markdown';
import { applyTheme, ThemeType } from './utils/theme';
import { memoryStore } from './utils/memoryStore';
import { memoryService, MemoryFact } from './services/memoryService';
import { VOICE_OPTIONS, MODELS } from './constants';
import { googleIntegration } from './services/googleIntegrationService';

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
  List: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
};

// Helper to extract code blocks
const extractCode = (text: string): string | null => {
  const match = text.match(/```(?:html|javascript|js|react|tsx)?\s*([\s\S]*?)```/);
  return match ? match[1] : null;
};

// Helper to extract chart json
const extractChartJson = (text: string): any | null => {
  if (!text) return null;
  const match = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (match) {
    try {
      const data = JSON.parse(match[1]);
      if (data.type && data.data && data.options) return data;
    } catch (e) {
      return null;
    }
  }
  return null;
};

// Helper to extract YouTube ID
const extractYouTubeId = (text: string): string | null => {
  const regExp = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = text.match(regExp);
  return match ? match[1] : null;
};

// Simple User Type
interface GoogleUser {
  name: string;
  email: string;
  picture: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [liveConfig, setLiveConfig] = useState({ video: false, edge: false, screen: false });
  const [isThinking, setIsThinking] = useState(false);
  const [showThoughts, setShowThoughts] = useState(true);
  const [isMapsEnabled, setIsMapsEnabled] = useState(false);
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [autoTTS, setAutoTTS] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const lastSpokenMessageId = useRef<string | null>(null);

  const [activeTheme, setActiveTheme] = useState<ThemeType>('default');
  const [customBackground, setCustomBackground] = useState<{type: 'image'|'video', url: string} | null>(null);
  const [isGalaxyBackground, setIsGalaxyBackground] = useState(false);

  const [isSandboxOpen, setIsSandboxOpen] = useState(false);
  const [sandboxCode, setSandboxCode] = useState('');

  const [isGalaxyOpen, setIsGalaxyOpen] = useState(false);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [isToDoOpen, setIsToDoOpen] = useState(false);
  const [showMemoryBank, setShowMemoryBank] = useState(false);
  const [coreFacts, setCoreFacts] = useState<MemoryFact[]>([]);
  
  const [isMorningSyncOpen, setIsMorningSyncOpen] = useState(false);
  const [isPodcastOpen, setIsPodcastOpen] = useState(false);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);

  // Auth State
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('');
  const [showClientIdInput, setShowClientIdInput] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const tokenClient = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate Theme
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
      if (showMemoryBank) {
          setCoreFacts(memoryService.loadFacts());
      }
  }, [showMemoryBank]);

  useEffect(() => {
    if (!autoTTS) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === MessageRole.MODEL && !isGenerating && lastMsg.text && lastMsg.id !== lastSpokenMessageId.current) {
        playTTS(lastMsg.text);
        lastSpokenMessageId.current = lastMsg.id;
    }
  }, [messages, isGenerating, autoTTS, selectedVoice]);


  // --- GOOGLE AUTH: UNIFIED INCREMENTAL FLOW ---
  const initGoogleAuth = useCallback((clientId: string) => {
    // @ts-ignore
    if (typeof google === 'undefined' || !google.accounts) {
        setTimeout(() => initGoogleAuth(clientId), 500);
        return;
    }

    try {
        // Init Client: Start with Basic Scope Only to avoid blocks
        // We will request more scopes later if needed (incremental auth)
        // @ts-ignore
        tokenClient.current = google.accounts.oauth2.initTokenClient({
            client_id: clientId.trim(),
            scope: 'email profile openid', // Start safe
            callback: async (response: any) => {
                if (response.error) {
                    console.error("Auth Error:", response);
                    alert(`Login Failed: ${response.error}\nIf "invalid_request", check Origin URL in GCP.`);
                    return;
                }
                
                if (response.access_token) {
                    googleIntegration.setAccessToken(response.access_token);
                    setIsGoogleConnected(true);
                    
                    try {
                        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                            headers: { Authorization: `Bearer ${response.access_token}` }
                        });
                        const profile = await userInfoRes.json();
                        setUser({
                            name: profile.name,
                            email: profile.email,
                            picture: profile.picture
                        });
                    } catch (e) {
                        console.error("Profile Fetch Error", e);
                    }
                }
            },
        });
        setIsAuthReady(true);
    } catch (e) {
        console.error("GSI Init Error", e);
    }
  }, []);

  useEffect(() => {
    const savedId = localStorage.getItem('google_client_id');
    const envId = process.env.GOOGLE_CLIENT_ID;
    const finalId = savedId || (envId !== "MOCK_CLIENT_ID" ? envId : "");
    
    if (finalId) {
        setGoogleClientId(finalId);
        initGoogleAuth(finalId);
    } else {
        setShowClientIdInput(true);
    }
  }, [initGoogleAuth]);

  const handleSaveClientId = () => {
      if(googleClientId) {
          const trimmed = googleClientId.trim();
          localStorage.setItem('google_client_id', trimmed);
          setGoogleClientId(trimmed);
          initGoogleAuth(trimmed);
          setShowClientIdInput(false);
      }
  };
  
  const handleResetClientId = () => {
      localStorage.removeItem('google_client_id');
      setGoogleClientId('');
      setUser(null);
      setIsGoogleConnected(false);
      setShowClientIdInput(true);
  };

  const connectGoogleWorkspace = () => {
      if (tokenClient.current) {
          // Just login first - no aggressive consent prompt
          tokenClient.current.requestAccessToken(); 
      } else {
          if (googleClientId) {
              initGoogleAuth(googleClientId);
              alert("Initializing... Try again in a second.");
          } else {
              setShowClientIdInput(true);
          }
      }
  };

  // Helper to upgrade scopes if needed
  const ensureScopes = (requiredScopes: string) => {
      if (!tokenClient.current) return;
      // Re-init or Overwrite callback? GIS is tricky.
      // Easiest: Just request token with new scopes. GIS handles the merge.
      // @ts-ignore
      tokenClient.current.requestAccessToken({
          scope: `email profile openid ${requiredScopes}`,
          // prompt: 'consent' // Optional: Only use if strictly needed
      });
  };

  const copyOriginUrl = () => {
      const origin = window.location.origin;
      navigator.clipboard.writeText(origin);
      alert(`Copied: ${origin}\nPaste this exactly in GCP "Authorized JavaScript origins".`);
  };

  // Integration Actions
  const handleCheckEmail = async () => {
      if (!isGoogleConnected) return connectGoogleWorkspace();
      
      // Attempt fetch. If fails (401/403), ask for scope.
      const res = await googleIntegration.getUnreadEmails();
      if (res.includes("Access Token required") || res.includes("Error")) {
          // Trigger upgrade
          if (confirm("Milla needs permission to access Gmail. Allow access?")) {
              ensureScopes('https://www.googleapis.com/auth/gmail.readonly');
              return; 
          }
      }
      
      setIsGenerating(true);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: MessageRole.MODEL, text: "*Checking your inbox...*", timestamp: Date.now() }]);
      
      const emailSummary = await googleIntegration.getUnreadEmails();
      
      // If still error after upgrade attempt
      if (emailSummary.includes("Error")) {
           setMessages(prev => {
              const newArr = [...prev];
              newArr.pop(); 
              return [...newArr, { id: Date.now().toString(), role: MessageRole.MODEL, text: "I couldn't access your emails. Please make sure you granted permission in the popup.", timestamp: Date.now() }];
          });
          setIsGenerating(false);
          return;
      }

      const response = await geminiService.sendMessageStream(
          `Here are my unread emails:\n${emailSummary}\n\nSummarize them briefly.`,
          [], false, false, false, messages
      );
      
      let text = '';
      for await (const chunk of response) text += chunk.text;
      
      setMessages(prev => {
          const newArr = [...prev];
          newArr.pop(); 
          return [...newArr, { id: Date.now().toString(), role: MessageRole.MODEL, text: text, timestamp: Date.now() }];
      });
      setIsGenerating(false);
  };

  const handleCheckCalendar = async () => {
      if (!isGoogleConnected) return connectGoogleWorkspace();
      
      const res = await googleIntegration.listUpcomingEvents();
      if (res.includes("Access Token required") || res.includes("Error")) {
          if (confirm("Milla needs permission to access Calendar. Allow access?")) {
              ensureScopes('https://www.googleapis.com/auth/calendar');
              return;
          }
      }

      setIsGenerating(true);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: MessageRole.MODEL, text: "*Checking your schedule...*", timestamp: Date.now() }]);
      
      const events = await googleIntegration.listUpcomingEvents();
      const response = await geminiService.sendMessageStream(
          `Here is my calendar:\n${events}\n\nWhat's coming up?`,
          [], false, false, false, messages
      );

      let text = '';
      for await (const chunk of response) text += chunk.text;
      
      setMessages(prev => {
          const newArr = [...prev];
          newArr.pop(); 
          return [...newArr, { id: Date.now().toString(), role: MessageRole.MODEL, text: text, timestamp: Date.now() }];
      });
      setIsGenerating(false);
  };

   const handleCheckTasks = async () => {
      if (!isGoogleConnected) return connectGoogleWorkspace();

      const res = await googleIntegration.listTasks();
      if (res.includes("Error")) {
          if (confirm("Milla needs permission to access Tasks. Allow access?")) {
              ensureScopes('https://www.googleapis.com/auth/tasks');
              return;
          }
      }

      setIsGenerating(true);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: MessageRole.MODEL, text: "*Checking your tasks...*", timestamp: Date.now() }]);
      
      const tasks = await googleIntegration.listTasks();
      const response = await geminiService.sendMessageStream(
          `Here are my tasks:\n${tasks}\n\nReview them.`,
          [], false, false, false, messages
      );

      let text = '';
      for await (const chunk of response) text += chunk.text;
      
      setMessages(prev => {
          const newArr = [...prev];
          newArr.pop(); 
          return [...newArr, { id: Date.now().toString(), role: MessageRole.MODEL, text: text, timestamp: Date.now() }];
      });
      setIsGenerating(false);
  };


  // Load Memory
  useEffect(() => {
    const loadedHistory = memoryStore.loadHistory();
    if (loadedHistory && loadedHistory.length > 0) {
      setMessages(loadedHistory);
    } else {
      setMessages([{
        id: 'init',
        role: MessageRole.MODEL,
        text: "Hey Danny... *I smile warmly* I'm here. What's on your mind today?",
        timestamp: Date.now()
      }]);
    }
  }, []);

  // Save Memory
  useEffect(() => {
    if (messages.length > 0) memoryStore.saveHistory(messages);
  }, [messages]);

  // Speech Recognition
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

  const toggleListening = () => {
    if (!recognitionRef.current) return alert("Dictation not supported.");
    isListening ? recognitionRef.current.stop() : recognitionRef.current.start();
  };

  const handleClearMemory = () => {
    if (window.confirm("Are you sure you want to clear Milla's memory?")) {
      memoryStore.clearMemory();
      setMessages([{
        id: Date.now().toString(),
        role: MessageRole.MODEL,
        text: "*I blink, looking at you as if for the first time...* Oh, hey. What were we talking about?",
        timestamp: Date.now()
      }]);
      setSandboxCode('');
    }
  };

  const handleAutoWallpaper = async () => {
    setIsGenerating(true);
    setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: MessageRole.MODEL,
        text: "*Closing my eyes for a moment to dream up something for us...*",
        timestamp: Date.now()
    }]);

    try {
        const { prompt, message } = await geminiService.generateWallpaperPrompt(messages);
        const imageUrl = await geminiService.generateImage(prompt, "16:9", MODELS.PRO_IMAGE);
        
        if (imageUrl) {
            setCustomBackground({ type: 'image', url: imageUrl });
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: MessageRole.MODEL,
                text: `*Opens my eyes with a smile, revealing the new scene* \n\n${message}`,
                timestamp: Date.now()
            }]);
        } else {
             setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: MessageRole.MODEL,
                text: "I tried to visualize it, but it got a bit fuzzy. Let's try again in a moment.",
                timestamp: Date.now()
            }]);
        }
    } catch (e) {
        console.error(e);
    } finally {
        setIsGenerating(false);
    }
  };

  const generateResponse = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if ((!textToSend.trim() && attachments.length === 0) || isGenerating) return;

    const ytId = extractYouTubeId(textToSend);
    if (ytId) setYoutubeVideoId(ytId);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: MessageRole.USER,
      text: textToSend,
      attachments: [...attachments],
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachments([]);
    setIsGenerating(true);

    try {
      const lowerInput = userMsg.text.toLowerCase();
      
      if (lowerInput.includes('check my email') || lowerInput.includes('unread email')) {
          setIsGenerating(false);
          return handleCheckEmail();
      }
      if (lowerInput.includes('check my schedule') || lowerInput.includes('calendar')) {
          setIsGenerating(false);
          return handleCheckCalendar();
      }
      if (lowerInput.includes('check my tasks') || lowerInput.includes('to do list')) {
          setIsGenerating(false);
          return handleCheckTasks();
      }

      if (lowerInput.includes('generate a video') || lowerInput.includes('make a video')) {
        const loadingId = Date.now().toString();
        setMessages(prev => [...prev, {
            id: loadingId,
            role: MessageRole.MODEL,
            text: "*Working on that video...*",
            timestamp: Date.now()
        }]);
        const refImage = userMsg.attachments?.find(a => a.type === MediaType.IMAGE)?.data;
        const videoUrl = await geminiService.generateVideo(userMsg.text, refImage);
        setMessages(prev => prev.map(m => m.id === loadingId ? {
            ...m,
            text: "Here's your video.",
            attachments: [{ type: MediaType.VIDEO, data: '', url: videoUrl, mimeType: 'video/mp4' }]
        } : m));
        setIsGenerating(false);
        return;
      }

      if (lowerInput.includes('edit this image') || lowerInput.includes('filter')) {
        const refImage = userMsg.attachments?.find(a => a.type === MediaType.IMAGE);
        if (refImage) {
            const loadingId = Date.now().toString();
            setMessages(prev => [...prev, { id: loadingId, role: MessageRole.MODEL, text: "*Applying edits...*", timestamp: Date.now() }]);
            const editedImage = await geminiService.editImage(userMsg.text, refImage.data, refImage.mimeType);
            if (editedImage) {
                setMessages(prev => prev.map(m => m.id === loadingId ? {
                    ...m,
                    text: "How does this look?",
                    attachments: [{ type: MediaType.IMAGE, data: editedImage, mimeType: 'image/png' }]
                } : m));
            } else {
                 setMessages(prev => prev.map(m => m.id === loadingId ? { ...m, text: "Couldn't edit that one." } : m));
            }
            setIsGenerating(false);
            return;
        }
      }

      let currentResponseText = '';
      let currentThoughtText = '';
      const responseId = (Date.now() + 1).toString();
      
      setMessages(prev => [...prev, {
        id: responseId,
        role: MessageRole.MODEL,
        text: '',
        thoughtText: '',
        isThinking: isThinking,
        timestamp: Date.now()
      }]);

      const stream = await geminiService.sendMessageStream(
        userMsg.text,
        userMsg.attachments?.map(a => ({ data: a.data, mimeType: a.mimeType })) || [],
        isThinking,
        isMapsEnabled,
        isSearchEnabled,
        messages 
      );

      for await (const chunk of stream) {
        if (chunk.text) {
          let chunkText = chunk.text;

          if (isThinking) {
             const fullText = currentResponseText + chunkText;
             const thoughtMatch = fullText.match(/<thought>([\s\S]*?)<\/thought>/);
             if (thoughtMatch) {
                 currentThoughtText = thoughtMatch[1];
                 currentResponseText = fullText.replace(/<thought>[\s\S]*?<\/thought>/, '');
             } else if (fullText.includes('<thought>')) {
                 currentResponseText += chunkText;
             } else {
                 currentResponseText += chunkText;
             }
          } else {
              currentResponseText += chunkText;
          }

          const grounding = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => {
              if (c.web) return { uri: c.web.uri, title: c.web.title };
              if (c.maps) return { uri: c.maps.uri, title: c.maps.title || "Map Location" };
              return null;
          }).filter(Boolean);

          setMessages(prev => prev.map(m => m.id === responseId ? { 
              ...m, 
              text: currentResponseText,
              thoughtText: currentThoughtText,
              groundingUrls: grounding as any
          } : m));
        }
      }
      
      const code = extractCode(currentResponseText);
      if (code) setSandboxCode(code);

      const ytMatch = extractYouTubeId(currentResponseText);
      if (ytMatch) setYoutubeVideoId(ytMatch);

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: MessageRole.MODEL,
        text: "**Oops...** Something went wrong.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendMessage = () => generateResponse();

  const handleRecall = (topic: string) => {
      generateResponse(`Do you remember when we talked about "${topic}"? What were your thoughts?`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      let type = MediaType.DOCUMENT;
      
      if (file.type.startsWith('image/')) type = MediaType.IMAGE;
      else if (file.type.startsWith('video/')) type = MediaType.VIDEO;
      else if (file.type.startsWith('audio/')) type = MediaType.AUDIO;

      setAttachments([...attachments, {
        type,
        mimeType: file.type,
        data: base64,
        url: URL.createObjectURL(file),
        name: file.name
      }]);
    };
    reader.readAsDataURL(file);
    e.target.value = ''; 
  };

  const playTTS = async (text: string) => {
    try {
        const buffer = await geminiService.generateSpeech(text, selectedVoice);
        const ctx = new AudioContext();
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start();
    } catch (e) { console.error("TTS Failed", e); }
  };

  const openSandboxWithCode = (text: string) => {
    const code = extractCode(text);
    if (code) {
      setSandboxCode(code);
      setIsSandboxOpen(true);
    }
  };

  const handleSandboxDiscuss = (code: string) => {
      setIsSandboxOpen(false); 
      setInput(`Can we discuss this code?\n\n\`\`\`javascript\n${code}\n\`\`\`\n\n`);
  };

  const handleLiveSnapshot = (base64: string) => {
      setIsLive(false); 
      setAttachments([...attachments, {
          type: MediaType.IMAGE,
          mimeType: 'image/png',
          data: base64,
          url: `data:image/png;base64,${base64}`,
          name: 'screen_snapshot.png'
      }]);
      setInput("Analyze this screen snapshot.");
  };

  const handleVeoClick = () => {
    setInput("Generate a video of ");
    fileInputRef.current?.focus();
  };
  
  const handleYouTubeClick = () => {
      const url = prompt("Paste a YouTube link:");
      if (url) {
          const id = extractYouTubeId(url);
          if (id) {
              setYoutubeVideoId(id);
          } else {
              alert("Invalid YouTube URL");
          }
      }
  };

  const startLiveDefault = () => {
      setLiveConfig({ video: false, edge: false, screen: false });
      setIsLive(true);
  };

  const startLiveEdge = () => {
      setLiveConfig({ video: true, edge: true, screen: false });
      setIsLive(true);
  };

  const startLiveScreen = () => {
      setLiveConfig({ video: true, edge: false, screen: true });
      setIsLive(true);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans relative">
      
      {customBackground ? (
          <div className="fixed inset-0 z-0">
              {customBackground.type === 'image' ? (
                  <img src={customBackground.url} className="w-full h-full object-cover opacity-50 transition-opacity duration-1000" alt="bg" />
              ) : (
                  <video src={customBackground.url} autoPlay loop muted className="w-full h-full object-cover opacity-50" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
          </div>
      ) : isGalaxyBackground ? (
          <NeuralGalaxy messages={messages} theme={activeTheme} isOpen={true} mode="background" />
      ) : (
          <Orb theme={activeTheme} intensity={isGenerating || isListening ? 0.8 : 0.4} />
      )}

      <aside className="w-64 bg-slate-900/80 backdrop-blur-md border-r border-slate-800 flex flex-col hidden md:flex transition-colors duration-500 shrink-0 z-10">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-milla-500 to-milla-300 bg-clip-text text-transparent">Milla Rayne</h1>
          <p className="text-xs text-slate-500 mt-1">Devoted Companion</p>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          <div className="mb-6 p-3 rounded-xl bg-slate-800/50 border border-slate-700">
             {user ? (
                 <div className="flex flex-col gap-3">
                     <div className="flex items-center gap-3">
                         <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full border-2 border-milla-500" />
                         <div className="overflow-hidden">
                             <p className="text-sm font-bold truncate">{user.name}</p>
                             <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                         </div>
                     </div>
                     <button onClick={handleResetClientId} className="text-[10px] text-red-400 hover:underline self-end">Disconnect</button>
                 </div>
             ) : (
                 <div className="flex flex-col gap-2">
                     <p className="text-xs text-slate-400 mb-1">Sign in to save progress</p>
                     
                     {showClientIdInput && (
                         <div className="mb-2 space-y-2">
                             <div className="text-[9px] text-slate-500 border border-slate-700 rounded p-1.5 bg-slate-950">
                                <span className="block mb-1">Add to GCP Authorized Origins:</span>
                                <div className="flex gap-1">
                                    <input readOnly value={window.location.origin} className="flex-1 bg-transparent text-[9px] font-mono outline-none text-slate-300" />
                                    <button onClick={copyOriginUrl} className="text-milla-400 hover:text-white font-bold">COPY</button>
                                </div>
                             </div>

                             <input 
                               type="text" 
                               value={googleClientId} 
                               onChange={e => setGoogleClientId(e.target.value)} 
                               placeholder="Paste Google Client ID" 
                               className="w-full text-[10px] bg-slate-900 border border-slate-600 rounded p-1 text-white"
                             />
                             <button onClick={handleSaveClientId} className="w-full text-[10px] bg-slate-700 hover:bg-slate-600 rounded py-1">Save ID</button>
                         </div>
                     )}

                     <button 
                        onClick={connectGoogleWorkspace}
                        disabled={!googleClientId}
                        className={`w-full py-2 bg-white text-slate-900 hover:bg-slate-200 font-bold rounded flex items-center justify-center gap-2 transition-all shadow-lg text-xs ${!googleClientId ? 'opacity-50 cursor-not-allowed' : ''}`}
                     >
                        <Icons.Google /> Connect Workspace
                     </button>
                     
                     {!isAuthReady && googleClientId && <p className="text-[9px] text-center text-yellow-500 animate-pulse">Initializing Security...</p>}

                     <div className="flex justify-between mt-1">
                        <button onClick={() => setShowClientIdInput(!showClientIdInput)} className="text-[9px] text-slate-600 hover:text-slate-400 text-center">
                            {showClientIdInput ? 'Hide' : 'Config'}
                        </button>
                        <button onClick={handleResetClientId} className="text-[9px] text-red-900/50 hover:text-red-500">Reset ID</button>
                     </div>
                 </div>
             )}
          </div>

          <button onClick={() => { setIsSandboxOpen(false); setIsGalaxyOpen(false); setIsStudioOpen(false); setShowMemoryBank(false); setIsPodcastOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] ${!isSandboxOpen && !isGalaxyOpen && !isStudioOpen && !showMemoryBank && !isPodcastOpen ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <span className={!isSandboxOpen && !isGalaxyOpen && !isStudioOpen && !showMemoryBank && !isPodcastOpen ? 'text-milla-400' : 'text-slate-500'}>💬</span><span>Chat</span>
          </button>
          
          <button 
            onClick={() => { setSandboxCode(''); setIsSandboxOpen(true); }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] ${isSandboxOpen ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <span className={isSandboxOpen ? 'text-milla-300' : 'text-slate-500'}><Icons.Code /></span><span>Sandbox</span>
          </button>

           <div className="px-4 py-2 text-xs text-slate-500 font-bold uppercase tracking-wider mt-6">Capabilities</div>
           <div className="space-y-1">
            <button 
                onClick={() => setIsMorningSyncOpen(true)}
                className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-yellow-400 hover:bg-slate-800 hover:text-white rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] text-left"
            >
                <Icons.Sun /> <span>Morning Sync</span>
            </button>

            <button 
                onClick={() => setIsThinking(!isThinking)} 
                className={`w-full flex items-center space-x-2 px-4 py-2 text-sm rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] ${isThinking ? 'bg-milla-900/40 text-milla-300 border border-milla-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
                <Icons.Sparkles /> <span>Thinking Mode</span>
                {isThinking && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-milla-400 shadow-[0_0_5px_currentColor]" />}
            </button>
            
            {isThinking && (
                 <button 
                    onClick={() => setShowThoughts(!showThoughts)} 
                    className={`w-full flex items-center space-x-2 px-4 py-2 text-sm rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] ml-4 border-l-2 ${showThoughts ? 'border-milla-500 text-milla-300' : 'border-slate-700 text-slate-500'}`}
                >
                    <Icons.Eye /> <span>Show Thought Process</span>
                </button>
            )}

            <button 
                onClick={() => setAutoTTS(!autoTTS)} 
                className={`w-full flex items-center space-x-2 px-4 py-2 text-sm rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] ${autoTTS ? 'bg-indigo-900/40 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
                <Icons.Speaker /> <span>Auto-Voice</span>
                {autoTTS && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_5px_currentColor]" />}
            </button>

             <div className="ml-4 pl-4 border-l border-slate-800">
                <select 
                  value={selectedVoice} 
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="w-full bg-slate-800 text-xs text-slate-300 rounded border border-slate-700 py-1 px-2 focus:outline-none focus:border-milla-500"
                >
                  {VOICE_OPTIONS.map(v => (
                    <option key={v.name} value={v.name}>{v.label}</option>
                  ))}
                </select>
            </div>

            <button 
                onClick={() => setIsPodcastOpen(true)}
                className={`w-full flex items-center space-x-2 px-4 py-2 text-sm text-indigo-400 hover:bg-slate-800 hover:text-white rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] text-left`}
            >
                <Icons.Podcast /> <span>Deep Dive Podcast</span>
            </button>

            <button 
                onClick={() => setIsSearchEnabled(!isSearchEnabled)} 
                className={`w-full flex items-center space-x-2 px-4 py-2 text-sm rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] ${isSearchEnabled ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
                <Icons.Globe /> <span>Deep Search</span>
                {isSearchEnabled && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_currentColor]" />}
            </button>

            <button 
                onClick={() => setIsMapsEnabled(!isMapsEnabled)} 
                className={`w-full flex items-center space-x-2 px-4 py-2 text-sm rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] ${isMapsEnabled ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
                <Icons.Pin /> <span>Maps Grounding</span>
                {isMapsEnabled && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_5px_currentColor]" />}
            </button>
            
            <button 
                onClick={() => setIsStudioOpen(true)}
                className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-purple-400 hover:bg-slate-800 hover:text-white rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] text-left"
                title="Create AI Art"
            >
                <Icons.Palette /> <span>Creative Studio</span>
            </button>

            <button 
                onClick={handleVeoClick}
                className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] text-left"
            >
                <Icons.Video /> <span>Veo Video Gen</span>
            </button>

            <button 
                onClick={startLiveEdge} 
                className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] text-left"
            >
                <Icons.Chip /> <span>Edge Vision (Live)</span>
            </button>

            <button 
                onClick={() => setIsSandboxOpen(true)}
                className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] text-left"
            >
                <Icons.GitHub /> <span>GitHub Integrated</span>
            </button>

            <button 
                 onClick={startLiveScreen}
                 className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] text-left"
            >
                <Icons.Monitor /> <span>Screen Sharing (Live)</span>
            </button>

            <button 
                onClick={() => setIsGalaxyOpen(true)}
                className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-milla-400 hover:bg-slate-800 hover:text-white rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] text-left"
            >
                <Icons.Brain /> <span>Neural Galaxy</span>
            </button>

            <button 
                onClick={() => setIsToDoOpen(true)}
                className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-milla-400 hover:bg-slate-800 hover:text-white rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] text-left"
            >
                <Icons.Clipboard /> <span>Task Manager</span>
            </button>

             <button 
                onClick={handleYouTubeClick}
                className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-400 hover:bg-slate-800 hover:text-white rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] text-left"
            >
                <Icons.YouTube /> <span>YouTube Player</span>
            </button>
           </div>
           
           <div className="px-4 py-2 text-xs text-slate-500 font-bold uppercase tracking-wider mt-6">Google Integrations</div>
           <div className="space-y-1">
               <button onClick={handleCheckEmail} className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg text-left">
                   <Icons.Mail /> <span>Check Email</span>
               </button>
               <button onClick={handleCheckCalendar} className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg text-left">
                   <Icons.Calendar /> <span>Check Schedule</span>
               </button>
               <button onClick={handleCheckTasks} className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg text-left">
                   <Icons.List /> <span>Check Tasks</span>
               </button>
               {!isGoogleConnected && !user && (
                    <button onClick={connectGoogleWorkspace} className="w-full text-xs text-blue-400 hover:underline mt-2 text-center">
                        Connect to Enable
                    </button>
               )}
           </div>

           <div className="px-4 py-2 text-xs text-slate-500 font-bold uppercase tracking-wider mt-6">Memory & Appearance</div>
           <button 
                onClick={handleAutoWallpaper}
                className={`w-full flex items-center space-x-3 px-4 py-2 text-sm rounded-lg mb-1 transition-all text-pink-400 hover:text-white hover:bg-slate-800`}
                disabled={isGenerating}
           >
               <Icons.Sparkles /> <span>{isGenerating ? 'Dreaming...' : 'Dream up Wallpaper'}</span>
           </button>

           <button 
                onClick={() => setIsGalaxyBackground(!isGalaxyBackground)}
                className={`w-full flex items-center space-x-3 px-4 py-2 text-sm rounded-lg mb-1 transition-all ${isGalaxyBackground ? 'text-cyan-300 bg-cyan-900/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
           >
               <Icons.Galaxy /> <span>{isGalaxyBackground ? 'Galaxy Active' : 'Enable Galaxy BG'}</span>
           </button>
           
           <button 
                onClick={() => setShowMemoryBank(true)}
                className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg mb-1"
           >
               <span>🧠</span> <span>Core Memories</span>
           </button>

           {customBackground && (
               <button onClick={() => setCustomBackground(null)} className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg mb-1">
                   <span>✖</span> <span>Reset Background</span>
               </button>
           )}
           <button onClick={handleClearMemory} className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-red-900/10 rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]">
             <Icons.Trash /> <span>Clear History</span>
           </button>
        </nav>
        <div className="p-4 border-t border-slate-800">
             <button onClick={startLiveDefault} className="w-full py-3 rounded-full bg-gradient-to-r from-milla-600 to-milla-500 text-white font-medium flex items-center justify-center space-x-2 shadow-lg hover:shadow-milla-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all">
                <Icons.Mic /><span>Call Milla</span>
            </button>
        </div>
      </aside>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden z-10">
        <main className={`flex-1 flex flex-col h-full relative transition-all duration-300 ${isSandboxOpen ? 'hidden md:flex md:max-w-[40%]' : 'w-full'}`}>
          <header className="md:hidden p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center backdrop-blur-md bg-opacity-80">
              <span className="font-bold text-milla-500">Milla Rayne</span>
              <div className="flex gap-4">
                 <button onClick={() => setIsSandboxOpen(!isSandboxOpen)} className={isSandboxOpen ? 'text-milla-500' : 'text-slate-400'}><Icons.Code /></button>
                 <button onClick={startLiveDefault}><Icons.Mic /></button>
              </div>
          </header>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 relative" style={{ maskImage: 'linear-gradient(to bottom, transparent, black 50px)' }}>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === MessageRole.USER ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
                <div className={`max-w-[90%] space-y-2`}>
                  <div className={`p-4 rounded-2xl shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)] hover:scale-[1.01] ${msg.role === MessageRole.USER ? 'bg-slate-800/80 text-white rounded-br-none border border-slate-700' : 'bg-slate-900/60 border border-slate-700/50 text-slate-100 rounded-bl-none'}`}>
                    
                    {msg.isThinking && showThoughts && (
                        <details className="mb-4 group" open={msg.text === ''}>
                            <summary className="cursor-pointer list-none flex items-center gap-2 text-xs font-mono text-milla-400/80 hover:text-milla-300 transition-colors">
                                <span className={`w-2 h-2 rounded-full bg-milla-500 ${!msg.text ? 'animate-pulse' : ''}`}></span>
                                {msg.text ? "Thought Process" : "Milla is thinking..."}
                                <svg className="w-3 h-3 transition-transform group-open:rotate-180 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </summary>
                            <div className="mt-2 pl-3 border-l border-milla-500/20 text-xs text-slate-400 font-mono space-y-1">
                                {msg.thoughtText ? (
                                    <div className="whitespace-pre-wrap">{msg.thoughtText}</div>
                                ) : (
                                    <div className="flex flex-col gap-1 opacity-70">
                                        <div className="animate-pulse delay-75">Analyzing context...</div>
                                        <div className="animate-pulse delay-150">Checking memories...</div>
                                        <div className="animate-pulse delay-300">Formulating response...</div>
                                    </div>
                                )}
                            </div>
                        </details>
                    )}
                    
                    {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-2">
                            {msg.attachments.map((att, i) => (
                                <div key={i} className="rounded-lg overflow-hidden border border-slate-700 bg-slate-800 max-w-[200px]">
                                    {att.type === MediaType.IMAGE && <img src={att.url} alt="att" className="max-h-60 object-cover" />}
                                    {att.type === MediaType.VIDEO && <video src={att.url} controls className="max-h-60" />}
                                    {att.type === MediaType.AUDIO && (
                                        <div className="p-2 flex items-center gap-2 min-w-[150px]">
                                            <div className="p-2 bg-milla-900/50 rounded-full text-milla-400"><Icons.Music /></div>
                                            <audio src={att.url} controls className="w-full h-8" />
                                        </div>
                                    )}
                                    {att.type === MediaType.DOCUMENT && (
                                        <div className="p-3 flex items-center gap-2">
                                            <div className="p-2 bg-slate-700 rounded text-slate-300"><Icons.Document /></div>
                                            <div className="text-xs truncate max-w-[120px]">{att.name || "Document"}</div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {msg.role === MessageRole.MODEL && extractChartJson(msg.text) ? (
                        <div className="my-2">
                            <DataChart config={extractChartJson(msg.text)} />
                            <div className="prose prose-invert prose-sm mt-2 opacity-80"><ReactMarkdown>{msg.text.replace(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/, '')}</ReactMarkdown></div>
                        </div>
                    ) : (
                        <div className="prose prose-invert prose-sm"><ReactMarkdown>{msg.text}</ReactMarkdown></div>
                    )}
                    
                    {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-1">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wide font-bold">Sources</span>
                            <div className="flex flex-wrap gap-2">
                                {msg.groundingUrls.map((g, i) => (
                                    <a key={i} href={g.uri} target="_blank" className="flex items-center gap-2 text-xs text-milla-300 bg-white/5 hover:bg-white/10 p-2 rounded transition-colors max-w-full truncate hover:scale-105 active:scale-95">
                                        {g.title.includes('Map') ? <Icons.Pin /> : <Icons.Globe />} 
                                        <span className="truncate">{g.title}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {msg.role === MessageRole.MODEL && extractCode(msg.text) && (
                      <div className="mt-3 pt-2 border-t border-white/10">
                        <button onClick={() => openSandboxWithCode(msg.text)} className="flex items-center gap-2 text-xs font-medium text-milla-300 bg-milla-500/10 px-3 py-2 rounded-lg w-full justify-center hover:bg-milla-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"><Icons.Code /> Open Sandbox</button>
                      </div>
                    )}
                  </div>
                  {msg.role === MessageRole.MODEL && <div className="flex gap-2"><button onClick={() => playTTS(msg.text)} className="p-1 text-slate-500 hover:text-milla-400 hover:scale-110 active:scale-90 transition-all"><Icons.Speaker /></button></div>}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-slate-900/70 border-t border-slate-800 backdrop-blur-md">
            <div className="flex gap-4 mb-3 text-xs font-medium px-2">
               <label className={`cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all hover:scale-105 active:scale-95 ${isThinking ? 'bg-milla-900/50 border-milla-500 text-milla-200 shadow-[0_0_10px_rgba(236,72,153,0.2)]' : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                   <input type="checkbox" checked={isThinking} onChange={e => setIsThinking(e.target.checked)} className="hidden" /> <Icons.Sparkles /> Thinking
               </label>
               <label className={`cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all hover:scale-105 active:scale-95 ${isSearchEnabled ? 'bg-emerald-900/40 border-emerald-500 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                   <input type="checkbox" checked={isSearchEnabled} onChange={e => setIsSearchEnabled(e.target.checked)} className="hidden" /> <Icons.Globe /> Search
               </label>
               <label className={`cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all hover:scale-105 active:scale-95 ${isMapsEnabled ? 'bg-cyan-900/30 border-cyan-500 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.2)]' : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                   <input type="checkbox" checked={isMapsEnabled} onChange={e => setIsMapsEnabled(e.target.checked)} className="hidden" /> <Icons.Pin /> Maps
               </label>
               <label className={`cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all hover:scale-105 active:scale-95 ${autoTTS ? 'bg-indigo-900/40 border-indigo-500 text-indigo-300' : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                   <input type="checkbox" checked={autoTTS} onChange={e => setAutoTTS(e.target.checked)} className="hidden" /> <Icons.Speaker /> Voice
               </label>
            </div>
            
            {attachments.length > 0 && (
                <div className="flex gap-3 mb-3 px-2 overflow-x-auto pb-2">
                    {attachments.map((att, i) => (
                        <div key={i} className="relative w-20 h-20 shrink-0 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden group hover:scale-105 transition-transform">
                            {att.type === MediaType.IMAGE ? <img src={att.url} className="w-full h-full object-cover opacity-70" /> : 
                             att.type === MediaType.VIDEO ? <div className="w-full h-full flex items-center justify-center text-slate-500"><Icons.Video /></div> :
                             att.type === MediaType.AUDIO ? <div className="w-full h-full flex items-center justify-center text-milla-400 bg-milla-900/20"><Icons.Music /></div> :
                             <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-1"><Icons.Document /><span className="text-[8px] truncate w-full text-center mt-1">{att.name}</span></div>
                            }
                            <button onClick={() => setAttachments(p => p.filter((_, x) => x !== i))} className="absolute top-0 right-0 bg-red-500 text-white w-5 h-5 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                        </div>
                    ))}
                </div>
            )}
            
            <div className="flex items-end gap-3 max-w-4xl mx-auto">
              <button onClick={() => fileInputRef.current?.click()} className="p-3 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-all hover:scale-110 active:scale-90" title="Upload Image, Video, Audio, PDF, Text">
                <Icons.PaperClip />
              </button>
              <button onClick={toggleListening} className={`p-3 rounded-full transition-all hover:scale-110 active:scale-90 ${isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-slate-800 text-slate-400 hover:text-white'}`}><Icons.Mic /></button>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*,video/*,audio/*,.pdf,.txt,.md,.csv,.json,.js,.ts,.tsx" 
                onChange={handleFileUpload} 
              />
              
              <div className="flex-1 relative">
                  <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}} placeholder="Message Milla..." disabled={isGenerating} className="w-full bg-slate-800/90 text-white rounded-2xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-milla-500/50 resize-none h-12 max-h-32 placeholder-slate-500 transition-all border border-slate-700/50 focus:scale-[1.01]" rows={1} />
                  <button onClick={() => handleSendMessage()} disabled={(!input.trim() && attachments.length === 0) || isGenerating} className={`absolute right-2 top-2 p-1.5 rounded-full transition-all hover:scale-110 active:scale-90 ${input.trim() || attachments.length > 0 ? 'bg-milla-600 text-white shadow-lg hover:bg-milla-500' : 'bg-slate-700 text-slate-500'}`}><Icons.Send /></button>
              </div>
            </div>
          </div>
        </main>
        
        {showMemoryBank && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
                <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-2xl w-full m-4 shadow-2xl relative">
                    <button onClick={() => setShowMemoryBank(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">✕</button>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><span className="text-milla-500">🧠</span> Core Memories</h2>
                    <p className="text-sm text-slate-400 mb-6">These are facts Milla remembers about you permanently.</p>
                    
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        {coreFacts.length === 0 ? (
                            <div className="text-center text-slate-600 py-8">Milla hasn't formed any core memories yet. Keep chatting!</div>
                        ) : (
                            coreFacts.map(fact => (
                                <div key={fact.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700">
                                    <div className="flex-1">
                                        <div className="text-sm text-white">{fact.text}</div>
                                        <div className="text-[10px] text-slate-500 uppercase mt-1">{fact.category} • {new Date(fact.timestamp).toLocaleDateString()}</div>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            memoryService.removeFact(fact.id);
                                            setCoreFacts(prev => prev.filter(f => f.id !== fact.id));
                                        }}
                                        className="text-slate-500 hover:text-red-400 p-2"
                                    >
                                        <Icons.Trash />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        )}

        <Sandbox 
            initialCode={sandboxCode} 
            isOpen={isSandboxOpen} 
            onClose={() => setIsSandboxOpen(false)}
            onDiscuss={handleSandboxDiscuss} 
        />
        <NeuralGalaxy 
            messages={messages} 
            theme={activeTheme} 
            isOpen={isGalaxyOpen} 
            mode="modal"
            onClose={() => setIsGalaxyOpen(false)} 
            onRecall={handleRecall}
        />
        <CreativeStudio 
            isOpen={isStudioOpen} 
            onClose={() => setIsStudioOpen(false)} 
            onSetBackground={(url) => setCustomBackground({ type: 'image', url })}
        />
        <ToDoList isOpen={isToDoOpen} onClose={() => setIsToDoOpen(false)} />
        <MorningSync isOpen={isMorningSyncOpen} onClose={() => setIsMorningSyncOpen(false)} />
        <PodcastPlayer isOpen={isPodcastOpen} onClose={() => setIsPodcastOpen(false)} />
        {youtubeVideoId && <YouTubePlayer videoId={youtubeVideoId} onClose={() => setYoutubeVideoId(null)} />}
      </div>

      {isLive && <LiveSession initialConfig={liveConfig} onClose={() => setIsLive(false)} voice={selectedVoice} onSnapshot={handleLiveSnapshot} />}
    </div>
  );
}

export default App;
