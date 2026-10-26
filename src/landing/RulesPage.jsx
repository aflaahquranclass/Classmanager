import { Clock, BookOpen, ListChecks, Wallet } from "lucide-react";
import { RULES } from "./content.js";

const RULE_ICONS = { clock: Clock, book: BookOpen, list: ListChecks, wallet: Wallet };

export default function RulesPage() {
  return (
    <>
      <section className="ld-page-head">
        <div className="ld-wrap ld-reveal">
          <p className="ld-tag">Rules and regulations</p>
          <h1 className="ld-h2">Class rules</h1>
          <p>So every student can learn in a calm, respectful and focused class.</p>
        </div>
      </section>
      <section className="ld-sec ld-soft" style={{ paddingTop: 0 }}>
        <div className="ld-wrap">
          <div className="ld-grid ld-rules">
            {RULES.map((group, i) => {
              const Icon = RULE_ICONS[group.icon] || BookOpen;
              return (
                <article key={group.title} className={`ld-card ld-rule ld-reveal ld-d${(i % 2) + 1}`}>
                  <div className="ld-rule-head">
                    <span className="ld-icon"><Icon size={22} aria-hidden="true" /></span>
                    <h2>{group.title}</h2>
                  </div>
                  <ol>{group.items.map((item) => <li key={item}>{item}</li>)}</ol>
                </article>
              );
            })}
          </div>
          <p className="ld-rules-note ld-reveal">Questions about the rules? Ask your teacher at the next class.</p>
        </div>
      </section>
    </>
  );
}
