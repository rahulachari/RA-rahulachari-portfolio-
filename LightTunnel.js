/**
 * ============================================================================
 * LightTunnel — Exact Haoqi Hyperspace Radial Speed-Line Shader (WebGL2)
 * High-Speed Radiating Light Streaks (Cyan, Magenta, Neon Purple, White)
 * Exact GLSL Algorithm from chunk_4d3f3b68dbbde33a.js
 * ============================================================================
 */

const VERTEX_SHADER = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform float uScrollProgress;
uniform float uScrollVelocity;
uniform float uStripeReveal;
uniform vec3 uStripeColorA;
uniform vec3 uStripeColorB;
uniform vec3 uAccentColor;
uniform float uOpacity;
out vec4 outColor;

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
  vec2 R = uResolution.xy;
  float baseScale = max(1.0, min(R.x, R.y));
  vec2 u = (fragCoord * 2.0 - R) / baseScale;

  float dur = 1.0;
  // Strictly scroll-driven: rays advance smoothly when scrolling, freeze when scrolling stops
  float time = uScrollProgress * 3.5 + uTime;
  float t = clamp(0.18 + uScrollProgress * 0.82, 0.0, 1.0);

  const float cellDensity = 96.0;
  vec2 polar = vec2(atan(u.y, u.x) / 3.0, length(u));
  float angleCoord = (6.0 - polar.x) * cellDensity;
  float angleId = floor(angleCoord) + 0.5;
  float angleCell = abs(fract(angleCoord) - 0.5);
  float radialCoord = (6.0 - polar.y) * cellDensity;
  vec2 q = vec2(angleId, radialCoord);

  float travel = smoothstep(0.0, 1.0, t);
  float keepProbability = mix(0.30, 0.95, travel);
  // Calm, controlled speed progression without high-frequency velocity spikes
  float scrollSpeed = mix(0.65, 1.15, travel);
  float trailLength = mix(2.2, 1.05, travel);
  float raySeq = fract((angleId + 0.5) * 0.61803398875);
  float keepEdge = 0.025;
  float keepMask = 1.0 - smoothstep(keepProbability - keepEdge, keepProbability + keepEdge, raySeq);

  float phaseBase = (q.y * 0.02 + q.x * 0.4) * fract(q.x * 0.61);
  vec4 spark = max(
    1.0 - fract(vec4(7.0, 6.0, 4.0, 0.0) * 0.02 + phaseBase + time * scrollSpeed) * trailLength,
    0.0
  );

  float channelMix = max(max(spark.r, spark.g), spark.b);
  float edge = max(fwidth(channelMix) * 1.5, 2.0 / max(uResolution.y, 1.0));
  float star = smoothstep(0.12 - edge, 0.12 + edge, channelMix);

  const float starThinness = 0.14;
  float thinEdge = max(fwidth(angleCell) * 1.5, 0.002);
  float thinMask = 1.0 - smoothstep(starThinness - thinEdge, starThinness + thinEdge, angleCell);
  star *= thinMask * keepMask;

  float radialBoost = pow(smoothstep(0.06, 0.95, polar.y), 1.25);
  float intensity = mix(1.0, 7.0, t * 1.2);

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
  float pulse = mix(0.82, 1.0, smoothstep(0.14, 0.5, channelMix));
  sparkColor *= pulse;

  // Exact Haoqi white core highlights on high-intensity rays
  float whiteCore = smoothstep(0.48, 0.92, channelMix) * 0.85;
  sparkColor = mix(sparkColor, vec3(1.0, 1.0, 1.0), whiteCore);

  return intensity * radialBoost * sparkColor * star;
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  vec3 stripes = sampleHyperspace(fragCoord);

  float reveal = clamp(uStripeReveal, 0.0, 1.0);
  float stripeLuma = dot(stripes, vec3(0.299, 0.587, 0.114));

  float darken = smoothstep(0.0, 0.88, reveal);
  vec3 darkBase = mix(uAccentColor, vec3(0.0), darken);
  float gapMask = (1.0 - smoothstep(0.035, 0.12, stripeLuma)) * reveal;
  float crackGuard = 1.0 - smoothstep(0.68, 0.94, reveal);
  vec3 rgb = darkBase + stripes * reveal + uAccentColor * gapMask * 0.07 * crackGuard;

  float alpha = clamp(uOpacity, 0.0, 1.0);
  outColor = vec4(rgb, alpha);
}
`;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  console.warn('[Hyperspace] Shader compile error:', gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
  return null;
}

export function createLightTunnel(container, userOptions = {}) {
  if (!container) return null;

  if (!container.classList.contains('light-tunnel-container')) {
    container.classList.add('light-tunnel-container');
  }

  let canvas = container.querySelector('.light-tunnel-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.className = 'light-tunnel-canvas';
    canvas.style.pointerEvents = 'none';
    container.appendChild(canvas);
  }

  const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: false,
    depth: false,
    powerPreference: 'high-performance'
  });

  if (!gl) {
    console.warn('[Hyperspace] WebGL2 not supported');
    return null;
  }

  const vert = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!vert || !frag || !program) return null;

  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.bindAttribLocation(program, 0, 'aPosition');
  gl.linkProgram(program);
  gl.deleteShader(vert);
  gl.deleteShader(frag);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('[Hyperspace] Program link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  const uniforms = {
    uResolution: gl.getUniformLocation(program, 'uResolution'),
    uTime: gl.getUniformLocation(program, 'uTime'),
    uScrollProgress: gl.getUniformLocation(program, 'uScrollProgress'),
    uScrollVelocity: gl.getUniformLocation(program, 'uScrollVelocity'),
    uStripeReveal: gl.getUniformLocation(program, 'uStripeReveal'),
    uStripeColorA: gl.getUniformLocation(program, 'uStripeColorA'),
    uStripeColorB: gl.getUniformLocation(program, 'uStripeColorB'),
    uAccentColor: gl.getUniformLocation(program, 'uAccentColor'),
    uOpacity: gl.getUniformLocation(program, 'uOpacity')
  };

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  // Full-screen triangle covering [-1, 1]
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  // Default parameters (Cyan & Magenta/Purple matching Haoqi exactly)
  let stripeColorA = [0.0, 0.94, 1.0];   // Cyan
  let stripeColorB = [0.85, 0.27, 0.94]; // Neon Magenta / Purple
  let accentColor  = [0.0, 0.03, 0.08];  // Deep Black-Blue
  let opacity = 1.0;
  let scrollProgress = 0.0;
  let scrollVelocity = 0.0;
  let stripeReveal = 1.0;

  let time = 0;
  let lastTime = performance.now();
  let rafId = 0;
  let isVisible = true;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(container.clientWidth || window.innerWidth, 1);
    const h = Math.max(container.clientHeight || window.innerHeight, 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }

  function render(now) {
    if (!isVisible) {
      rafId = requestAnimationFrame(render);
      return;
    }

    lastTime = now;
    // Strictly scroll-driven: advances ONLY when actively scrolling, stops cleanly when scrolling stops
    const activeScroll = Math.min(Math.abs(scrollVelocity), 25.0);
    time += activeScroll * 0.00045;

    if (opacity <= 0.001) {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      rafId = requestAnimationFrame(render);
      return;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(program);
    gl.bindVertexArray(vao);

    gl.uniform2f(uniforms.uResolution, canvas.width, canvas.height);
    gl.uniform1f(uniforms.uTime, time);
    gl.uniform1f(uniforms.uScrollProgress, scrollProgress);
    gl.uniform1f(uniforms.uScrollVelocity, scrollVelocity);
    gl.uniform1f(uniforms.uStripeReveal, stripeReveal);
    gl.uniform3f(uniforms.uStripeColorA, stripeColorA[0], stripeColorA[1], stripeColorA[2]);
    gl.uniform3f(uniforms.uStripeColorB, stripeColorB[0], stripeColorB[1], stripeColorB[2]);
    gl.uniform3f(uniforms.uAccentColor, accentColor[0], accentColor[1], accentColor[2]);
    gl.uniform1f(uniforms.uOpacity, opacity);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
    rafId = requestAnimationFrame(render);
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });
  rafId = requestAnimationFrame(render);

  return {
    setOptions(newOpts = {}) {
      if (newOpts.tunnelOpacity !== undefined) {
        opacity = newOpts.tunnelOpacity;
      }
      if (newOpts.opacity !== undefined) {
        opacity = newOpts.opacity;
      }
      if (newOpts.stripeReveal !== undefined) {
        stripeReveal = newOpts.stripeReveal;
      }
    },
    setScrollDynamics(progress, velocity = 0) {
      scrollProgress = Math.min(1, Math.max(0, progress));
      scrollVelocity = velocity;
      // In Stages 0A, 0B, 1, hyperspace is active
      if (progress < 0.12) {
        stripeReveal = Math.max(0, (progress - 0.04) / 0.08);
      } else if (progress > 0.88) {
        stripeReveal = Math.max(0, 1.0 - (progress - 0.88) / 0.10);
      } else {
        stripeReveal = 1.0;
      }
      isVisible = progress > 0.01 && progress < 0.99;
    },
    surge() {},
    destroy() {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
    }
  };
}

export default createLightTunnel;
