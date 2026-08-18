/* ==========================================================
   Sky Team Companion — logique de persistance
   - missions.json (statique) : chargé une fois via fetch
   - localStorage "skyteam-state-v1" (dynamique) : progression + pistes custom
   ========================================================== */

const STORAGE_KEY = "skyteam-state-v1";

const TIERS = [
  { key: "vert",  label: "Vert — Atterrissage de routine" },
  { key: "jaune", label: "Jaune — Conditions exceptionnelles" },
  { key: "rouge", label: "Rouge — Pilotes d'élite demandés" },
  { key: "noir",  label: "Noir — Atterrissage héroïque" },
];

const MODULE_ICONS = {
  kerosene: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3c3 3.6 5 6.4 5 9a5 5 0 1 1-10 0c0-2.6 2-5.4 5-9z"/></svg>',
  stagiaire: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 8l10-4 10 4-10 4-10-4z"/><path d="M6 10.5V16c0 1.4 2.7 3 6 3s6-1.6 6-3v-5.5"/></svg>',
  temps_reel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="13" r="8"/><path d="M12 13V9M9.5 2h5M12 13l3 2"/></svg>',
  vent: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 8h11a2.5 2.5 0 1 0-2.5-2.5"/><path d="M3 13h14a2.5 2.5 0 1 1-2.5 2.5"/><path d="M3 18h8"/></svg>',
  fuite_kerosene: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3c3 3.6 5 6.4 5 9a5 5 0 1 1-10 0c0-2.6 2-5.4 5-9z"/><path d="M12 10l-1.4 2.6h2.8L12 15"/></svg>',
  freins_glace: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 2v20M4 7l16 10M20 7L4 17"/></svg>',
};
const MODULE_LABELS = {
  kerosene: "Kérosène", stagiaire: "Stagiaire", temps_reel: "Temps réel",
  vent: "Vent", fuite_kerosene: "Fuite de kérosène", freins_glace: "Freins de glace",
};

/* Descriptifs courts affichés dans la modale au clic sur une carte.
   ⚠️ Texte provisoire — à remplacer par le texte exact du carnet de vol (page 5 et suivantes). */
const MODULE_DESCRIPTIONS = {
  kerosene: "Gérez votre carburant : posez un dé sur la jauge à chaque tour ou perdez 6 points de kérosène. Si la jauge est à zéro, la partie est perdue.",
  stagiaire: "Formez votre stagiaire en parallèle de l'atterrissage : placez des dés sur son tableau pour débloquer des jetons compétence avant la fin du vol.",
  temps_reel: "Lancez un minuteur de 60 secondes pour jouer votre tour. Tout dé non joué est ignoré ; si un emplacement obligatoire reste vide, la partie est perdue.",
  vent: "La force et l'orientation du vent influencent votre vitesse : le cadran vent s'ajoute (ou se soustrait) au total des moteurs.",
  fuite_kerosene: "À chaque tour, le kérosène diminue de la différence entre les deux dés moteur posés — gérez cet écart pour ne pas tomber en panne sèche.",
  freins_glace: "La piste est glacée : la gestion des freins est plus exigeante lors de la dernière manche.",
};

const skillStarSVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.9L5.7 21l1.7-7-5.4-4.7 7.1-.6z"/></svg>';

const STAMP_BG = `<svg class="stamp-bg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46"/></svg>`;

function stampSVG(status) {
  if (status === "success") {
    return STAMP_BG + `<svg class="stamp-ink" viewBox="0 0 100 100"><g class="stamp--success"><circle class="ring-outer" cx="50" cy="50" r="42"/><circle class="ring-inner" cx="50" cy="50" r="34"/><path class="mark" d="M32 52 L45 65 L70 35"/></g></svg>`;
  }
  if (status === "failed") {
    return STAMP_BG + `<svg class="stamp-ink" viewBox="0 0 100 100"><g class="stamp--failed"><circle class="ring-outer" cx="50" cy="50" r="42"/><circle class="ring-inner" cx="50" cy="50" r="34"/><path class="mark" d="M35 35 L65 65 M65 35 L35 65"/></g></svg>`;
  }
  return STAMP_BG + `<svg class="stamp-ink" viewBox="0 0 100 100"><g class="stamp--pending"><circle class="ring" cx="50" cy="50" r="42"/><circle class="center-dot" cx="50" cy="50" r="4"/></g></svg>`;
}

/* ---------------- persistance ---------------- */

function defaultState() {
  return { version: 1, progress: {}, customMissions: [] };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return {
      version: 1,
      progress: parsed.progress || {},
      customMissions: Array.isArray(parsed.customMissions) ? parsed.customMissions : [],
    };
  } catch (err) {
    console.error("Lecture localStorage impossible, réinitialisation.", err);
    return defaultState();
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error("Écriture localStorage impossible", err);
    alert("Impossible d'enregistrer la progression (stockage indisponible ou plein).");
  }
}

async function loadStaticMissions() {
  const res = await fetch("missions.json");
  if (!res.ok) throw new Error("missions.json introuvable (" + res.status + ")");
  const data = await res.json();
  return data.missions;
}

/* ---------------- état applicatif ---------------- */

let state = loadState();
let staticMissions = [];
let allMissions = [];

function rebuildAllMissions() {
  const customs = state.customMissions.map((m, i) => ({ ...m, order: 1000 + i, custom: true }));
  allMissions = [...staticMissions, ...customs];
}

function statusOf(missionId) {
  return (state.progress[missionId] && state.progress[missionId].status) || "pending";
}

function setStatus(missionId, status) {
  state.progress[missionId] = { status, playedAt: new Date().toISOString() };
  saveState();
  renderSections();
}

/* ---------------- rendu ---------------- */

function renderSections() {
  const root = document.getElementById("sections");
  root.innerHTML = "";

  TIERS.forEach(tier => {
    const items = allMissions
      .filter(m => m.difficulty === tier.key)
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    if (!items.length) return;

    const section = document.createElement("section");
    section.className = `tier-section tier-${tier.key}`;
    section.innerHTML = `
      <div class="tier-eyebrow">
        <span class="dot"></span>${tier.label} · ${items.length}
        <span class="rule"></span>
      </div>
      <div class="card-grid"></div>
    `;
    const grid = section.querySelector(".card-grid");

    items.forEach(m => {
      const status = statusOf(m.id);
      const card = document.createElement("button");
      card.type = "button";
      card.className = `card-mission tier-${m.difficulty}`;
      card.dataset.id = m.id;
      card.innerHTML = `
        <div class="card-header">
          <span class="code">${escapeHTML(m.code)}</span>
          <span class="airport">${escapeHTML(m.airport)}</span>
        </div>
        <div class="card-seam"></div>
        <div class="card-body">
          <div class="modules">
            ${m.modules.map(mod => `<span class="module-icon" title="${MODULE_LABELS[mod] || mod}">${MODULE_ICONS[mod] || ""}</span>`).join("")}
            ${m.custom ? `<span class="custom-flag">Perso</span>` : ""}
          </div>
          ${m.skillCards ? `<span class="skill-badge">${skillStarSVG}×${m.skillCards}</span>` : ""}
        </div>
        <div class="stamp is-${status}">${stampSVG(status)}</div>
      `;
      card.addEventListener("click", () => openResultModal(m));
      grid.appendChild(card);
    });

    root.appendChild(section);
  });

  updateProgressStrip();
}

function updateProgressStrip() {
  const total = allMissions.length;
  const done = allMissions.filter(m => statusOf(m.id) === "success").length;
  document.getElementById("progress-count").textContent = `${done}/${total}`;
  const strip = document.getElementById("progress-strip");
  strip.innerHTML = "";
  TIERS.forEach(tier => {
    const items = allMissions.filter(m => m.difficulty === tier.key);
    if (!items.length) return;
    const span = document.createElement("span");
    span.style.width = (items.length / total * 100) + "%";
    span.style.background = `var(--${tier.key})`;
    span.style.opacity = ".85";
    strip.appendChild(span);
  });
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

/* ---------------- modale résultat ---------------- */

const modal = document.getElementById("mission-modal");
const modalTitle = document.getElementById("modal-title");
const modalModules = document.getElementById("modal-modules");
const choiceStep = document.getElementById("choice-step");
const confirmStep = document.getElementById("confirm-step");
const confirmText = document.getElementById("confirm-text");
let currentMission = null;
let pendingStatus = null;

const STATUS_LABEL = { success: "réussi", failed: "échoué", pending: "en attente" };

function openResultModal(mission) {
  currentMission = mission;
  modalTitle.textContent = `${mission.code} — ${mission.airport}`;

  if (modalModules) {
    if (mission.modules && mission.modules.length) {
      modalModules.innerHTML = mission.modules.map(mod => `
        <div class="modal-module">
          <span class="module-icon">${MODULE_ICONS[mod] || ""}</span>
          <div>
            <strong>${MODULE_LABELS[mod] || mod}</strong>
            <p>${MODULE_DESCRIPTIONS[mod] || ""}</p>
          </div>
        </div>
      `).join("");
      modalModules.classList.remove("hidden");
    } else {
      modalModules.innerHTML = "";
      modalModules.classList.add("hidden");
    }
  }

  choiceStep.classList.remove("hidden");
  confirmStep.classList.add("hidden");
  modal.showModal();
}

document.getElementById("modal-close").addEventListener("click", () => modal.close());
modal.addEventListener("click", (e) => { if (e.target === modal) modal.close(); });

document.querySelectorAll(".choice-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    pendingStatus = btn.dataset.status;
    confirmText.textContent = `Marquer ${currentMission.code} comme ${STATUS_LABEL[pendingStatus]} ?`;
    choiceStep.classList.add("hidden");
    confirmStep.classList.remove("hidden");
  });
});

document.getElementById("confirm-cancel").addEventListener("click", () => {
  choiceStep.classList.remove("hidden");
  confirmStep.classList.add("hidden");
});

document.getElementById("confirm-ok").addEventListener("click", () => {
  setStatus(currentMission.id, pendingStatus);
  modal.close();
});

/* ---------------- modale ajout de piste ---------------- */

const addModal = document.getElementById("add-mission-modal");
const addForm = document.getElementById("add-mission-form");

document.getElementById("add-mission-fab").addEventListener("click", () => {
  addForm.reset();
  addModal.showModal();
});
document.getElementById("add-modal-close").addEventListener("click", () => addModal.close());
document.getElementById("add-mission-cancel").addEventListener("click", () => addModal.close());
addModal.addEventListener("click", (e) => { if (e.target === addModal) addModal.close(); });

addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const code = document.getElementById("new-code").value.trim().toUpperCase();
  const airport = document.getElementById("new-airport").value.trim();
  const city = document.getElementById("new-city").value.trim();
  const difficulty = document.getElementById("new-difficulty").value;
  const skillCards = parseInt(document.getElementById("new-skillcards").value, 10) || 0;
  const modules = Array.from(addForm.querySelectorAll('.module-check input:checked')).map(i => i.value);

  if (!code || !airport) return;

  const mission = {
    id: `custom-${Date.now()}`,
    code, airport, city, difficulty, modules, skillCards,
    custom: true,
  };
  state.customMissions.push(mission);
  saveState();
  rebuildAllMissions();
  renderSections();
  addModal.close();
});

/* ---------------- export / import ---------------- */

document.getElementById("export-btn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `skyteam-progression-${date}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

document.getElementById("import-input").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed || typeof parsed.progress !== "object") {
        throw new Error("Format inattendu");
      }
      const ok = confirm("Remplacer la progression actuelle par le fichier importé ?");
      if (!ok) return;
      state = {
        version: 1,
        progress: parsed.progress || {},
        customMissions: Array.isArray(parsed.customMissions) ? parsed.customMissions : [],
      };
      saveState();
      rebuildAllMissions();
      renderSections();
    } catch (err) {
      alert("Le fichier sélectionné n'est pas une sauvegarde Sky Team valide.");
      console.error(err);
    } finally {
      e.target.value = "";
    }
  };
  reader.readAsText(file);
});

/* ---------------- démarrage ---------------- */

async function init() {
  try {
    staticMissions = await loadStaticMissions();
  } catch (err) {
    console.error(err);
    document.getElementById("sections").innerHTML =
      `<p class="empty-state">Impossible de charger missions.json. Vérifie que le fichier est bien présent à côté de index.html et que la page est servie via un serveur local (Live Server), pas ouverte directement en double-clic.</p>`;
    return;
  }
  rebuildAllMissions();
  renderSections();
}

init();