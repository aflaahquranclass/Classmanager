import { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { ICONS, Link } from "./parts.jsx";
import { useLang } from "./i18n.jsx";
import { CATEGORIES, loadOpenOfferings } from "../registrations/registrations.js";

// The class times offered on the website (Admin → Registrations → Website
// classes), for the registration form. Empty if they can't be loaded.
export function useOfferings() {
  const [offerings, setOfferings] = useState(null);
  useEffect(() => {
    loadOpenOfferings().then(setOfferings).catch(() => setOfferings([]));
  }, []);
  return offerings;
}

// Home page "Classes" section: just the three classes. Each opens the
// registration form with that class chosen, where the age group, the time
// and the fees come one step at a time.
export default function ClassesSection({ navigate }) {
  const { lang, t } = useLang();
  return (
    <section className="ld-sec ld-soft" id="classes">
      <div className="ld-wrap">
        <div className="ld-center ld-reveal">
          <p className="ld-tag">{t("classes.tag")}</p>
          <h2 className="ld-h2">{t("classes.title")}</h2>
          <p className="ld-lead">{t("classes.lead")}</p>
        </div>
        <div className="ld-grid ld-grid-3">
          {CATEGORIES.map((c, i) => {
            const Icon = ICONS[c.icon];
            return (
              <Link key={c.key} to={`/register?cat=${c.key}`} navigate={navigate} className={`ld-card ld-cls-card ld-reveal ld-d${i + 1}`}>
                <span className="ld-icon"><Icon size={24} aria-hidden="true" /></span>
                <h3>{t(`class.${c.key}.name`)}</h3>
                {lang !== "dv" && <span className="ld-dv" lang="dv" dir="rtl">{c.dv}</span>}
                <p>{t(`class.${c.key}.blurb`)}</p>
                <span className="ld-link">{t("classes.register")} <ArrowRight size={18} aria-hidden="true" /></span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
