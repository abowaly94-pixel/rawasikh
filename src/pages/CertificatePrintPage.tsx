import { useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import CertificateView from "@/components/certificates/CertificateView";
import { useCertificateTemplate } from "@/hooks/useCertificateTemplate";
import { Printer, ArrowRight } from "lucide-react";

interface CertificateRow {
  id: string;
  student_id: string;
  student_name: string;
  honorific: string | null;
  course_title: string;
  certificate_number: string;
  issued_at: string;
}

const CertificatePrintPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const { data: certificate, isLoading, error } = useQuery({
    queryKey: ["certificate", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificates")
        .select("id, student_id, student_name, honorific, course_title, certificate_number, issued_at")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as CertificateRow;
    },
    enabled: !!id && !!user,
  });

  const { data: template } = useCertificateTemplate();

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-lg text-muted-foreground">تعذر العثور على الشهادة</p>
        <Button asChild variant="outline">
          <Link to="/dashboard/my-certificates">
            <ArrowRight className="ml-2 h-4 w-4" />
            العودة لشهاداتي
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40 print:bg-white flex flex-col items-center py-8 px-4 print:p-0">
      <div className="w-full max-w-4xl flex items-center justify-between mb-6 print:hidden">
        <Button asChild variant="ghost">
          <Link to="/dashboard/my-certificates">
            <ArrowRight className="ml-2 h-4 w-4" />
            العودة
          </Link>
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="ml-2 h-4 w-4" />
          طباعة / تحميل PDF
        </Button>
      </div>

      <CertificateView
        studentName={certificate.student_name}
        honorific={certificate.honorific}
        courseTitle={certificate.course_title}
        certificateNumber={certificate.certificate_number}
        issuedAt={certificate.issued_at}
        template={template}
      />
    </div>
  );
};

export default CertificatePrintPage;
