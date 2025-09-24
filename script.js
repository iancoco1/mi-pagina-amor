const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Almacena el factor de escala DPI para pantallas de alta resolución
let dpr = window.devicePixelRatio || 1;

function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r, g, b];
}

function rgbToHex(r, g, b) {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function interpolateColor(color1, color2, factor) {
    const [r1, g1, b1] = hexToRgb(color1);
    const [r2, g2, b2] = hexToRgb(color2);
    const r = Math.round(r1 + factor * (r2 - r1));
    const g = Math.round(g1 + factor * (g2 - g1));
    const b = Math.round(b1 + factor * (b2 - b1));
    return rgbToHex(r, g, b);
}

const stars = [];
const shootingStars = [];
const fallingElements = [];

const phrases = [
    "Te Amo Wendy",
    "MI CHINITA HERMOSA",
    "Eres preciosa mi amor",
    "FELIZ PRIMER AÑO MI AMOR",
    "Me encantas demasiado mi vida",
    "te amo más que a nada mi amor"
];

const images = [
    'https://png.pngtree.com/png-vector/20220619/ourmid/pngtree-sparkling-star-vector-icon-glitter-star-shape-png-image_5228522.png'
];

// Ahora son 10 imágenes en total
const heartImages = [
    '1.png',
    '2.png',
    '3.png',
    '4.png',
    '5.png',
    '6.png',
    '7.png',
    '8.png',
    '9.png',
    '10.png'
];

const textColorsCycle = [
    '#FFD700', // Oro
    '#FFA500', // Naranja
    '#ADFF2F', // Verde amarillento
    '#00FFFF', // Cian
    '#FF69B4', // Rosa fuerte
    '#FFFFFF', // Blanco
    '#9932CC'  // Púrpura
];
let currentColorIndex = 0;
let nextColorIndex = 1;
let transitionProgress = 0;
const transitionSpeed = 0.005;

let cameraX = 0;
let cameraY = 0;
let zoomLevel = 1;
const focalLength = 300; 

let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

function resizeCanvas() {
    dpr = window.devicePixelRatio || 1; // Recalcular DPR
    
    // Establecer las dimensiones físicas del canvas
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;

    // Escalar el contexto de dibujo para que se adapte al DPR
    // Esto hace que todo lo que dibujemos se vea más nítido
    ctx.scale(dpr, dpr);

    // Ajustar las dimensiones de visualización del canvas con CSS
    // Esto es importante para que el canvas no aparezca "demasiado grande"
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';

    // Desactivar el suavizado de imágenes para evitar que se vean borrosas por el escalado interno
    ctx.imageSmoothingEnabled = true; // false podría ser demasiado pixelado, true es generalmente mejor
    ctx.webkitImageSmoothingEnabled = true;
    ctx.mozImageSmoothingEnabled = true;
    ctx.msImageSmoothingEnabled = true;

    // Reiniciar estrellas para que se ajusten a las nuevas dimensiones lógicas
    stars.length = 0;
    for (let i = 0; i < 300; i++) {
        stars.push({
            // Las posiciones ahora son en coordenadas lógicas (CSS píxeles)
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            radius: Math.random() * 1.5 + 0.5,
            alpha: Math.random(),
            delta: (Math.random() * 0.02) + 0.005
        });
    }
}

function drawBackground() {
    // Usar window.innerWidth/Height para el gradiente porque ctx.scale ya se encarga del DPR
    const gradient = ctx.createLinearGradient(0, 0, 0, window.innerHeight);
    gradient.addColorStop(0, "#0a0a23");
    gradient.addColorStop(1, "#0c0004ff");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
}

function drawStars() {
    stars.forEach(star => {
        star.alpha += star.delta;
        if (star.alpha <= 0 || star.alpha >= 1) star.delta *= -1;
        ctx.save();
        ctx.globalAlpha = star.alpha;
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

function createShootingStar() {
    // Usar window.innerWidth/Height para la posición inicial
    const startX = Math.random() * window.innerWidth;
    const startY = Math.random() * window.innerHeight / 2;
    shootingStars.push({
        x: startX,
        y: startY,
        length: Math.random() * 300 + 100,
        speed: Math.random() * 4 + 2, // más lento
        angle: Math.PI / 4,
        opacity: 1
    });
}

function drawShootingStars() {
    for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i];

        const endX = s.x - Math.cos(s.angle) * s.length;
        const endY = s.y - Math.sin(s.angle) * s.length;

        const gradient = ctx.createLinearGradient(s.x, s.y, endX, endY);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${s.opacity})`);
        gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        s.x += Math.cos(s.angle) * s.speed;
        s.y += Math.sin(s.angle) * s.speed;
        s.opacity -= 0.01;

        if (s.opacity <= 0) {
            shootingStars.splice(i, 1);
        }
    }
}

function createFallingElement() {
    const rand = Math.random();
    let type;
    if (rand < 0.6) {
        type = 'phrase';
    } else if (rand < 0.8) {
        type = 'image';
    } else {
        type = 'heart';
    }

    const minZ = focalLength * 1.5;
    const maxZ = focalLength * 5;
    const initialZ = minZ + Math.random() * (maxZ - minZ);

    // Usar window.innerWidth/Height para calcular el tamaño del "mundo"
    const worldPlaneWidth = (window.innerWidth / focalLength) * maxZ;
    const worldPlaneHeight = (window.innerHeight / focalLength) * maxZ;

    const bufferFactor = 1.1; 
    const spawnRangeX = worldPlaneWidth * bufferFactor;
    const spawnRangeY = worldPlaneHeight * bufferFactor;

    const initialX = ((Math.random() + Math.random() - 1) * 0.5) * spawnRangeX;
    const initialY = ((Math.random() + Math.random() - 1) * 0.5) * spawnRangeY;

    let content;
    let baseSize;

    if (type === 'phrase') {
        content = phrases[Math.floor(Math.random() * phrases.length)];
        baseSize = 30;
    } else if (type === 'heart') {
        content = new Image();
        content.src = heartImages[Math.floor(Math.random() * heartImages.length)];
        content.onload = () => {};
        content.onerror = () => {
            console.error("Failed to load heart image:", content.src);
            const index = fallingElements.findIndex(el => el.content === content);
            if (index > -1) fallingElements.splice(index, 1);
        };
        baseSize = 50;
    } else { 
        content = new Image();
        content.src = images[Math.floor(Math.random() * images.length)];
        content.onload = () => {};
        content.onerror = () => {
            console.error("Failed to load image:", content.src);
            const index = fallingElements.findIndex(el => el.content === content);
            if (index > -1) fallingElements.splice(index, 1);
        };
        baseSize = 50;
    }

    fallingElements.push({
        type: type,
        content: content,
        x: initialX,
        y: initialY,
        z: initialZ,
        baseSize: baseSize,
        speedZ: Math.random() * 2 + 0.5, // más lento
    });
}

function drawFallingElements() {
    const currentTextColor = interpolateColor(
        textColorsCycle[currentColorIndex],
        textColorsCycle[nextColorIndex],
        transitionProgress
    );

    for (let i = fallingElements.length - 1; i >= 0; i--) {
        const el = fallingElements[i];

        el.z -= el.speedZ * zoomLevel;

        if (el.z <= 0) {
            fallingElements.splice(i, 1);
            createFallingElement();
            continue;
        }

        const perspectiveScale = focalLength / el.z;

        // Asegúrate de que el tamaño mínimo sea razonable para evitar que desaparezcan o se pixelicen demasiado
        const minDisplaySize = 5; // Un tamaño mínimo en píxeles lógicos
        let size = el.baseSize * perspectiveScale * zoomLevel;
        size = Math.max(minDisplaySize, size); // Asegura un tamaño mínimo

        const opacity = Math.max(0, Math.min(1, perspectiveScale));

        // Usar window.innerWidth/Height
        const displayX = (el.x - cameraX) * perspectiveScale + window.innerWidth / 2;
        const displayY = (el.y - cameraY) * perspectiveScale + window.innerHeight / 2;

        ctx.save();
        ctx.globalAlpha = opacity;

        if (el.type === 'phrase') {
            ctx.fillStyle = currentTextColor;
            // Usa 'px' explícitamente y asegúrate de que el tamaño de la fuente tenga un mínimo para legibilidad
            ctx.font = `${Math.max(10, size)}px 'Indie Flower', cursive`; 
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Ajusta el shadowBlur para que sea proporcional al tamaño del texto
            // Reduce el blur a medida que el texto se hace más pequeño
            const blurAmount = Math.max(0.5, Math.min(5, size / 10)); // Ajustar este factor
            ctx.shadowColor = currentTextColor;
            ctx.shadowBlur = blurAmount;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            // Optimización: Desactivar antialiasing para texto muy pequeño si aún se ve mal, o dejarlo en automático
            // ctx.textRendering = 'optimizeLegibility'; // Puede ayudar en algunos navegadores

            ctx.fillText(el.content, displayX, displayY);

            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;

        } else if ((el.type === 'image' || el.type === 'heart') && el.content.complete && el.content.naturalHeight !== 0) {
            // imageSmoothingEnabled ya está manejado en resizeCanvas para el contexto
            ctx.drawImage(el.content, displayX - size / 2, displayY - size / 2, size, size);
        }

        ctx.restore();

        // Eliminar elementos que están fuera de la vista
        // Usa window.innerWidth/Height
        if ((displayX + size / 2 < 0 || displayX - size / 2 > window.innerWidth ||
             displayY + size / 2 < 0 || displayY - size / 2 > window.innerHeight) && el.z > focalLength) {
            fallingElements.splice(i, 1);
            createFallingElement();
        }
    }
}

function animate() {
    requestAnimationFrame(animate);

    // No es necesario clearRect si el drawBackground cubre todo
    // ctx.clearRect(0, 0, canvas.width, canvas.height); 

    drawBackground();
    drawStars();
    drawShootingStars();
    drawFallingElements();

    transitionProgress += transitionSpeed;
    if (transitionProgress >= 1) {
        transitionProgress = 0;
        currentColorIndex = nextColorIndex;
        nextColorIndex = (nextColorIndex + 1) % textColorsCycle.length;
    }
}

// -------------------
// Eventos PC (mouse)
// -------------------
canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const scaleAmount = 0.1;
    if (event.deltaY < 0) {
        zoomLevel += scaleAmount;
    } else {
        zoomLevel -= scaleAmount;
    }
    zoomLevel = Math.max(0.1, Math.min(zoomLevel, 5));
}, { passive: false });

canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    canvas.style.cursor = 'grabbing';
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    // Dividir por zoomLevel para que el arrastre se sienta más natural con el zoom
    cameraX -= dx / zoomLevel; 
    cameraY -= dy / zoomLevel;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
    canvas.style.cursor = 'grab';
});

canvas.addEventListener('mouseleave', () => {
    isDragging = false;
    canvas.style.cursor = 'default';
});

// -------------------
// Eventos iPhone/Touch
// -------------------
let touchStartDist = 0;

canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
        isDragging = true;
        lastMouseX = e.touches[0].clientX;
        lastMouseY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchStartDist = Math.sqrt(dx * dx + dy * dy);
    }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && isDragging) {
        const dx = e.touches[0].clientX - lastMouseX;
        const dy = e.touches[0].clientY - lastMouseY;
        // Dividir por zoomLevel para el arrastre táctil también
        cameraX -= dx / zoomLevel;
        cameraY -= dy / zoomLevel;
        lastMouseX = e.touches[0].clientX;
        lastMouseY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const newDist = Math.sqrt(dx * dx + dy * dy);
        if (touchStartDist > 0) {
            const scaleAmount = (newDist - touchStartDist) * 0.005;
            zoomLevel = Math.max(0.1, Math.min(zoomLevel + scaleAmount, 5));
        }
        touchStartDist = newDist;
    }
}, { passive: false });

canvas.addEventListener('touchend', () => {
    isDragging = false;
    touchStartDist = 0;
});

window.addEventListener('resize', resizeCanvas);

// Cargar la fuente personalizada antes de llamar a resizeCanvas y animate
document.fonts.ready.then(() => {
    console.log("Fonts loaded.");
    resizeCanvas();
    animate();

    setInterval(createShootingStar, 500);

    const initialFallingElementsCount = 50;
    for (let i = 0; i < initialFallingElementsCount; i++) {
        createFallingElement();
    }

    setInterval(createFallingElement, 500); // más lento
});

// Asegurarse de que el body y html no tengan márgenes ni padding para que el canvas ocupe toda la pantalla
document.body.style.margin = '0';
document.body.style.padding = '0';
document.documentElement.style.margin = '0';
document.documentElement.style.padding = '0';
document.body.style.overflow = 'hidden'; // Evita scrollbars
// Establecer el cursor por defecto en el canvas
canvas.style.cursor = 'grab';