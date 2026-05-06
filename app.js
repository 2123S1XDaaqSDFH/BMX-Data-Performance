import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
getAuth,signInWithEmailAndPassword,createUserWithEmailAndPassword,onAuthStateChanged,signOut,updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
getFirestore,collection,addDoc,query,where,orderBy,onSnapshot,limit,doc,setDoc,getDoc,getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
getStorage,ref,uploadBytes,getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
apiKey:"AIzaSyCWY4ojxhXI1EGgcjZKv8YmMNdYNqcnDa8",
authDomain:"gatelogic.firebaseapp.com",
projectId:"gatelogic",
storageBucket:"gatelogic.firebasestorage.app",
messagingSenderId:"951205968408",
appId:"1:951205968408:web:004e0542540ea86318216d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

let mainChart;
let currentUserData=null;

// LOGIN
window.login=async()=>{
await signInWithEmailAndPassword(auth,loginEmail.value,loginPass.value);
};

// REGISTER
window.register=async()=>{
const cred=await createUserWithEmailAndPassword(auth,email.value,password.value);

await setDoc(doc(db,"users",cred.user.uid),{
name:name.value,
username:username.value,
peso:parseFloat(peso.value),
categoria:categoria.value,
pais:"Colombia",
bestTime:999,
photoURL:""
});

await updateProfile(cred.user,{displayName:name.value});
};

// SESSION
onAuthStateChanged(auth,async(user)=>{
if(user){

gsap.to("#login-screen",{opacity:0,duration:0.4,onComplete:()=>{
loginScreen.classList.add("hidden");
dashboard.classList.remove("hidden");

gsap.from("#dashboard",{opacity:0,duration:0.6});

loadUser(user.uid);
initDataEngine(user.uid);
loadFeed();
loadRanking();
loadDuels();
}});

}else{
loginScreen.classList.remove("hidden");
dashboard.classList.add("hidden");
}
});

// USER
async function loadUser(uid){
const snap=await getDoc(doc(db,"users",uid));
currentUserData=snap.data();
userName.innerText=currentUserData.name;

const rivals=await findRivals(currentUserData);
renderRivals(rivals);
}

// FOTO
window.uploadProfilePhoto=async(file)=>{
const user=auth.currentUser;
const storageRef=ref(storage,`profiles/${user.uid}`);
await uploadBytes(storageRef,file);
const url=await getDownloadURL(storageRef);
await setDoc(doc(db,"users",user.uid),{photoURL:url},{merge:true});
};

// DATA
function initDataEngine(uid){

const q=query(collection(db,"entrenamientos"),where("uid","==",uid),orderBy("fecha","desc"),limit(20));

onSnapshot(q,(snap)=>{

let best=999;
let speed=0;
const tiempos=[],fechas=[];

historyBody.innerHTML="";

snap.docs.reverse().forEach(d=>{
const data=d.data();

tiempos.push(data.tiempo);
fechas.push(new Date(data.fecha.seconds*1000).toLocaleDateString());

if(data.tiempo<best)best=data.tiempo;
if(data.velocidad>speed)speed=data.velocidad;

historyBody.innerHTML+=`<tr><td>${data.tiempo}</td><td>${data.velocidad}</td></tr>`;
});

updateUI(best,speed);
updateChart(fechas,tiempos);

});
}

// RIVALES
async function findRivals(user){
const snap=await getDocs(collection(db,"users"));
return snap.docs.map(d=>d.data()).filter(u=>u.categoria===user.categoria).slice(0,5);
}

function renderRivals(r){
rivals.innerHTML=r.map(x=>`<div class="rival">${x.name} ${x.bestTime}</div>`).join("");
}

// RANKING
async function loadRanking(){
const snap=await getDocs(query(collection(db,"users"),orderBy("bestTime","asc"),limit(10)));
rankingList.innerHTML="";
snap.forEach((d,i)=>{
const u=d.data();
rankingList.innerHTML+=`<div class="rank-card">#${i+1} ${u.name} ${u.bestTime}</div>`;
});
}

// FEED
window.createPost=async()=>{
await addDoc(collection(db,"posts"),{
uid:auth.currentUser.uid,
text:postText.value,
date:new Date()
});
postText.value="";
};

async function loadFeed(){
const snap=await getDocs(query(collection(db,"posts"),orderBy("date","desc"),limit(20)));
feedList.innerHTML="";
snap.forEach(async d=>{
const p=d.data();
const u=(await getDoc(doc(db,"users",p.uid))).data();
feedList.innerHTML+=`<div class="post"><div class="post-header"><img src="${u?.photoURL||''}"><b>${u?.name}</b></div><p>${p.text}</p></div>`;
});
}

// DUELOS
window.createDuel=async()=>{
await addDoc(collection(db,"duels"),{
from:auth.currentUser.uid,
status:"pending",
createdAt:new Date()
});
};

async function loadDuels(){
const snap=await getDocs(collection(db,"duels"));
duelList.innerHTML="";
snap.forEach(d=>{
duelList.innerHTML+=`<div class="duel">${d.data().status}</div>`;
});
}

// CHART
function updateChart(labels,data){
if(mainChart)mainChart.destroy();
mainChart=new Chart(performanceChart,{type:"line",data:{labels,datasets:[{data,borderColor:"#00ff88"}]}});
}

// UI
function updateUI(best,speed){
bestTime.innerText=best!==999?best:"--";
maxSpeedDisplay.innerText=speed;
}

// LOGOUT
window.logout=()=>signOut(auth);
