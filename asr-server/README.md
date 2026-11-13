---
title: Aflaah Quran Listener
emoji: 📖
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# Aflaah Quran Class — Check my Reading listener

Turns a few seconds of Quran recitation into Arabic text (with harakat) for
the student portal's Check my Reading.

**Model:** [NVIDIA FastConformer-Hybrid Large (ar), `stt_ar_fastconformer_hybrid_large_pcd_v1.0`](https://huggingface.co/nvidia/stt_ar_fastconformer_hybrid_large_pcd_v1.0)
by NVIDIA, licensed [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/).
Changes: its CTC half exported to ONNX (`export.py`).

The app's Cloudflare Worker (`worker/recitation.js`) checks the student's
sign-in and sends the audio here. Nothing is stored.

- `GET /` → `{ "ready": true }` once the model is loaded
- `POST /transcribe` — body: a WAV file (16 kHz mono, 16-bit) → `{ "text", "ms" }`
  (with header `X-Listener-Token` when the `LISTENER_TOKEN` secret is set)

## Setting up the Space

1. Create a Space with the **Docker** SDK and upload this folder's files
   (`Dockerfile`, `README.md`, `app.py`, `features.py`, `export.py`, `requirements.txt`).
   The first build converts the model and takes a while.
2. In the Space's Settings → Secrets, add `LISTENER_TOKEN`: any long random
   text. Give the Worker the same text (`npx wrangler secret put LISTENER_TOKEN`),
   so only the app can use the Space.
3. Put the Space's address (e.g. `https://<user>-aflaah-quran-listener.hf.space`)
   in `QURAN_ASR_URL` in `wrangler.jsonc` and deploy the Worker.

Run it locally: `python export.py` (needs NeMo), then
`pip install -r requirements.txt && python app.py`.
