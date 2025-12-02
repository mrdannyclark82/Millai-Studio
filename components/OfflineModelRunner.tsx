
import React, { useState, useRef } from 'react';
import { tfliteService } from '../services/tfliteService';

interface OfflineModelRunnerProps {
  isOpen: boolean;
  onClose: () => void;
}

const OfflineModelRunner: React.FC<OfflineModelRunnerProps> = ({ isOpen, onClose }) => {
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [status, setStatus] = useState('Idle');
  const [output, setOutput] = useState<string>('');
  const [inputImage, setInputImage] = useState<string | null>(null);
  
  const imgRef = useRef<HTMLImageElement>(null);

  const handleModelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setModelFile(file);
      setStatus(`Loading ${file.name}...`);
      
      try {
          await tfliteService.loadModelFromFile(file);
          setStatus("Model Loaded & Ready (WASM Backend)");
      } catch (err: any) {
          console.error(err);
          setStatus(`Load Error: ${err.message}`);
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => setInputImage(reader.result as string);
      reader.readAsDataURL(file);
  };

  const runInference = async () => {
      if (!imgRef.current) return;
      setStatus("Running Inference...");
      try {
          const tensor = tfliteService.processImage(imgRef.current);
          const result = await tfliteService.predict(tensor);
          const data = await result.data();
          
          // Format output nicely (assuming classification scores for demo)
          const scores = Array.from(data).map((s: any, i) => `Class ${i}: ${s.toFixed(4)}`);
          // Get top 5
          const top5 = Array.from(data)
              .map((s: any, i) => ({ score: s, index: i }))
              .sort((a: any, b: any) => b.score - a.score)
              .slice(0, 5);

          setOutput(JSON.stringify(top5, null, 2));
          setStatus("Inference Complete");
      } catch (e: any) {
          console.error(e);
          setStatus(`Inference Error: ${e.message}`);
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/90 backdrop-blur animate-in fade-in">
        <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="text-orange-500">⚡</span> Offline Neural Lab
                </h2>
                <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <label className="block text-sm font-bold text-slate-300 mb-2">1. Load .tflite Model</label>
                    <input type="file" accept=".tflite" onChange={handleModelUpload} className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-orange-500/20 file:text-orange-400 hover:file:bg-orange-500/30" />
                    <p className="text-xs text-slate-500 mt-2 font-mono">{status}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                        <label className="block text-sm font-bold text-slate-300 mb-2">2. Input Data (Image)</label>
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="block w-full text-sm text-slate-400 mb-2" />
                        {inputImage && (
                            <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
                                <img ref={imgRef} src={inputImage} className="w-full h-full object-contain" />
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col">
                        <label className="block text-sm font-bold text-slate-300 mb-2">3. Output Tensor</label>
                        <div className="flex-1 bg-slate-950 rounded-lg p-3 font-mono text-xs text-green-400 overflow-auto whitespace-pre-wrap h-40 md:h-auto">
                            {output || "// Output will appear here..."}
                        </div>
                    </div>
                </div>

                <button 
                    onClick={runInference} 
                    disabled={!modelFile || !inputImage}
                    className="w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors"
                >
                    Run Inference
                </button>
            </div>
        </div>
    </div>
  );
};

export default OfflineModelRunner;
