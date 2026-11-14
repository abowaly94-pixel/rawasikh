import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import SmartImage from "@/components/site/SmartImage";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Search, ShoppingCart, ImageIcon, Package } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useTranslation } from "react-i18next";
import { useTermsTranslation } from "@/hooks/useTermsTranslation";


interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  stock_quantity: number;
}

const StorePage = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const navigate = useNavigate();
  const { addToCart, totalItems } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ["store-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .gt("stock_quantity", 0)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });

  const categories = [...new Set(products?.map(p => p.category).filter(Boolean))];

  const allTerms = [
    ...(products?.flatMap(p => [p.name, p.description, p.category]) || []),
  ].filter(Boolean) as string[];
  const { tt } = useTermsTranslation(allTerms);

  const filteredProducts = products?.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(q) ||
      tt(p.name).toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      tt(p.description || "").toLowerCase().includes(q);
    const matchesCategory = !selectedCategory || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });


  const handleAddToCart = (product: Product) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      stock_quantity: product.stock_quantity,
      type: "product",
    });
    toast.success(t("storePage.addedToCart"));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={isRtl ? "rtl" : "ltr"}>
      <SEO
        title="المتجر — منتجات ومواد تعليمية"
        description="متجر رواسخ: كتب ومواد تعليمية ومنتجات رقمية مختارة لدعم رحلتك في التعلم والتطوير المهني."
        path="/store"
        keywords={["متجر تعليمي", "كتب", "مواد تعليمية", "منتجات رقمية", "رواسخ"]}
      />
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border/70 bg-paper">
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                "radial-gradient(80% 90% at 90% 0%, hsl(var(--primary) / 0.10) 0%, transparent 60%), radial-gradient(60% 70% at 0% 100%, hsl(var(--gold) / 0.12) 0%, transparent 65%)",
            }}
            aria-hidden
          />
          <div className="pattern-lattice pointer-events-none absolute inset-0 opacity-[0.04]" aria-hidden />
          <div className="shell relative z-10 py-6 lg:py-8">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-balance text-3xl leading-[1.4] md:text-5xl font-bold text-foreground mb-4">{t("storePage.title")}</h1>
              <p className="mx-auto max-w-xl text-base leading-8 text-foreground/70 font-medium md:text-lg mb-5">{t("storePage.subtitle")}</p>
              <div className="flex items-center justify-center gap-4">
              <div className="max-w-md w-full relative">
                <Search className={`absolute ${isRtl ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground`} />
                <Input placeholder={t("storePage.searchPlaceholder")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={isRtl ? "pr-10 text-right" : "pl-10"} />
              </div>
              <Button variant="outline" className="relative" onClick={() => navigate("/cart")}>
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Button>
              </div>
            </div>
          </div>
        </section>

        {categories.length > 0 && (
          <section className="py-4 bg-muted/30 border-b">
            <div className="shell">
              <div className="flex flex-wrap gap-3 justify-center">
                <Button variant={selectedCategory === null ? "default" : "outline"} onClick={() => setSelectedCategory(null)}>{t("storePage.all")}</Button>
                {categories.map((cat) => (
                  <Button key={cat} variant={selectedCategory === cat ? "default" : "outline"} onClick={() => setSelectedCategory(cat!)}>
                    {tt(cat!)}

                  </Button>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="py-8 lg:py-12">
          <div className="shell">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="h-48 w-full" />
                    <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                    <CardFooter><Skeleton className="h-10 w-full" /></CardFooter>
                  </Card>
                ))}
              </div>
            ) : filteredProducts && filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer" onClick={() => navigate(`/store/${product.id}`)}>
                    <div className="relative h-48 overflow-hidden bg-muted">
                      {product.image_url ? (
                        <SmartImage
                          src={product.image_url}
                          alt={product.name}
                          width={480}
                          height={384}
                          sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 92vw"
                          quality={72}
                          className="group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-16 w-16 text-muted-foreground/50" />
                        </div>
                      )}
                      {product.category && (
                        <Badge className="absolute top-3 right-3" variant="secondary">{tt(product.category)}</Badge>
                      )}
                    </div>
                    <CardHeader>
                      <h3 className="text-lg font-bold text-foreground line-clamp-2">{tt(product.name)}</h3>
                      {product.description && (
                        <p className="text-muted-foreground line-clamp-2 text-sm">{tt(product.description)}</p>
                      )}

                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{t("storePage.available")}: {product.stock_quantity} {t("storePage.pieces")}</p>
                    </CardContent>
                    <CardFooter className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-primary">{product.price} {t("storePage.currency")}</span>
                      <Button onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }}>
                        <ShoppingCart className="h-4 w-4 ml-2" />{t("storePage.addToCart")}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">{t("storePage.noResults")}</h3>
                <p className="text-muted-foreground">{searchQuery ? t("storePage.tryOther") : t("storePage.comingSoon")}</p>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default StorePage;
