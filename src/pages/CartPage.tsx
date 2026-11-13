import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, ImageIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";

const CartPage = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const navigate = useNavigate();
  const { items, removeFromCart, updateQuantity, totalPrice, totalItems } = useCart();

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col" dir={isRtl ? "rtl" : "ltr"}>
        <Header />
        <main className="flex-1 flex items-center justify-center py-14">
          <div className="text-center space-y-4">
            <ShoppingBag className="h-20 w-20 text-muted-foreground/40 mx-auto" />
            <h2 className="text-2xl font-bold text-foreground">{t("cartPage.empty")}</h2>
            <p className="text-muted-foreground">{t("cartPage.emptyDesc")}</p>
            <Button onClick={() => navigate("/store")}>
              <ArrowRight className="h-4 w-4 ml-2" />
              {t("cartPage.browseStore")}
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={isRtl ? "rtl" : "ltr"}>
      <Header />
      <main className="flex-1 shell py-8">
        <Button variant="ghost" onClick={() => navigate("/store")} className="mb-6">
          <ArrowRight className="h-4 w-4 ml-2" />
          {t("cartPage.continueShopping")}
        </Button>

        <h1 className="text-3xl font-bold text-foreground mb-8">{t("cartPage.title")} ({totalItems})</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex gap-4">
                  <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-foreground cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(item.type === "course" ? `/courses/${item.id}` : `/store/${item.id}`)}>
                        {item.name}
                      </h3>
                      {item.type === "course" && (
                        <Badge variant="secondary" className="text-xs">{t("cartPage.course")}</Badge>
                      )}
                    </div>
                    <p className="text-primary font-bold">{item.price} {t("cartPage.currency")}</p>
                    <div className="flex items-center justify-between">
                      {item.type === "product" ? (
                        <div className="flex items-center gap-2">
                          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-bold">{item.quantity}</span>
                          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">{t("cartPage.courseItem")}</span>
                      )}
                      <div className="flex items-center gap-4">
                        <span className="font-bold">{item.price * item.quantity} {t("cartPage.currency")}</span>
                        <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => removeFromCart(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div>
            <Card className="p-6 sticky top-24">
              <h3 className="text-lg font-bold text-foreground mb-4">{t("cartPage.summary")}</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("cartPage.itemsCount")}</span>
                  <span>{totalItems}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>{t("cartPage.total")}</span>
                  <span className="text-primary">{totalPrice} {t("cartPage.currency")}</span>
                </div>
              </div>
              <Button className="w-full mt-6" size="lg" onClick={() => navigate("/checkout")}>
                {t("cartPage.checkout")}
              </Button>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CartPage;
