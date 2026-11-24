#!/usr/bin/env python3
"""Builds public/printables/maps/india-states.svg from the Survey of India "State Boundary" outline map PDF (1:16M).

    python scripts/build-india-states-soi.py <state-boundary.pdf> public/printables/maps/india-states.svg

Keeps only the OUTLINE_OF_INDIA (bold) and STATE_BOUNDARY (thin) layers; the graticule, frame and labels are dropped.
Needs pypdf. Run once, by hand, when the source PDF changes; the SVG is committed. See public/printables/maps/SOURCES.md."""
import re, sys, json
from pypdf import PdfReader

pdf, out = sys.argv[1], sys.argv[2]
TOL = float(sys.argv[3]) if len(sys.argv) > 3 else 0.5
r = PdfReader(pdf)
p = r.pages[0]
props = p['/Resources']['/Properties']
names = {k: v.get_object()['/Name'] for k, v in props.items()}
data = p.get_contents().get_data().decode('latin1')

tok_re = re.compile(r'\((?:\\.|[^\\)])*\)|<<|>>|<[0-9A-Fa-f\s]*>|\[|\]|/[^\s/\[\]()<>{}%]+|[^\s/\[\]()<>{}%]+')
ops_known = set('q Q cm m l c v y h re S s f F f* B B* b b* n W W* w J j d M RG rg G g K k CS cs SC SCN sc scn gs BDC BMC EMC BT ET Tf Td TD Tm Tj TJ T* Tc Tw Tz TL Ts Tr Do sh ri i BI ID EI d0 d1 \' "'.split())

def mul(a, b):
    return [a[0]*b[0]+a[1]*b[2], a[0]*b[1]+a[1]*b[3], a[2]*b[0]+a[3]*b[2], a[2]*b[1]+a[3]*b[3],
            a[4]*b[0]+a[5]*b[2]+b[4], a[4]*b[1]+a[5]*b[3]+b[5]]

ctm = [1, 0, 0, 1, 0, 0]; stack = []
lw = 1.0; lwstack = []
layer_stack = []  # names of enclosing OCG layers (None for non-OC marked content)
paths = {}  # layer -> list of (d, kind, linewidth)
cur = []; operands = []
in_text = False

def T(x, y):
    return (ctm[0]*x + ctm[2]*y + ctm[4], ctm[1]*x + ctm[3]*y + ctm[5])

def layer():
    for n in reversed(layer_stack):
        if n and n not in ('Layers',):
            return n
    return 'none'

def emit(kind):
    global cur
    if cur:
        sc = (abs(ctm[0]*ctm[3]-ctm[1]*ctm[2]))**0.5
        paths.setdefault(layer(), []).append((' '.join(cur), kind, lw*sc))
    cur = []

lastpt = (0, 0)
for t in tok_re.findall(data):
    if t in ops_known:
        o = operands; operands = []
        if t == 'q': stack.append(ctm[:]); lwstack.append(lw)
        elif t == 'Q': ctm = stack.pop(); lw = lwstack.pop()
        elif t == 'cm': ctm = mul([float(x) for x in o[-6:]], ctm)
        elif t == 'w': lw = float(o[-1])
        elif t == 'm': x, y = T(float(o[0]), float(o[1])); cur.append(f'M{x:.2f},{y:.2f}')
        elif t == 'l': x, y = T(float(o[0]), float(o[1])); cur.append(f'L{x:.2f},{y:.2f}')
        elif t == 'c':
            f = [float(v) for v in o[-6:]]; pts = [T(f[i], f[i+1]) for i in (0, 2, 4)]
            cur.append('C' + ' '.join(f'{a:.2f},{b:.2f}' for a, b in pts))
        elif t in ('v', 'y'):
            f = [float(v) for v in o[-4:]]; pts = [T(f[i], f[i+1]) for i in (0, 2)]
            cur.append('Q' + ' '.join(f'{a:.2f},{b:.2f}' for a, b in pts))
        elif t == 'h': cur.append('Z')
        elif t == 're':
            x, y, w, h = [float(v) for v in o[-4:]]
            a = T(x, y); b = T(x+w, y); c = T(x+w, y+h); d = T(x, y+h)
            cur.append(f'M{a[0]:.2f},{a[1]:.2f} L{b[0]:.2f},{b[1]:.2f} L{c[0]:.2f},{c[1]:.2f} L{d[0]:.2f},{d[1]:.2f} Z')
        elif t in ('S', 's'): emit('stroke')
        elif t in ('f', 'F', 'f*'): emit('fill')
        elif t in ('B', 'B*', 'b', 'b*'): emit('both')
        elif t == 'n': cur = []
        elif t == 'BDC':
            layer_stack.append(names.get(o[1]) if len(o) > 1 and o[0] == '/OC' else None)
        elif t == 'BMC': layer_stack.append(None)
        elif t == 'EMC':
            if layer_stack: layer_stack.pop()
    else:
        operands.append(t)

keep = {'OUTLINE_OF_INDIA': ('india-composite', 2.4), 'STATE_BOUNDARY': ('inner', 1.1)}

num = re.compile(r'-?\d+\.?\d*')
xs, ys = [], []
for layer in keep:
    for d, _, _ in paths[layer]:
        v = [float(n) for n in num.findall(d)]
        xs += v[0::2]; ys += v[1::2]
x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
W = 1000; margin = 4
s = (W - 2 * margin) / (x1 - x0)
H = round((y1 - y0) * s + 2 * margin)

def tr(d):
    vals = iter(num.findall(d))
    def rep(m):
        x = float(m.group(1)); y = float(m.group(2))
        return f'{(x - x0) * s + margin:.1f} {(y1 - y) * s + margin:.1f}'
    d = re.sub(r'(-?\d+\.?\d*),(-?\d+\.?\d*)', rep, d)
    return re.sub(r'\s+', ' ', d.replace('M', ' M ').replace('L', ' L ').replace('C', ' C ').replace('Q', ' Q ')).strip()

parts = [f'<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" stroke-linecap="round" stroke-linejoin="round">']
for layer in ('STATE_BOUNDARY', 'OUTLINE_OF_INDIA'):
    gid, w = keep[layer]
    parts.append(f'<g id="{gid}" fill="none" stroke="#000" stroke-width="{w}">')
    for d, kind, _ in paths[layer]:
        parts.append(f'<path d="{tr(d)}"/>')
    parts.append('</g>')
parts.append('</svg>\n')
open(out, 'w').write('\n'.join(parts))
print('viewBox', W, H, 'bbox pdf', round(x0, 1), round(y0, 1), round(x1, 1), round(y1, 1))

# --- simplify: Douglas-Peucker on each polyline subpath (all segments are straight lines) ---
def rdp(pts, tol):
    if len(pts) < 3: return pts
    keep = [False] * len(pts); keep[0] = keep[-1] = True
    st = [(0, len(pts) - 1)]
    while st:
        a, b = st.pop()
        (ax, ay), (bx, by) = pts[a], pts[b]
        dx, dy = bx - ax, by - ay; L = (dx*dx + dy*dy) ** 0.5
        best, bi = -1, -1
        for i in range(a + 1, b):
            px, py = pts[i]
            dist = abs(dy*(px-ax) - dx*(py-ay)) / L if L else ((px-ax)**2 + (py-ay)**2) ** 0.5
            if dist > best: best, bi = dist, i
        if best > tol:
            keep[bi] = True; st += [(a, bi), (bi, b)]
    return [p for p, k in zip(pts, keep) if k]

svg = open(out).read()
def simp(m):
    d = m.group(1); res = []
    for sub in re.split(r'(?=M )', d):
        if not sub.strip(): continue
        closed = sub.strip().endswith('Z')
        nums = [float(n) for n in num.findall(sub)]
        pts = list(zip(nums[0::2], nums[1::2]))
        pts = rdp(pts, TOL)
        if len(pts) < 2: continue
        res.append('M ' + ' '.join(f'{x:.1f} {y:.1f}' for x, y in pts) + (' Z' if closed else ''))
    return f'<path d="{" ".join(res)}"/>' if res else ''
svg = re.sub(r'<path d="([^"]*)"/>', simp, svg)
svg = re.sub(r'\n+', '\n', svg)
open(out, 'w').write(svg)
print('simplified, tol', TOL)
