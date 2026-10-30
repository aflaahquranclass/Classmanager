// Today's date in the Maldives, whatever the device's own clock zone is, so
// payments, fees and attendance land on the same day and month as the
// database (which uses Indian/Maldives too).

const MV_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Indian/Maldives", year: "numeric", month: "2-digit", day: "2-digit" });

// "2026-10-29"
export const maldivesToday = () => MV_DAY.format(new Date());

// "2026-10"
export const maldivesMonth = () => maldivesToday().slice(0, 7);
