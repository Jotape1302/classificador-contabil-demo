import { Copy, Download, Printer } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import type { AcademyCertificate, PublicCertificate } from "../academy/types";

function escapeHtml(value: string | number) {
  const element = document.createElement("span");
  element.textContent = String(value);
  return element.innerHTML;
}

async function assetDataUrl(path: string) {
  const blob = await fetch(path).then((response) => response.blob());
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function CertificateActions({ certificate }: { certificate: AcademyCertificate | PublicCertificate }) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const validationUrl = new URL(`${import.meta.env.BASE_URL}?certificado=${encodeURIComponent(certificate.public_code)}`, window.location.origin).toString();

  const copyLink = async () => {
    await navigator.clipboard.writeText(validationUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const download = async () => {
    setDownloading(true);
    try {
      const [logo, seal] = await Promise.all([
        assetDataUrl(`${import.meta.env.BASE_URL}assets/zaeron_logo_raw.jpeg`),
        assetDataUrl(`${import.meta.env.BASE_URL}assets/zaeron_brand_assets.jpeg`),
      ]);
      const score = "score" in certificate ? `<p class="score">Aproveitamento final: ${certificate.score.toFixed(0)}%</p>` : "";
      const issued = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(certificate.issued_at));
      const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(certificate.public_code)}</title><style>
        @page{size:A4 landscape;margin:0}*{box-sizing:border-box}body{margin:0;background:#ddd;font-family:Arial,sans-serif;color:#221A16}.sheet{position:relative;width:297mm;height:210mm;margin:auto;padding:23mm;border:8px solid #C8753D;background:#F6F1EA;text-align:center}.inner{position:absolute;inset:4mm;border:1px solid rgba(200,117,61,.55);pointer-events:none}.logo{width:72mm;height:20mm;object-fit:cover;border-radius:3mm}.eyebrow{margin:9mm 0 3mm;color:#8A4C2B;font-size:10pt;font-weight:700;letter-spacing:.35em;text-transform:uppercase}.intro{margin:0;font-size:11pt}.name{margin:2mm auto 0;font:700 30pt Georgia,serif}.line{width:65%;height:1px;margin:3mm auto;background:#C8753D}.description{max-width:210mm;margin:6mm auto 0;font-size:12pt;line-height:1.6}.score{font-size:9pt;color:#68554A}.meta{position:absolute;bottom:15mm;left:22mm;text-align:left;font-size:8pt;color:#68554A}.code{margin-top:2mm;font-family:monospace;font-weight:700;color:#442C21}.seal{position:absolute;right:22mm;bottom:11mm;display:flex;align-items:center;gap:4mm;text-align:left}.seal img{width:21mm;height:21mm;border:2px solid #C8753D;border-radius:50%;object-fit:cover}.seal strong{display:block;font-size:9pt;text-transform:uppercase;letter-spacing:.1em}.seal span{font-size:7pt;color:#68554A}@media print{body{background:#fff}.sheet{margin:0}}
      </style></head><body><article class="sheet"><div class="inner"></div><img class="logo" src="${logo}" alt="Zaeron"><p class="eyebrow">Certificado de conclusão</p><p class="intro">Certificamos que</p><h1 class="name">${escapeHtml(certificate.recipient_name)}</h1><div class="line"></div><p class="description">concluiu o curso <strong>${escapeHtml(certificate.course_title)}</strong>, com carga horária de ${Math.round(certificate.duration_minutes / 60)} horas, demonstrando domínio dos fundamentos e práticas apresentados.</p>${score}<div class="meta"><div>Emitido em ${escapeHtml(issued)}</div><div class="code">${escapeHtml(certificate.public_code)}</div></div><div class="seal"><img src="${seal}" alt="Selo Zaeron"><div><strong>Zaeron Certified</strong><span>Validação pública verificável</span></div></div></article></body></html>`;
      const href = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = `certificado-${certificate.public_code}.html`;
      anchor.click();
      URL.revokeObjectURL(href);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="certificate-actions flex flex-wrap justify-center gap-2">
      <Button onClick={() => window.print()}><Printer className="size-4" />Imprimir</Button>
      <Button variant="secondary" onClick={copyLink}><Copy className="size-4" />{copied ? "Link copiado" : "Copiar validação"}</Button>
      <Button variant="secondary" disabled={downloading} onClick={() => void download()}><Download className="size-4" />{downloading ? "Preparando…" : "Download"}</Button>
    </div>
  );
}
