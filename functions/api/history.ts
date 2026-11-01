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

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const db = context.env.DB;
  let registrations: any[] = [];
  let evasions: any[] = [];

  if (db && typeof db.prepare === 'function') {
    try {
      const regRes = await db.prepare(
        'SELECT id, alias, composite_hash, primary_hardware_hash, ip_address, asn, country, city, colo, execution_time_ms, entropy_total_bits, created_at FROM registrations ORDER BY created_at DESC LIMIT 20'
      ).all();
      if (regRes && regRes.results) registrations = regRes.results;

      const evaRes = await db.prepare(
        'SELECT id, registration_id, match_type, confidence_score, is_vpn_detected, ip_address, asn, country, city, colo, created_at FROM evasion_attempts ORDER BY created_at DESC LIMIT 20'
      ).all();
      if (evaRes && evaRes.results) evasions = evaRes.results;
    } catch (err) {
      console.error('History query failed in D1:', err);
    }
  }

  // Fallback to memory
  if (registrations.length === 0 && memoryRegistrations.size > 0) {
    registrations = Array.from(memoryRegistrations.values())
      .map((r: any) => ({
        id: r.id,
        alias: r.alias,
        composite_hash: r.composite_hash,
        primary_hardware_hash: r.primary_hardware_hash,
        ip_address: r.ip_address,
        asn: r.asn,
        country: r.country,
        city: r.city,
        colo: r.colo,
        execution_time_ms: r.execution_time_ms,
        entropy_total_bits: r.entropy_total_bits,
        created_at: r.created_at
      }))
      .reverse()
      .slice(0, 20);
  }

  if (evasions.length === 0 && memoryEvasionAttempts.length > 0) {
    evasions = memoryEvasionAttempts.slice(0, 20);
  }

  return new Response(JSON.stringify({ registrations, evasions }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
