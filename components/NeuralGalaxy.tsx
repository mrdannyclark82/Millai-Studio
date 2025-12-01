import React, { useEffect, useRef, useState } from 'react';
import { geminiService } from '../services/geminiService';
import { Message } from '../types';
import { THEMES, ThemeType } from '../utils/theme';

interface Node {
  id: string;
  group: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface Link {
  source: string;
  target: string;
  value: number;
}

interface NeuralGalaxyProps {
  messages: Message[];
  theme: ThemeType;
  isOpen: boolean; // Acts as "Visible" toggle
  mode?: 'modal' | 'background'; // New mode prop
  onClose?: () => void;
  onRecall?: (topic: string) => void;
}

const NeuralGalaxy: React.FC<NeuralGalaxyProps> = ({ messages, theme, isOpen, mode = 'modal', onClose, onRecall }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<{nodes: Node[], links: Link[]} | null>(null);
  const [loading, setLoading] = useState(false);
  const requestRef = useRef<number>(0);
  const draggingRef = useRef<Node | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const isBackground = mode === 'background';

  // Load Graph Data
  useEffect(() => {
    // If it's open (either modal or background) and we have no data, load it.
    // If background mode, we might want to auto-refresh occasionally, but for now load once.
    if (isOpen && !data && !loading) {
      setLoading(true);
      geminiService.generateMemoryGraph(messages).then(graph => {
        // Initialize positions
        const width = window.innerWidth;
        const height = window.innerHeight;
        const nodes = graph.nodes.map(n => ({
            ...n,
            x: width/2 + (Math.random() - 0.5) * 200,
            y: height/2 + (Math.random() - 0.5) * 200,
            vx: 0,
            vy: 0,
            radius: 5 + (Math.random() * 10) + (n.group === 1 ? 15 : 0) // Core nodes bigger
        }));
        setData({ nodes, links: graph.links });
        setLoading(false);
      });
    }
  }, [isOpen, messages, data, loading]);

  // Simulation Loop
  useEffect(() => {
    if (!isOpen || !data || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width = window.innerWidth;
    const height = canvas.height = window.innerHeight;

    const colors = THEMES[theme];
    const nodeColors = {
        1: `rgb(${colors[500]})`, // Core
        2: '#06b6d4', // Tech (Cyan)
        3: '#ec4899', // Love (Pink)
        4: '#f59e0b'  // Misc (Amber)
    };

    const animate = () => {
        // Clear
        // In background mode, we want a transparent/translucent clear to allow stacking if needed,
        // but generally we draw the full BG color.
        ctx.fillStyle = isBackground ? 'rgba(2, 6, 23, 0.2)' : '#020617'; // Slate 950 with trail effect in BG? No, solid for BG.
        // Actually for background we might want it to be fully opaque Slate 950 to cover anything behind, 
        // OR if we replace Orb, it acts as the base.
        ctx.fillStyle = '#020617'; 
        ctx.fillRect(0, 0, width, height);
        
        // Draw Grid (Cyber/Space effect) - Fainter in background
        ctx.strokeStyle = isBackground ? '#0f172a' : '#1e293b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let i=0; i<width; i+=50) { ctx.moveTo(i,0); ctx.lineTo(i,height); }
        for(let j=0; j<height; j+=50) { ctx.moveTo(0,j); ctx.lineTo(width,j); }
        ctx.stroke();

        // Physics Updates
        data.nodes.forEach(node => {
            // Repulsion
            data.nodes.forEach(other => {
                if (node !== other) {
                    const dx = node.x - other.x;
                    const dy = node.y - other.y;
                    const dist = Math.sqrt(dx*dx + dy*dy) || 1;
                    const force = 1000 / (dist * dist);
                    const fx = (dx/dist) * force;
                    const fy = (dy/dist) * force;
                    node.vx += fx;
                    node.vy += fy;
                }
            });

            // Center Gravity - looser in background
            const centerStrength = isBackground ? 0.0001 : 0.0005;
            const dx = (width/2) - node.x;
            const dy = (height/2) - node.y;
            node.vx += dx * centerStrength;
            node.vy += dy * centerStrength;

            // Dragging override
            if (node === draggingRef.current) {
                node.x = mouseRef.current.x;
                node.y = mouseRef.current.y;
                node.vx = 0;
                node.vy = 0;
            } else {
                // Apply Velocity
                // Slower movement in background
                const speedFactor = isBackground ? 0.5 : 1;
                node.x += node.vx * speedFactor;
                node.y += node.vy * speedFactor;
                // Friction
                node.vx *= 0.9;
                node.vy *= 0.9;
            }
        });

        // Spring Forces (Links)
        data.links.forEach(link => {
            const source = data.nodes.find(n => n.id === link.source);
            const target = data.nodes.find(n => n.id === link.target);
            if (source && target) {
                const dx = target.x - source.x;
                const dy = target.y - source.y;
                const dist = Math.sqrt(dx*dx + dy*dy) || 1;
                const desired = isBackground ? 200 : 150; // Spaced out in BG
                const force = (dist - desired) * 0.005; // Spring k
                const fx = (dx/dist) * force;
                const fy = (dy/dist) * force;

                source.vx += fx;
                source.vy += fy;
                target.vx -= fx;
                target.vy -= fy;

                // Draw Line
                const opacity = isBackground ? 0.1 : 0.2;
                ctx.strokeStyle = `rgba(${colors[400].split(' ').join(',')}, ${opacity})`;
                ctx.lineWidth = 1 + link.value;
                ctx.beginPath();
                ctx.moveTo(source.x, source.y);
                ctx.lineTo(target.x, target.y);
                ctx.stroke();
            }
        });

        // Draw Nodes
        data.nodes.forEach(node => {
            // @ts-ignore
            const color = nodeColors[node.group] || colors[500];
            
            ctx.shadowBlur = isBackground ? 5 : 15;
            ctx.shadowColor = color;
            ctx.fillStyle = color;
            
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Text - Faded in background
            ctx.fillStyle = isBackground ? 'rgba(226, 232, 240, 0.4)' : '#e2e8f0';
            ctx.font = isBackground ? '9px Inter' : '10px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(node.id, node.x, node.y + node.radius + 15);
        });

        requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isOpen, data, theme, isBackground]);

  // Mouse Handlers (Only active in Modal Mode for dragging, maybe subtle interaction in BG?)
  // Let's allow subtle interaction in BG too if z-index allows
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!data) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const clicked = data.nodes.find(n => Math.hypot(n.x - x, n.y - y) < n.radius + 5);
    if (clicked) {
        draggingRef.current = clicked;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseUp = (e: React.MouseEvent) => {
      // Check for click (if didn't move much)
      if (draggingRef.current && onRecall) {
          const rect = canvasRef.current!.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          if (Math.hypot(draggingRef.current.x - x, draggingRef.current.y - y) < 5) {
               // It was a click
               if (mode === 'modal') {
                   onRecall(draggingRef.current.id);
                   if (onClose) onClose();
               }
          }
      }
      draggingRef.current = null;
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 transition-all duration-1000 ${isBackground ? 'z-0 pointer-events-auto' : 'z-[60] bg-slate-950 animate-in fade-in'}`}>
        {loading && mode === 'modal' && (
            <div className="absolute inset-0 flex items-center justify-center flex-col gap-4 text-milla-400 z-10">
                <div className="w-12 h-12 rounded-full border-4 border-milla-500/30 border-t-milla-500 animate-spin" />
                <p className="animate-pulse font-mono text-sm">Mapping neural pathways...</p>
            </div>
        )}
        <canvas 
            ref={canvasRef} 
            className={`w-full h-full ${mode === 'modal' ? 'cursor-move' : 'cursor-default'}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
        />
        
        {/* HUD - Only in Modal */}
        {mode === 'modal' && (
            <>
                <div className="absolute top-6 left-6 pointer-events-none">
                    <h1 className="text-3xl font-bold text-white tracking-tighter shadow-black drop-shadow-lg">Neural Galaxy</h1>
                    <p className="text-milla-400 text-sm font-mono mt-1">Interactive Memory Graph</p>
                </div>

                <div className="absolute bottom-6 left-6 pointer-events-none text-xs text-slate-500 space-y-1">
                    <p>● Core Memories</p>
                    <p className="text-cyan-400">● Technical</p>
                    <p className="text-pink-400">● Personal</p>
                </div>

                <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 bg-slate-800/50 hover:bg-slate-700 rounded-full text-white border border-slate-700 transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </>
        )}
    </div>
  );
};

export default NeuralGalaxy;