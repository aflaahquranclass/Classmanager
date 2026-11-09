// A whiteboard the teacher pops up while presenting the Mushaf, to draw and
// show the class: a blank board, or drawing straight over the page (the
// Mushaf shows through). Pens in a few colours, thin or thick, an eraser,
// undo and clear. Nothing is saved: closing it wipes the board.
//
// It is its own layer on the page body (above full screen too), so nothing
// around the Mushaf can clip it or catch the strokes.

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Eraser, Undo2, Trash2, Pen } from "lucide-react";

const COLORS = [
  { id: "black", value: "#1A1F36", label: "Black" },
  { id: "blue", value: "#176FD1", label: "Blue" },
  { id: "red", value: "#D0312D", label: "Red" },
  { id: "green", value: "#1E8A5A", label: "Green" },
  { id: "orange", value: "#E8650A", label: "Orange" },
];
const SIZES = { thin: 3, thick: 8 };
const ERASER = 28;

const CSS = `
  .wb { position: fixed; inset: 0; z-index: 4000; display: flex; flex-direction: column; font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #123B67; }
  .wb-blank { background: #FFFFFF; }
  .wb-over { background: rgba(255,255,255,0.02); }
  .wb-bar { flex-shrink: 0; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 8px 10px; padding-top: max(8px, env(safe-area-inset-top));
    background: #FFFFFF; border-bottom: 1px solid #DCEBF8; box-shadow: 0 4px 14px rgba(18,59,103,0.1); }
  .wb-seg { display: flex; padding: 3px; border-radius: 11px; background: #EEF3F8; }
  .wb-seg button { min-height: 36px; padding: 0 12px; border: none; border-radius: 9px; background: transparent; color: #4A6480; font: 700 13px Inter, system-ui, sans-serif; cursor: pointer; }
  .wb-seg button[aria-pressed="true"] { background: #FFFFFF; color: #123B67; box-shadow: 0 1px 4px rgba(18,59,103,0.14); }
  .wb-colors { display: flex; gap: 6px; align-items: center; }
  .wb-color { width: 30px; height: 30px; border-radius: 50%; border: 2px solid #FFFFFF; box-shadow: 0 0 0 1px #C7DDF4; cursor: pointer; padding: 0; }
  .wb-color[aria-pressed="true"] { box-shadow: 0 0 0 2px #123B67; }
  .wb-ib { width: 40px; height: 40px; border-radius: 10px; border: 1px solid #C7DDF4; background: #FFFFFF; color: #123B67; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; }
  .wb-ib[aria-pressed="true"] { background: #123B67; border-color: #123B67; color: #FFFFFF; }
  .wb-ib:focus-visible, .wb-color:focus-visible, .wb-seg button:focus-visible, .wb-close:focus-visible { outline: 2px solid #176FD1; outline-offset: 2px; }
  .wb-gap { flex: 1; }
  .wb-close { min-height: 40px; padding: 0 14px; border-radius: 10px; border: none; background: linear-gradient(90deg, #176FD1, #0A94B1); color: #FFFFFF; font: 700 14px Inter, system-ui, sans-serif;
    display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
  .wb-area { position: relative; flex: 1; min-height: 0; }
  .wb-area canvas { position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none; cursor: crosshair; }
  .wb-hint { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); padding: 8px 14px; border-radius: 999px; background: rgba(18,59,103,0.75); color: #FFFFFF; font-size: 14px; pointer-events: none; white-space: nowrap; }
  @media (max-width: 640px) {
    .wb-bar { gap: 6px; padding: 6px 8px; padding-top: max(6px, env(safe-area-inset-top)); }
    .wb-seg button { padding: 0 9px; font-size: 12px; }
    .wb-color { width: 26px; height: 26px; }
    .wb-ib { width: 36px; height: 36px; }
    .wb-close span { display: none; }
  }
`;

export default function Whiteboard({ onClose }) {
  const canvas = useRef(null);
  const strokes = useRef([]); // [{ color, size, erase, points: [[x, y], …] }] in screen pixels
  const drawing = useRef(null);
  const [mode, setMode] = useState("blank"); // "blank" | "over" (draw over the page)
  const [color, setColor] = useState(COLORS[2].value);
  const [size, setSize] = useState("thin");
  const [erase, setErase] = useState(false);
  const [count, setCount] = useState(0); // strokes on the board (for the hint and the buttons)

  const paint = useCallback(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    const ratio = window.devicePixelRatio || 1;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, el.width, el.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const s of strokes.current) {
      ctx.globalCompositeOperation = s.erase ? "destination-out" : "source-over";
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.erase ? ERASER : s.size;
      ctx.beginPath();
      s.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      if (s.points.length === 1) ctx.lineTo(s.points[0][0] + 0.01, s.points[0][1]);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
  }, []);

  // The canvas matches its box in device pixels, so lines stay sharp; redrawn on resize.
  useLayoutEffect(() => {
    const el = canvas.current;
    const fit = () => {
      const r = el.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      el.width = Math.max(1, Math.round(r.width * ratio));
      el.height = Math.max(1, Math.round(r.height * ratio));
      paint();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [paint]);

  useEffect(() => {
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Caught first, so Esc closes the board and not the screen behind it.
    const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", onKey, true);
    return () => { document.body.style.overflow = before; window.removeEventListener("keydown", onKey, true); };
  }, [onClose]);

  const at = (e) => { const r = canvas.current.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const down = (e) => {
    e.preventDefault();
    canvas.current.setPointerCapture?.(e.pointerId);
    drawing.current = { color, size: SIZES[size], erase, points: [at(e)] };
    strokes.current.push(drawing.current);
    setCount(strokes.current.length);
    paint();
  };
  const move = (e) => {
    if (!drawing.current) return;
    // Every point the device saw since the last event, for smooth lines.
    const events = e.getCoalescedEvents?.() || [e];
    for (const ev of events) drawing.current.points.push(at(ev));
    paint();
  };
  const up = () => { drawing.current = null; };
  const undo = () => { strokes.current.pop(); setCount(strokes.current.length); paint(); };
  const clear = () => { strokes.current = []; setCount(0); paint(); };
  const pickColor = (c) => { setColor(c); setErase(false); };

  return createPortal(
    <div className={`wb ${mode === "blank" ? "wb-blank" : "wb-over"}`} role="dialog" aria-modal="true" aria-label="Whiteboard">
      <style>{CSS}</style>
      <div className="wb-bar">
        <div className="wb-seg" role="group" aria-label="Board">
          <button type="button" aria-pressed={mode === "blank"} onClick={() => setMode("blank")}>Blank board</button>
          <button type="button" aria-pressed={mode === "over"} onClick={() => setMode("over")}>Over the page</button>
        </div>
        <div className="wb-colors" role="group" aria-label="Pen colour">
          {COLORS.map((c) => (
            <button key={c.id} type="button" className="wb-color" style={{ background: c.value }} aria-label={c.label} title={c.label}
              aria-pressed={!erase && color === c.value} onClick={() => pickColor(c.value)} />
          ))}
        </div>
        <button type="button" className="wb-ib" aria-pressed={size === "thick" && !erase} onClick={() => { setSize((s) => (s === "thin" ? "thick" : "thin")); setErase(false); }}
          aria-label={size === "thin" ? "Thick pen" : "Thin pen"} title={size === "thin" ? "Thick pen" : "Thin pen"}>
          <Pen size={size === "thick" ? 20 : 16} strokeWidth={size === "thick" ? 2.8 : 2} aria-hidden="true" />
        </button>
        <button type="button" className="wb-ib" aria-pressed={erase} onClick={() => setErase((x) => !x)} aria-label="Eraser" title="Eraser"><Eraser size={18} aria-hidden="true" /></button>
        <button type="button" className="wb-ib" onClick={undo} aria-label="Undo" title="Undo"><Undo2 size={18} aria-hidden="true" /></button>
        <button type="button" className="wb-ib" onClick={clear} aria-label="Clear the board" title="Clear"><Trash2 size={18} aria-hidden="true" /></button>
        <span className="wb-gap" />
        <button type="button" className="wb-close" onClick={onClose} aria-label="Close the whiteboard"><X size={18} aria-hidden="true" /><span>Close</span></button>
      </div>
      <div className="wb-area">
        <canvas ref={canvas} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up} aria-label="Drawing area" />
        {count === 0 && <span className="wb-hint">{mode === "blank" ? "Draw with your finger or the mouse" : "Draw over the page"}</span>}
      </div>
    </div>,
    document.body,
  );
}
