'use strict';
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const QRCode = require('qrcode');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const COOKIE_SECRET = process.env.COOKIE_SECRET;
const NETWORK_MODE = process.env.NETWORK_MODE || 'simulation';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'tokens.json');

// Never let an unsupported mode appear to run as if it controls real client traffic.
if (NETWORK_MODE !== 'simulation') {
  console.error('Network enforcement is not implemented for this gateway. Keep NETWORK_MODE=simulation; real mode is intentionally blocked until a verified adapter is integrated and tested.');
  process.exit(1);
}

if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 16 || !COOKIE_SECRET || COOKIE_SECRET.length < 32) {
  console.error('Configuration error: set ADMIN_PASSWORD (16+ chars) and COOKIE_SECRET (32+ chars). Copy .env.example to .env and set values.');
  process.exit(1);
}
fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', { mode: 0o600 });

app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'], connectSrc: ["'self'"], baseUri: ["'self'"], formAction: ["'self'"]
    }
  }
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use('/api/', rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use('/claim/', rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use(express.static(path.join(__dirname, 'public'), { index: false, etag: true, maxAge: '5m' }));

function readTokens() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return []; }
}
function writeTokens(tokens) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(tokens, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, DATA_FILE);
}
function hashToken(token) { return crypto.createHash('sha256').update(token).digest('hex'); }
function sign(value) { return crypto.createHmac('sha256', COOKIE_SECRET).update(value).digest('hex'); }
function safeEqual(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) {
      try { out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); } catch {}
    }
  });
  return out;
}
function isAdmin(req) {
  const raw = parseCookies(req).wifi_admin || '';
  const dot = raw.lastIndexOf('.');
  if (dot < 1) return false;
  const payload = raw.slice(0, dot), sig = raw.slice(dot + 1);
  if (!safeEqual(sign(payload), sig)) return false;
  const parts = payload.split(':');
  return parts[0] === 'admin' && Number(parts[1]) > Date.now();
}
function adminOnly(req, res, next) {
  if (!isAdmin(req)) return res.status(401).json({ error: '관리자 로그인이 필요합니다.' });
  next();
}
function tokenState(t, now = Date.now()) {
  if (t.revokedAt) return 'revoked';
  if (t.usedAt && t.activeUntil && t.activeUntil <= now) return 'expired';
  if (t.usedAt && t.activeUntil > now) return 'active';
  if (t.expiresAt <= now) return 'expired';
  return 'unused';
}
function publicToken(t) {
  return {
    id: t.id, storeName: t.storeName, durationMinutes: t.durationMinutes,
    createdAt: t.createdAt, expiresAt: t.expiresAt, usedAt: t.usedAt || null,
    activeUntil: t.activeUntil || null, revokedAt: t.revokedAt || null,
    state: tokenState(t), claimUrl: `/claim/${t.rawToken}`
  };
}

app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/health', (_req, res) => res.json({ ok: true, networkMode: NETWORK_MODE, enforcement: 'NOT_CONNECTED' }));
app.post('/api/login', (req, res) => {
  const supplied = String(req.body.password || '');
  if (!safeEqual(supplied, ADMIN_PASSWORD)) return res.status(401).json({ error: '비밀번호가 올바르지 않습니다.' });
  const payload = `admin:${Date.now() + 8 * 60 * 60 * 1000}`;
  const cookie = `${payload}.${sign(payload)}`;
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.setHeader('Set-Cookie', `wifi_admin=${encodeURIComponent(cookie)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${secure ? '; Secure' : ''}`);
  res.json({ ok: true });
});
app.post('/api/logout', (_req, res) => {
  res.setHeader('Set-Cookie', 'wifi_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
  res.json({ ok: true });
});
app.get('/api/status', adminOnly, (_req, res) => res.json({
  networkMode: NETWORK_MODE, enforcement: 'NOT_CONNECTED',
  note: 'QR/token authentication prototype only. No real network access is granted or blocked yet.'
}));
app.get('/api/tokens', adminOnly, (_req, res) => {
  const tokens = readTokens().sort((a, b) => b.createdAt - a.createdAt).map(publicToken);
  res.json({ tokens });
});
app.post('/api/tokens', adminOnly, (req, res) => {
  const storeName = String(req.body.storeName || '').trim().slice(0, 80);
  const durationMinutes = Number(req.body.durationMinutes);
  if (!storeName) return res.status(400).json({ error: '매장명을 입력하세요.' });
  if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 720) {
    return res.status(400).json({ error: '이용 시간은 5~720분 사이의 정수여야 합니다.' });
  }
  const rawToken = crypto.randomBytes(24).toString('base64url');
  const now = Date.now();
  const record = {
    id: crypto.randomUUID(), tokenHash: hashToken(rawToken), rawToken, storeName, durationMinutes,
    createdAt: now, expiresAt: now + 7 * 24 * 60 * 60 * 1000,
    usedAt: null, activeUntil: null, revokedAt: null
  };
  const tokens = readTokens();
  tokens.push(record);
  writeTokens(tokens);
  res.status(201).json({ token: publicToken(record) });
});
app.post('/api/tokens/:id/revoke', adminOnly, (req, res) => {
  const tokens = readTokens();
  const t = tokens.find(x => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'QR을 찾을 수 없습니다.' });
  if (!t.revokedAt) t.revokedAt = Date.now();
  writeTokens(tokens);
  res.json({ token: publicToken(t) });
});
app.get('/api/tokens/:id/qr.png', adminOnly, async (req, res) => {
  const t = readTokens().find(x => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'QR을 찾을 수 없습니다.' });
  const origin = `${req.protocol}://${req.get('host')}`;
  const url = `${origin}/claim/${t.rawToken}`;
  try {
    const png = await QRCode.toBuffer(url, { type: 'png', width: 420, margin: 2, errorCorrectionLevel: 'M' });
    res.type('png').set('Cache-Control', 'no-store').send(png);
  } catch {
    res.status(500).json({ error: 'QR 생성에 실패했습니다.' });
  }
});
app.get('/claim/:token', (req, res) => {
  const supplied = String(req.params.token || '');
  const t = readTokens().find(x => safeEqual(x.tokenHash, hashToken(supplied)));
  if (!t || ['revoked', 'expired'].includes(tokenState(t))) {
    return res.status(410).sendFile(path.join(__dirname, 'public', 'invalid.html'));
  }
  res.sendFile(path.join(__dirname, 'public', 'claim.html'));
});
app.get('/api/claim/:token', (req, res) => {
  const supplied = String(req.params.token || '');
  const t = readTokens().find(x => safeEqual(x.tokenHash, hashToken(supplied)));
  if (!t) return res.status(404).json({ error: 'QR이 유효하지 않습니다.' });
  const state = tokenState(t);
  if (state === 'revoked' || state === 'expired') return res.status(410).json({ error: '만료되었거나 취소된 QR입니다.' });
  res.json({ storeName: t.storeName, durationMinutes: t.durationMinutes, state, activeUntil: t.activeUntil || null, enforcement: 'NOT_CONNECTED' });
});
app.post('/api/claim/:token', (req, res) => {
  const supplied = String(req.params.token || '');
  const tokens = readTokens();
  const t = tokens.find(x => safeEqual(x.tokenHash, hashToken(supplied)));
  if (!t) return res.status(404).json({ error: 'QR이 유효하지 않습니다.' });
  const state = tokenState(t);
  if (state === 'revoked' || state === 'expired') return res.status(410).json({ error: '만료되었거나 취소된 QR입니다.' });
  if (state === 'active') return res.status(409).json({ error: '이미 사용 중인 QR입니다.' });
  if (state !== 'unused') return res.status(410).json({ error: '사용할 수 없는 QR입니다.' });
  // Never consume a receipt QR until a verified gateway can actually grant access.
  // This build has no GAPD-7300 enforcement adapter, so preserve the token for a later real test.
  return res.status(503).json({
    ok: false,
    code: 'NETWORK_ENFORCEMENT_NOT_CONNECTED',
    enforcement: 'NOT_CONNECTED',
    error: 'QR은 유효하지만 실제 공유기 접속 허용 기능이 아직 연결되지 않았습니다. QR은 사용 처리되지 않았으므로 나중에 다시 테스트할 수 있습니다.'
  });
});
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
});

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => console.log(`Receipt Wi-Fi MVP listening on port ${PORT} (network enforcement: NOT_CONNECTED)`));
}
module.exports = { app };
