/**
 * GATELOGIC PRO - CORE ENGINE v4.0 (PRO CLEAN)
 */

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

import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// ===============================
// 2. CONFIG
// ===============================
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "gatelogic.firebaseapp.com",
    projectId: "gatelogic",
    storageBucket: "gatelogic.firebasestorage.app",
    messagingSenderId: "951205968408",
    appId: "1:951205968408:web:004e0542540ea86318216d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

let mainChart;
let currentUserData = null;

// ===============================
// 3. AUTH
// ===============================
window.login = async () => {
    try {
        await signInWithEmailAndPassword(
            auth,
            loginEmail.value,
            loginPass.value
        );
        showToast("Bienvenido 🚀", "success");
    } catch (e) {
        showToast(e.message, "error");
    }
};

window.register = async () => {
    try {
        const cred = await createUserWithEmailAndPassword(
            auth,
            email.value,
            password.value
        );

        const userData = {
            name: name.value,
            username: username.value,
            peso: parseFloat(peso.value),
            categoria: categoria.value,
            pais: "Colombia",
            bestTime: 999,
            photoURL: "",
            createdAt: new Date()
        };

        await setDoc(doc(db, "users", cred.user.uid), userData);

        await updateProfile(cred.user, {
            displayName: userData.name
        });

        showToast("Cuenta creada 🔥", "success");

    } catch (e) {
        showToast(e.message, "error");
    }
};

window.logout = () => signOut(auth);

// ===============================
// 4. SESSION
// ===============================
onAuthStateChanged(auth, async (user) => {

    if (user) {
        loginScreen.classList.add("hidden");
        dashboard.classList.remove("hidden");

        await loadUser(user.uid);
        initDataEngine(user.uid);
        loadFeed();
        loadRanking();

    } else {
        loginScreen.classList.remove("hidden");
        dashboard.classList.add("hidden");
    }
});

// ===============================
// 5. USER PROFILE
// ===============================
async function loadUser(uid){

    const snap = await getDoc(doc(db,"users",uid));

    if(!snap.exists()) return;

    currentUserData = snap.data();

    document.getElementById("user-name").innerText = currentUserData.name;

    // Cargar rivales automáticamente
    const rivals = await findRivals(currentUserData);
    renderRivals(rivals);
}

// ===============================
// 6. FOTO DE PERFIL
// ===============================
window.uploadProfilePhoto = async (file) => {

    const user = auth.currentUser;
    if (!user) return;

    const storageRef = ref(storage, `profiles/${user.uid}`);

    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    await setDoc(doc(db,"users",user.uid), {
        photoURL: url
    }, { merge: true });

    showToast("Foto actualizada 🔥","success");
};

// ===============================
// 7. DATA ENGINE
// ===============================
function initDataEngine(uid){

    const q = query(
        collection(db,"entrenamientos"),
        where("uid","==",uid),
        orderBy("fecha","desc"),
        limit(20)
    );

    onSnapshot(q,(snap)=>{

        let bestTime = 999;
        let maxSpeed = 0;

        const tiempos = [];
        const fechas = [];

        historyBody.innerHTML = "";

        snap.docs.reverse().forEach(d=>{

            const data = d.data();

            tiempos.push(data.tiempo);
            fechas.push(new Date(data.fecha.seconds*1000).toLocaleDateString());

            if(data.tiempo < bestTime) bestTime = data.tiempo;
            if(data.velocidad > maxSpeed) maxSpeed = data.velocidad;

            historyBody.innerHTML += `
                <tr>
                    <td>${data.tiempo}s</td>
                    <td>${data.velocidad} km/h</td>
                </tr>
            `;
        });

        updateUI(bestTime, maxSpeed);
        updateChart(fechas, tiempos);

    });
}

// ===============================
// 8. RIVALES PRO
// ===============================
async function findRivals(user){

    const snap = await getDocs(collection(db,"users"));

    return snap.docs
        .map(d=>d.data())
        .filter(u =>
            u.categoria === user.categoria &&
            Math.abs(u.peso - user.peso) <= 3 &&
            u.bestTime !== 999
        )
        .sort((a,b)=> a.bestTime - b.bestTime)
        .slice(0,5);
}

function renderRivals(rivals){

    const container = document.getElementById("rivals");

    container.innerHTML = rivals.map(r=>`
        <div class="rival">
            <b>${r.name}</b>
            <span>${r.bestTime}s</span>
        </div>
    `).join("");
}

// ===============================
// 9. RANKING GLOBAL
// ===============================
async function loadRanking(){

    const snap = await getDocs(
        query(collection(db,"users"),orderBy("bestTime","asc"),limit(20))
    );

    rankingList.innerHTML = "";

    snap.forEach((doc,i)=>{

        const u = doc.data();

        rankingList.innerHTML += `
            <div class="rank-card">
                <span>#${i+1}</span>
                <b>${u.name}</b>
                <span>${u.bestTime}s</span>
            </div>
        `;
    });

    animateUI();
}

// ===============================
// 10. FEED SOCIAL
// ===============================
async function loadFeed(){

    const snap = await getDocs(
        query(collection(db,"posts"),orderBy("date","desc"),limit(20))
    );

    feedList.innerHTML = "";

    snap.forEach(async d=>{

        const p = d.data();
        const userSnap = await getDoc(doc(db,"users",p.uid));
        const u = userSnap.data();

        feedList.innerHTML += `
            <div class="post">
                <div class="post-header">
                    <img src="${u?.photoURL || ''}">
                    <b>${u?.name}</b>
                </div>
                <p>${p.text}</p>
            </div>
        `;
    });

    animateUI();
}

// ===============================
// 11. CHART
// ===============================
function updateChart(labels,data){

    if(mainChart) mainChart.destroy();

    mainChart = new Chart(performanceChart,{
        type:"line",
        data:{
            labels,
            datasets:[{
                data,
                borderColor:"#00ff88",
                fill:true
            }]
        }
    });
}

// ===============================
// 12. UI
// ===============================
function updateUI(best,speed){

    bestTime.innerText = best !== 999 ? best.toFixed(3) : "--";
    maxSpeedDisplay.innerText = speed;
}

// ===============================
// 13. ANIMACIONES
// ===============================
function animateUI(){

    gsap.from(".post",{opacity:0,y:20,stagger:0.1});
    gsap.from(".rank-card",{x:-20,opacity:0,stagger:0.1});
}

// ===============================
// 14. TOAST
// ===============================
function showToast(msg,type){

    const t = document.createElement("div");
    t.className = "toast "+type;
    t.innerText = msg;

    document.body.appendChild(t);

    setTimeout(()=>t.remove(),3000);
}
