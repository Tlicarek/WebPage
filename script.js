const pulses = document.querySelectorAll('[data-emit="pulse"]');
const root = document.documentElement;

function createRipple(event) {
  const button = event.currentTarget;
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
  button.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
}

pulses.forEach((button) => {
  button.addEventListener('click', createRipple);
});

// Soft parallax effect for hero orb
const orb = document.querySelector('.hero-orb .orb');
if (orb) {
  document.addEventListener('pointermove', (event) => {
    const x = (event.clientX / window.innerWidth - 0.5) * 12;
    const y = (event.clientY / window.innerHeight - 0.5) * 12;
    orb.style.transform = `translate(${x}px, ${y}px)`;
  });
}

// Toggle accent hue on keypress for playful interaction
let hueShift = 0;
document.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === 'h') {
    hueShift = (hueShift + 40) % 360;
    root.style.setProperty('--primary', `hsl(${160 + hueShift}, 100%, 70%)`);
    root.style.setProperty('--accent', `hsl(${300 + hueShift}, 100%, 60%)`);
  }
});
