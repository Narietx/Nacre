const SAVE_KEY = "nacre_oyster_v5";

const TRAITS = {
  size: [
    {name:"Tiny",min:3,max:4.9,weight:18},{name:"Small",min:5,max:6.9,weight:28},
    {name:"Medium",min:7,max:8.9,weight:28},{name:"Large",min:9,max:10.9,weight:17},
    {name:"Exceptional",min:11,max:14,weight:4}
  ],
  shape: [
    {name:"Round",weight:23},{name:"Near-Round",weight:24},{name:"Button",weight:15},
    {name:"Oval",weight:14},{name:"Drop",weight:9},{name:"Baroque",weight:10},{name:"Keshi-like",weight:5}
  ],
  luster: [
    {name:"Dull",weight:8},{name:"Fair",weight:17},{name:"Good",weight:27},
    {name:"Very Good",weight:26},{name:"Excellent",weight:17},{name:"Mirror",weight:5}
  ],
  nacreThickness: [
    {name:"Thin",weight:10},{name:"Moderate",weight:28},{name:"Thick",weight:31},
    {name:"Very Thick",weight:23},{name:"Exceptional",weight:8}
  ],
  surfaceQuality: [
    {name:"Heavily Marked",weight:8},{name:"Marked",weight:17},{name:"Minor Blemishes",weight:31},
    {name:"Clean",weight:27},{name:"Very Clean",weight:14},{name:"Flawless",weight:3}
  ]
};

const STAT_LABELS={hunger:"Hunger",wellbeing:"Wellbeing",moisture:"Moisture",affection:"Affection",calm:"Calm"};
const ACTIONS={
  feed:{hunger:2,wellbeing:1,message:"It accepts the offering with quiet dignity."},
  moisten:{moisture:2,wellbeing:1,message:"Fresh water gathers around the shell."},
  pet:{affection:2,calm:1,message:"The oyster seems to recognize the touch."},
  sing:{calm:2,affection:1,wellbeing:1,message:"Something inside the shell hums along."},
  rest:{calm:2,wellbeing:1,message:"The oyster settles into stillness."}
};

let state=loadState();
applyElapsedTime();
render();
saveState();

function defaultState(){return{stats:{hunger:5,wellbeing:5,moisture:5,affection:5,calm:5},pearlGrowth:0,lastUpdated:Date.now(),pearls:[],currentPearl:null};}
function loadState(){
  try{
    const parsed=JSON.parse(localStorage.getItem(SAVE_KEY)||"null");
    if(!parsed)return defaultState();
    return {...defaultState(),...parsed,stats:{...defaultState().stats,...(parsed.stats||{})},pearls:Array.isArray(parsed.pearls)?parsed.pearls:[]};
  }catch{return defaultState();}
}
function saveState(){state.lastUpdated=Date.now();localStorage.setItem(SAVE_KEY,JSON.stringify(state));}
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function applyElapsedTime(){
  const now=Date.now(),hours=Math.max(0,(now-(state.lastUpdated||now))/3600000);
  if(hours<1/60)return;
  state.stats.hunger=clamp(state.stats.hunger-Math.floor(hours/6),0,5);
  state.stats.moisture=clamp(state.stats.moisture-Math.floor(hours/8),0,5);
  state.stats.wellbeing=clamp(state.stats.wellbeing-Math.floor(hours/12),0,5);
  state.stats.affection=clamp(state.stats.affection-Math.floor(hours/36),0,5);
  state.stats.calm=clamp(state.stats.calm-Math.floor(hours/18),0,5);
  const care=averageCare(),growthPerHour=.8+care*.34;
  state.pearlGrowth=clamp(state.pearlGrowth+hours*growthPerHour,0,100);
  state.lastUpdated=now;
}
function averageCare(){return Object.values(state.stats).reduce((a,b)=>a+b,0)/5;}
function weightedChoice(entries,bonus=()=>1){
  const weighted=entries.map(entry=>({entry,weight:Math.max(.01,entry.weight*bonus(entry))}));
  const total=weighted.reduce((s,x)=>s+x.weight,0);let roll=Math.random()*total;
  for(const item of weighted){roll-=item.weight;if(roll<=0)return item.entry;}
  return weighted[weighted.length-1].entry;
}
function careQuality(){
  const s=state.stats;
  return(s.wellbeing*.24+s.moisture*.18+s.affection*.16+s.calm*.16+s.hunger*.26)/5;
}
function generatePearl(){
  const care=careQuality();
  const size=weightedChoice(TRAITS.size,e=>e.name==="Exceptional"?.45+care*1.8:e.name==="Large"?.75+care*.7:e.name==="Tiny"?1.2-care*.35:1);
  const shape=weightedChoice(TRAITS.shape,e=>e.name==="Round"||e.name==="Near-Round"?.8+care*.55:e.name==="Baroque"||e.name==="Keshi-like"?1.25-care*.35:1);
  const luster=weightedChoice(TRAITS.luster,e=>{const i=TRAITS.luster.indexOf(e);return .55+care*(.4+i/10);});
  const nacreThickness=weightedChoice(TRAITS.nacreThickness,e=>e.name==="Exceptional"?.45+care*1.7:e.name==="Very Thick"?.75+care*.7:e.name==="Thin"?1.25-care*.35:1);
  const surfaceQuality=weightedChoice(TRAITS.surfaceQuality,e=>{const i=TRAITS.surfaceQuality.indexOf(e);return .5+care*(.55+i/9);});
  return{id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,harvestedAt:Date.now(),size:size.name,sizeMm:Number((size.min+Math.random()*(size.max-size.min)).toFixed(1)),shape:shape.name,luster:luster.name,nacreThickness:nacreThickness.name,surfaceQuality:surfaceQuality.name};
}
function act(type){
  applyElapsedTime();const action=ACTIONS[type];if(!action)return;
  for(const[stat,amount]of Object.entries(action)){if(stat in state.stats)state.stats[stat]=clamp(state.stats[stat]+amount,0,5);}
  state.pearlGrowth=clamp(state.pearlGrowth+1.5,0,100);state.currentPearl=null;
  document.getElementById("currentPearl").classList.add("hidden");
  document.getElementById("moodText").textContent=action.message;saveState();render();
}
function harvest(){
  applyElapsedTime();if(state.pearlGrowth<100)return;
  const pearl=generatePearl();state.pearls.unshift(pearl);state.currentPearl=pearl;state.pearlGrowth=0;
  state.stats.calm=clamp(state.stats.calm-1,0,5);state.stats.wellbeing=clamp(state.stats.wellbeing-1,0,5);
  document.getElementById("moodText").textContent="A pearl has emerged from the shell.";saveState();render();
}
function render(){renderStats();renderGrowth();renderCurrentPearl();renderCollection();document.getElementById("lastUpdated").textContent=`remembered ${new Date(state.lastUpdated).toLocaleString()}`;}
function renderStats(){
  document.getElementById("stats").innerHTML=Object.entries(state.stats).map(([key,value])=>`<div class="stat"><div class="stat-name">${STAT_LABELS[key]}</div><div class="stat-value">${value}/5</div><div class="stat-track"><div style="width:${value*20}%"></div></div></div>`).join("");
}
function renderGrowth(){
  const rounded=Math.floor(state.pearlGrowth);document.getElementById("growthText").textContent=`${rounded}%`;
  document.getElementById("growthBar").style.width=`${state.pearlGrowth}%`;document.getElementById("harvestButton").disabled=state.pearlGrowth<100;
  document.getElementById("pearlStatus").textContent=state.pearlGrowth>=100?"The shell is ready. Something complete waits inside.":state.pearlGrowth>70?"The pearl is becoming substantial.":state.pearlGrowth>35?"A small presence is taking shape.":"Something is forming in the dark.";
}
function renderCurrentPearl(){
  const el=document.getElementById("currentPearl");if(!state.currentPearl){el.classList.add("hidden");return;}
  const p=state.currentPearl;el.classList.remove("hidden");
  el.innerHTML=`<div class="section-heading"><h2>Harvested Pearl</h2><span>${new Date(p.harvestedAt).toLocaleDateString()}</span></div>
  <div class="trait-grid">
  <div class="trait"><small>Size</small><strong>${p.size} · ${p.sizeMm} mm</strong></div>
  <div class="trait"><small>Shape</small><strong>${p.shape}</strong></div>
  <div class="trait"><small>Luster</small><strong>${p.luster}</strong></div>
  <div class="trait"><small>Nacre Thickness</small><strong>${p.nacreThickness}</strong></div>
  <div class="trait"><small>Surface Quality</small><strong>${p.surfaceQuality}</strong></div></div>`;
}
function renderCollection(){
  const pearls=state.pearls;document.getElementById("collectionCount").textContent=`${pearls.length} pearl${pearls.length===1?"":"s"}`;
  if(!pearls.length){document.getElementById("collectionSummary").innerHTML="";document.getElementById("collection").innerHTML='<div class="empty">No pearls have been harvested yet.</div>';return;}
  const shapes=new Set(pearls.map(p=>p.shape)),bestSize=pearls.reduce((best,p)=>Math.max(best,p.sizeMm||0),0);
  const bestLuster=bestByOrder(pearls,"luster",TRAITS.luster),bestSurface=bestByOrder(pearls,"surfaceQuality",TRAITS.surfaceQuality);
  document.getElementById("collectionSummary").innerHTML=`<div class="summary-card"><small>Shapes found</small><strong>${shapes.size}</strong></div><div class="summary-card"><small>Largest</small><strong>${bestSize.toFixed(1)} mm</strong></div><div class="summary-card"><small>Best luster</small><strong>${bestLuster}</strong></div><div class="summary-card"><small>Best surface</small><strong>${bestSurface}</strong></div>`;
  document.getElementById("collection").innerHTML=pearls.map((p,i)=>`<article class="collection-item"><div class="mini-pearl"></div><div><strong>Pearl #${pearls.length-i}</strong><div class="traits">${p.size} (${p.sizeMm} mm) · ${p.shape} · ${p.luster}<br>${p.nacreThickness} nacre · ${p.surfaceQuality} surface</div></div><time>${new Date(p.harvestedAt).toLocaleDateString()}</time></article>`).join("");
}
function bestByOrder(pearls,key,order){
  const index=value=>order.findIndex(x=>x.name===value);
  return pearls.reduce((best,p)=>index(p[key])>index(best[key])?p:best)[key];
}
document.querySelectorAll("[data-action]").forEach(button=>button.addEventListener("click",()=>act(button.dataset.action)));
document.getElementById("harvestButton").addEventListener("click",harvest);
window.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"){applyElapsedTime();render();saveState();}});
