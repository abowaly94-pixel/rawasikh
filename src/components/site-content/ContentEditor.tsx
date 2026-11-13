import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ChevronDown, ChevronLeft } from "lucide-react";

type Value = string | number | boolean | Value[] | { [k: string]: Value };

interface Props {
  label?: string;
  path?: string;
  value: Value;
  onChange: (next: Value) => void;
  defaultValue: Value;
  level?: number;
}

const isPlainObject = (v: any): v is Record<string, Value> =>
  v !== null && typeof v === "object" && !Array.isArray(v);

const ContentEditor = ({ label, value, onChange, defaultValue, level = 0 }: Props) => {
  const [open, setOpen] = useState(level < 1);

  // Use default value's type as authoritative shape
  const tmpl = defaultValue ?? value;

  // String
  if (typeof tmpl === "string") {
    const v = (typeof value === "string" ? value : (tmpl as string)) ?? "";
    const long = v.length > 80 || (tmpl as string).length > 80;
    return (
      <div className="space-y-1.5">
        {label && <Label className="text-sm">{label}</Label>}
        {long ? (
          <Textarea
            value={v}
            onChange={(e) => onChange(e.target.value)}
            rows={Math.min(8, Math.max(2, Math.ceil(v.length / 80)))}
          />
        ) : (
          <Input value={v} onChange={(e) => onChange(e.target.value)} />
        )}
      </div>
    );
  }

  // Number
  if (typeof tmpl === "number") {
    return (
      <div className="space-y-1.5">
        {label && <Label className="text-sm">{label}</Label>}
        <Input
          type="number"
          value={typeof value === "number" ? value : (tmpl as number)}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
    );
  }

  // Array
  if (Array.isArray(tmpl)) {
    const arr = Array.isArray(value) ? value : (tmpl as Value[]);
    const itemTemplate = (tmpl as Value[])[0] ?? "";
    const isStringArr = typeof itemTemplate === "string";
    const addItem = () => {
      const next = [...arr];
      // deep clone template
      next.push(JSON.parse(JSON.stringify(itemTemplate)));
      onChange(next);
    };
    const removeItem = (i: number) => {
      const next = arr.filter((_, idx) => idx !== i);
      onChange(next);
    };
    const updateItem = (i: number, v: Value) => {
      const next = [...arr];
      next[i] = v;
      onChange(next);
    };
    return (
      <div className="space-y-2 border-r-2 border-primary/20 pr-3">
        <div className="flex items-center justify-between">
          {label && (
            <button
              type="button"
              className="flex items-center gap-1 text-sm font-semibold text-foreground hover:text-primary"
              onClick={() => setOpen((o) => !o)}
            >
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              {label} <span className="text-xs text-muted-foreground">({arr.length})</span>
            </button>
          )}
          {open && (
            <Button type="button" size="sm" variant="outline" onClick={addItem} className="gap-1 h-7">
              <Plus className="h-3 w-3" /> إضافة
            </Button>
          )}
        </div>
        {open && (
          <div className="space-y-3">
            {arr.map((item, i) => (
              <div
                key={i}
                className={`rounded-md ${isStringArr ? "" : "border border-border p-3 bg-muted/30"}`}
              >
                {isStringArr ? (
                  <div className="flex gap-2 items-start">
                    <div className="flex-1">
                      <ContentEditor
                        value={item}
                        onChange={(v) => updateItem(i, v)}
                        defaultValue={itemTemplate}
                        level={level + 1}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(i)}
                      className="text-destructive shrink-0 mt-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium">عنصر #{i + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(i)}
                        className="text-destructive gap-1 h-7"
                      >
                        <Trash2 className="h-3 w-3" /> حذف
                      </Button>
                    </div>
                    <ContentEditor
                      value={item}
                      onChange={(v) => updateItem(i, v)}
                      defaultValue={itemTemplate}
                      level={level + 1}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Object
  if (isPlainObject(tmpl)) {
    const obj = isPlainObject(value) ? value : (tmpl as Record<string, Value>);
    const keys = Object.keys(tmpl);
    return (
      <div className={`space-y-3 ${level > 0 ? "border-r-2 border-border pr-3" : ""}`}>
        {label && (
          <button
            type="button"
            className="flex items-center gap-1 text-sm font-semibold text-foreground hover:text-primary"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {label}
          </button>
        )}
        {open && (
          <div className="space-y-3">
            {keys.map((k) => (
              <ContentEditor
                key={k}
                label={k}
                value={obj[k]}
                defaultValue={(tmpl as any)[k]}
                onChange={(v) => onChange({ ...obj, [k]: v })}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default ContentEditor;
