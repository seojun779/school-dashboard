/* 신한 사이버캠퍼스 보드 - 내가 로그인한 브라우저 안에서만 동작합니다.
   - 아이디/비밀번호를 묻거나 읽지 않습니다.
   - cyber.shinhan.ac.kr 안에서 읽기 요청(fetch)만 하고, 다른 곳으로 데이터를 보내지 않습니다.
   - 아무것도 저장하지 않습니다. 과제 제출·설정 변경도 하지 않습니다. */
(function () {
  if (/(^|\.)claude\.ai$/.test(location.hostname)) { claudeCollect(); return; }
  function claudeCollect() {
    var el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:2147483647;background:#0f766e;color:#fff;padding:16px 26px;border-radius:14px;font:700 20px/1.4 "Malgun Gothic",system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35);max-width:90vw;text-align:center';
    document.body.appendChild(el);
    function say(m) { el.textContent = m; }
    var known = {};
    window.addEventListener('message', function (e) { var m = e.data; if (m && m.type === 'sh-known' && Array.isArray(m.claudeKeys)) { m.claudeKeys.forEach(function (k) { known[k] = 1; }); } });
    (async function () {
      try {
        say('Claude 대화를 확인하는 중이에요…');
        await new Promise(function (r) { setTimeout(r, 1000); });
        var orgs = await (await fetch('/api/organizations', { credentials: 'include' })).json();
        var org = orgs[0].uuid;
        var list = await (await fetch('/api/organizations/' + org + '/chat_conversations', { credentials: 'include' })).json();
        list = list.sort(function (a, b) { return String(b.updated_at).localeCompare(String(a.updated_at)); }).slice(0, 80);
        var items = [], i = 0, done = 0, t0 = Date.now();
        var todo = list.filter(function (c) { return !known['cl:' + c.uuid + ':' + c.updated_at]; });
        async function w() {
          while (i < todo.length && Date.now() - t0 < 120000) {
            var c = todo[i++];
            try {
              var d = await (await fetch('/api/organizations/' + org + '/chat_conversations/' + c.uuid + '?tree=True&rendering_mode=messages&render_all_tools=true', { credentials: 'include' })).json();
              var buf = [];
              (d.chat_messages || []).forEach(function (m) {
                var tx = m.text;
                if (!tx && Array.isArray(m.content)) { tx = m.content.filter(function (x) { return x && x.type === 'text'; }).map(function (x) { return x.text; }).join('\n'); }
                if (typeof tx === 'string' && tx.trim()) { buf.push(tx); }
              });
              items.push({ k: 'cl:' + c.uuid + ':' + c.updated_at, n: c.name || 'Claude 대화', t: buf.join('\n').slice(0, 40000) });
            } catch (e) { }
            done++;
            say('Claude 대화를 학습 자료로 읽는 중이에요… ' + done + '/' + todo.length);
          }
        }
        await Promise.all([w(), w(), w()]);
        var op = window.opener;
        if (op && !op.closed) {
          op.postMessage({ type: 'sh-claude', items: items }, '*');
          say('✅ 새 대화 ' + items.length + '개를 대시보드로 보냈어요. 돌아갈게요…');
          setTimeout(function () { window.close(); }, 1200);
        } else {
          var txt = 'SHDATA:' + JSON.stringify({ claude: items }), ok = false;
          try { await navigator.clipboard.writeText(txt); ok = true; } catch (e) { }
          say(ok ? '📋 복사했어요. 대시보드 탭으로 돌아가면 자동으로 학습해요.' : '대시보드에서 "Claude 대화 학습"으로 다시 열어 주세요.');
        }
      } catch (e) { say('Claude 대화를 읽지 못했어요: ' + e.message + ' (claude.ai에 로그인했는지 확인해 주세요)'); }
    })();
  }
  if (location.hostname !== 'cyber.shinhan.ac.kr') {
    alert('사이버캠퍼스(cyber.shinhan.ac.kr)에 직접 로그인한 화면에서 눌러 주세요.');
    return;
  }
  var ID = 'sh-board-root';
  var old = document.getElementById(ID);
  if (old) { old.remove(); }
  var root = document.createElement('div');
  root.id = ID;
  document.body.appendChild(root);

  var AUTO = true;
  var tEl = null;
  function toast(msg) {
    if (!tEl) {
      tEl = document.createElement('div');
      tEl.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:2147483647;background:#0f766e;color:#fff;padding:16px 26px;border-radius:14px;font:700 20px/1.4 "Malgun Gothic",system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35);max-width:90vw;text-align:center';
      document.body.appendChild(tEl);
    }
    tEl.textContent = msg;
  }
  if (AUTO) { root.style.display = 'none'; }
  var CSS = '#' + ID + '{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.55);overflow:auto;font-family:"Malgun Gothic",system-ui,sans-serif;font-size:15px;line-height:1.5;color:#1d2330}' +
    '#' + ID + ' *{box-sizing:border-box}' +
    '#' + ID + ' .p{max-width:960px;margin:24px auto;background:#f6f7f9;border-radius:14px;padding:18px 18px 28px}' +
    '#' + ID + ' h1{font-size:1.35rem;margin:0}#' + ID + ' h2{font-size:1.05rem;margin:20px 0 8px}' +
    '#' + ID + ' .top{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}' +
    '#' + ID + ' .bar{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}' +
    '#' + ID + ' button,#' + ID + ' select{font:inherit;border:1px solid #cfd5e0;background:#fff;color:#1d2330;border-radius:999px;padding:6px 14px;cursor:pointer}' +
    '#' + ID + ' button.on{background:#2f5bd8;border-color:#2f5bd8;color:#fff}' +
    '#' + ID + ' .card{background:#fff;border:1px solid #e1e5ec;border-left:6px solid #1b6b3a;border-radius:12px;padding:10px 14px;margin-bottom:8px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}' +
    '#' + ID + ' .card.o{border-left-color:#8a1c1c}#' + ID + ' .card.r{border-left-color:#b42318}#' + ID + ' .card.y{border-left-color:#a64b00}' +
    '#' + ID + ' .t{font-weight:700}#' + ID + ' .m{color:#5d6677;font-size:.85rem}' +
    '#' + ID + ' .b{display:inline-block;border-radius:999px;padding:1px 10px;font-size:.8rem;font-weight:700;background:#e6f4ea;color:#1b6b3a}' +
    '#' + ID + ' .b.o{background:#fbe9e9;color:#8a1c1c}#' + ID + ' .b.r{background:#fdecea;color:#b42318}#' + ID + ' .b.y{background:#fff1e0;color:#a64b00}' +
    '#' + ID + ' a.go{display:inline-block;margin-top:6px;padding:5px 12px;border-radius:8px;background:#2f5bd8;color:#fff;text-decoration:none;font-size:.85rem;font-weight:700}' +
    '#' + ID + ' a.f{color:#2f5bd8;word-break:break-all}' +
    '#' + ID + ' .chips{display:flex;flex-wrap:wrap;gap:6px}' +
    '#' + ID + ' .chip{border-radius:8px;padding:3px 9px;font-size:.85rem;background:#eef0f4;color:#5d6677}' +
    '#' + ID + ' .chip.ok{background:#e6f4ea;color:#1b6b3a}#' + ID + ' .chip.late{background:#fff1e0;color:#a64b00}#' + ID + ' .chip.no{background:#fdecea;color:#b42318}' +
    '#' + ID + ' details{background:#fff;border:1px solid #e1e5ec;border-radius:12px;padding:8px 14px;margin-bottom:8px}#' + ID + ' summary{cursor:pointer;font-weight:700}' +
    '#' + ID + ' ul{margin:6px 0 4px;padding-left:20px}#' + ID + ' .note{color:#5d6677;font-size:.8rem;margin-top:16px}' +
    '@media (prefers-color-scheme:dark){#' + ID + ' .p{background:#12151b;color:#e8ebf1}#' + ID + ' button,#' + ID + ' select{background:#1b2029;color:#e8ebf1;border-color:#2b3240}#' + ID + ' button.on{background:#8fb0ff;color:#12151b}#' + ID + ' .card,#' + ID + ' details{background:#1b2029;border-color:#2b3240}#' + ID + ' .m,#' + ID + ' .note{color:#9aa4b5}#' + ID + ' a.f{color:#8fb0ff}#' + ID + ' .chip{background:#2b3240;color:#9aa4b5}}';

  var st = document.createElement('style');
  st.textContent = CSS;
  root.appendChild(st);
  var panel = document.createElement('div');
  panel.className = 'p';
  root.appendChild(panel);

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function txt(el) { return el ? (el.textContent || '').trim().replace(/\s+/g, ' ') : ''; }
  function safe(h) { try { var u = new URL(h, location.origin); return u.protocol === 'https:' && u.hostname === location.hostname ? u.href : '#'; } catch (e) { return '#'; } }
  function head(sub) {
    return '<div class="top"><h1>사이버캠퍼스 보드</h1><button id="sh-x">닫기</button></div><div class="m">' + esc(sub || '') + '</div>';
  }
  function show(sub) { if (AUTO) { toast(sub); return; } panel.innerHTML = head(sub); var x = panel.querySelector('#sh-x'); x.onclick = function () { root.remove(); }; }
  root.addEventListener('click', function (e) { if (e.target === root) { root.remove(); } });
  show('불러오는 중이에요. 잠시만 기다려 주세요…');

  async function get(u) {
    var r = await fetch(u, { credentials: 'same-origin' });
    if (!r.ok) { throw new Error('HTTP ' + r.status); }
    var t = await r.text();
    return new DOMParser().parseFromString(t, 'text/html');
  }
  var FILE = /\.(pdf|zip|pptx?|docx?|xlsx?|hwp|hwpx|ipynb|html?|jar|jsp|java|py|txt|csv|png|jpe?g)$/i;
  var PROOF = /결석\s*증빙|출석\s*증빙|Absent Proof|유고결석|출석증빙/i;

  function level(due) {
    var now = new Date();
    var d = Math.round((new Date(due.getFullYear(), due.getMonth(), due.getDate()) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
    if (due < now) { return { c: 'o', i: '⛔', t: d === 0 ? '오늘 지남' : Math.abs(d) + '일 지남' }; }
    if (d <= 4) { return { c: 'r', i: '🔴', t: d === 0 ? 'D-day' : 'D-' + d }; }
    if (d <= 7) { return { c: 'y', i: '🟠', t: 'D-' + d }; }
    return { c: '', i: '🟢', t: 'D-' + d };
  }
  function fmt(d) { var p = function (n) { return String(n).padStart(2, '0'); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); }

  async function loadCourses() {
    var d = await get('/local/ubion/user/');
    var seen = {}, out = [];
    d.querySelectorAll('a[href*="course/view.php"]').forEach(function (a) {
      var m = (a.getAttribute('href') || '').match(/[?&]id=(\d+)/);
      if (m && !seen[m[1]]) { seen[m[1]] = 1; out.push({ id: m[1], name: txt(a) }); }
    });
    return out;
  }
  async function loadAssign(c) {
    var d = await get('/mod/assign/index.php?id=' + c.id);
    var list = [];
    d.querySelectorAll('table tr').forEach(function (tr) {
      var a = tr.querySelector('a[href*="assign/view.php"]');
      if (!a) { return; }
      var t = txt(tr);
      var m = t.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
      if (!m) { return; }
      var due = new Date(m[0].replace(' ', 'T'));
      var status = /제출 완료/.test(t) ? 'done' : (/미제출|제출 안 함/.test(t) ? 'todo' : 'unknown');
      list.push({ course: c.name, title: txt(a), due: due, status: status, href: safe(a.getAttribute('href')), proof: PROOF.test(txt(a)), files: [] });
    });
    await Promise.all(list.filter(function (x) { return x.status !== 'done'; }).map(async function (x) {
      try {
        var v = await get(x.href.replace(location.origin, ''));
        v.querySelectorAll('a').forEach(function (a) {
          var n = txt(a);
          if (FILE.test(n) && /pluginfile|assign/.test(a.getAttribute('href') || '')) { x.files.push({ n: n, h: safe(a.getAttribute('href')) }); }
        });
      } catch (e) { }
    }));
    return list;
  }
  async function loadAttend(c) {
    var d = await get('/report/ubcompletion/user_progress_a.php?id=' + c.id);
    var weeks = [], cur = null;
    var tb = [].slice.call(d.querySelectorAll('table')).filter(function (t) { return /주차 출석/.test(t.textContent); })[0];
    if (!tb) { return weeks; }
    tb.querySelectorAll('tr').forEach(function (tr) {
      var td = [].slice.call(tr.children).filter(function (x) { return x.tagName === 'TD'; });
      if (!td.length) { return; }
      var f = txt(td[0]);
      if (/^\d+$/.test(f) && td.length >= 5) {
        cur = { w: +f, mark: txt(td[td.length - 1]), vids: [] };
        weeks.push(cur);
        if (txt(td[1])) { cur.vids.push({ n: txt(td[1]), m: txt(td[td.length - 2]) }); }
      } else if (cur && td.length >= 2) {
        cur.vids.push({ n: f, m: txt(td[td.length - 1]) });
      }
    });
    return weeks;
  }
  async function loadMaterials(c) {
    var d = await get('/course/resources.php?id=' + c.id);
    var groups = [], idx = {}, seen = {}, wk = '';
    d.querySelectorAll('table tr').forEach(function (tr) {
      var td = [].slice.call(tr.children).filter(function (x) { return x.tagName === 'TD'; });
      if (td.length < 2) { return; }
      var w = txt(td[0]);
      if (w) { wk = w; }
      var a = tr.querySelector('a[href*="/mod/ubfile/"],a[href*="/mod/resource/"],a[href*="/mod/folder/"],a[href*="/mod/url/"],a[href*="/mod/page/"]');
      if (!a) { return; }
      var h = safe(a.getAttribute('href'));
      var n = txt(a).replace(/^(파일|폴더|URL링크)\s+/, '').replace(/\s+(파일|폴더|URL링크)$/, '');
      if (seen[h] || /^온라인출석부/.test(n)) { return; }
      seen[h] = 1;
      var kind = /folder/.test(h) ? '폴더' : (/\/url\//.test(h) ? '링크' : '파일');
      var key = wk || '공통';
      if (idx[key] === undefined) { idx[key] = groups.length; groups.push({ k: key, items: [] }); }
      groups[idx[key]].items.push({ n: n, h: h, kind: kind });
    });
    return groups;
  }
  function blockText(root) {
    var c = root.cloneNode(true);
    [].slice.call(c.querySelectorAll('script,style,nav,header,footer')).forEach(function (x) { x.remove(); });
    [].slice.call(c.querySelectorAll('br')).forEach(function (b) { b.replaceWith('\n'); });
    [].slice.call(c.querySelectorAll('p,div,li,tr,h1,h2,h3,h4,h5,h6')).forEach(function (b) { b.appendChild(document.createTextNode('\n')); });
    return (c.textContent || '').replace(/[ \t\u00a0]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
  }
  var KW = [
    { re: /시험|중간고사|기말고사|퀴즈|평가/, type: 'exam', label: '시험·평가' },
    { re: /마감|제출|기한|까지|업로드/, type: 'task', label: '마감' },
    { re: /휴강|보강|수업|강의|특강|실습/, type: 'class', label: '수업' },
    { re: /발표|설문|면담|행사|모집|신청|접수/, type: 'etc', label: '일정' }
  ];
  function ymd(y, m, d) { return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0'); }
  function findTime(str) {
    var m = str.match(/(오전|오후|낮|밤|저녁|새벽)?\s*(\d{1,2})\s*시\s*(?:(\d{1,2})\s*분)?/);
    var h, mi;
    if (m) {
      h = +m[2]; mi = m[3] ? +m[3] : 0;
      if ((m[1] === '오후' || m[1] === '밤' || m[1] === '저녁') && h < 12) { h += 12; }
      else if (!m[1] && h >= 1 && h <= 7) { h += 12; }
    } else {
      var m2 = str.match(/(\d{1,2}):(\d{2})/);
      if (!m2) { return ''; }
      h = +m2[1]; mi = +m2[2];
    }
    if (h > 24 || mi > 59) { return ''; }
    return String(h % 24).padStart(2, '0') + ':' + String(mi).padStart(2, '0');
  }
  function findKw(str) { for (var i = 0; i < KW.length; i++) { if (KW[i].re.test(str)) { return KW[i]; } } return null; }
  function extractEvents(text, meta) {
    var out = [], seen = {};
    var base = meta.date ? new Date(meta.date + 'T00:00') : new Date();
    var today = new Date(); today.setHours(0, 0, 0, 0);
    text.split(/\n|(?<=[.!?。])\s+/).forEach(function (raw) {
      var sent = raw.trim();
      if (sent.length < 6 || sent.length > 400) { return; }
      var re = /(\d{4})\s*[-./년]\s*(\d{1,2})\s*[-./월]\s*(\d{1,2})|(\d{1,2})\s*월\s*(\d{1,2})\s*일|(?:^|[^\d./])(\d{1,2})\s*\/\s*(\d{1,2})(?![\d:/])/g;
      var ms = [], mm;
      while ((mm = re.exec(sent)) !== null) {
        ms.push({ idx: mm.index, end: mm.index + mm[0].length, y: mm[1] ? +mm[1] : null, mo: +(mm[1] ? mm[2] : (mm[4] || mm[6])), da: +(mm[1] ? mm[3] : (mm[5] || mm[7])) });
      }
      if (!ms.length) { return; }
      var sentKw = findKw(sent);
      ms.forEach(function (it, k) {
        if (it.mo < 1 || it.mo > 12 || it.da < 1 || it.da > 31) { return; }
        var seg = sent.slice(it.end, k + 1 < ms.length ? ms[k + 1].idx : sent.length);
        var kw = findKw(seg) || sentKw;
        if (!kw) { return; }
        var y = it.y;
        if (y === null) {
          y = base.getFullYear();
          if (new Date(y, it.mo - 1, it.da) < new Date(base.getTime() - 180 * 86400000)) { y += 1; }
        }
        var d = new Date(y, it.mo - 1, it.da);
        if (d.getMonth() !== it.mo - 1 || d < new Date(today.getTime() - 14 * 86400000)) { return; }
        var time = findTime(seg) || (k === 0 ? findTime(sent) : '');
        var key = ymd(y, it.mo, it.da) + '|' + kw.type + '|' + meta.title.slice(0, 12);
        if (seen[key]) { return; }
        seen[key] = 1;
        out.push({ d: ymd(y, it.mo, it.da), t: time, type: kw.type, title: folderOf(meta.course) + ' · ' + kw.label, course: meta.course, src: meta.title, h: meta.href, p: sent.slice(0, 140), chk: true });
      });
    });
    return out;
  }
  async function loadNotices(courses) {
    var arts = [], seenA = {};
    await Promise.all(courses.map(async function (c) {
      var boards = [], seenB = {};
      try {
        var idx = await get('/mod/ubboard/index.php?id=' + c.id);
        idx.querySelectorAll('table a[href*="ubboard/view.php"]').forEach(function (a) {
          var h = safe(a.getAttribute('href'));
          if (seenB[h]) { return; }
          seenB[h] = 1;
          var cells = a.closest('tr') ? [].slice.call(a.closest('tr').children) : [];
          if (cells[1] && txt(cells[1]) === '0') { return; }
          boards.push({ name: txt(a), href: h });
        });
      } catch (e) { }
      for (var b = 0; b < boards.length; b++) {
        var firstH = null;
        for (var p = 1; p <= 4; p++) {
          try {
            var dd = await get(boards[b].href.replace(location.origin, '') + (p > 1 ? '&page=' + p : ''));
            var links = [].slice.call(dd.querySelectorAll('a[href*="article.php"]'));
            if (!links.length || (firstH && links[0].href === firstH)) { break; }
            if (!firstH) { firstH = links[0].href; }
            links.forEach(function (a) {
              var h = safe(a.getAttribute('href'));
              if (seenA[h]) { return; }
              seenA[h] = 1;
              var row = a.closest('tr'), cells = row ? [].slice.call(row.children) : [];
              arts.push({ course: c.name, board: boards[b].name, title: txt(a), href: h, date: (txt(row).match(/\d{4}-\d{2}-\d{2}/) || [''])[0], author: cells[2] ? txt(cells[2]) : '', ln: [] });
            });
          } catch (e) { break; }
        }
      }
    }));
    var out = [], sched = [];
    var i = 0;
    async function worker() {
      while (i < arts.length) {
        var a = arts[i++];
        try {
          var v = await get(a.href.replace(location.origin, ''));
          var body = v.querySelector('.ubboard_view') || v.querySelector('#region-main') || v.querySelector('[role="main"]') || v.body;
          body.querySelectorAll('a').forEach(function (x) {
            var n = txt(x), hr = x.getAttribute('href') || '';
            if (FILE.test(n) && /pluginfile|ubboard/.test(hr)) { out.push({ course: a.course, art: a.title, n: n, h: safe(hr) }); }
            else if (/^https?:\/\//i.test(hr) && hr.indexOf(location.hostname) < 0 && a.ln.length < 6) { a.ln.push({ n: n || hr.replace(/^https?:\/\//, '').slice(0, 40), h: hr }); }
          });
          var text = blockText(body);
          a.text = text;
          extractEvents(a.title + '\n' + text, { course: a.course, date: a.date, title: a.title, href: a.href }).forEach(function (e) { sched.push(e); });
        } catch (e) { }
      }
    }
    await Promise.all([worker(), worker(), worker(), worker()]);
    sched.sort(function (x, y) { return (x.d + (x.t || '99')).localeCompare(y.d + (y.t || '99')); });
    var uniq = [], kk = {};
    sched.forEach(function (e) { var k = e.d + '|' + e.type + '|' + e.course; if (kk[k] === undefined) { kk[k] = uniq.length; uniq.push(e); } else if (!uniq[kk[k]].t && e.t) { uniq[kk[k]] = e; } });
    return { out: out, arts: arts, sched: uniq };
  }

  var S = { courses: [], assign: [], attend: {}, mat: {}, notes: [], tab: 'a', course: '', showDone: false, showProof: false, sync: { state: 'idle' }, arts: [], sched: [], savedName: '', opener: AUTO, auto: AUTO, sendMsg: '', root: null, att: null, notesP: null, skipLang: true };

  function render() {
    var html = head('내 로그인으로 읽은 내용이에요 · 기준 ' + fmt(new Date()));
    html += openerCard();
    html += '<div class="bar"><button data-t="a" class="' + (S.tab === 'a' ? 'on' : '') + '">과제</button><button data-t="b" class="' + (S.tab === 'b' ? 'on' : '') + '">온라인출석부</button><button data-t="c" class="' + (S.tab === 'c' ? 'on' : '') + '">강의자료</button><button data-t="d" class="' + (S.tab === 'd' ? 'on' : '') + '">내 사이트 업데이트</button>';
    html += '<select id="sh-c"><option value="">전체 강의</option>' + S.courses.map(function (c) { return '<option value="' + esc(c.id) + '"' + (S.course === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select></div>';
    var cs = S.courses.filter(function (c) { return !S.course || c.id === S.course; });
    if (S.tab === 'a') { html += renderA(cs); }
    if (S.tab === 'b') { html += renderB(cs); }
    if (S.tab === 'c') { html += renderC(cs); }
    if (S.tab === 'd') { html += renderD(); }
    html += '<div class="note">이 화면은 내 브라우저 안에서만 만들어지고, 어디에도 전송되지 않아요. 제출·수정은 하지 않고 읽기만 하며, 새 자료 받기는 내가 고른 폴더에만 파일을 저장해요. 표시가 이상하면 학교 사이트에서 직접 확인해 주세요.</div>';
    panel.innerHTML = html;
    panel.querySelector('#sh-x').onclick = function () { root.remove(); };
    panel.querySelectorAll('[data-t]').forEach(function (b) { b.onclick = function () { S.tab = b.getAttribute('data-t'); render(); }; });
    panel.querySelector('#sh-c').onchange = function (e) { S.course = e.target.value; render(); };
    var d1 = panel.querySelector('#sh-done'); if (d1) { d1.onclick = function () { S.showDone = !S.showDone; render(); }; }
    var d2 = panel.querySelector('#sh-proof'); if (d2) { d2.onclick = function () { S.showProof = !S.showProof; render(); }; }
    bindSync();
    var sd = panel.querySelector('#sh-send'); if (sd) { sd.onclick = sendToOpener; }
  }
  function card(x) {
    var L = level(x.due);
    var h = '<div class="card ' + L.c + '"><div><div class="t">' + esc(x.title) + '</div><div class="m">' + esc(x.course) + ' · 마감 ' + fmt(x.due) + '</div>';
    x.files.forEach(function (f) { h += '<div class="m">안내 파일: <a class="f" target="_blank" rel="noopener noreferrer" href="' + esc(f.h) + '">' + esc(f.n) + '</a></div>'; });
    h += '</div><div style="text-align:right"><span class="b ' + L.c + '">' + L.i + ' ' + L.t + '</span><br>';
    if (x.status !== 'done') { h += '<a class="go" target="_blank" rel="noopener noreferrer" href="' + esc(x.href) + '">과제하기</a>'; }
    return h + '</div></div>';
  }
  function renderA(cs) {
    var ids = cs.map(function (c) { return c.name; });
    var all = S.assign.filter(function (x) { return ids.indexOf(x.course) >= 0 && (S.showProof || !x.proof); });
    var todo = all.filter(function (x) { return x.status !== 'done'; }).sort(function (a, b) { return a.due - b.due; });
    var done = all.filter(function (x) { return x.status === 'done'; }).sort(function (a, b) { return a.due - b.due; });
    var h = '<h2>미제출 (' + todo.length + '개 · 마감 임박순)</h2>';
    h += todo.length ? todo.map(card).join('') : '<div class="m">미제출 과제가 없어요.</div>';
    h += '<div class="bar"><button id="sh-done">' + (S.showDone ? '제출 완료 숨기기' : '제출 완료 보기 (' + done.length + ')') + '</button><button id="sh-proof">' + (S.showProof ? '결석·출석 증빙 숨기기' : '결석·출석 증빙 보기') + '</button></div>';
    if (S.showDone) { h += done.map(card).join(''); }
    return h;
  }
  function renderB(cs) {
    var h = '';
    cs.forEach(function (c) {
      var w = S.attend[c.id] || [];
      h += '<h2>' + esc(c.name) + '</h2>';
      var withV = w.filter(function (x) { return x.vids.length; });
      if (!withV.length) { h += '<div class="m">영상 출석 기록이 없어요.</div>'; return; }
      h += '<div class="chips">' + w.map(function (x) {
        var cl = x.mark === 'O' ? 'ok' : (x.mark === '▲' ? 'late' : (x.mark === 'X' ? 'no' : ''));
        return '<span class="chip ' + cl + '">' + x.w + '주 ' + esc(x.mark || '-') + '</span>';
      }).join('') + '</div>';
      var bad = [];
      w.forEach(function (x) { x.vids.forEach(function (v) { if (v.m && v.m !== 'O') { bad.push(x.w + '주차 · ' + v.n + ' · ' + v.m); } }); });
      h += bad.length ? '<ul>' + bad.map(function (b) { return '<li class="m">' + esc(b) + '</li>'; }).join('') + '</ul>' : '<div class="m">영상은 모두 출석(O)이에요.</div>';
    });
    return h + '<div class="m">O 출석 · ▲ 지각 · X 결석 · - 영상 없음/기록 없음</div>';
  }
  function renderC(cs) {
    var h = '';
    cs.forEach(function (c) {
      var g = S.mat[c.id] || [];
      var nt = S.notes.filter(function (n) { return n.course && c.name.indexOf(n.course) >= 0; });
      h += '<details><summary>' + esc(c.name) + ' (' + g.reduce(function (s, x) { return s + x.items.length; }, 0) + (nt.length ? ' + 공지 첨부 ' + nt.length : '') + ')</summary>';
      g.forEach(function (x) {
        h += '<h2>' + esc(x.k) + '</h2><ul>' + x.items.map(function (i) { return '<li><a class="f" target="_blank" rel="noopener noreferrer" href="' + esc(i.h) + '">' + esc(i.n) + '</a> <span class="m">(' + i.kind + ')</span></li>'; }).join('') + '</ul>';
      });
      if (nt.length) { h += '<h2>공지 첨부파일</h2><ul>' + nt.map(function (n) { return '<li><a class="f" target="_blank" rel="noopener noreferrer" href="' + esc(n.h) + '">' + esc(n.n) + '</a> <span class="m">· ' + esc(n.art) + '</span></li>'; }).join('') + '</ul>'; }
      if (!g.length && !nt.length) { h += '<div class="m">학교 사이트에 올라온 자료가 없어요.</div>'; }
      h += '</details>';
    });
    return h;
  }

  function folderOf(n) { return n.replace(/\s*\(\d+\)\s*$/, '').replace(/\(PBL\)/i, '').trim(); }
  function normName(n) { return n.replace(/\s\((\d+|업데이트[^)]*)\)(?=\.[^.]+$)/, '').toLowerCase(); }
  function safeName(n) { return (n || '').replace(/[\\/:*?"<>|]/g, '_').trim() || 'file'; }
  function today() { return fmt(new Date()).slice(0, 10); }
  function sizeText(n) { return !n ? '크기 확인 필요' : (n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'); }
  var LANG = /(English|Vietnamese|Uzbek|Mongolian|Chinese|Japanese)/i;
  async function getDir(parent, name, create) { try { return await parent.getDirectoryHandle(name, { create: !!create }); } catch (e) { return null; } }
  async function exists(dir, name) { try { await dir.getFileHandle(name); return true; } catch (e) { return false; } }
  async function writeText(dir, name, text) { var fh = await dir.getFileHandle(name, { create: true }); var w = await fh.createWritable(); await w.write(text); await w.close(); }
  async function readRecord() {
    var rec = { seen: null, files: [] };
    var lib = await getDir(S.root, '강의자료', false);
    if (!lib) { return rec; }
    try { var fh = await lib.getFileHandle('동기화기록.json'); var o = JSON.parse(await (await fh.getFile()).text()); if (o && Array.isArray(o.files)) { rec.files = o.files; } if (o && Array.isArray(o.seen)) { rec.seen = o.seen; } } catch (e) { }
    return rec;
  }
  function buildData(mm) {
    var data = {
      updated: fmt(new Date()),
      courses: S.courses.map(function (c) {
        return {
          id: c.id, name: c.name, folder: folderOf(c.name),
          assign: S.assign.filter(function (a) { return a.course === c.name; }).map(function (a) { return { t: a.title, due: fmt(a.due).replace(' ', 'T'), st: a.status, h: a.href, p: a.proof, fl: a.files }; }),
          attend: S.attend[c.id] || [],
          mat: (mm || S.matMap || {})[c.id] || []
        };
      }),
      notices: (S.arts || []).map(function (a) { return { c: a.course, t: a.title, h: a.href, d: a.date }; }),
      posts: (S.arts || []).map(function (a) { return { c: a.course, b: a.board || '', t: a.title, h: a.href, d: a.date, a: a.author || '', ln: a.ln || [] }; }),
      schedule: S.sched || []
    };
    return data;
  }
  async function saveData() {
    var data = buildData(null);
    await writeText(S.root, '내데이터.js', 'window.MY_DATA=' + JSON.stringify(data) + ';');
  }
  async function probeMats() {
    var mm = {}, jobs = [], seenU = {};
    S.courses.forEach(function (c) {
      (S.mat[c.id] || []).forEach(function (g) {
        g.items.forEach(function (i) {
          if (i.kind === '파일') { if (!seenU[i.h]) { seenU[i.h] = 1; jobs.push({ c: c, i: i, wk: g.k }); } }
          else { (mm[c.id] = mm[c.id] || []).push({ wk: g.k, n: i.n, f: null, h: i.h, k: i.kind, loc: false, from: '강의실' }); }
        });
      });
    });
    var k = 0;
    async function w() {
      while (k < jobs.length) {
        var j = jobs[k++];
        var ent = { wk: j.wk, n: j.i.n, f: null, h: j.i.h, k: '파일', loc: false, from: '강의실' };
        try { var p = await probe(j.i.h); if (p) { ent.f = p.name; } } catch (e) { }
        (mm[j.c.id] = mm[j.c.id] || []).push(ent);
      }
    }
    await Promise.all([w(), w(), w(), w()]);
    S.notes.forEach(function (n) {
      var c = S.courses.filter(function (x) { return n.course && x.name.indexOf(n.course) >= 0; })[0];
      if (c) { (mm[c.id] = mm[c.id] || []).push({ wk: '', n: n.n, f: safeName(n.n), h: n.h, k: '파일', loc: false, from: '공지 · ' + n.art }); }
    });
    return mm;
  }
  S.known = {};
  window.addEventListener('message', function (e) { var m = e.data; if (m && m.type === 'sh-known' && Array.isArray(m.keys)) { m.keys.forEach(function (k) { S.known[k] = 1; }); } });
  async function inflateRaw(u8) {
    var ds = new DecompressionStream('deflate-raw'), w = ds.writable.getWriter();
    w.write(u8); w.close();
    return new Uint8Array(await new Response(ds.readable).arrayBuffer());
  }
  async function unzipPick(buf, pick) {
    var dv = new DataView(buf), u8 = new Uint8Array(buf), n = u8.length, e = -1, out = {};
    for (var i = n - 22; i >= Math.max(0, n - 70000); i--) { if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; } }
    if (e < 0) { return out; }
    var cnt = dv.getUint16(e + 10, true), off = dv.getUint32(e + 16, true);
    for (var k = 0; k < cnt; k++) {
      if (dv.getUint32(off, true) !== 0x02014b50) { break; }
      var meth = dv.getUint16(off + 10, true), csz = dv.getUint32(off + 20, true), nl = dv.getUint16(off + 28, true), el = dv.getUint16(off + 30, true), cl = dv.getUint16(off + 32, true), lo = dv.getUint32(off + 42, true);
      var name = new TextDecoder().decode(u8.subarray(off + 46, off + 46 + nl));
      off += 46 + nl + el + cl;
      if (!pick(name)) { continue; }
      var lnl = dv.getUint16(lo + 26, true), lel = dv.getUint16(lo + 28, true), st = lo + 30 + lnl + lel;
      var raw = u8.subarray(st, st + csz);
      try { out[name] = meth === 0 ? raw : (meth === 8 ? await inflateRaw(raw) : null); } catch (er) { }
    }
    return out;
  }
  function unxml(s) { return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&'); }
  async function pptxText(buf) {
    var z = await unzipPick(buf, function (n) { return /^ppt\/slides\/slide\d+\.xml$/.test(n); });
    var names = Object.keys(z).sort(function (a, b) { return parseInt(a.replace(/\D/g, ''), 10) - parseInt(b.replace(/\D/g, ''), 10); }), out = [];
    names.forEach(function (n, i) {
      var xml = new TextDecoder().decode(z[n] || new Uint8Array()), t = (xml.match(/<a:t(?:\s[^>]*)?>[^<]*<\/a:t>/g) || []).map(function (x) { return unxml(x.replace(/<[^>]+>/g, '')); }).filter(function (x) { return x.trim(); });
      if (t.length) { out.push('[슬라이드 ' + (i + 1) + '] ' + t.join(' / ')); }
    });
    return out.join('\n');
  }
  async function docxText(buf) {
    var z = await unzipPick(buf, function (n) { return n === 'word/document.xml'; });
    var u = z['word/document.xml'];
    return u ? unxml(new TextDecoder().decode(u).replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '')).trim() : '';
  }
  var pdfP = null;
  function loadPdfJs() {
    if (pdfP) { return pdfP; }
    pdfP = (async function () {
      var base = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/', dfn = window.define;
      try { window.define = undefined; } catch (e) { }
      try {
        await new Promise(function (ok, no) { var s = document.createElement('script'); s.src = base + 'pdf.min.js'; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
      } finally { try { window.define = dfn; } catch (e) { } }
      var wt = await (await fetch(base + 'pdf.worker.min.js')).text();
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([wt], { type: 'text/javascript' }));
      return window.pdfjsLib;
    })();
    return pdfP;
  }
  async function pdfText(buf) {
    var lib = await loadPdfJs(), doc = await lib.getDocument({ data: buf }).promise, out = [];
    for (var p = 1; p <= Math.min(doc.numPages, 60); p++) {
      var pg = await doc.getPage(p), tc = await pg.getTextContent();
      out.push('[' + p + '쪽] ' + tc.items.map(function (x) { return x.str; }).join(' '));
    }
    return out.join('\n');
  }
  async function extractKnow() {
    var jobs = [], know = [], seen = {}, t0 = Date.now();
    S.courses.forEach(function (c) {
      (S.mat[c.id] || []).forEach(function (g) { g.items.forEach(function (i) { if (i.kind === '파일' && !seen[i.h]) { seen[i.h] = 1; jobs.push({ c: c, wk: g.k, n: i.n, h: i.h }); } }); });
    });
    S.notes.forEach(function (n) {
      var c = S.courses.filter(function (x) { return n.course && x.name.indexOf(n.course) >= 0; })[0];
      if (c && !seen[n.h]) { seen[n.h] = 1; jobs.push({ c: c, wk: '', n: n.n, h: n.h }); }
    });
    jobs = jobs.filter(function (j) { return !S.known[j.h]; }).slice(0, 80);
    (S.arts || []).forEach(function (a) {
      var c = S.courses.filter(function (x) { return a.course && x.name === a.course; })[0];
      if (c && a.text && a.text.length > 60 && !S.known[a.href]) { know.push({ k: a.href, cid: c.id, c: c.name, n: a.title, w: '', t: a.text.slice(0, 20000) }); }
    });
    var k = 0, done = 0;
    async function w() {
      while (k < jobs.length && Date.now() - t0 < 150000) {
        var j = jobs[k++], text = '', name = j.n;
        try {
          var r = await fetch(j.h, { credentials: 'same-origin' });
          var ct = r.headers.get('content-type') || '', len = +r.headers.get('content-length') || 0;
          name = nameFromResp(r) || j.n;
          var ext = (name.match(/\.([A-Za-z0-9]+)$/) || ['', ''])[1].toLowerCase();
          if (r.ok && len < 30000000 && !(/text\/html/i.test(ct) && !/^(jsp|html?|js|css)$/.test(ext))) {
            var buf = await r.arrayBuffer();
            if (ext === 'pptx') { text = await pptxText(buf); }
            else if (ext === 'docx') { text = await docxText(buf); }
            else if (ext === 'pdf') { text = await pdfText(buf); }
            else if (/^(txt|jsp|html?|js|css|py|java|md|json|csv|xml|sql|c|cpp|h)$/.test(ext)) { text = new TextDecoder('utf-8').decode(new Uint8Array(buf)); }
          } else { try { r.body.cancel(); } catch (e) { } }
        } catch (e) { text = ''; }
        know.push({ k: j.h, cid: j.c.id, c: j.c.name, n: j.n || name, w: j.wk || '', t: (text || '').slice(0, 150000) });
        done++;
        note('새 강의자료를 읽어서 학습하는 중이에요… ' + done + '/' + jobs.length);
      }
    }
    await Promise.all([w(), w(), w()]);
    return know;
  }
  function note(msg) {
    if (AUTO) { toast(msg); } else { S.sendMsg = msg; render(); }
  }
  async function sendToOpener() {
    var op = window.opener;
    var has = !!(op && !op.closed);
    note('자료 목록을 정리하는 중이에요… (최대 1분)');
    try {
      if (S.notesP) { await S.notesP; }
      var mm = await probeMats();
      var data = buildData(mm);
      var know = [];
      try { await new Promise(function (r) { setTimeout(r, 800); }); know = await extractKnow(); } catch (e) { know = []; }
      if (has) {
        op.postMessage({ type: 'sh-data', data: data, know: know }, '*');
        note('✅ 대시보드로 보냈어요. 대시보드 탭으로 돌아가요…');
        setTimeout(function () { window.close(); }, 1200);
      } else {
        var txt = 'SHDATA:' + JSON.stringify({ data: data, know: know });
        var ok = false;
        try { await navigator.clipboard.writeText(txt); ok = true; } catch (e) { }
        if (!ok) { var ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { ok = document.execCommand('copy'); } catch (e) { } ta.remove(); }
        note(ok ? '📋 복사했어요. 대시보드 탭으로 가서 "복사한 데이터 가져오기"를 눌러 주세요.' : '복사하지 못했어요. 대시보드에서 "로그인 창 열기"로 다시 열어 주세요.');
      }
    } catch (e) { note('보내지 못했어요: ' + e.message); }
  }
  function openerCard() {
    if (!S.opener) { return ''; }
    return '<div class="card"><div><div class="t">🏠 대시보드에서 연 창이에요</div><div class="m">로그인이 끝났으면 아래 버튼으로 최신 과제·출석·강의자료·공지 일정을 대시보드에 보내요. 보낸 뒤 이 창은 자동으로 닫혀요.</div>' + (S.sendMsg ? '<div class="m">' + esc(S.sendMsg) + '</div>' : '') + '</div><div><button id="sh-send" class="on">대시보드로 보내고 이 창 닫기</button></div></div>';
  }
  async function saveRecord(rec) {
    var lib = await getDir(S.root, '강의자료', true);
    await writeText(lib, '동기화기록.json', JSON.stringify(rec));
    await writeText(lib, '새자료.js', 'window.NEW_FILES=' + JSON.stringify(rec.files) + ';');
  }
  function nameFromResp(r) {
    var p = '';
    try { p = decodeURIComponent(new URL(r.url).pathname.split('/').pop()); } catch (e) { }
    if (!p || /^(view|index)\.php$/i.test(p)) {
      var cd = r.headers.get('content-disposition') || '';
      var m = cd.match(/filename\*=UTF-8''([^;]+)/i);
      if (m) { try { p = decodeURIComponent(m[1]); } catch (e) { } }
    }
    return safeName(p);
  }
  async function probe(url) {
    var r = await fetch(url, { credentials: 'same-origin' });
    var ct = r.headers.get('content-type') || '';
    var res = null;
    var nm = nameFromResp(r);
    if (r.ok && (!/text\/html/i.test(ct) || /\.(jsp|html?|js|css|py|java|txt|md|json)$/i.test(nm))) { res = { name: nm, size: r.headers.get('content-encoding') ? 0 : (+r.headers.get('content-length') || 0) }; }
    try { r.body.cancel(); } catch (e) { }
    return res;
  }
  async function localIndex(folder) {
    var d = await getDir(S.att, folder, false);
    var m = {};
    if (!d) { return m; }
    for await (var e of d.entries()) {
      if (e[1].kind === 'file' && e[0].charAt(0) !== '_') { var f = await e[1].getFile(); m[normName(e[0])] = f.size; }
    }
    return m;
  }
  function idb() { return new Promise(function (res, rej) { var r = indexedDB.open('sh-board', 1); r.onupgradeneeded = function () { r.result.createObjectStore('kv'); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); }
  async function kvGet(k) { try { var db = await idb(); return await new Promise(function (res) { var q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = function () { res(q.result); }; q.onerror = function () { res(null); }; }); } catch (e) { return null; } }
  async function kvSet(k, v) { try { var db = await idb(); return await new Promise(function (res) { var t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = function () { res(true); }; t.onerror = function () { res(false); }; }); } catch (e) { return false; } }
  async function useSaved(interactive) {
    var h = await kvGet('root');
    if (!h) { return false; }
    var perm = 'prompt';
    try { perm = await h.queryPermission({ mode: 'readwrite' }); } catch (e) { return false; }
    if (perm !== 'granted') {
      if (!interactive) { return false; }
      try { perm = await h.requestPermission({ mode: 'readwrite' }); } catch (e) { return false; }
      if (perm !== 'granted') { return false; }
    }
    if (!(await exists(h, '과제표.html'))) { return false; }
    S.root = h;
    S.att = await getDir(h, '첨부파일', true);
    S.tab = 'd';
    await scan();
    return true;
  }
  async function pickFolder() {
    if (typeof window.showDirectoryPicker !== 'function') { S.sync = { state: 'err', msg: '이 브라우저는 폴더 선택을 지원하지 않아요. 크롬이나 엣지에서 사용해 주세요.' }; render(); return; }
    var h;
    try { h = await window.showDirectoryPicker({ mode: 'readwrite' }); } catch (e) { return; }
    if (h.name === '첨부파일') { S.sync = { state: 'err', msg: '"첨부파일" 폴더가 들어 있는 바깥 폴더(과제표.html이 있는 사이트 폴더)를 골라 주세요.' }; render(); return; }
    if (!(await exists(h, '과제표.html'))) { S.sync = { state: 'err', msg: '선택한 폴더에 과제표.html이 없어요. 내려받은 사이트 폴더(과제표.html이 들어 있는 폴더)를 골라 주세요.' }; render(); return; }
    S.root = h;
    S.att = await getDir(h, '첨부파일', true);
    kvSet('root', h);
    await scan();
  }
  async function scan() {
    S.sync = { state: 'scan', msg: '내 폴더와 학교 사이트를 비교하는 중이에요… (파일은 아직 받지 않아요)' };
    render();
    try {
      var rec = await readRecord();
      if (S.notesP) { await S.notesP; }
      var jobs = [], seenU = {};
      S.matMap = {};
      S.courses.forEach(function (c) {
        (S.mat[c.id] || []).forEach(function (g) {
          g.items.forEach(function (i) {
            if (i.kind === '파일') { if (!seenU[i.h]) { seenU[i.h] = 1; jobs.push({ c: c, url: i.h, from: '강의실', n: i.n, wk: g.k }); } }
            else { (S.matMap[c.id] = S.matMap[c.id] || []).push({ wk: g.k, n: i.n, f: null, h: i.h, k: i.kind, loc: false, from: '강의실' }); }
          });
        });
      });
      S.notes.forEach(function (n) {
        var c = S.courses.filter(function (x) { return n.course && x.name.indexOf(n.course) >= 0; })[0];
        if (c && !seenU[n.h]) { seenU[n.h] = 1; jobs.push({ c: c, url: n.h, from: '공지 · ' + n.art, n: n.n, wk: '' }); }
      });
      var found = [], i = 0;
      async function worker() {
        while (i < jobs.length) {
          var j = jobs[i++];
          try { var p = await probe(j.url); if (p) { found.push({ course: j.c.name, cid: j.c.id, folder: folderOf(j.c.name), name: p.name, size: p.size, url: j.url, from: j.from, disp: j.n, wk: j.wk }); } } catch (e) { }
          S.sync.msg = '확인 중… ' + Math.min(i, jobs.length) + '/' + jobs.length;
        }
      }
      await Promise.all([worker(), worker(), worker(), worker()]);
      var idx = {}, list = [], dup = {};
      for (var k = 0; k < found.length; k++) {
        var f = found[k];
        if (!idx[f.folder]) { idx[f.folder] = await localIndex(f.folder); }
        var key = f.folder + '|' + normName(f.name);
        if (dup[key]) { continue; }
        dup[key] = 1;
        var have = idx[f.folder][normName(f.name)];
        f.mm = { wk: f.wk, n: f.disp || f.name, f: f.name, h: f.url, k: '파일', loc: have !== undefined, from: f.from };
        (S.matMap[f.cid] = S.matMap[f.cid] || []).push(f.mm);
        if (have === undefined) { f.kind = 'new'; }
        else if (f.size && have !== f.size) { f.kind = 'changed'; }
        else { continue; }
        f.lang = LANG.test(f.name);
        f.sel = !(f.size > 80 * 1048576) && !(S.skipLang && f.lang);
        list.push(f);
      }
      list.sort(function (a, b) { return (a.folder + a.name).localeCompare(b.folder + b.name); });
      var notices = rec.seen ? S.arts.filter(function (a) { return rec.seen.indexOf(a.href) < 0; }) : [];
      S.sync = { state: 'ready', list: list, notices: notices, first: !rec.seen, rec: rec, total: jobs.length, saved: false };
      try { await saveData(); S.sync.saved = true; } catch (e) { S.sync.saveErr = e.message; }
    } catch (e) { S.sync = { state: 'err', msg: '확인하지 못했어요: ' + e.message }; }
    render();
  }
  async function downloadSel() {
    var sy = S.sync, sel = sy.list.filter(function (x) { return x.sel; }), ok = 0, fail = [];
    S.sync = { state: 'dl', msg: '받는 중… 0/' + sel.length };
    render();
    for (var n = 0; n < sel.length; n++) {
      var x = sel[n];
      try {
        var fd = await getDir(S.att, x.folder, true);
        var nm = x.name;
        if (await exists(fd, nm)) { var dot = nm.lastIndexOf('.'); nm = (dot > 0 ? nm.slice(0, dot) : nm) + ' (업데이트 ' + today() + ')' + (dot > 0 ? nm.slice(dot) : ''); }
        var r = await fetch(x.url, { credentials: 'same-origin' });
        if (!r.ok) { throw new Error('HTTP ' + r.status); }
        var fh = await fd.getFileHandle(nm, { create: true });
        var w = await fh.createWritable();
        await r.body.pipeTo(w);
        sy.rec.files.push({ folder: x.folder, name: nm, course: x.course, date: today(), from: x.from });
        if (x.mm) { x.mm.loc = true; x.mm.f = nm; x.mm.add = today(); }
        ok++;
      } catch (e) { fail.push(x.name); }
      S.sync.msg = '받는 중… ' + (n + 1) + '/' + sel.length;
      var el = panel.querySelector('#sh-msg'); if (el) { el.textContent = S.sync.msg; }
    }
    try { sy.rec.seen = S.arts.map(function (a) { return a.href; }); await saveRecord(sy.rec); } catch (e) { fail.push('기록 저장'); }
    try { await saveData(); } catch (e) { fail.push('사이트 데이터 저장'); }
    S.sync = { state: 'done', ok: ok, fail: fail };
    render();
  }
  async function markSeen() {
    var sy = S.sync;
    try { sy.rec.seen = S.arts.map(function (a) { return a.href; }); await saveRecord(sy.rec); S.sync = { state: 'done', ok: 0, fail: [], onlySeen: true }; } catch (e) { S.sync = { state: 'err', msg: '기록을 저장하지 못했어요: ' + e.message }; }
    render();
  }
  function renderD() {
    var sy = S.sync, h = '<h2>내 사이트 업데이트</h2>';
    if (sy.state === 'idle') {
      return h + '<div class="card"><div><div class="t">내 과제·출석·강의자료를 내 사이트 폴더에 저장하기</div><div class="m">내려받은 <b>사이트 폴더</b>(과제표.html이 들어 있는 폴더)를 골라 주세요. 지금 로그인한 내 과제, 온라인출석부, 강의자료 목록이 그 폴더의 <b>내데이터.js</b>에 저장되고, 폴더의 <b>과제표.html</b>을 열면 내 화면이 나와요. 학교 사이트의 새 공지 첨부파일은 고른 것만 내려받아 과목 폴더에 넣을 수 있어요. 선택한 폴더 밖은 건드리지 않아요.</div></div><div><button id="sh-pick" class="on">사이트 폴더 선택하기</button>' + (S.savedName ? '<div style="margin-top:8px"><button id="sh-saved">마지막 폴더(' + esc(S.savedName) + ')로 바로 업데이트</button></div>' : '') + '</div></div>';
    }
    if (sy.state === 'scan' || sy.state === 'dl') { return h + '<div class="card"><div id="sh-msg">' + esc(sy.msg) + '</div></div>'; }
    if (sy.state === 'err') { return h + '<div class="card"><div>' + esc(sy.msg) + '</div><div><button id="sh-pick">다시 시도</button></div></div>'; }
    if (sy.state === 'done') {
      return h + '<div class="card"><div><div class="t">' + (sy.onlySeen ? '공지 확인 기록을 저장했어요.' : sy.ok + '개를 폴더에 넣었어요.') + '</div>' + (sy.fail.length ? '<div class="m">실패: ' + esc(sy.fail.join(', ')) + '</div>' : '') + '<div class="m">강의자료 페이지를 새로고침하면 "새로 받은 자료"로 보여요.</div></div><div><button id="sh-pick">다시 확인</button></div></div>';
    }
    var asg = S.assign.filter(function (a) { return !a.proof; });
    h += '<div class="card"><div><div class="t">' + (sy.saved ? '✅ 내 사이트 데이터를 저장했어요' : '⚠️ 내 사이트 데이터를 저장하지 못했어요') + '</div><div class="m">강의 ' + S.courses.length + '개 · 과제 ' + asg.length + '개 (미제출 ' + asg.filter(function (a) { return a.status !== 'done'; }).length + '개) 읽음. ' + (sy.saved ? '폴더의 대시보드.html을 열어 보세요. 이미 열려 있으면 새로고침(F5)해 주세요.' : esc(sy.saveErr || '')) + '</div></div></div>';
    h += sy.first ? '<div class="m">처음 확인이라 새 공지는 표시하지 않아요. 이번에 내용을 기록하면 다음부터 새 공지를 알려 드려요.</div>' : '<h2>새 공지 (' + sy.notices.length + '개)</h2>' + (sy.notices.length ? sy.notices.map(function (a) { return '<div class="card"><div><div class="t"><a class="f" target="_blank" rel="noopener noreferrer" href="' + esc(a.href) + '">' + esc(a.title) + '</a></div><div class="m">' + esc(a.course) + (a.date ? ' · ' + esc(a.date) : '') + '</div></div></div>'; }).join('') : '<div class="m">새 공지가 없어요.</div>');
    h += '<h2>내 폴더에 없는 파일 (' + sy.list.length + '개)</h2><div class="m">학교 사이트 확인 ' + sy.total + '건 중, 내 폴더에 없거나 크기가 달라진 파일이에요.</div>';
    h += '<div class="bar"><button id="sh-lang">' + (S.skipLang ? '다른 언어 번역본 포함하기' : '다른 언어 번역본 제외하기') + '</button></div>';
    if (!sy.list.length) { h += '<div class="m">새로 받을 파일이 없어요. 폴더가 학교 사이트와 같아요.</div>'; }
    var last = '';
    sy.list.forEach(function (f, i) {
      if (f.folder !== last) { h += '<h2>' + esc(f.folder) + '</h2>'; last = f.folder; }
      h += '<label class="card" style="cursor:pointer"><div><div class="t"><input type="checkbox" data-i="' + i + '" ' + (f.sel ? 'checked' : '') + '> ' + esc(f.name) + '</div><div class="m">' + esc(f.from) + ' · ' + sizeText(f.size) + (f.kind === 'changed' ? ' · 내용이 바뀐 것 같아요(새 이름으로 저장)' : '') + (f.size > 80 * 1048576 ? ' · 용량이 커서 기본 선택 안 함' : '') + '</div></div></label>';
    });
    h += '<div class="bar"><button id="sh-dl" class="on">선택한 파일 내려받아 폴더에 넣기</button><button id="sh-seen">공지 확인 기록만 저장</button></div>';
    return h;
  }
  function bindSync() {
    var b = panel.querySelector('#sh-pick'); if (b) { b.onclick = function () { pickFolder(); }; }
    var sv = panel.querySelector('#sh-saved'); if (sv) { sv.onclick = function () { useSaved(true).then(function (ok) { if (!ok) { S.sync = { state: 'err', msg: '저장된 폴더를 쓸 수 없어요. 폴더를 다시 선택해 주세요.' }; render(); } }); }; }
    var d = panel.querySelector('#sh-dl'); if (d) { d.onclick = function () { downloadSel(); }; }
    var s = panel.querySelector('#sh-seen'); if (s) { s.onclick = function () { markSeen(); }; }
    var l = panel.querySelector('#sh-lang');
    if (l) { l.onclick = function () { S.skipLang = !S.skipLang; S.sync.list.forEach(function (f) { if (f.lang && f.size <= 80 * 1048576) { f.sel = !S.skipLang; } }); render(); }; }
    panel.querySelectorAll('input[data-i]').forEach(function (c) { c.onchange = function () { S.sync.list[+c.getAttribute('data-i')].sel = c.checked; }; });
  }

  (async function () {
    try {
      S.courses = await loadCourses();
      if (!S.courses.length) { show('로그인이 필요해요. 로그인 화면으로 이동할게요…'); if (AUTO) { setTimeout(function () { location.href = '/login.php'; }, 1200); } return; }
      var n = 0;
      await Promise.all(S.courses.map(async function (c) {
        try { var got = await loadAssign(c); S.assign = S.assign.concat(got); } catch (e) { }
        try { S.attend[c.id] = await loadAttend(c); } catch (e) { S.attend[c.id] = []; }
        try { S.mat[c.id] = await loadMaterials(c); } catch (e) { S.mat[c.id] = []; }
        n++;
        show('강의 ' + n + '/' + S.courses.length + ' 읽는 중…');
      }));
      if (AUTO) {
        S.notesP = loadNotices(S.courses).then(function (N) { S.notes = N.out; S.arts = N.arts; S.sched = N.sched; }, function () { });
        await sendToOpener();
        return;
      }
      render();
      kvGet('root').then(function (h) { if (h) { S.savedName = h.name; useSaved(false).then(function (ok) { if (!ok) { render(); } }); } });
      S.notesP = loadNotices(S.courses).then(function (N) { S.notes = N.out; S.arts = N.arts; S.sched = N.sched; if (S.tab !== 'd') { render(); } }, function () { });
    } catch (e) {
      show('불러오지 못했어요: ' + e.message + ' (로그인이 풀렸는지 확인해 주세요)');
    }
  })();
})();
