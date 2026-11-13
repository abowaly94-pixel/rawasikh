import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEO from "@/components/SEO";
import SmartImage from "@/components/site/SmartImage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { ShoppingCart, ImageIcon, Minus, Plus, ArrowRight, Package } from "lucide-react";
import { useState } from "react";

const ProductDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleAddToCart = () => {
    if (!product) return;
    addToCart(
      {
        id: product.id,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
        stock_quantity: product.stock_quantity,
        type: "product",
      },
      quantity
    );
    toast.success("تم إضافة المنتج إلى السلة");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 shell py-12">
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="h-96 rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Package className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">المنتج غير موجود</h2>
            <Button onClick={() => navigate("/store")} variant="outline">
              <ArrowRight className="h-4 w-4 ml-2" />
              العودة للمتجر
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title={product.name}
        description={(product.description || `اشترِ ${product.name} من متجر رواسخ — منتجات ومواد تعليمية مختارة.`).slice(0, 160)}
        path={`/store/${product.id}`}
        image={product.image_url}
        type="website"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: product.description || undefined,
          image: product.image_url || undefined,
          offers: {
            "@type": "Offer",
            price: product.price,
            priceCurrency: "EGP",
            availability:
              (product.stock_quantity ?? 1) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url: `https://rawasikheg.com/store/${product.id}`,
          },
        }}
      />
      <Header />
      <main className="flex-1">
        <div className="shell py-8">
          <Button variant="ghost" onClick={() => navigate("/store")} className="mb-6">
            <ArrowRight className="h-4 w-4 ml-2" />
            العودة للمتجر
          </Button>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-muted rounded-xl overflow-hidden aspect-square flex items-center justify-center">
              {product.image_url ? (
                <SmartImage
                  src={product.image_url}
                  alt={product.name}
                  width={800}
                  height={800}
                  sizes="(min-width: 768px) 50vw, 92vw"
                  quality={78}
                />
              ) : (
                <ImageIcon className="h-24 w-24 text-muted-foreground/40" />
              )}
            </div>

            <div className="space-y-6">
              <div>
                {product.category && (
                  <Badge variant="secondary" className="mb-3">{product.category}</Badge>
                )}
                <h1 className="text-3xl font-bold text-foreground">{product.name}</h1>
              </div>

              <p className="text-3xl font-bold text-primary">{product.price} ج.م</p>

              {product.description && (
                <p className="text-muted-foreground leading-relaxed">{product.description}</p>
              )}

              <p className="text-sm text-muted-foreground">
                المتاح في المخزون: <span className="font-semibold text-foreground">{product.stock_quantity} قطعة</span>
              </p>

              {product.stock_quantity > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">الكمية:</span>
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="outline" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-10 text-center font-bold text-lg">{quantity}</span>
                      <Button size="icon" variant="outline" onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-lg font-semibold">
                    الإجمالي: <span className="text-primary">{product.price * quantity} ج.م</span>
                  </p>

                  <div className="flex gap-3">
                    <Button onClick={handleAddToCart} className="flex-1" size="lg">
                      <ShoppingCart className="h-5 w-5 ml-2" />
                      أضف إلى السلة
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => {
                        handleAddToCart();
                        navigate("/cart");
                      }}
                    >
                      اشترِ الآن
                    </Button>
                  </div>
                </div>
              ) : (
                <Badge variant="destructive" className="text-lg py-2 px-4">نفد من المخزون</Badge>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProductDetailsPage;
