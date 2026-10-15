/**
 * INTERACTIVE DEVELOPER BOARDING PASS & RETRO HARDWARE READER CONTROLLER
 * Inspired by mikes.cv — Software & AI Engineering Edition
 */

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // 1. NATIVE WEB AUDIO SYNTHESIZER (Zero external audio files needed)
  // --------------------------------------------------------------------------
  let audioCtx = null;

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  // Play mechanical plastic latch / click
  function playClickSound() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (_) {}
  }

  // Play realistic magnetic tape / card friction swipe sound
  function playSwipeSound() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const bufferSize = ctx.sampleRate * 0.18; // 180ms
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.18);
      filter.Q.value = 2.2;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
    } catch (_) {}
  }

  // Play bright 3-tone harmonic success chime
  function playSuccessChime() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const startTime = ctx.currentTime + idx * 0.07;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.14, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.5);
      });
    } catch (_) {}
  }

  // --------------------------------------------------------------------------
  // 2. DOM ELEMENTS & INITIAL STATE
  // --------------------------------------------------------------------------
  const gateEl = document.getElementById('dev-gate');
  if (!gateEl) return;

  const cardWrapper = document.getElementById('gate-card-wrapper');
  const readerWrapper = document.getElementById('gate-reader');
  const displayUnit = document.getElementById('reader-display');
  const screenText = document.getElementById('reader-screen-text');
  const ledIndicator = document.getElementById('reader-led');
  const hintEl = document.getElementById('gate-hint');
  const skipBtn = document.getElementById('gate-skip-btn');

  // Show gate on page load (unless explicit ?skip=1 or direct hash jump)
  const urlParams = new URLSearchParams(window.location.search);
  const skipGate = urlParams.has('skip') || window.location.hash === '#work' || window.location.hash === '#contact';

  if (skipGate) {
    gateEl.classList.add('is-unlocked');
    gateEl.style.display = 'none';
    return;
  }

  let isGranted = false;
  let isDragging = false;
  let isAutoSwiping = false;
  let hasSwiped = false;

  // Physics state
  const restPos = { x: 0, y: 0 };
  const currentPos = { x: 0, y: 0 };
  const targetPos = { x: 0, y: 0 };
  const velocity = { x: 0, y: 0 };
  const dragStart = { x: 0, y: 0 };
  const cardStartPos = { x: 0, y: 0 };
  let currentTilt = { x: 0, y: 0, z: 0 };

  // Idle hover oscillation
  let hoverTime = 0;

  // --------------------------------------------------------------------------
  // 3. SET READER STATES
  // --------------------------------------------------------------------------
  function setReaderState(state) {
    if (!displayUnit || !screenText || !ledIndicator) return;

    displayUnit.classList.remove('is-reading', 'is-granted');
    ledIndicator.classList.remove('is-active', 'is-granted');

    if (state === 'idle') {
      screenText.textContent = 'READY';
      if (hintEl) {
        hintEl.innerHTML = 'Swipe <strong>Software ID</strong> to access portfolio';
        hintEl.className = 'gate-hint shimmer';
      }
    } else if (state === 'reading') {
      displayUnit.classList.add('is-reading');
      ledIndicator.classList.add('is-active');
      screenText.textContent = 'READING ID...';
    } else if (state === 'granted') {
      displayUnit.classList.add('is-granted');
      ledIndicator.classList.add('is-granted');
      screenText.textContent = 'ACCESS GRANTED';
      if (hintEl) {
        hintEl.textContent = 'Access granted // Welcome Rahul';
        hintEl.className = 'gate-hint';
      }
    }
  }

  // --------------------------------------------------------------------------
  // 4. UNLOCK & EXIT TRANSITION INTO MAIN PORTFOLIO
  // --------------------------------------------------------------------------
  function unlockGate() {
    if (isGranted) return;
    isGranted = true;
    sessionStorage.setItem('dev_pass_unlocked', 'true');

    setReaderState('granted');
    playSuccessChime();

    // Settle card into slot gracefully
    if (cardWrapper && readerWrapper) {
      cardWrapper.classList.add('is-in-slot');
      const readerRect = readerWrapper.getBoundingClientRect();
      const stageRect = gateEl.querySelector('.gate-stage').getBoundingClientRect();
      const slotCenterY = (readerRect.top + 20) - (stageRect.top + 60);

      // Smooth settling animation
      let settleProgress = 0;
      const startY = currentPos.y;
      const startX = currentPos.x;
      const animSettle = () => {
        settleProgress += 0.08;
        currentPos.y = startY + (slotCenterY - startY) * Math.min(1, settleProgress);
        currentPos.x = startX + (0 - startX) * Math.min(1, settleProgress);
        currentTilt.z *= 0.85;
        currentTilt.x *= 0.85;
        currentTilt.y *= 0.85;
        updateCardTransform();
        if (settleProgress < 1) {
          requestAnimationFrame(animSettle);
        }
      };
      requestAnimationFrame(animSettle);
    }

    // Delay smooth dissolve to enjoy visual feedback
    setTimeout(() => {
      gateEl.classList.add('is-unlocked');
      setTimeout(() => {
        gateEl.style.display = 'none';
      }, 750);
    }, 700);
  }

  // Skip Button
  if (skipBtn) {
    skipBtn.addEventListener('click', (e) => {
      e.preventDefault();
      getAudioContext();
      unlockGate();
    });
  }

  // Keyboard shortcut: Escape or Enter unlocks
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      unlockGate();
    }
  });

  // --------------------------------------------------------------------------
  // 5. DRAG & SWIPE PHYSICS
  // --------------------------------------------------------------------------
  function updateCardTransform() {
    if (!cardWrapper) return;
    cardWrapper.style.transform = `translate3d(${currentPos.x.toFixed(2)}px, ${currentPos.y.toFixed(2)}px, 0) rotateX(${currentTilt.x.toFixed(2)}deg) rotateY(${currentTilt.y.toFixed(2)}deg) rotateZ(${currentTilt.z.toFixed(2)}deg)`;
  }

  // Check if card is aligned with reader slot
  function checkSlotCollision() {
    if (!cardWrapper || !readerWrapper) return false;
    const cardRect = cardWrapper.getBoundingClientRect();
    const readerRect = readerWrapper.getBoundingClientRect();

    const slotY = readerRect.top + 24;
    const cardBottomY = cardRect.bottom;

    // Card bottom edge reaching or entering reader slot
    const inVerticalSlotZone = cardBottomY >= slotY - 25;
    const inHorizontalSlotZone = cardRect.right > readerRect.left - 25 && cardRect.left < readerRect.right + 25;

    return inVerticalSlotZone && inHorizontalSlotZone;
  }

  // Pointer Down
  function onPointerDown(e) {
    if (isGranted || isAutoSwiping) return;
    getAudioContext();
    playClickSound();

    isDragging = true;
    cardWrapper.classList.add('is-dragging');
    try {
      cardWrapper.setPointerCapture(e.pointerId);
    } catch (_) {}

    dragStart.x = e.clientX;
    dragStart.y = e.clientY;
    cardStartPos.x = currentPos.x;
    cardStartPos.y = currentPos.y;
  }

  // Pointer Move
  function onPointerMove(e) {
    if (!isDragging || isGranted || isAutoSwiping) {
      // Subtle 3D tilt tracking when hovering
      if (!isDragging && cardWrapper) {
        const rect = cardWrapper.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = (e.clientX - centerX) / (rect.width / 2);
        const dy = (e.clientY - centerY) / (rect.height / 2);
        currentTilt.y = dx * 10;
        currentTilt.x = -dy * 8;
        currentTilt.z = dx * 2;
        updateCardTransform();
      }
      return;
    }

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    targetPos.x = cardStartPos.x + deltaX;
    targetPos.y = cardStartPos.y + deltaY;

    // Dynamic tilt based on drag direction & momentum
    const vx = targetPos.x - currentPos.x;
    const vy = targetPos.y - currentPos.y;
    velocity.x = vx;
    velocity.y = vy;

    currentTilt.z = Math.max(-14, Math.min(14, vx * 0.8));
    currentTilt.x = Math.max(-12, Math.min(12, -vy * 0.6));
    currentTilt.y = Math.max(-10, Math.min(10, vx * 0.5));

    // Update position directly
    currentPos.x = targetPos.x;
    currentPos.y = targetPos.y;
    updateCardTransform();

    // Check Slot Interaction
    const isInSlot = checkSlotCollision();
    if (isInSlot) {
      cardWrapper.classList.add('is-in-slot');
      currentTilt.x *= 0.2;
      currentTilt.z *= 0.2;

      if (!hasSwiped) {
        setReaderState('reading');
        playSwipeSound();
        hasSwiped = true;
      }

      // Check if swiped through horizontally or pulled into slot deeply
      const cardRect = cardWrapper.getBoundingClientRect();
      const readerRect = readerWrapper.getBoundingClientRect();
      const pulledDeep = cardRect.bottom > readerRect.top + 45;
      const swipedAcross = Math.abs(currentPos.x - cardStartPos.x) > 60;

      if (pulledDeep || swipedAcross) {
        isDragging = false;
        try {
          cardWrapper.releasePointerCapture(e.pointerId);
        } catch (_) {}
        cardWrapper.classList.remove('is-dragging');
        unlockGate();
        return;
      }
    } else {
      cardWrapper.classList.remove('is-in-slot');
      if (hasSwiped && !isGranted) {
        setReaderState('idle');
        hasSwiped = false;
      }
    }
  }

  // Pointer Up / Cancel
  function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;
    cardWrapper.classList.remove('is-dragging');
    try {
      cardWrapper.releasePointerCapture(e.pointerId);
    } catch (_) {}

    // Check if released inside slot
    if (checkSlotCollision()) {
      unlockGate();
      return;
    }

    // Spring back to rest position
    springBackToRest();
  }

  // Smooth Spring Back to Rest
  function springBackToRest() {
    let animFrame = null;
    let k = 0.12; // spring stiffness
    let damping = 0.72; // friction damping
    let vx = velocity.x * 0.5;
    let vy = velocity.y * 0.5;

    function step() {
      if (isDragging || isGranted || isAutoSwiping) return;

      const fx = (restPos.x - currentPos.x) * k;
      const fy = (restPos.y - currentPos.y) * k;

      vx = (vx + fx) * damping;
      vy = (vy + fy) * damping;

      currentPos.x += vx;
      currentPos.y += vy;

      currentTilt.x *= 0.88;
      currentTilt.y *= 0.88;
      currentTilt.z *= 0.88;

      updateCardTransform();

      if (Math.abs(currentPos.x - restPos.x) > 0.4 || Math.abs(currentPos.y - restPos.y) > 0.4 || Math.abs(vx) > 0.1) {
        animFrame = requestAnimationFrame(step);
      } else {
        currentPos.x = restPos.x;
        currentPos.y = restPos.y;
        currentTilt.x = 0;
        currentTilt.y = 0;
        currentTilt.z = 0;
        updateCardTransform();
        cardWrapper.classList.remove('is-in-slot');
        setReaderState('idle');
      }
    }

    animFrame = requestAnimationFrame(step);
  }

  // --------------------------------------------------------------------------
  // 6. AUTO-SWIPE DEMO (On Tap/Click without dragging)
  // --------------------------------------------------------------------------
  function runAutoSwipe() {
    if (isGranted || isAutoSwiping || isDragging) return;
    isAutoSwiping = true;
    getAudioContext();
    playClickSound();

    const stageRect = gateEl.querySelector('.gate-stage').getBoundingClientRect();
    const readerRect = readerWrapper.getBoundingClientRect();
    const targetSlotY = (readerRect.top + 30) - (stageRect.top + 60);

    let progress = 0;
    const startX = currentPos.x;
    const startY = currentPos.y;

    function anim() {
      progress += 0.024;
      if (progress <= 0.45) {
        // Step 1: Move card down into slot
        const p = progress / 0.45;
        currentPos.y = startY + (targetSlotY - startY) * Math.sin(p * Math.PI * 0.5);
        currentPos.x = startX - p * 30;
        currentTilt.z = -p * 6;
        currentTilt.x = -p * 3;
        if (p > 0.7) {
          cardWrapper.classList.add('is-in-slot');
        }
      } else if (progress <= 0.85) {
        // Step 2: Swipe card across the slot with friction audio
        if (!hasSwiped) {
          setReaderState('reading');
          playSwipeSound();
          hasSwiped = true;
        }
        const p = (progress - 0.45) / 0.4;
        currentPos.x = startX - 30 + p * 110;
        currentTilt.z = (p - 0.5) * 4;
      } else {
        // Step 3: Complete swipe & unlock
        isAutoSwiping = false;
        unlockGate();
        return;
      }

      updateCardTransform();
      requestAnimationFrame(anim);
    }

    requestAnimationFrame(anim);
  }

  // Clicking the card or reader runs auto-swipe if user didn't drag
  let pointerDownTime = 0;
  cardWrapper.addEventListener('pointerdown', (e) => {
    pointerDownTime = performance.now();
    onPointerDown(e);
  });
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerup', (e) => {
    const elapsed = performance.now() - pointerDownTime;
    const moved = Math.hypot(e.clientX - dragStart.x, e.clientY - dragStart.y);
    if (elapsed < 240 && moved < 8 && !isGranted) {
      runAutoSwipe();
      return;
    }
    onPointerUp(e);
  });

  // Clicking on reader directly also triggers auto-swipe
  if (readerWrapper) {
    readerWrapper.addEventListener('click', () => {
      runAutoSwipe();
    });
  }

  // Gentle Idle Hover Bob Animation
  function idleHoverLoop() {
    if (!isDragging && !isAutoSwiping && !isGranted && !cardWrapper.classList.contains('is-in-slot')) {
      hoverTime += 0.035;
      const bobY = Math.sin(hoverTime) * 4;
      const bobTilt = Math.cos(hoverTime * 0.7) * 0.8;
      cardWrapper.style.transform = `translate3d(${currentPos.x.toFixed(2)}px, ${(currentPos.y + bobY).toFixed(2)}px, 0) rotateX(${currentTilt.x.toFixed(2)}deg) rotateY(${currentTilt.y.toFixed(2)}deg) rotateZ(${(currentTilt.z + bobTilt).toFixed(2)}deg)`;
    }
    requestAnimationFrame(idleHoverLoop);
  }
  requestAnimationFrame(idleHoverLoop);

  // Initialize
  setReaderState('idle');

  // Expose global replay trigger for testing / user convenience
  window.replayDevGate = function () {
    sessionStorage.removeItem('dev_pass_unlocked');
    gateEl.classList.remove('is-unlocked');
    gateEl.style.display = 'flex';
    isGranted = false;
    isDragging = false;
    isAutoSwiping = false;
    hasSwiped = false;
    currentPos.x = 0;
    currentPos.y = 0;
    currentTilt.x = 0;
    currentTilt.y = 0;
    currentTilt.z = 0;
    updateCardTransform();
    cardWrapper.classList.remove('is-in-slot');
    setReaderState('idle');
  };
})();
