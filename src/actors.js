import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { SECTIONS } from './theme.js';

const FILES = {
  'male-suit': 'models/characters/male-suit.glb',
  'male-hoodie': 'models/characters/male-hoodie.glb',
  'male-casual': 'models/characters/male-casual.glb',
  'male-worker': 'models/characters/male-worker.glb',
  'male-farmer': 'models/characters/male-farmer.glb',
  'male-punk': 'models/characters/male-punk.glb',
  'female-suit': 'models/characters/female-suit.glb',
  'female-formal': 'models/characters/female-formal.glb',
  'female-casual': 'models/characters/female-casual.glb',
  'female-worker': 'models/characters/female-worker.glb',
  'female-punk': 'models/characters/female-punk.glb',
};

const LOOKS = {
  'Manager Bot': { file: 'male-suit', accessory: 'glasses', colors: { Suit: '#8e2e32', Tie: '#e6c56a', Hair: '#211913', Eyebrows: '#211913', Skin: '#f0c3a2', White: '#f7f3ec' } },
  'Life Bot': { file: 'female-formal', accessory: 'badge', colors: { Red: '#c45b78', LimeGreen: '#d9d3c7', Gold: '#e6c56a', Brown: '#6b442c', Skin: '#e7b48f' } },
  'Calendar Bot': { file: 'male-casual', accessory: 'headset', colors: { Red_Dark: '#3e4c63', LightBlue: '#d5dbe6', Hair: '#2a241e', Eyebrows: '#2a241e', Skin: '#c68642', White: '#f4f1ea' } },
  'Email Bot': { file: 'female-casual', accessory: 'none', colors: { Orange: '#ece7df', Brown: '#6d5a4d', Hair_Brown: '#4a3428', Hair_Blond: '#c4a15a', Skin: '#f2c7a6', White: '#fbf8f2' } },
  'Nutrition Bot': { file: 'female-worker', accessory: 'cap', colors: { Worker_Vest: '#e09a3c', Worker_Yellow: '#f0d2a0', Brown: '#5a3a28', Brown_02: '#5a3a28', Brown2: '#5a3a28', DarkBrown: '#3a2a22', Skin: '#8d5524', White: '#fff8ee' } },
  'Grocery Bot': { file: 'male-farmer', accessory: 'cap', colors: { LightBlue: '#f2e2c4', Beige: '#e7d3a4', Brown: '#6b4a2e', Brown2: '#6b4a2e', Red: '#a33b32', Eyebrows: '#3a2a22', Skin: '#e0ad86' } },
  'Finance Bot': { file: 'male-suit', accessory: 'glasses', colors: { Suit: '#1f6b45', Tie: '#d7c27a', Hair: '#d8d2c8', Eyebrows: '#c8c2b8', Skin: '#f3d0b4', White: '#f7f4ef' } },
  'Draft Bot': { file: 'female-formal', accessory: 'badge', colors: { Red: '#2f6b4f', LimeGreen: '#e7f0ea', Gold: '#8fd0a8', Brown: '#2a211c', Skin: '#f0c7a8' } },
  'Review Bot': { file: 'male-hoodie', accessory: 'glasses', colors: { Purple: '#245c40', LightBlue: '#d5ebe0', Hair: '#1b1b1b', Eyebrows: '#1b1b1b', Skin: '#c68642', White: '#f4f1ea' } },
  'Strategy Bot': { file: 'female-suit', accessory: 'none', colors: { Black: '#163828', White: '#f4f7f4', Hair_Brown: '#1a1a1a', Hair_Blond: '#1a1a1a', Brown: '#1a1a1a', Skin: '#6f4e37' } },
  'Scout Bot': { file: 'male-punk', accessory: 'headset', colors: { Red: '#244c3a', Red_Dark: '#1b1b1b', White: '#e7eee9', Eyebrows: '#2a211c', Skin: '#e0aa84' } },
  'Social Bot': { file: 'female-suit', accessory: 'badge', colors: { Black: '#1d4e89', White: '#f4f7fb', Hair_Blond: '#e6c878', Hair_Brown: '#e6c878', Brown: '#e6c878', Skin: '#f2c7a6' } },
  'Video Bot': { file: 'male-hoodie', accessory: 'headset', colors: { Purple: '#243044', LightBlue: '#d5e4f6', Hair: '#4a3428', Eyebrows: '#4a3428', Skin: '#8d5524', White: '#f7f4ef' } },
  'Insights Bot': { file: 'female-punk', accessory: 'glasses', colors: { Pink: '#3d82cc', Black: '#1c2430', Hair_Brown: '#2c3a55', Brown: '#2c3a55', Skin: '#e7b48f' } },
  'Price Bot': { file: 'male-casual', accessory: 'none', colors: { Red_Dark: '#2a4e8a', LightBlue: '#f2f5f8', Hair: '#c4a15a', Eyebrows: '#c4a15a', Skin: '#f0c3a2', White: '#ffffff' } },
  'Ratings Bot': { file: 'female-casual', accessory: 'badge', colors: { Orange: '#3d82cc', Brown: '#1d3557', Hair_Brown: '#6b2d3c', Hair_Blond: '#6b2d3c', Skin: '#c68642', White: '#f4f1ea' } },
  'Work Bot': { file: 'male-suit', accessory: 'badge', colors: { Suit: '#5c4584', Tie: '#e6c56a', Hair: '#2a211c', Eyebrows: '#2a211c', Skin: '#e0ad86', White: '#f6f3fb' } },
  'Work Email Bot': { file: 'female-worker', accessory: 'headset', colors: { Worker_Vest: '#8668be', Worker_Yellow: '#d9d0ee', Brown: '#3a2a44', Brown_02: '#3a2a44', Brown2: '#3a2a44', DarkBrown: '#241c2e', Skin: '#f2c7a6', White: '#f7f4ef' } },
  'Work Calendar Bot': { file: 'male-casual', accessory: 'glasses', colors: { Red_Dark: '#6a4e96', LightBlue: '#ece6f6', Hair: '#1b1b1b', Eyebrows: '#1b1b1b', Skin: '#f0c3a2', White: '#fbf8f2' } },
  'PTO Bot': { file: 'female-formal', accessory: 'cap', colors: { Red: '#8668be', LimeGreen: '#f4effa', Gold: '#e6c56a', Brown: '#4a3428', Skin: '#8d5524' } },
  'Job Bot': { file: 'female-suit', accessory: 'glasses', colors: { Black: '#1f6f7a', White: '#f3fbfb', Hair_Brown: '#1a1a1a', Hair_Blond: '#1a1a1a', Brown: '#1a1a1a', Skin: '#e7b48f' } },
  'Search Bot': { file: 'male-punk', accessory: 'cap', colors: { Red: '#39a4b2', Red_Dark: '#16383d', White: '#e7f6f7', Eyebrows: '#2a211c', Skin: '#c68642' } },
  'Resume Bot': { file: 'female-casual', accessory: 'headset', colors: { Orange: '#d8f3f5', Brown: '#245e66', Hair_Brown: '#c4a15a', Hair_Blond: '#c4a15a', Skin: '#f2c7a6', White: '#ffffff' } },
  'Application Bot': { file: 'male-farmer', accessory: 'none', colors: { LightBlue: '#d5eef1', Beige: '#c9e4e4', Brown: '#3a2a22', Brown2: '#3a2a22', Red: '#1f6f7a', Eyebrows: '#3a2a22', Skin: '#6f4e37' } },
  'Tracker Bot': { file: 'male-worker', accessory: 'badge', colors: { Worker_Yellow: '#d7f1f4', Worker_Vest: '#2a838e', LightBrown: '#8d6746', Brown: '#3a2a22', Brown2: '#3a2a22', Eyebrows: '#3a2a22', Moustache: '#3a2a22', Skin: '#e0ad86' } },
  'Interview Bot': { file: 'female-punk', accessory: 'headset', colors: { Pink: '#e7f6f7', Black: '#1b3c42', Hair_Brown: '#6b2d3c', Brown: '#6b2d3c', Skin: '#f0c3a2' } },
};

const KEEP = new Set(['Idle_Neutral', 'Idle', 'Walk', 'Wave', 'Interact']);

export async function loadCharacters(loader, asset, bots, homes) {
  const cache = new Map();
  const unique = [...new Set(bots.map((bot) => (LOOKS[bot.name] || fallbackLook(bot.name)).file))];
  await Promise.all(unique.map(async (file) => {
    const gltf = await loader.loadAsync(asset(FILES[file]));
    gltf.scene.traverse((node) => {
      if (/pistol|sword|gun/i.test(node.name || '')) node.visible = false;
    });
    for (const clip of gltf.animations) lockInPlace(clip);
    cache.set(file, gltf);
  }));

  const actors = [];
  for (const bot of bots) {
    const look = LOOKS[bot.name] || fallbackLook(bot.name);
    const gltf = cache.get(look.file);
    const home = homes[bot.name];
    actors.push(makeActor(gltf, bot, look, home));
  }
  return actors;
}

function fallbackLook(name) {
  const files = Object.keys(FILES);
  let hash = 0;
  for (const char of name) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  return { file: files[hash % files.length], accessory: 'badge', colors: { Skin: '#e0ad86' } };
}

function makeActor(gltf, bot, look, home) {
  const model = SkeletonUtils.clone(gltf.scene);
  paint(model, look.colors);
  const fitted = fitCharacter(model);
  const wrapper = new THREE.Group();
  wrapper.add(fitted);
  wrapper.position.set(home.x, 0.04, home.z);
  wrapper.rotation.y = home.yaw;

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.28, 0.38, 24),
    new THREE.MeshBasicMaterial({ color: SECTIONS[bot.section].color, transparent: true, opacity: 0.0, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  wrapper.add(ring);

  const tag = document.createElement('div');
  tag.className = `nametag${bot.lead ? ' lead' : ''}`;
  tag.style.setProperty('--tag', SECTIONS[bot.section].color);
  tag.textContent = bot.lead ? `★ ${bot.name}` : bot.name;
  const label = new CSS2DObject(tag);
  label.position.set(0, 1.92, 0);
  wrapper.add(label);

  const badgeEl = document.createElement('div');
  badgeEl.className = 'badge';
  badgeEl.style.display = 'none';
  const badge = new CSS2DObject(badgeEl);
  badge.position.set(0, 2.22, 0);
  wrapper.add(badge);

  const bubbleEl = document.createElement('div');
  bubbleEl.className = 'bubble';
  bubbleEl.style.display = 'none';
  const bubble = new CSS2DObject(bubbleEl);
  bubble.position.set(0.15, 2.48, 0);
  wrapper.add(bubble);

  const zzzEl = document.createElement('div');
  zzzEl.className = 'zzz';
  zzzEl.textContent = 'z z z';
  zzzEl.style.display = 'none';
  const zzz = new CSS2DObject(zzzEl);
  zzz.position.set(0.2, 2.15, 0);
  wrapper.add(zzz);

  let head = null;
  let wrist = null;
  wrapper.traverse((node) => {
    if (node.isMesh) node.userData.botName = bot.name;
    if (node.isBone && node.name === 'Head') head = node;
    if (node.isBone && node.name === 'Wrist.R') wrist = node;
    if (node.isMesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });

  const accessory = makeAccessory(look.accessory, SECTIONS[bot.section].color);
  let chest = null;
  wrapper.traverse((node) => {
    if (node.isBone && (node.name === 'Chest' || node.name === 'Abdomen') && !chest) chest = node;
  });
  if (accessory) {
    const anchor = look.accessory === 'badge' && chest ? chest : head;
    if (anchor) anchor.add(accessory);
    else wrapper.add(accessory);
  }

  const paper = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.012, 0.22),
    new THREE.MeshStandardMaterial({ color: '#f3e2bc', roughness: 0.7 }),
  );
  paper.visible = false;
  paper.castShadow = true;
  paper.scale.setScalar(2.4);
  paper.position.set(0.26, 1.2, 0.46);
  paper.rotation.set(-0.4, -0.5, 0.2);
  wrapper.add(paper);
  void wrist;

  const star = bot.lead ? makeStar() : null;
  if (star) {
    star.position.set(0, 2.08, 0);
    wrapper.add(star);
  }

  const mixer = new THREE.AnimationMixer(fitted);
  const actions = {};
  for (const clip of gltf.animations) {
    if (!KEEP.has(clip.name)) continue;
    const action = mixer.clipAction(clip.clone());
    action.loop = (clip.name === 'Wave') ? THREE.LoopOnce : THREE.LoopRepeat;
    action.clampWhenFinished = clip.name === 'Wave';
    actions[clip.name] = action;
  }
  const idleName = actions.Idle_Neutral ? 'Idle_Neutral' : 'Idle';
  let current = null;

  const actor = {
    name: bot.name,
    wrapper,
    mixer,
    paper,
    setAnim(name, force = false) {
      const next = actions[name] || actions[idleName];
      if (!next || (current === next && !force)) return;
      next.reset().fadeIn(0.18).play();
      if (current) current.fadeOut(0.18);
      current = next;
    },
    setCarry(on) { paper.visible = on; },
    setBubble(text) {
      bubbleEl.style.display = text ? 'block' : 'none';
      bubbleEl.textContent = text || '';
    },
    setBadge(text) {
      badgeEl.style.display = text ? 'block' : 'none';
      badgeEl.textContent = text || '';
    },
    setZzz(on) { zzzEl.style.display = on ? 'block' : 'none'; },
    setHighlight(on) { ring.material.opacity = on ? 0.9 : 0; },
    setVisible(on) { wrapper.visible = on; },
    update(dt, elapsed) {
      mixer.update(dt);
      if (star) star.position.y = 2.08 + Math.sin(elapsed * 2.2) * 0.06;
      if (accessory) accessory.rotation.y = Math.sin(elapsed * 0.7) * 0.04;
    },
  };
  actor.setAnim(idleName);
  return actor;
}

function fitCharacter(model) {
  const box = new THREE.Box3().setFromObject(model);
  const height = box.getSize(new THREE.Vector3()).y || 1;
  const outer = new THREE.Group();
  model.scale.setScalar(1.68 / height);
  const fitted = new THREE.Box3().setFromObject(model);
  model.position.y -= fitted.min.y;
  outer.add(model);
  return outer;
}

function paint(model, colors) {
  model.traverse((node) => {
    if (!node.isMesh || !node.material) return;
    const list = Array.isArray(node.material) ? node.material : [node.material];
    const next = list.map((material) => {
      const clone = material.clone();
      const tint = colors[material.name];
      if (tint) clone.color.set(tint);
      clone.roughness = Math.max(clone.roughness ?? 0.6, 0.48);
      clone.metalness = Math.min(clone.metalness ?? 0, 0.12);
      return clone;
    });
    node.material = next.length === 1 ? next[0] : next;
  });
}

function lockInPlace(clip) {
  for (const track of clip.tracks) {
    if (track.name === 'Body.position') {
      const values = track.values;
      for (let i = 0; i < values.length; i += 3) {
        values[i] = 0;
        values[i + 2] = 0;
      }
    }
  }
}

function makeAccessory(kind, color) {
  if (!kind || kind === 'none') return null;
  const group = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: '#23272d', roughness: 0.35, metalness: 0.25 });
  const accent = new THREE.MeshStandardMaterial({ color, roughness: 0.45, emissive: color, emissiveIntensity: 0.15 });
  if (kind === 'glasses') {
    const geo = new THREE.TorusGeometry(0.045, 0.008, 8, 16);
    const left = new THREE.Mesh(geo, dark);
    const right = new THREE.Mesh(geo, dark);
    left.position.set(-0.048, 0.09, 0.07);
    right.position.set(0.048, 0.09, 0.07);
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.008, 0.008), dark);
    bridge.position.set(0, 0.09, 0.07);
    group.add(left, right, bridge);
  } else if (kind === 'headset') {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 8, 18, Math.PI), dark);
    band.rotation.z = Math.PI;
    band.position.set(0, 0.12, 0.01);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.04, 12), accent);
    cup.rotation.z = Math.PI / 2;
    cup.position.set(0.09, 0.08, 0.02);
    const mic = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.08), dark);
    mic.position.set(0.05, 0.04, 0.08);
    group.add(band, cup, mic);
  } else if (kind === 'cap') {
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.06, 16), accent);
    crown.position.set(0, 0.18, 0.01);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.015, 0.08), accent);
    brim.position.set(0, 0.15, 0.08);
    group.add(crown, brim);
  } else if (kind === 'badge') {
    const card = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.012), accent);
    card.position.set(0.06, -0.02, 0.1);
    const clip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.02), dark);
    clip.position.set(0.06, 0.05, 0.1);
    group.add(card, clip);
  }
  return group;
}

function makeStar() {
  const shape = new THREE.Shape();
  const spikes = 5;
  const outer = 0.09;
  const inner = 0.04;
  for (let i = 0; i < spikes * 2; i++) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const geo = new THREE.ShapeGeometry(shape);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#e6c56a', side: THREE.DoubleSide }));
  mesh.rotation.x = -0.9;
  mesh.scale.set(1.6, 1.6, 1.6);
  return mesh;
}
