/* ============================================================
   The globe in "Where I've worked".

   COBE (6 kB, self-hosted) draws a dotted earth on a canvas.
   Picking a place eases the globe round to face it; left alone
   it drifts west. The flat SVG map stays in the markup and is
   used whenever WebGL is missing, so nothing is lost.
   ============================================================ */
import createGlobe from './js/cobe.js';

(function () {
  const canvas = document.getElementById('globe');
  const wrap = document.getElementById('globewrap');
  const readout = document.getElementById('mapread');
  if (!canvas || !wrap) return;

  const buttons = [...document.querySelectorAll('.placebtn')];
  const idle = readout ? readout.textContent : '';
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* cobe's own convention for pointing a lat/long at the viewer */
  const anglesFor = (lat, lng) => [
    Math.PI - ((lng * Math.PI) / 180 - Math.PI / 2),
    (lat * Math.PI) / 180,
  ];

  const places = buttons.map((b) => ({
    el: b,
    lat: parseFloat(b.dataset.lat),
    lng: parseFloat(b.dataset.lng),
    blurb: b.dataset.blurb,
    home: b.classList.contains('home'),
  }));

  /* ---------- palette, read from the page so themes stay in step ---------- */
  const hexToRgb = (hex) => {
    const v = hex.trim().replace('#', '');
    const n = parseInt(v.length === 3 ? v.split('').map((c) => c + c).join('') : v, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  };
  function palette() {
    const cs = getComputedStyle(document.documentElement);
    const pick = (name, fallback) => {
      const raw = cs.getPropertyValue(name).trim();
      return raw.startsWith('#') ? hexToRgb(raw) : hexToRgb(fallback);
    };
    const dark = document.documentElement.dataset.theme === 'dark'
      || (!document.documentElement.dataset.theme
          && matchMedia('(prefers-color-scheme: dark)').matches);
    return {
      dark: dark ? 1 : 0,
      base: dark ? [0.32, 0.34, 0.38] : [0.86, 0.85, 0.81],
      glow: dark ? [0.08, 0.09, 0.11] : [0.98, 0.98, 0.96],
      marker: pick('--accent', dark ? '#7fa9e0' : '#1d4f91'),
    };
  }

  /* ---------- state ---------- */
  let globe = null;
  let phi = anglesFor(20, 60)[0];      // start looking at south Asia
  let theta = 0.24;
  let targetPhi = phi;
  let targetTheta = theta;
  let drifting = !calm;
  let active = -1;

  /* dragging */
  let pointerDown = false;
  let lastX = 0;
  let dragged = 0;

  function build() {
    if (globe) { globe.destroy(); globe = null; }
    const p = palette();
    const size = canvas.clientWidth || 440;
    const dpr = Math.min(devicePixelRatio || 1, 2);

    globe = createGlobe(canvas, {
      devicePixelRatio: dpr,
      width: size * dpr,
      height: size * dpr,
      phi: 0,
      theta: 0,
      dark: p.dark,
      diffuse: 1.2,
      mapSamples: 15000,
      mapBrightness: p.dark ? 4.4 : 1.9,
      mapBaseBrightness: p.dark ? 0.06 : 0.16,
      baseColor: p.base,
      markerColor: p.marker,
      glowColor: p.glow,
      opacity: 1,
      markers: places.map((pl) => ({
        location: [pl.lat, pl.lng],
        size: pl.home ? 0.09 : 0.06,
      })),
      onRender: (state) => {
        if (drifting && !pointerDown) targetPhi -= 0.0035;
        phi += (targetPhi - phi) * 0.075;
        theta += (targetTheta - theta) * 0.075;
        state.phi = phi;
        state.theta = theta;
        const s = canvas.clientWidth || size;
        state.width = s * dpr;
        state.height = s * dpr;
      },
    });

    requestAnimationFrame(() => canvas.classList.add('on'));
    wrap.classList.add('live');
  }

  /* ---------- picking a place ---------- */
  function go(i) {
    const pl = places[i];
    if (!pl) return;
    const [p1, t1] = anglesFor(pl.lat, pl.lng);

    /* take the short way round rather than unwinding the long way */
    const turns = Math.round((phi - p1) / (Math.PI * 2));
    targetPhi = p1 + turns * Math.PI * 2;
    targetTheta = t1;
    drifting = false;
    active = i;

    buttons.forEach((b, n) => b.setAttribute('aria-pressed', n === i ? 'true' : 'false'));
    if (readout) readout.textContent = pl.blurb;
  }

  function release() {
    drifting = !calm;
    active = -1;
    buttons.forEach((b) => b.setAttribute('aria-pressed', 'false'));
    if (readout) readout.textContent = idle;
  }

  buttons.forEach((b, i) => {
    b.addEventListener('click', () => (active === i ? release() : go(i)));
  });

  /* ---------- drag to spin ---------- */
  canvas.addEventListener('pointerdown', (e) => {
    pointerDown = true; lastX = e.clientX; dragged = 0;
    canvas.classList.add('dragging');
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!pointerDown) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    dragged += Math.abs(dx);
    targetPhi += dx * 0.006;
    phi = targetPhi;                 /* follow the finger exactly */
  });
  function endDrag() {
    if (!pointerDown) return;
    pointerDown = false;
    canvas.classList.remove('dragging');
    if (dragged > 4) {               /* a real drag, not a tap */
      drifting = !calm;
      active = -1;
      buttons.forEach((b) => b.setAttribute('aria-pressed', 'false'));
      if (readout) readout.textContent = idle;
    }
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  /* ---------- rebuild on theme change and on resize ---------- */
  let resizeTimer = null;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(build, 200);
  }, { passive: true });

  new MutationObserver(build).observe(document.documentElement, {
    attributes: true, attributeFilter: ['data-theme'],
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', build);

  /* only spend GPU time while it is actually on screen */
  try {
    build();
    new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (globe) globe.toggle ? globe.toggle(en.isIntersecting) : null;
        drifting = en.isIntersecting && !calm && active === -1;
      });
    }, { threshold: 0.05 }).observe(wrap);
  } catch (err) {
    /* no WebGL: the flat map is already in the markup, so just leave it */
    wrap.classList.remove('live');
  }
})();
