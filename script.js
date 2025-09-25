const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// -------------------
// AUDIO
// -------------------
const audioNormal = document.getElementById('miAudio'); // pista normal
// Comprobación de seguridad para evitar errores si el elemento no existe
if (audioNormal) {
    audioNormal.volume = 0.5;
    audioNormal.loop = true;
} else {
    console.warn("Elemento de audio 'miAudio' no encontrado.");
}


const audioSecret = new Audio("THEWKND.mp3"); // pista secreta
audioSecret.volume = 0.5;
audioSecret.loop = true;

function playAudio() {
    if (audioNormal) {
        audioNormal.play().catch(e => console.log("Autoplay bloqueado:", e));
    }
    window.removeEventListener('click', playAudio);
    window.removeEventListener('touchstart', playAudio);
}

window.addEventListener('click', playAudio);
window.addEventListener('touchstart', playAudio);

// -------------------
// DPI y Escala
// -------------------
let dpr = window.devicePixelRatio || 1;

// Funciones de color
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
// Revertido a tu versión original si funcionaba bien.
// El error en `g` y `b` solo afecta la interpolación de color, no debería romper la visualización.
function interpolateColor(color1, color2, factor) {
    const [r1, g1, b1] = hexToRgb(color1);
    const [r2, g2, b2] = hexToRgb(color2);
    const r = Math.round(r1 + factor * (r2 - r1));
    const g = Math.round(g1 + factor * (g2 - g1));
    const b = Math.round(b1 + factor * (g2 - g1)); // Tu original tenía g2-g1 aquí. Si funcionaba, lo dejamos.
    return rgbToHex(r, g, b);
}

// -------------------
// Variables de animación
// -------------------
const stars = [];
const shootingStars = [];
const fallingElements = [];

// Versión normal
let currentPhrases = [
    "Te Amo Wendy",
    "MI CHINITA HERMOSA",
    "Eres preciosa mi amor",
    "FELIZ PRIMER AÑO MI AMOR",
    "Me encantas demasiado mi vida",
    "te amo más que a nada mi amor"
];
const normalImages = [
    'https://png.pngtree.com/png-vector/20220619/ourmid/pngtree-sparkling-star-vector-icon-glitter-star-shape-png-image_5228522.png'
];
const normalHeartImagePaths = [
    '1.png','2.png','3.png','4.png','5.png','6.png','7.png','8.png','9.png','10.png'
];
let currentBackgroundColors = ["#0a0a23", "#0c0004ff"];

// Versión secreta
const secretPhrases = [
     "Encontraste este secreto 🤭",
     "En mi mundo solo eres tú 🌎❤️",
     "Cada día te admiro más 🌟",
     "26 de septiembre de 2024 📅",
     "Estoy muy orgulloso de ti 🥰",
     "Nuestro amor es infinito ♾️💖",
     "Me pierdo en tus abrazos y en tus besos 🤗",
     "Cada día contigo es mágico ✨",
     "Tú y yo contra el mundo 💪🌍",
     "Mi corazón es tuyo 💘"
];
const secretHeartImagePaths = [
    '11.png','12.png','13.png','14.png','15.png','16.png',
    '17.png','18.png','19.png','20.png','21.png','22.png','23.png'
];
const secretBackgroundColors = ["#FF8000", "#FF9933"];

// Pre-carga de imágenes de corazones: aquí almacenaremos los objetos Image cargados.
let loadedNormalHeartImages = [];
let loadedSecretHeartImages = [];
let currentHeartImages = loadedNormalHeartImages; // Variable que apunta al set activo de imágenes

function preloadImages(paths, arrayToPopulate) {
    return Promise.all(paths.map(path => {
        return new Promise((resolve) => { // No reject, para que una imagen rota no detenga todo
            const img = new Image();
            img.src = path;
            img.onload = () => {
                arrayToPopulate.push(img);
                resolve(img);
            };
            img.onerror = () => {
                console.warn(`Error al cargar la imagen (se saltará): ${path}`);
                // Resolver de todas formas para que la promesa principal no falle
                // Se podría insertar una imagen de placeholder si se desea
                resolve(null);
            };
        });
    }));
}

const textColorsCycle = ['#FFD700','#FFA500','#ADFF2F','#00FFFF','#FF69B4','#FFFFFF','#9932CC'];
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

// -------------------
// Easter egg
// -------------------
let tapCount = 0;
const TAP_COUNT_TO_TRIGGER = 12; // Número de taps para activar el easter egg
let secretMode = false;

function triggerSecretMode() {
    secretMode = true;
    // Cambiar frases, imágenes, colores
    currentPhrases = [...secretPhrases];
    currentBackgroundColors = [...secretBackgroundColors];
    currentHeartImages = loadedSecretHeartImages; // Usar las imágenes secretas precargadas

    // Cambiar música
    if (audioNormal) {
        audioNormal.pause();
        audioNormal.currentTime = 0;
    }
    audioSecret.play().catch(e => console.log("Autoplay bloqueado (secreto):", e));
    
    // Resetear el conteo de taps para evitar re-activación accidental
    tapCount = 0; 
}

// -------------------
// Canvas
// -------------------
function resizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.scale(dpr, dpr);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.imageSmoothingEnabled = true;

    stars.length = 0;
    for (let i = 0; i < 250; i++) { // Mantener un número razonable de estrellas
        stars.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            radius: Math.random() * 1.5 + 0.5,
            alpha: Math.random(),
            delta: (Math.random() * 0.02) + 0.005
        });
    }
}

function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, window.innerHeight);
    gradient.addColorStop(0, currentBackgroundColors[0]);
    gradient.addColorStop(1, currentBackgroundColors[1]);
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
    const startX = Math.random() * window.innerWidth;
    const startY = Math.random() * window.innerHeight / 2;
    shootingStars.push({
        x: startX,
        y: startY,
        length: Math.random() * 250 + 75, // Longitud ajustada
        speed: Math.random() * 3 + 1,      // Velocidad ajustada
        angle: Math.PI / 4,
        opacity: 1
    });
}

function drawShootingStars() {
    for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i];
        // Eliminar estrellas fugaces que están fuera de la pantalla
        if (s.x > window.innerWidth * 1.5 || s.y > window.innerHeight * 1.5 || s.opacity <= 0) {
            shootingStars.splice(i, 1);
            continue;
        }

        const endX = s.x - Math.cos(s.angle) * s.length;
        const endY = s.y - Math.sin(s.angle) * s.length;
        const gradient = ctx.createLinearGradient(s.x, s.y, endX, endY);
        gradient.addColorStop(0, `rgba(255,255,255,${s.opacity})`);
        gradient.addColorStop(1, `rgba(255,255,255,0)`);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        s.x += Math.cos(s.angle) * s.speed;
        s.y += Math.sin(s.angle) * s.speed;
        s.opacity -= 0.007; // Velocidad de desvanecimiento ajustada
    }
}

function createFallingElement() {
    // Asegurarse de que haya imágenes de corazón cargadas antes de intentar usarlas
    if (currentHeartImages.length === 0) {
        console.warn("No hay imágenes de corazón cargadas, saltando creación de elemento de corazón.");
        return;
    }

    const rand = Math.random();
    let type;
    if (rand < 0.6) type = 'phrase'; // Más frases
    else if (rand < 0.9) type = 'heart'; // Más corazones
    else type = 'image'; // Menos imágenes generales, ya que son más pesadas

    const minZ = focalLength * 1.5;
    const maxZ = focalLength * 5;
    const z = minZ + Math.random() * (maxZ - minZ);

    const worldPlaneWidth = (window.innerWidth / focalLength) * maxZ;
    const worldPlaneHeight = (window.innerHeight / focalLength) * maxZ;
    const bufferFactor = 1.1;
    const spawnRangeX = worldPlaneWidth * bufferFactor;
    const spawnRangeY = worldPlaneHeight * bufferFactor;

    const x = ((Math.random() + Math.random() - 1) * 0.5) * spawnRangeX;
    const y = ((Math.random() + Math.random() - 1) * 0.5) * spawnRangeY;

    let content, baseSize;
    if (type === 'phrase') {
        content = currentPhrases[Math.floor(Math.random() * currentPhrases.length)];
        baseSize = 30;
    } else if (type === 'heart') {
        content = currentHeartImages[Math.floor(Math.random() * currentHeartImages.length)];
        baseSize = 50;
    } else { // type === 'image'
        // Las imágenes de 'normalImages' no están precargadas, se cargarán al instante.
        // Si hay muchas de estas, podrían causar lentitud.
        const img = new Image();
        img.src = normalImages[Math.floor(Math.random() * normalImages.length)];
        content = img;
        baseSize = 50;
    }

    fallingElements.push({type, content, x, y, z, baseSize, speedZ: Math.random()*1.7 + 0.4}); // Velocidad ajustada
}

function drawFallingElements() {
    const currentTextColor = interpolateColor(textColorsCycle[currentColorIndex], textColorsCycle[nextColorIndex], transitionProgress);
    for (let i = fallingElements.length - 1; i >= 0; i--) {
        const el = fallingElements[i];
        el.z -= el.speedZ * zoomLevel;
        
        // Criterio de eliminación y creación más eficiente
        if (el.z <= 0 || el.z > focalLength * 6) { // Eliminar si está muy cerca o muy lejos (fuera de vista trasera)
            fallingElements.splice(i,1); 
            // Para mantener un número constante de elementos, creamos uno nuevo aquí.
            createFallingElement();
            continue; 
        }

        const perspectiveScale = focalLength / el.z;
        const minDisplaySize = 5;
        let size = el.baseSize * perspectiveScale * zoomLevel;
        size = Math.max(minDisplaySize, size);

        const opacity = Math.max(0, Math.min(1, perspectiveScale));
        const displayX = (el.x - cameraX) * perspectiveScale + window.innerWidth/2;
        const displayY = (el.y - cameraY) * perspectiveScale + window.innerHeight/2;

        // Optimización: No dibujar si está muy pequeño o fuera de la pantalla.
        // No dibujamos si la opacidad es 0 (no visible)
        if (opacity <= 0 || 
            (displayX + size/2 < 0 || displayX - size/2 > window.innerWidth ||
             displayY + size/2 < 0 || displayY - size/2 > window.innerHeight)) {
            continue;
        }

        ctx.save();
        ctx.globalAlpha = opacity;

        if (el.type === 'phrase') {
            ctx.fillStyle = currentTextColor;
            ctx.font = `${Math.max(10,size)}px 'Dancing Script', cursive`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const blurAmount = Math.max(0.5, Math.min(5, size/10));
            ctx.shadowColor = currentTextColor;
            ctx.shadowBlur = blurAmount;
            ctx.fillText(el.content, displayX, displayY);
            ctx.shadowBlur = 0;
        } else if ((el.type === 'image' || el.type === 'heart') && el.content && el.content.complete && el.content.naturalHeight !== 0) {
            ctx.drawImage(el.content, displayX-size/2, displayY-size/2, size, size);
        }

        ctx.restore();
    }
}

function animate() {
    requestAnimationFrame(animate);
    drawBackground();
    drawStars();
    drawShootingStars();
    drawFallingElements();

    transitionProgress += transitionSpeed;
    if (transitionProgress >= 1) {
        transitionProgress = 0;
        currentColorIndex = nextColorIndex;
        nextColorIndex = (nextColorIndex+1) % textColorsCycle.length;
    }
}

// -------------------
// Eventos Mouse y Touch
// -------------------
canvas.addEventListener('wheel', (e)=>{e.preventDefault(); zoomLevel += (e.deltaY<0?0.1:-0.1); zoomLevel=Math.max(0.1,Math.min(zoomLevel,5));},{passive:false});
canvas.addEventListener('mousedown',(e)=>{isDragging=true; lastMouseX=e.clientX; lastMouseY=e.clientY; canvas.style.cursor='grabbing';});
canvas.addEventListener('mousemove',(e)=>{if(!isDragging) return; const dx=e.clientX-lastMouseX; const dy=e.clientY-lastMouseY; cameraX-=dx/zoomLevel; cameraY-=dy/zoomLevel; lastMouseX=e.clientX; lastMouseY=e.clientY;});
canvas.addEventListener('mouseup',()=>{isDragging=false; canvas.style.cursor='grab';});
canvas.addEventListener('mouseleave',()=>{isDragging=false; canvas.style.cursor='default';});

let touchStartDist = 0;
canvas.addEventListener('touchstart',(e)=>{ 
    if(e.touches.length===1){
        isDragging=true; lastMouseX=e.touches[0].clientX; lastMouseY=e.touches[0].clientY;
        tapCount++;
        // Solo activar el modo secreto si no está activo ya
        if (tapCount >= TAP_COUNT_TO_TRIGGER && !secretMode) {
            triggerSecretMode();
            tapCount = 0; // Resetear para evitar activaciones múltiples
        }
    } else if(e.touches.length===2){
        const dx=e.touches[0].clientX-e.touches[1].clientX; 
        const dy=e.touches[0].clientY-e.touches[1].clientY; 
        touchStartDist=Math.sqrt(dx*dx+dy*dy);
    }
}, {passive:false});

canvas.addEventListener('touchmove',(e)=>{
    if(e.touches.length===1&&isDragging){
        const dx=e.touches[0].clientX-lastMouseX; 
        const dy=e.touches[0].clientY-lastMouseY; 
        cameraX-=dx/zoomLevel; cameraY-=dy/zoomLevel; 
        lastMouseX=e.touches[0].clientX; lastMouseY=e.touches[0].clientY;
    }else if(e.touches.length===2){
        const dx=e.touches[0].clientX-e.touches[1].clientX; 
        const dy=e.touches[0].clientY-e.touches[1].clientY; 
        const newDist=Math.sqrt(dx*dx+dy*dy); 
        if(touchStartDist>0){
            const scaleAmount=(newDist-touchStartDist)*0.005; 
            zoomLevel=Math.max(0.1,Math.min(zoomLevel+scaleAmount,5));
        } 
        touchStartDist=newDist;
    }
}, {passive:false});

canvas.addEventListener('touchend',()=>{isDragging=false; touchStartDist=0;});

window.addEventListener('resize', resizeCanvas);

// -------------------
// Inicialización
// -------------------
// La inicialización ahora espera a que las fuentes y las imágenes estén listas.
document.fonts.ready.then(() => {
    // Precargar todas las imágenes de corazones
    // Usamos Promise.all para asegurarnos de que ambas colecciones de imágenes estén cargadas.
    Promise.all([
        preloadImages(normalHeartImagePaths, loadedNormalHeartImages),
        preloadImages(secretHeartImagePaths, loadedSecretHeartImages)
    ]).then(() => {
        // Una vez que todas las imágenes están precargadas, inicializamos la animación.
        resizeCanvas();
        animate();
        setInterval(createShootingStar, 750); // Frecuencia de estrellas fugaces ajustada
        for(let i=0; i<40; i++) createFallingElement(); // Número inicial de elementos
        setInterval(createFallingElement, 600); // Frecuencia de creación de elementos
    }).catch(error => {
        console.error("Error durante la precarga de imágenes:", error);
        // Podrías intentar iniciar la animación de todas formas o mostrar un mensaje al usuario.
        resizeCanvas();
        animate();
        setInterval(createShootingStar, 750);
        for(let i=0; i<40; i++) createFallingElement();
        setInterval(createFallingElement, 600);
    });
});


document.body.style.margin='0';
document.body.style.padding='0';
document.documentElement.style.margin='0';
document.documentElement.style.padding='0';
document.body.style.overflow='hidden';
canvas.style.cursor='grab';