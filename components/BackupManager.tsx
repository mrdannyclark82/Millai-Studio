
import React, { useRef } from 'react';
import { backupService } from '../services/backupService';

interface BackupManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const BackupManager: React.FC<BackupManagerProps> = ({ isOpen, onClose }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    backupService.downloadBackup();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (confirm("WARNING: Importing a backup will OVERWRITE your current chat history and memories. Continue?")) {
        try {
            await backupService.restoreBackup(file);
            alert("Restoration successful! The app will now reload.");
            window.location.reload();
        } catch (err) {
            alert("Failed to restore backup. Check file format.");
        }
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
        <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">✕</button>
            
            <h2 className="text-xl font-bold text-white mb-2">Knowledge Base</h2>
            <p className="text-sm text-slate-400 mb-6">Backup Milla's memories, your chat history, and creations.</p>

            <div className="grid grid-cols-2 gap-4">
                <button 
                    onClick={handleExport}
                    className="flex flex-col items-center justify-center gap-3 p-6 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all group"
                >
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </div>
                    <span className="font-bold text-slate-200">Backup</span>
                </button>

                <button 
                    onClick={handleImportClick}
                    className="flex flex-col items-center justify-center gap-3 p-6 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all group"
                >
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m-4 4v12" /></svg>
                    </div>
                    <span className="font-bold text-slate-200">Restore</span>
                </button>
            </div>
            
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".json" 
                className="hidden" 
            />

            <div className="mt-6 p-3 bg-slate-950/50 rounded-lg text-xs text-slate-500 font-mono">
                <p>Includes:</p>
                <ul className="list-disc pl-4 mt-1 space-y-1">
                    <li>Core Memories & Facts</li>
                    <li>Chat History</li>
                    <li>Creative Studio Images</li>
                    <li>Sandbox Files</li>
                </ul>
            </div>
        </div>
    </div>
  );
};

export default BackupManager;
