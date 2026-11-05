// Check my Reading test: runs Tarteel's Quran speech model (Whisper base or
// tiny, fine-tuned on Quran recitation, Apache-2.0) in a Web Worker so the
// page stays smooth. Audio never leaves the phone.
//
// Messages in:  { type: "load", model: "base" | "tiny" }
//               { type: "transcribe", id, audio: Float32Array (16 kHz mono) }
// Messages out: { type: "progress", loaded, total } while downloading
//               { type: "ready", backend, ms }
//               { type: "result", id, text, ms }
//               { type: "error", message }

// Loaded from the jsDelivr CDN when the test opens, not bundled: its speech
// engine (WebAssembly) is ~27 MB, bigger than Cloudflare hosts in one file.
const TRANSFORMERS = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2/dist/transformers.min.js";
let lib = null;
async function transformers() {
  if (!lib) {
    lib = await import(/* @vite-ignore */ TRANSFORMERS);
    lib.env.allowLocalModels = false;
  }
  return lib;
}

const MODELS = {
  base: "iqbalaesthetic/Basira", // tarteel-ai/whisper-base-ar-quran as ONNX (fp16 / q4 / int8)
  tiny: "aaqibhabib/whisper-tiny-ar-quran-onnx", // tarteel-ai/whisper-tiny-ar-quran as ONNX (fp16 / int8)
};

let asr = null;
const OPTIONS = { language: "arabic", task: "transcribe" };

// Ways to run it, fastest first: WebGPU (the graphics chip) when there is
// one, then WebAssembly on the processor. Some files of these exports don't
// load everywhere (the fp16 decoder has a type error), so each is tried in
// turn and the first that works is kept.
async function backends(model) {
  const cpu = { device: "wasm", dtype: "q8", label: "WebAssembly · int8" };
  if (model === "tiny") return [cpu]; // small enough for the processor
  let gpu = false;
  try { gpu = !!(await navigator.gpu?.requestAdapter()); } catch { /* no WebGPU */ }
  return [
    ...(gpu ? [{ device: "webgpu", dtype: "q4", label: "WebGPU · q4" }] : []),
    cpu,
  ];
}

self.onmessage = async (e) => {
  const msg = e.data;
  try {
    if (msg.type === "load") {
      const t0 = performance.now();
      const { pipeline } = await transformers();
      const files = new Map(); // file → [loaded, total], for one progress figure
      const progress_callback = (p) => {
        if (p.status === "progress" && p.total) {
          files.set(p.file, [p.loaded, p.total]);
          let loaded = 0, total = 0;
          for (const [l, t] of files.values()) { loaded += l; total += t; }
          self.postMessage({ type: "progress", loaded, total });
        }
      };
      let label = "", lastError = null;
      for (const b of await backends(msg.model)) {
        try {
          asr = await pipeline("automatic-speech-recognition", MODELS[msg.model], { device: b.device, dtype: b.dtype, progress_callback });
          // These exports ship without Whisper's language/task table; add Arabic
          // and "transcribe" (ids from the model's own vocabulary).
          const ids = asr.tokenizer?.model?.tokens_to_ids;
          const id = (t, fallback) => ids?.get?.(t) ?? fallback;
          const gc = asr.model.generation_config;
          gc.is_multilingual = true;
          gc.lang_to_id = { "<|ar|>": id("<|ar|>", 50272) };
          gc.task_to_id = { transcribe: id("<|transcribe|>", 50359), translate: id("<|translate|>", 50358) };
          gc.no_timestamps_token_id ??= id("<|notimestamps|>", 50363);
          // A first short run checks it works here and warms it up.
          await asr(new Float32Array(16000), OPTIONS);
          label = b.label;
          break;
        } catch (err) {
          lastError = err;
          try { await asr?.dispose?.(); } catch { /* ignore */ }
          asr = null;
        }
      }
      if (!asr) throw lastError;
      self.postMessage({ type: "ready", backend: label, ms: Math.round(performance.now() - t0) });
    } else if (msg.type === "transcribe") {
      if (!asr) throw new Error("The model isn't loaded yet.");
      const t0 = performance.now();
      const out = await asr(msg.audio, { ...OPTIONS, chunk_length_s: 30 });
      self.postMessage({ type: "result", id: msg.id, text: out.text || "", ms: Math.round(performance.now() - t0) });
    }
  } catch (err) {
    self.postMessage({ type: "error", message: err?.message || String(err) });
  }
};
