import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { Badge, BadgeVariant } from '../ui/Badge';
import { Drawer } from '../ui/Drawer';
import { useToast } from '../ui/Toast';
import { ReportCaseSummary, WorkerProfile } from '../../types';
import { 
  AlertOctagon, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Bed, 
  ArrowRight, 
  RefreshCw,
  ShieldAlert,
  User,
  ExternalLink,
  Radio
} from 'lucide-react';

export interface AttentionQueueItem {
  id: string;
  type: 'critical_hazard' | 'red_fatigue' | 'high_hazard' | 'aging_case';
  rankScore: number;
  title: string;
  reason: string;
  severity: 'critical' | 'high' | 'medium';
  badgeVariant: BadgeVariant;
  badgeLabel: string;
  actionType: 'open_case' | 'assign_rest' | 'acknowledge';
  actionLabel: string;
  targetId: string;
  timestamp?: string;
  workerName?: string;
  details?: Record<string, unknown>;
}

interface AttentionQueueProps {
  siteId: string;
  onSelectCase?: (caseCode: string) => void;
  onNavigateToRadar?: (workerId: string) => void;
}

export const AttentionQueue: React.FC<AttentionQueueProps> = ({
  siteId,
  onSelectCase,
  onNavigateToRadar,
}) => {
  const { showToast } = useToast();
  const [items, setItems] = useState<AttentionQueueItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeDrawerCase, setActiveDrawerCase] = useState<ReportCaseSummary | null>(null);
  const [activeRestWorker, setActiveRestWorker] = useState<WorkerProfile | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const prevItemIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef<boolean>(true);

  const fetchQueue = async (isBackgroundPoll: boolean = false) => {
    if (!isBackgroundPoll) setLoading(true);
    try {
      const res = await fetch(`/api/employer/attention-queue?siteId=${siteId}`);
      if (!res.ok) throw new Error('Failed to load attention queue');
      const data = await res.json();
      const newItems: AttentionQueueItem[] = data.items || [];
      
      // Toast on new arriving report items during live polling
      if (!isFirstLoadRef.current) {
        const hasNew = newItems.some(i => !prevItemIdsRef.current.has(i.id));
        if (hasNew) {
          showToast('New report received', 'info');
        }
      } else {
        isFirstLoadRef.current = false;
      }

      prevItemIdsRef.current = new Set(newItems.map(i => i.id));
      setItems(newItems);
      setLastUpdated(new Date());
    } catch (err: unknown) {
      if (!isBackgroundPoll) console.warn('Could not load queue:', err);
    } finally {
      if (!isBackgroundPoll) setLoading(false);
    }
  };

  useEffect(() => {
    isFirstLoadRef.current = true;
    prevItemIdsRef.current.clear();
    fetchQueue(false);

    // Live update polling every 5 seconds; pause when tab is hidden
    const interval = setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      fetchQueue(true);
    }, 5000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchQueue(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [siteId]);

  const handleActionClick = async (item: AttentionQueueItem) => {
    if (item.actionType === 'assign_rest') {
      // Direct action: assign rest day
      setProcessingId(item.id);
      try {
        const res = await fetch('/api/employer/assign-rest-day', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workerId: item.targetId,
            notes: 'Mandatory stand-down assigned from Supervisor Attention Queue',
          }),
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Mandatory rest day assigned. Worker fatigue score dropped to ${data.newFatigueScore} (${data.newBand.toUpperCase()}).`, 'success');
          fetchQueue();
        } else {
          showToast('Could not assign rest day', 'error');
        }
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : 'Failed to assign rest day', 'error');
      } finally {
        setProcessingId(null);
      }
    } else if (item.actionType === 'acknowledge') {
      // Direct action: acknowledge case
      setProcessingId(item.id);
      try {
        const res = await fetch('/api/employer/acknowledge-case', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caseCode: item.targetId,
            notes: 'Supervisor acknowledged from Attention Queue.',
          }),
        });
        if (res.ok) {
          showToast(`Case ${item.targetId} acknowledged. Status updated.`, 'success');
          fetchQueue();
        } else {
          showToast('Failed to acknowledge case', 'error');
        }
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : 'Failed to acknowledge case', 'error');
      } finally {
        setProcessingId(null);
      }
    } else if (item.actionType === 'open_case') {
      if (onSelectCase) {
        onSelectCase(item.targetId);
      } else {
        setActiveDrawerCase((item.details as unknown as ReportCaseSummary) || { caseCode: item.targetId, summaryEn: item.reason } as unknown as ReportCaseSummary);
      }
    }
  };

  return (
    <div className="bg-white border border-[#E5E5E0] rounded-[8px] p-5 shadow-xs space-y-4">
      {/* Queue Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E5E0]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>
            <h2 className="text-sm font-bold text-[#17181A] tracking-tight">Today's Attention Queue</h2>
            <span className="text-[11px] font-mono-code px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
              {items.length} High-Priority Items
            </span>
          </div>
          <p className="text-xs text-[#73757C] mt-0.5">
            Ranked risk triage: open critical hazards, acute fatigue, and aging unresolved worker issues.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span 
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-mono-code font-bold text-emerald-800"
            title="Live 5-second polling active. Pauses when tab is hidden."
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Live • {lastUpdated.toLocaleTimeString()}
          </span>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchQueue(false)}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh Queue
          </Button>
        </div>
      </div>

      {/* Queue Items List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-[#73757C]">Loading today's prioritized attention queue...</div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <p className="text-xs font-semibold text-[#17181A]">No Critical Items in Today's Attention Queue</p>
          <p className="text-[11px] text-[#73757C]">All urgent safety hazards and fatigue spikes have been addressed for this site.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item, idx) => {
            const isProcessing = processingId === item.id;
            const isRedFatigue = item.type === 'red_fatigue';
            const isCritical = item.severity === 'critical';

            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-[6px] border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                  isCritical 
                    ? 'border-red-200 bg-red-50/20 hover:bg-red-50/40' 
                    : 'border-[#E5E5E0] bg-white hover:bg-[#FAF9F6]'
                }`}
              >
                {/* Left: Priority Rank + Information */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="flex flex-col items-center justify-center shrink-0 w-6 pt-0.5">
                    <span className="text-xs font-bold text-[#73757C] font-mono-code">#{idx + 1}</span>
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-xs text-[#17181A] truncate">{item.title}</span>
                      <Badge 
                        variant={item.badgeVariant} 
                        label={item.badgeLabel} 
                        size="sm" 
                      />
                      {item.targetId && (
                        <span className="text-[10px] font-mono-code text-[#73757C] bg-[#F1F1ED] px-1 rounded border border-[#E5E5E0]">
                          {item.targetId}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#4A4B4F] leading-relaxed">
                      {item.reason}
                    </p>

                    <div className="text-[10px] text-[#73757C] flex items-center gap-2">
                      {item.timestamp && (
                        <span>Logged: {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                      {isRedFatigue && onNavigateToRadar && (
                        <button
                          onClick={() => onNavigateToRadar(item.targetId)}
                          className="text-[#0F766E] hover:underline flex items-center gap-0.5 font-medium"
                        >
                          View 14-day heatmap <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Direct 1-Click Action Button */}
                <div className="shrink-0 flex items-center gap-2 self-end md:self-center">
                  <Button
                    variant={isCritical ? 'primary' : 'outline'}
                    size="sm"
                    loading={isProcessing}
                    onClick={() => handleActionClick(item)}
                    icon={
                      item.actionType === 'assign_rest' ? (
                        <Bed className="w-3.5 h-3.5" />
                      ) : item.actionType === 'acknowledge' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5" />
                      )
                    }
                  >
                    {item.actionLabel}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Case Details Drawer (if triggered from queue) */}
      {activeDrawerCase && (
        <Drawer
          isOpen={Boolean(activeDrawerCase)}
          onClose={() => setActiveDrawerCase(null)}
          title={`Action Case: ${activeDrawerCase.caseCode || 'Report'}`}
          subtitle="Review details and execute immediate operational mitigation."
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-[#FAF9F6] border border-[#E5E5E0] rounded-[6px] space-y-1">
              <span className="font-bold text-[#17181A]">Issue Summary:</span>
              <p className="text-[#4A4B4F] leading-relaxed">{activeDrawerCase.summaryEn}</p>
            </div>

            {activeDrawerCase.recommendedAction && (
              <div className="p-3 bg-teal-50/50 border border-teal-200 rounded-[6px] space-y-1">
                <span className="font-bold text-[#0F766E]">Operational Action:</span>
                <p className="text-[#115E59] leading-relaxed">{activeDrawerCase.recommendedAction}</p>
              </div>
            )}

            <div className="pt-2">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => {
                  showToast(`Action dispatched for ${activeDrawerCase.caseCode}`, 'success');
                  setActiveDrawerCase(null);
                  fetchQueue();
                }}
              >
                Mark Handled & Close
              </Button>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
};
