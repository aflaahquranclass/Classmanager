# The Space for Check my Reading's listener. This file and README.md are all
# the Space holds: the server's code is fetched from the app's GitHub repo.
#
# Stage 1: NVIDIA's model (.nemo) → ONNX, with NeMo. Only its output is kept.
FROM python:3.11-slim AS export
ARG SRC=https://raw.githubusercontent.com/aflaahquranclass/Classmanager/main/asr-server
RUN apt-get update && apt-get install -y --no-install-recommends build-essential libsndfile1 && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu \
 && pip install --no-cache-dir "nemo_toolkit[asr]" onnx huggingface_hub pyyaml
WORKDIR /build
ADD $SRC/export.py ./
RUN python export.py

# Stage 2: the small server that runs it.
FROM python:3.11-slim
ARG SRC=https://raw.githubusercontent.com/aflaahquranclass/Classmanager/main/asr-server
RUN useradd -m -u 1000 user
WORKDIR /app
ADD $SRC/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY --from=export --chown=user /build/model ./model
ADD --chown=user $SRC/app.py $SRC/features.py ./
USER user
# Students' sign-ins are checked with the app's Supabase (public values, the
# same ones the app and its Worker use).
ENV HOME=/home/user PYTHONUNBUFFERED=1 \
    SUPABASE_URL=https://iejkdoyugkewgoyzuvad.supabase.co \
    SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imllamtkb3l1Z2tld2dveXp1dmFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0ODIxNzUsImV4cCI6MjEwMjA1ODE3NX0.Bwyw526xUVbOQwfScF2HJQP4CEBJ3KAmyskqpwnnrxk
EXPOSE 7860
CMD ["python", "app.py"]
