import React, { useState } from 'react';
import { Settings, ArrowRight, Briefcase, Key, Target, Globe } from 'lucide-react';

export interface JobConfig {
  jd: string;
  keywords: string;
  standards: string;
  language: 'en-US' | 'zh-TW';
}

export default function HRSetup({ onComplete }: { onComplete: (config: JobConfig) => void }) {
  const [jd, setJd] = useState('');
  const [keywords, setKeywords] = useState('');
  const [standards, setStandards] = useState('');
  const [language, setLanguage] = useState<'en-US' | 'zh-TW'>('zh-TW');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({ jd, keywords, standards, language });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Settings className="w-6 h-6 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">HR Setup</h1>
        </div>
        <p className="text-slate-500 mb-8">Configure the interview parameters before inviting the candidate.</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Briefcase className="w-4 h-4" />
              Job Description (JD)
            </label>
            <textarea
              required
              className="w-full h-32 p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none text-sm text-slate-700"
              placeholder="Paste the full job description here..."
              value={jd}
              onChange={(e) => setJd(e.target.value)}
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Key className="w-4 h-4" />
              Key Evaluation Keywords
            </label>
            <input
              required
              type="text"
              className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm text-slate-700"
              placeholder="e.g., React, Node.js, Leadership, Problem Solving"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Target className="w-4 h-4" />
              Evaluation Standards & Rubric
            </label>
            <textarea
              required
              className="w-full h-24 p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none text-sm text-slate-700"
              placeholder="What makes a good answer? What are the red flags?"
              value={standards}
              onChange={(e) => setStandards(e.target.value)}
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Globe className="w-4 h-4" />
              Interview Language
            </label>
            <select
              className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm text-slate-700 bg-white"
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en-US' | 'zh-TW')}
            >
              <option value="zh-TW">中文 (Traditional Chinese)</option>
              <option value="en-US">English</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={!jd.trim() || !keywords.trim() || !standards.trim()}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Save & Proceed to Candidate View <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
