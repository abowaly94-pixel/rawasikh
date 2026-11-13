import { useRef } from "react";
import rawasikhLogo from "@/assets/rawasikh-logo.png";

/** Every piece of dynamic text/logo on the certificate that the admin can
 * reposition and restyle independently, so it can be lined up precisely on
 * top of a custom uploaded background image. */
export type CertificateFieldKey =
  | "brandHeader"
  | "titleText"
  | "introText"
  | "studentName"
  | "completionText"
  | "courseTitle"
  | "dateBlock"
  | "certNumberBlock";

export interface CertificateFieldLayout {
  /** Horizontal position of the field's center, as a % of the certificate width (0 = left edge, 100 = right edge). */
  x: number;
  /** Vertical position of the field's center, as a % of the certificate height (0 = top edge, 100 = bottom edge). */
  y: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  bold?: boolean;
  align?: "right" | "center" | "left";
}

export const CERTIFICATE_FIELD_LABELS: Record<CertificateFieldKey, string> = {
  brandHeader: "الشعار واسم المنصة",
  titleText: "عنوان الشهادة",
  introText: 'نص "تُمنح هذه الشهادة إلى"',
  studentName: "اسم الطالب",
  completionText: 'نص "لإتمامه بنجاح دورة"',
  courseTitle: "اسم الدورة التدريبية",
  dateBlock: "تاريخ الإصدار",
  certNumberBlock: "رقم الشهادة",
};

export const CERTIFICATE_FIELD_ORDER: CertificateFieldKey[] = [
  "brandHeader",
  "titleText",
  "introText",
  "studentName",
  "completionText",
  "courseTitle",
  "dateBlock",
  "certNumberBlock",
];

export const CERTIFICATE_FONT_OPTIONS = [
  { value: "", label: "افتراضي (Tajawal)" },
  { value: "'Tajawal', sans-serif", label: "Tajawal" },
  { value: "'Cairo', sans-serif", label: "Cairo" },
  { value: "'Amiri', serif", label: "Amiri (خط كلاسيكي)" },
  { value: "Arial, sans-serif", label: "Arial" },
  { value: "Georgia, serif", label: "Georgia" },
];

export const DEFAULT_FIELD_LAYOUT: Record<CertificateFieldKey, CertificateFieldLayout> = {
  brandHeader: { x: 50, y: 11 },
  titleText: { x: 50, y: 25 },
  introText: { x: 50, y: 34 },
  studentName: { x: 50, y: 44 },
  completionText: { x: 50, y: 55 },
  courseTitle: { x: 50, y: 64 },
  dateBlock: { x: 80, y: 90 },
  certNumberBlock: { x: 20, y: 90 },
};

/** Visual defaults matching the certificate's original fixed design, used
 * whenever a field hasn't been individually customized yet. Keeping these
 * separate from DEFAULT_FIELD_LAYOUT (position) means a template saved
 * before this feature existed still renders exactly as it did before. */
const FIELD_DEFAULT_STYLE: Record<
  CertificateFieldKey,
  { fontSize: number; bold: boolean; colorKind: "primary" | "accent" | "muted" | "faint" | "dark" }
> = {
  brandHeader: { fontSize: 14, bold: true, colorKind: "primary" },
  titleText: { fontSize: 34, bold: true, colorKind: "primary" },
  introText: { fontSize: 16, bold: false, colorKind: "muted" },
  studentName: { fontSize: 27, bold: true, colorKind: "dark" },
  completionText: { fontSize: 16, bold: false, colorKind: "muted" },
  courseTitle: { fontSize: 23, bold: true, colorKind: "primary" },
  dateBlock: { fontSize: 14, bold: false, colorKind: "muted" },
  certNumberBlock: { fontSize: 12, bold: false, colorKind: "faint" },
};

export interface CertificateTemplate {
  backgroundUrl?: string | null;
  logoUrl?: string | null;
  showBrandHeader?: boolean;
  primaryColor?: string;
  accentColor?: string;
  orgName?: string;
  titleText?: string;
  introText?: string;
  completionText?: string;
  /** Per-field position/size/color/font overrides. Optional & partial —
   * any field not present falls back to DEFAULT_FIELD_LAYOUT + the field's
   * built-in visual defaults above. */
  layout?: Partial<Record<CertificateFieldKey, CertificateFieldLayout>>;
}

export const DEFAULT_CERTIFICATE_TEMPLATE: Required<CertificateTemplate> = {
  backgroundUrl: "",
  logoUrl: "",
  showBrandHeader: true,
  primaryColor: "#0f4c81",
  accentColor: "#d4af37",
  orgName: "منصة رواسخ التعليمية",
  titleText: "شهادة إتمام",
  introText: "تُمنح هذه الشهادة إلى",
  completionText: "لإتمامه بنجاح دورة",
  layout: DEFAULT_FIELD_LAYOUT,
};

const colorForKind = (t: Required<CertificateTemplate>, kind: "primary" | "accent" | "muted" | "faint" | "dark") => {
  switch (kind) {
    case "primary":
      return t.primaryColor;
    case "accent":
      return t.accentColor;
    case "muted":
      return "#6b7280"; // gray-500
    case "faint":
      return "#9ca3af"; // gray-400
    case "dark":
    default:
      return "#1a2b4a";
  }
};

/** Resolves the fully-effective (no undefined fields) style for one
 * certificate field, given the admin's (possibly partial) template. Shared
 * by the certificate itself and by the admin designer panel, so the panel's
 * inputs always reflect exactly what's rendered. */
export function resolveCertificateFieldLayout(
  template: CertificateTemplate | null | undefined,
  key: CertificateFieldKey,
): Required<CertificateFieldLayout> {
  const t = { ...DEFAULT_CERTIFICATE_TEMPLATE, ...(template || {}) };
  const pos = { ...DEFAULT_FIELD_LAYOUT[key], ...(t.layout?.[key] || {}) };
  const fallback = FIELD_DEFAULT_STYLE[key];
  return {
    x: pos.x,
    y: pos.y,
    fontSize: pos.fontSize ?? fallback.fontSize,
    color: pos.color || colorForKind(t, fallback.colorKind),
    fontFamily: pos.fontFamily || "",
    bold: pos.bold ?? fallback.bold,
    align: pos.align || "center",
  };
}

interface CertificateViewProps {
  studentName: string;
  /** Optional honorific/title the student chose for themselves (e.g. "المهندس", "د."),
   * shown as a prefix before their name. */
  honorific?: string | null;
  courseTitle: string;
  certificateNumber: string;
  issuedAt: string;
  template?: CertificateTemplate | null;
  /** Turns on drag-to-reposition + click-to-select for every field. Used
   * only by the admin template designer — the live student-facing
   * certificate never passes this. */
  editable?: boolean;
  selectedField?: CertificateFieldKey | null;
  onSelectField?: (key: CertificateFieldKey | null) => void;
  onFieldPositionChange?: (key: CertificateFieldKey, x: number, y: number) => void;
}

const CertificateView = ({
  studentName,
  honorific,
  courseTitle,
  certificateNumber,
  issuedAt,
  template,
  editable,
  selectedField,
  onSelectField,
  onFieldPositionChange,
}: CertificateViewProps) => {
  const t = { ...DEFAULT_CERTIFICATE_TEMPLATE, ...(template || {}) };
  const displayName = honorific?.trim() ? `${honorific.trim()} ${studentName}` : studentName;
  const hasBackground = !!t.backgroundUrl;
  const formattedDate = new Date(issuedAt).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const draggingKey = useRef<CertificateFieldKey | null>(null);

  const handlePointerDown = (key: CertificateFieldKey) => (e: React.PointerEvent) => {
    if (!editable) return;
    e.stopPropagation();
    onSelectField?.(key);
    draggingKey.current = key;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore — pointer capture is a progressive enhancement here
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!editable || !draggingKey.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    let x = ((e.clientX - rect.left) / rect.width) * 100;
    let y = ((e.clientY - rect.top) / rect.height) * 100;
    x = Math.min(100, Math.max(0, Math.round(x * 10) / 10));
    y = Math.min(100, Math.max(0, Math.round(y * 10) / 10));
    onFieldPositionChange?.(draggingKey.current, x, y);
  };

  const handlePointerUp = () => {
    draggingKey.current = null;
  };

  const renderField = (key: CertificateFieldKey, content: React.ReactNode, extraStyle?: React.CSSProperties) => {
    const fl = resolveCertificateFieldLayout(template, key);
    const isSelected = editable && selectedField === key;
    return (
      <div
        key={key}
        onPointerDown={handlePointerDown(key)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={(e) => {
          if (!editable) return;
          e.stopPropagation();
          onSelectField?.(key);
        }}
        style={{
          position: "absolute",
          left: `${fl.x}%`,
          top: `${fl.y}%`,
          transform: "translate(-50%, -50%)",
          fontSize: fl.fontSize,
          color: fl.color,
          fontFamily: fl.fontFamily || undefined,
          fontWeight: fl.bold ? 700 : 400,
          textAlign: fl.align,
          whiteSpace: "nowrap",
          maxWidth: "92%",
          cursor: editable ? "grab" : undefined,
          userSelect: editable ? "none" : undefined,
          touchAction: editable ? "none" : undefined,
          outline: isSelected ? "2px dashed #2563eb" : undefined,
          outlineOffset: 4,
          borderRadius: 4,
          padding: editable ? "2px 4px" : undefined,
          zIndex: isSelected ? 2 : 1,
          ...extraStyle,
        }}
      >
        {content}
      </div>
    );
  };

  return (
    <div
      className="certificate-sheet mx-auto w-[1000px] max-w-full aspect-[1.414/1] p-10 relative bg-white bg-cover bg-center"
      style={{
        border: hasBackground ? "none" : `10px solid ${t.primaryColor}`,
        boxSizing: "border-box",
        backgroundImage: hasBackground ? `url(${t.backgroundUrl})` : undefined,
      }}
      dir="rtl"
    >
      <div
        ref={containerRef}
        className="w-full h-full relative"
        style={hasBackground ? undefined : { border: `2px solid ${t.accentColor}` }}
        onClick={() => editable && onSelectField?.(null)}
      >
        {t.showBrandHeader &&
          renderField(
            "brandHeader",
            <div className="flex flex-col items-center gap-2">
              <img src={t.logoUrl || rawasikhLogo} alt={t.orgName} className="h-16 object-contain" />
              <p style={{ letterSpacing: "0.05em", margin: 0 }}>{t.orgName}</p>
            </div>,
          )}

        {renderField("titleText", t.titleText)}
        {renderField("introText", t.introText, { whiteSpace: "normal" })}
        {renderField("studentName", displayName, {
          borderBottom: `2px solid ${t.accentColor}`,
          paddingBottom: 6,
        })}
        {renderField("completionText", t.completionText, { whiteSpace: "normal" })}
        {renderField("courseTitle", courseTitle, { whiteSpace: "normal" })}

        {renderField(
          "dateBlock",
          <div className="flex flex-col items-center">
            <span style={{ display: "block", fontSize: "0.75em", opacity: 0.85, marginBottom: 2 }}>تاريخ الإصدار</span>
            <span>{formattedDate}</span>
          </div>,
        )}

        {renderField(
          "certNumberBlock",
          <div className="flex flex-col items-center">
            <span style={{ display: "block", fontSize: "0.85em", opacity: 0.85, marginBottom: 2 }}>رقم الشهادة</span>
            <span className="font-mono">{certificateNumber}</span>
          </div>,
        )}
      </div>
    </div>
  );
};

export default CertificateView;
