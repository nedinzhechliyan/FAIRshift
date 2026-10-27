import React, { useState } from 'react';
import { useI18n, SUPPORTED_LANGUAGES, SupportedLanguage } from '../../i18n';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { AudioSpeakerButton } from '../ui/AudioSpeakerButton';
import { Building2, User, Globe, Check, ShieldCheck } from 'lucide-react';

export interface WorkerOption {
  id: string;
  name: string;
  role: string;
  siteId: string;
  scenarioTag: string;
  tagColor: 'green' | 'red' | 'amber' | 'teal';
  defaultLanguage: SupportedLanguage;
}

const DEMO_WORKERS: WorkerOption[] = [
  {
    id: 'worker_const_02',
    name: 'Arjun Verma',
    role: 'Bar Bender & Steel Fixer',
    siteId: 'site-metro-const',
    scenarioTag: '9h30m Shift · 1.5h OT @ 2x',
    tagColor: 'green',
    defaultLanguage: 'hi',
  },
  {
    id: 'worker_const_01',
    name: 'Ramesh Kumar',
    role: 'Scaffold Erector',
    siteId: 'site-metro-const',
    scenarioTag: 'High Strain · 58h Load',
    tagColor: 'red',
    defaultLanguage: 'hi',
  },
  {
    id: 'worker_camp_01',
    name: 'Priya Murugan',
    role: 'Housekeeping Technician',
    siteId: 'site-srm-campus',
    scenarioTag: 'Campus Support · Tamil',
    tagColor: 'amber',
    defaultLanguage: 'ta',
  },
  {
    id: 'worker_const_03',
    name: 'Suresh Paswan',
    role: 'Mason (Grade A)',
    siteId: 'site-metro-const',
    scenarioTag: 'Standard 8h Shift',
    tagColor: 'teal',
    defaultLanguage: 'hi',
  },
];

interface WorkerLoginProps {
  onLoginSuccess: (worker: WorkerOption) => void;
  onSwitchToConsole?: () => void;
}

export const WorkerLogin: React.FC<WorkerLoginProps> = ({ onLoginSuccess, onSwitchToConsole }) => {
  const { language, setLanguage, t } = useI18n();
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('worker_const_02');
  const [loading, setLoading] = useState(false);

  const selectedWorker = DEMO_WORKERS.find(w => w.id === selectedWorkerId) || DEMO_WORKERS[0];

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setLanguage(lang);
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerId: selectedWorker.id,
          role: 'worker',
          siteId: selectedWorker.siteId,
        }),
      });
      onLoginSuccess(selectedWorker);
    } catch (err) {
      console.warn('Demo login fetch error:', err);
      onLoginSuccess(selectedWorker);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col justify-between p-4 max-w-[420px] mx-auto font-worker">
      {/* Top Header */}
      <div className="pt-4 pb-2 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-[10px] bg-[#0F766E] text-white font-bold text-lg mb-2 shadow-xs">
          FS
        </div>
        <h1 className="text-xl font-bold tracking-tight text-[#17181A]">
          {t('common.appName')}
        </h1>
        <p className="text-xs text-[#73757C] mt-0.5">
          {t('common.tagline')}
        </p>

        <div className="mt-2 flex justify-center">
          <AudioSpeakerButton
            textToSpeak={`Welcome to FairShift. Please select your language and your name to begin your shift.`}
            size="sm"
            label={t('common.listen')}
          />
        </div>
      </div>

      {/* Step 1: Language Chooser */}
      <div className="bg-white border border-[#E5E5E0] rounded-[8px] p-4 shadow-xs my-2">
        <div className="flex items-center justify-between mb-2.5">
          <label className="text-xs font-semibold text-[#17181A] flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>1. {t('common.language')} (Choose Language)</span>
          </label>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {SUPPORTED_LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => handleLanguageChange(l.code)}
              className={`py-3 px-2 rounded-[6px] border text-center transition-all ${
                language === l.code
                  ? 'border-[#0F766E] bg-[#F0FDFA] text-[#0F766E] font-bold shadow-xs'
                  : 'border-[#E5E5E0] bg-white text-[#4A4B4F] hover:bg-[#F4F4F1]'
              }`}
            >
              <div className="text-sm font-semibold">{l.nativeLabel}</div>
              <div className="text-[10px] opacity-75">{l.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Worker Picker */}
      <div className="bg-white border border-[#E5E5E0] rounded-[8px] p-4 shadow-xs my-2 flex-1">
        <label className="text-xs font-semibold text-[#17181A] flex items-center gap-1.5 mb-2.5">
          <User className="w-3.5 h-3.5 text-[#0F766E]" />
          <span>2. Select Worker Identity</span>
        </label>

        <div className="space-y-2">
          {DEMO_WORKERS.map((worker) => {
            const isSelected = selectedWorkerId === worker.id;
            const workerSite = SECTOR_CONFIGS[worker.siteId];

            return (
              <div
                key={worker.id}
                onClick={() => {
                  setSelectedWorkerId(worker.id);
                  if (worker.defaultLanguage) {
                    setLanguage(worker.defaultLanguage);
                  }
                }}
                className={`p-3 rounded-[6px] border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-[#0F766E] bg-[#F0FDFA]'
                    : 'border-[#E5E5E0] bg-white hover:bg-[#FAF9F6]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#17181A]">{worker.name}</span>
                      {isSelected && <Check className="w-4 h-4 text-[#0F766E]" />}
                    </div>
                    <div className="text-xs text-[#4A4B4F] mt-0.5">{worker.role}</div>
                    <div className="text-[11px] text-[#73757C] mt-0.5 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-[#0F766E]" />
                      <span>{workerSite?.siteName.split(' - ')[0]}</span>
                    </div>
                  </div>

                  <Badge variant={worker.tagColor} label={worker.scenarioTag} size="sm" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Primary Action Button (Min 56px touch target) */}
      <div className="space-y-2 pt-2">
        <Button
          size="workerHuge"
          variant="primary"
          onClick={handleLogin}
          loading={loading}
          icon={<ShieldCheck className="w-5 h-5 text-white shrink-0" />}
        >
          <div className="w-full text-center">
            <span className="text-base font-bold">
              {t('common.confirm')} ({t('worker.welcomeSimple')})
            </span>
          </div>
        </Button>

        {onSwitchToConsole && (
          <button
            onClick={onSwitchToConsole}
            className="w-full text-center text-xs text-[#73757C] hover:text-[#0F766E] py-2 transition-colors"
          >
            Switch to Employer Console →
          </button>
        )}
      </div>
    </div>
  );
};
