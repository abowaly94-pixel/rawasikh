import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { buildWhatsappLink } from "@/lib/phone";

interface WhatsAppContactButtonProps {
  phone?: string | null;
  countryDial?: string | null;
  message?: string;
  size?: "icon" | "sm" | "default";
  label?: string; // when provided, renders as a labeled button instead of an icon-only one
}

const WhatsAppContactButton = ({
  phone,
  countryDial,
  message,
  size = "icon",
  label,
}: WhatsAppContactButtonProps) => {
  const link = buildWhatsappLink(phone, countryDial, message);

  if (!link) {
    return (
      <Button
        variant="ghost"
        size={size}
        disabled
        className={label ? "gap-1.5 text-muted-foreground" : "text-muted-foreground"}
        title="لا يوجد رقم واتساب صحيح — يحتاج الطالب لإضافة رقمه وكود الدولة في ملفه الشخصي"
      >
        <MessageCircle className="h-4 w-4" />
        {label}
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size={size}
      asChild
      className={label ? "gap-1.5 text-green-600 hover:text-green-700" : "text-green-600 hover:text-green-700"}
      title="تواصل عبر واتساب"
    >
      <a href={link} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="h-4 w-4" />
        {label}
      </a>
    </Button>
  );
};

export default WhatsAppContactButton;
