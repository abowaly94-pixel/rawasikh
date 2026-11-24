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
  question_type: string;
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

export const publicBanks: PublicBank[] = banks as PublicBank[];
