import { z } from 'zod';

export const AI_MODELS = {
  // Primary structured classification & analysis model
  ANALYSIS_MODEL: 'gemini-3.8-flash',
  // Multimodal audio transcription & translation
  TRANSCRIPTION_MODEL: 'gemini-3.5-transcribe',
  // Text-to-speech generation
  TTS_MODEL: 'gemini-3.8-flash-lite-tts',
} as const;

export const ReportAiOutputSchema = z.object({
  category: z.enum(['safety', 'payment', 'behaviour']),
  subcategory: z.string().min(1),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  urgent: z.boolean(),
  summary_en: z.string().min(1).max(240),
  original_language: z.enum(['en', 'hi', 'ta']),
  transcript_original: z.string().min(1),
  transcript_en: z.string().min(1),
  recommended_action: z.string().min(1),
  possible_identifying_details: z.boolean(),
  confidence: z.number().min(0).max(1),
}).strict();

export type ReportAiOutput = z.infer<typeof ReportAiOutputSchema>;
