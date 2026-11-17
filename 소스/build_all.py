"""한 번에 다시 만들기 (사이트 · 확장 프로그램 · 북마클릿)
사용법: python 소스/build_all.py        또는   python 소스/build_all.py site ext"""
import os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
STEPS = {'ext': 'build_ext.py', 'bm': 'build_bm.py', 'site': 'build_site_app.py'}
for k in (sys.argv[1:] or list(STEPS)):
    if k not in STEPS:
        sys.exit('알 수 없는 항목: %s (가능: %s)' % (k, ', '.join(STEPS)))
    print('==', k)
    r = subprocess.run([sys.executable, '-I', os.path.join(HERE, STEPS[k])], cwd=HERE)
    if r.returncode:
        sys.exit(r.returncode)
print('완료')
