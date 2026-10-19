// Porta para o navegador do núcleo de classificação do backend (bank_cleaner.py e
// classificar_transacoes_hibrido_puro em classifier_engine.py). As regras vêm de
// rules.generated.ts, gerado do próprio Python. Sem LLM: o que as regras não cobrem vai
// para o motor semântico — o mesmo fallback que o backend usa quando a IA não responde.
import {
  NATIVE_RULES,
  SEMANTIC_EXPENSE,
  SEMANTIC_INCOME,
  SEMANTIC_MAGNITUDE,
} from "./rules.generated";

export type OfficeRule = {
  id: number;
  search_term: string;
  category: string;
  debit_account: string | null;
  credit_account: string | null;
  history_code: string | null;
  times_applied: number;
};

export type Classification = {
  category: string;
  confidence: number;
  source: string;
  justification: string;
  debit_account: string | null;
  credit_account: string | null;
  history_code: string | null;
  rule_id?: number;
};

const removeAccents = (text: string) => text.normalize("NFKD").replace(/\p{M}/gu, "");
export const normalizeText = (text: string) => removeAccents(String(text ?? "")).toUpperCase().trim();

// Mesmas expressões de bank_cleaner.py.
const RE_CANAL_PREFIXOS = new RegExp(
  "^(?:" +
    "PIX\\s+(?:TRANSF(?:ERENCIA)?|ENVIAD[OA]|RECEBID[OA]|PAGAMENTO|PAGTO|QRD|QR-CODE|ESTORNO|DEV|DEVOLUCAO|COB|SAQUE|TROCO|\\d+)\\s*|" +
    "PIX\\s*[-/:]\\s*|" +
    "PIX\\s+(?=[A-Z])|" +
    "COMPRA\\s+(?:CARTAO|DEBITO|CREDITO|NACIONAL|INTERNACIONAL|A\\s+VISTA|PARCELADA|\\d+)\\s*|" +
    "COMPRA\\s*[-/:]\\s*|" +
    "PAG(?:TO|AMENTO)?\\s+(?:ELETRON(?:ICO)?|TITULO|COBRANCA|BOLETO|CONCESSIONARIA|TRIBUTO|GPS|DARF|DAS|FGTS|CONVENIO|CONTA|AGENDADO|FATURA|\\d+)\\s*|" +
    "PAG(?:TO|AMENTO)?\\s*[-/:]\\s*|" +
    "DEB(?:ITO)?\\s+(?:AUTOM(?:ATICO)?|AUT|CTA|CONTA|DIR|DIRETO|PENDENTE|DIVERSOS|\\d+)\\s*|" +
    "DEB(?:ITO)?\\s*[-/:]\\s*|" +
    "TED\\s+(?:TRANSF(?:ERENCIA)?|DIF(?:ERENTE)?\\s+TITUL(?:ARIDADE)?|MESMA\\s+TITUL(?:ARIDADE)?|ELETRONICA|CIP|STR|JUDICIAL|E|D|C|\\d{3,5})\\s*|" +
    "TED\\s*[-/:]\\s*|" +
    "TED\\s+(?=[A-Z])|" +
    "DOC\\s+(?:TRANSF(?:ERENCIA)?|ELETRONICO|E|D|C|\\d{3,5})\\s*|" +
    "DOC\\s*[-/:]\\s*|" +
    "DOC\\s+(?=[A-Z])|" +
    "TEF\\s+(?:TRANSF(?:ERENCIA)?|MESMA\\s+TITUL(?:ARIDADE)?|DIF\\s+TITUL(?:ARIDADE)?|\\d+)\\s*|" +
    "TEF\\s*[-/:]\\s*|" +
    "TRANSF(?:ERENCIA)?\\s+(?:ELETR(?:ONICA)?|ENTRE\\s+CONTAS|CONTA\\s+CORRENTE|INTERNA|RECURSOS|SALDO|CC|DE|PARA)\\s*|" +
    "LIQ(?:UIDACAO)?\\s+(?:COBRANCA|TITULO|DOC|BOLETO|DUPLICATA)\\s*|" +
    "DEP(?:OSITO)?\\s+(?:DINHEIRO|CHEQUE|TERMINAL|ENVELOPE|IDENTIFICADO|ONLINE|LOTERICA|ATM)\\s*|" +
    "CRED(?:ITO)?\\s+(?:TEF|TED|DOC|PIX|CONTA|DIVERSOS|SALARIO|BENEFICIO|AVULSO)\\s*|" +
    "LANC(?:AMENTO)?\\s+(?:A\\s+DEBITO|A\\s+CREDITO|MANUAL|AVULSO|SISTEMA)\\s*|" +
    "CHEQUE\\s+(?:COMPENSADO|PAGO|EMITIDO|DEVOLVIDO)\\s*|" +
    "RESGATE\\s+(?:AUTOMATICO|APLICACAO|INVESTIMENTO|POUPANCA|CDB|FUNDO)\\s*|" +
    "APLICACAO\\s+(?:AUTOMATICA|FINANCEIRA|INVESTIMENTO|POUPANCA|CDB|FUNDO)\\s*|" +
    "TARIFA\\s+(?:BANCARIA|EXTRATO|PACOTE|CONTA|TRANSACAO|TED|DOC|PIX|MENSALIDADE|AVULSA)\\s*|" +
    "TAR\\s+(?:BANC|EXT|PCT|CTA|TRANS|TED|DOC|PIX|MENSAL)\\s*|" +
    "IOF\\s+(?:RETIDO|S/OPERACOES|OPER\\s+CRED|FINANCIAMENTO|CAMBIO)\\s*" +
    ")",
  "i",
);
const RE_CONTROLE_BANCARIO = new RegExp(
  "(?:" +
    "\\b(?:AUT|AUTORIZACAO|NSU|DOC|NR|NUM|NRO|REF|SEQ|LOTE|CTRL|CONV|TERM|VAL)\\s*[:#-]?\\s*[A-Z0-9\\.\\-]+\\b|" +
    "\\b(?:AG|CTA|CC)\\s*[:#-]?\\s*\\d{3,10}(?:-\\d)?\\b|" +
    "\\b\\d{1,2}/\\d{1,2}(?:/\\d{2,4})?\\b|" +
    "\\b\\d{2}\\.\\d{2}\\.(?:\\d{4}|\\d{2})\\b|" +
    "\\b\\d{4,}\\b" +
    ")",
  "gi",
);

export function cleanBankDescription(rawText: string | null | undefined): string {
  const text = String(rawText ?? "").trim();
  if (!text || ["nan", "none", "null", "-", "0"].includes(text.toLowerCase())) return "LANCAMENTO BANCARIO";

  let clean = removeAccents(text).toUpperCase().replace(/\*+/g, " ");
  const sameOwner = clean.includes("MESMA TITULARIDADE") || clean.includes("TRANSF ENTRE CONTAS");
  for (let i = 0; i < 2; i++) clean = clean.replace(RE_CANAL_PREFIXOS, "").trim();
  if (sameOwner && !clean) clean = "MESMA TITULARIDADE";
  clean = clean
    .replace(RE_CONTROLE_BANCARIO, " ")
    .replace(/[^A-Z0-9\s&/.-]/g, " ")
    .replace(/[.\-/_]{2,}/g, " ")
    .replace(/^\s*[.\-/_]+\s*/, "")
    .replace(/\s*[.\-/_]+\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (clean.length < 2) {
    const fallback = removeAccents(text).toUpperCase().replace(/[^A-Z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    return fallback.length >= 2 ? fallback : "LANCAMENTO BANCARIO";
  }
  return clean;
}

export function generateAccountingHistory(cleanText: string, category: string, isOutflow: boolean): string {
  const cat = category ? normalizeText(category) : "";
  const desc = cleanText?.trim() || "LANCAMENTO BANCARIO";
  const transfer = ["TRANSFERENCIAS E APLICACOES", "TRANSFERENCIA ENTRE CONTAS", "MESMA TITULARIDADE", "APLICACAO", "RESGATE", "INTERNA"];
  if (transfer.some((k) => cat.includes(k)) || desc.includes("MESMA TITULARIDADE") || desc.includes("TRANSF ENTRE CONTAS")) {
    return "Vlr. ref. transferência entre contas bancárias da empresa.";
  }
  return isOutflow
    ? `Vlr. ref. pagamento ${desc} conf. extrato bancário.`
    : `Vlr. ref. recebimento ${desc} conf. extrato bancário.`;
}

const NATIVE_REGEX = NATIVE_RULES.map((rule) => ({ rule, regexes: rule.patterns.map((p) => new RegExp(p, "i")) }));

/** Nível 1 (regras salvas do escritório) e Nível 2 (regras nativas), como pre_classificar_por_regras. */
function classifyByRules(description: string, officeRules: OfficeRule[]): Classification | null {
  const cleanNorm = normalizeText(cleanBankDescription(description));
  const rawNorm = normalizeText(description);

  for (const rule of officeRules) {
    const term = normalizeText(rule.search_term);
    if (term.length < 2) continue;
    if (cleanNorm.includes(term) || rawNorm.includes(term)) {
      return {
        category: rule.category || "Outras Despesas",
        confidence: 1,
        source: "Regra Salva do Escritório",
        justification: `Memória do escritório (${rule.times_applied}x aplicada)`,
        debit_account: rule.debit_account,
        credit_account: rule.credit_account,
        history_code: rule.history_code,
        rule_id: rule.id,
      };
    }
  }
  for (const { rule, regexes } of NATIVE_REGEX) {
    if (regexes.some((re) => re.test(cleanNorm) || re.test(rawNorm))) {
      return {
        category: rule.category,
        confidence: rule.confidence,
        source: "Regra Nativa",
        justification: rule.justification,
        debit_account: null,
        credit_account: null,
        history_code: null,
      };
    }
  }
  return null;
}

/** inferir_categoria_semantica: heurística por palavra-chave e faixa de valor. */
function classifySemantic(description: string, amount: number): Classification {
  const norm = normalizeText(description);
  const pick = (r: { category: string; confidence: number; justification: string }): Classification => ({
    category: r.category,
    confidence: r.confidence,
    justification: r.justification,
    source: "Motor Inteligente",
    debit_account: null,
    credit_account: null,
    history_code: null,
  });
  if (amount > 0) {
    const transfer = SEMANTIC_INCOME.transfer;
    return pick(transfer.words.some((w) => norm.includes(w)) ? transfer : SEMANTIC_INCOME.default);
  }
  const block = SEMANTIC_EXPENSE.find((b) => b.words.some((w) => norm.includes(w)));
  if (block) return pick(block);
  const abs = Math.abs(amount);
  if (abs > SEMANTIC_MAGNITUDE.high.above) return pick(SEMANTIC_MAGNITUDE.high);
  if (abs < SEMANTIC_MAGNITUDE.low.below) return pick(SEMANTIC_MAGNITUDE.low);
  return pick(SEMANTIC_MAGNITUDE.default);
}

/** Cascata de classificar_transacoes_hibrido_puro: regras na descrição original, depois na limpa, depois semântico. */
export function classify(original: string, clean: string, amount: number, officeRules: OfficeRule[]) {
  const byRules = classifyByRules(original, officeRules) ?? (clean !== original ? classifyByRules(clean, officeRules) : null);
  return { result: byRules ?? classifySemantic(clean || original, amount), local: byRules !== null };
}
