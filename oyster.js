const KEY = "nacre-pearl-oyster-v3";

const defaults = {
  hunger: 5, wellbeing: 5, moisture: 5, affection: 5, calm: 5,
  growth: 0, lastUpdated: Date.now(),
  careScore: 0, careSamples: 0,
  interactions: {feeding:0, moistening:0, affection:0, singing:0, resting:0},
  pearls: []
};

let state = load();

function load(){
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return saved ? {...defaults,...saved,interactions:{...defaults.interactions,...saved.interactions}} : structuredClone(defaults);
  } catch { return structuredClone(defaults); }
}

function save(){ localStorage.setItem(KEY, JSON.stringify(state)); }

function clamp(n){ return Math.max(0,Math.min(5,n)); }

function applyElapsed(){
  const hours = Math.max(0,(Date.now()-state.lastUpdated)/3600000);
  if(hours < 0.01) return;
  state.hunger = clamp(state.hunger - Math.floor(hours/6));
  state.moisture = clamp(state.moisture - Math.floor(hours/8));
  state.wellbeing = clamp(state.wellbeing - Math.floor(hours/12));
  state.affection = clamp(state.affection - Math.floor(hours/36));
  state.calm = clamp(state.calm - Math.floor(hours/18));

  const avg = careAverage();
  const careFactor = Math.max(.25, avg/5 || .25);
  state.growth = Math.min(100, state.growth + hours * 1.15 * careFactor);
  state.lastUpdated = Date.now();
  save();
}

function careAverage(){
  return state.careSamples ? state.careScore/state.careSamples : 0;
}

function recordCare(amount){
  state.careScore += amount;
  state.careSamples++;
}

function pearlType(){
  const avg = careAverage(), i = state.interactions;
  if(avg>=4.6 && i.singing>=3 && i.affection>=3) return "Moonlit Rose Pearl";
  if(avg>=4.6 && i.moistening>=i.feeding) return "Luminous Water Pearl";
  if(avg>=3.8 && i.affection>=i.feeding) return "Blush Pearl";
  if(avg>=3.8 && i.resting>=2) return "Quiet Moon Pearl";
  if(avg>=2.8) return "Silver Cloud Pearl";
  if(avg>=1.8) return "Clouded Pearl";
  return "Darkened Pearl";
}

function quality(){
  const a=careAverage();
  return a>=4.6?"Radiant":a>=3.8?"Fine":a>=2.8?"Sound":a>=1.8?"Clouded":"Poor";
}

function act(action){
  applyElapsed();
  const messages = {
    feed:"The oyster accepts its little meal.",
    moisten:"Cool water settles over the shell.",
    pet:"The shell warms beneath a gentle touch.",
    sing:"A quiet song disappears beneath the water.",
    rest:"The oyster closes itself and rests."
  };
  if(action==="feed"){state.hunger=clamp(state.hunger+2);state.wellbeing=clamp(state.wellbeing+1);state.interactions.feeding++;recordCare(4.5)}
  if(action==="moisten"){state.moisture=5;state.wellbeing=clamp(state.wellbeing+1);state.interactions.moistening++;recordCare(4.8)}
  if(action==="pet"){state.affection=5;state.calm=clamp(state.calm+1);state.interactions.affection++;recordCare(4.7)}
  if(action==="sing"){state.calm=5;state.affection=clamp(state.affection+1);state.interactions.singing++;recordCare(5)}
  if(action==="rest"){state.calm=5;state.wellbeing=clamp(state.wellbeing+1);state.interactions.resting++;recordCare(4.2)}
  if(action==="inspect"){
    if(state.growth>=100) harvest();
    else message(`The pearl is ${Math.floor(state.growth)}% formed.`);
    return;
  }
  state.lastUpdated=Date.now(); save(); render(); message(messages[action]);
}

function harvest(){
  const p={type:pearlType(),quality:quality(),date:new Date().toLocaleDateString(),care:careAverage().toFixed(1)};
  state.pearls.unshift(p); state.pearls=state.pearls.slice(0,50);
  state.growth=0;state.careScore=0;state.careSamples=0;
  state.interactions={feeding:0,moistening:0,affection:0,singing:0,resting:0};
  save(); render(); message(`A ${p.quality.toLowerCase()} ${p.type} has been harvested.`);
}

function message(t){document.getElementById("message").textContent=t;}

function render(){
  const stats=[
    ["Hunger",state.hunger],["Wellbeing",state.wellbeing],["Moisture",state.moisture],
    ["Affection",state.affection],["Calm",state.calm]
  ];
  document.getElementById("stats").innerHTML=stats.map(([n,v])=>`<div class="stat"><b>${n}</b><span>${v}/5</span></div>`).join("");
  document.getElementById("growthText").textContent=`${Math.floor(state.growth)}%`;
  document.getElementById("growthBar").style.width=`${state.growth}%`;
  document.getElementById("pearlKind").textContent=state.growth>=100?`${pearlType()} · ready`:state.growth>=50?pearlType():"Unformed";
  document.getElementById("pearlOrb").style.transform=`scale(${0.75+state.growth/400})`;
  document.getElementById("pearlCount").textContent=state.pearls.length;
  document.getElementById("historyList").innerHTML=state.pearls.length
    ? state.pearls.map(p=>`<div class="pearl-entry"><div><strong>${p.type}</strong><br><small>${p.date} · care ${p.care}/5</small></div><span>${p.quality}</span></div>`).join("")
    : `<p class="empty">No pearls have been harvested yet.</p>`;
}

document.querySelectorAll("[data-action]").forEach(b=>b.addEventListener("click",()=>act(b.dataset.action)));
applyElapsed(); render();
