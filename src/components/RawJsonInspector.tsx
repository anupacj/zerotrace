import React, { useState } from 'react';
import { X, Copy, Check, Download, Terminal } from 'lucide-react';
import { VectorResult } from '../lib/fingerprint';

interface RawJsonInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVector: VectorResult | null;
  fullReport: any;
}

export const RawJsonInspector: React.FC<RawJsonInspectorProps> = ({
  isOpen,
  onClose,
  selectedVector,
  fullReport,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const dataToDisplay = selectedVector ? selectedVector : fullReport;
  const jsonString = JSON.stringify(dataToDisplay, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trace-zero-telemetry-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6">
      <div className="w-full max-w-4xl max-h-[85vh] flex flex-col border border-border bg-panel shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-3.5 bg-background">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-muted" />
            <span className="font-mono text-xs uppercase tracking-widest text-primary font-bold">
              {selectedVector ? `DIAGNOSTICS // ${selectedVector.name}` : 'FULL CLIENT TELEMETRY PAYLOAD'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 border border-border bg-panel hover:bg-panel-subtle px-3 py-1 font-mono text-2xs uppercase tracking-wider text-primary transition-colors"
            >
              {copied ? <Check className="h-3 w-3 text-match" /> : <Copy className="h-3 w-3" />}
              <span>{copied ? 'COPIED' : 'COPY JSON'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 border border-border bg-panel hover:bg-panel-subtle px-3 py-1 font-mono text-2xs uppercase tracking-wider text-primary transition-colors"
            >
              <Download className="h-3 w-3" />
              <span>EXPORT</span>
            </button>
            <button
              onClick={onClose}
              className="border border-border p-1 text-muted hover:text-primary transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 bg-background">
          <pre className="font-mono text-xs text-muted leading-relaxed whitespace-pre-wrap select-all">
            {jsonString}
          </pre>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-2 bg-panel flex items-center justify-between text-2xs font-mono text-muted">
          <span>SIZE: {new Blob([jsonString]).size} BYTES</span>
          <span>FORMAT: UTF-8 JSON</span>
        </div>
      </div>
    </div>
  );
};
