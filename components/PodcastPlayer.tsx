import React, { useState, useRef, useEffect } from 'react';
import { geminiService, PodcastLine } from '../services/geminiService';

interface PodcastPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

const PodcastPlayer: React.FC<PodcastPlayerProps> = ({ isOpen, onClose }) => {
  const [topic, setTopic] = useState('');
  const [status, setStatus] = useState<'idle' | 'scripting' | 'recording' | 'playing'>('idle');
  const [script, setScript] = useState<PodcastLine[]>([]);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Visualization
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const startTimeRef = useRef(0);
  const animationRef = useRef<number>(0);

  // Dragging State
  const [position, setPosition] = useState({ x: 20, y: window.innerHeight - 300 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
        stopAudio();
    }
  }, [isOpen]);

  const stopAudio = () => {
      if (sourceRef.current) {
          sourceRef.current.stop();
          sourceRef.current = null;
      }
      setIsPlaying(false);
      cancelAnimationFrame(animationRef.current);
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    stopAudio();
    setStatus('scripting');
    setScript([]);
    
    try {
        // 1. Script
        const lines = await geminiService.generatePodcastScript(topic);
        setScript(lines);
        
        // 2. Audio
        setStatus('recording');
        const buffer = await geminiService.generatePodcastAudio(lines);
        setAudioBuffer(buffer);
        setStatus('playing'); // Ready to play
        
    } catch (e) {
        console.error(e);
        alert("Podcast generation failed.");
        setStatus('idle');
    }
  };

  const togglePlayback = () => {
      if (!audioBuffer) return;

      if (isPlaying) {
          stopAudio();
      } else {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          const ctx = audioCtxRef.current;
          analyserRef.current = ctx.createAnalyser();
          analyserRef.current.fftSize = 64;
          
          sourceRef.current = ctx.createBufferSource();
          sourceRef.current.buffer = audioBuffer;
          sourceRef.current.connect(analyserRef.current);
          analyserRef.current.connect(ctx.destination);
          
          sourceRef.current.onended = () => {
              setIsPlaying(false);
              setCurrentTime(0);
          };

          sourceRef.current.start();
          startTimeRef.current = ctx.currentTime;
          setIsPlaying(true);
          drawVisualizer();
      }
  };

  const drawVisualizer = () => {
      if (!canvasRef.current || !analyserRef.current) return;
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const draw = () => {
          if (!isPlaying) return;
          animationRef.current = requestAnimationFrame(draw);
          
          analyserRef.current!.getByteFrequencyData(dataArray);
          
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const barWidth = (canvas.width / bufferLength) * 2.5;
          let x = 0;

          for (let i = 0; i < bufferLength; i++) {
              const barHeight = (dataArray[i] / 255) * canvas.height;
              
              // Milla Pink Gradient
              const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
              gradient.addColorStop(0, '#be185d'); // milla-700
              gradient.addColorStop(1, '#ec4899'); // milla-500
              
              ctx.fillStyle = gradient;
              ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
              x += barWidth + 1;
          }

          // Update progress
          if (audioCtxRef.current && audioBuffer) {
              const el = audioCtxRef.current.currentTime - startTimeRef.current;
              setCurrentTime(Math.min(el, audioBuffer.duration));
          }
      };
      draw();
  };

  // Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
      setIsDragging(true);
      dragOffset.current = {
          x: e.clientX - position.x,
          y: e.clientY - position.y
      };
  };

  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          if (isDragging) {
              setPosition({
                  x: e.clientX - dragOffset.current.x,
                  y: e.clientY - dragOffset.current.y
              });
          }
      };
      const handleMouseUp = () => setIsDragging(false);
      
      if (isDragging) {
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
      }
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
  }, [isDragging]);

  if (!isOpen) return null;

  return (
    <div 
        style={{ left: position.x, top: position.y }}
        className="fixed z-50 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
    >
        {/* Header */}
        <div 
            onMouseDown={handleMouseDown}
            className="bg-slate-800 p-3 flex items-center justify-between cursor-move select-none"
        >
            <div className="flex items-center gap-2 text-white font-bold text-sm">
                <span className="text-indigo-400">🎙️</span> Deep Dive
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-4">
            {status === 'idle' ? (
                <>
                    <input 
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="Enter a topic..."
                        className="bg-slate-950 text-white text-sm p-3 rounded-lg border border-slate-700 focus:border-milla-500 focus:outline-none"
                    />
                    <button 
                        onClick={handleGenerate}
                        disabled={!topic.trim()}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg font-medium text-sm transition-colors"
                    >
                        Create Podcast
                    </button>
                </>
            ) : (
                <div className="space-y-3">
                     {/* Visualizer / Status */}
                     <div className="h-24 bg-slate-950 rounded-lg flex items-center justify-center relative overflow-hidden border border-slate-800">
                         {status === 'playing' ? (
                             <canvas ref={canvasRef} width={280} height={96} className="w-full h-full" />
                         ) : (
                             <div className="flex flex-col items-center gap-2 text-indigo-400 animate-pulse">
                                 {status === 'scripting' ? (
                                    <><span>✍️</span><span className="text-xs">Writing Script...</span></>
                                 ) : (
                                    <><span>🎙️</span><span className="text-xs">Recording Audio...</span></>
                                 )}
                             </div>
                         )}
                         
                         {status === 'playing' && (
                             <div className="absolute bottom-0 left-0 h-1 bg-indigo-600 transition-all duration-100" style={{ width: `${(currentTime / (audioBuffer?.duration || 1)) * 100}%` }} />
                         )}
                     </div>

                     {/* Controls */}
                     {status === 'playing' && (
                         <div className="flex justify-center gap-4">
                             <button onClick={togglePlayback} className="p-3 bg-white text-black rounded-full hover:scale-105 active:scale-95 transition-transform">
                                 {isPlaying ? (
                                     <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                                 ) : (
                                     <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                 )}
                             </button>
                             <button onClick={() => { setStatus('idle'); setTopic(''); }} className="p-3 bg-slate-800 text-slate-300 rounded-full hover:text-white">
                                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                             </button>
                         </div>
                     )}

                     {/* Script Preview */}
                     <div className="max-h-32 overflow-y-auto custom-scrollbar bg-slate-800/50 p-2 rounded text-xs space-y-2">
                         {script.map((line, i) => (
                             <div key={i} className="flex gap-2">
                                 <span className={`font-bold ${line.speaker === 'Milla' ? 'text-milla-400' : 'text-cyan-400'}`}>{line.speaker}:</span>
                                 <span className="text-slate-300">{line.text}</span>
                             </div>
                         ))}
                     </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default PodcastPlayer;