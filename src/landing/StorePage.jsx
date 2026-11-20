import { ArrowRight, Gift } from "lucide-react";
import { PRODUCTS } from "../store/products.js";
import { useLang } from "./i18n.jsx";

// The store (aflaahqc.com/store): what the class sells, each with a Pay now
// button that opens its Dhivehi order page (/store/<slug>). Products are listed
// in src/store/products.js.
export const PRODUCT_LIST = Object.entries(PRODUCTS).map(([slug, p]) => ({ slug, ...p }));

export function ProductCard({ product: p, delay = 0 }) {
  const { t, lang } = useLang();
  return (
    <article className={`ld-card ld-product ld-reveal ld-d${delay % 4}`}>
      <a href={`/store/${p.slug}`} className="ld-product-img"><img src={p.image} alt={p.name[lang] || p.name.en} loading="lazy" /></a>
      <div className="ld-product-body">
        <h3>{t(`product.${p.slug}.name`)}</h3>
        <p className="ld-product-text">{t(`product.${p.slug}.text`)}</p>
        <p className="ld-product-bonus"><Gift size={18} aria-hidden="true" />{t(`product.${p.slug}.bonus`)}</p>
        <div className="ld-product-foot">
          <span className="ld-product-price" dir="ltr">MVR {p.price}</span>
          <a href={`/store/${p.slug}`} className="ld-btn ld-btn-primary">{t("store.payNow")} <ArrowRight size={18} aria-hidden="true" /></a>
        </div>
      </div>
    </article>
  );
}

export default function StorePage() {
  const { t } = useLang();
  return (
    <section className="ld-sec ld-soft" style={{ minHeight: "70vh" }}>
      <div className="ld-wrap">
        <div className="ld-store-head">
          <div>
            <p className="ld-tag">{t("store.tag")}</p>
            <h1 className="ld-h2">{t("store.title")}</h1>
            <p className="ld-lead">{t("store.lead")}</p>
          </div>
        </div>
        <div className="ld-products">
          {PRODUCT_LIST.map((p, i) => <ProductCard key={p.slug} product={p} delay={i} />)}
        </div>
      </div>
    </section>
  );
}
