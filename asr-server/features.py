"""Log-mel features as NeMo's AudioToMelSpectrogramPreprocessor makes them
(the model was trained on these), in NumPy so the server needs no PyTorch.

Settings come from the model's preprocessor config (model/preprocessor.yaml,
written by export.py); the defaults below are NeMo's FastConformer ones.
"""

import numpy as np

DEFAULTS = {
    "sample_rate": 16000,
    "window_size": 0.025,
    "window_stride": 0.01,
    "n_fft": 512,
    "features": 80,
    "preemph": 0.97,
    "lowfreq": 0,
    "highfreq": None,
    "log": True,
    "log_zero_guard_value": 2 ** -24,
    "mag_power": 2.0,
    "normalize": "per_feature",
    "window": "hann",
    "pad_to": 0,
    "pad_value": 0.0,
}


def _hz_to_mel(f):
    # Slaney's mel scale (librosa's default, htk=False): linear below 1 kHz, log above.
    f = np.asanyarray(f, dtype=np.float64)
    min_log_hz, min_log_mel, logstep = 1000.0, 15.0, np.log(6.4) / 27.0
    return np.where(f >= min_log_hz, min_log_mel + np.log(np.maximum(f, 1e-10) / min_log_hz) / logstep, f / (200.0 / 3))


def _mel_to_hz(m):
    m = np.asanyarray(m, dtype=np.float64)
    min_log_hz, min_log_mel, logstep = 1000.0, 15.0, np.log(6.4) / 27.0
    return np.where(m >= min_log_mel, min_log_hz * np.exp(logstep * (m - min_log_mel)), m * (200.0 / 3))


def mel_filters(sr, n_fft, n_mels, fmin, fmax):
    """librosa.filters.mel(sr, n_fft, n_mels, fmin, fmax, htk=False, norm="slaney")."""
    fftfreqs = np.linspace(0, sr / 2, 1 + n_fft // 2)
    mel_f = _mel_to_hz(np.linspace(_hz_to_mel(fmin), _hz_to_mel(fmax), n_mels + 2))
    fdiff = np.diff(mel_f)
    ramps = mel_f[:, None] - fftfreqs[None, :]
    weights = np.zeros((n_mels, len(fftfreqs)))
    for i in range(n_mels):
        weights[i] = np.maximum(0, np.minimum(-ramps[i] / fdiff[i], ramps[i + 2] / fdiff[i + 1]))
    weights *= (2.0 / (mel_f[2: n_mels + 2] - mel_f[:n_mels]))[:, None]
    return weights


class Featurizer:
    def __init__(self, cfg=None):
        c = dict(DEFAULTS)
        c.update({k: v for k, v in (cfg or {}).items() if k in DEFAULTS and v is not None})
        self.c = c
        sr = c["sample_rate"]
        self.win = int(round(c["window_size"] * sr))
        self.hop = int(round(c["window_stride"] * sr))
        self.n_fft = c["n_fft"] or 2 ** int(np.ceil(np.log2(self.win)))
        # torch.hann_window(win, periodic=False), centred in n_fft as torch.stft does.
        w = np.hanning(self.win) if c["window"] == "hann" else np.ones(self.win)
        left = (self.n_fft - self.win) // 2
        self.window = np.zeros(self.n_fft)
        self.window[left: left + self.win] = w
        self.fb = mel_filters(sr, self.n_fft, c["features"], c["lowfreq"] or 0, c["highfreq"] or sr / 2)

    def __call__(self, audio):
        """audio: float32 mono at the sample rate → (features [n_mels, T] float32, T)."""
        c = self.c
        x = np.asarray(audio, dtype=np.float64)
        n = len(x)
        if c["preemph"]:
            x = np.concatenate([x[:1], x[1:] - c["preemph"] * x[:-1]])
        pad = self.n_fft // 2  # torch.stft(center=True, pad_mode="constant")
        x = np.pad(x, (pad, pad))
        frames = 1 + (len(x) - self.n_fft) // self.hop
        idx = np.arange(self.n_fft)[None, :] + self.hop * np.arange(frames)[:, None]
        power = np.abs(np.fft.rfft(x[idx] * self.window, n=self.n_fft)) ** c["mag_power"]
        mel = power @ self.fb.T  # [T, n_mels]
        if c["log"]:
            mel = np.log(mel + c["log_zero_guard_value"])
        seq_len = n // self.hop + 1
        feats = mel.T[:, :seq_len]
        if c["normalize"] == "per_feature" and seq_len > 1:
            mean = feats.mean(axis=1, keepdims=True)
            std = np.sqrt(((feats - mean) ** 2).sum(axis=1, keepdims=True) / (seq_len - 1)) + 1e-5
            feats = (feats - mean) / std
        pad_to = c["pad_to"] or 0
        if pad_to > 0 and feats.shape[1] % pad_to:
            feats = np.pad(feats, ((0, 0), (0, pad_to - feats.shape[1] % pad_to)), constant_values=c["pad_value"])
        return feats.astype(np.float32), seq_len
