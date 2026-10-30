// Every phrase of the public website in English and Dhivehi. English is the
// source; the Dhivehi below is the first version, used until the admin
// corrects a phrase under Admin → Language → Website (corrections are saved
// in site_translations and win over these defaults). {name} placeholders are
// filled in on the page.
//
// So far the home page, the menu and the footer are translated; the other
// pages are still English only.

import { supabase } from "../supabaseClient.js";
import { WHY, BOOKS, BOOK_CATEGORIES, HERO, CONTACT } from "./content.js";
import { CATEGORIES } from "../registrations/registrations.js";

// Dhivehi of the items listed in content.js and registrations.js, by their key.
const WHY_DV = {
  award: { title: "ޤާބިލު މުދައްރިސުން", text: "ކޮންމެ ދަރިވަރަކު ނަމުން ދަންނަ، ތަމްރީނު ލިބިފައިވާ މުދައްރިސުން." },
  chart: { title: "ފެންނަ ކުރިއެރުން", text: "ހިފްޒު ޓްރެކަރު، ސްޓްރީކްތަކާއި ގަވާއިދުން ލިބޭ އިމްތިޙާނުގެ ރިޕޯޓުތައް." },
  phone: { title: "ބެލެނިވެރިންގެ ޕޯޓަލް", text: "ޙާޟިރީ، ފީ އަދި އެސް.އެމް.އެސް އިން ލިބޭ މަޢުލޫމާތު، ހުރިހާ ކަމެއް އެއް އެޕެއްގައި." },
};
const CLASS_DV = {
  tajweed: "ތަޖްވީދުގެ ޤަވާޢިދުތަކާ އެއްގޮތަށް ޤުރުއާން ރަނގަޅަށް ކިޔަވާ.",
  hifz: "ދުވަހުގެ ޕްލޭނަކާއި މުރާޖަޢާއާއެކު ޤުރުއާން ހިފްޒުކުރައްވާ.",
  foundation: "އަކުރުތަކާއި ކަލިމަތަކުން ފަށައިގެން ކިޔެވުން ދަސްކުރައްވާ.",
};
const BOOK_DV = {
  qaida: "ނޫރާނީ ޤާޢިދާ",
  "tajweed-guide": "ތަޖްވީދު ގައިޑް",
  "mushaf-hafs": "މުޞްޙަފު (ޙަފްޞް)",
  "juz-amma": "ޖުޒު ޢައްމަ ވޯކްބުކް",
  "pocket-mushaf": "ޖީބު މުޞްޙަފު",
  "duas-kids": "ކުޑަކުދިންނަށް ދުވަހުގެ ދުޢާތައް",
};
const BOOK_CATEGORY_DV = { All: "ހުރިހާ", Qaida: "ޤާޢިދާ", Mushaf: "މުޞްޙަފު", Tajweed: "ތަޖްވީދު", Kids: "ކުޑަކުދިން" };

// group: heading the phrase is listed under in Admin → Language → Website.
const s = (group, key, en, dv) => ({ key, group, en, dv });

export const SITE_GROUPS = ["Menu and footer", "Top of the page", "Reviews", "Student portal", "Classes", "Why Aflaah", "Book store", "Sample portal screens", "Join us"];

export const SITE_STRINGS = [
  s("Menu and footer", "brand.name", "Aflaah", "އަފްލާޙް"),
  s("Menu and footer", "brand.sub", "Quran Class", "ޤުރުއާން ކުލާސް"),
  s("Menu and footer", "nav.classes", "Classes", "ކުލާސްތައް"),
  s("Menu and footer", "nav.hifz", "Hifz program", "ހިފްޒު ޕްރޮގްރާމް"),
  s("Menu and footer", "nav.store", "Store", "ފިހާރަ"),
  s("Menu and footer", "nav.rules", "Rules", "ޤަވާޢިދު"),
  s("Menu and footer", "nav.contact", "Contact", "ގުޅުއްވާ"),
  s("Menu and footer", "nav.portalLogin", "Portal login", "ޕޯޓަލަށް ލޮގިން"),
  s("Menu and footer", "nav.studentPortal", "Student portal", "ދަރިވަރުންގެ ޕޯޓަލް"),
  s("Menu and footer", "nav.teachersPortal", "Teachers portal", "މުދައްރިސުންގެ ޕޯޓަލް"),
  s("Menu and footer", "nav.admin", "Admin", "އެޑްމިން"),
  s("Menu and footer", "nav.register", "Register", "ރަޖިސްޓަރީ"),
  s("Menu and footer", "nav.openMenu", "Open menu", "މެނޫ ހުޅުވާ"),
  s("Menu and footer", "nav.closeMenu", "Close menu", "މެނޫ ބަންދުކުރޭ"),
  s("Menu and footer", "foot.about", "Quran classes for children and adults in Malé, with a student portal that tracks every step.", "ކޮންމެ ފިޔަވަޅެއް ބަލަހައްޓާ ދަރިވަރުންގެ ޕޯޓަލަކާއެކު، މާލޭގައި ކުޑަކުދިންނާއި ބޮޑެތި މީހުންނަށް ޤުރުއާން ކުލާސްތައް."),
  s("Menu and footer", "foot.contact", "Contact", "ގުޅުއްވުމަށް"),
  s("Menu and footer", "foot.explore", "Explore", "ބައްލަވާ"),
  s("Menu and footer", "foot.registerClass", "Register for a class", "ކުލާހަކަށް ރަޖިސްޓަރީ ކުރައްވާ"),
  s("Menu and footer", "foot.bookStore", "Book store", "ފޮތް ފިހާރަ"),
  s("Menu and footer", "foot.rules", "Rules and regulations", "ޤަވާޢިދުތައް"),
  s("Menu and footer", "foot.signIn", "Sign in", "ލޮގިން"),
  s("Menu and footer", "foot.install", "Install the app", "އެޕް އިންސްޓޯލް ކުރައްވާ"),
  s("Menu and footer", "foot.rights", "© {year} Aflaah Quran Class. All rights reserved.", "© {year} އަފްލާޙް ޤުރުއާން ކުލާސް. ހުރިހާ ޙައްޤެއް ލިބިގެންވޭ."),
  s("Menu and footer", "contact.location", CONTACT.location, "މާލެ، ދިވެހިރާއްޖެ"),

  s("Top of the page", "hero.quote", "“The best of you are those who learn the Quran and teach it.”", "“ތިޔަބައިމީހުންގެ ތެރެއިން އެންމެ ހެޔޮ މީހަކީ ޤުރުއާން ދަސްކޮށް، އަދި އެ ދަސްކޮށްދޭ މީހާއެވެ.”"),
  s("Top of the page", "hero.register", "Register now", "މިހާރު ރަޖިސްޓަރީ ކުރައްވާ"),
  s("Top of the page", "hero.explore", "Explore classes", "ކުލާސްތައް ބައްލަވާ"),
  s("Top of the page", "hero.rules", "Rules and regulations", "ޤަވާޢިދުތައް"),
  s("Top of the page", "hero.loved", "Loved by parents and students", "ބެލެނިވެރިންނާއި ދަރިވަރުންގެ ލޯބި ލިބިފައިވާ ކުލާސް"),
  s("Top of the page", "hero.students", HERO.studentLabel, "ދަރިވަރުން އަޅުގަނޑުމެންނާއެކު ކިޔަވަމުން"),

  s("Reviews", "reviews.tag", "Reviews", "ރިވިއުތައް"),
  s("Reviews", "reviews.title", "Kind words from our students and parents", "ދަރިވަރުންނާއި ބެލެނިވެރިންގެ ހެޔޮ ބަސްތައް"),
  s("Reviews", "reviews.lead", "Honest reviews of our classes, shared by the people who learn with us.", "އަޅުގަނޑުމެންނާއެކު ކިޔަވާ މީހުން ހިއްސާކުރައްވާފައިވާ، ކުލާސްތަކާ ބެހޭ ތެދު ޚިޔާލުތައް."),

  s("Student portal", "portal.tag", "Student portal", "ދަރިވަރުންގެ ޕޯޓަލް"),
  s("Student portal", "portal.title", "Watch your child's hifz grow", "ދަރިފުޅުގެ ހިފްޒު ކުރިއަރަމުންދާ ގޮތް ބައްލަވާ"),
  s("Student portal", "portal.lead", "Every hifz student gets their own portal: a daily plan, a streak that builds the habit, and a live percentage of the Quran memorised.", "ހިފްޒުކުރާ ކޮންމެ ދަރިވަރަކަށް ވަކި ޕޯޓަލެއް ލިބޭނެއެވެ: ކޮންމެ ދުވަހަކަށް ރޭވިފައިވާ ޕްލޭނެއް، ހެޔޮ އާދަ ބިނާކުރާ ސްޓްރީކެއް، އަދި ޤުރުއާނުން ހިފްޒުކުރެވިފައިވާ މިންވަރު ޕަސެންޓުން."),
  s("Student portal", "portal.link", "See our hifz program", "ހިފްޒު ޕްރޮގްރާމް ބައްލަވާ"),
  s("Student portal", "portal.streak.title", "Daily streak", "ދުވަހުގެ ސްޓްރީކް"),
  s("Student portal", "portal.streak.text", "One task a day keeps the streak alive and builds a lasting habit.", "ދުވާލަކު އެއް މަސައްކަތް ކުރުމުން ސްޓްރީކް ދެމިހުރެ، ދެމެހެއްޓޭނެ ހެޔޮ އާދައެއް ބިނާވެއެވެ."),
  s("Student portal", "portal.plan.title", "Today's plan", "މިއަދުގެ ޕްލޭން"),
  s("Student portal", "portal.plan.text", "New lesson and revision planned for every student, every day.", "ކޮންމެ ދުވަހަކު، ކޮންމެ ދަރިވަރަކަށް އައު ފިލާވަޅާއި މުރާޖަޢާ ރާވައިދެވެއެވެ."),
  s("Student portal", "portal.reports.title", "Exam reports", "އިމްތިޙާނުގެ ރިޕޯޓުތައް"),
  s("Student portal", "portal.reports.text", "Regular tests with teacher remarks, shared with parents.", "މުދައްރިސުންގެ ރިމާކްސް ހިމެނޭ، ގަވާއިދުން ބާއްވާ އިމްތިޙާނުތައް. ނަތީޖާ ބެލެނިވެރިންނާ ހިއްސާކުރެވޭ."),

  s("Classes", "classes.tag", "Classes offered", "ހުޅުވާލެވިފައިވާ ކުލާސްތައް"),
  s("Classes", "classes.title", "Find the right class", "އެކަށީގެންވާ ކުލާސް ހޯއްދަވާ"),
  s("Classes", "classes.lead", "Choose a class to see its times for children and for teens and adults, and register online.", "ކުޑަކުދިންނަށާއި، ޒުވާނުންނާއި ބޮޑެތި މީހުންނަށް ހުންނަ ގަޑިތައް ބެއްލެވުމަށް ކުލާހެއް ޚިޔާރުކުރައްވާ، އަދި އޮންލައިންކޮށް ރަޖިސްޓަރީ ކުރައްވާ."),
  s("Classes", "classes.register", "Register", "ރަޖިސްޓަރީ ކުރައްވާ"),
  ...CATEGORIES.flatMap((c) => [
    s("Classes", `class.${c.key}.name`, c.en, c.dv),
    s("Classes", `class.${c.key}.blurb`, c.blurb, CLASS_DV[c.key] || ""),
  ]),

  s("Why Aflaah", "why.tag", "Why Aflaah", "އަފްލާޙް ހޮވަންވީ ކީއްވެ"),
  s("Why Aflaah", "why.title", "Why parents choose this class", "ބެލެނިވެރިން މި ކުލާސް ހޮވާ ސަބަބުތައް"),
  ...WHY.flatMap((w) => [
    s("Why Aflaah", `why.${w.icon}.title`, w.title, WHY_DV[w.icon]?.title || ""),
    s("Why Aflaah", `why.${w.icon}.text`, w.text, WHY_DV[w.icon]?.text || ""),
  ]),

  s("Book store", "store.tag", "Book store", "ފޮތް ފިހާރަ"),
  s("Book store", "store.title", "Books for every level", "ކޮންމެ ފެންވަރަކަށް ފޮތް"),
  s("Book store", "store.lead", "The books we use in class, from the first letters to the full mushaf.", "ފުރަތަމަ އަކުރުތަކުން ފެށިގެން ފުރިހަމަ މުޞްޙަފާ ހަމައަށް، ކުލާހުގައި ބޭނުންކުރާ ފޮތްތައް."),
  s("Book store", "store.viewAll", "View all books", "ހުރިހާ ފޮތެއް ބައްލަވާ"),
  ...BOOKS.map((b) => s("Book store", `book.${b.id}`, b.title, BOOK_DV[b.id] || "")),
  ...BOOK_CATEGORIES.map((c) => s("Book store", `bookCat.${c}`, c, BOOK_CATEGORY_DV[c] || "")),

  s("Sample portal screens", "show.label", "What students and parents get", "ދަރިވަރުންނާއި ބެލެނިވެރިންނަށް ލިބޭ ޚިދުމަތްތައް"),
  s("Sample portal screens", "show.dot", "Show {name}", "{name} ދައްކާ"),
  s("Sample portal screens", "show.badge.portal", "Live progress tracking", "ކުރިއެރުން ލައިވްކޮށް ބެލޭ"),
  s("Sample portal screens", "show.badge.plan", "Daily plan and streak", "ދުވަހުގެ ޕްލޭނާއި ސްޓްރީކް"),
  s("Sample portal screens", "show.badge.report", "Hifz exam reports", "ހިފްޒު އިމްތިޙާނުގެ ރިޕޯޓުތައް"),
  s("Sample portal screens", "show.badge.store", "Books in our store", "ފިހާރައިގައި ހުރި ފޮތްތައް"),
  s("Sample portal screens", "sample.label", "Sample of the student portal", "ދަރިވަރުންގެ ޕޯޓަލުގެ ނަމޫނާއެއް"),
  s("Sample portal screens", "sample.student", "Student name", "ދަރިވަރުގެ ނަން"),
  s("Sample portal screens", "sample.portal", "Sample portal", "ނަމޫނާ ޕޯޓަލް"),
  s("Sample portal screens", "sample.dayStreak", "day streak", "ދުވަހުގެ ސްޓްރީކް"),
  s("Sample portal screens", "sample.tracker", "Hifz percentage tracker", "ހިފްޒުކުރެވުނު މިންވަރު"),
  s("Sample portal screens", "sample.ayaat", "{n} / 6,236 ayaat", "{n} / 6,236 އާޔަތް"),
  s("Sample portal screens", "sample.path", "Juz Amma path", "ޖުޒު ޢައްމަ މަގު"),
  s("Sample portal screens", "sample.surahs", "Surahs completed", "ނިންމި ސޫރަތް"),
  s("Sample portal screens", "sample.pages", "Pages this week", "މި ހަފްތާގެ ޞަފްޙާ"),
  s("Sample portal screens", "sample.done", "{done} of {total} done", "{total} އިން {done} ނިމިއްޖެ"),
  s("Sample portal screens", "sample.task1", "New lesson: An-Naba 1–16", "އައު ފިލާވަޅު: އައްނަބައު 1–16"),
  s("Sample portal screens", "sample.task2", "Recent revision: last 5 pages", "ފަހުގެ މުރާޖަޢާ: ފަހު 5 ޞަފްޙާ"),
  s("Sample portal screens", "sample.task3", "Older revision: Juz 30, part 1", "ކުރީގެ މުރާޖަޢާ: ޖުޒު 30، ބައި 1"),
  s("Sample portal screens", "sample.streak", "Streak", "ސްޓްރީކް"),
  s("Sample portal screens", "sample.days", "{n} days", "{n} ދުވަސް"),
  s("Sample portal screens", "sample.weeks", "Last 3 weeks", "ފަހު 3 ހަފްތާ"),
  s("Sample portal screens", "sample.longest", "Longest: {n} days", "އެންމެ ދިގު: {n} ދުވަސް"),
  s("Sample portal screens", "sample.report", "Hifz exam report", "ހިފްޒު އިމްތިޙާނުގެ ރިޕޯޓް"),
  s("Sample portal screens", "sample.exam", "Juz 30 · Term 2", "ޖުޒު 30 · ދެވަނަ ޓާރމް"),
  s("Sample portal screens", "sample.grade", "Excellent", "ވަރަށް މޮޅު"),
  s("Sample portal screens", "sample.memorisation", "Memorisation", "ހިފްޒު"),
  s("Sample portal screens", "sample.tajweed", "Tajweed", "ތަޖްވީދު"),
  s("Sample portal screens", "sample.fluency", "Fluency", "ރަވާނީކަން"),
  s("Sample portal screens", "sample.remark", "Strong revision. Keep it up!", "ވަރަށް ރަނގަޅު މުރާޖަޢާއެއް. ކުރިއަށް ގެންދަވާ!"),
  s("Sample portal screens", "sample.remarkLabel", "Teacher's remark", "މުދައްރިސްގެ ރިމާކް"),
  s("Sample portal screens", "sample.visitStore", "Visit the book store", "ފޮތް ފިހާރައަށް ވަޑައިގަންނަވާ"),

  s("Join us", "cta.title", "Join {count} students today", "{count} ދަރިވަރުންނާ މިއަދުވެސް ގުޅިލައްވާ"),
  s("Join us", "cta.text", "Talk to us about the right class for your child, class times and fees.", "ދަރިފުޅަށް އެކަށީގެންވާ ކުލާހާއި، ކުލާހުގެ ގަޑިތަކާއި ފީއާ ބެހޭގޮތުން އަޅުގަނޑުމެންނާ ވާހަކަ ދައްކަވާ."),
  s("Join us", "cta.call", "Call {phone}", "{phone} އަށް ގުޅުއްވާ"),
  s("Join us", "cta.email", "Email us", "އީމެއިލް ކުރައްވާ"),
  s("Join us", "cta.visit", "Visit us in {location}", "{location} ގައި ހުންނަ ކުލާހަށް ވަޑައިގަންނަވާ"),
  s("Join us", "cta.rules", "Read the class rules", "ކުލާހުގެ ޤަވާޢިދު ކިޔުއްވާ"),
];

export const SITE_DEFAULTS = Object.fromEntries(SITE_STRINGS.map((x) => [x.key, x]));

// Saved corrections: { key: { dv, verified_dv } }. Falls back to the
// defaults if the table can't be read (offline, not migrated yet).
export async function loadSiteOverrides() {
  const { data, error } = await supabase.from("site_translations").select("key, dv, verified_dv, verified_at");
  if (error || !data) return {};
  return Object.fromEntries(data.map((r) => [r.key, r]));
}

// t(key, vars) for one language, with the admin's corrections applied. In
// Dhivehi each filled-in value is isolated, so "100+" or an English place
// name keeps its own order inside the right-to-left sentence.
export function siteTranslator(lang, overrides = {}) {
  const wrap = lang === "dv" ? (v) => `\u2068${v}\u2069` : (v) => v;
  return (key, vars = {}) => {
    const def = SITE_DEFAULTS[key];
    const saved = lang === "dv" ? overrides[key]?.dv : "";
    const text = saved && saved.trim() ? saved : (lang === "dv" && def?.dv) || def?.en || key;
    return text.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? wrap(String(vars[name])) : m));
  };
}
