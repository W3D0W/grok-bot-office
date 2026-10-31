import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { SECTIONS } from './theme.js';

/** Icon paints. Edit these hex values when a reference screenshot arrives. */
export const ICON_COLORS = {
  red: '#e5484d',
  black: '#2a2c33',
  yellow: '#f5c518',
  green: '#3dd68c',
  blue: '#3b82f6',
  violet: '#8b5cf6',
  cyan: '#22d3ee',
};

const SHAPES = ['hex', 'square', 'tablet', 'wedge', 'blob', 'default'];
let labelCamera = null;

export function attachCamera(camera) {
  labelCamera = camera;
}

export async function loadCharacters(_loader, _asset, bots, homes) {
  return bots.map((bot, index) => makeActor(bot, homes[bot.name], index));
}

function makeActor(bot, home, index) {
  const shapeName = SHAPES.includes(bot.iconShape) ? bot.iconShape : 'default';
  const colorKey = ICON_COLORS[bot.iconColor] ? bot.iconColor : 'cyan';
  const color = ICON_COLORS[colorKey];
  const section = SECTIONS[bot.section]?.color || color;
  const variant = hash(bot.name);

  const wrapper = new THREE.Group();
  wrapper.position.set(home.x, 0.04, home.z);
  wrapper.rotation.y = home.yaw;

  const body = new THREE.Group();
  const { mesh, height, front, faceW, faceH } = buildBody(shapeName, color, colorKey === 'black');
  body.add(mesh);
  tagMeshes(mesh, bot.name);

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(faceW, faceH),
    new THREE.MeshStandardMaterial({
      color: '#07090d',
      emissive: '#12161c',
      emissiveIntensity: 0.4,
      roughness: 0.35,
      metalness: 0.15,
    }),
  );
  screen.rotation.x = -Math.PI / 2;
  screen.position.set(0, front + 0.01, 0);
  screen.userData.botName = bot.name;
  body.add(screen);

  const eyeMat = new THREE.MeshStandardMaterial({
    color: '#f4fdff',
    emissive: colorKey === 'black' ? '#f2f6ff' : '#d9fbff',
    emissiveIntensity: 1.6,
    roughness: 0.2,
  });
  const eyeGeo = new THREE.CapsuleGeometry(0.035 + (variant % 3) * 0.006, 0.02, 2, 8);
  const eyeSpan = 0.09 + (variant % 4) * 0.015;
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-eyeSpan, front + 0.05, 0.05);
  rightEye.position.set(eyeSpan, front + 0.05, 0.05);
  if (variant % 2 === 0) {
    leftEye.scale.x = rightEye.scale.x = 1.35;
  }
  leftEye.userData.botName = bot.name;
  rightEye.userData.botName = bot.name;
  body.add(leftEye, rightEye);

  const antenna = buildAntenna(variant % 5, color);
  antenna.position.y = height;
  antenna.traverse((node) => { if (node.isMesh) node.userData.botName = bot.name; });
  body.add(antenna);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.28, 0.42, 28),
    new THREE.MeshBasicMaterial({ color: section, transparent: true, opacity: 0, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  wrapper.add(ring);

  const paper = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.02, 0.28),
    new THREE.MeshStandardMaterial({ color: '#f3e2bc', roughness: 0.55, emissive: '#f3e2bc', emissiveIntensity: 0.15 }),
  );
  paper.visible = false;
  paper.position.set(0.42, height + 0.02, 0.05);
  paper.rotation.z = -0.4;
  paper.userData.botName = bot.name;
  body.add(paper);

  let star = null;
  if (bot.lead) {
    star = makeStar();
    star.position.set(0.28, height + 0.08, 0);
    body.add(star);
  }

  body.scale.setScalar(1.45);
  const visualHeight = (height + 0.38) * 1.45;
  wrapper.add(body);

  const tag = document.createElement('div');
  tag.className = `nametag${bot.lead ? ' lead' : ''}`;
  tag.style.setProperty('--tag', color);
  tag.textContent = bot.lead ? `★ ${bot.name}` : bot.name;
  const label = new CSS2DObject(tag);
  wrapper.add(label);

  const badgeEl = document.createElement('div');
  badgeEl.className = 'badge';
  badgeEl.style.display = 'none';
  const badge = new CSS2DObject(badgeEl);
  wrapper.add(badge);

  const bubbleEl = document.createElement('div');
  bubbleEl.className = 'bubble';
  bubbleEl.style.display = 'none';
  const bubble = new CSS2DObject(bubbleEl);
  wrapper.add(bubble);

  const zzzEl = document.createElement('div');
  zzzEl.className = 'zzz';
  zzzEl.textContent = 'z z z';
  zzzEl.style.display = 'none';
  const zzz = new CSS2DObject(zzzEl);
  wrapper.add(zzz);

  const actor = {
    name: bot.name,
    wrapper,
    pose: 'idle',
    sleeping: false,
    bodyHeight: height,
    setAnim(name) {
      if (name === 'Walk') actor.pose = 'walk';
      else if (name === 'Interact') actor.pose = 'work';
      else if (name === 'Wave') actor.pose = 'wave';
      else actor.pose = 'idle';
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
    setZzz(on) {
      actor.sleeping = !!on;
      zzzEl.style.display = on ? 'block' : 'none';
    },
    setHighlight(on) { ring.material.opacity = on ? 0.85 : 0.22; },
    setVisible(on) { wrapper.visible = on; },
    update(dt, elapsed) {
      const t = elapsed + index * 0.37;
      let bob = 0.16 + Math.sin(t * 2.1) * 0.045;
      let lean = 0;
      let bounce = 0;
      if (actor.pose === 'walk') {
        bob = 0.1;
        bounce = Math.abs(Math.sin(t * 9)) * 0.09;
        lean = Math.sin(t * 9) * 0.16;
        body.rotation.x = 0.18;
      } else if (actor.pose === 'wave') {
        body.rotation.x = 0.05;
        body.rotation.z = Math.sin(t * 6) * 0.12;
      } else {
        body.rotation.x = 0;
        body.rotation.z = Math.sin(t * 1.4) * 0.03;
      }
      body.position.y = bob + bounce;
      body.rotation.z = actor.pose === 'walk' ? lean : body.rotation.z;

      const flicker = actor.pose === 'work' ? 0.35 + Math.abs(Math.sin(t * 18)) * 1.5 : 1.5;
      const asleep = actor.sleeping;
      eyeMat.emissiveIntensity = asleep ? 0.08 : flicker;
      const shut = asleep ? 0.22 : 1;
      leftEye.scale.y = shut;
      rightEye.scale.y = shut;
      screen.material.emissiveIntensity = asleep ? 0.05 : (actor.pose === 'work' ? 0.15 + flicker * 0.25 : 0.35);

      placeLabels();
      if (star) star.rotation.z = Math.sin(t * 2) * 0.2;
    },
  };

  function placeLabels() {
    const top = body.position.y + visualHeight;
    wrapper.updateMatrixWorld(true);
    const world = wrapper.localToWorld(new THREE.Vector3(0, top, 0));
    const pixelLift = labelCamera ? pixelsToWorld(labelCamera, world, 26) : 0.35;
    const base = top + 0.12 + pixelLift;
    label.position.set(0, base, 0);
    badge.position.set(0, base + 0.34, 0);
    bubble.position.set(0.05, base + 0.58, 0);
    zzz.position.set(0.2, base + 0.28, 0);
  }

  actor.setHighlight(false);
  actor.update(0, index);
  return actor;
}

function buildBody(shapeName, color, charcoal) {
  const shape = iconShape(shapeName);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.26,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.045,
    bevelSegments: 2,
    curveSegments: shapeName === 'blob' || shapeName === 'default' ? 10 : 6,
  });
  geo.rotateX(-Math.PI / 2);
  geo.computeBoundingBox();
  const laid = geo.boundingBox;
  geo.translate(
    -(laid.min.x + laid.max.x) / 2,
    -laid.min.y,
    -(laid.min.z + laid.max.z) / 2,
  );
  geo.computeBoundingBox();
  const fitted = geo.boundingBox;
  const height = fitted.max.y;
  const width = Math.max(fitted.max.x - fitted.min.x, fitted.max.z - fitted.min.z);
  const front = fitted.max.y;
  const material = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.22,
    metalness: 0.12,
    clearcoat: 0.75,
    clearcoatRoughness: 0.28,
    emissive: charcoal ? '#c5cad6' : color,
    emissiveIntensity: charcoal ? 0.35 : 0.72,
  });
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (charcoal) {
    const rim = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: '#e7ebf5',
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.45,
    }));
    rim.scale.setScalar(1.04);
    mesh.add(rim);
  }
  return { mesh, height, front, faceW: Math.min(0.46, width * 0.62), faceH: Math.min(0.28, height * 0.32) };
}

function iconShape(name) {
  if (name === 'hex') return polygon(6, 0.48, Math.PI / 6);
  if (name === 'square') return roundedRect(0.86, 0.86, 0.18);
  if (name === 'tablet') return roundedRect(0.58, 1.08, 0.16);
  if (name === 'wedge') return wedge();
  if (name === 'blob') return blob();
  const circle = new THREE.Shape();
  circle.absarc(0, 0, 0.46, 0, Math.PI * 2, false);
  return circle;
}

function polygon(sides, radius, rotation) {
  const shape = new THREE.Shape();
  for (let i = 0; i < sides; i += 1) {
    const angle = rotation + (i / sides) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function roundedRect(w, h, r) {
  const shape = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  const radius = Math.min(r, w / 2, h / 2);
  shape.moveTo(x + radius, y);
  shape.lineTo(x + w - radius, y);
  shape.absarc(x + w - radius, y + radius, radius, -Math.PI / 2, 0, false);
  shape.lineTo(x + w, y + h - radius);
  shape.absarc(x + w - radius, y + h - radius, radius, 0, Math.PI / 2, false);
  shape.lineTo(x + radius, y + h);
  shape.absarc(x + radius, y + h - radius, radius, Math.PI / 2, Math.PI, false);
  shape.lineTo(x, y + radius);
  shape.absarc(x + radius, y + radius, radius, Math.PI, Math.PI * 1.5, false);
  return shape;
}

function wedge() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, -0.46);
  shape.lineTo(0.52, -0.18);
  shape.quadraticCurveTo(0.36, 0.2, 0.12, 0.52);
  shape.lineTo(-0.38, 0.42);
  shape.quadraticCurveTo(-0.58, 0.02, -0.5, -0.46);
  return shape;
}

function blob() {
  const shape = new THREE.Shape();
  const count = 12;
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const wobble = 1 + 0.18 * Math.sin(i * 1.7) + 0.07 * Math.cos(i * 0.9);
    const x = Math.cos(angle) * 0.48 * wobble;
    const y = Math.sin(angle) * 0.42 * (1 + 0.1 * Math.cos(i * 1.3));
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function buildAntenna(kind, color) {
  const group = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: '#d5d8e0', metalness: 0.6, roughness: 0.3 });
  const tipMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8, roughness: 0.3 });
  const stick = (x) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 8), metal);
    pole.position.set(x, 0.11, 0);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), tipMat);
    tip.position.set(x, 0.24, 0);
    group.add(pole, tip);
  };
  if (kind === 1) {
    stick(-0.08);
    stick(0.08);
  } else if (kind === 2) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.16, 8), metal);
    pole.position.y = 0.08;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 8, 16), tipMat);
    ring.position.y = 0.2;
    ring.rotation.x = Math.PI / 2.4;
    group.add(pole, ring);
  } else if (kind === 3) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.14, 8), metal);
    pole.position.y = 0.07;
    const dish = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.06, 12), tipMat);
    dish.position.y = 0.18;
    group.add(pole, dish);
  } else if (kind === 4) {
    const nub = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), tipMat);
    nub.position.y = 0.05;
    group.add(nub);
  } else {
    stick(0);
  }
  return group;
}

function makeStar() {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? 0.09 : 0.04;
    const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const mesh = new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshBasicMaterial({ color: '#f0d078', side: THREE.DoubleSide }),
  );
  mesh.rotation.x = -0.4;
  return mesh;
}

function tagMeshes(root, name) {
  root.traverse((node) => {
    if (node.isMesh) node.userData.botName = name;
  });
}

function pixelsToWorld(camera, worldPoint, pixels) {
  const distance = Math.max(1.5, camera.position.distanceTo(worldPoint));
  const worldPerPixel = (2 * Math.tan((camera.fov * Math.PI) / 360) * distance) / Math.max(1, window.innerHeight);
  return pixels * worldPerPixel;
}

function hash(text) {
  let value = 0;
  for (const char of text) value = (value * 33 + char.charCodeAt(0)) >>> 0;
  return value;
}
