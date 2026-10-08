/* Cena 3D da abertura: um dente que, conforme a rolagem, vira o logo
   no letreiro da fachada da clínica. Usa Three.js (via import map no HTML). */
(function () {
  'use strict';

  var clamp01 = function (v) { return Math.min(1, Math.max(0, v)); };
  var seg = function (p, a, b) { return clamp01((p - a) / (b - a)); };
  var easeInOut = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  /* ---------- Geometria do dente (molar) ---------- */
  function buildCrown(THREE, detail) {
    var g = new THREE.SphereGeometry(1, Math.round(detail * 1.5), detail);
    var pos = g.attributes.position;
    var cusps = [[0.42, 0.38], [-0.42, 0.38], [0.42, -0.38], [-0.42, -0.38]];
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (y > 0) {
        // topo achatado com quatro cúspides e sulcos centrais
        var bump = 0;
        for (var c = 0; c < cusps.length; c++) {
          var dx = x - cusps[c][0], dz = z - cusps[c][1];
          bump += Math.exp(-(dx * dx + dz * dz) / 0.07);
        }
        var fissure = Math.exp(-(x * x) / 0.012) + Math.exp(-(z * z) / 0.012);
        var top = Math.pow(y, 2.2);
        y = y * 0.55 + top * (0.2 * bump - 0.1 * fissure);
      } else {
        // estreita em direção ao colo do dente
        var t = -y;
        var pinch = 1 - 0.3 * Math.pow(t, 1.3);
        x *= pinch; z *= pinch;
        y *= 0.75;
      }
      pos.setXYZ(i, x * 1.08, y, z * 0.92);
    }
    g.computeVertexNormals();
    return g;
  }

  function buildRoot(THREE, dir, detail) {
    var h = 1.75;
    var g = new THREE.CylinderGeometry(0.4, 0.4, h, Math.round(detail / 2.5), Math.round(detail / 2.5), false);
    g.translate(0, -h / 2, 0);
    var pos = g.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      var y = pos.getY(i);
      var t = Math.min(1, -y / h);
      // afina em curva e arredonda a ponta
      var r = (1 - 0.72 * Math.pow(t, 1.35)) * (t > 0.92 ? Math.sqrt(1 - Math.pow((t - 0.92) / 0.08, 2) * 0.75) : 1);
      var bend = dir * (0.16 * t - 0.12 * t * t * t);
      pos.setXYZ(i, pos.getX(i) * r + bend, y, pos.getZ(i) * r * 0.8);
    }
    g.computeVertexNormals();
    return g;
  }

  /* ---------- Texturas desenhadas em canvas ---------- */
  function dotTexture(THREE) {
    var c = document.createElement('canvas');
    c.width = c.height = 64;
    var x = c.getContext('2d');
    var gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.4, 'rgba(255,255,255,0.6)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, 64, 64);
    var tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function shadowTexture(THREE) {
    var c = document.createElement('canvas');
    c.width = c.height = 128;
    var x = c.getContext('2d');
    var gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(18,58,143,0.28)');
    gr.addColorStop(1, 'rgba(18,58,143,0)');
    x.fillStyle = gr;
    x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  function canvasTex(THREE, w, h, draw, repeatX) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    var tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    if (repeatX) { tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(repeatX, 1); }
    return tex;
  }

  // Letreiro azul, como o da fachada real (o dente 3D pousa à esquerda, no lugar do logo)
  function signTexture(THREE, renderer) {
    var tex = canvasTex(THREE, 2048, 489, function (x, w, h) {
      var gr = x.createLinearGradient(0, 0, w, h);
      gr.addColorStop(0, '#1544C4');
      gr.addColorStop(1, '#2A66E3');
      x.fillStyle = gr;
      x.fillRect(0, 0, w, h);
      // reflexo suave de céu, como na foto
      [[1500, 120, 260], [1850, 380, 220], [300, 420, 200]].forEach(function (cl) {
        var r = x.createRadialGradient(cl[0], cl[1], 0, cl[0], cl[1], cl[2]);
        r.addColorStop(0, 'rgba(255,255,255,0.16)');
        r.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = r;
        x.fillRect(0, 0, w, h);
      });

      var left = 500, avail = w - left - 90;
      x.fillStyle = '#FFFFFF';
      x.textBaseline = 'alphabetic';
      x.font = '400 76px Marcellus, Georgia, serif';
      x.fillText('DRA.', left + 6, 150);

      var size = 190;
      var name = 'CAROLINA LEAL';
      x.font = '400 ' + size + 'px Marcellus, Georgia, serif';
      var tw = x.measureText(name).width;
      if (tw > avail) { size = Math.floor(size * avail / tw); x.font = '400 ' + size + 'px Marcellus, Georgia, serif'; }
      x.fillText(name, left, 320);

      x.font = '500 46px Manrope, sans-serif';
      if ('letterSpacing' in x) x.letterSpacing = '13px';
      x.fillText('ODONTOLOGIA ESPECIALIZADA', left + 8, 415);
    });
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return tex;
  }

  function stripesTex(THREE, base, line, count, vertical) {
    return canvasTex(THREE, 256, 256, function (x, w, h) {
      x.fillStyle = base;
      x.fillRect(0, 0, w, h);
      x.fillStyle = line;
      var step = (vertical ? w : h) / count;
      for (var i = 0; i < count; i++) {
        if (vertical) x.fillRect(i * step, 0, step * 0.35, h);
        else x.fillRect(0, i * step, w, step * 0.18);
      }
    });
  }

  function flagTexture(THREE) {
    return canvasTex(THREE, 160, 640, function (x, w, h) {
      x.fillStyle = '#F4F6FA';
      x.fillRect(0, 0, w, h);
      x.fillStyle = '#1F57C9';
      x.fillRect(0, 0, w, 90);
      x.save();
      x.translate(w / 2 + 4, h / 2 + 40);
      x.rotate(Math.PI / 2);
      x.font = '800 92px Manrope, sans-serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillStyle = '#1F2A40';
      x.fillText('DENTISTA', 0, 0);
      x.restore();
    });
  }

  /* ---------- Fachada (inspirada na foto real da clínica, QE 40 Guará II) ---------- */
  function buildFacade(THREE, renderer) {
    var g = new THREE.Group();
    var mats = [];
    function M(params, Ctor) {
      var m = new (Ctor || THREE.MeshStandardMaterial)(params);
      m.transparent = true;
      m.userData.baseOpacity = params.opacity != null ? params.opacity : 1;
      mats.push(m);
      return m;
    }
    function box(w, h, d, mat, x, y, z) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      g.add(m);
      return m;
    }
    function plane(w, h, mat, x, y, z) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      m.position.set(x, y, z);
      g.add(m);
      return m;
    }

    var blue = M({ color: 0x1D5AC4, roughness: 0.45, metalness: 0.2 });
    var wall = M({ color: 0xD8D1C3, roughness: 0.95 });
    var upper = M({ color: 0xE3DED3, roughness: 0.95 });
    var white = M({ color: 0xF2F2EE, roughness: 0.6 });
    var walk = M({ color: 0xCBC2B3, roughness: 1 });
    var inside = M({ color: 0x3B4450, roughness: 0.9 });
    var glass = M({ color: 0x7F93A6, roughness: 0.03, metalness: 0.9, opacity: 0.5, depthWrite: false });
    var alu = M({ color: 0xC9CDD2, roughness: 0.3, metalness: 0.8 });
    var roof = M({ map: stripesTex(THREE, '#E6E8EA', '#C4C8CC', 16, true), roughness: 0.5, metalness: 0.4 });
    var gate = M({ map: stripesTex(THREE, '#A9B0B4', '#8C9498', 22, false), roughness: 0.6, metalness: 0.5 });
    var grille = M({ map: stripesTex(THREE, '#9DBDB2', '#7FA196', 18, true), roughness: 0.6, metalness: 0.4 });
    var darkGlass = M({ color: 0x2E3A46, roughness: 0.1, metalness: 0.6 });

    // Térreo
    box(10, 4.2, 0.4, wall, 0, -0.5, -0.2);
    box(12, 0.12, 4.2, walk, 0, -2.66, 1.7);              // calçada
    box(6.45, 0.18, 0.3, white, -1.78, -2.5, 0.05);       // soleira branca

    // Vitrine de vidro com pilares azuis
    plane(5.75, 3.3, inside, -1.88, -0.65, 0.01);
    var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.9, 8), alu);
    pole.position.set(-0.8, -0.9, 0.08); g.add(pole);
    plane(0.55, 2.2, M({ map: flagTexture(THREE), roughness: 0.8 }), -0.5, -0.55, 0.06); // bandeira "DENTISTA"
    box(0.06, 3.3, 0.08, alu, -1.9, -0.65, 0.12);         // montante
    box(0.05, 1.2, 0.08, alu, -4.45, -0.7, 0.14);         // puxador
    plane(5.75, 3.3, glass, -1.88, -0.65, 0.16);
    box(0.25, 3.75, 0.35, blue, -4.88, -0.55, 0.12);      // pilar esquerdo
    box(0.45, 3.85, 0.4, blue, 1.22, -0.5, 0.12);         // pilar direito
    box(6.45, 0.35, 0.36, blue, -1.78, 1.17, 0.12);       // viga sobre a vitrine

    // Portão de enrolar e grade à direita
    plane(2.9, 2.85, gate, 3.45, -0.95, 0.02);
    plane(2.9, 0.45, grille, 3.45, 0.75, 0.02);
    box(3.6, 0.22, 0.2, white, 3.25, -2.5, 0.05);

    // Marquise de telha metálica, inclinada para a calçada
    var canopy = box(10.4, 0.05, 1.6, roof, 0, 1.45, 0.78);
    canopy.rotation.x = 0.28;
    box(4.0, 0.12, 0.06, blue, 3.1, 1.22, 1.55);          // acabamento azul à direita

    // Letreiro azul
    box(9.0, 2.3, 0.26, blue, -0.6, 2.85, 0.2);
    plane(8.8, 2.1, M({ map: signTexture(THREE, renderer), roughness: 0.35, metalness: 0.1 }), -0.6, 2.85, 0.335);
    box(1.1, 2.3, 0.3, white, 4.45, 2.85, -0.1);          // trecho branco à direita

    // Sobrado
    box(10, 2.8, 0.4, upper, 0, 5.4, -0.8);
    // Janela em arco com venezianas
    box(1.2, 1.3, 0.1, darkGlass, -1.6, 4.85, -0.55);
    var arch = new THREE.Mesh(new THREE.CircleGeometry(0.6, 24, 0, Math.PI), darkGlass);
    arch.position.set(-1.6, 5.5, -0.49); g.add(arch);
    box(1.4, 0.08, 0.14, white, -1.6, 4.2, -0.5);
    box(0.6, 1.9, 0.08, white, -2.62, 5.0, -0.52);
    box(0.6, 1.9, 0.08, white, -0.58, 5.0, -0.52);
    // Janela da direita com toldo
    box(1.2, 1.5, 0.1, darkGlass, 3.4, 5.0, -0.55);
    box(0.6, 1.7, 0.08, white, 2.5, 5.0, -0.52);
    box(0.6, 1.7, 0.08, white, 4.3, 5.0, -0.52);
    var awning = box(2.4, 0.05, 0.9, white, 3.4, 6.1, -0.2);
    awning.rotation.x = 0.5;

    g.userData.mats = mats;
    return g;
  }

  /* ---------- Montagem da cena ---------- */
  window.initToothScene = async function (opts) {
    var canvas = opts.canvas;
    var getProgress = opts.getProgress;
    var container = opts.container;

    var THREE = await import('three');
    var envMod = await import('three/addons/environments/RoomEnvironment.js');
    try {
      await Promise.all([
        document.fonts.load('400 100px Marcellus'),
        document.fonts.load('700 40px Manrope')
      ]);
    } catch (e) { /* segue com a fonte de fallback */ }

    var small = Math.min(window.innerWidth, window.innerHeight) < 600;
    var detail = small ? 56 : 88;

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.setClearColor(0x000000, 0);

    var scene = new THREE.Scene();
    var pmrem = new THREE.PMREMGenerator(renderer);
    var envRT = pmrem.fromScene(new envMod.RoomEnvironment(renderer), 0.04);
    scene.environment = envRT.texture;
    pmrem.dispose();

    var camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);

    scene.add(new THREE.HemisphereLight(0xFFFAF0, 0xB7C4BB, 0.55));
    var key = new THREE.DirectionalLight(0xFFF1DC, 1.5);
    key.position.set(3, 5, 4);
    scene.add(key);
    var rim = new THREE.DirectionalLight(0xCFE3DA, 1.1);
    rim.position.set(-4, 2, -3);
    scene.add(rim);

    // Dente
    var toothMat = new THREE.MeshPhysicalMaterial({
      color: 0xF8F4EC, roughness: 0.2, metalness: 0,
      clearcoat: 1, clearcoatRoughness: 0.08,
      sheen: 0.5, sheenColor: new THREE.Color(0xFFF3E0), sheenRoughness: 0.4,
      iridescence: 0.12, iridescenceIOR: 1.3
    });
    var tooth = new THREE.Group();
    var toothInner = new THREE.Group();
    toothInner.add(new THREE.Mesh(buildCrown(THREE, detail), toothMat));
    [-1, 1].forEach(function (dir) {
      var r = new THREE.Mesh(buildRoot(THREE, dir, detail), toothMat);
      r.position.set(dir * 0.4, -0.35, 0);
      toothInner.add(r);
    });
    toothInner.position.y = 0.75; // centraliza o dente na origem do grupo
    tooth.add(toothInner);
    scene.add(tooth);

    // Sombra suave sob o dente
    var shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 2.6),
      new THREE.MeshBasicMaterial({ map: shadowTexture(THREE), transparent: true, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    scene.add(shadow);

    // Partículas douradas
    var count = small ? 140 : 260;
    var pts = new Float32Array(count * 3);
    for (var i = 0; i < count; i++) {
      var r = 1.7 + Math.random() * 1.2;
      var th = Math.random() * Math.PI * 2;
      var ph = Math.acos(2 * Math.random() - 1);
      pts[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pts[i * 3 + 1] = r * Math.cos(ph) * 0.8;
      pts[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    var pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    var pMat = new THREE.PointsMaterial({
      color: 0x6FA5F2, size: 0.06, map: dotTexture(THREE), transparent: true,
      opacity: 0.8, depthWrite: false, sizeAttenuation: true
    });
    var particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // Fachada
    var facade = buildFacade(THREE, renderer);
    facade.position.z = -6;
    scene.add(facade);

    /* ---------- Enquadramentos (dependem da proporção da tela) ---------- */
    var view = {};
    function layout() {
      var w = canvas.clientWidth || window.innerWidth;
      var h = canvas.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      var aspect = w / h;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();

      var tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      var portrait = aspect < 0.9;

      // Início: dente em destaque
      var d0 = Math.max(2.5 / tanV, portrait ? 1.5 / (tanV * aspect) : 0);
      var half0W = tanV * aspect * d0;
      view.cam0 = new THREE.Vector3(0, 0.15, d0);
      view.look0 = new THREE.Vector3(0, 0, 0);
      if (portrait) {
        // Encaixa o dente no espaço livre entre o cabeçalho e o texto de abertura
        var unit = (2 * tanV * d0) / h; // unidades da cena por pixel no plano do dente
        var headerBox = document.querySelector('[data-header]');
        var beatBox = document.querySelector('[data-beat="0"]');
        var canvasTop = canvas.getBoundingClientRect().top;
        var topPx = (headerBox ? headerBox.offsetHeight : 64) + 8;
        var bottomPx = beatBox ? beatBox.getBoundingClientRect().top - canvasTop - 8 : h * 0.45;
        var availPx = Math.max(bottomPx - topPx, h * 0.18);
        var s = Math.min(0.75, (availPx * unit * 0.82) / 2.85);
        view.home = { x: 0, y: (h / 2 - (topPx + bottomPx) / 2) * unit, s: s };
      } else {
        view.home = { x: Math.min(half0W * 0.45, 2.4), y: 0.05, s: 1 };
      }

      // Final: fachada inteira
      var W = portrait ? 8.6 : 10.8;
      var H = 8.2;
      var d1 = Math.max((H / 2) / tanV, (W / 2) / (tanV * aspect));
      var half1H = tanV * d1;
      var lookX = portrait ? -0.7 : 0;
      // topo do letreiro logo abaixo do cabeçalho fixo
      var headerEl = document.querySelector('[data-header]');
      var headerFrac = ((headerEl ? headerEl.offsetHeight : 64) + 12) / h;
      var lookY = 4.35 - half1H * (1 - 2 * headerFrac);
      view.look1 = new THREE.Vector3(lookX, lookY, -6);
      view.cam1 = new THREE.Vector3(lookX, lookY + 0.5, -6 + d1);
    }
    layout();

    var ro = new ResizeObserver(layout);
    ro.observe(canvas);

    /* ---------- Interação com o ponteiro ---------- */
    var pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    function onPointer(e) {
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    }
    window.addEventListener('pointermove', onPointer, { passive: true });

    /* ---------- Loop ---------- */
    var clock = new THREE.Clock();
    var spin = 0;
    var qSpin = new THREE.Quaternion();
    var qFinal = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.18, 0.55, 0));
    var eSpin = new THREE.Euler();
    var camPos = new THREE.Vector3();
    var camLook = new THREE.Vector3();
    var target = new THREE.Vector3();
    var visible = true;
    var raf = 0;
    var disposed = false;

    function frame() {
      raf = 0;
      if (disposed || !visible || document.hidden) return;
      var dt = Math.min(clock.getDelta(), 0.05);
      var t = clock.elapsedTime;
      var p = getProgress();

      pointer.x += (pointer.tx - pointer.x) * 0.06;
      pointer.y += (pointer.ty - pointer.y) * 0.06;

      var k = easeInOut(seg(p, 0.38, 0.86));      // dente → letreiro
      var c = easeInOut(seg(p, 0.36, 0.9));       // câmera
      var f = easeOut(seg(p, 0.4, 0.72));         // fachada aparece

      // Fachada
      facade.visible = f > 0.001;
      facade.position.y = (1 - f) * -2.2;
      facade.userData.mats.forEach(function (m) { m.opacity = m.userData.baseOpacity * f; });

      // Câmera
      camPos.lerpVectors(view.cam0, view.cam1, c);
      camLook.lerpVectors(view.look0, view.look1, c);
      camPos.x += pointer.x * 0.15 * (1 - c);
      camera.position.copy(camPos);
      camera.lookAt(camLook);

      // Dente
      target.set(-4.0, 2.85 + facade.position.y, -5.2);
      var home = view.home;
      var float = Math.sin(t * 1.3) * 0.07 * (1 - k);
      tooth.position.set(
        lerp(home.x, target.x, k),
        lerp(home.y, target.y, k) + Math.sin(k * Math.PI) * 1.1 + float,
        lerp(0, target.z, k)
      );
      tooth.scale.setScalar(lerp(home.s, 0.55, k));

      spin += dt * 0.45 * (1 - k) * (1 - k);
      eSpin.set(0.28 + pointer.y * 0.25, spin + pointer.x * 0.6, pointer.x * -0.08);
      qSpin.setFromEuler(eSpin);
      tooth.quaternion.slerpQuaternions(qSpin, qFinal, k);

      // Sombra e partículas acompanham o dente no início
      var early = 1 - seg(p, 0.34, 0.5);
      shadow.position.set(home.x, home.y - 1.55 * home.s, 0);
      shadow.scale.setScalar(home.s * (1 - float * 0.8));
      shadow.material.opacity = early;
      shadow.visible = early > 0.001;
      particles.position.set(home.x, home.y, 0);
      particles.scale.setScalar(home.s);
      particles.rotation.y = t * 0.06;
      pMat.opacity = 0.8 * early;
      particles.visible = early > 0.001;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    }

    function start() { if (!raf && !disposed) { clock.getDelta(); raf = requestAnimationFrame(frame); } }

    var io = new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) start();
    });
    io.observe(container);
    document.addEventListener('visibilitychange', start);

    window.__toothScene = {
      dispose: function () {
        disposed = true;
        cancelAnimationFrame(raf);
        io.disconnect();
        ro.disconnect();
        window.removeEventListener('pointermove', onPointer);
        renderer.dispose();
      }
    };

    // Primeiro quadro antes de revelar o canvas
    raf = 1;
    frame();
  };
})();
