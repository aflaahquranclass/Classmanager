// Teacher-planned Hifz: loads a student's data from a repo (taskRepos.js) and
// summarises it (tasks.js) for the student and teacher screens.

import { maldivesToday } from "../dates.js";
import { summarizeHifz, legacyProfile } from "./tasks.js";

// The teacher's profile, or — until the teacher saves one — the starting
// point from the student's old self-made plan.
export async function loadHifz(repo, today = maldivesToday()) {
  const [saved, tasks, mistakes] = await Promise.all([repo.getProfile(), repo.listTasks(), repo.listMistakes()]);
  const profile = saved || legacyProfile(await repo.getLegacy().catch(() => null));
  return summarizeHifz({ profile, tasks, mistakes }, today);
}
