
import React, { useState, useRef } from 'react';
import { databaseService } from '../services/databaseService';

interface DatabaseConnectorProps {
  isOpen: boolean;
  onClose: () => void;
}

const DatabaseConnector: React.FC<DatabaseConnectorProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [collectionName, setCollectionName] = useState('Documents');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setLoading(true);
      setStatus(`Importing ${file.name}...`);
      
      try {
          const count = await databaseService.importFile(file, collectionName);
          setStatus(`Success! Imported ${count} records into '${collectionName}'.`);
      } catch (err: any) {
          console.error(err);
          setStatus(`Error: ${err.message}`);
      } finally {
          setLoading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleTestSearch = async () => {
      const q = prompt("Enter search term:");
      if (!q) return;
      const res = await databaseService.search(q);
      alert(`Found ${res.length} results:\n` + res.map(r => r.text.slice(0, 50) + '...').join('\n'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
        <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">✕</button>
            
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <span className="text-emerald-400">🗄️</span> External Database
            </h2>
            <p className="text-sm text-slate-400 mb-6">Attach a local dataset (JSON/CSV) for Milla to reference.</p>

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Collection Name</label>
                    <input 
                        value={collectionName}
                        onChange={(e) => setCollectionName(e.target.value)}
                        className="w-full bg-slate-800 text-white px-3 py-2 rounded border border-slate-700"
                    />
                </div>

                <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:bg-slate-800/50 transition-colors">
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleUpload}
                        accept=".json,.csv"
                        className="hidden"
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-full font-bold transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Importing...' : 'Upload Dataset'}
                    </button>
                    <p className="text-xs text-slate-500 mt-2">Supports .json arrays or .csv files</p>
                </div>
                
                {status && (
                    <div className={`p-3 rounded text-sm ${status.startsWith('Error') ? 'bg-red-900/20 text-red-400' : 'bg-emerald-900/20 text-emerald-400'}`}>
                        {status}
                    </div>
                )}
                
                <div className="pt-4 border-t border-slate-800">
                    <button onClick={handleTestSearch} className="text-xs text-blue-400 hover:text-blue-300 underline">
                        Test Connection (Run Query)
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default DatabaseConnector;
