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

  function triggerSignatureDraw() {
    if (!svgSignEl) {
      svgSignEl = document.getElementById('svg-signature');
    }
    if (!svgSignEl) return;
    const rect = svgSignEl.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    if (rect.top < vh * 0.82 && rect.bottom > 40) {
      if (!svgSignEl.classList.contains('is-drawn')) {
        svgSignEl.classList.add('is-drawn');
      }
    } else if (rect.top > vh * 1.05) {
      if (svgSignEl.classList.contains('is-drawn')) {
        svgSignEl.classList.add('no-transition');
        svgSignEl.classList.remove('is-drawn');
        void svgSignEl.offsetWidth;
        svgSignEl.classList.remove('no-transition');
      }
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
  // 4B. INTERACTIVE DOM CUSTOM CURSOR & TRAILER (Precisely Centered, No Glitches)
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
        const len = Math.ceil(path.getTotalLength()) + 4;
        path.style.setProperty('--path-len', `${len}`);
        path.style.strokeDasharray = `${len}`;
        path.style.strokeDashoffset = `${len}`;
      } catch (e) {
        path.style.setProperty('--path-len', '500');
        path.style.strokeDasharray = '500';
        path.style.strokeDashoffset = '500';
      }
    });
  }

  if (svgSignEl) {
    // Click signature to replay calligraphy ink animation
    svgSignEl.style.cursor = 'pointer';
    svgSignEl.style.pointerEvents = 'auto';
    svgSignEl.addEventListener('click', () => {
      svgSignEl.classList.add('no-transition');
      svgSignEl.classList.remove('is-drawn');
      void svgSignEl.offsetWidth;
      svgSignEl.classList.remove('no-transition');
      requestAnimationFrame(() => {
        svgSignEl.classList.add('is-drawn');
      });
    });

    if ('IntersectionObserver' in window) {
      const signObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            svgSignEl.classList.add('is-drawn');
          } else if (entry.boundingClientRect.top > 0) {
            svgSignEl.classList.add('no-transition');
            svgSignEl.classList.remove('is-drawn');
            void svgSignEl.offsetWidth;
            svgSignEl.classList.remove('no-transition');
          }
        });
      }, { threshold: 0.2, rootMargin: '0px 0px -40px 0px' });
      signObserver.observe(svgSignEl);
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

  // Studio Lighting (Vibrant Deep Royal Cobalt & Crisp Highlights Matching Haoqi Screenshot 2)
  const ambientLight = new THREE.AmbientLight(0x1e40af, 1.6);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 4.6);
  keyLight.position.set(6, 14, 12);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x60a5fa, 4.8);
  rimLight.position.set(-8, -6, -4);
  scene.add(rimLight);

  const fillLight = new THREE.DirectionalLight(0x2563eb, 2.5);
  fillLight.position.set(0, -10, 8);
  scene.add(fillLight);

  // Dynamic interactive caustic light following mouse (Glistening electric cyan-blue sheen)
  const rahulPointLight = new THREE.PointLight(0x93c5fd, 5.0, 35);
  rahulPointLight.position.set(0, 2, 6);
  scene.add(rahulPointLight);

  // Exact Haoqi Inflatable Glossy Royal Cobalt Blue Balloon Material (Screenshot 2)
  function createLiquidCobaltMaterial() {
    const isDark = state.theme === 'dark';
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(isDark ? '#255df4' : '#1d4ed8'),
      emissive: new THREE.Color(isDark ? '#0b2066' : '#051133'),
      roughness: 0.08,
      metalness: 0.10,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      transmission: 0.0,
      ior: 1.52,
      reflectivity: 0.98,
      side: THREE.DoubleSide
    });
  }

  // Exact Haoqi Chromatic Blue Ceramic Material for Cursor & Footer (Screenshot 2)
  function createCobaltGlossMaterial(baseColorHex = '#2b5cff') {
    const isDark = state.theme === 'dark';
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBaseColor: { value: new THREE.Color(isDark ? '#2b5cff' : '#1d4ed8') },
        uDeepColor: { value: new THREE.Color(isDark ? '#0f2b8a' : '#081640') },
        uFresnelColor: { value: new THREE.Color(isDark ? '#93c5fd' : '#60a5fa') },
        uLightPos: { value: new THREE.Vector3(6, 14, 12) },
        uFresnelPower: { value: 1.8 }
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
        uCursorRadius: { value: 6.0 },
        uAccentColor: { value: new THREE.Color('#0d42d4') }, // Rich royal cobalt blue
        uStripeColorA: { value: new THREE.Color('#00d2ff') }, // Electric cyan-blue
        uStripeColorB: { value: new THREE.Color('#a855f7') }, // Cosmic purple
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
        uniform float uCursorRadius;

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

        // Exact Haoqi Hyperspace Speed Tunnel Shader (Screen-space radiating streaks)
        vec3 sampleHyperspace(vec2 fragCoord) {
          vec2 R = iResolution.xy;
          float baseScale = max(1.0, min(R.x, R.y));
          vec2 u = (fragCoord * 2.0 - R) / baseScale;

          float dur = max(uScrollDuration, 1e-4);
          float time = clamp(iTime, 0.0, dur * 100.0);
          float t = clamp(time / dur, 0.0, 1.0);

          const float cellDensity = 100.0;
          vec2 polar = vec2(atan(u.y, u.x) / 3.0, length(u));
          float angleCoord = (6.0 - polar.x) * cellDensity;
          float angleId = floor(angleCoord) + 0.5;
          float angleCell = abs(fract(angleCoord) - 0.5);
          float radialCoord = (6.0 - polar.y) * cellDensity;
          vec2 q = vec2(angleId, radialCoord);

          float travel = smoothstep(0.0, 1.0, t);
          float keepProbability = mix(0.18, 0.65, travel);
          float scrollSpeed = mix(0.7, 3.6, travel);
          float trailLength = mix(2.7, 0.975, travel);
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

          const float starThinness = 0.13;
          float thinEdge = max(fwidth(angleCell) * 1.5, 0.002);
          float thinMask = 1.0 - smoothstep(starThinness - thinEdge, starThinness + thinEdge, angleCell);
          star *= thinMask * keepMask;

          // Void tunnel center (leaving clear space for bold typography) with high-intensity speed streaks flying outwards
          float radialBoost = pow(smoothstep(0.06, 0.95, polar.y), 1.25);
          float intensity = mix(2.8, 7.8, travel * 1.2);

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

          // Brilliant pure white core on the fastest streaks
          float whiteCore = smoothstep(0.38, 0.85, channelMix) * 0.95;
          sparkColor = mix(sparkColor, vec3(1.0, 1.0, 1.0), whiteCore);

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

          vec3 normal = normalize(vWorldNormal);
          if (!gl_FrontFacing) {
            normal = -normal;
          }
          vec3 eyeDir = normalize(vEyeVector);

          float reveal = clamp(uStripeReveal, 0.0, 1.0);
          float stripeLuma = dot(stripes, vec3(0.299, 0.587, 0.114));

          // Rich, glossy 3D cobalt blue cursor arrow with bevels and specular
          vec3 lightDir = normalize(vec3(-0.5, 0.9, 1.2));
          float NdotL = max(0.0, dot(normal, lightDir));
          vec3 halfVec = normalize(-eyeDir + lightDir);
          float spec = pow(max(0.0, dot(normal, halfVec)), 36.0);

          vec3 deepBlue = vec3(0.02, 0.08, 0.35);
          vec3 bodyColor = mix(deepBlue, uAccentColor, clamp(normal.y * 0.5 + 0.5, 0.0, 1.0));
          vec3 baseShaded = bodyColor * (0.8 + 0.45 * NdotL) + vec3(0.4, 0.75, 1.0) * spec * 1.5;

          float darken = smoothstep(0.0, 0.85, reveal);
          vec3 darkBase = mix(baseShaded, vec3(0.0), darken);
          float gapMask = (1.0 - smoothstep(0.035, 0.12, stripeLuma)) * reveal;
          float crackGuard = 1.0 - smoothstep(0.68, 0.94, reveal);
          vec3 rgb = darkBase + stripes * reveal + uAccentColor * gapMask * 0.07 * crackGuard;

          float glossMask = mix(1.0, smoothstep(0.1, 0.48, stripeLuma), reveal);

          float specularLight = specular(uLight, normal, eyeDir, uShininess, uDiffuseness);
          rgb += specularLight * uSpecularStrength * glossMask;

          // Outer Fresnel rim light to cleanly outline the cursor arrow contour
          float f = fresnel(eyeDir, normal, uFresnelPower);
          float sideDot = dot(normal, normalize(uFresnelSideDir));
          float sideMask = smoothstep(-0.5, 0.5, sideDot);
          rgb += f * sideMask * vec3(uFresnelStrength) * glossMask;

          float alpha = clamp(uOpacity, 0.0, 1.0);
          if (alpha <= 0.0001) discard;

          gl_FragColor = vec4(rgb, alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      toneMapped: false,
      side: THREE.FrontSide
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
    // On mobile, ensure 3D text stays comfortably inside viewport width without being clipped offscreen
    const dist = Math.max(camera.position.z - 0.2, 1.0);
    const vH = 2.0 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2.0) * dist;
    const vW = vH * camera.aspect;
    const targetWidth = isMobile ? Math.min(vW * 0.82, 6.8) : (isTablet ? 15.0 : 21.0);
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

    // 1. Hero Banner Cursor (Positioned beside 'Achari' with clear breathing space)
    cursor3DMesh = gltf.scene;
    cursor3DMesh.scale.set(0.14, 0.14, 0.14);
    cursor3DMesh.rotation.set(
      THREE.MathUtils.degToRad(-10),
      THREE.MathUtils.degToRad(14),
      THREE.MathUtils.degToRad(-18)
    );
    cursor3DMesh.position.set(isMobile ? 5.0 : 13.2, isMobile ? -0.5 : -0.5, 1.2);

    cursor3DMesh.traverse((child) => {
      if (child.isMesh) {
        child.material = createCobaltGlossMaterial('#2b5cff');
      }
    });
    scene.add(cursor3DMesh);

    // 2. Quote Transition Cursor (Hyper-Space Section)
    // Streaks run strictly inside the cursor mesh, centered at middle of screen
    transitionCursorMesh = gltf.scene.clone(true);
    transitionCursorMesh.scale.set(1.0, 1.0, 1.0);
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
    const cursorRadius = Math.max(cursorSize.x, cursorSize.y, cursorSize.z) * 0.5 || 5.017;
    transitionCursorMaterial.uniforms.uCursorRadius.value = cursorRadius;

    const centerGroup = new THREE.Group();
    centerGroup.add(transitionCursorMesh);

    transitionCursorGroup = new THREE.Group();
    transitionCursorGroup.userData.radius = cursorRadius;
    transitionTiltA = new THREE.Group();
    transitionSpin = new THREE.Group();
    transitionTiltB = new THREE.Group();

    transitionTiltA.rotation.z = 0;
    transitionTiltB.rotation.z = 0;

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
  function updateScrollState() {
    state.scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    triggerSignatureDraw();
  }
  window.addEventListener('scroll', updateScrollState, { passive: true });

  let lenisInstance = null;
  if (typeof Lenis !== 'undefined') {
    try {
      lenisInstance = new Lenis({
        duration: 1.5,
        easing: (t) => 1 - Math.pow(1 - t, 4),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 0.75, // Deliberate, smooth, somewhat slow scroll
        touchMultiplier: 1.0,
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

  // Footer Back to Top Pixel Pointer Handler (Pointing Up to EXTRAORDINARY -> Returns to Hero)
  const footerBackToTop = document.getElementById('footer-back-to-top');
  if (footerBackToTop) {
    footerBackToTop.addEventListener('click', (e) => {
      e.preventDefault();
      if (lenisInstance) {
        lenisInstance.scrollTo(0, { duration: 1.6 });
      } else {
        const heroEl = document.getElementById('hero') || document.body;
        heroEl.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // Initialize Full-Screen WebGL2 LightTunnel Shader
  const lightTunnelMount = document.getElementById('light-tunnel-mount');
  if (lightTunnelMount) {
    try {
      lightTunnel = createLightTunnel(lightTunnelMount, {
        opacity: 0.0,
        stripeReveal: 1.0
      });
    } catch (e) {
      console.warn('LightTunnel initialization error:', e);
    }
  }

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

    // Fade hero atmosphere smoothly on scroll
    const heroAtmosphere = document.getElementById('hero-atmosphere');
    if (heroAtmosphere) {
      const heroFade = Math.max(0, 1 - state.scrollY / (window.innerHeight * 0.75));
      heroAtmosphere.style.opacity = heroFade.toFixed(3);
    }

    // DOM Custom Cursor Ring Lerp (Centered precisely with smooth inertia)
    ringScreen.x += (mouseScreen.x - ringScreen.x) * 0.25;
    ringScreen.y += (mouseScreen.y - ringScreen.y) * 0.25;
    if (cursorRing && cursorActive) {
      cursorRing.style.transform = `translate3d(${ringScreen.x}px, ${ringScreen.y}px, 0) translate(-50%, -50%)`;
    }

    // Camera subtle vertical parallax only (no horizontal sway on hero centerpiece)
    camera.position.x = 0;
    camera.position.y = state.mouse.y * 0.4;
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
    // Strictly vertical movement (top and bottom only, no left/right movement or horizontal roll)
    if (rahul3DMesh) {
      const bannerProgress = Math.min(Math.max(state.scrollY / 650, 0), 1);
      const baseScale = rahul3DMesh.userData.baseScale || (isMobile ? 0.7 : (isTablet ? 1.0 : 1.35));
      
      // Dynamic vertical bobbing (strictly top and bottom)
      const floatY = (0.24 * Math.sin(1.3 * elapsedTime) + 0.08 * Math.sin(0.7 * elapsedTime));
      
      // Strictly vertical motion: NO horizontal rotation, NO left/right shift
      rahul3DMesh.position.x = 0; // Locked horizontally at center
      rahul3DMesh.rotation.y = THREE.MathUtils.degToRad(3); // Fixed subtle angle, no mouse.x or bannerProgress Y-spin
      rahul3DMesh.rotation.z = 0; // No horizontal roll
      
      // Vertical pitch reaction to mouse Y (top and bottom)
      rahul3DMesh.rotation.x = -state.mouse.y * 0.20 + Math.cos(elapsedTime * 1.2) * 0.03;
      
      // Smooth vertical scroll translation (glides up as user scrolls down)
      const baseY = isMobile ? 0.35 : (isTablet ? 0.2 : 0.08);
      rahul3DMesh.position.y = baseY + floatY + (state.scrollY * 0.016);
      rahul3DMesh.position.z = 0.2;

      const textFade = Math.max(0, 1 - bannerProgress * 1.35);
      rahul3DMesh.scale.set(baseScale * textFade, baseScale * textFade, baseScale * textFade);
      rahul3DMesh.visible = textFade > 0.01;
    }

    // 2. 3D Cursor Mesh Floating & 720-Degree Scroll Exit Transition (Exact Haoqi Screenshot 2)
    if (cursor3DMesh) {
      // Exact Haoqi floating motion: 0.18 * sin(1.2 * t) + 0.06 * sin(0.6 * t)
      const floatOffset = 0.18 * Math.sin(1.2 * elapsedTime) + 0.06 * Math.sin(0.6 * elapsedTime);

      // Mouse interactive tilt: reacts when pointer moves (pointed crossly towards Rahul Achari name)
      cursor3DMesh.rotation.z = THREE.MathUtils.degToRad(-18) + state.mouse.x * 0.12;
      cursor3DMesh.rotation.x = THREE.MathUtils.degToRad(-10) - state.mouse.y * 0.15;
      cursor3DMesh.rotation.y = THREE.MathUtils.degToRad(14);

      const bannerProgress = Math.min(Math.max(state.scrollY / 700, 0), 1);
      // 720-degree spin on scroll out (afterRotation: [0, 720, 0])
      cursor3DMesh.rotation.y += THREE.MathUtils.degToRad(720) * bannerProgress;
      cursor3DMesh.position.x = isMobile ? 5.0 : 13.2;
      cursor3DMesh.position.y = (-0.5 + floatOffset) + (state.scrollY * 0.014 * 0.72);

      const cursorFade = Math.max(0, 1 - bannerProgress * 1.4);
      cursor3DMesh.scale.set(0.14 * cursorFade, 0.14 * cursorFade, 0.14 * cursorFade);
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

        // --- 3D CURSOR HYPERSPACE TRANSITION (EXACT HAOQI ZOOM & FULLSCREEN EXPANSION) ---
        if (transitionCursorGroup && transitionCursorMaterial) {
          const isMobile = window.innerWidth < 768;
          const restScale = isMobile ? 0.28 : 0.34;

          // Frustum dimensions at z = 1.5 (camera position is z = 22)
          const distToCam = Math.max(camera.position.z - 1.5, 1.0);
          const vFOV = THREE.MathUtils.degToRad(camera.fov);
          const vHeight = 2.0 * Math.tan(vFOV / 2.0) * distToCam;
          const vWidth = vHeight * camera.aspect;
          const cursorRadius = transitionCursorGroup.userData.radius || 5.017;
          const peakScale = (Math.hypot(vWidth, vHeight) * 1.64) / cursorRadius;

          const screenH = window.innerHeight;

          // Unified scroll phase:
          // When rect.top > screenH: section is off-screen below.
          // When rect.top is between screenH and 0: entering and pinning (scrollT: 0.0 -> 0.45).
          // When rect.top <= 0 (pinned): scrolling through hyperspace (scrollT: 0.45 -> 1.0).
          let scrollT = 0.0;
          if (rect.top > screenH) {
            scrollT = -1.0;
          } else if (rect.top > 0) {
            const entryProgress = THREE.MathUtils.clamp(1.0 - (rect.top / screenH), 0.0, 1.0);
            scrollT = entryProgress * 0.45;
          } else {
            const pinScroll = THREE.MathUtils.clamp(progress / 0.20, 0.0, 1.0);
            scrollT = 0.45 + pinScroll * 0.55;
          }

          if (scrollT >= 0.0 && progress < 0.24) {
            transitionCursorGroup.visible = true;

            // 1. POSITION: Ascends smoothly from below the bottom viewport edge (-vHeight * 0.72) up to center (0.0)
            const glideY = scrollT < 0.45
              ? THREE.MathUtils.lerp(-vHeight * 0.72, 0.0, THREE.MathUtils.smoothstep(scrollT, 0.0, 0.45))
              : 0.0;
            const expandT = scrollT < 0.45 ? 0.0 : THREE.MathUtils.smoothstep(scrollT, 0.45, 1.0);

            const posX = (1.0 - expandT) * state.mouse.x * 0.25;
            const posY = glideY + (1.0 - expandT) * -state.mouse.y * 0.20;
            transitionCursorGroup.position.set(posX, posY, 1.5);

            // 2. SCALE: Starts small (0.04) from the bottom, reaches resting size at center, then expands to engulf screen
            let currentScale;
            if (scrollT < 0.45) {
              const t = scrollT / 0.45;
              currentScale = THREE.MathUtils.lerp(0.04, restScale, t * (2.0 - t));
            } else {
              currentScale = THREE.MathUtils.lerp(restScale, peakScale, expandT);
            }
            transitionCursorGroup.scale.setScalar(currentScale);

            // 3. ORIENTATION: Proper UP-LEFT cursor pointer direction (-45 deg)
            if (transitionTiltA) {
              transitionTiltA.rotation.z = THREE.MathUtils.degToRad(-45) + (1.0 - expandT) * state.mouse.x * 0.12;
              transitionTiltA.rotation.x = -(1.0 - expandT) * state.mouse.y * 0.12;
              transitionTiltA.rotation.y = 0;
            }
            if (transitionSpin) {
              transitionSpin.rotation.y = THREE.MathUtils.degToRad(14) * Math.sin(scrollT * Math.PI);
            }

            // 4. TRANSITION EFFECT INSIDE CURSOR:
            // Streaks awaken and radiate inside cursor body as it ascends and expands
            const reveal = THREE.MathUtils.smoothstep(scrollT, 0.20, 0.75);
            transitionCursorMaterial.uniforms.uStripeReveal.value = reveal;

            const scrollDrivenTime = Math.max(0, screenH - rect.top) * 0.0018;
            transitionCursorMaterial.uniforms.iTime.value = scrollDrivenTime;

            transitionCursorMaterial.uniforms.iResolution.value.set(
              window.innerWidth * Math.min(window.devicePixelRatio, 2),
              window.innerHeight * Math.min(window.devicePixelRatio, 2),
              1.0
            );

            // 5. DISSOLVE INTO FULL-SCREEN LIGHT TUNNEL:
            const fadeOut = scrollT >= 0.82 ? THREE.MathUtils.clamp(1.0 - (scrollT - 0.82) / 0.15, 0.0, 1.0) : 1.0;
            transitionCursorMaterial.uniforms.uOpacity.value = fadeOut;

            if (fadeOut <= 0.001) {
              transitionCursorGroup.visible = false;
            }
          } else if (progress >= 0.78 && progress < 0.96) {
            // Stage End: FUTURE-FIRST ALWAYS with 3D Cyan Cursor
            transitionCursorGroup.visible = true;

            const futureT = THREE.MathUtils.clamp((progress - 0.78) / 0.04, 0.0, 1.0);
            const futureExit = progress >= 0.94 ? THREE.MathUtils.clamp(1.0 - (progress - 0.94) / 0.02, 0.0, 1.0) : 1.0;
            const opacity = Math.min(futureT, futureExit);
            transitionCursorMaterial.uniforms.uOpacity.value = opacity;

            // Solid glossy cyan-blue arrow, NO streaks
            transitionCursorMaterial.uniforms.uStripeReveal.value = 0.0;

            // Clean tilt: 45 degrees up-left matching Haoqi standard
            if (transitionTiltA) {
              transitionTiltA.rotation.z = THREE.MathUtils.degToRad(-45) + state.mouse.x * 0.1;
              transitionTiltA.rotation.x = -state.mouse.y * 0.1;
            }
            if (transitionSpin) {
              transitionSpin.rotation.y = 0;
            }

            const futureScale = isMobile ? 0.22 : 0.28;
            transitionCursorGroup.scale.setScalar(futureScale);
            transitionCursorGroup.position.set(state.mouse.x * 0.2, 0.05 + -state.mouse.y * 0.15, 1.5);
          } else {
            transitionCursorGroup.visible = false;
          }
        }

        // --- FULL-SCREEN LIGHT TUNNEL SHADER ENGINE (Screenshot 2) ---
        if (lightTunnel) {
          if (progress >= 0.08 && progress < 0.74) {
            if (lightTunnelMount) lightTunnelMount.classList.add('is-active');
            const tunnelIn = THREE.MathUtils.clamp((progress - 0.08) / 0.08, 0.0, 1.0);
            lightTunnel.setScrollDynamics(progress, scrollVelocity);
            lightTunnel.setOptions({ opacity: tunnelIn, stripeReveal: 1.0 });
          } else if (progress >= 0.74 && progress < 0.78) {
            const tunnelFade = Math.max(0, 1.0 - (progress - 0.74) / 0.04);
            lightTunnel.setOptions({ opacity: tunnelFade });
            if (tunnelFade <= 0.01 && lightTunnelMount) {
              lightTunnelMount.classList.remove('is-active');
            }
          } else {
            if (lightTunnelMount) lightTunnelMount.classList.remove('is-active');
            lightTunnel.setOptions({ opacity: 0.0 });
          }
        }

        // --- MULTI-STAGE SEQUENCING ---
        // Pre-stage / Resting Entrance: Clean 3D cursor & follower only, no text (progress < 0.08, Screenshot 1)
        // Stage 0A: Innovate with Purpose (progress 0.08 - 0.24)
        // Stage 0B: Innovate with a Human Touch (progress 0.24 - 0.40)
        // Stage 1: Central Cyber Rings + 4 Manifesto Statements (progress 0.40 - 0.78, Screenshot 2)
        // Stage End: FUTURE-FIRST ALWAYS (progress 0.78 - 0.95, Screenshot 3)
        function setStageActive(stageEl, active) {
          if (!stageEl) return;
          if (active) {
            stageEl.classList.remove('is-leaving');
            stageEl.classList.add('is-active');
          } else {
            if (stageEl.classList.contains('is-active')) {
              stageEl.classList.remove('is-active');
              stageEl.classList.add('is-leaving');
            }
          }
        }

        const inStage0A = progress >= 0.08 && progress < 0.24;
        const inStage0B = progress >= 0.24 && progress < 0.40;
        const inStage1 = progress >= 0.40 && progress < 0.78;
        const inStageEnd = progress >= 0.78 && progress < 0.95;

        setStageActive(stagePrimary, inStage0A);
        setStageActive(stageSecondary, inStage0B);
        setStageActive(stageManifesto, inStage1);
        setStageActive(stageFuture, inStageEnd);

        // Text scroll translation parallax
        if (stagePrimary) {
          if (inStage0A) {
            const textTranslateY = (progress - 0.08) * 120;
            stagePrimary.style.transform = `translateY(${textTranslateY.toFixed(1)}px)`;
          } else {
            stagePrimary.style.transform = '';
          }
        }
        if (stageSecondary) {
          if (inStage0B) {
            const textTranslateY = (progress - 0.26) * 120;
            stageSecondary.style.transform = `translateY(${textTranslateY.toFixed(1)}px)`;
          } else {
            stageSecondary.style.transform = '';
          }
        }

        // Stage 1 Details: Cyber rings rotation & 4 manifesto statements reveal (Screenshot 2)
        if (inStage1) {
          const stage1T = Math.min(Math.max((progress - 0.36) / 0.40, 0.0), 1.0);
          updateC7Rings(stage1T);

          // 4 Manifesto items staggered reveal
          const item1 = document.getElementById('hs-item-1');
          const item2 = document.getElementById('hs-item-2');
          const item3 = document.getElementById('hs-item-3');
          const item4 = document.getElementById('hs-item-4');

          if (item1) item1.classList.toggle('is-visible', stage1T >= 0.04);
          if (item2) item2.classList.toggle('is-visible', stage1T >= 0.16);
          if (item3) item3.classList.toggle('is-visible', stage1T >= 0.28);
          if (item4) item4.classList.toggle('is-visible', stage1T >= 0.40);
        } else {
          const items = document.querySelectorAll('.hs-manifesto-item');
          items.forEach(it => it.classList.remove('is-visible'));
        }


        // Smooth footer transition unlock
        const exitFade = rect.bottom < window.innerHeight ? Math.max(0, rect.bottom / (window.innerHeight * 0.45)) : 1.0;
        if (stageFuture && progress > 0.94) {
          stageFuture.style.opacity = String(exitFade);
        }
      } else {
        if (hyperspaceGroup) hyperspaceGroup.visible = false;
        if (transitionCursorGroup) transitionCursorGroup.visible = false;
        if (lightTunnel) lightTunnel.setOptions({ opacity: 0.0 });
        const lightTunnelMount = document.getElementById('light-tunnel-mount');
        if (lightTunnelMount) lightTunnelMount.classList.remove('is-active');
      }
    }

    // 3B. Smooth Hardware-Accelerated Cylindrical Scroll on Project Cards (No Snapping)
    {
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

          const rotateX = -clampedY * 4.0;
          const translateZ = -profile * 20.0;
          const scale = 1.0 - profile * 0.015;

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
        const dist = Math.max(camera.position.z - 0.2, 1.0);
        const vH = 2.0 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2.0) * dist;
        const vW = vH * camera.aspect;
        const targetW = isMob ? Math.min(vW * 0.82, 6.8) : (isTab ? 16.0 : 23.5);
        const newScale = targetW / Math.max(boxX, 1);
        rahul3DMesh.userData.baseScale = newScale;
        rahul3DMesh.scale.set(newScale, newScale, newScale);
        rahul3DMesh.position.y = isMob ? 0.35 : (isTab ? 0.2 : 0.08);
      }
    }
  });

  // --------------------------------------------------------------------------
  // 14. GREEN PIXEL CURSOR TRAIL (Active ONLY in Work / Projects Section)
  // --------------------------------------------------------------------------
  function initWorkPixelTrail() {
    const workSection = document.getElementById('work');
    const canvas = document.getElementById('work-pixel-trail-canvas');
    if (!workSection || !canvas) return;

    const ctx = canvas.getContext('2d');
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = window.innerWidth;
    let height = window.innerHeight;

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    const PIXEL_COLORS = ['#C0FE04', '#B8F405', '#D4FF38', '#9CD009', '#A3D808'];
    const pixels = [];
    let lastX = -999;
    let lastY = -999;
    let isMouseInWork = false;
    let animId = null;

    function addPixel(x, y) {
      const size = 11 + Math.floor(Math.random() * 4);
      pixels.push({
        x: x,
        y: y,
        size: size,
        color: PIXEL_COLORS[Math.floor(Math.random() * PIXEL_COLORS.length)],
        opacity: 0.95,
        age: 0,
        maxAge: 44 + Math.floor(Math.random() * 16),
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25
      });
      if (pixels.length > 85) pixels.shift();
    }

    function onMouseMove(e) {
      const rect = workSection.getBoundingClientRect();
      // Strictly inside Work Section visible bounds in viewport
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= Math.max(0, rect.top) &&
        e.clientY <= Math.min(window.innerHeight, rect.bottom)
      ) {
        isMouseInWork = true;
        const x = e.clientX;
        const y = e.clientY;

        const dx = x - lastX;
        const dy = y - lastY;
        const dist = Math.hypot(dx, dy);

        if (dist > 6) {
          addPixel(x, y);
          if (dist > 14) {
            addPixel(x - dx * 0.5, y - dy * 0.5);
          }
          if (dist > 28) {
            addPixel(x - dx * 0.25, y - dy * 0.25);
            addPixel(x - dx * 0.75, y - dy * 0.75);
          }
          lastX = x;
          lastY = y;
        }
        startLoop();
      } else {
        isMouseInWork = false;
      }
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true });

    function startLoop() {
      if (!animId) {
        animId = requestAnimationFrame(update);
      }
    }

    function update() {
      ctx.clearRect(0, 0, width, height);

      for (let i = pixels.length - 1; i >= 0; i--) {
        const p = pixels[i];
        p.age++;
        p.x += p.vx;
        p.y += p.vy;

        const progress = p.age / p.maxAge;
        if (progress >= 1.0) {
          pixels.splice(i, 1);
          continue;
        }

        const alpha = (1.0 - progress) * p.opacity;
        const scale = Math.max(0.25, 1.0 - progress * 0.75);
        const s = p.size * scale;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = '#C0FE04';
        ctx.shadowBlur = 8;
        ctx.fillRect(Math.round(p.x - s * 0.5), Math.round(p.y - s * 0.5), Math.round(s), Math.round(s));
        ctx.restore();
      }

      if (pixels.length > 0 || isMouseInWork) {
        animId = requestAnimationFrame(update);
      } else {
        animId = null;
      }
    }
  }

  // Initialize green pixel cursor trail for Selected Work section
  initWorkPixelTrail();

})();
