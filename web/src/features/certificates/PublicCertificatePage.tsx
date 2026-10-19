import { BadgeCheck, ShieldAlert } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { academyApi } from "../academy/api";
import { CertificateActions } from "./CertificateActions";
import { CertificateTemplate } from "./CertificateTemplate";

export function PublicCertificatePage({ code }: { code: string }) {
  const query = useQuery({ queryKey: ["public-certificate", code], queryFn: () => academyApi.publicCertificate(code), retry: false });
  return (
    <main className="certificate-page min-h-screen px-3 py-6 sm:px-8">
      <header className="certificate-actions mx-auto mb-5 flex max-w-[1120px] items-center justify-between gap-4">
        <img src={`${import.meta.env.BASE_URL}assets/zaeron_logo_raw.jpeg`} alt="Zaeron" className="h-10 w-40 object-contain object-left" />
        {query.data && <span className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${query.data.status === "valid" ? "border-success/40 bg-success/10 text-success" : "border-danger/40 bg-danger/10 text-danger"}`}>{query.data.status === "valid" ? <BadgeCheck className="size-4" /> : <ShieldAlert className="size-4" />}{query.data.status === "valid" ? "Certificado válido" : "Certificado revogado"}</span>}
      </header>
      {query.isLoading && <div className="mx-auto flex aspect-[1.414/1] max-w-[1120px] items-center justify-center border border-border bg-elevated text-muted">Validando certificado…</div>}
      {query.isError && <div role="alert" className="mx-auto max-w-xl rounded-xl border border-danger/30 bg-danger/10 p-8 text-center text-danger"><ShieldAlert className="mx-auto mb-3 size-8" /><h1 className="font-semibold">Certificado não encontrado</h1><p className="mt-1 text-sm text-muted">Confira o código informado e tente novamente.</p></div>}
      {query.data && <><CertificateTemplate certificate={query.data} /><div className="mt-5"><CertificateActions certificate={query.data} /></div></>}
    </main>
  );
}
