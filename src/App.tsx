import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  ShieldCheck, 
  ShieldAlert, 
  History, 
  Download, 
  Trash2, 
  Info, 
  Zap,
  Maximize2,
  FileText,
  Moon,
  Sun,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeImage } from './services/aiService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import confetti from 'canvas-confetti';
import { jsPDF } from 'jspdf';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AnalysisResult {
  prediction: 'Real' | 'AI Generated';
  confidence: number;
  reasoning: string[];
  artifacts?: string;
  timestamp: string;
  metadata: {
    name: string;
    size: string;
    type: string;
    dimensions?: string;
  };
}

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [darkMode, setDarkMode] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      setHistory(data);
    } catch (e) {
      console.error("Failed to fetch history");
    }
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImage(e.target?.result as string);
    reader.readAsDataURL(file);
    setResult(null);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = () => setDragActive(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const runAnalysis = async () => {
    if (!image || !file) return;
    setIsAnalyzing(true);
    try {
      const aiResult = await analyzeImage(image);
      
      // Get image dimensions
      const img = new Image();
      img.src = image;
      await new Promise(r => img.onload = r);

      const finalResult: AnalysisResult = {
        ...aiResult,
        timestamp: new Date().toISOString(),
        metadata: {
          name: file.name,
          size: (file.size / 1024).toFixed(2) + ' KB',
          type: file.type,
          dimensions: `${img.width} x ${img.height}`
        }
      };

      setResult(finalResult);
      
      // Save to DB
      await fetch('/api/save-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          prediction: finalResult.prediction,
          confidence: finalResult.confidence,
          metadata: finalResult.metadata
        })
      });

      if (finalResult.prediction === 'Real') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#34d399']
        });
      }

      fetchHistory();
    } catch (error) {
      console.error("Analysis failed", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const downloadReport = () => {
    if (!result) return;
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("AuraCheck AI Analysis Report", 20, 20);
    doc.setFontSize(12);
    doc.text(`File: ${result.metadata.name}`, 20, 40);
    doc.text(`Prediction: ${result.prediction}`, 20, 50);
    doc.text(`Confidence: ${result.confidence}%`, 20, 60);
    doc.text(`Timestamp: ${new Date(result.timestamp).toLocaleString()}`, 20, 70);
    doc.text("Reasoning:", 20, 90);
    result.reasoning.forEach((r, i) => {
      doc.text(`- ${r}`, 25, 100 + (i * 10));
    });
    doc.save(`analysis-report-${result.metadata.name}.pdf`);
  };

  const chartData = result ? [
    { name: 'Confidence', value: result.confidence },
    { name: 'Uncertainty', value: 100 - result.confidence }
  ] : [];

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-500 font-sans",
      darkMode ? "bg-[#0a0a0a] text-white" : "bg-slate-50 text-slate-900"
    )}>
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex justify-between items-center backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">AuraCheck AI</h1>
            <p className="text-[10px] uppercase tracking-widest opacity-50 font-mono">Neural Forensic Suite v2.4</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full hover:bg-white/5 transition-colors"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Upload & Preview */}
        <div className="lg:col-span-7 space-y-6">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider opacity-60 flex items-center gap-2">
                <Upload size={14} /> Image Input
              </h2>
              {image && (
                <button 
                  onClick={() => { setImage(null); setResult(null); }}
                  className="text-xs text-rose-500 hover:underline flex items-center gap-1"
                >
                  <Trash2 size={12} /> Clear
                </button>
              )}
            </div>

            <div 
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "relative aspect-video rounded-3xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-center items-center justify-center",
                dragActive ? "border-emerald-500 bg-emerald-500/5 scale-[0.99]" : "border-white/10 hover:border-white/20 bg-white/5",
                image && "border-none"
              )}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                accept="image/*"
              />
              
              {image ? (
                <img src={image} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              ) : (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                    <Upload className="opacity-40" size={32} />
                  </div>
                  <div>
                    <p className="font-medium">Drop forensic sample here</p>
                    <p className="text-xs opacity-40">Supports JPG, PNG, WEBP (Max 10MB)</p>
                  </div>
                </div>
              )}
            </div>

            {image && !result && !isAnalyzing && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={runAnalysis}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 transition-all active:scale-95"
              >
                <Zap size={18} /> Run Deep Analysis
              </motion.button>
            )}

            {isAnalyzing && (
              <div className="w-full py-12 flex flex-col items-center gap-4 bg-white/5 rounded-3xl border border-white/10">
                <Loader2 className="animate-spin text-emerald-500" size={48} />
                <div className="text-center">
                  <p className="font-mono text-xs uppercase tracking-widest animate-pulse">Scanning Pixel Gradients...</p>
                  <p className="text-[10px] opacity-40 mt-1">Checking for GAN artifacts and diffusion noise</p>
                </div>
              </div>
            )}
          </section>

          {/* Metadata Display */}
          {image && (
            <section className="bg-white/5 rounded-3xl p-6 border border-white/10">
              <h3 className="text-xs font-mono uppercase tracking-widest opacity-40 mb-4 flex items-center gap-2">
                <Info size={14} /> File Metadata
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Filename', value: file?.name },
                  { label: 'Size', value: (file?.size! / 1024).toFixed(2) + ' KB' },
                  { label: 'Format', value: file?.type.split('/')[1].toUpperCase() },
                  { label: 'Status', value: result ? 'Analyzed' : 'Pending' }
                ].map((item, i) => (
                  <div key={i} className="space-y-1">
                    <p className="text-[10px] opacity-40 uppercase">{item.label}</p>
                    <p className="text-sm font-medium truncate">{item.value}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Results & History */}
        <div className="lg:col-span-5 space-y-6">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.section
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "rounded-3xl p-8 border shadow-2xl relative overflow-hidden",
                  result.prediction === 'Real' 
                    ? "bg-emerald-500/10 border-emerald-500/30" 
                    : "bg-rose-500/10 border-rose-500/30"
                )}
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                      result.prediction === 'Real' ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                    )}>
                      {result.prediction}
                    </div>
                    <button 
                      onClick={downloadReport}
                      className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                    >
                      <Download size={18} />
                    </button>
                  </div>

                  <div className="flex items-center gap-8 mb-8">
                    <div className="w-32 h-32">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            innerRadius={35}
                            outerRadius={50}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          >
                            <Cell fill={result.prediction === 'Real' ? '#10b981' : '#f43f5e'} />
                            <Cell fill="rgba(255,255,255,0.05)" />
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute top-[110px] left-[68px] transform -translate-x-1/2 -translate-y-1/2 text-center">
                        <span className="text-xl font-bold">{result.confidence}%</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold mb-1">Analysis Result</h3>
                      <p className="text-sm opacity-60">
                        Based on neural pattern matching, this image is likely <strong>{result.prediction.toLowerCase()}</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-mono uppercase tracking-widest opacity-40">Forensic Cues</h4>
                    <ul className="space-y-2">
                      {result.reasoning.map((reason, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current opacity-40 shrink-0" />
                          <span className="opacity-80">{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                {/* Decorative Background Icon */}
                <div className="absolute -bottom-10 -right-10 opacity-5 transform rotate-12">
                  {result.prediction === 'Real' ? <ShieldCheck size={200} /> : <ShieldAlert size={200} />}
                </div>
              </motion.section>
            ) : (
              <section className="bg-white/5 rounded-3xl p-8 border border-white/10 text-center space-y-4 h-full flex flex-col justify-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto opacity-20">
                  <FileText size={32} />
                </div>
                <div>
                  <h3 className="font-medium">No Analysis Active</h3>
                  <p className="text-sm opacity-40 max-w-[200px] mx-auto">Upload an image to begin the forensic scanning process.</p>
                </div>
              </section>
            )}
          </AnimatePresence>

          {/* History Section */}
          <section className="bg-white/5 rounded-3xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider opacity-60 flex items-center gap-2">
                <History size={14} /> Recent Scans
              </h3>
            </div>
            
            <div className="space-y-3">
              {history.length > 0 ? history.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      item.prediction === 'Real' ? "bg-emerald-500" : "bg-rose-500"
                    )} />
                    <div>
                      <p className="text-xs font-medium truncate max-w-[120px]">{item.filename}</p>
                      <p className="text-[10px] opacity-40">{new Date(item.timestamp).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-tighter">{item.prediction}</p>
                    <p className="text-[10px] opacity-40">{item.confidence}% match</p>
                  </div>
                </div>
              )) : (
                <p className="text-xs opacity-30 text-center py-4">History is empty</p>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto p-6 border-t border-white/10 mt-12 flex flex-col md:flex-row justify-between items-center gap-4 opacity-40 text-[10px] uppercase tracking-widest font-mono">
        <p>© 2026 AuraCheck Forensic Labs</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-emerald-500 transition-colors">Documentation</a>
          <a href="#" className="hover:text-emerald-500 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-emerald-500 transition-colors">API Access</a>
        </div>
      </footer>
    </div>
  );
}
