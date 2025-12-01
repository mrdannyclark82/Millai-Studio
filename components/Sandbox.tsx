
import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import Editor from 'react-simple-code-editor';
import { githubService, GitHubNode } from '../services/githubService';
import { geminiService } from '../services/geminiService';

interface SandboxProps {
  initialCode: string;
  isOpen: boolean;
  onClose: () => void;
  onDiscuss?: (code: string) => void;
}

interface LogEntry {
  level: 'log' | 'error' | 'warn' | 'info';
  args: string[];
  timestamp: string;
}

const STORAGE_KEY = 'milla_sandbox_code';

// File Explorer Item Component
const FileItem: React.FC<{ node: GitHubNode, onClick: (n: GitHubNode) => void, depth?: number }> = ({ node, onClick, depth = 0 }) => (
  <div 
    onClick={() => onClick(node)}
    className="flex items-center gap-2 py-1.5 px-2 hover:bg-slate-800 cursor-pointer text-xs font-mono text-slate-300 transition-colors border-l border-transparent hover:border-milla-500"
    style={{ paddingLeft: `${depth * 12 + 8}px` }}
  >
    <span className={node.type === 'tree' ? 'text-milla-400' : 'text-slate-500'}>
      {node.type === 'tree' ? '📁' : '📄'}
    </span>
    <span className="truncate">{node.path.split('/').pop()}</span>
  </div>
);

const Sandbox: React.FC<SandboxProps> = ({ initialCode, isOpen, onClose, onDiscuss }) => {
  const [code, setCode] = useState(initialCode);
  const [debouncedCode, setDebouncedCode] = useState(initialCode);
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'split'>('split');
  const [key, setKey] = useState(0); 
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [lastSaved, setLastSaved] = useState<string>('');
  
  // GitHub State
  const [repoUrl, setRepoUrl] = useState('');
  const [currentRepo, setCurrentRepo] = useState<{owner: string, repo: string} | null>(null);
  const [fileTree, setFileTree] = useState<GitHubNode[]>([]);
  const [isLoadingRepo, setIsLoadingRepo] = useState(false);
  const [currentFilePath, setCurrentFilePath] = useState<string>('index.html');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [ghToken, setGhToken] = useState('');

  // Console UI State
  const [isConsoleOpen, setIsConsoleOpen] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Resize State
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [editorWidthPercentage, setEditorWidthPercentage] = useState(50);
  const [consoleHeight, setConsoleHeight] = useState(160);
  
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingConsole, setIsResizingConsole] = useState(false);
  const [isResizingSplit, setIsResizingSplit] = useState(false);

  // Generation State
  const [showGenerateInput, setShowGenerateInput] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateFileType, setGenerateFileType] = useState('Auto');
  const fileTypes = ['Auto', 'HTML', 'CSS', 'JavaScript', 'TypeScript', 'React (TSX)', 'JSON'];

  // Linting State
  const [lintError, setLintError] = useState<string | null>(null);

  // Initialize
  useEffect(() => {
    if (isOpen) {
      let contentToLoad = initialCode;
      if (!contentToLoad) {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) contentToLoad = saved;
      }
      setCode(contentToLoad || '<!-- Start coding here -->');
      setDebouncedCode(contentToLoad || '<!-- Start coding here -->');
      setKey(prev => prev + 1);
      
      // Load saved token
      const t = githubService.getToken();
      if (t) setGhToken(t);

      if (window.innerWidth < 768) setActiveTab('code');
    }
  }, [initialCode, isOpen]);

  // Debounce Code for Iframe
  useEffect(() => {
      const handler = setTimeout(() => {
          setDebouncedCode(code);
      }, 500); 
      return () => clearTimeout(handler);
  }, [code]);

  // Auto-save local
  useEffect(() => {
    if (isOpen && code) {
       localStorage.setItem(STORAGE_KEY, code);
       const now = new Date();
       setLastSaved(`${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`);
    }
  }, [code, isOpen]);

  // Listen for iframe logs
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.source === 'sandbox-console') {
        if (event.data.level === 'clear') {
            setLogs([]);
            return;
        }
        setLogs(prev => [...prev, {
          level: event.data.level,
          args: event.data.payload,
          timestamp: new Date().toLocaleTimeString()
        }]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Scroll logs
  useEffect(() => {
    if (isConsoleOpen) logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, isConsoleOpen]);

  // Real-time Linting
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!code.trim()) {
          setLintError(null);
          return;
      }
      try {
        let parser = 'babel';
        const lowerPath = currentFilePath.toLowerCase();
        if (lowerPath.endsWith('.html')) parser = 'html';
        else if (lowerPath.endsWith('.css')) parser = 'css';
        else if (lowerPath.endsWith('.json')) parser = 'json';
        else if (lowerPath.endsWith('.md')) parser = 'markdown';
        else if (code.trim().startsWith('<!DOCTYPE') || code.trim().startsWith('<html')) parser = 'html';

        // @ts-ignore
        const prettier = await import('prettier');
        // @ts-ignore
        const parserBabel = await import('prettier/plugins/babel');
        // @ts-ignore
        const parserEstree = await import('prettier/plugins/estree');
        // @ts-ignore
        const parserHtml = await import('prettier/plugins/html');
        // @ts-ignore
        const parserPostcss = await import('prettier/plugins/postcss');

        await prettier.format(code, {
            parser,
            plugins: [parserBabel, parserHtml, parserPostcss, parserEstree],
            singleQuote: true,
        });
        setLintError(null);
      } catch (e: any) {
        const msg = e.message ? e.message.split('\n')[0] : 'Syntax Error';
        setLintError(msg);
      }
    }, 1000); 
    return () => clearTimeout(timer);
  }, [code, currentFilePath]);

  // --- Resize Handlers ---
  const startResizingSidebar = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSidebar(true);
  };

  const startResizingConsole = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingConsole(true);
  };

  const startResizingSplit = (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizingSplit(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar) {
        const newWidth = Math.max(150, Math.min(500, e.clientX));
        setSidebarWidth(newWidth);
      }
      if (isResizingConsole) {
        const newHeight = window.innerHeight - e.clientY;
        setConsoleHeight(Math.max(32, Math.min(600, newHeight)));
      }
      if (isResizingSplit) {
          const containerWidth = window.innerWidth - sidebarWidth; // Approx
          const offset = e.clientX - sidebarWidth;
          const percentage = (offset / containerWidth) * 100;
          setEditorWidthPercentage(Math.max(20, Math.min(80, percentage)));
      }
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      setIsResizingConsole(false);
      setIsResizingSplit(false);
    };

    if (isResizingSidebar || isResizingConsole || isResizingSplit) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = isResizingSplit ? 'col-resize' : isResizingConsole ? 'row-resize' : isResizingSidebar ? 'col-resize' : 'default';
      
      const frames = document.querySelectorAll('iframe');
      frames.forEach(f => f.style.pointerEvents = 'none');
    } else {
        document.body.style.cursor = 'default';
        const frames = document.querySelectorAll('iframe');
        frames.forEach(f => f.style.pointerEvents = 'auto');
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSidebar, isResizingConsole, isResizingSplit, sidebarWidth]);


  // --- GitHub Logic ---
  const handleLoadRepo = async () => {
    const parsed = githubService.parseRepoString(repoUrl);
    if (!parsed) {
        alert("Invalid GitHub URL. Use format: owner/repo");
        return;
    }
    
    setIsLoadingRepo(true);
    try {
        const nodes = await githubService.fetchRepoContents(parsed.owner, parsed.repo);
        setFileTree(nodes);
        setCurrentRepo(parsed);
        setIsSidebarOpen(true); 
    } catch (e: any) {
        console.error(e);
        if (e.message.includes('not found') || e.message.includes('token')) {
            alert("Repository not found or private.\nPlease add a Personal Access Token below.");
            setShowTokenInput(true); // Automatically show token input
        } else {
            alert(e.message || "Failed to load repo.");
        }
    } finally {
        setIsLoadingRepo(false);
    }
  };

  const handleFileClick = async (node: GitHubNode) => {
    if (node.type === 'tree') {
        try {
            if (!currentRepo) return;
            const nodes = await githubService.fetchRepoContents(currentRepo.owner, currentRepo.repo, node.path);
            setFileTree(nodes);
        } catch (e) {
            console.error(e);
        }
    } else {
        try {
            const content = await githubService.fetchFileContent(node.url);
            setCode(content);
            setCurrentFilePath(node.path);
            if (activeTab === 'preview') setActiveTab('code');
        } catch (e) {
            console.error(e);
        }
    }
  };

  const saveToken = () => {
    githubService.initialize(ghToken);
    setShowTokenInput(false);
  };

  // --- Utility ---
  const handleRun = () => {
    setKey(prev => prev + 1);
    setDebouncedCode(code); // Force update
    setLogs([]);
    if (activeTab === 'code') setActiveTab('preview');
  };

  const handleGenerateCode = async () => {
    if (!generatePrompt.trim()) return;
    setIsGenerating(true);
    setLogs(prev => [...prev, { level: 'info', args: [`Generating ${generateFileType} code...`], timestamp: new Date().toLocaleTimeString() }]);
    try {
        const generated = await geminiService.generateCode(generatePrompt, generateFileType);
        setCode(generated);
        setLogs(prev => [...prev, { level: 'info', args: ['Code generation complete.'], timestamp: new Date().toLocaleTimeString() }]);
        setShowGenerateInput(false);
        setGeneratePrompt('');
        setGenerateFileType('Auto');
    } catch (e) {
        console.error(e);
        setLogs(prev => [...prev, { level: 'error', args: ['Code generation failed.'], timestamp: new Date().toLocaleTimeString() }]);
    } finally {
        setIsGenerating(false);
    }
  };

  const handleFormat = async () => {
    try {
      let parser = 'babel';
      const lowerPath = currentFilePath.toLowerCase();
      if (lowerPath.endsWith('.html')) parser = 'html';
      else if (lowerPath.endsWith('.css')) parser = 'css';
      else if (lowerPath.endsWith('.json')) parser = 'json';
      else if (lowerPath.endsWith('.md')) parser = 'markdown';
      else if (code.trim().startsWith('<!DOCTYPE') || code.trim().startsWith('<html')) parser = 'html';

      // @ts-ignore
      const prettier = await import('prettier');
      // @ts-ignore
      const parserBabel = await import('prettier/plugins/babel');
      // @ts-ignore
      const parserEstree = await import('prettier/plugins/estree');
      // @ts-ignore
      const parserHtml = await import('prettier/plugins/html');
      // @ts-ignore
      const parserPostcss = await import('prettier/plugins/postcss');

      const formatted = await prettier.format(code, {
        parser,
        plugins: [parserBabel, parserHtml, parserPostcss, parserEstree],
        singleQuote: true,
        printWidth: 80,
      });
      setCode(formatted);
      setLogs(prev => [...prev, { level: 'info', args: ['Code formatted successfully.'], timestamp: new Date().toLocaleTimeString() }]);
    } catch (e: any) {
      console.error(e);
      setLogs(prev => [...prev, { level: 'error', args: ['Format/Syntax Error:', e.message], timestamp: new Date().toLocaleTimeString() }]);
      setIsConsoleOpen(true);
    }
  };

  const getAugmentedCode = (originalCode: string) => {
    const script = `
      <script>
        (function() {
          const originalConsole = window.console;
          function send(level, args) {
            try {
              window.parent.postMessage({
                source: 'sandbox-console',
                level: level,
                payload: args.map(a => {
                   if (typeof a === 'object') {
                     try { return JSON.stringify(a, null, 2); } catch(e) { return String(a); }
                   }
                   return String(a);
                })
              }, '*');
            } catch(e) { originalConsole.error(e); }
          }
          window.console = {
            ...originalConsole,
            log: (...args) => { originalConsole.log(...args); send('log', args); },
            error: (...args) => { originalConsole.error(...args); send('error', args); },
            warn: (...args) => { originalConsole.warn(...args); send('warn', args); },
            info: (...args) => { originalConsole.info(...args); send('info', args); },
            clear: () => { originalConsole.clear(); send('clear', []); }
          };
          window.onerror = function(msg, src, ln, col, err) { send('error', [\`Error: \${msg} (\${ln}:\${col})\`]); };
        })();
      </script>
    `;
    return script + originalCode;
  };

  const highlightCode = (c: string) => {
    // @ts-ignore
    if (window.Prism) return window.Prism.highlight(c, window.Prism.languages.markup, 'markup');
    return c;
  };

  const handleDiscuss = () => {
      if (onDiscuss) {
          onDiscuss(code);
          if (window.innerWidth < 768) onClose();
      }
  };

  if (!isOpen) return null;

  return (
    <div className="w-full md:w-[90%] lg:w-[80%] xl:w-[70%] h-full flex flex-col bg-slate-900 border-l border-slate-800 shadow-2xl transition-all duration-300 animate-in slide-in-from-right font-sans z-50 absolute right-0 top-0 bottom-0">
      
      {/* Top Toolbar */}
      <div className="flex flex-col border-b border-slate-800 bg-slate-900 shrink-0">
        <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
                {/* Sidebar Toggle */}
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`p-1.5 rounded hover:bg-slate-800 ${isSidebarOpen ? 'text-milla-400' : 'text-slate-500'}`} title="Toggle File Explorer">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>

                {/* View Toggles (Desktop vs Mobile) */}
                <div className="hidden md:flex p-0.5 bg-slate-800 rounded-md">
                    <button onClick={() => setActiveTab('split')} className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${activeTab === 'split' ? 'bg-milla-600 text-white' : 'text-slate-400 hover:text-white'}`}>Split</button>
                    <button onClick={() => setActiveTab('code')} className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${activeTab === 'code' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Code</button>
                    <button onClick={() => setActiveTab('preview')} className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${activeTab === 'preview' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Preview</button>
                </div>
                {/* Mobile Tabs */}
                <div className="flex md:hidden p-0.5 bg-slate-800 rounded-md">
                    <button onClick={() => setActiveTab('code')} className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${activeTab === 'code' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Code</button>
                    <button onClick={() => setActiveTab('preview')} className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${activeTab === 'preview' ? 'bg-milla-600 text-white' : 'text-slate-400 hover:text-white'}`}>Preview</button>
                </div>

                <div className="h-4 w-px bg-slate-700 mx-1"></div>

                <button onClick={handleRun} className="flex items-center gap-1 px-3 py-1.5 bg-green-900/20 text-green-400 hover:text-green-300 hover:bg-green-900/30 rounded text-xs font-medium transition-all">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                    Run
                </button>

                <button onClick={handleFormat} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-900/20 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/30 rounded text-xs font-medium transition-all" title="Format Code (Prettier)">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                    Format
                </button>

                <button onClick={() => setShowGenerateInput(!showGenerateInput)} className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-all ${showGenerateInput ? 'bg-milla-600 text-white' : 'bg-milla-900/20 text-milla-400 hover:bg-milla-900/30'}`}>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                    Generate
                </button>

                {onDiscuss && (
                    <button onClick={handleDiscuss} className="flex items-center gap-1 px-3 py-1.5 bg-blue-900/20 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded text-xs font-medium transition-all shadow-sm border border-blue-900/30">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
                        Discuss Code
                    </button>
                )}
            </div>

            <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        {/* Generate Input Area */}
        {showGenerateInput && (
            <div className="p-3 bg-slate-800 border-t border-slate-700 flex gap-2 animate-in slide-in-from-top-2 items-center">
                <select 
                    value={generateFileType} 
                    onChange={(e) => setGenerateFileType(e.target.value)}
                    className="bg-slate-900 text-white text-xs px-2 py-2 rounded border border-slate-700 focus:border-milla-500 focus:outline-none"
                    disabled={isGenerating}
                >
                    {fileTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input 
                    value={generatePrompt}
                    onChange={(e) => setGeneratePrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerateCode()}
                    placeholder="Describe what you want to generate" 
                    className="flex-1 bg-slate-900 text-white text-sm px-3 py-2 rounded border border-slate-700 focus:border-milla-500 focus:outline-none"
                    disabled={isGenerating}
                />
                <button 
                    onClick={handleGenerateCode} 
                    disabled={isGenerating}
                    className="bg-milla-600 hover:bg-milla-500 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isGenerating ? '...' : 'Go'}
                </button>
            </div>
        )}
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* GitHub Sidebar (Collapsible) */}
        <div 
          style={{ width: isSidebarOpen ? sidebarWidth : 0 }}
          className={`${isSidebarOpen ? 'opacity-100' : 'opacity-0 overflow-hidden'} bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 relative ${isResizingSidebar ? '' : 'transition-all duration-300'}`}
        >
             <div className="p-3 border-b border-slate-800 space-y-2">
                 <div className="flex gap-1">
                     <input 
                       value={repoUrl}
                       onChange={e => setRepoUrl(e.target.value)}
                       placeholder="owner/repo"
                       className="w-full bg-slate-800 text-xs text-white px-2 py-1.5 rounded border border-slate-700 focus:border-milla-500 focus:outline-none"
                     />
                     <button onClick={handleLoadRepo} disabled={isLoadingRepo} className="bg-slate-700 hover:bg-slate-600 text-white px-2 rounded">
                        {isLoadingRepo ? '...' : 'Go'}
                     </button>
                 </div>
                 <button onClick={() => setShowTokenInput(!showTokenInput)} className="text-[10px] text-slate-500 hover:text-milla-400 underline text-left">
                    {ghToken ? 'Update Token' : 'Add Auth Token (Private Repos)'}
                 </button>
                 {showTokenInput && (
                     <div className="flex gap-1 animate-in slide-in-from-top-2">
                         <input type="password" value={ghToken} onChange={e => setGhToken(e.target.value)} placeholder="ghp_..." className="flex-1 bg-slate-800 text-[10px] text-white px-1 py-1 rounded border border-slate-700" />
                         <button onClick={saveToken} className="bg-milla-600 text-white text-[10px] px-2 rounded">Save</button>
                     </div>
                 )}
             </div>

             <div className="flex-1 overflow-y-auto p-2">
                 {fileTree.length === 0 ? (
                     <div className="text-center mt-10 text-slate-600 text-xs">
                        No files loaded.<br/>Enter a repo above.
                     </div>
                 ) : (
                     <div className="flex flex-col">
                        {currentRepo && (
                            <div onClick={() => handleLoadRepo()} className="flex items-center gap-2 py-1.5 px-2 hover:bg-slate-800 cursor-pointer text-xs font-mono text-slate-400 font-bold border-b border-slate-800 mb-2">
                                <span>📦</span> {currentRepo.repo}
                            </div>
                        )}
                        {fileTree.map((node) => (
                            <FileItem key={node.sha} node={node} onClick={handleFileClick} />
                        ))}
                     </div>
                 )}
             </div>
             {/* Sidebar Drag Handle */}
             {isSidebarOpen && (
                 <div 
                    onMouseDown={startResizingSidebar}
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-milla-500/50 z-20"
                 />
             )}
        </div>

        {/* Split Container */}
        <div className="flex-1 flex flex-col md:flex-row min-w-0 relative bg-slate-950">
             
             {/* Code Editor Pane */}
             <div 
                className={`flex flex-col relative ${activeTab === 'split' ? '' : activeTab === 'code' ? 'w-full h-full' : 'hidden'}`}
                style={activeTab === 'split' ? { width: `${editorWidthPercentage}%` } : {}}
             >
                <div className="flex-1 overflow-auto custom-scrollbar bg-slate-950">
                    <Editor
                        value={code}
                        onValueChange={setCode}
                        highlight={highlightCode}
                        padding={20}
                        className="font-mono text-sm min-h-full"
                        style={{ fontFamily: '"Fira Code", monospace', fontSize: 13 }}
                    />
                </div>
                {/* Lint Status Bar */}
                <div className="bg-slate-900 p-1 text-[10px] text-slate-500 border-t border-slate-800 flex justify-between items-center px-2 shrink-0">
                    <div className={`flex items-center gap-2 ${lintError ? 'text-red-400' : 'text-green-500'}`}>
                        {lintError ? <><span>❌</span> <span className="truncate max-w-[150px]" title={lintError}>{lintError}</span></> : <><span>✅</span> Valid</>}
                    </div>
                    <div className="opacity-70">{code.length} chars</div>
                </div>
             </div>

             {/* Split Drag Handle (Desktop Only) */}
             {activeTab === 'split' && (
                 <div 
                    onMouseDown={startResizingSplit}
                    className="w-1 h-full bg-slate-800 hover:bg-milla-500 cursor-col-resize z-20 shrink-0 hidden md:block"
                 />
             )}

             {/* Preview Pane */}
             <div 
                className={`flex flex-col relative bg-white ${activeTab === 'split' ? 'flex-1' : activeTab === 'preview' ? 'w-full h-full' : 'hidden'}`}
             >
                <div className="flex-1 relative">
                    <iframe
                        key={key}
                        title="Sandbox Preview"
                        srcDoc={getAugmentedCode(debouncedCode)} // Use debounced code
                        className="absolute inset-0 w-full h-full border-none"
                        sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin"
                    />
                </div>
                
                {/* Console Pane (Attached to bottom of Preview/Split Area) */}
                <div 
                    style={{ height: isConsoleOpen ? consoleHeight : 32 }}
                    className={`border-t border-slate-300 bg-slate-900 flex flex-col relative shrink-0 text-slate-100 ${isResizingConsole ? '' : 'transition-all duration-300'}`}
                >
                    {/* Console Drag Handle */}
                    <div 
                        onMouseDown={startResizingConsole}
                        className="absolute top-0 left-0 w-full h-1 cursor-row-resize hover:bg-milla-500/50 z-20"
                    />

                    <div onClick={() => setIsConsoleOpen(!isConsoleOpen)} className="flex items-center justify-between px-3 py-1.5 bg-slate-800 cursor-pointer select-none h-8 border-b border-slate-700">
                        <span className="text-xs font-mono text-slate-400 font-bold">Terminal Output</span>
                        <div className="flex items-center gap-2">
                             <button onClick={(e) => { e.stopPropagation(); setLogs([]); }} className="text-[10px] uppercase text-slate-500 hover:text-white">Clear</button>
                             <span className={`text-[10px] text-slate-500 transition-transform ${isConsoleOpen ? '' : 'rotate-180'}`}>▼</span>
                        </div>
                    </div>
                    {isConsoleOpen && (
                        <div className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1 bg-slate-950">
                            {logs.map((l, i) => (
                                <div key={i} className={`flex gap-2 break-all ${l.level === 'error' ? 'text-red-400' : l.level === 'warn' ? 'text-yellow-400' : 'text-slate-300'}`}>
                                    <span className="opacity-50">[{l.timestamp.split(' ')[0]}]</span>
                                    <span>{l.args.join(' ')}</span>
                                </div>
                            ))}
                            <div ref={logsEndRef} />
                        </div>
                    )}
                </div>
             </div>
        </div>
      </div>
    </div>
  );
};

export default Sandbox;
