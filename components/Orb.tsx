
import React, { useEffect, useRef } from 'react';
import { ThemeType, THEMES } from '../utils/theme';

interface OrbProps {
  theme: ThemeType;
  intensity?: number; // 0-1, affects speed/brightness
}

interface Point {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  angle: number;
}

const Orb: React.FC<OrbProps> = ({ theme, intensity = 0.5 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  // State Refs (mutable, no re-renders)
  const orbsRef = useRef<Point[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const themeRef = useRef(theme);
  
  // Current displayed colors [r, g, b]
  const colorsRef = useRef<{
    orbs: number[][]; 
    bg: number[];
  } | null>(null);

  // Sync theme ref
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  // Helpers
  const parseColor = (str: string) => str.split(' ').map(Number);
  const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 1. Initialize Orbs (Only once)
    if (orbsRef.current.length === 0) {
      for (let i = 0; i < 3; i++) {
        orbsRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: 0,
          vy: 0,
          radius: Math.min(canvas.width, canvas.height) * 0.45,
          angle: Math.random() * Math.PI * 2
        });
      }
    }

    // 2. Initialize Colors (Only if null)
    if (!colorsRef.current) {
        const t = THEMES[theme]; // Use prop theme for initial setup
        colorsRef.current = {
            orbs: [parseColor(t[400]), parseColor(t[500]), parseColor(t[600])],
            bg: parseColor(t[950])
        };
    }

    // 3. Event Listeners
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { 
        x: (e.clientX / window.innerWidth) - 0.5, 
        y: (e.clientY / window.innerHeight) - 0.5 
      };
    };

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);
    handleResize();

    // 4. Animation Loop
    const animate = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx || !colorsRef.current) return;

      // --- Color Smoothing ---
      // We drift the current colors towards the target theme colors by 5% every frame
      const targetTheme = THEMES[themeRef.current];
      const targetBg = parseColor(targetTheme[950]);
      const targetOrbs = [parseColor(targetTheme[400]), parseColor(targetTheme[500]), parseColor(targetTheme[600])];

      // Blend Background
      colorsRef.current.bg = colorsRef.current.bg.map((c, i) => lerp(c, targetBg[i], 0.05));
      
      // Blend Orbs
      colorsRef.current.orbs = colorsRef.current.orbs.map((cArray, i) => {
          const target = targetOrbs[i];
          return cArray.map((val, channel) => lerp(val, target[channel], 0.05));
      });

      // --- Drawing ---
      // Clear & Draw BG
      const [br, bg, bb] = colorsRef.current.bg.map(Math.round);
      ctx.fillStyle = `rgb(${br}, ${bg}, ${bb})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Orbs
      ctx.globalCompositeOperation = 'screen'; // Blending mode for "glowing" effect

      orbsRef.current.forEach((orb, i) => {
        // Physics
        const speed = 0.002 + (intensity * 0.005);
        orb.angle += speed;
        
        // Gentle circular motion + Mouse Parallax
        const oscX = Math.cos(orb.angle) * 100;
        const oscY = Math.sin(orb.angle) * 100;
        const mouseX = mouseRef.current.x * 200 * (i + 1);
        const mouseY = mouseRef.current.y * 200 * (i + 1);

        let x = orb.x + oscX + mouseX;
        let y = orb.y + oscY + mouseY;

        // Wrap around screen edges nicely
        if (x < -orb.radius) x = canvas.width + orb.radius;
        if (x > canvas.width + orb.radius) x = -orb.radius;
        if (y < -orb.radius) y = canvas.height + orb.radius;
        if (y > canvas.height + orb.radius) y = -orb.radius;
        
        // Gradient
        const [r, g, b] = colorsRef.current!.orbs[i % 3].map(Math.round);
        const alpha = 0.4 + (intensity * 0.2); // Pulse with intensity
        
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, orb.radius);
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, orb.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalCompositeOperation = 'source-over';
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(requestRef.current);
    };
  }, [intensity]); // Re-bind only if intensity changes drastically (optional, mostly stable)

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
    />
  );
};

export default Orb;
