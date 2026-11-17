"""정식 사이트(설치형 웹 앱) 만들기 -> 프로젝트 폴더/사이트/
개인 자료(내 데이터, 내 시간표, 내 강의 글)는 넣지 않아요. 각자 브라우저에서 읽은 자료만 쓰입니다.
사용법: python 소스\\build_site_app.py"""
import os, re, json, zipfile, struct, zlib, shutil

SRC = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SRC)
OUT = os.path.join(ROOT, 'docs')
os.makedirs(OUT, exist_ok=True)
MOD = os.path.join(SRC, 'modules')

def rd(p):
    return open(p, encoding='utf-8').read()

def wr(name, text):
    open(os.path.join(OUT, name), 'w', encoding='utf-8', newline='\n').write(text)

# ------------------------------------------------------------ index.html
t = rd(os.path.join(SRC, 'dashboard_template.html'))
t = t.replace('/*__MODULE_CSS__*/', rd(os.path.join(MOD, 'style.css')))
t = t.replace('<!--__MODULE_HTML__-->', rd(os.path.join(MOD, 'sections.html')))
t = t.replace('/*__MODULES__*/', rd(os.path.join(MOD, 'ai_core.js')) + '\n' + rd(os.path.join(MOD, 'drive.js')) + '\n' + rd(os.path.join(MOD, 'workshop.js')) + '\n' + rd(os.path.join(MOD, 'timetable.js')))
t = t.replace('__CLASSES__', '[]')
t = t.replace('__CLAUDE_URL__', 'https://claude.ai/new').replace('__CLAUDE_ATTR__', ' target="_blank" rel="noopener noreferrer"')
# 내 개인 자료 파일은 불러오지 않음
for f in ('내데이터.js', '강의지식.js', '내자료.js'):
    t = t.replace('<script src="%s"></script>\n' % f, '')
# 내 학점 시드(수강 과목 이름) 제거
t = re.sub(r"var alias=\{[^\n]*?\};", 'var alias={};', t, count=1)
# 설치형 웹 앱 정보
head_add = ('<link rel="manifest" href="manifest.webmanifest">\n<meta name="theme-color" content="#0f766e">\n'
            '<link rel="icon" href="icon-192.png">\n<link rel="apple-touch-icon" href="icon-192.png">\n'
            '<meta name="application-name" content="나의 학교">\n')
t = t.replace('<meta name="sh-dashboard" content="1">', '<meta name="sh-dashboard" content="1">\n' + head_add, 1)
sw_reg = "<script>if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)){window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){});});}</script>\n"
t = t.replace('</body></html>', sw_reg + '</body></html>')
# 처음 오신 분을 위한 안내 (확장 프로그램 설치)
new_ol = ('<ol><li><b>확장 프로그램을 설치</b>해요 (처음 한 번). <a href="나의학교_확장프로그램.zip" download>확장 프로그램 받기</a> → 압축 풀기 → 크롬 주소창에 <code>chrome://extensions</code> → 오른쪽 위 <b>개발자 모드</b> 켜기 → <b>압축해제된 확장 프로그램을 로드합니다</b>로 그 폴더 선택</li>'
          '<li>이 사이트를 <b>새로고침</b>하면 자동으로 사이버캠퍼스 로그인 화면이 열려요</li>'
          '<li>학교 아이디로 <b>직접 로그인</b>하면 바로 이 화면으로 돌아와서 자료를 읽어요 (비밀번호는 이 사이트가 받지 않아요)</li></ol>')
t, n = re.subn(r'<ol><li><b>로그인 창 열기</b>.*?</ol>', lambda m: new_ol, t, count=1, flags=re.S)
assert n == 1, '안내 목록을 찾지 못했어요'
t = t.replace('<title>나의 학교</title>', '<title>나의 학교 — 과제·시간표·공부 도우미</title>', 1)
wr('index.html', t)

# (시간표 편집은 이제 대시보드 안에서 해요 — 별도 시간표.html 없음)

# ------------------------------------------------------------ PWA 파일
wr('manifest.webmanifest', json.dumps({
    'name': '나의 학교 — 과제·시간표·공부 도우미', 'short_name': '나의 학교', 'description': '과제 마감, 시간표, 학점 계산, 강의자료 드라이브, 내 PC AI 공부 도우미',
    'start_url': './', 'scope': './', 'display': 'standalone', 'lang': 'ko',
    'background_color': '#f4f6f8', 'theme_color': '#0f766e',
    'icons': [{'src': 'icon-192.png', 'sizes': '192x192', 'type': 'image/png', 'purpose': 'any maskable'},
              {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any maskable'}]
}, ensure_ascii=False, indent=2))

wr('sw.js', """const V = 'sh-site-v1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) { return; }
  e.respondWith(fetch(e.request).then((r) => { const cp = r.clone(); caches.open(V).then((c) => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request).then((m) => m || caches.match('index.html'))));
});
""")

def png(size):
    rows = b''
    c = size / 2.0
    for y in range(size):
        row = b'\x00'
        for x in range(size):
            d = ((x - c + .5) ** 2 + (y - c + .5) ** 2) ** .5
            if d < size * 0.16:
                row += bytes([255, 255, 255, 255])
            else:
                row += bytes([15, 118, 110, 255])
        rows += row
    def chunk(tp, data):
        return struct.pack('>I', len(data)) + tp + data + struct.pack('>I', zlib.crc32(tp + data) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(rows)) + chunk(b'IEND', b'')
for n in (192, 512):
    open(os.path.join(OUT, 'icon-%d.png' % n), 'wb').write(png(n))

open(os.path.join(OUT, '.nojekyll'), 'w').close()
wr('404.html', '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=./"><title>나의 학교</title><a href="./">나의 학교로 가기</a>')

# ------------------------------------------------------------ 확장 프로그램 zip (내려받기용)
ext = os.path.join(ROOT, '확장프로그램')
zp = os.path.join(OUT, '나의학교_확장프로그램.zip')
with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED) as z:
    for fn in sorted(os.listdir(ext)):
        z.write(os.path.join(ext, fn), '나의학교_확장프로그램/' + fn)
print('사이트 만들기 완료:', sorted(os.listdir(OUT)))
