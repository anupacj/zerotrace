import React, { useState } from 'react';
import { Copy, Check, Terminal, Cpu, Activity, Music, Monitor, Compass, Type } from 'lucide-react';
import { FingerprintReport, VectorResult } from '../lib/fingerprint';

interface ProbeMatrixProps {
  report: FingerprintReport | null;
  onSelectVector: (vector: VectorResult) => void;
}

const VECTOR_ICONS: Record<string, React.ReactNode> = {
  canvas: <Activity className="h-4 w-4 text-muted" />,
  webgl: <Cpu className="h-4 w-4 text-muted" />,
  audio: <Music className="h-4 w-4 text-muted" />,
  hardware: <Monitor className="h-4 w-4 text-muted" />,
  environment: <Compass className="h-4 w-4 text-muted" />,
  font: <Type className="h-4 w-4 text-muted" />,
};

export const ProbeMatrix: React.FC<ProbeMatrixProps> = ({ report, onSelectVector }) => {
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const handleCopy = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 1500);
  };

  if (!report) {
    return (
      <div className="border border-border bg-panel p-8 text-center font-mono text-xs text-muted">
        INITIALIZING HARDWARE SENSORS & TELEMETRY PROBES...
      </div>
    );
  }

  const vectorList = [
    report.vectors.webgl,
    report.vectors.canvas,
    report.vectors.audio,
    report.vectors.hardware,
    report.vectors.font,
    report.vectors.environment,
  ];

  return (
    <section className="space-y-3">
      {/* Structural Section Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-2xs uppercase tracking-forensic text-muted">
            01 // HARDWARE TELEMETRY SENSORS & SUB-PIXEL PROBES
          </span>
        </div>
        <div className="flex items-center gap-4 font-mono text-2xs text-muted">
          <span>6 OF 6 VECTORS ACTIVE</span>
          <span className="text-dim">|</span>
          <span>AGGREGATE TIMING: <span className="text-primary">{report.totalExecutionTimeMs} ms</span></span>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border">
        {vectorList.map((vec, idx) => {
          const isCopied = copiedHash === vec.hash;
          const numIdx = String(idx + 1).padStart(2, '0');

          return (
            <div
              key={vec.id}
              className="bg-panel p-4 flex flex-col justify-between space-y-3 hover:bg-panel-subtle transition-colors"
            >
              {/* Header */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {VECTOR_ICONS[vec.id] || <Cpu className="h-4 w-4 text-muted" />}
                    <span className="font-mono text-2xs uppercase tracking-widest text-muted">
                      {numIdx} // {vec.category}
                    </span>
                  </div>
                  <span
                    className={`font-mono text-2xs px-1.5 py-0.2 border uppercase tracking-widest ${
                      vec.stability === 'IMMUTABLE_HARDWARE'
                        ? 'border-match/40 bg-match/10 text-match'
                        : 'border-border bg-background text-muted'
                    }`}
                  >
                    {vec.stability === 'IMMUTABLE_HARDWARE' ? 'IMMUTABLE' : 'STABLE'}
                  </span>
                </div>

                <h3 className="font-sans text-xs font-semibold text-primary uppercase tracking-wide">
                  {vec.name}
                </h3>
                <p className="font-mono text-2xs text-muted truncate" title={vec.summary}>
                  {vec.summary}
                </p>
              </div>

              {/* SHA-256 Hash Container */}
              <div className="border border-border bg-background p-2 space-y-1">
                <div className="flex items-center justify-between text-2xs font-mono text-muted">
                  <span>SHA-256 HASH</span>
                  <button
                    onClick={() => handleCopy(vec.hash)}
                    className="flex items-center gap-1 hover:text-primary transition-colors text-dim hover:text-muted"
                  >
                    {isCopied ? <Check className="h-3 w-3 text-match" /> : <Copy className="h-3 w-3" />}
                    <span>{isCopied ? 'COPIED' : 'COPY'}</span>
                  </button>
                </div>
                <div className="font-mono text-xs text-primary font-medium truncate" title={vec.hash}>
                  {vec.hash}
                </div>
              </div>

              {/* Metrics & Inspect Trigger */}
              <div className="flex items-center justify-between pt-1 border-t border-border/50 text-2xs font-mono">
                <div className="flex items-center gap-3 text-muted">
                  <span>
                    LATENCY: <span className="text-primary">{vec.executionTimeMs}ms</span>
                  </span>
                  <span>
                    ENTROPY: <span className="text-primary">~{vec.entropyBits}b</span>
                  </span>
                </div>

                <button
                  onClick={() => onSelectVector(vec)}
                  className="flex items-center gap-1 text-muted hover:text-primary transition-colors"
                >
                  <Terminal className="h-3 w-3" />
                  <span>DIAGNOSTICS</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
