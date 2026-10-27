import React, { useState, useEffect } from 'react';
import { useI18n } from '../../i18n';
import { useToast } from '../ui/Toast';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { AudioSpeakerButton } from '../ui/AudioSpeakerButton';
import { AnonymousReport } from '../../types';
import { 
  Search, 
  X, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  ArrowLeft,
  Volume2
} from 'lucide-react';

interface StatusLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCode?: string;
}

export const StatusLookupModal: React.FC<StatusLookupModalProps> = ({
  isOpen,
  onClose,
  initialCode = '',
}) => {
  const { t, language } = useI18n();
  const { showToast } = useToast();

  const [caseCode, setCaseCode] = useState<string>(initialCode);
  const [loading, setLoading] = useState<boolean>(false);
  const [caseData, setCaseData] = useState<AnonymousReport | null>(null);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    if (initialCode) {
      setCaseCode(initialCode);
      lookupCode(initialCode);
    }
  }, [initialCode]);

  // Live polling every 5s for the looked-up case; pauses when tab is hidden
  useEffect(() => {
    if (!isOpen || !caseData?.caseCode) return;

    const pollStatus = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const res = await fetch(`/api/reports/status/${encodeURIComponent(caseData.caseCode)}`);
        if (res.ok) {
          const fresh = await res.json();
          if (fresh.status !== caseData.status || fresh.supervisorNotes !== caseData.supervisorNotes) {
            showToast('Supervisor updated case status!', 'success');
          }
          setCaseData(fresh);
          setLastUpdated(new Date());
        }
      } catch (err) {
        // Silent fail on background poll
      }
    };

    const interval = setInterval(pollStatus, 5000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        pollStatus();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isOpen, caseData?.caseCode, caseData?.status, caseData?.supervisorNotes]);

  if (!isOpen) return null;

  const lookupCode = async (codeToSearch: string) => {
    const clean = codeToSearch.trim().toUpperCase();
    if (!clean) return;

    setLoading(true);
    setNotFound(false);
    setCaseData(null);

    try {
      const res = await fetch(`/api/reports/status/${encodeURIComponent(clean)}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      const data = await res.json();
      setCaseData(data);
      setLastUpdated(new Date());
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved':
        return <Badge variant="green" label={t('statusLookup.statusResolved')} size="sm" />;
      case 'acknowledged':
      case 'in_progress':
        return <Badge variant="amber" label={t('statusLookup.statusActioned')} size="sm" />;
      case 'open':
      default:
        return <Badge variant="teal" label={t('statusLookup.statusOpen')} size="sm" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-[#17181A]/60 backdrop-blur-[2px] font-worker">
      <div className="bg-white border border-[#E5E5E0] rounded-[12px] shadow-2xl max-w-[380px] w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-[#E5E5E0] bg-[#FAFAF8] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#17181A]">{t('statusLookup.title')}</h2>
            <p className="text-xs text-[#73757C] mt-0.5">{t('statusLookup.subtitle')}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-[4px] text-[#73757C] hover:text-[#17181A] hover:bg-[#EBEBE6]"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Input Bar */}
          <div className="flex gap-2">
            <input
              type="text"
              value={caseCode}
              onChange={(e) => setCaseCode(e.target.value.toUpperCase())}
              placeholder={t('statusLookup.inputPlaceholder')}
              className="flex-1 text-sm font-mono-code border border-[#D1D1CB] rounded-[6px] px-3 py-2 uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
            />
            <Button
              variant="primary"
              size="md"
              loading={loading}
              onClick={() => lookupCode(caseCode)}
              icon={<Search className="w-4 h-4" />}
            >
              {t('statusLookup.checkBtn')}
            </Button>
          </div>

          {/* Quick Demo Pre-fills */}
          <div className="flex items-center gap-1.5 text-[11px] text-[#73757C]">
            <span>Try demo codes:</span>
            <button
              onClick={() => {
                setCaseCode('RPT-4K92');
                lookupCode('RPT-4K92');
              }}
              className="font-mono-code font-bold text-[#0F766E] hover:underline"
            >
              RPT-4K92
            </button>
            <span>·</span>
            <button
              onClick={() => {
                setCaseCode('RPT-8B19');
                lookupCode('RPT-8B19');
              }}
              className="font-mono-code font-bold text-[#0F766E] hover:underline"
            >
              RPT-8B19
            </button>
          </div>

          {/* Not Found */}
          {notFound && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-[6px] text-xs text-amber-900">
              {t('statusLookup.notFound')}
            </div>
          )}

          {/* Result Card */}
          {caseData && (
            <div className="p-4 bg-[#FAF9F6] border border-[#E5E5E0] rounded-[8px] space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] uppercase font-mono-code text-[#73757C]">Case Code</span>
                  <div className="text-base font-extrabold font-mono-code text-[#17181A]">{caseData.caseCode}</div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  {getStatusBadge(caseData.status)}
                  <span 
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-mono-code font-bold text-emerald-800"
                    title="Live 5-second polling active. Pauses when tab is hidden."
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live • {lastUpdated.toLocaleTimeString()}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#EBEBE6] space-y-1.5 text-xs">
                <div className="flex justify-between text-[#73757C]">
                  <span>Category:</span>
                  <span className="font-semibold text-[#17181A] capitalize">{caseData.category}</span>
                </div>
                <div className="flex justify-between text-[#73757C]">
                  <span>Issue:</span>
                  <span className="font-semibold text-[#17181A]">{caseData.subcategory}</span>
                </div>
                <div className="flex justify-between text-[#73757C]">
                  <span>{t('statusLookup.lastUpdated')}:</span>
                  <span className="font-mono-code">{new Date(caseData.updatedAtHour || caseData.createdAtHour || caseData.createdAt || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Summary */}
              <div className="p-2.5 bg-white border border-[#E5E5E0] rounded-[4px] text-xs space-y-1">
                <span className="text-[10px] font-bold uppercase text-[#73757C]">{t('statusLookup.aiSummary')}</span>
                <p className="text-[#17181A] leading-relaxed">{caseData.summaryEn}</p>
              </div>

              {/* Supervisor Update / Action Taken */}
              {caseData.supervisorNotes && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-[4px] text-xs space-y-1 text-emerald-950">
                  <span className="text-[10px] font-bold uppercase text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    {t('statusLookup.actionTaken')}
                  </span>
                  <p className="leading-relaxed">{caseData.supervisorNotes}</p>
                </div>
              )}

              {/* Audio Readout */}
              <AudioSpeakerButton
                textToSpeak={`Status for report ${caseData.caseCode}. Status: ${caseData.status}. Summary: ${caseData.summaryEn}. ${
                  caseData.supervisorNotes ? 'Supervisor update: ' + caseData.supervisorNotes : ''
                }`}
                size="sm"
                label={t('common.listen')}
                className="w-full justify-center"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
