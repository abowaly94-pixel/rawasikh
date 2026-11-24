import banks from "@/data/level-assessment/bank_public_no_keys.json";

export interface BankSub {
  id: string;
  main: string;
  name: string;
  [key: string]: unknown;
}

export interface PublicQuestion {
  question_id: string;
  sub_code: string;
  difficulty_level: number;
  stem: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
}

export interface PublicBank {
  skill_code: string;
  skill_name: string;
  subs: BankSub[];
  questions: PublicQuestion[];
}

type RawQuestion = Omit<PublicQuestion, "difficulty_level">;
type RawBank = Omit<PublicBank, "questions"> & { questions: RawQuestion[] };

/**
 * The public JSON does not include difficulty_level (it is only in the
 * confidential bank). The level is encoded in the question id, e.g.
 * "COM-L3-C2-04" => difficulty level 3.
 */
const levelFromId = (questionId: string): number => {
  const match = /-L(\d)-/.exec(questionId);
  return match ? Number(match[1]) : 1;
};

export const publicBanks: PublicBank[] = (banks as RawBank[]).map((bank) => ({
  ...bank,
  questions: bank.questions.map((question) => ({
    ...question,
    difficulty_level: levelFromId(question.question_id),
  })),
}));
