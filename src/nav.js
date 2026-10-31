/**
 * Grid A* for the office floor. Coordinates are meters on the XZ plane.
 * Cells start blocked; callers carve walkable rooms and then stamp furniture.
 */
export function createNav(minX, minZ, maxX, maxZ, cell = 0.5) {
  const cols = Math.ceil((maxX - minX) / cell);
  const rows = Math.ceil((maxZ - minZ) / cell);
  const open = new Uint8Array(cols * rows);
  const nav = {
    minX, minZ, maxX, maxZ, cell, cols, rows, open,
    index(c, r) { return r * cols + c; },
    inBounds(c, r) { return c >= 0 && r >= 0 && c < cols && r < rows; },
    isOpen(c, r) { return nav.inBounds(c, r) && open[nav.index(c, r)] === 1; },
    worldToCell(x, z) {
      return [Math.floor((x - minX) / cell), Math.floor((z - minZ) / cell)];
    },
    center(c, r) {
      return { x: minX + (c + 0.5) * cell, z: minZ + (r + 0.5) * cell };
    },
    blockedWorld(x, z) {
      if (x < minX || z < minZ || x >= maxX || z >= maxZ) return true;
      const [c, r] = nav.worldToCell(x, z);
      return !nav.isOpen(c, r);
    },
  };

  function paint(x0, x1, z0, z1, value) {
    const a = Math.min(x0, x1);
    const b = Math.max(x0, x1);
    const c = Math.min(z0, z1);
    const d = Math.max(z0, z1);
    const c0 = Math.max(0, Math.floor((a - minX) / cell));
    const c1 = Math.min(cols - 1, Math.floor((b - minX) / cell - 1e-6));
    const r0 = Math.max(0, Math.floor((c - minZ) / cell));
    const r1 = Math.min(rows - 1, Math.floor((d - minZ) / cell - 1e-6));
    for (let r = r0; r <= r1; r++) {
      for (let col = c0; col <= c1; col++) open[nav.index(col, r)] = value;
    }
  }

  nav.carve = (rect) => paint(rect.x0, rect.x1, rect.z0, rect.z1, 1);
  nav.block = (rect) => paint(rect.x0, rect.x1, rect.z0, rect.z1, 0);
  return nav;
}

const DIRS = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142],
];

export function findPath(nav, start, goal, costAt) {
  const [sc, sr] = nav.worldToCell(start.x, start.z);
  const [gc, gr] = nav.worldToCell(goal.x, goal.z);
  const s = nav.isOpen(sc, sr) ? [sc, sr] : nearestOpen(nav, sc, sr);
  const g = nav.isOpen(gc, gr) ? [gc, gr] : nearestOpen(nav, gc, gr);
  if (!s || !g) return null;
  if (s[0] === g[0] && s[1] === g[1]) return [nav.center(g[0], g[1])];

  const cols = nav.cols;
  const key = (c, r) => r * cols + c;
  const openList = [key(s[0], s[1])];
  const gScore = new Float32Array(nav.open.length);
  const fScore = new Float32Array(nav.open.length);
  const came = new Int32Array(nav.open.length);
  gScore.fill(Infinity);
  fScore.fill(Infinity);
  came.fill(-1);
  const startKey = key(s[0], s[1]);
  gScore[startKey] = 0;
  fScore[startKey] = heuristic(s[0], s[1], g[0], g[1]);
  const closed = new Uint8Array(nav.open.length);

  let guard = 0;
  const limit = nav.cols * nav.rows;
  while (openList.length && guard++ < limit) {
    let bestI = 0;
    let bestF = fScore[openList[0]];
    for (let i = 1; i < openList.length; i++) {
      if (fScore[openList[i]] < bestF) { bestF = fScore[openList[i]]; bestI = i; }
    }
    const current = openList[bestI];
    openList.splice(bestI, 1);
    if (closed[current]) continue;
    closed[current] = 1;
    const cr = Math.floor(current / cols);
    const cc = current - cr * cols;
    if (cc === g[0] && cr === g[1]) return stringPull(nav, reconstruct(nav, came, current, s));

    for (const [dc, dr, step] of DIRS) {
      const nc = cc + dc;
      const nr = cr + dr;
      if (!nav.isOpen(nc, nr)) continue;
      if (dc !== 0 && dr !== 0) {
        if (!nav.isOpen(cc + dc, cr) || !nav.isOpen(cc, cr + dr)) continue;
      }
      const nk = key(nc, nr);
      if (closed[nk]) continue;
      const extra = costAt ? costAt(nc, nr) : 0;
      const tentative = gScore[current] + step + extra;
      if (tentative < gScore[nk]) {
        came[nk] = current;
        gScore[nk] = tentative;
        fScore[nk] = tentative + heuristic(nc, nr, g[0], g[1]);
        openList.push(nk);
      }
    }
  }
  return null;
}

function heuristic(c, r, gc, gr) {
  const dc = c - gc;
  const dr = r - gr;
  return Math.hypot(dc, dr);
}

function nearestOpen(nav, c, r) {
  if (nav.isOpen(c, r)) return [c, r];
  for (let rad = 1; rad <= 14; rad++) {
    for (let dc = -rad; dc <= rad; dc++) {
      for (let dr = -rad; dr <= rad; dr++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== rad) continue;
        if (nav.isOpen(c + dc, r + dr)) return [c + dc, r + dr];
      }
    }
  }
  return null;
}

function reconstruct(nav, came, current, start) {
  const cols = nav.cols;
  const cells = [];
  let guard = 0;
  while (current !== -1 && guard++ < 2000) {
    const r = Math.floor(current / cols);
    const c = current - r * cols;
    cells.push(nav.center(c, r));
    if (c === start[0] && r === start[1]) break;
    current = came[current];
  }
  cells.reverse();
  return cells;
}

function stringPull(nav, points) {
  if (!points || points.length < 3) return points;
  const out = [points[0]];
  let anchor = 0;
  for (let i = 2; i < points.length; i++) {
    if (!lineClear(nav, points[anchor], points[i])) {
      out.push(points[i - 1]);
      anchor = i - 1;
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

function lineClear(nav, a, b) {
  const dist = Math.hypot(b.x - a.x, b.z - a.z);
  const steps = Math.max(1, Math.ceil(dist / (nav.cell * 0.45)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (nav.blockedWorld(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) return false;
  }
  return true;
}

export function nearestPoint(nav, x, z) {
  const [c, r] = nav.worldToCell(x, z);
  const hit = nearestOpen(nav, c, r);
  return hit ? nav.center(hit[0], hit[1]) : null;
}

export function occupiedCost(nav, bots, self) {
  const set = new Set();
  for (const bot of bots) {
    if (bot === self) continue;
    const [c, r] = nav.worldToCell(bot.x, bot.z);
    if (nav.inBounds(c, r)) set.add(r * nav.cols + c);
  }
  return (c, r) => (set.has(r * nav.cols + c) ? 6 : 0);
}
