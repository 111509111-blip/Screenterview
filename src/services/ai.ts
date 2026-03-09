import { GoogleGenAI, Type } from "@google/genai";
import { JobConfig } from "../components/HRSetup";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
export async function generateFirstQuestion(cvText: string, jobConfig: JobConfig | null): Promise<string> {
  try {
    const langInstruction = jobConfig?.language === 'en-US' ? 'English' : 'Traditional Chinese (zh-TW)';
    const difficultyInstruction = 'Keep the question simple, conversational, and easy to understand. Avoid overly complex or difficult jargon.';
    const jobContext = jobConfig ? `\n\nJob Description:\n${jobConfig.jd}\n\nKey Evaluation Keywords:\n${jobConfig.keywords}\n\nEvaluation Standards:\n${jobConfig.standards}` : '';
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are an expert HR recruiter and technical interviewer. Based on the following CV and Job Context, generate ONE insightful first-round interview question. The question should be professional, welcoming, and specific to their experience while aligning with the job requirements. ${difficultyInstruction} You MUST ask the question in ${langInstruction}. Do not include any other text, just the question.\n\nCV:\n${cvText}${jobContext}`,
    });
    return response.text || "Could you please introduce yourself and tell me about your background?";
  } catch (error) {
    console.error("Error generating first question:", error);
    return "Could you please introduce yourself and tell me about your background?";
  }
}

export async function generateFollowUpQuestion(history: {q: string, a: string}[], jobConfig: JobConfig | null): Promise<string> {
  try {
    const langInstruction = jobConfig?.language === 'en-US' ? 'English' : 'Traditional Chinese (zh-TW)';
    const difficultyInstruction = 'Keep the question simple, conversational, and easy to understand. Avoid overly complex or difficult jargon.';
    const jobContext = jobConfig ? `\n\nJob Description:\n${jobConfig.jd}\n\nKey Evaluation Keywords:\n${jobConfig.keywords}\n\nEvaluation Standards:\n${jobConfig.standards}` : '';
    const transcript = history.map(h => `AI: ${h.q}\nCandidate: ${h.a}`).join('\n\n');
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are an expert interviewer. Here is the interview transcript so far:\n\n${transcript}${jobContext}\n\nBased on the candidate's last answer and the job context, generate ONE relevant follow-up question to dig deeper into their skills or cultural fit. ${difficultyInstruction} You MUST ask the question in ${langInstruction}. Just output the question, nothing else.`,
    });
    return response.text || "Could you elaborate more on that?";
  } catch (error) {
    console.error("Error generating follow-up question:", error);
    return "Could you elaborate more on that?";
  }
}

export async function generateHRReport(cvText: string, history: {q: string, a: string}[], jobConfig: JobConfig | null, proctorEvents: any[] = []) {
  try {
    const langInstruction = jobConfig?.language === 'en-US' ? 'English' : 'Traditional Chinese (zh-TW)';
    const jobContext = jobConfig ? `\n\nJob Description:\n${jobConfig.jd}\n\nKey Evaluation Keywords:\n${jobConfig.keywords}\n\nEvaluation Standards:\n${jobConfig.standards}` : '';
    const transcript = history.map(h => `Q: ${h.q}\nA: ${h.a}`).join('\n\n');
    const eventsText = proctorEvents.length > 0 
      ? `Proctoring Events (Cheating Suspicions):\n${proctorEvents.map(e => `- ${e.time}: ${e.type}`).join('\n')}`
      : `Proctoring Events: None detected.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are an expert HR evaluator. Review the candidate's CV, their interview transcript, the Job Context, and the Proctoring Events. Generate a comprehensive evaluation report in ${langInstruction}.
      
CV:
${cvText}

Transcript:
${transcript}
${jobContext}

${eventsText}

Consider the proctoring events in your evaluation. If there are cheating suspicions (like tab switching or gaze deviation), mention them in the summary and factor them into the recommendation and overall score.
`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            candidateName: { type: Type.STRING, description: "Extract or guess the candidate's name from CV" },
            overallScore: { type: Type.NUMBER, description: "Score out of 100 based on their answers and alignment with the job requirements" },
            summary: { type: Type.STRING, description: "A short paragraph summarizing their performance and fit for the role" },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of 2-3 strengths" },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of 1-2 areas for improvement" },
            communicationSkills: { type: Type.STRING, description: "Evaluation of their communication" },
            recommendation: { type: Type.STRING, description: "Hire, Reject, or Proceed to Next Round" }
          },
          required: ["candidateName", "overallScore", "summary", "strengths", "weaknesses", "communicationSkills", "recommendation"]
        }
      }
    });
    
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error generating HR report:", error);
    return null;
  }
}
