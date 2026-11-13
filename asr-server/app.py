"""Check my Reading listener: Quran recitation (WAV) → Arabic text, with
NVIDIA's Arabic FastConformer (CTC, ONNX Runtime on the CPU).

GET  /            → {"ready": bool, "error": str | null}
POST /transcribe  → body: WAV (16 kHz mono 16-bit; other rates are resampled)
                    reply: {"text": "...", "ms": int}

Only the app's signed-in users may transcribe: the app's Worker passes on the
student's own sign-in (Authorization: Bearer …), which is checked with the
app's Supabase, as the Worker itself does. So no secret is kept here.
"""

import io
import json
import os
import threading
import time
import urllib.request
import wave
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import numpy as np
import onnxruntime as ort
import yaml

from features import Featurizer

MODEL_DIR = os.environ.get("MODEL_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "model"))
MODEL_FILE = os.environ.get("MODEL_FILE", "model.onnx")
PORT = int(os.environ.get("PORT", "7860"))
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")  # unset: no sign-in check (local testing)
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
MAX_SECONDS = 40

state = {"session": None, "feat": None, "tokens": None, "blank": None, "error": None}


signed_in_until = {}  # sign-in token → time it was last confirmed + 5 minutes
signed_in_lock = threading.Lock()


def is_signed_in(header):
    if not SUPABASE_URL:
        return True
    token = (header or "").replace("Bearer ", "", 1).strip()
    if not token:
        return False
    now = time.time()
    with signed_in_lock:
        if signed_in_until.get(token, 0) > now:
            return True
    req = urllib.request.Request(f"{SUPABASE_URL}/auth/v1/user", headers={"apikey": SUPABASE_ANON_KEY, "Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req, timeout=5) as res:
            ok = res.status == 200
    except Exception:  # noqa: BLE001 — 401 or unreachable
        ok = False
    if ok:
        with signed_in_lock:
            if len(signed_in_until) > 2000:
                signed_in_until.clear()
            signed_in_until[token] = now + 300
    return ok


def read_tokens(path):
    # tokens.txt: one "piece id" per line.
    tokens = {}
    with open(path, encoding="utf-8") as f:
        for i, line in enumerate(f):
            line = line.rstrip("\n")
            if not line:
                continue
            parts = line.rsplit(" ", 1)
            if len(parts) == 2 and parts[1].isdigit():
                tokens[int(parts[1])] = parts[0]
            else:
                tokens[i] = line
    return tokens


def load():
    t0 = time.time()
    try:
        with open(os.path.join(MODEL_DIR, "preprocessor.yaml"), encoding="utf-8") as f:
            state["feat"] = Featurizer(yaml.safe_load(f))
        state["tokens"] = read_tokens(os.path.join(MODEL_DIR, "tokens.txt"))
        state["blank"] = max(state["tokens"])  # the last class
        opts = ort.SessionOptions()
        opts.intra_op_num_threads = max(1, os.cpu_count() or 1)
        opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        session = ort.InferenceSession(os.path.join(MODEL_DIR, MODEL_FILE), opts, providers=["CPUExecutionProvider"])
        # A first run checks it works here and warms it up; only then is it ready.
        transcribe(np.zeros(16000, dtype=np.float32), session)
        state["session"] = session
        print(f"Model ready: {MODEL_FILE} in {time.time() - t0:.1f}s", flush=True)
    except Exception as e:  # noqa: BLE001 — shown on GET /
        state["error"] = str(e)
        print("Loading failed:", e, flush=True)


def read_wav(data):
    with wave.open(io.BytesIO(data)) as w:
        rate, width, ch = w.getframerate(), w.getsampwidth(), w.getnchannels()
        raw = w.readframes(w.getnframes())
    if width != 2:
        raise ValueError("16-bit WAV only")
    x = np.frombuffer(raw, dtype="<i2").astype(np.float32) / 32768.0
    if ch > 1:
        x = x.reshape(-1, ch).mean(axis=1)
    if rate != 16000:
        n = int(len(x) * 16000 / rate)
        x = np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x).astype(np.float32)
    return x


def transcribe(audio, session=None):
    session = session or state["session"]
    feats, n = state["feat"](audio)
    names = [i.name for i in session.get_inputs()]
    feed = {names[0]: feats[None, ...]}
    if len(names) > 1:
        feed[names[1]] = np.array([n], dtype=np.int64)
    out = session.run([session.get_outputs()[0].name], feed)[0][0]
    ids = out.argmax(-1)
    blank, tokens = state["blank"], state["tokens"]
    pieces, prev = [], None
    for i in ids.tolist():
        if i != prev and i != blank:
            pieces.append(tokens.get(i, ""))
        prev = i
    return "".join(pieces).replace("▁", " ").strip()


class Handler(BaseHTTPRequestHandler):
    def reply(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        self.reply(200, {"ready": state["session"] is not None, "error": state["error"]})

    def do_POST(self):
        if self.path.rstrip("/") != "/transcribe":
            return self.reply(404, {"error": "not found"})
        if not is_signed_in(self.headers.get("Authorization")):
            return self.reply(401, {"error": "not signed in"})
        if state["session"] is None:
            return self.reply(503, {"error": state["error"] or "loading"})
        size = int(self.headers.get("Content-Length") or 0)
        if size <= 44 or size > 44 + MAX_SECONDS * 32000:
            return self.reply(400, {"error": "a WAV of up to 40 s"})
        try:
            audio = read_wav(self.rfile.read(size))
        except Exception as e:  # noqa: BLE001
            return self.reply(400, {"error": f"bad WAV: {e}"})
        t0 = time.time()
        try:
            text = transcribe(audio) if len(audio) >= 1600 else ""
        except Exception as e:  # noqa: BLE001
            print("Transcribing failed:", e, flush=True)
            return self.reply(500, {"error": "couldn't transcribe"})
        self.reply(200, {"text": text, "ms": int((time.time() - t0) * 1000)})

    def log_message(self, *args):  # no audio details in the logs
        pass


if __name__ == "__main__":
    threading.Thread(target=load, daemon=True).start()
    print(f"Listening on :{PORT}", flush=True)
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
