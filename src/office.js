import * as THREE from 'three';
import { SECTIONS } from './theme.js';
import { forward } from './layout.js';

const FURNITURE = {
  desk: ['models/furniture/desk.glb', 'height'],
  chair: ['models/furniture/chairDesk.glb', 'height'],
  monitor: ['models/furniture/computerScreen.glb', 'height'],
  keyboard: ['models/furniture/computerKeyboard.glb', 'height'],
  laptop: ['models/furniture/laptop.glb', 'height'],
  plant: ['models/furniture/pottedPlant.glb', 'height'],
  plantSmall: ['models/furniture/plantSmall1.glb', 'height'],
  sofa: ['models/furniture/loungeSofa.glb', 'height'],
  sofaLong: ['models/furniture/loungeSofaLong.glb', 'height'],
  loungeChair: ['models/furniture/loungeChair.glb', 'height'],
  table: ['models/furniture/table.glb', 'height'],
  tableRound: ['models/furniture/tableRound.glb', 'height'],
  bookcase: ['models/furniture/bookcaseOpen.glb', 'height'],
  books: ['models/furniture/books.glb', 'height'],
  tv: ['models/furniture/televisionModern.glb', 'height'],
  tvOld: ['models/furniture/televisionVintage.glb', 'height'],
  fridge: ['models/furniture/kitchenFridge.glb', 'height'],
  stove: ['models/furniture/kitchenStove.glb', 'height'],
  sink: ['models/furniture/kitchenSink.glb', 'height'],
  cabinet: ['models/furniture/kitchenCabinet.glb', 'height'],
  coffee: ['models/furniture/kitchenCoffeeMachine.glb', 'height'],
  lamp: ['models/furniture/lampSquareFloor.glb', 'height'],
  lampTable: ['models/furniture/lampRoundTable.glb', 'height'],
  rug: ['models/furniture/rugRectangle.glb', 'xz'],
  stool: ['models/furniture/stoolBar.glb', 'height'],
  speaker: ['models/furniture/speaker.glb', 'height'],
  book: ['models/kaykit/book_single.glb', 'height'],
  bookSet: ['models/kaykit/book_set.glb', 'height'],
  shelf: ['models/kaykit/shelf_B_large.glb', 'height'],
  frame: ['models/kaykit/pictureframe_large_A.glb', 'height'],
  frameSmall: ['models/kaykit/pictureframe_medium.glb', 'height'],
  cactus: ['models/kaykit/cactus_medium_A.glb', 'height'],
  burger: ['models/kaykit/food_burger.glb', 'height'],
  dinner: ['models/kaykit/food_dinner.glb', 'height'],
  plate: ['models/kaykit/plate.glb', 'height'],
  cafeTable: ['models/kaykit/table_round_A_decorated.glb', 'height'],
  cafeStool: ['models/kaykit/chair_stool.glb', 'height'],
  jar: ['models/kaykit/jar_A_medium.glb', 'height'],
};

export function modelUrls(asset) {
  return Object.values(FURNITURE).map(([file]) => asset(file));
}

export async function loadFurniture(loader, asset) {
  const entries = await Promise.all(Object.entries(FURNITURE).map(async ([name, [file, mode]]) => {
    try {
      const gltf = await loader.loadAsync(asset(file));
      return [name, templateFrom(gltf.scene, mode)];
    } catch {
      return [name, null];
    }
  }));
  return Object.fromEntries(entries);
}

function templateFrom(scene, mode) {
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const basis = mode === 'xz' ? Math.max(size.x, size.z, 0.001) : (size.y || 1);
  scene.scale.setScalar(1 / basis);
  const fitted = new THREE.Box3().setFromObject(scene);
  scene.position.x -= (fitted.min.x + fitted.max.x) / 2;
  scene.position.z -= (fitted.min.z + fitted.max.z) / 2;
  const grounded = new THREE.Box3().setFromObject(scene);
  scene.position.y -= grounded.min.y;
  scene.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = false;
      node.receiveShadow = true;
    }
  });
  const outer = new THREE.Group();
  outer.add(scene);
  return outer;
}

function place(parent, template, x, z, yaw = 0, size = 1, lift = 0, cast = false) {
  if (!template) return null;
  const obj = template.clone(true);
  obj.scale.setScalar(size);
  obj.position.set(x, lift, z);
  obj.rotation.y = yaw;
  if (cast) obj.traverse((node) => { if (node.isMesh) node.castShadow = true; });
  parent.add(obj);
  return obj;
}

function tint(obj, color) {
  if (!obj) return;
  obj.traverse((node) => {
    if (!node.isMesh) return;
    const list = Array.isArray(node.material) ? node.material : [node.material];
    const next = list.map((material) => {
      const clone = material.clone();
      clone.color.set(color);
      return clone;
    });
    node.material = next.length === 1 ? next[0] : next;
  });
}

export function buildOffice(scene, plan, templates) {
  const root = new THREE.Group();
  root.name = 'office';
  scene.add(root);

  const wallMat = new THREE.MeshStandardMaterial({ color: '#23262e', roughness: 0.86 });
  const site = new THREE.Mesh(
    new THREE.CircleGeometry(46, 64),
    new THREE.MeshStandardMaterial({ color: '#101218', roughness: 1 }),
  );
  site.rotation.x = -Math.PI / 2;
  site.receiveShadow = true;
  root.add(site);

  const corridorMat = new THREE.MeshStandardMaterial({ color: '#171a22', roughness: 0.9 });
  for (const corridor of plan.corridors) addCarpet(root, corridor, corridorMat, 0.025);

  for (const room of plan.rooms) {
    const tone = SECTIONS[room.section];
    const mat = new THREE.MeshStandardMaterial({
      color: tone.floor,
      roughness: 0.9,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    addCarpet(root, room, mat, 0.04);
    const cap = new THREE.MeshStandardMaterial({
      color: tone.trim,
      emissive: tone.color,
      emissiveIntensity: 0.9,
      roughness: 0.35,
    });
    const glass = room.section === 'Manager';
    const body = glass
      ? new THREE.MeshStandardMaterial({
        color: '#9ec8de',
        roughness: 0.08,
        metalness: 0.15,
        transparent: true,
        opacity: 0.22,
        emissive: tone.color,
        emissiveIntensity: 0.15,
      })
      : wallMat;
    buildWalls(root, room, plan.doors, body, cap, glass ? 1.35 : 1.16);
  }

  buildShell(root, plan.bounds, wallMat);
  addWorkstations(root, templates, plan.homes);
  addLandmarks(root, templates);
  const screens = addScreens(root);
  const lamps = addLamps(root);

  const hemi = new THREE.HemisphereLight('#b7c6da', '#1a1c24', 0.55);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#e7eef8', 1.35);
  sun.position.set(18, 28, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -34;
  sun.shadow.camera.right = 34;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 70;
  sun.shadow.bias = -0.00035;
  sun.shadow.normalBias = 0.035;
  scene.add(sun);
  scene.add(sun.target);
  scene.background = new THREE.Color('#12151c');

  let screenClock = 0;
  return {
    root,
    setQuality(mobile) {
      sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
      sun.castShadow = true;
    },
    update(parts, dt) {
      const night = nightAmount(parts);
      sun.intensity = THREE.MathUtils.lerp(1.35, 0.2, night);
      sun.color.set(night > 0.65 ? '#6d7c96' : night > 0.3 ? '#c98662' : '#d5e2f2');
      hemi.intensity = THREE.MathUtils.lerp(0.55, 0.16, night);
      hemi.color.set(night > 0.5 ? '#243044' : '#8ea0b8');
      const sky = new THREE.Color('#12151c').lerp(new THREE.Color('#07090e'), night);
      scene.background.copy(sky);
      for (const lamp of lamps) {
        lamp.light.intensity = THREE.MathUtils.lerp(12, 26, night);
        lamp.bulb.material.emissiveIntensity = THREE.MathUtils.lerp(0.8, 1.8, night);
      }
      screenClock += dt;
      if (screenClock > 0.45) {
        screenClock = 0;
        for (const redraw of screens) redraw();
      }
    },
  };
}

function addCarpet(parent, rect, material, y) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(rect.x1 - rect.x0, rect.z1 - rect.z0),
    material,
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set((rect.x0 + rect.x1) / 2, y, (rect.z0 + rect.z1) / 2);
  mesh.receiveShadow = true;
  parent.add(mesh);
}

function buildWalls(parent, room, doors, material, capMat, height) {
  const holes = { n: [], s: [], e: [], w: [] };
  for (const door of doors) {
    if (door.z0 < room.z1 && door.z1 > room.z1 && overlap(door.x0, door.x1, room.x0, room.x1) > 0.6) {
      holes.s.push([clamp(door.x0, room.x0, room.x1), clamp(door.x1, room.x0, room.x1)]);
    }
    if (door.z0 < room.z0 && door.z1 > room.z0 && overlap(door.x0, door.x1, room.x0, room.x1) > 0.6) {
      holes.n.push([clamp(door.x0, room.x0, room.x1), clamp(door.x1, room.x0, room.x1)]);
    }
    if (door.x0 < room.x1 && door.x1 > room.x1 && overlap(door.z0, door.z1, room.z0, room.z1) > 0.6) {
      holes.e.push([clamp(door.z0, room.z0, room.z1), clamp(door.z1, room.z0, room.z1)]);
    }
    if (door.x0 < room.x0 && door.x1 > room.x0 && overlap(door.z0, door.z1, room.z0, room.z1) > 0.6) {
      holes.w.push([clamp(door.z0, room.z0, room.z1), clamp(door.z1, room.z0, room.z1)]);
    }
  }
  for (const [a, b] of segments(room.x0, room.x1, holes.n)) wallX(parent, a, b, room.z0, height, material, capMat);
  for (const [a, b] of segments(room.x0, room.x1, holes.s)) wallX(parent, a, b, room.z1, height, material, capMat);
  for (const [a, b] of segments(room.z0, room.z1, holes.w)) wallZ(parent, a, b, room.x0, height, material, capMat);
  for (const [a, b] of segments(room.z0, room.z1, holes.e)) wallZ(parent, a, b, room.x1, height, material, capMat);
}

function wallX(parent, x0, x1, z, height, material, capMat) {
  const width = x1 - x0;
  if (width < 0.08) return;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.16), material);
  mesh.position.set((x0 + x1) / 2, height / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(width, 0.07, 0.22), capMat);
  cap.position.set((x0 + x1) / 2, height + 0.02, z);
  parent.add(cap);
}

function wallZ(parent, z0, z1, x, height, material, capMat) {
  const depth = z1 - z0;
  if (depth < 0.08) return;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, height, depth), material);
  mesh.position.set(x, height / 2, (z0 + z1) / 2);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.07, depth), capMat);
  cap.position.set(x, height + 0.02, (z0 + z1) / 2);
  parent.add(cap);
}

function buildShell(parent, bounds, material) {
  const glass = new THREE.MeshStandardMaterial({
    color: '#b9d0df',
    roughness: 0.15,
    transparent: true,
    opacity: 0.28,
  });
  const h = 1.42;
  const x0 = bounds.x0 - 0.6;
  const x1 = bounds.x1 + 0.6;
  const z0 = bounds.z0 - 0.6;
  const z1 = bounds.z1 + 0.6;
  wallX(parent, x0, x1, z0, h, material, material);
  for (const [a, b] of segments(x0, x1, [[-2.2, 2.2]])) wallX(parent, a, b, z1, h, material, material);
  wallZ(parent, z0, z1, x0, h, material, material);
  wallZ(parent, z0, z1, x1, h, material, material);
  for (const x of [-20, -8, 8, 20]) {
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.7), glass);
    pane.position.set(x, 0.95, z0);
    parent.add(pane);
  }
}

function addWorkstations(parent, templates, homes) {
  for (const [name, home] of Object.entries(homes)) {
    const f = forward(home.yaw);
    const dx = home.x + f.x * 0.92;
    const dz = home.z + f.z * 0.92;
    place(parent, templates.desk, dx, dz, home.yaw + Math.PI, 0.74, 0, true);
    place(parent, templates.chair, home.x + f.x * 0.38, home.z + f.z * 0.38, home.yaw, 0.9, 0, true);
    place(parent, templates.monitor, dx - f.x * 0.08, dz - f.z * 0.08, home.yaw, 0.38, 0.74, false);
    place(parent, templates.keyboard, dx - f.x * 0.28, dz - f.z * 0.28, home.yaw, 0.05, 0.75, false);
    if (name === 'Manager Bot') {
      place(parent, templates.laptop, dx + 0.42, dz + 0.05, home.yaw + 0.4, 0.16, 0.75, false);
      place(parent, templates.monitor, dx + f.z * 0.32, dz - f.x * 0.32, home.yaw, 0.34, 0.74, false);
    }
  }
}

function addLandmarks(parent, templates) {
  const T = templates;
  place(parent, T.table, -15.2, -16.5, 0, 0.76, 0, true);
  place(parent, T.chair, -16.5, -16.5, Math.PI / 2, 0.9, 0, true);
  place(parent, T.chair, -13.9, -16.5, -Math.PI / 2, 0.9, 0, true);
  place(parent, T.plant, -25.6, -21.2, 0.4, 0.95, 0, true);
  place(parent, T.bookcase, -26.4, -16.2, Math.PI / 2, 1.35, 0, true);

  place(parent, T.table, 14.2, -16.6, 0, 0.76, 0, true);
  place(parent, T.chair, 12.8, -16.6, Math.PI / 2, 0.9);
  place(parent, T.chair, 15.6, -16.6, -Math.PI / 2, 0.9);
  place(parent, T.plant, 25.8, -21.2, 0, 1.05, 0, true);
  place(parent, T.cactus, 25.4, -14.8, 0, 0.7);

  place(parent, T.tableRound, 0, 2.7, 0, 0.76, 0, true);
  place(parent, T.chair, -1.15, 2.7, Math.PI / 2, 0.9, 0, true);
  place(parent, T.chair, 1.15, 2.7, -Math.PI / 2, 0.9, 0, true);
  place(parent, T.rug, 0, -1.2, 0, 3.4);
  place(parent, T.plant, -5.6, 5.4, 0, 1.1, 0, true);
  place(parent, T.lamp, 5.4, -5.8, 0, 1.35, 0, true);
  place(parent, T.lampTable, 0.7, -5.3, 0, 0.32, 0.76);

  place(parent, T.sofa, -19.6, 4.7, Math.PI, 0.85, 0, true);
  place(parent, T.table, -18.0, 3.2, 0, 0.42);
  place(parent, T.plantSmall, -26.2, 6.2, 0, 0.45);
  place(parent, T.rug, -20, 3.6, 0.2, 3.1);

  place(parent, T.fridge, -23.4, 20.6, Math.PI, 1.7, 0, true);
  place(parent, T.stove, -21.2, 20.6, Math.PI, 0.95, 0, true);
  place(parent, T.sink, -19.0, 20.5, Math.PI, 0.9, 0, true);
  place(parent, T.cabinet, -16.6, 20.6, Math.PI, 0.9, 0, true);
  place(parent, T.coffee, -18.2, 19.6, 0.4, 0.28, 0.9);
  place(parent, T.jar, -17.2, 19.7, 0.6, 0.22, 0.9);
  place(parent, T.cafeTable, -8.2, 18.5, 0.2, 0.78, 0, true);
  place(parent, T.cafeStool, -7.2, 17.6, 0.5, 0.7);
  place(parent, T.cafeStool, -9.1, 17.7, -0.4, 0.7);
  place(parent, T.burger, -8.2, 18.5, 0.3, 0.16, 0.8);
  place(parent, T.cafeTable, -4.5, 19.7, 0, 0.78, 0, true);
  place(parent, T.dinner, -4.5, 19.7, 0, 0.14, 0.8);
  place(parent, T.plate, -4.1, 19.4, 0, 0.08, 0.8);
  place(parent, T.plant, -2.2, 20.8, 0, 0.9, 0, true);

  for (const z of [16.2, 18.3, 20.3]) {
    place(parent, T.bookcase, 2.35, z, Math.PI / 2, 1.45, 0, true);
    place(parent, T.shelf, 2.55, z, Math.PI / 2, 1.15, 0, true);
  }
  const caseColors = ['#1d4e89', '#8c2f39', '#c9862a', '#2f6b4f', '#243044', '#a34b78', '#d8d2c6', '#4c3b8a'];
  for (let i = 0; i < 18; i++) {
    const obj = place(parent, T.book, 2.15, 15.55 + (i % 9) * 0.62, Math.PI / 2 + (i % 2) * 0.04, 0.28, 0.35 + Math.floor(i / 9) * 0.34);
    tint(obj, caseColors[i % caseColors.length]);
  }
  place(parent, T.books, 3.05, 17.2, 0.4, 0.28, 0.42);
  place(parent, T.bookSet, 3.1, 19.4, -0.2, 0.32, 0.2);

  place(parent, T.sofaLong, 16.2, 17.9, 0, 0.82, 0, true);
  place(parent, T.loungeChair, 11.2, 17.6, 0.15, 0.85, 0, true);
  place(parent, T.loungeChair, 21.2, 17.6, -0.15, 0.85, 0, true);
  place(parent, T.tv, 13.2, 21.15, Math.PI, 0.72, 0, true);
  place(parent, T.tv, 19.4, 21.15, Math.PI, 0.72, 0, true);
  place(parent, T.speaker, 11.4, 21.1, Math.PI, 0.55);
  place(parent, T.speaker, 21.0, 21.1, Math.PI, 0.55);
  place(parent, T.rug, 16.2, 18.6, 0, 5.2);

  const projector = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.16, 0.32),
    new THREE.MeshStandardMaterial({ color: '#2b3138', roughness: 0.45, metalness: 0.2 }),
  );
  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 0.12, 16),
    new THREE.MeshStandardMaterial({ color: '#d7dde4', emissive: '#fff4d2', emissiveIntensity: 0.4, metalness: 0.5, roughness: 0.2 }),
  );
  lens.rotation.x = Math.PI / 2;
  lens.position.z = 0.2;
  projector.add(body, lens);
  projector.position.set(16.2, 1.15, 16.35);
  parent.add(projector);
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(1.35, 4.6, 20, 1, true),
    new THREE.MeshBasicMaterial({ color: '#fff6dd', transparent: true, opacity: 0.09, depthWrite: false, side: THREE.DoubleSide }),
  );
  beam.rotation.x = Math.PI / 2;
  beam.position.set(16.2, 1.35, 18.7);
  parent.add(beam);

  place(parent, T.monitor, 12.6, -5.7, Math.PI / 2, 0.7, 0.85, true);
  place(parent, T.monitor, 12.6, -4.85, Math.PI / 2, 0.7, 0.85, true);
  place(parent, T.monitor, 12.6, -4.0, Math.PI / 2, 0.62, 0.55, true);
  place(parent, T.desk, 14.6, -4.9, Math.PI / 2, 0.74, 0, true);
  place(parent, T.plant, 26.2, 6.1, 0, 0.85, 0, true);
  place(parent, T.cactus, 20.4, -6.2, 0, 0.55);

  addPoster(parent, T.frame, 1.2, 16.4, 'NIGHT DRIVE', '#1d4e89', '#f2d48a');
  addPoster(parent, T.frame, 1.2, 18.6, 'QUIET ROOM', '#8c2f39', '#f6efe4');
  addPoster(parent, T.frameSmall, 1.2, 20.5, 'GOLD HOUR', '#c9862a', '#241c12');
  addPoster(parent, T.frameSmall, 26.2, -2.2, 'TICKER', '#12382c', '#b8ffd4');
  addPoster(parent, T.frame, -26.2, -2, 'LOUNGE', '#2a241c', '#f2d48a');
  place(parent, T.plantSmall, -26.4, -8.6, 0, 0.4);
  place(parent, T.plantSmall, 26.4, 8.2, 0.4, 0.42);
  place(parent, T.lamp, -22.4, 14.2, 0.2, 1.15, 0, true);
  place(parent, T.rug, -15.2, -16.2, 0.1, 2.6);
  place(parent, T.rug, 14.2, -16.2, 0, 2.6);
  ledStrip(parent, 8, 21.35, 10, 0, '#7eb6ff');
  ledStrip(parent, 2.15, 18, 5.2, Math.PI / 2, '#f0d078');
}

function ledStrip(parent, x, z, length, yaw, color) {
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(length, 0.035, 0.05),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.6, roughness: 0.3 }),
  );
  strip.position.set(x, 1.08, z);
  strip.rotation.y = yaw;
  parent.add(strip);
}

function addPoster(parent, frame, x, z, title, bg, fg) {
  place(parent, frame, x, z, Math.PI / 2, 0.7, 1.05);
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 320);
  ctx.fillStyle = fg;
  ctx.fillRect(18, 24, 220, 8);
  ctx.font = '700 42px Georgia';
  wrapText(ctx, title, 24, 150, 210, 46);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const poster = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.54),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, emissive: bg, emissiveIntensity: 0.08 }),
  );
  poster.position.set(x + 0.03, 1.15, z);
  poster.rotation.y = Math.PI / 2;
  parent.add(poster);
}

function addScreens(parent) {
  const redraws = [];
  const trading = chartPlane('#b8ffd4', '#10281c');
  trading.mesh.position.set(13.15, 1.35, -4.9);
  trading.mesh.rotation.y = Math.PI / 2;
  parent.add(trading.mesh);
  redraws.push(trading.redraw);

  const feature = moviePlane();
  feature.mesh.position.set(16.2, 1.45, 21.45);
  feature.mesh.rotation.y = Math.PI;
  parent.add(feature.mesh);
  redraws.push(feature.redraw);

  for (const [x, z] of [[13.2, 21.16], [19.4, 21.16]]) {
    const tv = chartPlane('#9fd0ff', '#101820');
    tv.mesh.scale.set(0.55, 0.4, 1);
    tv.mesh.position.set(x, 0.95, z);
    tv.mesh.rotation.y = Math.PI;
    parent.add(tv.mesh);
    redraws.push(tv.redraw);
  }
  return redraws;
}

function chartPlane(stroke, paper) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 144;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const values = Array.from({ length: 28 }, () => 0.5);
  const redraw = () => {
    values.shift();
    const next = Math.max(0.08, Math.min(0.92, values[values.length - 1] + (Math.random() - 0.48) * 0.18));
    values.push(next);
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, 256, 144);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 4;
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = 12 + i * 8;
      const y = 128 - v * 100;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    tex.needsUpdate = true;
  };
  redraw();
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 0.66),
    new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: stroke, emissiveIntensity: 0.55, roughness: 0.4 }),
  );
  return { mesh, redraw };
}

function moviePlane() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 288;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  let tick = 0;
  const redraw = () => {
    tick += 1;
    const g = ctx.createLinearGradient(0, 0, 512, 288);
    g.addColorStop(0, `hsl(${(tick * 3) % 360} 45% 28%)`);
    g.addColorStop(1, `hsl(${(tick * 3 + 40) % 360} 35% 14%)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 288);
    ctx.fillStyle = 'rgba(255,244,220,0.9)';
    ctx.font = '600 42px Georgia';
    ctx.fillText('NOW SHOWING', 36, 120);
    ctx.font = '500 22px Georgia';
    ctx.fillText('home theater  ·  reel ' + String((tick % 9) + 1).padStart(2, '0'), 36, 160);
    tex.needsUpdate = true;
  };
  redraw();
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 2.35),
    new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0.9, roughness: 0.35 }),
  );
  return { mesh, redraw };
}

function addLamps(parent) {
  const spots = [
    [-14, -18, '#ffd7a8'],
    [16, -18, '#ffd7a8'],
    [0, 0, '#fff0d0'],
    [-20, 2, '#ffd7a8'],
    [-18, 18, '#ffc98a'],
    [-8, 17, '#ffc98a'],
    [16, 16, '#d7e6ff'],
    [18, -2, '#d9ffe8'],
    [0, -9.2, '#fff0d0'],
    [0, 9.2, '#fff0d0'],
  ];
  return spots.map(([x, z, color]) => {
    const light = new THREE.PointLight(color, 6, 14, 2);
    light.position.set(x, 2.45, z);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 12, 8),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5 }),
    );
    bulb.position.copy(light.position);
    parent.add(light, bulb);
    return { light, bulb };
  });
}

function nightAmount(parts) {
  const hour = parts.hour + parts.minute / 60;
  if (hour >= 21 || hour < 5) return 1;
  if (hour >= 18.5) return (hour - 18.5) / 2.5;
  if (hour < 7) return (7 - hour) / 2;
  return 0;
}

function segments(a, b, holes) {
  const cuts = holes
    .map(([h0, h1]) => [Math.max(h0, a), Math.min(h1, b)])
    .filter(([h0, h1]) => h1 - h0 > 0.05)
    .sort((p, q) => p[0] - q[0]);
  const out = [];
  let cursor = a;
  for (const [h0, h1] of cuts) {
    if (h0 > cursor + 0.05) out.push([cursor, h0]);
    cursor = Math.max(cursor, h1);
  }
  if (b > cursor + 0.05) out.push([cursor, b]);
  return out;
}

function overlap(a0, a1, b0, b1) {
  return Math.min(a1, b1) - Math.max(a0, b0);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function wrapText(ctx, text, x, y, max, line) {
  const words = text.split(' ');
  let row = '';
  let yy = y;
  for (const word of words) {
    const next = row ? `${row} ${word}` : word;
    if (ctx.measureText(next).width > max) {
      ctx.fillText(row, x, yy);
      row = word;
      yy += line;
    } else row = next;
  }
  ctx.fillText(row, x, yy);
}
