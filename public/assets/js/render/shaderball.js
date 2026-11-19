// كرة عرض الخامات (Shader ball) ثلاثية الأبعاد في المتصفح — WebGL عبر three.js.
// كرة مشقوقة بقطر 20 سم على قاعدة متدرجة فوق أرضية شبكية (مربعات 10 سم)، بإضاءة استوديو، والخامة بمقاسها الحقيقي.
const V = '/vendor/three/';

function gridTexture(T) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#bdb6c0'; x.fillRect(0, 0, 256, 256); x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = 3;
  x.strokeRect(0, 0, 256, 256);
  const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t;
}
function labelSprite(T, text) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
  x.font = 'italic 600 34px Georgia, serif'; x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 128, 34);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
  const m = new T.Mesh(new T.PlaneGeometry(12, 3), new T.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; return m;
}
// قشرة كروية مع قصّ الشق الأفقي والنافذة الأمامية
function shellGeometry(T, r, groove, dir, cosWin) {
  const g = new T.SphereGeometry(r, 256, 160).toNonIndexed(), p = g.attributes.position, keep = [];
  const n = p.count / 3, v = new T.Vector3();
  for (let t = 0; t < n; t++) {
    v.set(0, 0, 0); for (let k = 0; k < 3; k++) v.add(new T.Vector3().fromBufferAttribute(p, t * 3 + k)); v.divideScalar(3);
    if (Math.abs(v.y) < groove) continue;
    if (v.clone().normalize().dot(dir) > cosWin) continue;
    keep.push(t);
  }
  const out = new T.BufferGeometry();
  for (const name of Object.keys(g.attributes)) {
    const a = g.attributes[name], sz = a.itemSize, arr = new Float32Array(keep.length * 3 * sz);
    keep.forEach((t, j) => { for (let k = 0; k < 3 * sz; k++) arr[j * 3 * sz + k] = a.array[t * 3 * sz + k]; });
    out.setAttribute(name, new T.BufferAttribute(arr, sz));
  }
  return out;
}

export async function createShaderBall(container, { onError } = {}) {
  let T, OrbitControls, RoomEnvironment;
  try {
    T = await import(V + 'three.module.min.js');
    ({ OrbitControls } = await import(V + 'OrbitControls.js'));
    ({ RoomEnvironment } = await import(V + 'RoomEnvironment.js'));
  } catch (e) { onError?.(e); throw e; }

  const W = () => container.clientWidth || 640, H = () => Math.round(Math.min(W(), 720) * 0.85);
  let renderer;
  try { renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); }
  catch (e) { const er = new Error('متصفحك لا يدعم WebGL، فلا يمكن عرض كرة المعاينة.'); onError?.(er); throw er; }
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.setSize(W(), H());
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  container.append(renderer.domElement); renderer.domElement.style.cssText = 'width:100%;height:auto;display:block;border-radius:12px;touch-action:none';

  const scene = new T.Scene(), bg = new T.Color('#bfb8c3'); scene.background = bg; scene.fog = new T.Fog(bg, 120, 260);
  const pm = new T.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.9;
  const cam = new T.PerspectiveCamera(28, W() / H(), 1, 800); cam.position.set(6, 30, 66);
  const ctl = new OrbitControls(cam, renderer.domElement); ctl.target.set(0, 11, 0); ctl.enableDamping = true; ctl.minDistance = 22; ctl.maxDistance = 160; ctl.maxPolarAngle = Math.PI * 0.49; ctl.update();
  const key = new T.DirectionalLight('#ffffff', 2.2); key.position.set(-40, 70, 45); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 10, far: 200 }); key.shadow.radius = 6; key.shadow.bias = -0.0004; scene.add(key);
  const rim = new T.DirectionalLight('#dfe8ff', 0.6); rim.position.set(50, 30, -50); scene.add(rim);

  // الأرضية الشبكية: كل مربع 10 سم
  const grid = gridTexture(T); grid.repeat.set(40, 40);
  const floor = new T.Mesh(new T.PlaneGeometry(400, 400), new T.MeshStandardMaterial({ map: grid, roughness: 0.92 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const lbl = labelSprite(T, '20 cm'); lbl.position.set(-30, 0.05, 18); scene.add(lbl);

  // الأجزاء
  const BALL_Y = 15.6, R = 10, dir = new T.Vector3(0.62, 0.2, 0.76).normalize(), WIN = 37 * Math.PI / 180;
  const parts = []; // { mesh|group-member, rx, ry } — rx/ry: الطول الحقيقي بالسم الذي يقابل UV من 0 إلى 1
  const ballG = new T.Group(); ballG.position.y = BALL_Y; ballG.rotation.y = -0.25; scene.add(ballG);
  const add = (geo, rx, ry, parent = scene, pos, rot, cap) => { const m = new T.Mesh(geo); m.castShadow = m.receiveShadow = true; if (pos) m.position.copy(pos); if (rot) m.rotation.copy(rot); parent.add(m); parts.push({ m, rx, ry, cap }); return m; };
  add(shellGeometry(T, R, 0.65, dir, Math.cos(WIN)), 2 * Math.PI * R, Math.PI * R, ballG);
  // سماكة القشرة عند الشق والنافذة
  // حافة الشق: تُرى سماكة القشرة من جهتيها (DoubleSide)
  { const rr = R * Math.sin(WIN), ring = add(new T.TorusGeometry(rr - 0.3, 0.32, 16, 160), 2 * Math.PI * rr, 2, ballG); ring.position.copy(dir.clone().multiplyScalar(R * Math.cos(WIN))); ring.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), dir); }
  // القلب الداخلي اللامع (يظهر من الشق والنافذة)
  const core = new T.Mesh(new T.SphereGeometry(R * 0.86, 96, 64), new T.MeshPhysicalMaterial({ color: '#0d0d0f', roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }));
  core.castShadow = core.receiveShadow = true; ballG.add(core);
  // القاعدة: قرصان متدرجان + عنق
  add(new T.CylinderGeometry(10.5, 10.6, 1.3, 128), 2 * Math.PI * 10.5, 1.3, scene, new T.Vector3(0, 0.65, 0), null, 21.2);
  add(new T.CylinderGeometry(8.4, 8.6, 1.1, 128), 2 * Math.PI * 8.4, 1.1, scene, new T.Vector3(0, 1.85, 0), null, 17.2);
  add(new T.TorusGeometry(7.2, 0.45, 16, 128), 2 * Math.PI * 7.2, 3, scene, new T.Vector3(0, 2.45, 0), new T.Euler(Math.PI / 2, 0, 0));
  add(new T.CylinderGeometry(2.6, 3.6, 4.2, 96), 2 * Math.PI * 3, 4.2, scene, new T.Vector3(0, 4.4, 0), null, 7.2);

  // الخامة
  const loader = (cv, srgb) => { const t = new T.CanvasTexture(cv); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = srgb ? T.SRGBColorSpace : T.NoColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); t.generateMipmaps = true; return t; };
  let texs = {}, mats = [];
  function setMaterial({ basecolor, roughness, normal, ao, metal, superN = 1, sizeCm = 60, metalness = false, normalStrength = 1, exposure = 1 }) {
    for (const t of Object.values(texs)) t.dispose(); for (const m of mats) m.dispose(); mats = [];
    texs = { map: loader(basecolor, true), roughnessMap: loader(roughness), normalMap: loader(normal) };
    if (ao) texs.aoMap = loader(ao); if (metal) texs.metalnessMap = loader(metal);
    renderer.toneMappingExposure = exposure;
    const mkMat = (rx, ry) => {
      const mk = {};
      for (const [k, t] of Object.entries(texs)) { const c = t.clone(); const sN = (k === 'aoMap' || k === 'metalnessMap') ? 1 : superN; c.repeat.set(rx / sizeCm / sN, ry / sizeCm / sN); c.needsUpdate = true; mk[k] = c; }
      const m = new T.MeshPhysicalMaterial({ ...mk, roughness: 1, metalness: metalness ? 1 : 0, normalScale: new T.Vector2(normalStrength, -normalStrength), aoMapIntensity: 0.8, side: T.DoubleSide });
      mats.push(m); return m;
    };
    for (const p of parts) {
      const side = mkMat(p.rx, p.ry);
      if (p.cap) { const c = mkMat(p.cap, p.cap); p.m.material = [side, c, c]; } else p.m.material = side;
    }
    touch();
  }
  // الرسم عند الحاجة فقط (تحريك، تغيير خامة أو إعداد) لتوفير المعالج والبطارية
  let auto = false, alive = true, dirty = 3;
  const touch = () => { dirty = Math.max(dirty, 2); };
  ctl.addEventListener('change', touch);
  const loop = () => { if (!alive) return; if (auto) { ballG.rotation.y += 0.004; dirty = 1; } const moved = ctl.update(); if (dirty > 0 || moved) { renderer.render(scene, cam); dirty = Math.max(0, dirty - 1); } requestAnimationFrame(loop); };
  loop();
  const ro = new ResizeObserver(() => { renderer.setSize(W(), H()); cam.aspect = W() / H(); cam.updateProjectionMatrix(); touch(); }); ro.observe(container);
  return {
    setMaterial,
    setAuto(v) { auto = v; },
    setEnv(v) { scene.environmentIntensity = v; touch(); },
    setLightAngle(a) { const r = Math.hypot(key.position.x, key.position.z); key.position.x = Math.cos(a) * r; key.position.z = Math.sin(a) * r; touch(); },
    snapshot() { renderer.render(scene, cam); return new Promise(r => renderer.domElement.toBlob(r, 'image/png')); },
    dispose() { alive = false; ro.disconnect(); renderer.dispose(); renderer.domElement.remove(); },
  };
}
