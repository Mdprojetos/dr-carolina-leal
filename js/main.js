/* Clínica Dra. Carolina Leal — interações gerais */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Menu mobile ---------- */
  var toggle = document.querySelector('[data-nav-toggle]');
  var nav = document.querySelector('[data-nav]');
  var toggleLabel = toggle.querySelector('.visually-hidden');

  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    toggleLabel.textContent = open ? 'Fechar menu' : 'Abrir menu';
  }
  toggle.addEventListener('click', function () {
    setMenu(toggle.getAttribute('aria-expanded') !== 'true');
  });
  nav.addEventListener('click', function (e) {
    if (e.target.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
      setMenu(false);
      toggle.focus();
    }
  });

  /* ---------- Cabeçalho com borda após rolar ---------- */
  var header = document.querySelector('[data-header]');
  function onScrollHeader() { header.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScrollHeader, { passive: true });
  onScrollHeader();

  /* ---------- Ano no rodapé ---------- */
  var yearEl = document.querySelector('[data-year]');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Aberto agora (horário de Brasília) ---------- */
  (function openStatus() {
    var statusEl = document.querySelector('[data-open-status]');
    if (!statusEl) return;
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false
    }).formatToParts(new Date());
    var get = function (t) { return (parts.find(function (p) { return p.type === t; }) || {}).value; };
    var day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    var minutes = (parseInt(get('hour'), 10) % 24) * 60 + parseInt(get('minute'), 10);

    var open = false;
    if (day >= 1 && day <= 5) open = minutes >= 480 && minutes < 1080;
    if (day === 6) open = minutes >= 480 && minutes < 720;

    statusEl.textContent = open ? 'Aberto agora' : 'Fechado agora';
    statusEl.classList.add(open ? 'is-open' : 'is-closed');

    document.querySelectorAll('[data-days]').forEach(function (row) {
      if (row.getAttribute('data-days').split(',').indexOf(String(day)) !== -1) row.classList.add('is-today');
    });
  })();

  /* ---------- Abertura em scroll: dente → fachada ---------- */
  var scrolly = document.querySelector('[data-scrolly]');
  var canvas = document.querySelector('[data-scene]');
  var beats = Array.prototype.slice.call(document.querySelectorAll('[data-beat]'));
  var hint = document.querySelector('[data-scroll-hint]');

  function hasWebGL() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) { return false; }
  }

  function goStatic() {
    scrolly.classList.add('is-static');
    scrolly.classList.remove('is-ready');
    beats.forEach(function (b) { b.style.opacity = ''; b.classList.remove('is-hidden'); });
  }

  if (reduceMotion.matches || !hasWebGL() || typeof window.initToothScene !== 'function') {
    goStatic();
    return;
  }

  var progress = 0;

  // Janelas de opacidade de cada bloco de texto [entra, cheio, cheio, sai]
  var windows = [
    [-1, 0, 0.1, 0.17],
    [0.19, 0.25, 0.32, 0.38],
    [0.80, 0.90, 2, 3]
  ];
  // Posição de rolagem "ideal" para mostrar cada bloco (usada no foco por teclado)
  var beatAnchor = [0, 0.28, 0.96];

  function ramp(p, w) {
    if (p <= w[0] || p >= w[3]) return 0;
    if (p < w[1]) return (p - w[0]) / (w[1] - w[0]);
    if (p > w[2]) return 1 - (p - w[2]) / (w[3] - w[2]);
    return 1;
  }

  function measure() {
    var rect = scrolly.getBoundingClientRect();
    var total = rect.height - window.innerHeight;
    progress = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;

    beats.forEach(function (b, i) {
      var o = ramp(progress, windows[i]);
      b.style.opacity = o.toFixed(3);
      // Fora de vista: some da tela, mas permanece no DOM para leitores de tela via foco
      b.classList.toggle('is-hidden', o === 0 && !b.contains(document.activeElement));
    });
    scrolly.style.setProperty('--sky', Math.min(1, Math.max(0, (progress - 0.45) / 0.35)).toFixed(3));
    if (hint) hint.style.opacity = progress < 0.05 ? '1' : '0';
  }

  // Ao navegar por teclado até um botão de um bloco oculto, rola até ele
  beats.forEach(function (b, i) {
    b.addEventListener('focusin', function () {
      var rect = scrolly.getBoundingClientRect();
      var top = window.scrollY + rect.top;
      var total = rect.height - window.innerHeight;
      window.scrollTo({ top: top + total * beatAnchor[i], behavior: 'auto' });
    });
  });

  window.addEventListener('scroll', measure, { passive: true });
  window.addEventListener('resize', measure);
  measure();

  // Carrega o 3D depois do conteúdo principal para não pesar o carregamento
  function boot() {
    window.initToothScene({
      canvas: canvas,
      getProgress: function () { return progress; },
      container: scrolly
    }).then(function () {
      scrolly.classList.add('is-ready');
    }).catch(function (err) {
      console.warn('Cena 3D indisponível, usando versão estática.', err);
      goStatic();
    });
  }
  var idle = window.requestIdleCallback || function (cb) { return setTimeout(cb, 200); };
  if (document.readyState === 'complete') idle(boot);
  else window.addEventListener('load', function () { idle(boot); });

  // Se a pessoa ativar "reduzir movimento" com a página aberta
  reduceMotion.addEventListener && reduceMotion.addEventListener('change', function (e) {
    if (e.matches) {
      if (window.__toothScene) window.__toothScene.dispose();
      goStatic();
    }
  });
})();
