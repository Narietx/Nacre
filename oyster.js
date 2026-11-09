"use strict";
const API = "https://nacre-api.narietswow.workers.dev";
const VERSION = "Nacre Cloudflare · preview 1";
const CARE_COOLDOWN_MS = 2 * 60 * 60 * 1000;
let accessKey = ""; // Memory only: never written to localStorage or the URL.
let state = null;
let busy = false;
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, ch =>
  ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const byId = id => document.getElementById(id);
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
  reactionText: byId("reactionText"),
  stats: byId("stats"),
  growthText: byId("growthText"),
  growthBar: byId("growthBar"),
  pearlCount: byId("pearlCount"),
  collectionSummary: byId("collectionSummary"),
  ledger: byId("ledger"),
  unlockPanel: byId("unlockPanel"),
  connectionStatus: byId("connectionStatus")
};

async function request(path, method="GET", body) {
  const response = await fetch(API + path, {
    method,
    headers: {
      "Authorization": "Bearer " + accessKey,
      ...(body ? {"Content-Type":"application/json"} : {})
    },
    ...(body ? {body:JSON.stringify(body)} : {}),
    cache: "no-store"
  });
  let result;
  try { result = await response.json(); }
  catch { throw new Error("Cloudflare returned an unreadable response."); }
  if (!response.ok) {
    if (response.status === 401) throw new Error("That access key was not accepted.");
    throw new Error(result.error || "Cloudflare could not complete the request.");
  }
  return result;
}

function showMessage(message) {
  ui.reactionText.textContent = message;
}

async function unlock() {
  if (busy) return;
  const candidate = byId("accessKey").value.trim();
  if (!candidate) {
    ui.connectionStatus.textContent = "Please enter the private access key.";
    return;
  }
  accessKey = candidate;
  busy = true;
  byId("unlockButton").textContent = "Connecting…";
  ui.connectionStatus.textContent = "Opening the cottage…";
  try {
    state = await request("/state");
    byId("accessKey").value = "";
    ui.unlockPanel.style.display = "none";
    showMessage("The oyster stirs beneath the water. Welcome back.");
    render();
  } catch (error) {
    accessKey = "";
    ui.connectionStatus.textContent = error.message +
      (error instanceof TypeError ? " Check the Worker's CORS settings." : "");
  } finally {
    busy = false;
    byId("unlockButton").textContent = "Unlock Nacre";
  }
}

function normalizePearl(p) {
  const sizeMm = Number(p.size);
  const date = Number(p.harvested_at);
  return {
    color: p.color || "Unrecorded",
    size: Number.isFinite(sizeMm) ? sizeMm.toFixed(1) + " mm" : "Unknown",
    sizeMm: Number.isFinite(sizeMm) ? sizeMm : 0,
    shape: p.shape || "Unknown",
    luster: p.luster || "Unknown",
    nacreThickness: p.nacre || "Unknown",
    surfaceQuality: p.surface || "Unknown",
    harvestedAt: Number.isFinite(date) ? new Date(date).toISOString() : ""
  };
}

function renderCollection() {
  const pearls = (state?.pearls || []).map(normalizePearl);
  ui.pearlCount.textContent = `${pearls.length} ${pearls.length===1?"pearl":"pearls"}`;
  if (!pearls.length) {
    ui.collectionSummary.innerHTML = "";
    ui.ledger.innerHTML = '<div class="empty">No pearls harvested yet. The first one is still forming.</div>';
    return;
  }
  const largest = pearls.reduce((a,b)=>b.sizeMm>a.sizeMm?b:a);
  const rank = {"Soft":0,"Fair":1,"Good":2,"Very Good":3,"Excellent":4,"Mirror":5};
  const best = pearls.reduce((a,b)=>(rank[b.luster]??-1)>(rank[a.luster]??-1)?b:a);
  ui.collectionSummary.innerHTML = `
    <div class="mini">Largest<b>${escapeHTML(largest.size)}</b></div>
    <div class="mini">Best luster<b>${escapeHTML(best.luster)}</b></div>
    <div class="mini">Shapes found<b>${new Set(pearls.map(p=>p.shape)).size}</b></div>
    <div class="mini">Colors found<b>${new Set(pearls.map(p=>p.color)).size}</b></div>`;
  ui.ledger.innerHTML = pearls.map((p,i)=>`
    <article class="pearl-card">
      <div class="pearl-date">Pearl ${pearls.length-i} · ${escapeHTML(p.harvestedAt ? new Date(p.harvestedAt).toLocaleString() : "Date unknown")}</div>
      <div class="traits">
        <div class="trait"><small>Color</small><b>${escapeHTML(p.color)}</b></div>
        <div class="trait"><small>Size</small><b>${escapeHTML(p.size)}</b></div>
        <div class="trait"><small>Shape</small><b>${escapeHTML(p.shape)}</b></div>
        <div class="trait"><small>Luster</small><b>${escapeHTML(p.luster)}</b></div>
        <div class="trait"><small>Nacre</small><b>${escapeHTML(p.nacreThickness)}</b></div>
        <div class="trait"><small>Surface</small><b>${escapeHTML(p.surfaceQuality)}</b></div>
      </div>
    </article>`).join("");
}

function render() {
  if (!state) return;
  ui.stats.innerHTML = statNames.map(([key,label])=>
    `<div class="stat"><b>${Number(state.stats?.[key] || 0).toFixed(1)}</b><span>${label}</span></div>`
  ).join("");
  const growth = Math.max(0,Math.min(100,Number(state.growth)||0));
  ui.growthText.textContent = `${Math.floor(growth)}%`;
  ui.growthBar.style.width = `${growth}%`;
  renderCollection();
  document.querySelectorAll("[data-action]").forEach(btn => {
    const action = btn.dataset.action;
    const remaining = Math.max(0, Number(state.cooldowns?.[action] || 0)-Date.now());
    btn.disabled = busy || !accessKey || (action !== "inspect" && remaining > 0);
    btn.title = remaining > 0 ? `Available in ${Math.ceil(remaining/60000)} minutes` : "Ready";
  });
}

async function interact(action) {
  if (!accessKey || busy) return;
  busy = true;
  render();
  try {
    if (action === "inspect") {
      // Refresh first: Cloudflare owns the growth clock.
      state = await request("/state");
      if (Number(state.growth) >= 100) {
        const result = await request("/harvest","POST");
        if (result.ok && result.pearl) {
          const p = normalizePearl(result.pearl);
          showMessage(`You found a ${p.color.toLowerCase()} pearl: ${p.size}, ${p.shape}, ${p.luster} luster, ${p.nacreThickness} nacre, ${p.surfaceQuality}.`);
          state = await request("/state");
        } else {
          showMessage("The pearl needs a little more time.");
          state = await request("/state");
        }
      } else {
        showMessage(reactions.inspect[Math.floor(Math.random()*reactions.inspect.length)]);
      }
    } else {
      const result = await request("/care","POST",{action});
      state = await request("/state");
      if (result.ok) {
        showMessage(reactions[action][Math.floor(Math.random()*reactions[action].length)]);
      } else if (result.reason === "cooldown") {
        showMessage("The oyster has had enough of that for now. It needs time to rest.");
      }
    }
  } catch(error) {
    showMessage("Nacre couldn't reach the cottage: " + error.message);
  } finally {
    busy = false;
    render();
  }
}

byId("unlockButton").addEventListener("click", unlock);
ui.connectionStatus.textContent = "Unlock button ready. Enter your access key.";
byId("accessKey").addEventListener("keydown",event => {
  if(event.key === "Enter") unlock();
});
document.querySelectorAll("[data-action]").forEach(btn =>
  btn.addEventListener("click",()=>interact(btn.dataset.action)));
document.querySelectorAll("[data-action]").forEach(btn => btn.disabled = true);
byId("stats").innerHTML = '<div class="empty">Unlock the cottage to see the oyster.</div>';
byId("ledger").innerHTML = '<div class="empty">The pearl ledger is private.</div>';
const versionLabel = document.createElement("small");
versionLabel.textContent = VERSION;
versionLabel.style.cssText = "display:block;text-align:center;color:#8d8a9c;font:10px system-ui,sans-serif;margin:10px 0";
document.querySelector("footer")?.append(versionLabel);
setInterval(async () => {
  if (!accessKey || busy) return;
  try {
    state = await request("/state");
    render();
  } catch { /* Show error on the next user interaction. */ }
}, 60000);
