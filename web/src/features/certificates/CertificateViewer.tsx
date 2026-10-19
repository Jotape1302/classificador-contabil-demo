import { Link, useParams } from "react-router-dom";
import { Skeleton } from "../../components/ui/skeleton";
import { useCertificate } from "../academy/hooks";
import { CertificateActions } from "./CertificateActions";
import { CertificateTemplate } from "./CertificateTemplate";

export function CertificateViewer() {
  const id = Number(useParams().certificateId);
  const query = useCertificate(id);
  return (
    <main className="certificate-page min-h-screen px-3 py-6 sm:px-8">
      <div className="certificate-actions mx-auto mb-5 max-w-[1120px]"><Link to="/certificates" className="text-sm text-copper hover:text-action">← Meus certificados</Link></div>
      {query.isLoading && <Skeleton className="mx-auto aspect-[1.414/1] max-w-[1120px]" />}
      {query.isError && <p className="mx-auto max-w-xl rounded-xl border border-danger/30 bg-danger/10 p-5 text-danger">Certificado não encontrado.</p>}
      {query.data && <><CertificateTemplate certificate={query.data} /><div className="mt-5"><CertificateActions certificate={query.data} /></div></>}
    </main>
  );
}
