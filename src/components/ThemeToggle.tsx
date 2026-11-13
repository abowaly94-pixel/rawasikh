import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ThemeToggleProps {
  hideTooltip?: boolean;
}

const ThemeToggle = ({ hideTooltip = false }: ThemeToggleProps) => {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  const button = (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">{t("theme.toggle")}</span>
    </Button>
  );

  if (hideTooltip) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {button}
      </TooltipTrigger>
      <TooltipContent>
        <p>{theme === "dark" ? t("theme.light") : t("theme.dark")}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default ThemeToggle;
