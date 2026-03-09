import { useState } from 'react';
import HRSetup, { JobConfig } from './components/HRSetup';
import UploadCV from './components/UploadCV';
import InterviewRoom from './components/InterviewRoom';
import HRReport from './components/HRReport';
import { generateHRReport } from './services/ai';

type Step = 'setup' | 'upload' | 'interview' | 'report';

export default function App() {
  const [step, setStep] = useState<Step>('setup');
  const [jobConfig, setJobConfig] = useState<JobConfig | null>(null);
  const [cvText, setCvText] = useState('');
  const [history, setHistory] = useState<{q: string, a: string}[]>([]);
  const [report, setReport] = useState<any>(null);
  const [proctorEvents, setProctorEvents] = useState<any[]>([]);

  const handleSetupComplete = (config: JobConfig) => {
    setJobConfig(config);
    setStep('upload');
  };

  const handleStartInterview = (cv: string) => {
    setCvText(cv);
    setStep('interview');
  };

  const handleFinishInterview = async (interviewHistory: {q: string, a: string}[], events: any[]) => {
    setHistory(interviewHistory);
    setProctorEvents(events);
    setStep('report');
    
    // Generate report in the background
    const generatedReport = await generateHRReport(cvText, interviewHistory, jobConfig, events);
    setReport(generatedReport);
  };

  return (
    <div className="font-sans">
      {step === 'setup' && <HRSetup onComplete={handleSetupComplete} />}
      {step === 'upload' && <UploadCV onStart={handleStartInterview} />}
      {step === 'interview' && <InterviewRoom cvText={cvText} jobConfig={jobConfig} onFinish={handleFinishInterview} />}
      {step === 'report' && <HRReport report={report} history={history} proctorEvents={proctorEvents} />}
    </div>
  );
}
