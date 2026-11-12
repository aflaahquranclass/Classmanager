// Admin → Reviews → Social media: each approved review as a ready-made
// Instagram post (see reviewPost.js), in English or Dhivehi, to download or
// share straight from a phone.

import { useState, useEffect, useCallback } from "react";
import { Download, Share2, RotateCw } from "lucide-react";
import { supabase } from "../supabaseClient.js";
import { TP } from "../shared.jsx";
import { drawReviewPost, postBlob, postFileName, postLanguage, publicName } from "./reviewPost.js";

const LANGS = [
  { key: "en", label: "English" },
  { key: "dv", label: "ދިވެހި" },
];

function PostCard({ review, showToast }) {
  const [lang, setLang] = useState(() => postLanguage(review.comment));
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const name = publicName(review.name);
  const post = { name, className: review.class_name, comment: review.comment, rating: review.rating, lang };

  useEffect(() => {
    let live = true;
    setPreview(null);
    drawReviewPost(post).then((c) => { if (live) setPreview(c.toDataURL("image/png")); });
    return () => { live = false; };
  }, [review.id, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const file = async () => new File([await postBlob(await drawReviewPost(post))], postFileName(name, lang), { type: "image/png" });

  const download = async () => {
    setBusy(true);
    try {
      const f = await file();
      const url = URL.createObjectURL(f);
      const a = document.createElement("a");
      a.href = url;
      a.download = f.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { showToast(e.message); }
    setBusy(false);
  };

  const canShare = typeof navigator !== "undefined" && !!navigator.canShare;
  const share = async () => {
    setBusy(true);
    try {
      const f = await file();
      if (!navigator.canShare({ files: [f] })) throw new Error("This device can’t share images. Use Download instead.");
      await navigator.share({ files: [f] });
    } catch (e) { if (e.name !== "AbortError") showToast(e.message); }
    setBusy(false);
  };

  return (
    <article className="tp-card sp-card">
      <div className="sp-preview">
        {preview ? <img src={preview} alt={`Instagram post of ${name}’s review`} /> : <span className="sp-wait">Drawing…</span>}
      </div>
      <div className="sp-row">
        <div className="tp-segment" role="group" aria-label="Post language" style={{ marginBottom: 0 }}>
          {LANGS.map((x) => (
            <button key={x.key} type="button" aria-pressed={lang === x.key} className={`tp-segment-btn ${lang === x.key ? "tp-segment-btn-active" : ""}`} onClick={() => setLang(x.key)} lang={x.key}>{x.label}</button>
          ))}
        </div>
        <span className="sp-name" dir="auto">{review.name}</span>
      </div>
      <div className="sp-actions">
        <button type="button" className="tp-btn-gradient" disabled={busy || !preview} onClick={download}><Download size={17} aria-hidden="true" /> Download</button>
        {canShare && <button type="button" className="tp-btn-outline" disabled={busy || !preview} onClick={share}><Share2 size={17} aria-hidden="true" /> Share</button>}
      </div>
    </article>
  );
}

export function ReviewPosts({ showToast }) {
  const [reviews, setReviews] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    const { data, error: err } = await supabase.from("reviews").select("id, name, class_name, comment, rating")
      .eq("status", "approved").order("created_at", { ascending: false }).limit(200);
    if (err) { setError(err.message); setReviews([]); return; }
    setReviews(data || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <style>{spCss()}</style>
      <div className="rv-bar">
        <p className="rv-link-help" style={{ flex: "1 1 260px" }}>Every review on the website, ready to post on Instagram (1080 × 1080). Names are shown the same way as on the website.</p>
        <button type="button" className="tp-btn-outline" onClick={load}><RotateCw size={16} aria-hidden="true" /> Refresh</button>
      </div>
      {error && <div className="tp-card rv-error" role="alert">Couldn’t load reviews: {error}</div>}
      {reviews === null && <div className="tp-card">Loading…</div>}
      {reviews && reviews.length === 0 && !error && <div className="tp-card rv-empty">No reviews on the website yet. Approve a review to make a post from it.</div>}
      <div className="sp-grid">
        {(reviews || []).map((r) => <PostCard key={r.id} review={r} showToast={showToast} />)}
      </div>
    </>
  );
}

const spCss = () => `
  .sp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr)); gap: 16px; }
  .sp-card { display: flex; flex-direction: column; gap: 12px; padding: 14px; }
  .sp-preview { aspect-ratio: 1; border-radius: 10px; overflow: hidden; background: linear-gradient(150deg, ${TP.gradStart}, ${TP.gradEnd}); display: grid; place-items: center; }
  .sp-preview img { width: 100%; height: 100%; display: block; }
  .sp-wait { color: rgba(255,255,255,.8); font-size: 14px; }
  .sp-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
  .sp-name { font-size: 13px; color: ${TP.secondaryText}; overflow-wrap: anywhere; }
  .sp-actions { display: flex; gap: 10px; }
  .sp-actions button { flex: 1 1 auto; justify-content: center; }
`;
