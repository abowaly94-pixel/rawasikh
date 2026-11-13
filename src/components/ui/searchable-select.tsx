import { useMemo, useState, ReactNode } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface SearchableSelectOption {
  value: string;
  // Plain text used for both search matching and the trigger button label.
  label: string;
  // Optional richer JSX to render inside the dropdown row instead of the
  // plain label (e.g. name + badge). Falls back to `label` if omitted.
  content?: ReactNode;
  // Extra words to match against when searching (e.g. student number, email).
  keywords?: string[];
}

interface Props {
  value: string | undefined;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
}

// A drop-in replacement for shadcn's <Select> when the option list comes from
// site data (students, courses, teachers, ...) and can grow to dozens/hundreds
// of rows — lets the user type to filter instead of scrolling through
// everything. Visually matches the existing <SelectTrigger> so it can be
// swapped into any form without changing surrounding layout.
export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "اختر...",
  searchPlaceholder = "ابحثي...",
  emptyText = "لا توجد نتائج",
  disabled,
  className,
}: Props) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal border-input bg-background hover:bg-background",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command
          filter={(itemValue, search) => {
            const opt = options.find((o) => o.value === itemValue);
            if (!opt) return 0;
            const haystack = [opt.label, ...(opt.keywords || [])].join(" ").toLowerCase();
            return haystack.includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.value}
                  onSelect={(v) => {
                    onValueChange(v);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn("ml-2 h-4 w-4", value === opt.value ? "opacity-100" : "opacity-0")}
                  />
                  {opt.content ?? opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
