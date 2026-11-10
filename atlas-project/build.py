"""Bundles index.html + style.css + js/*.js into ONE self-contained file for publishing."""
import pathlib
root = pathlib.Path(__file__).parent
html = (root / 'index.html').read_text()
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>\n' + (root / 'style.css').read_text() + '\n</style>')
for f in ['js/worlds.js', 'js/worlds3d.js', 'js/script.js']:
    html = html.replace('<script src="%s"></script>' % f, '<script>\n' + (root / f).read_text() + '\n</script>')
out = root.parent / 'atlas.html'
out.write_text(html)
print('built', out, len(html), 'bytes')
