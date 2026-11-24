"""
مرجع برمجي (Reference Implementation) لمنطق اختيار الأسئلة والتصحيح وإنتاج التقرير.
- يقرأ ملف Excel لأي فن مباشرة (يحتاج openpyxl).
- مكتوب بلغة Python لتوضيح المنطق؛ يمكن لمهندس الموقع نقله إلى أي لغة (PHP/Node/.NET).
- لا يحتوي على أي عشوائية في احتساب الدرجات؛ العشوائية فقط في اختيار السؤال داخل كل خلية، وهي قابلة لإعادة الإنتاج عبر البذرة attempt_id.

الاستخدام التجريبي:
    python scoring_reference.py "بنك أسئلة فن التواصل الفعّال.xlsx"
"""
import random
import sys
from collections import defaultdict
from openpyxl import load_workbook

LEVELS = [  # (الحد الأدنى %, الحد الأعلى %, المستوى, الوصف) — من سلم المستويات المعتمد
    (0, 39, "مبتدئ", "معرفة محدودة ويحتاج إلى تعلم الأساسيات"),
    (40, 54, "نامٍ", "يمتلك معرفة أولية ويحتاج إلى مزيد من التطبيق"),
    (55, 69, "متوسط", "يفهم المهارة ويطبقها في المواقف المعتادة"),
    (70, 84, "متقدم", "يطبق المهارة بكفاءة في مواقف متنوعة"),
    (85, 100, "محترف", "يتقن المهارة ويوظفها ويستطيع توجيه الآخرين"),
]
STRENGTH_MIN = 70      # نسبة الكفاءة التي تُعد نقطة قوة
DEVELOP_MAX = 54       # نسبة الكفاءة التي تُعد جانب تطوير (أقل من 55)
MIN_ANSWERED = 0.80    # حد اكتمال المحاولة


def load_bank(path):
    wb = load_workbook(path, data_only=True)
    bank = wb["بنك الأسئلة"]
    key = wb["مفتاح الإجابة والتصحيح"]
    fw = wb["إطار الكفاءات"]
    rec = wb["التوصيات التطويرية"]
    hdr = [c.value for c in bank[1]]
    questions = {}
    for row in bank.iter_rows(min_row=2, values_only=True):
        if not row[0]:
            continue
        q = dict(zip(hdr, row))
        questions[q["Question_ID"]] = q
    for row in key.iter_rows(min_row=2, values_only=True):
        if row[0] in questions:
            questions[row[0]]["correct"] = row[3]
    subs = {}
    for row in fw.iter_rows(min_row=2, max_row=6, values_only=True):
        subs[row[0]] = {"name": row[2], "main": row[1], "weight": row[9]}
    for row in rec.iter_rows(min_row=2, max_row=6, values_only=True):
        subs[row[0]].update(weak=row[2], rec1=row[3], rec2=row[4], rec3=row[5], programs=row[6])
    paths = {}
    for row in rec.iter_rows(min_row=9, values_only=True):
        if isinstance(row[0], int):
            paths[row[0]] = row[2]
    return questions, subs, paths


def select_form(questions, attempt_id, seen_ids=frozenset(), exposure=None):
    """سؤال واحد من كل خلية (كفاءة فرعية × مستوى صعوبة) = 25 سؤالاً.
    الأولوية: ما لم يره الزائر سابقاً، ثم الأقل ظهوراً، ثم اختيار عشوائي ثابت بالبذرة."""
    exposure = exposure or {}
    rng = random.Random(str(attempt_id))
    cells = defaultdict(list)
    for q in questions.values():
        if q.get("Status", "Active") == "Active":
            cells[(q["Sub_Code"], q["Level_No"])].append(q["Question_ID"])
    form = []
    for cell in sorted(cells):
        pool = cells[cell]
        unseen = [x for x in pool if x not in seen_ids] or pool
        min_exp = min(exposure.get(x, 0) for x in unseen)
        candidates = [x for x in unseen if exposure.get(x, 0) == min_exp]
        form.append(rng.choice(sorted(candidates)))
    rng.shuffle(form)  # ترتيب العرض فقط
    return form


def score(questions, subs, paths, form, answers, skill_name):
    """answers: dict {question_id: 'A'|'B'|'C'|'D'|None}"""
    total = 0
    answered = 0
    per_sub = defaultdict(lambda: {"earned": 0, "max": 0, "missed_levels": []})
    for qid in form:
        q = questions[qid]
        pts = int(q["الدرجة"])
        ans = answers.get(qid)
        s = per_sub[q["Sub_Code"]]
        s["max"] += pts
        if ans:
            answered += 1
        if ans == q["correct"]:
            total += pts
            s["earned"] += pts
        else:  # الخطأ وعدم الإجابة يُعاملان معاملة واحدة في التحليل
            s["missed_levels"].append(int(q["Level_No"]))
    pct = round(total)  # الدرجة النهائية من 100 = النسبة المئوية
    level = next(l for l in LEVELS if l[0] <= pct <= l[1])
    level_no = LEVELS.index(level) + 1
    sub_report, strengths, development, training = [], [], [], []
    for code in sorted(per_sub):
        s = per_sub[code]
        sp = round(100 * s["earned"] / s["max"]) if s["max"] else 0
        info = subs[code]
        sub_report.append({"sub_code": code, "name": info["name"], "score_pct": sp})
        if sp >= STRENGTH_MIN:
            strengths.append(info["name"])
        if sp <= DEVELOP_MAX:
            development.append(info["name"])
            training.append(info["programs"])
        # توصية مرتبطة بأدنى مستوى صعوبة أخفق فيه الزائر داخل الكفاءة
        if s["missed_levels"]:
            lowest = min(s["missed_levels"])
            tip = info["rec1"] if lowest <= 2 else (info["rec2"] if lowest == 3 else info["rec3"])
            sub_report[-1]["recommendation"] = tip
    return {
        "skill": skill_name,
        "score": pct,
        "level": level[2],
        "level_description": level[3],
        "completion_flag": "مكتملة" if answered / len(form) >= MIN_ANSWERED else "نتيجة غير مكتملة - يُنصح بإعادة التقييم",
        "competencies": sub_report,
        "strengths": strengths,
        "development_areas": development,
        "skills_needing_training": development,
        "training_recommendations": training,
        "development_path": paths.get(level_no),
    }


if __name__ == "__main__":
    path = sys.argv[1]
    questions, subs, paths = load_bank(path)
    form = select_form(questions, attempt_id="demo-001")
    assert len(form) == 25
    assert sum(int(questions[q]["الدرجة"]) for q in form) == 100
    rng = random.Random(7)
    demo_answers = {q: (questions[q]["correct"] if rng.random() < 0.7 else rng.choice("ABCD")) for q in form}
    import json
    print(json.dumps(score(questions, subs, paths, form, demo_answers, questions[form[0]]["اسم الفن"]), ensure_ascii=False, indent=2))
