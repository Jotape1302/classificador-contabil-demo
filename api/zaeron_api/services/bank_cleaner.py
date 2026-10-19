"""
Módulo de Sanitização Bancária e Geração de Redação Contábil - Zaeron Contábil
Responsável pela remoção de ruídos operacionais dos extratos bancários brasileiros
e pela geração de histórico contábil padronizado para ERPs (Domínio, Questor, Omie, Fortes).
"""

import re
from typing import Optional
import unicodedata


def _remover_acentos(texto: str) -> str:
    """Remove diacríticos e acentos mantendo caracteres ASCII."""
    if not texto:
        return ""
    nfkd = unicodedata.normalize("NFKD", str(texto))
    return "".join([c for c in nfkd if not unicodedata.combining(c)])


# Expressões Regulares compiladas para máxima performance em lote
RE_CANAL_PREFIXOS = re.compile(
    r"^(?:"
    r"PIX\s+(?:TRANSF(?:ERENCIA)?|ENVIAD[OA]|RECEBID[OA]|PAGAMENTO|PAGTO|QRD|QR-CODE|ESTORNO|DEV|DEVOLUCAO|COB|SAQUE|TROCO|\d+)\s*|"
    r"PIX\s*[-/:]\s*|"
    r"PIX\s+(?=[A-Z])|"
    r"COMPRA\s+(?:CARTAO|DEBITO|CREDITO|NACIONAL|INTERNACIONAL|A\s+VISTA|PARCELADA|\d+)\s*|"
    r"COMPRA\s*[-/:]\s*|"
    r"PAG(?:TO|AMENTO)?\s+(?:ELETRON(?:ICO)?|TITULO|COBRANCA|BOLETO|CONCESSIONARIA|TRIBUTO|GPS|DARF|DAS|FGTS|CONVENIO|CONTA|AGENDADO|FATURA|\d+)\s*|"
    r"PAG(?:TO|AMENTO)?\s*[-/:]\s*|"
    r"DEB(?:ITO)?\s+(?:AUTOM(?:ATICO)?|AUT|CTA|CONTA|DIR|DIRETO|PENDENTE|DIVERSOS|\d+)\s*|"
    r"DEB(?:ITO)?\s*[-/:]\s*|"
    r"TED\s+(?:TRANSF(?:ERENCIA)?|DIF(?:ERENTE)?\s+TITUL(?:ARIDADE)?|MESMA\s+TITUL(?:ARIDADE)?|ELETRONICA|CIP|STR|JUDICIAL|E|D|C|\d{3,5})\s*|"
    r"TED\s*[-/:]\s*|"
    r"TED\s+(?=[A-Z])|"
    r"DOC\s+(?:TRANSF(?:ERENCIA)?|ELETRONICO|E|D|C|\d{3,5})\s*|"
    r"DOC\s*[-/:]\s*|"
    r"DOC\s+(?=[A-Z])|"
    r"TEF\s+(?:TRANSF(?:ERENCIA)?|MESMA\s+TITUL(?:ARIDADE)?|DIF\s+TITUL(?:ARIDADE)?|\d+)\s*|"
    r"TEF\s*[-/:]\s*|"
    r"TRANSF(?:ERENCIA)?\s+(?:ELETR(?:ONICA)?|ENTRE\s+CONTAS|CONTA\s+CORRENTE|INTERNA|RECURSOS|SALDO|CC|DE|PARA)\s*|"
    r"LIQ(?:UIDACAO)?\s+(?:COBRANCA|TITULO|DOC|BOLETO|DUPLICATA)\s*|"
    r"DEP(?:OSITO)?\s+(?:DINHEIRO|CHEQUE|TERMINAL|ENVELOPE|IDENTIFICADO|ONLINE|LOTERICA|ATM)\s*|"
    r"CRED(?:ITO)?\s+(?:TEF|TED|DOC|PIX|CONTA|DIVERSOS|SALARIO|BENEFICIO|AVULSO)\s*|"
    r"LANC(?:AMENTO)?\s+(?:A\s+DEBITO|A\s+CREDITO|MANUAL|AVULSO|SISTEMA)\s*|"
    r"CHEQUE\s+(?:COMPENSADO|PAGO|EMITIDO|DEVOLVIDO)\s*|"
    r"RESGATE\s+(?:AUTOMATICO|APLICACAO|INVESTIMENTO|POUPANCA|CDB|FUNDO)\s*|"
    r"APLICACAO\s+(?:AUTOMATICA|FINANCEIRA|INVESTIMENTO|POUPANCA|CDB|FUNDO)\s*|"
    r"TARIFA\s+(?:BANCARIA|EXTRATO|PACOTE|CONTA|TRANSACAO|TED|DOC|PIX|MENSALIDADE|AVULSA)\s*|"
    r"TAR\s+(?:BANC|EXT|PCT|CTA|TRANS|TED|DOC|PIX|MENSAL)\s*|"
    r"IOF\s+(?:RETIDO|S/OPERACOES|OPER\s+CRED|FINANCIAMENTO|CAMBIO)\s*"
    r")",
    re.IGNORECASE,
)

# Códigos de controle operacional, NSU, autorização, datas embutidas e números longos
RE_CONTROLE_BANCARIO = re.compile(
    r"(?:"
    r"\b(?:AUT|AUTORIZACAO|NSU|DOC|NR|NUM|NRO|REF|SEQ|LOTE|CTRL|CONV|TERM|VAL)\s*[:#-]?\s*[A-Z0-9\.\-]+\b|"
    r"\b(?:AG|CTA|CC)\s*[:#-]?\s*\d{3,10}(?:-\d)?\b|"
    r"\b\d{1,2}/\d{1,2}(?:/\d{2,4})?\b|"  # Datas embutidas como 01/08 ou 08/2026 ou 23/08/2026
    r"\b\d{2}\.\d{2}\.(?:\d{4}|\d{2})\b|"
    r"\b\d{4,}\b"  # Números de 4 dígitos ou mais soltos (IDs, códigos bancários, etc)
    r")",
    re.IGNORECASE,
)

# Padrões com asteriscos (ex: *UBER *TRIP 1234, *IFOOD *SAOPAULO)
RE_ASTERISCOS = re.compile(r"\*+")

# Ruídos de caracteres especiais e pontuações excedentes
RE_CARACTERES_ESPECIAIS = re.compile(r"[^A-Z0-9\s&/.-]")


def clean_bank_description(raw_text: Optional[str]) -> str:
    """
    Higieniza e normaliza a descrição bruta do extrato bancário.
    Remove ruídos de canais (PIX, TED, DOC, DEB AUTOM), códigos de autorização/NSU,
    datas embutidas, identificadores numéricos longos e caracteres especiais.

    Retorna a string em CAIXA ALTA e sem espaços duplicados.
    """
    if not raw_text:
        return "LANCAMENTO BANCARIO"

    texto = str(raw_text).strip()
    if not texto or texto.lower() in ("nan", "none", "null", "-", "0"):
        return "LANCAMENTO BANCARIO"

    # 1. Remove acentuação e converte para maiúsculas
    limpo = _remover_acentos(texto).upper()

    # 2. Trata padrões de asteriscos (ex: *IFOOD* -> " IFOOD ")
    limpo = RE_ASTERISCOS.sub(" ", limpo)

    # 3. Trata casos especiais antes dos prefixos (ex: PIX TRANSF MESMA TITULARIDADE)
    is_mesma_tit = "MESMA TITULARIDADE" in limpo or "TRANSF ENTRE CONTAS" in limpo

    # 4. Remove prefixos de canais e meios operacionais no início
    for _ in range(2):
        limpo = RE_CANAL_PREFIXOS.sub("", limpo).strip()

    if is_mesma_tit and not limpo:
        limpo = "MESMA TITULARIDADE"

    # 5. Remove códigos de controle bancário, NSU, autorização, datas embutidas e números longos
    limpo = RE_CONTROLE_BANCARIO.sub(" ", limpo)

    # 6. Remove ruídos secundários repetidos
    limpo = RE_CARACTERES_ESPECIAIS.sub(" ", limpo)

    # 7. Remove pontuações soltas ou repetidas (---, ..., ///)
    limpo = re.sub(r"[\.\-/_]{2,}", " ", limpo)
    limpo = re.sub(r"^\s*[\.\-/_]+\s*", "", limpo)
    limpo = re.sub(r"\s*[\.\-/_]+\s*$", "", limpo)

    # 8. Normaliza múltiplos espaços
    limpo = re.sub(r"\s+", " ", limpo).strip()

    # 9. Fallback defensivo: se a limpeza esvaziou a descrição, usa versão alfanumérica do texto original
    if len(limpo) < 2:
        fallback = _remover_acentos(texto).upper()
        fallback = re.sub(r"[^A-Z0-9\s]", " ", fallback)
        fallback = re.sub(r"\s+", " ", fallback).strip()
        return fallback if len(fallback) >= 2 else "LANCAMENTO BANCARIO"

    return limpo


def generate_accounting_history(
    clean_text: str,
    category: str = "",
    erp_type: str = "Padrao",
    is_saida: bool = True,
) -> str:
    """
    Gera a redação contábil padrão formal para lançamentos nos ERPs.
    
    Regras:
      - Despesas/Saídas: "Vlr. ref. pagamento [CLEAN_TEXT] conf. extrato bancário."
      - Receitas/Entradas: "Vlr. ref. recebimento [CLEAN_TEXT] conf. extrato bancário."
      - Transferências internas: "Vlr. ref. transferência entre contas bancárias da empresa."
    """
    cat_norm = _remover_acentos(category).upper() if category else ""
    desc = clean_text.strip() if clean_text else "LANCAMENTO BANCARIO"

    # Caso 1: Transferências Internas e Mesma Titularidade
    transfer_keywords = [
        "TRANSFERENCIAS E APLICACOES",
        "TRANSFERENCIA ENTRE CONTAS",
        "MESMA TITULARIDADE",
        "APLICACAO",
        "RESGATE",
        "INTERNA",
    ]
    if any(k in cat_norm for k in transfer_keywords) or "MESMA TITULARIDADE" in desc or "TRANSF ENTRE CONTAS" in desc:
        return "Vlr. ref. transferência entre contas bancárias da empresa."

    # Caso 2: Despesas / Saídas
    if is_saida:
        return f"Vlr. ref. pagamento {desc} conf. extrato bancário."

    # Caso 3: Receitas / Entradas
    return f"Vlr. ref. recebimento {desc} conf. extrato bancário."


__all__ = [
    "clean_bank_description",
    "generate_accounting_history",
    "RE_CANAL_PREFIXOS",
    "RE_CONTROLE_BANCARIO",
    "RE_ASTERISCOS",
    "RE_CARACTERES_ESPECIAIS",
]
