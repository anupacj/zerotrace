import React from 'react';
import { Fingerprint, RefreshCw, Terminal, Cpu } from 'lucide-react';
import { FingerprintReport } from '../lib/fingerprint';

interface HeaderProps {
  report: FingerprintReport | null;
  probing: boolean;
  onRefreshProbes: () => void;
  onOpenRawDiagnostics: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  report,
  probing,
  onRefreshProbes,
  onOpenRawDiagnostics,
}) => {
  return (
    <header className="border-b border-border bg-panel px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
        {/* Brand & System Status */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center border border-border bg-background">
            <Fingerprint className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold tracking-widest text-primary">
                TRACE // ZERO
              </span>
              <span className="border border-border bg-background px-1.5 py-0.2 font-mono text-2xs uppercase tracking-widest text-muted">
                v1.0.4-PROD
              </span>
            </div>
            <p className="font-sans text-xs text-muted">
              Browser Hardware Telemetry & Deterministic Evasion Forensics
            </p>
          </div>
        </div>

        {/* Clinical Metric Badges */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          {/* Live Probing Timing */}
          <div className="flex items-center gap-2 border border-border bg-background px-3 py-1.5">
            <Cpu className="h-3.5 w-3.5 text-muted" />
            <div className="flex flex-col">
              <span className="font-mono text-2xs uppercase tracking-widest text-muted">
                EXEC TIMING
              </span>
              <span className="font-mono text-xs font-medium text-primary">
                {probing ? 'MEASURING...' : `${report?.totalExecutionTimeMs || 0} ms`}
              </span>
            </div>
          </div>

          {/* Entropy Measure */}
          <div className="flex items-center gap-2 border border-border bg-background px-3 py-1.5">
            <div className="flex flex-col">
              <span className="font-mono text-2xs uppercase tracking-widest text-muted">
                HARDWARE ENTROPY
              </span>
              <span className="font-mono text-xs font-medium text-primary">
                ~{report?.totalEntropyBits || 67.9} BITS
              </span>
            </div>
          </div>

          {/* Engine Status */}
          <div className="flex items-center gap-2 border border-border bg-background px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-match animate-pulse" />
            <div className="flex flex-col">
              <span className="font-mono text-2xs uppercase tracking-widest text-muted">
                ANCHOR ENGINE
              </span>
              <span className="font-mono text-xs font-medium text-match">
                D1 // ACTIVE
              </span>
            </div>
          </div>

          {/* Re-probe Action */}
          <button
            onClick={onRefreshProbes}
            disabled={probing}
            className="flex items-center gap-2 border border-border bg-panel hover:bg-panel-subtle disabled:opacity-50 px-3 py-2 text-xs font-mono uppercase tracking-wider text-primary transition-colors"
            title="Re-run all 6 hardware telemetry vectors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${probing ? 'animate-spin' : ''}`} />
            <span>RE-PROBE</span>
          </button>

          {/* Open Inspector */}
          <button
            onClick={onOpenRawDiagnostics}
            className="flex items-center gap-1.5 border border-border bg-background hover:bg-panel px-3 py-2 text-xs font-mono uppercase tracking-wider text-muted hover:text-primary transition-colors"
          >
            <Terminal className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">RAW PAYLOAD</span>
          </button>
        </div>
      </div>
    </header>
  );
};
