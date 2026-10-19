"""
Módulo de Parsers de Extratos Bancários - Zaeron Contábil
Suporte resiliente a arquivos OFX (todos os bancos brasileiros), CSV multi-layout e PDF estruturado.
Padroniza todas as saídas no formato corporativo de 12 colunas com suporte a hash e detecção de duplicidades.
"""

import datetime
import io
import re
from typing import Any, Dict, List, Optional, Set, Tuple
import unicodedata

import pandas as pd

from api.zaeron_api.services.bank_cleaner import (
    clean_bank_description,
    generate_accounting_history,
)


def normalizar_texto_coluna(s: str) -> str:
    """Remove acentuação e converte para minúsculas para correspondência flexível de cabeçalhos."""
    if not s:
        return ""
    s_clean = unicodedata.normalize("NFKD", str(s).strip().lower())
    return s_clean.encode("ASCII", "ignore").decode("ASCII")


def normalizar_data_iso(data_str: str) -> str:
    """
    Converte qualquer string de data brasileira ou internacional para o padrão ISO (YYYY-MM-DD).
    Suporta DD/MM/YYYY, DD/MM/YY, YYYY-MM-DD, DD.MM.YYYY, DD-MM-YYYY.
    """
    if not data_str or pd.isna(data_str):
        return datetime.date.today().strftime("%Y-%m-%d")

    s = str(data_str).strip().split(" ")[0].split("T")[0]
    s = s.replace(".", "/").replace("-", "/")
    partes = s.split("/")

    if len(partes) == 3:
        if len(partes[0]) == 4:
            # YYYY/MM/DD -> YYYY-MM-DD
            return f"{partes[0]}-{partes[1].zfill(2)}-{partes[2].zfill(2)}"
        elif len(partes[2]) in (2, 4):
            # DD/MM/YYYY ou DD/MM/YY -> YYYY-MM-DD
            ano = partes[2]
            if len(ano) == 2:
                ano = f"20{ano}"
            return f"{ano}-{partes[1].zfill(2)}-{partes[0].zfill(2)}"

    return datetime.date.today().strftime("%Y-%m-%d")


def estruturar_dataframe_padrao(df_base: pd.DataFrame, user_id: Optional[int] = None) -> pd.DataFrame:
    """
    Garante que o DataFrame contenha rigorosamente as 12 colunas da arquitetura Zaeron Contábil:
      - Data (YYYY-MM-DD)
      - Descricao_Original
      - Descricao_Limpa
      - Valor (float)
      - Tipo (Crédito / Débito)
      - Categoria
      - Conta_Debito
      - Conta_Credito
      - Historico
      - Origem
      - Confianca
      - Is_Duplicado
    """
    df = df_base.copy()

    # 1. Normalização de Datas
    col_data_orig = "Data" if "Data" in df.columns else df.columns[0]
    datas_iso = [normalizar_data_iso(str(v)) for v in df[col_data_orig]]

    # 2. Descrições Originais e Limpas
    col_desc_orig = "Descrição" if "Descrição" in df.columns else ("Descricao_Original" if "Descricao_Original" in df.columns else df.columns[1])
    desc_originais = [str(d).strip() if pd.notna(d) else "" for d in df[col_desc_orig]]
    desc_limpas = [clean_bank_description(d) for d in desc_originais]

    # 3. Valores e Tipos
    col_val = "Valor" if "Valor" in df.columns else df.columns[2]
    valores = []
    tipos = []
    for v in df[col_val]:
        try:
            val_float = round(float(v), 2)
        except (ValueError, TypeError):
            val_float = 0.0
        valores.append(val_float)
        tipos.append("Débito" if val_float < 0 else "Crédito")

    # 4. Metadados Contábeis Padrão
    categorias = df["Categoria"].tolist() if "Categoria" in df.columns else ["Pendente"] * len(df)
    contas_deb = df["Conta_Debito"].tolist() if "Conta_Debito" in df.columns else [""] * len(df)
    contas_cred = df["Conta_Credito"].tolist() if "Conta_Credito" in df.columns else [""] * len(df)

    historicos = []
    for i, (limpa, val, cat) in enumerate(zip(desc_limpas, valores, categorias)):
        if "Historico" in df.columns and pd.notna(df["Historico"].iloc[i]) and str(df["Historico"].iloc[i]).strip():
            historicos.append(str(df["Historico"].iloc[i]).strip())
        else:
            historicos.append(generate_accounting_history(limpa, cat, is_saida=(val < 0)))

    origens = df["Origem"].tolist() if "Origem" in df.columns else ["Não classificado"] * len(df)
    confiancas = df["Confianca"].tolist() if "Confianca" in df.columns else (df["Confiança"].tolist() if "Confiança" in df.columns else [0.0] * len(df))

    # 5. Duplicidades
    duplicados = [False] * len(df)
    if user_id:
        try:
            from api.zaeron_api.models.classifier import calculate_transaction_hash
            from api.zaeron_api.core.database import (
                SessionLocal,
                set_rls_user_context,
            )
            from api.zaeron_api.models.classifier import ProcessedTransaction
            
            with SessionLocal() as session:
                set_rls_user_context(session, user_id)
                hashes = [
                    calculate_transaction_hash(user_id, dt, val, description)
                    for dt, val, description in zip(
                        datas_iso, valores, desc_limpas
                    )
                ]
                db_duplicates = {
                    row[0] for row in session.query(ProcessedTransaction.transaction_hash)
                    .filter(ProcessedTransaction.user_id == user_id, ProcessedTransaction.transaction_hash.in_(hashes))
                    .all()
                }
                seen_in_batch: Set[str] = set()
                for idx, h in enumerate(hashes):
                    if h in db_duplicates or h in seen_in_batch:
                        duplicados[idx] = True
                    seen_in_batch.add(h)
        except Exception:
            pass

    df_final = pd.DataFrame({
        "Data": datas_iso,
        "Descricao_Original": desc_originais,
        "Descricao_Limpa": desc_limpas,
        "Valor": valores,
        "Tipo": tipos,
        "Categoria": categorias,
        "Conta_Debito": contas_deb,
        "Conta_Credito": contas_cred,
        "Historico": historicos,
        "Origem": origens,
        "Confianca": confiancas,
        "Is_Duplicado": duplicados,
    })

    return df_final


def padronizar_colunas(df: pd.DataFrame) -> Optional[pd.DataFrame]:
    """
    Identifica e normaliza nomes de colunas para Data, Descrição e Valor em CSVs.
    Suporta layouts com colunas separadas de Débito/Crédito, múltiplos campos de histórico e moedas brasileiras.
    """
    if df.empty or df.shape[1] < 2:
        return None

    # Mapeamento semântico flexível de cabeçalhos bancários
    alias_data = ["data", "dt", "date", "dt_mov", "dt_lancamento", "data_movimento", "data_lancamento", "dia"]
    alias_desc = ["descricao", "historico", "memo", "description", "detalhe", "lancamento", "documento", "favorecido", "transacao", "historico_completo"]
    alias_valor = ["valor", "val", "amount", "valor_lancamento", "vlr", "saldo_mov"]
    alias_debito = ["debito", "saida", "valor_debito", "deb", "despesa", "debitos"]
    alias_credito = ["credito", "entrada", "valor_credito", "cred", "receita", "creditos"]

    cols = list(df.columns)
    cols_norm = [normalizar_texto_coluna(c) for c in cols]

    col_data = None
    col_desc = []
    col_valor = None
    col_debito = None
    col_credito = None

    for orig, limpo in zip(cols, cols_norm):
        if not col_data and any(k == limpo or k in limpo for k in alias_data):
            col_data = orig
        elif any(k == limpo or k in limpo for k in alias_debito):
            col_debito = orig
        elif any(k == limpo or k in limpo for k in alias_credito):
            col_credito = orig
        elif not col_valor and any(k == limpo or k in limpo for k in alias_valor):
            col_valor = orig
        elif any(k == limpo or k in limpo for k in alias_desc):
            col_desc.append(orig)

    # Heurística posicional se não identificou explicitamente
    if not col_data:
        col_data = cols[0]
    if not col_desc and len(cols) > 1:
        col_desc = [cols[1]]

    df_res = pd.DataFrame()
    df_res["Data"] = df[col_data]

    # 2. Consolidação de Múltiplos Campos de Descrição
    if len(col_desc) == 1:
        df_res["Descrição"] = df[col_desc[0]].astype(str)
    elif len(col_desc) > 1:
        def _juntar_descricoes(row):
            partes = []
            for c in col_desc:
                val = str(row[c]).strip()
                if val and val.lower() not in ("nan", "none", "null", "-", "0"):
                    if val not in partes:
                        partes.append(val)
            return " - ".join(partes) if partes else "Lançamento Bancário"
        df_res["Descrição"] = df.apply(_juntar_descricoes, axis=1)
    else:
        df_res["Descrição"] = "Lançamento Bancário"

    df_res["Descrição"] = df_res["Descrição"].apply(lambda s: re.sub(r"\s+", " ", str(s)).strip())

    # 3. Tratamento e Normalização da Coluna Valor
    def _converter_valor(val) -> float:
        if pd.isna(val):
            return 0.0
        val_str = str(val).replace("R$", "").replace(" ", "").strip()
        if not val_str or val_str.lower() in ("nan", "none", "-"):
            return 0.0

        is_neg = False
        if val_str.startswith("-") or val_str.endswith("D") or val_str.endswith("d") or (val_str.startswith("(") and val_str.endswith(")")):
            is_neg = True

        if "," in val_str and "." in val_str:
            val_str = val_str.replace(".", "").replace(",", ".")
        elif "," in val_str:
            val_str = val_str.replace(",", ".")

        val_limpo = re.sub(r"[^\d\.]", "", val_str)
        try:
            num = float(val_limpo)
            return -num if is_neg else num
        except ValueError:
            return 0.0

    if col_debito and col_credito:
        v_deb = df[col_debito].apply(_converter_valor).abs()
        v_cred = df[col_credito].apply(_converter_valor).abs()
        df_res["Valor"] = v_cred - v_deb
    elif col_valor:
        df_res["Valor"] = df[col_valor].apply(_converter_valor)
    else:
        df_res["Valor"] = 0.0

    return df_res[["Data", "Descrição", "Valor"]]


def ler_extrato_csv(file_bytes: bytes, user_id: Optional[int] = None) -> Tuple[Optional[pd.DataFrame], Optional[str]]:
    """Lê arquivo CSV testando codificações comuns brasileiras e separadores (, ou ;)."""
    encodings = ["utf-8", "latin-1", "cp1252", "iso-8859-1"]
    separators = [",", ";", "\t", "|"]

    for enc in encodings:
        for sep in separators:
            try:
                df = pd.read_csv(io.BytesIO(file_bytes), encoding=enc, sep=sep)
                if df.shape[1] >= 2 and len(df) > 0:
                    df_padrao = padronizar_colunas(df)
                    if df_padrao is not None and not df_padrao.empty:
                        return estruturar_dataframe_padrao(df_padrao, user_id=user_id), None
            except Exception:
                continue

    return None, "Não foi possível identificar as colunas do CSV. Certifique-se de incluir campos de Data, Descrição/Histórico e Valor."


def ler_extrato_ofx(file_bytes: bytes, user_id: Optional[int] = None) -> Tuple[Optional[pd.DataFrame], Optional[str]]:
    """Extrai transações de extratos bancários em formato OFX padrão com suporte a MEMO, NAME e PAYEE."""
    text = ""
    for enc in ["utf-8", "latin-1", "cp1252", "iso-8859-1"]:
        try:
            text = file_bytes.decode(enc)
            break
        except Exception:
            continue

    if not text:
        return None, "Erro ao decodificar o arquivo OFX."

    # Decodifica entidades HTML/XML comuns
    text = (
        text.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", '"')
        .replace("&#39;", "'")
    )

    transacoes = []
    blocos = re.findall(r"<STMTTRN>.*?</STMTTRN>", text, re.DOTALL | re.IGNORECASE)
    if not blocos:
        blocos = re.findall(r"<STMTTRN>.*?(?=<STMTTRN>|</BANKTRANLIST>|\Z)", text, re.DOTALL | re.IGNORECASE)

    for b in blocos:
        dt_match = re.search(r"<DTPOSTED>(\d{8})", b, re.IGNORECASE)
        val_match = re.search(r"<TRNAMT>([-\d\.,]+)", b, re.IGNORECASE)
        memo_match = re.search(r"<MEMO>(.*?)(?=\r|\n|<)", b, re.IGNORECASE)
        name_match = re.search(r"<NAME>(.*?)(?=\r|\n|<)", b, re.IGNORECASE)
        payee_match = re.search(r"<PAYEE>(.*?)(?=\r|\n|<)", b, re.IGNORECASE)
        checknum_match = re.search(r"<CHECKNUM>(.*?)(?=\r|\n|<)", b, re.IGNORECASE)

        if dt_match and val_match:
            raw_dt = dt_match.group(1)
            data_fmt = f"{raw_dt[0:4]}-{raw_dt[4:6]}-{raw_dt[6:8]}"

            val_str = val_match.group(1).replace(",", ".")
            try:
                valor = float(val_str)
            except ValueError:
                valor = 0.0

            partes = []
            name_val = name_match.group(1).strip() if name_match else ""
            memo_val = memo_match.group(1).strip() if memo_match else ""
            payee_val = payee_match.group(1).strip() if payee_match else ""

            if name_val:
                partes.append(name_val)
            if memo_val and memo_val not in partes and memo_val != name_val:
                partes.append(memo_val)
            if not partes and payee_val:
                partes.append(payee_val)

            descricao = " - ".join(partes).strip()
            if not descricao:
                if checknum_match and checknum_match.group(1).strip():
                    descricao = f"Documento Cheque/Doc {checknum_match.group(1).strip()}"
                else:
                    descricao = "Lançamento Bancário"

            descricao = re.sub(r"\s+", " ", descricao).strip()

            transacoes.append({
                "Data": data_fmt,
                "Descrição": descricao,
                "Valor": valor,
            })

    if not transacoes:
        return None, "Nenhuma transação identificada no arquivo OFX."

    df_raw = pd.DataFrame(transacoes)
    return estruturar_dataframe_padrao(df_raw, user_id=user_id), None


def ler_extrato_pdf(file_bytes: bytes, user_id: Optional[int] = None) -> Tuple[Optional[pd.DataFrame], Optional[str]]:
    """Extrai transações de extratos bancários em formato PDF com limpeza de ruído."""
    text = ""
    try:
        import pypdf
        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        paginas_texto = [page.extract_text() for page in reader.pages if page.extract_text()]
        text = "\n".join(paginas_texto)
    except Exception:
        text = ""

    if not text.strip():
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                text = "\n".join([p.extract_text() or "" for p in pdf.pages])
        except Exception:
            text = ""

    if not text.strip():
        return None, "Não foi possível extrair texto do PDF. Certifique-se de que o arquivo contém camada de texto selecionável."

    transacoes = []
    linhas = text.splitlines()
    for line in linhas:
        line_clean = line.strip()
        if not line_clean or len(line_clean) < 8:
            continue

        match_date = re.search(r"\b(\d{2}[/\.]\d{2}[/\.](?:\d{4}|\d{2}))\b", line_clean)
        match_val = re.search(r"(-?\s*(?:R\$\s*)?\d{1,3}(?:\.\d{3})*,\d{2}\s*[DC]?)", line_clean, re.IGNORECASE)

        if match_date and match_val:
            raw_dt = match_date.group(1).replace(".", "/")
            parts = raw_dt.split("/")
            ano = parts[2]
            if len(ano) == 2:
                ano = f"20{ano}"
            data_iso = f"{ano}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"

            val_raw = match_val.group(1).strip()
            is_negative = "-" in val_raw or val_raw.upper().endswith("D")

            val_clean = re.sub(r"[^\d,]", "", val_raw).replace(",", ".")
            try:
                valor = float(val_clean)
                if is_negative:
                    valor = -abs(valor)
            except ValueError:
                continue

            desc = line_clean.replace(match_date.group(0), "").replace(match_val.group(0), "").strip()
            desc = re.sub(r"^(?:\d{4,12}|[\*\.\-_]+)\s*", "", desc)
            desc = re.sub(r"\s+", " ", desc).strip()
            if not desc or len(desc) < 2:
                desc = "Lançamento Extrato PDF"

            transacoes.append({
                "Data": data_iso,
                "Descrição": desc,
                "Valor": valor,
            })

    if not transacoes:
        return None, "Nenhuma linha de extrato com data e valor válidos foi encontrada no PDF."

    df_raw = pd.DataFrame(transacoes)
    return estruturar_dataframe_padrao(df_raw, user_id=user_id), None


__all__ = [
    "ler_extrato_csv",
    "ler_extrato_ofx",
    "ler_extrato_pdf",
    "normalizar_texto_coluna",
    "normalizar_data_iso",
    "estruturar_dataframe_padrao",
    "padronizar_colunas",
]
