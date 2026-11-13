import { useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { languages } from "@/i18n";

type Lang = "en" | "fr" | "ur";
type Entry = Record<Lang, string>;

const phrases: Record<string, Entry> = {
  "السلة فارغة": { en: "Cart is empty", fr: "Le panier est vide", ur: "کارٹ خالی ہے" },
  "تصفح المتجر": { en: "Browse Store", fr: "Parcourir la boutique", ur: "اسٹور دیکھیں" },
  "تم إرسال طلبك بنجاح!": { en: "Your order was sent successfully!", fr: "Votre commande a été envoyée avec succès !", ur: "آپ کا آرڈر کامیابی سے بھیج دیا گیا!" },
  "سيتم مراجعة طلبك والتواصل معك قريباً": { en: "Your order will be reviewed and we will contact you soon", fr: "Votre commande sera examinée et nous vous contacterons bientôt", ur: "آپ کے آرڈر کا جائزہ لیا جائے گا اور ہم جلد رابطہ کریں گے" },
  "متابعة التسوق": { en: "Continue Shopping", fr: "Continuer les achats", ur: "خریداری جاری رکھیں" },
  "لوحة التحكم": { en: "Dashboard", fr: "Tableau de bord", ur: "ڈیش بورڈ" },
  "العودة للسلة": { en: "Back to Cart", fr: "Retour au panier", ur: "کارٹ پر واپس" },
  "إتمام الطلب": { en: "Checkout", fr: "Finaliser la commande", ur: "چیک آؤٹ" },
  "بيانات العميل": { en: "Customer Details", fr: "Informations client", ur: "کسٹمر کی معلومات" },
  "الاسم الأول": { en: "First Name", fr: "Prénom", ur: "پہلا نام" },
  "الاسم الأخير": { en: "Last Name", fr: "Nom", ur: "آخری نام" },
  "البريد الإلكتروني *": { en: "Email *", fr: "Email *", ur: "ای میل *" },
  "رقم الهاتف *": { en: "Phone Number *", fr: "Numéro de téléphone *", ur: "فون نمبر *" },
  "بيانات الشحن": { en: "Shipping Details", fr: "Informations de livraison", ur: "شپنگ کی معلومات" },
  "عنوان الشحن *": { en: "Shipping Address *", fr: "Adresse de livraison *", ur: "شپنگ پتہ *" },
  "ملاحظات إضافية": { en: "Additional Notes", fr: "Notes supplémentaires", ur: "اضافی نوٹس" },
  "طريقة الدفع": { en: "Payment Method", fr: "Mode de paiement", ur: "ادائیگی کا طریقہ" },
  "بطاقة ائتمان / فيزا / ماستركارد": { en: "Credit Card / Visa / Mastercard", fr: "Carte bancaire / Visa / Mastercard", ur: "کریڈٹ کارڈ / ویزا / ماسٹر کارڈ" },
  "دفع آمن عبر Paymob": { en: "Secure payment via Paymob", fr: "Paiement sécurisé via Paymob", ur: "Paymob کے ذریعے محفوظ ادائیگی" },
  "محفظة إلكترونية": { en: "Mobile Wallet", fr: "Portefeuille mobile", ur: "موبائل والٹ" },
  "فودافون كاش، اتصالات كاش، أورانج موني": { en: "Vodafone Cash, Etisalat Cash, Orange Money", fr: "Vodafone Cash, Etisalat Cash, Orange Money", ur: "Vodafone Cash، Etisalat Cash، Orange Money" },
  "رقم المحفظة الإلكترونية *": { en: "Wallet Number *", fr: "Numéro du portefeuille *", ur: "والٹ نمبر *" },
  "ملخص الطلب": { en: "Order Summary", fr: "Résumé de commande", ur: "آرڈر کا خلاصہ" },
  "الإجمالي": { en: "Total", fr: "Total", ur: "کل" },
  "جاري التحويل لصفحة الدفع...": { en: "Redirecting to payment...", fr: "Redirection vers le paiement...", ur: "ادائیگی کی طرف منتقل کیا جا رہا ہے..." },
  "يرجى تسجيل الدخول أولاً": { en: "Please sign in first", fr: "Veuillez d'abord vous connecter", ur: "براہ کرم پہلے لاگ ان کریں" },
  "الدفع آمن ومشفّر عبر بوابة Paymob": { en: "Payment is secure and encrypted via Paymob", fr: "Le paiement est sécurisé et chiffré via Paymob", ur: "ادائیگی Paymob کے ذریعے محفوظ اور انکرپٹڈ ہے" },
  "تم الدفع بنجاح!": { en: "Payment successful!", fr: "Paiement réussi !", ur: "ادائیگی کامیاب!" },
  "تم الدفع بنجاح! سيتم مراجعة طلبك قريباً.": { en: "Payment successful! Your order will be reviewed soon.", fr: "Paiement réussi ! Votre commande sera examinée bientôt.", ur: "ادائیگی کامیاب! آپ کے آرڈر کا جلد جائزہ لیا جائے گا۔" },
  "فشلت عملية الدفع": { en: "Payment failed", fr: "Le paiement a échoué", ur: "ادائیگی ناکام ہو گئی" },
  "فشلت عملية الدفع. يرجى المحاولة مرة أخرى.": { en: "Payment failed. Please try again.", fr: "Le paiement a échoué. Veuillez réessayer.", ur: "ادائیگی ناکام ہو گئی۔ دوبارہ کوشش کریں۔" },
  "جاري التحقق من حالة الدفع...": { en: "Checking payment status...", fr: "Vérification du statut du paiement...", ur: "ادائیگی کی حیثیت چیک ہو رہی ہے..." },
  "جاري التحقق من الدفع...": { en: "Checking payment...", fr: "Vérification du paiement...", ur: "ادائیگی چیک ہو رہی ہے..." },
  "إعادة المحاولة": { en: "Try Again", fr: "Réessayer", ur: "دوبارہ کوشش کریں" },
  "المنتج غير موجود": { en: "Product not found", fr: "Produit introuvable", ur: "پروڈکٹ نہیں ملی" },
  "العودة للمتجر": { en: "Back to Store", fr: "Retour à la boutique", ur: "اسٹور پر واپس" },
  "المتاح في المخزون:": { en: "Available in stock:", fr: "Disponible en stock :", ur: "اسٹاک میں دستیاب:" },
  "قطعة": { en: "items", fr: "pièces", ur: "اشیاء" },
  "الكمية:": { en: "Quantity:", fr: "Quantité :", ur: "مقدار:" },
  "أضف إلى السلة": { en: "Add to Cart", fr: "Ajouter au panier", ur: "کارٹ میں شامل کریں" },
  "اشترِ الآن": { en: "Buy Now", fr: "Acheter maintenant", ur: "ابھی خریدیں" },
  "نفد من المخزون": { en: "Out of Stock", fr: "Rupture de stock", ur: "اسٹاک ختم" },
  "تم إضافة المنتج إلى السلة": { en: "Product added to cart", fr: "Produit ajouté au panier", ur: "پروڈکٹ کارٹ میں شامل کر دی گئی" },
  "كلمة مرور ضعيفة": { en: "Weak password", fr: "Mot de passe faible", ur: "کمزور پاس ورڈ" },
  "يجب أن تكون 6 أحرف على الأقل.": { en: "It must be at least 6 characters.", fr: "Il doit contenir au moins 6 caractères.", ur: "یہ کم از کم 6 حروف کا ہونا چاہیے۔" },
  "غير متطابقتين": { en: "Passwords do not match", fr: "Les mots de passe ne correspondent pas", ur: "پاس ورڈز مماثل نہیں" },
  "كلمتا المرور غير متطابقتين.": { en: "The two passwords do not match.", fr: "Les deux mots de passe ne correspondent pas.", ur: "دونوں پاس ورڈز مماثل نہیں ہیں۔" },
  "حدث خطأ": { en: "An error occurred", fr: "Une erreur est survenue", ur: "ایک خرابی پیش آئی" },
  "تم بنجاح": { en: "Done successfully", fr: "Terminé avec succès", ur: "کامیابی سے مکمل" },
  "تم تحديث كلمة المرور. يمكنك تسجيل الدخول الآن.": { en: "Password updated. You can now sign in.", fr: "Mot de passe mis à jour. Vous pouvez maintenant vous connecter.", ur: "پاس ورڈ اپ ڈیٹ ہو گیا۔ اب آپ لاگ ان کر سکتے ہیں۔" },
  "إعادة تعيين كلمة المرور": { en: "Reset Password", fr: "Réinitialiser le mot de passe", ur: "پاس ورڈ ری سیٹ کریں" },
  "أدخل كلمة المرور الجديدة لحسابك.": { en: "Enter the new password for your account.", fr: "Saisissez le nouveau mot de passe de votre compte.", ur: "اپنے اکاؤنٹ کے لیے نیا پاس ورڈ درج کریں۔" },
  "جارٍ التحقق من رابط إعادة التعيين...": { en: "Verifying reset link...", fr: "Vérification du lien de réinitialisation...", ur: "ری سیٹ لنک کی تصدیق ہو رہی ہے..." },
  "كلمة المرور الجديدة": { en: "New Password", fr: "Nouveau mot de passe", ur: "نیا پاس ورڈ" },
  "تأكيد كلمة المرور": { en: "Confirm Password", fr: "Confirmer le mot de passe", ur: "پاس ورڈ کی تصدیق" },
  "جارٍ الحفظ...": { en: "Saving...", fr: "Enregistrement...", ur: "محفوظ ہو رہا ہے..." },
  "تحديث كلمة المرور": { en: "Update Password", fr: "Mettre à jour le mot de passe", ur: "پاس ورڈ اپ ڈیٹ کریں" },
  "العودة للرئيسية": { en: "Back to Home", fr: "Retour à l'accueil", ur: "ہوم پر واپس" },
  "يرجى تسجيل الدخول": { en: "Please sign in", fr: "Veuillez vous connecter", ur: "براہ کرم لاگ ان کریں" },
  "تسجيل الدخول": { en: "Sign In", fr: "Connexion", ur: "لاگ ان" },
  "تهانينا! نجحت": { en: "Congratulations! You passed", fr: "Félicitations ! Vous avez réussi", ur: "مبارک ہو! آپ کامیاب ہوئے" },
  "لم تنجح": { en: "You did not pass", fr: "Vous n'avez pas réussi", ur: "آپ کامیاب نہیں ہوئے" },
  "متابعة الدورة التدريبية": { en: "Continue Course", fr: "Continuer le cours", ur: "کورس جاری رکھیں" },
  "لا توجد أسئلة": { en: "No questions", fr: "Aucune question", ur: "کوئی سوال نہیں" },
  "العودة": { en: "Back", fr: "Retour", ur: "واپس" },
  "السابق": { en: "Previous", fr: "Précédent", ur: "پچھلا" },
  "التالي": { en: "Next", fr: "Suivant", ur: "اگلا" },
  "تقديم الإجابات": { en: "Submit Answers", fr: "Envoyer les réponses", ur: "جوابات جمع کریں" },
  "الأسئلة المُجابة:": { en: "Answered questions:", fr: "Questions répondues :", ur: "جواب دیے گئے سوالات:" },
  "صح": { en: "True", fr: "Vrai", ur: "درست" },
  "خطأ": { en: "False", fr: "Faux", ur: "غلط" },
  "نقطة": { en: "point", fr: "point", ur: "نمبر" },
  "نقاط": { en: "points", fr: "points", ur: "نمبر" },
  "اختبارات التقييم": { en: "Evaluation Tests", fr: "Tests d'évaluation", ur: "تشخیصی امتحانات" },
  "التصنيف غير موجود": { en: "Category not found", fr: "Catégorie introuvable", ur: "زمرہ نہیں ملا" },
  "لم يتم العثور على هذا التصنيف": { en: "This category was not found", fr: "Cette catégorie est introuvable", ur: "یہ زمرہ نہیں ملا" },
  "العودة للتصنيفات": { en: "Back to Categories", fr: "Retour aux catégories", ur: "زمروں پر واپس" },
  "لا توجد اختبارات متاحة": { en: "No tests available", fr: "Aucun test disponible", ur: "کوئی امتحان دستیاب نہیں" },
  "لم يتم إضافة أي اختبارات في هذا التصنيف بعد": { en: "No tests have been added to this category yet", fr: "Aucun test n'a encore été ajouté à cette catégorie", ur: "اس زمرے میں ابھی کوئی امتحان شامل نہیں کیا گیا" },
  "نجاح": { en: "Passed", fr: "Réussi", ur: "کامیاب" },
  "إعادة الاختبار": { en: "Retake Test", fr: "Refaire le test", ur: "دوبارہ امتحان دیں" },
  "ابدأ الاختبار": { en: "Start Test", fr: "Commencer le test", ur: "امتحان شروع کریں" },
  "اختبار قصير": { en: "Quiz", fr: "Quiz", ur: "مختصر امتحان" },
  "اختبار نصفي": { en: "Midterm", fr: "Examen de mi-parcours", ur: "وسط مدتی امتحان" },
  "اختبار نهائي": { en: "Final Exam", fr: "Examen final", ur: "حتمی امتحان" },
  "واجب": { en: "Assignment", fr: "Devoir", ur: "اسائنمنٹ" },
  "مشروع": { en: "Project", fr: "Projet", ur: "پروجیکٹ" },
  "تقييم": { en: "Evaluation", fr: "Évaluation", ur: "تشخیص" },
  "جاري التحميل...": { en: "Loading...", fr: "Chargement...", ur: "لوڈ ہو رہا ہے..." },
  "تبديل الوضع": { en: "Toggle Theme", fr: "Changer le thème", ur: "تھیم تبدیل کریں" },
  "تواصل معنا عبر واتساب": { en: "Contact us on WhatsApp", fr: "Contactez-nous sur WhatsApp", ur: "WhatsApp پر ہم سے رابطہ کریں" },
  "إجمالي الطلاب": { en: "Total Students", fr: "Total des étudiants", ur: "کل طلباء" },
  "المعلمين": { en: "Teachers", fr: "Enseignants", ur: "اساتذہ" },
  "الفصول": { en: "Classes", fr: "Classes", ur: "کلاسز" },
  "فصولي": { en: "My Classes", fr: "Mes classes", ur: "میری کلاسز" },
  "الحصص": { en: "Lessons", fr: "Cours", ur: "اسباق" },
  "اختباراتي": { en: "My Tests", fr: "Mes tests", ur: "میرے امتحانات" },
  "آخر النشاطات": { en: "Recent Activity", fr: "Activité récente", ur: "حالیہ سرگرمیاں" },
  "لا توجد نشاطات حديثة": { en: "No recent activity", fr: "Aucune activité récente", ur: "کوئی حالیہ سرگرمی نہیں" },
  "ستظهر النشاطات هنا": { en: "Activity will appear here", fr: "L'activité apparaîtra ici", ur: "سرگرمیاں یہاں ظاہر ہوں گی" },
  "الإشعارات": { en: "Notifications", fr: "Notifications", ur: "اطلاعات" },
  "لا توجد إشعارات جديدة": { en: "No new notifications", fr: "Aucune nouvelle notification", ur: "کوئی نئی اطلاع نہیں" },
  "ستظهر الإشعارات هنا": { en: "Notifications will appear here", fr: "Les notifications apparaîtront ici", ur: "اطلاعات یہاں ظاہر ہوں گی" },
  "طالب مسجل": { en: "registered student", fr: "étudiant inscrit", ur: "رجسٹرڈ طالب علم" },
  "معلم": { en: "teacher", fr: "enseignant", ur: "استاد" },
  "فصل دراسي": { en: "class", fr: "classe", ur: "کلاس" },
  "حصة": { en: "lesson", fr: "cours", ur: "سبق" },
  "محاولة اختبار": { en: "test attempt", fr: "tentative de test", ur: "امتحانی کوشش" },
};

const dynamicRules: Array<[RegExp, (match: RegExpMatchArray, lang: Lang) => string]> = [
  [/^المنتجات \((\d+)\)$/, (m, l) => ({ en: `Products (${m[1]})`, fr: `Produits (${m[1]})`, ur: `مصنوعات (${m[1]})` }[l])],
  [/^الكمية: (.+)$/, (m, l) => ({ en: `Quantity: ${m[1]}`, fr: `Quantité : ${m[1]}`, ur: `مقدار: ${m[1]}` }[l])],
  [/^ادفع الآن (.+) ج\.م$/, (m, l) => ({ en: `Pay now ${m[1]} EGP`, fr: `Payer maintenant ${m[1]} EGP`, ur: `اب ادا کریں ${m[1]} مصری پاؤنڈ` }[l])],
  [/^(.+) ج\.م$/, (m, l) => ({ en: `${m[1]} EGP`, fr: `${m[1]} EGP`, ur: `${m[1]} مصری پاؤنڈ` }[l])],
  [/^الإجمالي: (.+)$/, (m, l) => ({ en: `Total: ${m[1]}`, fr: `Total : ${m[1]}`, ur: `کل: ${m[1]}` }[l])],
  [/^السؤال (\d+) من (\d+)$/, (m, l) => ({ en: `Question ${m[1]} of ${m[2]}`, fr: `Question ${m[1]} sur ${m[2]}`, ur: `سوال ${m[1]} از ${m[2]}` }[l])],
  [/^(\d+) سؤال$/, (m, l) => ({ en: `${m[1]} questions`, fr: `${m[1]} questions`, ur: `${m[1]} سوالات` }[l])],
  [/^الدرجة الكاملة: (.+)$/, (m, l) => ({ en: `Full score: ${m[1]}`, fr: `Note totale : ${m[1]}`, ur: `کل اسکور: ${m[1]}` }[l])],
  [/^آخر نتيجة: (.+)$/, (m, l) => ({ en: `Last result: ${m[1]}`, fr: `Dernier résultat : ${m[1]}`, ur: `آخری نتیجہ: ${m[1]}` }[l])],
  [/^النتيجة: (.+)$/, (m, l) => ({ en: `Result: ${m[1]}`, fr: `Résultat : ${m[1]}`, ur: `نتیجہ: ${m[1]}` }[l])],
  [/^درجتك: (.+) من (.+) \((.+)%\)$/, (m, l) => ({ en: `Your score: ${m[1]} of ${m[2]} (${m[3]}%)`, fr: `Votre score : ${m[1]} sur ${m[2]} (${m[3]}%)`, ur: `آپ کا اسکور: ${m[1]} از ${m[2]} (${m[3]}%)` }[l])],
  [/^درجة النجاح المطلوبة: (.+)%$/, (m, l) => ({ en: `Required passing score: ${m[1]}%`, fr: `Score de réussite requis : ${m[1]}%`, ur: `ضروری کامیابی کا اسکور: ${m[1]}%` }[l])],
  [/^آخر 10 نشاطات$/, (_m, l) => ({ en: "Latest 10 activities", fr: "10 dernières activités", ur: "آخری 10 سرگرمیاں" }[l])],
];

const translatableAttributes = ["placeholder", "title", "aria-label"] as const;
const ignoredTags = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "IFRAME", "CODE", "PRE", "SVG"]);

const hasArabic = (value: string) => /[\u0600-\u06FF]/.test(value);

function translateValue(value: string, language: string): string {
  if (language === "ar" || !["en", "fr", "ur"].includes(language)) return value;
  const lang = language as Lang;
  const leading = value.match(/^\s*/)?.[0] ?? "";
  const trailing = value.match(/\s*$/)?.[0] ?? "";
  const text = value.trim().replace(/^🔒\s*/, "");
  const exact = phrases[text]?.[lang];
  if (exact) return `${leading}${value.trim().startsWith("🔒") ? "🔒 " : ""}${exact}${trailing}`;

  for (const [regex, handler] of dynamicRules) {
    const match = text.match(regex);
    if (match) return `${leading}${handler(match, lang)}${trailing}`;
  }

  return value;
}

export default function I18nAutoTranslator() {
  const { i18n } = useTranslation();
  const textOriginals = useRef<WeakMap<Text, string>>(new WeakMap());
  const applying = useRef(false);
  const rafId = useRef<number | null>(null);

  // useLayoutEffect (not useEffect) so this runs synchronously right after
  // React commits the language-change re-render, but BEFORE the browser
  // paints. That's what keeps the dir flip and the text translation visually
  // atomic — no frame where one has updated and the other hasn't.
  useLayoutEffect(() => {
    // Keep <html>/<body> dir and lang perfectly in sync with the text update
    // below, instead of a separate i18next event listener that could fire
    // earlier (see src/i18n/index.ts for why).
    const lang = languages.find((l) => l.code === i18n.language);
    if (lang) {
      document.documentElement.lang = i18n.language;
      document.documentElement.dir = lang.dir;
      document.body.dir = lang.dir;
    }

    const shouldIgnore = (element: Element | null) => {
      if (!element) return true;
      const tagName = element.tagName;
      return ignoredTags.has(tagName) || element.closest("[contenteditable='true'], [data-no-auto-translate]") !== null;
    };

    const translateDom = () => {
      applying.current = true;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (shouldIgnore(parent)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      });

      const nodes: Text[] = [];
      while (walker.nextNode()) nodes.push(walker.currentNode as Text);

      nodes.forEach((node) => {
        const current = node.nodeValue ?? "";
        // If React already rendered non-Arabic text (i.e. it used i18next),
        // trust it and don't overwrite. Also refresh our stored "original".
        if (!hasArabic(current)) {
          textOriginals.current.delete(node);
          return;
        }
        textOriginals.current.set(node, current);
        if (i18n.language === "ar") return;
        const translated = translateValue(current, i18n.language);
        if (translated !== current) node.nodeValue = translated;
      });

      document.querySelectorAll<HTMLElement>("input, textarea, button, [title], [aria-label]").forEach((element) => {
        if (shouldIgnore(element)) return;
        translatableAttributes.forEach((attribute) => {
          const current = element.getAttribute(attribute);
          if (!current || !hasArabic(current)) return;
          const dataKey = `autoI18nOriginal${attribute.replace(/(^|-)(\w)/g, (_m, _dash, char) => char.toUpperCase())}`;
          element.dataset[dataKey] = current;
          if (i18n.language === "ar") return;
          const translated = translateValue(current, i18n.language);
          if (translated !== current) element.setAttribute(attribute, translated);
        });
      });

      window.setTimeout(() => {
        applying.current = false;
      }, 0);
    };


    // requestAnimationFrame instead of a setTimeout(30ms) debounce: it fires
    // right before the next paint (typically ~16ms, and synced to the
    // browser's own render clock), so newly-mounted/updated DOM nodes get
    // caught almost immediately instead of accumulating a visible delay.
    const schedule = () => {
      if (rafId.current) window.cancelAnimationFrame(rafId.current);
      rafId.current = window.requestAnimationFrame(translateDom);
    };

    translateDom();
    const observer = new MutationObserver(() => {
      if (!applying.current) schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: [...translatableAttributes] });

    return () => {
      observer.disconnect();
      if (rafId.current) window.cancelAnimationFrame(rafId.current);
    };
  }, [i18n.language]);

  return null;
}