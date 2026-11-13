import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";

export interface MatchPair {
  left: string;
  right: string;
}

interface Props {
  pairs: MatchPair[];
  onChange: (pairs: MatchPair[]) => void;
}

const MatchingPairsEditor = ({ pairs, onChange }: Props) => {
  // Internal state: independent columns + mapping from left index -> right index
  const [lefts, setLefts] = useState<string[]>([]);
  const [rights, setRights] = useState<string[]>([]);
  const [matches, setMatches] = useState<Record<number, number>>({});
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from incoming pairs once (when editing an existing question)
  useEffect(() => {
    if (hydrated) return;
    if (!pairs || pairs.length === 0) {
      setLefts(["", ""]);
      setRights(["", ""]);
      setMatches({});
      setHydrated(true);
      return;
    }
    const ls = pairs.map((p) => p.left || "");
    // Build unique non-empty rights preserving order
    const rs: string[] = [];
    pairs.forEach((p) => {
      if (p.right && !rs.includes(p.right)) rs.push(p.right);
    });
    if (rs.length === 0) rs.push("", "");
    const m: Record<number, number> = {};
    pairs.forEach((p, i) => {
      const idx = rs.indexOf(p.right);
      if (idx >= 0) m[i] = idx;
    });
    setLefts(ls);
    setRights(rs);
    setMatches(m);
    setHydrated(true);
  }, [pairs, hydrated]);

  // Emit pairs whenever internal state changes
  const emit = (l: string[], r: string[], m: Record<number, number>) => {
    const out: MatchPair[] = l.map((leftText, i) => ({
      left: leftText,
      right: m[i] != null ? r[m[i]] || "" : "",
    }));
    onChange(out);
  };

  const updateLeft = (i: number, val: string) => {
    const next = [...lefts];
    next[i] = val;
    setLefts(next);
    emit(next, rights, matches);
  };
  const updateRight = (i: number, val: string) => {
    const next = [...rights];
    next[i] = val;
    setRights(next);
    emit(lefts, next, matches);
  };
  const addLeft = () => {
    const next = [...lefts, ""];
    setLefts(next);
    emit(next, rights, matches);
  };
  const addRight = () => {
    const next = [...rights, ""];
    setRights(next);
    emit(lefts, next, matches);
  };
  const removeLeft = (i: number) => {
    const next = lefts.filter((_, idx) => idx !== i);
    const newMatches: Record<number, number> = {};
    Object.entries(matches).forEach(([k, v]) => {
      const ki = Number(k);
      if (ki < i) newMatches[ki] = v;
      else if (ki > i) newMatches[ki - 1] = v;
    });
    setLefts(next);
    setMatches(newMatches);
    emit(next, rights, newMatches);
  };
  const removeRight = (i: number) => {
    const next = rights.filter((_, idx) => idx !== i);
    const newMatches: Record<number, number> = {};
    Object.entries(matches).forEach(([k, v]) => {
      if (v === i) return; // unset
      if (v > i) newMatches[Number(k)] = v - 1;
      else newMatches[Number(k)] = v;
    });
    setRights(next);
    setMatches(newMatches);
    emit(lefts, next, newMatches);
  };
  const setMatch = (leftIdx: number, rightIdx: number) => {
    const next = { ...matches, [leftIdx]: rightIdx };
    setMatches(next);
    emit(lefts, rights, next);
  };

  return (
    <div className="space-y-3">
      <Label>أزواج التوصيل</Label>
      <div className="grid grid-cols-2 gap-4">
        {/* Right column input list (column 2) shown on the LEFT for RTL emphasis - swap by language? Keep semantic order */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">العمود الأول (يمين)</span>
            <Button type="button" variant="outline" size="sm" onClick={addLeft}>
              <Plus className="h-3 w-3 ml-1" /> صف
            </Button>
          </div>
          {lefts.map((text, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}.</span>
              <Input
                value={text}
                onChange={(e) => updateLeft(i, e.target.value)}
                placeholder={`العنصر ${i + 1}`}
              />
              <Select
                value={matches[i] != null ? String(matches[i]) : ""}
                onValueChange={(v) => setMatch(i, Number(v))}
              >
                <SelectTrigger className="w-20 shrink-0">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {rights.map((_, ri) => (
                    <SelectItem key={ri} value={String(ri)}>
                      {ri + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {lefts.length > 1 && (
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={() => removeLeft(i)}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">العمود الثاني (شمال)</span>
            <Button type="button" variant="outline" size="sm" onClick={addRight}>
              <Plus className="h-3 w-3 ml-1" /> صف
            </Button>
          </div>
          {rights.map((text, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}.</span>
              <Input
                value={text}
                onChange={(e) => updateRight(i, e.target.value)}
                placeholder={`ما يقابله ${i + 1}`}
              />
              {rights.length > 1 && (
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={() => removeRight(i)}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        أضف الصفوف في العمودين بشكل مستقل، ثم من القائمة جنب كل صف في العمود الأول اختار رقم الصف المقابل له في العمود الثاني (الإجابة الصحيحة).
      </p>
    </div>
  );
};

export default MatchingPairsEditor;
