// Fee payment slips: the student transfers to the class account and uploads
// the slip (student portal → Finance → Pay now); the admin verifies it under
// Finance → Payment slips. Table and bucket: 20261026_payment_slips.sql.

import { supabase } from "../supabaseClient.js";

export const BANK = {
  bank: "Bank of Maldives (BML)",
  accountName: "AFLAAH QURAN CLASS",
  accountNumber: "7770000229485",
};

export const SLIP_BUCKET = "payment-slips";
export const SLIP_MAX_BYTES = 5 * 1024 * 1024;
export const SLIP_ACCEPT = "image/jpeg,image/png,image/webp,image/heic,application/pdf";

export const SLIP_STATUS = {
  pending: { label: "Waiting for check", color: "#9C6B12", bg: "#FCF1DD" },
  approved: { label: "Verified", color: "#1E6B45", bg: "#E3F0E7" },
  rejected: { label: "Rejected", color: "#A5432C", bg: "#FBEAE6" },
};

export const isPdf = (path) => /\.pdf$/i.test(path || "");

// Short-lived link to view a private slip file.
export async function slipUrl(path) {
  const { data, error } = await supabase.storage.from(SLIP_BUCKET).createSignedUrl(path, 600);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

// Uploads the file under <student_id>/ and files a pending slip for review.
export async function submitSlip({ studentId, month, amount, file }) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${studentId}/${month}-${Date.now()}.${ext}`;
  const up = await supabase.storage.from(SLIP_BUCKET).upload(path, file, { contentType: file.type || undefined });
  if (up.error) throw new Error(`Couldn’t upload the slip: ${up.error.message}`);
  const { error } = await supabase.from("payment_slips").insert({ student_id: studentId, month, amount, file_path: path });
  if (error) {
    await supabase.storage.from(SLIP_BUCKET).remove([path]);
    throw new Error(`Couldn’t send the slip: ${error.message}`);
  }
}
