import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone } from "lucide-react";
import { useTranslation } from "react-i18next";

const NewsTicker = () => {
  const { i18n } = useTranslation();
  const lang = i18n.language;

  const { data: items } = useQuery({
    queryKey: ["news-ticker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_ticker")
        .select("*")
        .eq("is_active", true)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  if (!items || items.length === 0) return null;

  const getText = (item: any): string => {
    if (lang.startsWith("en") && item.text_en) return item.text_en;
    if (lang.startsWith("fr") && item.text_fr) return item.text_fr;
    if (lang.startsWith("ur") && item.text_ur) return item.text_ur;
    return item.text;
  };

  return (
    <div className="bg-primary text-primary-foreground overflow-hidden py-2 relative">
      <div className="flex items-center">
        <div className="flex-shrink-0 px-3 z-10 bg-primary">
          <Megaphone className="h-4 w-4" />
        </div>
        <div className="edge-fade-x overflow-hidden flex-1">
          <div className="animate-marquee whitespace-nowrap inline-block">
            {items.map((item, i) => (
              <span key={item.id} className="mx-4 text-sm font-medium">
                {item.link ? (
                  <a href={item.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {getText(item)}
                  </a>
                ) : (
                  getText(item)
                )}
                {i < items.length - 1 && <span className="mx-4">•</span>}
              </span>
            ))}
            {items.map((item, i) => (
              <span key={`dup-${item.id}`} className="mx-4 text-sm font-medium">
                {item.link ? (
                  <a href={item.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {getText(item)}
                  </a>
                ) : (
                  getText(item)
                )}
                {i < items.length - 1 && <span className="mx-4">•</span>}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsTicker;
