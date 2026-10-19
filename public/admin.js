const $ = (id) => document.getElementById(id);
let latestClaimUrl = '';
async function api(url, options = {}) {
  const res = await fetch(url, { credentials: 'same-origin', ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { if (res.status === 401) showLogin(); throw new Error(data.error || `요청 실패 (${res.status})`); }
  return data;
}
function showLogin() { $('loginPanel').hidden = false; $('appPanel').hidden = true; }
function showApp() { $('loginPanel').hidden = true; $('appPanel').hidden = false; loadTokens(); }
$('loginForm').addEventListener('submit', async e => {
  e.preventDefault(); $('loginError').textContent = '';
  try { await api('/api/login', { method: 'POST', body: JSON.stringify({ password: $('password').value }) }); $('password').value = ''; showApp(); }
  catch (err) { $('loginError').textContent = err.message; }
});
$('logoutBtn').addEventListener('click', async () => { try { await api('/api/logout', { method: 'POST' }); showLogin(); } catch (e) { alert(e.message); } });
$('createForm').addEventListener('submit', async e => {
  e.preventDefault(); $('createError').textContent = '';
  const button = $('createForm').querySelector('button[type="submit"]'); button.disabled = true; button.textContent = 'QR 생성 중…';
  try {
    const data = await api('/api/tokens', { method: 'POST', body: JSON.stringify({ storeName: $('storeName').value, durationMinutes: Number($('duration').value) }) });
    const t = data.token; latestClaimUrl = location.origin + t.claimUrl;
    $('newTokenPanel').hidden = false; $('newStore').textContent = t.storeName;
    $('newDetails').textContent = `${t.durationMinutes}분 이용 · QR 유효기간 7일 · 일회성 토큰`;
    $('newQr').src = `/api/tokens/${encodeURIComponent(t.id)}/qr.png?t=${Date.now()}`;
    $('openClaim').href = t.claimUrl; $('newTokenState').textContent = '미사용'; $('newTokenState').className = 'pill';
    $('copyStatus').textContent = ''; await loadTokens();
    $('newTokenPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) { $('createError').textContent = err.message; }
  finally { button.disabled = false; button.innerHTML = 'QR 발급하기 <span aria-hidden="true">↗</span>'; }
});
$('copyLink').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(latestClaimUrl); $('copyStatus').textContent = '고객 링크를 복사했습니다.'; }
  catch { $('copyStatus').textContent = latestClaimUrl; }
});
$('refreshBtn').addEventListener('click', loadTokens);
const labels = { unused: '미사용', active: '인증됨 · 시뮬레이션', expired: '만료', revoked: '취소' };
function fmt(ts) { return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(ts)); }
async function loadTokens() {
  try {
    const { tokens } = await api('/api/tokens');
    $('empty').hidden = tokens.length > 0; $('tokensTable').hidden = tokens.length === 0; $('tokensBody').replaceChildren();
    for (const t of tokens) {
      const tr = document.createElement('tr');
      const values = [t.storeName, `${t.durationMinutes}분`, labels[t.state] || t.state, fmt(t.createdAt)];
      for (let i = 0; i < values.length; i++) {
        const td = document.createElement('td'); td.textContent = values[i];
        if (i === 2) { const pill = document.createElement('span'); pill.className = `pill ${t.state}`; pill.textContent = values[i]; td.replaceChildren(pill); }
        tr.appendChild(td);
      }
      const action = document.createElement('td');
      if (t.state !== 'revoked' && t.state !== 'expired') {
        const btn = document.createElement('button'); btn.className = 'secondary'; btn.textContent = 'QR 취소';
        btn.addEventListener('click', async () => {
          if (!confirm('이 QR을 취소할까요? 취소하면 고객이 사용할 수 없습니다.')) return;
          try { await api(`/api/tokens/${t.id}/revoke`, { method: 'POST', body: '{}' }); await loadTokens(); }
          catch (e) { alert(e.message); }
        });
        action.appendChild(btn);
      } else action.textContent = '—';
      tr.appendChild(action); $('tokensBody').appendChild(tr);
    }
  } catch (e) { if (e.message && e.message !== '관리자 로그인이 필요합니다.') $('loginError').textContent = e.message; }
}
api('/api/status').then(() => showApp()).catch(() => showLogin());
