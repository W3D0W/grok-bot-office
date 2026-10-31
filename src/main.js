import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildPlan } from './layout.js';
import { buildOffice, loadFurniture } from './office.js';
import { attachCamera, loadCharacters } from './actors.js';
import { createSim } from './sim.js';
import { createUI } from './ui.js';
import { roomFor } from './layout.js';

const asset = (path) => `${import.meta.env.BASE_URL}${path}`;
const canvas = document.querySelector('#view');
const labelRoot = document.querySelector('#labels');
const loading = document.querySelector('#loading');
const loadBar = document.querySelector('#load-bar');
const loadNote = document.querySelector('#load-note');
const mobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 860;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.6));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 220);
camera.position.set(38, 46, 40);
attachCamera(camera);

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.6, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI / 2.15;
controls.minPolarAngle = 0.38;
controls.minDistance = 10;
controls.maxDistance = 110;
controls.update();

const labels = new CSS2DRenderer({ element: labelRoot });
labels.domElement.style.position = 'absolute';
labels.domElement.style.inset = '0';

let composer;
let bloom;
const plan = buildPlan();
let office;
let sim;
let ui;
let running = false;

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  labels.setSize(width, height);
  composer?.setSize(width, height);
  bloom?.setSize(width, height);
}

function setupComposer() {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), mobile ? 0.2 : 0.32, 0.45, 0.72);
  composer.addPass(bloom);
  if (!mobile) {
    const ratio = renderer.getPixelRatio();
    composer.addPass(new SMAAPass(window.innerWidth * ratio, window.innerHeight * ratio));
  }
  composer.addPass(new OutputPass());
}

async function boot() {
  const [botsRes, activityRes] = await Promise.all([
    fetch(asset('data/bots.json')),
    fetch(asset('data/activity.json')),
  ]);
  if (!botsRes.ok) throw new Error('Could not read data/bots.json');
  const data = await botsRes.json();
  const activity = activityRes.ok ? await activityRes.json() : { events: [] };
  const loader = new GLTFLoader();
  const manager = new THREE.LoadingManager();
  manager.onProgress = (_url, loaded, total) => {
    if (total) loadBar.style.width = `${Math.round((loaded / total) * 100)}%`;
  };
  loader.manager = manager;
  loadNote.textContent = 'Placing desks, kitchens, and the theater…';
  const furniture = await loadFurniture(loader, asset);
  office = buildOffice(scene, plan, furniture);
  office.setQuality(mobile);
  loadNote.textContent = 'Waking all 26 bots…';
  const actors = await loadCharacters(loader, asset, data.bots, plan.homes);
  for (const actor of actors) scene.add(actor.wrapper);
  sim = createSim({ data, activity, plan, actors });
  ui = createUI(data, sim);
  resize();
  setupComposer();
  resize();
  bindPointer(actors);
  window.__OFFICE = {
    ready: true,
    sim,
    actors,
    plan,
    scene,
    camera,
    controls,
  };
  loading.classList.add('done');
  running = true;
  loadNote.textContent = '';
}

function bindPointer(actors) {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let down = null;
  const meshes = [];
  for (const actor of actors) {
    actor.wrapper.traverse((node) => {
      if (node.isMesh && node.userData.botName) meshes.push(node);
    });
  }

  function pick(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(meshes, false);
    return hits[0]?.object.userData.botName || null;
  }

  canvas.addEventListener('pointerdown', (event) => {
    down = { x: event.clientX, y: event.clientY };
  });
  canvas.addEventListener('pointerup', (event) => {
    if (!down) return;
    const dragged = Math.hypot(event.clientX - down.x, event.clientY - down.y);
    down = null;
    if (dragged > 6) return;
    const name = pick(event);
    sim.setSelected(name);
    if (name) ui.showDetail(name);
    else document.querySelector('#detail').hidden = true;
  });
  canvas.addEventListener('pointermove', (event) => {
    if (mobile) return;
    const name = pick(event);
    sim.setHover(name);
    canvas.style.cursor = name ? 'pointer' : 'grab';
  });

  document.querySelector('#legend').addEventListener('click', (event) => {
    const button = event.target.closest('.chip');
    if (!button || !office) return;
    const section = button.dataset.section;
    if (section === 'All') {
      controls.target.set(0, 0.6, 0);
      return;
    }
    const room = roomFor(section);
    if (room) controls.target.set((room.x0 + room.x1) / 2, 0.5, (room.z0 + room.z1) / 2);
  });
}

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!running) return;
  controls.update();
  sim.update(dt);
  office.update(sim.parts(), dt);
  ui.update();
  if (composer) composer.render();
  else renderer.render(scene, camera);
  labels.render(scene, camera);
}

window.addEventListener('resize', resize);
requestAnimationFrame(frame);

boot().catch((error) => {
  loadNote.textContent = error.message || 'The office could not be opened.';
});
