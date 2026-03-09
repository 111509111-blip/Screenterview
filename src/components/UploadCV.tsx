import React, { useState, useRef, useEffect } from 'react';
import { Upload, ArrowRight, FileText, Loader2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

export default function UploadCV({ onStart }: { onStart: (cv: string) => void }) {
  const [text, setText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Use Vite's URL import to correctly resolve the worker from node_modules
    // In pdfjs-dist 3.x, the worker is usually a .js file
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.js',
      import.meta.url
    ).toString();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('Please upload a valid PDF file.');
      return;
    }

    setIsParsing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      
      // Load the document using the Uint8Array directly
      const loadingTask = pdfjsLib.getDocument({
        data: data,
        useSystemFonts: true,
        disableFontFace: true,
      });
      
      const pdf = await loadingTask.promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Filter and join only items that have a 'str' property
        const pageText = textContent.items
          .map((item: any) => item.str || '')
          .join(' ');
          
        fullText += pageText + '\n';
      }
      
      setText(fullText.trim());
    } catch (error) {
      console.error('Error parsing PDF:', error);
      alert('Failed to parse PDF. Please try pasting the text manually.');
    } finally {
      setIsParsing(false);
      // Reset file input so the same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">AI Interviewer Pro</h1>
        <p className="text-slate-500 mb-8">Upload your CV to begin your first-round automated interview.</p>
        
        <input 
          type="file" 
          accept=".pdf" 
          className="hidden" 
          ref={fileInputRef}
          onChange={handleFileUpload}
        />

        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-indigo-300 rounded-xl p-8 text-center mb-6 hover:bg-indigo-50 transition-colors cursor-pointer group"
        >
          {isParsing ? (
            <Loader2 className="w-12 h-12 text-indigo-500 mx-auto mb-4 animate-spin" />
          ) : (
            <Upload className="w-12 h-12 text-indigo-400 mx-auto mb-4 group-hover:text-indigo-600 transition-colors" />
          )}
          <p className="text-slate-700 font-medium text-lg">
            {isParsing ? 'Parsing PDF...' : 'Click to upload your CV (PDF)'}
          </p>
          <p className="text-slate-400 text-sm mt-2">We will extract the text automatically</p>
        </div>

        <div className="relative">
          <div className="absolute top-3 left-3 text-slate-400">
            <FileText className="w-5 h-5" />
          </div>
          <textarea
            className="w-full h-48 pl-10 p-4 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none text-sm text-slate-700"
            placeholder="Or paste your CV content here manually..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isParsing}
          />
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => onStart(text)}
            disabled={!text.trim() || isParsing}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Start Interview <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
