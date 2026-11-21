/* Decorative stars and image depth; all original content works without this file. */
(() => {
    'use strict';
    const hero = document.querySelector('.mot-hero');
    const canvas = hero?.querySelector('.mot-galaxy canvas');
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
    const toggle = hero.querySelector('.mot-motion-toggle');
    const tilt = hero.querySelector('.mot-diagnostic-tilt');
    const palette = getComputedStyle(document.documentElement);
    const accent = palette.getPropertyValue('--purple-accent').trim();
    const pale = palette.getPropertyValue('--gold-pale').trim();
    let width = 0, height = 0, stars = [], frame = 0, last = 0, elapsed = 0;
    let visible = false, manuallyPaused = false;
    const shouldAnimate = () => visible && !document.hidden && !reduced.matches && !manuallyPaused;

    function draw() {
        ctx.clearRect(0, 0, width, height);
        for (const star of stars) {
            ctx.globalAlpha = star.alpha * (0.78 + 0.22 * Math.sin(elapsed * 0.0005 + star.phase));
            ctx.fillStyle = star.color;
            ctx.beginPath();
            ctx.arc(star.x * width, star.y * height, star.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        // One short shooting star per cycle, always behind the content.
        const progress = (elapsed % 10500) / 1400;
        if (!reduced.matches && progress < 1 && !manuallyPaused) {
            const x = width * (0.48 + progress * 0.5);
            const y = height * (0.03 + progress * 0.35);
            const length = Math.min(120, width * 0.15);
            const trail = ctx.createLinearGradient(x - length, y - length * 0.5, x, y);
            trail.addColorStop(0, 'transparent'); trail.addColorStop(1, pale);
            ctx.globalAlpha = Math.sin(progress * Math.PI) * 0.75;
            ctx.strokeStyle = trail; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(x - length, y - length * 0.5); ctx.lineTo(x, y); ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }
    function resize() {
        width = hero.clientWidth; height = hero.clientHeight;
        const ratio = Math.min(devicePixelRatio || 1, 2);
        canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        stars = Array.from({ length: Math.min(150, Math.round(width * height / 6500)) }, () => ({
            x: Math.random(), y: Math.random(), size: Math.random() * 1.05 + 0.3,
            alpha: Math.random() * 0.5 + 0.15, phase: Math.random() * Math.PI * 2,
            color: Math.random() > 0.65 ? accent : pale
        }));
        draw();
    }
    function tick(now) {
        frame = 0;
        if (!shouldAnimate()) return;
        if (now - last >= 32) {
            elapsed += last ? Math.min(now - last, 64) : 32;
            last = now; draw();
        }
        frame = requestAnimationFrame(tick);
    }
    function sync() {
        if (frame) cancelAnimationFrame(frame);
        frame = 0; last = 0;
        const paused = reduced.matches || manuallyPaused || !visible || document.hidden;
        hero.toggleAttribute('data-motion-paused', paused);
        toggle.hidden = false;
        toggle.textContent = reduced.matches ? 'Reduced motion enabled' : manuallyPaused ? 'Play animation' : 'Pause animation';
        toggle.setAttribute('aria-pressed', String(!paused));
        if (shouldAnimate()) frame = requestAnimationFrame(tick);
        else draw();
    }
    toggle.addEventListener('click', () => {
        // The system preference takes priority; keep a clear explanation on the control.
        if (reduced.matches) return;
        manuallyPaused = !manuallyPaused; sync();
    });
    function motionPreference() {
        toggle.disabled = reduced.matches;
        toggle.title = reduced.matches ? 'Animation disabled by your reduced motion preference' : '';
        toggle.textContent = reduced.matches ? 'Reduced motion enabled' : 'Pause animation';
        sync();
    }
    hero.addEventListener('pointermove', (event) => {
        if (!shouldAnimate() || !finePointer.matches) return;
        const bounds = hero.getBoundingClientRect();
        tilt.style.setProperty('--mot-tilt-y', `${((event.clientX - bounds.left) / bounds.width - 0.5) * 9}deg`);
        tilt.style.setProperty('--mot-tilt-x', `${(0.5 - (event.clientY - bounds.top) / bounds.height) * 6}deg`);
    }, { passive: true });
    hero.addEventListener('pointerleave', () => {
        tilt.style.setProperty('--mot-tilt-x', '0deg'); tilt.style.setProperty('--mot-tilt-y', '0deg');
    });
    new ResizeObserver(resize).observe(hero);
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(hero);
    document.addEventListener('visibilitychange', sync);
    reduced.addEventListener('change', motionPreference);
    resize(); motionPreference();
})();
