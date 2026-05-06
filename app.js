/**
 * GATELOGIC PRO - CORE ENGINE v3.0 (FIXED)
 */

// ===============================
// 1. IMPORTS FIREBASE
// ===============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
    getFirestore,
    collection,
    addDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    limit,
    doc,
    setDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ===============================
// 2. CONFIG FIREBASE
// ===============================
const firebaseConfig = {
    apiKey: "AIzaSyCWY4ojxhXI1EGgcjZKv8YmMNdYNqcnDa8",
    authDomain: "gatelogic.firebaseapp.com",
    projectId: "gatelogic",
    storageBucket: "gatelogic.firebasestorage.app",
    messagingSenderId: "951205968408",
    appId: "1:951205968408:web:004e0542540ea86318216d",
    measurementId: "G-Q6RCN7L40G"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let mainChart;

// ===============================
// 3. ANIMACIONES
// ===============================
const animateEntrance = () => {
    const tl = gsap.timeline();

    tl.to("#app-preloader", { duration: 0.6, opacity: 0, display: "none" })
      .from(".sidebar", { x: -100, opacity: 0, duration: 0.6 })
      .from(".kpi-card", { y: 40, opacity: 0, stagger: 0.1 })
      .from(".glass-module-card", { y: 30, opacity: 0, stagger: 0.1 });
};

// ===============================
// 4. AUTH UI SWITCH
// ===============================
window.switchTab = (type) => {
    document.getElementById('login-box').classList.toggle('hidden', type !== 'login');
    document.getElementById('register-box').classList.toggle('hidden', type === 'login');
};

// ===============================
// 5. LOGIN
// ===============================
window.login = async () => {
    const email = document.getElementById("loginEmail").value;
    const pass = document.getElementById("loginPass").value;

    if (!email || !pass) {
        showToast("Completa los campos", "error");
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, pass);
        showToast("Bienvenido 🚀", "success");
    } catch (e) {
        showToast(e.message, "error");
    }
};

// ===============================
// 6. REGISTER
// ===============================
window.register = async () => {

    const name = document.getElementById("name").value;
    const username = document.getElementById("username").value;
    const peso = document.getElementById("peso").value;
    const categoria = document.getElementById("categoria").value;
    const email = document.getElementById("email").value;
    const pass = document.getElementById("password").value;

    if (!name || !email || !pass) {
        showToast("Completa todos los campos", "error");
        return;
    }

    try {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);

        // Guardar perfil
        await setDoc(doc(db, "users", cred.user.uid), {
            name,
            username,
            peso: parseFloat(peso),
            categoria,
            email,
            createdAt: new Date()
        });

        // Nombre visible
        await updateProfile(cred.user, {
            displayName: name
        });

        showToast("Registro exitoso 🔥", "success");

    } catch (e) {
        showToast(e.message, "error");
    }
};

// ===============================
// 7. LOGOUT
// ===============================
window.logout = () => signOut(auth);

// ===============================
// 8. SESSION CONTROL
// ===============================
onAuthStateChanged(auth, async (user) => {

    const loginScreen = document.getElementById('login-screen');
    const dashboard = document.getElementById('dashboard');

    if (user) {
        loginScreen.classList.add('hidden');
        dashboard.classList.remove('hidden');

        animateEntrance();

        loadUser(user.uid);
        initDataEngine(user.uid);

    } else {
        loginScreen.classList.remove('hidden');
        dashboard.classList.add('hidden');
    }
});

// ===============================
// 9. LOAD USER PROFILE
// ===============================
const loadUser = async (uid) => {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
        const data = snap.data();

        document.getElementById("user-name").innerText = data.name || "Piloto";
    }
};

// ===============================
// 10. DATA ENGINE
// ===============================
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
        historyBody.innerHTML = "";

        let bestTime = 999;
        let maxSpeed = 0;

        snapshot.docs.reverse().forEach(docSnap => {

            const data = docSnap.data();

            const dateStr = new Date(data.fecha.seconds * 1000)
                .toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });

            tiempos.push(data.tiempo);
            fechas.push(dateStr);

            if (data.tiempo < bestTime) bestTime = data.tiempo;
            if (data.velocidad > maxSpeed) maxSpeed = data.velocidad;

            const row = `
                <tr>
                    <td>${dateStr}</td>
                    <td class="text-neon">${data.tiempo}s</td>
                    <td>${data.velocidad} km/h</td>
                    <td><span class="badge-feeling">${data.feeling}</span></td>
                </tr>
            `;

            historyBody.insertAdjacentHTML('afterbegin', row);
        });

        updateUI(bestTime, maxSpeed);
        updateChart(fechas, tiempos);
    });
};

// ===============================
// 11. SUBIR DATOS
// ===============================
document.getElementById('data-form')?.addEventListener('submit', async (e) => {

    e.preventDefault();

    const user = auth.currentUser;

    try {
        await addDoc(collection(db, "entrenamientos"), {
            uid: user.uid,
            tiempo: parseFloat(document.getElementById('gate-time').value),
            velocidad: parseInt(document.getElementById('top-speed').value),
            feeling: document.getElementById('feeling-range').value > 7 ? "Optimizado" : "Recuperación",
            fecha: new Date()
        });

        showToast("Datos guardados", "success");
        e.target.reset();

    } catch (e) {
        showToast("Error al guardar", "error");
    }
});

// ===============================
// 12. UI UPDATE
// ===============================
const updateUI = (best, speed) => {

    document.getElementById('best-time').innerText =
        best !== 999 ? best.toFixed(3) : "--";

    document.getElementById('max-speed-display').innerText = speed;
};

// ===============================
// 13. CHART
// ===============================
const updateChart = (labels, data) => {

    const ctx = document.getElementById('performanceChart').getContext('2d');

    if (mainChart) mainChart.destroy();

    mainChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                data,
                borderColor: '#00ff88',
                backgroundColor: 'rgba(0,255,136,0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: {
                y: { ticks: { color: "#666" } },
                x: { ticks: { color: "#666" } }
            }
        }
    });
};

// ===============================
// 14. TOAST
// ===============================
const showToast = (msg, type) => {

    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = msg;

    container.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
};
