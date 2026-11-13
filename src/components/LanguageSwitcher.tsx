import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Globe } from "lucide-react";
import { languages, type LanguageCode } from "@/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  className?: string;
  contentClassName?: string;
  align?: "start" | "center" | "end";
}

const LanguageSwitcher = ({
  className,
  contentClassName,
  align = "end",
}: LanguageSwitcherProps) => {
  const { t, i18n } = useTranslation();
  const currentLang = languages.find((l) => l.code === i18n.language) || languages[0];

  const changeLanguage = (code: LanguageCode) => {
    if (code !== i18n.language) void i18n.changeLanguage(code);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`${t("header.language")}: ${currentLang.name}`}
          className={cn(
            "h-9 min-w-9 gap-1.5 rounded-xl px-1.5 text-foreground/80 transition-colors sm:px-2.5",
            "hover:bg-brand-soft hover:text-primary",
            "data-[state=open]:bg-brand-soft data-[state=open]:text-primary",
            className,
          )}
        >
          <Globe className="h-[18px] w-[18px] shrink-0" aria-hidden />
          <span className="hidden text-[13px] font-semibold md:inline">{currentLang.name}</span>
          <span className="hidden text-[11px] font-bold uppercase tracking-wide sm:inline md:hidden" aria-hidden>
            {currentLang.code}
          </span>
          <ChevronDown
            className="h-3.5 w-3.5 opacity-70 transition-transform duration-300 data-[state=open]:rotate-180"
            aria-hidden
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        sideOffset={10}
        collisionPadding={6}
        className={cn(
          "w-60 rounded-2xl border-border/70 bg-popover/95 p-1.5 shadow-xl shadow-black/10 backdrop-blur-xl",
          contentClassName,
        )}
      >
        <DropdownMenuLabel className="px-2.5 pb-1.5 pt-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {t("header.chooseLanguage")}
        </DropdownMenuLabel>
        {languages.map((lang) => {
          const active = currentLang.code === lang.code;
          return (
            <DropdownMenuItem
              key={lang.code}
              onSelect={() => changeLanguage(lang.code)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "gap-2.5 rounded-xl px-2.5 py-2.5 text-[13.5px] transition-colors",
                active
                  ? "bg-primary/10 font-semibold text-primary focus:bg-primary/15 focus:text-primary"
                  : "text-foreground/85 focus:bg-muted focus:text-foreground",
              )}
            >
              <span className="text-lg leading-none" aria-hidden>
                {lang.flag}
              </span>
              <span className="flex-1" dir={lang.dir}>
                {lang.name}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground" aria-hidden>
                {lang.code}
              </span>
              {active && <Check className="h-4 w-4 shrink-0" aria-hidden />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;