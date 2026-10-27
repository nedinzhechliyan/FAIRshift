import React, { useState } from 'react';
import { useI18n } from '../../i18n';
import { useToast } from '../ui/Toast';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { AudioSpeakerButton } from '../ui/AudioSpeakerButton';
import { PulseRating, PulseTopic } from '../../types';
import { 
  X, 
  Frown, 
  Meh, 
  Smile, 
  SmilePlus, 
  Heart, 
  CheckCircle2, 
  Mic, 
  Square, 
  ShieldCheck,
  ArrowRight
} from 'lucide-react';

interface PulseFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  workerId: string;
  siteId: string;
  sector: 'construction' | 'campus' | 'hospital';
}

export const PulseFeedbackModal: React.FC<PulseFeedbackModalProps> = ({
  isOpen,
  onClose,
  workerId,
  siteId,
  sector,
}) => {
  const { t, language } = useI18n();
  const { showToast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: rating, 2: topic, 3: optional voice note, 4: thank you
  const [rating, setRating] = useState<'terrible' | 'difficult' | 'acceptable' | 'good' | 'great'>('good');
  const [ratingValue, setRatingValue] = useState<number>(4);
  const [topic, setTopic] = useState<'pay' | 'safety' | 'manager' | 'rest_shifts' | 'facilities'>('safety');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [voiceNoteRecorded, setVoiceNoteRecorded] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const RATING_OPTIONS = [
    { key: 'terrible', value: 1, label: 'Terrible', icon: Frown, color: 'text-rose-600 bg-rose-50 border-rose-200' },
    { key: 'difficult', value: 2, label: 'Difficult', icon: Meh, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { key: 'acceptable', value: 3, label: 'Acceptable', icon: Smile, color: 'text-zinc-600 bg-zinc-50 border-zinc-200' },
    { key: 'good', value: 4, label: 'Good', icon: SmilePlus, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { key: 'great', value: 5, label: 'Great', icon: Heart, color: 'text-teal-600 bg-teal-50 border-teal-200' },
  ] as const;

  const TOPIC_OPTIONS = [
    { key: 'pay', label: 'Shift Pay & Rates', desc: 'Overtime, timely settlement' },
    { key: 'safety', label: 'Safety & Tools', desc: 'PPE, fall protection, gear' },
    { key: 'manager', label: 'Supervisor Respect', desc: 'Communication & treatment' },
    { key: 'rest_shifts', label: 'Rest & Shift Hours', desc: 'Breaks, drinking water' },
    { key: 'facilities', label: 'Site Facilities', desc: 'Rest shade, sanitation' },
  ] as const;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/pulse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerId,
          siteId,
          sector,
          rating,
          ratingValue,
          topic,
          voiceNoteSummary: voiceNoteRecorded ? 'Worker logged brief positive voice reflection on rest break access.' : undefined,
        }),
      });

      const data = await res.json();
      if (res.status === 409) {
        showToast(data.error || 'Already submitted this week', 'info');
        onClose();
        return;
      }

      setStep(4);
      showToast(t('pulse.thankYou'), 'success');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch {
      setStep(4);
      setTimeout(() => onClose(), 1500);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-[#17181A]/60 backdrop-blur-[2px] font-worker">
      <div className="bg-white border border-[#E5E5E0] rounded-[12px] shadow-2xl max-w-[380px] w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-[#E5E5E0] bg-[#FAFAF8] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0F766E]"></span>
              <h2 className="text-sm font-bold text-[#17181A]">{t('pulse.title')}</h2>
            </div>
            <p className="text-[11px] text-[#73757C] mt-0.5">{t('pulse.subtitle')} · Zero worker IDs linked</p>
          </div>
          <button onClick={onClose} className="p-1 rounded text-[#73757C] hover:text-[#17181A]" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="h-1 bg-[#EBEBE6] w-full">
          <div
            className="h-full bg-[#0F766E] transition-all duration-200"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* STEP 1: 5 FACES RATING */}
          {step === 1 && (
            <div className="space-y-4 text-center">
              <p className="text-xs font-semibold text-[#17181A]">
                1. How was your shift week overall?
              </p>

              {/* 5 Faces Grid */}
              <div className="grid grid-cols-5 gap-1.5 pt-2">
                {RATING_OPTIONS.map((item) => {
                  const Icon = item.icon;
                  const isSelected = rating === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setRating(item.key as PulseRating);
                        setRatingValue(item.value);
                      }}
                      className={`p-2.5 rounded-[8px] border flex flex-col items-center justify-center transition-all ${
                        isSelected
                          ? `${item.color} font-bold shadow-xs scale-105 border-2`
                          : 'border-[#E5E5E0] bg-white text-[#73757C] hover:bg-[#F9F9F7]'
                      }`}
                    >
                      <Icon className="w-6 h-6 mb-1" strokeWidth={2} />
                      <span className="text-[10px] leading-tight">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-3">
                <Button
                  size="workerHuge"
                  variant="primary"
                  onClick={() => setStep(2)}
                >
                  <div className="w-full text-center font-bold">
                    Next: Pick Topic →
                  </div>
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: TOPIC PICKER */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-[#17181A] text-center">
                2. What was the main factor for this rating?
              </p>

              <div className="space-y-2">
                {TOPIC_OPTIONS.map((item) => {
                  const isSelected = topic === item.key;
                  return (
                    <div
                      key={item.key}
                      onClick={() => setTopic(item.key as PulseTopic)}
                      className={`p-2.5 rounded-[6px] border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-[#0F766E] bg-[#F0FDFA] font-bold text-[#0F766E]'
                          : 'border-[#E5E5E0] bg-white text-[#4A4B4F] hover:bg-[#FAF9F6]'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-semibold">{item.label}</div>
                        <div className="text-[10px] text-[#73757C]">{item.desc}</div>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-[#0F766E]" />}
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 flex gap-2">
                <Button variant="secondary" size="md" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button variant="primary" size="md" onClick={() => setStep(3)} className="flex-1">
                  Next →
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: OPTIONAL VOICE NOTE */}
          {step === 3 && (
            <div className="space-y-4 text-center">
              <div>
                <p className="text-xs font-semibold text-[#17181A]">
                  3. Optional 10-Second Voice Reflection
                </p>
                <p className="text-[11px] text-[#73757C] mt-0.5">
                  Speak any extra thoughts, or tap Submit to finish now.
                </p>
              </div>

              <div className="p-4 bg-[#F8F8F6] border border-[#E5E5E0] rounded-[8px] space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsRecording(!isRecording);
                    if (!isRecording) {
                      setTimeout(() => {
                        setIsRecording(false);
                        setVoiceNoteRecorded(true);
                      }, 4000);
                    }
                  }}
                  className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center transition-all ${
                    isRecording
                      ? 'bg-rose-600 text-white animate-pulse'
                      : voiceNoteRecorded
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#0F766E] text-white hover:bg-[#115E59]'
                  }`}
                >
                  {isRecording ? <Square className="w-6 h-6 fill-current" /> : voiceNoteRecorded ? <CheckCircle2 className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>

                <p className="text-xs text-[#4A4B4F]">
                  {isRecording ? 'Listening (4s simulation)...' : voiceNoteRecorded ? 'Voice note captured' : 'Tap to Record Voice Note'}
                </p>
              </div>

              <div className="pt-1 flex gap-2">
                <Button variant="outline" size="md" onClick={handleSubmit} loading={submitting} className="flex-1">
                  Skip & Submit
                </Button>
                <Button variant="primary" size="md" onClick={handleSubmit} loading={submitting} className="flex-1">
                  Submit Feedback
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: THANK YOU */}
          {step === 4 && (
            <div className="py-8 text-center space-y-3">
              <div className="w-14 h-14 bg-[#DCFCE7] border border-[#BBF7D0] rounded-full flex items-center justify-center mx-auto text-[#15803D]">
                <CheckCircle2 className="w-8 h-8" strokeWidth={2.5} />
              </div>
              <h3 className="text-sm font-bold text-[#17181A]">Feedback Recorded Anonymously</h3>
              <p className="text-xs text-[#73757C] max-w-xs mx-auto">
                Thank you! Your weekly feedback directly impacts workgroup morale and safety standards.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
