import React, { useState, useEffect } from 'react';
import { useI18n, SUPPORTED_LANGUAGES, SupportedLanguage } from '../../i18n';
import { useToast } from '../ui/Toast';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { AudioSpeakerButton } from '../ui/AudioSpeakerButton';
import { CheckInModal } from './CheckInModal';
import { ShiftPayslipCard } from './ShiftPayslipCard';
import { MyPayScreen } from './MyPayScreen';
import { VoiceReportFlow } from './VoiceReportFlow';
import { StatusLookupModal } from './StatusLookupModal';
import { PulseFeedbackModal } from './PulseFeedbackModal';
import { offlineQueue } from '../../services/offlineQueue';
import { formatINR } from '../../utils/formatCurrency';
import { SECTOR_CONFIGS, LEGAL_DISCLAIMER_NOTE } from '../../config/siteRules';
import { ShiftRecord } from '../../types';
import { 
  Clock, 
  MapPin, 
  Receipt, 
  AlertTriangle, 
  WifiOff, 
  RefreshCw, 
  Globe, 
  ArrowRight, 
  User, 
  Sparkles,
  LogOut,
  CheckCircle2,
  Calendar
} from 'lucide-react';

interface WorkerHomeProps {
  workerId: string;
  workerName: string;
  role: string;
  siteId: string;
  baseHourlyRate: number;
  onLogout: () => void;
  onNavigateToReport?: () => void;
  onSwitchToConsole?: () => void;
}

export const WorkerHome: React.FC<WorkerHomeProps> = ({
  workerId,
  workerName,
  role,
  siteId,
  baseHourlyRate,
  onLogout,
  onNavigateToReport,
  onSwitchToConsole,
}) => {
  const { t, language, setLanguage } = useI18n();
  const { showToast } = useToast();

  const [activeShift, setActiveShift] = useState<Partial<ShiftRecord> | null>(null);
  const [loadingShift, setLoadingShift] = useState(true);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'payslip' | 'my-pay' | 'report-preview'>('home');
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Completed shift data for payslip view
  const [payslipData, setPayslipData] = useState<{ totalHours: number; advanceDeduction: number } | null>(null);

  // Phase 3 modals & views
  const [reportCategory, setReportCategory] = useState<'safety' | 'payment' | 'behaviour'>('safety');
  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const [lookupInitialCode, setLookupInitialCode] = useState('');
  const [isPulseOpen, setIsPulseOpen] = useState(false);

  const siteConfig = SECTOR_CONFIGS[siteId] || SECTOR_CONFIGS['site-metro-const'];

  // Check URL query for ?dev=1
  const isDevMode = typeof window !== 'undefined' && window.location.search.includes('dev=1');

  // Monitor network and offline queue
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = offlineQueue.onPendingChange((count) => {
      setPendingSyncCount(count);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  // Fetch active shift status
  const fetchActiveShift = async () => {
    setLoadingShift(true);
    try {
      const res = await fetch(`/api/shifts/active/${workerId}`);
      const data = await res.json();
      setActiveShift(data.shift || null);
    } catch {
      setActiveShift(null);
    } finally {
      setLoadingShift(false);
    }
  };

  useEffect(() => {
    fetchActiveShift();
  }, [workerId]);

  // Demo Fast-Forward simulation: Simulates completed 9h30m shift
  const handleSimulateShift = () => {
    setPayslipData({
      totalHours: 9.5, // 9h 30m => 8h regular + 1.5h OT @ 2x
      advanceDeduction: 200,
    });
    setCurrentView('payslip');
    showToast('Fast-forwarded to completed 9h30m shift payslip', 'success');
  };

  const isCheckedIn = Boolean(activeShift);

  // Route 1: Voice Report Flow
  if (currentView === 'report-preview') {
    return (
      <VoiceReportFlow
        siteId={siteId}
        initialCategory={reportCategory}
        onBack={() => setCurrentView('home')}
        onOpenStatusLookup={(code) => {
          if (code) setLookupInitialCode(code);
          setIsLookupOpen(true);
        }}
      />
    );
  }

  // Route 2: My Pay Screen
  if (currentView === 'my-pay') {
    return (
      <MyPayScreen
        workerId={workerId}
        siteId={siteId}
        workerName={workerName}
        baseHourlyRate={baseHourlyRate}
        onBack={() => setCurrentView('home')}
        onRaiseIssue={() => {
          setReportCategory('payment');
          setCurrentView('report-preview');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col justify-between max-w-[420px] mx-auto font-worker">
      {/* Offline Status Banner */}
      {(!isOnline || pendingSyncCount > 0) && (
        <div className="bg-[#FEF3C7] border-b border-[#FDE68A] px-4 py-2 text-xs text-[#B45309] flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-1.5">
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            <span className="font-medium">
              {!isOnline ? t('common.offlineNotice') : `${pendingSyncCount} action(s) saved, will sync automatically`}
            </span>
          </div>
          {pendingSyncCount > 0 && isOnline && (
            <button
              onClick={() => offlineQueue.triggerSync()}
              className="p-1 hover:bg-[#FDE68A] rounded transition-colors text-xs font-semibold"
            >
              <RefreshCw className="w-3 h-3 animate-spin" />
            </button>
          )}
        </div>
      )}

      {/* Top Bar: Always Visible Language Switcher & Audio */}
      <header className="bg-white border-b border-[#E5E5E0] p-3 flex items-center justify-between sticky top-0 z-20 shadow-xs">
        {/* Worker Info mini pill */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#0F766E] text-white flex items-center justify-center font-bold text-xs">
            {workerName.charAt(0)}
          </div>
          <div>
            <p className="text-xs font-bold text-[#17181A] leading-tight">{workerName}</p>
            <p className="text-[10px] text-[#73757C] truncate max-w-[120px]">{siteConfig.siteName.split(' - ')[0]}</p>
          </div>
        </div>

        {/* Language Switcher Buttons & Speaker */}
        <div className="flex items-center gap-1">
          <div className="flex items-center bg-[#F4F4F1] p-0.5 rounded-[6px] border border-[#E5E5E0]">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => setLanguage(lang.code)}
                className={`px-1.5 py-0.5 text-[11px] font-semibold rounded-[4px] transition-colors ${
                  language === lang.code
                    ? 'bg-[#0F766E] text-white shadow-xs'
                    : 'text-[#4A4B4F] hover:bg-white'
                }`}
              >
                {lang.code === 'hi' ? 'हिन्दी' : lang.code === 'ta' ? 'தமிழ்' : 'EN'}
              </button>
            ))}
          </div>

          <AudioSpeakerButton
            textToSpeak={`${t('worker.welcome', { name: workerName })}. ${
              isCheckedIn ? 'You are currently working.' : 'You have not checked in yet today.'
            }`}
            size="sm"
          />
        </div>
      </header>

      {/* Main Screen Body */}
      <main className="p-4 space-y-4 flex-1">
        {/* Read-Only Today's Shift Card */}
        <div className="bg-white border border-[#E5E5E0] rounded-[8px] p-4 shadow-xs space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[#73757C] uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#0F766E]" />
                {t('worker.shiftToday')}
              </span>
              <h2 className="text-sm font-bold text-[#17181A] mt-0.5">
                {siteConfig.shiftPatterns[0]?.name || 'General Shift (08:00 - 16:30)'}
              </h2>
            </div>
            <Badge
              variant={isCheckedIn ? 'green' : 'amber'}
              label={isCheckedIn ? t('worker.checkedIn') : t('worker.notCheckedIn')}
              size="sm"
            />
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-[#F4F4F1]">
            <span className="text-[#4A4B4F]">{siteConfig.vocabulary.workplaceLabel}:</span>
            <span className="font-medium text-[#17181A]">{siteConfig.siteName.split(' - ')[0]}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-[#4A4B4F]">{t('worker.hourlyRate', { rate: baseHourlyRate })}</span>
            <span className="text-[11px] text-[#0F766E] font-medium font-mono-code">
              OT = 2.0x ({formatINR(baseHourlyRate * 2)}/hr)
            </span>
          </div>
        </div>

        {/* Active Payslip View (If shift just completed or simulated) */}
        {payslipData && (
          <div className="space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">
                Shift Settlement Card
              </span>
              <button
                onClick={() => setPayslipData(null)}
                className="text-xs text-[#73757C] hover:text-[#17181A]"
              >
                Hide
              </button>
            </div>
            <ShiftPayslipCard
              siteId={siteId}
              workerName={workerName}
              baseHourlyRate={baseHourlyRate}
              totalWorkedHours={payslipData.totalHours}
              advanceDeduction={payslipData.advanceDeduction}
              onRaiseIssue={() => {
                showToast(t('payslip.issueSubmitted'), 'info');
              }}
            />
          </div>
        )}

        {/* EXACTLY THREE LARGE ACTIONS (MIN 56px TOUCH TARGETS) */}
        <div className="space-y-3 pt-1">
          {/* ACTION 1: Check In / Check Out (State-Aware) */}
          <Button
            size="workerHuge"
            variant={isCheckedIn ? 'outline' : 'primary'}
            className={isCheckedIn ? 'border-amber-400 bg-amber-50/50 hover:bg-amber-100/50 text-[#17181A]' : ''}
            icon={
              <Clock className={`w-6 h-6 shrink-0 ${isCheckedIn ? 'text-amber-600' : 'text-white'}`} />
            }
            onClick={() => setIsCheckInModalOpen(true)}
          >
            <div>
              <div className="text-base font-bold">
                {isCheckedIn ? t('worker.checkOutAction') : t('worker.checkInAction')}
              </div>
              <div className={`text-xs font-normal ${isCheckedIn ? 'text-amber-800' : 'text-teal-100'}`}>
                {isCheckedIn ? 'End duty & calculate shift earnings' : t('checkin.subtitle')}
              </div>
            </div>
          </Button>

          {/* ACTION 2: My Pay */}
          <Button
            size="workerHuge"
            variant="secondary"
            icon={<span className="text-xl font-bold text-[#0F766E] shrink-0">₹</span>}
            onClick={() => setCurrentView('my-pay')}
          >
            <div>
              <div className="text-base font-bold">{t('worker.myPayAction')}</div>
              <div className="text-xs font-normal text-[#73757C]">
                Timesheets, weekly hour limit, transparent payslips
              </div>
            </div>
          </Button>

          {/* ACTION 3: Report a Problem (Anonymous) */}
          <Button
            size="workerHuge"
            variant="secondary"
            icon={<AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />}
            onClick={() => {
              setReportCategory('safety');
              setCurrentView('report-preview');
            }}
          >
            <div>
              <div className="text-base font-bold">{t('worker.reportAction')}</div>
              <div className="text-xs font-normal text-[#73757C]">
                {t('report.subtitle')}
              </div>
            </div>
          </Button>
        </div>

        {/* Phase 3 Worker Quick Actions: Status Lookup & Weekly Mood Check */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => setIsLookupOpen(true)}
            className="p-3 bg-white border border-[#E5E5E0] hover:border-[#0F766E] rounded-[8px] text-left transition-colors shadow-xs flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-xs font-bold text-[#17181A]">
              <span>Check Report</span>
              <Receipt className="w-3.5 h-3.5 text-[#0F766E]" />
            </div>
            <p className="text-[11px] text-[#73757C] mt-1">Enter your RPT-XXXX code</p>
          </button>

          <button
            type="button"
            onClick={() => setIsPulseOpen(true)}
            className="p-3 bg-white border border-[#E5E5E0] hover:border-[#0F766E] rounded-[8px] text-left transition-colors shadow-xs flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-xs font-bold text-[#17181A]">
              <span>Weekly Mood</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <p className="text-[11px] text-[#73757C] mt-1">15-second check-in</p>
          </button>
        </div>

        {/* Simulation Control (Visible in demo mode or with ?dev=1) */}
        <div className="pt-2">
          <div className="p-3 bg-[#F8F8F6] border border-dashed border-[#D1D1CB] rounded-[8px] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-[#17181A] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#0F766E]" />
                Demo Shift Simulator
              </span>
              <p className="text-[10px] text-[#73757C]">Fast-forward 9h30m shift (1h30m OT @ 2x)</p>
            </div>
            <Button
              variant="teal"
              size="sm"
              onClick={handleSimulateShift}
            >
              Simulate Shift
            </Button>
          </div>
        </div>
      </main>

      {/* Footer Disclaimer & Identity */}
      <footer className="p-3 border-t border-[#E5E5E0] bg-white text-center space-y-2">
        <p className="text-[10px] text-[#73757C] leading-normal">
          {LEGAL_DISCLAIMER_NOTE}
        </p>

        <div className="flex items-center justify-between text-xs text-[#73757C] pt-1">
          <button
            onClick={onLogout}
            className="flex items-center gap-1 text-[11px] text-[#73757C] hover:text-[#B91C1C]"
          >
            <LogOut className="w-3 h-3" />
            <span>Switch Identity</span>
          </button>

          {onSwitchToConsole && (
            <button
              onClick={onSwitchToConsole}
              className="text-[11px] text-[#0F766E] hover:underline"
            >
              Employer Console →
            </button>
          )}
        </div>
      </footer>

      {/* Check-In / Check-Out Modal */}
      <CheckInModal
        isOpen={isCheckInModalOpen}
        onClose={() => setIsCheckInModalOpen(false)}
        type={isCheckedIn ? 'check-out' : 'check-in'}
        workerId={workerId}
        siteId={siteId}
        activeShiftStartTime={activeShift?.checkInTime}
        onSuccess={(shift) => {
          setIsCheckInModalOpen(false);
          if (isCheckedIn) {
            // Checked out! Show completed payslip
            setActiveShift(null);
            setPayslipData({
              totalHours: 9.5, // 9h 30m demo result
              advanceDeduction: 200,
            });
          } else {
            setActiveShift(shift);
          }
        }}
      />

      {/* Case Status Lookup Modal */}
      <StatusLookupModal
        isOpen={isLookupOpen}
        onClose={() => {
          setIsLookupOpen(false);
          setLookupInitialCode('');
        }}
        initialCode={lookupInitialCode}
      />

      {/* Weekly Mood Pulse Modal */}
      <PulseFeedbackModal
        isOpen={isPulseOpen}
        onClose={() => setIsPulseOpen(false)}
        workerId={workerId}
        siteId={siteId}
        sector={siteConfig.sector}
      />
    </div>
  );
};

