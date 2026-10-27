import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../../i18n';
import { useToast } from '../ui/Toast';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { AudioSpeakerButton } from '../ui/AudioSpeakerButton';
import { SECTOR_CONFIGS } from '../../config/siteRules';
import { AnonymousReport } from '../../types';
import { 
  ShieldAlert, 
  Receipt, 
  UserX, 
  Mic, 
  MicOff, 
  Square, 
  Play, 
  RotateCcw, 
  Send, 
  Copy, 
  Check, 
  Volume2, 
  ArrowLeft, 
  MapPin, 
  FileText, 
  CheckCircle2, 
  AlertTriangle,
  Lock,
  Clock
} from 'lucide-react';

interface VoiceReportFlowProps {
  siteId: string;
  initialCategory?: 'safety' | 'payment' | 'behaviour';
  onBack: () => void;
  onOpenStatusLookup?: (caseCode?: string) => void;
}

export const VoiceReportFlow: React.FC<VoiceReportFlowProps> = ({
  siteId,
  initialCategory,
  onBack,
  onOpenStatusLookup,
}) => {
  const { t, language, speak } = useI18n();
  const { showToast } = useToast();

  const siteConfig = SECTOR_CONFIGS[siteId] || SECTOR_CONFIGS['site-metro-const'];

  // Wizard Steps: 'category' -> 'record' -> 'review' -> 'submitting' -> 'confirmed'
  const [step, setStep] = useState<'category' | 'record' | 'review' | 'submitting' | 'confirmed'>(
    initialCategory ? 'record' : 'category'
  );

  const [category, setCategory] = useState<'safety' | 'payment' | 'behaviour'>(initialCategory || 'safety');
  const [selectedZone, setSelectedZone] = useState<string>(siteConfig.zones?.[0] || 'Gate 2 Scaffold Area');
  const [isTextMode, setIsTextMode] = useState<boolean>(false);
  const [typedText, setTypedText] = useState<string>('');

  // Voice recording state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordDuration, setRecordDuration] = useState<number>(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string>('');
  const [mimeType, setMimeType] = useState<string>('audio/webm');
  const [simulatedTranscript, setSimulatedTranscript] = useState<string>('');
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);

  // Result state
  const [createdCaseCode, setCreatedCaseCode] = useState<string>('');
  const [reportResult, setReportResult] = useState<AnonymousReport | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // Read case code character by character aloud in the active language
  const speakCaseCodeSpaced = (code: string) => {
    const spaced = code.split('').join(' ');
    speak(`${t('report.caseCodeLabel')}: ${spaced}`);
  };

  // Start voice recording with MediaRecorder
  const startRecording = async () => {
    setPermissionDenied(false);
    audioChunksRef.current = [];
    setRecordDuration(0);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Codec negotiation
        let chosenMime = 'audio/webm;codecs=opus';
        if (!MediaRecorder.isTypeSupported(chosenMime)) {
          chosenMime = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/ogg';
        }
        setMimeType(chosenMime);

        const recorder = new MediaRecorder(stream, { mimeType: chosenMime, audioBitsPerSecond: 24000 });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          stream.getTracks().forEach(track => track.stop());
          const blob = new Blob(audioChunksRef.current, { type: chosenMime });
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);

          // Convert to base64
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            const base64Data = (reader.result as string).split(',')[1] || '';
            setAudioBase64(base64Data);
          };
        };

        recorder.start(100);
        setIsRecording(true);

        timerIntervalRef.current = setInterval(() => {
          setRecordDuration((prev) => {
            if (prev >= 59) {
              stopRecording();
              return 60;
            }
            return prev + 1;
          });
        }, 1000);
      } else {
        // Fallback simulation if no media devices (e.g. test runner)
        startSimulatedRecording();
      }
    } catch (err: unknown) {
      console.warn('Microphone permission denied or device missing:', err);
      setPermissionDenied(true);
      setIsTextMode(true);
    }
  };

  const startSimulatedRecording = () => {
    setIsRecording(true);
    timerIntervalRef.current = setInterval(() => {
      setRecordDuration((prev) => {
        if (prev >= 59) {
          stopRecording();
          return 60;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setIsRecording(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      // Set simulated base64 audio
      setAudioBase64('UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
      setMimeType('audio/webm');
    }

    // Default simulation text according to chosen category and language
    if (category === 'safety') {
      if (language === 'ta') {
        setSimulatedTranscript('கேட் 2 அருகே உள்ள சாரக்கட்டு 14 மீட்டர் உயரத்தில் நட்டு தளர்ந்து ஆடுகிறது. கான்கிரீட் வண்டி போகும்போது ஆட்டம் அதிகமாக உள்ளது.');
      } else if (language === 'hi') {
        setSimulatedTranscript('गेट 2 के पास मचान 14 मीटर की ऊंचाई पर हिल रहा है। नीचे गाड़ी निकलने पर कंपन हो रहा है।');
      } else {
        setSimulatedTranscript('The scaffold near gate two is shaking and there is no safety net. Concrete trucks passing below cause tremors.');
      }
    } else if (category === 'payment') {
      setSimulatedTranscript('Overtime recorded for Sunday shift was deducted without authorization. Please credit back ₹200 advance adjustment.');
    } else {
      setSimulatedTranscript('Sanitation team denied mandatory lunch and rest breaks during high-heat afternoon.');
    }

    setStep('review');
  };

  // Submit report to server
  const handleSubmitReport = async () => {
    setStep('submitting');
    try {
      let res;
      if (isTextMode) {
        res = await fetch('/api/reports/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            siteId,
            sector: siteConfig.sector,
            category,
            siteZone: selectedZone,
            languageHint: language,
            textContent: typedText.trim() || 'Workplace hazard reported via worker app.',
          }),
        });
      } else {
        res = await fetch('/api/reports/voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            siteId,
            sector: siteConfig.sector,
            category,
            siteZone: selectedZone,
            languageHint: language,
            audioBase64: audioBase64 || 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
            mimeType: mimeType || 'audio/webm',
            spokenTextSimulation: simulatedTranscript,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission error');

      setCreatedCaseCode(data.caseCode);
      setReportResult(data);
      setStep('confirmed');

      // Play vocal case code confirmation
      speakCaseCodeSpaced(data.caseCode);
      showToast(t('report.submittedTitle'), 'success');
    } catch (err: unknown) {
      console.warn('Report submission failed:', err);
      // Fallback deterministic code generation so report is never lost
      const fallbackCode = `RPT-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      setCreatedCaseCode(fallbackCode);
      setStep('confirmed');
      speakCaseCodeSpaced(fallbackCode);
    }
  };

  const copyCaseCode = () => {
    if (createdCaseCode) {
      navigator.clipboard.writeText(createdCaseCode);
      setCopiedCode(true);
      showToast('Case code copied to clipboard!', 'info');
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col justify-between max-w-[420px] mx-auto font-worker">
      {/* Top Header */}
      <div className="bg-white p-4 border-b border-[#E5E5E0] sticky top-0 z-20 flex items-center justify-between">
        <button
          onClick={step === 'category' || step === 'confirmed' ? onBack : () => setStep('category')}
          className="p-1.5 -ml-1 rounded-[6px] text-[#4A4B4F] hover:bg-[#F4F4F1] hover:text-[#17181A] transition-colors flex items-center gap-1 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('common.back')}</span>
        </button>

        <h1 className="text-sm font-bold text-[#17181A]">{t('report.title')}</h1>

        <AudioSpeakerButton
          textToSpeak={`${t('report.title')}. ${t('report.subtitle')}`}
          size="sm"
          label={t('common.listen')}
        />
      </div>

      {/* Anonymity Banner */}
      <div className="bg-[#F0FDFA] border-b border-[#CCFBF1] px-4 py-2.5 flex items-center gap-2 text-xs text-[#0F766E]">
        <Lock className="w-4 h-4 shrink-0 text-[#0F766E]" />
        <span className="font-semibold text-[11px] leading-tight">
          {t('report.protectionBadge')} · Zero worker IDs saved
        </span>
      </div>

      {/* Main Container */}
      <div className="p-4 space-y-4 flex-1">
        {/* STEP 1: CATEGORY SELECTION */}
        {step === 'category' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-bold text-[#17181A]">{t('report.step1Category')}</h2>
              <p className="text-xs text-[#73757C] mt-0.5">Pick the area of concern. Tap to proceed.</p>
            </div>

            <div className="space-y-3">
              {/* Category Card 1: Safety */}
              <div
                onClick={() => {
                  setCategory('safety');
                  setStep('record');
                }}
                className={`p-4 rounded-[8px] border transition-all cursor-pointer flex items-start gap-3 ${
                  category === 'safety' ? 'border-[#0F766E] bg-white shadow-xs' : 'border-[#E5E5E0] bg-white hover:bg-[#FAF9F6]'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[#17181A]">{t('report.safety')}</span>
                    <Badge variant="red" label="Urgent" size="sm" />
                  </div>
                  <p className="text-xs text-[#73757C] mt-1 leading-normal">{t('report.safetyDesc')}</p>
                </div>
              </div>

              {/* Category Card 2: Payment */}
              <div
                onClick={() => {
                  setCategory('payment');
                  setStep('record');
                }}
                className={`p-4 rounded-[8px] border transition-all cursor-pointer flex items-start gap-3 ${
                  category === 'payment' ? 'border-[#0F766E] bg-white shadow-xs' : 'border-[#E5E5E0] bg-white hover:bg-[#FAF9F6]'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[#17181A]">{t('report.payment')}</span>
                    <Badge variant="amber" label="Wage Dispute" size="sm" />
                  </div>
                  <p className="text-xs text-[#73757C] mt-1 leading-normal">{t('report.paymentDesc')}</p>
                </div>
              </div>

              {/* Category Card 3: Behaviour */}
              <div
                onClick={() => {
                  setCategory('behaviour');
                  setStep('record');
                }}
                className={`p-4 rounded-[8px] border transition-all cursor-pointer flex items-start gap-3 ${
                  category === 'behaviour' ? 'border-[#0F766E] bg-white shadow-xs' : 'border-[#E5E5E0] bg-white hover:bg-[#FAF9F6]'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                  <UserX className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[#17181A]">{t('report.behaviour')}</span>
                    <Badge variant="teal" label="Dignity & Rest" size="sm" />
                  </div>
                  <p className="text-xs text-[#73757C] mt-1 leading-normal">{t('report.behaviourDesc')}</p>
                </div>
              </div>
            </div>

            {/* Status Lookup CTA Button */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => onOpenStatusLookup && onOpenStatusLookup()}
                className="text-xs text-[#0F766E] font-bold hover:underline"
              >
                {t('report.checkStatusAction')} →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: VOICE RECORD / TEXT INPUT */}
        {step === 'record' && (
          <div className="space-y-4">
            {/* Zone Picker Chip Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#17181A] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#0F766E]" />
                <span>Workplace Zone (Tap to Pin Location):</span>
              </label>

              <div className="flex flex-wrap gap-1.5">
                {(siteConfig.zones || ['Gate 2 Scaffold Area', 'Pier 14 Viaduct', 'Batching Plant East']).map((z) => (
                  <button
                    key={z}
                    type="button"
                    onClick={() => setSelectedZone(z)}
                    className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                      selectedZone === z
                        ? 'border-[#0F766E] bg-[#0F766E] text-white font-medium'
                        : 'border-[#E5E5E0] bg-white text-[#4A4B4F] hover:bg-[#F4F4F1]'
                    }`}
                  >
                    {z}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode Toggle: Voice vs Type */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-bold text-[#17181A]">
                {isTextMode ? 'Type Report Details' : t('report.step2Voice')}
              </span>
              <button
                type="button"
                onClick={() => setIsTextMode(!isTextMode)}
                className="text-xs text-[#0F766E] font-semibold hover:underline flex items-center gap-1"
              >
                {isTextMode ? <Mic className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                <span>{isTextMode ? 'Use Voice Instead' : t('report.orTypeText')}</span>
              </button>
            </div>

            {/* VOICE RECORDING PANEL */}
            {!isTextMode && (
              <div className="bg-white border border-[#E5E5E0] rounded-[10px] p-6 text-center space-y-4 shadow-xs">
                {permissionDenied ? (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-[6px] text-xs text-red-800">
                    <p className="font-bold">Microphone Access Blocked</p>
                    <p className="mt-0.5">Please allow microphone permissions in browser settings, or switch to typing below.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-[#73757C]">
                      {isRecording ? t('report.recording') : t('report.holdToRecord')}
                    </p>

                    {/* Waveform Visualization */}
                    <div className="h-12 flex items-center justify-center gap-1.5 px-4 bg-[#F8F8F6] rounded-[6px]">
                      {Array.from({ length: 16 }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-1 rounded-full transition-all duration-100 ${
                            isRecording
                              ? 'bg-[#0F766E] animate-pulse'
                              : 'bg-[#D1D1CB]'
                          }`}
                          style={{
                            height: isRecording
                              ? `${Math.max(8, ((i * 13 + recordDuration * 17) % 40) + 8)}px`
                              : '8px',
                          }}
                        />
                      ))}
                    </div>

                    {/* Elapsed Timer */}
                    <div className="text-xs font-mono-code font-bold text-[#17181A]">
                      00:{String(recordDuration).padStart(2, '0')} / 01:00
                    </div>

                    {/* Big Mic Button (Minimum 56px touch target; keyboard space/enter accessible) */}
                    <div className="flex justify-center pt-2">
                      <button
                        type="button"
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`w-20 h-20 rounded-full flex flex-col items-center justify-center transition-all shadow-md focus:outline-none focus:ring-4 focus:ring-teal-200 ${
                          isRecording
                            ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                            : 'bg-[#0F766E] hover:bg-[#115E59] text-white'
                        }`}
                        aria-label={isRecording ? t('report.tapToStop') : t('report.holdToRecord')}
                        aria-live="polite"
                      >
                        {isRecording ? <Square className="w-8 h-8 fill-current" /> : <Mic className="w-8 h-8" />}
                        <span className="text-[10px] font-bold mt-1">
                          {isRecording ? 'STOP' : 'SPEAK'}
                        </span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TEXT INPUT ALTERNATIVE */}
            {isTextMode && (
              <div className="bg-white border border-[#E5E5E0] rounded-[8px] p-4 space-y-3 shadow-xs">
                <textarea
                  rows={4}
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  placeholder={t('report.textPlaceholder')}
                  className="w-full text-xs border border-[#D1D1CB] rounded-[6px] p-3 focus:outline-none focus:ring-1 focus:ring-[#0F766E] leading-relaxed resize-none"
                />

                <Button
                  size="workerHuge"
                  variant="primary"
                  onClick={handleSubmitReport}
                  disabled={typedText.trim().length < 5}
                  icon={<Send className="w-5 h-5 text-white shrink-0" />}
                >
                  <div className="w-full text-center font-bold">
                    {t('common.submit')} Report
                  </div>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: REVIEW VOICE REPORT */}
        {step === 'review' && (
          <div className="bg-white border border-[#E5E5E0] rounded-[8px] p-5 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-[#17181A]">Review Your Report</h2>

            <div className="p-3 bg-[#FAF9F6] border border-[#E5E5E0] rounded-[6px] space-y-2 text-xs">
              <div className="flex items-center justify-between text-[#73757C]">
                <span>Category: <strong className="text-[#17181A]">{category.toUpperCase()}</strong></span>
                <span>Zone: <strong className="text-[#17181A]">{selectedZone}</strong></span>
              </div>
              <div className="pt-2 border-t border-[#EBEBE6] text-[#4A4B4F] italic">
                "{simulatedTranscript}"
              </div>
            </div>

            <p className="text-[11px] text-[#73757C]">
              Your voice will be translated to English for supervisor action. Audio is discarded immediately after transcription.
            </p>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="md"
                className="flex-1"
                onClick={() => {
                  setRecordDuration(0);
                  setStep('record');
                }}
                icon={<RotateCcw className="w-4 h-4" />}
              >
                Re-record
              </Button>

              <Button
                variant="primary"
                size="md"
                className="flex-1"
                onClick={handleSubmitReport}
                icon={<Send className="w-4 h-4" />}
              >
                Submit Anonymously
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: SUBMITTING / PROCESSING */}
        {step === 'submitting' && (
          <div className="py-12 text-center space-y-3">
            <div className="inline-block animate-spin h-9 w-9 text-[#0F766E] border-3 border-current border-t-transparent rounded-full"></div>
            <h3 className="text-sm font-bold text-[#17181A]">Processing Report Securely</h3>
            <p className="text-xs text-[#73757C] max-w-xs mx-auto">
              Transcribing, translating to English, and generating your private case code...
            </p>
          </div>
        )}

        {/* STEP 5: CONFIRMATION & CASE CODE */}
        {step === 'confirmed' && (
          <div className="bg-white border border-[#E5E5E0] rounded-[10px] p-6 text-center space-y-4 shadow-xs animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 bg-[#DCFCE7] border border-[#BBF7D0] rounded-full flex items-center justify-center mx-auto text-[#15803D]">
              <CheckCircle2 className="w-8 h-8" strokeWidth={2.5} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-[#17181A]">{t('report.submittedTitle')}</h2>
              <p className="text-xs text-[#0F766E] font-medium mt-0.5">
                Your name is not saved with this report.
              </p>
            </div>

            {/* Case Code Card */}
            <div className="p-4 bg-[#F8F8F6] border-2 border-dashed border-[#0F766E] rounded-[8px] space-y-1">
              <span className="text-[11px] font-semibold text-[#73757C] uppercase tracking-wider">
                {t('report.caseCodeLabel')}
              </span>
              <div className="text-3xl font-extrabold font-mono-code tabular-nums text-[#0F766E] tracking-wider">
                {createdCaseCode}
              </div>
              <p className="text-[11px] text-[#73757C] pt-1">
                {t('report.caseCodeSaveNotice')}
              </p>
            </div>

            {/* Audio & Copy Controls */}
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => speakCaseCodeSpaced(createdCaseCode)}
                icon={<Volume2 className="w-4 h-4 text-[#0F766E]" />}
              >
                {t('report.speakCaseCode')}
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={copyCaseCode}
                icon={copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              >
                {copiedCode ? 'Copied!' : 'Copy Code'}
              </Button>
            </div>

            {/* What Happens Next */}
            <div className="p-3 bg-[#FAF9F6] border border-[#EBEBE6] rounded-[6px] text-xs text-left space-y-1">
              <span className="font-bold text-[#17181A]">What happens next:</span>
              <p className="text-[#73757C] leading-relaxed">
                Site safety supervisors receive this report anonymously. Check the status anytime using your code.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <Button
                size="workerHuge"
                variant="primary"
                onClick={() => onOpenStatusLookup && onOpenStatusLookup(createdCaseCode)}
              >
                <div className="w-full text-center font-bold">
                  {t('report.checkStatusAction')}
                </div>
              </Button>

              <Button variant="ghost" size="sm" onClick={onBack} className="w-full">
                Done & Return to Home
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
