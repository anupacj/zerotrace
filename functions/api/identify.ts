import { computeForensicDiff, evaluateCandidateSimilarity } from '../../src/lib/forensics';

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

    // Fetch candidate registrations (up to 100 most recent rows)
    let candidates: any[] = [];

    if (db && typeof db.prepare === 'function') {
      try {
        const queryRes = await db.prepare(
          'SELECT * FROM registrations ORDER BY created_at DESC LIMIT 100'
        ).all();
        if (queryRes && queryRes.results && queryRes.results.length > 0) {
          candidates = queryRes.results;
        }
      } catch (e) {
        console.error('D1 candidate query error:', e);
      }
    }

    // Merge memory fallback registrations
    if (memoryRegistrations.size > 0) {
      const memList = Array.from(memoryRegistrations.values()).reverse().slice(0, 100);
      for (const m of memList) {
        if (!candidates.some(c => c.id === (m as any).id)) {
          candidates.push(m);
        }
      }
    }

    if (candidates.length === 0) {
      return new Response(JSON.stringify({
        identified: false,
        message: 'No registered hardware profiles exist in the database.',
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Evaluate candidate similarity across all 100 records using multi-tier fuzzy scoring
    let bestMatch: any = null;
    let bestEvalResult: any = null;
    let highestPoints = -1;

    for (const candidate of candidates) {
      const evalRes = evaluateCandidateSimilarity(candidate, body);

      // Instant win on same-session storage token match
      if (evalRes.isSameSession) {
        bestMatch = candidate;
        bestEvalResult = evalRes;
        break;
      }

      if (evalRes.matched && evalRes.rawPoints > highestPoints) {
        highestPoints = evalRes.rawPoints;
        bestMatch = candidate;
        bestEvalResult = evalRes;
      }
    }

    if (!bestMatch || !bestEvalResult || !bestEvalResult.matched) {
      return new Response(JSON.stringify({
        identified: false,
        message: 'No previous device fingerprint matched this hardware profile.',
        probedHashes: {
          primaryHardwareHash: body.primaryHardwareHash,
          compositeHash: body.compositeHash,
          displayGeometryHash: body.displayGeometryHash || body.diagnostics?.displayGeometryHash,
        }
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Generate comprehensive forensic diff
    const diffReport = computeForensicDiff(bestMatch, body);

    const evasionId = 'eva_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const currentIp = body.network?.ip || '127.0.0.1';

    const evasionRecord = {
      id: evasionId,
      registration_id: bestMatch.id,
      match_type: diffReport.matchType,
      confidence_score: diffReport.confidenceScore,
      secret_phrase_revealed: bestMatch.secret_phrase,
      composite_hash: body.compositeHash || '',
      primary_hardware_hash: body.primaryHardwareHash || '',
      canvas_hash: body.canvasHash || '',
      webgl_hash: body.webglHash || '',
      audio_hash: body.audioHash || '',
      hardware_hash: body.hardwareHash || '',
      environment_hash: body.environmentHash || '',
      font_hash: body.fontHash || '',
      ip_address: currentIp,
      asn: body.network?.asn || '',
      country: body.network?.country || '',
      city: body.network?.city || '',
      colo: body.network?.colo || '',
      is_vpn_detected: diffReport.isVpnDetected ? 1 : 0,
      diagnostics_json: JSON.stringify(body.diagnostics || {}),
      diff_json: JSON.stringify(diffReport.vectors),
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
      secretPhrase: bestMatch.secret_phrase,
      alias: bestMatch.alias,
      registeredAt: bestMatch.created_at,
      matchType: diffReport.matchType,
      confidenceScore: diffReport.confidenceScore,
      rawPoints: diffReport.rawScorePoints,
      isVpnDetected: diffReport.isVpnDetected,
      isBraveFarblingDetected: diffReport.isBraveFarblingDetected,
      diffVectors: diffReport.vectors,
      evasionAnalysis: diffReport.evasionAnalysis,
      forensicSummary: {
        registeredIp: bestMatch.ip_address || '127.0.0.1',
        currentIp,
        registeredColo: bestMatch.colo || 'N/A',
        currentColo: body.network?.colo || 'N/A',
        hardwareSiliconMatch: diffReport.matchType === 'HARDWARE_SILICON_MATCH' || diffReport.matchType === 'FARBLING_RESISTANT_HARDWARE_MATCH',
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
