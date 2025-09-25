const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// -------------------
// AUDIO CON INTERACCIÓN (inicial)
// -------------------
const audio = document.getElementById('miAudio'); // pista principal ya en index.html
audio.volume = 0.5;
audio.loop = true;

function playAudio() {
    audio.play().catch(e => console.log("Autoplay bloqueado:", e));
    window.removeEventListener('click', playAudio);
    window.removeEventListener('touchstart', playAudio);
}
window.addEventListener('click', playAudio);
window.addEventListener('touchstart', playAudio);

// Pista secreta (se cargará y se controla desde aquí)
const secretAudio = new Audio('THEWKND.mp3');
secretAudio.loop = true;
secretAudio.volume = 0; // arrancará mute y haremos fade-in al activarse

// -------------------
// DPI y Escala
// -------------------
let dpr = window.devicePixelRatio || 1;

// Funciones de color / util
function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r, g, b];
}
function rgbToHex(r, g, b) {
    // Clamp 0-255
    r = Math.max(0, Math.min(255, Math.round(r)));
    g = Math.max(0, Math.min(255, Math.round(g)));
    b = Math.max(0, Math.min(255, Math.round(b)));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
function interpolateColor(color1, color2, t) {
    const [r1, g1, b1] = hexToRgb(color1);
    const [r2, g2, b2] = hexToRgb(color2);
    const r = r1 + (r2 - r1) * t;
    const g = g1 + (g2 - g1) * t;
    const b = b1 + (b2 - b1) * t;
    return rgbToHex(r, g, b);
}

// -------------------
// Variables de animación (tal como 1.0)
// -------------------
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

const heartImages = [
    '1.png','2.png','3.png','4.png','5.png','6.png','7.png','8.png','9.png','10.png'
];

// -------------------
// ----- Secreto 1.1: arrays secretas
// -------------------
const secretHeartImages = [
    '11.png','12.png','13.png','14.png','15.png','16.png','17.png',
    '18.png','19.png','20.png','21.png','22.png','23.png'
];
const secretPhrases = Array(secretHeartImages.length).fill("PRUEBA"); // todas "PRUEBA"

// -------------------
// Colores para mezcla de fondo (normal -> secreto)
// -------------------
const bgTopNormal = "#0a0a23";
const bgBottomNormal = "#0c0004ff";
const bgTopSecret = "#ff8c00";   // naranja claro
const bgBottomSecret = "#ff6600"; // naranja profundo

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
// Estado del easter-egg & transición
// -------------------
let easterActive = false; // modo activo o no
let modeTransition = 0;   // 0 = normal, 1 = secreto. Animamos entre ellos para desvanecimiento.
const TRANSITION_DURATION = 1500; // ms
let modeTransitionStart = 0; // timestamp inicio transición
let modeTransitionFrom = 0; // valor inicial

// -------------------
// Tap detection (12 taps)
// -------------------
let tapCount = 0;
let lastTapTime = 0;
const TAP_RESET_MS = 2000; // si pasa más de 2s entre taps se reinicia el contador
const TAPS_NEEDED = 12;

function registerTap() {
    const now = Date.now();
    if (now - lastTapTime > TAP_RESET_MS) {
        tapCount = 0;
    }
    tapCount++;
    lastTapTime = now;
    if (tapCount >= TAPS_NEEDED) {
        tapCount = 0; // reset
        toggleEaster(); // activa o desactiva según el estado actual
    }
}
window.addEventListener('click', (e)=> {
    // sólo contar taps si el target no es un control real (por si hay botones)
    registerTap();
});
window.addEventListener('touchstart', (e)=> {
    registerTap();
}, {passive:true});

// -------------------
// Funciones Canvas
// -------------------
function resizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    // ajustar tamaño físico del canvas
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    // resetear transform y reescalar para DPR
    ctx.setTransform(1,0,0,1,0,0);
    ctx.scale(dpr, dpr);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.imageSmoothingEnabled = true;

    // recrear estrellas en coordenadas lógicas (CSS px)
    stars.length = 0;
    for (let i = 0; i < 300; i++) {
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
    // calcular mezcla entre normal y secreto
    const t = modeTransition; // 0..1
    const top = interpolateColor(bgTopNormal, bgTopSecret, t);
    const bottom = interpolateColor(bgBottomNormal, bgBottomSecret, t);
    const gradient = ctx.createLinearGradient(0, 0, 0, window.innerHeight);
    gradient.addColorStop(0, top);
    gradient.addColorStop(1, bottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
}

function drawStars() {
    stars.forEach(star => {
        star.alpha += star.delta;
        if (star.alpha <= 0 || star.alpha >= 1) star.delta *= -1;
        ctx.save();
        ctx.globalAlpha = star.alpha * (1 - modeTransition * 0.6); // atenua un poco en modo secreto
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
        length: Math.random() * 300 + 100,
        speed: Math.random() * 4 + 2,
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
        gradient.addColorStop(0, `rgba(255,255,255,${s.opacity * (1 - modeTransition * 0.6)})`);
        gradient.addColorStop(1, `rgba(255,255,255,0)`);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        s.x += Math.cos(s.angle) * s.speed;
        s.y += Math.sin(s.angle) * s.speed;
        s.opacity -= 0.01;
        if (s.opacity <= 0) shootingStars.splice(i,1);
    }
}

function createFallingElement() {
    const rand = Math.random();
    let type;
    if (rand < 0.6) type = 'phrase';
    else if (rand < 0.8) type = 'image';
    else type = 'heart';

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
        content = phrases[Math.floor(Math.random() * phrases.length)];
        baseSize = 30;
    } else if (type === 'heart') {
        content = new Image();
        content.src = heartImages[Math.floor(Math.random() * heartImages.length)];
        baseSize = 50;
    } else {
        content = new Image();
        content.src = images[Math.floor(Math.random() * images.length)];
        baseSize = 50;
    }

    fallingElements.push({type, content, x, y, z, baseSize, speedZ: Math.random()*2+0.5});
}

function drawFallingElements() {
    const currentTextColor = interpolateColor(textColorsCycle[currentColorIndex], textColorsCycle[nextColorIndex], transitionProgress);
    // modeTransition es 0..1; usaremos para desvanecer entre contenido normal y secreto.
    for (let i = fallingElements.length - 1; i >= 0; i--) {
        const el = fallingElements[i];
        el.z -= el.speedZ * zoomLevel;
        if (el.z <= 0) { fallingElements.splice(i,1); createFallingElement(); continue; }

        const perspectiveScale = focalLength / el.z;
        const minDisplaySize = 5;
        let size = el.baseSize * perspectiveScale * zoomLevel;
        size = Math.max(minDisplaySize, size);

        const opacity = Math.max(0, Math.min(1, perspectiveScale));
        const displayX = (el.x - cameraX) * perspectiveScale + window.innerWidth/2;
        const displayY = (el.y - cameraY) * perspectiveScale + window.innerHeight/2;

        // dibujamos dos capas cuando hay transición:
        // - capa normal con alpha = opacity * (1 - modeTransition)
        // - capa secreta con alpha = opacity * modeTransition
        const alphaNormal = opacity * (1 - modeTransition);
        const alphaSecret = opacity * modeTransition;

        ctx.save();

        // Capa normal
        if (alphaNormal > 0) {
            ctx.globalAlpha = alphaNormal;
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
            } else if ((el.type === 'image' || el.type === 'heart') && el.content.complete && el.content.naturalHeight !== 0) {
                ctx.drawImage(el.content, displayX-size/2, displayY-size/2, size, size);
            }
        }

        // Capa secreta (misma posición/escala, pero con contenido secreto)
        if (alphaSecret > 0) {
            ctx.globalAlpha = alphaSecret;
            if (el.type === 'phrase') {
                // contenido secreto: "PRUEBA" (elegibilidad: sacado del array secretPhrases, índice aleatorio o por i)
                const secretText = secretPhrases[i % secretPhrases.length] || "PRUEBA";
                // color para secreto lo podemos mantener blanco o usar mezcla con ciclo de color
                const secretColor = interpolateColor(currentTextColor, '#FFFFFF', 1.0); // blanco
                ctx.fillStyle = secretColor;
                ctx.font = `${Math.max(10,size)}px 'Dancing Script', cursive`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const blurAmount = Math.max(0.5, Math.min(5, size/10));
                ctx.shadowColor = secretColor;
                ctx.shadowBlur = blurAmount;
                ctx.fillText(secretText, displayX, displayY);
                ctx.shadowBlur = 0;
            } else if (el.type === 'image' || el.type === 'heart') {
                // dibujar imagen secreta correspondiente (cargamos por índice para variación)
                const idx = i % secretHeartImages.length;
                const img = new Image();
                img.src = secretHeartImages[idx];
                // Si está lista, dibujamos; si no, intentamos sin bloquear
                if (img.complete && img.naturalHeight !== 0) {
                    ctx.drawImage(img, displayX-size/2, displayY-size/2, size, size);
                } else {
                    // para evitar mucho re-draw, asignamos onload para forzar re-draw cuando cargue
                    img.onload = () => {};
                }
            }
        }

        ctx.restore();

        if ((displayX + size/2 < 0 || displayX - size/2 > window.innerWidth ||
            displayY + size/2 < 0 || displayY - size/2 > window.innerHeight) && el.z > focalLength) {
            fallingElements.splice(i,1);
            createFallingElement();
        }
    }
}

// -------------------
// Animación principal
// -------------------
function animate(timestamp) {
    requestAnimationFrame(animate);

    // si hay una transición en curso, actualizamos modeTransition (0..1)
    if (modeTransitionStart > 0) {
        const elapsed = timestamp - modeTransitionStart;
        let t = Math.min(1, elapsed / TRANSITION_DURATION);
        modeTransition = modeTransitionFrom + ( (easterActive ? 1 : 0) - modeTransitionFrom ) * t;
        if (t >= 1) {
            modeTransitionStart = 0;
            modeTransitionFrom = modeTransition;
        }
    }

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
canvas.addEventListener('wheel', (e)=>{ e.preventDefault(); zoomLevel += (e.deltaY<0?0.1:-0.1); zoomLevel=Math.max(0.1,Math.min(zoomLevel,5)); }, {passive:false});
canvas.addEventListener('mousedown',(e)=>{ isDragging=true; lastMouseX=e.clientX; lastMouseY=e.clientY; canvas.style.cursor='grabbing'; });
canvas.addEventListener('mousemove',(e)=>{ if(!isDragging) return; const dx=e.clientX-lastMouseX; const dy=e.clientY-lastMouseY; cameraX-=dx/zoomLevel; cameraY-=dy/zoomLevel; lastMouseX=e.clientX; lastMouseY=e.clientY; });
canvas.addEventListener('mouseup',()=>{ isDragging=false; canvas.style.cursor='grab'; });
canvas.addEventListener('mouseleave',()=>{ isDragging=false; canvas.style.cursor='default'; });

let touchStartDist = 0;
canvas.addEventListener('touchstart',(e)=>{ 
    if(e.touches.length===1){ isDragging=true; lastMouseX=e.touches[0].clientX; lastMouseY=e.touches[0].clientY; } 
    else if(e.touches.length===2){ const dx=e.touches[0].clientX-e.touches[1].clientX; const dy=e.touches[0].clientY-e.touches[1].clientY; touchStartDist=Math.sqrt(dx*dx+dy*dy); } 
}, {passive:false});
canvas.addEventListener('touchmove',(e)=>{ 
    if(e.touches.length===1 && isDragging){ const dx=e.touches[0].clientX-lastMouseX; const dy=e.touches[0].clientY-lastMouseY; cameraX-=dx/zoomLevel; cameraY-=dy/zoomLevel; lastMouseX=e.touches[0].clientX; lastMouseY=e.touches[0].clientY; } 
    else if(e.touches.length===2){ const dx=e.touches[0].clientX-e.touches[1].clientX; const dy=e.touches[0].clientY-e.touches[1].clientY; const newDist=Math.sqrt(dx*dx+dy*dy); if(touchStartDist>0){ const scaleAmount=(newDist-touchStartDist)*0.005; zoomLevel=Math.max(0.1,Math.min(zoomLevel+scaleAmount,5)); } touchStartDist=newDist; } 
}, {passive:false});
canvas.addEventListener('touchend',()=>{ isDragging=false; touchStartDist=0; });

// -------------------
// Resize
// -------------------
window.addEventListener('resize', resizeCanvas);

// -------------------
// Inicialización (igual a 1.0)
/// -------------------
document.fonts.ready.then(()=>{
    resizeCanvas();
    requestAnimationFrame(animate);
    setInterval(createShootingStar, 500);
    const initialFallingElementsCount = 50;
    for (let i = 0; i < initialFallingElementsCount; i++) {
        createFallingElement();
    }
    setInterval(createFallingElement, 500);
});

// Forzar estilos básicos como en 1.0
document.body.style.margin='0';
document.body.style.padding='0';
document.documentElement.style.margin='0';
document.documentElement.style.padding='0';
document.body.style.overflow='hidden';
canvas.style.cursor='grab';

// -------------------
// Funciones de activación/desactivación del Easter Egg (toggle)
// -------------------
function toggleEaster() {
    // cambiar estado
    easterActive = !easterActive;

    // arrancar transición animada
    modeTransitionStart = performance.now();
    modeTransitionFrom = modeTransition; // valor de 0..1 actual

    // Audio handling: fade out/in
    if (easterActive) {
        // fade out main audio, luego pause; fade in secretAudio
        const fadeOutMain = setInterval(() => {
            if (audio.volume > 0.05) {
                audio.volume = Math.max(0, audio.volume - 0.05);
            } else {
                clearInterval(fadeOutMain);
                audio.pause();
                audio.currentTime = 0;
            }
        }, 80);

        // start secret audio after a short delay so transition isn't abrupt
        setTimeout(() => {
            secretAudio.volume = 0;
            secretAudio.play().catch(e => console.log("Secret autoplay blocked:", e));
            // fade in secret
            const fadeInSecret = setInterval(() => {
                if (secretAudio.volume < 0.9) {
                    secretAudio.volume = Math.min(1, secretAudio.volume + 0.05);
                } else {
                    clearInterval(fadeInSecret);
                }
            }, 80);
        }, 600);

    } else {
        // desactivar: fade out secretAudio, luego resume main audio con fade in
        const fadeOutSecret = setInterval(() => {
            if (secretAudio.volume > 0.05) {
                secretAudio.volume = Math.max(0, secretAudio.volume - 0.05);
            } else {
                clearInterval(fadeOutSecret);
                secretAudio.pause();
                secretAudio.currentTime = 0;
            }
        }, 80);

        setTimeout(() => {
            // restart main audio and fade in
            audio.volume = 0;
            audio.play().catch(e => console.log("Main autoplay blocked on return:", e));
            const fadeInMain = setInterval(() => {
                if (audio.volume < 0.5) {
                    audio.volume = Math.min(0.5, audio.volume + 0.05);
                } else {
                    clearInterval(fadeInMain);
                }
            }, 80);
        }, 600);
    }
}
