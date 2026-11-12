"use strict";

const $ = (id) => document.getElementById(id);
const art = CryptArt;
const canvas = $("dungeon");
const ctx = canvas.getContext("2d", { alpha: false });
const dialogs = [...document.querySelectorAll("dialog")];
const keys = new Set();
const heldActions = new Set();
const queued = new Set();
const effects = [];
const touchScreen = matchMedia("(pointer: coarse)");
const itemLabels = { weapon: "урон", armor: "макс. здоровье", charm: "заряд за убийство" };
const directionCodes = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
const actions = { Space: "attack", ShiftLeft: "dash", ShiftRight: "dash", KeyE: "interact", KeyQ: "seal", Digit1: "potion", Numpad1: "potion" };
const durations = { swing: .28, seal: .51, hit: .46, hurt: .44, death: .39, heal: .57, dash: .25 };
const number = new Intl.NumberFormat("ru");
const pad = (value) => String(value).padStart(2, "0");

let run = Crypt.newRun();
let sound = false;
let record = { kills: 0, floor: 0, wins: 0 };
let started = false;
let pointer = null;
let audio = null;
let bagSignature = "";
let mapSignature = "";
let logSignature = "";
let focusedItem = null;
let recorded = false;
let eventTimer = null;
let wasResult = false;

function text(id, value) {
  const next = String(value);
  if ($(id).textContent !== next) $(id).textContent = next;
}

function save() {
  let label = "Забег сохраняется";
  try {
    localStorage.setItem(Crypt.saveKey, JSON.stringify({ run, sound, record, recorded }));
  } catch {
    label = "Браузер не сохранил забег";
  }
  const status = $("save-status");
  if (status.title !== label) {
    status.title = label;
    status.lastElementChild.textContent = label;
    status.classList.toggle("unavailable", label !== "Забег сохраняется");
  }
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(Crypt.saveKey));
    const restored = Crypt.restore(saved?.run);
    if (restored) {
      run = restored;
      recorded = Boolean(saved.recorded);
    }
    if (saved?.record) record = saved.record;
    sound = saved?.sound === true;
  } catch {
    // A run can still be played when browser storage is unavailable.
  }
}

function tone(type) {
  if (!sound || !window.AudioContext) return;
  const frequencies = { swing: 130, hit: 200, death: 116, hurt: 81, heal: 434, loot: 622, dash: 280, clear: 510, seal: 365, room: 155, floor: 331 };
  if (!frequencies[type]) return;
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume().catch(() => {});
    const t = audio.currentTime;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = ["death", "hurt", "swing"].includes(type) ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(frequencies[type], t);
    oscillator.frequency.exponentialRampToValueAtTime(frequencies[type] * (["loot", "heal", "clear"].includes(type) ? 1.4 : .55), t + .15);
    gain.gain.setValueAtTime(.045, t);
    gain.gain.exponentialRampToValueAtTime(.001, t + .18);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(t);
    oscillator.stop(t + .19);
  } catch {
    // Audio can be unavailable on a suspended tab.
  }
}

function refreshAudio() {
  const button = $("audio");
  const label = sound ? "Выключить звук" : "Включить звук";
  button.dataset.icon = sound ? "sound" : "mute";
  button.title = label;
  button.setAttribute("aria-label", label);
  button.setAttribute("aria-pressed", sound);
  art.paintIcons(button);
}

function message(value) {
  const label = $("arena-event");
  label.textContent = value;
  label.hidden = false;
  clearTimeout(eventTimer);
  eventTimer = setTimeout(() => { label.hidden = true; }, 2300);
}

function fx(type, data) {
  if (durations[type]) effects.push({ type, start: run.time, duration: durations[type], ...data });
  if (["floor", "room"].includes(type)) effects.length = 0;
  if (type === "clear") message(Crypt.floorClear(run) ? "Этаж зачищен. Ищи лестницу." : "Зачищено. Двери открыты.");
  if (type === "notice") message(data.text);
  if (type === "floor") message(Crypt.floors[run.floor]);
  if (["room", "floor", "clear", "loot", "heal", "seal"].includes(type)) save();
  tone(type);
}

function itemStats(item) {
  const suffix = item.slot === "charm" ? "%" : "";
  return `+${item.stat}${suffix} · ${itemLabels[item.slot]}`;
}

function refreshBag() {
  const worn = Crypt.slots.map((slot) => run.gear[slot]);
  const signature = worn.map((item) => item?.id ?? "-").join(",") + "/" + run.bag.map((item) => item.id).join(",");
  if (signature === bagSignature) return;
  bagSignature = signature;
  text("item-count", `${run.bag.length} / 8`);
  text("bag-help", run.bag.length ? "Выбери предмет" : touchScreen.matches ? "Подбирай добычу в залах" : "Подбирай добычу клавишей E");
  $("equipment").innerHTML = Crypt.slots.map((slot, index) => {
    const item = worn[index];
    const color = item ? Crypt.rarity[item.tier].color : "#8b9b83";
    return `<div class="equip-row" style="--tone:${color}">${art.glyph(Crypt.slotsIcons[slot], 'class="equip-symbol"')}<div><small>${Crypt.slotLabels[slot]}</small><strong>${item ? Crypt.itemName(item) : "Пусто"}</strong></div>${item ? `<b title="${itemLabels[slot]}">+${item.stat}${slot === "charm" ? "%" : ""}</b>` : ""}</div>`;
  }).join("");
  $("bag").replaceChildren(...Array.from({ length: 8 }, (_, i) => {
    const item = run.bag[i];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "bag-cell";
    button.disabled = !item;
    if (item) {
      const label = Crypt.itemName(item);
      button.title = label;
      button.setAttribute("aria-label", label);
      button.style.setProperty("--item", Crypt.rarity[item.tier].color);
      button.innerHTML = art.glyph(Crypt.slotsIcons[item.slot]) + `<small>${item.level}</small>`;
      button.addEventListener("click", () => showItem(item.id));
    } else button.setAttribute("aria-label", "Пустая ячейка");
    return button;
  }));
  art.paintIcons($("equipment"));
  art.paintIcons($("bag"));
}

function refreshLog() {
  const entries = run.log.slice(0, 3);
  const signature = entries.map((entry) => entry.text).join("|");
  if (signature === logSignature) return;
  logSignature = signature;
  $("log").replaceChildren(...entries.map((entry) => {
    const row = document.createElement("li");
    const label = document.createElement("span");
    if (art.iconKeys.has(entry.icon)) row.innerHTML = art.glyph(entry.icon);
    label.textContent = entry.text;
    row.append(label);
    return row;
  }));
  art.paintIcons($("log"));
}

function hint(message, key) {
  const label = $("hint");
  if (label.lastElementChild.textContent !== message) label.lastElementChild.textContent = message;
  const symbol = label.firstElementChild;
  if (symbol.dataset.icon !== key) {
    symbol.dataset.icon = key;
    art.paintIcons(symbol);
  }
}

function refreshUI() {
  const room = Crypt.currentRoom(run);
  const stats = Crypt.stats(run);
  const cleared = run.rooms.filter((candidate) => candidate.clear).length;
  const enemies = room.enemies.filter((enemy) => enemy.hp > 0).length;
  text("floor-label", `ЭТАЖ ${pad(run.floor + 1)} / ${pad(Crypt.floors.length)}`);
  text("floor-name", Crypt.floors[run.floor]);
  text("map-floor", pad(run.floor + 1));
  text("room-name", room.title);
  text("room-count", `${cleared} / ${run.rooms.length}`);
  text("kill-count", number.format(run.kills));
  text("ash-count", number.format(run.ash));
  const tag = $("room-state");
  tag.classList.toggle("clear", room.clear);
  const status = room.clear ? " Комната зачищена" : ` Врагов в комнате: ${enemies}`;
  if (tag.lastChild.textContent !== status) tag.lastChild.textContent = status;
  text("health-label", `${run.player.hp} / ${stats.maxHp}`);
  $("health-bar").style.width = (100 * run.player.hp / stats.maxHp) + "%";
  text("seal-label", run.charge >= 100 ? "100% · Q" : run.charge + "%");
  $("seal-bar").style.width = run.charge + "%";
  $("seal-bar").closest(".charge").classList.toggle("ready", run.charge >= 100);
  text("potion-count", "×" + run.potions);
  $("potion").disabled = !run.potions || run.player.hp >= stats.maxHp;

  const nearby = Crypt.interactable(run);
  const touch = touchScreen.matches;
  const interactKey = touch ? "" : "E · ";
  if (nearby?.type === "drop") hint(interactKey + (nearby.value.type === "potion" ? "Поднять зелье" : Crypt.itemName(nearby.value.item)), "hand");
  else if (nearby?.type === "stairs") hint(interactKey + (run.floor === 4 ? "Покинуть склеп" : "Спуститься"), "stairs");
  else if (nearby?.type === "door") hint(interactKey + "Пройти в комнату", "door");
  else if (run.charge >= 100 && !room.clear) hint((touch ? "" : "Q · ") + "Пепельная печать готова", "seal");
  else if (!started && !room.clear) hint(run.time ? "Двигайся, чтобы продолжить бой" : "Двигайся, чтобы начать бой", "sword");
  else if (room.clear && room.drops.length) hint(touch ? "Подойди к добыче" : "Подойди к добыче и нажми E", "hand");
  else if (room.clear && room.exit && Crypt.floorClear(run)) hint(touch ? "Подойди к лестнице" : "Подойди к лестнице и нажми E", "stairs");
  else if (room.clear) hint(touch ? "Подойди к открытой двери" : "Подойди к открытой двери и нажми E", "door");
  else hint(touch ? "Красная зона предупреждает об ударе" : "Пробел · Удар   /   Shift · Рывок", "sword");

  const signature = `${run.seed}/${run.floor}/${run.room}/${cleared}`;
  if (signature !== mapSignature) {
    mapSignature = signature;
    art.drawMap($("map"), run);
  }
  refreshBag();
  refreshLog();
}

function clearInput() {
  keys.clear();
  heldActions.clear();
  queued.clear();
  pointer = null;
  document.querySelectorAll(".held").forEach((button) => button.classList.remove("held"));
}

function modal(id) {
  const dialog = $(id);
  if (!dialog.open) {
    clearInput();
    save();
    dialog.showModal();
  }
}

function showItem(id) {
  const item = run.bag.find((candidate) => candidate.id === id);
  if (!item) return;
  focusedItem = id;
  const worn = run.gear[item.slot];
  text("item-title", Crypt.itemName(item));
  text("item-rarity", `${Crypt.rarity[item.tier].name.toUpperCase()} · УРОВЕНЬ ${item.level}`);
  $("item-rarity").style.color = Crypt.rarity[item.tier].color;
  text("item-details", `${Crypt.slotLabels[item.slot]} · ${itemStats(item)}`);
  text("item-compare", worn ? `Сейчас: ${Crypt.itemName(worn)} · ${itemStats(worn)}` : "Этот слот сейчас пуст.");
  text("salvage", `Разобрать · +${3 + item.level + item.tier * 4} праха`);
  modal("item-dialog");
}

function showChoice() {
  $("relic-options").replaceChildren(...run.choice.map((entry, index) => {
    const relic = Crypt.relics[entry.index];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "relic-option";
    button.disabled = run.ash < entry.cost;
    button.innerHTML = `${art.glyph(relic.icon, 'class="relic-icon teal"')}<span><strong>${relic.name}</strong><small>${relic.text}</small></span><b>${entry.cost ? `${entry.cost} праха` : "Бесплатно"}</b>`;
    button.addEventListener("click", () => {
      if (!Crypt.choose(run, index, fx)) return;
      $("relic-dialog").close();
      started = false;
      refreshUI();
      save();
    });
    return button;
  }));
  modal("relic-dialog");
  art.paintIcons($("relic-options"));
}

function showResult() {
  if (!recorded) {
    record.kills = Math.max(record.kills, run.kills);
    record.floor = Math.max(record.floor, run.floor + 1);
    if (run.result === "win") record.wins += 1;
    recorded = true;
  }
  const title = run.result === "win" ? "Печать склепа разрушена" : "Склеп забрал тебя";
  text("result-title", title);
  text("result-details", `Этаж ${run.floor + 1} из ${Crypt.floors.length} · Врагов побеждено: ${run.kills} · Добычи собрано: ${run.looted}`);
  text("record-details", `Рекорд убийств: ${record.kills} · Лучший этаж: ${record.floor} · Побед: ${record.wins}`);
  modal("result-dialog");
}

function restart() {
  for (const dialog of dialogs) if (dialog.open) dialog.close();
  clearInput();
  effects.length = 0;
  $("arena-event").hidden = true;
  run = Crypt.newRun();
  started = false;
  recorded = false;
  wasResult = false;
  bagSignature = mapSignature = logSignature = "";
  refreshUI();
  save();
}

function activate(action) {
  if (run.result || run.choice || dialogs.some((dialog) => dialog.open)) return;
  queued.add(action);
  started = true;
}

const pressed = (...codes) => codes.some((code) => keys.has(code));

function playerInput() {
  return {
    x: Number(pressed("ArrowRight", "KeyD")) - Number(pressed("ArrowLeft", "KeyA")),
    y: Number(pressed("ArrowDown", "KeyS")) - Number(pressed("ArrowUp", "KeyW")),
    aim: queued.has("pointerAttack") ? pointer : null,
    attack: queued.has("pointerAttack") || queued.has("attack") || heldActions.has("attack") || pressed("Space"),
    dash: queued.has("dash"), seal: queued.has("seal"), potion: queued.has("potion"), interact: queued.has("interact"),
  };
}

window.addEventListener("keydown", (event) => {
  if (dialogs.some((dialog) => dialog.open) || event.ctrlKey || event.altKey || event.metaKey) return;
  if (event.code === "Escape" || event.code === "KeyP") {
    if (!event.repeat) modal("pause-dialog");
    return;
  }
  const action = actions[event.code];
  if (!directionCodes.has(event.code) && !action) return;
  if (event.code === "Space" && event.target.closest?.("button, a")) return;
  event.preventDefault();
  if (directionCodes.has(event.code) || event.code === "Space") keys.add(event.code);
  if (action && !event.repeat) activate(action);
  started = true;
});
window.addEventListener("keyup", (event) => keys.delete(event.code));
window.addEventListener("blur", clearInput);

function setAim(event) {
  const box = canvas.getBoundingClientRect();
  pointer = { x: (event.clientX - box.left) * Crypt.width / box.width, y: (event.clientY - box.top) * Crypt.height / box.height };
}

canvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  if (event.pointerType === "mouse") setAim(event);
  else pointer = null;
  activate("pointerAttack");
});

for (const button of document.querySelectorAll(".touch-controls button")) {
  button.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    button.classList.add("held");
    pointer = null;
    if (button.dataset.direction) {
      keys.add(button.dataset.direction);
      started = true;
    } else {
      heldActions.add(button.dataset.action);
      activate(button.dataset.action);
    }
  });
  function release() {
    button.classList.remove("held");
    keys.delete(button.dataset.direction);
    heldActions.delete(button.dataset.action);
  }
  button.addEventListener("lostpointercapture", release);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("click", (event) => {
    if (event.detail || !button.dataset.action) return;
    activate(button.dataset.action);
  });
}

$("potion").addEventListener("click", () => activate("potion"));
$("pause").addEventListener("click", () => modal("pause-dialog"));
$("help").addEventListener("click", () => modal("help-dialog"));
$("audio").addEventListener("click", () => {
  sound = !sound;
  refreshAudio();
  tone("loot");
  save();
});
$("equip").addEventListener("click", () => {
  if (Crypt.equip(run, focusedItem)) tone("loot");
  $("item-dialog").close();
  refreshUI();
  save();
});
$("salvage").addEventListener("click", () => {
  if (Crypt.salvage(run, focusedItem)) tone("loot");
  $("item-dialog").close();
  refreshUI();
  save();
});
$("restart").addEventListener("click", () => {
  if (!run.time || confirm("Начать новый забег? Текущий прогресс будет сброшен.")) restart();
});
$("new-run").addEventListener("click", restart);
for (const dialog of dialogs) {
  dialog.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => dialog.close()));
  dialog.addEventListener("cancel", (event) => {
    if (dialog.id === "relic-dialog" || dialog.id === "result-dialog") event.preventDefault();
  });
  dialog.addEventListener("close", () => {
    clearInput();
    started = false;
  });
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    clearInput();
    started = false;
    save();
  }
});
window.addEventListener("pagehide", save);
setInterval(save, 3000);

let last = performance.now();
let lastUI = 0;
function frame(now) {
  const dt = Math.min(.05, Math.max(0, (now - last) / 1000));
  last = now;
  const active = started && !document.hidden && !dialogs.some((dialog) => dialog.open);
  const input = playerInput();
  if (active) {
    Crypt.step(run, input, dt, fx);
    queued.clear();
  }
  if (run.choice && !$("relic-dialog").open) showChoice();
  if (run.result && !wasResult) {
    wasResult = true;
    showResult();
  }
  art.drawWorld(ctx, run, effects, now, active && Boolean(input.x || input.y));
  if (now - lastUI > 82) {
    lastUI = now;
    refreshUI();
  }
  requestAnimationFrame(frame);
}

load();
art.paintIcons();
refreshAudio();
refreshUI();
save();
requestAnimationFrame(frame);
