/**
 * INTERACTIVE SIGNATURE PASS CARD & RETRO HARDWARE READER CONTROLLER
 * Ultra-Smooth Physics, Real Slot Sandwiching, Physical Swipe Mechanics, Gravity Fall & Zero Glitches
 * Exact mikes.cv Card Mechanics:
 * - Tapping card triggers gravity fall down off screen and respawn (NEVER OPENS)
 * - Dragging inside reader shows "READING..." with amber LED (NEVER OPENS on dwell)
 * - Only horizontal swiping across the reader triggers "ACCESS GRANTED" & opens gate
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

  // Check URL parameters to skip if requested
  const urlParams = new URLSearchParams(window.location.search);
  const skipGate = urlParams.has('skip');

  if (skipGate) {
    gateEl.classList.add('is-unlocked');
    gateEl.style.display = 'none';
    return;
  }

  // Card State Machine: 'hover' | 'drag' | 'fall' | 'granted'
  let cardState = 'hover';
  let hasMoved = false;
  let isRespawning = false;

  // Unified Physics State
  const currentPos = { x: 0, y: 0, z: 20 };
  const targetPos = { x: 0, y: 0, z: 20 };
  const currentTilt = { x: 0, y: 0, z: 0 };
  const targetTilt = { x: 0, y: 0, z: 0 };
  const dragStart = { x: 0, y: 0 };
  const cardStartPos = { x: 0, y: 0 };

  // Velocity & Fall State
  let lastPointerPos = { x: 0, y: 0, time: 0 };
  let pointerVelocity = { x: 0, y: 0 };
  let fallVx = 0;
  let fallVy = 0;
  let fallVRotZ = 0;
  let fallVRotX = 0;

  // Slot swipe traverse tracking: tracks horizontal travel span while inside slot
  let slotSwipeTrack = null;
  let hoverTime = 0;
  let lastFrameTime = performance.now();

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
        hintEl.innerHTML = 'Swipe pass across reader to enter';
        hintEl.className = 'gate-hint shimmer';
      }
    } else if (state === 'reading') {
      displayUnit.classList.add('is-reading');
      ledIndicator.classList.add('is-active');
      screenText.textContent = 'READING...';
      if (hintEl) {
        hintEl.textContent = 'Swipe across slot to verify...';
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
  // 4. UNLOCK & EXIT TRANSITION (ONLY ON SWIPE)
  // --------------------------------------------------------------------------
  function unlockGate() {
    if (cardState === 'granted') return;
    cardState = 'granted';
    sessionStorage.setItem('dev_pass_unlocked', 'true');

    setReaderState('granted');
    playSuccessChime();

    // Settle card perfectly centered inside slot
    if (cardWrapper) {
      cardWrapper.classList.add('is-in-slot');
      cardWrapper.classList.remove('is-dragging');
      targetPos.x = 0;
      targetPos.y = 135;
      targetTilt.x = 0;
      targetTilt.y = 0;
      targetTilt.z = 0;
    }
    if (readerWrapper) {
      readerWrapper.classList.remove('is-dragging-card');
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

  // Keyboard shortcut: Escape unlocks for accessibility
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      unlockGate();
    }
  });

  // --------------------------------------------------------------------------
  // 5. GRAVITY FALL & RESPAWN MECHANICS (Matches mikes.cv)
  // --------------------------------------------------------------------------
  function triggerCardFall(isTap) {
    if (cardState === 'granted' || cardState === 'fall' || isRespawning) return;

    cardState = 'fall';
    cardWrapper.classList.remove('is-dragging', 'is-in-slot');
    if (readerWrapper) readerWrapper.classList.remove('is-dragging-card');
    slotSwipeTrack = null;
    setReaderState('idle');

    if (isTap) {
      // Rapid gravity drop on tap / quick click
      fallVx = (Math.random() - 0.5) * 50;
      fallVy = 160;
      fallVRotZ = (Math.random() - 0.5) * 20;
      fallVRotX = 14;
    } else {
      // Drag release in air or slot without completing horizontal swipe
      fallVx = Math.max(-280, Math.min(280, pointerVelocity.x * 0.75));
      fallVy = Math.max(120, pointerVelocity.y * 0.75 + 150);
      fallVRotZ = (Math.random() - 0.5) * 24;
      fallVRotX = 16;
    }
  }

  function respawnCard() {
    if (isRespawning || cardState === 'granted') return;
    isRespawning = true;

    // Fade out off-screen
    cardWrapper.style.transition = 'opacity 0.18s ease';
    cardWrapper.style.opacity = '0';

    setTimeout(() => {
      // Reset position & velocities to home origin
      currentPos.x = 0;
      currentPos.y = -30;
      currentPos.z = 20;
      targetPos.x = 0;
      targetPos.y = 0;
      targetPos.z = 20;
      currentTilt.x = 0;
      currentTilt.y = 0;
      currentTilt.z = 0;
      targetTilt.x = 0;
      targetTilt.y = 0;
      targetTilt.z = 0;
      fallVx = 0;
      fallVy = 0;
      fallVRotZ = 0;
      fallVRotX = 0;

      cardWrapper.style.transform = 'translate3d(0px, -30px, 20px) rotateX(0deg) rotateY(0deg) rotateZ(0deg)';

      setTimeout(() => {
        // Smoothly fade card back in and spring to rest hover position
        cardWrapper.style.transition = 'opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)';
        cardWrapper.style.opacity = '1';
        cardWrapper.style.transform = 'translate3d(0px, 0px, 20px) rotateX(0deg) rotateY(0deg) rotateZ(0deg)';
        currentPos.y = 0;

        setTimeout(() => {
          cardWrapper.style.transition = '';
          cardState = 'hover';
          isRespawning = false;
        }, 450);
      }, 60);
    }, 60);
  }

  // --------------------------------------------------------------------------
  // 6. POINTER DRAG & SWIPE EVENTS (Move Anywhere in Screen, Swipe Slot to Open)
  // --------------------------------------------------------------------------
  let lastDownTime = 0;
  let lastUpTime = 0;

  function onPointerDown(e) {
    if (cardState === 'granted' || cardState === 'fall' || isRespawning) return;
    if (e.button !== undefined && e.button !== 0) return; // Primary button only

    const now = performance.now();
    if (now - lastDownTime < 30) return;
    lastDownTime = now;

    if (e.cancelable) e.preventDefault();

    getAudioContext();
    playClickSound();

    cardState = 'drag';
    hasMoved = false;
    slotSwipeTrack = null;

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

    lastPointerPos = { x: e.clientX, y: e.clientY, time: now };
    pointerVelocity = { x: 0, y: 0 };
  }

  function onPointerMove(e) {
    if (cardState === 'granted' || cardState === 'fall' || isRespawning) return;

    if (cardState === 'hover') {
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

    if (cardState !== 'drag') return;
    if (e.cancelable) e.preventDefault();

    const now = performance.now();
    const dt = Math.max((now - lastPointerPos.time) / 1000, 0.008);
    pointerVelocity.x = (e.clientX - lastPointerPos.x) / dt;
    pointerVelocity.y = (e.clientY - lastPointerPos.y) / dt;
    lastPointerPos = { x: e.clientX, y: e.clientY, time: now };

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    if (Math.hypot(deltaX, deltaY) > 8) {
      hasMoved = true;
    }

    // Direct tracking across the entire screen
    const maxMoveX = Math.max(window.innerWidth * 0.5 - 40, 240);
    const minMoveY = -(window.innerHeight * 0.5 - 30);
    const maxMoveY = window.innerHeight * 0.5 + 80;

    targetPos.x = Math.max(-maxMoveX, Math.min(maxMoveX, cardStartPos.x + deltaX));
    targetPos.y = Math.max(minMoveY, Math.min(maxMoveY, cardStartPos.y + deltaY));

    // Dynamic responsive tilt based on drag motion
    const speedX = deltaX * 0.045;
    const speedY = deltaY * 0.035;
    targetTilt.y = Math.max(-12, Math.min(12, speedX));
    targetTilt.x = Math.max(-10, Math.min(10, -speedY));
    targetTilt.z = Math.max(-7, Math.min(7, speedX * 0.6));

    // CHECK IF CARD IS INSIDE THE READER SLOT ZONE:
    // Slot mouth is at stage center (y >= 55 and y <= 260, Math.abs(x) <= 230)
    const isInSlotZone = targetPos.y >= 55 && targetPos.y <= 260 && Math.abs(targetPos.x) <= 230;

    if (isInSlotZone) {
      cardWrapper.classList.add('is-in-slot');
      targetPos.z = 0; // slides cleanly behind the front faceplate (+30px)!
      targetTilt.x = 0;
      targetTilt.y = Math.max(-4, Math.min(4, speedX * 0.4));
      targetTilt.z = Math.max(-3, Math.min(3, speedX * 0.3));
      setReaderState('reading');

      // Track horizontal swipe traverse across the reader slot
      if (!slotSwipeTrack) {
        slotSwipeTrack = { minX: targetPos.x, maxX: targetPos.x, triggered: false };
      } else {
        slotSwipeTrack.minX = Math.min(slotSwipeTrack.minX, targetPos.x);
        slotSwipeTrack.maxX = Math.max(slotSwipeTrack.maxX, targetPos.x);
      }

      const swipeSpan = slotSwipeTrack.maxX - slotSwipeTrack.minX;

      // Only a full swipe motion across slot triggers unlock!
      // Holding or dwelling inside slot strictly keeps showing "READING..." without opening!
      if (swipeSpan >= 110 && !slotSwipeTrack.triggered) {
        slotSwipeTrack.triggered = true;
        playSwipeSound();
        unlockGate();
      }
    } else {
      cardWrapper.classList.remove('is-in-slot');
      targetPos.z = 45; // flies cleanly in front of everything while in air
      slotSwipeTrack = null;
      setReaderState('idle');
    }
  }

  function onPointerUp(e) {
    if (cardState !== 'drag') return;

    const now = performance.now();
    if (now - lastUpTime < 30) return;
    lastUpTime = now;

    if (e && e.pointerId !== undefined && cardWrapper.releasePointerCapture) {
      try {
        cardWrapper.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }

    const clientX = e && e.clientX !== undefined ? e.clientX : lastPointerPos.x;
    const clientY = e && e.clientY !== undefined ? e.clientY : lastPointerPos.y;
    const moved = Math.hypot(clientX - dragStart.x, clientY - dragStart.y);

    // 1. TAP / QUICK CLICK: MANDATORY RULE - DOES NOT OPEN!
    // While tapping, card falls down under gravity off-screen, then respawns.
    if (!hasMoved || moved < 12) {
      triggerCardFall(true);
      return;
    }

    // 2. DRAGGED AND RELEASED WITHOUT COMPLETING A FULL SWIPE:
    // Even if released inside the reader slot or anywhere in air,
    // card falls down under gravity off-screen and respawns.
    triggerCardFall(false);
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
  cardWrapper.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointermove', onPointerMove);
  cardWrapper.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  // Mouse Events Fallback
  cardWrapper.addEventListener('mousedown', onPointerDown);
  cardWrapper.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mousemove', onPointerMove);
  cardWrapper.addEventListener('mouseup', onPointerUp);
  window.addEventListener('mouseup', onPointerUp);

  // Direct Click Prevention: Tapping or clicking the card MUST NOT open it
  cardWrapper.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (cardState === 'hover') {
      triggerCardFall(true);
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
    if (cardState === 'drag' && e.touches && e.touches[0]) {
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
    if (cardState === 'drag') {
      const touch = e.changedTouches ? e.changedTouches[0] : null;
      onPointerUp({
        clientX: touch ? touch.clientX : lastPointerPos.x,
        clientY: touch ? touch.clientY : lastPointerPos.y,
        pointerId: 1
      });
    }
  });

  // Direct Click Prevention on Reader: Clicking reader unit does NOT open
  if (readerWrapper) {
    readerWrapper.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  }

  // --------------------------------------------------------------------------
  // 7. UNIFIED 60FPS RENDER & PHYSICS LOOP (Zero Jitter, Flawless Smoothness)
  // --------------------------------------------------------------------------
  function renderLoop() {
    const now = performance.now();
    const dt = Math.min((now - lastFrameTime) / 1000, 0.035) || 0.016;
    lastFrameTime = now;

    if (cardState === 'fall') {
      // Physical gravity drop matching mikes.cv Rapier dynamic simulation
      const gravity = 3000; // px/s²
      fallVy += gravity * dt;
      currentPos.y += fallVy * dt;
      currentPos.x += fallVx * dt;
      currentPos.z += (targetPos.z - currentPos.z) * 0.35;
      currentTilt.z += fallVRotZ * dt * 8;
      currentTilt.x += fallVRotX * dt * 8;

      cardWrapper.style.transform = `translate3d(${currentPos.x.toFixed(2)}px, ${currentPos.y.toFixed(2)}px, ${currentPos.z.toFixed(2)}px) rotateX(${currentTilt.x.toFixed(2)}deg) rotateY(${currentTilt.y.toFixed(2)}deg) rotateZ(${currentTilt.z.toFixed(2)}deg)`;

      // When card falls past bottom of the viewport
      const fallLimit = window.innerHeight * 0.75 + 160;
      if (currentPos.y > fallLimit && !isRespawning) {
        respawnCard();
      }
    } else if (cardState === 'drag') {
      // Direct, instantaneous 1:1 finger tracking
      currentPos.x += (targetPos.x - currentPos.x) * 0.85;
      currentPos.y += (targetPos.y - currentPos.y) * 0.85;
      currentPos.z += (targetPos.z - currentPos.z) * 0.35;
      currentTilt.x += (targetTilt.x - currentTilt.x) * 0.35;
      currentTilt.y += (targetTilt.y - currentTilt.y) * 0.35;
      currentTilt.z += (targetTilt.z - currentTilt.z) * 0.35;

      cardWrapper.style.transform = `translate3d(${currentPos.x.toFixed(2)}px, ${currentPos.y.toFixed(2)}px, ${currentPos.z.toFixed(2)}px) rotateX(${currentTilt.x.toFixed(2)}deg) rotateY(${currentTilt.y.toFixed(2)}deg) rotateZ(${currentTilt.z.toFixed(2)}deg)`;
    } else if (cardState === 'hover') {
      // Gentle spring return to rest origin
      currentPos.x += (targetPos.x - currentPos.x) * 0.16;
      currentPos.y += (targetPos.y - currentPos.y) * 0.16;
      currentPos.z += (targetPos.z - currentPos.z) * 0.16;
      currentTilt.x += (targetTilt.x - currentTilt.x) * 0.14;
      currentTilt.y += (targetTilt.y - currentTilt.y) * 0.14;
      currentTilt.z += (targetTilt.z - currentTilt.z) * 0.14;

      hoverTime += 0.035;
      const bobY = Math.sin(hoverTime) * 3.5;
      const bobTilt = Math.cos(hoverTime * 0.7) * 0.6;

      const posY = currentPos.y + bobY;
      const tiltZ = currentTilt.z + bobTilt;
      cardWrapper.style.transform = `translate3d(${currentPos.x.toFixed(2)}px, ${posY.toFixed(2)}px, ${currentPos.z.toFixed(2)}px) rotateX(${currentTilt.x.toFixed(2)}deg) rotateY(${currentTilt.y.toFixed(2)}deg) rotateZ(${tiltZ.toFixed(2)}deg)`;
    } else if (cardState === 'granted' && cardWrapper) {
      // Smooth settle when unlocked
      currentPos.x += (targetPos.x - currentPos.x) * 0.22;
      currentPos.y += (targetPos.y - currentPos.y) * 0.22;
      currentPos.z += (targetPos.z - currentPos.z) * 0.22;
      currentTilt.x *= 0.75;
      currentTilt.y *= 0.75;
      currentTilt.z *= 0.75;
      cardWrapper.style.transform = `translate3d(${currentPos.x.toFixed(2)}px, ${currentPos.y.toFixed(2)}px, ${currentPos.z.toFixed(2)}px) rotateX(${currentTilt.x.toFixed(2)}deg) rotateY(${currentTilt.y.toFixed(2)}deg) rotateZ(${currentTilt.z.toFixed(2)}deg)`;
    }

    requestAnimationFrame(renderLoop);
  }
  requestAnimationFrame(renderLoop);

  // --------------------------------------------------------------------------
  // 8. INITIALIZE AUTHENTIC CALLIGRAPHY SIGNATURE ON PEARL WHITE CARD
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
    cardState = 'hover';
    hasMoved = false;
    isRespawning = false;
    slotSwipeTrack = null;
    currentPos.x = 0;
    currentPos.y = 0;
    targetPos.x = 0;
    targetPos.y = 0;
    currentTilt.x = 0;
    currentTilt.y = 0;
    currentTilt.z = 0;
    cardWrapper.classList.remove('is-in-slot', 'is-dragging');
    cardWrapper.style.opacity = '1';
    cardWrapper.style.transform = 'translate3d(0px, 0px, 0) rotateX(0deg) rotateY(0deg) rotateZ(0deg)';
    setReaderState('idle');
    animateGateSignature();
  };
})();
