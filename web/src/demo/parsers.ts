// Leitura de extratos no navegador para a demonstração, seguindo adapters/parsers.py
// (ler_extrato_ofx e padronizar_colunas do CSV). PDF exige o backend (pdfplumber/OCR).
export type ParsedRow = { date: string; description: string; amount: number };

export class StatementError extends Error {}

function decode(bytes: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

function isoDate(value: string): string | null {
  const text = value.trim();
  let m = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) {
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${year}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  m = text.match(/^(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

export function parseOfx(text: string): ParsedRow[] {
  const body = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  let blocks = body.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi);
  if (!blocks) blocks = body.match(/<STMTTRN>[\s\S]*?(?=<STMTTRN>|<\/BANKTRANLIST>|$)/gi);
  const tag = (block: string, name: string) => block.match(new RegExp(`<${name}>(.*?)(?=\\r|\\n|<)`, "i"))?.[1].trim() ?? "";

  const rows: ParsedRow[] = [];
  for (const block of blocks ?? []) {
    const date = block.match(/<DTPOSTED>(\d{8})/i)?.[1];
    const amount = block.match(/<TRNAMT>([-\d.,]+)/i)?.[1];
    if (!date || !amount) continue;
    const name = tag(block, "NAME");
    const memo = tag(block, "MEMO");
    const parts = [name, memo && memo !== name ? memo : ""].filter(Boolean);
    if (!parts.length && tag(block, "PAYEE")) parts.push(tag(block, "PAYEE"));
    const check = tag(block, "CHECKNUM");
    const description = parts.join(" - ") || (check ? `Documento Cheque/Doc ${check}` : "Lançamento Bancário");
    rows.push({
      date: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`,
      description: description.replace(/\s+/g, " ").trim(),
      amount: Number(amount.replace(",", ".")) || 0,
    });
  }
  if (!rows.length) throw new StatementError("Nenhuma transação identificada no arquivo OFX.");
  return rows;
}

function brlNumber(value: string): number {
  let text = String(value ?? "").replace("R$", "").replace(/\s/g, "").trim();
  if (!text || ["nan", "none", "-"].includes(text.toLowerCase())) return 0;
  const negative = text.startsWith("-") || /d$/i.test(text) || (text.startsWith("(") && text.endsWith(")"));
  if (text.includes(",") && text.includes(".")) text = text.replace(/\./g, "").replace(",", ".");
  else if (text.includes(",")) text = text.replace(",", ".");
  const n = Number(text.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? (negative ? -n : n) : 0;
}

function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { cur += '"'; i++; } else quoted = !quoted;
    } else if (ch === sep && !quoted) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

const norm = (s: string) => s.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().trim().replace(/[\s-]+/g, "_");
const ALIAS = {
  date: ["data", "dt", "date", "dt_mov", "dt_lancamento", "data_movimento", "data_lancamento", "dia"],
  desc: ["descricao", "historico", "memo", "description", "detalhe", "lancamento", "documento", "favorecido", "transacao", "historico_completo"],
  value: ["valor", "val", "amount", "valor_lancamento", "vlr", "saldo_mov"],
  debit: ["debito", "saida", "valor_debito", "deb", "despesa", "debitos"],
  credit: ["credito", "entrada", "valor_credito", "cred", "receita", "creditos"],
};
const matches = (col: string, keys: string[]) => keys.some((k) => k === col || col.includes(k));

export function parseCsv(text: string): ParsedRow[] {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  for (const sep of [",", ";", "\t", "|"]) {
    const header = splitCsvLine(lines[0] ?? "", sep);
    if (header.length < 2 || lines.length < 2) continue;
    const cols = header.map(norm);
    let date = -1, value = -1, debit = -1, credit = -1;
    const desc: number[] = [];
    cols.forEach((c, i) => {
      if (date < 0 && matches(c, ALIAS.date)) date = i;
      else if (matches(c, ALIAS.debit)) debit = i;
      else if (matches(c, ALIAS.credit)) credit = i;
      else if (value < 0 && matches(c, ALIAS.value)) value = i;
      else if (matches(c, ALIAS.desc)) desc.push(i);
    });
    if (date < 0) date = 0;
    if (!desc.length) desc.push(1);
    const rows: ParsedRow[] = [];
    for (const line of lines.slice(1)) {
      const cells = splitCsvLine(line, sep);
      const iso = isoDate(cells[date] ?? "");
      if (!iso) continue;
      const parts = [...new Set(desc.map((i) => cells[i] ?? "").filter((v) => v && !["nan", "none", "null", "-", "0"].includes(v.toLowerCase())))];
      const amount = debit >= 0 && credit >= 0
        ? Math.abs(brlNumber(cells[credit])) - Math.abs(brlNumber(cells[debit]))
        : value >= 0 ? brlNumber(cells[value]) : 0;
      rows.push({ date: iso, description: (parts.join(" - ") || "Lançamento Bancário").replace(/\s+/g, " "), amount: Math.round(amount * 100) / 100 });
    }
    if (rows.length) return rows;
  }
  throw new StatementError("Não foi possível identificar as colunas do CSV. Certifique-se de incluir campos de Data, Descrição/Histórico e Valor.");
}

export async function parseStatement(file: File): Promise<{ format: string; rows: ParsedRow[] }> {
  const format = file.name.split(".").pop()?.toLowerCase() ?? "";
  // PDF depende do backend (pdfplumber/OCR): na demonstração vira o extrato de exemplo.
  if (format === "pdf") return { format, rows: parseOfx(sampleOfx()) };
  if (format !== "ofx" && format !== "csv") throw new StatementError("Formato permitido: OFX, CSV ou PDF.");
  const text = decode(await file.arrayBuffer());
  return { format, rows: format === "ofx" ? parseOfx(text) : parseCsv(text) };
}

/** Extrato OFX fictício de um escritório contábil, usado no botão "extrato de exemplo" e no histórico inicial. */
export function sampleOfx(monthOffset = 0): string {
  const base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth() - monthOffset);
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, "0");
  const items: [number, number, string][] = [
    [2, 18450, "PIX RECEBIDO CLIENTE ALFA COMERCIO LTDA"],
    [3, -2800, "PAG BOLETO ALUGUEL SALA COMERCIAL 0832"],
    [4, -580.4, "DEB AUTOM COPEL ENERGIA ELETRICA"],
    [5, -189.9, "DEB AUTOM SANEPAR AGUA E ESGOTO"],
    [5, -299.9, "VIVO EMPRESAS FATURA 2203"],
    [6, 7800, "LIQ COBRANCA DUPLICATA 4455 BETA SERVICOS"],
    [7, -1250.33, "DARF SIMPLES NACIONAL DAS"],
    [8, -15400, "PAGTO FOLHA SALARIO COLABORADORES"],
    [9, -75, "TARIFA BANCARIA PACOTE MENSAL CONTA"],
    [10, -32.5, "COMPRA CARTAO *UBER *TRIP 1234"],
    [11, -64.9, "IFOOD *RESTAURANTE CENTRAL"],
    [12, -410.22, "AWS AMAZON WEB SERVICES"],
    [13, -243.1, "COMPRA DEBITO KALUNGA COMERCIO"],
    [14, -5000, "APLICACAO AUTOMATICA CDB"],
    [15, 3200, "RESGATE CDB AUTOMATICO"],
    [16, -900, "GOOGLE ADS MARKETING DIGITAL"],
    [17, 12300, "TED RECEBIDA GAMA INDUSTRIA HONORARIOS CONTABEIS"],
    [18, -3.21, "IOF S/OPERACOES"],
    [19, -1890, "PIX ENVIADO ESTUDIO DELTA SOFTWARE"],
    [20, -2500, "PIX ENVIADO FORNECEDOR 88213"],
    [21, -129.9, "POSTO SHELL COMBUSTIVEL"],
    [22, 950, "PIX RECEBIDO MENSALIDADE CLIENTE EPSILON"],
    [23, -3499, "COMPRA CARTAO DELL NOTEBOOK"],
    [24, -1200, "HONORARIOS ADVOCACIA SILVA"],
    [26, -18.9, "PIX QRD PADARIA DO BAIRRO"],
  ];
  const trn = items.map(([day, amount, memo], i) => [
    "<STMTTRN>",
    `<TRNTYPE>${amount < 0 ? "DEBIT" : "CREDIT"}`,
    `<DTPOSTED>${y}${m}${String(day).padStart(2, "0")}120000`,
    `<TRNAMT>${amount.toFixed(2)}`,
    `<FITID>DEMO${y}${m}${String(i + 1).padStart(3, "0")}`,
    `<MEMO>${memo}`,
    "</STMTTRN>",
  ].join("\n"));
  return `OFXHEADER:100\nDATA:OFXSGML\nVERSION:102\n\n<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><CURDEF>BRL\n<BANKTRANLIST>\n${trn.join("\n")}\n</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>\n`;
}
