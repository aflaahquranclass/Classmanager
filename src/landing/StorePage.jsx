import { useState } from "react";
import { BOOKS, BOOK_CATEGORIES } from "./content.js";
import { BookCard } from "./HomePage.jsx";
import { useReveal } from "./parts.jsx";

export default function StorePage() {
  const [category, setCategory] = useState("All");
  const shown = category === "All" ? BOOKS : BOOKS.filter((b) => b.category === category);
  useReveal(category);
  return (
    <section className="ld-sec ld-soft" style={{ minHeight: "70vh" }}>
      <div className="ld-wrap">
        <div className="ld-store-head">
          <div>
            <p className="ld-tag">Book store</p>
            <h1 className="ld-h2">Books for every level</h1>
            <p className="ld-lead">Books we use in class. Ask your teacher to buy a copy.</p>
          </div>
        </div>
        <div className="ld-filters" role="group" aria-label="Filter by category">
          {BOOK_CATEGORIES.map((c) => (
            <button key={c} type="button" className={`ld-filter ${c === category ? "on" : ""}`} aria-pressed={c === category} onClick={() => setCategory(c)}>{c}</button>
          ))}
        </div>
        <div className="ld-grid ld-grid-4 ld-books" key={category}>
          {shown.map((b, i) => <BookCard key={b.id} book={b} delay={i} />)}
        </div>
      </div>
    </section>
  );
}
