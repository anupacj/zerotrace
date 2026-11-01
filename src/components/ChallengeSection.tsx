import React, { useState } from 'react';
import { Lock, Unlock, ShieldAlert, ArrowRight, CheckCircle, Copy, AlertTriangle, Sparkles } from 'lucide-react';
import { FingerprintReport } from '../lib/fingerprint';

interface ChallengeSectionProps {
  report: FingerprintReport | null;
  probing: boolean;
  onRegisterSecret: (phrase: string, alias: string) => Promise<boolean>;
  onEvaluateEvasion: () => Promise<any>;
  registrationSuccessData: { id: string; alias: string; phrase: string } | null;
  evasionResult: any | null;
  evaluating: boolean;
  onOpenDiffModal: () => void;
}

const PHRASE_SUGGESTIONS = [
  'project-vulcan-subpixel-77',
  'quantum-matrix-entropy-902',
  'vector-zero-silicon-omega',
  'aurora-borealis-shadow-44',
  'falcon-intercept-terminal-19',
  'spectral-audio-pipeline-58'
];

export const ChallengeSection: React.FC<ChallengeSectionProps> = ({
  report,
  probing,
  onRegisterSecret,
  onEvaluateEvasion,
  registrationSuccessData,
  evasionResult,
  evaluating,
  onOpenDiffModal,
}) => {
  const [phrase, setPhrase] = useState('');
  const [alias, setAlias] = useState('');
  const [registering, setRegistering] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGeneratePhrase = () => {
    const random = PHRASE_SUGGESTIONS[Math.floor(Math.random() * PHRASE_SUGGESTIONS.length)];
    setPhrase(random);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phrase.trim()) return;
    setRegistering(true);
    try {
      await onRegisterSecret(phrase.trim(), alias.trim());
    } finally {
      setRegistering(false);
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="border border-border bg-panel">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-border px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="font-mono text-2xs uppercase tracking-forensic text-muted">
            00 // ADVERSARIAL HARDWARE EVASION WORKFLOW
          </span>
        </div>
        <div className="flex items-center gap-2 text-2xs font-mono text-dim">
          <span>STEP 1: LOCK PHRASE</span>
          <span>→</span>
          <span>STEP 2: INCOGNITO / VPN</span>
          <span>→</span>
          <span>STEP 3: FORENSIC RE-IDENTIFICATION</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
        {/* Left Column: Phase 1 — Secret Phrase Lock-In */}
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center border border-border bg-background">
                <Lock className="h-3.5 w-3.5 text-primary" />
              </div>
              <h2 className="font-mono text-xs uppercase tracking-wider text-primary">
                PHASE 1 // ANCHOR SECRET PHRASE
              </h2>
            </div>
            {registrationSuccessData && (
              <span className="border border-match/30 bg-match/10 px-2 py-0.5 font-mono text-2xs uppercase tracking-widest text-match">
                DEVICE ANCHORED
              </span>
            )}
          </div>

          <p className="text-xs text-muted leading-relaxed">
            Input a confidential phrase and register it against your hardware rendering pipeline. 
            No tracking cookies or storage keys are stored on your client.
          </p>

          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-mono text-2xs uppercase tracking-widest text-muted">
                  CONFIDENTIAL SECRET PHRASE
                </label>
                <button
                  type="button"
                  onClick={handleGeneratePhrase}
                  className="flex items-center gap-1 font-mono text-2xs text-muted hover:text-primary transition-colors"
                >
                  <Sparkles className="h-2.5 w-2.5" />
                  GENERATE RANDOM
                </button>
              </div>
              <input
                type="text"
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                placeholder="e.g. cipher-delta-78 or The eagle lands at midnight"
                className="w-full border border-border bg-background px-3 py-2 font-mono text-xs text-primary placeholder:text-dim focus:border-primary focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-mono text-2xs uppercase tracking-widest text-muted mb-1">
                HOST ALIAS / IDENTIFIER (OPTIONAL)
              </label>
              <input
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="e.g. Primary Workstation // Chrome"
                className="w-full border border-border bg-background px-3 py-2 font-mono text-xs text-primary placeholder:text-dim focus:border-primary focus:outline-none"
              />
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={registering || probing || !phrase.trim()}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-neutral-200 disabled:opacity-50 text-background px-4 py-2.5 font-mono text-xs font-semibold tracking-wider uppercase transition-colors"
              >
                {registering ? (
                  <span>ANCHORING TELEMETRY TO D1...</span>
                ) : (
                  <>
                    <Lock className="h-3.5 w-3.5" />
                    <span>LOCK IN SECRET & REGISTER TELEMETRY</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Active Challenge Instructions Card */}
          {registrationSuccessData && (
            <div className="border border-border bg-background p-4 space-y-3">
              <div className="flex items-center gap-2 text-match">
                <CheckCircle className="h-4 w-4" />
                <span className="font-mono text-xs font-medium uppercase tracking-wider">
                  TELEMETRY ANCHORED SUCCESSFULLY
                </span>
              </div>
              <div className="font-mono text-2xs text-muted space-y-1 bg-panel p-2.5 border border-border">
                <p>RECORD ID: <span className="text-primary">{registrationSuccessData.id}</span></p>
                <p>ANCHORED PHRASE: <span className="text-match">"{registrationSuccessData.phrase}"</span></p>
                <p>HARDWARE ANCHOR: <span className="text-primary">{report?.primaryHardwareHash.slice(0, 24)}...</span></p>
              </div>

              <div className="space-y-1.5 pt-1">
                <span className="font-mono text-2xs uppercase tracking-widest text-primary block">
                  ADVERSARIAL EVASION INSTRUCTIONS:
                </span>
                <ol className="list-decimal list-inside text-xs text-muted space-y-1 font-mono">
                  <li>Keep this computer / browser running.</li>
                  <li>Open an <span className="text-primary">Incognito / Private Window</span> (wiping cookies/localStorage).</li>
                  <li><span className="text-primary">(Optional)</span> Route through a VPN or change networks to spoof IP/ASN.</li>
                  <li>Revisit this URL and execute the interception probe on the right.</li>
                </ol>
              </div>

              <button
                onClick={handleCopyUrl}
                className="w-full flex items-center justify-center gap-2 border border-border bg-panel hover:bg-panel-subtle px-3 py-1.5 font-mono text-2xs uppercase tracking-widest text-primary transition-colors"
              >
                <Copy className="h-3 w-3" />
                <span>{copied ? 'COPIED TO CLIPBOARD' : 'COPY APP URL FOR INCOGNITO WINDOW'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Phase 2 — Forensic Interception & Evasion Evaluation */}
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center border border-border bg-background">
                <ShieldAlert className="h-3.5 w-3.5 text-primary" />
              </div>
              <h2 className="font-mono text-xs uppercase tracking-wider text-primary">
                PHASE 2 // EVALUATE EVASION ATTEMPT
              </h2>
            </div>
            <span className="border border-border bg-background px-2 py-0.5 font-mono text-2xs uppercase tracking-widest text-muted">
              INTERCEPTION ENGINE
            </span>
          </div>

          <p className="text-xs text-muted leading-relaxed">
            Test whether clearing client-side storage or spoofing your IP address via VPN successfully evades
            browser hardware profiling. The system will inspect your current GPU, Audio, and Canvas vectors.
          </p>

          <button
            onClick={onEvaluateEvasion}
            disabled={evaluating || probing}
            className="w-full flex items-center justify-center gap-2 border border-primary bg-background hover:bg-panel disabled:opacity-50 text-primary px-4 py-3 font-mono text-xs font-semibold tracking-wider uppercase transition-colors"
          >
            {evaluating ? (
              <span className="animate-pulse">RUNNING FORENSIC INTERCEPTION PROBE...</span>
            ) : (
              <>
                <Unlock className="h-3.5 w-3.5 text-primary" />
                <span>EXECUTE FORENSIC INTERCEPTION PROBE</span>
              </>
            )}
          </button>

          {/* Interception Result Card */}
          {evasionResult && (
            <div className="space-y-3 pt-2">
              {evasionResult.identified ? (
                <div className="border border-match/40 bg-match/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-match">
                      <ShieldAlert className="h-4 w-4" />
                      <span className="font-mono text-xs font-bold uppercase tracking-widest">
                        FORENSIC INTERCEPTION SUCCESSFUL
                      </span>
                    </div>
                    <span className="border border-match bg-match text-background px-2 py-0.5 font-mono text-2xs font-bold uppercase tracking-widest">
                      {(evasionResult.confidenceScore * 100).toFixed(1)}% MATCH
                    </span>
                  </div>

                  {/* Secret Phrase Revealed Monospace Display */}
                  <div className="border border-border bg-background p-3.5 space-y-1">
                    <span className="font-mono text-2xs uppercase tracking-widest text-muted block">
                      REVEALED CONFIDENTIAL SECRET PHRASE:
                    </span>
                    <div className="font-mono text-base font-bold text-match tracking-wide break-all">
                      "{evasionResult.secretPhrase}"
                    </div>
                  </div>

                  {/* Clinical Forensic Metrics */}
                  <div className="grid grid-cols-2 gap-2 text-2xs font-mono">
                    <div className="border border-border bg-panel p-2">
                      <span className="text-muted uppercase block">ORIGINAL HOST:</span>
                      <span className="text-primary truncate block">{evasionResult.alias}</span>
                    </div>
                    <div className="border border-border bg-panel p-2">
                      <span className="text-muted uppercase block">MATCH CLASSIFIER:</span>
                      <span className="text-match font-medium block">{evasionResult.matchType}</span>
                    </div>
                    <div className="border border-border bg-panel p-2">
                      <span className="text-muted uppercase block">VPN DETECTION:</span>
                      <span className={evasionResult.isVpnDetected ? 'text-mutated font-medium block' : 'text-primary block'}>
                        {evasionResult.isVpnDetected ? 'VPN DETECTED (IP SPOOFED)' : 'DIRECT ISP ROUTE'}
                      </span>
                    </div>
                    <div className="border border-border bg-panel p-2">
                      <span className="text-muted uppercase block">STORAGE INDEPENDENCE:</span>
                      <span className="text-match font-medium block">100% PERSISTENCE-FREE</span>
                    </div>
                  </div>

                  <p className="text-xs text-muted leading-relaxed">
                    Despite clearing all cookies/localStorage and routing through a different IP, your physical 
                    display controller, GPU execution rasterization, and audio DSP signature permanently re-identified this device.
                  </p>

                  <button
                    onClick={onOpenDiffModal}
                    className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-neutral-200 text-background px-3 py-2 font-mono text-xs font-semibold tracking-wider uppercase transition-colors"
                  >
                    <span>INSPECT COMPREHENSIVE FORENSIC DIFF</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="border border-border bg-background p-4 space-y-2">
                  <div className="flex items-center gap-2 text-muted">
                    <AlertTriangle className="h-4 w-4 text-mutated" />
                    <span className="font-mono text-xs uppercase tracking-wider text-primary">
                      NO MATCHING DEVICE PROFILE LOCATED
                    </span>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    This hardware signature does not match any previously anchored device in the database. 
                    Lock in a secret phrase on this machine first using Phase 1.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
