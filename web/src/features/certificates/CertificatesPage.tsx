import { Award, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "../../components/ui/skeleton";
import { useCertificates } from "../academy/hooks";

export function CertificatesPage() {
  const query = useCertificates();
  return (
    <main className="min-h-screen px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link to="/academy" className="text-sm text-copper hover:text-action">← Voltar à Academy</Link>
        <h1 className="mt-5 text-3xl font-semibold">Meus certificados</h1>
        <p className="mt-1 text-sm text-muted">Credenciais verificáveis emitidas pela Zaeron Academy.</p>
        {query.isLoading && <div className="mt-8 space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>}
        {query.isError && <p className="mt-8 rounded-xl border border-danger/30 bg-danger/10 p-4 text-danger">Não foi possível carregar seus certificados.</p>}
        {query.data?.certificates.length === 0 && <div className="mt-8 rounded-xl border border-border bg-elevated p-10 text-center"><Award className="mx-auto size-8 text-copper" /><p className="mt-3 font-semibold">Nenhum certificado emitido</p><p className="mt-1 text-sm text-muted">Conclua o curso e seja aprovado no quiz final.</p></div>}
        <div className="mt-8 space-y-3">
          {query.data?.certificates.map((certificate) => (
            <Link key={certificate.id} to={`/certificates/${certificate.id}`} className="flex items-center gap-4 rounded-xl border border-border bg-elevated p-5 transition-colors duration-150 hover:border-copper/60">
              <img src="/assets/zaeron_brand_assets.jpeg" alt="" className="size-12 rounded-full border border-copper object-cover" />
              <div className="min-w-0 flex-1"><h2 className="truncate font-semibold">{certificate.course_title}</h2><p className="mt-1 text-xs text-muted">{certificate.public_code} · {new Intl.DateTimeFormat("pt-BR").format(new Date(certificate.issued_at))}</p></div>
              <ChevronRight className="size-5 text-muted" />
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
