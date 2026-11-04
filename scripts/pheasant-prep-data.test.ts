import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's native TypeScript runner requires the explicit .ts extension.
import { CATEGORIES, DEFAULT_STATE, ITEMS, parseBackup } from "../app/PheasantHuntPrep/prep-data.ts";

type MutableBackup = {
  version?: unknown;
  members: Record<string, unknown>[];
  trip: Record<string, unknown>;
  custom: Record<string, unknown>[];
  checked: Record<string, unknown>;
};

const backup = (): MutableBackup => JSON.parse(JSON.stringify(DEFAULT_STATE));
const customItem = () => ({ id: "custom-camera", label: "Camera", detail: "Charge battery", category: "shared", owner: "dad", essential: false });

test("defaults round-trip cleanly and imports do not mutate shared defaults", () => {
  const parsed = parseBackup(JSON.stringify(DEFAULT_STATE));
  assert.deepEqual(parsed, DEFAULT_STATE);
  assert.equal(parsed.members.length, 6);
  assert.deepEqual(parsed.checked, {});
  parsed.members[0].name = "Changed";
  parsed.trip.destination = "Changed";
  assert.equal(DEFAULT_STATE.members[0].name, "Dad");
  assert.equal(DEFAULT_STATE.trip.destination, "");
});

test("built-in tasks have distinct IDs, valid owners/categories, and cover the entire crew", () => {
  const categories = new Set(CATEGORIES.map((category) => category.id));
  const owners = new Set(["shared", ...DEFAULT_STATE.members.map((member) => member.id)]);
  assert.ok(ITEMS.length >= 90 && ITEMS.length <= 110);
  assert.equal(new Set(ITEMS.map((item) => item.id)).size, ITEMS.length);
  for (const item of ITEMS) {
    assert.ok(item.label.trim());
    assert.ok(categories.has(item.category as (typeof CATEGORIES)[number]["id"]));
    assert.ok(owners.has(item.owner));
    assert.equal(typeof item.essential, "boolean");
  }
  for (const owner of owners) assert.ok(ITEMS.some((item) => item.owner === owner), owner);
  for (const category of categories) assert.ok(ITEMS.some((item) => item.category === category), category);
  assert.ok(ITEMS.some((item) => item.essential));
  assert.ok(ITEMS.some((item) => !item.essential));
});

test("custom items, crew edits, leap-day trip dates, and both checked values survive export/import", () => {
  const state = backup();
  state.members[0].name = "Trip lead";
  state.members[5].note = "Bring usual food";
  state.trip = { destination: "Test destination", start: "2028-02-29", end: "2028-03-01", lodging: "Cabin", emergency: "Home contact", vet: "Local clinic", notes: "First line\nSecond line" };
  state.custom = [customItem()];
  state.checked = { [ITEMS[0].id]: true, [ITEMS[1].id]: false, "custom-camera": true };
  assert.deepEqual(parseBackup(JSON.stringify(state)), state);
});

test("text is trimmed and reordered crew imports return the canonical roster order", () => {
  const state = backup();
  state.members.reverse();
  state.members[0].name = "  Scout  ";
  state.trip.destination = "  Test destination  ";
  state.custom = [{ ...customItem(), label: "  Camera  " }];
  const parsed = parseBackup(JSON.stringify(state));
  assert.deepEqual(parsed.members.map((member) => member.id), DEFAULT_STATE.members.map((member) => member.id));
  assert.equal(parsed.members[5].name, "Scout");
  assert.equal(parsed.trip.destination, "Test destination");
  assert.equal(parsed.custom[0].label, "Camera");
});

test("maximum-length editable content and 250 custom tasks remain importable", () => {
  const state = backup();
  for (const member of state.members) { member.name = "n".repeat(60); member.note = "n".repeat(1_000); }
  state.trip.destination = "d".repeat(160);
  for (const field of ["lodging", "emergency", "vet"]) state.trip[field] = "c".repeat(300);
  state.trip.notes = "n".repeat(4_000);
  state.custom = Array.from({ length: 250 }, (_, index) => ({ ...customItem(), id: `custom-${index}`, label: "l".repeat(140), detail: "d".repeat(500) }));
  for (const item of state.custom) state.checked[String(item.id)] = true;
  assert.equal(parseBackup(JSON.stringify(state)).custom.length, 250);
});

const invalidStates: [string, (state: MutableBackup) => void, RegExp][] = [
  ["missing version", (s) => { delete s.version; }, /version/i],
  ["unsupported version", (s) => { s.version = 2; }, /version/i],
  ["string version", (s) => { s.version = "1"; }, /version/i],
  ["missing crew member", (s) => { s.members.pop(); }, /three hunters and three dogs/i],
  ["duplicate crew ID", (s) => { s.members[1] = { ...s.members[0] }; }, /duplicate/i],
  ["unknown crew ID", (s) => { s.members[0].id = "stranger"; }, /unknown member/i],
  ["wrong member kind", (s) => { s.members[0].kind = "dog"; }, /kind/i],
  ["wrong member role", (s) => { s.members[0].role = "Bird dog"; }, /role/i],
  ["blank member name", (s) => { s.members[0].name = "  "; }, /cannot be empty/i],
  ["overlong member name", (s) => { s.members[0].name = "n".repeat(61); }, /60 characters/i],
  ["non-text trip field", (s) => { s.trip.destination = 123; }, /must be text/i],
  ["overlong trip notes", (s) => { s.trip.notes = "n".repeat(4_001); }, /4,000 characters/i],
  ["duplicate custom ID", (s) => { s.custom = [customItem(), customItem()]; }, /duplicates/i],
  ["built-in item collision", (s) => { s.custom = [{ ...customItem(), id: ITEMS[0].id }]; }, /duplicates/i],
  ["reserved custom ID", (s) => { s.custom = [{ ...customItem(), id: "constructor" }]; }, /reserved/i],
  ["invalid custom ID", (s) => { s.custom = [{ ...customItem(), id: "custom item" }]; }, /letters, numbers/i],
  ["unknown custom owner", (s) => { s.custom = [{ ...customItem(), owner: "dog4" }]; }, /unknown crew/i],
  ["unknown category", (s) => { s.custom = [{ ...customItem(), category: "weapons" }]; }, /unknown category/i],
  ["nonboolean essential flag", (s) => { s.custom = [{ ...customItem(), essential: "true" }]; }, /true or false/i],
  ["empty custom label", (s) => { s.custom = [{ ...customItem(), label: "" }]; }, /cannot be empty/i],
  ["overlong custom detail", (s) => { s.custom = [{ ...customItem(), detail: "d".repeat(501) }]; }, /500 characters/i],
  ["too many custom items", (s) => { s.custom = Array.from({ length: 251 }, (_, i) => ({ ...customItem(), id: `custom-${i}` })); }, /250 custom/i],
  ["unknown checked ID", (s) => { s.checked = { missing: true }; }, /unknown item/i],
  ["nonboolean checked value", (s) => { s.checked = { [ITEMS[0].id]: 1 }; }, /true or false/i],
  ["malformed date", (s) => { s.trip.start = "11/03/2026"; }, /YYYY-MM-DD/i],
  ["non-leap February 29", (s) => { s.trip.start = "2026-02-29"; }, /real calendar date/i],
  ["overflowing day", (s) => { s.trip.start = "2026-04-31"; }, /real calendar date/i],
  ["invalid month", (s) => { s.trip.start = "2026-13-01"; }, /real calendar date/i],
  ["year zero", (s) => { s.trip.start = "0000-01-01"; }, /real calendar date/i],
  ["end without start", (s) => { s.trip.end = "2026-11-04"; }, /start date before/i],
  ["end before start", (s) => { s.trip.start = "2026-11-04"; s.trip.end = "2026-11-03"; }, /before the start/i],
];

for (const [label, mutate, expected] of invalidStates) {
  test(`rejects ${label}`, () => {
    const state = backup();
    mutate(state);
    assert.throws(() => parseBackup(JSON.stringify(state)), expected);
  });
}

for (const [label, raw, expected] of [
  ["empty file", "   ", /nonempty/i],
  ["malformed JSON", "{", /valid JSON/i],
  ["null root", "null", /must be an object/i],
  ["array root", "[]", /must be an object/i],
  ["oversize file", " ".repeat(1_000_001) + "{}", /too large/i],
  ["array progress", JSON.stringify({ ...backup(), checked: [] }), /must be an object/i],
  ["non-list custom items", JSON.stringify({ ...backup(), custom: {} }), /must be a list/i],
] as const) {
  test(`rejects ${label}`, () => assert.throws(() => parseBackup(raw), expected));
}
