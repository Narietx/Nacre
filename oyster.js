const KEY = "nacre_oyster_v4";

const defaultState = {
  stats: { hunger:5, wellbeing:5, moisture:5, affection:5, calm:5 },
  growth: 0,
  lastUpdated: Date.now(),
  pearls: [],
  lastCare: {}
};

const reactions = {
  feed: [
    "The oyster opens a little. It was listening for that.",
    "A tiny ripple passes through the water as the oyster accepts its meal.",
    "The oyster settles contentedly. Something inside it glimmers.",
    "It eats slowly, with the grave dignity of a creature that has nowhere else to be."
  ],
  moisten: [
    "Fresh water slips over the shell. The oyster seems pleased.",
    "The shell gleams beneath the new moisture.",
    "A little shiver travels through the oyster. It looks more comfortable.",
    "The water settles around it, cool and clean."
  ],
  pet: [
    "The oyster closes slightly beneath your touch, then relaxes.",
    "Its shell gives the faintest little shimmer.",
    "The oyster seems to recognize the touch.",
    "For a moment, the water around it goes perfectly still."
  ],
  sing: [
    "The oyster listens. A soft vibration answers from inside the shell.",
    "Something in the shell hums along with you.",
    "The pearl catches the sound and gives back a faint glow.",
    "The oyster cannot sing, exactly. It makes an admirable attempt."
  ],
  rest: [
    "The oyster curls into its quiet little world.",
    "You leave it undisturbed. The water becomes very still.",
    "The oyster rests beneath the surface, pearl safely tucked away.",
    "For once, nothing is required of the little creature."
  ],
  inspect: [
    "You lean closer. The pearl is still forming.",
    "The shell parts just enough for you to see the growing pearl.",
    "There is something beautiful taking shape in there.",
    "Not yet. The pearl asks for a little more time."
  ]
};

const statNames = [
  ["hunger","Hunger"],["wellbeing","Wellbeing"],["moisture","Moisture"],
  ["affection","Affection"],["calm","Calm"]
];

const traitPools = {
  size: [
    ["Tiny", 8],["Small", 18],["Medium", 34],["Large", 27],["Exceptional", 13]
  ],
  shape: [
    ["Round",18],["Near-Round",22],["Button",15],["Oval",13],["Drop",10],["Baroque",14],["Keshi-like",8]
  ],
  luster: [
    ["Soft",10],["Fair",18],["Good",28],["Very Good",25],["Excellent",15],["Mirror",4]
  ],
  nacreThickness: [
    ["Thin",9],["Moderate",27],["Thick",34],["Very Thick",22],["Exceptional",8]
  ],
  color: [
    ["Ivory",24],["Cream",18],["Blush",17],["Silver",14],["Rose",10],
    ["Lavender",8],["Gold",5],["Peacock",3],["Midnight",1]
  ],
  surfaceQuality: [
    ["Heavily Marked",7],["Marked",18],["Minor Blemishes",31],["Clean",27],["Very Clean",14],["Flawless",3]
  ]
};

const ui = {
  reactionText: document.getElementById("reactionText"),
  stats: document.getElementById("stats"),
  growthText: document.getElementById("growthText"),
  growthBar: document.getElementById("growthBar"),
  pearlCount: document.getElementById("pearlCount"),
  collectionSummary: document.getElementById("collectionSummary"),
  ledger: document.getElementById("ledger")
};
const VERSION = "Nacre 1.6 · color + timed care";
let state = load();

function load(){
  try{
    const raw = localStorage.getItem(KEY);
    if(!raw) return structuredClone(defaultState);
    const s = JSON.parse(raw);
    return {
      ...structuredClone(defaultState), ...s,
      stats:{...defaultState.stats,...(s.stats||{})},
      pearls:Array.isArray(s.pearls)?s.pearls:[],
      lastCare:s.lastCare && typeof s.lastCare === "object" ? s.lastCare : {}
    };
  }catch(e){ return structuredClone(defaultState); }
}

function save(){ state.lastUpdated=Date.now(); localStorage.setItem(KEY,JSON.stringify(state)); }

// Each care action can improve stats once per two hours. Repeated clicks
// still receive a reaction but cannot accelerate growth or stack care.
const CARE_COOLDOWN_MS = 2 * 60 * 60 * 1000;

function applyTimeDecay(){
  const now=Date.now();
  const hours=Math.max(0,(now-(state.lastUpdated||now))/3600000);
  if(hours<=0)return;
  // Fractional decay is preserved across page loads and interactions.
  // This prevents frequent visits from resetting the decay clock.
  state.stats.hunger=Math.max(0,state.stats.hunger-hours/6);
  state.stats.moisture=Math.max(0,state.stats.moisture-hours/8);
  state.stats.wellbeing=Math.max(0,state.stats.wellbeing-hours/12);
  state.stats.affection=Math.max(0,state.stats.affection-hours/36);
  state.stats.calm=Math.max(0,state.stats.calm-hours/18);
  const care=Object.values(state.stats).reduce((a,b)=>a+b,0)/25;
  // Growth depends on elapsed real time, never the number of button presses.
  state.growth=Math.min(100,state.growth + hours*(0.65 + care*0.9));
  save();
}

function clamp(v){return Math.max(0,Math.min(5,v));}
function choose(pool, bonus=0){
  const weighted=pool.map(([name,w])=>[name,w]);
  if(bonus>0){
    for(let i=0;i<weighted.length;i++){
      const factor=1+(i/(weighted.length-1||1))*bonus;
      weighted[i][1]*=factor;
    }
  }
  const total=weighted.reduce((a,x)=>a+x[1],0);
  let r=Math.random()*total;
  for(const [name,w] of weighted){r-=w;if(r<=0)return name;}
  return weighted.at(-1)[0];
}

function sizeMm(label){
  return {Tiny:4,Small:6,Medium:8,Large:11,Exceptional:15}[label] + (Math.random()*1.8-.9);
}

function harvestPearl(){
  const care=Object.values(state.stats).reduce((a,b)=>a+b,0)/25;
  const bonus=(care-.5)*1.8;
  const size=choose(traitPools.size,bonus);
  const pearl={
    id:(typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") ? crypto.randomUUID() : String(Date.now()+Math.random()),
    harvestedAt:new Date().toISOString(),
    size:size,
    sizeMm:Math.round(sizeMm(size)*10)/10,
    shape:choose(traitPools.shape,bonus),
    luster:choose(traitPools.luster,bonus),
    nacreThickness:choose(traitPools.nacreThickness,bonus),
    surfaceQuality:choose(traitPools.surfaceQuality,bonus),
    color:choose(traitPools.color,bonus)
  };
  state.pearls.unshift(pearl);
  state.growth=0;
  state.stats.affection=clamp(state.stats.affection+0.5);
  state.stats.wellbeing=clamp(state.stats.wellbeing+0.5);
  return pearl;
}

function interact(action){
  applyTimeDecay();
  if(action==="inspect"){
    if(state.growth>=100){
      const pearl=harvestPearl();
      ui.reactionText.textContent=`You found a ${pearl.color.toLowerCase()} pearl: ${pearl.size}, ${pearl.shape}, ${pearl.luster} luster, ${pearl.nacreThickness} nacre, ${pearl.surfaceQuality}.`;
      save(); render(); return;
    }
    ui.reactionText.textContent=reactions.inspect[Math.floor(Math.random()*reactions.inspect.length)];
    render(); return;
  }
  if(!Object.prototype.hasOwnProperty.call(reactions,action))return;
  const now=Date.now();
  // Recheck persisted cooldown in case another tab used this action.
  try {
    const stored=JSON.parse(localStorage.getItem(KEY) || "{}");
    if(stored.lastCare && Number(stored.lastCare[action]) > Number(state.lastCare[action] || 0)) {
      state.lastCare[action]=Number(stored.lastCare[action]);
    }
  } catch(e) {}
  const previous=Number(state.lastCare[action])||0;
  const remaining=CARE_COOLDOWN_MS-(now-previous);
  if(remaining>0){
    const minutes=Math.ceil(remaining/60000);
    const duration=minutes>=60?`${Math.ceil(minutes/60)} hour${Math.ceil(minutes/60)===1?"":"s"}`:`${minutes} minute${minutes===1?"":"s"}`;
    ui.reactionText.textContent=`The oyster has had enough of that for now. Try again in about ${duration}.`;
    render(); return;
  }
  if(action==="feed"){
    state.stats.hunger=clamp(state.stats.hunger+2);
    state.stats.wellbeing=clamp(state.stats.wellbeing+.25);
    state.stats.calm=clamp(state.stats.calm+.1);
  } else if(action==="moisten"){
    state.stats.moisture=clamp(state.stats.moisture+2);
    state.stats.wellbeing=clamp(state.stats.wellbeing+.2);
  } else if(action==="pet"){
    state.stats.affection=clamp(state.stats.affection+1);
    state.stats.calm=clamp(state.stats.calm+.5);
  } else if(action==="sing"){
    state.stats.affection=clamp(state.stats.affection+.5);
    state.stats.calm=clamp(state.stats.calm+.75);
  } else if(action==="rest"){
    state.stats.calm=clamp(state.stats.calm+1);
    state.stats.wellbeing=clamp(state.stats.wellbeing+.5);
  }
  state.lastCare[action]=now;
  ui.reactionText.textContent=reactions[action][Math.floor(Math.random()*reactions[action].length)];
  save(); render();
}

function render(){
  ui.stats.innerHTML=statNames.map(([key,label])=>`<div class="stat"><b>${Number(state.stats[key]).toFixed(1)}</b><span>${label}</span></div>`).join("");
  ui.growthText.textContent=`${Math.floor(state.growth)}%`;
  ui.growthBar.style.width=`${state.growth}%`;
  ui.pearlCount.textContent=`${state.pearls.length} ${state.pearls.length===1?"pearl":"pearls"}`;
  renderCollection();
  document.querySelectorAll("[data-action]").forEach(btn => {
    if(btn.dataset.action === "inspect") return;
    const previous = Number(state.lastCare[btn.dataset.action]) || 0;
    const remaining = Math.max(0, CARE_COOLDOWN_MS - (Date.now() - previous));
    btn.disabled = remaining > 0;
    btn.title = remaining > 0 ? `Care available in ${Math.ceil(remaining/60000)} minutes` : "Care available";
    btn.setAttribute("aria-label", remaining > 0 ? `${btn.dataset.action}, care available in ${Math.ceil(remaining/60000)} minutes` : btn.dataset.action);
  });
}

function renderCollection(){
  if(!state.pearls.length){
    ui.collectionSummary.innerHTML="";
    ui.ledger.innerHTML='<div class="empty">No pearls harvested yet. The first one is still forming.</div>';
    return;
  }
  const largest=state.pearls.reduce((a,b)=>b.sizeMm>a.sizeMm?b:a);
  const lusterRank={"Soft":0,"Fair":1,"Good":2,"Very Good":3,"Excellent":4,"Mirror":5};
  const bestLuster=state.pearls.reduce((a,b)=>lusterRank[b.luster]>lusterRank[a.luster]?b:a);
  const shapes=new Set(state.pearls.map(p=>p.shape)).size;
  const colors=new Set(state.pearls.filter(p=>p.color).map(p=>p.color)).size;
  ui.collectionSummary.innerHTML=`
    <div class="mini">Largest<b>${largest.sizeMm} mm</b></div>
    <div class="mini">Best luster<b>${bestLuster.luster}</b></div>
    <div class="mini">Shapes found<b>${shapes}</b></div>
    <div class="mini">Colors found<b>${colors}</b></div>`;
  ui.ledger.innerHTML=state.pearls.map((p,i)=>`
    <article class="pearl-card">
      <div class="pearl-date">Pearl ${state.pearls.length-i} · ${new Date(p.harvestedAt).toLocaleString()}</div>
      <div class="traits">
        <div class="trait"><small>Color</small><b>${p.color || "Unrecorded"}</b></div>
        <div class="trait"><small>Size</small><b>${p.size} · ${p.sizeMm} mm</b></div>
        <div class="trait"><small>Shape</small><b>${p.shape}</b></div>
        <div class="trait"><small>Luster</small><b>${p.luster}</b></div>
        <div class="trait"><small>Nacre</small><b>${p.nacreThickness}</b></div>
        <div class="trait"><small>Surface</small><b>${p.surfaceQuality}</b></div>
      </div>
    </article>`).join("");
}

applyTimeDecay();
render();
const versionLabel = document.createElement("small");
versionLabel.textContent = VERSION;
versionLabel.style.cssText = "display:block;text-align:center;color:#8d8a9c;font:10px system-ui,sans-serif;margin:10px 0";
document.querySelector("footer")?.append(versionLabel);
// Refresh cooldown availability without granting care or growth.
setInterval(() => render(), 60000);

document.querySelectorAll("[data-action]").forEach(btn=>{
  btn.addEventListener("click",()=>interact(btn.dataset.action));
});
