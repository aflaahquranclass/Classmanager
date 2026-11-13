// Check my Reading: telling the reciter's voice from quiet, 20 ms at a time,
// so the recitation can be cut into parts at their pauses (see listener.js).
//
// Quiet is judged against the room and the reciter, not a fixed level: a
// moment is voice when it is well above the background noise and not far
// below the reciter's own loudness. So an echoing room, a recording with
// reverb or a soft voice still shows its pauses.

export function makeVad() {
  let floor = null; // background noise, learnt from the first 0.3 s then followed
  let peak = 0; // the reciter's loudness, falling slowly between loud moments
  let frames = 0;
  return (rms) => {
    frames++;
    if (floor == null || (frames <= 15 && rms < floor)) floor = rms;
    // Follows quiet quickly; rises only slowly (10% a second), so speech
    // itself doesn't become "background".
    else floor = rms < floor ? floor * 0.9 + rms * 0.1 : Math.min(rms, floor * 1.002);
    peak = rms > peak ? rms : peak * 0.999;
    return rms > Math.max(0.004, floor * 3, peak * 0.2);
  };
}

// Frame loudness (root mean square) of 16 kHz samples, 320 per frame.
export function frameRms(samples, from, size = 320) {
  let e = 0;
  for (let k = from; k < from + size; k++) e += samples[k] * samples[k];
  return Math.sqrt(e / size);
}
