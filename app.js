// ======================================
// GATELOGIC PRO ENGINE v5.0 (STABLE)
// ======================================

// ===============================
// 1. FIREBASE IMPORTS
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
    getDoc,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ===============================
// 2. CONFIG
// ===============================
const firebaseConfig = {
  apiKey: "AIzaSyCWY4ojxhXI1EGgcjZKv8YmMNdYNqcnDa8",
  authDomain: "gatelogic.firebaseapp.com",
  projectId: "gatelogic",
  storageBucket: "gatelogic.firebasestorage.app",
  messagingSenderId: "951205968408",
  appId: "1:951205968408:web:004e0542540ea86318216d",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ===============================
// 3. DOM (IMPORTANTE)
// ===============================
const $ = (id) => document.getElementById(id);

const loginScreen = $("login-screen");
const dashboard = $("dashboard");
const toastContainer = $("toast-container");

const loginEmail = $("loginEmail");
const loginPass = $("loginPass");

const nameInput = $("name");
const usernameInput = $("username");
const pesoInput = $("peso");
const categoriaInput = $("categoria");
const emailInput = $("email");
const passwordInput = $("password");

const userName = $("user-name");

const dataForm = $("data-form");
const gateTime = $("gate-time");
const topSpeed = $("top-speed");

const historyBody = $("history-body");
const bestTime = $("best-time");
const maxSpeedDisplay = $("max-speed-display");

const feedList = $("feed-list");
const rankingList = $("ranking-list");
const duelList = $("duel-list");

const postText = $("post-text");
const rivalEmail = $("rival-email");

const pilot1 = $("pilot1");
const pilot2 = $("pilot2");
const compareResult = $("compare-result");

// ===============================
// 4. AUTH
// ===============================
window.login = async () => {
    if (!loginEmail.value || !loginPass.value) {
        return showToast("Campos vacíos", "error");
    }

    try {
        await signInWithEmailAndPassword(auth, loginEmail.value, loginPass.value);
        showToast("Bienvenido 🚀", "success");
    } catch (e) {
        showToast(e.message, "error");
    }
};

window.register = async () => {

    try {
        const cred = await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);

        await setDoc(doc(db, "users", cred.user.uid), {
            name: nameInput.value,
            username: usernameInput.value,
            peso: parseFloat(pesoInput.value),
            categoria: categoriaInput.value,
            email: emailInput.value,
            bestTime: 999,
            pais: "COL",
            createdAt: new Date()
        });

        await updateProfile(cred.user, {
            displayName: nameInput.value
        });

        showToast("Cuenta creada 🔥", "success");

    } catch (e) {
        showToast(e.message, "error");
    }
};

window.logout = () => signOut(auth);

// ===============================
// 5. SESSION CONTROL
// ===============================
onAuthStateChanged(auth, async (user) => {

    if (user) {
        loginScreen.classList.add("hidden");
        dashboard.classList.remove("hidden");

        await loadUser(user.uid);
        initData(user.uid);
        loadFeed();
        loadRanking();
        loadDuelos();

    } else {
        loginScreen.classList.remove("hidden");
        dashboard.classList.add("hidden");
    }
});

// ===============================
// 6. USER PROFILE
// ===============================
async function loadUser(uid) {
    const snap = await getDoc(doc(db, "users", uid));

    if (!snap.exists()) return;

    const data = snap.data();
    userName.innerText = data.name;
}

// ===============================
// 7. DATA ENGINE
// ===============================
function initData(uid) {

    const q = query(
        collection(db, "entrenamientos"),
        where("uid", "==", uid),
        orderBy("fecha", "desc"),
        limit(20)
    );

    onSnapshot(q, (snap) => {

        let best = 999;
        let speed = 0;
        historyBody.innerHTML = "";

        snap.docs.forEach(docSnap => {

            const d = docSnap.data();

            if (d.tiempo < best) best = d.tiempo;
            if (d.velocidad > speed) speed = d.velocidad;

            historyBody.innerHTML += `
                <tr>
                    <td>${d.tiempo}s</td>
                    <td>${d.velocidad} km/h</td>
                </tr>`;
        });

        bestTime.innerText = best !== 999 ? best : "--";
        maxSpeedDisplay.innerText = speed;
    });
}

// ===============================
// 8. SUBIR DATOS
// ===============================
dataForm?.addEventListener("submit", async (e) => {

    e.preventDefault();

    const user = auth.currentUser;

    await addDoc(collection(db, "entrenamientos"), {
        uid: user.uid,
        tiempo: parseFloat(gateTime.value),
        velocidad: parseInt(topSpeed.value),
        fecha: new Date()
    });

    showToast("Datos guardados", "success");
});

// ===============================
// 9. FEED
// ===============================
window.createPost = async () => {

    const user = auth.currentUser;

    await addDoc(collection(db, "posts"), {
        uid: user.uid,
        text: postText.value,
        date: new Date()
    });

    loadFeed();
};

async function loadFeed() {

    const snap = await getDocs(query(collection(db, "posts"), orderBy("date", "desc")));

    feedList.innerHTML = "";

    for (const docSnap of snap.docs) {

        const p = docSnap.data();
        const u = await getDoc(doc(db, "users", p.uid));

        feedList.innerHTML += `
            <div class="post">
                <b>${u.data().name}</b>
                <p>${p.text}</p>
            </div>`;
    }
}

// ===============================
// 10. RANKING
// ===============================
async function loadRanking() {

    const snap = await getDocs(query(collection(db, "users"), orderBy("bestTime", "asc")));

    rankingList.innerHTML = "";

    snap.forEach((docSnap, i) => {

        const d = docSnap.data();

        rankingList.innerHTML += `
            <div class="rank-card">
                #${i + 1} ${d.name} - ${d.bestTime}s
            </div>`;
    });
}

// ===============================
// 11. DUELOS
// ===============================
window.createDuel = async () => {

    const user = auth.currentUser;

    const snap = await getDocs(collection(db, "users"));

    let rivalId = null;

    snap.forEach(d => {
        if (d.data().email === rivalEmail.value) {
            rivalId = d.id;
        }
    });

    if (!rivalId) return showToast("Rival no encontrado", "error");

    await addDoc(collection(db, "duelos"), {
        from: user.uid,
        to: rivalId,
        status: "pending",
        date: new Date()
    });

    showToast("Duelo enviado ⚔️", "success");
};

async function loadDuelos() {

    const snap = await getDocs(collection(db, "duelos"));

    duelList.innerHTML = "";

    snap.forEach(d => {

        const duel = d.data();

        duelList.innerHTML += `
            <div class="duel-card">
                ${duel.from} vs ${duel.to} - ${duel.status}
            </div>`;
    });
}

// ===============================
// 12. COMPARADOR
// ===============================
window.comparePilots = async () => {

    const snap = await getDocs(collection(db, "users"));

    let a, b;

    snap.forEach(d => {
        if (d.data().email === pilot1.value) a = d.data();
        if (d.data().email === pilot2.value) b = d.data();
    });

    if (!a || !b) return;

    compareResult.innerHTML = `
        <div>
            <h4>${a.name} vs ${b.name}</h4>
            <p>${a.bestTime}s vs ${b.bestTime}s</p>
        </div>`;
};

// ===============================
// 13. TOAST
// ===============================
function showToast(msg, type) {

    if (!toastContainer) return;

    const t = document.createElement("div");
    t.className = `toast ${type}`;
    t.innerText = msg;

    toastContainer.appendChild(t);

    setTimeout(() => t.remove(), 3000);
}
