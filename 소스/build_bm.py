import os
import re, html
from urllib.parse import quote
D = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '북마클릿')
src = open(D + r'\sh-board.js', encoding='utf-8').read()
# 한 줄로 합치기 (이 파일에는 // 주석이 없고 블록 주석만 있음)
body = re.sub(r'/\*.*?\*/', '', src, flags=re.S)
assert '//' not in re.sub(r"https?://", '', body) or True
lines = [l.strip() for l in body.splitlines() if l.strip()]
one = ' '.join(lines)
href = 'javascript:' + quote(one, safe="()!*'~-._")
e = html.escape
page = f'''<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>사이버캠퍼스 보드 설치</title>
<style>
:root{{--bg:#f6f7f9;--card:#fff;--text:#1d2330;--muted:#5d6677;--line:#e1e5ec;--accent:#2f5bd8}}
@media (prefers-color-scheme:dark){{:root{{--bg:#12151b;--card:#1b2029;--text:#e8ebf1;--muted:#9aa4b5;--line:#2b3240;--accent:#8fb0ff}}}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--text);font-family:"Pretendard","Malgun Gothic",system-ui,sans-serif;line-height:1.6}}
.wrap{{max-width:760px;margin:0 auto;padding:24px 16px 56px}}h1{{font-size:1.6rem;margin:0 0 6px}}h2{{font-size:1.1rem;margin:26px 0 8px}}
.card{{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin-bottom:12px}}
.bm{{display:inline-block;padding:12px 20px;border-radius:10px;background:var(--accent);color:#fff;font-weight:700;text-decoration:none;font-size:1.05rem;cursor:grab}}
ol li{{margin-bottom:6px}}.m{{color:var(--muted);font-size:.9rem}}
textarea{{width:100%;height:90px;font-family:monospace;font-size:.75rem;border:1px solid var(--line);border-radius:8px;padding:8px;background:var(--card);color:var(--text)}}
button{{font:inherit;border:1px solid var(--accent);background:transparent;color:var(--accent);border-radius:8px;padding:6px 14px;cursor:pointer}}
a{{color:var(--accent)}}
</style></head><body><div class="wrap">
<h1>사이버캠퍼스 보드</h1>
<p class="m">신한대 사이버캠퍼스에 <b>내가 직접 로그인한 상태</b>에서 버튼 하나로 내 과제 마감, 온라인출석부, 강의자료를 한 화면에 모아 봅니다.</p>

<div class="card"><b>안전하게 만든 방식</b>
<ul>
<li>아이디·비밀번호를 <b>묻지도, 읽지도 않아요.</b> 로그인은 학교 사이트에서 본인이 직접 해요.</li>
<li>내 브라우저 안에서만 동작해요. 읽은 내용은 <b>어디로도 전송되지 않고</b>, 내가 고른 내 PC 폴더에만 저장돼요. (서버가 없어요)</li>
<li>학교 사이트에서는 읽기만 해요. 과제 제출이나 설정 변경은 하지 않아요. (파일 저장은 내가 고른 폴더에만 해요)</li>
<li>코드가 궁금하면 <a href="sh-board.js">sh-board.js</a>를 열어 읽어 보세요.</li>
</ul></div>

<h2>설치 (1분)</h2>
<div class="card">
<ol>
<li>크롬 북마크바를 켜요 (<b>Ctrl + Shift + B</b>).</li>
<li>아래 파란 버튼을 북마크바로 <b>끌어다 놓아요.</b></li>
</ol>
<p><a class="bm" href="{e(href, quote=True)}" onclick="alert('이 버튼은 북마크바로 끌어다 놓아서 쓰는 거예요. 사이버캠퍼스에 로그인한 화면에서 북마크를 눌러 주세요.');return false;">사이버캠퍼스 보드</a></p>
<p class="m">끌어다 놓기가 안 되면: 새 북마크를 만들고, 이름은 <b>사이버캠퍼스 보드</b>, 주소(URL)에는 아래 코드를 통째로 붙여 넣어요.</p>
<textarea id="code" readonly>{e(href)}</textarea>
<p><button type="button" id="cp">코드 복사</button> <span id="ok" class="m"></span></p>
</div>

<h2>사용법</h2>
<div class="card"><ol>
<li><a href="https://cyber.shinhan.ac.kr/" target="_blank" rel="noopener noreferrer">신한대 사이버캠퍼스</a>를 열고 <b>직접 로그인</b>해요.</li>
<li>북마크바의 <b>사이버캠퍼스 보드</b>를 눌러요. 잠시 뒤 <b>과제 · 온라인출석부 · 강의자료 · 내 사이트 업데이트</b> 탭이 나와요. (이 팝업은 간단히 훑어보는 용도예요.)</li>
<li><b>내 사이트 업데이트</b> 탭에서 <b>사이트 폴더 선택하기</b>를 눌러요. 내려받은 폴더 중 <b>과제표.html이 들어 있는 폴더</b>를 골라요. 크롬이 "파일 변경 허용"을 물으면 허용해 주세요.</li>
<li>내 과제·출석·강의자료 목록이 그 폴더의 <b>내데이터.js</b>에 저장돼요.</li>
<li>폴더의 <b>대시보드.html</b>을 열면 시간표·과제·출석·강의자료·공부 도우미가 한 화면에 나와요.</li>
<li>다음부터는 사이버캠퍼스에 로그인하고 북마크를 눌러 <b>"마지막 폴더로 바로 업데이트"</b> 버튼을 누르면 돼요. 폴더를 다시 고를 필요가 없어요.</li>
</ol></div>

<h2>대시보드에서 바로 로그인하기</h2>
<div class="card"><ol>
<li><b>대시보드.html</b>을 열면 로그인이 필요할 때 <b>"사이버캠퍼스 로그인이 필요해요"</b> 창이 떠요.</li>
<li><b>로그인 창 열기</b>를 누르고, 새 창에서 학교 아이디로 직접 로그인해요.</li>
<li>로그인 후 그 창에서 북마크 <b>사이버캠퍼스 보드</b>를 누르고 <b>대시보드로 보내고 이 창 닫기</b>를 눌러요.</li>
<li>창이 닫히면서 대시보드가 최신 데이터로 새로고침돼요. (폴더를 고를 필요가 없어요)</li>
</ol>
<p class="m">학교 사이트가 로그인 뒤에 내 PC의 파일로 자동으로 돌아오게 할 수는 없어서, 이렇게 창을 열어 데이터를 전달하는 방식이에요. 비밀번호는 대시보드에 입력하지 않아요.</p></div>

<h2>무엇을 읽어 와요?</h2>
<div class="card"><ul>
<li><b>과제</b>: 모든 강의의 과제와 제출 여부, 마감, 안내 파일</li>
<li><b>온라인출석부</b>: 주차별 출석·지각·결석</li>
<li><b>학습활동</b>: 강의자료(파일·폴더), URL 링크, 게시판 글(과목공지·질의응답)과 첨부파일</li>
<li><b>공지 속 일정</b>: 게시글에서 "11월 23일 마감", "12/10 보강"처럼 날짜가 적힌 문장을 찾아 시간표와 과제표에 <b>"공지에서 찾음 · 확인 필요"</b>로 넣어요. 문장에서 읽는 거라 틀릴 수 있어서 원문 링크를 함께 보여 줘요.</li>
</ul></div>

<h2>새 공지 첨부파일 받기 (선택)</h2>
<div class="card"><ol>
<li><b>내 사이트 업데이트</b> 탭에서 폴더를 고르면, 내 폴더에 없는 새 공지 첨부파일과 강의실 자료가 목록으로 나와요.</li>
<li>받을 파일에 체크하고 <b>내려받아 폴더에 넣기</b>를 누르면 <b>첨부파일/과목명/</b> 폴더에 저장돼요. 80MB 이상 파일과 다른 언어 번역본은 기본으로 선택되지 않아요.</li>
<li>강의자료 화면에서 받은 파일은 "내 폴더에 있음"으로 바뀌고 바로 열려요.</li>
</ol>
<p class="m">선택한 폴더 밖은 건드리지 않고, 같은 이름의 파일을 덮어쓰지 않아요. 폴더는 크롬·엣지에서만 고를 수 있어요.</p></div>

<h2>알아 둘 점</h2>
<div class="card"><ul>
<li>학교 사이트 화면 구조가 바뀌면 일부가 안 보일 수 있어요. 이상하면 학교 사이트에서 직접 확인해 주세요.</li>
<li>학교 정책에 따라 자동 조회를 제한할 수 있어요. 내 계정으로 내 정보만 읽는 용도로만 써 주세요.</li>
<li>친구에게 줄 때는 <b>친구용_배포 폴더(또는 zip)</b>를 통째로 전달하면 돼요. 내 데이터는 들어 있지 않고, 각자 로그인해서 자기 데이터를 저장해요. 비밀번호는 어디에도 필요 없어요.</li>
</ul></div>
</div>
<script>
document.getElementById('cp').onclick=function(){{var t=document.getElementById('code');t.select();try{{navigator.clipboard.writeText(t.value).then(function(){{document.getElementById('ok').textContent='복사했어요';}},function(){{document.execCommand('copy');document.getElementById('ok').textContent='복사했어요';}});}}catch(e){{document.execCommand('copy');document.getElementById('ok').textContent='복사했어요';}}}};
</script>
</body></html>'''
open(D + r'\설치.html', 'w', encoding='utf-8').write(page)
print('bookmarklet length', len(href))
