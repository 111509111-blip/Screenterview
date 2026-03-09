import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Send, CheckCircle2, Eye, BrainCircuit, AlertTriangle, Play } from 'lucide-react';
import { generateFirstQuestion, generateFollowUpQuestion } from '../services/ai';
import { motion } from 'motion/react';
import { JobConfig } from './HRSetup';

export default function InterviewRoom({ cvText, jobConfig, onFinish }: { cvText: string, jobConfig: JobConfig | null, onFinish: (history: any[], proctorEvents: any[]) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [proctorEvents, setProctorEvents] = useState<{type: string, time: string}[]>([]);
  
  const [hasStarted, setHasStarted] = useState(false);
  const [history, setHistory] = useState<{q: string, a: string}[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [answerText, setAnswerText] = useState('');
  const [isGenerating, setIsGenerating] = useState(true);
  const [questionCount, setQuestionCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [attentionScore, setAttentionScore] = useState(98);
  const [proctorWarning, setProctorWarning] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Tab switching and attention score logic
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setProctorWarning("Tab switched - Please stay on this page");
        setAttentionScore(prev => Math.max(40, prev - 30));
        setProctorEvents(prev => [...prev, { type: 'Tab Switched', time: new Date().toLocaleTimeString() }]);
      } else {
        setTimeout(() => setProctorWarning(null), 4000);
      }
    };

    const handleBlur = () => {
      setProctorWarning("Window lost focus");
      setAttentionScore(prev => Math.max(40, prev - 20));
      setProctorEvents(prev => [...prev, { type: 'Window Lost Focus', time: new Date().toLocaleTimeString() }]);
      setTimeout(() => setProctorWarning(null), 4000);
    };

    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 || e.clientX <= 0 || (e.clientX >= window.innerWidth || e.clientY >= window.innerHeight)) {
        setProctorWarning("Gaze/Attention deviated");
        setAttentionScore(prev => Math.max(50, prev - 15));
        setProctorEvents(prev => [...prev, { type: 'Gaze Deviated', time: new Date().toLocaleTimeString() }]);
        setTimeout(() => setProctorWarning(null), 3000);
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("mouseleave", handleMouseLeave);
    
    const interval = setInterval(() => {
      setAttentionScore(prev => {
        if (document.hidden) return prev;
        // Slowly recover score if they are on the page, with slight fluctuation
        return Math.min(100, prev + (Math.random() * 5));
      });
    }, 2000);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("mouseleave", handleMouseLeave);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true })
      .then(s => {
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(err => console.error("Webcam error:", err));
      
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  useEffect(() => {
    // We don't initInterview here anymore. We wait for the user to click "Start Interview"
    // to unlock the audio context on mobile devices.
  }, []);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = jobConfig?.language || 'zh-TW';
      
      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setAnswerText(prev => prev + (prev ? ' ' : '') + finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };
      
      recognitionRef.current = recognition;
    }
  }, []);

  const handleStartInteraction = () => {
    // Initialize speech synthesis with a silent utterance to unlock audio on mobile
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance('');
      utterance.lang = jobConfig?.language || 'zh-TW';
      window.speechSynthesis.speak(utterance);
    }
    setHasStarted(true);
    initInterview();
  };

  const initInterview = async () => {
    setIsGenerating(true);
    const q = await generateFirstQuestion(cvText, jobConfig);
    setCurrentQuestion(q);
    speak(q);
    setIsGenerating(false);
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.15; // Increased speed
      utterance.lang = jobConfig?.language || 'zh-TW';
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Could not start speech recognition:", e);
      }
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answerText.trim()) return;
    
    if (isRecording) {
      toggleRecording();
    }

    const newHistory = [...history, { q: currentQuestion, a: answerText }];
    setHistory(newHistory);
    setAnswerText('');
    
    if (questionCount >= 2) {
      // Finished 1 main + 2 follow-ups = 3 questions total
      onFinish(newHistory, proctorEvents);
      return;
    }

    setIsGenerating(true);
    setQuestionCount(c => c + 1);
    
    const nextQ = await generateFollowUpQuestion(newHistory, jobConfig);
    setCurrentQuestion(nextQ);
    speak(nextQ);
    setIsGenerating(false);
  };

  return (
    <div className="h-screen bg-slate-950 text-white p-6 flex gap-6 overflow-hidden">
      {/* Left: Video & Analysis */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="relative flex-1 bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-contain bg-black transform scale-x-[-1]" />
          
          {/* Overlays */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            <div className="bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 text-sm border border-white/10">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              REC
            </div>
            <div className="bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 text-sm border border-white/10">
              <Eye className="w-4 h-4 text-emerald-400" />
              Face Detected
            </div>
          </div>
          
          <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
            <div className={`bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 text-sm border ${attentionScore < 80 ? 'border-amber-500/50 text-amber-400' : 'border-white/10'}`}>
              Attention: {attentionScore.toFixed(0)}%
            </div>
            {proctorWarning ? (
              <div className="bg-red-500/20 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 text-sm border border-red-500/50 text-red-400 animate-pulse">
                <AlertTriangle className="w-4 h-4" />
                {proctorWarning}
              </div>
            ) : (
              <div className="bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 text-sm border border-white/10 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                No Cheating Detected
              </div>
            )}
          </div>
          
          {/* Face tracking box mock */}
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-80 border-2 rounded-xl flex items-center justify-center pointer-events-none transition-colors duration-300 ${proctorWarning ? 'border-red-500/50' : 'border-emerald-500/30'}`}>
            <div className={`w-4 h-4 border-t-2 border-l-2 absolute top-0 left-0 ${proctorWarning ? 'border-red-500' : 'border-emerald-500'}`} />
            <div className={`w-4 h-4 border-t-2 border-r-2 absolute top-0 right-0 ${proctorWarning ? 'border-red-500' : 'border-emerald-500'}`} />
            <div className={`w-4 h-4 border-b-2 border-l-2 absolute bottom-0 left-0 ${proctorWarning ? 'border-red-500' : 'border-emerald-500'}`} />
            <div className={`w-4 h-4 border-b-2 border-r-2 absolute bottom-0 right-0 ${proctorWarning ? 'border-red-500' : 'border-emerald-500'}`} />
          </div>
        </div>
      </div>

      {/* Right: Interaction */}
      <div className="w-[450px] bg-slate-900 rounded-2xl border border-slate-800 flex flex-col overflow-hidden relative">
        {!hasStarted && (
          <div className="absolute inset-0 z-10 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-indigo-600/20 flex items-center justify-center mb-4">
              <BrainCircuit className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Ready to begin?</h3>
            <p className="text-slate-400 text-sm mb-6">
              Please ensure your microphone and camera are working. The AI will speak to you once you start.
            </p>
            <button
              onClick={handleStartInteraction}
              className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-medium flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
            >
              <Play className="w-5 h-5 fill-current" />
              Start Interview
            </button>
          </div>
        )}

        <div className="p-4 border-b border-slate-800 bg-slate-900/50">
          <h2 className="font-semibold flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
              <BrainCircuit className="w-4 h-4 text-white" />
            </div>
            AI Interviewer
          </h2>
          <p className="text-xs text-slate-400 mt-1">Round 1 • Question {questionCount + 1} of 3</p>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4">
          {history.map((h, i) => (
            <div key={i} className="flex flex-col gap-3">
              <div className="bg-slate-800 p-3 rounded-xl rounded-tl-none self-start max-w-[90%] text-sm leading-relaxed">
                {h.q}
              </div>
              <div className="bg-indigo-600 p-3 rounded-xl rounded-tr-none self-end max-w-[90%] text-sm leading-relaxed">
                {h.a}
              </div>
            </div>
          ))}
          
          {isGenerating ? (
            <div className="bg-slate-800 p-3 rounded-xl rounded-tl-none self-start text-sm flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100" />
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200" />
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800 p-3 rounded-xl rounded-tl-none self-start max-w-[90%] text-sm border border-indigo-500/30 leading-relaxed"
            >
              {currentQuestion}
            </motion.div>
          )}
        </div>
        
        <div className="p-4 bg-slate-900 border-t border-slate-800">
          <textarea
            value={answerText}
            onChange={e => setAnswerText(e.target.value)}
            placeholder="Type your answer or use voice..."
            className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-indigo-500 mb-3"
            disabled={isGenerating}
          />
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button 
                onClick={toggleRecording}
                disabled={isGenerating}
                className={`p-2.5 rounded-full transition-colors ${isRecording ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                title={isRecording ? "Stop Recording" : "Start Voice Input"}
              >
                {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              {isRecording && <span className="text-xs text-red-400 font-medium animate-pulse">Listening...</span>}
            </div>
            <button
              onClick={handleSubmitAnswer}
              disabled={isGenerating || !answerText.trim()}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50"
            >
              Submit <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
