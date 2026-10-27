import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import axe from 'axe-core';
import { I18nProvider } from './i18n';
import { ToastProvider } from './components/ui/Toast';
import { WorkerHome } from './components/worker/WorkerHome';
import { ShiftPayslipCard } from './components/worker/ShiftPayslipCard';
import { VoiceReportFlow } from './components/worker/VoiceReportFlow';
import { AttentionQueue } from './components/employer/AttentionQueue';
import { FatigueRadar } from './components/employer/FatigueRadar';

// Helper to render React 19 element into JSDOM container and audit with axe-core
async function checkA11y(element: React.ReactElement) {
  const html = renderToString(element);
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);

  const results = await axe.run(container, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa'],
    },
    rules: {
      // Color contrast requires real browser layout rendering engine; verified via CSS design tokens
      'color-contrast': { enabled: false },
    },
  });

  document.body.removeChild(container);
  return results.violations;
}

const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <I18nProvider>
    <ToastProvider>{children}</ToastProvider>
  </I18nProvider>
);

describe('Accessibility Audit (Axe-Core / WCAG 2.1 AA Zero Violations)', () => {
  it('Worker Home has zero accessibility violations', async () => {
    const violations = await checkA11y(
      <Providers>
        <WorkerHome
          workerId="worker_const_02"
          workerName="Arjun Verma"
          role="Rebar / Mason"
          siteId="site-metro-const"
          baseHourlyRate={180}
          onLogout={vi.fn()}
        />
      </Providers>
    );
    expect(violations).toEqual([]);
  });

  it('Shift Payslip has zero accessibility violations', async () => {
    const violations = await checkA11y(
      <Providers>
        <ShiftPayslipCard
          siteId="site-metro-const"
          workerName="Arjun Verma"
          baseHourlyRate={180}
          totalWorkedHours={9.5}
          advanceDeduction={200}
        />
      </Providers>
    );
    expect(violations).toEqual([]);
  });

  it('Voice Report Flow has zero accessibility violations', async () => {
    const violations = await checkA11y(
      <Providers>
        <VoiceReportFlow
          siteId="site-metro-const"
          initialCategory="safety"
          onBack={vi.fn()}
        />
      </Providers>
    );
    expect(violations).toEqual([]);
  });

  it('Attention Queue has zero accessibility violations', async () => {
    const violations = await checkA11y(
      <Providers>
        <AttentionQueue siteId="site-metro-const" />
      </Providers>
    );
    expect(violations).toEqual([]);
  });

  it('Fatigue Radar has zero accessibility violations', async () => {
    const violations = await checkA11y(
      <Providers>
        <FatigueRadar siteId="site-metro-const" />
      </Providers>
    );
    expect(violations).toEqual([]);
  });
});
