import { useState } from "react";
import { BookOpen, UserPlus, LogOut, Wallet, Languages } from "lucide-react";
import { RULES, RULE_DATES } from "./content.js";
import { useLang } from "./i18n.jsx";

// The class's official rules (content.js). The categories of the rules
// document are tabs: clicking one shows only that category's rules. The key
// dates are under them.
const RULE_ICONS = { book: BookOpen, join: UserPlus, leave: LogOut, wallet: Wallet };

export default function RulesPage() {
  const { lang, setLang, t } = useLang();
  const say = (text) => text[lang] || text.en;
  const [openKey, setOpenKey] = useState(() => {
    const fromHash = window.location.hash.replace("#rules-", "");
    return RULES.some((c) => c.key === fromHash) ? fromHash : RULES[0].key;
  });
  const ci = RULES.findIndex((c) => c.key === openKey);
  const cat = RULES[ci];
  const CatIcon = RULE_ICONS[cat.icon] || BookOpen;

  return (
    <>
      <section className="ld-page-head">
        <div className="ld-wrap ld-reveal">
          <p className="ld-tag">{t("rules.tag")}</p>
          <h1 className="ld-h2">{t("rules.title")}</h1>
          <p>{t("rules.lead")}</p>
        </div>
      </section>

      <section className="ld-sec ld-soft ld-rules-page">
        <div className="ld-wrap">
          {lang !== "dv" && (
            <p className="ld-rules-official ld-reveal">
              <Languages size={18} aria-hidden="true" />
              <span>{t("rules.official")}</span>
              <button type="button" onClick={() => { setLang("dv"); window.scrollTo(0, 0); }}>{t("rules.readDv")}</button>
            </p>
          )}

          <div className="ld-rules-tabs" role="tablist" aria-label={t("rules.jump")}>
            {RULES.map((c) => {
              const Icon = RULE_ICONS[c.icon] || BookOpen;
              const on = c.key === openKey;
              return (
                <button
                  key={c.key} type="button" role="tab" id={`rules-tab-${c.key}`}
                  aria-selected={on} aria-controls="rules-panel"
                  className={on ? "on" : ""}
                  onClick={() => { setOpenKey(c.key); window.history.replaceState(null, "", `#rules-${c.key}`); }}
                >
                  <span className="ld-icon"><Icon size={20} aria-hidden="true" /></span>
                  <span className="ld-rules-tab-text">
                    <b>{say(c.title)}</b>
                  </span>
                </button>
              );
            })}
          </div>

          <section key={cat.key} id="rules-panel" role="tabpanel" aria-labelledby={`rules-tab-${cat.key}`} className="ld-rules-cat">
            <div className="ld-rules-cat-head">
              <span className="ld-icon"><CatIcon size={22} aria-hidden="true" /></span>
              <h2><span className="ld-rules-num">{ci + 1}</span>{say(cat.title)}</h2>
            </div>
            <div className="ld-grid ld-rules">
              {cat.cards.map((card, i) => (
                <article key={card.num || i} className="ld-card ld-rule">
                  {card.title && (
                    <h3 className="ld-rule-head"><span className="ld-rules-num">{card.num}</span>{say(card.title)}</h3>
                  )}
                  {card.intro && <p className="ld-rule-intro">{say(card.intro)}</p>}
                  <ol>
                    {card.items.map((item) => (
                      <li key={item.en}>{item.term && <b>{say(item.term)}: </b>}{say(item)}</li>
                    ))}
                  </ol>
                </article>
              ))}
            </div>
          </section>

          <div className="ld-rules-dates ld-reveal">
            <h2>{t("rules.dates")}</h2>
            <ul>
              {RULE_DATES.map((d) => (
                <li key={d.key}>
                  <span className="ld-rules-day" aria-hidden="true">{d.n}</span>
                  <div><b>{t(`rules.date.${d.key}.label`)}</b><span>{t(`rules.date.${d.key}.text`)}</span></div>
                </li>
              ))}
            </ul>
          </div>

          <p className="ld-rules-note ld-reveal">{t("rules.note")}</p>
        </div>
      </section>
    </>
  );
}
