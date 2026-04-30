/**
 * GATELOGIC PRO - CORE ENGINE v2.4
 * Developed by Julián
 * Web Designer & Programmer
 */

// 1. IMPORTACIONES DE MÓDULOS FIREBASE (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, orderBy, onSnapshot, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 2. CREDENCIALES DEL PROYECTO
const firebaseConfig = {
    apiKey: "AIzaSyCWY4ojxhXI1EGgcjZKv8YmMNdYNqcnDa8",
    authDomain: "gatelogic.firebaseapp.com",
    projectId: "gatelogic",
    storageBucket: "gatelogic.firebasestorage.app",
    messagingSenderId: "951205968408",
    appId: "1:951205968408:web:004e0542540ea86318216d",
    measurementId: "G-Q6RCN7L40G"
};

// 3. INICIALIZACIÓN DE SERVICIOS
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Variables Globales de UI
let mainChart;

// =========================================================
// 4. LÓGICA DE ANIMACIÓN (GSAP)
// =========================================================
const animateEntrance = () => {
    const tl = gsap.timeline();
    
    tl.to("#app-preloader", { duration: 0.8, opacity: 0, display: "none", ease: "power4.inOut" })
      .from(".sidebar", { duration: 1, x: -100, ease: "expo.out" }, "-=0.2")
      .from(".kpi-card", { duration: 0.8, y: 50, opacity: 0, stagger: 0.2, ease: "back.out(1.7)" }, "-=0.5")
      .from(".glass-module-card", { duration: 1, y: 30, opacity: 0, stagger: 0.2, ease: "power3.out" }, "-=0.8");
};

// =========================================================
// 5. SISTEMA DE AUTENTICACIÓN
// =========================================================

// Manejo de Tabs (Login/Register)
window.switchTab = (type) => {
    const loginBox = document.getElementById('login-box');
    const regBox = document.getElementById('register-box');
    const tabs = document.querySelectorAll('.tab-trigger');

    if (type === 'login') {
        loginBox.classList.remove('hidden');
        regBox.classList.add('hidden');
        tabs[0].classList.add('active');
        tabs[1].classList.remove('active');
    } else {
        loginBox.classList.add('hidden');
        regBox.classList.remove('hidden');
        tabs[0].classList.remove('active');
        tabs[1].classList.add('active');
    }
};

window.login = async () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
        showToast("Error de acceso: " + error.message, "error");
    }
};

window.register = async () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    try {
        await createUserWithEmailAndPassword(auth, email, pass);
        showToast("Piloto registrado con éxito", "success");
    } catch (error) {
        showToast("Error en registro: " + error.message, "error");
    }
};

window.logout = () => signOut(auth);

// CONTROL DE ESTADO DE SESIÓN
onAuthStateChanged(auth, user => {
    const loginScreen = document.getElementById('login-screen');
    const dashboard = document.getElementById('dashboard');
    const preloader = document.getElementById('app-preloader');

    if (user) {
        loginScreen.classList.add('hidden');
        dashboard.classList.remove('hidden');
        animateEntrance();
        initDataEngine(user.uid);
    } else {
        loginScreen.classList.remove('hidden');
        dashboard.classList.add('hidden');
        gsap.to(preloader, { display: "none", opacity: 0 }); // Ocultar si no hay user
    }
});

// =========================================================
// 6. MOTOR DE DATOS Y TELEMETRÍA
// =========================================================

const initDataEngine = (uid) => {
    const q = query(
        collection(db, "entrenamientos"),
        where("uid", "==", uid),
        orderBy("fecha", "desc"),
        limit(20)
    );

    onSnapshot(q, (snapshot) => {
        const tiempos = [];
        const fechas = [];
        const historyBody = document.getElementById('history-body');
        let bestTime = 999;
        let maxSpeed = 0;

        historyBody.innerHTML = ""; // Limpiar tabla

        snapshot.docs.reverse().forEach(doc => {
            const data = doc.data();
            const dateStr = new Date(data.fecha.seconds * 1000).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
            
            tiempos.push(data.tiempo);
            fechas.push(dateStr);

            if (data.tiempo < bestTime) bestTime = data.tiempo;
            if (data.velocidad > maxSpeed) maxSpeed = data.velocidad;

            // Llenar Tabla Pro
            const row = `
                <tr>
                    <td>${dateStr}</td>
                    <td class="text-neon">${data.tiempo}s</td>
                    <td>${data.velocidad} km/h</td>
                    <td><span class="badge-feeling">${data.feeling}</span></td>
                    <td><i class="fa-solid fa-circle-check status-ok"></i></td>
                </tr>
            `;
            historyBody.insertAdjacentHTML('afterbegin', row);
        });

        updateUI(bestTime, maxSpeed);
        updateChart(fechas, tiempos);
    });
};

// SUBIDA DE DATOS
document.getElementById('data-form').onsubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    const btn = e.target.querySelector('button');
    
    try {
        btn.innerText = "SINCRONIZANDO...";
        await addDoc(collection(db, "entrenamientos"), {
            uid: user.uid,
            tiempo: parseFloat(document.getElementById('gate-time').value),
            velocidad: parseInt(document.getElementById('top-speed').value),
            feeling: document.getElementById('feeling-range').value > 7 ? "Optimizado" : "Recuperación",
            fecha: new Date()
        });
        showToast("Telemetría sincronizada", "success");
        e.target.reset();
    } catch (error) {
        showToast("Fallo en la nube", "error");
    } finally {
        btn.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> SINCRONIZAR CON GATE-CLOUD`;
    }
};

// =========================================================
// 7. COMPONENTES VISUALES (CHART & UI)
// =========================================================

const updateUI = (best, speed) => {
    const bestDisplay = document.getElementById('best-time');
    const speedDisplay = document.getElementById('max-speed-display');

    if (best !== 999) {
        gsap.to(bestDisplay, { 
            innerText: best, 
            duration: 1.5, 
            snap: { innerText: 0.001 },
            ease: "power2.out"
        });
    }
    speedDisplay.innerText = speed;
};

const updateChart = (labels, data) => {
    const ctx = document.getElementById('performanceChart').getContext('2d');
    
    if (mainChart) mainChart.destroy();

    mainChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Gate Time (s)',
                data: data,
                borderColor: '#00ff88',
                backgroundColor: 'rgba(0, 255, 136, 0.05)',
                borderWidth: 3,
                pointRadius: 5,
                pointBackgroundColor: '#00ff88',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: '#222' }, ticks: { color: '#666' } },
                x: { grid: { display: false }, ticks: { color: '#666' } }
            }
        }
    });
};

// SISTEMA DE TOASTS PERSONALIZADO
const showToast = (msg, type) => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${msg}</span>`;
    container.appendChild(toast);
    
    gsap.fromTo(toast, { x: 100, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5 });
    
    setTimeout(() => {
        gsap.to(toast, { opacity: 0, x: 100, duration: 0.5, onComplete: () => toast.remove() });
    }, 4000);
};
