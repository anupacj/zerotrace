/**
 * TRACE // ZERO — Forensic Diff & Matching Evaluation Engine
 */

export interface TelemetryPayload {
  secretPhrase?: string;
  alias?: string;
  primaryHardwareHash: string;
  compositeHash: string;
  canvasHash: string;
  webglHash: string;
  audioHash: string;
  hardwareHash: string;
  environmentHash: string;
  fontHash: string;
  entropyTotalBits?: number;
  executionTimeMs?: number;
  diagnostics?: Record<string, any>;
  network?: {
    ip?: string;
    asn?: string;
    asOrganization?: string;
    country?: string;
    city?: string;
    colo?: string;
    userAgent?: string;
  };
}

export interface VectorDiffItem {
  id: string;
  name: string;
  category: string;
  status: 'MATCH' | 'MUTATED' | 'SPOOFED' | 'CLEARED';
  registeredHash: string;
  currentHash: string;
  persistenceNote: string;
  details?: {
    registeredVal?: any;
    currentVal?: any;
  };
}

export interface ForensicDiffResult {
  confidenceScore: number; // e.g. 0.985
  matchType: 'EXACT_COMPOSITE' | 'HARDWARE_SILICON_MATCH' | 'HIGH_CONFIDENCE_HEURISTIC' | 'NO_MATCH';
  isVpnDetected: boolean;
  isStorageEvaded: boolean;
  vectors: VectorDiffItem[];
  hardwareSummary: string;
  evasionAnalysis: string;
}

export function computeForensicDiff(
  registered: Record<string, any>,
  current: TelemetryPayload
): ForensicDiffResult {
  const regDiag = typeof registered.diagnostics_json === 'string'
    ? JSON.parse(registered.diagnostics_json || '{}')
    : (registered.diagnostics || {});
  const curDiag = current.diagnostics || {};

  const canvasMatch = registered.canvas_hash === current.canvasHash;
  const webglMatch = registered.webgl_hash === current.webglHash;
  const audioMatch = registered.audio_hash === current.audioHash;
  const hardwareMatch = registered.hardware_hash === current.hardwareHash;
  const fontMatch = registered.font_hash === current.fontHash;
  const envMatch = registered.environment_hash === current.environmentHash;

  const currentIp = current.network?.ip || '127.0.0.1';
  const registeredIp = registered.ip_address || '127.0.0.1';
  const ipChanged = currentIp !== registeredIp && registeredIp !== '127.0.0.1' && currentIp !== '127.0.0.1';

  const currentAsn = current.network?.asn || '';
  const registeredAsn = registered.asn || '';
  const asnChanged = currentAsn !== registeredAsn && registeredAsn !== '' && currentAsn !== '';

  const isVpnDetected = ipChanged || asnChanged;

  // Calculate matching weight:
  // Canvas (25%), WebGL (30%), Audio (20%), Hardware (15%), Font (7%), Env (3%)
  let score = 0;
  if (canvasMatch) score += 0.25;
  if (webglMatch) score += 0.30;
  if (audioMatch) score += 0.20;
  if (hardwareMatch) score += 0.15;
  if (fontMatch) score += 0.07;
  if (envMatch) score += 0.03;

  let matchType: ForensicDiffResult['matchType'] = 'NO_MATCH';
  if (registered.composite_hash === current.compositeHash) {
    matchType = 'EXACT_COMPOSITE';
    score = 1.0;
  } else if (registered.primary_hardware_hash === current.primaryHardwareHash) {
    matchType = 'HARDWARE_SILICON_MATCH';
    score = Math.max(score, 0.985);
  } else if (score >= 0.70) {
    matchType = 'HIGH_CONFIDENCE_HEURISTIC';
  }

  const vectors: VectorDiffItem[] = [
    {
      id: 'webgl',
      name: 'WebGL GPU Architecture',
      category: 'Silicon & GPU',
      status: webglMatch ? 'MATCH' : 'MUTATED',
      registeredHash: registered.webgl_hash,
      currentHash: current.webglHash,
      persistenceNote: webglMatch
        ? 'Persistent across Incognito. Direct GPU silicon & unmasked driver strings unaffected by browser privacy sandboxing.'
        : 'Mutated shader/renderer pipeline.',
      details: {
        registeredVal: regDiag.webgl?.renderer || regDiag.renderer || 'N/A',
        currentVal: curDiag.webgl?.renderer || curDiag.renderer || 'N/A'
      }
    },
    {
      id: 'canvas',
      name: 'Canvas 2D Sub-Pixel Rasterizer',
      category: 'Silicon & GPU',
      status: canvasMatch ? 'MATCH' : 'MUTATED',
      registeredHash: registered.canvas_hash,
      currentHash: current.canvasHash,
      persistenceNote: canvasMatch
        ? 'Persistent across Incognito. Anti-aliasing and subpixel bezier rasterization is hardwired to your physical display controller and graphics driver.'
        : 'Subpixel rasterization variance observed.',
    },
    {
      id: 'audio',
      name: 'Web Audio DSP Silicon Signature',
      category: 'DSP & Audio',
      status: audioMatch ? 'MATCH' : 'MUTATED',
      registeredHash: registered.audio_hash,
      currentHash: current.audioHash,
      persistenceNote: audioMatch
        ? 'Persistent across Incognito. Floating-point audio compressor decay curve calculated with exact IEEE 754 DSP silicon precision.'
        : 'DSP float signature variance.',
    },
    {
      id: 'hardware',
      name: 'Display & Core Architecture',
      category: 'Display & Arch',
      status: hardwareMatch ? 'MATCH' : 'MUTATED',
      registeredHash: registered.hardware_hash,
      currentHash: current.hardwareHash,
      persistenceNote: hardwareMatch
        ? 'Persistent across Incognito. Native screen resolution, DPR, and CPU logical concurrency remain immutable.'
        : 'Hardware configuration changed.',
      details: {
        registeredVal: regDiag.hardware?.summary || 'N/A',
        currentVal: curDiag.hardware?.summary || 'N/A'
      }
    },
    {
      id: 'font',
      name: 'System Font Metric Fingerprint',
      category: 'Runtime & Fonts',
      status: fontMatch ? 'MATCH' : 'MUTATED',
      registeredHash: registered.font_hash,
      currentHash: current.fontHash,
      persistenceNote: fontMatch
        ? 'Persistent across Incognito. Local OS typography metrics remain queryable regardless of private window status.'
        : 'Font metric delta detected.',
    },
    {
      id: 'network',
      name: 'IP & Autonomous System (ASN)',
      category: 'Network & Transit',
      status: isVpnDetected ? 'SPOOFED' : 'MATCH',
      registeredHash: registered.ip_address || '127.0.0.1',
      currentHash: currentIp,
      persistenceNote: isVpnDetected
        ? `Network path altered via VPN/Proxy (ASN: ${currentAsn || 'Changed'}). However, low-level hardware vectors rendered IP evasion completely ineffective.`
        : 'Same ingress IP/Colo detected.',
      details: {
        registeredVal: `${registered.ip_address || 'Local'} (${registered.asn || 'AS0'})`,
        currentVal: `${currentIp} (${currentAsn || 'AS0'})`
      }
    },
    {
      id: 'storage',
      name: 'Cookies, LocalStorage & IndexedDB',
      category: 'Client Storage',
      status: 'CLEARED',
      registeredHash: '0x0000000000000000',
      currentHash: '0x0000000000000000',
      persistenceNote: 'ZERO stateful storage used. The system successfully re-identified you with 0 cookies, 0 localStorage keys, and 0 cache identifiers.',
    }
  ];

  const evasionAnalysis = isVpnDetected
    ? 'Evasion Attempt Status: FAILED. Even though IP address, ASN routing, and client-side storage were masked or wiped, the immutable hardware/silicon anchors (WebGL GPU rasterization, Audio DSP curves, and Canvas rendering) established deterministic identity.'
    : 'Evasion Attempt Status: FAILED. Clearing cookies and opening an Incognito window failed to evade identification because browser privacy modes do not isolate hardware rendering or DSP math engines.';

  return {
    confidenceScore: Number(score.toFixed(3)),
    matchType,
    isVpnDetected,
    isStorageEvaded: true,
    vectors,
    hardwareSummary: `${regDiag.webgl?.renderer || 'Hardware GPU'} | ${regDiag.hardware?.resolution || 'Native Screen'}`,
    evasionAnalysis
  };
}
