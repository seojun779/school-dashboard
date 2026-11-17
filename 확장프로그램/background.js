const CYBER = 'https://cyber.shinhan.ac.kr', CLAUDE = 'https://claude.ai', ET = 'https://everytime.kr', STINS = 'https://stins.shinhan.ac.kr/irj/portal';
const S = chrome.storage.session, L = chrome.storage.local;
const STALE = { cyber: 2 * 3600 * 1000, gpa: 12 * 3600 * 1000, everytime: 6 * 3600 * 1000, stins: 6 * 3600 * 1000, claude: 6 * 3600 * 1000 };
const LAST = { cyber: 'lastCyber', gpa: 'lastGpa', everytime: 'lastEt', stins: 'lastStins', claude: 'lastClaude' };
const NAMES = { cyber: '사이버캠퍼스', gpa: '에브리타임 학점', everytime: '에브리타임', stins: '종합정보시스템', claude: 'Claude 대화' };
const JOB_MAX = 8 * 60 * 1000, LOGIN_MAX = 15 * 60 * 1000;

async function getJob() { return (await S.get('job')).job || null; }
async function setJob(j) { await S.set({ job: j }); }
async function dashTabs() { return (await S.get('dash')).dash || {}; }
async function status(text) {
  const d = await dashTabs();
  for (const id of Object.keys(d)) { chrome.tabs.sendMessage(+id, { type: 'status', text }).catch(() => { }); }
}
async function outboxPush(m) {
  const { outbox = [] } = await L.get('outbox');
  outbox.push(m);
  await L.set({ outbox });
  const d = await dashTabs();
  for (const id of Object.keys(d)) { chrome.tabs.sendMessage(+id, { type: 'flush' }).catch(() => { }); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- 마감 알림 ---------- */
const THRESH = [1, 6, 24];   /* 마감 몇 시간 전에 알려 줄지 (작은 값부터) */
function dueList(cache, state, now) {
  const out = [];
  const done = (state && state.done) || {};
  ((cache && cache.assigns) || []).forEach((a) => {
    if (a.p || a.st === 'done' || done[a.id]) { return; }
    const d = new Date(a.due);
    if (isNaN(d) || d <= now) { return; }
    out.push({ id: a.id, course: a.course, title: a.t, due: d, h: a.h || '' });
  });
  ((state && state.manual) || []).forEach((m) => {
    if (m.done || !m.due) { return; }
    const d = new Date(m.due + 'T23:59:00');
    if (isNaN(d) || d <= now) { return; }
    out.push({ id: m.id, course: m.course, title: m.title, due: d, h: '' });
  });
  out.sort((a, b) => a.due - b.due);
  return out;
}
function dueNotices(cache, state, notified, now) {
  const res = [];
  dueList(cache, state, now).forEach((x) => {
    const hrs = (x.due - now) / 3600000;
    const thr = THRESH.filter((t) => hrs <= t)[0];
    if (thr === undefined) { return; }
    const key = x.id + '|' + thr;
    if (notified[key]) { return; }
    const left = hrs < 1 ? Math.max(1, Math.round(hrs * 60)) + '분' : (Math.round(hrs * 10) / 10) + '시간';
    const p = (n) => String(n).padStart(2, '0');
    const when = (x.due.getMonth() + 1) + '/' + x.due.getDate() + ' ' + p(x.due.getHours()) + ':' + p(x.due.getMinutes());
    res.push({ key, id: x.id, title: '⏰ 마감 ' + left + ' 남음', message: x.title + ' (' + x.course + ') · ' + when, h: x.h });
  });
  return res;
}
async function checkDeadlines() {
  const st = await L.get(['notifyOn', 'cyberCache', 'dashState', 'notified']);
  if (st.notifyOn === false) { return; }
  const notified = st.notified || {};
  const list = dueNotices(st.cyberCache, st.dashState, notified, new Date());
  for (const n of list) {
    notified[n.key] = Date.now();
    try {
      await chrome.notifications.create(n.key, { type: 'basic', iconUrl: 'icon128.png', title: n.title, message: n.message, priority: 2 });
    } catch (e) { }
    if (n.h) { await S.set({ ['nh_' + n.key]: n.h }); }
  }
  Object.keys(notified).forEach((k) => { if (Date.now() - notified[k] > 14 * 86400000) { delete notified[k]; } });
  await L.set({ notified });
}
chrome.notifications.onClicked.addListener(async (id) => {
  const h = (await S.get('nh_' + id))['nh_' + id];
  const { dashUrl } = await L.get('dashUrl');
  const url = h || dashUrl;
  if (url) { chrome.tabs.create({ url }); }
  chrome.notifications.clear(id);
});
chrome.alarms.get('deadline').then((a) => { if (!a) { chrome.alarms.create('deadline', { periodInMinutes: 15 }); } });

/* ---------- 연동 상태 점검 ---------- */
async function setHealth(step, ok, n, msg) {
  const { health = {} } = await L.get('health');
  health[step] = { t: Date.now(), ok, n: n == null ? null : n, msg: msg || '' };
  await L.set({ health });
}
const EMPTY_WARN = {
  cyber: '과제를 한 개도 읽지 못했어요. 사이트 화면이 바뀌었을 수 있어요.',
  everytime: '시간표 과목을 읽지 못했어요. 화면이 바뀌었거나 시간표가 비어 있어요.',
  gpa: '학점계산기에서 과목을 읽지 못했어요.',
  stins: '읽을 일정이 없었어요. (홈에 일정이 없거나 화면이 바뀌었어요)',
  claude: ''
};


async function startSync(cmd, auto) {
  const job = await getJob();
  if (job && Date.now() - job.t < JOB_MAX) { await status('이미 업데이트 중이에요…'); return; }
  const last = await L.get(Object.values(LAST));
  let queue;
  if (cmd === 'sync-claude') { queue = ['claude']; }
  else if (cmd === 'sync-gpa') { queue = ['gpa']; }
  else {
    queue = ['cyber', 'everytime', 'gpa', 'stins', 'claude'];
    if (auto) { queue = queue.filter((k) => Date.now() - (last[LAST[k]] || 0) > STALE[k]); }
    else { queue = queue.filter((k) => k !== 'claude' || Date.now() - (last.lastClaude || 0) > STALE.claude); }
  }
  if (!queue.length) { return; }
  await chrome.alarms.create('watch', { periodInMinutes: 0.5 });
  await nextStep({ t: Date.now(), queue });
}
async function nextStep(job) {
  if (job.tabId) { const old = job.tabId; job.tabId = null; await setJob(job); try { await chrome.tabs.remove(old); } catch (e) { } }
  const step = job.queue.shift();
  if (!step) { await setJob(job); await finish(job.note || '✅ 업데이트가 끝났어요'); return; }
  const url = { cyber: CYBER + '/local/ubion/user/', everytime: ET + '/timetable', gpa: ET + '/calculator', stins: STINS, claude: CLAUDE + '/recents' }[step];
  await status(NAMES[step] + ' 확인하는 중이에요…');
  const tab = await chrome.tabs.create({ url, active: false });
  job.cur = step; job.stage = 'load'; job.tabId = tab.id; job.stageT = Date.now();
  await setJob(job);
}
async function stepDone(job, kindNote, n) {
  await L.set({ [LAST[job.cur]]: Date.now() });
  await setHealth(job.cur, !(n === 0 && EMPTY_WARN[job.cur]), n, n === 0 ? EMPTY_WARN[job.cur] : '');
  if (kindNote) { job.note = kindNote; }
  await nextStep(job);
}
async function skipStep(job, msg) {
  await setHealth(job.cur, false, null, msg);
  await status(msg);
  await nextStep(job);
}
async function focusDash() {
  const d = await dashTabs();
  for (const id of Object.keys(d)) {
    try { await chrome.tabs.update(+id, { active: true }); await chrome.windows.update(d[id], { focused: true }); return true; } catch (e) { }
  }
  const { dashUrl } = await L.get('dashUrl');
  if (dashUrl) { try { await chrome.tabs.create({ url: dashUrl, active: true }); return true; } catch (e) { } }
  return false;
}
async function finish(msg) {
  const job = await getJob();
  await S.remove('job');
  await chrome.alarms.clear('watch');
  if (job && job.tabId) { try { await chrome.tabs.remove(job.tabId); } catch (e) { } }
  if (job && job.hadLogin) { await focusDash(); }
  const { health = {} } = await L.get('health');
  await outboxPush({ type: 'health', health });
  await status(msg || '✅ 업데이트가 끝났어요');
}
async function toLogin(job, tab, msg) {
  if (job.stage === 'login') { return; }
  job.stage = 'login'; job.hadLogin = true; job.stageT = Date.now(); await setJob(job);
  await chrome.tabs.update(tab.id, { active: true });
  chrome.windows.update(tab.windowId, { focused: true });
  await status(msg);
}
async function runCollector(tabId, known) {
  await chrome.scripting.executeScript({ target: { tabId }, files: ['collector.js'], world: 'MAIN' });
  await chrome.scripting.executeScript({
    target: { tabId }, world: 'MAIN',
    func: (k) => window.postMessage({ type: 'sh-known', keys: k.keys || [], claudeKeys: k.claudeKeys || [] }, '*'),
    args: [known]
  });
}

/* ---------- 에브리타임: 내 시간표 읽기 ---------- */
function etExtract() {
  return (async () => {
    for (let i = 0; i < 40 && !document.querySelector('div.subject h3'); i++) { await new Promise((r) => setTimeout(r, 300)); }
    const items = [];
    document.querySelectorAll('div.subject').forEach((s) => {
      const h = s.querySelector('h3'), td = s.closest('td');
      if (!h || !td) { return; }
      const col = Array.prototype.indexOf.call(td.parentNode.children, td) - 1;
      const top = parseFloat(s.style.top), hh = parseFloat(s.style.height);
      if (!(col >= 0) || isNaN(top) || isNaN(hh)) { return; }
      const st = Math.round(top), en = Math.round(top + hh - 1);
      const f = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
      const em = s.querySelector('p em'), sp = s.querySelector('p span');
      items.push({ title: h.textContent.trim(), day: col, start: f(st), end: f(en), prof: em ? em.textContent.trim() : '', place: sp ? sp.textContent.trim().replace(/-/g, ' ') : '' });
    });
    return items;
  })();
}

/* ---------- 에브리타임: 학점계산기(학기별 과목·성적) 읽기 ---------- */
function gpaExtract() {
  return (async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let i = 0; i < 40 && !document.querySelector('table.subjects tr'); i++) { await wait(300); }
    const links = Array.prototype.slice.call(document.querySelectorAll('a')).filter((a) => /^\d학년 \d학기$/.test(a.textContent.trim()));
    const sems = [];
    for (const a of links) {
      a.click();
      await wait(450);
      const rows = [];
      document.querySelectorAll('table.subjects tr').forEach((tr) => {
        const td = tr.children;
        if (td.length < 4 || tr.querySelector('th')) { return; }
        const val = (c) => { const s = c.querySelector('select'), i = c.querySelector('input'); return s ? s.options[s.selectedIndex].textContent.trim() : (i ? (i.type === 'checkbox' ? i.checked : i.value) : c.textContent.trim()); };
        const name = String(val(td[0]) || '').trim(), credit = parseFloat(val(td[1]));
        if (!name || !(credit > 0)) { return; }
        rows.push({ name, credit, grade: String(val(td[2]) || '').trim(), major: !!val(td[3]) });
      });
      if (rows.length) { sems.push({ sem: a.textContent.trim(), rows }); }
    }
    return sems;
  })();
}

/* ---------- 종합정보시스템: 홈 화면의 일정 글 읽기 ---------- */
function stinsText() {
  return (async () => {
    await new Promise((r) => setTimeout(r, 7000));
    return { welcome: /님\s*환영합니다/.test(document.body ? document.body.innerText : ''), text: document.body ? document.body.innerText : '' };
  })();
}
function parseSchedule(text) {
  const lines = String(text).split(/\n+/).map((s) => s.trim()).filter(Boolean);
  const re = /(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?\s*\(?[월화수목금토일]?\)?\s*(\d{1,2}:\d{2})?\s*[~\-]\s*(?:(?:(\d{4})\.\s*)?(\d{1,2})\.\s*(\d{1,2})\.?\s*\(?[월화수목금토일]?\)?)?\s*(\d{1,2}:\d{2})?/;
  const p2 = (n) => String(n).padStart(2, '0');
  const out = [], seen = {};
  let title = '';
  for (const ln of lines) {
    const m = ln.match(re);
    if (m) {
      const d = m[1] + '-' + p2(m[2]) + '-' + p2(m[3]);
      const end = m[6] && m[7] ? (m[5] || m[1]) + '-' + p2(m[6]) + '-' + p2(m[7]) : '';
      const times = ln.match(/\d{1,2}:\d{2}/g) || [], t = times[0] || '', tEnd = times.length > 1 ? times[times.length - 1] : t;
      const base = title || '학교 일정';
      const add = (dd, tt, tl) => { const k = dd + '|' + tl; if (!seen[k]) { seen[k] = 1; out.push({ d: dd, t: tt, title: '[학교] ' + tl, p: '종합정보시스템 안내' }); } };
      if (end && end !== d) { add(d, t, base + ' 시작'); add(end, tEnd, base + ' 마감'); }
      else { add(d, t, base); }
    } else if (ln.length <= 30 && !/^[\d○ㅇ·•]/.test(ln)) { title = ln.replace(/^[\s○ㅇ·•\-]+/, ''); }
  }
  return out;
}

chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (info.status !== 'complete') { return; }
  const job = await getJob();
  if (!job || job.tabId !== tabId || job.busy) { return; }
  let u; try { u = new URL(tab.url || ''); } catch (e) { return; }
  const step = job.cur;
  const wasLogin = job.stage === 'login';
  const backToDash = async () => { if (wasLogin) { await focusDash(); } };
  try {
    if (step === 'cyber') {
      if (u.hostname !== 'cyber.shinhan.ac.kr') { return; }
      if (/\/login\//.test(u.pathname) || /login\.php/.test(u.pathname)) { await toLogin(job, tab, '사이버캠퍼스 로그인 창을 열었어요. 로그인하면 자동으로 돌아와요.'); return; }
      if (job.stage === 'run') { return; }
      job.stage = 'run'; await setJob(job);
      await backToDash();
      await status('✅ 로그인 확인됨 · 대시보드로 돌아왔어요. 과제와 강의자료는 뒤에서 읽는 중이에요 (1~2분)');
      const { knownCyber = [] } = await L.get('knownCyber');
      await runCollector(tabId, { keys: knownCyber });
    } else if (step === 'claude') {
      if (u.hostname !== 'claude.ai') { return; }
      if (/\/login|\/logout/.test(u.pathname)) { await skipStep(job, 'Claude에 로그인되어 있지 않아 대화 학습은 건너뛰었어요.'); return; }
      if (job.stage === 'run') { return; }
      job.stage = 'run'; await setJob(job);
      const { knownClaude = [] } = await L.get('knownClaude');
      await runCollector(tabId, { claudeKeys: knownClaude });
    } else if (step === 'everytime') {
      if (u.hostname === 'account.everytime.kr' || /\/login/.test(u.pathname)) { await toLogin(job, tab, '에브리타임 로그인 창을 열었어요. 로그인하면 자동으로 돌아와요.'); return; }
      if (u.hostname !== 'everytime.kr' || job.stage === 'run') { return; }
      job.stage = 'run'; job.busy = true; await setJob(job);
      await backToDash();
      const r = await chrome.scripting.executeScript({ target: { tabId }, func: etExtract });
      job.busy = false;
      const items = (r && r[0] && r[0].result) || [];
      if (items.length) { await outboxPush({ type: 'sh-et', items }); await stepDone(job, null, items.length); }
      else { await skipStep(job, '에브리타임 시간표를 읽지 못했어요. (시간표가 비어 있거나 화면이 바뀌었을 수 있어요)'); }
    } else if (step === 'gpa') {
      if (u.hostname === 'account.everytime.kr' || /\/login/.test(u.pathname)) { await toLogin(job, tab, '에브리타임 로그인 창을 열었어요. 로그인하면 자동으로 돌아와요.'); return; }
      if (u.hostname !== 'everytime.kr' || job.stage === 'run') { return; }
      job.stage = 'run'; job.busy = true; await setJob(job);
      await backToDash();
      const r = await chrome.scripting.executeScript({ target: { tabId }, func: gpaExtract });
      job.busy = false;
      const sems = (r && r[0] && r[0].result) || [];
      if (sems.length) { await outboxPush({ type: 'sh-gpa', sems }); await stepDone(job, null, sems.reduce((a, s) => a + s.rows.length, 0)); }
      else { await skipStep(job, '에브리타임 학점계산기에서 읽을 과목이 없었어요.'); }
    } else if (step === 'stins') {
      if (u.hostname !== 'stins.shinhan.ac.kr' || job.stage === 'run') { return; }
      job.busy = true; await setJob(job);
      const r = await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, func: stinsText });
      job.busy = false;
      const res = (r || []).map((x) => x.result).filter(Boolean);
      if (!res.some((x) => x.welcome)) { await toLogin(job, tab, '종합정보시스템 로그인 창을 열었어요. 로그인하면 자동으로 돌아와요.'); return; }
      job.stage = 'run'; await setJob(job);
      await backToDash();
      let items = [];
      res.forEach((x) => { items = items.concat(parseSchedule(x.text)); });
      const uniq = {}; items = items.filter((x) => { const k = x.d + x.title; if (uniq[k]) { return false; } uniq[k] = 1; return true; });
      if (items.length) { await outboxPush({ type: 'sh-school', items }); await stepDone(job, null, items.length); }
      else { await skipStep(job, '종합정보시스템 홈에서 읽을 일정이 없었어요.'); }
    }
  } catch (e) {
    const j = await getJob();
    if (j && j.tabId === tabId) { j.busy = false; await skipStep(j, NAMES[step] + ' 읽기 중 문제가 생겨 건너뛰었어요.'); }
  }
});

async function onResult(p, tabId) {
  const job = await getJob();
  if (!job || job.tabId !== tabId || !p) { return; }
  if (p.type === 'sh-error') { await skipStep(job, '사이버캠퍼스 로그인 정보를 확인하지 못했어요. 대시보드의 🔄 버튼으로 다시 시도해 주세요.'); return; }
  if (p.type === 'sh-data' && job.cur === 'cyber') {
    const { knownCyber = [] } = await L.get('knownCyber');
    const set = new Set(knownCyber);
    (p.know || []).forEach((e) => set.add(e.k));
    await L.set({ knownCyber: [...set] });
    const assigns = [];
    ((p.data && p.data.courses) || []).forEach((c) => { (c.assign || []).forEach((a) => { assigns.push({ id: c.id + '|' + a.t, course: c.folder || c.name, t: a.t, due: a.due, st: a.st, p: !!a.p, h: a.h || '' }); }); });
    await L.set({ cyberCache: { t: Date.now(), assigns } });
    await outboxPush({ type: 'sh-data', data: p.data, know: p.know || [] });
    await stepDone(job, null, assigns.length);
    await checkDeadlines();
    return;
  }
  if (p.type === 'sh-claude' && job.cur === 'claude') {
    if (p.error) { await skipStep(job, 'Claude 대화를 읽지 못했어요. claude.ai에 로그인되어 있는지 확인해 주세요.'); return; }
    const { knownClaude = [] } = await L.get('knownClaude');
    const set = new Set(knownClaude);
    (p.items || []).forEach((e) => set.add(e.k));
    await L.set({ knownClaude: [...set] });
    if ((p.items || []).length) { await outboxPush({ type: 'sh-claude', items: p.items }); }
    await stepDone(job, (p.items || []).length ? '✅ 업데이트와 Claude 대화 학습이 끝났어요' : '✅ 업데이트가 끝났어요 (새 Claude 대화는 없어요)', (p.items || []).length);
  }
}


/* ---------- 내 PC AI(Ollama) 중계: 대시보드 → 확장 → localhost ---------- */
/* Ollama는 chrome-extension:// 출처의 POST를 403으로 막아요 → 확장 프로그램 자신(탭이 아닌 요청)이 내 PC AI로 보내는 요청에서만 Origin을 빼요 */
(async function setupOllamaOrigin() {
  try {
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [9001, 9002],
      addRules: ['127.0.0.1', 'localhost'].map((h, i) => ({
        id: 9001 + i, priority: 1,
        action: { type: 'modifyHeaders', requestHeaders: [{ header: 'origin', operation: 'remove' }] },
        condition: { urlFilter: '|http://' + h, resourceTypes: ['xmlhttprequest', 'other'], tabIds: [-1] }
      }))
    });
  } catch (e) { }
})();
function okHost(h) { return /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(String(h || '')); }
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'ai') { return; }
  const ctl = new AbortController();
  port.onDisconnect.addListener(() => ctl.abort());
  port.onMessage.addListener(async (m) => {
    if (m.op !== 'chat') { return; }
    try {
      if (!okHost(m.host)) { throw new Error('허용되지 않은 주소예요'); }
      const r = await fetch(m.host + '/api/chat', { method: 'POST', body: JSON.stringify(m.body), signal: ctl.signal });
      if (!r.ok || !r.body) { throw new Error('AI 응답 오류 (' + r.status + ') — 모델 이름을 확인해 주세요'); }
      const rd = r.body.getReader(), dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const x = await rd.read();
        if (x.done) { break; }
        buf += dec.decode(x.value, { stream: true });
        const lines = buf.split('\n'); buf = lines.pop();
        for (const l of lines) { if (l.trim()) { try { port.postMessage({ t: 'ai-chunk', d: JSON.parse(l) }); } catch (e) { } } }
      }
      if (buf.trim()) { try { port.postMessage({ t: 'ai-chunk', d: JSON.parse(buf) }); } catch (e) { } }
      port.postMessage({ t: 'ai-done' });
    } catch (e) {
      try { port.postMessage({ t: 'ai-error', d: e.name === 'AbortError' ? '중단했어요' : (e.message || '연결 오류') }); } catch (x) { }
    }
  });
});

chrome.runtime.onMessage.addListener((m, sender, send) => {
  (async () => {
    if (m.type === 'ai-tags') {
      try {
        if (!okHost(m.host)) { throw new Error('허용되지 않은 주소예요'); }
        const r = await fetch(m.host + '/api/tags');
        send(await r.json());
      } catch (e) { send({ error: String((e && e.message) || e) }); }
      return;
    }
    if (m.type === 'hello') {
      if (sender.tab) { const d = await dashTabs(); d[sender.tab.id] = sender.tab.windowId; await S.set({ dash: d }); await L.set({ dashUrl: (sender.tab.url || '').split('#')[0] }); }
      send({ ok: 1 });
    } else if (m.type === 'peek') {
      const st = await L.get(['cyberCache', 'dashState']);
      send(dueList(st.cyberCache, st.dashState, new Date()).slice(0, 4).map((x) => ({ title: x.title, course: x.course, due: x.due.toISOString() })));
    } else if (m.type === 'takeOutbox') {
      const { outbox = [] } = await L.get('outbox');
      await L.set({ outbox: [] });
      send(outbox);
    } else if (m.type === 'dash') {
      if (m.cmd === 'state') { await L.set({ dashState: m.payload || {} }); await checkDeadlines(); send({ ok: 1 }); return; }
      await startSync(m.cmd, m.auto); send({ ok: 1 });
    } else if (m.type === 'result') {
      await onResult(m.payload, sender.tab && sender.tab.id); send({ ok: 1 });
    }
  })();
  return true;
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const d = await dashTabs();
  if (d[tabId]) { delete d[tabId]; await S.set({ dash: d }); }
  const job = await getJob();
  if (job && job.tabId === tabId) {
    job.tabId = null; await setJob(job);
    await skipStep(job, NAMES[job.cur] + ' 창이 닫혀서 건너뛰었어요.');
  }
});
chrome.alarms.onAlarm.addListener(async (a) => {
  if (a.name === 'deadline') { await checkDeadlines(); return; }
  if (a.name !== 'watch') { return; }
  const job = await getJob();
  if (!job) { await chrome.alarms.clear('watch'); return; }
  const age = Date.now() - (job.stageT || job.t);
  if (job.stage === 'login' ? age > LOGIN_MAX : age > JOB_MAX) { await skipStep(job, NAMES[job.cur] + ' 확인이 너무 오래 걸려 건너뛰었어요.'); }
});
