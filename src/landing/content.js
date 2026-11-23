// Everything the public website says, in one place. Edit the text, prices and
// contact details here — the page components only lay it out.
//
// Items marked SAMPLE are placeholders written for the design. Replace them
// with real ones (and get a parent's OK before naming a student) before the
// site goes live.

// Phone and email are left empty until the class's real ones are added; the
// site hides the call and email buttons while they are empty.
// What the live site shows. Sample content stays hidden until real content
// replaces it: turn a switch on once its section below has real text.
const LOCAL_PREVIEW = ["localhost", "127.0.0.1"].includes(window.location.hostname);

export const SHOW = {
  // Sample REVIEWS show on the local preview while no real review has been
  // approved yet. Real ones come from the /review form (Admin → Reviews) and
  // show on the live site as soon as the first is approved.
  reviews: LOCAL_PREVIEW,
  classUpdates: false, // CLASS_UPDATES on the hifz page
  rules: true, // RULES page, its links and buttons
  prices: false, // book prices in the store
};

export const CONTACT = {
  phone: "", // dialling format, e.g. "+9607xxxxxx"
  phoneDisplay: "", // shown on the page, e.g. "+960 7xx xxxx"
  email: "",
  location: "Malé, Maldives",
};

export const HERO = {
  studentCount: 100,
  studentLabel: "students learning with us",
};

// Short wins shown in the moving strip under the hero and on the hifz page.
export const CLASS_UPDATES = [ // SAMPLE
  { icon: "flame", text: "3 students on a 10-day streak" },
  { icon: "star", text: "Surah An-Naba memorised" },
  { icon: "book", text: "42 pages memorised by the class this week" },
  { icon: "users", text: "2 new hifz students joined" },
];

export const REVIEWS = [ // SAMPLE
  { name: "Fathimath A.", role: "Parent · Hifz class", text: "My son looks forward to every class. The teachers are so patient with him." },
  { name: "Ahmed M.", role: "Parent · Tajweed", text: "I can see his progress on the portal every day. It keeps me involved." },
  { name: "Mariyam S.", role: "Student · Adults", text: "As an adult beginner I felt welcome from day one. My recitation has improved a lot." },
  { name: "Aishath R.", role: "Parent · Qaida", text: "My daughter started from the letters and now reads on her own. Alhamdulillah." },
];

// Class choices on the review form (/review). The English name is what's
// saved; the website shows the Dhivehi name with it on each review.
export const REVIEW_CLASSES = [
  { en: "Children's Hifz class", dv: "ދަރިވަރުންގެ ހިތުދަސްކުރާ ކުލާސް" },
  { en: "Adults' Hifz class", dv: "ބޮޑެތިމީހުންގެ ހިތުދަސްކުރާ ކުލާސް" },
  { en: "Children's Tajweed class (Tilawa)", dv: "ދަރިވަރުންގެ ތަޖްވީދު ކުލާސް (ތިލާވާ ކުލާސް)" },
  { en: "Adults' Tajweed class (Tilawa)", dv: "ބޮޑެތިމީހުންގެ ތަޖްވީދު ކުލާސް (ތިލާވާ ކުލާސް)" },
];

// The classes, their times and fees are no longer listed here: the admin
// keeps them under Admin → Registrations → Website classes.

export const WHY = [
  { icon: "award", title: "Qualified teachers", text: "Trained teachers who know every student by name." },
  { icon: "chart", title: "Progress you can see", text: "Hifz tracker, streaks and regular exam reports." },
  { icon: "phone", title: "Parent portal", text: "Attendance, fees and updates by SMS, all in one app." },
];

// Rules and regulations page (/rules), from the class's official rules
// document (އަފްލާޙް ޤުރްއާން ކުލާހުގެ އުސޫލުތަކާއި ގަވާއިދުތައް). The Dhivehi is
// the document's own wording and is the official text; the English is a
// translation of it. Each category is one block on the page (with a button in
// the category bar at the top) and each of its cards is one part of that
// section of the document. An item's "term" is shown in bold before its text.
export const RULES = [
  {
    key: "about",
    icon: "book",
    title: { en: "Introduction and purpose", dv: "ތަޢާރަފާއި މަޤްޞަދު" },
    short: { en: "About", dv: "ތަޢާރަފު" },
    cards: [
      {
        items: [
          {
            term: { en: "Purpose", dv: "މަޤްޞަދު" },
            en: "To teach the Holy Quran, teach students to recite it by the rules of tajweed, and bring them up with good Islamic manners.",
            dv: "ކީރިތި ޤުރްއާން އުނގަންނައިދިނުމާއި، ތަޖުވީދުގެ ހަމަތަކާ އެއްގޮތަށް ޤުރްއާން ކިޔަވަން ދަސްކޮށްދިނުމާއި، އިސްލާމީ ރިވެތި އަދަބުތަކަށް ދަރިވަރުން އަހުލުވެރިކުރުވުން.",
          },
          {
            term: { en: "Ages", dv: "ދަރިވަރުންގެ އުމުރުފުރާ" },
            en: "The class is open to people of all ages, children and adults alike.",
            dv: "މި ކުލާހަކީ ހުރިހާ އުމުރުފުރައެއްގެ (ކުޑަކުދިންނާއި ބޮޑެތި މީހުން ހިމެނޭހެން) ފަރާތްތަކަށް ހުޅުވާލެވިފައިވާ ކުލާހެކެވެ.",
          },
        ],
      },
    ],
  },
  {
    key: "joining",
    icon: "join",
    title: { en: "Joining the class", dv: "ކުލާހަށް ދަރިވަރުން ވެއްދުމުގެ އުސޫލު" },
    short: { en: "Joining", dv: "ވެއްދުން" },
    cards: [
      {
        items: [
          {
            en: "A student is accepted once the official admission form has been filled in and signed, agreeing to the class rules.",
            dv: "ކުލާހަށް ދަރިވަރުން ބަލައިގަނެވޭނީ ކުލާހަށް ވަނުމަށް އެދޭ ރަސްމީ ފޯމު ފުރިހަމަކޮށް، ކުލާހުގެ ގަވާއިދުތަކަށް އެއްބަސްވެ ސޮއިކުރުމުންނެވެ.",
          },
          {
            en: "The registration fee set for the student's programme must be paid in full.",
            dv: "ދަރިވަރު ބައިވެރިވާ ޕްރޮގްރާމަކަށް ކަނޑައެޅިފައިވާ ރަޖިސްޓްރޭޝަން ފީ ދައްކައި ޚަލާޞްކުރަންވާނެއެވެ.",
          },
          {
            en: "Students who join after the 15th of a calendar month pay the registration fee and the amount due for that month together, in one payment.",
            dv: "ކޮންމެ މީލާދީ މަހެއްގެ 15 ވަނަ ދުވަހުގެ ފަހުން ގުޅޭ ދަރިވަރުން، ރަޖިސްޓްރޭޝަން ފީއާއެކު އެ މަހުގެ މަހުފީގެ ގޮތުގައި ދައްކަންޖެހޭ މިންވަރު އެއްފަހަރާ ދައްކަންވާނެއެވެ.",
          },
        ],
      },
    ],
  },
  {
    key: "leaving",
    icon: "leave",
    title: { en: "Leaving the class and removal", dv: "ކުލާހުން ވަކިވުމާއި ވަކިކުރުމުގެ އުސޫލު" },
    short: { en: "Leaving", dv: "ވަކިވުން" },
    cards: [
      {
        num: "3.1",
        title: { en: "Leaving by choice", dv: "ދަރިވަރު އަމިއްލައަށް ވަކިވުން" },
        items: [
          {
            en: "To leave the class, fill in the official withdrawal form and hand it in to the office.",
            dv: "ކުލާހުން އަމިއްލައަށް ވަކިވާން އެދޭނަމަ، ރަސްމީ \"ވިތްޑްރޯވަލް ފޯމް\" ފުރިހަމަކޮށް އިދާރާއަށް ހުށަހަޅަންވާނެއެވެ.",
          },
          {
            en: "All fees and money owed by the student must be paid before leaving.",
            dv: "ކުލާހުން ވަކިވުމުގެ ކުރިން، އެ ދަރިވަރަކު ދައްކަންޖެހޭ އެންމެހައި ފީތަކާއި ފައިސާ ދައްކައި ޚަލާޞްކުރަންވާނެއެވެ.",
          },
          {
            en: "To leave from the start of next month, tell the office in writing before the 5th of the current month. If you do not, the student's place is still held for them, so next month's fee must be paid.",
            dv: "ކުރިއަށް އޮތް މަހުން ފެށިގެން ކުލާހުން ވަކިވާން ބޭނުންވާނަމަ، ހިނގާ މަހުގެ 5 ވަނަ ދުވަހުގެ ކުރިން އެކަން ލިޔުމުން އިދާރާއަށް އަންގަންވާނެއެވެ. މި މުއްދަތުގެ ކުރިން ނާންގައިފިނަމަ، އެ ދަރިވަރެއްގެ ޖާގަ ކަށަވަރުކުރެވިފައިވާތީ، ޖެހިގެން އަންނަ މަހުގެ ފީ ދައްކަންޖެހޭނެއެވެ.",
          },
        ],
      },
      {
        num: "3.2",
        title: { en: "When the class may remove a student", dv: "ކުލާހުން ދަރިވަރު ވަކިކުރުން" },
        intro: {
          en: "The class office may remove a student from the class:",
          dv: "އަންނަނިވި ހާލަތްތަކުގައި ދަރިވަރަކު ކުލާހުން ވަކިކުރުމުގެ އިޚްތިޔާރު ކުލާހުގެ އިދާރާއަށް ލިބިގެންވެއެވެ:",
        },
        items: [
          {
            en: "if the student does not improve after being advised 3 (three) times about their behaviour.",
            dv: "ދަރިވަރުގެ އަޚްލާޤީ މައްސަލައަކާ ގުޅިގެން 3 (ތިނެއް) ފަހަރު ނަސޭހަތްތެރިވެ، އިޞްލާޙުނުވެއްޖެނަމަ.",
          },
          {
            en: "if, against the fee rules, money owed is not paid within the set time.",
            dv: "ފީ ދެއްކުމުގެ ގަވާއިދާ ޚިލާފުވެ، ދައްކަންޖެހޭ ފައިސާ ކަނޑައެޅިފައިވާ މުއްދަތުގައި ނުދައްކައިފިނަމަ.",
          },
        ],
      },
    ],
  },
  {
    key: "fees",
    icon: "wallet",
    title: { en: "Fees", dv: "ފީ ދެއްކުމާ ގުޅޭ އުސޫލު" },
    short: { en: "Fees", dv: "ފީ" },
    cards: [
      {
        num: "4.1",
        title: { en: "Monthly fee deadline", dv: "މަހުފީ ދެއްކުމުގެ ސުންގަޑި" },
        items: [
          {
            en: "Each calendar month's fee must be paid by the 15th of that month.",
            dv: "ކޮންމެ މީލާދީ މަހެއްގެ މަހުފީ، އެ މަހެއްގެ 15 ވަނަ ދުވަހުގެ ނިޔަލަށް ދައްކައި ނިންމަންވާނެއެވެ.",
          },
          {
            en: "After the 15th there are at most 5 (five) more days to pay. A fee paid in these days carries an extra fine of MVR 100 (one hundred).",
            dv: "މަހުގެ 15 ގެ ފަހުން ފީ ދެއްކުމަށް ލިބޭނީ ގިނަވެގެން 5 (ފަހެއް) ދުވަހުގެ މުއްދަތެކެވެ. މި މުއްދަތުގައި ފީ ދައްކާނަމަ، ޖޫރިމަނާގެ ގޮތުގައި -/100 (އެއްސަތޭކަ) ރުފިޔާ އިތުރަށް ދައްކަންޖެހޭނެއެވެ.",
          },
          {
            en: "Once this time has passed (the 20th of the month), the class may remove the student and give the place to another student.",
            dv: "މި މުއްދަތު (މަހުގެ 20 ވަނަ ދުވަސް) ފަހަނައަޅައި ދިއުމުން ދަރިވަރު ކުލާހުން ވަކިކޮށް، އެ ޖާގަ އެހެން ދަރިވަރަކަށް ދިނުމުގެ އިޚްތިޔާރު ކުލާހަށް ލިބިގެންވެއެވެ.",
          },
          {
            en: "Even if a student is removed for unpaid fees, the unpaid amount is still a debt the student (or, for a child under 18, the parent) owes the class. Aflaah Quran Class has the full right to recover it through legal means.",
            dv: "ފީ ނުދައްކައިގެން ކުލާހުން ވަކިކުރި ކަމުގައިވިޔަސް، ނުދައްކާ އޮތް ފައިސާއަކީ އެ ދަރިވަރެއް (ނުވަތަ 18 އަހަރުން ދަށުގެ ކުއްޖެއްނަމަ ބެލެނިވެރިޔާ) ކުލާހަށް އަދާކުރަންޖެހޭ ދަރަންޏެކެވެ. މި ފައިސާ ޤާނޫނީ ހަމަތަކުގެ މަތިން ހޯދުމުގެ ފުރިހަމަ އިޚްތިޔާރު އަފްލާޙް ޤުރްއާން ކުލާހަށް ލިބިގެންވެއެވެ.",
          },
        ],
      },
      {
        num: "4.2",
        title: { en: "Joining in the middle of a month", dv: "މަހުގެ މެދުތެރެއިން ވަންނަ ދަރިވަރުންގެ ފީ" },
        items: [
          {
            term: { en: "Joining before the 15th", dv: "މަހުގެ 15 ގެ ކުރިން ގުޅޭ ދަރިވަރުން" },
            en: "pay that month's full monthly fee.",
            dv: "އެ މަހުގެ ފުރިހަމަ މަހުފީ ދައްކަންޖެހޭނެއެވެ.",
          },
          {
            term: { en: "Joining after the 15th", dv: "މަހުގެ 15 ގެ ފަހުން ގުޅޭ ދަރިވަރުން" },
            en: "pay half of that month's monthly fee (half fee).",
            dv: "އެ މަހުގެ މަހުފީގެ ގޮތުގައި ދައްކަންޖެހޭނީ މަހުފީގެ ދެބައިކުޅަ އެއްބަ އެވެ (ބައި ފީ).",
          },
        ],
      },
      {
        num: "4.3",
        title: { en: "Refunds", dv: "ފީ އަނބުރާ ދިނުން (ރީފަންޑް އުސޫލު)" },
        items: [
          {
            en: "A new student who asks to leave within 7 (seven) days of starting (counting weekends and public holidays) has the monthly fee they paid refunded.",
            dv: "އަލަށް ކިޔެވުން ފަށާ ދަރިވަރަކު، ކިޔަވަން ފަށާތާ 7 (ހަތެއް) ދުވަހުގެ ތެރޭގައި (ރަސްމީ އަދި ސަރުކާރު ބަންދު ދުވަސްތައް ހިމެނޭހެން) ވަކިވާން އެދިއްޖެނަމަ، އެ ދަރިވަރަކު ދެއްކި މަހުފީ އަނބުރާ ރީފަންޑް ކޮށްދެވޭނެއެވެ.",
          },
          {
            en: "After those 7 days, and in any other case, no fee paid to the class is refunded.",
            dv: "މި ބަޔާންކުރެވުނު 7 ދުވަހުގެ މުއްދަތު ހަމަވުމަށްފަހު، އަދި އެނޫން އެއްވެސް ހާލަތެއްގައި ކުލާހަށް ދައްކާފައިވާ އެއްވެސް ފީއެއް އަނބުރާ ރީފަންޑް ކޮށެއް ނުދެވޭނެއެވެ.",
          },
        ],
      },
    ],
  },
];

// The dates to remember, shown above the rules. Their words are in
// siteStrings.js (rules.date.<key>.*).
export const RULE_DATES = [
  { key: "leave", n: "5" },
  { key: "due", n: "15" },
  { key: "late", n: "20" },
  { key: "refund", n: "7" },
];

export const BOOK_CATEGORIES = ["All", "Qaida", "Mushaf", "Tajweed", "Kids"];

export const BOOKS = [ // SAMPLE titles and prices (MVR)
  { id: "qaida", title: "Noorani Qaida", category: "Qaida", price: 85, color: "#0D4F85" },
  { id: "tajweed-guide", title: "Tajweed guide", category: "Tajweed", price: 120, color: "#0A94B1" },
  { id: "mushaf-hafs", title: "Mushaf (Hafs)", category: "Mushaf", price: 250, color: "#123B67" },
  { id: "juz-amma", title: "Juz Amma workbook", category: "Kids", price: 60, color: "#18A9BD" },
  { id: "pocket-mushaf", title: "Pocket mushaf", category: "Mushaf", price: 150, color: "#0875A2" },
  { id: "duas-kids", title: "Daily duas for kids", category: "Kids", price: 55, color: "#176FD1" },
];

// Sample student shown in the portal preview on the hifz page.
export const PORTAL_SAMPLE = {
  streak: 12,
  percent: 4.2,
  ayahs: 262,
  surahs: 18,
  pagesThisWeek: 5,
};
