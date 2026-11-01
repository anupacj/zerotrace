import React from 'react';
import { X, Shield, Terminal } from 'lucide-react';

interface DiffVector {
  id: string;
  name: string;
  category: string;
  status: string;
  registeredHash: string;
  currentHash: string;
  persistenceNote: string;
  registeredValue?: string;
  currentValue?: string;
  details?: {
    registeredVal?: any;
    currentVal?: any;
  };
}

interface ForensicDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  evasionResult: any;
}

export const ForensicDiffModal: React.FC<ForensicDiffModalProps> = ({
  isOpen,
  onClose,
  evasionResult,
}) => {
  if (!isOpen || !evasionResult) return null;

  const diffVectors: DiffVector[] = evasionResult.diffVectors || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-5xl border border-border bg-panel shadow-2xl space-y-0 my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-background">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center border border-border bg-panel">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-primary">
                  FORENSIC DIFF INSPECTOR // VISIT 01 vs VISIT 02
                </span>
                <span className="border border-match bg-match text-background px-1.5 py-0.2 font-mono text-2xs uppercase tracking-widest font-bold">
                  {(evasionResult.confidenceScore * 100).toFixed(1)}% RE-IDENTIFIED
                </span>
                {evasionResult.isBraveFarblingDetected && (
                  <span className="border border-mutated bg-mutated/10 text-mutated px-1.5 py-0.2 font-mono text-2xs uppercase tracking-widest font-bold">
                    BRAVE SHIELDS DEFEATED
                  </span>
                )}
              </div>
              <p className="font-mono text-2xs text-muted">
                Side-by-side hardware vector analysis demonstrating evasion vector invalidation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="border border-border p-1.5 text-muted hover:text-primary hover:border-primary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Clinical Interception Banner */}
        <div className="border-b border-border bg-panel p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-border bg-background p-3.5 space-y-1">
              <span className="font-mono text-2xs uppercase tracking-widest text-muted block">
                REVEALED SECRET PHRASE
              </span>
              <span className="font-mono text-sm font-bold text-match block truncate">
                "{evasionResult.secretPhrase}"
              </span>
            </div>

            <div className="border border-border bg-background p-3.5 space-y-1">
              <span className="font-mono text-2xs uppercase tracking-widest text-muted block">
                TARGET HOST ANCHOR
              </span>
              <span className="font-mono text-sm text-primary block truncate">
                {evasionResult.alias}
              </span>
            </div>

            <div className="border border-border bg-background p-3.5 space-y-1">
              <span className="font-mono text-2xs uppercase tracking-widest text-muted block">
                EVASION STATUS
              </span>
              <span className="font-mono text-sm text-mutated font-semibold block">
                {evasionResult.isBraveFarblingDetected
                  ? 'BRAVE FARBLING DETECTED // BYPASSED'
                  : evasionResult.isVpnDetected
                  ? 'VPN SPOOFED // BYPASSED'
                  : 'STORAGE EVADED // BYPASSED'}
              </span>
            </div>
          </div>

          <p className="font-sans text-xs text-muted leading-relaxed">
            {evasionResult.evasionAnalysis || `The target attempted evasion by opening a storage-isolated Private context. While high-level IP routing and cookies were cleared, the invariant display geometry, unmasked GPU architecture, and audio DSP dynamic compressor curves remained deterministic, establishing identity.`}
          </p>
        </div>

        {/* High-Density Vector Diff Table */}
        <div className="overflow-x-auto border-b border-border">
          <table className="w-full text-left font-mono text-2xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-background text-muted uppercase tracking-widest">
                <th className="p-3 w-44">TELEMETRY VECTOR</th>
                <th className="p-3 w-48">VISIT 01 (BASELINE)</th>
                <th className="p-3 w-48">VISIT 02 (EVASION)</th>
                <th className="p-3 w-36">MATCH STATUS</th>
                <th className="p-3">FORENSIC PERSISTENCE EXPLANATION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-panel">
              {diffVectors.map((vec) => {
                const isSiliconLocked = vec.status === 'SILICON ANCHOR LOCKED' || vec.status === 'MATCH';
                const isPerturbed = vec.status === 'PERTURBED (NOISE INJECTED)';
                const isSpoofed = vec.status === 'SPOOFED';
                const isCleared = vec.status === 'CLEARED';

                const regVal = vec.details?.registeredVal || vec.registeredValue;
                const curVal = vec.details?.currentVal || vec.currentValue;

                return (
                  <tr key={vec.id} className="hover:bg-panel-subtle transition-colors">
                    <td className="p-3 align-top">
                      <div className="font-semibold text-primary">{vec.name}</div>
                      <div className="text-dim text-2xs uppercase">{vec.category}</div>
                    </td>

                    <td className="p-3 align-top font-medium text-muted">
                      <div className="truncate text-primary" title={vec.registeredHash}>
                        {vec.registeredHash.slice(0, 16)}...
                      </div>
                      {regVal && (
                        <div className="text-dim truncate">{String(regVal)}</div>
                      )}
                    </td>

                    <td className="p-3 align-top font-medium text-muted">
                      <div className="truncate text-primary" title={vec.currentHash}>
                        {vec.currentHash.slice(0, 16)}...
                      </div>
                      {curVal && (
                        <div className="text-dim truncate">{String(curVal)}</div>
                      )}
                    </td>

                    <td className="p-3 align-top">
                      <span
                        className={`inline-block border px-2 py-0.5 text-2xs uppercase tracking-widest font-semibold ${
                          isSiliconLocked
                            ? 'border-match/40 bg-match/10 text-match'
                            : isPerturbed
                            ? 'border-mutated/40 bg-mutated/10 text-mutated'
                            : isSpoofed
                            ? 'border-mutated/40 bg-mutated/10 text-mutated'
                            : isCleared
                            ? 'border-border bg-background text-dim'
                            : 'border-evaded/40 bg-evaded/10 text-evaded'
                        }`}
                      >
                        {vec.status}
                      </span>
                    </td>

                    <td className="p-3 align-top font-sans text-xs text-muted leading-relaxed">
                      {vec.persistenceNote}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 bg-background">
          <div className="flex items-center gap-2 font-mono text-2xs text-muted">
            <Terminal className="h-3.5 w-3.5" />
            <span>TRACE // ZERO — FORENSIC TELEMETRY VERIFIED VIA D1 SQLITE & FUZZY SCORING</span>
          </div>
          <button
            onClick={onClose}
            className="border border-border bg-panel hover:bg-panel-subtle px-4 py-1.5 font-mono text-xs uppercase tracking-wider text-primary transition-colors"
          >
            CLOSE INSPECTOR
          </button>
        </div>
      </div>
    </div>
  );
};
