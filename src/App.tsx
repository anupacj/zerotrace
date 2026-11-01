import React, { useState, useEffect, useCallback } from 'react';
import { executeTelemetryProbes, FingerprintReport, VectorResult } from './lib/fingerprint';
import { Header } from './components/Header';
import { NetworkTelemetryBar } from './components/NetworkTelemetryBar';
import { ChallengeSection } from './components/ChallengeSection';
import { ProbeMatrix } from './components/ProbeMatrix';
import { ForensicDiffModal } from './components/ForensicDiffModal';
import { RawJsonInspector } from './components/RawJsonInspector';
import { AuditLogSection } from './components/AuditLogSection';
import { Shield } from 'lucide-react';

export const App: React.FC = () => {
  const [report, setReport] = useState<FingerprintReport | null>(null);
  const [network, setNetwork] = useState<any>(null);
  const [probing, setProbing] = useState<boolean>(true);
  const [networkLoading, setNetworkLoading] = useState<boolean>(true);

  // Challenge Workflow States
  const [registrationSuccessData, setRegistrationSuccessData] = useState<{ id: string; alias: string; phrase: string } | null>(null);
  const [evasionResult, setEvasionResult] = useState<any | null>(null);
  const [evaluating, setEvaluating] = useState<boolean>(false);

  // Modal States
  const [diffModalOpen, setDiffModalOpen] = useState<boolean>(false);
  const [rawInspectorOpen, setRawInspectorOpen] = useState<boolean>(false);
  const [selectedVector, setSelectedVector] = useState<VectorResult | null>(null);

  // Audit Logs
  const [auditRegistrations, setAuditRegistrations] = useState<any[]>([]);
  const [auditEvasions, setAuditEvasions] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState<boolean>(false);

  // 1. Run Hardware Probes
  const runProbes = useCallback(async () => {
    setProbing(true);
    try {
      const rep = await executeTelemetryProbes();
      setReport(rep);
    } catch (err) {
      console.error('Probe execution failed:', err);
    } finally {
      setProbing(false);
    }
  }, []);

  // 2. Fetch Network Data from Cloudflare Edge
  const fetchNetwork = useCallback(async () => {
    setNetworkLoading(true);
    try {
      const res = await fetch('/api/probe');
      if (res.ok) {
        const data = await res.json();
        setNetwork(data);
      }
    } catch (err) {
      console.warn('Network probe fallback to local:', err);
      setNetwork({
        ip: '127.0.0.1',
        asn: 'AS0 (Local)',
        asOrganization: 'Localhost Development Environment',
        colo: 'DEV',
        country: 'LOCAL',
        tlsCipher: 'AES-256-GCM',
        cfRay: 'LOCAL-DIRECT',
      });
    } finally {
      setNetworkLoading(false);
    }
  }, []);

  // 3. Fetch History / Audit Logs
  const fetchHistory = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        setAuditRegistrations(data.registrations || []);
        setAuditEvasions(data.evasions || []);
      }
    } catch (err) {
      console.warn('Audit history fetch fallback:', err);
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    runProbes();
    fetchNetwork();
    fetchHistory();
  }, [runProbes, fetchNetwork, fetchHistory]);

  // Handle Phase 1: Lock In Secret Phrase
  const handleRegisterSecret = async (phrase: string, alias: string): Promise<boolean> => {
    if (!report) return false;

    const payload = {
      secretPhrase: phrase,
      alias: alias || undefined,
      compositeHash: report.compositeHash,
      primaryHardwareHash: report.primaryHardwareHash,
      canvasHash: report.vectors.canvas.hash,
      webglHash: report.vectors.webgl.hash,
      audioHash: report.vectors.audio.hash,
      hardwareHash: report.vectors.hardware.hash,
      environmentHash: report.vectors.environment.hash,
      fontHash: report.vectors.font.hash,
      entropyTotalBits: report.totalEntropyBits,
      executionTimeMs: report.totalExecutionTimeMs,
      network: network || {},
      diagnostics: {
        canvas: report.vectors.canvas.diagnostics,
        webgl: report.vectors.webgl.diagnostics,
        audio: report.vectors.audio.diagnostics,
        hardware: report.vectors.hardware.diagnostics,
        environment: report.vectors.environment.diagnostics,
        font: report.vectors.font.diagnostics,
        renderer: report.vectors.webgl.diagnostics?.renderer,
        resolution: report.vectors.hardware.diagnostics?.resolution,
        hardwareConcurrency: report.vectors.hardware.diagnostics?.hardwareConcurrency,
        detectedFontsCount: report.vectors.font.diagnostics?.detectedFontsCount,
      }
    };

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Registration failed');
      const data = await res.json();
      setRegistrationSuccessData({
        id: data.id,
        alias: data.alias,
        phrase,
      });
      fetchHistory();
      return true;
    } catch (err: any) {
      alert(`Error locking secret: ${err?.message || 'Unknown error'}`);
      return false;
    }
  };

  // Handle Phase 2: Evaluate Evasion Attempt
  const handleEvaluateEvasion = async (): Promise<any> => {
    setEvaluating(true);
    try {
      // Re-run probes to ensure we are testing fresh runtime state
      const freshReport = await executeTelemetryProbes();
      setReport(freshReport);

      const payload = {
        compositeHash: freshReport.compositeHash,
        primaryHardwareHash: freshReport.primaryHardwareHash,
        canvasHash: freshReport.vectors.canvas.hash,
        webglHash: freshReport.vectors.webgl.hash,
        audioHash: freshReport.vectors.audio.hash,
        hardwareHash: freshReport.vectors.hardware.hash,
        environmentHash: freshReport.vectors.environment.hash,
        fontHash: freshReport.vectors.font.hash,
        network: network || {},
        diagnostics: {
          canvas: freshReport.vectors.canvas.diagnostics,
          webgl: freshReport.vectors.webgl.diagnostics,
          audio: freshReport.vectors.audio.diagnostics,
          hardware: freshReport.vectors.hardware.diagnostics,
          environment: freshReport.vectors.environment.diagnostics,
          font: freshReport.vectors.font.diagnostics,
          renderer: freshReport.vectors.webgl.diagnostics?.renderer,
          resolution: freshReport.vectors.hardware.diagnostics?.resolution,
          hardwareConcurrency: freshReport.vectors.hardware.diagnostics?.hardwareConcurrency,
          detectedFontsCount: freshReport.vectors.font.diagnostics?.detectedFontsCount,
        }
      };

      const res = await fetch('/api/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Evaluation request failed');
      const data = await res.json();
      setEvasionResult(data);
      fetchHistory();
      return data;
    } catch (err: any) {
      alert(`Evaluation failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setEvaluating(false);
    }
  };

  const handleSelectVectorDiagnostics = (vector: VectorResult) => {
    setSelectedVector(vector);
    setRawInspectorOpen(true);
  };

  const handleOpenFullPayload = () => {
    setSelectedVector(null);
    setRawInspectorOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-primary flex flex-col font-sans selection:bg-primary selection:text-background">
      {/* 1. Header */}
      <Header
        report={report}
        probing={probing}
        onRefreshProbes={runProbes}
        onOpenRawDiagnostics={handleOpenFullPayload}
      />

      {/* 2. Edge Network Telemetry Bar */}
      <NetworkTelemetryBar network={network} loading={networkLoading} />

      {/* 3. Main Operational Surface */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {/* Banner: System Architecture Summary */}
        <div className="border border-border bg-panel p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center border border-border bg-background">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="font-mono text-xs uppercase tracking-wider text-primary font-bold">
                FORENSIC SYSTEM OBJECTIVE // PERSISTENCE-FREE RE-IDENTIFICATION
              </div>
              <p className="font-sans text-xs text-muted">
                Demonstrates how low-level silicon micro-architectures (WebGL shader formats, Canvas bezier sub-pixel rasterization, and Audio DSP float decay) bypass browser sandbox storage wipes and VPN IP mutations.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 font-mono text-2xs text-muted">
            <span className="border border-border bg-background px-2.5 py-1">
              D1 SQLITE: <span className="text-match font-medium">CONNECTED</span>
            </span>
            <span className="border border-border bg-background px-2.5 py-1">
              ZERO COOKIES: <span className="text-match font-medium">ENFORCED</span>
            </span>
          </div>
        </div>

        {/* Challenge Section */}
        <ChallengeSection
          report={report}
          probing={probing}
          onRegisterSecret={handleRegisterSecret}
          onEvaluateEvasion={handleEvaluateEvasion}
          registrationSuccessData={registrationSuccessData}
          evasionResult={evasionResult}
          evaluating={evaluating}
          onOpenDiffModal={() => setDiffModalOpen(true)}
        />

        {/* Probe Matrix Bento Grid */}
        <ProbeMatrix
          report={report}
          onSelectVector={handleSelectVectorDiagnostics}
        />

        {/* Audit Log Ledger */}
        <AuditLogSection
          registrations={auditRegistrations}
          evasions={auditEvasions}
          loading={auditLoading}
          onRefresh={fetchHistory}
        />
      </main>

      {/* 4. Forensic Modals */}
      <ForensicDiffModal
        isOpen={diffModalOpen}
        onClose={() => setDiffModalOpen(false)}
        evasionResult={evasionResult}
      />

      <RawJsonInspector
        isOpen={rawInspectorOpen}
        onClose={() => setRawInspectorOpen(false)}
        selectedVector={selectedVector}
        fullReport={{
          timestamp: report?.timestamp,
          primaryHardwareHash: report?.primaryHardwareHash,
          compositeHash: report?.compositeHash,
          totalEntropyBits: report?.totalEntropyBits,
          totalExecutionTimeMs: report?.totalExecutionTimeMs,
          network,
          vectors: report?.vectors,
        }}
      />

      {/* 5. Minimalist Footer */}
      <footer className="border-t border-border bg-panel py-4 px-4 sm:px-6 text-center">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-4 font-mono text-2xs text-dim">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-match" />
            <span>TRACE // ZERO — DETERMINISTIC SILICON TELEMETRY RESEARCH TOOL</span>
          </div>
          <div>
            CLOUDFLARE PAGES FUNCTIONS // CLOUDFLARE D1 (SQLITE) // WEB CRYPTO SHA-256
          </div>
        </div>
      </footer>
    </div>
  );
};
