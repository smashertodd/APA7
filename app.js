// =========================================================================
// APA 7 Arcade — app.js
// =========================================================================

// Replace these once your APA 7 Google Sheet is published as CSV.
const LIBRARY_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQp7Q7FpByF4xuoUpKlD7Wr8OH-tkvvDvIaV9tGwYnk3z3ei82h5EbSa0T6kZZPxLJJQywhG9OPBtHS/pub?gid=0&single=true&output=csv";
const TRACKING_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQp7Q7FpByF4xuoUpKlD7Wr8OH-tkvvDvIaV9tGwYnk3z3ei82h5EbSa0T6kZZPxLJJQywhG9OPBtHS/pub?gid=1657048725&single=true&output=csv";
const TRACKING_URL = "https://script.google.com/macros/s/AKfycbxfh4CaL9-3mjUk5Yi4GXVJGG9aUHjHGLZXF7EaAPhShYOQsarZbzF--iePZIIr9H9Oog/exec";

const TEACHER_PIN = "@pple";
const REFRESH_INTERVAL = 15000;

const COLORS = [
  "#f9a8d4", "#d8b4fe", "#a5b4fc", "#7dd3fc", "#5eead4",
  "#86efac", "#fde047", "#fdba74", "#fca5a5", "#c4b5fd"
];

let studentName = "";
let activities = {};
let currentGame = null;
let sessionStart = null;
let dragSrcEl = null;
let hintsUsed = [];
let attemptCount = 0;
let currentLayoutMode = "paragraph";

/* ============================================================
   Safe HTML formatting for APA examples

   Allows only:
   <em>, </em>, <i>, </i>, <strong>, </strong>, <b>, </b>,
   <u>, </u>, <br>
============================================================ */

function safeFormatHTML(value) {
  if (!value) return "";

  const escaped = String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped
    .replace(/&lt;(\/?)em&gt;/gi, "<$1em>")
    .replace(/&lt;(\/?)i&gt;/gi, "<$1i>")
    .replace(/&lt;(\/?)strong&gt;/gi, "<$1strong>")
    .replace(/&lt;(\/?)b&gt;/gi, "<$1b>")
    .replace(/&lt;(\/?)u&gt;/gi, "<$1u>")
    .replace(/&lt;br\s*\/?&gt;/gi, "<br>");
}

function stripFormattingTags(value) {
  return String(value || "").replace(/<\/?(em|i|strong|b|u)>/gi, "");
}

/* ============================================================
   Hint modal
============================================================ */

window.showNeonHint = function(message) {
  if (typeof openNeonModal === "function") {
    openNeonModal(message);
  } else {
    alert(message);
  }
};

const neonModalOverlay = document.createElement("div");
neonModalOverlay.id = "neon-hint-overlay";
neonModalOverlay.style.cssText = `
  display: none;
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(5px);
  z-index: 10000;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.3s ease;
`;

const neonModalBox = document.createElement("div");
neonModalBox.style.cssText = `
  background: rgba(30, 30, 46, 0.95);
  border: 2px solid #ec4899;
  box-shadow: 0 0 25px rgba(236, 72, 153, 0.6), inset 0 0 15px rgba(139, 92, 246, 0.4);
  border-radius: 20px;
  padding: 35px;
  max-width: 80%;
  width: 450px;
  text-align: center;
  transform: scale(0.8);
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
`;

const neonModalTitle = document.createElement("h3");
neonModalTitle.innerHTML = "💡 APA 7 Hint";
neonModalTitle.style.cssText = `
  margin-top: 0;
  color: #f9a8d4;
  text-shadow: 0 0 10px #ec4899;
  margin-bottom: 20px;
  font-size: 2rem;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
`;

const neonModalText = document.createElement("p");
neonModalText.id = "neon-hint-text-dynamic";
neonModalText.style.cssText = `
  color: #e2e8f0;
  font-size: 1.2rem;
  line-height: 1.5;
  margin-bottom: 25px;
  white-space: pre-line;
`;

const neonModalInstruction = document.createElement("small");
neonModalInstruction.innerHTML = "(Click anywhere to close)";
neonModalInstruction.style.cssText = `
  display: block;
  color: #8b5cf6;
  font-size: 0.95rem;
  opacity: 0.8;
  font-style: italic;
`;

neonModalBox.appendChild(neonModalTitle);
neonModalBox.appendChild(neonModalText);
neonModalBox.appendChild(neonModalInstruction);
neonModalOverlay.appendChild(neonModalBox);

window.openNeonModal = function(message) {
  neonModalText.innerText = message;
  neonModalOverlay.style.display = "flex";

  setTimeout(() => {
    neonModalOverlay.style.opacity = "1";
    neonModalBox.style.transform = "scale(1)";
  }, 10);
};

neonModalOverlay.addEventListener("click", () => {
  neonModalOverlay.style.opacity = "0";
  neonModalBox.style.transform = "scale(0.8)";

  setTimeout(() => {
    neonModalOverlay.style.display = "none";
  }, 300);
});

/* ============================================================
   Init
============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  try {
    const mobileFixScript = document.createElement("script");
    mobileFixScript.src = "https://unpkg.com/drag-drop-touch";
    document.head.appendChild(mobileFixScript);
  } catch (e) {
    console.log("Mobile drag/drop fix skipped", e);
  }

  document.body.appendChild(neonModalOverlay);

  showScreen("screen-name");

  const safeAdd = (id, event, handler) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
  };

  safeAdd("btn-start", "click", handleNameSubmit);
  safeAdd("btn-check", "click", checkAnswer);
  safeAdd("btn-retry", "click", retryActivity);
  safeAdd("btn-library", "click", () => showLibrary());

  safeAdd("tab-student", "click", () => switchTab("student"));
  safeAdd("tab-teacher", "click", () => promptTeacherPin());

  safeAdd("btn-pin-submit", "click", submitPin);
  safeAdd("btn-pin-cancel", "click", closePinModal);
  safeAdd("btn-reset-session", "click", resetSession);

  const nameInput = document.getElementById("input-name");
  if (nameInput) {
    nameInput.addEventListener("keydown", e => {
      if (e.key === "Enter") handleNameSubmit();
    });
  }

  const pinInput = document.getElementById("pin-input");
  if (pinInput) {
    pinInput.addEventListener("keydown", e => {
      if (e.key === "Enter") submitPin();
    });
  }
});

/* ============================================================
   Screens and session
============================================================ */

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const el = document.getElementById(id);
  if (el) el.classList.add("active");
}

function handleNameSubmit() {
  const input = document.getElementById("input-name");
  let name = input ? input.value.trim() : "";

  if (!name) name = "Student";

  studentName = name;
  loadLibrary();
}

/* ============================================================
   CSV parsing
============================================================ */

function parseCSV(text) {
  const rows = [];
  const lines = text.split(/\r?\n/);

  if (lines.length === 0) return rows;

  const headers = splitCSVLine(lines[0]);

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const values = splitCSVLine(lines[i]);
    const row = {};

    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || "").trim();
    });

    rows.push(row);
  }

  return rows;
}

function splitCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === "\"") {
      if (inQuotes && line[i + 1] === "\"") {
        current += "\"";
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }

  result.push(current);
  return result;
}

/* ============================================================
   Activity loading
============================================================ */

function loadLibrary() {
  if (
    !LIBRARY_CSV_URL ||
    LIBRARY_CSV_URL.includes("PASTE_APA7_ACTIVITIES_CSV_URL_HERE")
  ) {
    showError("APA 7 activities CSV URL has not been added yet.");
    return;
  }

  showScreen("screen-loading");

  const loadingScreen = document.getElementById("screen-loading");
  if (loadingScreen) {
    loadingScreen.innerHTML = `
      <div class="card center-card">
        <div class="spinner" aria-label="Loading"></div>
        <p class="subtitle loading-text">Loading APA 7 activities…</p>
      </div>
    `;
  }

  fetch(LIBRARY_CSV_URL + "&t=" + Date.now())
    .then(r => r.text())
    .then(text => {
      buildActivities(parseCSV(text));

      const activeGames = Object.keys(activities);

      if (activeGames.length === 0) {
        showError("No active APA 7 activities found.");
        return;
      }

      if (activeGames.length === 1) {
        startActivity(activeGames[0]);
      } else {
        showLibrary();
      }
    })
    .catch(e => {
      console.error(e);
      showError("Couldn't load APA 7 activities.");
    });
}

function buildActivities(rows) {
  activities = {};

  let lastTitle = "";
  let lastStatus = "";
  let lastType = "";

  rows.forEach(originalRow => {
    const row = {};

    for (let key in originalRow) {
      if (key) row[key.trim().toLowerCase().replace(/ /g, "_")] = originalRow[key];
    }

    let rowTitle = (row.title || "").trim();
    if (rowTitle) lastTitle = rowTitle;

    let currentTitle = lastTitle;
    if (!currentTitle) return;

    let rowStatus = (row.status || "").trim().toLowerCase();

    if (rowStatus === "active" || rowStatus === "inactive") {
      lastStatus = rowStatus;
    }

    if (lastStatus !== "active") return;

    let rawType = (row.type || "").trim();

    if (rawType && rawType.toLowerCase() !== "distractor") {
      lastType = rawType;
    }

    let rowType = (row.type || "").trim().toLowerCase();
    let isDistractor = rowType === "distractor" || rowStatus === "distractor";

    let textContent = (row.text || "").trim();

    if (!textContent && !isDistractor) return;

    if (!activities[currentTitle]) {
      activities[currentTitle] = {
        title: currentTitle,
        type: lastType,
        parts: [],
        distractors: [],
        overallHint: ""
      };
    }

    if (row.overall_hint) {
      activities[currentTitle].overallHint = row.overall_hint;
    }

    let extractedLabels = [];
    let processedText = textContent;

    const regex = /\[\[(.*?)\]\]/g;
    let match;

    while ((match = regex.exec(textContent)) !== null) {
      extractedLabels.push(match[1].trim());
    }

    if (lastType.toLowerCase().includes("detective")) {
      processedText = textContent;
    } else if (extractedLabels.length > 0) {
      processedText = textContent.replace(regex, "___");
    } else {
      extractedLabels.push((row.label || "").trim());
    }

    const item = {
      text: processedText,
      label: row.label,
      labels: extractedLabels,
      hint: row.hint
    };

    if (isDistractor) {
      activities[currentTitle].distractors.push(item);
    } else {
      activities[currentTitle].parts.push(item);
    }
  });
}

function showLibrary() {
  showScreen("screen-library");

  const list = document.getElementById("library-list");
  if (!list) return;

  list.innerHTML = "";

  Object.entries(activities).forEach(([id, game]) => {
    const card = document.createElement("button");
    card.className = "activity-card";

    const distractorText = game.distractors.length
      ? " + " + game.distractors.length + " distractor(s)"
      : "";

    card.innerHTML = `
      <span class="card-title">${safeFormatHTML(game.title)}</span>
      <span class="card-meta">${game.parts.length} part(s)${distractorText}</span>
    `;

    card.addEventListener("click", () => startActivity(id));
    list.appendChild(card);
  });
}

/* ============================================================
   Activity rendering
============================================================ */

function startActivity(gameId) {
  currentGame = gameId;
  hintsUsed = [];
  attemptCount = 0;

  const gameData = activities[gameId];
  const hasGaps = gameData.parts.some(p => p.text && p.text.includes("___"));
  const typeStr = (gameData.type || "").toLowerCase();

  if (typeStr.includes("detective")) {
    currentLayoutMode = "detective";
  } else if (!hasGaps) {
    currentLayoutMode = "paragraph";
  } else if (typeStr.includes("categorisation") || typeStr.includes("categorize")) {
    currentLayoutMode = "categorisation";
  } else {
    currentLayoutMode = "gapfill";
  }

  renderActivity(gameData);
  showScreen("screen-activity");
}

function renderActivity(game) {
  document.getElementById("activity-title").innerHTML = safeFormatHTML(game.title);

  let instructions = "";

  if (currentLayoutMode === "detective") {
    instructions = "Click the 💡 button to reveal your target. Then click the APA 7 errors or required features.";
  } else if (currentLayoutMode === "paragraph") {
    instructions = "Drag the APA 7 reference parts into the correct order.";
    if (game.distractors.length > 0) instructions += " Watch out for distractors.";
  } else {
    instructions = "Drag the correct APA 7 words, punctuation, or phrases into the gaps.";
    if (game.distractors.length > 0) instructions += " Watch out for distractors.";
  }

  if (game.overallHint) {
    const safeOverallHint = String(game.overallHint)
      .replace(/'/g, "\\'")
      .replace(/"/g, "&quot;");

    instructions += `
      <span
        onclick="showNeonHint('${safeOverallHint}')"
        title="Click for an APA 7 hint"
        style="margin-left:10px;cursor:pointer;font-size:1.2em;filter:drop-shadow(0 0 8px rgba(249,168,212,0.8));"
      >💡</span>
    `;
  }

  document.getElementById("game-instructions").innerHTML = instructions;

  let answerIndexCounter = 0;
  const allSentences = [];

  game.parts.forEach(part => {
    if (currentLayoutMode !== "paragraph" && part.text.includes("___")) {
      part.labels.forEach(lbl => {
        if (lbl) {
          allSentences.push({
            ...part,
            label: lbl,
            isDistractor: false,
            answerIndex: answerIndexCounter++
          });
        } else {
          answerIndexCounter++;
        }
      });
    } else {
      allSentences.push({
        ...part,
        isDistractor: false,
        answerIndex: answerIndexCounter++
      });
    }
  });

  game.distractors.forEach(d => {
    const dLabel = currentLayoutMode !== "paragraph" && !d.label ? d.text : d.label;

    allSentences.push({
      ...d,
      label: dLabel,
      isDistractor: true,
      answerIndex: -1
    });
  });

  shuffle(allSentences);

  const pool = document.getElementById("choice-pool");
  pool.innerHTML = "";

  allSentences.forEach((item, index) => {
    const chip = document.createElement("div");

    chip.className = "sentence-chip";
    chip.draggable = true;
    chip.dataset.answerIndex = item.answerIndex;
    chip.dataset.isDistractor = item.isDistractor;

    const displayText =
      currentLayoutMode !== "paragraph"
        ? (item.label || "[Missing]")
        : item.text;

    chip.innerHTML = `
      <span style="pointer-events:none;flex:1;padding-right:10px;">
        ${safeFormatHTML(displayText)}
      </span>
    `;

    if (currentLayoutMode !== "paragraph") {
      chip.dataset.color = COLORS[index % COLORS.length];
      chip.style.backgroundColor = chip.dataset.color;
      chip.style.setProperty("--chip-color", chip.dataset.color);
    }

    chip.addEventListener("dragstart", onDragStart);
    chip.addEventListener("dragend", onDragEnd);

    pool.appendChild(chip);
  });

  pool.addEventListener("dragover", onDragOver);
  pool.addEventListener("drop", e => onDropIntoPool(e, pool));

  const dropZone = document.getElementById("drop-zone");
  dropZone.innerHTML = "";

  let globalSlotCounter = 0;

  if (currentLayoutMode === "detective") {
    renderDetectiveMode(game, dropZone);
  } else if (currentLayoutMode === "categorisation") {
    renderCategorisationMode(game, dropZone, globalSlotCounter);
  } else if (currentLayoutMode === "gapfill") {
    renderGapfillMode(game, dropZone, globalSlotCounter);
  } else {
    renderParagraphMode(game, dropZone);
  }

  const feedback = document.getElementById("feedback");
  feedback.textContent = "";
  feedback.className = "feedback";

  document.getElementById("btn-check").style.display = "inline-flex";
  document.getElementById("btn-retry").style.display = "none";
}

function renderDetectiveMode(game, dropZone) {
  const leftPanel = document.querySelector(".panel-left");
  const workspace = document.querySelector(".workspace");

  if (leftPanel) leftPanel.style.display = "none";
  if (workspace) workspace.style.display = "block";

  const detectiveBox = document.createElement("div");
  detectiveBox.className = "detective-paragraph gap-fill-box";

  game.parts.forEach((part, i) => {
    const pDiv = document.createElement("span");

    const regex = /\[\[(.*?)\]\]|\{(.*?)\}|([^\s]+)/g;
    let match;

    while ((match = regex.exec(part.text || "")) !== null) {
      const rawText = match[1] || match[2] || match[3];
      const isTarget = match[1] !== undefined;

      const wordSpan = document.createElement("span");
      wordSpan.className = "detective-word";
      wordSpan.innerHTML = safeFormatHTML(rawText);
      wordSpan.dataset.isTarget = isTarget ? "true" : "false";

      wordSpan.addEventListener("click", () => {
        if (!wordSpan.classList.contains("locked")) {
          wordSpan.classList.toggle("selected");

          if (wordSpan.classList.contains("selected")) {
            wordSpan.style.border = "2px solid #39ff14";
            wordSpan.style.backgroundColor = "rgba(57,255,20,0.15)";
            wordSpan.style.color = "#064e3b";
          } else {
            wordSpan.style.border = "2px solid transparent";
            wordSpan.style.backgroundColor = "transparent";
            wordSpan.style.color = "inherit";
          }
        }
      });

      pDiv.appendChild(wordSpan);
      pDiv.appendChild(document.createTextNode(" "));
    }

    if (part.hint) {
      const hBtn = document.createElement("button");
      hBtn.className = "hint-btn-inline";
      hBtn.innerHTML = "💡";
      hBtn.title = "View APA 7 hint";
      hBtn.onclick = () => {
        showNeonHint("Hint:\n\n" + part.hint);
        hintsUsed.push("Hint (Sentence " + (i + 1) + ")");
      };

      pDiv.appendChild(hBtn);
      pDiv.appendChild(document.createTextNode(" "));
    }

    detectiveBox.appendChild(pDiv);
  });

  dropZone.appendChild(detectiveBox);
}

function renderCategorisationMode(game, dropZone, globalSlotCounter) {
  const gapFillBox = document.createElement("div");
  gapFillBox.className = "gap-fill-box";

  game.parts.forEach(part => {
    const rowSpan = document.createElement("span");
    rowSpan.className = "gap-row";

    const segments = (part.text || "").split("___");

    segments.forEach((seg, sIdx) => {
      if (seg) {
        const textSpan = document.createElement("span");
        textSpan.innerHTML = safeFormatHTML(seg);
        rowSpan.appendChild(textSpan);
      }

      if (sIdx < segments.length - 1) {
        const slot = document.createElement("span");
        slot.className = "gap-slot dropzone";
        slot.dataset.expectedIndex = globalSlotCounter++;

        slot.addEventListener("dragover", onDragOver);
        slot.addEventListener("drop", e => onDropIntoSlot(e, slot));

        rowSpan.appendChild(slot);

        if (part.hint) {
          const hBtn = document.createElement("button");
          hBtn.className = "hint-btn-inline";
          hBtn.innerHTML = "💡";
          hBtn.title = "View APA 7 hint";
          hBtn.onclick = () => {
            showNeonHint("Hint:\n\n" + part.hint);
            hintsUsed.push("Hint (Gap " + globalSlotCounter + ")");
          };

          rowSpan.appendChild(hBtn);
        }
      }
    });

    gapFillBox.appendChild(rowSpan);
    gapFillBox.appendChild(document.createTextNode(" "));
  });

  dropZone.appendChild(gapFillBox);
}

function renderGapfillMode(game, dropZone, globalSlotCounter) {
  const gapFillBox = document.createElement("div");
  gapFillBox.className = "gap-fill-box";

  game.parts.forEach(part => {
    const segments = (part.text || "").split("___");

    segments.forEach((seg, sIdx) => {
      if (seg) {
        const span = document.createElement("span");
        span.innerHTML = safeFormatHTML(seg);
        gapFillBox.appendChild(span);
      }

      if (sIdx < segments.length - 1) {
        const slot = document.createElement("span");
        slot.className = "gap-slot dropzone";
        slot.dataset.expectedIndex = globalSlotCounter++;

        slot.addEventListener("dragover", onDragOver);
        slot.addEventListener("drop", e => onDropIntoSlot(e, slot));

        gapFillBox.appendChild(slot);

        if (part.hint) {
          const hBtn = document.createElement("button");
          hBtn.className = "hint-btn-inline";
          hBtn.innerHTML = "💡";
          hBtn.title = "View APA 7 hint";
          hBtn.onclick = () => {
            showNeonHint("Hint:\n\n" + part.hint);
            hintsUsed.push("Hint (Gap " + globalSlotCounter + ")");
          };

          gapFillBox.appendChild(hBtn);
        }
      }
    });

    gapFillBox.appendChild(document.createTextNode(" "));
  });

  dropZone.appendChild(gapFillBox);
}

function renderParagraphMode(game, dropZone) {
  const workspace = document.querySelector(".workspace");
  const leftPanel = document.querySelector(".panel-left");

  if (workspace) workspace.style.display = "grid";
  if (leftPanel) leftPanel.style.display = "block";

  const builderContainer = document.createElement("div");
  builderContainer.style.display = "flex";
  builderContainer.style.gap = "20px";
  builderContainer.style.width = "100%";
  builderContainer.style.alignItems = "flex-start";

  const labelsColumn = document.createElement("div");
  labelsColumn.style.display = "flex";
  labelsColumn.style.flexDirection = "column";
  labelsColumn.style.gap = "15px";
  labelsColumn.style.width = "220px";
  labelsColumn.style.flexShrink = "0";

  const paraBuilder = document.createElement("div");
  paraBuilder.className = "gap-fill-box";
  paraBuilder.style.flexGrow = "1";

  game.parts.forEach((part, i) => {
    const color = COLORS[i % COLORS.length];

    const labelDiv = document.createElement("div");
    labelDiv.style.backgroundColor = color;
    labelDiv.style.padding = "12px 16px";
    labelDiv.style.borderRadius = "8px";
    labelDiv.style.display = "flex";
    labelDiv.style.justifyContent = "space-between";
    labelDiv.style.alignItems = "center";
    labelDiv.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)";

    const labelText = document.createElement("span");
    labelText.innerHTML = safeFormatHTML((i + 1) + ". " + (part.label || "Part " + (i + 1)));
    labelText.style.fontWeight = "700";
    labelText.style.color = "#0f172a";

    labelDiv.appendChild(labelText);

    if (part.hint) {
      const hintBtn = document.createElement("button");
      hintBtn.className = "hint-btn-small";
      hintBtn.innerHTML = "💡";
      hintBtn.title = "View APA 7 hint";
      hintBtn.onclick = () => {
        showNeonHint("Hint for " + stripFormattingTags(part.label || "this part") + ":\n\n" + part.hint);
        hintsUsed.push("Hint (" + stripFormattingTags(part.label || "Part " + (i + 1)) + ")");
      };

      labelDiv.appendChild(hintBtn);
    }

    labelsColumn.appendChild(labelDiv);

    const slot = document.createElement("span");
    slot.className = "paragraph-slot dropzone";
    slot.dataset.expectedIndex = i;
    slot.dataset.color = color;

    slot.addEventListener("dragover", onDragOver);
    slot.addEventListener("drop", e => onDropIntoSlot(e, slot));

    paraBuilder.appendChild(slot);
    paraBuilder.appendChild(document.createTextNode(" "));
  });

  builderContainer.appendChild(labelsColumn);
  builderContainer.appendChild(paraBuilder);
  dropZone.appendChild(builderContainer);
}

/* ============================================================
   Drag and drop
============================================================ */

function onDragStart(e) {
  dragSrcEl = this;
  e.dataTransfer.effectAllowed = "move";
  setTimeout(() => this.classList.add("opacity-50"), 0);
}

function onDragEnd() {
  this.classList.remove("opacity-50");
  document.querySelectorAll(".drag-over").forEach(el => el.classList.remove("drag-over"));
  updateSlotLayouts();
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";

  if (this.classList.contains("dropzone")) {
    this.classList.add("drag-over");
  }
}

function onDropIntoSlot(e, slot) {
  e.preventDefault();

  slot.classList.remove("drag-over");

  if (!dragSrcEl || slot.classList.contains("correct")) return;

  if (slot.children.length > 0) {
    document.getElementById("choice-pool").appendChild(slot.children[0]);
  }

  slot.appendChild(dragSrcEl);
  updateSlotLayouts();
}

function onDropIntoPool(e, pool) {
  e.preventDefault();

  if (dragSrcEl) {
    pool.appendChild(dragSrcEl);
    updateSlotLayouts();
  }
}

function updateSlotLayouts() {
  document.querySelectorAll(".dropzone").forEach(slot => {
    const row = slot.closest(".gap-row");

    if (slot.children.length > 0) {
      slot.classList.add("filled");

      const chip = slot.children[0];
      chip.classList.add("in-paragraph");

      if (currentLayoutMode !== "paragraph") {
        chip.classList.add("gap-chip");
        chip.style.backgroundColor = chip.dataset.color || "#e2e8f0";

        if (row && currentLayoutMode === "categorisation") {
          row.style.backgroundColor = chip.dataset.color;
          row.style.color = "#000";
        }
      } else {
        chip.style.backgroundColor = slot.dataset.color;
        chip.style.color = "#0f172a";
      }
    } else {
      slot.classList.remove("filled");

      if (row && currentLayoutMode === "categorisation") {
        row.style.backgroundColor = "transparent";
        row.style.color = "inherit";
      }
    }
  });

  document.querySelectorAll("#choice-pool .sentence-chip").forEach(chip => {
    chip.classList.remove("in-paragraph", "locked", "gap-chip");

    if (currentLayoutMode !== "paragraph" && chip.dataset.color) {
      chip.style.backgroundColor = chip.dataset.color;
    } else {
      chip.style.backgroundColor = "";
    }

    chip.style.outline = "none";
  });
}

/* ============================================================
   Checking
============================================================ */

function checkAnswer() {
  if (currentLayoutMode === "detective") {
    checkDetectiveAnswer();
    return;
  }

  const slots = document.querySelectorAll(".dropzone");

  let correctCount = 0;
  let emptyCount = 0;
  let distractorCount = 0;
  let mistakesMade = false;

  attemptCount++;

  slots.forEach(slot => {
    const chip = slot.querySelector(".sentence-chip");

    if (!chip) {
      emptyCount++;
      return;
    }

    if (chip.classList.contains("locked")) {
      correctCount++;
      return;
    }

    const expected = slot.dataset.expectedIndex;
    const actual = chip.dataset.answerIndex;
    const isDistractor = chip.dataset.isDistractor === "true";

    if (isDistractor) {
      distractorCount++;
      mistakesMade = true;
      document.getElementById("choice-pool").appendChild(chip);
    } else if (expected === actual) {
      correctCount++;
      chip.classList.add("locked");
      chip.draggable = false;
      slot.classList.add("correct");
    } else {
      mistakesMade = true;
      document.getElementById("choice-pool").appendChild(chip);
    }
  });

  updateSlotLayouts();

  const totalSlots = slots.length;
  let status;
  let message;

  if (correctCount === totalSlots) {
    status = "correct";

    message =
      currentLayoutMode !== "paragraph"
        ? "🎉 Perfect! You filled the APA 7 gaps correctly."
        : "🎉 Perfect! You built the APA 7 reference correctly.";

    document.getElementById("btn-check").style.display = "none";
    document.getElementById("btn-retry").style.display = "inline-flex";

    if (typeof confetti === "function") {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#ec4899", "#8b5cf6", "#4ade80", "#fde047"]
      });
    }
  } else if (mistakesMade) {
    status = "incorrect";
    message =
      "⚠️ Incorrect parts were sent back to the left. You locked in " +
      correctCount +
      " correct answer(s). Keep trying!";
  } else if (emptyCount > 0) {
    status = "partial";
    message =
      "Fill the remaining empty spaces. You have " +
      correctCount +
      " locked in.";
  }

  const fb = document.getElementById("feedback");

  if (fb) {
    fb.textContent = message;
    fb.className = "feedback " + status;
  }

  const details = ["Score: " + correctCount + "/" + totalSlots];

  if (distractorCount > 0) details.push("⚠️ Fell for distractors");

  details.push(
    hintsUsed.length > 0
      ? "💡 Hints: " + [...new Set(hintsUsed)].join(", ")
      : "🧠 No hints used"
  );

  trackAttempt(status, attemptCount, details);
}

function checkDetectiveAnswer() {
  const words = document.querySelectorAll(".detective-word");

  let correctCount = 0;
  let mistakesMade = false;
  let totalTargets = 0;
  let emptyCount = 0;

  words.forEach(w => {
    const isTarget = w.dataset.isTarget === "true";
    const isSelected = w.classList.contains("selected");
    const isLocked = w.classList.contains("locked");

    if (isTarget) totalTargets++;

    if (isLocked) {
      correctCount++;
    } else if (isSelected && isTarget) {
      correctCount++;

      w.classList.remove("selected");
      w.classList.add("locked");
      w.style.border = "2px solid #39ff14";
      w.style.backgroundColor = "rgba(57,255,20,0.25)";
      w.style.color = "#064e3b";
      w.style.fontWeight = "bold";
      w.style.cursor = "default";
    } else if (isSelected && !isTarget) {
      mistakesMade = true;

      w.classList.remove("selected");
      w.style.border = "2px solid transparent";
      w.style.backgroundColor = "transparent";
      w.style.color = "inherit";
    } else if (isTarget && !isSelected) {
      emptyCount++;
    }
  });

  attemptCount++;

  let status;
  let message;

  if (correctCount === totalTargets && totalTargets > 0) {
    status = "correct";
    message = "🎉 Perfect APA detective work!";

    document.getElementById("btn-check").style.display = "none";
    document.getElementById("btn-retry").style.display = "inline-flex";

    if (typeof confetti === "function") {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#ec4899", "#8b5cf6", "#4ade80", "#fde047"]
      });
    }
  } else if (mistakesMade) {
    status = "incorrect";
    message =
      "⚠️ Incorrect selections popped back to normal. You found " +
      correctCount +
      " correct item(s). Keep hunting!";
  } else if (emptyCount > 0) {
    status = "partial";
    message =
      "You are missing some APA 7 items. You have found " +
      correctCount +
      " so far.";
  }

  const fb = document.getElementById("feedback");

  if (fb) {
    fb.textContent = message;
    fb.className = "feedback " + status;
  }

  trackAttempt(status, attemptCount, ["Score: " + correctCount + "/" + totalTargets]);
}

function retryActivity() {
  const currentAttempts = attemptCount;
  const currentHints = [...hintsUsed];

  renderActivity(activities[currentGame]);

  attemptCount = currentAttempts;
  hintsUsed = currentHints;
}

/* ============================================================
   Tracking
============================================================ */

function trackAttempt(status, attempt, details) {
  if (!TRACKING_URL || TRACKING_URL.includes("PASTE_APA7_APPS_SCRIPT_EXEC_URL_HERE")) {
    console.log("Tracking skipped:", { studentName, currentGame, attempt, status, details });
    return;
  }

  const params = new URLSearchParams({
    name: studentName,
    game_id: currentGame,
    attempt: attempt,
    status: status,
    details: details.join(" | ")
  });

  fetch(TRACKING_URL + "?" + params.toString(), { mode: "no-cors" }).catch(() => {});
}

/* ============================================================
   Teacher panel
============================================================ */

function switchTab(tab) {
  const tabS = document.getElementById("tab-student");
  const tabT = document.getElementById("tab-teacher");

  const pS = document.getElementById("panel-student");
  const pT = document.getElementById("panel-teacher");

  if (tabS) tabS.classList.toggle("active", tab === "student");
  if (tabT) tabT.classList.toggle("active", tab === "teacher");

  if (pS) pS.classList.toggle("hidden", tab !== "student");
  if (pT) pT.classList.toggle("hidden", tab !== "teacher");

  if (tab === "teacher") loadTeacherData();
}

function promptTeacherPin() {
  const modal = document.getElementById("pin-modal");
  const input = document.getElementById("pin-input");
  const error = document.getElementById("pin-error");

  if (modal) modal.classList.remove("hidden");

  if (error) error.textContent = "";

  if (input) {
    input.value = "";
    input.focus();
  }
}

function closePinModal() {
  const modal = document.getElementById("pin-modal");
  if (modal) modal.classList.add("hidden");
}

function submitPin() {
  const input = document.getElementById("pin-input");
  if (!input) return;

  if (input.value.trim() === TEACHER_PIN) {
    closePinModal();
    switchTab("teacher");
  } else {
    const err = document.getElementById("pin-error");
    if (err) err.textContent = "Incorrect PIN.";

    input.value = "";
    input.focus();
  }
}

function resetSession() {
  sessionStart = Date.now();
  loadTeacherData();
}

function loadTeacherData() {
  const container = document.getElementById("teacher-results");
  if (!container) return;

  if (!TRACKING_CSV_URL || TRACKING_CSV_URL.includes("PASTE_APA7_TRACKING_CSV_URL_HERE")) {
    container.innerHTML = "<p>Tracking CSV URL has not been added yet.</p>";
    return;
  }

  container.innerHTML = "<p>Loading results...</p>";

  fetch(TRACKING_CSV_URL + "&t=" + Date.now())
    .then(r => r.text())
    .then(text => {
      const rows = parseCSV(text);

      const filtered = sessionStart
        ? rows.filter(r => new Date(r.Timestamp).getTime() >= sessionStart)
        : rows;

      renderTeacherTable(filtered.reverse());
    })
    .catch(() => {
      container.innerHTML = "<p>Could not load results.</p>";
    });
}

function renderTeacherTable(rows) {
  const container = document.getElementById("teacher-results");
  if (!container) return;

  if (rows.length === 0) {
    container.innerHTML = "<p>No results yet.</p>";
    return;
  }

  const headers = ["Timestamp", "Name", "Game_ID", "Attempt", "Status", "Details"];

  let html = "<div id='results-table-wrap'><table id='results-table'><thead><tr>";

  headers.forEach(h => {
    html += "<th>" + h + "</th>";
  });

  html += "</tr></thead><tbody>";

  rows.forEach(row => {
    html += "<tr>";

    headers.forEach(h => {
      html += "<td>" + safeFormatHTML(row[h] || "") + "</td>";
    });

    html += "</tr>";
  });

  html += "</tbody></table></div>";

  container.innerHTML = html;
}

setInterval(() => {
  const t = document.getElementById("panel-teacher");

  if (t && !t.classList.contains("hidden")) {
    loadTeacherData();
  }
}, REFRESH_INTERVAL);

/* ============================================================
   Utilities
============================================================ */

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

function showError(msg) {
  showScreen("screen-error");

  const errEl = document.getElementById("error-message");

  if (errEl) {
    errEl.textContent = msg;
  }
}
