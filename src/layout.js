import { createNav } from './nav.js';

/** Wall gaps are wider than one grid cell so rooms do not leak into each other. */
const OUTER_W = -27.5;
const OUTER_E = 27.5;
const OUTER_N = -22.5;
const OUTER_S = 22.5;
const N_INNER = -11.25;
const N_CORR_N = -10.55;
const N_CORR_S = -7.85;
const MID_N = -7.15;
const MID_S = 7.15;
const S_CORR_N = 7.85;
const S_CORR_S = 10.55;
const S_INNER = 11.25;
const W_INNER = -11.25;
const W_HALL_W = -10.55;
const W_HALL_E = -7.85;
const M_W = -7.15;
const M_E = 7.15;
const E_HALL_W = 7.85;
const E_HALL_E = 10.55;
const E_INNER = 11.25;
const SPLIT = 0.8;

export const ROOMS = [
  { id: 'jobs', section: 'Jobs', x0: OUTER_W, x1: -SPLIT, z0: OUTER_N, z1: N_INNER },
  { id: 'work', section: 'Work', x0: SPLIT, x1: OUTER_E, z0: OUTER_N, z1: N_INNER },
  { id: 'personal', section: 'Personal', x0: OUTER_W, x1: W_INNER, z0: MID_N, z1: MID_S },
  { id: 'manager', section: 'Manager', x0: M_W, x1: M_E, z0: MID_N, z1: MID_S },
  { id: 'finance', section: 'Finance', x0: E_INNER, x1: OUTER_E, z0: MID_N, z1: MID_S },
  { id: 'food', section: 'Food', x0: OUTER_W, x1: -SPLIT, z0: S_INNER, z1: OUTER_S },
  { id: 'social', section: 'Social Media', x0: SPLIT, x1: OUTER_E, z0: S_INNER, z1: OUTER_S },
];

const CORRIDORS = [
  { id: 'north', x0: OUTER_W, x1: OUTER_E, z0: N_CORR_N, z1: N_CORR_S },
  { id: 'south', x0: OUTER_W, x1: OUTER_E, z0: S_CORR_N, z1: S_CORR_S },
  { id: 'west', x0: W_HALL_W, x1: W_HALL_E, z0: N_CORR_N, z1: S_CORR_S },
  { id: 'east', x0: E_HALL_W, x1: E_HALL_E, z0: N_CORR_N, z1: S_CORR_S },
];

/** Doorways overlap both sides of a wall so the grid stays connected. */
export const DOORS = [
  { id: 'jobs', x0: -6.6, x1: -2.8, z0: N_INNER - 0.15, z1: N_CORR_N + 0.45 },
  { id: 'work', x0: 2.8, x1: 6.6, z0: N_INNER - 0.15, z1: N_CORR_N + 0.45 },
  { id: 'personal', x0: W_INNER - 0.15, x1: W_HALL_W + 0.45, z0: -1.5, z1: 1.5 },
  { id: 'finance', x0: E_HALL_E - 0.45, x1: E_INNER + 0.15, z0: -1.5, z1: 1.5 },
  { id: 'food', x0: -6.6, x1: -2.8, z0: S_CORR_S - 0.45, z1: S_INNER + 0.15 },
  { id: 'social', x0: 2.8, x1: 6.6, z0: S_CORR_S - 0.45, z1: S_INNER + 0.15 },
  { id: 'manager-n', x0: -1.6, x1: 1.6, z0: N_CORR_S - 0.45, z1: MID_N + 0.15 },
  { id: 'manager-s', x0: -1.6, x1: 1.6, z0: MID_S - 0.15, z1: S_CORR_N + 0.45 },
  { id: 'manager-w', x0: W_HALL_E - 0.45, x1: M_W + 0.15, z0: -1.45, z1: 1.45 },
  { id: 'manager-e', x0: M_E - 0.15, x1: E_HALL_W + 0.45, z0: -1.45, z1: 1.45 },
];

const PI = Math.PI;
const FACE_N = PI;
const FACE_S = 0;
const FACE_E = PI / 2;
const FACE_W = -PI / 2;

export const HOMES = {
  'Job Bot': { x: -24.4, z: -19.4, yaw: FACE_N, section: 'Jobs' },
  'Search Bot': { x: -20.9, z: -19.4, yaw: FACE_N, section: 'Jobs' },
  'Resume Bot': { x: -17.4, z: -19.4, yaw: FACE_N, section: 'Jobs' },
  'Application Bot': { x: -13.9, z: -19.4, yaw: FACE_N, section: 'Jobs' },
  'Tracker Bot': { x: -10.4, z: -19.4, yaw: FACE_N, section: 'Jobs' },
  'Interview Bot': { x: -6.9, z: -19.4, yaw: FACE_N, section: 'Jobs' },

  'Work Bot': { x: 6.2, z: -19.4, yaw: FACE_N, section: 'Work' },
  'Work Email Bot': { x: 11.0, z: -19.4, yaw: FACE_N, section: 'Work' },
  'Work Calendar Bot': { x: 16.2, z: -19.4, yaw: FACE_N, section: 'Work' },
  'PTO Bot': { x: 21.6, z: -19.4, yaw: FACE_N, section: 'Work' },

  'Life Bot': { x: -24.5, z: -4.4, yaw: FACE_W, section: 'Personal' },
  'Calendar Bot': { x: -24.5, z: 0.2, yaw: FACE_W, section: 'Personal' },
  'Email Bot': { x: -24.5, z: 4.6, yaw: FACE_W, section: 'Personal' },

  'Finance Bot': { x: 24.5, z: -5.2, yaw: FACE_E, section: 'Finance' },
  'Draft Bot': { x: 24.5, z: -2.6, yaw: FACE_E, section: 'Finance' },
  'Review Bot': { x: 24.5, z: 0.0, yaw: FACE_E, section: 'Finance' },
  'Strategy Bot': { x: 24.5, z: 2.6, yaw: FACE_E, section: 'Finance' },
  'Scout Bot': { x: 24.5, z: 5.2, yaw: FACE_E, section: 'Finance' },

  'Nutrition Bot': { x: -22.2, z: 13.5, yaw: FACE_N, section: 'Food' },
  'Grocery Bot': { x: -17.4, z: 13.5, yaw: FACE_N, section: 'Food' },

  'Social Bot': { x: 9.2, z: 13.7, yaw: FACE_N, section: 'Social Media' },
  'Video Bot': { x: 12.8, z: 13.7, yaw: FACE_N, section: 'Social Media' },
  'Insights Bot': { x: 16.4, z: 13.7, yaw: FACE_N, section: 'Social Media' },
  'Price Bot': { x: 20.0, z: 13.7, yaw: FACE_N, section: 'Social Media' },
  'Ratings Bot': { x: 23.6, z: 13.7, yaw: FACE_N, section: 'Social Media' },

  'Manager Bot': { x: 0, z: -3.7, yaw: FACE_N, section: 'Manager' },
};

export const POIS = [
  { id: 'movie', section: 'Social Media', label: 'movie wall', x: 4.4, z: 17.6, look: { x: 2.3, z: 17.6 } },
  { id: 'theater', section: 'Social Media', label: 'home theater', x: 16.2, z: 16.0, look: { x: 16.2, z: 21.2 } },
  { id: 'cafe', section: 'Food', label: 'cafe', x: -8.2, z: 16.2, look: { x: -8.2, z: 18.2 } },
  { id: 'kitchen', section: 'Food', label: 'kitchen', x: -20.0, z: 16.4, look: { x: -22.5, z: 19.2 } },
  { id: 'trading', section: 'Finance', label: 'trading screens', x: 16.2, z: -4.6, look: { x: 13.4, z: -5.6 } },
  { id: 'lounge', section: 'Personal', label: 'lounge', x: -18.2, z: 2.4, look: { x: -20.4, z: 4.8 } },
  { id: 'work-meet', section: 'Work', label: 'work meeting', x: 14.2, z: -15.4, look: { x: 14.2, z: -16.6 } },
  { id: 'jobs-meet', section: 'Jobs', label: 'interview table', x: -15.2, z: -15.2, look: { x: -15.2, z: -16.4 } },
  { id: 'manager-meet', section: 'Manager', label: 'manager meeting', x: 2.4, z: 1.2, look: { x: 0, z: 2.6 } },
  { id: 'hall-n', section: 'corridor', label: 'north hall', x: 0, z: -9.15, look: { x: 0, z: -7.4 } },
  { id: 'hall-s', section: 'corridor', label: 'south hall', x: 0, z: 9.15, look: { x: 0, z: 7.4 } },
];

export function forward(yaw) {
  return { x: Math.sin(yaw), z: Math.cos(yaw) };
}

function rotatedAabb(x, z, yaw, w, d) {
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));
  const W = w * c + d * s;
  const D = w * s + d * c;
  return { x0: x - W / 2, x1: x + W / 2, z0: z - D / 2, z1: z + D / 2 };
}

function deskBlocks() {
  const blocks = [];
  for (const home of Object.values(HOMES)) {
    const f = forward(home.yaw);
    const x = home.x + f.x * 0.92;
    const z = home.z + f.z * 0.92;
    blocks.push(rotatedAabb(x, z, home.yaw, 1.25, 0.62));
  }
  return blocks;
}

function propBlocks() {
  return [
    rotatedAabb(-15.2, -16.5, 0, 2.4, 1.15),
    rotatedAabb(14.2, -16.6, 0, 2.6, 1.15),
    rotatedAabb(0, 2.7, 0, 2.4, 1.2),
    rotatedAabb(-20.6, 19.4, 0, 7.2, 3.4),
    rotatedAabb(-8.2, 18.4, 0, 1.6, 1.6),
    rotatedAabb(-4.6, 19.6, 0, 1.5, 1.5),
    { x0: 1.55, x1: 3.35, z0: 15.3, z1: 21.2 },
    rotatedAabb(16.2, 18.0, 0, 6.4, 1.3),
    rotatedAabb(13.5, -5.7, PI / 2, 3.4, 0.55),
    rotatedAabb(-19.4, 4.6, 0, 2.2, 0.9),
    rotatedAabb(0, -5.55, 0, 2.2, 0.85),
  ];
}

export function buildPlan() {
  const regions = [...ROOMS, ...CORRIDORS];
  const blocks = [...deskBlocks(), ...propBlocks()];
  const nav = createNav(-29, -24, 29, 24, 0.5);
  for (const region of regions) nav.carve(region);
  for (const door of DOORS) nav.carve(door);
  for (const block of blocks) nav.block(block);
  for (const door of DOORS) nav.carve(door);
  return {
    nav,
    rooms: ROOMS,
    corridors: CORRIDORS,
    doors: DOORS,
    homes: HOMES,
    pois: POIS,
    blocks,
    bounds: { x0: -28.4, x1: 28.4, z0: -23.4, z1: 23.4 },
  };
}

export function roomFor(section) {
  return ROOMS.find((room) => room.section === section) || null;
}

export function contains(rect, x, z, pad = 0) {
  return x > rect.x0 + pad && x < rect.x1 - pad && z > rect.z0 + pad && z < rect.z1 - pad;
}
