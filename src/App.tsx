import React, { useState, useEffect } from 'react';
import { I18nProvider, useI18n, SUPPORTED_LANGUAGES } from './i18n';
import { ToastProvider, useToast } from './components/ui/Toast';
import { Button, Badge, Stat, Table, AudioSpeakerButton } from './components/ui';
import { WorkerLogin, WorkerOption } from './components/worker/WorkerLogin';
import { WorkerHome } from './components/worker/WorkerHome';
import { SiteQrDisplay } from './components/worker/SiteQrDisplay';
import { AttentionQueue } from './components/employer/AttentionQueue';
import { FatigueRadar } from './components/employer/FatigueRadar';
import { SafetyCasesPlan } from './components/employer/SafetyCasesPlan';
import { SiteMapView } from './components/employer/SiteMapView';
import { SECTOR_CONFIGS, LEGAL_DISCLAIMER_NOTE } from './config/siteRules';
import { calculateShiftPay } from './engine/payEngine';
import { calculateFatigueScore } from './engine/fatigueEngine';
import { calculateAttritionRisk } from './engine/attritionEngine';
import { formatINR } from './utils/formatCurrency';
import { 
  Building2, 
  Smartphone, 
  Monitor, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  CheckCircle2,
  Sparkles,
  QrCode,
  Activity,
  Layers,
  Compass,
  ListTodo
} from 'lucide-react';

export default function App() {
  return (
    <I18nProvider>
      <ToastProvider>
        <FairShiftPlatform />
      </ToastProvider>
    </I18nProvider>
  );
}

function FairShiftPlatform() {
  const { language, setLanguage, t } = useI18n();
  const { showToast } = useToast();

  // FIX 3: Default site on first load is the Construction site ('site-metro-const')
  const [selectedSiteId, setSelectedSiteId] = useState<string>('site-metro-const');
  const [activeRole, setActiveRole] = useState<'worker' | 'supervisor'>('worker');
  const [loggedInWorker, setLoggedInWorker] = useState<WorkerOption | null>(null);

  // FIX 4: Move the Phase 1 status banner behind a '?dev=1' query flag
  const [showDevBanner, setShowDevBanner] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setShowDevBanner(params.get('dev') === '1');
    }
  }, []);

  const siteConfig = SECTOR_CONFIGS[selectedSiteId] || SECTOR_CONFIGS['site-metro-const'];

  // Handle worker login from demo login screen
  const handleWorkerLogin = (worker: WorkerOption) => {
    setLoggedInWorker(worker);
    setSelectedSiteId(worker.siteId);
    showToast(`Logged in as ${worker.name} (${worker.role})`, 'success');
  };

  // If role is worker and no worker logged in yet, render the Worker Login screen first!
  if (activeRole === 'worker' && !loggedInWorker) {
    return (
      <WorkerLogin
        onLoginSuccess={handleWorkerLogin}
        onSwitchToConsole={() => setActiveRole('supervisor')}
      />
    );
  }

  // If role is worker and logged in, render the Mobile-First Worker App!
  if (activeRole === 'worker' && loggedInWorker) {
    return (
      <div className="min-h-screen bg-[#F1F1ED]">
        {/* Dev helper switch bar if in desktop preview */}
        <div className="bg-[#17181A] text-white px-4 py-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#0F766E]">FairShift</span>
            <span className="text-[11px] text-[#A8A8A0]">Worker App (360px Mobile-First)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveRole('supervisor')}
              className="text-[11px] bg-zinc-800 hover:bg-zinc-700 text-white px-2.5 py-1 rounded-[4px] border border-zinc-700 transition-colors"
            >
              Switch to Employer Console →
            </button>
          </div>
        </div>

        {/* Worker Home inside mobile container */}
        <div className="max-w-[420px] mx-auto bg-[#FAFAF8] shadow-lg min-h-[calc(100vh-36px)]">
          <WorkerHome
            workerId={loggedInWorker.id}
            workerName={loggedInWorker.name}
            role={loggedInWorker.role}
            siteId={selectedSiteId}
            baseHourlyRate={siteConfig.rules.defaultHourlyRate}
            onLogout={() => setLoggedInWorker(null)}
            onSwitchToConsole={() => setActiveRole('supervisor')}
          />
        </div>
      </div>
    );
  }

  // Employer Console View (Supervisor & Gate QR terminal)
  const [consoleTab, setConsoleTab] = useState<'queue' | 'radar' | 'cases' | 'qr' | 'setup'>('queue');
  const [targetRadarWorkerId, setTargetRadarWorkerId] = useState<string | null>(null);
  const [targetCaseCode, setTargetCaseCode] = useState<string | null>(null);

  const handleOpenCaseFromQueue = (caseCode: string) => {
    setTargetCaseCode(caseCode);
    setConsoleTab('cases');
  };

  const handleNavigateToRadarFromQueue = (workerId: string) => {
    setTargetRadarWorkerId(workerId);
    setConsoleTab('radar');
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#17181A] flex flex-col font-sans">
      {/* Top Universal Platform Bar */}
      <header className="border-b border-[#E5E5E0] bg-white sticky top-0 z-30 px-4 py-2.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Tag */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[6px] bg-[#0F766E] text-white flex items-center justify-center font-bold tracking-tight">
              FS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-[#17181A]">FairShift</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#F0FDFA] text-[#0F766E] border border-[#CCFBF1]">
                  UN SDG 8 · Decent Work
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono-code bg-[#F1F1ED] text-[#4A4B4F] border border-[#E5E5E0]">
                  Employer Console
                </span>
              </div>
              <p className="text-[11px] text-[#73757C]">Worker Trust & Workforce Risk Platform</p>
            </div>
          </div>

          {/* Controls: Site Selector + Person/Role Picker */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Workplace / Sector Switcher */}
            <div className="flex items-center bg-[#F4F4F1] p-1 rounded-[6px] border border-[#E5E5E0]">
              <span className="text-[11px] font-medium text-[#73757C] px-2 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-[#0F766E]" />
                Sector / Site:
              </span>
              <select
                value={selectedSiteId}
                onChange={(e) => {
                  setSelectedSiteId(e.target.value);
                  showToast(`Switched workplace sector to ${SECTOR_CONFIGS[e.target.value]?.siteName}`, 'info');
                }}
                className="text-xs bg-white text-[#17181A] py-1 px-2 rounded-[4px] border border-[#D1D1CB] focus:outline-none focus:ring-1 focus:ring-[#0F766E] font-medium"
              >
                {Object.values(SECTOR_CONFIGS).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.sector === 'construction' ? '🏗️ Construction: ' : s.sector === 'campus' ? '🏫 Campus: ' : '🏥 Healthcare: '}
                    {s.siteName.split(' - ')[0]}
                  </option>
                ))}
              </select>
            </div>

            {/* Role Switcher */}
            <div className="flex items-center bg-[#F4F4F1] p-0.5 rounded-[6px] border border-[#E5E5E0]">
              <button
                onClick={() => {
                  setActiveRole('worker');
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-[4px] text-[#73757C] hover:text-[#17181A] transition-colors"
              >
                <Smartphone className="w-3.5 h-3.5 text-[#0F766E]" />
                Worker App (Mobile)
              </button>
              <button
                onClick={() => setActiveRole('supervisor')}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-[4px] bg-white text-[#17181A] shadow-xs transition-colors"
              >
                <Monitor className="w-3.5 h-3.5 text-[#0F766E]" />
                Employer Console
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Sector Vocabulary & Context Subheader */}
      <div className="bg-[#FAF9F6] border-b border-[#E5E5E0] px-4 py-2 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-[#17181A] flex items-center gap-1">
              <span className="text-base">{siteConfig.sector === 'construction' ? '🏗️' : siteConfig.sector === 'campus' ? '🏫' : '🏥'}</span>
              <span>{siteConfig.vocabulary.workplaceLabel}:</span>
            </span>
            <span className="text-[#4A4B4F]">{siteConfig.siteName}</span>
            <span className="text-[#73757C]">•</span>
            <span className="text-[#73757C]">Worker Role: <strong className="text-[#17181A]">{siteConfig.vocabulary.workerLabel}</strong></span>
            <span className="text-[#73757C]">•</span>
            <span className="text-[#73757C]">Supervisor: <strong className="text-[#17181A]">{siteConfig.vocabulary.supervisorLabel}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono-code text-[#73757C] bg-white px-2 py-0.5 rounded border border-[#E5E5E0]">
              Standard: {siteConfig.rules.regularShiftHours}h · OT {siteConfig.rules.overtimeMultiplier}x
            </span>
          </div>
        </div>
      </div>

      {/* Employer Console Tab Navigation */}
      <nav className="bg-white border-b border-[#E5E5E0] px-4 sticky top-[53px] z-20">
        <div className="max-w-7xl mx-auto flex items-center gap-1 sm:gap-2 overflow-x-auto text-xs py-1">
          <button
            onClick={() => setConsoleTab('queue')}
            className={`flex items-center gap-2 py-2.5 px-3 border-b-2 font-medium whitespace-nowrap transition-colors ${
              consoleTab === 'queue'
                ? 'border-[#0F766E] text-[#0F766E] font-bold'
                : 'border-transparent text-[#73757C] hover:text-[#17181A]'
            }`}
          >
            <ListTodo className="w-4 h-4" />
            <span>Attention Queue (Home)</span>
            <span className="w-2 h-2 rounded-full bg-red-600"></span>
          </button>

          <button
            onClick={() => setConsoleTab('radar')}
            className={`flex items-center gap-2 py-2.5 px-3 border-b-2 font-medium whitespace-nowrap transition-colors ${
              consoleTab === 'radar'
                ? 'border-[#0F766E] text-[#0F766E] font-bold'
                : 'border-transparent text-[#73757C] hover:text-[#17181A]'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Fatigue & Attrition Radar</span>
          </button>

          <button
            onClick={() => setConsoleTab('cases')}
            className={`flex items-center gap-2 py-2.5 px-3 border-b-2 font-medium whitespace-nowrap transition-colors ${
              consoleTab === 'cases'
                ? 'border-[#0F766E] text-[#0F766E] font-bold'
                : 'border-transparent text-[#73757C] hover:text-[#17181A]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Safety Cases & Site Plan</span>
          </button>

          <button
            onClick={() => setConsoleTab('qr')}
            className={`flex items-center gap-2 py-2.5 px-3 border-b-2 font-medium whitespace-nowrap transition-colors ${
              consoleTab === 'qr'
                ? 'border-[#0F766E] text-[#0F766E] font-bold'
                : 'border-transparent text-[#73757C] hover:text-[#17181A]'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Site QR Kiosk</span>
          </button>

          <button
            onClick={() => setConsoleTab('setup')}
            className={`flex items-center gap-2 py-2.5 px-3 border-b-2 font-medium whitespace-nowrap transition-colors ${
              consoleTab === 'setup'
                ? 'border-[#0F766E] text-[#0F766E] font-bold'
                : 'border-transparent text-[#73757C] hover:text-[#17181A]'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Site Setup & Geofence (OSM Map)</span>
          </button>
        </div>
      </nav>

      {/* Main Employer Console Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* FIX 4: Phase 1 Dev Status Banner (only rendered when ?dev=1 is present) */}
        {showDevBanner && (
          <section className="bg-white border border-[#E5E5E0] rounded-[8px] p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-bold text-[#0F766E] uppercase tracking-wider">
                  Dev Status View (?dev=1 enabled)
                </span>
              </div>
              <Badge variant="teal" label="Phase 1, 2, 3 & 4 Verified" size="sm" />
            </div>
            <p className="text-xs text-[#73757C] mt-1">
              Deterministic engines, formatINR, Ramesh Kumar red fatigue (score 75), Attention Queue, Radar Heatmap, Leaflet OSM map, and offline queue active.
            </p>
          </section>
        )}

        {/* TAB 1: ATTENTION QUEUE (Console Home) */}
        {consoleTab === 'queue' && (
          <AttentionQueue
            siteId={selectedSiteId}
            onSelectCase={handleOpenCaseFromQueue}
            onNavigateToRadar={handleNavigateToRadarFromQueue}
          />
        )}

        {/* TAB 2: FATIGUE & ATTRITION RADAR (Signature Screen) */}
        {consoleTab === 'radar' && (
          <FatigueRadar
            siteId={selectedSiteId}
            initialWorkerId={targetRadarWorkerId}
          />
        )}

        {/* TAB 3: SAFETY CASES & SITE PLAN */}
        {consoleTab === 'cases' && (
          <SafetyCasesPlan
            siteId={selectedSiteId}
            initialSelectedCaseCode={targetCaseCode}
          />
        )}

        {/* TAB 4: SITE QR KIOSK */}
        {consoleTab === 'qr' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="bg-white border border-[#E5E5E0] rounded-[8px] p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E0] mb-4">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-[#0F766E]" />
                  <h2 className="text-sm font-bold text-[#17181A]">Site Gate Rotating QR Terminal</h2>
                </div>
                <Badge variant="green" label="Active HMAC Rotating" size="sm" />
              </div>

              <p className="text-xs text-[#73757C] mb-4">
                Position this terminal at the entrance of {siteConfig.siteName}. Workers check in by scanning this rotating HMAC QR code.
              </p>

              {/* Rotating QR Display */}
              <SiteQrDisplay siteId={selectedSiteId} />
            </div>
          </div>
        )}

        {/* TAB 5: SITE SETUP & GEOFENCE (Leaflet OSM Map) */}
        {consoleTab === 'setup' && (
          <SiteMapView siteId={selectedSiteId} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5E5E0] bg-white py-3 px-4 text-center text-xs text-[#73757C] mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>FairShift · UN SDG 8 Decent Work Platform</span>
          <span className="text-[11px]">{LEGAL_DISCLAIMER_NOTE}</span>
        </div>
      </footer>
    </div>
  );
}
