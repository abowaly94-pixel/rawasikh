/**
 * Supabase Edge Function: level-assessment-grade
 *
 * Self-contained: the confidential key (compressed, base64) is embedded
 * below because the Supabase Dashboard only deploys index.ts.
 * Source: bank_backend_ALL_KEYS_CONFIDENTIAL.json (never expose publicly).
 */

type Bank = {
  c: string;
  n: string;
  s: { i: string; n: string; p: string; r1: string; r2: string; r3: string }[];
  q: [string, string, number, number, string][];
};

const BANKS_GZIP_B64 =
  "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";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });

const LEVELS: [number, number, string, string][] = [
  [0, 39, "مبتدئ", "معرفة محدودة ويحتاج إلى تعلم الأساسيات"],
  [40, 54, "نامٍ", "يمتلك معرفة أولية ويحتاج إلى مزيد من التطبيق"],
  [55, 69, "متوسط", "يفهم المهارة ويطبقها في المواقف المعتادة"],
  [70, 84, "متقدم", "يطبق المهارة بكفاءة في مواقف متنوعة"],
  [85, 100, "محترف", "يتقن المهارة ويوظفها ويستطيع توجيه الآخرين"],
];
const STRENGTH_MIN = 70;
const DEVELOP_MAX = 54;
const MIN_ANSWERED = 0.8;

type RequestBody = {
  skill_code: string;
  form: string[];
  answers: Record<string, string>;
};

let banksPromise: Promise<Bank[]> | null = null;

async function loadBanks(): Promise<Bank[]> {
  if (!banksPromise) {
    banksPromise = (async () => {
      const binary = Uint8Array.from(atob(BANKS_GZIP_B64), (c) => c.charCodeAt(0));
      const stream = new Blob([binary]).stream().pipeThrough(new DecompressionStream("gzip"));
      return JSON.parse(await new Response(stream).text()) as Bank[];
    })();
  }
  return banksPromise;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const body: RequestBody = await req.json();
    const banks = await loadBanks();
    const target = banks.find((b) => b.c === body.skill_code);
    if (!target) return json({ error: "skill not found" }, 404);
    if (!Array.isArray(body.form) || body.form.length === 0) {
      return json({ error: "empty form" }, 400);
    }

    const questions = new Map(
      target.q.map(([id, sub, lvl, pts, correct]) => [id, { sub, lvl, pts, correct }]),
    );

    let total = 0;
    let answered = 0;
    const perSub = new Map<string, { earned: number; max: number; missedLevels: number[] }>();

    for (const qid of body.form) {
      const q = questions.get(qid);
      if (!q) continue;
      const ans = body.answers?.[qid];
      let s = perSub.get(q.sub);
      if (!s) {
        s = { earned: 0, max: 0, missedLevels: [] };
        perSub.set(q.sub, s);
      }
      s.max += q.pts;
      if (ans) answered++;
      if (ans === q.correct) {
        total += q.pts;
        s.earned += q.pts;
      } else {
        s.missedLevels.push(q.lvl);
      }
    }

    const pct = Math.round(total);
    const level = LEVELS.find((l) => pct >= l[0] && pct <= l[1]) ?? LEVELS[0];

    const subReport: { sub_code: string; name: string; score_pct: number; recommendation?: string }[] = [];
    const strengths: string[] = [];
    const development: string[] = [];
    const training: string[] = [];

    for (const code of Array.from(perSub.keys()).sort()) {
      const s = perSub.get(code)!;
      const sp = s.max ? Math.round((100 * s.earned) / s.max) : 0;
      const info = target.s.find((x) => x.i === code);
      if (!info) continue;
      const entry: { sub_code: string; name: string; score_pct: number; recommendation?: string } = {
        sub_code: code,
        name: info.n,
        score_pct: sp,
      };
      if (sp >= STRENGTH_MIN) strengths.push(info.n);
      if (sp <= DEVELOP_MAX) {
        development.push(info.n);
        training.push(info.p);
      }
      if (s.missedLevels.length) {
        const lowest = Math.min(...s.missedLevels);
        entry.recommendation = lowest <= 2 ? info.r1 : lowest === 3 ? info.r2 : info.r3;
      }
      subReport.push(entry);
    }

    return json({
      skill: target.n,
      score: pct,
      level: level[2],
      level_description: level[3],
      completion_flag:
        answered / body.form.length >= MIN_ANSWERED
          ? "مكتملة"
          : "نتيجة غير مكتملة - يُنصح بإعادة التقييم",
      competencies: subReport,
      strengths,
      development_areas: development,
      skills_needing_training: development,
      training_recommendations: training,
    });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
