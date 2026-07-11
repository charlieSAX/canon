# Scans all shipped content and source for the banned dash family. The
# pipeline/ directory is excluded by design: it holds authoring artefacts that
# mirror external Wikimedia Commons filenames verbatim (some of which contain a
# real en dash, e.g. "Frans Hals - The Laughing Cavalier.jpg"). Those strings
# are never served to the user and must match Commons exactly to resolve, so
# they are intentionally out of scope. node_modules and dist are build output.
import pathlib, sys
banned = {'\u2012', '\u2013', '\u2014', '\u2015', '\u2212'}
excluded = {'node_modules', 'dist', 'pipeline'}
bad = []
for p in pathlib.Path('.').rglob('*'):
    if p.suffix in {'.md', '.json', '.ts', '.tsx', '.css', '.html', '.mjs', '.py', '.yml'} and not excluded & set(p.parts):
        for i, ch in enumerate(p.read_text(encoding='utf-8')):
            if ch in banned:
                bad.append((str(p), i, hex(ord(ch))))
if bad:
    print(bad)
    sys.exit(1)
print('clean')
