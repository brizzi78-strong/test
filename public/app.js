// Client logic for the Human + AI Writing Tool.

const els = {
  input: document.getElementById("input"),
  output: document.getElementById("output"),
  inputCounter: document.getElementById("inputCounter"),
  modes: document.getElementById("modes"),
  toneGroup: document.getElementById("toneGroup"),
  tone: document.getElementById("tone"),
  runBtn: document.getElementById("runBtn"),
  runLabel: document.querySelector(".run-label"),
  spinner: document.querySelector(".run .spinner"),
  copyBtn: document.getElementById("copyBtn"),
  useBtn: document.getElementById("useBtn"),
  modelBadge: document.getElementById("modelBadge"),
  toast: document.getElementById("toast"),
};

let selectedMode = "humanize";
let busy = false;

init();

async function init() {
  els.input.addEventListener("input", updateCounter);
  els.runBtn.addEventListener("click", run);
  els.copyBtn.addEventListener("click", copyResult);
  els.useBtn.addEventListener("click", useAsDraft);

  // Cmd/Ctrl+Enter runs the rewrite from anywhere.
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      run();
    }
  });

  updateCounter();

  try {
    const res = await fetch("/api/options");
    const { modes, tones, model } = await res.json();
    renderModes(modes);
    renderTones(tones);
    els.modelBadge.textContent = model;
  } catch {
    showToast("Could not load options. Is the server running?", "error");
  }
}

function renderModes(modes) {
  els.modes.innerHTML = "";
  modes.forEach((mode, i) => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.textContent = mode.label;
    chip.dataset.mode = mode.id;
    if (i === 0) {
      chip.classList.add("active");
      selectedMode = mode.id;
    }
    chip.addEventListener("click", () => selectMode(mode.id, chip));
    els.modes.appendChild(chip);
  });
  syncToneVisibility();
}

function renderTones(tones) {
  els.tone.innerHTML = "";
  tones.forEach((tone) => {
    const opt = document.createElement("option");
    opt.value = tone;
    opt.textContent = tone.charAt(0).toUpperCase() + tone.slice(1);
    els.tone.appendChild(opt);
  });
}

function selectMode(id, chip) {
  selectedMode = id;
  [...els.modes.children].forEach((c) => c.classList.remove("active"));
  chip.classList.add("active");
  syncToneVisibility();
}

function syncToneVisibility() {
  els.toneGroup.hidden = selectedMode !== "tone";
}

function updateCounter() {
  const n = els.input.value.length;
  els.inputCounter.textContent = `${n.toLocaleString()} char${n === 1 ? "" : "s"}`;
}

async function run() {
  if (busy) return;
  const text = els.input.value.trim();
  if (!text) {
    showToast("Write or paste a draft first.", "error");
    els.input.focus();
    return;
  }

  setBusy(true);
  els.output.classList.add("streaming");
  els.output.textContent = "";
  els.copyBtn.disabled = true;
  els.useBtn.disabled = true;

  let result = "";

  try {
    const res = await fetch("/api/rewrite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, mode: selectedMode, tone: els.tone.value }),
    });

    if (!res.ok || !res.body) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Request failed (${res.status})`);
    }

    await readSSE(res.body, {
      delta: (data) => {
        result += data.text;
        els.output.textContent = result;
        els.output.scrollTop = els.output.scrollHeight;
      },
      error: (data) => {
        throw new Error(data.error || "Stream error");
      },
    });

    if (result.trim()) {
      els.copyBtn.disabled = false;
      els.useBtn.disabled = false;
    } else {
      els.output.innerHTML = '<span class="placeholder">No output was returned.</span>';
    }
  } catch (err) {
    els.output.innerHTML = `<span class="placeholder">${escapeHtml(err.message)}</span>`;
    showToast(err.message, "error");
  } finally {
    els.output.classList.remove("streaming");
    setBusy(false);
  }
}

// Minimal Server-Sent Events parser over a fetch ReadableStream.
async function readSSE(stream, handlers) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      let event = "message";
      let dataLine = "";
      for (const line of chunk.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLine += line.slice(5).trim();
      }
      if (!dataLine) continue;
      const data = JSON.parse(dataLine);
      if (event === "done") return;
      handlers[event]?.(data);
    }
  }
}

function setBusy(state) {
  busy = state;
  els.runBtn.disabled = state;
  els.spinner.hidden = !state;
  els.runLabel.textContent = state ? "Rewriting…" : "Rewrite";
}

async function copyResult() {
  try {
    await navigator.clipboard.writeText(els.output.textContent);
    showToast("Copied to clipboard.", "success");
  } catch {
    showToast("Could not copy.", "error");
  }
}

function useAsDraft() {
  els.input.value = els.output.textContent;
  updateCounter();
  els.input.focus();
  showToast("Result moved to your draft.", "success");
}

let toastTimer;
function showToast(message, kind = "") {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.className = `toast ${kind}`.trim();
  els.toast.hidden = false;
  toastTimer = setTimeout(() => (els.toast.hidden = true), 3000);
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);
}
