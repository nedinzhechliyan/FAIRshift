import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Drawer } from '../ui/Drawer';
import { useToast } from '../ui/Toast';
import { ReportCaseSummary, TranscriptDetails } from '../../types';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Eye, 
  MessageSquare, 
  RefreshCw,
  Building2,
  Lock
} from 'lucide-react';

interface SupervisorCasesStubProps {
  siteId: string;
}

export const SupervisorCasesStub: React.FC<SupervisorCasesStubProps> = ({ siteId }) => {
  const { showToast } = useToast();
  const [cases, setCases] = useState<ReportCaseSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCase, setSelectedCase] = useState<ReportCaseSummary | null>(null);
  const [newStatus, setNewStatus] = useState<string>('open');
  const [supervisorNote, setSupervisorNote] = useState<string>('');
  const [updating, setUpdating] = useState<boolean>(false);

  // Transcript view drawer & audit
  const [transcriptData, setTranscriptData] = useState<TranscriptDetails | null>(null);
  const [loadingTranscript, setLoadingTranscript] = useState<boolean>(false);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/employer/cases?siteId=${siteId}`);
      if (res.status === 403) {
        showToast('Access restricted: Supervisor session active', 'warning');
        return;
      }
      const data = await res.json();
      setCases(data.cases || []);
    } catch (err) {
      console.warn('Failed to fetch cases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
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
      fetchCases();
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

  return (
    <div className="bg-white border border-[#E5E5E0] rounded-[8px] p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E0]">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#0F766E]" />
            <h2 className="text-sm font-bold text-[#17181A]">Supervisor Safety & Grievance Cases</h2>
          </div>
          <p className="text-xs text-[#73757C] mt-0.5">Site-level anonymous queue · Zero reporter IDs</p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchCases}
          icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
        >
          Refresh
        </Button>
      </div>

      {/* Case List */}
      {loading ? (
        <div className="py-8 text-center text-xs text-[#73757C]">Loading supervisor queue...</div>
      ) : cases.length === 0 ? (
        <div className="py-8 text-center text-xs text-[#73757C]">No open reports on this site.</div>
      ) : (
        <div className="divide-y divide-[#EBEBE6] border border-[#E5E5E0] rounded-[6px] overflow-hidden text-xs">
          {cases.slice(0, 8).map((c) => {
            const isHighOrCritical = c.severity === 'high' || c.severity === 'critical';

            return (
              <div
                key={c.caseCode}
                className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF9F6] transition-colors ${
                  isHighOrCritical && c.status === 'open' ? 'bg-red-50/30' : ''
                }`}
              >
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono-code font-bold text-[#17181A]">{c.caseCode}</span>
                    <Badge variant={c.severity} label={c.severity.toUpperCase()} size="sm" />
                    <span className="text-[11px] text-[#73757C]">• {c.siteZone || 'General Site'}</span>
                    <span className="text-[10px] text-[#73757C] font-mono-code">
                      Hour: {new Date(c.createdAtHour).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="font-medium text-[#17181A] text-xs leading-relaxed">{c.summaryEn}</p>

                  <div className="text-[11px] text-[#0F766E] flex items-center gap-1 font-medium">
                    <span>Action:</span>
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
