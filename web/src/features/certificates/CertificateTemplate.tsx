import type { AcademyCertificate, PublicCertificate } from "../academy/types";

type CertificateData = AcademyCertificate | PublicCertificate;

export function CertificateTemplate({ certificate }: { certificate: CertificateData }) {
  const score = "score" in certificate ? certificate.score : null;
  return (
    <article id="zaeron-certificate" className="certificate-sheet relative mx-auto aspect-[1.414/1] w-full max-w-[1120px] overflow-hidden border-[10px] border-copper bg-[#F6F1EA] p-[clamp(24px,5vw,72px)] text-center text-[#221A16] shadow-2xl">
      <div className="pointer-events-none absolute inset-3 border border-[#C8753D]/45" />
      <img src={`${import.meta.env.BASE_URL}assets/zaeron_logo_raw.jpeg`} alt="Zaeron" className="mx-auto h-[clamp(42px,7vw,78px)] w-[clamp(150px,24vw,270px)] rounded-md object-cover object-center" />
      <p className="mt-[clamp(16px,3vw,36px)] text-[clamp(10px,1.2vw,15px)] font-semibold uppercase tracking-[0.36em] text-[#8A4C2B]">Certificado de conclusão</p>
      <p className="mt-[clamp(12px,2vw,24px)] text-[clamp(11px,1.4vw,17px)]">Certificamos que</p>
      <h1 className="mx-auto mt-2 max-w-4xl font-serif text-[clamp(25px,4.2vw,54px)] font-semibold leading-tight text-[#2A1D17]">{certificate.recipient_name}</h1>
      <div className="mx-auto mt-3 h-px w-2/3 bg-gradient-to-r from-transparent via-[#C8753D] to-transparent" />
      <p className="mx-auto mt-[clamp(14px,2.5vw,30px)] max-w-3xl text-[clamp(11px,1.45vw,18px)] leading-relaxed">
        concluiu o curso <strong>{certificate.course_title}</strong>, com carga horária de {Math.round(certificate.duration_minutes / 60)} horas,
        demonstrando domínio dos fundamentos e práticas apresentados.
      </p>
      {score !== null && <p className="mt-3 text-[clamp(10px,1.1vw,14px)] text-[#68554A]">Aproveitamento final: {score.toFixed(0)}%</p>}
      <div className="absolute bottom-[clamp(22px,4vw,55px)] left-[clamp(28px,6vw,80px)] text-left text-[clamp(9px,1vw,12px)] text-[#68554A]">
        <p>Emitido em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(certificate.issued_at))}</p>
        <p className="mt-1 font-mono font-semibold text-[#442C21]">{certificate.public_code}</p>
      </div>
      <div className="absolute bottom-[clamp(18px,3vw,42px)] right-[clamp(28px,6vw,80px)] flex items-center gap-3 text-left">
        <img src={`${import.meta.env.BASE_URL}assets/zaeron_brand_assets.jpeg`} alt="Selo oficial Zaeron" className="size-[clamp(48px,7vw,86px)] rounded-full border-2 border-[#C8753D] object-cover shadow-lg" />
        <div><strong className="block text-[clamp(10px,1.2vw,14px)] uppercase tracking-wider">Zaeron Certified</strong><span className="text-[clamp(8px,.9vw,11px)] text-[#68554A]">Validação pública verificável</span></div>
      </div>
    </article>
  );
}
