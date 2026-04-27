// Single source of truth for every message that travels over the data
// channel. Importers refer to these constants instead of string literals,
// so a typo is caught at import-time rather than as a silently-dropped
// inbound message.

export const M = Object.freeze({
  // ---- handshake / presence ----
  HELLO:        "hello",       // { name, className }
  SEED:         "seed",        // host -> guest: { seed, mode }
  READY:        "ready",       // both ways: local player picked class
  POS:          "pos",         // { x, y, floor, hp, maxHp }
  FLOOR:        "floor",       // { floor }
  CHAT:         "chat",        // { text }
  PING:         "ping",        // { t }
  PONG:         "pong",        // { t }

  // ---- world state, host -> guest ----
  ENEMIES:        "enemies",        // full snapshot for a floor
  ENEMY_DELTA:    "enemy_delta",    // partial update for one enemy
  ENEMY_REMOVE:   "enemy_remove",   // enemy gone
  FLOOR_EFFECTS:  "floor_effects",  // full list per tick
  SNAPSHOT_REQ:   "snapshot_req",   // guest -> host: please re-send the world

  // ---- guest -> host mutation forwards ----
  REMOTE_DAMAGE:        "remote_damage",
  REMOTE_APPLY_STATUS:  "remote_apply_status",
  REMOTE_REMOVE_STATUS: "remote_remove_status",

  // ---- player damage / support / pvp ----
  PLAYER_HIT:       "playerHit",       // host -> guest, enemy hit a player
  PARTNER_SUPPORT:  "partner_support", // either side: heal / buff partner
  PVP_HIT:          "pvp_hit",         // either side in PvP
  PVP_KILL:         "pvp_kill",        // banner

  // ---- visual fx ----
  FX_BURST: "fx_burst",
  FX_BEAM:  "fx_beam",
  FX_SHAKE: "fx_shake",

  // ---- gifting / shop / quests ----
  GIFT_ITEM:     "gift_item",
  SHOP_VISIT:    "shop_visit",
  QUEST_KILL:    "quest_kill",
  QUEST_PICKUP:  "quest_pickup",
  QUEST_DESCEND: "quest_descend"
});

// Flat array of every known type, useful for validation / debugging.
export const ALL_MESSAGE_TYPES = Object.values(M);
const TYPE_SET = new Set(ALL_MESSAGE_TYPES);
export function isKnownType(t) { return TYPE_SET.has(t); }
