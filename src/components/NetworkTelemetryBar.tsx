import React from 'react';
import { Globe, Shield, Wifi, Server } from 'lucide-react';

interface NetworkData {
  ip: string;
  asn: string;
  asOrganization: string;
  country: string;
  city: string;
  region: string;
  colo: string;
  httpProtocol: string;
  tlsCipher: string;
  cfRay: string;
  userAgent: string;
}

interface NetworkTelemetryBarProps {
  network: NetworkData | null;
  loading: boolean;
}

export const NetworkTelemetryBar: React.FC<NetworkTelemetryBarProps> = ({ network, loading }) => {
  return (
    <div className="border-b border-border bg-panel px-4 py-2.5 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-y-2 gap-x-6 text-xs font-mono">
        {/* Left: Ingress Node */}
        <div className="flex flex-wrap items-center gap-4 text-muted">
          <div className="flex items-center gap-1.5 text-primary">
            <Globe className="h-3.5 w-3.5 text-muted" />
            <span className="text-muted uppercase text-2xs tracking-widest">INGRESS IP:</span>
            <span className="text-primary font-medium">{loading ? 'PROBING...' : (network?.ip || '127.0.0.1')}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Server className="h-3.5 w-3.5 text-muted" />
            <span className="text-muted uppercase text-2xs tracking-widest">ROUTING / ASN:</span>
            <span className="text-primary truncate max-w-[200px]" title={network?.asOrganization}>
              {loading ? '...' : (network?.asn || 'AS0 Direct')}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Wifi className="h-3.5 w-3.5 text-muted" />
            <span className="text-muted uppercase text-2xs tracking-widest">EDGE COLO:</span>
            <span className="text-primary font-medium">{loading ? '...' : (network?.colo || 'DEV')}</span>
            <span className="text-dim">({network?.country || 'LOCAL'})</span>
          </div>
        </div>

        {/* Right: Security & Ray */}
        <div className="flex items-center gap-4 text-2xs text-muted">
          <div className="hidden md:flex items-center gap-1.5">
            <Shield className="h-3 w-3 text-muted" />
            <span className="uppercase tracking-widest">TLS:</span>
            <span className="text-primary truncate max-w-[150px]">{network?.tlsCipher || 'AES-GCM'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="uppercase tracking-widest">RAY:</span>
            <span className="text-dim">{network?.cfRay || 'DIRECT-CONN'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
