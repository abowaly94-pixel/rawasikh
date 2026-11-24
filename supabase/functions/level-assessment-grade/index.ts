/**
 * Supabase Edge Function: level-assessment-grade
 * Receives a selected form (25 questions) + answers, grades against the
 * confidential bank, and returns a level report.
 */

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

type ConfidentialQuestion = {
  question_id: string;
  sub_code: string;
  difficulty_level: number;
  question_type: string;
  stem: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  points: number;
  correct_option: string;
};

type ConfidentialSub = {
  id: string;
  main: string;
  name: string;
  weak: string;
  rec1: string;
  rec2: string;
  rec3: string;
  prog: string;
};

type ConfidentialBank = {
  skill_code: string;
  skill_name: string;
  subs: ConfidentialSub[];
  questions: ConfidentialQuestion[];
};

type RequestBody = {
  skill_code: string;
  form: string[];
  answers: Record<string, string>;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }
  try {
    const body: RequestBody = await req.json();
    const text = await Deno.readTextFile(
      new URL("./bank_backend_ALL_KEYS_CONFIDENTIAL.json", import.meta.url),
    );
    const bank = JSON.parse(text) as ConfidentialBank[];
    const target = bank.find((b) => b.skill_code === body.skill_code);
    if (!target) {
      return new Response(JSON.stringify({ error: "skill not found" }), { status: 404 });
    }

    const questions = new Map(target.questions.map((q) => [q.question_id, q]));
    const subs = new Map(target.subs.map((s) => [s.id, s]));

    let total = 0;
    let answered = 0;
    const perSub = new Map<string, { earned: number; max: number; missedLevels: number[] }>();

    for (const qid of body.form) {
      const q = questions.get(qid);
      if (!q) continue;
      const pts = q.points;
      const ans = body.answers[qid];
      let s = perSub.get(q.sub_code);
      if (!s) {
        s = { earned: 0, max: 0, missedLevels: [] };
        perSub.set(q.sub_code, s);
      }
      s.max += pts;
      if (ans) answered++;
      if (ans === q.correct_option) {
        total += pts;
        s.earned += pts;
      } else {
        s.missedLevels.push(q.difficulty_level);
      }
    }

    const pct = Math.round(total);
    const level = LEVELS.find((l) => pct >= l[0] && pct <= l[1])!;
    const levelNo = LEVELS.indexOf(level) + 1;

    const subReport: { sub_code: string; name: string; score_pct: number; recommendation?: string }[] = [];
    const strengths: string[] = [];
    const development: string[] = [];
    const training: string[] = [];

    for (const code of Array.from(perSub.keys()).sort()) {
      const s = perSub.get(code)!;
      const sp = s.max ? Math.round((100 * s.earned) / s.max) : 0;
      const info = subs.get(code);
      if (!info) continue;
      subReport.push({ sub_code: code, name: info.name, score_pct: sp });
      if (sp >= STRENGTH_MIN) strengths.push(info.name);
      if (sp <= DEVELOP_MAX) {
        development.push(info.name);
        training.push(info.prog);
      }
      if (s.missedLevels.length) {
        const lowest = Math.min(...s.missedLevels);
        const tip = lowest <= 2 ? info.rec1 : lowest === 3 ? info.rec2 : info.rec3;
        subReport[subReport.length - 1].recommendation = tip;
      }
    }

    const report = {
      skill: target.skill_name,
      score: pct,
      level: level[2],
      level_description: level[3],
      completion_flag: answered / body.form.length >= MIN_ANSWERED ? "مكتملة" : "نتيجة غير مكتملة - يُنصح بإعادة التقييم",
      competencies: subReport,
      strengths,
      development_areas: development,
      skills_needing_training: development,
      training_recommendations: training,
    };

    return new Response(JSON.stringify(report), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
