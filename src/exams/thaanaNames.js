// Writes a student's name (typed in English letters) in Thaana for the
// Dhivehi report. Common Maldivian names use their usual spelling; any other
// word is spelled out sound by sound. The admin corrects a name under
// Admin → Language when it comes out wrong.

const KNOWN = {
  mohamed: "މުޙައްމަދު", muhammad: "މުޙައްމަދު", mohammed: "މުޙައްމަދު", mohamad: "މުޙައްމަދު", muhammed: "މުޙައްމަދު",
  ahmed: "އަޙްމަދު", ahmad: "އަޙްމަދު",
  ali: "ޢަލީ", ibrahim: "އިބްރާހީމް", ibraheem: "އިބްރާހީމް",
  hassan: "ޙަސަން", hasan: "ޙަސަން", hussain: "ޙުސައިން", husain: "ޙުސައިން", hussein: "ޙުސައިން",
  abdulla: "ޢަބްދުﷲ", abdullah: "ޢަބްދުﷲ", abdul: "ޢަބްދުލް",
  aishath: "ޢައިޝަތު", aisha: "ޢާއިޝާ", aishaa: "ޢާއިޝާ",
  fathimath: "ފާޠިމަތު", fathima: "ފާޠިމާ", fatima: "ފާޠިމާ",
  mariyam: "މަރިޔަމް", mariam: "މަރިޔަމް", maryam: "މަރިޔަމް",
  aminath: "އާމިނަތު", amina: "އާމިނާ", hawwa: "ޙައްވާ", hawa: "ޙައްވާ",
  khadeeja: "ޚަދީޖާ", khadija: "ޚަދީޖާ", zainab: "ޒައިނަބު", zaynab: "ޒައިނަބު",
  yoosuf: "ޔޫސުފް", yusuf: "ޔޫސުފް", ismail: "އިސްމާޢީލް", adam: "އާދަމް",
  moosa: "މޫސާ", musa: "މޫސާ", haroon: "ހާރޫން", umar: "ޢުމަރު", omar: "ޢުމަރު",
  usman: "ޢުސްމާން", uthman: "ޢުސްމާން", rasheed: "ރަޝީދު", shareef: "ޝަރީފް",
  saeed: "ސަޢީދު", naseer: "ނަޞީރު", hameed: "ޙަމީދު", waheed: "ވަޙީދު", zahir: "ޒާހިރު",
  haathim: "ހާތިމް", hatim: "ހާތިމް", rahman: "ރަޙްމާން", rahmaan: "ރަޙްމާން",
  yahya: "ޔަޙްޔާ", sulaiman: "ސުލައިމާން", ilyas: "އިލްޔާސް", idrees: "އިދްރީސް",
  naeem: "ނަޢީމް", anas: "އަނަސް", eesa: "ޢީސާ", isa: "ޢީސާ", yaseen: "ޔާސީން",
  shaaha: "ޝާހާ", nishanaa: "ނިޝާނާ", hana: "ހަނާ", hanaa: "ހަނާ", shifa: "ޝިފާ", shifaa: "ޝިފާ",
  aflaah: "އަފްލާޙް", easa: "ޢީސާ", aaisha: "ޢާއިޝާ", hamza: "ޙަމްޒާ", hamzah: "ޙަމްޒާ", zaid: "ޒައިދު", zayd: "ޒައިދު", ayaan: "އަޔާން", ayan: "އަޔާން",
};

const CONSONANTS = [
  ["sh", "ޝ"], ["dh", "ދ"], ["th", "ތ"], ["lh", "ޅ"], ["kh", "ޚ"], ["gh", "ޣ"], ["ch", "ޗ"],
  ["h", "ހ"], ["n", "ނ"], ["r", "ރ"], ["b", "ބ"], ["k", "ކ"], ["v", "ވ"], ["w", "ވ"], ["m", "މ"],
  ["f", "ފ"], ["l", "ލ"], ["g", "ގ"], ["s", "ސ"], ["d", "ޑ"], ["z", "ޒ"], ["t", "ޓ"], ["y", "ޔ"],
  ["p", "ޕ"], ["j", "ޖ"], ["q", "ޤ"], ["c", "ކ"], ["x", "ކްސ"],
];
const VOWELS = [
  ["aa", "ާ"], ["ee", "ީ"], ["ea", "ީ"], ["oo", "ޫ"], ["oa", "ޯ"], ["ey", "ޭ"], ["ai", "ައި"], ["au", "ައު"],
  ["a", "ަ"], ["i", "ި"], ["u", "ު"], ["e", "ެ"], ["o", "ޮ"],
];
const SUKUN = "ް";
const ALIFU = "އ";

const match = (list, word, i) => list.find(([latin]) => word.startsWith(latin, i));

function spellWord(word) {
  let out = "";
  let i = 0;
  while (i < word.length) {
    const vowel = match(VOWELS, word, i);
    if (vowel) { out += ALIFU + vowel[1]; i += vowel[0].length; continue; }
    const cons = match(CONSONANTS, word, i);
    if (!cons) { i += 1; continue; }
    i += cons[0].length;
    // A doubled letter (hassan, mm) is written once.
    if (word.startsWith(cons[0], i) && !match(VOWELS, word, i)) i += cons[0].length;
    // A final y after a consonant sounds like ee (Ruby); a final a is long (Hamza).
    if (word[i] === "y" && i === word.length - 1) { out += cons[1] + "ީ"; i += 1; continue; }
    if (word[i] === "a" && i === word.length - 1) { out += cons[1] + "ާ"; i += 1; continue; }
    const next = match(VOWELS, word, i);
    if (next) { out += cons[1] + next[1]; i += next[0].length; } else out += cons[1] + SUKUN;
  }
  return out;
}

export function nameToThaana(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .map((w) => {
      const key = w.toLowerCase().replace(/[^a-z]/g, "");
      if (!key) return w;
      return KNOWN[key] || spellWord(key);
    })
    .join(" ");
}
