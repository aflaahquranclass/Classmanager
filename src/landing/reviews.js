import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient.js";
import { REVIEWS, REVIEW_CLASSES, SHOW } from "./content.js";

// Reviews sent from the /review form and approved by the admin (Admin →
// Reviews). Until the first one is approved, the local preview shows the
// SAMPLE reviews from content.js and the live site hides the section.
let cache = null;

export function usePublicReviews() {
  const [reviews, setReviews] = useState(cache);
  useEffect(() => {
    if (cache) return;
    supabase.rpc("public_reviews").then(({ data, error }) => {
      const real = !error && data?.length
        ? data.map((r) => ({
          name: r.name,
          role: r.class_name,
          roleDv: REVIEW_CLASSES.find((c) => c.en === r.class_name)?.dv,
          text: r.comment,
          rating: r.rating,
        }))
        : [];
      cache = real.length ? real : SHOW.reviews ? REVIEWS : [];
      setReviews(cache);
    });
  }, []);
  return reviews || [];
}

// Clears the cache so a newly approved review shows without a reload.
export const forgetReviews = () => { cache = null; };
