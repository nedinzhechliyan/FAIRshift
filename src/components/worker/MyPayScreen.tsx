import React, { useState, useEffect } from 'react';
import { useI18n } from '../../i18n';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { AudioSpeakerButton } from '../ui/AudioSpeakerButton';
import { ShiftPayslipCard } from './ShiftPayslipCard';
import { formatINR } from '../../utils/formatCurrency';
import { ShiftRecord } from '../../types';
import { SECTOR_CONFIGS } from '../../config/siteRules';
import { 
  Receipt, 
  ArrowLeft, 
  Clock, 
  ChevronRight, 
  TrendingUp, 
  Calendar, 
  CheckCircle2 
} from 'lucide-react';

interface MyPayScreenProps {
  workerId: string;
  siteId: string;
  workerName: string;
  baseHourlyRate: number;
  onBack: () => void;
  onRaiseIssue?: (draft: { category: string; subcategory: string; netPay: number }) => void;
}

export const MyPayScreen: React.FC<MyPayScreenProps> = ({
  workerId,
  siteId,
  workerName,
  baseHourlyRate,
  onBack,
  onRaiseIssue,
}) => {
  const { t, language } = useI18n();
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShift, setSelectedShift] = useState<ShiftRecord | null>(null);

  const siteConfig = SECTOR_CONFIGS[siteId] || SECTOR_CONFIGS['site-metro-const'];

  useEffect(() => {
    async function loadShifts() {
      setLoading(true);
      try {
        const res = await fetch(`/api/shifts?workerId=${workerId}&limit=14`);
        const data = await res.json();
        setShifts(data.shifts || []);
      } catch (err) {
        console.warn('Failed loading shifts:', err);
      } finally {
        setLoading(false);
      }
    }
    loadShifts();
  }, [workerId]);

  // Calculate 7-day cumulative hours against statutory limit (48 standard / 60 cap)
  const now = new Date();
  const past7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recent7dShifts = shifts.filter(s => new Date(s.checkInTime) >= past7Days);
  const totalWeeklyHours = recent7dShifts.reduce((acc, s) => acc + (s.totalHours || 0), 0);
  const totalWeeklyNetPay = recent7dShifts.reduce((acc, s) => acc + (s.netPay || 0), 0);
  const weeklyLimit = siteConfig.rules.maxWeeklyHoursNormal; // 48h
  const weeklyHoursPct = Math.min(100, Math.round((totalWeeklyHours / weeklyLimit) * 100));

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col max-w-[420px] mx-auto font-worker">
      {/* Top Header */}
      <div className="bg-white p-4 border-b border-[#E5E5E0] sticky top-0 z-20 flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-1.5 -ml-1 rounded-[6px] text-[#4A4B4F] hover:bg-[#F4F4F1] hover:text-[#17181A] transition-colors flex items-center gap-1 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('common.back')}</span>
        </button>

        <h1 className="text-sm font-bold text-[#17181A]">{t('worker.myPayAction')}</h1>

        <AudioSpeakerButton
          textToSpeak={`My Pay. Total hours worked in past seven days: ${totalWeeklyHours} hours out of standard ${weeklyLimit} hours limit. Total earnings: ${formatINR(totalWeeklyNetPay)}.`}
          size="sm"
          label={t('common.listen')}
        />
      </div>

      {/* Main Container */}
      <div className="p-4 space-y-4 flex-1">
        {/* Weekly Hours vs Statutory Limit Card */}
        <div className="bg-white border border-[#E5E5E0] rounded-[8px] p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[#73757C] uppercase tracking-wider">
                Weekly Working Hours (7 Days)
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-bold font-mono-code tabular-nums text-[#17181A]">
                  {totalWeeklyHours.toFixed(1)}h
                </span>
                <span className="text-xs text-[#73757C]">
                  / {weeklyLimit}h standard limit
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-semibold text-[#73757C] uppercase tracking-wider">
                7-Day Net Take-Home
              </span>
              <div className="text-base font-bold font-mono-code tabular-nums text-[#0F766E]">
                {formatINR(totalWeeklyNetPay)}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="w-full bg-[#EBEBE6] h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  totalWeeklyHours > 60
                    ? 'bg-[#DC2626]'
                    : totalWeeklyHours > weeklyLimit
                    ? 'bg-[#D97706]'
                    : 'bg-[#0F766E]'
                }`}
                style={{ width: `${Math.min(100, (totalWeeklyHours / 60) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-[#73757C] font-mono-code">
              <span>0h</span>
              <span>48h (Norm)</span>
              <span>60h (Statutory Cap)</span>
            </div>
          </div>

          <p className="text-[11px] text-[#73757C] leading-normal pt-1">
            All overtime beyond 8 hours/day is credited at <strong>2.0x statutory double rate</strong>.
          </p>
        </div>

        {/* Selected Shift Modal View */}
        {selectedShift && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-[#17181A]/60 backdrop-blur-[2px]">
            <div className="max-w-[400px] w-full">
              <ShiftPayslipCard
                siteId={selectedShift.siteId}
                workerName={workerName}
                baseHourlyRate={selectedShift.baseHourlyRate}
                totalWorkedHours={selectedShift.totalHours}
                advanceDeduction={selectedShift.advanceDeduction}
                onRaiseIssue={onRaiseIssue}
                onClose={() => setSelectedShift(null)}
              />
              <div className="mt-2 text-center">
                <Button variant="secondary" size="sm" onClick={() => setSelectedShift(null)}>
                  {t('common.close')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Recent Shift Timesheets List */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#4A4B4F]">
            Recent Shift Payslips (Last 14 Days)
          </h2>

          {loading ? (
            <div className="p-8 text-center text-xs text-[#73757C]">Loading shift history...</div>
          ) : shifts.length === 0 ? (
            <div className="p-6 bg-white border border-[#E5E5E0] rounded-[8px] text-center text-xs text-[#73757C]">
              No shifts recorded yet. Check in to begin your shift.
            </div>
          ) : (
            <div className="divide-y divide-[#EBEBE6] border border-[#E5E5E0] rounded-[8px] bg-white overflow-hidden shadow-xs">
              {shifts.map((shift) => {
                const shiftDate = new Date(shift.checkInTime);
                const dateStr = shiftDate.toLocaleDateString(language === 'hi' ? 'hi-IN' : language === 'ta' ? 'ta-IN' : 'en-IN', {
                  month: 'short',
                  day: 'numeric',
                  weekday: 'short',
                });
                const isDisputed = shift.status === 'disputed';

                return (
                  <div
                    key={shift.id}
                    onClick={() => setSelectedShift(shift)}
                    className="p-3 flex items-center justify-between hover:bg-[#FAF9F6] active:bg-[#F2F2EE] cursor-pointer transition-colors"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#F0FDFA] text-[#0F766E] flex items-center justify-center shrink-0 mt-0.5">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[#17181A]">{dateStr}</span>
                          {shift.overtimeHours > 0 && (
                            <span className="text-[10px] px-1 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                              +{shift.overtimeHours}h OT (2x)
                            </span>
                          )}
                          {isDisputed && (
                            <span className="text-[10px] px-1 py-0.2 rounded bg-red-50 text-red-800 border border-red-200 font-medium">
                              Disputed
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#73757C] mt-0.5">
                          {shift.totalHours} hrs worked · Base ₹{shift.baseHourlyRate}/hr
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-right">
                      <div>
                        <div className="text-xs font-bold font-mono-code tabular-nums text-[#17181A]">
                          {formatINR(shift.netPay)}
                        </div>
                        <span className="text-[10px] text-[#0F766E] font-medium">View Payslip</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#A8A8A0]" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
