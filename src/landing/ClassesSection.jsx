import { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { ICONS, Link } from "./parts.jsx";
import { CATEGORIES, loadOpenOfferings } from "../registrations/registrations.js";

// The classes offered on the website (Admin → Classes → "Show on the
// website"), for the registration form. Empty if they can't be loaded.
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
  return (
    <section className="ld-sec ld-soft" id="classes">
      <div className="ld-wrap">
        <div className="ld-center ld-reveal">
          <p className="ld-tag">Classes offered</p>
          <h2 className="ld-h2">Find the right class</h2>
          <p className="ld-lead">Choose a class to see its times for children and for teens and adults, and register online.</p>
        </div>
        <div className="ld-grid ld-grid-3">
          {CATEGORIES.map((c, i) => {
            const Icon = ICONS[c.icon];
            return (
              <Link key={c.key} to={`/register?cat=${c.key}`} navigate={navigate} className={`ld-card ld-cls-card ld-reveal ld-d${i + 1}`}>
                <span className="ld-icon"><Icon size={24} aria-hidden="true" /></span>
                <h3>{c.en}</h3>
                <span className="ld-dv" lang="dv" dir="rtl">{c.dv}</span>
                <p>{c.blurb}</p>
                <span className="ld-link">Register <ArrowRight size={18} aria-hidden="true" /></span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
