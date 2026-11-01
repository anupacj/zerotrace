// Global fallback memory store if D1 is unattached
const memoryRegistrations = (globalThis as any).__TRACE_ZERO_REGISTRATIONS__ || new Map<string, any>();
(globalThis as any).__TRACE_ZERO_REGISTRATIONS__ = memoryRegistrations;

interface PagesContext {
  request: Request;
  env: {
    DB?: any;
  };
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  try {
    const body = await context.request.json() as any;

    const secretPhrase = (body.secretPhrase || '').trim();
    if (!secretPhrase) {
      return new Response(JSON.stringify({ error: 'Secret phrase is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const id = 'dev_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const createdAt = Date.now();
    const alias = body.alias || `Target Host #${Math.floor(Math.random() * 8999 + 1000)}`;

    const record = {
      id,
      secret_phrase: secretPhrase,
      alias,
      composite_hash: body.compositeHash || '',
      primary_hardware_hash: body.primaryHardwareHash || '',
      canvas_hash: body.canvasHash || '',
      webgl_hash: body.webglHash || '',
      audio_hash: body.audioHash || '',
      hardware_hash: body.hardwareHash || '',
      environment_hash: body.environmentHash || '',
      font_hash: body.fontHash || '',
      entropy_total_bits: Number(body.entropyTotalBits || 0),
      execution_time_ms: Number(body.executionTimeMs || 0),
      ip_address: body.network?.ip || '127.0.0.1',
      asn: body.network?.asn || '',
      as_organization: body.network?.asOrganization || '',
      country: body.network?.country || '',
      city: body.network?.city || '',
      colo: body.network?.colo || '',
      user_agent: body.network?.userAgent || '',
      diagnostics_json: JSON.stringify(body.diagnostics || {}),
      created_at: createdAt
    };

    // Attempt D1 insertion if available
    const db = context.env.DB;
    if (db && typeof db.prepare === 'function') {
      await db.prepare(`
        INSERT INTO registrations (
          id, secret_phrase, alias, composite_hash, primary_hardware_hash,
          canvas_hash, webgl_hash, audio_hash, hardware_hash, environment_hash,
          font_hash, entropy_total_bits, execution_time_ms, ip_address, asn,
          as_organization, country, city, colo, user_agent, diagnostics_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        record.id, record.secret_phrase, record.alias, record.composite_hash, record.primary_hardware_hash,
        record.canvas_hash, record.webgl_hash, record.audio_hash, record.hardware_hash, record.environment_hash,
        record.font_hash, record.entropy_total_bits, record.execution_time_ms, record.ip_address, record.asn,
        record.as_organization, record.country, record.city, record.colo, record.user_agent, record.diagnostics_json, record.created_at
      ).run();
    }

    // Always maintain memory cache for immediate instant lookups and local dev fallback
    memoryRegistrations.set(record.id, record);

    return new Response(JSON.stringify({
      success: true,
      id: record.id,
      alias: record.alias,
      compositeHash: record.composite_hash,
      primaryHardwareHash: record.primary_hardware_hash,
      message: 'Hardware fingerprint and secret phrase successfully registered.'
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Registration failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
