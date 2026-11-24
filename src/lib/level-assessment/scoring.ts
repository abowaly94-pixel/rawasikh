import { createRng } from "./rng";
import type { PublicQuestion } from "./banks";

/**
 * Selects one question per cell (sub_code + difficulty_level) = 25 questions.
 * Priority: questions the visitor hasn't seen, then the least seen, then
 * random selection with a stable seed per attempt_id.
 */
export function selectForm(
  questions: PublicQuestion[],
  attemptId: string,
  seenIds: Set<string> = new Set(),
  exposure: Record<string, number> = {},
): string[] {
  const rng = createRng(attemptId);
  const cells = new Map<string, string[]>();
  for (const q of questions) {
    const key = `${q.sub_code}-${q.difficulty_level}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key)!.push(q.question_id);
  }
  const form: string[] = [];
  for (const pool of cells.values()) {
    const unseen = pool.filter((x) => !seenIds.has(x));
    const source = unseen.length ? unseen : pool;
    const minExp = Math.min(...source.map((x) => exposure[x] ?? 0));
    const candidates = source
      .filter((x) => (exposure[x] ?? 0) === minExp)
      .sort();
    form.push(rng.choice(candidates));
  }
  return rng.shuffle(form);
}
