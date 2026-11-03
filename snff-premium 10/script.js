/* Social Network Friend Finder - all results are computed from the real graph in `S`. */
const KEY = 'snff_v1';
const SAMPLE = {
  users: [[1,'Aarav','Coffee, code and cricket'],[2,'Priya','Loves hiking and photography'],[3,'Rohan','Full-stack developer'],
    [4,'Sneha','Digital artist'],[5,'Karan','Startup enthusiast'],[6,'Ananya','Bookworm and baker'],
    [7,'Vikram','Gamer and streamer'],[8,'Meera','Data science student'],[9,'Arjun','Guitarist'],
    [10,'Isha','Travel blogger'],[11,'Neha','UX designer'],[12,'Dev','Robotics club lead']].map(([id,name,bio])=>({id,name,bio})),
  edges: [[1,2],[1,3],[1,4],[2,3],[2,5],[3,4],[3,6],[4,6],[5,7],[6,8],[7,8],[7,9],[8,10],[9,11],[10,11],[10,12]],
  activity: ['Demo network loaded'], history: [3,6,9,12,16]
};
const clone = o => JSON.parse(JSON.stringify(o));
let S = (() => { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.users) return s; } catch (e) {} return clone(SAMPLE); })();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
const $ = id => document.getElementById(id);
const escapeHTML = value => String(value ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const user = id => S.users.find(u => u.id === id);
const nameOf = id => user(id).name;

/* ---------- Graph algorithms (adjacency list, same logic as cpp/main.cpp) ---------- */
function adj() {
  const m = new Map(S.users.map(u => [u.id, []]));
  S.edges.forEach(([a, b]) => { m.get(a).push(b); m.get(b).push(a); });
  m.forEach(v => v.sort((x, y) => x - y));
  return m;
}
function bfs(start) {
  const g = adj(), seen = new Set([start]), q = [start], order = [];
  while (q.length) { const u = q.shift(); order.push(u);
    for (const v of g.get(u)) if (!seen.has(v)) { seen.add(v); q.push(v); } }
  return order;
}
function dfs(start) {
  const g = adj(), seen = new Set(), order = [];
  (function go(u) { seen.add(u); order.push(u); for (const v of g.get(u)) if (!seen.has(v)) go(v); })(start);
  return order;
}
function shortestPath(s, t) {
  const g = adj(), par = new Map([[s, null]]), q = [s];
  while (q.length) { const u = q.shift(); if (u === t) break;
    for (const v of g.get(u)) if (!par.has(v)) { par.set(v, u); q.push(v); } }
  if (!par.has(t)) return null;
  const p = []; for (let x = t; x !== null; x = par.get(x)) p.unshift(x);
  return p;
}
function mutual(a, b) { const g = adj(), B = new Set(g.get(b)); return g.get(a).filter(x => B.has(x)); }
function recommend(u) {
  const g = adj(), mine = new Set(g.get(u)), out = [];
  for (const c of S.users) { if (c.id === u || mine.has(c.id)) continue;
    const m = mutual(u, c.id); if (m.length) out.push({ id: c.id, mutual: m }); }
  return out.sort((a, b) => b.mutual.length - a.mutual.length || a.id - b.id);
}
const hasEdge = (a, b) => S.edges.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

/* ---------- State changes ---------- */
function log(msg) { S.activity.unshift(msg); S.activity = S.activity.slice(0, 6); S.history.push(S.edges.length); S.history = S.history.slice(-8); save(); }
function addFriend(a, b) { if (a === b || hasEdge(a, b)) return; S.edges.push([a, b]); log(`${nameOf(a)} and ${nameOf(b)} are now friends`); renderAll(); toast('Friend added'); }
function removeFriend(a, b) { S.edges = S.edges.filter(([x, y]) => !((x === a && y === b) || (x === b && y === a))); log(`${nameOf(a)} and ${nameOf(b)} are no longer friends`); renderAll(); toast('Friend removed'); }

/* ---------- UI helpers ---------- */
let toastT; function toast(m) { const t = $('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); }
const avatar = (u, s = '') => `<div class="av ${s}" style="background:hsl(${u.id * 47 % 360} 70% 45%)">${u.name.slice(0, 2).toUpperCase()}</div>`;
const empty = m => `<div class="empty">${m}</div>`;
const chips = ids => ids.map((id, i) => (i ? '<span class="arrow">→</span>' : '') + `<span class="chip">${nameOf(id)}</span>`).join('');

/* SVG network: draggable nodes, selectable users and reusable layouts. */
const graphPositions = new Map();
let graphZoom = 1;
function defaultPosition(id, index, total) {
  const a = 2 * Math.PI * index / Math.max(total, 1) - Math.PI / 2;
  return [330 + 235 * Math.cos(a), 250 + 205 * Math.sin(a)];
}
function drawGraph(id, o = {}) {
  const n = S.users.length, pos = {};
  S.users.forEach((u, i) => {
    if (!graphPositions.has(u.id)) graphPositions.set(u.id, defaultPosition(u.id, i, n));
    pos[u.id] = graphPositions.get(u.id);
  });
  const vis = new Set(o.visited || []), path = o.path || [], g = adj();
  const onPath = (a, b) => path.some((p, i) => i && ((path[i - 1] === a && p === b) || (path[i - 1] === b && p === a)));
  let h = '<svg viewBox="0 0 660 500" role="img" aria-label="Interactive social network graph"><g class="graph-world">';
  S.edges.forEach(([a, b]) => { const hot = onPath(a, b) || (o.sel && (a === o.sel || b === o.sel));
    h += `<line class="${hot ? 'hot' : ''}" x1="${pos[a][0]}" y1="${pos[a][1]}" x2="${pos[b][0]}" y2="${pos[b][1]}"/>`; });
  S.users.forEach(u => { const [x, y] = pos[u.id];
    let fill = `hsl(${u.id * 47 % 360} 55% 40%)`;
    if (vis.has(u.id)) fill = '#3b82f6'; if (path.includes(u.id)) fill = '#f59e0b';
    if (o.sel === u.id || o.current === u.id) fill = '#8b5cf6'; else if (o.sel && g.get(o.sel).includes(u.id)) fill = '#34d399';
    h += `<g class="graph-node" data-id="${u.id}" tabindex="0" role="button" aria-label="${escapeHTML(u.name)}, ${g.get(u.id).length} friends"><circle cx="${x}" cy="${y}" r="26" fill="${fill}"><title>${escapeHTML(u.name)}: ${g.get(u.id).length} friends</title></circle><text x="${x}" y="${y + 4}">${escapeHTML(u.name.length > 10 ? u.name.slice(0, 9) + '…' : u.name)}</text></g>`; });
  const host = $(id);
  host.innerHTML = h + '</g></svg>';
  const svg = host.querySelector('svg');
  if (id === 'g-network') svg.style.transform = `scale(${graphZoom})`;
  if (o.click) host.querySelectorAll('.graph-node').forEach(el => {
    let moved = false, start = null;
    el.addEventListener('pointerdown', e => { moved = false; start = {x:e.clientX,y:e.clientY}; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', e => {
      if (!start || !(e.buttons & 1)) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (Math.hypot(dx,dy) > 3) moved = true;
      if (moved) {
        const rect = svg.getBoundingClientRect();
        const world = host.querySelector('.graph-world');
        const sx = 660 / rect.width / graphZoom, sy = 500 / rect.height / graphZoom;
        const idNum = +el.dataset.id, old = graphPositions.get(idNum);
        graphPositions.set(idNum, [Math.max(30, Math.min(630, old[0] + (e.movementX || 0) * sx)), Math.max(30, Math.min(470, old[1] + (e.movementY || 0) * sy))]);
        start = {x:e.clientX,y:e.clientY};
        const p = graphPositions.get(idNum); el.querySelector('circle').setAttribute('cx', p[0]); el.querySelector('circle').setAttribute('cy', p[1]);
        el.querySelector('text').setAttribute('x', p[0]); el.querySelector('text').setAttribute('y', p[1] + 4);
        world.querySelectorAll('line').forEach(line => {
          const edge = S.edges.find(([a,b]) => (a === idNum && b === +line.dataset.b) || (b === idNum && a === +line.dataset.a));
          if (edge) { line.setAttribute('x1', graphPositions.get(edge[0])[0]); line.setAttribute('y1', graphPositions.get(edge[0])[1]); line.setAttribute('x2', graphPositions.get(edge[1])[0]); line.setAttribute('y2', graphPositions.get(edge[1])[1]); }
        });
      }
    });
    el.addEventListener('pointerup', () => { if (!moved) o.click(+el.dataset.id); start = null; });
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); o.click(+el.dataset.id); } });
  });
  // Edge endpoints are retained as data for live node dragging.
  host.querySelectorAll('line').forEach((line, i) => { line.dataset.a = S.edges[i][0]; line.dataset.b = S.edges[i][1]; });
}

/* ---------- Pages ---------- */
function connectedComponents() {
  const g = adj(), seen = new Set(), groups = [];
  for (const u of S.users) {
    if (seen.has(u.id)) continue;
    const component = [], q = [u.id]; seen.add(u.id);
    while (q.length) { const x = q.shift(); component.push(x);
      for (const y of g.get(x)) if (!seen.has(y)) { seen.add(y); q.push(y); }
    }
    groups.push(component);
  }
  return groups.sort((a, b) => b.length - a.length);
}
/* Advanced network intelligence: Brandes betweenness + Tarjan articulation/bridge analysis. */
function advancedMetrics() {
  const g = adj(), ids = S.users.map(u => u.id), n = ids.length;
  const close = new Map(), between = new Map(ids.map(id => [id, 0]));
  for (const source of ids) {
    const dist = new Map([[source, 0]]), sigma = new Map(ids.map(id => [id, 0]));
    const pred = new Map(ids.map(id => [id, []])), queue = [source], stack = [];
    sigma.set(source, 1);
    for (let qi = 0; qi < queue.length; qi++) {
      const v = queue[qi]; stack.push(v);
      for (const w of g.get(v)) {
        if (!dist.has(w)) { dist.set(w, dist.get(v) + 1); queue.push(w); }
        if (dist.get(w) === dist.get(v) + 1) { sigma.set(w, sigma.get(w) + sigma.get(v)); pred.get(w).push(v); }
      }
    }
    const reachable = dist.size - 1;
    const totalDistance = [...dist.values()].reduce((a, b) => a + b, 0);
    close.set(source, n > 1 && totalDistance ? (reachable / (n - 1)) * (reachable / totalDistance) : 0);
    const delta = new Map(ids.map(id => [id, 0]));
    while (stack.length) {
      const w = stack.pop();
      for (const v of pred.get(w)) delta.set(v, delta.get(v) + (sigma.get(v) / sigma.get(w)) * (1 + delta.get(w)));
      if (w !== source) between.set(w, between.get(w) + delta.get(w));
    }
  }
  // Undirected graph normalization.
  const denom = n > 2 ? ((n - 1) * (n - 2)) / 2 : 1;
  between.forEach((v, id) => between.set(id, v / denom));
  let time = 0; const disc = new Map(), low = new Map(), parent = new Map(), points = new Set(), bridges = [];
  function visit(u) {
    disc.set(u, ++time); low.set(u, time); let children = 0;
    for (const v of g.get(u)) {
      if (!disc.has(v)) {
        children++; parent.set(v, u); visit(v); low.set(u, Math.min(low.get(u), low.get(v)));
        if (!parent.has(u) && children > 1) points.add(u);
        if (parent.has(u) && low.get(v) >= disc.get(u)) points.add(u);
        if (low.get(v) > disc.get(u)) bridges.push([u, v]);
      } else if (parent.get(u) !== v) low.set(u, Math.min(low.get(u), disc.get(v)));
    }
  }
  ids.forEach(id => { if (!disc.has(id)) visit(id); });
  return { close, between, points, bridges };
}
function renderAdvancedInsights() {
  const m = advancedMetrics();
  const ranked = S.users.map(u => ({...u, closeness:m.close.get(u.id), betweenness:m.between.get(u.id)}))
    .sort((a,b) => b.betweenness-a.betweenness || b.closeness-a.closeness);
  $('influenceRanks').innerHTML = ranked.length ? ranked.slice(0,6).map((u,i) => `<div class="rank-row">${avatar(u,'s')}<div class="rank-name"><b>${escapeHTML(u.name)}</b><small>Closeness ${(u.closeness*100).toFixed(1)}% · Betweenness ${(u.betweenness*100).toFixed(1)}%</small></div><strong>#${i+1}</strong></div>`).join('') : empty('Add users to calculate influence.');
  const pointNames = [...m.points].map(nameOf);
  const bridgeNames = m.bridges.map(([a,b]) => `${nameOf(a)} ↔ ${nameOf(b)}`);
  $('criticalConnectors').innerHTML = `<div class="community-row"><div class="community-number">${m.points.size}</div><div><b>Articulation points</b><small>${pointNames.length ? pointNames.map(escapeHTML).join(', ') : 'No single user currently splits a community'}</small></div></div><div class="community-row"><div class="community-number">${m.bridges.length}</div><div><b>Bridge friendships</b><small>${bridgeNames.length ? bridgeNames.map(escapeHTML).join(' · ') : 'No single friendship disconnects the network'}</small></div></div>`;
  $('resilienceSummary').textContent = m.points.size || m.bridges.length
    ? `The network has ${m.points.size} critical user${m.points.size===1?'':'s'} and ${m.bridges.length} bridge friendship${m.bridges.length===1?'':'s'}. Removing one of these may increase the number of disconnected groups. Review these connections before changing the network.`
    : 'No articulation points or bridge friendships were found. The current network has no single user or friendship whose removal alone would split a connected component.';
}

function renderInsights() {
  const n = S.users.length, e = S.edges.length, g = adj(), groups = connectedComponents();
  const maxEdges = n > 1 ? n * (n - 1) / 2 : 0;
  const density = maxEdges ? (e / maxEdges * 100) : 0;
  const degrees = S.users.map(u => ({ ...u, degree: g.get(u.id).length }))
    .sort((a, b) => b.degree - a.degree || a.name.localeCompare(b.name));
  const isolated = degrees.filter(u => u.degree === 0).length;
  $('insightStats').innerHTML = [
    ['Network density', `${density.toFixed(1)}%`, 'Existing friendships ÷ all possible friendships'],
    ['Communities', groups.length, 'Separate connected groups'],
    ['Isolated users', isolated, 'Users with no connections'],
    ['Largest community', `${groups[0]?.length || 0} users`, 'People connected through any path']
  ].map(([label, value, note]) => `<div class="card insight-stat"><span>${label}</span><b>${value}</b><small>${note}</small></div>`).join('');
  $('leaderboard').innerHTML = degrees.length ? degrees.slice(0, 6).map((u, i) => `<div class="rank-row">${avatar(u, 's')}<div class="rank-name"><b>${u.name}</b><small>${u.degree} connection${u.degree === 1 ? '' : 's'}</small></div><div class="rank-track"><i style="width:${degrees[0].degree ? u.degree / degrees[0].degree * 100 : 0}%"></i></div><strong>#${i + 1}</strong></div>`).join('') : empty('Add users to see network rankings.');
  $('communities').innerHTML = groups.map((ids, i) => `<div class="community-row"><div class="community-number">${String(i + 1).padStart(2, '0')}</div><div><b>Community ${i + 1}</b><small>${ids.length} member${ids.length === 1 ? '' : 's'} · ${ids.map(nameOf).join(', ')}</small></div><span>${ids.length}</span></div>`).join('') || empty('No communities yet.');  renderAdvancedInsights();
}
function exportNetwork() {
  const payload = { project: 'Social Network Friend Finder', exportedAt: new Date().toISOString(), users: S.users, friendships: S.edges.map(([a, b]) => ({ user1: nameOf(a), user1Id: a, user2: nameOf(b), user2Id: b })) };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = 'social-network-data.json'; a.click(); URL.revokeObjectURL(url); toast('Network data exported');
}
function renderDashboard() {
  const n = S.users.length, e = S.edges.length, avg = n ? (2 * e / n).toFixed(1) : 0;
  const sug = S.users.reduce((s, u) => s + recommend(u.id).length, 0);
  $('stats').innerHTML = [['Total users', n], ['Total connections', e], ['Average connections', avg], ['Suggested friends', sug]]
    .map(([l, v]) => `<div class="card stat"><b>${v}</b><span>${l}</span></div>`).join('');
  const mx = Math.max(...S.history, 1);
  $('growth').innerHTML = S.history.map(v => `<div style="height:${v / mx * 100}%"><i>${v}</i></div>`).join('');
  $('activity').innerHTML = S.activity.map(a => `<li>${escapeHTML(a)}</li>`).join('');
  if ($('auditList')) $('auditList').innerHTML = S.activity.length ? S.activity.map((a, i) => `<li><span class="audit-dot"></span><div><b>${escapeHTML(a)}</b><small>${i === 0 ? 'Most recent change' : `${i + 1} events ago`}</small></div></li>`).join('') : empty('No activity recorded yet.');
}
function renderUsers() {
  const q = $('search').value.trim().toLowerCase(), g = adj();
  const list = S.users.filter(u => u.name.toLowerCase().includes(q));
  $('cards').innerHTML = list.length ? list.map(u => `<div class="card"><div class="item" style="background:none;padding:0">${avatar(u)}<div><b>${u.name}</b><div class="muted">ID: U${u.id}</div></div></div>
    <p class="muted">${escapeHTML(u.bio || 'No bio yet')}</p><p><b>${g.get(u.id).length}</b> connections</p>
    <div class="user-card-actions"><button class="btn sm" data-profile="${u.id}">View profile</button><button class="ghost sm" data-manage="${u.id}">Manage friends</button></div></div>`).join('') : empty(`No users match "${q}". Try another name or add a new user.`);
}
let activeProfile = null;
function openProfile(id) {
  const u = user(id); if (!u) return;
  activeProfile = id; const g = adj(), friends = g.get(id);
  $('profileAvatar').innerHTML = avatar(u);
  $('profileName').textContent = u.name;
  $('profileBio').textContent = u.bio || 'No bio has been added yet.';
  const recs = recommend(id).length;
  $('profileMetrics').innerHTML = `<div><b>${friends.length}</b><span>Connections</span></div><div><b>${bfs(id).length}</b><span>Reachable users</span></div><div><b>${recs}</b><span>Suggestions</span></div>`;
  $('profileFriends').innerHTML = friends.length ? friends.map(fid => `<div class="item">${avatar(user(fid), 's')}<span>${escapeHTML(nameOf(fid))}</span><button class="ghost sm" data-profile="${fid}">View</button></div>`).join('') : empty('No direct connections yet.');
  $('profileDlg').showModal();
}
function deleteUser(id) {
  const u = user(id); if (!u) return;
  if (!confirm(`Remove ${u.name} and all of their friendships? This cannot be undone.`)) return;
  S.users = S.users.filter(x => x.id !== id);
  S.edges = S.edges.filter(([a,b]) => a !== id && b !== id);
  if (selNet === id) selNet = null;
  log(`${u.name} was removed from the network`); $('profileDlg').close(); renderAll(); toast('User removed');
}
function openFriends(id) {
  $('frTitle').textContent = `Friends of ${nameOf(id)}`;
  $('frList').innerHTML = S.users.filter(u => u.id !== id).map(u => { const f = hasEdge(id, u.id);
    return `<div class="item">${avatar(u, 's')}<span style="flex:1">${u.name}</span><button type="button" class="btn sm ${f ? 'red' : ''}" data-tog="${u.id}">${f ? 'Remove' : 'Add friend'}</button></div>`; }).join('');
  $('frList').dataset.uid = id; $('frDlg').showModal();
}
let selNet = null;
function renderNetwork() {
  drawGraph('g-network', { sel: selNet, click: id => { selNet = selNet === id ? null : id; renderNetwork(); } });
  const g = adj();
  $('netInfo').textContent = selNet ? `${nameOf(selNet)} has ${g.get(selNet).length} friends: ${g.get(selNet).map(nameOf).join(', ') || 'none yet'}` : 'Select a user to see their friends highlighted in green.';
}
function renderMutual() {
  const a = +$('m1').value, b = +$('m2').value, out = $('mOut');
  if (a === b) { out.innerHTML = empty('Choose two different users to compare.'); return; }
  const m = mutual(a, b);
  out.innerHTML = `<div class="bar">${avatar(user(a))}<b>${nameOf(a)}</b><span>&amp;</span>${avatar(user(b))}<b>${nameOf(b)}</b></div>
    <h3>${m.length} mutual friend${m.length === 1 ? '' : 's'}</h3>` +
    (m.length ? `<div class="grid">${m.map(id => `<div class="item">${avatar(user(id), 's')}${nameOf(id)}</div>`).join('')}</div>` : empty(`${nameOf(a)} and ${nameOf(b)} have no friends in common.`));
}
function renderRecs() {
  const u = +$('recU').value, r = recommend(u);
  $('recOut').innerHTML = r.length ? r.map(x => `<div class="card"><div class="item" style="background:none;padding:0">${avatar(user(x.id))}<b>${nameOf(x.id)}</b></div>
    <p><b>${x.mutual.length}</b> mutual friend${x.mutual.length > 1 ? 's' : ''}</p>
    <p class="muted">Why this person? You both know ${x.mutual.map(nameOf).join(', ')}.</p>
    <button class="btn sm" data-add="${u}-${x.id}">Add friend</button></div>`).join('') : empty(`No suggestions for ${nameOf(u)} yet. Add more friends to grow their network.`);
}

/* Animated traversal (BFS / DFS) */
let timers = [];
function runTraversal(kind) {
  timers.forEach(clearTimeout); timers = [];
  const s = +$(kind + 'S').value, order = (kind === 'bfs' ? bfs : dfs)(s), out = $(kind + 'Out');
  out.innerHTML = ''; drawGraph('g-' + kind, {});
  order.forEach((id, i) => timers.push(setTimeout(() => {
    drawGraph('g-' + kind, { visited: order.slice(0, i + 1), current: id });
    out.innerHTML = chips(order.slice(0, i + 1)) + (i === order.length - 1 ? `<span class="muted">Visited ${order.length} of ${S.users.length} users.</span>` : '');
  }, i * 700)));
}
function runPath() {
  const a = +$('p1').value, b = +$('p2').value, out = $('pathOut');
  if (a === b) { out.innerHTML = '<span class="muted">Choose two different users.</span>'; drawGraph('g-path'); return; }
  const p = shortestPath(a, b);
  if (!p) { out.innerHTML = `<span class="muted">No connection exists between ${nameOf(a)} and ${nameOf(b)}.</span>`; drawGraph('g-path'); return; }
  drawGraph('g-path', { path: p });
  out.innerHTML = chips(p) + `<span class="muted">${p.length - 1} connection level${p.length > 2 ? 's' : ''}</span>`;
}


/* ---------- Step-by-step Algorithm Lab ---------- */
let labTrace = [], labIndex = -1, labPlayTimer = null;
function buildLabTrace() {
  stopLabPlay();
  const kind = $('labAlgo').value, start = +$('labStart').value, g = adj();
  const frontier = [start], seen = new Set(kind === 'bfs' ? [start] : []), order = [], trace = [];
  const label = kind === 'bfs' ? 'Queue' : 'Stack';
  trace.push({ current: null, frontier: [...frontier], visited: [], order: [], title: 'Ready', explain: `${kind.toUpperCase()} starts at ${nameOf(start)}. The starting user is placed in the ${label.toLowerCase()}.` });
  while (frontier.length) {
    const current = kind === 'bfs' ? frontier.shift() : frontier.pop();
    if (kind === 'dfs' && seen.has(current)) continue;
    seen.add(current);
    order.push(current);
    const newlyAdded = [];
    // Mark on insertion to avoid adding the same user more than once.
    const neighbours = kind === 'dfs' ? [...g.get(current)].reverse() : g.get(current);
    for (const next of neighbours) if (!seen.has(next)) { if (kind === 'bfs') seen.add(next); frontier.push(next); newlyAdded.push(next); }
    const frontierNames = frontier.map(nameOf).join(', ') || 'empty';
    trace.push({ current, frontier: [...frontier], visited: [...order], order: [...order], title: `Visit ${nameOf(current)}`, explain: `${kind.toUpperCase()} removes ${nameOf(current)} from the ${label.toLowerCase()}. ${newlyAdded.length ? `It discovers ${newlyAdded.map(nameOf).join(', ')} and adds ${newlyAdded.map(nameOf).join(', ')} to the ${label.toLowerCase()}.` : 'No unvisited neighbours are left to add.'} ${label}: ${frontierNames}.` });
  }
  labTrace = trace; labIndex = 0;
  $('labFrontierTitle').textContent = label;
  $('labConcept').textContent = kind === 'bfs' ? 'BFS uses a queue (First In, First Out). It explores all immediate neighbours before moving to the next level.' : 'DFS uses a stack (Last In, First Out). It follows a branch deeply; neighbours are pushed in reverse ID order so the visit order matches the recursive DFS used elsewhere in this project.';
  $('labPrev').disabled = true; $('labNext').disabled = false; $('labPlay').disabled = false;
  renderLabStep();
}
function renderLabStep() {
  if (!labTrace.length || labIndex < 0) return;
  const step = labTrace[labIndex], kind = $('labAlgo').value;
  $('labCurrent').textContent = step.title;
  $('labExplain').textContent = step.explain;
  const tokenHTML = ids => ids.length ? ids.map(id => `<span class="algo-token">${escapeHTML(nameOf(id))}</span>`).join('') : '<span class="muted">Empty</span>';
  $('labFrontier').innerHTML = tokenHTML(step.frontier);
  $('labVisited').innerHTML = tokenHTML(step.visited);
  $('labOrder').innerHTML = tokenHTML(step.order);
  $('labStepLabel').textContent = `Step ${labIndex + 1} of ${labTrace.length}`;
  $('labProgress').style.width = `${(labIndex + 1) / labTrace.length * 100}%`;
  $('labPrev').disabled = labIndex === 0;
  $('labNext').disabled = labIndex === labTrace.length - 1;
  drawGraph('g-algo', { visited: step.visited, current: step.current });
  if (labIndex === labTrace.length - 1) stopLabPlay();
}
function stopLabPlay() { if (labPlayTimer) clearInterval(labPlayTimer); labPlayTimer = null; if ($('labPlay')) $('labPlay').textContent = '▶ Auto play'; }
function moveLab(delta) { if (!labTrace.length) return; labIndex = Math.max(0, Math.min(labTrace.length - 1, labIndex + delta)); renderLabStep(); }
function toggleLabPlay() {
  if (labPlayTimer) { stopLabPlay(); return; }
  if (!labTrace.length || labIndex === labTrace.length - 1) buildLabTrace();
  $('labPlay').textContent = 'Ⅱ Pause';
  labPlayTimer = setInterval(() => { if (labIndex >= labTrace.length - 1) { stopLabPlay(); return; } moveLab(1); }, 1050);
}
function fillLabSelect() {
  const el = $('labStart'); if (!el) return;
  const old = el.value; el.innerHTML = S.users.map(u => `<option value="${u.id}">${escapeHTML(u.name)}</option>`).join('');
  if (old && user(+old)) el.value = old;
}

/* ---------- Wiring ---------- */
function fillSelects() {
  const opts = S.users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
  ['m1', 'm2', 'bfsS', 'dfsS', 'recU', 'p1', 'p2'].forEach(id => { const el = $(id), v = el.value; el.innerHTML = opts; if (v && user(+v)) el.value = v; });
  if (!$('m2').dataset.init && S.users.length > 1) { $('m2').selectedIndex = 1; $('p2').selectedIndex = Math.min(S.users.length - 1, 10); $('m2').dataset.init = 1; }
}
function renderAll() { fillSelects(); fillLabSelect(); renderDashboard(); renderUsers(); renderNetwork(); renderMutual(); renderRecs(); renderInsights(); runPath();
  ['bfs', 'dfs'].forEach(k => { drawGraph('g-' + k, {}); }); }
function go(page) {
  const label = document.querySelector(`#nav button[data-page="${page}"]`);
  if ($('currentSection')) $('currentSection').textContent = label ? label.textContent.trim() : page;
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('on', p.id === page));
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('on', b.dataset.page === page));
  $('side').classList.remove('open'); timers.forEach(clearTimeout);
}
$('nav').onclick = e => e.target.dataset.page && go(e.target.dataset.page);
document.addEventListener('click', e => {
  const t = e.target;
  if (t.dataset.go) go(t.dataset.go);
  if (t.dataset.manage) openFriends(+t.dataset.manage);
  if (t.dataset.profile) openProfile(+t.dataset.profile);
  if (t.dataset.tog) { const u = +$('frList').dataset.uid, v = +t.dataset.tog; hasEdge(u, v) ? removeFriend(u, v) : addFriend(u, v); openFriends(u); }
  if (t.dataset.add) { const [a, b] = t.dataset.add.split('-').map(Number); addFriend(a, b); }
});
$('menu').onclick = () => $('side').classList.toggle('open');
$('search').oninput = renderUsers;
function closeUserDialog() {
  const dlg = $('userDlg');
  if (dlg.open) dlg.close();
  $('uErr').textContent = '';
}
$('addUser').onclick = () => { $('uName').value = $('uBio').value = ''; $('uErr').textContent = ''; $('userDlg').showModal(); $('uName').focus(); };
$('uCancel').onclick = closeUserDialog;
$('uClose').onclick = closeUserDialog;
// Native Escape handling plus an explicit fallback for consistent browser behaviour.
$('userDlg').addEventListener('cancel', e => { e.preventDefault(); closeUserDialog(); });
// Clicking the dimmed backdrop closes the dialog; clicks inside the form do not.
$('userDlg').addEventListener('click', e => { if (e.target === $('userDlg')) closeUserDialog(); });
$('uSave').onclick = () => {
  const name = $('uName').value.trim();
  if (!name) return $('uErr').textContent = 'Enter a name to continue.';
  if (S.users.some(u => u.name.toLowerCase() === name.toLowerCase())) return $('uErr').textContent = 'That name already exists. Choose a different one.';
  S.users.push({ id: Math.max(0, ...S.users.map(u => u.id)) + 1, name, bio: $('uBio').value.trim() });
  log(`${name} joined the network`); $('userDlg').close(); renderAll(); toast('User added');
};
$('exportData').onclick = exportNetwork;
$('exportAudit').onclick = () => { const payload = { project: 'Social Network Friend Finder', exportedAt: new Date().toISOString(), users: S.users, friendships: S.edges, activity: S.activity }; const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'}); const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'social-network-full-backup.json'; a.click(); URL.revokeObjectURL(url); toast('Full backup exported'); };
$('profileClose').onclick = () => $('profileDlg').close();
$('profileManage').onclick = () => { const id = activeProfile; $('profileDlg').close(); openFriends(id); };
$('profileDelete').onclick = () => deleteUser(activeProfile);
$('mGo').onclick = renderMutual; $('m1').onchange = $('m2').onchange = renderMutual; $('recU').onchange = renderRecs;
$('bfsGo').onclick = () => runTraversal('bfs'); $('dfsGo').onclick = () => runTraversal('dfs'); $('pGo').onclick = runPath;
$('labBuild').onclick = buildLabTrace; $('labPrev').onclick = () => moveLab(-1); $('labNext').onclick = () => moveLab(1); $('labPlay').onclick = toggleLabPlay;
$('labAlgo').onchange = () => { stopLabPlay(); labTrace = []; labIndex = -1; $('labCurrent').textContent = 'Ready to explore'; $('labExplain').textContent = 'Build a new trace to inspect each operation.'; $('labPrev').disabled = $('labNext').disabled = $('labPlay').disabled = true; $('g-algo').innerHTML = ''; };
$('labStart').onchange = () => { if (labTrace.length) buildLabTrace(); };
$('reset').onclick = () => { if (confirm('Reset all data to the original demo network?')) { S = clone(SAMPLE); selNet = null; graphPositions.clear(); save(); renderAll(); toast('Demo data restored'); } };
$('graphZoomIn').onclick = () => { graphZoom = Math.min(1.7, +(graphZoom + .1).toFixed(2)); renderNetwork(); };
$('graphZoomOut').onclick = () => { graphZoom = Math.max(.7, +(graphZoom - .1).toFixed(2)); renderNetwork(); };
$('graphFit').onclick = () => { graphZoom = 1; renderNetwork(); };
$('graphReset').onclick = () => { graphPositions.clear(); graphZoom = 1; renderNetwork(); toast('Graph layout reset'); };
renderAll();
