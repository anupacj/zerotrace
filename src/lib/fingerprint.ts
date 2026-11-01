/**
 * TRACE // ZERO — High-Precision Browser Hardware & Telemetry Probe Engine
 * Pure zero-dependency TypeScript implementation utilizing Web Cryptography API (SHA-256).
 * 
 * Rules:
 * - NO brittle attributes (No window.innerWidth/innerHeight, No navigator.storage.estimate)
 * - Deterministic across Normal vs Incognito/Private Browsing sessions on the same physical hardware
 * - Collects 6 discrete vectors with execution timing (ms) and entropy estimates (bits)
 */

export interface VectorResult {
  id: 'canvas' | 'webgl' | 'audio' | 'hardware' | 'environment' | 'font';
  name: string;
  category: 'Silicon & GPU' | 'DSP & Audio' | 'Display & Arch' | 'Runtime & Fonts';
  hash: string;
  executionTimeMs: number;
  entropyBits: number;
  stability: 'IMMUTABLE_HARDWARE' | 'STABLE_SYSTEM' | 'MUTABLE_NETWORK';
  diagnostics: Record<string, any>;
  summary: string;
}

export interface FingerprintReport {
  timestamp: number;
  primaryHardwareHash: string; // Silicon anchor (canvas + webgl + audio + hardware)
  compositeHash: string;       // All 6 vectors
  totalExecutionTimeMs: number;
  totalEntropyBits: number;
  vectors: {
    canvas: VectorResult;
    webgl: VectorResult;
    audio: VectorResult;
    hardware: VectorResult;
    environment: VectorResult;
    font: VectorResult;
  };
}

/**
 * Compute SHA-256 hex digest using native crypto.subtle
 */
export async function sha256(input: string | Uint8Array): Promise<string> {
  const data = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const hashBuffer = await crypto.subtle.digest('SHA-256', data as unknown as BufferSource);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Vector 1: Canvas 2D Sub-Pixel Rendering Probe
 * Sub-pixel rasterization depends on GPU anti-aliasing, font rasterizer, blend modes, and driver gamma curves.
 */
export async function probeCanvas(): Promise<VectorResult> {
  const start = performance.now();
  let hash = 'unsupported';
  let diagnostics: Record<string, any> = {};

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 280;
    canvas.height = 60;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (ctx) {
      // 1. Structural backdrop with gradient
      const grad = ctx.createLinearGradient(0, 0, 280, 60);
      grad.addColorStop(0, '#09090B');
      grad.addColorStop(0.5, '#27272A');
      grad.addColorStop(1, '#18181B');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 280, 60);

      // 2. Overlapping bezier curves with distinct alpha and blending
      ctx.globalCompositeOperation = 'multiply';
      ctx.beginPath();
      ctx.moveTo(10, 50);
      ctx.bezierCurveTo(50, 10, 180, 70, 270, 15);
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#10B981';
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(15, 15);
      ctx.bezierCurveTo(90, 65, 170, -10, 265, 45);
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = '#F59E0B';
      ctx.stroke();

      // 3. Complex typography: Unicode glyphs, CJK, Arabic ligature, Latin diacritics
      ctx.globalCompositeOperation = 'source-over';
      ctx.font = '14px "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
      ctx.fillStyle = '#FAFAFA';
      ctx.fillText('TRACE//ZERO ⚡ 𝛀-µ [漢字/العربية]', 12, 28);

      ctx.font = '11px "Courier New", monospace';
      ctx.fillStyle = '#A1A1AA';
      ctx.fillText('0x7F-SUBPIXEL-GAMMA-PROBE', 12, 48);

      const dataUrl = canvas.toDataURL('image/png');
      hash = await sha256(dataUrl);

      // Sample a few pixels for forensic validation
      const pixelSample = ctx.getImageData(50, 25, 4, 1).data;
      diagnostics = {
        canvasWidth: 280,
        canvasHeight: 60,
        dataUrlPrefix: dataUrl.slice(0, 48),
        dataLengthBytes: dataUrl.length,
        pixelChecksumSample: Array.from(pixelSample).join(','),
        alphaBlendingSupported: true,
      };
    }
  } catch (err: any) {
    hash = await sha256('canvas_probe_error_' + (err?.message || 'unknown'));
    diagnostics = { error: err?.message || 'Canvas probe failed' };
  }

  const executionTimeMs = Number((performance.now() - start).toFixed(2));
  return {
    id: 'canvas',
    name: 'Canvas 2D Sub-Pixel Rasterizer',
    category: 'Silicon & GPU',
    hash,
    executionTimeMs,
    entropyBits: 14.8,
    stability: 'IMMUTABLE_HARDWARE',
    diagnostics,
    summary: `280x60 multi-layer rasterization (${diagnostics.dataLengthBytes || 0} bytes PNG signature)`
  };
}

/**
 * Vector 2: WebGL Graphics Architecture Probe
 * Deep GPU pipeline inspection: unmasked driver strings, precision tables, and hardware limits.
 */
export async function probeWebGL(): Promise<VectorResult> {
  const start = performance.now();
  let hash = 'unsupported';
  let diagnostics: Record<string, any> = {};

  try {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;

    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'masked';
      const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'masked';

      const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      const maxViewportDims = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
      const maxRenderBufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
      const aliasedLineWidth = gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE);
      const aliasedPointSize = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE);
      const maxVertexAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
      const maxVaryingVectors = gl.getParameter(gl.MAX_VARYING_VECTORS);

      // Supported extensions array sorted deterministically
      const supportedExtensions = (gl.getSupportedExtensions() || []).sort();

      // Shader precision profiling (Vertex & Fragment)
      const vertHigh = gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.HIGH_FLOAT);
      const fragHigh = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);

      const payload = {
        vendor,
        renderer,
        maxTextureSize,
        maxViewportDims: maxViewportDims ? Array.from(maxViewportDims) : null,
        maxRenderBufferSize,
        aliasedLineWidth: aliasedLineWidth ? Array.from(aliasedLineWidth) : null,
        aliasedPointSize: aliasedPointSize ? Array.from(aliasedPointSize) : null,
        maxVertexAttribs,
        maxVaryingVectors,
        vertHighPrecision: vertHigh ? { rangeMin: vertHigh.rangeMin, rangeMax: vertHigh.rangeMax, precision: vertHigh.precision } : null,
        fragHighPrecision: fragHigh ? { rangeMin: fragHigh.rangeMin, rangeMax: fragHigh.rangeMax, precision: fragHigh.precision } : null,
        extensionCount: supportedExtensions.length,
        extensionsSample: supportedExtensions.slice(0, 12),
      };

      const normalizedJson = JSON.stringify(payload);
      hash = await sha256(normalizedJson);
      diagnostics = {
        ...payload,
        fullExtensionsList: supportedExtensions,
      };
    }
  } catch (err: any) {
    hash = await sha256('webgl_probe_error_' + (err?.message || 'unknown'));
    diagnostics = { error: err?.message || 'WebGL probe failed' };
  }

  const executionTimeMs = Number((performance.now() - start).toFixed(2));
  return {
    id: 'webgl',
    name: 'WebGL Architecture & Shader Precision',
    category: 'Silicon & GPU',
    hash,
    executionTimeMs,
    entropyBits: 17.2,
    stability: 'IMMUTABLE_HARDWARE',
    diagnostics,
    summary: `${diagnostics.renderer || 'GPU'} (${diagnostics.extensionCount || 0} GL extensions)`
  };
}

/**
 * Vector 3: Web Audio Silicon Probe
 * Floating-point arithmetic discrepancies in DSP chips, audio engines, and OS audio stacks.
 * Uses OfflineAudioContext with a triangle wave fed through a DynamicsCompressorNode.
 */
export async function probeAudio(): Promise<VectorResult> {
  const start = performance.now();
  let hash = 'unsupported';
  let diagnostics: Record<string, any> = {};

  try {
    const AudioContextClass = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;

    if (AudioContextClass) {
      // 1 channel, 44100 frames, 44100 Hz sample rate
      const context = new AudioContextClass(1, 5000, 44100);

      const oscillator = context.createOscillator();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(10000, context.currentTime);

      const compressor = context.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-50, context.currentTime);
      compressor.knee.setValueAtTime(40, context.currentTime);
      compressor.ratio.setValueAtTime(12, context.currentTime);
      compressor.attack.setValueAtTime(0, context.currentTime);
      compressor.release.setValueAtTime(0.25, context.currentTime);

      oscillator.connect(compressor);
      compressor.connect(context.destination);
      oscillator.start(0);

      const renderedBuffer = await context.startRendering();
      const channelData = renderedBuffer.getChannelData(0);

      // Sum absolute float values between sample index 4500 and 5000
      let pcmSum = 0;
      let minVal = 0;
      let maxVal = 0;
      for (let i = 4500; i < 5000; i++) {
        const val = channelData[i] || 0;
        pcmSum += Math.abs(val);
        if (val < minVal) minVal = val;
        if (val > maxVal) maxVal = val;
      }

      // Convert deterministic float representation
      const floatSignature = `pcmSum:${pcmSum.toFixed(14)}|min:${minVal.toFixed(10)}|max:${maxVal.toFixed(10)}`;
      hash = await sha256(floatSignature);

      diagnostics = {
        sampleRate: context.sampleRate,
        bufferLength: renderedBuffer.length,
        pcmSumFloat: pcmSum,
        pcmSignature: floatSignature,
        minPcmWindow: minVal,
        maxPcmWindow: maxVal,
      };
    } else {
      hash = await sha256('audio_context_unavailable');
      diagnostics = { note: 'OfflineAudioContext not supported on client' };
    }
  } catch (err: any) {
    hash = await sha256('audio_probe_fallback_' + (err?.message || 'unknown'));
    diagnostics = { error: err?.message || 'Audio probe fallback' };
  }

  const executionTimeMs = Number((performance.now() - start).toFixed(2));
  return {
    id: 'audio',
    name: 'Web Audio DSP Silicon Signature',
    category: 'DSP & Audio',
    hash,
    executionTimeMs,
    entropyBits: 11.4,
    stability: 'IMMUTABLE_HARDWARE',
    diagnostics,
    summary: `DSP PCM Sum: ${typeof diagnostics.pcmSumFloat === 'number' ? diagnostics.pcmSumFloat.toFixed(6) : 'N/A'}`
  };
}

/**
 * Vector 4: Display & Silicon Architecture Metrics
 * Non-brittle hardware properties: Screen dimensions, DPR, color depth, CPU cores, memory.
 * Excludes innerWidth/innerHeight to prevent window resize instability.
 */
export async function probeHardware(): Promise<VectorResult> {
  const start = performance.now();

  const screenWidth = window.screen?.width || 0;
  const screenHeight = window.screen?.height || 0;
  const screenAvailWidth = window.screen?.availWidth || 0;
  const screenAvailHeight = window.screen?.availHeight || 0;
  const colorDepth = window.screen?.colorDepth || 24;
  const pixelDepth = window.screen?.pixelDepth || 24;
  const devicePixelRatio = window.devicePixelRatio || 1;
  const hardwareConcurrency = navigator.hardwareConcurrency || 4;
  const deviceMemory = (navigator as any).deviceMemory || 'unsupported';
  const maxTouchPoints = navigator.maxTouchPoints || 0;

  const payload = {
    resolution: `${screenWidth}x${screenHeight}`,
    availResolution: `${screenAvailWidth}x${screenAvailHeight}`,
    colorDepth,
    pixelDepth,
    devicePixelRatio,
    hardwareConcurrency,
    deviceMemory,
    maxTouchPoints,
  };

  const hash = await sha256(JSON.stringify(payload));
  const executionTimeMs = Number((performance.now() - start).toFixed(2));

  return {
    id: 'hardware',
    name: 'Display & Silicon Metrics',
    category: 'Display & Arch',
    hash,
    executionTimeMs,
    entropyBits: 12.1,
    stability: 'IMMUTABLE_HARDWARE',
    diagnostics: payload,
    summary: `${payload.resolution} @ ${devicePixelRatio}x | ${hardwareConcurrency} Cores | ${deviceMemory}GB RAM`
  };
}

/**
 * Vector 5: Platform & Localization Architecture Probe
 * Platform headers, client hints platform, timezone string, calendar type, and time offsets.
 */
export async function probeEnvironment(): Promise<VectorResult> {
  const start = performance.now();

  const platform = navigator.platform || 'unknown';
  const userAgentData = (navigator as any).userAgentData;
  const clientHintsPlatform = userAgentData?.platform || 'unknown';
  const languages = Array.isArray(navigator.languages) ? navigator.languages.join(',') : (navigator.language || '');
  
  let timeZone = 'UTC';
  let calendar = 'gregory';
  try {
    const opts = Intl.DateTimeFormat().resolvedOptions();
    timeZone = opts.timeZone || 'UTC';
    calendar = opts.calendar || 'gregory';
  } catch {
    // fallback
  }

  const timezoneOffset = new Date().getTimezoneOffset();

  const payload = {
    platform,
    clientHintsPlatform,
    languages,
    timeZone,
    calendar,
    timezoneOffset,
    doNotTrack: navigator.doNotTrack || 'unspecified',
  };

  const hash = await sha256(JSON.stringify(payload));
  const executionTimeMs = Number((performance.now() - start).toFixed(2));

  return {
    id: 'environment',
    name: 'Platform & Localization Architecture',
    category: 'Runtime & Fonts',
    hash,
    executionTimeMs,
    entropyBits: 8.9,
    stability: 'STABLE_SYSTEM',
    diagnostics: payload,
    summary: `${timeZone} (${languages}) on ${platform}`
  };
}

/**
 * Vector 6: System Font Metric & Typography Probe
 * Detects presence of 30+ distinctive system fonts via canvas text metric differential measurement.
 * Zero DOM popup, 100% deterministic offscreen calculation against baseline serif/sans/monospace.
 */
export async function probeFonts(): Promise<VectorResult> {
  const start = performance.now();

  const TARGET_FONTS = [
    'Arial', 'Helvetica', 'Segoe UI', 'SF Pro Display', 'Roboto', 'Ubuntu',
    'Consolas', 'Courier New', 'Menlo', 'Monaco', 'Cascadia Code', 'Fira Code',
    'Calibri', 'Cambria', 'Georgia', 'Times New Roman', 'Trebuchet MS', 'Verdana',
    'Comic Sans MS', 'Impact', 'Lucida Console', 'Lucida Sans Unicode', 'Palatino',
    'Tahoma', 'Geneva', 'Gill Sans', 'Optima', 'Baskerville', 'Futura', 'Didot'
  ];

  const TEST_STRING = 'mmmmmmmmmmlliWWWWWW@@@@99998888!??###$$';
  const BASELINE_FONTS = ['monospace', 'sans-serif', 'serif'] as const;

  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');

  const detectedFonts: string[] = [];
  const metricsMap: Record<string, number> = {};

  if (ctx) {
    // Calculate baseline widths
    const baselineWidths: Record<string, number> = {};
    for (const base of BASELINE_FONTS) {
      ctx.font = `72px ${base}`;
      baselineWidths[base] = ctx.measureText(TEST_STRING).width;
    }

    // Check each target font
    for (const fontName of TARGET_FONTS) {
      let matchedAnyDifferent = false;
      for (const base of BASELINE_FONTS) {
        ctx.font = `72px "${fontName}", ${base}`;
        const measured = ctx.measureText(TEST_STRING).width;
        if (Math.abs(measured - baselineWidths[base]) > 0.05) {
          matchedAnyDifferent = true;
          metricsMap[fontName] = Number(measured.toFixed(3));
          break;
        }
      }
      if (matchedAnyDifferent) {
        detectedFonts.push(fontName);
      }
    }
  }

  const payload = {
    detectedFontsCount: detectedFonts.length,
    detectedFontsList: detectedFonts.sort(),
    metricsSample: metricsMap,
  };

  const hash = await sha256(JSON.stringify(payload));
  const executionTimeMs = Number((performance.now() - start).toFixed(2));

  return {
    id: 'font',
    name: 'System Font Metric Fingerprint',
    category: 'Runtime & Fonts',
    hash,
    executionTimeMs,
    entropyBits: 13.5,
    stability: 'STABLE_SYSTEM',
    diagnostics: payload,
    summary: `${detectedFonts.length} of ${TARGET_FONTS.length} system fonts identified`
  };
}

/**
 * Execute all 6 probes concurrently with benchmarking and composite generation
 */
export async function executeTelemetryProbes(): Promise<FingerprintReport> {
  const t0 = performance.now();

  const [canvas, webgl, audio, hardware, environment, font] = await Promise.all([
    probeCanvas(),
    probeWebGL(),
    probeAudio(),
    probeHardware(),
    probeEnvironment(),
    probeFonts()
  ]);

  // Primary Hardware Silicon Hash: canvas + webgl + audio + hardware
  // This immutable quadruple anchor ignores transient VPNs, incognito mode, and cookie wipes!
  const primaryHardwareHash = await sha256(
    `${canvas.hash}:${webgl.hash}:${audio.hash}:${hardware.hash}`
  );

  // Composite Hash: all 6 discrete vectors
  const compositeHash = await sha256(
    `${canvas.hash}:${webgl.hash}:${audio.hash}:${hardware.hash}:${environment.hash}:${font.hash}`
  );

  const totalExecutionTimeMs = Number((performance.now() - t0).toFixed(2));
  const totalEntropyBits = Number(
    (canvas.entropyBits + webgl.entropyBits + audio.entropyBits + hardware.entropyBits + environment.entropyBits + font.entropyBits).toFixed(1)
  );

  return {
    timestamp: Date.now(),
    primaryHardwareHash,
    compositeHash,
    totalExecutionTimeMs,
    totalEntropyBits,
    vectors: {
      canvas,
      webgl,
      audio,
      hardware,
      environment,
      font,
    }
  };
}
