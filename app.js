// ======================================
// GATELOGIC PRO ENGINE v4.0 (FULL SYSTEM)
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
    getDocs,
    updateDoc
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

// ===============================
// 3. INIT
// ===============================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let mainChart;

// ===============================
// 4. AUTH SYSTEM
// ===============================
window.login = async () => {
    const email = loginEmail.value;
    const pass = loginPass.value;

    if(!email || !pass) return showToast("Campos vacíos","error");

    try{
        await signInWithEmailAndPassword(auth,email,pass);
        showToast("Bienvenido 🚀","success");
    }catch(e){
        showToast(e.message,"error");
    }
};

window.register = async () => {

    const data = {
        name: name.value,
        username: username.value,
        peso: parseFloat(peso.value),
        categoria: categoria.value,
        email: email.value
    };

    try{
        const cred = await createUserWithEmailAndPassword(auth,email.value,password.value);

        await setDoc(doc(db,"users",cred.user.uid),{
            ...data,
            bestTime: 999,
            pais: "COL",
            createdAt:new Date()
        });

        await updateProfile(cred.user,{displayName:data.name});

        showToast("Cuenta creada 🔥","success");

    }catch(e){
        showToast(e.message,"error");
    }
};

window.logout = ()=> signOut(auth);

// ===============================
// 5. SESSION
// ===============================
onAuthStateChanged(auth, async(user)=>{

    if(user){
        loginScreen.classList.add("hidden");
        dashboard.classList.remove("hidden");

        loadUser(user.uid);
        initData(user.uid);
        loadFeed();
        loadRanking();
        loadDuelos();

    }else{
        loginScreen.classList.remove("hidden");
        dashboard.classList.add("hidden");
    }
});

// ===============================
// 6. USER PROFILE
// ===============================
async function loadUser(uid){

    const snap = await getDoc(doc(db,"users",uid));
    const data = snap.data();

    userName.innerText = data.name;
}

// ===============================
// 7. DATA ENGINE
// ===============================
function initData(uid){

    const q = query(
        collection(db,"entrenamientos"),
        where("uid","==",uid),
        orderBy("fecha","desc"),
        limit(20)
    );

    onSnapshot(q,(snap)=>{

        let best = 999;
        let speed = 0;
        historyBody.innerHTML="";

        snap.docs.forEach(d=>{

            const data = d.data();

            if(data.tiempo < best) best = data.tiempo;
            if(data.velocidad > speed) speed = data.velocidad;

            historyBody.innerHTML += `
            <tr>
                <td>${data.tiempo}</td>
                <td>${data.velocidad}</td>
            </tr>`;
        });

        bestTime.innerText = best !== 999 ? best : "--";
        maxSpeedDisplay.innerText = speed;
    });
}

// ===============================
// 8. SUBIR DATOS
// ===============================
dataForm?.addEventListener("submit", async(e)=>{

    e.preventDefault();

    const user = auth.currentUser;

    await addDoc(collection(db,"entrenamientos"),{
        uid:user.uid,
        tiempo:parseFloat(gateTime.value),
        velocidad:parseInt(topSpeed.value),
        fecha:new Date()
    });

    showToast("Guardado","success");
});

// ===============================
// 9. FEED (TIPO IG)
// ===============================
window.createPost = async ()=>{

    const user = auth.currentUser;

    await addDoc(collection(db,"posts"),{
        uid:user.uid,
        text:postText.value,
        date:new Date()
    });

    showToast("Publicado","success");
};

async function loadFeed(){

    const snap = await getDocs(query(collection(db,"posts"),orderBy("date","desc")));

    feedList.innerHTML="";

    for(const docSnap of snap.docs){

        const p = docSnap.data();
        const u = await getDoc(doc(db,"users",p.uid));

        feedList.innerHTML += `
        <div class="post">
            <b>${u.data().name}</b>
            <p>${p.text}</p>
        </div>`;
    }
}

// ===============================
// 10. RANKING GLOBAL
// ===============================
async function loadRanking(){

    const snap = await getDocs(query(collection(db,"users"),orderBy("bestTime","asc")));

    rankingList.innerHTML="";

    snap.forEach((docSnap,i)=>{

        const d = docSnap.data();

        rankingList.innerHTML += `
        <div class="rank-card">
            #${i+1} ${d.name} - ${d.bestTime}s
        </div>`;
    });
}

// ===============================
// 11. DUELOS
// ===============================
window.createDuel = async ()=>{

    const email = rivalEmail.value;
    const user = auth.currentUser;

    const snap = await getDocs(collection(db,"users"));

    let rival=null;

    snap.forEach(d=>{
        if(d.data().email === email) rival=d.id;
    });

    if(!rival) return showToast("No encontrado","error");

    await addDoc(collection(db,"duelos"),{
        from:user.uid,
        to:rival,
        status:"pending",
        date:new Date()
    });

    showToast("Reto enviado ⚔️","success");
};

async function loadDuelos(){

    const snap = await getDocs(collection(db,"duelos"));

    duelList.innerHTML="";

    snap.forEach(d=>{
        const duel = d.data();

        duelList.innerHTML += `
        <div class="duel-card">
            ${duel.from} vs ${duel.to} - ${duel.status}
        </div>`;
    });
}

// ===============================
// 12. COMPARADOR PRO
// ===============================
window.comparePilots = async ()=>{

    const p1 = pilot1.value;
    const p2 = pilot2.value;

    const snap = await getDocs(collection(db,"users"));

    let a,b;

    snap.forEach(d=>{
        if(d.data().email===p1) a=d.data();
        if(d.data().email===p2) b=d.data();
    });

    compareResult.innerHTML = `
    <div>
        <h4>${a.name} vs ${b.name}</h4>
        <p>${a.bestTime} vs ${b.bestTime}</p>
    </div>`;
};

// ===============================
// 13. RIVALES AUTOMÁTICOS
// ===============================
async function findRivals(user){

    const snap = await getDocs(collection(db,"users"));

    let rivals=[];

    snap.forEach(d=>{
        const u=d.data();

        if(
            u.categoria===user.categoria &&
            Math.abs(u.peso-user.peso)<=3
        ){
            rivals.push(u);
        }
    });

    return rivals;
}

// ===============================
// 14. UI
// ===============================
function showToast(msg,type){

    const t = document.createElement("div");
    t.innerText=msg;
    t.className="toast";

    toastContainer.appendChild(t);

    setTimeout(()=>t.remove(),3000);
}

// ===============================
// 15. ANIMACIONES
// ===============================
gsap.from(".kpi-card",{y:30,opacity:0,stagger:0.1});
