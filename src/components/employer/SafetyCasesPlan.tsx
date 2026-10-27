import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Drawer } from '../ui/Drawer';
import { useToast } from '../ui/Toast';
import { SECTOR_CONFIGS } from '../../config/siteRules';
import { ReportCaseSummary, HazardPin, TranscriptDetails } from '../../types';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Eye, 
  RefreshCw,
  Building2,
  Lock,
  MapPin,
  Filter,
  Layers,
  Info
} from 'lucide-react';

interface SafetyCasesPlanProps {
  siteId: string;
  initialSelectedCaseCode?: string | null;
}

export const SafetyCasesPlan: React.FC<SafetyCasesPlanProps> = ({ 
  siteId,
  initialSelectedCaseCode 
}) => {
  const { showToast } = useToast();
  const [cases, setCases] = useState<ReportCaseSummary[]>([]);
  const [pins, setPins] = useState<HazardPin[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [selectedCase, setSelectedCase] = useState<ReportCaseSummary | null>(null);
  const [newStatus, setNewStatus] = useState<string>('open');
  const [supervisorNote, setSupervisorNote] = useState<string>('');
  const [updating, setUpdating] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const prevCaseCodesRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef<boolean>(true);

  // Transcript view drawer & audit
  const [transcriptData, setTranscriptData] = useState<TranscriptDetails | null>(null);
  const [loadingTranscript, setLoadingTranscript] = useState<boolean>(false);

  const siteConfig = SECTOR_CONFIGS[siteId] || SECTOR_CONFIGS['site-metro-const'];

  const fetchData = async (isBackgroundPoll: boolean = false) => {
    if (!isBackgroundPoll) setLoading(true);
    try {
      const [casesRes, pinsRes] = await Promise.all([
        fetch(`/api/employer/cases?siteId=${siteId}`),
        fetch(`/api/hazard-pins/${siteId}`)
      ]);
      const casesData = await casesRes.json();
      const pinsData = await pinsRes.json();

      const loadedCases = casesData.cases || [];

      // Toast when a new report arrives during background live polling
      if (!isFirstLoadRef.current) {
        const hasNew = loadedCases.some((c: ReportCaseSummary) => !prevCaseCodesRef.current.has(c.caseCode));
        if (hasNew) {
          showToast('New report received', 'info');
        }
      } else {
        isFirstLoadRef.current = false;
      }

      prevCaseCodesRef.current = new Set(loadedCases.map((c: ReportCaseSummary) => c.caseCode));
      setCases(loadedCases);
      setPins(pinsData.pins || []);
      setLastUpdated(new Date());

      if (initialSelectedCaseCode && !isBackgroundPoll) {
        const found = loadedCases.find((c: ReportCaseSummary) => c.caseCode === initialSelectedCaseCode);
        if (found) setSelectedCase(found);
      }
    } catch (err: unknown) {
      if (!isBackgroundPoll) console.warn('Failed to load safety plan data:', err);
    } finally {
      if (!isBackgroundPoll) setLoading(false);
    }
  };

  useEffect(() => {
    isFirstLoadRef.current = true;
    prevCaseCodesRef.current.clear();
    fetchData(false);

    // Live update polling every 5 seconds; pause when tab is hidden
    const interval = setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      fetchData(true);
    }, 5000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchData(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [siteId]);

  const handleUpdateStatus = async (caseCode: string) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/employer/cases/${caseCode}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          supervisorNotes: supervisorNote.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error('Status update failed');

      showToast(`Case ${caseCode} updated to ${newStatus}`, 'success');
      setSelectedCase(null);
      fetchData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Status update failed', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleViewTranscript = async (caseCode: string) => {
    setLoadingTranscript(true);
    try {
      const res = await fetch(`/api/employer/cases/${caseCode}/transcript`);
      const data = await res.json();
      setTranscriptData(data);
    } catch {
      showToast('Could not load transcript audit', 'error');
    } finally {
      setLoadingTranscript(false);
    }
  };

  const filteredCases = selectedZone 
    ? cases.filter(c => (c.siteZone || c.locationDetail || '').toLowerCase().includes(selectedZone.toLowerCase()))
    : cases;

  // Coordinate positions for schematic blueprint layout per zone
  const zoneLayoutCoordinates = [
    { x: 18, y: 22, w: 28, h: 32 },
    { x: 54, y: 22, w: 38, h: 32 },
    { x: 18, y: 60, w: 36, h: 30 },
    { x: 60, y: 60, w: 32, h: 30 },
    { x: 10, y: 10, w: 20, h: 10 },
    { x: 70, y: 10, w: 20, h: 10 },
  ];

  return (
    <div className="space-y-6">
      {/* Top Section: Schematic SVG Site Plan with Hazard Pins & k-Anonymity */}
      <div className="bg-white border border-[#E5E5E0] rounded-[8px] p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E5E0]">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#0F766E]" />
              <h2 className="text-sm font-bold text-[#17181A]">
                Schematic Site Plan · Zone Hazard Distribution
              </h2>
              <Badge variant="teal" label="k-Anonymity Protected" size="sm" />
            </div>
            <p className="text-xs text-[#73757C] mt-0.5">
              Architectural zone map with aggregated hazard pin counts. Groups with fewer than 5 reports are suppressed to protect worker anonymity.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {selectedZone && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedZone(null)}
              >
                Clear Zone Filter
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchData(false)}
              icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
            >
              Refresh Plan
            </Button>
          </div>
        </div>

        {/* Schematic SVG Blueprint Map */}
        <div className="relative bg-[#0E1726] rounded-[6px] p-4 text-white overflow-hidden border border-[#23314B]">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
            <span className="font-mono-code font-semibold tracking-wider text-teal-300">
              {siteConfig.siteName.toUpperCase()} · SCHEMATIC OVERVIEW
            </span>
            <span className="text-[11px] text-zinc-400 flex items-center gap-1">
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Small-group suppression active (&lt; 5 reports hidden)</span>
            </span>
          </div>

          {/* SVG Site Schematic */}
          <div className="relative w-full aspect-[21/9] min-h-[260px] bg-[#0A101D] rounded border border-zinc-800 p-2 overflow-hidden">
            <svg 
              className="w-full h-full"
              viewBox="0 0 100 100" 
              preserveAspectRatio="none"
              aria-label="Schematic site blueprint showing hazard distribution"
            >
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#grid)" />

              {/* Site Perimeter Box */}
              <rect x="4" y="6" width="92" height="88" fill="none" stroke="rgba(15, 118, 110, 0.4)" strokeWidth="0.8" strokeDasharray="2,2" />

              {/* Schematic Zones */}
              {siteConfig.zones.slice(0, 6).map((zoneName, zIdx) => {
                const coord = zoneLayoutCoordinates[zIdx] || { x: 20 + zIdx * 10, y: 30, w: 20, h: 20 };
                const isSelected = selectedZone === zoneName;
                const pin = pins.find(p => p.zone.toLowerCase().includes(zoneName.toLowerCase()) || zoneName.toLowerCase().includes(p.zone.toLowerCase()));
                const isSuppressed = pin?.suppressed || (pin && pin.count < 5);
                const hasReports = pin && pin.count > 0;

                return (
                  <g key={zoneName} className="cursor-pointer" onClick={() => setSelectedZone(isSelected ? null : zoneName)}>
                    {/* Zone Boundary */}
                    <rect
                      x={coord.x}
                      y={coord.y}
                      width={coord.w}
                      height={coord.h}
                      fill={isSelected ? 'rgba(15, 118, 110, 0.35)' : 'rgba(30, 41, 59, 0.7)'}
                      stroke={isSelected ? '#14B8A6' : hasReports ? '#E11D48' : '#334155'}
                      strokeWidth={isSelected ? 1.5 : 0.8}
                      rx="2"
                    />

                    {/* Zone Label */}
                    <text
                      x={coord.x + coord.w / 2}
                      y={coord.y + 10}
                      textAnchor="middle"
                      fill="#E2E8F0"
                      fontSize="3.2"
                      fontWeight="600"
                    >
                      {zoneName.length > 20 ? zoneName.slice(0, 18) + '...' : zoneName}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Overlay Interactive Zone Badges */}
            <div className="absolute inset-0 pointer-events-none p-2">
              {siteConfig.zones.slice(0, 6).map((zoneName, zIdx) => {
                const coord = zoneLayoutCoordinates[zIdx] || { x: 20 + zIdx * 10, y: 30, w: 20, h: 20 };
                const pin = pins.find(p => p.zone.toLowerCase().includes(zoneName.toLowerCase()) || zoneName.toLowerCase().includes(p.zone.toLowerCase()));
                const isSuppressed = pin?.suppressed || (pin && pin.count > 0 && pin.count < 5);
                const count = pin?.count || 0;
                const isSelected = selectedZone === zoneName;

                return (
                  <div
                    key={zoneName}
                    style={{
                      left: `${coord.x + coord.w / 2}%`,
                      top: `${coord.y + coord.h / 2 + 3}%`,
                    }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                  >
                    <button
                      onClick={() => setSelectedZone(isSelected ? null : zoneName)}
                      className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 shadow-md transition-all ${
                        isSelected 
                          ? 'bg-teal-500 text-white ring-2 ring-white scale-110'
                          : isSuppressed
                          ? 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700'
                          : count >= 5
                          ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse'
                          : 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      {isSuppressed ? (
                        <>
                          <Lock className="w-3 h-3 text-amber-400" />
                          <span>Suppressed (&lt;5)</span>
                        </>
                      ) : count >= 5 ? (
                        <>
                          <AlertTriangle className="w-3 h-3 text-white" />
                          <span>{count} Hazard Reports</span>
                        </>
                      ) : (
                        <span>Normal (0 reports)</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Map Zone Legend and Filter Indicator */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 border-t border-zinc-800 text-[11px] text-zinc-300">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
                <span>Active Clustered Reports (&ge; 5)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-amber-400" />
                <span>Protected Small Groups (&lt; 5 suppressed)</span>
              </span>
            </div>

            {selectedZone && (
              <span className="text-teal-400 font-medium">
                Showing reports for zone: <strong>{selectedZone}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Safety & Grievance Cases List */}
      <div className="bg-white border border-[#E5E5E0] rounded-[8px] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E0]">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#0F766E]" />
              <h2 className="text-sm font-bold text-[#17181A]">Supervisor Safety & Grievance Queue</h2>
              {selectedZone && (
                <span className="text-[11px] bg-teal-50 text-[#0F766E] px-2 py-0.5 rounded border border-teal-200">
                  Filtered: {selectedZone}
                </span>
              )}
            </div>
            <p className="text-xs text-[#73757C] mt-0.5">
              Site-level anonymous queue · Zero reporter IDs · Worker-facing status updates
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <span 
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-mono-code font-bold text-emerald-800"
              title="Live 5-second polling active. Pauses when tab is hidden."
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live • {lastUpdated.toLocaleTimeString()}
            </span>
            <div className="text-xs text-[#73757C]">
              Total Cases: <strong>{filteredCases.length}</strong>
            </div>
          </div>
        </div>

        {/* Case List */}
        {loading ? (
          <div className="py-8 text-center text-xs text-[#73757C]">Loading supervisor queue...</div>
        ) : filteredCases.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#73757C]">
            No reports matching the current filter on this site.
          </div>
        ) : (
          <div className="divide-y divide-[#EBEBE6] border border-[#E5E5E0] rounded-[6px] overflow-hidden text-xs">
            {filteredCases.slice(0, 10).map((c) => {
              const isHighOrCritical = c.severity === 'high' || c.severity === 'critical';

              return (
                <div
                  key={c.caseCode}
                  className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF9F6] transition-colors ${
                    isHighOrCritical && c.status === 'open' ? 'bg-red-50/20' : ''
                  }`}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono-code font-bold text-[#17181A]">{c.caseCode}</span>
                      <Badge variant={c.severity} label={c.severity.toUpperCase()} size="sm" />
                      <span className="text-[11px] text-[#73757C]">• {c.siteZone || c.locationDetail || 'General Site'}</span>
                      <span className="text-[10px] text-[#73757C] font-mono-code">
                        Hour: {new Date(c.createdAtHour || c.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {c.status && (
                        <span className="text-[10px] uppercase font-semibold text-[#0F766E] bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                          {c.status}
                        </span>
                      )}
                    </div>

                    <p className="font-medium text-[#17181A] text-xs leading-relaxed">{c.summaryEn}</p>

                    <div className="text-[11px] text-[#0F766E] flex items-center gap-1 font-medium">
                      <span>Recommended Action:</span>
                      <span>{c.recommendedAction}</span>
                    </div>

                    {c.supervisorNotes && (
                      <div className="text-[11px] text-[#4A4B4F] bg-white p-1.5 rounded border border-[#E5E5E0] mt-1">
                        <strong>Your note to worker:</strong> "{c.supervisorNotes}"
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedCase(c);
                        setNewStatus(c.status);
                        setSupervisorNote(c.supervisorNotes || '');
                      }}
                    >
                      Take Action
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Eye className="w-3.5 h-3.5 text-[#73757C]" />}
                      onClick={() => handleViewTranscript(c.caseCode)}
                    >
                      Transcript
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Drawer */}
      {selectedCase && (
        <Drawer
          isOpen={Boolean(selectedCase)}
          onClose={() => setSelectedCase(null)}
          title={`Update Case: ${selectedCase.caseCode}`}
          subtitle="Changes are reflected in the worker's status lookup immediately."
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-[#FAF9F6] border border-[#E5E5E0] rounded-[6px] space-y-1">
              <span className="font-bold text-[#17181A]">AI Summary:</span>
              <p className="text-[#4A4B4F] leading-relaxed">{selectedCase.summaryEn}</p>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-[#17181A]">Case Status:</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full border border-[#D1D1CB] rounded-[4px] p-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
              >
                <option value="open">Received & Under Review</option>
                <option value="acknowledged">Supervisor Acknowledged</option>
                <option value="in_progress">Corrective Action Taken</option>
                <option value="resolved">Resolved & Closed</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-[#17181A]">Worker-Facing Update Note:</label>
              <textarea
                rows={3}
                value={supervisorNote}
                onChange={(e) => setSupervisorNote(e.target.value)}
                placeholder="e.g. Scaffolding team dispatched to Gate 2. Clamp re-tightened."
                className="w-full border border-[#D1D1CB] rounded-[4px] p-2 text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#0F766E] resize-none"
              />
              <p className="text-[10px] text-[#73757C]">
                This note will be read aloud to the worker when they enter case code {selectedCase.caseCode}.
              </p>
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                size="md"
                className="w-full"
                loading={updating}
                onClick={() => handleUpdateStatus(selectedCase.caseCode)}
              >
                Save Status & Notify Worker
              </Button>
            </div>
          </div>
        </Drawer>
      )}

      {/* Transcript Inspection Drawer (Audit Logged) */}
      {transcriptData && (
        <Drawer
          isOpen={Boolean(transcriptData)}
          onClose={() => setTranscriptData(null)}
          title={`Audit Transcript: ${transcriptData.caseCode}`}
          subtitle="Audit log entry created for viewing this transcript."
        >
          <div className="space-y-4 text-xs">
            {transcriptData.warning && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-[6px] text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed font-medium">{transcriptData.warning}</p>
              </div>
            )}

            <div className="space-y-2">
              <span className="font-bold text-[#17181A]">Original Spoken Transcript ({transcriptData.originalLanguage}):</span>
              <div className="p-3 bg-[#FAF9F6] border border-[#E5E5E0] rounded-[6px] text-xs font-worker leading-relaxed italic">
                "{transcriptData.transcriptOriginal}"
              </div>
            </div>

            <div className="space-y-2">
              <span className="font-bold text-[#17181A]">English Translation:</span>
              <div className="p-3 bg-white border border-[#E5E5E0] rounded-[6px] text-xs leading-relaxed">
                "{transcriptData.transcriptEn}"
              </div>
            </div>

            <p className="text-[10px] text-[#73757C]">
              Notice: The underlying audio was discarded immediately from server memory upon transcription.
            </p>
          </div>
        </Drawer>
      )}
    </div>
  );
};
