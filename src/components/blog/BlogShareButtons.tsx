import { useState } from "react";
import { Share2, Copy, Check, Facebook, Twitter, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface BlogShareButtonsProps {
  title: string;
  url?: string;
  postId?: string;
}

const CANONICAL_BASE = "https://rawasikheg.com";

const BlogShareButtons = ({ title, url, postId }: BlogShareButtonsProps) => {
  const { i18n } = useTranslation();
  const [copied, setCopied] = useState(false);
  const shareUrl = postId
    ? `${CANONICAL_BASE}/blog/${postId}`
    : url || (typeof window !== "undefined" ? window.location.href : "");
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  const labels = {
    ar: { share: "مشاركة", copy: "نسخ الرابط", copied: "تم النسخ!", wa: "واتساب", fb: "فيسبوك", tw: "تويتر", tg: "تيليجرام" },
    en: { share: "Share", copy: "Copy link", copied: "Copied!", wa: "WhatsApp", fb: "Facebook", tw: "Twitter", tg: "Telegram" },
    fr: { share: "Partager", copy: "Copier le lien", copied: "Copié!", wa: "WhatsApp", fb: "Facebook", tw: "Twitter", tg: "Telegram" },
    ur: { share: "شیئر کریں", copy: "لنک کاپی کریں", copied: "کاپی ہو گیا!", wa: "واٹس ایپ", fb: "فیس بک", tw: "ٹویٹر", tg: "ٹیلیگرام" },
  } as const;
  const L = (labels as any)[i18n.language] || labels.ar;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success(L.copied);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Error");
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
        return true;
      } catch {
        return false;
      }
    }
    return false;
  };

  const links = [
    { name: L.wa, icon: Send, href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}` },
    { name: L.fb, icon: Facebook, href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { name: L.tw, icon: Twitter, href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}` },
    { name: L.tg, icon: Send, href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}` },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={async (e) => {
            const used = await handleNativeShare();
            if (used) e.preventDefault();
          }}
        >
          <Share2 className="h-4 w-4" />
          {L.share}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover z-50">
        {links.map((l) => (
          <DropdownMenuItem key={l.name} asChild>
            <a href={l.href} target="_blank" rel="noopener noreferrer" className="cursor-pointer flex items-center gap-2">
              <l.icon className="h-4 w-4" />
              {l.name}
            </a>
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem onClick={handleCopy} className="cursor-pointer flex items-center gap-2">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? L.copied : L.copy}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default BlogShareButtons;
