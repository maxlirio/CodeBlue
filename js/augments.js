import { state, ui } from "./state.js";
import { distance, setMessage, inBounds, enemyAt } from "./utils.js";
import {
  spawnBurst, spawnBeam, applyStatus, addFloorEffect, doScreenShake
} from "./fx.js";
import { damageEnemy, clearDeadEnemies } from "./combat.js";
import { SPELL_BY_ID, rankOf } from "./spells/index.js";
import { SCHOOL_COLORS } from "./config.js";

// Sigils (spell augments). Each is a generic post-effect (or pre-effect) hook
// driven by data, so we don't have to edit individual spell files.

export const SPELL_AUGMENTS = [
  {
    id: "shatter",
    name: "Shatter Sigil",
    desc: "+30% damage splash to enemies adjacent to the target.",
    color: "#fca5ff",
    apply(spell, ctx) {
      let hit = 0;
      const splash = Math.max(1, Math.floor((ctx.baseDmg || 0) * 0.30));
      for (const e of state.enemies) {
        if (e.x === ctx.tx && e.y === ctx.ty) continue;
        if (Math.abs(e.x - ctx.tx) <= 1 && Math.abs(e.y - ctx.ty) <= 1) {
          damageEnemy(e, splash, spell.school);
          spawnBurst(e.x, e.y, "#fca5ff", 6);
          hit++;
        }
      }
      if (hit) clearDeadEnemies();
    }
  },
  {
    id: "siphon",
    name: "Siphon Sigil",
    desc: "Heal for 25% of damage dealt by the spell.",
    color: "#84f6a6",
    apply(spell, ctx) {
      const dealt = state.castingDamage || 0;
      if (dealt <= 0) return;
      const heal = Math.max(1, Math.floor(dealt * 0.25));
      const before = state.player.hp;
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + heal);
      const gained = state.player.hp - before;
      if (gained > 0) spawnBurst(state.player.x, state.player.y, "#84f6a6", 8);
    }
  },
  {
    id: "echo",
    name: "Echo Sigil",
    desc: "Spell repeats once at 35% power.",
    color: "#c79bff",
    repeat: true
  },
  {
    id: "cinder",
    name: "Cinder Sigil",
    desc: "Ignite a 1-tile radius around the target with burning ground.",
    color: "#ff7a3a",
    apply(spell, ctx) {
      const pow = 2 + Math.floor((ctx.pow || 0) / 2);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const x = ctx.tx + dx;
          const y = ctx.ty + dy;
          if (!inBounds(x, y) || state.map[y][x] === 1) continue;
          addFloorEffect(x, y, "burn", 4, pow);
          const e = enemyAt(x, y);
          if (e) applyStatus(e, "burn", 4, pow);
        }
      }
    }
  },
  {
    id: "concuss",
    name: "Concuss Sigil",
    desc: "Stun enemies in a 1-tile radius around the target for 1 turn.",
    color: "#ffffff",
    apply(spell, ctx) {
      let hit = 0;
      for (const e of state.enemies) {
        if (Math.abs(e.x - ctx.tx) <= 1 && Math.abs(e.y - ctx.ty) <= 1) {
          applyStatus(e, "stun", 1, 1);
          spawnBurst(e.x, e.y, "#ffffff", 4);
          hit++;
        }
      }
      if (hit) doScreenShake(2);
    }
  },
  {
    id: "phase",
    name: "Phase Sigil",
    desc: "Line spells (Arc Bolt) pass through walls.",
    color: "#7dd3ff"
    // consumed via state.castingPiercing flag set at cast start
  }
];

export const AUGMENT_BY_ID = Object.fromEntries(SPELL_AUGMENTS.map((a) => [a.id, a]));

export function augmentsFor(spellId) {
  return (state.player.spellAugments && state.player.spellAugments[spellId]) || [];
}

export function spellHasAugment(spellId, augId) {
  return augmentsFor(spellId).includes(augId);
}

function eligibleSpellsForScroll() {
  const ids = [...state.player.knownSpells];
  return ids
    .map((id) => SPELL_BY_ID[id])
    .filter(Boolean);
}

export function makeMagicScroll(forced = null) {
  const aug = forced ? AUGMENT_BY_ID[forced] : SPELL_AUGMENTS[Math.floor(Math.random() * SPELL_AUGMENTS.length)];
  return {
    name: `Scroll: ${aug.name}`,
    desc: `${aug.desc} Use to bind to a spell.`,
    augmentId: aug.id,
    consumeOnUse: false,
    use(index) {
      state.pendingScrollIdx = index;
      openScrollApply(aug);
    }
  };
}

function openScrollApply(aug) {
  ui.applyTitle.textContent = "BIND SIGIL";
  ui.applyMessage.innerHTML = `<span style="color:${aug.color}">${aug.name}</span> — ${aug.desc}`;
  ui.applyChoices.innerHTML = "";
  const spells = eligibleSpellsForScroll();
  if (!spells.length) {
    setMessage("No spells to bind the sigil to.");
    return;
  }
  for (const sp of spells) {
    const btn = document.createElement("button");
    btn.className = "choice";
    const existing = augmentsFor(sp.id).map((id) => AUGMENT_BY_ID[id]?.name || id).join(", ");
    const r = rankOf(sp.id);
    btn.innerHTML = `<strong style="color:${SCHOOL_COLORS[sp.school]}">${sp.name} R${r}</strong>` +
      `<span>${sp.desc}</span>` +
      (existing ? `<span style="color:${aug.color}">Already bound: ${existing}</span>` : "");
    if (spellHasAugment(sp.id, aug.id)) {
      btn.disabled = true;
      btn.style.opacity = 0.5;
      btn.innerHTML += `<span style="color:#888">(already has ${aug.name})</span>`;
    }
    btn.addEventListener("click", () => {
      if (spellHasAugment(sp.id, aug.id)) return;
      if (!state.player.spellAugments) state.player.spellAugments = {};
      // One sigil per spell — binding a new one replaces the previous.
      const prev = state.player.spellAugments[sp.id];
      state.player.spellAugments[sp.id] = [aug.id];
      const replaced = prev && prev.length ? ` (replaced ${prev.join(", ")})` : "";
      setMessage(`${aug.name} bound to ${sp.name}.${replaced}`);
      if (typeof state.pendingScrollIdx === "number") {
        state.player.inventory.splice(state.pendingScrollIdx, 1);
        state.pendingScrollIdx = null;
      }
      closeScrollApply();
    });
    ui.applyChoices.appendChild(btn);
  }
  ui.applyCancel.onclick = () => {
    setMessage("Sigil unused — kept in inventory.");
    closeScrollApply();
  };
  ui.applyOverlay.classList.remove("hidden");
  state.applyOpen = true;
}

export function closeScrollApply() {
  ui.applyOverlay.classList.add("hidden");
  state.applyOpen = false;
}

export function initApplyOverlay() {
  // No-op — each opener now sets its own cancel handler via onclick.
}
