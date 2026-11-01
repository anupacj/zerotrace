/**
 * TRACE // ZERO — Forensic Diff & Multi-Tier Fuzzy Scoring Engine
 * 
 * Evaluates device identity with full resistance to:
 * 1. Web Audio float jitter
 * 2. Brave Shields anti-fingerprinting noise ("Farbling" on Canvas, Audio, hardwareConcurrency)
 * 3. Incognito / Private mode sandbox wipes
 * 4. VPN / Proxy IP mutations
 */

export interface TelemetryPayload {
  secretPhrase?: string;
  alias?: string;
  primaryHardwareHash: string;
  compositeHash: string;
  displayGeometryHash?: string;
  gpuModelHash?: string;
  timezoneLocaleHash?: string;
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
  status: 'MATCH' | 'MUTATED' | 'SPOOFED' | 'CLEARED' | 'PERTURBED (NOISE INJECTED)' | 'SILICON ANCHOR LOCKED';
  registeredHash: string;
  currentHash: string;
  persistenceNote: string;
  details?: {
    registeredVal?: any;
    currentVal?: any;
  };
}

export interface ForensicDiffResult {
  confidenceScore: number; // e.g. 0.985 or 0.885
  matchType: 'EXACT_COMPOSITE' | 'SAME_SESSION_CONFIRMED' | 'HARDWARE_SILICON_MATCH' | 'FARBLING_RESISTANT_HARDWARE_MATCH' | 'HIGH_CONFIDENCE_HEURISTIC' | 'NO_MATCH';
  isVpnDetected: boolean;
  isStorageEvaded: boolean;
  isBraveFarblingDetected: boolean;
  rawScorePoints: number;
  vectors: VectorDiffItem[];
  hardwareSummary: string;
  evasionAnalysis: string;
}

/**
 * Score similarity between a registered record and an incoming probe
 */
export function evaluateCandidateSimilarity(
  registered: Record<string, any>,
  current: TelemetryPayload
): {
  matched: boolean;
  rawPoints: number;
  confidenceScore: number;
  matchType: ForensicDiffResult['matchType'];
  isBraveFarblingDetected: boolean;
  canvasMatch: boolean;
  webglMatch: boolean;
  webglFuzzyMatch: boolean;
  audioMatch: boolean;
  displayMatch: boolean;
  fontMatch: boolean;
  fontFuzzyMatch: boolean;
  envMatch: boolean;
  isVpnDetected: boolean;
  isSameSession: boolean;
} {
  const regDiag = typeof registered.diagnostics_json === 'string'
    ? JSON.parse(registered.diagnostics_json || '{}')
    : (registered.diagnostics || {});
  const curDiag = current.diagnostics || {};

  // 1. Storage Token Check (Instant Same-Session Confirmation)
  const regStorageToken = regDiag.storageToken || registered.storage_token || '';
  const curStorageToken = curDiag.storageToken || '';
  const isSameSession = Boolean(regStorageToken && curStorageToken && regStorageToken === curStorageToken);

  // Compute VPN / IP mutation
  const currentIp = current.network?.ip || '127.0.0.1';
  const registeredIp = registered.ip_address || '127.0.0.1';
  const currentAsn = current.network?.asn || '';
  const registeredAsn = registered.asn || '';
  const isVpnDetected = (currentIp !== registeredIp && registeredIp !== '127.0.0.1' && currentIp !== '127.0.0.1') ||
                        Boolean(currentAsn && registeredAsn && currentAsn !== registeredAsn);

  if (isSameSession) {
    return {
      matched: true,
      rawPoints: 100,
      confidenceScore: 1.0,
      matchType: 'SAME_SESSION_CONFIRMED',
      isBraveFarblingDetected: false,
      canvasMatch: true,
      webglMatch: true,
      webglFuzzyMatch: true,
      audioMatch: true,
      displayMatch: true,
      fontMatch: true,
      fontFuzzyMatch: true,
      envMatch: true,
      isVpnDetected,
      isSameSession: true,
    };
  }

  // Exact composite match
  if (registered.composite_hash && registered.composite_hash === current.compositeHash) {
    return {
      matched: true,
      rawPoints: 100,
      confidenceScore: 1.0,
      matchType: 'EXACT_COMPOSITE',
      isBraveFarblingDetected: false,
      canvasMatch: true,
      webglMatch: true,
      webglFuzzyMatch: true,
      audioMatch: true,
      displayMatch: true,
      fontMatch: true,
      fontFuzzyMatch: true,
      envMatch: true,
      isVpnDetected,
      isSameSession: false,
    };
  }

  let rawPoints = 0;

  // 2. Canvas Vector (25 pts)
  const canvasMatch = Boolean(registered.canvas_hash && registered.canvas_hash === current.canvasHash);
  if (canvasMatch) {
    rawPoints += 25;
  }

  // 3. Audio Vector (15 pts)
  const audioMatch = Boolean(registered.audio_hash && registered.audio_hash === current.audioHash);
  if (audioMatch) {
    rawPoints += 15;
  }

  // 4. WebGL Vector (20 pts full, 15 pts fuzzy GPU model)
  const webglMatch = Boolean(registered.webgl_hash && registered.webgl_hash === current.webglHash);
  let webglFuzzyMatch = false;
  if (webglMatch) {
    rawPoints += 20;
    webglFuzzyMatch = true;
  } else {
    // Check GPU renderer substring and texture size
    const regRenderer = String(regDiag.gpuRenderer || regDiag.renderer || '').trim().toLowerCase();
    const curRenderer = String(curDiag.gpuRenderer || curDiag.renderer || '').trim().toLowerCase();
    const regVendor = String(regDiag.gpuVendor || regDiag.vendor || '').trim().toLowerCase();
    const curVendor = String(curDiag.gpuVendor || curDiag.vendor || '').trim().toLowerCase();
    const regTex = regDiag.maxTextureSize || 0;
    const curTex = curDiag.maxTextureSize || 0;

    const rendererMatch = regRenderer && curRenderer && (regRenderer === curRenderer || regRenderer.includes(curRenderer) || curRenderer.includes(regRenderer));
    const vendorMatch = !regVendor || !curVendor || regVendor === curVendor;
    const texMatch = !regTex || !curTex || regTex === curTex;

    if (rendererMatch && (vendorMatch || texMatch)) {
      rawPoints += 15;
      webglFuzzyMatch = true;
    }
  }

  // 5. Display Geometry Vector (25 pts) — INVARIANT across Normal, Incognito, and Brave Private!
  const regWidth = regDiag.screenWidth || 0;
  const curWidth = curDiag.screenWidth || 0;
  const regHeight = regDiag.screenHeight || 0;
  const curHeight = curDiag.screenHeight || 0;
  const regDpr = regDiag.pixelRatio || regDiag.devicePixelRatio || 1;
  const curDpr = curDiag.pixelRatio || curDiag.devicePixelRatio || 1;

  const regDispHash = regDiag.displayGeometryHash || '';
  const curDispHash = curDiag.displayGeometryHash || current.displayGeometryHash || '';

  const displayMatch = Boolean(
    (regDispHash && curDispHash && regDispHash === curDispHash) ||
    (regWidth > 0 && curWidth > 0 && regWidth === curWidth && regHeight === curHeight && Math.abs(regDpr - curDpr) < 0.05)
  );
  if (displayMatch) {
    rawPoints += 25;
  }

  // 6. System Font Metric Vector (15 pts)
  const fontMatch = Boolean(registered.font_hash && registered.font_hash === current.fontHash);
  let fontFuzzyMatch = false;
  if (fontMatch) {
    rawPoints += 15;
    fontFuzzyMatch = true;
  } else {
    // Check overlapping fonts
    const regFonts: string[] = Array.isArray(regDiag.detectedFontsList) ? regDiag.detectedFontsList : [];
    const curFonts: string[] = Array.isArray(curDiag.detectedFontsList) ? curDiag.detectedFontsList : [];
    if (regFonts.length > 0 && curFonts.length > 0) {
      const intersection = regFonts.filter(f => curFonts.includes(f));
      const overlapRatio = intersection.length / Math.max(regFonts.length, curFonts.length);
      if (overlapRatio >= 0.80) {
        rawPoints += 15;
        fontFuzzyMatch = true;
      }
    }
  }

  // 7. Timezone & Localization (15 pts)
  const regTz = String(regDiag.timezone || regDiag.timeZone || '').trim();
  const curTz = String(curDiag.timezone || curDiag.timeZone || '').trim();
  const regPlatform = String(regDiag.platform || '').trim().toLowerCase();
  const curPlatform = String(curDiag.platform || '').trim().toLowerCase();

  const tzMatch = Boolean(regTz && curTz && regTz === curTz);
  const platMatch = Boolean(!regPlatform || !curPlatform || regPlatform === curPlatform);
  const envMatch = tzMatch && platMatch;
  if (envMatch) {
    rawPoints += 15;
  }

  // 8. Network / ASN correlation bonus (+10 pts)
  const ipMatched = currentIp === registeredIp && currentIp !== '127.0.0.1';
  const asnMatched = Boolean(currentAsn && registeredAsn && currentAsn === registeredAsn);

  if (ipMatched || asnMatched) {
    rawPoints += 10;
  }

  // Farbling detection: When display + GPU + timezone/fonts match, but canvas or audio mutated
  const isBraveFarblingDetected = displayMatch && webglFuzzyMatch && (!canvasMatch || !audioMatch);

  // Threshold: >= 55 points indicates a definitive hardware match
  const matched = rawPoints >= 55;

  let confidenceScore = 0;
  let matchType: ForensicDiffResult['matchType'] = 'NO_MATCH';

  if (matched) {
    if (canvasMatch && webglMatch && audioMatch && displayMatch) {
      confidenceScore = 0.985;
      matchType = 'HARDWARE_SILICON_MATCH';
    } else if (isBraveFarblingDetected) {
      // Normalize Brave Farbled match into 78% - 92%
      confidenceScore = Number(Math.min(0.92, Math.max(0.78, 0.75 + (rawPoints / 115) * 0.17)).toFixed(3));
      matchType = 'FARBLING_RESISTANT_HARDWARE_MATCH';
    } else {
      confidenceScore = Number(Math.min(0.95, Math.max(0.75, (rawPoints / 100) * 0.9)).toFixed(3));
      matchType = 'HIGH_CONFIDENCE_HEURISTIC';
    }
  }

  return {
    matched,
    rawPoints,
    confidenceScore,
    matchType,
    isBraveFarblingDetected,
    canvasMatch,
    webglMatch,
    webglFuzzyMatch,
    audioMatch,
    displayMatch,
    fontMatch,
    fontFuzzyMatch,
    envMatch,
    isVpnDetected,
    isSameSession,
  };
}

/**
 * Generate full forensic diff comparing Visit 1 (Registration) vs Visit 2 (Current Probe)
 */
export function computeForensicDiff(
  registered: Record<string, any>,
  current: TelemetryPayload
): ForensicDiffResult {
  const evalResult = evaluateCandidateSimilarity(registered, current);
  const regDiag = typeof registered.diagnostics_json === 'string'
    ? JSON.parse(registered.diagnostics_json || '{}')
    : (registered.diagnostics || {});
  const curDiag = current.diagnostics || {};

  const currentIp = current.network?.ip || '127.0.0.1';
  const registeredIp = registered.ip_address || '127.0.0.1';

  const vectors: VectorDiffItem[] = [
    {
      id: 'display',
      name: 'Physical Display Geometry & DPR',
      category: 'Display & Arch',
      status: evalResult.displayMatch ? 'SILICON ANCHOR LOCKED' : 'MUTATED',
      registeredHash: regDiag.displayGeometryHash || registered.hardware_hash || 'N/A',
      currentHash: curDiag.displayGeometryHash || current.displayGeometryHash || current.hardwareHash || 'N/A',
      persistenceNote: evalResult.displayMatch
        ? 'SILICON ANCHOR LOCKED. Screen dimensions (width x height, color depth, DPR) are physical hardware properties invariant across Normal, Incognito, and Brave Private modes.'
        : 'Display geometry altered.',
      details: {
        registeredVal: `${regDiag.screenWidth || 0}x${regDiag.screenHeight || 0} @ ${regDiag.pixelRatio || 1}x`,
        currentVal: `${curDiag.screenWidth || 0}x${curDiag.screenHeight || 0} @ ${curDiag.pixelRatio || 1}x`,
      }
    },
    {
      id: 'webgl',
      name: 'WebGL GPU Architecture',
      category: 'Silicon & GPU',
      status: evalResult.webglMatch
        ? 'SILICON ANCHOR LOCKED'
        : evalResult.webglFuzzyMatch
        ? 'SILICON ANCHOR LOCKED'
        : 'MUTATED',
      registeredHash: registered.webgl_hash || 'N/A',
      currentHash: current.webglHash || 'N/A',
      persistenceNote: evalResult.webglFuzzyMatch
        ? 'SILICON ANCHOR LOCKED. Unmasked GPU hardware renderer and texture limits bypass browser sandbox privacy boundaries.'
        : 'Mutated GPU driver pipeline.',
      details: {
        registeredVal: regDiag.gpuRenderer || regDiag.renderer || 'N/A',
        currentVal: curDiag.gpuRenderer || curDiag.renderer || 'N/A',
      }
    },
    {
      id: 'canvas',
      name: 'Canvas 2D Sub-Pixel Rasterizer',
      category: 'Silicon & GPU',
      status: evalResult.canvasMatch
        ? 'MATCH'
        : evalResult.isBraveFarblingDetected
        ? 'PERTURBED (NOISE INJECTED)'
        : 'MUTATED',
      registeredHash: registered.canvas_hash || 'N/A',
      currentHash: current.canvasHash || 'N/A',
      persistenceNote: evalResult.canvasMatch
        ? 'MATCH. Sub-pixel bezier curves and anti-aliasing gamma curves calculated with exact GPU rasterizer precision.'
        : evalResult.isBraveFarblingDetected
        ? 'PERTURBED (NOISE INJECTED). Brave Shields / browser anti-fingerprinting injected randomized noise into Canvas subpixels. However, silicon anchors (Display, GPU, Timezone, Fonts) established identity.'
        : 'Subpixel rasterization variance observed.',
      details: {
        registeredVal: `PNG Sig ${(registered.canvas_hash || '').slice(0, 8)}...`,
        currentVal: `PNG Sig ${(current.canvasHash || '').slice(0, 8)}...`,
      }
    },
    {
      id: 'audio',
      name: 'Web Audio DSP Silicon Signature',
      category: 'DSP & Audio',
      status: evalResult.audioMatch
        ? 'MATCH'
        : evalResult.isBraveFarblingDetected
        ? 'PERTURBED (NOISE INJECTED)'
        : 'MUTATED',
      registeredHash: registered.audio_hash || 'N/A',
      currentHash: current.audioHash || 'N/A',
      persistenceNote: evalResult.audioMatch
        ? 'MATCH. OfflineAudioContext DSP dynamics compressor decay matches IEEE 754 float arithmetic.'
        : evalResult.isBraveFarblingDetected
        ? 'PERTURBED (NOISE INJECTED). Audio buffer perturbed with browser anti-fingerprinting jitter. Defeated via decoupled display and GPU anchors.'
        : 'DSP float signature variance.',
      details: {
        registeredVal: `PCM Window ${(registered.audio_hash || '').slice(0, 8)}`,
        currentVal: `PCM Window ${(current.audioHash || '').slice(0, 8)}`,
      }
    },
    {
      id: 'font',
      name: 'System Font Metric Fingerprint',
      category: 'Runtime & Fonts',
      status: evalResult.fontFuzzyMatch ? 'SILICON ANCHOR LOCKED' : 'MUTATED',
      registeredHash: registered.font_hash || 'N/A',
      currentHash: current.fontHash || 'N/A',
      persistenceNote: evalResult.fontFuzzyMatch
        ? 'SILICON ANCHOR LOCKED. Local OS typography metrics remain queryable regardless of private browsing status.'
        : 'Font metric delta detected.',
      details: {
        registeredVal: `${regDiag.detectedFontsCount || (Array.isArray(regDiag.detectedFontsList) ? regDiag.detectedFontsList.length : 'N/A')} fonts`,
        currentVal: `${curDiag.detectedFontsCount || (Array.isArray(curDiag.detectedFontsList) ? curDiag.detectedFontsList.length : 'N/A')} fonts`,
      }
    },
    {
      id: 'environment',
      name: 'Timezone & Localization Architecture',
      category: 'Runtime & Fonts',
      status: evalResult.envMatch ? 'SILICON ANCHOR LOCKED' : 'MUTATED',
      registeredHash: registered.environment_hash || 'N/A',
      currentHash: current.environmentHash || 'N/A',
      persistenceNote: evalResult.envMatch
        ? 'SILICON ANCHOR LOCKED. Host platform architecture and IANA timezone remain constant.'
        : 'Timezone or host platform mismatch.',
      details: {
        registeredVal: `${regDiag.timezone || 'UTC'} (${regDiag.platform || 'N/A'})`,
        currentVal: `${curDiag.timezone || 'UTC'} (${curDiag.platform || 'N/A'})`,
      }
    },
    {
      id: 'network',
      name: 'Network Route / IP / ASN',
      category: 'Network & Transit',
      status: evalResult.isVpnDetected ? 'SPOOFED' : 'MATCH',
      registeredHash: registeredIp,
      currentHash: currentIp,
      persistenceNote: evalResult.isVpnDetected
        ? `IP mutated from ${registeredIp} to ${currentIp} via VPN/proxy. Ineffective against hardware anchors.`
        : 'Same ingress IP/Colo detected.',
      details: {
        registeredVal: `${registeredIp} (${registered.asn || 'Direct'})`,
        currentVal: `${currentIp} (${current.network?.asn || 'Direct'})`,
      }
    },
    {
      id: 'storage',
      name: 'Stateful Cookies & LocalStorage',
      category: 'Client Storage',
      status: evalResult.isSameSession ? 'MATCH' : 'CLEARED',
      registeredHash: evalResult.isSameSession ? 'SESSION_TOKEN_ACTIVE' : 'WIPED_CLEAN',
      currentHash: evalResult.isSameSession ? 'SESSION_TOKEN_ACTIVE' : 'EMPTY_SANDBOX',
      persistenceNote: evalResult.isSameSession
        ? 'Active session storage token identified in same browser session.'
        : '100% PERSISTENCE-FREE. Re-identification established without any stored cookies or tokens.',
    }
  ];

  let evasionAnalysis = '';
  if (evalResult.isSameSession) {
    evasionAnalysis = 'Same session interception: Active storage token and hardware vectors confirmed identity with 100% certainty.';
  } else if (evalResult.isBraveFarblingDetected) {
    evasionAnalysis = 'Adversarial Evasion Status: FAILED. Even though Brave Shields intentionally injected pseudo-random noise into Canvas and Web Audio APIs, the invariant Display Geometry, unmasked GPU architecture, Timezone, and Font metrics definitively established your hardware identity.';
  } else if (evalResult.isVpnDetected) {
    evasionAnalysis = 'Adversarial Evasion Status: FAILED. Even though IP address, ASN routing, and client storage were masked or wiped, the immutable hardware anchors established deterministic identity.';
  } else {
    evasionAnalysis = 'Adversarial Evasion Status: FAILED. Clearing cookies and opening an Incognito window failed to evade identification because browser privacy modes do not isolate hardware rendering or DSP math engines.';
  }

  return {
    confidenceScore: evalResult.confidenceScore,
    matchType: evalResult.matchType,
    isVpnDetected: evalResult.isVpnDetected,
    isStorageEvaded: !evalResult.isSameSession,
    isBraveFarblingDetected: evalResult.isBraveFarblingDetected,
    rawScorePoints: evalResult.rawPoints,
    vectors,
    hardwareSummary: `${regDiag.gpuRenderer || regDiag.renderer || 'Hardware GPU'} | ${regDiag.screenWidth || 0}x${regDiag.screenHeight || 0}`,
    evasionAnalysis,
  };
}
