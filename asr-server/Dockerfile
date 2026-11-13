# Stage 1: NVIDIA's model (.nemo) → ONNX, with NeMo. Only its output is kept.
FROM python:3.11-slim AS export
RUN apt-get update && apt-get install -y --no-install-recommends build-essential libsndfile1 && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu \
 && pip install --no-cache-dir "nemo_toolkit[asr]" onnx huggingface_hub pyyaml
WORKDIR /build
COPY export.py .
RUN python export.py

# Stage 2: the small server that runs it.
FROM python:3.11-slim
RUN useradd -m -u 1000 user
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY --from=export --chown=user /build/model ./model
COPY --chown=user app.py features.py ./
USER user
ENV HOME=/home/user PYTHONUNBUFFERED=1
EXPOSE 7860
CMD ["python", "app.py"]
