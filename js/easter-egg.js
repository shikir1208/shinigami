/**
 * Alpha 1 - Secret Easter Egg Module: R ❤️
 * Very hard to find secret triggers across the site:
 * 1. Secret Key Sequences: Type "rlove", "rehabr", "romantic", or "rhea" anywhere on your keyboard
 * 2. Rapid Key Sequence: Press key 'r' 4 times in under 1.5s
 * 3. Secret Click Trigger: Click 5 times rapidly on version label / logo dot
 * 4. DevTools Console: Call window.secretR()
 */

(function () {
    let keyBuffer = '';
    let clickCount = 0;
    let clickTimer = null;
    let particleInterval = null;
    let overlayEl = null;

    // Secret keyword triggers
    const SECRET_KEYWORDS = ['rawan'];

    function initEasterEgg() {
        createOverlayDOM();
        bindKeyboardTriggers();
        bindClickTriggers();

        // Expose console shortcut for dev testing
        window.secretR = triggerEasterEgg;
        window.Alpha1EasterEgg = triggerEasterEgg;
    }

    function createOverlayDOM() {
        if (document.getElementById('easter-egg-overlay')) return;

        overlayEl = document.createElement('div');
        overlayEl.id = 'easter-egg-overlay';
        overlayEl.className = 'easter-egg-overlay';

        overlayEl.innerHTML = `
            <button class="easter-egg-close" id="easter-egg-close-btn" title="Close">&times;</button>
            <div class="easter-egg-container">
                <div class="easter-egg-symbol">
                    <span>R</span>
                    <span class="easter-egg-heart">❤️</span>
                </div>
                <div class="easter-egg-subtext">Forever & Always</div>
                <div class="easter-egg-hint">[ Click anywhere to close ]</div>
            </div>
            <div id="easter-egg-particles"></div>
        `;

        document.body.appendChild(overlayEl);

        document.getElementById('easter-egg-close-btn').addEventListener('click', hideEasterEgg);
        overlayEl.addEventListener('click', (e) => {
            if (e.target === overlayEl || e.target.closest('.easter-egg-container')) {
                hideEasterEgg();
            }
        });
    }

    function playChimeSound() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();

            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 arpeggio
            notes.forEach((freq, index) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.15);

                gain.gain.setValueAtTime(0.01, ctx.currentTime + index * 0.15);
                gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + index * 0.15 + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.15 + 0.8);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(ctx.currentTime + index * 0.15);
                osc.stop(ctx.currentTime + index * 0.15 + 0.9);
            });
        } catch (e) {
            // Audio context disabled or restricted by browser autoplay policy
        }
    }

    function createHeartParticles() {
        const container = document.getElementById('easter-egg-particles');
        if (!container) return;
        container.innerHTML = '';

        const hearts = ['❤️', '💖', '💕', '✨', '🌹', '💗', '💝'];

        for (let i = 0; i < 35; i++) {
            const particle = document.createElement('div');
            particle.className = 'heart-particle';
            particle.textContent = hearts[Math.floor(Math.random() * hearts.length)];
            particle.style.left = Math.random() * 100 + 'vw';
            particle.style.animationDuration = (2.5 + Math.random() * 3) + 's';
            particle.style.animationDelay = (Math.random() * 2) + 's';
            particle.style.fontSize = (1.2 + Math.random() * 1.8) + 'rem';
            container.appendChild(particle);
        }
    }

    function triggerEasterEgg() {
        if (!overlayEl) createOverlayDOM();

        playChimeSound();
        createHeartParticles();

        overlayEl.classList.add('active');

        // Continuous heart particle generation while active
        if (particleInterval) clearInterval(particleInterval);
        particleInterval = setInterval(() => {
            if (overlayEl.classList.contains('active')) {
                createHeartParticles();
            }
        }, 4000);
    }

    function hideEasterEgg() {
        if (!overlayEl) return;
        overlayEl.classList.remove('active');
        if (particleInterval) clearInterval(particleInterval);
    }

    function bindKeyboardTriggers() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger if user is typing into text inputs
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
                return;
            }

            if (e.key === 'Escape') {
                hideEasterEgg();
                return;
            }

            const char = e.key.toLowerCase();

            // Check word buffer
            keyBuffer += char;
            if (keyBuffer.length > 20) {
                keyBuffer = keyBuffer.slice(-20);
            }

            for (const word of SECRET_KEYWORDS) {
                if (keyBuffer.includes(word)) {
                    triggerEasterEgg();
                    keyBuffer = '';
                    break;
                }
            }
        });
    }

    function bindClickTriggers() {
        document.addEventListener('click', (e) => {
            // Check if clicking version info or footer dots
            const target = e.target;
            const text = target.innerText || target.textContent || '';

            if (text.includes('v2.4') || text.includes('HIPAA') || target.classList.contains('login-footer-dot') || target.classList.contains('header-logo')) {
                clickCount++;
                clearTimeout(clickTimer);

                if (clickCount >= 5) {
                    triggerEasterEgg();
                    clickCount = 0;
                } else {
                    clickTimer = setTimeout(() => { clickCount = 0; }, 2000);
                }
            }
        });
    }

    // Auto-init on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initEasterEgg);
    } else {
        initEasterEgg();
    }
})();
