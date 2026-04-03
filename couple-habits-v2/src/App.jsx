import { useState, useEffect, useCallback, useRef } from "react";
import { sync } from "./storage.js";

// ─── CONSTANTS ───
const DAYS_ES = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
const HABIT_ICONS = ["🌱","💧","📖","🏃","🧘","💤","🍎","✍️","🎯","💪","🧠","🎨","🎵","🧹","💊","🚶","🥗","📝","⏰","🌅","🚿","💻","☀️","📵","🫁","🤝","❤️","👫","🏠","🐕"];
const FINANCE_ICONS = ["✈️","🏖️","🍽️","🎬","🏠","💰","📈","🎓","💍","🚗","🎁","🏥","👶","🐶","🎉","💻"];

const CAT_COLORS = {
  salud:{bg:"#E8F5E9",accent:"#2E7D32",light:"#C8E6C9",emoji:"💚"},
  mente:{bg:"#E3F2FD",accent:"#1565C0",light:"#BBDEFB",emoji:"💙"},
  productividad:{bg:"#FFF3E0",accent:"#E65100",light:"#FFE0B2",emoji:"🧡"},
  bienestar:{bg:"#F3E5F5",accent:"#7B1FA2",light:"#E1BEE7",emoji:"💜"},
  pareja:{bg:"#FCE4EC",accent:"#C62828",light:"#F8BBD0",emoji:"❤️"},
  fitness:{bg:"#E0F2F1",accent:"#00695C",light:"#B2DFDB",emoji:"💪"},
  finanzas:{bg:"#FFF8E1",accent:"#F57F17",light:"#FFF9C4",emoji:"💰"},
};

const FIN_CATS = ["viajes","comida","salidas","ahorro","inversión","hogar","educación","emergencias","regalo","otro"];

const COUPLE_BADGES = [
  {id:"c_first",name:"Primera Meta Juntos",icon:"💕",desc:"Completen un hábito compartido",check:(h,t)=>h.some(x=>x.shared&&x.completions?.u1?.[t]&&x.completions?.u2?.[t])},
  {id:"c_week",name:"Semana en Equipo",icon:"🔥",desc:"7 días seguidos ambos",check:h=>h.some(x=>x.shared&&coupleStreak(x)>=7)},
  {id:"c_sync",name:"Sincronizados",icon:"⚡",desc:"Día perfecto compartido",check:(h,t)=>{const sh=h.filter(x=>x.shared);return sh.length>=2&&sh.every(x=>x.completions?.u1?.[t]&&x.completions?.u2?.[t])}},
  {id:"c_saver",name:"Ahorradores",icon:"💰",desc:"Meta financiera al 50%",check:(_,__,f)=>f.some(g=>((g.saved||0)/(g.target||1))>=.5)},
  {id:"c_rich",name:"Meta Cumplida",icon:"🏆",desc:"Completen una meta financiera",check:(_,__,f)=>f.some(g=>g.saved>=g.target)},
  {id:"c_month",name:"Mes Imparable",icon:"👑",desc:"30 días de racha juntos",check:h=>h.some(x=>x.shared&&coupleStreak(x)>=30)},
  {id:"c_five",name:"Dream Team",icon:"🌟",desc:"5 hábitos compartidos",check:h=>h.filter(x=>x.shared).length>=5},
  {id:"c_verify",name:"Confío en Ti",icon:"📸",desc:"10 verificaciones aprobadas",check:(_,__,___,v)=>(v||[]).filter(x=>x.status==="approved").length>=10},
  {id:"c_3goals",name:"Planificadores",icon:"📋",desc:"3 metas financieras",check:(_,__,f)=>f.length>=3},
  {id:"c_love",name:"Amor Incondicional",icon:"💞",desc:"60 días de racha juntos",check:h=>h.some(x=>x.shared&&coupleStreak(x)>=60)},
];

const REWARDS = [
  {streak:7,title:"Noche de Película 🎬",desc:"Elijan una peli juntos"},
  {streak:14,title:"Cena Especial 🍽️",desc:"Cocinen algo nuevo o salgan a cenar"},
  {streak:21,title:"Día de Aventura 🗺️",desc:"Exploren un lugar nuevo"},
  {streak:30,title:"Regalo Sorpresa 🎁",desc:"Un detalle para el otro"},
  {streak:60,title:"Escapada Fin de Semana ✈️",desc:"¡Se lo merecen!"},
];

// ─── HELPERS ───
function getToday(){const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function getLast30(){return Array.from({length:30},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(29-i));return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`})}
function getLast7(){return Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`})}

function userStreak(c,uid){const uc=c?.[uid]||{};let s=0;const t=new Date();for(let i=0;i<=365;i++){const d=new Date(t);d.setDate(t.getDate()-i);const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;if(uc[k])s++;else if(i>0)break}return s}
function coupleStreak(h){let s=0;const t=new Date();const c=h.completions||{};for(let i=0;i<=365;i++){const d=new Date(t);d.setDate(t.getDate()-i);const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;if(c.u1?.[k]&&c.u2?.[k])s++;else if(i>0)break}return s}
function getStrength(c,uid){const l=getLast30();const uc=c?.[uid]||{};const done=l.filter(d=>uc[d]).length;if(done>=25)return{level:"Arraigado",pct:100,color:"#2E7D32"};if(done>=18)return{level:"Fuerte",pct:75,color:"#558B2F"};if(done>=10)return{level:"En desarrollo",pct:50,color:"#F9A825"};if(done>=4)return{level:"Frágil",pct:25,color:"#E65100"};return{level:"Nuevo",pct:8,color:"#B0A89E"}}

async function resizeImage(file,maxW=400){return new Promise(res=>{const r=new FileReader();r.onload=e=>{const img=new Image();img.onload=()=>{const c=document.createElement("canvas");const ratio=Math.min(maxW/img.width,maxW/img.height,1);c.width=img.width*ratio;c.height=img.height*ratio;c.getContext("2d").drawImage(img,0,0,c.width,c.height);res(c.toDataURL("image/jpeg",0.6))};img.src=e.target.result};r.readAsDataURL(file)})}

const EMPTY_DATA = {habits:[],finance:[],verifications:[],badges:[]};

export default function App(){
  const [data,setData]=useState(EMPTY_DATA);
  const [setup,setSetup]=useState(null);
  const [myRole,setMyRole]=useState(null);
  const [roomCode,setRoomCode]=useState(null);
  const [view,setView]=useState("home");
  const [loaded,setLoaded]=useState(false);
  const [toast,setToast]=useState(null);
  const [modal,setModal]=useState(null);
  const [newBadge,setNewBadge]=useState(null);
  const [connected,setConnected]=useState(false);
  const [screen,setScreen]=useState("loading"); // loading, create, join, selectRole, app

  const [setupForm,setSetupForm]=useState({myName:"",partnerName:"",myEmoji:"💙",partnerEmoji:"💖"});
  const [joinCode,setJoinCode]=useState("");
  const [habitForm,setHabitForm]=useState({name:"",icon:"🌱",category:"pareja",shared:true,needsVerification:false,restDays:[]});
  const [finForm,setFinForm]=useState({name:"",icon:"✈️",target:"",category:"viajes"});
  const [contribForm,setContribForm]=useState({amount:"",goalId:null,who:""});

  const fileRef=useRef(null);
  const [pendingVerify,setPendingVerify]=useState(null);
  const channelRef=useRef(null);
  const savingRef=useRef(false);

  const showToast=m=>{setToast(m);setTimeout(()=>setToast(null),2800)};

  // ─── INIT ───
  useEffect(()=>{
    (async()=>{
      const code=sync.getRoomCode();
      const role=sync.getRole();
      if(code){
        setRoomCode(code);
        const room=await sync.getRoomData();
        if(room){
          setData(room.data||EMPTY_DATA);
          setSetup(room.setup||null);
          if(role){setMyRole(role);setScreen("app")}
          else setScreen("selectRole");
        }else{
          sync.clear();
          setScreen("create");
        }
      }else{
        setScreen("create");
      }
      setLoaded(true);
    })();
  },[]);

  // ─── REALTIME SUBSCRIPTION ───
  useEffect(()=>{
    if(!roomCode)return;
    const ch=sync.subscribeToRoom((newRow)=>{
      if(!savingRef.current){
        setData(newRow.data||EMPTY_DATA);
        setSetup(newRow.setup||null);
      }
      setConnected(true);
    });
    channelRef.current=ch;
    setConnected(true);
    return()=>sync.unsubscribe(ch);
  },[roomCode]);

  // ─── SAVE ───
  const save=useCallback(async(d,s)=>{
    setData(d);
    if(s!==undefined)setSetup(s);
    savingRef.current=true;
    await sync.updateRoom(d,s||undefined);
    setTimeout(()=>{savingRef.current=false},1000);
  },[]);

  const checkBadges=(d)=>{
    const t=getToday();const newB=[];
    COUPLE_BADGES.forEach(b=>{if(!(d.badges||[]).includes(b.id)&&b.check(d.habits,t,d.finance,d.verifications))newB.push(b.id)});
    if(newB.length){setNewBadge(COUPLE_BADGES.find(x=>x.id===newB[0]));setTimeout(()=>setNewBadge(null),3500);return[...(d.badges||[]),...newB]}
    return d.badges||[];
  };

  // ─── CREATE ROOM ───
  const createRoom=async()=>{
    if(!setupForm.myName.trim()||!setupForm.partnerName.trim())return;
    const s={u1:{name:setupForm.myName.trim(),emoji:setupForm.myEmoji},u2:{name:setupForm.partnerName.trim(),emoji:setupForm.partnerEmoji}};
    const result=await sync.createRoom(s,EMPTY_DATA);
    if(result){
      sync.setRole("u1");
      setMyRole("u1");
      setRoomCode(result.code);
      setSetup(s);
      setScreen("app");
      showToast("¡Sala creada! Código: "+result.code);
    }else{
      showToast("Error al crear sala ❌");
    }
  };

  // ─── JOIN ROOM ───
  const joinRoom=async()=>{
    if(!joinCode.trim()||joinCode.trim().length<6)return;
    const room=await sync.joinRoom(joinCode.trim());
    if(room){
      setData(room.data||EMPTY_DATA);
      setSetup(room.setup||null);
      setRoomCode(joinCode.trim().toUpperCase());
      setScreen("selectRole");
      showToast("¡Conectado! 💕");
    }else{
      showToast("Código no encontrado ❌");
    }
  };

  const selectRole=(role)=>{
    sync.setRole(role);
    setMyRole(role);
    setScreen("app");
  };

  // ─── HABITS ───
  const addHabit=()=>{if(!habitForm.name.trim())return;const h={id:Date.now().toString(),...habitForm,name:habitForm.name.trim(),completions:{u1:{},u2:{}},createdAt:getToday()};const nd={...data,habits:[...data.habits,h]};nd.badges=checkBadges(nd);save(nd);setHabitForm({name:"",icon:"🌱",category:"pareja",shared:true,needsVerification:false,restDays:[]});setModal(null);showToast("¡Hábito creado! 🎉")};

  const toggleHabit=(habitId,date,uid)=>{const nd={...data,habits:data.habits.map(h=>{if(h.id!==habitId)return h;const c={...h.completions};if(!c[uid])c[uid]={};c[uid]={...c[uid]};if(c[uid][date])delete c[uid][date];else c[uid][date]=true;return{...h,completions:c}})};nd.badges=checkBadges(nd);save(nd)};

  const submitVerification=async(habitId,date,file)=>{if(!file)return;const photo=await resizeImage(file);const v={id:Date.now().toString(),habitId,date,from:myRole,photo,status:"pending",createdAt:new Date().toISOString()};const nd={...data,verifications:[...(data.verifications||[]),v]};save(nd);setPendingVerify(null);showToast("📸 Foto enviada")};

  const reviewVerification=(vId,approved)=>{const nd={...data,verifications:(data.verifications||[]).map(v=>{if(v.id!==vId)return v;return{...v,status:approved?"approved":"rejected"}})};if(approved){const v=nd.verifications.find(x=>x.id===vId);if(v){nd.habits=nd.habits.map(h=>{if(h.id!==v.habitId)return h;const c={...h.completions};if(!c[v.from])c[v.from]={};c[v.from]={...c[v.from],[v.date]:true};return{...h,completions:c}})}}nd.badges=checkBadges(nd);save(nd);showToast(approved?"✅ Aprobado":"❌ Rechazado")};

  // ─── FINANCE ───
  const addFinGoal=()=>{if(!finForm.name.trim()||!finForm.target)return;const g={id:Date.now().toString(),...finForm,name:finForm.name.trim(),target:parseFloat(finForm.target),saved:0,contributions:[],createdAt:getToday()};const nd={...data,finance:[...data.finance,g]};nd.badges=checkBadges(nd);save(nd);setFinForm({name:"",icon:"✈️",target:"",category:"viajes"});setModal(null);showToast("¡Meta creada! 💰")};

  const addContribution=()=>{if(!contribForm.amount||!contribForm.goalId)return;const amt=parseFloat(contribForm.amount);if(isNaN(amt)||amt<=0)return;const nd={...data,finance:data.finance.map(g=>{if(g.id!==contribForm.goalId)return g;return{...g,saved:(g.saved||0)+amt,contributions:[...(g.contributions||[]),{amount:amt,who:contribForm.who||myRole,date:getToday()}]}})};nd.badges=checkBadges(nd);save(nd);setContribForm({amount:"",goalId:null,who:""});setModal(null);showToast(`+S/.${amt.toFixed(2)} 🎉`)};

  const deleteHabit=id=>{save({...data,habits:data.habits.filter(h=>h.id!==id)});setModal(null);showToast("Eliminado")};
  const deleteGoal=id=>{save({...data,finance:data.finance.filter(g=>g.id!==id)});setModal(null);showToast("Eliminada")};

  // ─── COMPUTED ───
  const today=getToday();
  const partner=myRole==="u1"?"u2":"u1";
  const myName=setup?.[myRole]?.name||"Yo";
  const partnerName=setup?.[partner]?.name||"Mi pareja";
  const myEmoji=setup?.[myRole]?.emoji||"💙";
  const partnerEmoji=setup?.[partner]?.emoji||"💖";
  const pendingForMe=(data.verifications||[]).filter(v=>v.from===partner&&v.status==="pending");
  const myPending=(data.verifications||[]).filter(v=>v.from===myRole&&v.status==="pending");
  const totalSaved=data.finance.reduce((s,g)=>s+(g.saved||0),0);
  const totalTarget=data.finance.reduce((s,g)=>s+(g.target||0),0);
  const bestCoupleStreak=data.habits.filter(h=>h.shared).reduce((best,h)=>Math.max(best,coupleStreak(h)),0);
  const nextReward=REWARDS.find(r=>bestCoupleStreak<r.streak);
  const dow=new Date().getDay()===0?6:new Date().getDay()-1;
  const todayHabits=data.habits.filter(h=>!(h.restDays||[]).includes(dow));
  const myDoneCount=todayHabits.filter(h=>h.completions?.[myRole]?.[today]).length;
  const myRate=todayHabits.length?Math.round((myDoneCount/todayHabits.length)*100):0;

  const NAV=[{id:"home",icon:"📋",label:"Hoy",badge:0},{id:"couple",icon:"👫",label:"Pareja",badge:pendingForMe.length},{id:"finance",icon:"💰",label:"Finanzas",badge:0},{id:"rewards",icon:"🏆",label:"Logros",badge:0}];

  const CSS=`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@400;600;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
    @keyframes slideUp{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}
    @keyframes pop{0%{transform:scale(.8)}50%{transform:scale(1.15)}100%{transform:scale(1)}}
    @keyframes slideDown{from{transform:translateY(-20px);opacity:0}to{transform:translateY(0);opacity:1}}
    @keyframes badgePop{0%{transform:scale(0) rotate(-20deg);opacity:0}50%{transform:scale(1.2) rotate(5deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
    @keyframes glow{0%,100%{box-shadow:0 0 8px rgba(198,40,40,.2)}50%{box-shadow:0 0 20px rgba(198,40,40,.4)}}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}
    .check-done{animation:pop .3s ease-out}.toast{animation:slideDown .3s ease-out}
    .card{animation:slideUp .4s ease-out both}
    .badge-pop{animation:badgePop .5s cubic-bezier(.175,.885,.32,1.275) both}
    .badge-glow{animation:glow 2s ease-in-out infinite}
    .btn{transition:all .2s;cursor:pointer}.btn:active{transform:scale(.97)}
    .row{transition:all .15s}.row:active{transform:scale(.98)}
    input:focus,textarea:focus,select:focus{outline:none;border-color:#C62828!important}
    ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#D4C9BE;border-radius:4px}
    .live-dot{width:8px;height:8px;border-radius:50%;background:#2E7D32;animation:blink 2s infinite;display:inline-block}
  `;

  // ─── LOADING ───
  if(screen==="loading")return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"'DM Sans'",background:"#FBF8F4"}}>
      <style>{CSS}</style>
      <div style={{textAlign:"center"}}><div style={{fontSize:48,marginBottom:16,animation:"pulse 1.5s infinite"}}>💕</div><p style={{color:"#8B7E74"}}>Conectando...</p></div>
    </div>
  );

  // ─── CREATE / JOIN SCREEN ───
  if(screen==="create")return(
    <div style={{fontFamily:"'DM Sans'",background:"linear-gradient(180deg,#FBF8F4,#FCE4EC)",minHeight:"100vh",maxWidth:480,margin:"0 auto",padding:24}}>
      <style>{CSS}</style>
      {toast&&<div className="toast" style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:"#2E2A25",color:"#fff",padding:"10px 20px",borderRadius:12,fontSize:14,fontWeight:500,zIndex:1000}}>{toast}</div>}
      <div className="card" style={{textAlign:"center",paddingTop:50}}>
        <div style={{fontSize:72,marginBottom:16}}>👫</div>
        <h1 style={{fontFamily:"'Playfair Display'",fontSize:28,color:"#2E2A25",marginBottom:8}}>Hábitos en Pareja</h1>
        <p style={{fontSize:14,color:"#8B7E74",lineHeight:1.6,marginBottom:32,maxWidth:300,margin:"0 auto 32px"}}>Construyan juntos la vida que sueñan. Sincronización automática en tiempo real.</p>

        {/* CREATE */}
        <div style={{background:"#fff",borderRadius:20,padding:24,textAlign:"left",boxShadow:"0 4px 20px rgba(0,0,0,.06)",marginBottom:16}}>
          <h3 style={{fontSize:16,fontWeight:600,color:"#2E2A25",marginBottom:16}}>Crear sala de pareja</h3>
          <label style={{fontSize:12,fontWeight:600,color:"#8B7E74",display:"block",marginBottom:4}}>Tu nombre</label>
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            <input value={setupForm.myName} onChange={e=>setSetupForm({...setupForm,myName:e.target.value})} placeholder="Tu nombre" style={{flex:1,padding:"12px 14px",borderRadius:12,border:"2px solid #E8E0D8",fontSize:15,fontFamily:"'DM Sans'"}}/>
            <select value={setupForm.myEmoji} onChange={e=>setSetupForm({...setupForm,myEmoji:e.target.value})} style={{padding:8,borderRadius:12,border:"2px solid #E8E0D8",fontSize:20,background:"#fff"}}>
              {["💙","💚","🧡","💜","💛","🖤","🤍"].map(e=><option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <label style={{fontSize:12,fontWeight:600,color:"#8B7E74",display:"block",marginBottom:4}}>Nombre de tu pareja</label>
          <div style={{display:"flex",gap:8,marginBottom:20}}>
            <input value={setupForm.partnerName} onChange={e=>setSetupForm({...setupForm,partnerName:e.target.value})} placeholder="Su nombre" style={{flex:1,padding:"12px 14px",borderRadius:12,border:"2px solid #E8E0D8",fontSize:15,fontFamily:"'DM Sans'"}}/>
            <select value={setupForm.partnerEmoji} onChange={e=>setSetupForm({...setupForm,partnerEmoji:e.target.value})} style={{padding:8,borderRadius:12,border:"2px solid #E8E0D8",fontSize:20,background:"#fff"}}>
              {["💖","❤️","💗","💘","🩷","🤎","🩵"].map(e=><option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <button onClick={createRoom} className="btn" style={{width:"100%",padding:16,borderRadius:14,border:"none",background:(setupForm.myName&&setupForm.partnerName)?"#C62828":"#D4C9BE",color:"#fff",fontSize:16,fontWeight:700}}>Crear Sala 💕</button>
        </div>

        {/* JOIN */}
        <div style={{background:"#fff",borderRadius:20,padding:24,textAlign:"left",boxShadow:"0 4px 20px rgba(0,0,0,.06)"}}>
          <h3 style={{fontSize:16,fontWeight:600,color:"#2E2A25",marginBottom:8}}>¿Tu pareja ya creó la sala?</h3>
          <p style={{fontSize:12,color:"#8B7E74",marginBottom:12}}>Ingresa el código de 6 letras que te compartió</p>
          <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase().slice(0,6))} placeholder="Ej: ABC123" maxLength={6} style={{width:"100%",padding:"14px",borderRadius:12,border:"2px solid #E8E0D8",fontSize:24,fontFamily:"monospace",textAlign:"center",letterSpacing:8,fontWeight:700,marginBottom:12}}/>
          <button onClick={joinRoom} className="btn" style={{width:"100%",padding:14,borderRadius:14,border:"none",background:joinCode.length===6?"#C62828":"#D4C9BE",color:"#fff",fontSize:15,fontWeight:600}}>Unirme 🔗</button>
        </div>
      </div>
    </div>
  );

  // ─── SELECT ROLE ───
  if(screen==="selectRole"&&setup)return(
    <div style={{fontFamily:"'DM Sans'",background:"linear-gradient(180deg,#FBF8F4,#FCE4EC)",minHeight:"100vh",maxWidth:480,margin:"0 auto",padding:24}}>
      <style>{CSS}</style>
      <div className="card" style={{textAlign:"center",paddingTop:80}}>
        <div style={{fontSize:64,marginBottom:16}}>👫</div>
        <h2 style={{fontFamily:"'Playfair Display'",fontSize:24,color:"#2E2A25",marginBottom:24}}>¿Quién eres?</h2>
        <div style={{display:"flex",flexDirection:"column",gap:12,maxWidth:280,margin:"0 auto"}}>
          <button onClick={()=>selectRole("u1")} className="btn" style={{padding:18,borderRadius:16,border:"2px solid #E8E0D8",background:"#fff",fontSize:16,fontWeight:600,display:"flex",alignItems:"center",gap:12,justifyContent:"center"}}>
            <span style={{fontSize:28}}>{setup.u1.emoji}</span>{setup.u1.name}
          </button>
          <button onClick={()=>selectRole("u2")} className="btn" style={{padding:18,borderRadius:16,border:"2px solid #E8E0D8",background:"#fff",fontSize:16,fontWeight:600,display:"flex",alignItems:"center",gap:12,justifyContent:"center"}}>
            <span style={{fontSize:28}}>{setup.u2.emoji}</span>{setup.u2.name}
          </button>
        </div>
      </div>
    </div>
  );

  if(screen!=="app")return null;

  // ═══════════════════════════════════════
  // ─── MAIN APP ───
  // ═══════════════════════════════════════
  return(
    <div style={{fontFamily:"'DM Sans'",background:"#FBF8F4",minHeight:"100vh",maxWidth:480,margin:"0 auto",position:"relative",paddingBottom:80}}>
      <style>{CSS}</style>
      {toast&&<div className="toast" style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:"#2E2A25",color:"#fff",padding:"10px 20px",borderRadius:12,fontSize:14,fontWeight:500,zIndex:1000,boxShadow:"0 8px 24px rgba(0,0,0,.15)",whiteSpace:"nowrap"}}>{toast}</div>}

      {newBadge&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:1100,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setNewBadge(null)}>
        <div className="badge-pop" style={{background:"linear-gradient(135deg,#FCE4EC,#F8BBD0)",borderRadius:24,padding:32,textAlign:"center",maxWidth:300,boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
          <div style={{fontSize:64,marginBottom:12}}>{newBadge.icon}</div>
          <h3 style={{fontFamily:"'Playfair Display'",fontSize:22,color:"#2E2A25",marginBottom:4}}>¡Logro en pareja!</h3>
          <p style={{fontSize:16,fontWeight:600,color:"#C62828",marginBottom:4}}>{newBadge.name}</p>
          <p style={{fontSize:13,color:"#8B7E74"}}>{newBadge.desc}</p>
        </div>
      </div>}

      <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>{if(e.target.files[0]&&pendingVerify)submitVerification(pendingVerify.habitId,pendingVerify.date,e.target.files[0]);e.target.value=""}}/>

      {/* HEADER */}
      <div style={{padding:"20px 20px 0",background:"linear-gradient(180deg,#F8E8EC,#FBF8F4)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div>
            <h1 style={{fontFamily:"'Playfair Display'",fontSize:22,fontWeight:700,color:"#2E2A25"}}>{myEmoji} {myName} & {partnerName} {partnerEmoji}</h1>
            <p style={{fontSize:12,color:"#8B7E74",marginTop:2,display:"flex",alignItems:"center",gap:6}}>
              <span className="live-dot"></span> En vivo · Sala: <strong>{roomCode}</strong>
              {bestCoupleStreak>0&&<span> · 🔥 {bestCoupleStreak}d</span>}
            </p>
          </div>
        </div>

        {todayHabits.length>0&&(
          <div style={{background:"#fff",borderRadius:16,padding:14,marginTop:8,marginBottom:4,boxShadow:"0 2px 8px rgba(0,0,0,.04)"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontSize:12,fontWeight:600,color:"#2E2A25"}}>{myName}</span>
              <span style={{fontSize:18,fontWeight:700,color:myRate===100?"#2E7D32":"#2E2A25",fontFamily:"'Playfair Display'"}}>{myRate}%</span>
            </div>
            <div style={{background:"#F0E9E0",borderRadius:100,height:8,overflow:"hidden"}}>
              <div style={{width:`${myRate}%`,height:"100%",borderRadius:100,transition:"width .5s",background:myRate===100?"linear-gradient(90deg,#66BB6A,#2E7D32)":"linear-gradient(90deg,#F48FB1,#C62828)"}}/>
            </div>
            {pendingForMe.length>0&&<p style={{fontSize:11,color:"#C62828",marginTop:6,fontWeight:600}}>📸 {pendingForMe.length} verificación(es) pendiente(s)</p>}
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div style={{padding:"12px 20px 20px"}}>

        {/* HOME */}
        {view==="home"&&(<div>
          {data.habits.length===0?(<div className="card" style={{textAlign:"center",padding:"50px 20px"}}><div style={{fontSize:64,marginBottom:16}}>💕</div><h2 style={{fontFamily:"'Playfair Display'",fontSize:22,color:"#2E2A25",marginBottom:8}}>¡Empiecen juntos!</h2><p style={{fontSize:14,color:"#8B7E74",marginBottom:24}}>Creen su primer hábito de pareja</p><button onClick={()=>setModal("addHabit")} className="btn" style={{background:"#C62828",color:"#fff",border:"none",padding:"14px 28px",borderRadius:14,fontSize:15,fontWeight:600}}>+ Crear Hábito</button></div>
          ):(<>
            {data.habits.map((h,idx)=>{const colors=CAT_COLORS[h.category]||CAT_COLORS.pareja;const myDoneH=h.completions?.[myRole]?.[today];const partnerDoneH=h.completions?.[partner]?.[today];const streak=h.shared?coupleStreak(h):userStreak(h.completions,myRole);const isRest=(h.restDays||[]).includes(dow);const hasPendingV=(data.verifications||[]).some(v=>v.habitId===h.id&&v.date===today&&v.from===myRole&&v.status==="pending");
              return(<div key={h.id} className="card row" style={{background:"#fff",borderRadius:16,padding:14,marginBottom:10,borderLeft:`4px solid ${colors.accent}`,boxShadow:"0 1px 4px rgba(0,0,0,.04)",animationDelay:`${idx*.05}s`}} onClick={()=>setModal({type:"habitDetail",habit:h})}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <button onClick={e=>{e.stopPropagation();if(isRest)return;if(h.needsVerification&&!myDoneH){setPendingVerify({habitId:h.id,date:today});fileRef.current?.click();return}toggleHabit(h.id,today,myRole)}} className={myDoneH?"check-done":""} style={{width:42,height:42,borderRadius:12,border:`2px solid ${myDoneH?colors.accent:isRest?"#E8E0D8":"#D4C9BE"}`,background:myDoneH?colors.bg:isRest?"#F8F5F1":"#fff",cursor:isRest?"default":"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {isRest?"😴":hasPendingV?"⏳":myDoneH?"✓":h.needsVerification?"📸":h.icon}
                  </button>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:600,color:"#2E2A25",textDecoration:myDoneH?"line-through":"none"}}>{h.name}</div>
                    <div style={{display:"flex",gap:6,alignItems:"center",marginTop:3,flexWrap:"wrap"}}>
                      <span style={{background:colors.bg,color:colors.accent,padding:"2px 7px",borderRadius:6,fontSize:10,fontWeight:600}}>{h.category}</span>
                      {h.shared&&<span style={{fontSize:10,color:"#C62828",fontWeight:600}}>👫</span>}
                      {h.needsVerification&&<span style={{fontSize:10,color:"#F57F17",fontWeight:600}}>📸</span>}
                      {streak>0&&<span style={{fontSize:10,color:"#8B7E74"}}>🔥{streak}d</span>}
                    </div>
                  </div>
                  {h.shared&&(<div style={{textAlign:"center",flexShrink:0}}><div style={{width:30,height:30,borderRadius:10,background:partnerDoneH?"#E8F5E9":"#F5F0EB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,border:partnerDoneH?"2px solid #2E7D32":"2px solid #E8E0D8"}}>{partnerDoneH?"✓":partnerEmoji}</div><span style={{fontSize:8,color:"#8B7E74"}}>{setup?.[partner]?.name?.slice(0,6)}</span></div>)}
                </div>
              </div>)
            })}
            {nextReward&&bestCoupleStreak>0&&(<div className="card" style={{background:"linear-gradient(135deg,#FFF8E1,#FFE0B2)",borderRadius:16,padding:14,marginTop:8,textAlign:"center"}}><p style={{fontSize:12,color:"#E65100",fontWeight:600}}>🎁 Próxima recompensa en {nextReward.streak-bestCoupleStreak} días: {nextReward.title}</p></div>)}
          </>)}
        </div>)}

        {/* COUPLE */}
        {view==="couple"&&(<div>
          {pendingForMe.length>0&&(<div style={{marginBottom:16}}><h3 style={{fontFamily:"'Playfair Display'",fontSize:18,color:"#2E2A25",marginBottom:10}}>📸 Verificaciones Pendientes</h3>
            {pendingForMe.map(v=>{const habit=data.habits.find(h=>h.id===v.habitId);return(<div key={v.id} className="card" style={{background:"#fff",borderRadius:16,padding:16,marginBottom:10,boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
              <div style={{marginBottom:10}}><span style={{fontSize:14,fontWeight:600}}>{habit?.icon} {habit?.name}</span><p style={{fontSize:11,color:"#8B7E74"}}>{partnerName} · {v.date}</p></div>
              {v.photo&&v.photo!=="[foto]"&&<img src={v.photo} alt="Verificación" style={{width:"100%",borderRadius:12,marginBottom:10,maxHeight:250,objectFit:"cover"}}/>}
              <div style={{display:"flex",gap:10}}><button onClick={()=>reviewVerification(v.id,false)} className="btn" style={{flex:1,padding:12,borderRadius:12,border:"2px solid #FFCDD2",background:"#fff",color:"#C62828",fontWeight:600,fontSize:13}}>❌ Rechazar</button><button onClick={()=>reviewVerification(v.id,true)} className="btn" style={{flex:2,padding:12,borderRadius:12,border:"none",background:"#2E7D32",color:"#fff",fontWeight:600,fontSize:13}}>✅ Aprobar</button></div>
            </div>)})}
          </div>)}
          <h3 style={{fontFamily:"'Playfair Display'",fontSize:18,color:"#2E2A25",marginBottom:10}}>Progreso en Pareja</h3>
          {data.habits.filter(h=>h.shared).map(h=>{const cs=coupleStreak(h);const colors=CAT_COLORS[h.category]||CAT_COLORS.pareja;const last7=getLast7();return(<div key={h.id} className="card" style={{background:"#fff",borderRadius:16,padding:14,marginBottom:10,boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}>
            <div style={{fontSize:14,fontWeight:600,color:"#2E2A25",marginBottom:8}}>{h.icon} {h.name} {cs>0&&<span style={{fontSize:11,color:"#C62828"}}>🔥 {cs}d</span>}</div>
            <div style={{display:"flex",gap:4}}>{last7.map(date=>{const u1=h.completions?.u1?.[date];const u2=h.completions?.u2?.[date];const both=u1&&u2;return(<div key={date} style={{flex:1,textAlign:"center"}}><div style={{height:36,borderRadius:8,background:both?colors.accent:u1||u2?"#FFE0B2":"#F0E9E0",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1}}>{u1&&<span style={{fontSize:8}}>{setup?.u1?.emoji}</span>}{u2&&<span style={{fontSize:8}}>{setup?.u2?.emoji}</span>}</div><span style={{fontSize:9,color:"#B0A89E"}}>{date.split("-")[2]}</span></div>)})}</div>
          </div>)})}
          {myPending.length>0&&(<div style={{marginTop:12}}><h4 style={{fontSize:14,fontWeight:600,color:"#8B7E74",marginBottom:8}}>⏳ Tus envíos pendientes</h4>{myPending.map(v=>{const habit=data.habits.find(h=>h.id===v.habitId);return(<div key={v.id} style={{background:"#FFF8E1",borderRadius:12,padding:12,marginBottom:8,fontSize:13,color:"#F57F17"}}>{habit?.icon} {habit?.name} — esperando aprobación</div>)})}</div>)}
          {data.habits.filter(h=>h.shared).length===0&&pendingForMe.length===0&&(<div style={{textAlign:"center",padding:40,color:"#8B7E74"}}><div style={{fontSize:48,marginBottom:12}}>👫</div><p>Creen hábitos compartidos</p></div>)}
        </div>)}

        {/* FINANCE */}
        {view==="finance"&&(<div>
          <div className="card" style={{background:"linear-gradient(135deg,#FFF8E1,#FFE0B2)",borderRadius:16,padding:18,marginBottom:16,marginTop:4}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><span style={{fontSize:14,fontWeight:600,color:"#2E2A25"}}>Ahorro Total</span><span style={{fontSize:24,fontWeight:700,fontFamily:"'Playfair Display'",color:"#E65100"}}>S/.{totalSaved.toFixed(0)}</span></div>
            {totalTarget>0&&<><div style={{background:"rgba(255,255,255,.5)",borderRadius:100,height:8,overflow:"hidden"}}><div style={{width:`${Math.min(100,(totalSaved/totalTarget)*100)}%`,height:"100%",borderRadius:100,background:"linear-gradient(90deg,#FFB74D,#E65100)"}}/></div><p style={{fontSize:11,color:"#8B7E74",marginTop:4}}>S/.{totalSaved.toFixed(0)} de S/.{totalTarget.toFixed(0)} ({Math.round((totalSaved/totalTarget)*100)}%)</p></>}
          </div>
          {data.finance.map((g,idx)=>{const pct=Math.min(100,Math.round(((g.saved||0)/(g.target||1))*100));const complete=g.saved>=g.target;return(<div key={g.id} className="card" onClick={()=>setModal({type:"goalDetail",goal:g})} style={{background:"#fff",borderRadius:16,padding:16,marginBottom:10,boxShadow:"0 1px 4px rgba(0,0,0,.04)",cursor:"pointer",animationDelay:`${idx*.05}s`,border:complete?"2px solid #2E7D32":"none"}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}><div style={{width:44,height:44,borderRadius:14,background:complete?"#E8F5E9":"#FFF8E1",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{g.icon}</div><div style={{flex:1}}><div style={{fontSize:14,fontWeight:600,color:"#2E2A25"}}>{g.name}{complete&&" ✅"}</div><span style={{fontSize:11,color:"#8B7E74"}}>{g.category}</span></div><div style={{textAlign:"right"}}><div style={{fontSize:16,fontWeight:700,color:complete?"#2E7D32":"#2E2A25",fontFamily:"'Playfair Display'"}}>{(g.saved||0).toFixed(0)}</div><span style={{fontSize:10,color:"#8B7E74"}}>de {g.target}</span></div></div>
            <div style={{background:"#F0E9E0",borderRadius:100,height:8,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",borderRadius:100,background:complete?"linear-gradient(90deg,#66BB6A,#2E7D32)":"linear-gradient(90deg,#FFB74D,#E65100)"}}/></div>
          </div>)})}
          <div style={{display:"flex",gap:10,marginTop:8}}>
            <button onClick={()=>setModal("addFinGoal")} className="btn" style={{flex:1,padding:14,borderRadius:14,border:"none",background:"#E65100",color:"#fff",fontWeight:600,fontSize:14}}>+ Nueva Meta</button>
            {data.finance.length>0&&<button onClick={()=>setModal("addContrib")} className="btn" style={{flex:1,padding:14,borderRadius:14,border:"2px solid #E65100",background:"#fff",color:"#E65100",fontWeight:600,fontSize:14}}>+ Abonar</button>}
          </div>
          {data.finance.length===0&&(<div style={{textAlign:"center",padding:40,color:"#8B7E74"}}><div style={{fontSize:48,marginBottom:12}}>💰</div><p>Creen metas financieras juntos</p></div>)}
        </div>)}

        {/* REWARDS */}
        {view==="rewards"&&(<div>
          <h3 style={{fontFamily:"'Playfair Display'",fontSize:20,color:"#2E2A25",marginBottom:4,marginTop:4}}>Logros en Pareja</h3>
          <p style={{fontSize:12,color:"#8B7E74",marginBottom:16}}>{(data.badges||[]).length}/{COUPLE_BADGES.length} desbloqueados</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
            {COUPLE_BADGES.map(b=>{const unlocked=(data.badges||[]).includes(b.id);return(<div key={b.id} className={`card ${unlocked?"badge-glow":""}`} style={{background:unlocked?"linear-gradient(135deg,#FCE4EC,#F8BBD0)":"#fff",borderRadius:16,padding:14,textAlign:"center",border:unlocked?"2px solid #F48FB1":"2px solid #F0E9E0",opacity:unlocked?1:.5}}><div style={{fontSize:32,marginBottom:4,filter:unlocked?"none":"grayscale(1)"}}>{b.icon}</div><div style={{fontSize:12,fontWeight:700,color:unlocked?"#C62828":"#8B7E74"}}>{b.name}</div><div style={{fontSize:10,color:unlocked?"#8B7E74":"#B0A89E",marginTop:2}}>{b.desc}</div></div>)})}
          </div>
          <h3 style={{fontFamily:"'Playfair Display'",fontSize:18,color:"#2E2A25",marginBottom:12}}>🎁 Recompensas por Racha</h3>
          <p style={{fontSize:12,color:"#8B7E74",marginBottom:12}}>Racha actual: <strong>🔥 {bestCoupleStreak} días</strong></p>
          {REWARDS.map((r,i)=>{const unlocked=bestCoupleStreak>=r.streak;return(<div key={i} className="card" style={{background:unlocked?"linear-gradient(135deg,#FFF8E1,#FFECB3)":"#fff",borderRadius:14,padding:14,marginBottom:8,display:"flex",alignItems:"center",gap:12,border:unlocked?"2px solid #FFD54F":"2px solid #F0E9E0",opacity:unlocked?1:.5}}>
            <div style={{width:44,height:44,borderRadius:12,background:unlocked?"#FFD54F":"#F0E9E0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:unlocked?"#E65100":"#B0A89E",flexShrink:0}}>{r.streak}d</div>
            <div><div style={{fontSize:14,fontWeight:600,color:unlocked?"#2E2A25":"#8B7E74"}}>{r.title}</div><div style={{fontSize:11,color:"#8B7E74"}}>{r.desc}</div></div>
            {unlocked&&<span style={{marginLeft:"auto",fontSize:18}}>🎉</span>}
          </div>)})}
        </div>)}
      </div>

      {/* MODALS */}
      {modal&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setModal(null)}>
        <div className="card" onClick={e=>e.stopPropagation()} style={{background:"#FBF8F4",borderRadius:"24px 24px 0 0",padding:24,width:"100%",maxWidth:480,maxHeight:"85vh",overflowY:"auto"}}>
          <div style={{width:40,height:4,borderRadius:2,background:"#D4C9BE",margin:"0 auto 16px"}}/>

          {/* ADD HABIT */}
          {modal==="addHabit"&&(<>
            <h2 style={{fontFamily:"'Playfair Display'",fontSize:22,color:"#2E2A25",marginBottom:20,textAlign:"center"}}>Nuevo Hábito</h2>
            <div style={{marginBottom:14}}><label style={{fontSize:12,fontWeight:600,display:"block",marginBottom:4}}>Nombre</label><input value={habitForm.name} onChange={e=>setHabitForm({...habitForm,name:e.target.value})} placeholder="Ej: Comer sano juntos" style={{width:"100%",padding:"12px 14px",borderRadius:12,border:"2px solid #E8E0D8",background:"#fff",fontSize:15,fontFamily:"'DM Sans'"}}/></div>
            <div style={{marginBottom:14}}><label style={{fontSize:12,fontWeight:600,display:"block",marginBottom:4}}>Ícono</label><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{HABIT_ICONS.map(ic=><button key={ic} onClick={()=>setHabitForm({...habitForm,icon:ic})} style={{width:36,height:36,borderRadius:10,border:`2px solid ${habitForm.icon===ic?"#2E2A25":"#E8E0D8"}`,background:habitForm.icon===ic?"#F0E9E0":"#fff",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>{ic}</button>)}</div></div>
            <div style={{marginBottom:14}}><label style={{fontSize:12,fontWeight:600,display:"block",marginBottom:4}}>Categoría</label><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{Object.entries(CAT_COLORS).map(([c,col])=><button key={c} onClick={()=>setHabitForm({...habitForm,category:c})} className="btn" style={{padding:"7px 12px",borderRadius:10,border:`2px solid ${habitForm.category===c?col.accent:"transparent"}`,background:col.bg,color:col.accent,fontSize:11,fontWeight:600,textTransform:"capitalize"}}>{col.emoji} {c}</button>)}</div></div>
            <div style={{display:"flex",gap:10,marginBottom:14}}>
              <button onClick={()=>setHabitForm({...habitForm,shared:true})} style={{flex:1,padding:12,borderRadius:12,border:habitForm.shared?"2px solid #C62828":"2px solid #E8E0D8",background:habitForm.shared?"#FCE4EC":"#fff",cursor:"pointer",fontSize:13,fontWeight:600,color:habitForm.shared?"#C62828":"#8B7E74"}}>👫 Compartido</button>
              <button onClick={()=>setHabitForm({...habitForm,shared:false})} style={{flex:1,padding:12,borderRadius:12,border:!habitForm.shared?"2px solid #1565C0":"2px solid #E8E0D8",background:!habitForm.shared?"#E3F2FD":"#fff",cursor:"pointer",fontSize:13,fontWeight:600,color:!habitForm.shared?"#1565C0":"#8B7E74"}}>🙋 Solo mío</button>
            </div>
            <button onClick={()=>setHabitForm({...habitForm,needsVerification:!habitForm.needsVerification})} style={{width:"100%",padding:14,borderRadius:12,border:habitForm.needsVerification?"2px solid #F57F17":"2px solid #E8E0D8",background:habitForm.needsVerification?"#FFF8E1":"#fff",cursor:"pointer",marginBottom:14,textAlign:"left",display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:22}}>📸</span><div><div style={{fontSize:13,fontWeight:600,color:"#2E2A25"}}>Verificación con foto</div><div style={{fontSize:11,color:"#8B7E74"}}>Tu pareja aprueba la foto</div></div><span style={{marginLeft:"auto",fontSize:16,color:habitForm.needsVerification?"#F57F17":"#D4C9BE"}}>{habitForm.needsVerification?"✓":"○"}</span>
            </button>
            <div style={{marginBottom:20}}><label style={{fontSize:12,fontWeight:600,display:"block",marginBottom:4}}>Días de descanso</label><div style={{display:"flex",gap:5}}>{DAYS_ES.map((d,i)=>{const sel=(habitForm.restDays||[]).includes(i);return<button key={i} onClick={()=>{const rd=sel?habitForm.restDays.filter(x=>x!==i):[...habitForm.restDays,i];setHabitForm({...habitForm,restDays:rd})}} style={{flex:1,padding:"8px 0",borderRadius:8,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,background:sel?"#E8E0D8":"#F5F0EB",color:sel?"#2E2A25":"#B0A89E"}}>{d}</button>})}</div></div>
            <button onClick={addHabit} className="btn" style={{width:"100%",padding:14,borderRadius:14,border:"none",background:habitForm.name.trim()?"#C62828":"#D4C9BE",color:"#fff",fontWeight:600,fontSize:15}}>Crear Hábito</button>
          </>)}

          {/* ADD FINANCE */}
          {modal==="addFinGoal"&&(<>
            <h2 style={{fontFamily:"'Playfair Display'",fontSize:22,color:"#2E2A25",marginBottom:20,textAlign:"center"}}>Nueva Meta Financiera</h2>
            <div style={{marginBottom:14}}><label style={{fontSize:12,fontWeight:600,display:"block",marginBottom:4}}>¿Para qué ahorran?</label><input value={finForm.name} onChange={e=>setFinForm({...finForm,name:e.target.value})} placeholder="Ej: Viaje a Cusco" style={{width:"100%",padding:"12px 14px",borderRadius:12,border:"2px solid #E8E0D8",background:"#fff",fontSize:15,fontFamily:"'DM Sans'"}}/></div>
            <div style={{marginBottom:14}}><label style={{fontSize:12,fontWeight:600,display:"block",marginBottom:4}}>Ícono</label><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{FINANCE_ICONS.map(ic=><button key={ic} onClick={()=>setFinForm({...finForm,icon:ic})} style={{width:38,height:38,borderRadius:10,border:`2px solid ${finForm.icon===ic?"#E65100":"#E8E0D8"}`,background:finForm.icon===ic?"#FFF8E1":"#fff",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>{ic}</button>)}</div></div>
            <div style={{marginBottom:14}}><label style={{fontSize:12,fontWeight:600,display:"block",marginBottom:4}}>Categoría</label><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{FIN_CATS.map(c=><button key={c} onClick={()=>setFinForm({...finForm,category:c})} style={{padding:"7px 12px",borderRadius:10,border:finForm.category===c?"2px solid #E65100":"2px solid #E8E0D8",background:finForm.category===c?"#FFF8E1":"#fff",color:finForm.category===c?"#E65100":"#8B7E74",fontSize:11,fontWeight:600,cursor:"pointer",textTransform:"capitalize"}}>{c}</button>)}</div></div>
            <div style={{marginBottom:20}}><label style={{fontSize:12,fontWeight:600,display:"block",marginBottom:4}}>Meta (S/.)</label><input type="number" value={finForm.target} onChange={e=>setFinForm({...finForm,target:e.target.value})} placeholder="1500" style={{width:"100%",padding:"12px 14px",borderRadius:12,border:"2px solid #E8E0D8",background:"#fff",fontSize:15,fontFamily:"'DM Sans'"}}/></div>
            <button onClick={addFinGoal} className="btn" style={{width:"100%",padding:14,borderRadius:14,border:"none",background:(finForm.name.trim()&&finForm.target)?"#E65100":"#D4C9BE",color:"#fff",fontWeight:600,fontSize:15}}>Crear Meta</button>
          </>)}

          {/* ADD CONTRIBUTION */}
          {modal==="addContrib"&&(<>
            <h2 style={{fontFamily:"'Playfair Display'",fontSize:22,color:"#2E2A25",marginBottom:20,textAlign:"center"}}>Registrar Abono</h2>
            <div style={{marginBottom:14}}><label style={{fontSize:12,fontWeight:600,display:"block",marginBottom:4}}>¿A qué meta?</label><div style={{display:"flex",flexDirection:"column",gap:6}}>{data.finance.filter(g=>(g.saved||0)<g.target).map(g=><button key={g.id} onClick={()=>setContribForm({...contribForm,goalId:g.id})} style={{padding:12,borderRadius:12,border:contribForm.goalId===g.id?"2px solid #E65100":"2px solid #E8E0D8",background:contribForm.goalId===g.id?"#FFF8E1":"#fff",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:22}}>{g.icon}</span><div><div style={{fontSize:13,fontWeight:600}}>{g.name}</div><div style={{fontSize:11,color:"#8B7E74"}}>S/.{(g.saved||0).toFixed(0)} de S/.{g.target}</div></div></button>)}</div></div>
            <div style={{marginBottom:14}}><label style={{fontSize:12,fontWeight:600,display:"block",marginBottom:4}}>¿Quién abona?</label><div style={{display:"flex",gap:8}}>{[["u1",setup?.u1],["u2",setup?.u2],["both",{emoji:"👫",name:"Ambos"}]].map(([k,u])=><button key={k} onClick={()=>setContribForm({...contribForm,who:k})} style={{flex:1,padding:10,borderRadius:12,border:contribForm.who===k?"2px solid #C62828":"2px solid #E8E0D8",background:contribForm.who===k?"#FCE4EC":"#fff",cursor:"pointer",fontSize:12,fontWeight:600,textAlign:"center"}}>{u?.emoji} {u?.name?.slice(0,8)}</button>)}</div></div>
            <div style={{marginBottom:20}}><label style={{fontSize:12,fontWeight:600,display:"block",marginBottom:4}}>Monto (S/.)</label><input type="number" value={contribForm.amount} onChange={e=>setContribForm({...contribForm,amount:e.target.value})} placeholder="50" style={{width:"100%",padding:"12px 14px",borderRadius:12,border:"2px solid #E8E0D8",background:"#fff",fontSize:15,fontFamily:"'DM Sans'"}}/></div>
            <button onClick={addContribution} className="btn" style={{width:"100%",padding:14,borderRadius:14,border:"none",background:(contribForm.amount&&contribForm.goalId&&contribForm.who)?"#E65100":"#D4C9BE",color:"#fff",fontWeight:600,fontSize:15}}>Registrar Abono</button>
          </>)}

          {/* HABIT DETAIL */}
          {modal?.type==="habitDetail"&&(()=>{const h=data.habits.find(x=>x.id===modal.habit.id)||modal.habit;const colors=CAT_COLORS[h.category]||CAT_COLORS.pareja;const myS=userStreak(h.completions,myRole);const cs=h.shared?coupleStreak(h):0;const str=getStrength(h.completions,myRole);const last30=getLast30();return(<>
            <div style={{textAlign:"center",marginBottom:16}}><div style={{fontSize:48,marginBottom:8}}>{h.icon}</div><h2 style={{fontFamily:"'Playfair Display'",fontSize:22,color:"#2E2A25"}}>{h.name}</h2><div style={{display:"flex",gap:6,justifyContent:"center",marginTop:6}}><span style={{background:colors.bg,color:colors.accent,padding:"4px 12px",borderRadius:8,fontSize:11,fontWeight:600}}>{h.category}</span>{h.shared&&<span style={{background:"#FCE4EC",color:"#C62828",padding:"4px 12px",borderRadius:8,fontSize:11,fontWeight:600}}>👫</span>}{h.needsVerification&&<span style={{background:"#FFF8E1",color:"#F57F17",padding:"4px 12px",borderRadius:8,fontSize:11,fontWeight:600}}>📸</span>}</div></div>
            <div style={{display:"grid",gridTemplateColumns:h.shared?"1fr 1fr 1fr":"1fr 1fr",gap:8,marginBottom:16}}><div style={{textAlign:"center",padding:12,background:"#fff",borderRadius:14}}><div style={{fontSize:18,fontWeight:700,color:"#E65100",fontFamily:"'Playfair Display'"}}>{myS}d</div><div style={{fontSize:10,color:"#8B7E74"}}>Mi racha</div></div>{h.shared&&<div style={{textAlign:"center",padding:12,background:"#fff",borderRadius:14}}><div style={{fontSize:18,fontWeight:700,color:"#C62828",fontFamily:"'Playfair Display'"}}>{cs}d</div><div style={{fontSize:10,color:"#8B7E74"}}>Juntos</div></div>}<div style={{textAlign:"center",padding:12,background:"#fff",borderRadius:14}}><div style={{fontSize:12,fontWeight:700,color:str.color}}>{str.level}</div><div style={{fontSize:10,color:"#8B7E74"}}>Fuerza</div></div></div>
            <div style={{marginBottom:16}}><p style={{fontSize:12,fontWeight:600,marginBottom:6}}>Últimos 30 días</p><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{last30.map(date=>{const u1=h.completions?.u1?.[date];const u2=h.completions?.u2?.[date];return<div key={date} style={{width:11,height:11,borderRadius:3,background:u1&&u2?colors.accent:u1||u2?"#FFB74D":"#F0E9E0",opacity:u1||u2?1:.35}}/>})}</div></div>
            <div style={{display:"flex",gap:10}}><button onClick={()=>deleteHabit(h.id)} className="btn" style={{flex:1,padding:14,borderRadius:14,border:"2px solid #FFCDD2",background:"#fff",color:"#C62828",fontWeight:600,fontSize:14}}>Eliminar</button><button onClick={()=>setModal(null)} className="btn" style={{flex:2,padding:14,borderRadius:14,border:"none",background:"#2E2A25",color:"#fff",fontWeight:600,fontSize:14}}>Cerrar</button></div>
          </>)})()}

          {/* GOAL DETAIL */}
          {modal?.type==="goalDetail"&&(()=>{const g=data.finance.find(x=>x.id===modal.goal.id)||modal.goal;const pct=Math.min(100,Math.round(((g.saved||0)/(g.target||1))*100));return(<>
            <div style={{textAlign:"center",marginBottom:16}}><div style={{fontSize:48,marginBottom:8}}>{g.icon}</div><h2 style={{fontFamily:"'Playfair Display'",fontSize:22,color:"#2E2A25"}}>{g.name}</h2><span style={{fontSize:24,fontWeight:700,color:"#E65100",fontFamily:"'Playfair Display'"}}>S/.{(g.saved||0).toFixed(0)} <span style={{fontSize:14,color:"#8B7E74",fontWeight:400}}>de S/.{g.target}</span></span></div>
            <div style={{background:"#F0E9E0",borderRadius:100,height:10,overflow:"hidden",marginBottom:16}}><div style={{width:`${pct}%`,height:"100%",borderRadius:100,background:pct>=100?"linear-gradient(90deg,#66BB6A,#2E7D32)":"linear-gradient(90deg,#FFB74D,#E65100)"}}/></div>
            <p style={{fontSize:13,fontWeight:600,marginBottom:8}}>Historial de aportes</p>
            {(g.contributions||[]).slice().reverse().map((c,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #F0E9E0",fontSize:13}}><span>{c.who==="both"?"👫":setup?.[c.who]?.emoji}</span><span style={{flex:1}}>{c.who==="both"?"Ambos":setup?.[c.who]?.name}</span><span style={{fontWeight:600,color:"#2E7D32"}}>+S/.{c.amount.toFixed(0)}</span><span style={{fontSize:10,color:"#B0A89E"}}>{c.date}</span></div>)}
            <div style={{display:"flex",gap:10,marginTop:16}}><button onClick={()=>deleteGoal(g.id)} className="btn" style={{flex:1,padding:14,borderRadius:14,border:"2px solid #FFCDD2",background:"#fff",color:"#C62828",fontWeight:600,fontSize:14}}>Eliminar</button><button onClick={()=>{setContribForm({amount:"",goalId:g.id,who:""});setModal("addContrib")}} className="btn" style={{flex:2,padding:14,borderRadius:14,border:"none",background:"#E65100",color:"#fff",fontWeight:600,fontSize:14}}>+ Abonar</button></div>
          </>)})()}
        </div>
      </div>)}

      {/* BOTTOM NAV */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"rgba(251,248,244,.95)",backdropFilter:"blur(12px)",borderTop:"1px solid #E8E0D8",display:"flex",justifyContent:"space-around",padding:"6px 0 max(12px, env(safe-area-inset-bottom))",zIndex:50}}>
        {NAV.map(n=><button key={n.id} onClick={()=>setView(n.id)} style={{background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,color:view===n.id?"#C62828":"#B0A89E",padding:"4px 10px",position:"relative"}}><span style={{fontSize:18}}>{n.icon}</span><span style={{fontSize:10,fontWeight:view===n.id?700:500}}>{n.label}</span>{n.badge>0&&<div style={{position:"absolute",top:-2,right:2,width:16,height:16,borderRadius:8,background:"#C62828",color:"#fff",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{n.badge}</div>}</button>)}
      </div>

      {!modal&&view==="home"&&<button onClick={()=>setModal("addHabit")} className="btn" style={{position:"fixed",bottom:76,right:"calc(50% - 220px)",width:56,height:56,borderRadius:18,border:"none",background:"#C62828",color:"#fff",fontSize:28,boxShadow:"0 6px 20px rgba(198,40,40,.3)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:40}}>+</button>}
    </div>
  );
}
