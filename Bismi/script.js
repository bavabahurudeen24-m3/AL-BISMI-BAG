const menuButton = document.querySelector('.menu-btn');
const header = document.querySelector('.nav');
menuButton?.addEventListener('click', () => {
  const isOpen = header.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', isOpen);
});
document.querySelectorAll('.nav nav a').forEach(link => link.addEventListener('click', () => {
  header.classList.remove('open');
  menuButton?.setAttribute('aria-expanded', 'false');
}));

// Contact dialog: buttons work with mouse, touch and keyboard.
const contactDialog = document.querySelector('#contact-dialog');
const contactClose = contactDialog?.querySelector('.contact-dialog__close');
const contactTriggers = document.querySelectorAll('.contact-trigger');

function closeContactDialog() {
  if (!contactDialog) return;
  contactDialog.hidden = true;
}

contactTriggers.forEach(trigger => trigger.addEventListener('click', event => {
  event.preventDefault();
  if (!contactDialog) return;
  contactDialog.hidden = false;
  contactClose?.focus();
}));

contactClose?.addEventListener('click', closeContactDialog);
contactDialog?.addEventListener('click', event => {
  if (event.target === contactDialog) closeContactDialog();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeContactDialog();
});

/*
  Desktop particle mesh. Adjust PARTICLE_COLOR, LINK_COLOR, PARTICLE_SPEED,
  PARTICLE_DENSITY and CURSOR_RADIUS to tune the appearance and responsiveness.
*/
const canvas = document.querySelector('.interactive-background');
const desktopMotion = window.matchMedia('(min-width: 761px) and (pointer: fine)');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

if (canvas) {
  const context = canvas.getContext('2d', { alpha: true });
  const PARTICLE_COLOR = '168, 111, 69';
  const LINK_COLOR = '38, 79, 67';
  const PARTICLE_SPEED = 0.18;
  const PARTICLE_DENSITY = 18000;
  const CURSOR_RADIUS = 165;
  const LINK_DISTANCE = 120;
  let particles = [];
  let frameId = 0;
  let active = false;
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  const cursor = { x: -1000, y: -1000 };

  const createParticle = () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * PARTICLE_SPEED,
    vy: (Math.random() - 0.5) * PARTICLE_SPEED,
    size: Math.random() * 1.3 + 0.65
  });

  function resizeCanvas() {
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    const particleCount = Math.min(96, Math.max(38, Math.round((width * height) / PARTICLE_DENSITY)));
    particles = Array.from({ length: particleCount }, createParticle);
  }

  function drawMesh() {
    context.clearRect(0, 0, width, height);
    for (let i = 0; i < particles.length; i += 1) {
      const particle = particles[i];
      particle.x += particle.vx;
      particle.y += particle.vy;
      if (particle.x < -12 || particle.x > width + 12) particle.vx *= -1;
      if (particle.y < -12 || particle.y > height + 12) particle.vy *= -1;

      const dx = particle.x - cursor.x;
      const dy = particle.y - cursor.y;
      const cursorDistance = Math.hypot(dx, dy);
      if (cursorDistance < CURSOR_RADIUS && cursorDistance > 0) {
        const force = (CURSOR_RADIUS - cursorDistance) / CURSOR_RADIUS;
        particle.x += (dx / cursorDistance) * force * 1.3;
        particle.y += (dy / cursorDistance) * force * 1.3;
      }

      for (let j = i + 1; j < particles.length; j += 1) {
        const other = particles[j];
        const distance = Math.hypot(particle.x - other.x, particle.y - other.y);
        if (distance < LINK_DISTANCE) {
          context.beginPath();
          context.moveTo(particle.x, particle.y);
          context.lineTo(other.x, other.y);
          context.strokeStyle = `rgba(${LINK_COLOR}, ${0.12 * (1 - distance / LINK_DISTANCE)})`;
          context.lineWidth = 0.6;
          context.stroke();
        }
      }

      if (cursorDistance < CURSOR_RADIUS) {
        context.beginPath();
        context.moveTo(particle.x, particle.y);
        context.lineTo(cursor.x, cursor.y);
        context.strokeStyle = `rgba(${PARTICLE_COLOR}, ${0.16 * (1 - cursorDistance / CURSOR_RADIUS)})`;
        context.lineWidth = 0.7;
        context.stroke();
      }

      context.beginPath();
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      context.fillStyle = `rgba(${PARTICLE_COLOR}, 0.42)`;
      context.fill();
    }
    frameId = requestAnimationFrame(drawMesh);
  }

  function startDesktopMotion() {
    if (active || !desktopMotion.matches || reduceMotion.matches) return;
    active = true;
    resizeCanvas();
    frameId = requestAnimationFrame(drawMesh);
  }

  function stopDesktopMotion() {
    active = false;
    cancelAnimationFrame(frameId);
    context.clearRect(0, 0, width, height);
  }

  window.addEventListener('pointermove', event => {
    if (!active) return;
    cursor.x = event.clientX;
    cursor.y = event.clientY;
  }, { passive: true });
  window.addEventListener('resize', () => active && resizeCanvas(), { passive: true });
  document.addEventListener('visibilitychange', () => document.hidden ? stopDesktopMotion() : startDesktopMotion());
  desktopMotion.addEventListener('change', () => desktopMotion.matches ? startDesktopMotion() : stopDesktopMotion());
  reduceMotion.addEventListener('change', () => reduceMotion.matches ? stopDesktopMotion() : startDesktopMotion());
  startDesktopMotion();
}

/*
  Hero WebGL background: procedural waves, liquid forms and glow remain behind
  the product. Change the palette constants in the fragment shader to retint it.
*/
const heroCanvas = document.querySelector('.hero-webgl-background');
const heroSection = document.querySelector('.luxury-hero');
const heroDesktop = window.matchMedia('(min-width: 761px) and (pointer: fine)');

if (heroCanvas && heroSection) {
  const gl = heroCanvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
  let heroFrame = 0;
  let heroRunning = false;
  let heroProgram;
  let heroPosition;
  let heroResolution;
  let heroTime;
  let heroMouse;
  const heroPointer = { x: .5, y: .5 };

  const vertexShader = `
    attribute vec2 position;
    void main() { gl_Position = vec4(position, 0.0, 1.0); }
  `;
  const fragmentShader = `
    precision mediump float;
    uniform vec2 resolution;
    uniform vec2 mouse;
    uniform float time;

    float wave(vec2 p) {
      return sin(p.x * 2.2 + time * .16) * .12 + sin(p.y * 3.1 - time * .11) * .08;
    }
    float metaball(vec2 p, vec2 center, float radius) {
      return radius / max(length(p - center), .001);
    }
    void main() {
      vec2 uv = gl_FragCoord.xy / resolution.xy;
      vec2 p = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
      vec2 cursor = (mouse * 2.0 - 1.0) * vec2(resolution.x / resolution.y, 1.0);
      p += (cursor - p) * .028;
      float flow = wave(p * 1.4);
      float liquid = metaball(p + vec2(sin(time * .10) * .19, cos(time * .12) * .1), vec2(.42, -.1), .11);
      liquid += metaball(p + vec2(cos(time * .08) * .15, sin(time * .11) * .14), vec2(-.48, .32), .09);
      float band = smoothstep(.026, .0, abs(sin((p.y + flow) * 5.5 + time * .11))) * .18;
      float curve = smoothstep(.02, .0, abs(length(p - vec2(.38, .03)) - .62)) * .20;
      float vignette = smoothstep(1.5, .18, length(p));
      vec3 base = vec3(.045, .065, .055);
      vec3 forest = vec3(.075, .16, .13);
      vec3 champagne = vec3(.78, .59, .36);
      vec3 colour = mix(base, forest, uv.y + flow + .18);
      colour += champagne * (band + curve + smoothstep(1.05, 2.1, liquid) * .11);
      colour *= .65 + vignette * .5;
      gl_FragColor = vec4(colour, 1.0);
    }
  `;

  function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  }

  function setupHeroWebGL() {
    const program = gl.createProgram();
    gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vertexShader));
    gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fragmentShader));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return false;
    heroProgram = program;
    heroPosition = gl.getAttribLocation(program, 'position');
    heroResolution = gl.getUniformLocation(program, 'resolution');
    heroTime = gl.getUniformLocation(program, 'time');
    heroMouse = gl.getUniformLocation(program, 'mouse');
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    return true;
  }

  function resizeHeroWebGL() {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    const rect = heroSection.getBoundingClientRect();
    heroCanvas.width = Math.round(rect.width * ratio);
    heroCanvas.height = Math.round(rect.height * ratio);
    gl.viewport(0, 0, heroCanvas.width, heroCanvas.height);
  }

  function renderHeroWebGL(timestamp) {
    gl.useProgram(heroProgram);
    gl.enableVertexAttribArray(heroPosition);
    gl.vertexAttribPointer(heroPosition, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(heroResolution, heroCanvas.width, heroCanvas.height);
    gl.uniform2f(heroMouse, heroPointer.x, heroPointer.y);
    gl.uniform1f(heroTime, timestamp * .001);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    heroFrame = requestAnimationFrame(renderHeroWebGL);
  }

  function startHeroWebGL() {
    if (heroRunning || !heroDesktop.matches || reduceMotion.matches || !heroProgram) return;
    heroRunning = true;
    resizeHeroWebGL();
    heroFrame = requestAnimationFrame(renderHeroWebGL);
  }

  function stopHeroWebGL() {
    heroRunning = false;
    cancelAnimationFrame(heroFrame);
  }

  if (gl && setupHeroWebGL()) {
    heroSection.addEventListener('pointermove', event => {
      const bounds = heroSection.getBoundingClientRect();
      heroPointer.x = (event.clientX - bounds.left) / bounds.width;
      heroPointer.y = 1 - (event.clientY - bounds.top) / bounds.height;
    }, { passive: true });
    window.addEventListener('resize', () => heroRunning && resizeHeroWebGL(), { passive: true });
    document.addEventListener('visibilitychange', () => document.hidden ? stopHeroWebGL() : startHeroWebGL());
    heroDesktop.addEventListener('change', () => heroDesktop.matches ? startHeroWebGL() : stopHeroWebGL());
    reduceMotion.addEventListener('change', () => reduceMotion.matches ? stopHeroWebGL() : startHeroWebGL());
    startHeroWebGL();
  }
}
