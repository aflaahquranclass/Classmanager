// Which teacher section (Hifz, Thilawa) a student belongs to, and grouping
// students by class. Plain JS so the tests can load it.

export const hasProgram = (student, key) => (student?.programs?.length ? student.programs : ["hifz"]).includes(key);

// A class named for Thilawa or Hifz decides the section on its own: a
// "Thilawa Class" student is only in Thilawa, a "Hifz Class" student only in
// Hifz. Other classes (e.g. private classes) follow the admin's choice.
export const classProgram = (className) => (/th?ilaa?wa/i.test(className || "") ? "thilawa" : /hifz|hifdh/i.test(className || "") ? "hifz" : null);
export const inProgramSection = (student, key) => {
  const fromClass = classProgram(student?.className);
  return fromClass ? fromClass === key : hasProgram(student, key);
};

// Students grouped by class name, classes and names in order.
export const groupByClass = (students) => {
  const groups = new Map();
  for (const s of students) {
    const name = s.className?.trim() || "No class";
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(s);
  }
  const order = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
  return [...groups].sort(([a], [b]) => (a === "No class") - (b === "No class") || order(a, b))
    .map(([name, list]) => ({ name, students: list.sort((a, b) => order(a.name, b.name)) }));
};
