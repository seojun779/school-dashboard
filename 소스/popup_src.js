const L = chrome.storage.local, S = chrome.storage.session;
const NAMES = { cyber: '사이버캠퍼스', everytime: '에브리타임 시간표', gpa: '에브리타임 학점', stins: '종합정보시스템', claude: 'Claude 대화' };
function ago(t) { if (!t) { return '아직 없음'; } const m = Math.floor((Date.now() - t) / 60000); return m < 1 ? '방금' : m < 60 ? m + '분 전' : m < 1440 ? Math.floor(m / 60) + '시간 전' : Math.floor(m / 1440) + '일 전'; }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
async function show() {
  const st = await L.get(['dashUrl', 'health', 'notifyOn']);
  const { job } = await S.get('job');
  document.getElementById('notify').checked = st.notifyOn !== false;
  document.getElementById('open').disabled = !st.dashUrl;
  document.getElementById('open').textContent = st.dashUrl ? '대시보드 열기' : '대시보드.html을 한 번 열어 주세요';
  const h = st.health || {};
  const rows = Object.keys(NAMES).map((k) => {
    const x = h[k];
    if (!x) { return '<div class="row"><b>' + NAMES[k] + '</b><span>아직 확인 전</span></div>'; }
    const cls = x.ok ? 'ok' : (x.n === 0 ? 'warn' : 'bad');
    const mark = x.ok ? '✔' : (x.n === 0 ? '⚠' : '✖');
    return '<div class="row"><b class="' + cls + '">' + mark + ' ' + NAMES[k] + '</b><span>' + ago(x.t) + (x.n != null ? ' · ' + x.n + '개' : '') + (x.msg ? '<br>' + esc(x.msg) : '') + '</span></div>';
  });
  document.getElementById('health').innerHTML = (job ? '<div class="warn">업데이트 중…</div>' : '') + rows.join('');
  const due = await chrome.runtime.sendMessage({ type: 'peek' }).catch(() => []);
  document.getElementById('due').innerHTML = (due && due.length) ? due.map((d) => {
    const ms = new Date(d.due) - Date.now(), hrs = ms / 3600000;
    const left = hrs < 1 ? Math.max(1, Math.round(hrs * 60)) + '분' : hrs < 48 ? Math.round(hrs * 10) / 10 + '시간' : Math.floor(hrs / 24) + '일';
    return '<div class="row"><b>' + left + ' 남음</b><span>' + esc(d.title) + ' · ' + esc(d.course) + '</span></div>';
  }).join('') : '마감이 가까운 과제가 없어요 (업데이트 후 표시)';
}
document.getElementById('notify').onchange = function () { L.set({ notifyOn: this.checked }); };
document.getElementById('open').onclick = async () => { const { dashUrl } = await L.get('dashUrl'); if (dashUrl) { chrome.tabs.create({ url: dashUrl }); window.close(); } };
document.getElementById('sync').onclick = () => { chrome.runtime.sendMessage({ type: 'dash', cmd: 'sync', auto: false }); window.close(); };
document.getElementById('cl').onclick = () => { chrome.runtime.sendMessage({ type: 'dash', cmd: 'sync-claude', auto: false }); window.close(); };
show();
