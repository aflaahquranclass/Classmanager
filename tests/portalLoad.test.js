import { test } from "node:test";
import assert from "node:assert/strict";
import { together } from "../src/thilawa/repos.js";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// A read that takes 20 ms and counts how often it really runs.
function slowRead() {
  let calls = 0;
  const read = async () => { calls += 1; await wait(20); return { rows: [calls] }; };
  return { read, calls: () => calls };
}

test("together: two screens reloading at once make one request", async () => {
  const s = slowRead();
  const read = together(s.read);
  const [a, b] = await Promise.all([read(), read()]);
  assert.equal(s.calls(), 1);
  assert.deepEqual(a, b);
  // Each screen gets its own copy, so one can't change the other's.
  assert.notEqual(a, b);
});

test("together: a read after the last one finished asks again", async () => {
  const s = slowRead();
  const read = together(s.read);
  await read();
  const again = await read();
  assert.equal(s.calls(), 2);
  assert.deepEqual(again, { rows: [2] });
});

test("together: a read started well after the one on its way asks again", async () => {
  let calls = 0;
  const read = together(async () => { const n = ++calls; await wait(400); return n; });
  const first = read();
  await wait(200); // past the 150 ms window: may have been asked for after a change was saved
  const second = await read();
  assert.equal(await first, 1);
  assert.equal(second, 2);
});

test("together: a failed read is not reused", async () => {
  let calls = 0;
  const read = together(async () => { calls += 1; if (calls === 1) throw new Error("offline"); return "ok"; });
  await assert.rejects(read(), /offline/);
  assert.equal(await read(), "ok");
});

// ---------- page scrolling behind full-screen layers ----------
import { lockScroll, scrollLocks } from "../src/scrollLock.js";

test("lockScroll: two layers open together, the page scrolls again when both close", () => {
  globalThis.document = { body: { style: { overflow: "" } } };
  const listen = lockScroll(); // Listen & mark
  const mushaf = lockScroll(); // the full-screen Mushaf on top
  assert.equal(document.body.style.overflow, "hidden");
  listen(); // closed in either order
  assert.equal(document.body.style.overflow, "hidden");
  mushaf();
  assert.equal(document.body.style.overflow, "");
  mushaf(); // releasing twice changes nothing
  assert.equal(scrollLocks(), 0);
  delete globalThis.document;
});

test("lockScroll: the page's own setting comes back", () => {
  globalThis.document = { body: { style: { overflow: "auto" } } };
  const unlock = lockScroll();
  unlock();
  assert.equal(document.body.style.overflow, "auto");
  delete globalThis.document;
});
