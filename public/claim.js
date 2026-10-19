const $ = (id) => document.getElementById(id);
const token = decodeURIComponent(location.pathname.split('/').filter(Boolean).pop() || '');
const button = $('claimBtn');
async function load() {
  try {
    const res = await fetch('/api/claim/' + encodeURIComponent(token));
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'QR을 사용할 수 없습니다.');
    $('storeName').textContent = data.storeName;
    $('duration').textContent = data.state === 'active' ? '이미 인증된 QR입니다.' : `이용 시간 ${data.durationMinutes}분 · QR 1회 사용`;
    if (data.state === 'active') {
      button.disabled = true; button.textContent = '이미 사용한 QR';
      $('claimResult').textContent = '이미 사용된 QR입니다.'; $('claimResult').className = 'warn-text';
    } else {
      button.disabled = false;
    }
  } catch (err) {
    $('storeName').textContent = 'QR 인증 불가';
    $('duration').textContent = err.message;
    button.disabled = true;
    $('claimResult').textContent = '만료·취소되었거나 유효하지 않은 QR입니다.';
    $('claimResult').className = 'warn-text';
  }
}
button.addEventListener('click', async () => {
  button.disabled = true; button.textContent = '확인 중…';
  try {
    const res = await fetch('/api/claim/' + encodeURIComponent(token), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '인증할 수 없습니다.');
    $('claimResult').textContent = `QR 토큰 확인 완료. 테스트 이용시간은 ${new Date(data.activeUntil).toLocaleString('ko-KR')}까지입니다. 단, 실제 인터넷 접속은 허용되지 않았습니다.`;
    $('claimResult').className = 'warn-text';
    button.textContent = '인증 테스트 완료';
    $('duration').textContent = `${data.storeName} · 이용시간 기록 완료`;
  } catch (err) {
    $('claimResult').textContent = err.message; $('claimResult').className = 'warn-text'; button.textContent = '다시 확인';
    button.disabled = false;
  }
});
load();
