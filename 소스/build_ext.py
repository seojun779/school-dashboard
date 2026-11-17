import os, json
def _site_matches():
    p = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'site_config.json')
    try:
        o = json.load(open(p, encoding='utf-8')).get('pagesOrigin', '')
        return [o.rstrip('/') + '/*'] if o.startswith('https://') else []
    except Exception:
        return []
SITE_MATCHES = _site_matches()
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = ROOT + r'\확장프로그램'
SP_DIR = os.path.dirname(os.path.abspath(__file__))
os.makedirs(OUT, exist_ok=True)

def w(name, text):
    open(OUT + '\\' + name, 'w', encoding='utf-8', newline='\n').write(text)

# ---------------- manifest
w('manifest.json', json.dumps({
    "manifest_version": 3,
    "name": "나의 학교 대시보드 연동",
    "version": "1.0.0",
    "description": "대시보드를 열면 사이버캠퍼스 로그인을 확인하고, 로그인하면 자동으로 최신 과제·출석·강의자료와 Claude 대화를 읽어 대시보드에 채워 줘요. 읽기만 하고 비밀번호는 다루지 않아요.",
    "permissions": ["scripting", "tabs", "storage", "unlimitedStorage", "alarms", "notifications", "declarativeNetRequest"],
    "action": {"default_title": "나의 학교 대시보드", "default_popup": "popup.html", "default_icon": {"16": "icon16.png", "48": "icon48.png", "128": "icon128.png"}},
    "icons": {"16": "icon16.png", "48": "icon48.png", "128": "icon128.png"},
    "host_permissions": ["https://cyber.shinhan.ac.kr/*", "https://claude.ai/*", "https://everytime.kr/*", "https://account.everytime.kr/*", "https://stins.shinhan.ac.kr/*", "https://erp.shinhan.ac.kr/*", "http://127.0.0.1/*", "http://localhost/*"],
    "background": {"service_worker": "background.js"},
    "content_scripts": [
        {"matches": ["file:///*"] + SITE_MATCHES, "js": ["dash-content.js"], "run_at": "document_start"},
        {"matches": ["https://cyber.shinhan.ac.kr/*", "https://claude.ai/*"], "js": ["relay.js"], "run_at": "document_start"}
    ]
}, ensure_ascii=False, indent=2))

# ---------------- collector.js = 북마클릿 본체 + 확장용 shim (MAIN world)
src = open(ROOT + r'\북마클릿\sh-board.js', encoding='utf-8').read()
shim = """(function () {
  window.__SH_EXT = true;
  try {
    Object.defineProperty(window, 'opener', {
      configurable: true,
      get: function () { return { closed: false, postMessage: function (m) { window.postMessage({ __shExtResult: true, payload: m }, '*'); } }; }
    });
  } catch (e) { }
})();
"""
# 오류도 결과로 알려 주기
o = "      } catch (e) { say('Claude 대화를 읽지 못했어요: ' + e.message + ' (claude.ai에 로그인했는지 확인해 주세요)'); }"
assert o in src
src = src.replace(o, o.replace("{ say(", "{ try { window.opener.postMessage({ type: 'sh-claude', items: [], error: String(e.message) }, '*'); } catch (e2) { } say("), 1)
o = "if (AUTO) { setTimeout(function () { location.href = '/login.php'; }, 1200); } return; }"
assert o in src
src = src.replace(o, "if (AUTO && !window.__SH_EXT) { setTimeout(function () { location.href = '/login.php'; }, 1200); } if (window.__SH_EXT) { try { window.opener.postMessage({ type: 'sh-error', msg: 'no-courses' }, '*'); } catch (e2) { } } return; }", 1)
w('collector.js', shim + src + "\n;void 0;\n")

# ---------------- relay.js (학교/claude 페이지 안에서 결과를 확장으로 전달)
w('relay.js', """window.addEventListener('message', function (e) {
  if (e.source !== window || !e.data || !e.data.__shExtResult) { return; }
  try { chrome.runtime.sendMessage({ type: 'result', payload: e.data.payload }); } catch (err) { }
});
""")

# ---------------- dash-content.js (내 대시보드 페이지와 확장 사이 다리)
w('dash-content.js', """(function () {
  var ready = false, ports = {};
  function post(m) { window.postMessage(Object.assign({ __shExt: true }, m), '*'); }
  function isDash() { return !!document.querySelector('meta[name="sh-dashboard"]'); }
  async function flush() {
    try {
      var items = await chrome.runtime.sendMessage({ type: 'takeOutbox' });
      (items || []).forEach(post);
    } catch (e) { }
  }
  function init() {
    if (!isDash()) { return; }
    ready = true;
    chrome.runtime.sendMessage({ type: 'hello' }).catch(function () { });
    post({ type: 'ready' });
    flush();
  }
  window.addEventListener('message', function (e) {
    if (!ready || e.source !== window || !e.data || !e.data.__shDash) { return; }
    if (e.data.cmd === 'hello') { post({ type: 'ready' }); flush(); return; }
    var cmd = e.data.cmd, pl = e.data.payload || {};
    if (cmd === 'ai-tags') {
      chrome.runtime.sendMessage({ type: 'ai-tags', host: pl.host }).then(function (r) { post({ type: 'ai-tags', id: pl.id, data: r }); }).catch(function (er) { post({ type: 'ai-tags', id: pl.id, data: { error: String((er && er.message) || er) } }); });
      return;
    }
    if (cmd === 'ai-chat') {
      var port = chrome.runtime.connect({ name: 'ai' });
      ports[pl.id] = port;
      port.onMessage.addListener(function (m) { post({ type: m.t, id: pl.id, data: m.d }); if (m.t === 'ai-done' || m.t === 'ai-error') { delete ports[pl.id]; try { port.disconnect(); } catch (x) { } } });
      port.onDisconnect.addListener(function () { if (ports[pl.id]) { delete ports[pl.id]; post({ type: 'ai-error', id: pl.id, data: '확장 프로그램과 연결이 끊겼어요' }); } });
      port.postMessage({ op: 'chat', host: pl.host, body: pl.body });
      return;
    }
    if (cmd === 'ai-abort') { var pp = ports[pl.id]; if (pp) { delete ports[pl.id]; try { pp.disconnect(); } catch (x) { } } return; }
    chrome.runtime.sendMessage({ type: 'dash', cmd: e.data.cmd, auto: !!e.data.auto, payload: e.data.payload }).catch(function () { });
  });
  chrome.runtime.onMessage.addListener(function (m) {
    if (!ready) { return; }
    if (m.type === 'flush') { flush(); }
    if (m.type === 'status') { post({ type: 'status', text: m.text }); }
  });
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
""")

# ---------------- background.js
w('background.js', open(os.path.join(SP_DIR, 'bg_src.js'), encoding='utf-8').read())


import zlib, struct
def png(size):
    rows = b''
    c = size / 2.0
    for y in range(size):
        row = b'\x00'
        for x in range(size):
            d = ((x - c + .5) ** 2 + (y - c + .5) ** 2) ** .5
            inside = d <= size / 2.0 - 0.5
            # 졸업모자 느낌 대신 단순한 초록 원 + 흰 점
            if not inside:
                row += bytes([0, 0, 0, 0])
            elif d < size * 0.18:
                row += bytes([255, 255, 255, 255])
            else:
                row += bytes([15, 118, 110, 255])
        rows += row
    def chunk(t, data):
        return struct.pack('>I', len(data)) + t + data + struct.pack('>I', zlib.crc32(t + data) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(rows)) + chunk(b'IEND', b'')
for n in (16, 48, 128):
    open(OUT + '\icon%d.png' % n, 'wb').write(png(n))

w('popup.html', open(os.path.join(SP_DIR, 'popup_src.html'), encoding='utf-8').read())
w('popup.js', open(os.path.join(SP_DIR, 'popup_src.js'), encoding='utf-8').read())

w('설치 방법.txt', """나의 학교 대시보드 연동 (크롬 확장 프로그램) 설치 방법

[한 번만 하면 돼요]
1. 크롬 주소창에 chrome://extensions 를 입력해서 열어요. (엣지는 edge://extensions)
2. 오른쪽 위 "개발자 모드"를 켜요.
3. "압축해제된 확장 프로그램을 로드합니다"를 눌러 이 "확장프로그램" 폴더를 선택해요.
4. 방금 추가된 "나의 학교 대시보드 연동"의 "세부정보"를 눌러요.
5. "파일 URL에 대한 액세스 허용"을 켜요. (대시보드가 내 PC 파일이라 꼭 필요해요)
6. 대시보드.html을 새로 열어요. (이미 열려 있으면 F5)

[쓰는 방법]
- 대시보드를 열면 자동으로 사이버캠퍼스를 확인해요.
  · 이미 로그인되어 있으면: 바로 최신 정보를 읽고 화면이 새로고침돼요.
  · 로그인이 안 되어 있으면: 로그인 창이 열려요. 로그인하면 자동으로 정보를 읽고 대시보드로 돌아와요.
- 과제 마감 24시간 · 6시간 · 1시간 전에 크롬 알림이 떠요. (이미 낸 과제와 대시보드에서 완료 체크한 과제는 알리지 않아요. 확장 팝업에서 끌 수 있어요)
- 확장 아이콘을 누르면 곧 마감되는 과제와 각 사이트 연동 상태(✔ 정상 · ⚠ 읽은 게 없음 · ✖ 실패)를 볼 수 있어요.
- Claude(claude.ai)에 로그인되어 있으면 새 대화도 자동으로 학습해요. (6시간마다)
- 왼쪽 아래 "로그인하고 업데이트"나 공부 도우미의 "Claude 대화 학습" 버튼으로 언제든 다시 할 수 있어요.

[알아 둘 점]
- 비밀번호는 읽지도 저장하지도 않아요. 로그인은 학교/Claude 화면에서 직접 해요.
- 내 로그인 상태로 "읽기"만 해요. 과제 제출이나 설정 변경은 하지 않아요.
- 읽은 내용은 이 크롬(내 PC) 안에서만 쓰이고 외부로 보내지 않아요.
- 데이터를 읽는 동안 학교/Claude 탭이 잠깐 열렸다 닫혀요. 닫지 말고 기다려 주세요.
- 학교나 Claude 사이트 화면 구조가 바뀌면 일부가 안 읽힐 수 있어요.
""")
print('built', os.listdir(OUT))
