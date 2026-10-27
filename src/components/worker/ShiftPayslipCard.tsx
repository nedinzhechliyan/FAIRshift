import React, { useState, useEffect } from 'react';
import { useI18n } from '../../i18n';
import { useToast } from '../ui/Toast';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { AudioSpeakerButton } from '../ui/AudioSpeakerButton';
import { formatINR } from '../../utils/formatCurrency';
import { calculateShiftPay, PayEngineResult } from '../../engine/payEngine';
import { getDeterministicPayslipTemplate } from '../../engine/payslipValidator';
import { SECTOR_CONFIGS, LEGAL_DISCLAIMER_NOTE } from '../../config/siteRules';
import { 
  Receipt, 
  HelpCircle, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  CheckCircle2, 
  Info,
  Volume2
} from 'lucide-react';

export interface ShiftPayslipCardProps {
  siteId: string;
  workerName: string;
  baseHourlyRate: number;
  totalWorkedHours: number;      // e.g. 9.5 for 9h 30m
  advanceDeduction?: number;     // e.g. 200
  onRaiseIssue?: (draft: { category: string; subcategory: string; netPay: number }) => void;
  onClose?: () => void;
}

export const ShiftPayslipCard: React.FC<ShiftPayslipCardProps> = ({
  siteId,
  workerName,
  baseHourlyRate,
  totalWorkedHours,
  advanceDeduction = 200,
  onRaiseIssue,
  onClose,
}) => {
  const { t, language } = useI18n();
  const { showToast } = useToast();

  const siteConfig = SECTOR_CONFIGS[siteId] || SECTOR_CONFIGS['site-metro-const'];

  // Authoritative deterministic engine calculation
  const payResult: PayEngineResult = calculateShiftPay({
    baseHourlyRate,
    totalHours: totalWorkedHours,
    regularShiftHours: siteConfig.rules.regularShiftHours,
    overtimeMultiplier: siteConfig.rules.overtimeMultiplier,
    advanceDeduction,
    statutoryDeductions: 0,
  }, siteConfig.rules);

  const [isCalculationsExpanded, setIsCalculationsExpanded] = useState(false);
  const [explanationText, setExplanationText] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);

  // Fetch or construct verified explanation
  useEffect(() => {
    let isCancelled = false;

    async function loadExplanation() {
      // Default immediately to deterministic template so there's never a blank state
      const fallback = getDeterministicPayslipTemplate(payResult, language);
      setExplanationText(fallback);
      setLoadingAi(true);

      try {
        const res = await fetch('/api/ai/payslip-explanation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ engineResult: payResult, language }),
        });

        if (!res.ok) throw new Error('API failed');
        const data = await res.json();
        if (!isCancelled && data.explanation) {
          setExplanationText(data.explanation);
        }
      } catch {
        // Already using deterministic template fallback
      } finally {
        if (!isCancelled) setLoadingAi(false);
      }
    }

    loadExplanation();
    return () => {
      isCancelled = true;
    };
  }, [totalWorkedHours, advanceDeduction, language, siteId]);

  return (
    <div className="bg-white border border-[#E5E5E0] rounded-[10px] shadow-sm overflow-hidden font-worker max-w-[420px] mx-auto">
      {/* Payslip Header */}
      <div className="bg-[#FAFAF8] p-4 border-b border-[#E5E5E0] flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-[#0F766E]" />
            <h3 className="text-sm font-bold text-[#17181A]">{t('payslip.title')}</h3>
          </div>
          <p className="text-[11px] text-[#73757C] mt-0.5">{siteConfig.siteName.split(' - ')[0]}</p>
        </div>

        <div className="flex items-center gap-1.5">
          <Badge variant="teal" label="Verified Engine" size="sm" />
          <AudioSpeakerButton
            textToSpeak={`${t('payslip.title')}. ${explanationText}`}
            size="sm"
            label={t('common.listen')}
          />
        </div>
      </div>

      {/* Main Payslip Breakdown */}
      <div className="p-4 space-y-3.5">
        {/* Shift Duration Metric */}
        <div className="flex items-center justify-between text-xs pb-2 border-b border-[#F1F1ED]">
          <span className="text-[#4A4B4F] flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-[#73757C]" />
            <span>{t('payslip.shiftDuration')}</span>
          </span>
          <span className="font-bold text-[#17181A] tabular-nums font-mono-code">
            {Math.floor(payResult.totalHours)}h {Math.round((payResult.totalHours % 1) * 60)}m (Total)
          </span>
        </div>

        {/* Regular Hours Row */}
        <div className="flex items-center justify-between text-xs">
          <div>
            <div className="font-medium text-[#17181A]">{t('payslip.regularHours')}</div>
            <div className="text-[11px] text-[#73757C]">
              {payResult.regularHours} hrs @ {formatINR(payResult.baseHourlyRate)}/hr
            </div>
          </div>
          <span className="font-semibold text-[#17181A] tabular-nums font-mono-code text-sm">
            {formatINR(payResult.regularPay)}
          </span>
        </div>

        {/* Overtime (2x rate) Row */}
        <div className="flex items-center justify-between text-xs">
          <div>
            <div className="font-medium text-[#0F766E] flex items-center gap-1.5">
              <span>{t('payslip.overtimeHours')}</span>
              <span className="px-1 py-0.2 rounded text-[10px] bg-teal-50 text-[#0F766E] border border-teal-200 font-bold">
                2x rate
              </span>
            </div>
            <div className="text-[11px] text-[#73757C]">
              {payResult.overtimeHours} hrs @ {formatINR(payResult.baseHourlyRate * payResult.overtimeMultiplier)}/hr (Double Pay)
            </div>
          </div>
          <span className="font-semibold text-[#0F766E] tabular-nums font-mono-code text-sm">
            +{formatINR(payResult.overtimePay)}
          </span>
        </div>

        {/* Gross Earnings Subtotal */}
        <div className="flex items-center justify-between text-xs py-1.5 px-2.5 bg-[#FAF9F6] rounded-[4px] border border-[#EBEBE6]">
          <span className="font-semibold text-[#4A4B4F]">{t('payslip.grossEarnings')}</span>
          <span className="font-bold text-[#17181A] tabular-nums font-mono-code text-sm">
            {formatINR(payResult.grossPay)}
          </span>
        </div>

        {/* Advance Deduction Row */}
        {payResult.advanceDeduction > 0 && (
          <div className="flex items-center justify-between text-xs">
            <div>
              <div className="font-medium text-[#4A4B4F]">{t('payslip.advanceRecovered')}</div>
              <div className="text-[11px] text-[#73757C]">Scheduled festival / weekly recovery</div>
            </div>
            <span className="font-semibold text-[#B91C1C] tabular-nums font-mono-code text-sm">
              -{formatINR(payResult.advanceDeduction)}
            </span>
          </div>
        )}

        {/* LARGEST ELEMENT: NET TAKE-HOME PAY */}
        <div className="p-3.5 bg-[#F0FDFA] border-2 border-[#0F766E]/40 rounded-[8px] text-center mt-2 shadow-xs">
          <p className="text-xs font-semibold text-[#0F766E] uppercase tracking-wider">
            {t('payslip.netPayable')}
          </p>
          <div className="text-3xl font-extrabold text-[#115E59] tracking-tight tabular-nums font-mono-code mt-0.5">
            {formatINR(payResult.netPay)}
          </div>
          <p className="text-[11px] text-[#73757C] mt-1">
            Transferred / Settled transparently per shift rules
          </p>
        </div>

        {/* Verified Explanation Text (Plain language, audited numbers) */}
        <div className="p-3 bg-[#FAF9F6] border border-[#E5E5E0] rounded-[6px] text-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-[#17181A]">Shift Summary</span>
            <AudioSpeakerButton textToSpeak={explanationText} size="sm" label={t('common.listen')} />
          </div>
          <p className="text-[#4A4B4F] text-xs leading-relaxed">{explanationText}</p>
        </div>

        {/* "How was this calculated?" Expandable Arithmetic Section */}
        <div className="border border-[#E5E5E0] rounded-[6px] overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setIsCalculationsExpanded(!isCalculationsExpanded)}
            className="w-full p-2.5 bg-[#F8F8F6] text-left flex items-center justify-between font-semibold text-[#17181A] hover:bg-[#F2F2EE] transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>How was this calculated?</span>
            </span>
            {isCalculationsExpanded ? <ChevronUp className="w-4 h-4 text-[#73757C]" /> : <ChevronDown className="w-4 h-4 text-[#73757C]" />}
          </button>

          {isCalculationsExpanded && (
            <div className="p-3 bg-white space-y-2 border-t border-[#E5E5E0] text-[11px] text-[#4A4B4F]">
              <div className="space-y-1 font-mono-code tabular-nums">
                <p>1. Regular: {payResult.regularHours}h × ₹{payResult.baseHourlyRate} = ₹{payResult.regularPay}</p>
                <p>2. Overtime: {payResult.overtimeHours}h × (₹{payResult.baseHourlyRate} × {payResult.overtimeMultiplier}) = ₹{payResult.overtimePay}</p>
                <p>3. Gross: ₹{payResult.regularPay} + ₹{payResult.overtimePay} = ₹{payResult.grossPay}</p>
                <p>4. Net: ₹{payResult.grossPay} - ₹{payResult.advanceDeduction} advance = ₹{payResult.netPay}</p>
              </div>

              <div className="pt-2 border-t border-[#EBEBE6] text-[10px] text-[#73757C] space-y-1">
                <p><strong>Site Limit:</strong> {siteConfig.rules.regularShiftHours}h standard shift · Overtime multiplier {siteConfig.rules.overtimeMultiplier}x</p>
                <p className="italic">{LEGAL_DISCLAIMER_NOTE}</p>
              </div>
            </div>
          )}
        </div>

        {/* Action: Raise Payment Issue */}
        <div className="pt-2">
          <Button
            variant="outline"
            size="md"
            className="w-full text-xs text-[#B91C1C] border-[#FECACA] hover:bg-[#FEF2F2]"
            icon={<AlertCircle className="w-4 h-4 text-[#B91C1C]" />}
            onClick={() => {
              if (onRaiseIssue) {
                onRaiseIssue({
                  category: 'payment',
                  subcategory: 'Shift Wage / Advance Dispute',
                  netPay: payResult.netPay,
                });
              } else {
                showToast(t('payslip.issueSubmitted'), 'info');
              }
            }}
          >
            {t('payslip.raiseIssue')}
          </Button>
        </div>
      </div>
    </div>
  );
};
