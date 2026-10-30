// Which student portal sections a student gets: Hifz (memorising), Thilawa
// (reading by looking) or both. Stored in students.programs.

const CHOICES = [
  { value: ["hifz"], label: "Hifz", hint: "Memorising" },
  { value: ["thilawa"], label: "Thilawa", hint: "Reading by looking" },
  { value: ["hifz", "thilawa"], label: "Both", hint: "Hifz and Thilawa" },
];

export const hasProgram = (student, key) => (student?.programs?.length ? student.programs : ["hifz"]).includes(key);
export const programsLabel = (programs) => CHOICES.find((c) => c.value.join() === [...(programs || ["hifz"])].sort().join())?.label || "Hifz";

// Registration class → the program it starts on (the admin can change it).
export const programsForCategory = (category) => (category === "hifz" ? ["hifz"] : ["thilawa"]);

export function ProgramPicker({ value, onChange, label = "Student portal" }) {
  const current = [...(value?.length ? value : ["hifz"])].sort().join();
  return (
    <fieldset style={{ border: "none", margin: 0, padding: 0, minWidth: 0 }}>
      <legend style={{ fontSize: "12px", color: "#567493", marginBottom: "6px", padding: 0 }}>{label}</legend>
      <div role="radiogroup" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "8px" }}>
        {CHOICES.map((c) => {
          const on = c.value.join() === current;
          return (
            <button
              key={c.label}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(c.value)}
              style={{
                minHeight: "52px", padding: "8px", borderRadius: "10px", cursor: "pointer", font: "inherit", textAlign: "center",
                border: on ? "1px solid #176FD1" : "1px solid #BBDCF0",
                background: on ? "linear-gradient(135deg, #0D4F85, #176FD1)" : "#FFFFFF",
                color: on ? "#FFFFFF" : "#123B67",
              }}
            >
              <span style={{ display: "block", fontWeight: 700, fontSize: "14px" }}>{c.label}</span>
              <span style={{ display: "block", fontSize: "11px", opacity: 0.85 }}>{c.hint}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
