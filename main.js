/**
 * ============================================================================
 * RAHUL ACHARI ©2026 — 3D WEBGL ENGINE & INTERACTIVE EXPERIENCE
 * Exact Reproduction of HAOQI©2026 Visual Style & Interaction Model
 * ============================================================================
 */

import * as THREE from './libs/three.module.js';
import { GLTFLoader } from './libs/GLTFLoader.js';
import { FontLoader } from './libs/FontLoader.js';
import { TextGeometry } from './libs/TextGeometry.js';
import createLightTunnel from './LightTunnel.js';

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // 1. STATE & GLOBAL CONFIGURATION
  // --------------------------------------------------------------------------
  const state = {
    theme: 'dark',
    mouse: { x: 0, y: 0, targetX: 0, targetY: 0 },
    scrollY: 0,
    viewport: { width: window.innerWidth, height: window.innerHeight }
  };

  let pixelMaterial = null;
  let rahulMaterial = null;
  let rahul3DMesh = null;
  let cursor3DMesh = null;
  let transitionCursorMesh = null;
  let transitionCursorGroup = null;
  let transitionTiltA = null;
  let transitionSpin = null;
  let transitionTiltB = null;
  let transitionCursorMaterial = null;
  let cnt3DMesh = null;
  let lightTunnel = null;
  let svgSignEl = null;
  let signatureDrawn = false;

  function triggerSignatureDraw() {
    if (signatureDrawn) return;
    if (!svgSignEl) {
      svgSignEl = document.getElementById('svg-signature');
    }
    if (!svgSignEl) return;
    const rect = svgSignEl.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
      signatureDrawn = true;
      svgSignEl.classList.add('is-drawn');
    }
  }

  // --------------------------------------------------------------------------
  // 2. PRELOADER & INITIAL REVEAL
  // --------------------------------------------------------------------------
  const preloader = document.getElementById('preloader');
  const preloaderFill = document.getElementById('preloader-fill');

  let loadProgress = 0;
  const loadInterval = setInterval(() => {
    loadProgress += Math.random() * 35 + 25;
    if (loadProgress >= 100) {
      loadProgress = 100;
      clearInterval(loadInterval);
      if (preloaderFill) preloaderFill.style.width = '100%';
      setTimeout(() => {
        if (preloader) preloader.classList.add('fade-out');
        triggerSignatureDraw();
      }, 250);
    } else {
      if (preloaderFill) preloaderFill.style.width = `${loadProgress}%`;
    }
  }, 70);

  // --------------------------------------------------------------------------
  // 3. THEME TOGGLE (Dark / Light)
  // --------------------------------------------------------------------------
  const themeBtn = document.getElementById('theme-toggle-btn');
  const htmlRoot = document.documentElement;

  function applyThemeMode(mode) {
    state.themeMode = mode; // 'auto', 'dark', 'light'
    let effectiveTheme = mode;
    if (mode === 'auto') {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      effectiveTheme = prefersDark ? 'dark' : 'light';
      if (themeBtn) themeBtn.textContent = 'THEME[A]';
    } else if (mode === 'dark') {
      effectiveTheme = 'dark';
      if (themeBtn) themeBtn.textContent = 'THEME[D]';
    } else {
      effectiveTheme = 'light';
      if (themeBtn) themeBtn.textContent = 'THEME[L]';
    }

    state.theme = effectiveTheme;
    if (effectiveTheme === 'light') {
      htmlRoot.classList.add('light');
      htmlRoot.classList.remove('dark');
      if (pixelMaterial && pixelMaterial.uniforms && pixelMaterial.uniforms.uColor) {
        pixelMaterial.uniforms.uColor.value.set('#FBFAF4');
      }
      if (lightTunnel && typeof lightTunnel.setOptions === 'function') {
        lightTunnel.setOptions({
          lightMode: true,
          cableColor: '#0055ff',
          pulseColor: '#0033aa',
          tunnelColor: '#e8e5d8'
        });
      }
      if (rahul3DMesh && rahul3DMesh.material && rahul3DMesh.material.uniforms) {
        const u = rahul3DMesh.material.uniforms;
        if (u.uBaseColor) u.uBaseColor.value.set('#0048ba');
        if (u.uDeepColor) u.uDeepColor.value.set('#0a1020');
        if (u.uFresnelColor) u.uFresnelColor.value.set('#38bdf8');
      }
    } else {
      htmlRoot.classList.remove('light');
      htmlRoot.classList.add('dark');
      if (pixelMaterial && pixelMaterial.uniforms && pixelMaterial.uniforms.uColor) {
        pixelMaterial.uniforms.uColor.value.set('#000000');
      }
      if (lightTunnel && typeof lightTunnel.setOptions === 'function') {
        lightTunnel.setOptions({
          lightMode: false,
          cableColor: '#009dff',
          pulseColor: '#64c3ff',
          tunnelColor: '#001833'
        });
      }
      if (rahul3DMesh && rahul3DMesh.material && rahul3DMesh.material.uniforms) {
        const u = rahul3DMesh.material.uniforms;
        if (u.uBaseColor) u.uBaseColor.value.set('#009dff');
        if (u.uDeepColor) u.uDeepColor.value.set('#002b66');
        if (u.uFresnelColor) u.uFresnelColor.value.set('#64c3ff');
      }
    }
  }

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const nextMode = state.themeMode === 'auto' ? 'dark' : (state.themeMode === 'dark' ? 'light' : 'auto');
      try {
        localStorage.setItem('themeMode', nextMode);
      } catch (e) {}
      applyThemeMode(nextMode);
    });
  }

  const initialTheme = (function () {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const qTheme = urlParams.get('theme');
      if (qTheme === 'dark' || qTheme === 'light') {
        localStorage.setItem('themeMode', qTheme);
        return qTheme;
      }
      return localStorage.getItem('themeMode') || 'dark';
    } catch (e) {
      return 'dark';
    }
  })();
  applyThemeMode(initialTheme);

  // --------------------------------------------------------------------------
  // 4. LIVE TIMEZONE CLOCK & COORDINATE TRACKER (Exact Haoqi Formatting)
  // --------------------------------------------------------------------------
  const clockEl = document.getElementById('live-clock');
  const coordsEl = document.getElementById('live-coords');
  const footerCoordsEl = document.getElementById('footer-live-coords');

  function updateClock() {
    if (!clockEl) return;
    const now = new Date();
    const options = { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit' };
    const timeStr = now.toLocaleTimeString('en-GB', options);
    clockEl.textContent = `GMT+5:30 IN ${timeStr} 24°C`;
  }
  updateClock();
  setInterval(updateClock, 1000);

  const heroEl = document.getElementById('hero');
  const footerEl = document.getElementById('contact');

  window.addEventListener('pointermove', (e) => {
    state.mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
    state.mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;

    const padX = String(Math.floor(e.clientX)).padStart(4, '0');
    const padY = String(Math.floor(e.clientY)).padStart(4, '0');

    if (coordsEl) {
      coordsEl.textContent = `${padX} X ${padY} Y`;
    }

    if (footerCoordsEl) {
      footerCoordsEl.textContent = `${padX} X ${padY} Y`;
    }

    if (heroEl) {
      const rect = heroEl.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        heroEl.style.setProperty('--mouse-x', `${x.toFixed(1)}%`);
        heroEl.style.setProperty('--mouse-y', `${y.toFixed(1)}%`);
      }
    }

    if (footerEl) {
      const rect = footerEl.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        footerEl.style.setProperty('--mouse-x', `${x.toFixed(1)}%`);
        footerEl.style.setProperty('--mouse-y', `${y.toFixed(1)}%`);
      }
    }
  }, { passive: true });

  // --------------------------------------------------------------------------
  // 4B. INTERACTIVE DOM CUSTOM CURSOR & TRAILER
  // --------------------------------------------------------------------------
  const cursorDot = document.getElementById('custom-cursor-dot');
  const cursorRing = document.getElementById('custom-cursor-ring');
  const mouseScreen = { x: -100, y: -100 };
  const ringScreen = { x: -100, y: -100 };
  let cursorActive = false;

  window.addEventListener('pointermove', (e) => {
    mouseScreen.x = e.clientX;
    mouseScreen.y = e.clientY;

    if (!cursorActive) {
      cursorActive = true;
      if (cursorDot) cursorDot.style.opacity = '1';
      if (cursorRing) cursorRing.style.opacity = '1';
    }

    if (cursorDot) {
      cursorDot.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
    }
  }, { passive: true });

  window.addEventListener('pointerdown', () => {
    if (cursorRing) cursorRing.classList.add('is-clicking');
  });

  window.addEventListener('pointerup', () => {
    if (cursorRing) cursorRing.classList.remove('is-clicking');
  });

  document.querySelectorAll('a, button, .project-card, .portrait-frame, .dotted-box, .cursor-pointer-badge, .svg-sign').forEach((el) => {
    el.addEventListener('pointerenter', () => {
      if (cursorRing) cursorRing.classList.add('is-hovering');
    });
    el.addEventListener('pointerleave', () => {
      if (cursorRing) cursorRing.classList.remove('is-hovering');
    });
  });

  // --------------------------------------------------------------------------
  // 5. MOBILE NAVIGATION MENU
  // --------------------------------------------------------------------------
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
  let mobileMenuOpen = false;

  if (mobileMenuBtn && mobileNavOverlay) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenuOpen = !mobileMenuOpen;
      mobileNavOverlay.classList.toggle('is-open', mobileMenuOpen);
      const lines = mobileMenuBtn.querySelectorAll('.hamburger-line');
      if (mobileMenuOpen) {
        lines[0].style.transform = 'translateY(4px) rotate(45deg)';
        lines[1].style.transform = 'translateY(-4px) rotate(-45deg)';
      } else {
        lines[0].style.transform = 'none';
        lines[1].style.transform = 'none';
      }
    });

    mobileNavOverlay.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        if (mobileMenuOpen) mobileMenuBtn.click();
      });
    });
  }

  // --------------------------------------------------------------------------
  // 6. INTERACTIVE CURSOR POINTING & WRONG NAME ANIMATION
  // --------------------------------------------------------------------------
  const nameBadge = document.getElementById('hero-name-badge');
  const wrongNameSpan = document.getElementById('badge-wrong-name');
  const correctNameSpan = document.getElementById('badge-correct-name');

  if (nameBadge && wrongNameSpan && correctNameSpan) {
    let corrected = false;
    function runNameCorrection() {
      if (corrected) return;
      corrected = true;
      wrongNameSpan.style.textDecoration = 'line-through';
      wrongNameSpan.style.opacity = '0.5';
      correctNameSpan.style.display = 'inline-block';
      correctNameSpan.style.color = '#C0FE04';
    }

    setTimeout(runNameCorrection, 1500);

    nameBadge.addEventListener('click', () => {
      corrected = !corrected;
      if (corrected) {
        wrongNameSpan.style.textDecoration = 'line-through';
        wrongNameSpan.style.opacity = '0.5';
        correctNameSpan.style.display = 'inline-block';
      } else {
        wrongNameSpan.style.textDecoration = 'none';
        wrongNameSpan.style.opacity = '1';
        correctNameSpan.style.display = 'none';
      }
    });
  }

  // --------------------------------------------------------------------------
  // 7. CALLIGRAPHY SVG SIGNATURE DRAW (Exact Rahul Achari Vector Draw)
  // --------------------------------------------------------------------------
  svgSignEl = document.getElementById('svg-signature');
  const svgSignPaths = svgSignEl ? svgSignEl.querySelectorAll('.svg-sign__path') : [];

  // Compute exact path lengths for authentic calligraphy ink flow
  if (svgSignPaths.length > 0) {
    svgSignPaths.forEach((path) => {
      try {
        const len = Math.ceil(path.getTotalLength()) + 2;
        path.style.strokeDasharray = `${len}`;
        path.style.strokeDashoffset = `${len}`;
      } catch (e) {
        path.style.strokeDasharray = '800';
        path.style.strokeDashoffset = '800';
      }
    });
  }

  if (svgSignEl) {
    // Click signature to replay calligraphy ink animation
    svgSignEl.style.cursor = 'pointer';
    svgSignEl.style.pointerEvents = 'auto';
    svgSignEl.addEventListener('click', () => {
      svgSignEl.classList.remove('is-drawn');
      void svgSignEl.offsetWidth; // trigger reflow
      svgSignEl.classList.add('is-drawn');
    });

    if ('IntersectionObserver' in window) {
      const signObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            svgSignEl.classList.add('is-drawn');
          }
        });
      }, { threshold: 0.15 });
      signObserver.observe(svgSignEl);
    } else {
      window.addEventListener('scroll', triggerSignatureDraw, { passive: true });
    }
  }

  // --------------------------------------------------------------------------
  // 8. THREE.JS 3D WEBGL SCENE (Exact Specular Cobalt Blue Gloss & Parallax)
  // --------------------------------------------------------------------------
  const canvas = document.getElementById('webgl-canvas');
  if (!canvas) return;

  const scene = new THREE.Scene();
  window.__scene = scene; // Debug access
  // Keep background transparent to let deep navy-blue radial gradient shine through
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 22);

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0); // Transparent canvas
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  // Studio Lighting (Vibrant Deep Royal Cobalt & Crisp Highlights)
  const ambientLight = new THREE.AmbientLight(0x1d4ed8, 1.2);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 4.0);
  keyLight.position.set(6, 14, 12);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x60a5fa, 4.5);
  rimLight.position.set(-8, -6, -4);
  scene.add(rimLight);

  const fillLight = new THREE.DirectionalLight(0x1e40af, 2.5);
  fillLight.position.set(0, -10, 8);
  scene.add(fillLight);

  // Dynamic interactive caustic light following mouse
  const rahulPointLight = new THREE.PointLight(0x60a5fa, 5.0, 35);
  rahulPointLight.position.set(0, 2, 6);
  scene.add(rahulPointLight);

  // Liquid Royal Cobalt Material with Physical Glass Transmission & Chrome Specular Sheen
  function createLiquidCobaltMaterial() {
    const isDark = state.theme === 'dark';
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(isDark ? '#0d42d4' : '#0048ba'),
      emissive: new THREE.Color(isDark ? '#020d36' : '#001133'),
      roughness: 0.08,
      metalness: 0.12,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      transmission: 0.28,
      ior: 1.48,
      reflectivity: 0.98,
      side: THREE.DoubleSide
    });
  }

  // Exact Haoqi Chromatic Blue Ceramic / Refractive Glass Material for Cursor & Footer
  function createCobaltGlossMaterial(baseColorHex = '#0d42d4') {
    const isDark = state.theme === 'dark';
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBaseColor: { value: new THREE.Color(isDark ? '#0d42d4' : '#0048ba') },
        uDeepColor: { value: new THREE.Color(isDark ? '#020d36' : '#0a1020') },
        uFresnelColor: { value: new THREE.Color(isDark ? '#60a5fa' : '#38bdf8') },
        uLightPos: { value: new THREE.Vector3(6, 14, 12) },
        uFresnelPower: { value: 2.2 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec3 vWorldPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uBaseColor;
        uniform vec3 uDeepColor;
        uniform vec3 uFresnelColor;
        uniform vec3 uLightPos;
        uniform float uFresnelPower;

        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec3 vWorldPosition;

        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(vViewPosition);

          // Fresnel Rim Light
          float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), uFresnelPower);

          // Specular Glint
          vec3 lightDir = normalize(uLightPos - vWorldPosition);
          vec3 halfVec = normalize(lightDir + viewDir);
          float spec = pow(max(dot(normal, halfVec), 0.0), 40.0);

          // Deep gradient from bottom to top
          float gradY = clamp((vWorldPosition.y + 3.0) / 6.0, 0.0, 1.0);
          vec3 bodyColor = mix(uDeepColor, uBaseColor, gradY);

          // Combine with electric highlights
          vec3 finalColor = bodyColor + (fresnel * uFresnelColor * 1.8) + (spec * vec3(1.0, 1.0, 1.0) * 1.5);

          gl_FragColor = vec4(finalColor, 0.98);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });
  }

  // Exact Haoqi Hyperspace Radial Speed-Line Shader Material for 3D Cursor Mesh
  function createCursorTransitionMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        iResolution: {
          value: new THREE.Vector3(
            window.innerWidth * Math.min(window.devicePixelRatio, 2),
            window.innerHeight * Math.min(window.devicePixelRatio, 2),
            1.0
          )
        },
        iTime: { value: 0.0 },
        uScrollDuration: { value: 2.0 },
        uOpacity: { value: 1.0 },
        uAccentColor: { value: new THREE.Color('#009dff') },
        uStripeColorA: { value: new THREE.Color('#009dff') },
        uStripeColorB: { value: new THREE.Color('#64c3ff') },
        uStripeReveal: { value: 0.0 },
        uLight: { value: new THREE.Vector3(4.0, 9.0, 0.5) },
        uShininess: { value: 40.0 },
        uDiffuseness: { value: 0.1 },
        uSpecularStrength: { value: 1.2 },
        uFresnelPower: { value: 6.0 },
        uFresnelStrength: { value: 1.0 },
        uFresnelSideDir: { value: new THREE.Vector3(-1.0, 0.3, 1.0) }
      },
      vertexShader: `
        varying vec3 vWorldNormal;
        varying vec3 vEyeVector;

        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vec4 mvPosition = viewMatrix * worldPos;

          gl_Position = projectionMatrix * mvPosition;

          vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
          vEyeVector = normalize(worldPos.xyz - cameraPosition);
        }
      `,
      fragmentShader: `
        precision highp float;

        uniform vec3 iResolution;
        uniform float iTime;
        uniform float uScrollDuration;

        uniform vec3 uAccentColor;
        uniform vec3 uStripeColorA;
        uniform vec3 uStripeColorB;
        uniform float uStripeReveal;

        uniform float uOpacity;
        uniform vec3 uLight;
        uniform float uShininess;
        uniform float uDiffuseness;
        uniform float uSpecularStrength;
        uniform float uFresnelPower;
        uniform float uFresnelStrength;
        uniform vec3 uFresnelSideDir;

        varying vec3 vWorldNormal;
        varying vec3 vEyeVector;

        float hash21(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        vec3 rgb2hsv(vec3 c) {
          vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
          vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
          vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
          float d = q.x - min(q.w, q.y);
          float e = 1.0e-10;
          return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
        }

        vec3 hsv2rgb(vec3 c) {
          vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
          vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
          return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }

        vec3 sampleHyperspace(vec2 fragCoord) {
          vec2 R = iResolution.xy;
          float baseScale = max(1.0, min(R.x, R.y));
          vec2 u = (fragCoord * 2.0 - R) / baseScale;

          float travel = clamp(uStripeReveal, 0.0, 1.0);
          float time = iTime;

          const float cellDensity = 100.0;
          vec2 polar = vec2(atan(u.y, u.x) / 3.0, length(u));
          float angleCoord = (6.0 - polar.x) * cellDensity;
          float angleId = floor(angleCoord) + 0.5;
          float angleCell = abs(fract(angleCoord) - 0.5);
          float radialCoord = (6.0 - polar.y) * cellDensity;
          vec2 q = vec2(angleId, radialCoord);

          float keepProbability = mix(0.25, 1.0, travel);
          float scrollSpeed = mix(1.2, 4.2, travel);
          float trailLength = mix(2.4, 0.95, travel);
          float raySeq = fract((angleId + 0.5) * 0.61803398875);
          float keepEdge = 0.025;
          float keepMask = 1.0 - smoothstep(keepProbability - keepEdge, keepProbability + keepEdge, raySeq);

          float phaseBase = (q.y * 0.02 + q.x * 0.4) * fract(q.x * 0.61);
          vec4 spark = max(
            1.0 - fract(vec4(7.0, 6.0, 4.0, 0.0) * 0.02 + phaseBase + time * scrollSpeed) * trailLength,
            0.0
          );

          float channelMix = max(max(spark.r, spark.g), spark.b);
          float edge = max(fwidth(channelMix) * 1.5, 2.0 / max(iResolution.y, 1.0));
          float star = smoothstep(0.12 - edge, 0.12 + edge, channelMix);

          const float starThinness = 0.14;
          float thinEdge = max(fwidth(angleCell) * 1.5, 0.002);
          float thinMask = 1.0 - smoothstep(starThinness - thinEdge, starThinness + thinEdge, angleCell);
          star *= thinMask * keepMask;

          // Never zero out in center: radiant boost across full cursor silhouette
          float radialBoost = mix(0.85, 1.45, smoothstep(0.0, 0.7, polar.y));
          float intensity = mix(0.0, 6.8, travel * 1.2);

          float stripeBlend = hash21(vec2(angleId, 19.713));
          vec3 stripeRgb = mix(uStripeColorA, uStripeColorB, stripeBlend);

          vec3 hsvA = rgb2hsv(max(uStripeColorA, vec3(1e-5)));
          vec3 hsvB = rgb2hsv(max(uStripeColorB, vec3(1e-5)));
          float dh = abs(hsvA.x - hsvB.x);
          dh = min(dh, 1.0 - dh);
          float hueBand = clamp(dh * 1.25 + 0.04, 0.07, 0.24);

          vec3 hsv = rgb2hsv(max(stripeRgb, vec3(1e-5)));
          float idHash = hash21(vec2(angleId, 6.18));
          float idHash2 = hash21(vec2(angleId, 91.7));

          float scrollPhase = time * scrollSpeed;
          float hueAnim =
            sin(scrollPhase * 0.52 + angleId * 0.29 + idHash * 6.2831853) * (hueBand * 0.85);
          float hueStripe = (idHash - 0.5) * hueBand * 2.0;

          hsv.x = fract(hsv.x + hueStripe + hueAnim);
          hsv.y = clamp(hsv.y * mix(0.96, 1.06, idHash2), 0.0, 1.0);
          hsv.z = clamp(hsv.z * mix(0.97, 1.05, idHash), 0.0, 1.0);

          vec3 sparkColor = hsv2rgb(hsv);
          float pulse = mix(0.78, 1.0, smoothstep(0.14, 0.5, channelMix));
          sparkColor *= pulse;

          return intensity * radialBoost * sparkColor * star;
        }

        float fresnel(vec3 eyeDir, vec3 normal, float power) {
          float fresnelFactor = abs(dot(eyeDir, normal));
          float inversefresnelFactor = 1.0 - fresnelFactor;
          return pow(inversefresnelFactor, power);
        }

        float specular(vec3 light, vec3 normal, vec3 eyeDir, float shininess, float diffuseness) {
          vec3 lightVector = normalize(-light);
          vec3 halfVector = normalize(eyeDir + lightVector);

          float NdotL = dot(normal, lightVector);
          float NdotH = abs(dot(normal, halfVector));
          float kDiffuse = max(0.0, NdotL);

          float kSpecular = pow(NdotH, shininess);
          return kSpecular + kDiffuse * diffuseness;
        }

        void main() {
          vec2 fragCoord = gl_FragCoord.xy;
          vec3 stripes = sampleHyperspace(fragCoord);

          float reveal = clamp(uStripeReveal, 0.0, 1.0);

          float stripeLuma = dot(stripes, vec3(0.299, 0.587, 0.114));
          float darken = smoothstep(0.0, 0.88, reveal);
          // Glossy royal cobalt deep base that transitions to dark void as streaks take over
          vec3 glossyBlue = vec3(0.05, 0.26, 0.85);
          vec3 darkBase = mix(glossyBlue, vec3(0.01, 0.03, 0.09), darken);
          float gapMask = (1.0 - smoothstep(0.035, 0.12, stripeLuma)) * reveal;
          vec3 rgb = darkBase + stripes * reveal * 1.5 + uAccentColor * gapMask * 0.15;

          vec3 normal = normalize(vWorldNormal);
          if (!gl_FrontFacing) {
            normal = -normal;
          }
          vec3 eyeDir = normalize(vEyeVector);

          float glossMask = mix(1.0, smoothstep(0.1, 0.48, stripeLuma), reveal);

          float specularLight = specular(uLight, normal, eyeDir, uShininess, uDiffuseness);
          rgb += specularLight * uSpecularStrength * glossMask * vec3(0.4, 0.75, 1.0);

          float f = fresnel(eyeDir, normal, uFresnelPower);
          float sideDot = dot(normal, normalize(uFresnelSideDir));
          float sideMask = smoothstep(-0.5, 0.5, sideDot);
          rgb += f * sideMask * vec3(uFresnelStrength) * glossMask * vec3(0.3, 0.7, 1.0);

          // Electric cyber rim glow so 3D arrow contour is strikingly visible against black or white
          rgb += f * vec3(0.0, 0.65, 1.0) * 0.85;

          float alpha = clamp(uOpacity, 0.0, 1.0);
          if (alpha <= 0.0001) discard;

          gl_FragColor = vec4(rgb, alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
      transparent: true,
      depthWrite: true,
      depthTest: true,
      toneMapped: false,
      side: THREE.DoubleSide
    });
  }

  // 3D Objects & Loaders
  const gltfLoader = new GLTFLoader();
  const fontLoader = new FontLoader();

  // Load 3D Inflatable "Rahul Achari" Centerpiece Mesh (Hero Section 3D Backdrop)
  fontLoader.load('assets/fonts/pacifico.typeface.json', (font) => {
    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

    const textGeo = new TextGeometry('Rahul Achari', {
      font: font,
      size: 2.2,
      height: 0.55,
      curveSegments: 16,
      bevelEnabled: true,
      bevelThickness: 0.32,
      bevelSize: 0.16,
      bevelOffset: 0,
      bevelSegments: 6
    });

    textGeo.computeBoundingBox();
    textGeo.computeVertexNormals();
    textGeo.center(); // Center at (0, 0, 0)

    rahulMaterial = createLiquidCobaltMaterial();
    const textMesh = new THREE.Mesh(textGeo, rahulMaterial);

    rahul3DMesh = new THREE.Group();
    rahul3DMesh.add(textMesh);

    const boxSize = textGeo.boundingBox.getSize(new THREE.Vector3());
    const targetWidth = isMobile ? 12.5 : (isTablet ? 17.5 : 24.0);
    const baseScale = targetWidth / Math.max(boxSize.x, 1);

    rahul3DMesh.userData.baseScale = baseScale;
    rahul3DMesh.scale.set(baseScale, baseScale, baseScale);
    // Positioned in background (z: 0.2) behind the DOM content
    rahul3DMesh.position.set(0, isMobile ? 0.35 : (isTablet ? 0.2 : 0.08), 0.2);
    rahul3DMesh.rotation.set(0, THREE.MathUtils.degToRad(3), 0);

    scene.add(rahul3DMesh);
  }, undefined, (err) => {
    console.warn('Could not load pacifico font for 3D text:', err);
  });

  // Load 3D Cursor Mesh (model/cursor.glb) - Hero Banner & Quote Transition
  gltfLoader.load('model/cursor.glb', (gltf) => {
    const isMobile = window.innerWidth < 768;

    // 1. Hero Banner Cursor
    cursor3DMesh = gltf.scene;
    cursor3DMesh.scale.set(0.11, 0.11, 0.11);
    cursor3DMesh.rotation.set(
      THREE.MathUtils.degToRad(-10),
      THREE.MathUtils.degToRad(15),
      THREE.MathUtils.degToRad(45)
    );
    cursor3DMesh.position.set(isMobile ? 5.5 : 11.4, isMobile ? -3.0 : -4.2, 1.2);

    cursor3DMesh.traverse((child) => {
      if (child.isMesh) {
        child.material = createCobaltGlossMaterial('#0d42d4');
      }
    });
    scene.add(cursor3DMesh);

    // 2. Quote Transition Cursor (Hyper-Space Section)
    // Streaks run strictly inside the cursor mesh, centered at middle of screen
    transitionCursorMesh = gltf.scene.clone(true);
    transitionCursorMaterial = createCursorTransitionMaterial();
    transitionCursorMesh.traverse((child) => {
      if (child.isMesh) {
        child.material = transitionCursorMaterial;
        child.frustumCulled = false;
        child.renderOrder = 12;
      }
    });

    // Center pivot of cloned cursor object
    const cursorBox = new THREE.Box3().setFromObject(transitionCursorMesh);
    const cursorCenter = cursorBox.getCenter(new THREE.Vector3());
    transitionCursorMesh.position.sub(cursorCenter);

    const cursorSize = cursorBox.getSize(new THREE.Vector3());
    const cursorRadius = Math.max(cursorSize.x, cursorSize.y, cursorSize.z) * 0.5 || 6.0;

    const centerGroup = new THREE.Group();
    centerGroup.add(transitionCursorMesh);

    transitionCursorGroup = new THREE.Group();
    transitionCursorGroup.userData.radius = cursorRadius;
    transitionTiltA = new THREE.Group();
    transitionSpin = new THREE.Group();
    transitionTiltB = new THREE.Group();

    transitionTiltA.rotation.z = THREE.MathUtils.degToRad(45);
    transitionTiltB.rotation.z = THREE.MathUtils.degToRad(-45);

    transitionTiltB.add(centerGroup);
    transitionSpin.add(transitionTiltB);
    transitionTiltA.add(transitionSpin);
    transitionCursorGroup.add(transitionTiltA);

    // Exact center of the viewport
    transitionCursorGroup.position.set(0, 0, 1.5);
    transitionCursorGroup.scale.set(0.001, 0.001, 0.001);
    transitionCursorGroup.visible = false;
    scene.add(transitionCursorGroup);
  }, undefined, (err) => {
    console.warn('Could not load cursor.glb:', err);
  });

  // Load 3D Craft 'N' Taste Mesh (model/cnt.gltf) for Footer (Exact Haoqi Reproduction)
  gltfLoader.load('model/cnt.gltf', (gltf) => {
    const isMobile = window.innerWidth < 768;
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    gltf.scene.position.sub(center); // Center at (0, 0, 0)
    gltf.scene.rotation.y = Math.PI; // Face forwards

    cnt3DMesh = new THREE.Group();
    cnt3DMesh.add(gltf.scene);

    const targetWidth = isMobile ? 14.5 : 22.0;
    const scale = targetWidth / Math.max(size.x, 1);
    cnt3DMesh.userData.baseScale = scale;
    cnt3DMesh.scale.set(scale, scale, scale);
    cnt3DMesh.position.set(0, -200, 1.0);
    cnt3DMesh.visible = false;

    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        child.material = createCobaltGlossMaterial('#009dff');
      }
    });
    scene.add(cnt3DMesh);
  }, undefined, (err) => {
    console.warn('Could not load cnt.gltf:', err);
  });

  // --------------------------------------------------------------------------
  // HYPERSPACE / WARP SPEED TUNNEL
  // --------------------------------------------------------------------------
  const hyperspaceGroup = new THREE.Group();
  hyperspaceGroup.visible = false;

  const streakCount = 280;
  const streakPositions = new Float32Array(streakCount * 6);
  const streakColors = new Float32Array(streakCount * 6);
  const streakData = [];

  const warpPalette = [
    new THREE.Color('#00ffff'), // neon cyan
    new THREE.Color('#38bdf8'), // sky blue
    new THREE.Color('#3b82f6'), // electric blue
    new THREE.Color('#818cf8'), // indigo
    new THREE.Color('#c084fc'), // violet
    new THREE.Color('#ffffff')  // white
  ];

  for (let i = 0; i < streakCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 2.0 + Math.random() * 20.0;
    const z = -75 + Math.random() * 95;
    const speed = 0.9 + Math.random() * 1.8;
    const length = 4.0 + Math.random() * 8.0;
    const color = warpPalette[Math.floor(Math.random() * warpPalette.length)];

    streakData.push({ angle, radius, z, speed, length });

    // Front vertex
    streakColors[i * 6 + 0] = color.r;
    streakColors[i * 6 + 1] = color.g;
    streakColors[i * 6 + 2] = color.b;
    // Tail vertex (dimmer)
    streakColors[i * 6 + 3] = color.r * 0.25;
    streakColors[i * 6 + 4] = color.g * 0.25;
    streakColors[i * 6 + 5] = color.b * 0.25;
  }

  const streakGeo = new THREE.BufferGeometry();
  streakGeo.setAttribute('position', new THREE.BufferAttribute(streakPositions, 3));
  streakGeo.setAttribute('color', new THREE.BufferAttribute(streakColors, 3));

  const streakMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending
  });

  const streakLines = new THREE.LineSegments(streakGeo, streakMat);
  hyperspaceGroup.add(streakLines);

  // --------------------------------------------------------------------------
  // 10. EXACT HAOQI CRT HALFTONE SCREEN OVERLAY (overlayPixelSize: 8, RadiusScale: 0.9)
  // --------------------------------------------------------------------------
  const pixelOverlayGeo = new THREE.PlaneGeometry(2, 2);
  pixelMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uColor: { value: new THREE.Color(state.theme === 'light' ? '#FBFAF4' : '#000000') },
      uOpacity: { value: 0.14 },
      uPixelSize: { value: 8.0 },
      uRadiusScale: { value: 0.9 },
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      varying vec2 vUv;
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uPixelSize;
      uniform float uRadiusScale;
      uniform vec2 uResolution;

      void main() {
        float a = clamp(uOpacity, 0.0, 1.0);

        vec2 normalizedPixelSize = vec2(
          uPixelSize / max(uResolution.x, 1.0),
          uPixelSize / max(uResolution.y, 1.0)
        );

        vec2 safePixelSize = max(normalizedPixelSize, vec2(1e-6));
        vec2 cellUV = fract(vUv / safePixelSize);

        // Exact Haoqi route_transition formula: opacity directly maps circle radius
        float radius = uRadiusScale * a;
        float distanceFromCenter = distance(cellUV, vec2(0.5));
        float aa = fwidth(distanceFromCenter) * 1.5;
        float circleMask = smoothstep(radius, radius - aa, distanceFromCenter);

        gl_FragColor = vec4(uColor, circleMask * 0.48);
      }
    `
  });

  const pixelQuad = new THREE.Mesh(pixelOverlayGeo, pixelMaterial);
  pixelQuad.frustumCulled = false;
  pixelQuad.renderOrder = 999;
  pixelQuad.visible = false;
  scene.add(pixelQuad);

  // --------------------------------------------------------------------------
  // 11. SMOOTH SCROLL & ANIMATION LOOP (Exact Transitions & Physics)
  // --------------------------------------------------------------------------
  function triggerSignatureDraw() {
    const sign = document.getElementById('svg-signature');
    if (!sign) return;
    const rect = sign.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.95 && rect.bottom > -200) {
      sign.classList.add('is-drawn');
      sign.classList.add('is-drawing');
    }
  }

  function updateScrollState() {
    state.scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    triggerSignatureDraw();
  }
  window.addEventListener('scroll', updateScrollState, { passive: true });
  setTimeout(triggerSignatureDraw, 400);

  let lenisInstance = null;
  if (typeof Lenis !== 'undefined') {
    try {
      lenisInstance = new Lenis({
        duration: 1.1,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1.0,
        touchMultiplier: 1.6,
        infinite: false
      });

      lenisInstance.on('scroll', (e) => {
        state.scrollY = e.scroll;
        triggerSignatureDraw();
      });
    } catch (e) {
      console.warn('Lenis error:', e);
    }
  }

  // Hyperspace transition runs exclusively inside the 3D cursor mesh shader

  let clock = new THREE.Clock();
  let lastScrollY = 0;
  let scrollVelocity = 0;

  // Exact Haoqi c7 Concentric Cyber Rings Math Engine
  const c8_enterSpan = 300;
  const c8_cycleDist = 300;
  const c8_totalDist = 945;
  const c5_lut = new Float32Array(301);
  for (let t = 0; t <= 300; t++) {
    const diff = t - 150;
    const radSq = 22500 - diff * diff;
    c5_lut[t] = radSq > 0 ? Math.sqrt(radSq) : 0;
  }

  function updateC7Rings(progress01) {
    const svg = document.getElementById('c7-svg');
    if (!svg) return;
    const rings = svg.querySelectorAll('.portal-ring');
    if (!rings.length) return;

    const r = Math.min(1, Math.max(0, progress01)) * c8_totalDist;
    let stage = 0, dist = r;
    if (r > c8_enterSpan) {
      if (r <= c8_enterSpan + c8_cycleDist) {
        stage = 1;
        dist = r - c8_enterSpan;
      } else {
        stage = 2;
        dist = r - c8_enterSpan - c8_cycleDist;
      }
    }
    const maxIdx = stage === 0 ? (dist / 50) | 0 : 0;

    for (let t = 0; t < 7; t++) {
      const ring = rings[t];
      if (!ring) continue;
      let l = 0, visible = false;
      if (stage === 0) {
        if (dist >= 50 * t) {
          l = dist - ((maxIdx < 6 ? maxIdx : 6) - t) * 50;
          visible = l > 0 && l < 300;
        }
      } else if (stage === 1) {
        l = ((dist + 50 * t) % 300 + 300) % 300;
        visible = l > 0 && l < 300;
      } else {
        l = dist + 50 * t;
        visible = l > 0 && l < 300;
      }

      if (!visible) {
        ring.style.visibility = 'hidden';
        continue;
      }

      const it = 0 | l;
      const fr = l - it;
      const u = (l <= 0 || l >= 300) ? 0 : (fr <= 0 ? c5_lut[it] : c5_lut[it] + (c5_lut[it + 1] - c5_lut[it]) * fr);

      if (u <= 0) {
        ring.style.visibility = 'hidden';
        continue;
      }

      ring.style.visibility = 'visible';
      ring.setAttribute('cx', '172');
      ring.setAttribute('cy', String(22 + l));
      ring.setAttribute('rx', String(u));
      ring.setAttribute('ry', String(0.12 * u));
    }
  }

  function animate(currentTime) {
    requestAnimationFrame(animate);

    // Sync Lenis smooth scroll on exact animation frame
    if (lenisInstance) {
      lenisInstance.raf(currentTime || performance.now());
    }

    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    // Scroll Velocity Tracking for CRT Halftone Pulsing & LightTunnel flow
    const currentScrollY = state.scrollY;
    const rawScrollDelta = currentScrollY - lastScrollY;
    const scrollDelta = Math.abs(rawScrollDelta);
    scrollVelocity += (scrollDelta - scrollVelocity) * 0.12;
    lastScrollY = currentScrollY;

    // Mouse lerp with smooth inertia
    state.mouse.x += (state.mouse.targetX - state.mouse.x) * 0.08;
    state.mouse.y += (state.mouse.targetY - state.mouse.y) * 0.08;

    triggerSignatureDraw();

    // Fade hero atmosphere smoothly on scroll
    const heroAtmosphere = document.getElementById('hero-atmosphere');
    if (heroAtmosphere) {
      const heroFade = Math.max(0, 1 - state.scrollY / (window.innerHeight * 0.75));
      heroAtmosphere.style.opacity = heroFade.toFixed(3);
    }

    // DOM Custom Cursor Ring Lerp
    ringScreen.x += (mouseScreen.x - ringScreen.x) * 0.18;
    ringScreen.y += (mouseScreen.y - ringScreen.y) * 0.18;
    if (cursorRing && cursorActive) {
      cursorRing.style.transform = `translate3d(${ringScreen.x}px, ${ringScreen.y}px, 0) translate(-50%, -50%)`;
    }

    // Camera subtle parallax
    camera.position.x = state.mouse.x * 0.8;
    camera.position.y = state.mouse.y * 0.5;
    camera.lookAt(0, 0, 0);

    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

    // Follow mouse with caustic point light
    if (rahulPointLight) {
      rahulPointLight.position.x = state.mouse.x * 9.0;
      rahulPointLight.position.y = state.mouse.y * 6.0 + 1.0;
    }

    // Pass liquid wave time & mouse velocity to GPU shader
    if (rahulMaterial && rahulMaterial.userData && rahulMaterial.userData.shader) {
      const s = rahulMaterial.userData.shader;
      s.uniforms.uTime.value = elapsedTime;
      s.uniforms.uMouse.value.set(state.mouse.x, state.mouse.y);
      const mouseSpeed = Math.hypot(state.mouse.targetX - state.mouse.x, state.mouse.targetY - state.mouse.y) || 0;
      s.uniforms.uMouseVel.value = mouseSpeed;
    }

    // 1. 3D "Rahul Achari" Inflatable Centerpiece Mesh (Hero Section 3D Backdrop)
    if (rahul3DMesh) {
      const bannerProgress = Math.min(Math.max(state.scrollY / 650, 0), 1);
      const baseScale = rahul3DMesh.userData.baseScale || (isMobile ? 0.7 : (isTablet ? 1.0 : 1.35));
      
      // Dynamic liquid bobbing & floating undulation
      const floatY = (0.14 * Math.sin(1.2 * elapsedTime) + 0.05 * Math.sin(0.6 * elapsedTime));
      const rollZ = Math.sin(elapsedTime * 1.5) * 0.03 + state.mouse.x * 0.05;
      
      // Gentle mouse interaction tilt + scroll exit rotation
      rahul3DMesh.rotation.y = THREE.MathUtils.degToRad(3) + state.mouse.x * 0.22 + (THREE.MathUtils.degToRad(70) * bannerProgress);
      rahul3DMesh.rotation.x = -state.mouse.y * 0.18 + Math.cos(elapsedTime * 1.2) * 0.02;
      rahul3DMesh.rotation.z = rollZ;
      
      // Positioned comfortably behind DOM text (z: 0.2)
      rahul3DMesh.position.y = (isMobile ? 0.35 : (isTablet ? 0.2 : 0.08)) + floatY + (state.scrollY * 0.012 * 0.72);
      rahul3DMesh.position.z = 0.2;

      const textFade = Math.max(0, 1 - bannerProgress * 1.3);
      rahul3DMesh.scale.set(baseScale * textFade, baseScale * textFade, baseScale * textFade);
      rahul3DMesh.visible = textFade > 0.01;
    }

    // 2. 3D Cursor Mesh Floating & 720-Degree Scroll Exit Transition
    if (cursor3DMesh) {
      // Exact Haoqi floating motion: 0.18 * sin(1.2 * t) + 0.06 * sin(0.6 * t)
      const floatOffset = 0.18 * Math.sin(1.2 * elapsedTime) + 0.06 * Math.sin(0.6 * elapsedTime);

      // Mouse interactive tilt: reacts when pointer moves
      cursor3DMesh.rotation.z = THREE.MathUtils.degToRad(45) + state.mouse.x * 0.2;
      cursor3DMesh.rotation.x = -state.mouse.y * 0.25;

      const bannerProgress = Math.min(Math.max(state.scrollY / 700, 0), 1);
      // 720-degree spin on scroll out (afterRotation: [0, 720, 0])
      cursor3DMesh.rotation.y = THREE.MathUtils.degToRad(720) * bannerProgress;
      cursor3DMesh.position.y = (-4.2 + floatOffset) + (state.scrollY * 0.014 * 0.72);

      const cursorFade = Math.max(0, 1 - bannerProgress * 1.4);
      cursor3DMesh.scale.set(0.11 * cursorFade, 0.11 * cursorFade, 0.11 * cursorFade);
      cursor3DMesh.visible = cursorFade > 0.01;
    }

    // 3. PINNED MULTI-STAGE HYPERSPACE TRANSITION (Transition runs inside 3D cursor mesh only)
    const track = document.getElementById('hyper-space-track');
    if (track) {
      const rect = track.getBoundingClientRect();
      const trackHeight = rect.height - window.innerHeight;
      const progress = Math.min(Math.max(-rect.top / Math.max(trackHeight, 1), 0), 1);

      if (rect.top <= window.innerHeight && rect.bottom >= 0) {
        if (hyperspaceGroup) hyperspaceGroup.visible = false;

        const stagePrimary = document.getElementById('hs-stage-primary');
        const stageSecondary = document.getElementById('hs-stage-secondary');
        const stageManifesto = document.getElementById('hs-stage-manifesto');
        const stageFuture = document.getElementById('hs-stage-future');
        const hint = document.getElementById('hyperspace-hint');
        const ringsWrap = document.getElementById('hs-portal-rings');

        const canvasContainer = document.getElementById('canvas-container');
        if (progress >= 0.02 && progress < 0.62) {
          canvasContainer?.classList.add('hs-in-front');
        } else {
          canvasContainer?.classList.remove('hs-in-front');
        }

        // --- CURSOR COMES FROM MIDDLE & TRANSITION RUNS INSIDE CURSOR ONLY ---
        if (transitionCursorGroup && transitionCursorMaterial) {
          const restScale = 0.20;
          const cursorRadius = transitionCursorGroup.userData.radius || 6.0;
          const viewportH = Math.tan((45 * Math.PI / 180) / 2) * (22 - 2.5) * 2;
          const viewportW = viewportH * (window.innerWidth / window.innerHeight);
          const peakScale = Math.max(3.8, (Math.hypot(viewportW, viewportH) * 2.2) / cursorRadius);

          // Continuous live streak animation driven by elapsedTime + scroll velocity
          transitionCursorMaterial.uniforms.iTime.value = elapsedTime * 2.8 + progress * 7.5;

          if (progress >= 0.02 && progress < 0.38) {
            // Stage 0A: Innovate With Purpose
            // The cursor translates smoothly from top towards center with mouse parallax
            transitionCursorGroup.visible = true;
            const enterT = Math.min(Math.max((progress - 0.02) / 0.12, 0.0), 1.0);
            const entryY = (1.0 - enterT) * 3.6 + (progress - 0.20) * 0.8;
            transitionCursorGroup.position.set(state.mouse.x * 0.4, entryY - state.mouse.y * 0.3, 2.5);
            transitionCursorGroup.scale.setScalar(restScale);

            // Hyperspace transition speed streaks ignite and run STRICTLY INSIDE cursor silhouette
            const revealT = Math.min(Math.max((progress - 0.03) / 0.16, 0.0), 1.0);
            transitionCursorMaterial.uniforms.uStripeReveal.value = revealT;
            transitionCursorMaterial.uniforms.uOpacity.value = 1.0;

            if (transitionSpin) transitionSpin.rotation.y = 0;
            if (transitionTiltA) {
              transitionTiltA.rotation.z = THREE.MathUtils.degToRad(45) + state.mouse.x * 0.15;
              transitionTiltA.rotation.x = -state.mouse.y * 0.15;
            }
          } else if (progress >= 0.38 && progress < 0.58) {
            // Stage 0B: Innovate With a Human Touch
            // The cursor translates forward along Z towards camera and rotates 180°
            transitionCursorGroup.visible = true;

            const expandT = Math.min(Math.max((progress - 0.38) / 0.18, 0.0), 1.0);
            const smoothT = expandT * expandT * (3.0 - 2.0 * expandT); // smoothstep
            const zoomZ = 2.5 + Math.pow(smoothT, 2.0) * 16.5;
            const transY = (progress - 0.48) * 1.5;

            transitionCursorGroup.position.set(state.mouse.x * (1 - smoothT) * 0.4, transY, zoomZ);

            transitionCursorMaterial.uniforms.uStripeReveal.value = 1.0;
            transitionCursorMaterial.uniforms.uOpacity.value = 1.0;

            // Spins around tilted axis as on Haoqi
            if (transitionSpin) {
              transitionSpin.rotation.y = THREE.MathUtils.degToRad(180) * smoothT;
            }
            if (transitionTiltA) {
              transitionTiltA.rotation.z = THREE.MathUtils.degToRad(45) + state.mouse.x * (1 - smoothT) * 0.15;
              transitionTiltA.rotation.x = -state.mouse.y * (1 - smoothT) * 0.15;
            }

            // Smooth scale up to peakScale to fill entire viewport
            const curScale = restScale + Math.pow(smoothT, 1.8) * (peakScale - restScale);
            transitionCursorGroup.scale.setScalar(curScale);
          } else if (progress >= 0.58 && progress < 0.62) {
            // Once fullscreen is filled, smoothly hand off to central cyber rings
            const fadeOut = Math.max(0, 1.0 - (progress - 0.58) / 0.04);
            transitionCursorGroup.visible = fadeOut > 0.001;
            transitionCursorMaterial.uniforms.uOpacity.value = fadeOut;
          } else {
            // Outside active transition zone
            transitionCursorGroup.visible = false;
          }
        }

        // --- MULTI-STAGE SEQUENCING ---
        // Stage 0A: Innovate with Purpose (progress ~ 0.12 - 0.38)
        // Stage 0B: Innovate with a Human Touch (progress ~ 0.38 - 0.60)
        // Stage 1: Central Cyber Rings + 4 Manifesto Statements (progress ~ 0.60 - 0.82)
        // Stage End: FUTURE-FIRST ALWAYS (progress ~ 0.82 - 0.96)
        function setStageActive(stageEl, active) {
          if (!stageEl) return;
          if (active) {
            if (!stageEl.classList.contains('is-active')) {
              stageEl.classList.remove('is-leaving');
              stageEl.classList.add('is-active');
            }
          } else {
            if (stageEl.classList.contains('is-active')) {
              stageEl.classList.remove('is-active');
              stageEl.classList.add('is-leaving');
            }
          }
        }

        const inStage0A = progress >= 0.10 && progress < 0.38;
        const inStage0B = progress >= 0.38 && progress < 0.60;
        const inStage1 = progress >= 0.60 && progress < 0.82;
        const inStageEnd = progress >= 0.82 && progress < 0.96;

        setStageActive(stagePrimary, inStage0A);
        setStageActive(stageSecondary, inStage0B);
        setStageActive(stageManifesto, inStage1);
        setStageActive(stageFuture, inStageEnd);

        // Text scroll translation parallax
        if (stagePrimary) {
          if (inStage0A) {
            const textTranslateY = (progress - 0.24) * 160;
            stagePrimary.style.transform = `translateY(${textTranslateY.toFixed(1)}px)`;
          } else {
            stagePrimary.style.transform = '';
          }
        }
        if (stageSecondary) {
          if (inStage0B) {
            const textTranslateY = (progress - 0.48) * 160;
            stageSecondary.style.transform = `translateY(${textTranslateY.toFixed(1)}px)`;
          } else {
            stageSecondary.style.transform = '';
          }
        }

        // Stage 1 Details: Cyber rings rotation & 4 manifesto statements reveal
        if (inStage1) {
          const stage1T = (progress - 0.60) / 0.22;
          updateC7Rings(stage1T);

          // 4 Manifesto items staggered reveal (prompt and crisp, matching Haoqi)
          const item1 = document.getElementById('hs-item-1');
          const item2 = document.getElementById('hs-item-2');
          const item3 = document.getElementById('hs-item-3');
          const item4 = document.getElementById('hs-item-4');

          if (item1) item1.classList.toggle('is-visible', stage1T >= 0.02);
          if (item2) item2.classList.toggle('is-visible', stage1T >= 0.05);
          if (item3) item3.classList.toggle('is-visible', stage1T >= 0.08);
          if (item4) item4.classList.toggle('is-visible', stage1T >= 0.11);
        } else {
          const items = document.querySelectorAll('.hs-manifesto-item');
          items.forEach(it => it.classList.remove('is-visible'));
        }

        // Scroll Travel Hint
        if (hint) {
          hint.style.opacity = progress > 0.05 && progress < 0.85 ? '1' : '0';
        }

        // Smooth footer transition unlock
        const exitFade = rect.bottom < window.innerHeight ? Math.max(0, rect.bottom / (window.innerHeight * 0.45)) : 1.0;
        if (stageFuture && progress > 0.94) {
          stageFuture.style.opacity = String(exitFade);
        }
      } else {
        if (hyperspaceGroup) hyperspaceGroup.visible = false;
        if (transitionCursorGroup) transitionCursorGroup.visible = false;
      }
    }

    // 3B. Cylindrical Curve Scrolling Effect on Project Cards (Smooth Hardware-Accelerated)
    if (scrollVelocity > 0.005 || scrollDelta > 0.005) {
      const projectCards = document.querySelectorAll('.project-card');
      const vh = window.innerHeight;
      projectCards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        if (rect.bottom > -100 && rect.top < vh + 100) {
          const cardCenterY = rect.top + rect.height * 0.5;
          const centered = (cardCenterY / vh) * 2.0 - 1.0;
          const clampedY = Math.max(-1.0, Math.min(1.0, centered));

          // Profile calculation
          const profile = 1.0 - Math.sqrt(Math.max(0.0, 1.0 - clampedY * clampedY));

          const rotateX = -clampedY * 10.0;
          const translateZ = -profile * 45.0;
          const scale = 1.0 - profile * 0.03;

          card.style.transform = `perspective(1200px) rotateX(${rotateX.toFixed(2)}deg) translateZ(${translateZ.toFixed(1)}px) scale(${scale.toFixed(3)})`;
        }
      });
    }

    // 4. 3D Craft 'N' Taste Inflatable Mesh (Footer Section — Positioned in Background Behind Typography)
    const footerSection = document.getElementById('contact');
    const siteHeaderEl = document.getElementById('site-header');
    if (footerSection) {
      const rect = footerSection.getBoundingClientRect();
      const inFooter = rect.top < window.innerHeight * 0.75;
      if (siteHeaderEl) {
        siteHeaderEl.classList.toggle('in-footer', inFooter);
      }

      // Smoothly fade footer atmosphere behind 3D mesh
      const footerAtmosphere = document.getElementById('footer-atmosphere');
      if (footerAtmosphere) {
        const footFade = Math.max(0, Math.min(1, (window.innerHeight - rect.top) / (window.innerHeight * 0.55)));
        footerAtmosphere.style.opacity = footFade.toFixed(3);
      }

      if (cnt3DMesh) {
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          cnt3DMesh.visible = true;
          // Smooth floating undulation + interactive mouse tilt
          const floatOffset = Math.sin(elapsedTime * 1.4) * 0.14 + Math.cos(elapsedTime * 0.9) * 0.04;
          cnt3DMesh.rotation.y = Math.PI + Math.sin(elapsedTime * 0.45) * 0.14 + state.mouse.x * 0.25;
          cnt3DMesh.rotation.x = Math.sin(elapsedTime * 0.55) * 0.08 - state.mouse.y * 0.18;
          cnt3DMesh.rotation.z = Math.sin(elapsedTime * 0.35) * 0.03;

          // Align comfortably behind footer text in world space (z: 0.4)
          const targetY = (window.innerHeight / 2 - (rect.top + rect.height / 2)) * 0.016 + (isMobile ? 0.4 : 0.15);
          cnt3DMesh.position.set(0, targetY + floatOffset, 0.4);
        } else {
          cnt3DMesh.visible = false;
        }
      }
    }

    // 5. CRT Halftone Screen Dynamic Velocity Pulse
    if (pixelMaterial) {
      const pulseOpacity = 0.20 + Math.min(scrollVelocity * 0.008, 0.35) + Math.sin(elapsedTime * 1.2) * 0.03;
      pixelMaterial.uniforms.uOpacity.value = pulseOpacity;
    }

    renderer.render(scene, camera);
  }

  animate();

  // --------------------------------------------------------------------------
  // HYPERSPACE MULTI-STAGE STAGGERED TEXT INITIALIZER
  // --------------------------------------------------------------------------
  function initHyperspaceMultiStage() {
    document.querySelectorAll('.hs-line').forEach((line) => {
      const rawText = line.getAttribute('data-text') || line.textContent.trim();
      line.innerHTML = '';
      let idx = 0;
      Array.from(rawText).forEach((char) => {
        const span = document.createElement('span');
        span.className = 'hsst-char';
        span.textContent = char === ' ' ? '\u00A0' : char;
        span.style.setProperty('--char-idx', String(idx));
        line.appendChild(span);
        idx++;
      });
    });
  }

  initHyperspaceMultiStage();

  // ===== EXACT HAOQI ARCHITECTURAL BACKGROUND GRID (3x3 BOX SYSTEM) =====
  function initArchitecturalGrid() {
    const svg = document.getElementById('architectural-grid-svg');
    if (!svg) return;

    function update() {
      const t = window.innerWidth;
      const r = window.innerHeight;
      const n = t < 1024 ? 16 : 56; // 16px on mobile, 56px on desktop (matching px-4 / lg:px-14)
      const e = Math.max(0, t - 2 * n); // inner width
      const i = Math.max(0, r / 3 - 12);
      const s = i + 24;
      const a = s + i;
      const o = t < 1280 ? 2 : 3; // 2 cols if < 1280, 3 cols if >= 1280
      
      // Column X coordinates (rounded + 0.5 for razor sharp 1px grid lines)
      const h = Array.from({ length: o + 1 }, (_, idx) => n + (idx / o) * e).map(v => Math.round(v) + 0.5);
      
      // 3 segments of vertical lines leaving 24px clearance around horizontal intersections
      const l = [
        { startY: 0, endY: i },
        { startY: s, endY: a },
        { startY: a + 24, endY: r }
      ];
      
      // Y coordinates of the 2 horizontal lines
      const u = [i + 12, a + 12];
      
      // Vertical line path
      const verticalPath = l.map(({ startY, endY }) => h.map(x => `M${x} ${startY}V${endY}`).join("")).join("");
      
      // Horizontal line path with 24px clearance around vertical intersections
      const horizontalPath = u.map(y => {
        if (h.length < 2) return "";
        const firstX = h[0];
        const lastX = h[h.length - 1];
        const segments = h.slice(0, -1).map((x, idx) => {
          const nextX = h[idx + 1];
          return `M${x + 12} ${y}H${nextX - 12}`;
        });
        return [`M0 ${y}H${firstX - 12}`, ...segments, `M${lastX + 12} ${y}H${t}`].join("");
      }).join("");
      
      // Crosshairs (+) exactly 12px wide and 12px tall (+-6px from intersection)
      const crossPath = h.flatMap(x => u.flatMap(y => [
        `M${x} ${y - 6}V${y + 6}`,
        `M${x - 6} ${y}H${x + 6}`
      ])).join("");

      svg.setAttribute("viewBox", `0 0 ${t} ${r}`);
      document.getElementById("grid-path-vertical")?.setAttribute("d", verticalPath);
      document.getElementById("grid-path-horizontal")?.setAttribute("d", horizontalPath);
      document.getElementById("grid-path-crosses")?.setAttribute("d", crossPath);
    }

    window.addEventListener('resize', update, { passive: true });
    update();
  }

  // ===== DYNAMIC WORK GRID ROW GAP (Exact Haoqi clientWidth / 12) =====
  function initWorkGridRowGap() {
    const grid = document.getElementById('work-grid');
    if (!grid) return;
    function updateGap() {
      const colWidth = grid.clientWidth / 12;
      grid.style.rowGap = `${colWidth}px`;
    }
    window.addEventListener('resize', updateGap, { passive: true });
    updateGap();
  }

  initArchitecturalGrid();
  initWorkGridRowGap();

  // Resize Handler
  window.addEventListener('resize', () => {
    state.viewport.width = window.innerWidth;
    state.viewport.height = window.innerHeight;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    if (pixelMaterial) {
      pixelMaterial.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    }

    if (transitionCursorMaterial) {
      transitionCursorMaterial.uniforms.iResolution.value.set(
        window.innerWidth * Math.min(window.devicePixelRatio, 2),
        window.innerHeight * Math.min(window.devicePixelRatio, 2),
        1.0
      );
    }

    if (rahul3DMesh && rahul3DMesh.children[0] && rahul3DMesh.children[0].geometry) {
      const geo = rahul3DMesh.children[0].geometry;
      if (geo.boundingBox) {
        const w = window.innerWidth;
        const isMob = w < 768;
        const isTab = w >= 768 && w < 1024;
        const boxX = geo.boundingBox.max.x - geo.boundingBox.min.x;
        const targetW = isMob ? 12.5 : (isTab ? 17.5 : 24.0);
        const newScale = targetW / Math.max(boxX, 1);
        rahul3DMesh.userData.baseScale = newScale;
        rahul3DMesh.scale.set(newScale, newScale, newScale);
        rahul3DMesh.position.y = isMob ? 0.35 : (isTab ? 0.2 : 0.08);
      }
    }
  });

})();
