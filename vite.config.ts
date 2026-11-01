import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { computeForensicDiff, evaluateCandidateSimilarity } from './src/lib/forensics';

// In-Memory fallback store for local development
const localRegistrations = new Map<string, any>();
const localEvasions: any[] = [];

function apiDevMiddleware(): Plugin {
  return {
    name: 'trace-zero-api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) {
          return next();
        }

        const url = new URL(req.url, `http://${req.headers.host}`);
        const pathname = url.pathname;

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        const readJsonBody = async (): Promise<any> => {
          return new Promise((resolve) => {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                resolve(body ? JSON.parse(body) : {});
              } catch {
                resolve({});
              }
            });
          });
        };

        // 1. GET /api/probe
        if (pathname === '/api/probe' && req.method === 'GET') {
          const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '127.0.0.1';
          const userAgent = req.headers['user-agent'] || 'Local-Dev-Browser';

          const data = {
            ip: clientIp,
            asn: 'AS0 (Localhost / Direct)',
            asOrganization: 'Localhost Development Environment',
            country: 'LOCAL',
            city: 'Local Machine',
            region: 'Loopback',
            colo: 'DEV',
            httpProtocol: 'HTTP/1.1',
            tlsCipher: 'TLS_AES_256_GCM_SHA384 (Dev Emulated)',
            cfRay: 'LOCAL-DEV-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
            userAgent,
            timestamp: Date.now()
          };

          res.statusCode = 200;
          res.end(JSON.stringify(data));
          return;
        }

        // 2. POST /api/register
        if (pathname === '/api/register' && req.method === 'POST') {
          const body = await readJsonBody();
          const secretPhrase = (body.secretPhrase || '').trim();
          if (!secretPhrase) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Secret phrase is required' }));
            return;
          }

          const id = 'dev_' + Math.random().toString(36).substring(2, 12);
          const record = {
            id,
            secret_phrase: secretPhrase,
            alias: body.alias || `Target Host #${Math.floor(Math.random() * 8999 + 1000)}`,
            composite_hash: body.compositeHash || '',
            primary_hardware_hash: body.primaryHardwareHash || '',
            canvas_hash: body.canvasHash || '',
            webgl_hash: body.webglHash || '',
            audio_hash: body.audioHash || '',
            hardware_hash: body.hardwareHash || '',
            environment_hash: body.environmentHash || '',
            font_hash: body.fontHash || '',
            entropy_total_bits: Number(body.entropyTotalBits || 67.5),
            execution_time_ms: Number(body.executionTimeMs || 14.2),
            ip_address: body.network?.ip || '127.0.0.1',
            asn: body.network?.asn || '',
            as_organization: body.network?.asOrganization || '',
            country: body.network?.country || '',
            city: body.network?.city || '',
            colo: body.network?.colo || '',
            user_agent: body.network?.userAgent || req.headers['user-agent'] || '',
            diagnostics_json: JSON.stringify(body.diagnostics || {}),
            created_at: Date.now()
          };

          localRegistrations.set(record.id, record);

          res.statusCode = 201;
          res.end(JSON.stringify({
            success: true,
            id: record.id,
            alias: record.alias,
            compositeHash: record.composite_hash,
            primaryHardwareHash: record.primary_hardware_hash,
            message: 'Hardware fingerprint registered successfully.'
          }));
          return;
        }

        // 3. POST /api/identify
        if (pathname === '/api/identify' && req.method === 'POST') {
          const body = await readJsonBody();

          let bestMatch: any = null;
          let bestEvalResult: any = null;
          let highestPoints = -1;

          for (const reg of localRegistrations.values()) {
            const evalRes = evaluateCandidateSimilarity(reg, body);

            // Same-session storage token match is an immediate 100% win
            if (evalRes.isSameSession) {
              bestMatch = reg;
              bestEvalResult = evalRes;
              break;
            }

            if (evalRes.matched && evalRes.rawPoints > highestPoints) {
              highestPoints = evalRes.rawPoints;
              bestMatch = reg;
              bestEvalResult = evalRes;
            }
          }

          if (!bestMatch || !bestEvalResult || !bestEvalResult.matched) {
            res.statusCode = 200;
            res.end(JSON.stringify({
              identified: false,
              message: 'No previous device fingerprint matches this hardware profile.',
              probedHashes: {
                primaryHardwareHash: body.primaryHardwareHash,
                compositeHash: body.compositeHash
              }
            }));
            return;
          }

          const diffReport = computeForensicDiff(bestMatch, body);
          const currentIp = body.network?.ip || '127.0.0.1';

          localEvasions.unshift({
            id: 'eva_' + Math.random().toString(36).substring(2, 12),
            registration_id: bestMatch.id,
            match_type: diffReport.matchType,
            confidence_score: diffReport.confidenceScore,
            secret_phrase_revealed: bestMatch.secret_phrase,
            created_at: Date.now()
          });

          res.statusCode = 200;
          res.end(JSON.stringify({
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
              registeredColo: bestMatch.colo || 'DEV',
              currentColo: body.network?.colo || 'DEV',
              hardwareSiliconMatch: diffReport.matchType === 'HARDWARE_SILICON_MATCH' || diffReport.matchType === 'FARBLING_RESISTANT_HARDWARE_MATCH',
            }
          }));
          return;
        }

        // 4. GET /api/history
        if (pathname === '/api/history' && req.method === 'GET') {
          const registrations = Array.from(localRegistrations.values()).slice(0, 20);
          res.statusCode = 200;
          res.end(JSON.stringify({ registrations, evasions: localEvasions.slice(0, 20) }));
          return;
        }

        // 5. GET /api/stats
        if (pathname === '/api/stats' && req.method === 'GET') {
          res.statusCode = 200;
          res.end(JSON.stringify({
            totalRegistrations: localRegistrations.size,
            totalEvasions: localEvasions.length,
            avgExecutionMs: 13.4,
            detectionEfficacyPct: 99.4,
            supportedVectors: 6,
            entropyBitsAvg: 67.9,
            timestamp: Date.now()
          }));
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), apiDevMiddleware()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: 'esnext',
  }
});
