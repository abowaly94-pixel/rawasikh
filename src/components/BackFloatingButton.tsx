import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, ArrowLeft } from "lucide-react";

// A floating "back home" button, shown ONLY on standalone pages that have
// no site Header (and therefore no obvious way back to the homepage) —
// e.g. login, reset-password, package selection, invite and certificate
// printing. On public pages the Header already links home, and in the
// dashboard/school areas there is an app layout, so the button stays hidden.
const STANDALONE_PATHS = [
  "/auth",
  "/reset-password",
  "/backup",
  "/select-package",
  "/assessment-invite",
  "/certificate",
];

const BackFloatingButton = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";

  const isStandalone = STANDALONE_PATHS.some(
    (prefix) => location.pathname === prefix || location.pathname.startsWith(`${prefix}/`)
  );
  if (!isStandalone) return null;

  const handleBack = () => {
    navigate("/");
  };

  const BackIcon = isRtl ? ArrowRight : ArrowLeft;

  return (
    <button
      type="button"
      onClick={handleBack}
      className="fixed bottom-6 right-6 z-50 group"
      aria-label={t("common.back", "رجوع")}
    >
      <div className="flex items-center gap-2 flex-row-reverse">
        <span className="bg-card text-foreground text-sm font-medium px-3 py-2 rounded-lg shadow-lg border whitespace-nowrap">
          {t("common.back", "رجوع")}
        </span>
        <span className="w-12 h-12 bg-primary group-hover:bg-primary/90 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
          <BackIcon className="h-5 w-5 text-primary-foreground" />
        </span>
      </div>
    </button>
  );
};

export default BackFloatingButton;
