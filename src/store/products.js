// What the website store sells (aflaahqc.com/store), each with its own
// Dhivehi order page (/store/<slug>, e.g. aflaahqc.com/store/huroof). The
// buyer fills in their details, agrees not to share the PDF, pays by bank
// transfer and attaches the slip. Saved to store_orders through
// submit_store_order (supabase/migrations/20261129_store_orders.sql), which
// knows the same products and prices — change both together.

import { supabase } from "../supabaseClient.js";
import { shrinkSlip, SLIP_MAX_BYTES } from "../workshops/workshops.js";

export const PRODUCTS = {
  huroof: {
    key: "huroof-cards-pdf",
    price: 30, // MVR
    image: "/images/store/huroof-poster.jpg",
    // On the store page (English and Dhivehi, see siteStrings.js) and the order page.
    name: { en: "Letter card set (PDF)", dv: "އަކުރު ކާޑު ސެޓް" },
    format: "PDF",
    points: [
      "އަކުރުގެ ބައްޓަން: ކަލިމައިގެ ފެށޭއިރު، މެދުތެރޭގައި، ނިމޭއިރު",
      "ފިލި ޖަހައިގެން ކިޔުން",
      "ޕްރިންޓްކޮށް ގޭގައި ކުޅެލަމުން ދަސްކުރެވޭ",
    ],
    bonus: "އަކުރު ކާޑު ސެޓާއެކު އަކުރުގެ ދަސްކޮށްދިނުމާ ގުޅޭ، ބެލެނިވެރިންނަށް ޚާއްސަ ސެޝަނެއް ހިލޭ!",
    viber: "9715441",
    // SMS the admin can send once an order is accepted (Admin → Store).
    acceptedMessage: `އައްސަލާމް ޢަލައިކުމް!

އަކުރު ކާޑު ސެޓް ގަތުމަށް ދެއްކެވި ފައިސާ ވަނީ ލިބިފައެވެ. PDF ފައިލް ވައިބަރ އިން ފޮނުވައިދެވޭނެއެވެ.

ހިލޭ ސެޝަނާ ގުޅޭ މަޢުލޫމާތު ވެސް ވައިބަރ އިން ހިއްސާކުރެވޭނެއެވެ.

ޝުކުރިއްޔާ!`,
  },
};

export const productSlugOf = (pathname = window.location.pathname) => {
  const m = pathname.match(/^\/store\/([a-z0-9-]+)\/?$/);
  return m && PRODUCTS[m[1]] ? m[1] : "";
};

// order: { buyerName, address, viber }. Uploads the
// slip under new/, then files the order. The visitor can't read either back;
// only admins can.
export async function submitStoreOrder({ product, order, agreed, file: picked }) {
  const file = await shrinkSlip(picked);
  if (file.size > SLIP_MAX_BYTES) throw new Error("bigSlip");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `new/store-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const up = await supabase.storage.from("registration-slips").upload(path, file, { contentType: file.type || undefined });
  if (up.error) throw new Error("slip");
  const { error } = await supabase.rpc("submit_store_order", {
    p_product: product,
    p_order: {
      buyer_name: order.buyerName.trim(),
      address: order.address.trim(),
      viber: order.viber.trim(),
    },
    p_agreed: agreed === true,
    p_slip_path: path,
  });
  if (error) {
    const m = error.message;
    throw new Error(m.includes("not for sale") ? "closed" : m.includes("too many") ? "busy" : m.includes("agreement") ? "agree" : m.includes("not valid") ? "invalid" : "save");
  }
}
