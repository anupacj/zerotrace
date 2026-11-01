interface PagesContext {
  request: Request;
  env: Record<string, any>;
}

export async function onRequest(context: PagesContext): Promise<Response> {
  const req = context.request;
  const cf = (req as any).cf || {};

  const clientIp = req.headers.get('cf-connecting-ip') ||
                   req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                   '127.0.0.1';

  const userAgent = req.headers.get('user-agent') || 'Unknown';
  const cfRay = req.headers.get('cf-ray') || 'LOCAL-DEV';

  const payload = {
    ip: clientIp,
    asn: cf.asn ? `AS${cf.asn}` : 'AS0 (Local/Direct)',
    asOrganization: cf.asOrganization || 'Direct Loopback / Localhost',
    country: cf.country || 'DEV',
    city: cf.city || 'Localhost',
    region: cf.region || 'Local',
    colo: cf.colo || 'DEV',
    httpProtocol: cf.httpProtocol || 'HTTP/1.1',
    tlsCipher: cf.tlsCipher || 'AEAD-AES256-GCM',
    cfRay,
    userAgent,
    timestamp: Date.now()
  };

  return new Response(JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    }
  });
}
