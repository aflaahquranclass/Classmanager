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
  rules: false, // RULES page, its links and buttons
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

// The classes, their times and fees are no longer listed here: the website
// shows the classes the admin offers under Admin → Classes ("Show on the
// website").

export const WHY = [
  { icon: "award", title: "Qualified teachers", text: "Trained teachers who know every student by name." },
  { icon: "chart", title: "Progress you can see", text: "Hifz tracker, streaks and regular exam reports." },
  { icon: "phone", title: "Parent portal", text: "Attendance, fees and updates by SMS, all in one app." },
];

// Rules and regulations page (/rules). Each group is one card.
export const RULES = [ // SAMPLE — replace with the class's own rules
  {
    title: "Attendance",
    icon: "clock",
    items: [
      "Arrive on time. Students more than 10 minutes late are marked late.",
      "Inform the teacher before any absence.",
      "Three absences in a row without notice will be followed up with parents.",
    ],
  },
  {
    title: "In class",
    icon: "book",
    items: [
      "Come with wudu and bring your own mushaf or book.",
      "Dress modestly and neatly.",
      "Mobile phones stay switched off or with the teacher during class.",
      "Treat teachers and classmates with respect and good manners.",
    ],
  },
  {
    title: "Hifz and revision",
    icon: "list",
    items: [
      "Complete the daily lesson and revision set in the student portal.",
      "Recite the new lesson to the teacher before moving on.",
      "Exams are held regularly. Results are shared with parents.",
    ],
  },
  {
    title: "Fees",
    icon: "wallet",
    items: [
      "Monthly fees are due by the 10th of each month.",
      "Upload the bank transfer slip in the student portal after paying.",
      "Fees are not refunded for missed classes.",
    ],
  },
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
