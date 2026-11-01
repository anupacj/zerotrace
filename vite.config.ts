import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

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

          // Lookup in local in-memory store
          for (const reg of localRegistrations.values()) {
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

          if (!matchedRecord) {
            res.statusCode = 200;
            res.end(JSON.stringify({
              identified: false,
              message: 'No previous device fingerprint matches this hardware profile.',
              probedHashes: { primaryHardwareHash, compositeHash }
            }));
            return;
          }

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

          localEvasions.unshift({
            id: 'eva_' + Math.random().toString(36).substring(2, 12),
            registration_id: matchedRecord.id,
            match_type: matchType,
            confidence_score: confidenceScore,
            secret_phrase_revealed: matchedRecord.secret_phrase,
            created_at: Date.now()
          });

          res.statusCode = 200;
          res.end(JSON.stringify({
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
              registeredColo: matchedRecord.colo || 'DEV',
              currentColo: body.network?.colo || 'DEV',
              hardwareSiliconMatch: (canvasMatch && webglMatch && audioMatch) || matchType === 'HARDWARE_SILICON_MATCH',
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
