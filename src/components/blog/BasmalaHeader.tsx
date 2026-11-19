/**
 * The opening Basmala shown at the top of every Arabic article, directly
 * before the introduction. Purely editorial: it is not stored with the post,
 * so it stays consistent across articles and never leaks into the translated
 * HTML of other languages.
 */
const BasmalaHeader = () => {
  return (
    <div
      className="mb-9 flex items-center justify-center gap-4 text-center"
      dir="rtl"
      data-no-auto-translate
    >
      <span
        aria-hidden="true"
        className="hidden h-px w-12 bg-gradient-to-l from-gold/50 to-transparent sm:block lg:w-16"
      />
      <p className="text-[22px] font-semibold leading-[1.9] text-ink sm:text-[26px]">
        بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
      </p>
      <span
        aria-hidden="true"
        className="hidden h-px w-12 bg-gradient-to-r from-gold/50 to-transparent sm:block lg:w-16"
      />
    </div>
  );
};

export default BasmalaHeader;
