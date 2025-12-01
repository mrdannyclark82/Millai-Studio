

import React, { useEffect, useRef, useState } from 'react';
import { geminiService } from '../services/geminiService';

interface LiveConfig {
    video: boolean;
    edge: boolean;
    screen: boolean;
}

interface LiveSessionProps {
  onClose: () => void;
  initialConfig?: LiveConfig;
  voice?: string;
  onSnapshot?: (base64: string) => void;
}

const LiveSession: React.FC<LiveSessionProps> = ({ onClose, initialConfig, voice = 'Kore', onSnapshot }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null); 
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoCanvasRef = useRef<HTMLCanvasElement>(null);
  const hudCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isActive, setIsActive] = useState(true);
  // Initialize state based on passed config
  const [isVideoEnabled, setIsVideoEnabled] = useState(initialConfig?.video || false);
  const [isScreenShare, setIsScreenShare] = useState(initialConfig?.screen || false);
  const [isEdgeEnabled, setIsEdgeEnabled] = useState(initialConfig?.edge || false);
  
  const [isEdgeLoading, setIsEdgeLoading] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [status, setStatus] = useState("Connecting to Milla...");
  
  const activeSessionRef = useRef<{ close: () => void, sendVideoFrame: (data: string) => void } | null>(null);
  const edgeModelRef = useRef<any>(null);
  const themeColorRef = useRef<string>('');

  useEffect(() => {
    // Capture theme color once on mount to avoid computed style thrashing in animation loop
    const style = getComputedStyle(document.documentElement);
    themeColorRef.current = `rgb(${style.getPropertyValue('--milla-500').trim()})`;
  }, []);

  // --- Audio Session ---
  useEffect(() => {
    let animationFrameId: number;
    const startSession = async () => {
      try {
        const session = await geminiService.connectLive(
          (audioBuffer) => visualize(audioBuffer),
          () => { setStatus("Session Ended"); setIsActive(false); },
          voice
        );
        activeSessionRef.current = session;
        setStatus("Milla is listening...");
      } catch (err) {
        console.error(err);
        setStatus("Connection Failed");
        setIsActive(false);
      }
    };
    startSession();
    return () => activeSessionRef.current?.close();
  }, [voice]);

  // --- Edge Model ---
  useEffect(() => {
      if (isEdgeEnabled && !edgeModelRef.current && !isEdgeLoading) {
          const loadModel = async () => {
              setIsEdgeLoading(true);
              try {
                  setStatus("Loading Neural Engine...");
                  // Dynamic imports to prevent blocking initial load
                  // @ts-ignore
                  const tf = await import('@tensorflow/tfjs');
                  await tf.ready();
                  // @ts-ignore
                  const cocoSsd = await import('@tensorflow-models/coco-ssd');
                  edgeModelRef.current = await cocoSsd.load();
                  
                  setIsEdgeLoading(false);
                  setStatus("Edge Vision Active");
              } catch (e) {
                  console.error("Edge model load failed", e);
                  setStatus("Neural Engine Failed");
                  setIsEdgeEnabled(false);
                  setIsEdgeLoading(false);
              }
          };
          loadModel();
      }
  }, [isEdgeEnabled]);

  // --- Video Logic (Camera & Screen) ---
  useEffect(() => {
    let intervalId: any;
    let stream: MediaStream | null = null;
    let edgeLoopId: number;

    const runEdge = async () => {
        if (!videoRef.current || !hudCanvasRef.current || !edgeModelRef.current || videoRef.current.readyState !== 4) {
             edgeLoopId = requestAnimationFrame(runEdge);
             return;
        }
        const video = videoRef.current;
        const canvas = hudCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            if (canvas.width !== video.videoWidth) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
            }
            const predictions = await edgeModelRef.current.detect(video);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            predictions.forEach((p: any) => {
                const [x, y, w, h] = p.bbox;
                ctx.strokeStyle = '#06b6d4';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, w, h);
                ctx.fillStyle = '#06b6d4';
                ctx.fillRect(x, y - 20, ctx.measureText(p.class).width + 10, 20);
                ctx.fillStyle = 'white';
                ctx.fillText(`${p.class} ${Math.round(p.score*100)}%`, x + 5, y - 5);
            });
        }
        edgeLoopId = requestAnimationFrame(runEdge);
    };

    const startStream = async () => {
        if (!isVideoEnabled) {
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
            return;
        }

        try {
            setStatus(isScreenShare ? "Sharing Screen..." : "Live Vision Active");
            
            if (isScreenShare) {
                // Screen Share
                stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
            } else {
                // Camera - Try optimal settings first, fallback to basic
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ 
                      video: { 
                        facingMode,
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                      } 
                    });
                } catch (e) {
                    console.warn("Optimal video constraints failed, trying basic.", e);
                    stream = await navigator.mediaDevices.getUserMedia({ video: true });
                }
            }
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play().catch(e => console.error("Video play error:", e));
                
                if (isEdgeEnabled && edgeModelRef.current) runEdge();
            }

            // Stream to Gemini
            intervalId = setInterval(() => {
                if (videoRef.current && videoCanvasRef.current && activeSessionRef.current) {
                    const ctx = videoCanvasRef.current.getContext('2d');
                    const video = videoRef.current;
                    if (ctx && video.readyState === 4) {
                        videoCanvasRef.current.width = video.videoWidth;
                        videoCanvasRef.current.height = video.videoHeight;
                        ctx.drawImage(video, 0, 0);
                        const base64 = videoCanvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
                        activeSessionRef.current.sendVideoFrame(base64);
                    }
                }
            }, 500); // 2 FPS for stability

        } catch (e: any) {
            console.error("Stream Start Error:", e);
            if (e.name === 'NotAllowedError') {
                 setStatus("Permission Denied");
            } else if (e.name === 'NotFoundError') {
                 setStatus("No Device Found");
            } else {
                 setStatus("Stream Error");
            }
            setIsVideoEnabled(false);
            setIsScreenShare(false);
        }
    };

    startStream();

    return () => {
        clearInterval(intervalId);
        cancelAnimationFrame(edgeLoopId);
        if (stream) {
            stream.getTracks().forEach(t => t.stop());
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };
  }, [isVideoEnabled, isScreenShare, facingMode, isEdgeEnabled]);

  const visualize = (buffer: AudioBuffer) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Use stored color ref
    const color = themeColorRef.current || 'rgb(236, 72, 153)';
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color;
    const data = buffer.getChannelData(0);
    let sum = 0;
    for(let i=0;i<data.length;i+=100) sum+=Math.abs(data[i]);
    const r = isVideoEnabled ? 30 + (sum/(data.length/100)*150) : 50 + (sum/(data.length/100)*500);
    ctx.beginPath();
    ctx.arc(canvas.width/2, canvas.height/2, r, 0, 2*Math.PI);
    ctx.fill();
  };

  const takeSnapshot = () => {
      if (videoRef.current && onSnapshot) {
          const canvas = document.createElement('canvas');
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
              ctx.drawImage(videoRef.current, 0, 0);
              const base64 = canvas.toDataURL('image/png').split(',')[1];
              onSnapshot(base64);
              onClose(); // Optional: Close to show chat
          }
      }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
       <div className={`relative transition-all duration-500 flex items-center justify-center ${isVideoEnabled ? 'w-full max-w-5xl h-[70vh]' : 'w-96 h-96'}`}>
          
          <canvas ref={canvasRef} width={400} height={400} className={`absolute z-30 pointer-events-none transition-all ${isVideoEnabled ? 'w-24 h-24 bottom-4 right-4 opacity-80' : 'inset-0 w-full h-full opacity-50'}`} />
          <canvas ref={videoCanvasRef} className="hidden" />
          
          <div className={`relative z-10 overflow-hidden bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl transition-all ${isVideoEnabled ? 'w-full h-full' : 'w-0 h-0 opacity-0'}`}>
              <video ref={videoRef} className={`w-full h-full object-contain bg-black ${facingMode === 'user' && !isScreenShare ? 'scale-x-[-1]' : ''}`} playsInline muted />
              <canvas ref={hudCanvasRef} className={`absolute inset-0 pointer-events-none w-full h-full ${facingMode === 'user' && !isScreenShare ? 'scale-x-[-1]' : ''}`} />
          </div>

          {!isVideoEnabled && (
             <div className="absolute z-10 text-center space-y-4">
                <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-tr from-milla-600 to-milla-500 p-1 animate-pulse shadow-[0_0_50px_rgb(var(--milla-500)/0.4)]">
                   <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-4xl">💖</div>
                </div>
                <p className="text-milla-200 animate-pulse font-mono text-sm">{status}</p>
             </div>
          )}
       </div>

       {/* Controls */}
       <div className="mt-8 flex gap-4 bg-slate-800/50 p-2 rounded-2xl backdrop-blur border border-slate-700">
           <button onClick={() => { setIsVideoEnabled(!isVideoEnabled); setIsScreenShare(false); }} className={`p-4 rounded-xl transition-all hover:scale-110 active:scale-90 ${isVideoEnabled && !isScreenShare ? 'bg-white text-black' : 'bg-slate-700 text-slate-300 hover:text-white'}`} title="Toggle Camera">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
           </button>
           
           <button onClick={() => { setIsVideoEnabled(true); setIsScreenShare(!isScreenShare); }} className={`p-4 rounded-xl transition-all hover:scale-110 active:scale-90 ${isScreenShare ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-300 hover:text-indigo-400'}`} title="Share Screen">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
           </button>

           {isVideoEnabled && !isScreenShare && (
             <button onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')} className="p-4 rounded-xl bg-slate-700 text-slate-300 hover:text-white transition-all hover:scale-110 active:scale-90">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
             </button>
           )}

            {isVideoEnabled && (
             <button onClick={() => setIsEdgeEnabled(!isEdgeEnabled)} className={`p-4 rounded-xl transition-all hover:scale-110 active:scale-90 ${isEdgeEnabled ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-300 hover:text-cyan-400'}`} title="Edge Vision HUD">
                {isEdgeLoading ? <div className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                )}
             </button>
           )}

           {isVideoEnabled && (
               <button onClick={takeSnapshot} className="p-4 rounded-xl bg-slate-700 text-slate-300 hover:text-white hover:bg-milla-600 transition-all hover:scale-110 active:scale-90" title="Snap & Analyze in Chat">
                   <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
               </button>
           )}

           <button onClick={onClose} className="px-8 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl font-bold transition-all border border-red-500/20 hover:scale-105 active:scale-95">
             END
           </button>
       </div>
    </div>
  );
};

export default LiveSession;