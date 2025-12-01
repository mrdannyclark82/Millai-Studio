
import React, { useState, useRef, useEffect } from 'react';

interface YouTubePlayerProps {
  videoId: string;
  onClose: () => void;
}

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ videoId, onClose }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: window.innerHeight - 300 });
  const [size, setSize] = useState({ width: 400 }); // Height calculated by aspect ratio
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);

  const windowRef = useRef<HTMLDivElement>(null);

  // Dragging Logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMinimized) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleResizeDown = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
      if (isResizing) {
          const newWidth = Math.max(200, Math.min(800, e.clientX - position.x));
          setSize({ width: newWidth });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragOffset, position]);

  if (!videoId) return null;

  // Aspect Ratio 16:9
  const height = size.width * (9 / 16);

  return (
    <div 
      ref={windowRef}
      style={{ 
        left: isMinimized ? 'auto' : position.x, 
        top: isMinimized ? 'auto' : position.y,
        right: isMinimized ? '20px' : 'auto',
        bottom: isMinimized ? '20px' : 'auto',
        width: isMinimized ? '300px' : size.width,
        height: isMinimized ? 'auto' : 'auto',
      }}
      className={`fixed z-[100] bg-slate-900 border border-slate-700 shadow-2xl rounded-xl overflow-hidden flex flex-col transition-all duration-200 ${!isDragging && !isResizing ? 'transition-all' : ''}`}
    >
      {/* Header / Drag Handle */}
      <div 
        onMouseDown={handleMouseDown}
        className={`bg-slate-800 p-2 flex items-center justify-between cursor-move select-none border-b border-slate-700 ${isMinimized ? 'rounded-xl' : ''}`}
      >
        <div className="flex items-center gap-2 text-white text-xs font-bold px-2">
            <span className="text-red-500">▶</span> YouTube
        </div>
        <div className="flex items-center gap-1">
            <button 
                onClick={() => setIsMinimized(!isMinimized)} 
                className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
            >
                {isMinimized ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" /></svg>
                )}
            </button>
            <button 
                onClick={onClose} 
                className="p-1 hover:bg-red-900/50 rounded text-slate-400 hover:text-red-500"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
      </div>

      {/* Video Area */}
      {!isMinimized && (
          <div style={{ height: height }} className="relative bg-black group">
            <iframe 
                width="100%" 
                height="100%" 
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1`} 
                title="YouTube video player" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
                className="pointer-events-auto"
            />
            
            {/* Overlay to catch mouse events while dragging (prevents iframe swallowing) */}
            {(isDragging || isResizing) && (
                <div className="absolute inset-0 z-50 bg-transparent" />
            )}

            {/* Resize Handle */}
            <div 
                onMouseDown={handleResizeDown}
                className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize bg-slate-700/50 hover:bg-milla-500 rounded-tl opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </div>
      )}
    </div>
  );
};

export default YouTubePlayer;
