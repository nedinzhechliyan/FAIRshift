import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Badge, BadgeVariant } from '../ui/Badge';
import { Drawer } from '../ui/Drawer';
import { useToast } from '../ui/Toast';
import { FatigueScoreBreakdown, AttritionScoreBreakdown, WorkerProfile } from '../../types';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Moon, 
  Calendar, 
  Bed, 
  ArrowUpDown, 
  Eye, 
  HelpCircle,
  Users,
  ShieldCheck,
  TrendingDown,
  Info,
  RefreshCw
} from 'lucide-react';

export interface DailyHeatmapCell {
  dayIndex: number;
  dayLabel: string;
  dateStr: string;
  hours: number;
  score: number;
  band: 'green' | 'amber' | 'red' | 'rest';
  symbol: 'G' | 'A' | 'R' | '·';
}

export interface RadarWorkerData {
  worker: WorkerProfile;
  fatigue: FatigueScoreBreakdown;
  attrition: AttritionScoreBreakdown;
  dailyHeatmap: DailyHeatmapCell[];
  restDayAssigned?: boolean;
}

interface FatigueRadarProps {
  siteId: string;
  initialWorkerId?: string | null;
}

export const FatigueRadar: React.FC<FatigueRadarProps> = ({ siteId, initialWorkerId }) => {
  const { showToast } = useToast();
  const [workersData, setWorkersData] = useState<RadarWorkerData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedWorkerData, setSelectedWorkerData] = useState<RadarWorkerData | null>(null);
  const [activeTab, setActiveTab] = useState<'why_fatigue' | 'why_attrition'>('why_fatigue');
  const [sortField, setSortField] = useState<'fatigue' | 'attrition' | 'name'>('fatigue');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');
  const [showScreenReaderTable, setShowScreenReaderTable] = useState<boolean>(false);
  const [assigningRestId, setAssigningRestId] = useState<string | null>(null);

  const fetchRadar = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employer/radar?siteId=${siteId}`);
      if (!res.ok) throw new Error('Failed to load radar data');
      const data = await res.json();
      const list: RadarWorkerData[] = data.workers || [];
      setWorkersData(list);

      // Auto-select initial worker if requested
      if (initialWorkerId) {
        const found = list.find(w => w.worker.id === initialWorkerId);
        if (found) setSelectedWorkerData(found);
      }
    } catch (err: unknown) {
      console.warn('Radar fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRadar();
  }, [siteId]);

  // Handle Sort
  const handleSort = (field: 'fatigue' | 'attrition' | 'name') => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedWorkers = [...workersData].sort((a, b) => {
    let diff = 0;
    if (sortField === 'fatigue') {
      diff = a.fatigue.score - b.fatigue.score;
    } else if (sortField === 'attrition') {
      diff = a.attrition.score - b.attrition.score;
    } else {
      diff = a.worker.name.localeCompare(b.worker.name);
    }
    return sortDirection === 'desc' ? -diff : diff;
  });

  // Assign Rest Day Action (Real reactive roster update)
  const handleAssignRestDay = async (workerId: string) => {
    setAssigningRestId(workerId);
    try {
      const res = await fetch('/api/employer/assign-rest-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerId,
          notes: 'Mandatory stand-down scheduled from Fatigue & Attrition Radar',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign rest day');

      showToast(`Rest day assigned to worker. Fatigue score dropped to ${data.newFatigueScore} (${data.newBand.toUpperCase()}).`, 'success');
      
      // Re-fetch radar to reflect updated heatmap and scores
      await fetchRadar();

      // Update drawer if current worker is open
      if (selectedWorkerData && selectedWorkerData.worker.id === workerId) {
        const updated = await (await fetch(`/api/employer/radar?siteId=${siteId}`)).json();
        const found = (updated.workers || []).find((w: RadarWorkerData) => w.worker.id === workerId);
        if (found) setSelectedWorkerData(found);
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error assigning rest day', 'error');
    } finally {
      setAssigningRestId(null);
    }
  };

  // High-level summary metrics
  const redFatigueCount = workersData.filter(w => w.fatigue.band === 'red').length;
  const amberFatigueCount = workersData.filter(w => w.fatigue.band === 'amber').length;
  const highAttritionCount = workersData.filter(w => w.attrition.band === 'high').length;

  return (
    <div className="bg-white border border-[#E5E5E0] rounded-[8px] p-5 shadow-xs space-y-5">
      {/* Top Header & Triage Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E5E5E0]">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#0F766E]" />
            <h2 className="text-sm font-bold text-[#17181A] tracking-tight">
              Fatigue & Attrition Radar
            </h2>
            <Badge variant="teal" label="14-Day Shift Load" size="sm" />
          </div>
          <p className="text-xs text-[#73757C] mt-0.5">
            Deterministic physiological fatigue bands (0-39 safe, 40-69 amber, 70-100 red) and anonymized turnover risk.
          </p>
        </div>

        {/* Quick Stats & Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-50 border border-red-200 text-red-800 font-medium">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            <span>Red Fatigue: {redFatigueCount}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-50 border border-amber-200 text-amber-800 font-medium">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Amber Strain: {amberFatigueCount}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-purple-50 border border-purple-200 text-purple-800 font-medium">
            <TrendingDown className="w-3.5 h-3.5 text-purple-600" />
            <span>High Churn Risk: {highAttritionCount}</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowScreenReaderTable(!showScreenReaderTable)}
            aria-label="Toggle screen reader accessible text alternative table"
          >
            {showScreenReaderTable ? 'Hide Text Table' : 'Screen Reader View'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={fetchRadar}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Screen Reader Alternative Table (Accessible, semantic text table) */}
      {showScreenReaderTable && (
        <div className="p-3 bg-[#FAF9F6] border border-[#E5E5E0] rounded-[6px] text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#17181A]">Accessible Text Alternative Table (Screen Readers)</span>
            <span className="text-[11px] text-[#73757C]">Tabular breakdown of 14-day shift fatigue scores</span>
          </div>
          <div className="overflow-x-auto max-h-64 border border-[#E5E5E0] bg-white rounded">
            <table className="w-full text-left border-collapse" aria-label="Worker 14-day fatigue and attrition data">
              <thead>
                <tr className="bg-[#F4F4F1] border-b border-[#E5E5E0] text-[11px] font-semibold text-[#4A4B4F]">
                  <th scope="col" className="p-2">Worker</th>
                  <th scope="col" className="p-2">Role</th>
                  <th scope="col" className="p-2">Fatigue Band</th>
                  <th scope="col" className="p-2">Fatigue Score</th>
                  <th scope="col" className="p-2">Consecutive Shifts</th>
                  <th scope="col" className="p-2">Weekly Hours</th>
                  <th scope="col" className="p-2">Attrition Band</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E0]">
                {sortedWorkers.map(w => (
                  <tr key={w.worker.id} className="hover:bg-zinc-50">
                    <td className="p-2 font-medium">{w.worker.name}</td>
                    <td className="p-2 text-[#73757C]">{w.worker.role}</td>
                    <td className="p-2 font-semibold uppercase">{w.fatigue.band}</td>
                    <td className="p-2 font-mono-code">{w.fatigue.score}/100</td>
                    <td className="p-2 font-mono-code">{w.fatigue.consecutiveShifts} days</td>
                    <td className="p-2 font-mono-code">{w.fatigue.weeklyHours}h</td>
                    <td className="p-2 uppercase">{w.attrition.band}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Heatmap & Sortable Risk Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs text-[#73757C]">Loading workforce fatigue matrix...</div>
      ) : (
        <div className="space-y-3">
          {/* Legend and Sorting Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-[#F8F8F5] p-2.5 rounded-[6px] border border-[#E5E5E0]">
            {/* Heatmap Cell Legend */}
            <div className="flex flex-wrap items-center gap-3 text-[11px]">
              <span className="font-semibold text-[#4A4B4F]">Cell Legend:</span>
              <span className="flex items-center gap-1">
                <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px] border border-emerald-300">G</span>
                <span>Green (0-39)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-5 h-5 rounded bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-[10px] border border-amber-300">A</span>
                <span>Amber (40-69)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-5 h-5 rounded bg-red-100 text-red-800 font-bold flex items-center justify-center text-[10px] border border-red-300">R</span>
                <span>Red (70-100)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-5 h-5 rounded bg-zinc-100 text-zinc-500 font-bold flex items-center justify-center text-[10px] border border-zinc-300">·</span>
                <span>Rest Day</span>
              </span>
            </div>

            {/* Sort Controls */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[#73757C]">Sort by:</span>
              <button
                onClick={() => handleSort('fatigue')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium border flex items-center gap-1 transition-colors ${
                  sortField === 'fatigue' ? 'bg-[#0F766E] text-white border-[#0F766E]' : 'bg-white text-[#4A4B4F] border-[#D1D1CB]'
                }`}
              >
                Fatigue {sortField === 'fatigue' && (sortDirection === 'desc' ? '↓' : '↑')}
              </button>
              <button
                onClick={() => handleSort('attrition')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium border flex items-center gap-1 transition-colors ${
                  sortField === 'attrition' ? 'bg-[#0F766E] text-white border-[#0F766E]' : 'bg-white text-[#4A4B4F] border-[#D1D1CB]'
                }`}
              >
                Attrition {sortField === 'attrition' && (sortDirection === 'desc' ? '↓' : '↑')}
              </button>
              <button
                onClick={() => handleSort('name')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium border flex items-center gap-1 transition-colors ${
                  sortField === 'name' ? 'bg-[#0F766E] text-white border-[#0F766E]' : 'bg-white text-[#4A4B4F] border-[#D1D1CB]'
                }`}
              >
                Name {sortField === 'name' && (sortDirection === 'desc' ? '↓' : '↑')}
              </button>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="overflow-x-auto border border-[#E5E5E0] rounded-[6px]">
            <table className="w-full text-left border-collapse text-xs" aria-label="14-Day Workforce Fatigue Heatmap">
              <thead>
                <tr className="bg-[#F4F4F1] border-b border-[#E5E5E0] text-[11px] font-semibold text-[#4A4B4F]">
                  <th scope="col" className="p-2.5 min-w-[160px] sticky left-0 bg-[#F4F4F1] z-10">
                    Worker & Role
                  </th>
                  <th scope="col" className="p-2.5 text-center min-w-[70px]">
                    Fatigue
                  </th>
                  <th scope="col" className="p-2.5 text-center min-w-[70px]">
                    Attrition
                  </th>
                  <th scope="col" className="p-2.5 min-w-[320px]">
                    <div className="flex items-center justify-between text-[10px] text-[#73757C]">
                      <span>14 Days Ago</span>
                      <span>Past 14 Days Shift Heatmap</span>
                      <span>Today</span>
                    </div>
                  </th>
                  <th scope="col" className="p-2.5 text-right min-w-[130px]">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBEBE6]">
                {sortedWorkers.map(item => {
                  const isRed = item.fatigue.band === 'red';
                  const isAmber = item.fatigue.band === 'amber';
                  const isHighAttrition = item.attrition.band === 'high';
                  const isAssigning = assigningRestId === item.worker.id;

                  return (
                    <tr
                      key={item.worker.id}
                      onClick={() => setSelectedWorkerData(item)}
                      className={`hover:bg-[#FAF9F6] cursor-pointer transition-colors ${
                        isRed ? 'bg-red-50/20' : ''
                      } ${selectedWorkerData?.worker.id === item.worker.id ? 'bg-teal-50/40 ring-1 ring-[#0F766E]/30' : ''}`}
                    >
                      {/* Worker Info */}
                      <td className="p-2.5 sticky left-0 bg-white group-hover:bg-[#FAF9F6] z-10 border-r border-[#E5E5E0]">
                        <div className="font-semibold text-[#17181A] flex items-center gap-1.5">
                          <span>{item.worker.name}</span>
                          {item.restDayAssigned && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded border border-emerald-300">
                              Rest Day
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#73757C] truncate">{item.worker.role}</div>
                      </td>

                      {/* Fatigue Badge */}
                      <td className="p-2.5 text-center border-r border-[#E5E5E0]">
                        <Badge
                          variant={item.fatigue.band}
                          label={`${item.fatigue.score}`}
                          size="sm"
                        />
                      </td>

                      {/* Attrition Badge */}
                      <td className="p-2.5 text-center border-r border-[#E5E5E0]">
                        <Badge
                          variant={item.attrition.band === 'high' ? 'red' : item.attrition.band === 'medium' ? 'amber' : 'green'}
                          label={`${item.attrition.score}`}
                          size="sm"
                        />
                      </td>

                      {/* 14-Day Heatmap Strip */}
                      <td className="p-2.5 border-r border-[#E5E5E0]">
                        <div className="flex items-center gap-1">
                          {item.dailyHeatmap.map((cell, cIdx) => {
                            let cellBg = 'bg-zinc-100 text-zinc-500 border-zinc-200';
                            if (cell.band === 'green') cellBg = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                            else if (cell.band === 'amber') cellBg = 'bg-amber-100 text-amber-800 border-amber-300';
                            else if (cell.band === 'red') cellBg = 'bg-red-100 text-red-800 border-red-300';

                            return (
                              <div
                                key={cIdx}
                                title={`${cell.dayLabel} (${cell.dateStr}): ${cell.hours}h worked · ${cell.band.toUpperCase()}`}
                                className={`w-5 h-6 rounded-[3px] border flex items-center justify-center font-bold text-[9px] font-mono-code select-none transition-transform hover:scale-110 ${cellBg}`}
                              >
                                {cell.symbol}
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {isRed && (
                            <Button
                              variant="primary"
                              size="sm"
                              loading={isAssigning}
                              onClick={() => handleAssignRestDay(item.worker.id)}
                              icon={<Bed className="w-3 h-3" />}
                            >
                              Assign Rest
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedWorkerData(item)}
                            icon={<Eye className="w-3 h-3 text-[#73757C]" />}
                          >
                            Why
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* "Why" Breakdown Drawer (Factor-by-Factor Explainability) */}
      {selectedWorkerData && (
        <Drawer
          isOpen={Boolean(selectedWorkerData)}
          onClose={() => setSelectedWorkerData(null)}
          title={`Risk Diagnostics: ${selectedWorkerData.worker.name}`}
          subtitle={`${selectedWorkerData.worker.role} · ${selectedWorkerData.worker.siteId}`}
        >
          <div className="space-y-4 text-xs">
            {/* Tab switch between Fatigue and Attrition */}
            <div className="flex border-b border-[#E5E5E0] gap-4">
              <button
                onClick={() => setActiveTab('why_fatigue')}
                className={`pb-2 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === 'why_fatigue' 
                    ? 'border-[#0F766E] text-[#0F766E]' 
                    : 'border-transparent text-[#73757C] hover:text-[#17181A]'
                }`}
              >
                Fatigue Score ({selectedWorkerData.fatigue.score}/100)
              </button>
              <button
                onClick={() => setActiveTab('why_attrition')}
                className={`pb-2 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === 'why_attrition' 
                    ? 'border-[#0F766E] text-[#0F766E]' 
                    : 'border-transparent text-[#73757C] hover:text-[#17181A]'
                }`}
              >
                Attrition Score ({selectedWorkerData.attrition.score}/100)
              </button>
            </div>

            {/* FATIGUE "WHY" BREAKDOWN */}
            {activeTab === 'why_fatigue' && (
              <div className="space-y-4">
                {/* Score & Band Header */}
                <div className="p-3 rounded-[6px] border bg-[#FAF9F6] border-[#E5E5E0] flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-[#73757C]">Physiological Fatigue Index</div>
                    <div className="text-xl font-bold font-mono-code text-[#17181A]">
                      {selectedWorkerData.fatigue.score} <span className="text-xs text-[#73757C]">/ 100</span>
                    </div>
                  </div>
                  <Badge
                    variant={selectedWorkerData.fatigue.band}
                    label={`${selectedWorkerData.fatigue.band.toUpperCase()} BAND`}
                    size="md"
                  />
                </div>

                {/* Recommended Operational Action */}
                <div className="p-3 bg-teal-50/50 border border-teal-200 rounded-[6px] space-y-1">
                  <div className="font-bold text-[#0F766E] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#0F766E]" />
                    <span>Statutory & Shift Recommendation:</span>
                  </div>
                  <p className="text-[#115E59] leading-relaxed font-medium">
                    {selectedWorkerData.fatigue.recommendedAction}
                  </p>
                </div>

                {/* Factor-by-factor Points Breakdown (Summing exactly to total score) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#4A4B4F]">
                    <span>Contributing Factors (Exact Points Breakdown)</span>
                    <span>Points (Max 100)</span>
                  </div>

                  <div className="divide-y divide-[#E5E5E0] border border-[#E5E5E0] rounded-[6px] overflow-hidden bg-white">
                    {/* Factor 1: Weekly Hours */}
                    <div className="p-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-[#17181A]">Weekly Work Load</div>
                        <div className="text-[10px] text-[#73757C]">
                          {selectedWorkerData.fatigue.weeklyHours} hours in last 7 days (cap 60h)
                        </div>
                      </div>
                      <span className="font-mono-code font-bold text-sm text-[#17181A]">
                        +{selectedWorkerData.fatigue.weeklyHoursPoints}
                      </span>
                    </div>

                    {/* Factor 2: Consecutive Shifts */}
                    <div className="p-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-[#17181A]">Consecutive Shifts Without Rest</div>
                        <div className="text-[10px] text-[#73757C]">
                          {selectedWorkerData.fatigue.consecutiveShifts} consecutive days logged (max 6 days)
                        </div>
                      </div>
                      <span className="font-mono-code font-bold text-sm text-[#17181A]">
                        +{selectedWorkerData.fatigue.consecutiveShiftsPoints}
                      </span>
                    </div>

                    {/* Factor 3: Rest Gap */}
                    <div className="p-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-[#17181A]">Rest Gap Between Shifts</div>
                        <div className="text-[10px] text-[#73757C]">
                          {selectedWorkerData.fatigue.restGapHours}h turnaround gap (minimum statutory 10h)
                        </div>
                      </div>
                      <span className="font-mono-code font-bold text-sm text-[#17181A]">
                        +{selectedWorkerData.fatigue.restGapPoints}
                      </span>
                    </div>

                    {/* Factor 4: Night Shifts */}
                    <div className="p-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-[#17181A]">Circadian Night Shifts</div>
                        <div className="text-[10px] text-[#73757C]">
                          {selectedWorkerData.fatigue.nightShifts7d} night shifts logged in last 7 days
                        </div>
                      </div>
                      <span className="font-mono-code font-bold text-sm text-[#17181A]">
                        +{selectedWorkerData.fatigue.nightShiftsPoints}
                      </span>
                    </div>

                    {/* Factor 5: Longest Shift */}
                    <div className="p-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-[#17181A]">Peak Shift Duration</div>
                        <div className="text-[10px] text-[#73757C]">
                          Longest single shift: {selectedWorkerData.fatigue.longestShiftHours} hours
                        </div>
                      </div>
                      <span className="font-mono-code font-bold text-sm text-[#17181A]">
                        +{selectedWorkerData.fatigue.longestShiftPoints}
                      </span>
                    </div>

                    {/* Factor 6: Overtime Ratio */}
                    <div className="p-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-[#17181A]">Overtime Ratio</div>
                        <div className="text-[10px] text-[#73757C]">
                          Overtime load ratio: {Math.round(selectedWorkerData.fatigue.overtimeRatio * 100)}%
                        </div>
                      </div>
                      <span className="font-mono-code font-bold text-sm text-[#17181A]">
                        +{selectedWorkerData.fatigue.overtimePoints}
                      </span>
                    </div>

                    {/* Total Factor Sum Assertion */}
                    <div className="p-2.5 bg-[#F4F4F1] flex items-center justify-between font-bold">
                      <span className="text-[#17181A]">Total Explained Score Sum</span>
                      <span className="font-mono-code text-base text-[#0F766E]">
                        {selectedWorkerData.fatigue.score} / 100
                      </span>
                    </div>
                  </div>
                </div>

                {/* Direct Action Button */}
                <div className="pt-2">
                  <Button
                    variant="primary"
                    className="w-full"
                    loading={assigningRestId === selectedWorkerData.worker.id}
                    onClick={() => handleAssignRestDay(selectedWorkerData.worker.id)}
                    icon={<Bed className="w-4 h-4" />}
                  >
                    Assign Immediate Rest Day
                  </Button>
                </div>
              </div>
            )}

            {/* ATTRITION "WHY" BREAKDOWN */}
            {activeTab === 'why_attrition' && (
              <div className="space-y-4">
                <div className="p-3 rounded-[6px] border bg-[#FAF9F6] border-[#E5E5E0] flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-[#73757C]">Turnover & Churn Probability</div>
                    <div className="text-xl font-bold font-mono-code text-[#17181A]">
                      {selectedWorkerData.attrition.score} <span className="text-xs text-[#73757C]">/ 100</span>
                    </div>
                  </div>
                  <Badge
                    variant={selectedWorkerData.attrition.band === 'high' ? 'red' : selectedWorkerData.attrition.band === 'medium' ? 'amber' : 'green'}
                    label={`${selectedWorkerData.attrition.band.toUpperCase()} RISK`}
                    size="md"
                  />
                </div>

                {/* Privacy Preservation Notice */}
                <div className="p-2.5 bg-blue-50/60 border border-blue-200 rounded-[6px] text-blue-900 flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    <strong>Anonymity Contract:</strong> Attrition feedback factors utilize aggregated team-level pulse sentiment only (sample size $\ge 5$). No individual worker voice notes or ratings are ever shown.
                  </p>
                </div>

                {/* Factor Breakdown */}
                <div className="divide-y divide-[#E5E5E0] border border-[#E5E5E0] rounded-[6px] overflow-hidden bg-white">
                  <div className="p-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-[#17181A]">Attendance Trend Decline</div>
                      <div className="text-[10px] text-[#73757C]">Sudden absence or drops in past 14 days</div>
                    </div>
                    <span className="font-mono-code font-bold">+{selectedWorkerData.attrition.attendanceDeclinePoints}</span>
                  </div>

                  <div className="p-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-[#17181A]">Chronic Overtime Load</div>
                      <div className="text-[10px] text-[#73757C]">Fatiguing work hours vs rest cycle</div>
                    </div>
                    <span className="font-mono-code font-bold">+{selectedWorkerData.attrition.overtimeBurdenPoints}</span>
                  </div>

                  <div className="p-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-[#17181A]">Team Pulse Sentiment Indicator</div>
                      <div className="text-[10px] text-[#73757C]">Workgroup morale baseline from anonymous weekly surveys</div>
                    </div>
                    <span className="font-mono-code font-bold">+{selectedWorkerData.attrition.negativeFeedbackPoints}</span>
                  </div>

                  <div className="p-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-[#17181A]">Unresolved Grievances</div>
                      <div className="text-[10px] text-[#73757C]">Open payment or workplace disputes</div>
                    </div>
                    <span className="font-mono-code font-bold">+{selectedWorkerData.attrition.unresolvedGrievancesPoints}</span>
                  </div>

                  <div className="p-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-[#17181A]">Wage or Advance Settlement Delays</div>
                      <div className="text-[10px] text-[#73757C]">Days of pending advance discrepancy</div>
                    </div>
                    <span className="font-mono-code font-bold">+{selectedWorkerData.attrition.wageDelayPoints}</span>
                  </div>

                  <div className="p-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-[#17181A]">Skill & Certification Growth</div>
                      <div className="text-[10px] text-[#73757C]">Stagnant passport skill milestones</div>
                    </div>
                    <span className="font-mono-code font-bold">+{selectedWorkerData.attrition.lowSkillGrowthPoints}</span>
                  </div>

                  <div className="p-2.5 bg-[#F4F4F1] flex items-center justify-between font-bold">
                    <span className="text-[#17181A]">Total Attrition Score</span>
                    <span className="font-mono-code text-base text-purple-700">
                      {selectedWorkerData.attrition.score} / 100
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-purple-50/50 border border-purple-200 rounded-[6px] space-y-1">
                  <div className="font-bold text-purple-900">Recommended Retention Action:</div>
                  <p className="text-purple-800 leading-relaxed font-medium">
                    {selectedWorkerData.attrition.recommendedAction}
                  </p>
                </div>
              </div>
            )}
          </div>
        </Drawer>
      )}
    </div>
  );
};
