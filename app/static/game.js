const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Game Constants (Matching lander.py) ---
const CONSTANTS = {
    GRAVITY: -8.0,
    THRUST_POWER: 15.0,
    SIDE_THRUST_POWER: 3.0,
    INITIAL_FUEL: 200.0,
    INITIAL_ALTITUDE: 100.0,
    INITIAL_VELOCITY_Y: -10.0,
    INITIAL_POS_X: 75.0,
    INITIAL_VELOCITY_X: -5.0
};

// --- Game State ---
let state = {
    altitude: CONSTANTS.INITIAL_ALTITUDE,
    velocityY: CONSTANTS.INITIAL_VELOCITY_Y,
    posX: CONSTANTS.INITIAL_POS_X,
    velocityX: CONSTANTS.INITIAL_VELOCITY_X,
    fuel: CONSTANTS.INITIAL_FUEL,
    verticalThrustInput: 0, // 0 to 5
    horizontalThrustInput: 0, // -1, 0, 1
    gameOver: false,
    paused: false,
    width: 0,
    height: 0,
    lastTime: 0
};

// --- Input Handling ---
window.addEventListener('keydown', (e) => {
    if (state.gameOver && e.key === 'r') {
        resetGame();
        return;
    }
    if (state.paused) return;

    switch(e.key) {
        case 'ArrowUp':
            state.verticalThrustInput = Math.min(5, state.verticalThrustInput + 1);
            break;
        case 'ArrowDown':
            state.verticalThrustInput = Math.max(0, state.verticalThrustInput - 1);
            break;
        case 'ArrowLeft':
            state.horizontalThrustInput = -1.0;
            break;
        case 'ArrowRight':
            state.horizontalThrustInput = 1.0;
            break;
    }
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        state.horizontalThrustInput = 0;
    }
});

// --- Resize Handling ---
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    state.width = canvas.width;
    state.height = canvas.height;
}
window.addEventListener('resize', resize);
resize();

// --- Game Loop ---
function resetGame() {
    state = {
        ...state,
        altitude: CONSTANTS.INITIAL_ALTITUDE,
        velocityY: CONSTANTS.INITIAL_VELOCITY_Y,
        posX: CONSTANTS.INITIAL_POS_X,
        velocityX: CONSTANTS.INITIAL_VELOCITY_X,
        fuel: CONSTANTS.INITIAL_FUEL,
        verticalThrustInput: 0,
        horizontalThrustInput: 0,
        gameOver: false
    };
    document.getElementById('message').classList.remove('visible');
    state.lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function updatePhysics(dt) {
    if (state.gameOver) return;

    // Time step scaling (original was 0.5s per step, we use dt)
    // To match the feel, we need to adjust the scaling factor appropriately
    // Original loop was ~500ms per frame.
    // We want smooth 60fps (16ms).
    // Let's use a fixed time step multiplier relative to the original.
    
    // Original physics:
    // acceleration_y = gravity + (v_thrust_adj * thrust_power / 5)
    // velocity_y += acceleration_y * 0.5
    // altitude += velocity_y * 0.5
    
    // We will just execute the integration with a smaller time step.
    // However, the original "0.5" was huge. Let's try to simulate 'real time'
    // but we might need to slow it down if it's too fast.
    // Actually, lander.py says "Time step is now 0.5s" and loop sleeps 500ms.
    // So 1 real second = 1 sim second.
    
    const simDt = dt / 1000; // Secs

    const totalThrustFuel = state.verticalThrustInput + Math.abs(state.horizontalThrustInput);
    let vThrustAdj = 0;
    let hThrustAdj = 0;

    if (state.fuel > 0) {
        // Burn rate per SECOND.
        // Original: burn = min(total, fuel) per 0.5s.
        // So burn rate is 2 * total per second?
        // Let's simplify: Consume fuel proportional to thrust * time.
        // burn = total * dt
        
        let requestedBurn = totalThrustFuel * simDt * 2.0; // Scaled to match original consumption roughly
        let actualBurn = Math.min(requestedBurn, state.fuel);
        state.fuel -= actualBurn;
        
        if (requestedBurn > 0) {
            let ratio = actualBurn / requestedBurn;
            // Original logic separate V and H ratios, but here we just scale total
             vThrustAdj = (state.verticalThrustInput * ratio);
             hThrustAdj = (Math.abs(state.horizontalThrustInput) * ratio) * (state.horizontalThrustInput < 0 ? -1 : 1);
        }
    }

    // Physics
    // acceleration_y = gravity + (v_thrust_adj * thrust_power / 5)
    // The original div 5 was because max vertical thrust input is 5.
    // So normalized thrust (0-1) * power.
    
    const accelY = CONSTANTS.GRAVITY + (vThrustAdj / 5.0 * CONSTANTS.THRUST_POWER);
    state.velocityY += accelY * simDt;
    state.altitude += state.velocityY * simDt;

    const accelX = hThrustAdj * CONSTANTS.SIDE_THRUST_POWER;
    state.velocityX += accelX * simDt;
    state.posX += state.velocityX * simDt;

    // Boundaries
    if (state.posX < 0) { state.posX = 0; state.velocityX = 0; }
    if (state.posX > 100) { state.posX = 100; state.velocityX = 0; }
    
    // Landing Check
    if (state.altitude <= 0) {
        state.altitude = 0;
        checkLanding();
    }
}

function checkLanding() {
    state.gameOver = true;
    
    // Pad calculation: 
    // original: pad_center_x = width // 2, pad_width = 16 (chars)
    // screen width roughly 80 chars? ~20% of screen.
    // Let's say pad is 45% to 55% of world (width).
    
    const PAD_START = 42;
    const PAD_END = 58;
    
    const onPad = (state.posX >= PAD_START && state.posX <= PAD_END);
    const safeVelY = Math.abs(state.velocityY) < 5.0;
    const safeVelX = Math.abs(state.velocityX) < 2.0;
    
    const msgEl = document.getElementById('message');
    let msgText = "";
    let color = "";
    
    if (onPad && safeVelY && safeVelX) {
        msgText = `SUCCESS!\nFuel Bonus: ${Math.floor(state.fuel)}`;
        color = "#33ff00";
    } else if (onPad) {
        msgText = `CRASH!\nToo Fast\nVy: ${state.velocityY.toFixed(2)} Vx: ${state.velocityX.toFixed(2)}`;
        color = "#ff3300";
    } else {
        msgText = "CRASH!\nMissed Pad";
        color = "#ff3300";
    }
    
    msgEl.innerHTML = `${msgText}<br><br><small>Press 'R' to Restart</small>`;
    msgEl.style.borderColor = color;
    msgEl.style.color = color;
    msgEl.classList.add('visible');
}

function draw() {
    // Clear
    ctx.fillStyle = '#0d110d';
    ctx.fillRect(0, 0, state.width, state.height);
    
    // Scaling
    // World coordinates: 0-100 X, 0-100 Altitude.
    // We map this to screen.
    // Y needs flip (0 alt is bottom).
    
    const scaleX = state.width / 100.0;
    const scaleY = (state.height - 50) / 100.0; // Leave some margin
    
    const screenX = state.posX * scaleX;
    const screenY = state.height - 20 - (state.altitude * scaleY); // 20px padding bottom
    
    // Draw Ground
    ctx.strokeStyle = '#33ff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, state.height - 20);
    ctx.lineTo(state.width * 0.42, state.height - 20); // Pad Start
    ctx.stroke();
    
    // Draw Pad
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffff00'; // Yellow pad
    ctx.beginPath();
    ctx.moveTo(state.width * 0.42, state.height - 20);
    ctx.lineTo(state.width * 0.58, state.height - 20);
    ctx.stroke();
    
    // Draw rest of ground
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#33ff00';
    ctx.beginPath();
    ctx.moveTo(state.width * 0.58, state.height - 20);
    ctx.lineTo(state.width, state.height - 20);
    ctx.stroke();
    
    // Draw Shuttle
    // Simple triangle shape
    ctx.fillStyle = '#33ff00';
    ctx.save();
    ctx.translate(screenX, screenY);
    
    // Visual Thrust
    if (state.verticalThrustInput > 0) {
        ctx.fillStyle = `rgba(255, 100, 0, ${state.verticalThrustInput / 5})`;
        ctx.beginPath();
        ctx.moveTo(-5, 5);
        ctx.lineTo(0, 15 + Math.random() * 10);
        ctx.lineTo(5, 5);
        ctx.fill();
    }
    
    // Ship Body
    ctx.fillStyle = '#33ff00';
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(10, 10);
    ctx.lineTo(-10, 10);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
    
    // UI Updates
    document.getElementById('altitude').innerText = `ALT: ${state.altitude.toFixed(1)}`;
    document.getElementById('fuel').innerText = `FUEL: ${state.fuel.toFixed(0)}`;
    document.getElementById('velocity').innerText = `VEL: ${state.velocityY.toFixed(1)}`;
}

function gameLoop(timestamp) {
    if (!state.lastTime) state.lastTime = timestamp;
    const dt = timestamp - state.lastTime;
    state.lastTime = timestamp;
    
    updatePhysics(dt);
    draw();
    
    if (!state.gameOver) {
        requestAnimationFrame(gameLoop);
    }
}

// Start
resetGame();
