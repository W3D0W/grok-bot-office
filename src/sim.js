import { findPath, nearestPoint, occupiedCost } from './nav.js';
import { denverParts, formatDenver, isQuiet, parseWhen, crossed, stampWeekly, DEMO_START_MS } from './schedule.js';
import { forward, roomFor } from './layout.js';

const WALK = 1.45;

export function createSim({ data, activity, plan, actors }) {
  const byName = new Map(actors.map((actor) => [actor.name, actor]));
  const routines = data.routines.map((routine) => {
    const fallback = /monthly/i.test(routine.schedule) ? 9 * 60 : 9 * 60 + 30;
    return { ...routine, when: parseWhen(routine.schedule, fallback) };
  });
  stampWeekly(routines);
  const catalog = data.handoffs.map((handoff, index) => ({
    ...handoff,
    when: {
      type: 'clock',
      minutes: 9 * 60 + index * 18,
      weekdays: new Set([1, 2, 3, 4, 5]),
      monthly: false,
    },
  }));
  const live = (activity?.events || []).map((event) => ({ ...event, when: parseWhen(event.at) }));

  const bots = data.bots.map((bot) => {
    const home = plan.homes[bot.name];
    return {
      ...bot,
      home,
      x: home.x,
      z: home.z,
      yaw: home.yaw,
      yawTarget: home.yaw,
      mode: 'idle',
      path: [],
      queue: [],
      timer: 2 + Math.random() * 4,
      wait: 0,
      cooldown: Math.random() * 8,
      label: '',
      glance: 0,
      route: null,
      dest: null,
      actor: byName.get(bot.name),
    };
  });

  const state = {
    demo: true,
    speed: 90,
    ms: DEMO_START_MS,
    prev: denverParts(DEMO_START_MS),
    filter: 'All',
    selected: null,
    hover: null,
    feed: [],
    quiet: false,
    showcaseT: 0,
    showcaseI: 0,
    elapsed: 0,
    recent: new Map(),
  };

  const showcase = [
    { at: 0.4, run: () => { startHandoff(botNamed('Job Bot'), 'Interview Bot', 'interview details'); } },
    { at: 0.8, run: () => forcePatrols() },
    { at: 2.2, run: () => enqueueWork(botNamed('Scout Bot'), 'Premarket scan', true) },
    { at: 5, run: () => enqueueWork(botNamed('Manager Bot'), 'Friction scan', false) },
    { at: 9, run: () => startHandoff(botNamed('Social Bot'), 'Calendar Bot', 'scheduling') },
    { at: 14, run: () => enqueueWork(botNamed('Nutrition Bot'), 'Weekly plan', false) },
    { at: 18, run: () => startHandoff(botNamed('Draft Bot'), 'Review Bot', 'draft') },
  ];

  function botNamed(name) {
    return bots.find((bot) => bot.name === name);
  }

  function note(text) {
    const parts = denverParts(state.ms);
    state.feed.unshift({ time: formatDenver(parts), text });
    state.feed.length = Math.min(state.feed.length, 14);
  }

  function recently(key) {
    const now = state.elapsed;
    const last = state.recent.get(key);
    if (last != null && now - last < 12) return true;
    state.recent.set(key, now);
    return false;
  }

  function setPath(bot, dest) {
    const goal = nearestPoint(plan.nav, dest.x, dest.z) || dest;
    bot.dest = goal;
    const path = findPath(plan.nav, bot, goal, occupiedCost(plan.nav, bots, bot));
    bot.path = path || [];
    bot.wait = 0;
  }

  function movingToward(bot, dest) {
    setPath(bot, dest);
  }

  function free(bot) {
    return bot.mode === 'idle' || bot.mode === 'wander' || bot.mode === 'patrol' || bot.mode === 'glance' || bot.mode === 'return';
  }

  function enqueue(bot, item) {
    if (!bot || state.quiet && item.kind !== 'sleep') return;
    if (free(bot)) begin(bot, item);
    else bot.queue.push(item);
  }

  function begin(bot, item) {
    if (item.kind === 'handoff') startHandoff(bot, item.to, item.label);
    else if (item.kind === 'work') startWork(bot, item.label, false);
    else if (item.kind === 'paused') startWork(bot, item.label, true);
  }

  function pump(bot) {
    if (state.quiet) return;
    const next = bot.queue.shift();
    if (next) begin(bot, next);
    else {
      bot.mode = 'idle';
      bot.timer = 1.5 + Math.random() * 3;
      bot.label = '';
    }
  }

  function startHandoff(bot, toName, label) {
    const target = botNamed(toName);
    if (!bot || !target) return;
    if (bot.mode === 'handoff' || bot.mode === 'deliver') {
      bot.queue.push({ kind: 'handoff', to: toName, label });
      return;
    }
    const key = `${bot.name}>${toName}:${label}`;
    if (recently(key)) return;
    const side = forward(target.home.yaw);
    const dest = {
      x: target.home.x - side.z * 0.8,
      z: target.home.z + side.x * 0.8,
    };
    bot.mode = 'handoff';
    bot.phase = 'walk';
    bot.label = label;
    bot.targetName = toName;
    bot.route = null;
    movingToward(bot, dest);
    note(`${bot.name} is carrying ${label} to ${toName}`);
  }

  function enqueueWork(bot, label, paused) {
    if (!bot) return;
    const key = `${bot.name}:${label}:${paused ? 'p' : 'w'}`;
    if (recently(key)) return;
    enqueue(bot, { kind: paused ? 'paused' : 'work', label });
  }

  function startWork(bot, label, paused) {
    bot.mode = paused ? 'paused' : 'work';
    bot.label = label;
    bot.phase = 'walk';
    bot.timer = 0;
    movingToward(bot, { x: bot.home.x, z: bot.home.z });
    note(paused ? `${bot.name} paused · ${label}` : `${bot.name} started ${label}`);
  }

  function startSleep(bot) {
    bot.mode = 'sleep';
    bot.label = '';
    bot.route = null;
    bot.phase = 'walk';
    movingToward(bot, { x: bot.home.x, z: bot.home.z });
  }

  function startReturn(bot) {
    bot.mode = 'return';
    bot.phase = 'walk';
    bot.label = '';
    bot.route = null;
    movingToward(bot, { x: bot.home.x, z: bot.home.z });
  }

  function startPatrol(bot) {
    if (!bot || !free(bot) || state.quiet) return;
    const pool = plan.pois.filter((poi) => poi.section !== bot.section);
    const picks = shuffle(pool).slice(0, 3);
    if (!picks.length) return;
    bot.mode = 'patrol';
    bot.phase = 'walk';
    bot.route = picks.map((poi) => ({ ...poi }));
    bot.routeIndex = 0;
    bot.phase = 'walk';
    bot.label = picks.map((poi) => poi.label).join(', ');
    movingToward(bot, picks[0]);
    note(`${bot.name} stepped out · ${picks[0].label}`);
    bot.cooldown = 28 + Math.random() * 40;
  }

  function forcePatrols() {
    for (const name of ['Grocery Bot', 'Video Bot', 'Email Bot']) {
      if (bots.filter((bot) => bot.mode === 'patrol' || bot.mode === 'glance').length >= 3) break;
      startPatrol(botNamed(name));
    }
  }

  function startWander(bot) {
    if (bot.section === 'Social Media') {
      const spot = Math.random() < 0.5 ? plan.pois.find((poi) => poi.id === 'movie') : plan.pois.find((poi) => poi.id === 'theater');
      bot.mode = 'wander';
      bot.phase = 'walk';
      movingToward(bot, Math.random() < 0.25 ? bot.home : spot);
      return;
    }
    const poi = plan.pois.find((item) => item.section === bot.section);
    const random = randomPoint(bot.section);
    const dest = Math.random() < 0.45 && poi ? poi : (random || bot.home);
    bot.mode = 'wander';
    bot.phase = 'walk';
    movingToward(bot, dest);
  }

  function randomPoint(section) {
    const room = roomFor(section);
    if (!room) return null;
    for (let i = 0; i < 10; i++) {
      const x = room.x0 + 1 + Math.random() * (room.x1 - room.x0 - 2);
      const z = room.z0 + 1 + Math.random() * (room.z1 - room.z0 - 2);
      if (!plan.nav.blockedWorld(x, z)) return { x, z, look: null };
    }
    return null;
  }

  function arrive(bot) {
    const homeDist = Math.hypot(bot.x - bot.home.x, bot.z - bot.home.z);
    if (bot.mode === 'handoff') {
      bot.mode = 'deliver';
      bot.timer = 2.7;
      const target = botNamed(bot.targetName);
      if (target) {
        bot.yawTarget = Math.atan2(target.x - bot.x, target.z - bot.z);
        if (target.mode === 'idle' || target.mode === 'wander' || target.mode === 'patrol' || target.mode === 'glance') {
          target.mode = 'react';
          target.timer = 2.7;
          target.yawTarget = Math.atan2(bot.x - target.x, bot.z - target.z);
          target.label = '';
        }
      }
      note(`${bot.name} handed ${bot.label} to ${bot.targetName}`);
      return;
    }
    if (bot.mode === 'work' || bot.mode === 'paused') {
      bot.phase = 'act';
      bot.timer = 8;
      bot.yawTarget = bot.home.yaw;
      return;
    }
    if (bot.mode === 'sleep') {
      bot.phase = 'act';
      bot.yawTarget = bot.home.yaw;
      return;
    }
    if (bot.mode === 'return' || (bot.mode === 'wander' && homeDist < 0.4 && !bot.dest)) {
      bot.mode = 'idle';
      bot.timer = 2 + Math.random() * 4;
      bot.yawTarget = bot.home.yaw;
      return;
    }
    if (bot.mode === 'patrol') {
      const spot = bot.route[bot.routeIndex];
      bot.mode = 'glance';
      bot.timer = 2.1 + Math.random() * 1.8;
      if (spot?.look) bot.yawTarget = Math.atan2(spot.look.x - bot.x, spot.look.z - bot.z);
      return;
    }
    if (bot.mode === 'wander') {
      bot.mode = 'glance';
      bot.timer = 1.6 + Math.random() * 1.8;
      bot.yawTarget = bot.yaw + (Math.random() - 0.5) * 1.2;
    }
  }

  function follow(bot, dt) {
    if (!bot.path.length) return 0;
    const point = bot.path[0];
    const dx = point.x - bot.x;
    const dz = point.z - bot.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.12) {
      bot.path.shift();
      return follow(bot, dt);
    }
    const crowded = bots.some((other) => other !== bot && Math.hypot(other.x - point.x, other.z - point.z) < 0.5);
    if (crowded && dist < 1.3) {
      bot.wait += dt;
      const limit = bot.mode === 'handoff' ? 0.35 : 1.05;
      if (bot.wait > limit) {
        if (bot.dest) setPath(bot, bot.dest);
        bot.wait = 0;
      }
      return 0;
    }
    const step = Math.min(dist, WALK * dt);
    const nx = bot.x + (dx / dist) * step;
    const nz = bot.z + (dz / dist) * step;
    if (plan.nav.blockedWorld(nx, nz)) {
      bot.wait += dt;
      if (bot.wait > 0.45 && bot.dest) {
        setPath(bot, bot.dest);
        bot.wait = 0;
      }
      return 0;
    }
    bot.x = nx;
    bot.z = nz;
    bot.yawTarget = Math.atan2(dx, dz);
    bot.wait = 0;
    return step / Math.max(dt, 0.0001);
  }

  function separate() {
    for (let i = 0; i < bots.length; i++) {
      for (let j = i + 1; j < bots.length; j++) {
        const a = bots[i];
        const b = bots[j];
        let dx = b.x - a.x;
        let dz = b.z - a.z;
        let dist = Math.hypot(dx, dz);
        if (dist < 0.001) {
          dx = 0.02;
          dz = 0;
          dist = 0.02;
        }
        const min = 0.62;
        if (dist >= min) continue;
        const push = (min - dist) / 2;
        const nx = dx / dist;
        const nz = dz / dist;
        nudge(a, -nx * push, -nz * push);
        nudge(b, nx * push, nz * push);
      }
    }
  }

  function nudge(bot, dx, dz) {
    const x = bot.x + dx;
    const z = bot.z + dz;
    if (!plan.nav.blockedWorld(x, z)) {
      bot.x = x;
      bot.z = z;
    }
  }

  function director(dt) {
    for (const bot of bots) bot.cooldown = Math.max(0, bot.cooldown - dt);
    if (state.quiet) {
      for (const bot of bots) {
        if (bot.mode === 'patrol' || bot.mode === 'glance' || bot.mode === 'wander') startSleep(bot);
      }
      return;
    }
    const active = bots.filter((bot) => bot.mode === 'patrol' || bot.mode === 'glance').length;
    if (active >= 4) return;
    if (active >= 2 && Math.random() > dt * 0.22) return;
    if (active < 2 || Math.random() < dt * 0.3) {
      const pool = bots.filter((bot) => (bot.mode === 'idle' || bot.mode === 'wander') && bot.cooldown <= 0 && bot.queue.length === 0);
      if (!pool.length) return;
      startPatrol(pool[Math.floor(Math.random() * pool.length)]);
    }
  }

  function applyVisual(bot, moving, dt) {
    const actor = bot.actor;
    if (!actor) return;
    let anim = 'Idle_Neutral';
    if (moving > 0.2) anim = 'Walk';
    else if (bot.mode === 'deliver' || bot.mode === 'react') anim = 'Wave';
    else if (bot.mode === 'work' && bot.phase === 'act') anim = 'Interact';
    const kick = (bot.mode === 'deliver' || bot.mode === 'react') && !bot.waved;
    if (bot.mode === 'deliver' || bot.mode === 'react') bot.waved = true;
    else bot.waved = false;
    actor.setAnim(anim, kick);
    actor.setCarry(bot.mode === 'handoff' || bot.mode === 'deliver');
    actor.setBubble((bot.mode === 'handoff' || bot.mode === 'deliver') ? bot.label : '');
    actor.setBadge(bot.mode === 'work' && bot.phase === 'act' ? bot.label : bot.mode === 'paused' && bot.phase === 'act' ? `Paused · ${bot.label}` : '');
    actor.setZzz((bot.mode === 'sleep' && bot.phase === 'act') || (bot.mode === 'paused' && bot.phase === 'act'));
    actor.wrapper.position.set(bot.x, 0.04, bot.z);
    actor.wrapper.rotation.y = bot.yaw;
    const visible = state.filter === 'All' || state.filter === bot.section;
    actor.setVisible(visible);
    actor.setHighlight(state.selected === bot.name || state.hover === bot.name);
    actor.update(dt, state.elapsed);
  }

  function updateBot(bot, dt) {
    if (bot.timer > 0) bot.timer -= dt;
    if (bot.mode === 'deliver' && bot.timer <= 0) {
      bot.mode = 'return';
      bot.phase = 'walk';
      bot.label = '';
      movingToward(bot, bot.home);
    } else if (bot.mode === 'react' && bot.timer <= 0) {
      pump(bot);
    } else if ((bot.mode === 'work' || bot.mode === 'paused') && bot.phase === 'act' && bot.timer <= 0) {
      pump(bot);
    } else if (bot.mode === 'glance' && bot.timer <= 0) {
      if (bot.route && bot.routeIndex < bot.route.length - 1) {
        bot.routeIndex += 1;
        bot.mode = 'patrol';
        bot.phase = 'walk';
        movingToward(bot, bot.route[bot.routeIndex]);
      } else if (bot.route) {
        bot.route = null;
        startReturn(bot);
      } else {
        bot.mode = 'idle';
        bot.timer = 2 + Math.random() * 5;
      }
    } else if (bot.mode === 'idle' && bot.timer <= 0 && !state.quiet) {
      startWander(bot);
    }

    const traveling = bot.mode === 'handoff' || bot.mode === 'work' || bot.mode === 'paused' || bot.mode === 'sleep' || bot.mode === 'patrol' || bot.mode === 'wander' || bot.mode === 'return';
    let speed = 0;
    if (traveling && bot.phase !== 'act') {
      speed = follow(bot, dt);
      if (!bot.path.length) {
        const dest = bot.dest;
        const left = dest ? Math.hypot(bot.x - dest.x, bot.z - dest.z) : 0;
        if (!dest || left < 0.45) arrive(bot);
      }
    }
    bot.yaw = damp(bot.yaw, bot.yawTarget, dt);
    applyVisual(bot, speed, dt);
  }

  function onClock(prev, now) {
    const quiet = isQuiet(now, data.quietHours);
    if (quiet !== state.quiet) {
      state.quiet = quiet;
      if (quiet) {
        note('Quiet hours. The office is heading home.');
        for (const bot of bots) startSleep(bot);
      } else {
        note('Morning. The floor is awake.');
        for (const bot of bots) {
          if (bot.mode === 'sleep') pump(bot);
        }
      }
    }
    if (quiet) return;
    for (const routine of routines) {
      if (!crossed(routine.when, prev, now)) continue;
      enqueueWork(botNamed(routine.bot), routine.name, !!routine.paused);
    }
    for (const handoff of catalog) {
      if (!crossed(handoff.when, prev, now)) continue;
      startHandoff(botNamed(handoff.from), handoff.to, handoff.label);
    }
    for (const event of live) {
      if (!crossed(event.when, prev, now)) continue;
      if (event.type === 'handoff') startHandoff(botNamed(event.from), event.to, event.label);
      else enqueueWork(botNamed(event.from), event.label || event.type, false);
    }
  }

  note('Demo day opened on a Monday morning.');

  return {
    get demo() { return state.demo; },
    get speed() { return state.speed; },
    get filter() { return state.filter; },
    get selected() { return state.selected; },
    get feed() { return state.feed; },
    get quiet() { return state.quiet; },
    parts() { return denverParts(state.ms); },
    bots,
    setSpeed(value) { state.speed = value; },
    setFilter(section) { state.filter = section; },
    setSelected(name) { state.selected = name; },
    setHover(name) { state.hover = name; },
    setDemo(on) {
      state.demo = on;
      state.showcaseT = 0;
      state.showcaseI = 0;
      if (on) {
        state.speed = 90;
        state.ms = DEMO_START_MS;
        state.prev = denverParts(state.ms);
        state.quiet = false;
        note('Demo day rewound to Monday 6:20 AM.');
      } else {
        state.speed = 1;
        state.ms = Date.now();
        state.prev = denverParts(state.ms);
        state.quiet = isQuiet(state.prev, data.quietHours);
        note('Live Mountain Time.');
        for (const bot of bots) {
          if (state.quiet) startSleep(bot);
          else if (!free(bot) && bot.mode !== 'react') startReturn(bot);
        }
      }
    },
    update(dt) {
      state.elapsed += dt;
      const before = state.ms;
      state.ms += dt * state.speed * 1000;
      const now = denverParts(state.ms);
      onClock(state.prev, now);
      state.prev = now;
      if (state.demo) {
        state.showcaseT += dt;
        while (state.showcaseI < showcase.length && state.showcaseT >= showcase[state.showcaseI].at) {
          showcase[state.showcaseI].run();
          state.showcaseI += 1;
        }
      }
      director(dt);
      for (const bot of bots) updateBot(bot, dt);
      separate();
      for (const bot of bots) {
        bot.actor.wrapper.position.set(bot.x, 0.04, bot.z);
      }
      void before;
    },
  };
}

function damp(current, target, dt) {
  let delta = target - current;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * (1 - Math.exp(-8 * dt));
}

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
