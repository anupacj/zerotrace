const memoryRegistrations = (globalThis as any).__TRACE_ZERO_REGISTRATIONS__ || new Map<string, any>();
(globalThis as any).__TRACE_ZERO_REGISTRATIONS__ = memoryRegistrations;
const memoryEvasionAttempts = (globalThis as any).__TRACE_ZERO_EVASIONS__ || [];
(globalThis as any).__TRACE_ZERO_EVASIONS__ = memoryEvasionAttempts;

interface PagesContext {
  request: Request;
  env: {
    DB?: any;
  };
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  try {
    const body = await context.request.json() as any;
    const db = context.env.DB;

    const primaryHardwareHash = body.primaryHardwareHash || '';
    const compositeHash = body.compositeHash || '';
    const canvasHash = body.canvasHash || '';
    const webglHash = body.webglHash || '';
    const audioHash = body.audioHash || '';
    const hardwareHash = body.hardwareHash || '';
    const fontHash = body.fontHash || '';
    const envHash = body.environmentHash || '';

    let matchedRecord: any = null;
    let matchType = 'NO_MATCH';
    let confidenceScore = 0;

    // 1. Check exact composite match in D1
    if (db && typeof db.prepare === 'function') {
      try {
        const exact = await db.prepare('SELECT * FROM registrations WHERE composite_hash = ? LIMIT 1')
          .bind(compositeHash)
          .first();
        if (exact) {
          matchedRecord = exact;
          matchType = 'EXACT_COMPOSITE';
          confidenceScore = 1.0;
        }
      } catch (e) {
        console.error('D1 composite query error:', e);
      }

      // 2. Check primary hardware silicon anchor in D1
      if (!matchedRecord && primaryHardwareHash) {
        try {
          const hw = await db.prepare('SELECT * FROM registrations WHERE primary_hardware_hash = ? LIMIT 1')
            .bind(primaryHardwareHash)
            .first();
          if (hw) {
            matchedRecord = hw;
            matchType = 'HARDWARE_SILICON_MATCH';
            confidenceScore = 0.985;
          }
        } catch (e) {
          console.error('D1 hardware query error:', e);
        }
      }

      // 3. Check high-confidence individual vector match in D1
      if (!matchedRecord) {
        try {
          const candidates = await db.prepare('SELECT * FROM registrations ORDER BY created_at DESC LIMIT 50').all();
          if (candidates && candidates.results) {
            for (const c of candidates.results) {
              let score = 0;
              if (c.canvas_hash === canvasHash) score += 0.25;
              if (c.webgl_hash === webglHash) score += 0.30;
              if (c.audio_hash === audioHash) score += 0.20;
              if (c.hardware_hash === hardwareHash) score += 0.15;
              if (c.font_hash === fontHash) score += 0.07;
              if (c.environment_hash === envHash) score += 0.03;

              if (score >= 0.70 && score > confidenceScore) {
                matchedRecord = c;
                confidenceScore = Number(score.toFixed(3));
                matchType = 'HIGH_CONFIDENCE_HEURISTIC';
              }
            }
          }
        } catch (e) {
          console.error('D1 heuristic query error:', e);
        }
      }
    }

    // Fallback to memory map if D1 had no match or wasn't bound
    if (!matchedRecord && memoryRegistrations.size > 0) {
      for (const reg of memoryRegistrations.values()) {
        if (reg.composite_hash === compositeHash) {
          matchedRecord = reg;
          matchType = 'EXACT_COMPOSITE';
          confidenceScore = 1.0;
          break;
        }
        if (reg.primary_hardware_hash === primaryHardwareHash) {
          matchedRecord = reg;
          matchType = 'HARDWARE_SILICON_MATCH';
          confidenceScore = 0.985;
          break;
        }

        let score = 0;
        if (reg.canvas_hash === canvasHash) score += 0.25;
        if (reg.webgl_hash === webglHash) score += 0.30;
        if (reg.audio_hash === audioHash) score += 0.20;
        if (reg.hardware_hash === hardwareHash) score += 0.15;
        if (reg.font_hash === fontHash) score += 0.07;
        if (reg.environment_hash === envHash) score += 0.03;

        if (score >= 0.70 && score > confidenceScore) {
          matchedRecord = reg;
          confidenceScore = Number(score.toFixed(3));
          matchType = 'HIGH_CONFIDENCE_HEURISTIC';
        }
      }
    }

    if (!matchedRecord) {
      return new Response(JSON.stringify({
        identified: false,
        message: 'No previous device fingerprint matched this hardware profile.',
        probedHashes: {
          primaryHardwareHash,
          compositeHash,
        }
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Compile Forensic Diff
    const regDiag = typeof matchedRecord.diagnostics_json === 'string'
      ? JSON.parse(matchedRecord.diagnostics_json || '{}')
      : (matchedRecord.diagnostics || {});

    const curDiag = body.diagnostics || {};

    const canvasMatch = matchedRecord.canvas_hash === canvasHash;
    const webglMatch = matchedRecord.webgl_hash === webglHash;
    const audioMatch = matchedRecord.audio_hash === audioHash;
    const hardwareMatch = matchedRecord.hardware_hash === hardwareHash;
    const fontMatch = matchedRecord.font_hash === fontHash;

    const currentIp = body.network?.ip || '127.0.0.1';
    const regIp = matchedRecord.ip_address || '127.0.0.1';
    const isVpnDetected = (currentIp !== regIp && regIp !== '127.0.0.1' && currentIp !== '127.0.0.1') ||
      (body.network?.asn && matchedRecord.asn && body.network?.asn !== matchedRecord.asn);

    const diffVectors = [
      {
        id: 'webgl',
        name: 'WebGL GPU Architecture',
        category: 'Silicon & GPU',
        status: webglMatch ? 'MATCH' : 'MUTATED',
        registeredHash: matchedRecord.webgl_hash,
        currentHash: webglHash,
        persistenceNote: 'Low-level GPU silicon, shader precision, and driver capabilities bypass browser incognito isolation.',
        registeredValue: regDiag.renderer || regDiag.webgl?.renderer || 'Hardware GPU',
        currentValue: curDiag.renderer || curDiag.webgl?.renderer || 'Hardware GPU',
      },
      {
        id: 'canvas',
        name: 'Canvas 2D Sub-Pixel Rasterizer',
        category: 'Silicon & GPU',
        status: canvasMatch ? 'MATCH' : 'MUTATED',
        registeredHash: matchedRecord.canvas_hash,
        currentHash: canvasHash,
        persistenceNote: 'Anti-aliased subpixel curve math is governed by host OS rendering stack and display controller.',
        registeredValue: `PNG Sig ${matchedRecord.canvas_hash.slice(0, 8)}...`,
        currentValue: `PNG Sig ${canvasHash.slice(0, 8)}...`,
      },
      {
        id: 'audio',
        name: 'Web Audio DSP Silicon Signature',
        category: 'DSP & Audio',
        status: audioMatch ? 'MATCH' : 'MUTATED',
        registeredHash: matchedRecord.audio_hash,
        currentHash: audioHash,
        persistenceNote: 'OfflineAudioContext DSP dynamic compressor decay curve matches IEEE 754 floating-point hardware.',
        registeredValue: `PCM Window ${matchedRecord.audio_hash.slice(0, 8)}`,
        currentValue: `PCM Window ${audioHash.slice(0, 8)}`,
      },
      {
        id: 'hardware',
        name: 'Display & Concurrency Metrics',
        category: 'Display & Arch',
        status: hardwareMatch ? 'MATCH' : 'MUTATED',
        registeredHash: matchedRecord.hardware_hash,
        currentHash: hardwareHash,
        persistenceNote: 'Physical screen resolution, device pixel ratio, and CPU logical threads remain persistent.',
        registeredValue: `${regDiag.resolution || 'Native Screen'} (${regDiag.hardwareConcurrency || 4} cores)`,
        currentValue: `${curDiag.resolution || 'Native Screen'} (${curDiag.hardwareConcurrency || 4} cores)`,
      },
      {
        id: 'font',
        name: 'System Font Metric Fingerprint',
        category: 'Runtime & Fonts',
        status: fontMatch ? 'MATCH' : 'MUTATED',
        registeredHash: matchedRecord.font_hash,
        currentHash: fontHash,
        persistenceNote: 'Installed OS typography metrics measured via offscreen canvas font boundary differentials.',
        registeredValue: `${regDiag.detectedFontsCount || 'N/A'} fonts`,
        currentValue: `${curDiag.detectedFontsCount || 'N/A'} fonts`,
      },
      {
        id: 'network',
        name: 'Network Route / IP / ASN',
        category: 'Network & Transit',
        status: isVpnDetected ? 'SPOOFED' : 'MATCH',
        registeredHash: regIp,
        currentHash: currentIp,
        persistenceNote: isVpnDetected
          ? `IP mutated from ${regIp} to ${currentIp} via VPN/proxy. Ineffective against hardware anchors.`
          : 'Ingress IP unchanged.',
        registeredValue: `${regIp} (${matchedRecord.asn || 'Direct'})`,
        currentValue: `${currentIp} (${body.network?.asn || 'Direct'})`,
      },
      {
        id: 'storage',
        name: 'Stateful Cookies & LocalStorage',
        category: 'Client Storage',
        status: 'CLEARED',
        registeredHash: 'WIPED_CLEAN',
        currentHash: 'EMPTY_SANDBOX',
        persistenceNote: 'Identification succeeded completely without cookies, tokens, or local storage.',
        registeredValue: 'Wiped',
        currentValue: 'Wiped',
      }
    ];

    const evasionId = 'eva_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const evasionRecord = {
      id: evasionId,
      registration_id: matchedRecord.id,
      match_type: matchType,
      confidence_score: confidenceScore,
      secret_phrase_revealed: matchedRecord.secret_phrase,
      composite_hash: compositeHash,
      primary_hardware_hash: primaryHardwareHash,
      canvas_hash: canvasHash,
      webgl_hash: webglHash,
      audio_hash: audioHash,
      hardware_hash: hardwareHash,
      environment_hash: envHash,
      font_hash: fontHash,
      ip_address: currentIp,
      asn: body.network?.asn || '',
      country: body.network?.country || '',
      city: body.network?.city || '',
      colo: body.network?.colo || '',
      is_vpn_detected: isVpnDetected ? 1 : 0,
      diagnostics_json: JSON.stringify(curDiag),
      diff_json: JSON.stringify(diffVectors),
      created_at: Date.now()
    };

    if (db && typeof db.prepare === 'function') {
      try {
        await db.prepare(`
          INSERT INTO evasion_attempts (
            id, registration_id, match_type, confidence_score, secret_phrase_revealed,
            composite_hash, primary_hardware_hash, canvas_hash, webgl_hash, audio_hash,
            hardware_hash, environment_hash, font_hash, ip_address, asn, country, city,
            colo, is_vpn_detected, diagnostics_json, diff_json, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          evasionRecord.id, evasionRecord.registration_id, evasionRecord.match_type,
          evasionRecord.confidence_score, evasionRecord.secret_phrase_revealed,
          evasionRecord.composite_hash, evasionRecord.primary_hardware_hash,
          evasionRecord.canvas_hash, evasionRecord.webgl_hash, evasionRecord.audio_hash,
          evasionRecord.hardware_hash, evasionRecord.environment_hash, evasionRecord.font_hash,
          evasionRecord.ip_address, evasionRecord.asn, evasionRecord.country, evasionRecord.city,
          evasionRecord.colo, evasionRecord.is_vpn_detected, evasionRecord.diagnostics_json,
          evasionRecord.diff_json, evasionRecord.created_at
        ).run();
      } catch (err) {
        console.error('Failed to log evasion attempt in D1:', err);
      }
    }

    memoryEvasionAttempts.unshift(evasionRecord);

    return new Response(JSON.stringify({
      identified: true,
      secretPhrase: matchedRecord.secret_phrase,
      alias: matchedRecord.alias,
      registeredAt: matchedRecord.created_at,
      matchType,
      confidenceScore,
      isVpnDetected,
      diffVectors,
      forensicSummary: {
        registeredIp: regIp,
        currentIp,
        registeredColo: matchedRecord.colo || 'N/A',
        currentColo: body.network?.colo || 'N/A',
        hardwareSiliconMatch: (canvasMatch && webglMatch && audioMatch) || matchType === 'HARDWARE_SILICON_MATCH',
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Identification failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
