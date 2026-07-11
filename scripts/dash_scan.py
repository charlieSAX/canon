import pathlib, sys
banned = {'\u2012', '\u2013', '\u2014', '\u2015', '\u2212'}
bad = []
for p in pathlib.Path('.').rglob('*'):
    if p.suffix in {'.md', '.json', '.ts', '.tsx', '.css', '.html', '.mjs', '.py', '.yml'} and 'node_modules' not in p.parts and 'dist' not in p.parts and 'pipeline' not in p.parts:
        for i, ch in enumerate(p.read_text(encoding='utf-8')):
            if ch in banned:
                bad.append((str(p), i, hex(ord(ch))))
if bad:
    print(bad)
    sys.exit(1)
print('clean')
