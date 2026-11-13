"""Turns NVIDIA's Arabic FastConformer (.nemo, CC-BY-4.0) into what app.py
runs: model/model.onnx (the CTC half of the hybrid model), model/tokens.txt
and model/preprocessor.yaml. (An 8-bit copy was tried: no quicker on the CPU,
and more words misheard in phone-quality audio, so it isn't made.) Run while the Space is built (see Dockerfile).

python export.py [path/to/model.nemo] [out_dir]
"""

import os
import sys

import yaml
from huggingface_hub import hf_hub_download

REPO = "nvidia/stt_ar_fastconformer_hybrid_large_pcd_v1.0"

src = sys.argv[1] if len(sys.argv) > 1 else hf_hub_download(REPO, "stt_ar_fastconformer_hybrid_large_pcd_v1.0.nemo")
out = sys.argv[2] if len(sys.argv) > 2 else "model"
os.makedirs(out, exist_ok=True)

import nemo.collections.asr as nemo_asr  # noqa: E402 — slow import, after the download
from omegaconf import OmegaConf  # noqa: E402

model = nemo_asr.models.ASRModel.restore_from(src, map_location="cpu")
model.eval()
if hasattr(model, "set_export_config"):
    model.set_export_config({"decoder_type": "ctc"})
model.export(os.path.join(out, "model.onnx"))

# The CTC head's output classes: the tokenizer's pieces, then the blank (last).
vocab = list(model.ctc_decoder.vocabulary) if hasattr(model, "ctc_decoder") else list(model.decoder.vocabulary)
with open(os.path.join(out, "tokens.txt"), "w", encoding="utf-8") as f:
    for i, piece in enumerate(vocab):
        f.write(f"{piece} {i}\n")
    f.write(f"<blk> {len(vocab)}\n")

with open(os.path.join(out, "preprocessor.yaml"), "w", encoding="utf-8") as f:
    yaml.safe_dump(OmegaConf.to_container(model.cfg.preprocessor, resolve=True), f, allow_unicode=True)
print("Exported", len(vocab), "tokens to", out)
