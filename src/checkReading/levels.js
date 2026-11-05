// Check my Reading: how strongly a word is highlighted. A word recited wrongly
// (or skipped) gets level 4, light red. Each later time it is recited right,
// it steps down: orange (3) → blue (2) → green (1) → no highlight (0).
// Levels are kept on the device per student, so a weak word stays marked
// across days until it has been recited right enough times.

export const LEVEL_COLOURS = { 4: "#FDE1E4", 3: "#FFEBD5", 2: "#E2EEFC", 1: "#E0F4E7" };
export const MISTAKE_LEVEL = 4;

const storeKey = (studentId) => `aqc_reading_levels:${studentId}`;

export function loadLevels(studentId) {
  try { return JSON.parse(localStorage.getItem(storeKey(studentId)) || "{}"); } catch { return {}; }
}

export function saveLevels(studentId, levels) {
  const kept = Object.fromEntries(Object.entries(levels).filter(([, l]) => l > 0));
  try { localStorage.setItem(storeKey(studentId), JSON.stringify(kept)); } catch { /* full or private */ }
}

// The levels to show during one recitation. base: the levels when it began;
// keys/status: the passage's words and how each went this time. A word only
// steps down once per recitation.
export function sessionLevels(base, keys, status) {
  const out = { ...base };
  keys.forEach((k, i) => {
    const st = status[i];
    if (st === "wrong" || st === "skipped") out[k] = MISTAKE_LEVEL;
    else if (st === "ok" && base[k] > 0) out[k] = base[k] - 1;
  });
  return out;
}

// Words to show in red letters for "Next word" / "Next ayah": from the first
// word not reached yet (and not already shown), one word, or to the end of
// its ayah. passage: words in order including ayah-number signs ({ key, end });
// pendingKeys: words not reached yet.
export function hintKeys(passage, pendingKeys, shown, whole) {
  const pending = new Set(pendingKeys);
  const start = passage.findIndex((w) => !w.end && pending.has(w.key) && !shown.has(w.key));
  if (start < 0) return [];
  if (!whole) return [passage[start].key];
  const out = [];
  for (let i = start; i < passage.length && !passage[i].end; i++) out.push(passage[i].key);
  return out;
}
