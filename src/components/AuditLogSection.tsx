import React from 'react';
import { History, RefreshCw } from 'lucide-react';

interface AuditLogSectionProps {
  registrations: any[];
  evasions: any[];
  loading: boolean;
  onRefresh: () => void;
}

export const AuditLogSection: React.FC<AuditLogSectionProps> = ({
  registrations,
  evasions,
  loading,
  onRefresh,
}) => {
  return (
    <section className="border border-border bg-panel">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-border px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted" />
          <span className="font-mono text-2xs uppercase tracking-forensic text-muted">
            02 // D1 PERSISTENT TELEMETRY & INTERCEPTION AUDIT LEDGER
          </span>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 font-mono text-2xs uppercase tracking-wider text-muted hover:text-primary transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          <span>REFRESH LEDGER</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
        {/* Left: Anchored Devices */}
        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-primary font-semibold">
              ANCHORED DEVICES ({registrations.length})
            </span>
            <span className="font-mono text-2xs text-muted uppercase">RECENT 20</span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {registrations.length === 0 ? (
              <div className="border border-border/60 bg-background p-4 text-center font-mono text-2xs text-dim">
                NO ANCHORED DEVICES FOUND YET
              </div>
            ) : (
              registrations.map((reg) => (
                <div
                  key={reg.id}
                  className="border border-border bg-background p-2.5 space-y-1.5 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center justify-between text-2xs font-mono">
                    <span className="text-primary font-medium">{reg.alias || reg.id}</span>
                    <span className="text-dim">
                      {new Date(reg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>

                  <div className="font-mono text-2xs text-muted truncate">
                    HARDWARE: <span className="text-primary">{reg.primary_hardware_hash?.slice(0, 20)}...</span>
                  </div>

                  <div className="flex items-center justify-between text-2xs font-mono text-dim pt-1 border-t border-border/40">
                    <span>IP: {reg.ip_address || '127.0.0.1'}</span>
                    <span>COLO: {reg.colo || 'DEV'}</span>
                    <span>LATENCY: {reg.execution_time_ms || 12}ms</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Evasion Attempts */}
        <div className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-primary font-semibold">
              INTERCEPTED EVASIONS ({evasions.length})
            </span>
            <span className="font-mono text-2xs text-muted uppercase">RECENT 20</span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {evasions.length === 0 ? (
              <div className="border border-border/60 bg-background p-4 text-center font-mono text-2xs text-dim">
                NO EVASION ATTEMPTS LOGGED YET
              </div>
            ) : (
              evasions.map((eva) => (
                <div
                  key={eva.id}
                  className="border border-border bg-background p-2.5 space-y-1.5 hover:border-match/40 transition-colors"
                >
                  <div className="flex items-center justify-between text-2xs font-mono">
                    <span className="border border-match/40 bg-match/10 text-match px-1.5 py-0.2 uppercase tracking-widest font-semibold">
                      INTERCEPTED // {eva.match_type || 'HARDWARE_MATCH'}
                    </span>
                    <span className="text-dim">
                      {new Date(eva.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-2xs font-mono text-muted">
                    <span>CONFIDENCE: <span className="text-match font-bold">{((eva.confidence_score || 0.985) * 100).toFixed(1)}%</span></span>
                    <span className={eva.is_vpn_detected ? 'text-mutated' : 'text-dim'}>
                      {eva.is_vpn_detected ? 'VPN / PROXY DETECTED' : 'DIRECT ROUTE'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-2xs font-mono text-dim pt-1 border-t border-border/40">
                    <span>IP: {eva.ip_address || '127.0.0.1'}</span>
                    <span>COLO: {eva.colo || 'DEV'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
