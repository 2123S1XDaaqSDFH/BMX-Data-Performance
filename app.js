// app.js

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

const firebaseConfig = {

apiKey: "TU_API_KEY",

authDomain: "TU_AUTH_DOMAIN",

projectId: "TU_PROJECT_ID",

storageBucket: "TU_STORAGE_BUCKET",

messagingSenderId: "TU_MESSAGING_ID",

appId: "TU_APP_ID"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

const loginScreen = document.getElementById("login-screen");

const dashboard = document.getElementById("dashboard");

const toastContainer = document.getElementById("toast-container");

const userName = document.getElementById("user-name");

const profileName = document.getElementById("profile-name");

const bestTime = document.getElementById("best-time");

const maxSpeedDisplay = document.getElementById("max-speed-display");

const speedKpi = document.getElementById("speed-kpi");

const timeKpi = document.getElementById("time-kpi");

const historyBody = document.getElementById("history-body");

const rankingList = document.getElementById("rankingList");

const feedList = document.getElementById("feedList");

const duelList = document.getElementById("duelList");

const compareResult = document.getElementById("compareResult");

const dataForm = document.getElementById("data-form");

let performanceChart;

// LOGIN
window.login = async()=>{

try{

const email = document.getElementById("loginEmail").value;

const pass = document.getElementById("loginPass").value;

await signInWithEmailAndPassword(auth,email,pass);

showToast("Bienvenido 🚀");

}catch(e){

showToast(e.message);

}
};

// REGISTER
window.register = async()=>{

try{

const name = document.getElementById("name").value;

const username = document.getElementById("username").value;

const peso = parseFloat(document.getElementById("peso").value);

const categoria = document.getElementById("categoria").value;

const email = document.getElementById("email").value;

const password = document.getElementById("password").value;

const cred = await createUserWithEmailAndPassword(
auth,
email,
password
);

await updateProfile(cred.user,{
displayName:name
});

await setDoc(doc(db,"users",cred.user.uid),{

name,
username,
peso,
categoria,
email,
bestTime:999,
photoURL:"https://i.pravatar.cc/300",
createdAt:new Date()

});

showToast("Cuenta creada 🔥");

}catch(e){

showToast(e.message);

}
};

// SESSION
onAuthStateChanged(auth,async(user)=>{

if(user){

loginScreen.classList.add("hidden");

dashboard.classList.remove("hidden");

loadUser(user.uid);

loadStats(user.uid);

loadRanking();

loadFeed();

loadDuelos();

animateUI();

}else{

loginScreen.classList.remove("hidden");

dashboard.classList.add("hidden");

}

});

// LOGOUT
window.logout = ()=>{
signOut(auth);
};

// USER
async function loadUser(uid){

const snap = await getDoc(doc(db,"users",uid));

const data = snap.data();

userName.innerText = data.name;

profileName.innerText = data.name;
}

// TRAINING
dataForm?.addEventListener("submit",async(e)=>{

e.preventDefault();

const user = auth.currentUser;

await addDoc(collection(db,"entrenamientos"),{

uid:user.uid,

tiempo:parseFloat(
document.getElementById("gate-time").value
),

velocidad:parseInt(
document.getElementById("top-speed").value
),

fecha:new Date()

});

showToast("Entrenamiento guardado");

});

// STATS
function loadStats(uid){

const q = query(
collection(db,"entrenamientos"),
where("uid","==",uid),
orderBy("fecha","desc"),
limit(20)
);

onSnapshot(q,(snap)=>{

let labels=[];

let times=[];

let best=999;

let speed=0;

historyBody.innerHTML="";

snap.docs.reverse().forEach(docu=>{

const data = docu.data();

labels.push("RUN");

times.push(data.tiempo);

if(data.tiempo < best){
best=data.tiempo;
}

if(data.velocidad > speed){
speed=data.velocidad;
}

historyBody.innerHTML += `
<tr>
<td>${data.tiempo}</td>
<td>${data.velocidad}</td>
</tr>
`;

});

bestTime.innerText =
best !== 999 ? best : "--";

maxSpeedDisplay.innerText = speed;

speedKpi.innerText = speed+" KM/H";

timeKpi.innerText = best;

renderChart(labels,times);

});
}

// CHART
function renderChart(labels,data){

const ctx =
document.getElementById("performanceChart");

if(performanceChart){
performanceChart.destroy();
}

performanceChart = new Chart(ctx,{

type:"line",

data:{
labels,
datasets:[{
data,
borderColor:"#00ff88",
backgroundColor:"rgba(0,255,136,.1)",
fill:true,
tension:.4
}]
},

options:{
responsive:true,
plugins:{
legend:{
display:false
}
}
}

});
}

// POSTS
window.createPost = async()=>{

const user = auth.currentUser;

const text =
document.getElementById("postText").value;

await addDoc(collection(db,"posts"),{

uid:user.uid,
text,
date:new Date()

});

showToast("Post publicado");

loadFeed();
};

// FEED
async function loadFeed(){

const q = query(
collection(db,"posts"),
orderBy("date","desc")
);

const snap = await getDocs(q);

feedList.innerHTML="";

for(const d of snap.docs){

const post = d.data();

const userSnap =
await getDoc(doc(db,"users",post.uid));

const u = userSnap.data();

feedList.innerHTML += `

<div class="post-card">

<div style="display:flex;align-items:center;gap:15px;margin-bottom:20px;">

<img src="${u.photoURL}"
style="
width:60px;
height:60px;
border-radius:50%;
object-fit:cover;
">

<div>
<h3>${u.name}</h3>
<p style="opacity:.5;">@${u.username}</p>
</div>

</div>

<p>${post.text}</p>

</div>

`;

}

}

// RANKING
async function loadRanking(){

const q = query(
collection(db,"users"),
orderBy("bestTime","asc")
);

const snap = await getDocs(q);

rankingList.innerHTML="";

let pos=1;

snap.forEach(docu=>{

const d = docu.data();

rankingList.innerHTML += `

<div class="rank-card">

<div style="display:flex;justify-content:space-between;align-items:center;">

<div style="display:flex;align-items:center;gap:20px;">

<h1 style="
font-size:45px;
font-weight:900;
color:#00ff88;
">
#${pos}
</h1>

<div>

<h2>${d.name}</h2>

<p>@${d.username}</p>

</div>

</div>

<div>

<h2>${d.bestTime}</h2>

</div>

</div>

</div>

`;

pos++;

});

}

// DUELOS
window.createDuel = async()=>{

const rivalEmail =
document.getElementById("rivalEmail").value;

const user = auth.currentUser;

const users = await getDocs(collection(db,"users"));

let rivalId=null;

users.forEach(d=>{

if(d.data().email===rivalEmail){
rivalId=d.id;
}

});

if(!rivalId){

showToast("Rival no encontrado");

return;

}

await addDoc(collection(db,"duelos"),{

from:user.uid,
to:rivalId,
status:"PENDING",
date:new Date()

});

showToast("Duelo enviado ⚔️");

loadDuelos();
};

// LOAD DUELOS
async function loadDuelos(){

const snap = await getDocs(collection(db,"duelos"));

duelList.innerHTML="";

snap.forEach(d=>{

const duel = d.data();

duelList.innerHTML += `

<div class="duel-card">

<h2>⚔️ DUEL</h2>

<p>${duel.status}</p>

</div>

`;

});

}

// COMPARE
window.comparePilots = async()=>{

const p1 =
document.getElementById("pilot1").value;

const p2 =
document.getElementById("pilot2").value;

const users =
await getDocs(collection(db,"users"));

let a=null;
let b=null;

users.forEach(d=>{

const data = d.data();

if(data.email===p1){
a=data;
}

if(data.email===p2){
b=data;
}

});

if(!a || !b){

showToast("Pilotos no encontrados");

return;

}

compareResult.innerHTML = `

<div class="glass-card">

<h1 style="
font-size:50px;
font-weight:900;
margin-bottom:20px;
">
${a.name} VS ${b.name}
</h1>

<div style="
display:grid;
grid-template-columns:1fr 1fr;
gap:20px;
">

<div class="rank-card">
<h2>${a.bestTime}</h2>
<p>${a.categoria}</p>
</div>

<div class="rank-card">
<h2>${b.bestTime}</h2>
<p>${b.categoria}</p>
</div>

</div>

</div>

`;

};

// TOAST
function showToast(msg){

const toast = document.createElement("div");

toast.className="toast";

toast.innerText=msg;

toastContainer.appendChild(toast);

setTimeout(()=>{
toast.remove();
},3000);

}

// GSAP
function animateUI(){

gsap.from(".hero-card",{
y:40,
opacity:0,
duration:1
});

gsap.from(".kpi-card",{
y:30,
opacity:0,
stagger:.1,
duration:.6
});

gsap.from(".glass-card",{
opacity:0,
y:40,
duration:.8,
stagger:.1
});

}
