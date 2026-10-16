/**
 * INTERACTIVE SIGNATURE PASS CARD & RETRO HARDWARE READER CONTROLLER
 * Ultra-Smooth Physics, Real Slot Sandwiching, Physical Swipe Mechanics, and Zero Glitches
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

  function playClickSound() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.035);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch (_) {}
  }

  function playSwipeSound() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const bufferSize = Math.floor(ctx.sampleRate * 0.22);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1100, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(380, ctx.currentTime + 0.22);
      filter.Q.value = 2.4;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
    } catch (_) {}
  }

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

  // Check URL parameters or hash to skip if requested
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
  let hasMoved = false;

  // Unified Physics State
  const currentPos = { x: 0, y: 0 };
  const targetPos = { x: 0, y: 0 };
  const currentTilt = { x: 0, y: 0, z: 0 };
  const targetTilt = { x: 0, y: 0, z: 0 };
  const dragStart = { x: 0, y: 0 };
  const cardStartPos = { x: 0, y: 0 };
  let pointerDownTime = 0;
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
        hintEl.innerHTML = 'Tap or swipe card into reader to enter';
        hintEl.className = 'gate-hint shimmer';
      }
    } else if (state === 'reading') {
      displayUnit.classList.add('is-reading');
      ledIndicator.classList.add('is-active');
      screenText.textContent = 'SWIPING...';
      if (hintEl) {
        hintEl.textContent = 'Reading signature card...';
        hintEl.className = 'gate-hint';
      }
    } else if (state === 'granted') {
      displayUnit.classList.add('is-granted');
      ledIndicator.classList.add('is-granted');
      screenText.textContent = 'ACCESS GRANTED';
      if (hintEl) {
        hintEl.textContent = 'Access Granted // Welcome Rahul';
        hintEl.className = 'gate-hint';
      }
    }
  }

  // --------------------------------------------------------------------------
  // 4. UNLOCK & EXIT TRANSITION
  // --------------------------------------------------------------------------
  function unlockGate() {
    if (isGranted) return;
    isGranted = true;
    sessionStorage.setItem('dev_pass_unlocked', 'true');

    setReaderState('granted');
    playSuccessChime();

    // Settle card snugly inside slot
    if (cardWrapper) {
      cardWrapper.classList.add('is-in-slot');
      targetPos.x = 0;
      targetPos.y = 140;
      targetTilt.x = 0;
      targetTilt.y = 0;
      targetTilt.z = 0;
    }

    setTimeout(() => {
      gateEl.classList.add('is-unlocked');
      setTimeout(() => {
        gateEl.style.display = 'none';
      }, 750);
    }, 550);
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
    if (e.key === 'Escape' || e.key === 'Enter') {
      unlockGate();
    }
  });

  // --------------------------------------------------------------------------
  // 5. SMOOTH COMPLETE SWIPE (If released in slot)
  // --------------------------------------------------------------------------
  function completeSwipeDown() {
    if (isGranted || isAutoSwiping) return;
    isAutoSwiping = true;
    cardWrapper.classList.add('is-in-slot');

    if (!hasSwiped) {
      setReaderState('reading');
      playSwipeSound();
      hasSwiped = true;
    }

    const startY = currentPos.y;
    const targetY = 140;
    let t = 0;

    function step() {
      t += 0.055;
      const ease = Math.min(1, Math.sin(t * Math.PI * 0.5));
      currentPos.y = startY + (targetY - startY) * ease;
      currentPos.x += (0 - currentPos.x) * 0.25;
      targetTilt.x = 0;
      targetTilt.y = 0;
      targetTilt.z = 0;

      if (t >= 1) {
        isAutoSwiping = false;
        unlockGate();
        return;
      }
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // --------------------------------------------------------------------------
  // 6. AUTO-SWIPE ANIMATION (On click or tap)
  // --------------------------------------------------------------------------
  function runAutoSwipe() {
    if (isGranted || isAutoSwiping) return;
    isAutoSwiping = true;
    isDragging = false;
    cardWrapper.classList.remove('is-dragging');
    if (readerWrapper) readerWrapper.classList.remove('is-dragging-card');

    getAudioContext();
    playClickSound();

    let progress = 0;
    const startX = currentPos.x;
    const startY = currentPos.y;
    const targetSlotY = 140;

    function anim() {
      progress += 0.024;
      const p = Math.min(1, progress);

      // Smooth ease-in-out curve
      const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
      currentPos.y = startY + (targetSlotY - startY) * ease;
      currentPos.x = startX * (1 - ease);
      targetTilt.z = Math.sin(p * Math.PI) * -1.5;
      targetTilt.x = Math.sin(p * Math.PI) * -2;
      targetTilt.y = 0;

      if (p > 0.4 && !hasSwiped) {
        cardWrapper.classList.add('is-in-slot');
        setReaderState('reading');
        playSwipeSound();
        hasSwiped = true;
      }

      if (p >= 1) {
        isAutoSwiping = false;
        unlockGate();
        return;
      }

      requestAnimationFrame(anim);
    }

    requestAnimationFrame(anim);
  }

  // --------------------------------------------------------------------------
  // 7. POINTER DRAG & SWIPE EVENTS (Flawless on Laptop Mouse & Mobile Touch)
  // --------------------------------------------------------------------------
  function onPointerDown(e) {
    if (isGranted || isAutoSwiping) return;
    if (e.button !== undefined && e.button !== 0) return; // Primary button only
    if (e.cancelable) e.preventDefault();

    getAudioContext();
    playClickSound();

    pointerDownTime = performance.now();
    isDragging = true;
    hasMoved = false;
    cardWrapper.classList.add('is-dragging');
    if (readerWrapper) readerWrapper.classList.add('is-dragging-card');

    if (e.pointerId !== undefined && cardWrapper.setPointerCapture) {
      try {
        cardWrapper.setPointerCapture(e.pointerId);
      } catch (_) {}
    }

    dragStart.x = e.clientX;
    dragStart.y = e.clientY;
    cardStartPos.x = currentPos.x;
    cardStartPos.y = currentPos.y;
  }

  function onPointerMove(e) {
    if (isGranted || isAutoSwiping) return;

    if (!isDragging) {
      // Gentle 3D tilt on hover over card
      if (cardWrapper) {
        const rect = cardWrapper.getBoundingClientRect();
        const isOverCard = e.clientX >= rect.left && e.clientX <= rect.right &&
                           e.clientY >= rect.top && e.clientY <= rect.bottom;
        if (isOverCard) {
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const dx = Math.max(-1, Math.min(1, (e.clientX - centerX) / (rect.width / 2)));
          const dy = Math.max(-1, Math.min(1, (e.clientY - centerY) / (rect.height / 2)));
          targetTilt.y = dx * 6;
          targetTilt.x = -dy * 5;
          targetTilt.z = dx * 1.2;
        } else {
          targetTilt.y = 0;
          targetTilt.x = 0;
          targetTilt.z = 0;
        }
      }
      return;
    }

    if (e.cancelable) e.preventDefault();

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    if (Math.hypot(deltaX, deltaY) > 6) {
      hasMoved = true;
    }

    // Direct tracking with smooth vertical boundaries
    targetPos.x = Math.max(-120, Math.min(120, cardStartPos.x + deltaX * 0.85));
    targetPos.y = Math.max(-20, Math.min(180, cardStartPos.y + deltaY));

    // Dynamic tilt based on drag motion
    targetTilt.y = Math.max(-8, Math.min(8, deltaX * 0.06));
    targetTilt.x = Math.max(-8, Math.min(8, -deltaY * 0.05));
    targetTilt.z = Math.max(-6, Math.min(6, deltaX * 0.04));

    // Physical Reader Slot Interaction:
    if (targetPos.y >= 65) {
      cardWrapper.classList.add('is-in-slot');
      if (!hasSwiped) {
        setReaderState('reading');
        playSwipeSound();
        hasSwiped = true;
      }

      // Swiped deep into the slot -> Complete swipe smoothly!
      if (targetPos.y >= 120) {
        isDragging = false;
        if (e.pointerId !== undefined && cardWrapper.releasePointerCapture) {
          try {
            cardWrapper.releasePointerCapture(e.pointerId);
          } catch (_) {}
        }
        cardWrapper.classList.remove('is-dragging');
        if (readerWrapper) readerWrapper.classList.remove('is-dragging-card');
        completeSwipeDown();
      }
    } else {
      cardWrapper.classList.remove('is-in-slot');
      if (hasSwiped && targetPos.y < 35) {
        hasSwiped = false;
        setReaderState('idle');
      }
    }
  }

  function onPointerUp(e) {
    if (!isDragging) return;
    isDragging = false;
    cardWrapper.classList.remove('is-dragging');
    if (readerWrapper) readerWrapper.classList.remove('is-dragging-card');

    if (e && e.pointerId !== undefined && cardWrapper.releasePointerCapture) {
      try {
        cardWrapper.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }

    if (isGranted || isAutoSwiping) return;

    const clientX = e && e.clientX !== undefined ? e.clientX : dragStart.x;
    const clientY = e && e.clientY !== undefined ? e.clientY : dragStart.y;
    const elapsed = performance.now() - pointerDownTime;
    const moved = Math.hypot(clientX - dragStart.x, clientY - dragStart.y);

    // 1. TAP / CLICK ON LAPTOP OR MOBILE: Auto-swipe cleanly into reader!
    if (!hasMoved || (moved < 18 && elapsed < 650)) {
      runAutoSwipe();
      return;
    }

    // 2. SWIPE DOWNWARD: User dragged downward toward slot -> Complete swipe!
    if (targetPos.y >= 45) {
      completeSwipeDown();
      return;
    }

    // 3. Otherwise spring back smoothly to idle rest position
    targetPos.x = 0;
    targetPos.y = 0;
    targetTilt.x = 0;
    targetTilt.y = 0;
    targetTilt.z = 0;
    hasSwiped = false;
    cardWrapper.classList.remove('is-in-slot');
    setReaderState('idle');
  }

  // Prevent browser native HTML5 drag and drop or text selection on the card
  cardWrapper.addEventListener('dragstart', (e) => e.preventDefault());
  cardWrapper.addEventListener('selectstart', (e) => e.preventDefault());
  const allCardChildren = cardWrapper.querySelectorAll('*');
  allCardChildren.forEach((child) => {
    child.addEventListener('dragstart', (e) => e.preventDefault());
    child.addEventListener('selectstart', (e) => e.preventDefault());
  });

  // Pointer Events (Mouse + Stylus + Touch with pointer support)
  cardWrapper.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  // Direct Click Failsafe for Laptop Mouse & Trackpad
  cardWrapper.addEventListener('click', (e) => {
    e.preventDefault();
    if (!isGranted && !isAutoSwiping) {
      runAutoSwipe();
    }
  });

  // Touch Event Fallback for Mobile Viewports
  cardWrapper.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches[0]) {
      const touch = e.touches[0];
      onPointerDown({
        clientX: touch.clientX,
        clientY: touch.clientY,
        pointerId: 1,
        cancelable: e.cancelable,
        preventDefault: () => e.preventDefault()
      });
    }
  }, { passive: false });

  window.addEventListener('touchmove', (e) => {
    if (isDragging && e.touches && e.touches[0]) {
      const touch = e.touches[0];
      onPointerMove({
        clientX: touch.clientX,
        clientY: touch.clientY,
        cancelable: e.cancelable,
        preventDefault: () => e.preventDefault()
      });
    }
  }, { passive: false });

  window.addEventListener('touchend', (e) => {
    if (isDragging) {
      const touch = e.changedTouches ? e.changedTouches[0] : null;
      onPointerUp({
        clientX: touch ? touch.clientX : dragStart.x,
        clientY: touch ? touch.clientY : dragStart.y,
        pointerId: 1
      });
    }
  });

  // Clicking reader unit also triggers auto-swipe entry
  if (readerWrapper) {
    readerWrapper.addEventListener('click', (e) => {
      e.preventDefault();
      if (!isGranted && !isAutoSwiping) {
        runAutoSwipe();
      }
    });
  }

  // Keyboard accessibility: Press ArrowDown, Enter, or Space to swipe into slot
  cardWrapper.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      runAutoSwipe();
    }
  });

  // --------------------------------------------------------------------------
  // 8. UNIFIED 60FPS RENDER LOOP (Zero Jitter, Flawless Physics)
  // --------------------------------------------------------------------------
  function renderLoop() {
    if (!isGranted && !isAutoSwiping) {
      if (isDragging) {
        // Fast, direct 1:1 response during drag
        currentPos.x += (targetPos.x - currentPos.x) * 0.72;
        currentPos.y += (targetPos.y - currentPos.y) * 0.72;
        currentTilt.x += (targetTilt.x - currentTilt.x) * 0.45;
        currentTilt.y += (targetTilt.y - currentTilt.y) * 0.45;
        currentTilt.z += (targetTilt.z - currentTilt.z) * 0.45;
      } else {
        // Smooth spring damping back to rest target
        currentPos.x += (targetPos.x - currentPos.x) * 0.16;
        currentPos.y += (targetPos.y - currentPos.y) * 0.16;
        currentTilt.x += (targetTilt.x - currentTilt.x) * 0.14;
        currentTilt.y += (targetTilt.y - currentTilt.y) * 0.14;
        currentTilt.z += (targetTilt.z - currentTilt.z) * 0.14;

        // Gentle ambient hover bob ONLY when card is resting at home
        const isResting = Math.hypot(currentPos.x, currentPos.y) < 2 && Math.hypot(targetPos.x, targetPos.y) < 1;
        if (isResting) {
          hoverTime += 0.035;
          const bobY = Math.sin(hoverTime) * 3.5;
          const bobTilt = Math.cos(hoverTime * 0.7) * 0.6;

          const posY = currentPos.y + bobY;
          const tiltZ = currentTilt.z + bobTilt;
          cardWrapper.style.transform = `translate3d(${currentPos.x.toFixed(2)}px, ${posY.toFixed(2)}px, 0) rotateX(${currentTilt.x.toFixed(2)}deg) rotateY(${currentTilt.y.toFixed(2)}deg) rotateZ(${tiltZ.toFixed(2)}deg)`;
          requestAnimationFrame(renderLoop);
          return;
        }
      }

      cardWrapper.style.transform = `translate3d(${currentPos.x.toFixed(2)}px, ${currentPos.y.toFixed(2)}px, 0) rotateX(${currentTilt.x.toFixed(2)}deg) rotateY(${currentTilt.y.toFixed(2)}deg) rotateZ(${currentTilt.z.toFixed(2)}deg)`;
    } else if (isGranted && cardWrapper) {
      // Smooth settle when unlocked
      currentPos.x += (targetPos.x - currentPos.x) * 0.18;
      currentPos.y += (targetPos.y - currentPos.y) * 0.18;
      currentTilt.x *= 0.85;
      currentTilt.y *= 0.85;
      currentTilt.z *= 0.85;
      cardWrapper.style.transform = `translate3d(${currentPos.x.toFixed(2)}px, ${currentPos.y.toFixed(2)}px, 0) rotateX(${currentTilt.x.toFixed(2)}deg) rotateY(${currentTilt.y.toFixed(2)}deg) rotateZ(${currentTilt.z.toFixed(2)}deg)`;
    }

    requestAnimationFrame(renderLoop);
  }
  requestAnimationFrame(renderLoop);

  // --------------------------------------------------------------------------
  // 9. INITIALIZE AUTHENTIC CALLIGRAPHY SIGNATURE ON PEARL WHITE CARD
  // --------------------------------------------------------------------------
  const gateSignature = document.getElementById('gate-card-signature');
  function animateGateSignature() {
    if (!gateSignature) return;
    gateSignature.classList.add('is-drawn');
  }
  animateGateSignature();

  // Initialize
  setReaderState('idle');

  // Global replay trigger
  window.replayDevGate = function () {
    sessionStorage.removeItem('dev_pass_unlocked');
    gateEl.classList.remove('is-unlocked');
    gateEl.style.display = 'flex';
    isGranted = false;
    isDragging = false;
    isAutoSwiping = false;
    hasSwiped = false;
    hasMoved = false;
    currentPos.x = 0;
    currentPos.y = 0;
    targetPos.x = 0;
    targetPos.y = 0;
    currentTilt.x = 0;
    currentTilt.y = 0;
    currentTilt.z = 0;
    cardWrapper.classList.remove('is-in-slot');
    setReaderState('idle');
    animateGateSignature();
  };
})();
