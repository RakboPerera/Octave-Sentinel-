# Trace the single-colour Octave wordmark PNG into a crisp vector SVG.
# Marching squares on the anti-aliased alpha at the 0.5 iso-level → smooth,
# resolution-independent contours sampled from the exact logo. Holes (letter
# counters) come out as separate contours and render via fill-rule:evenodd.
import sys, numpy as np
from PIL import Image

SRC = sys.argv[1]
OUT = sys.argv[2]
LEVEL = 0.5

img = Image.open(SRC).convert('RGBA')
arr = np.asarray(img).astype(float)
alpha = arr[:, :, 3] / 255.0

# Brand colour = median of clearly-opaque pixels (logo is one flat colour).
opaque = alpha > 0.6
rgb = arr[:, :, :3][opaque]
r, g, b = [int(round(v)) for v in np.median(rgb, axis=0)]
hexcol = f'#{r:02X}{g:02X}{b:02X}'

# Pad with transparent border so edge-touching contours still close.
A = np.pad(alpha, 1, mode='constant', constant_values=0.0)
H, W = A.shape

def interp(v1, v2, p1, p2):
    d = v2 - v1
    t = 0.5 if abs(d) < 1e-9 else (LEVEL - v1) / d
    t = max(0.0, min(1.0, t))
    return (p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1]))

# Marching squares → list of segments ((x1,y1),(x2,y2)) in padded coords.
segs = []
for i in range(H - 1):
    for j in range(W - 1):
        tl, tr = A[i, j], A[i, j + 1]
        bl, br = A[i + 1, j], A[i + 1, j + 1]
        code = (tl >= LEVEL) * 1 + (tr >= LEVEL) * 2 + (br >= LEVEL) * 4 + (bl >= LEVEL) * 8
        if code == 0 or code == 15:
            continue
        # edge crossing points
        top    = interp(tl, tr, (j, i),     (j + 1, i))
        right  = interp(tr, br, (j + 1, i), (j + 1, i + 1))
        bottom = interp(bl, br, (j, i + 1), (j + 1, i + 1))
        left   = interp(tl, bl, (j, i),     (j, i + 1))
        cfg = {
            1: [(left, top)], 2: [(top, right)], 3: [(left, right)],
            4: [(right, bottom)], 6: [(top, bottom)], 7: [(left, bottom)],
            8: [(bottom, left)], 9: [(bottom, top)], 11: [(bottom, right)],
            12: [(right, left)], 13: [(right, top)], 14: [(top, left)],
        }
        if code in (5, 10):
            center = (tl + tr + bl + br) / 4.0
            if code == 5:
                cfg5 = [(left, top), (right, bottom)] if center >= LEVEL else [(left, bottom), (right, top)]
                segs.extend(cfg5)
            else:
                cfg10 = [(top, right), (bottom, left)] if center >= LEVEL else [(top, left), (bottom, right)]
                segs.extend(cfg10)
            continue
        segs.extend(cfg[code])

# Stitch segments into closed polylines by matching endpoints (exact float match,
# since adjacent cells compute identical crossing points).
def key(p): return (round(p[0], 6), round(p[1], 6))
from collections import defaultdict
adj = defaultdict(list)
for a, b_ in segs:
    adj[key(a)].append((b_, key(b_)))

used = set()
polylines = []
seg_list = list(enumerate(segs))
start_index = defaultdict(list)
for idx, (a, b_) in seg_list:
    start_index[key(a)].append(idx)

for idx, (a, b_) in seg_list:
    if idx in used:
        continue
    poly = [a]
    cur = b_
    used.add(idx)
    poly.append(cur)
    guard = 0
    while guard < 10_000_000:
        guard += 1
        k = key(cur)
        nxt = None
        for cand in start_index.get(k, []):
            if cand not in used:
                nxt = cand
                break
        if nxt is None:
            break
        used.add(nxt)
        cur = segs[nxt][1]
        poly.append(cur)
        if key(cur) == key(poly[0]):
            break
    if len(poly) >= 3:
        polylines.append(poly)

# Ramer–Douglas–Peucker simplification (tiny epsilon: invisible, trims points).
def rdp(pts, eps):
    if len(pts) < 3:
        return pts
    a, b_ = np.array(pts[0]), np.array(pts[-1])
    dmax, idx = 0.0, 0
    ab = b_ - a
    nrm = np.hypot(*ab)
    for i in range(1, len(pts) - 1):
        p = np.array(pts[i])
        d = abs(np.cross(ab, p - a)) / nrm if nrm > 1e-9 else np.hypot(*(p - a))
        if d > dmax:
            dmax, idx = d, i
    if dmax > eps:
        left = rdp(pts[:idx + 1], eps)
        right = rdp(pts[idx:], eps)
        return left[:-1] + right
    return [pts[0], pts[-1]]

sys.setrecursionlimit(100000)
EPS = 0.18
polylines = [rdp(p, EPS) for p in polylines]

# Map back to original coords (remove 1px pad) and tighten to ink bbox.
allpts = [(x - 1, y - 1) for poly in polylines for (x, y) in poly]
xs = [p[0] for p in allpts]; ys = [p[1] for p in allpts]
minx, miny = min(xs), min(ys)
maxx, maxy = max(xs), max(ys)
vbw, vbh = maxx - minx, maxy - miny

def fmt(v): return f'{v:.2f}'.rstrip('0').rstrip('.')

paths = []
for poly in polylines:
    pts = [(x - 1 - minx, y - 1 - miny) for (x, y) in poly]
    d = 'M' + ' L'.join(f'{fmt(x)},{fmt(y)}' for x, y in pts) + ' Z'
    paths.append(d)

total_pts = sum(len(p) for p in polylines)
svg = (
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {fmt(vbw)} {fmt(vbh)}" '
    f'role="img" aria-label="Octave" preserveAspectRatio="xMinYMid meet">\n'
    f'  <title>Octave</title>\n'
    f'  <path fill="{hexcol}" fill-rule="evenodd" d="{" ".join(paths)}"/>\n'
    f'</svg>\n'
)
with open(OUT, 'w', encoding='utf-8') as f:
    f.write(svg)

print(f'color={hexcol}  contours={len(polylines)}  points={total_pts}  '
      f'viewBox=0 0 {fmt(vbw)} {fmt(vbh)}  bytes={len(svg)}')
