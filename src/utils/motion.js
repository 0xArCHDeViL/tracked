import { animate } from 'animejs';

/**
 * Tactile spring micro-interaction on button tap
 */
export function animatePress(target) {
  if (!target) return;
  try {
    animate(target, {
      scale: [1, 0.90, 1.05, 1],
      duration: 320,
      ease: 'outElastic(1, 0.6)',
    });
  } catch (e) {}
}

/**
 * Neo-Brutalist confetti particles burst on achievement
 */
export function createCelebrationBurst(x, y) {
  if (typeof document === 'undefined') return;

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = '100vw';
  container.style.height = '100vh';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '9999';
  document.body.appendChild(container);

  const colors = ['#FF4B1F', '#0047AB', '#1A8A3E', '#B8860B', '#1A1A1A', '#F4F1EA'];
  const particleCount = 28;

  const originX = x || window.innerWidth / 2;
  const originY = y || window.innerHeight / 3;

  for (let i = 0; i < particleCount; i++) {
    const el = document.createElement('div');
    const size = Math.floor(Math.random() * 8) + 8; // 8px to 16px square
    const color = colors[i % colors.length];

    el.style.position = 'absolute';
    el.style.left = `${originX}px`;
    el.style.top = `${originY}px`;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.backgroundColor = color;
    el.style.border = '1.5px solid #1A1A1A';
    el.style.borderRadius = i % 3 === 0 ? '50%' : '1px';

    container.appendChild(el);

    const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
    const distance = Math.random() * 180 + 70;
    const destX = Math.cos(angle) * distance;
    const destY = Math.sin(angle) * distance + 50; // add gravity

    try {
      animate(el, {
        translateX: destX,
        translateY: destY,
        rotate: Math.random() * 720 - 360,
        opacity: [1, 0],
        scale: [1, 0.4],
        duration: Math.random() * 400 + 700,
        ease: 'outQuad',
      });
    } catch (e) {}
  }

  setTimeout(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }, 1300);
}
