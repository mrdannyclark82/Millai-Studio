import React, { useEffect, useState } from 'react';
import { geminiService } from '../services/geminiService';

interface MorningSyncProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Briefing {
  greeting: string;
  focus: string;
  nostalgia: string;
  suggestion: string;
}

const MorningSync: React.FC<MorningSyncProps> = ({ isOpen, onClose }) => {
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [weatherData, setWeatherData] = useState<{temp: number, desc: string} | null>(null);

  // Helper to decode OpenMeteo WMO codes
  const getWeatherDesc = (code: number) => {
    if (code === 0) return "Clear Sky ☀️";
    if (code <= 3) return "Partly Cloudy ⛅";
    if (code <= 48) return "Foggy 🌫️";
    if (code <= 55) return "Drizzle 🌧️";
    if (code <= 65) return "Rainy ☔";
    if (code <= 75) return "Snowy ❄️";
    if (code <= 82) return "Showers 🌦️";
    return "Thunderstorm ⛈️";
  };

  useEffect(() => {
    if (!isOpen) return;
    
    // 1. Get Location & Weather
    const loadDashboard = async () => {
      setLoading(true);
      setError('');
      
      try {
        // Default to a fallback if geo denied
        let lat = 37.7749; // SF
        let lon = -122.4194;

        try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
            });
            lat = pos.coords.latitude;
            lon = pos.coords.longitude;
        } catch (e) {
            console.warn("Geo access denied/failed, using default.");
        }

        // Fetch Weather (Open-Meteo)
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`);
        const weatherJson = await weatherRes.json();
        
        const temp = weatherJson.current.temperature_2m;
        const desc = getWeatherDesc(weatherJson.current.weather_code);
        setWeatherData({ temp, desc });

        // 2. Generate Briefing via Gemini
        const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        const weatherCtx = `${temp}°F and ${desc}`;
        
        const aiBrief = await geminiService.generateMorningBriefing(weatherCtx, dateStr);
        if (aiBrief) {
            setBriefing(aiBrief);
        } else {
            setError("Milla is sleeping in... (API Error)");
        }

      } catch (e) {
          console.error(e);
          setError("Could not load morning sync.");
      } finally {
          setLoading(false);
      }
    };

    loadDashboard();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-500 font-sans">
        
        {loading ? (
             <div className="text-center space-y-4">
                 <div className="w-16 h-16 rounded-full border-4 border-milla-500/30 border-t-milla-500 animate-spin mx-auto" />
                 <h2 className="text-2xl font-light text-white animate-pulse">Syncing with Milla...</h2>
                 <p className="text-slate-400 text-sm">Checking the weather forecast & your schedule</p>
             </div>
        ) : error ? (
             <div className="text-center space-y-4">
                 <div className="text-4xl">😴</div>
                 <p className="text-red-400">{error}</p>
                 <button onClick={onClose} className="px-6 py-2 bg-slate-800 text-white rounded-full">Skip to Chat</button>
             </div>
        ) : (
            <div className="w-full max-w-4xl p-6 md:p-12 flex flex-col h-full md:h-auto overflow-y-auto">
                {/* Header */}
                <div className="mb-8 text-center md:text-left">
                    <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-milla-300 to-indigo-300 bg-clip-text text-transparent mb-2">Good Morning, Danny</h1>
                    <p className="text-slate-400 text-lg">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    
                    {/* Greeting Card */}
                    <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-milla-900/40 to-slate-900/40 p-6 rounded-3xl border border-white/5 backdrop-blur-md shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                             <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                        </div>
                        <h3 className="text-milla-400 font-mono text-sm uppercase tracking-wider mb-2">Message from Milla</h3>
                        <p className="text-xl md:text-2xl text-white font-light italic leading-relaxed">"{briefing?.greeting}"</p>
                    </div>

                    {/* Weather & Fit */}
                    <div className="bg-slate-900/60 p-6 rounded-3xl border border-white/5 flex flex-col justify-between">
                         <div className="flex justify-between items-start">
                             <div>
                                 <h3 className="text-cyan-400 font-mono text-sm uppercase tracking-wider mb-1">Current Conditions</h3>
                                 <div className="text-4xl text-white font-bold">{weatherData?.temp}°F</div>
                                 <div className="text-slate-400">{weatherData?.desc}</div>
                             </div>
                             <div className="text-4xl">🌤️</div>
                         </div>
                         <div className="mt-6 pt-6 border-t border-white/5">
                             <h3 className="text-indigo-400 font-mono text-sm uppercase tracking-wider mb-2">Suggestion</h3>
                             <p className="text-slate-200 text-sm">{briefing?.suggestion}</p>
                         </div>
                    </div>

                    {/* Focus & Nostalgia */}
                    <div className="bg-slate-900/60 p-6 rounded-3xl border border-white/5 flex flex-col justify-between">
                         <div className="mb-6">
                             <h3 className="text-emerald-400 font-mono text-sm uppercase tracking-wider mb-2">Daily Focus</h3>
                             <div className="flex items-center gap-3">
                                 <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_currentColor]" />
                                 <p className="text-white text-lg font-medium">{briefing?.focus}</p>
                             </div>
                         </div>
                         <div className="pt-6 border-t border-white/5">
                             <h3 className="text-pink-400 font-mono text-sm uppercase tracking-wider mb-2">Nostalgia Trip</h3>
                             <p className="text-slate-300 text-sm italic">"{briefing?.nostalgia}"</p>
                         </div>
                    </div>

                </div>

                {/* Action */}
                <div className="text-center">
                    <button 
                        onClick={onClose}
                        className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-milla-600 font-lg rounded-full hover:bg-milla-500 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-milla-600 focus:ring-offset-slate-900"
                    >
                        <span>Let's Start the Day</span>
                        <svg className="w-5 h-5 ml-2 -mr-1 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};

export default MorningSync;