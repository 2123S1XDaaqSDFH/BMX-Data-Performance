import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// REEMPLAZA ESTO CON TUS DATOS DE FIREBASE CONSOLE
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

// --- LÓGICA DE USUARIO ---
window.login = () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    signInWithEmailAndPassword(auth, email, pass).catch(err => alert(err.message));
};

window.register = () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    createUserWithEmailAndPassword(auth, email, pass).catch(err => alert(err.message));
};

window.logout = () => signOut(auth);

// --- CONTROL DE SESIÓN ---
onAuthStateChanged(auth, user => {
    if (user) {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        loadData(user.uid);
    } else {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('dashboard').classList.add('hidden');
    }
});

// --- SUBIR DATOS ---
document.getElementById('data-form').onsubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    await addDoc(collection(db, "entrenamientos"), {
        uid: user.uid,
        tiempo: parseFloat(document.getElementById('gate-time').value),
        velocidad: parseInt(document.getElementById('top-speed').value),
        feeling: document.getElementById('feeling').value,
        fecha: new Date()
    });
    e.target.reset();
};

// --- CARGAR DATOS Y GRÁFICAS ---
function loadData(uid) {
    const q = query(collection(db, "entrenamientos"), where("uid", "==", uid), orderBy("fecha", "asc"));
    
    onSnapshot(q, (snapshot) => {
        const tiempos = [];
        const fechas = [];
        let mejorTiempo = 999;

        snapshot.forEach(doc => {
            const data = doc.data();
            tiempos.push(data.tiempo);
            fechas.push(new Date(data.fecha.seconds * 1000).toLocaleDateString());
            if(data.tiempo < mejorTiempo) mejorTiempo = data.tiempo;
        });

        document.getElementById('best-time').innerText = mejorTiempo === 999 ? "0.00s" : mejorTiempo + "s";
        updateChart(fechas, tiempos);
    });
}

let myChart;
function updateChart(labels, data) {
    const ctx = document.getElementById('performanceChart').getContext('2d');
    if(myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Tiempo Gate (s)',
                data,
                borderColor: '#00ff88',
                backgroundColor: 'rgba(0, 255, 136, 0.1)',
                fill: true
            }]
        }
    });
}
