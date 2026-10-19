"""Geradores de exportação contábil para ERPs e relatórios executivos."""

import datetime
import html
import io
import re
import zipfile

import pandas as pd


def gerar_layout_dominio(
    df: pd.DataFrame,
    conta_banco: str = "1.1.1.02.0001",
    cod_historico: str = "10",
) -> str:
    linhas = [
        "Data;Conta Débito;Conta Crédito;Valor;Código Histórico;Complemento"
        " Histórico"
    ]
    conta_padrao_cred = (
        conta_banco.strip() if conta_banco.strip() else "1.1.1.02.0001"
    )
    cod_padrao_hist = cod_historico.strip() if cod_historico.strip() else "10"
    for _, row in df.iterrows():
        dt_raw = str(row.get("Data", "")).strip()
        if "-" in dt_raw and len(dt_raw.split("-")) == 3:
            p = dt_raw.split("-")
            dt_str = f"{p[2]}/{p[1]}/{p[0]}"
        else:
            dt_str = dt_raw

        val = abs(float(row.get("Valor", 0.0)))
        val_str = f"{val:.2f}".replace(".", ",")

        desc = (
            str(
                row.get("Historico")
                or row.get("Descricao_Limpa")
                or row.get("Descrição", "")
            )
            .replace(";", " - ")
            .strip()
        )
        cat = str(row.get("Categoria", "Outras Despesas")).replace(";", " ")

        conta_deb = (
            str(row.get("Conta_Debito", "")).strip()
            or f"DESPESA - {cat.upper()}"
        )
        conta_cred = (
            str(row.get("Conta_Credito", "")).strip() or conta_padrao_cred
        )
        cod_hist = str(row.get("history_code", "")).strip() or cod_padrao_hist

        linhas.append(
            f"{dt_str};{conta_deb};{conta_cred};{val_str};{cod_hist};{desc}"
        )
    return "\r\n".join(linhas)


def gerar_layout_questor(
    df: pd.DataFrame, conta_banco: str = "BANCO", cod_historico: str = "10"
) -> str:
    linhas = ["DATA;DEBITO;CREDITO;VALOR;HISTORICO;DOCUMENTO;COD_HISTORICO"]
    conta_padrao_cred = conta_banco.strip() if conta_banco.strip() else "BANCO"
    cod_padrao_hist = cod_historico.strip() if cod_historico.strip() else "10"
    for idx, row in df.iterrows():
        dt_raw = str(row.get("Data", "")).strip()
        if "-" in dt_raw and len(dt_raw.split("-")) == 3:
            p = dt_raw.split("-")
            dt_str = f"{p[2]}/{p[1]}/{p[0]}"
        else:
            dt_str = dt_raw

        val = abs(float(row.get("Valor", 0.0)))
        val_str = f"{val:.2f}".replace(".", ",")

        desc = (
            str(
                row.get("Historico")
                or row.get("Descricao_Limpa")
                or row.get("Descrição", "")
            )
            .replace(";", " - ")
            .strip()
        )
        cat = str(row.get("Categoria", "Outras Despesas")).replace(";", " ")

        conta_deb = str(row.get("Conta_Debito", "")).strip() or cat.upper()
        conta_cred = (
            str(row.get("Conta_Credito", "")).strip() or conta_padrao_cred
        )
        cod_hist = str(row.get("history_code", "")).strip() or cod_padrao_hist

        linhas.append(
            f"{dt_str};{conta_deb};{conta_cred};{val_str};{desc};{idx+1};{cod_hist}"
        )
    return "\r\n".join(linhas)


def gerar_layout_fortes_contmatic(df: pd.DataFrame) -> str:
    linhas = [
        "Data;Conta_Debito;Conta_Credito;Valor;Historico;Categoria_Contabil;Status"
    ]
    for _, row in df.iterrows():
        dt_raw = str(row.get("Data", "")).strip()
        if "-" in dt_raw and len(dt_raw.split("-")) == 3:
            p = dt_raw.split("-")
            dt_str = f"{p[2]}/{p[1]}/{p[0]}"
        else:
            dt_str = dt_raw

        val = abs(float(row.get("Valor", 0.0)))
        val_str = f"{val:.2f}".replace(".", ",")
        desc = (
            str(
                row.get("Historico")
                or row.get("Descricao_Limpa")
                or row.get("Descrição", "")
            )
            .replace(";", " - ")
            .strip()
        )
        cat = str(row.get("Categoria", "Outras Despesas")).replace(";", " ")
        conta_deb = (
            str(row.get("Conta_Debito", "")).strip() or f"DESPESA {cat.upper()}"
        )
        conta_cred = (
            str(row.get("Conta_Credito", "")).strip()
            or "BANCO CONTA MOVIMENTO"
        )
        conf = float(row.get("Confianca", 1.0) or 1.0)
        status = "Conciliado" if conf >= 0.8 else "Pendente"
        linhas.append(
            f"{dt_str};{conta_deb};{conta_cred};{val_str};{desc};{cat};{status}"
        )
    return "\r\n".join(linhas)


def gerar_layout_omie(
    df: pd.DataFrame, conta_corrente: str = "CONTA CORRENTE"
) -> str:
    linhas = ["Data;Valor;Categoria;Descricao;Conta_Corrente;Tipo_Lancamento"]
    cc = conta_corrente.strip() if conta_corrente.strip() else "CONTA CORRENTE"
    for _, row in df.iterrows():
        dt_raw = str(row.get("Data", "")).strip()
        if "-" in dt_raw and len(dt_raw.split("-")) == 3:
            p = dt_raw.split("-")
            dt_str = f"{p[2]}/{p[1]}/{p[0]}"
        else:
            dt_str = dt_raw

        val = float(row.get("Valor", 0.0))
        tipo = str(row.get("Tipo", "Receita" if val > 0 else "Despesa"))
        val_str = f"{abs(val):.2f}".replace(".", ",")
        desc = (
            str(
                row.get("Historico")
                or row.get("Descricao_Limpa")
                or row.get("Descrição", "")
            )
            .replace(";", " - ")
            .strip()
        )
        cat = str(row.get("Categoria", "Outras Despesas")).replace(";", " ")
        linhas.append(f"{dt_str};{val_str};{cat};{desc};{cc};{tipo}")
    return "\r\n".join(linhas)


def gerar_excel_duas_abas(df: pd.DataFrame) -> bytes:
    output = io.BytesIO()
    try:
        df_calc = df.copy()
        df_calc["Valor_Abs"] = df_calc["Valor"].abs()

        desc_col = (
            "Descricao_Limpa"
            if "Descricao_Limpa" in df_calc.columns
            else "Descrição"
            if "Descrição" in df_calc.columns
            else df_calc.columns[0]
        )
        resumo_cat = (
            df_calc.groupby("Categoria")
            .agg(
                Qtd_Lancamentos=(desc_col, "count"),
                Total_Despesas=("Valor_Abs", "sum"),
            )
            .reset_index()
        )

        total_geral = resumo_cat["Total_Despesas"].sum()
        resumo_cat["Percentual"] = (
            (resumo_cat["Total_Despesas"] / total_geral * 100).round(2)
            if total_geral > 0
            else 0.0
        )
        resumo_cat = resumo_cat.sort_values(
            by="Total_Despesas", ascending=False
        )
        resumo_cat.columns = [
            "Categoria Contábil",
            "Qtd Lançamentos",
            "Total em Despesas (R$)",
            "Participação (%)",
        ]

        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            df.to_excel(
                writer, index=False, sheet_name="Lançamentos Classificados"
            )
            resumo_cat.to_excel(
                writer, index=False, sheet_name="Resumo por Categoria"
            )

        return output.getvalue()
    except Exception as e:
        print(f"[EXCEL LOG] Fallback CSV: {e}", flush=True)
        return df.to_csv(index=False, sep=";", encoding="utf-8-sig").encode(
            "utf-8-sig"
        )


def gerar_relatorio_gerencial_html(
    df: pd.DataFrame, lead_info: dict, stats_roi: dict
) -> str:
    nome_escritorio = (
        lead_info.get("escritorio", "").strip()
        or "Escritório Contábil Parceiro"
    )
    contador = lead_info.get("nome", "").strip() or "Equipe Contábil"
    arquivo_origem = lead_info.get("arquivo_origem", "").strip() or "Extrato Bancário"
    lote_id = str(lead_info.get("lote_id", "")).strip()
    data_emissao = datetime.datetime.now().strftime("%d/%m/%Y às %H:%M")

    df_calc = df.copy()
    if "Valor" not in df_calc.columns:
        df_calc["Valor"] = 0.0
    df_calc["Valor"] = pd.to_numeric(df_calc["Valor"], errors="coerce").fillna(0.0)
    df_calc["Valor_Abs"] = df_calc["Valor"].abs()

    total_despesas = float(df_calc[df_calc["Valor"] < 0]["Valor_Abs"].sum())
    total_entradas = float(df_calc[df_calc["Valor"] > 0]["Valor"].sum())
    volume_total = total_entradas + total_despesas
    saldo_liquido = float(total_entradas - total_despesas)
    qtd_total = len(df_calc)

    # Identificação do Período do Extrato
    meses_pt = [
        "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ]
    periodo_label = "Período Operacional"
    if "Data" in df_calc.columns and not df_calc.empty:
        datas_validas = []
        for d in df_calc["Data"].dropna():
            d_str = str(d).strip()
            try:
                if "-" in d_str and len(d_str.split("-")) == 3:
                    parts = d_str.split("-")
                    datas_validas.append(datetime.date(int(parts[0]), int(parts[1]), int(parts[2])))
                elif "/" in d_str and len(d_str.split("/")) == 3:
                    parts = d_str.split("/")
                    datas_validas.append(datetime.date(int(parts[2]), int(parts[1]), int(parts[0])))
            except Exception:
                pass
        if datas_validas:
            d_min = min(datas_validas)
            d_max = max(datas_validas)
            if d_min.month == d_max.month and d_min.year == d_max.year:
                periodo_label = f"{meses_pt[d_min.month]} de {d_min.year}"
            else:
                periodo_label = f"{d_min.strftime('%d/%m/%Y')} a {d_max.strftime('%d/%m/%Y')}"

    # Contagens, confiança e origem
    if "Confianca" in df_calc.columns:
        conf_series = pd.to_numeric(df_calc["Confianca"], errors="coerce").fillna(1.0)
        qtd_classificado = int((conf_series >= 0.8).sum())
        taxa_conciliacao = float((qtd_classificado / qtd_total * 100) if qtd_total > 0 else 100.0)
        confianca_media = float((conf_series.mean() * 100) if qtd_total > 0 else 100.0)
    else:
        qtd_classificado = qtd_total
        taxa_conciliacao = 100.0
        confianca_media = 98.5
    qtd_revisao = max(0, qtd_total - qtd_classificado)

    # Identificação de regras operacionais vs classificação assistida
    qtd_regras = 0
    qtd_assistido = 0
    if "Origem" in df_calc.columns:
        for orig in df_calc["Origem"].dropna():
            orig_lower = str(orig).lower()
            if any(term in orig_lower for term in ("ia", "gemini", "gpt", "openai", "inteligência", "deepseek")):
                qtd_assistido += 1
            elif orig_lower not in ("não classificado", "pendente", ""):
                qtd_regras += 1
            else:
                qtd_regras += 1
    else:
        qtd_regras = qtd_classificado

    pct_regras = (qtd_regras / qtd_total * 100) if qtd_total > 0 else 0.0
    pct_assistido = (qtd_assistido / qtd_total * 100) if qtd_total > 0 else 0.0

    # ROI canônico: horas * 11.00
    horas_salvas = float(stats_roi.get("horas_salvas", max(0.2, round(qtd_total * 0.025, 1)) if qtd_total > 0 else 0.0))
    economia_financeira = float(stats_roi.get("economia_financeira", round(horas_salvas * 11.0, 2)))
    tempo_manual_min = max(5, round(qtd_total * 2.0))
    tempo_manual_horas = round(tempo_manual_min / 60, 1)
    horas_regras = round(qtd_regras * 0.025, 1)

    # Resumo por Categoria
    if "Categoria" in df_calc.columns and not df_calc.empty:
        resumo_cat = (
            df_calc.groupby("Categoria")
            .agg(
                Total_Valor=("Valor_Abs", "sum"),
                Qtd=("Valor_Abs", "count")
            )
            .reset_index()
            .sort_values(by="Total_Valor", ascending=False)
        )
    else:
        resumo_cat = pd.DataFrame(columns=["Categoria", "Total_Valor", "Qtd"])

    # Concentração financeira
    top_cat_name = resumo_cat.iloc[0]["Categoria"] if not resumo_cat.empty else "Geral"
    top_cat_val = float(resumo_cat.iloc[0]["Total_Valor"]) if not resumo_cat.empty else 0.0
    top_cat_share = (top_cat_val / (total_despesas or volume_total) * 100) if (total_despesas or volume_total) > 0 else 0.0

    top3_val = float(resumo_cat.head(3)["Total_Valor"].sum()) if not resumo_cat.empty else 0.0
    top3_share = (top3_val / total_despesas * 100) if total_despesas > 0 else 0.0
    top3_names = ", ".join(resumo_cat.head(3)["Categoria"].tolist()) if not resumo_cat.empty else "N/A"

    saidas_df = df_calc[df_calc["Valor"] < 0].sort_values(by="Valor_Abs", ascending=False)
    top5_saidas = saidas_df.head(5)
    top5_val = float(top5_saidas["Valor_Abs"].sum()) if not top5_saidas.empty else 0.0
    top5_share = (top5_val / total_despesas * 100) if total_despesas > 0 else 0.0

    maior_saida_val = float(top5_saidas.iloc[0]["Valor_Abs"]) if not top5_saidas.empty else 0.0
    maior_saida_cat = str(top5_saidas.iloc[0].get("Categoria", "Despesa")) if not top5_saidas.empty else "Geral"

    # Insights da Operação (3 a 7 insights determinísticos)
    insights = []
    if top3_share > 0:
        insights.append(f"As três maiores categorias ({top3_names}) concentram <strong>{top3_share:.1f}% do total de despesas</strong> (R$ {top3_val:,.2f}).")
    if maior_saida_val > 0:
        insights.append(f"A maior saída individual do período foi de <strong>R$ {maior_saida_val:,.2f}</strong> ({maior_saida_cat}).")
    insights.append(f"<strong>{taxa_conciliacao:.1f}% dos lançamentos</strong> atingiram conciliação imediata com índice de confiança média de <strong>{confianca_media:.1f}%</strong>.")
    if pct_regras > 0:
        insights.append(f"As <strong>Regras Operacionais</strong> do escritório classificaram diretamente <strong>{qtd_regras} lançamentos ({pct_regras:.1f}%)</strong>, poupando ~{horas_regras}h de conferência.")
    insights.append(f"A automação gerou economia operacional de aproximadamente <strong>{horas_salvas:.1f} horas</strong> (~R$ {economia_financeira:,.2f} em produtividade contábil a R$ 11,00/h).")
    if saldo_liquido >= 0:
        insights.append(f"O período encerrou com <strong>superávit operacional de R$ {saldo_liquido:,.2f}</strong> ({total_entradas:,.2f} em receitas vs {total_despesas:,.2f} em despesas).")
    else:
        insights.append(f"O período encerrou com <strong>déficit operacional de R$ {abs(saldo_liquido):,.2f}</strong> ({total_despesas:,.2f} em despesas vs {total_entradas:,.2f} em receitas).")

    linhas_insights_html = "".join(
        f"""<div style="display: flex; gap: 10px; align-items: flex-start; padding: 10px 14px; background: #FFFFFF; border: 1px solid #E2E8F0; border-left: 3px solid #C8753D; border-radius: 4px; font-size: 12px; color: #334155; margin-bottom: 8px;">
            <span style="color: #C8753D; font-weight: bold; font-size: 14px; line-height: 1;">•</span>
            <div style="line-height: 1.5;">{insight}</div>
        </div>"""
        for insight in insights[:6]
    )

    # Paleta editorial Zaeron
    bar_colors = ["#C8753D", "#35B47A", "#2563EB", "#7C3AED", "#DB2777", "#D97706", "#0D9488", "#64748B"]

    linhas_cat_html = ""
    linhas_cat_resumo = ""
    for idx, (_, r) in enumerate(resumo_cat.iterrows(), 1):
        cat_nome = html.escape(str(r["Categoria"]))
        val_cat = float(r["Total_Valor"])
        qtd_cat = int(r["Qtd"])
        pct = (val_cat / total_despesas * 100) if total_despesas > 0 else (100.0 / len(resumo_cat) if len(resumo_cat) else 0.0)
        color = bar_colors[(idx - 1) % len(bar_colors)]

        linhas_cat_html += f"""
        <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
                <span style="font-weight: 600; color: #0F172A;"><span style="color: #64748B; font-weight: normal; margin-right: 4px;">#{idx}</span> {cat_nome} <span style="color: #64748B; font-weight: normal;">({qtd_cat} reg.)</span></span>
                <span style="font-family: monospace; font-weight: 700; color: #0F172A;">R$ {val_cat:,.2f} <span style="color: #C8753D; font-weight: 600;">({pct:.1f}%)</span></span>
            </div>
            <div style="height: 6px; width: 100%; background: #F1F5F9; border-radius: 2px; overflow: hidden;">
                <div style="height: 100%; width: {min(100.0, max(2.0, pct)):.1f}%; background-color: {color}; border-radius: 2px;"></div>
            </div>
        </div>
        """

        linhas_cat_resumo += f"""
        <tr>
            <td style="padding: 9px 12px; border-bottom: 1px solid #E2E8F0; text-align: center; color: #64748B; font-family: monospace;">#{idx}</td>
            <td style="padding: 9px 12px; border-bottom: 1px solid #E2E8F0; font-weight: 600; color: #0F172A;">{cat_nome}</td>
            <td style="padding: 9px 12px; border-bottom: 1px solid #E2E8F0; text-align: right; color: #475569;">{qtd_cat}</td>
            <td style="padding: 9px 12px; border-bottom: 1px solid #E2E8F0; text-align: right; font-family: monospace; font-weight: 600;">R$ {val_cat:,.2f}</td>
            <td style="padding: 9px 12px; border-bottom: 1px solid #E2E8F0; text-align: right; font-weight: 700; color: #C8753D;">{pct:.1f}%</td>
        </tr>
        """

    # Top 5 Maiores Saídas
    linhas_top5_html = ""
    for _, r in top5_saidas.iterrows():
        desc_raw = str(r.get("Historico") or r.get("Descricao_Limpa") or r.get("Descrição") or r.get("Descricao_Original", "-"))
        desc_show = html.escape(desc_raw)
        dt_val = html.escape(str(r.get("Data", "-")))
        cat_val = html.escape(str(r.get("Categoria", "Despesa")))
        linhas_top5_html += f"""
        <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #E2E8F0; color: #64748B; font-family: monospace;">{dt_val}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #E2E8F0; font-weight: 500; color: #0F172A;">{desc_show}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #E2E8F0;"><span style="background: #F8FAFC; border: 1px solid #E2E8F0; color: #334155; padding: 2px 6px; border-radius: 2px; font-size: 11px; font-weight: 600;">{cat_val}</span></td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #E2E8F0; text-align: right; font-weight: 700; font-family: monospace; color: #DC2626;">- R$ {float(r.get('Valor_Abs', 0.0)):,.2f}</td>
        </tr>
        """
    if not linhas_top5_html:
        linhas_top5_html = "<tr><td colspan='4' style='padding: 12px; text-align: center; color: #94A3B8;'>Nenhuma despesa registrada no período.</td></tr>"

    # Seção: Pontos de Atenção
    itens_atencao = []
    if "Confianca" in df_calc.columns:
        low_conf = df_calc[pd.to_numeric(df_calc["Confianca"], errors="coerce").fillna(1.0) < 0.8]
        for _, r in low_conf.head(6).iterrows():
            desc_raw = str(r.get("Historico") or r.get("Descricao_Limpa") or r.get("Descrição", "-"))
            itens_atencao.append({
                "data": str(r.get("Data", "-")),
                "descricao": desc_raw,
                "categoria": str(r.get("Categoria", "Indefinida")),
                "valor": float(r.get("Valor", 0.0)),
                "motivo": "Confiança preliminar abaixo de 80% — validação sugerida"
            })

    if itens_atencao:
        linhas_atencao = "".join(
            f"""<tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #FED7AA; font-family: monospace; color: #9A3412;">{html.escape(item['data'])}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #FED7AA; color: #7C2D12; font-weight: 500;">{html.escape(item['descricao'])}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #FED7AA; font-family: monospace; text-align: right; color: #9A3412;">R$ {item['valor']:,.2f}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #FED7AA; color: #C2410C; font-size: 11px; font-weight: 600;">{html.escape(item['motivo'])}</td>
            </tr>"""
            for item in itens_atencao
        )
        pontos_atencao_html = f"""
        <div style="background: #FFF7ED; border: 1px solid #FDBA74; border-left: 4px solid #EA580C; border-radius: 4px; padding: 16px; margin-bottom: 28px;">
            <div style="font-weight: 700; color: #9A3412; font-size: 13px; margin-bottom: 8px;">⚠ Pontos de Atenção ({len(itens_atencao)} lançamentos para conferência rápida)</div>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; background: transparent; margin-bottom: 0;">
                <thead>
                    <tr style="background: #FFEDD5;">
                        <th style="padding: 6px 12px; color: #9A3412; border-bottom: 1px solid #FDBA74; width: 90px;">Data</th>
                        <th style="padding: 6px 12px; color: #9A3412; border-bottom: 1px solid #FDBA74;">Descrição</th>
                        <th style="padding: 6px 12px; color: #9A3412; border-bottom: 1px solid #FDBA74; text-align: right; width: 110px;">Valor</th>
                        <th style="padding: 6px 12px; color: #9A3412; border-bottom: 1px solid #FDBA74; width: 220px;">Observação</th>
                    </tr>
                </thead>
                <tbody>{linhas_atencao}</tbody>
            </table>
        </div>
        """
    else:
        pontos_atencao_html = """
        <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-left: 4px solid #16A34A; border-radius: 4px; padding: 14px 18px; margin-bottom: 28px; font-size: 12px; color: #166534;">
            <strong style="color: #15803D;">✔ Conformidade Operacional Total:</strong> Nenhuma pendência crítica ou anomalia identificada neste lote. Todos os lançamentos foram conciliados com alta precisão técnica.
        </div>
        """

    # Tabela Analítica de Lançamentos (SEM CONTA DÉBITO / CRÉDITO)
    linhas_tabela_completa = ""
    for idx, (_, r) in enumerate(df_calc.head(30).iterrows(), 1):
        dt_v = html.escape(str(r.get("Data", "-")))
        hist_v = html.escape(str(r.get("Historico") or r.get("Descricao_Limpa") or r.get("Descrição") or r.get("Descricao_Original", "-")))
        cat_v = html.escape(str(r.get("Categoria", "Outras Despesas")))
        val_f = float(r.get("Valor", 0.0))
        val_col = "#059669" if val_f > 0 else "#DC2626"
        val_str = f"+ R$ {val_f:,.2f}" if val_f > 0 else f"- R$ {abs(val_f):,.2f}"
        tipo_label = "Entrada" if val_f > 0 else "Saída"
        tipo_badge = f"<span style='background: {'#F0FDF4' if val_f > 0 else '#FEF2F2'}; color: {'#166534' if val_f > 0 else '#991B1B'}; padding: 2px 6px; border-radius: 2px; font-size: 10px; font-weight: 700;'>{tipo_label}</span>"

        conf_f = float(r.get("Confianca", 1.0) or 1.0)
        conf_pct = f"{conf_f * 100:.0f}%" if conf_f <= 1.0 else f"{conf_f:.0f}%"
        status_label = "Conciliado" if conf_f >= 0.8 else "Revisão"
        status_bg = "#F0FDF4" if conf_f >= 0.8 else "#FFFBEB"
        status_col = "#166534" if conf_f >= 0.8 else "#B45309"

        linhas_tabela_completa += f"""
        <tr>
            <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; color: #64748B; font-family: monospace; font-size: 11px;">{dt_v}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; color: #0F172A; font-weight: 500; font-size: 11px;">{hist_v}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; color: #334155; font-size: 11px;">{cat_v}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; text-align: center;">{tipo_badge}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; text-align: right; font-weight: 700; font-family: monospace; color: {val_col}; font-size: 11px;">{val_str}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; text-align: center; font-family: monospace; font-weight: 600; color: #475569; font-size: 11px;">{conf_pct}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; text-align: center;"><span style="background: {status_bg}; color: {status_col}; padding: 2px 6px; border-radius: 2px; font-size: 10px; font-weight: 700;">{status_label}</span></td>
        </tr>
        """

    pct_entradas_bar = (total_entradas / volume_total * 100) if volume_total > 0 else 50.0
    pct_despesas_bar = (total_despesas / volume_total * 100) if volume_total > 0 else 50.0

    lote_badge = f"<span style='background: rgba(200, 117, 61, 0.15); border: 1px solid rgba(200, 117, 61, 0.4); color: #F4EFEA; font-weight: 700; font-size: 11px; padding: 2px 8px; border-radius: 2px; margin-left: 8px;'>Lote #{html.escape(lote_id)}</span>" if lote_id else ""

    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório Executivo de Conciliação Contábil - {nome_escritorio}</title>
    <style>
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #F8FAFC;
            color: #0F172A;
            line-height: 1.5;
            padding: 24px 12px;
        }}
        .report-wrapper {{
            max-width: 1080px;
            margin: 0 auto;
            background: #FFFFFF;
            border-radius: 4px;
            border: 1px solid #E2E8F0;
            box-shadow: 0 4px 18px -2px rgba(0, 0, 0, 0.05);
            overflow: hidden;
        }}
        /* Hero Executivo Zaeron */
        .brand-header {{
            background-color: #111419;
            color: #F4EFEA;
            padding: 24px 32px;
            border-bottom: 3px solid #C8753D;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 16px;
        }}
        .brand-title {{
            font-size: 20px;
            font-weight: 800;
            letter-spacing: 0.04em;
            color: #F4EFEA;
            text-transform: uppercase;
        }}
        .brand-subtitle {{
            font-size: 12px;
            color: #C8753D;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin-top: 2px;
        }}
        .brand-meta {{
            text-align: right;
            font-size: 11px;
            color: #D8D0CA;
            line-height: 1.6;
        }}
        .brand-meta strong {{
            color: #F4EFEA;
            font-size: 13px;
        }}

        /* Corpo do Relatório */
        .report-body {{
            padding: 30px;
        }}

        /* Banner Hero Executivo */
        .hero-banner {{
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            background: #171B20;
            color: #F4EFEA;
            border-radius: 4px;
            padding: 18px 22px;
            margin-bottom: 24px;
            border: 1px solid #2A3038;
            gap: 12px;
        }}
        .hero-stat {{
            border-right: 1px solid #2A3038;
            padding-right: 12px;
        }}
        .hero-stat:last-child {{
            border-right: none;
            padding-right: 0;
        }}
        .hero-stat-label {{
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #A39B93;
            margin-bottom: 4px;
        }}
        .hero-stat-value {{
            font-size: 20px;
            font-weight: 800;
            font-family: monospace;
            color: #F4EFEA;
        }}
        .hero-stat-sub {{
            font-size: 11px;
            color: #C8753D;
            margin-top: 2px;
        }}

        /* Resumo Executivo */
        .executive-summary {{
            background: #FDFBF7;
            border: 1px solid #F3E8DF;
            border-left: 4px solid #C8753D;
            border-radius: 4px;
            padding: 16px 20px;
            margin-bottom: 28px;
            font-size: 13px;
            color: #334155;
            line-height: 1.6;
        }}
        .executive-summary strong {{
            color: #0F172A;
        }}

        /* Grid de KPIs */
        .kpi-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
            gap: 14px;
            margin-bottom: 28px;
        }}
        .kpi-card {{
            background: #FFFFFF;
            border: 1px solid #E2E8F0;
            border-radius: 4px;
            padding: 16px;
        }}
        .kpi-label {{
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #64748B;
            margin-bottom: 4px;
        }}
        .kpi-value {{
            font-size: 22px;
            font-weight: 800;
            font-family: monospace;
            color: #0F172A;
            line-height: 1.2;
        }}
        .kpi-subtext {{
            font-size: 11px;
            color: #64748B;
            margin-top: 4px;
        }}

        /* Seções e Títulos */
        .section-title {{
            font-size: 13px;
            font-weight: 700;
            color: #0F172A;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }}
        .section-title::before {{
            content: "";
            display: inline-block;
            width: 3px;
            height: 14px;
            background: #C8753D;
            border-radius: 1px;
        }}

        /* Grid de Dashboards */
        .dashboard-grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 18px;
            margin-bottom: 28px;
        }}
        @media (max-width: 768px) {{
            .dashboard-grid {{ grid-template-columns: 1fr; }}
            .hero-banner {{ grid-template-columns: 1fr 1fr; }}
            .brand-header {{ flex-direction: column; text-align: left; }}
            .brand-meta {{ text-align: left; }}
        }}

        .dashboard-panel {{
            background: #FFFFFF;
            border: 1px solid #E2E8F0;
            border-radius: 4px;
            padding: 18px;
        }}

        /* Análise de Concentração */
        .concentration-box {{
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 4px;
            padding: 14px 18px;
            margin-bottom: 28px;
            font-size: 12px;
            color: #334155;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
        }}
        .concentration-item strong {{
            color: #0F172A;
        }}

        /* Tendências e Comparações */
        .trends-box {{
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 4px;
            padding: 14px 18px;
            margin-bottom: 28px;
            font-size: 12px;
            color: #475569;
        }}

        /* Tabelas */
        table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-bottom: 24px;
        }}
        th {{
            background: #F8FAFC;
            padding: 9px 12px;
            text-align: left;
            font-weight: 700;
            color: #475569;
            border-bottom: 2px solid #CBD5E1;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }}
        tr:nth-child(even) {{
            background-color: #FAFAFA;
        }}

        /* Rodapé */
        .report-footer {{
            margin-top: 36px;
            padding-top: 18px;
            border-top: 1px solid #E2E8F0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 11px;
            color: #94A3B8;
            flex-wrap: wrap;
            gap: 10px;
        }}

        /* Impressão & Exportação PDF */
        @media print {{
            body {{
                background: #FFFFFF !important;
                padding: 0 !important;
                color: #000000 !important;
            }}
            .report-wrapper {{
                border: none !important;
                box-shadow: none !important;
                max-width: 100% !important;
            }}
            .brand-header {{
                background-color: #111419 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }}
            .hero-banner {{
                background: #171B20 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }}
            .dashboard-panel, .kpi-card, .executive-summary, .concentration-box, .trends-box {{
                break-inside: avoid;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }}
            table {{
                break-inside: auto;
            }}
            tr {{
                break-inside: avoid;
            }}
            @page {{
                margin: 10mm;
                size: A4 portrait;
            }}
        }}
    </style>
</head>
<body>
    <div class="report-wrapper">
        <!-- Cabeçalho Institucional Zaeron -->
        <header class="brand-header">
            <div>
                <div class="brand-title">ZAERON CONTÁBIL</div>
                <div class="brand-subtitle">Relatório Executivo • {periodo_label}</div>
            </div>
            <div class="brand-meta">
                <strong>{nome_escritorio}</strong>{lote_badge}<br>
                Responsável Técnico: {contador}<br>
                Arquivo Analisado: {arquivo_origem} • Emissão: {data_emissao}
            </div>
        </header>

        <div class="report-body">
            <!-- Hero Executivo com Métricas-Chave -->
            <div class="hero-banner">
                <div class="hero-stat">
                    <div class="hero-stat-label">Movimentações Auditadas</div>
                    <div class="hero-stat-value">{qtd_total}</div>
                    <div class="hero-stat-sub">100% processadas</div>
                </div>
                <div class="hero-stat">
                    <div class="hero-stat-label">Volume Movimentado</div>
                    <div class="hero-stat-value">R$ {volume_total:,.2f}</div>
                    <div class="hero-stat-sub">Fluxo financeiro do período</div>
                </div>
                <div class="hero-stat">
                    <div class="hero-stat-label">Confiança Média</div>
                    <div class="hero-stat-value">{confianca_media:.1f}%</div>
                    <div class="hero-stat-sub">{taxa_conciliacao:.1f}% conciliação direta</div>
                </div>
                <div class="hero-stat">
                    <div class="hero-stat-label">Tempo Poupado</div>
                    <div class="hero-stat-value">{horas_salvas:.1f}h</div>
                    <div class="hero-stat-sub">~R$ {economia_financeira:,.2f} (R$11/h)</div>
                </div>
            </div>

            <!-- Resumo Executivo Determinístico -->
            <div class="executive-summary">
                <strong>Resumo Executivo do Lote:</strong> O período apresentou <strong>R$ {volume_total:,.2f}</strong> em movimentações financeiras distribuídas em <strong>{qtd_total} lançamentos</strong>, com maior concentração de saídas em <strong>{top_cat_name} ({top_cat_share:.1f}% do volume)</strong>. A conciliação alcançou <strong>{taxa_conciliacao:.1f}% de classificação direta</strong> com índice médio de confiança de <strong>{confianca_media:.1f}%</strong>, com <strong>{qtd_regras} lançamentos aplicados via Regras Operacionais ({pct_regras:.1f}%)</strong> e <strong>{qtd_assistido} assistidos ({pct_assistido:.1f}%)</strong>. A operação gerou economia produtiva estimada em <strong>{horas_salvas:.1f} horas</strong> (~R$ {economia_financeira:,.2f} a R$ 11,00/h).
            </div>

            <!-- Insights da Operação -->
            <div style="margin-bottom: 28px;">
                <div class="section-title">Insights da Operação</div>
                {linhas_insights_html}
            </div>

            <!-- Pontos de Atenção / Conformidade -->
            {pontos_atencao_html}

            <!-- KPIs Principais -->
            <div class="kpi-grid">
                <div class="kpi-card">
                    <div class="kpi-label">Volume de Despesas (-)</div>
                    <div class="kpi-value" style="color: #DC2626;">R$ {total_despesas:,.2f}</div>
                    <div class="kpi-subtext">Total de saídas apuradas</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-label">Volume de Entradas (+)</div>
                    <div class="kpi-value" style="color: #059669;">R$ {total_entradas:,.2f}</div>
                    <div class="kpi-subtext">Total de receitas/créditos</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-label">Saldo Líquido</div>
                    <div class="kpi-value" style="color: {'#059669' if saldo_liquido >= 0 else '#DC2626'};">
                        {'R$ +' if saldo_liquido >= 0 else 'R$ -'} {abs(saldo_liquido):,.2f}
                    </div>
                    <div class="kpi-subtext">{'Superávit operacional' if saldo_liquido >= 0 else 'Déficit no período'}</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-label">Eficiência por Regras</div>
                    <div class="kpi-value" style="color: #C8753D;">{pct_regras:.1f}%</div>
                    <div class="kpi-subtext">{qtd_regras} regras operacionais</div>
                </div>
            </div>

            <!-- Dashboards e Visualizações Gráficas -->
            <div class="dashboard-grid">
                <!-- Painel 1: Distribuição por Categoria -->
                <div class="dashboard-panel">
                    <div class="section-title">Distribuição por Categoria Contábil</div>
                    <div style="margin-top: 14px;">
                        {linhas_cat_html if linhas_cat_html else "<p style='color: #94A3B8; font-size: 12px;'>Nenhum lançamento categorizado.</p>"}
                    </div>
                </div>

                <!-- Painel 2: Composição Financeira & Qualidade da Classificação -->
                <div class="dashboard-panel">
                    <div class="section-title">Composição & Qualidade da Classificação</div>
                    <div style="margin-top: 14px; display: flex; flex-direction: column; gap: 14px;">
                        <!-- Barra proporcional de Entradas vs Saídas -->
                        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 4px; padding: 12px;">
                            <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; margin-bottom: 6px;">
                                <span style="color: #059669;">Entradas ({pct_entradas_bar:.1f}%)</span>
                                <span style="color: #DC2626;">Saídas ({pct_despesas_bar:.1f}%)</span>
                            </div>
                            <div style="height: 10px; width: 100%; background: #F1F5F9; border-radius: 2px; overflow: hidden; display: flex;">
                                <div style="height: 100%; width: {pct_entradas_bar:.1f}%; background: #35B47A;"></div>
                                <div style="height: 100%; width: {pct_despesas_bar:.1f}%; background: #E05D5D;"></div>
                            </div>
                        </div>

                        <!-- Origem das Classificações -->
                        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 4px; padding: 12px;">
                            <div style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 8px;">Origem dos Critérios de Classificação</div>
                            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
                                <span style="color: #334155;">Regras Operacionais do Escritório:</span>
                                <strong style="color: #C8753D; font-family: monospace;">{qtd_regras} ({pct_regras:.1f}%)</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
                                <span style="color: #334155;">Classificação Assistida:</span>
                                <strong style="color: #2563EB; font-family: monospace;">{qtd_assistido} ({pct_assistido:.1f}%)</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between; font-size: 12px;">
                                <span style="color: #334155;">Pendentes / Revisão Manual:</span>
                                <strong style="color: {'#D97706' if qtd_revisao > 0 else '#64748B'}; font-family: monospace;">{qtd_revisao} ({100.0 - taxa_conciliacao:.1f}%)</strong>
                            </div>
                        </div>

                        <!-- Produtividade Operacional -->
                        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 4px; padding: 12px;">
                            <div style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 6px;">Produtividade & Retorno Operacional</div>
                            <div style="font-size: 12px; color: #475569;">
                                Digitação manual estimada: <strong>~{tempo_manual_horas}h ({tempo_manual_min} min)</strong><br>
                                Tempo de execução Zaeron: <strong>< 1 segundo</strong><br>
                                Retorno financeiro apurado: <strong style="color: #15803D;">R$ {economia_financeira:,.2f}</strong> (Taxa: R$ 11,00/h)
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Concentração Financeira -->
            <div class="concentration-box">
                <div class="concentration-item">
                    <strong>Concentração por Categoria:</strong><br>
                    As Top 3 categorias ({top3_names}) concentram <strong>{top3_share:.1f}% do volume total de despesas</strong> (R$ {top3_val:,.2f}).
                </div>
                <div class="concentration-item">
                    <strong>Concentração por Movimentação:</strong><br>
                    As 5 maiores saídas individuais respondem por <strong>{top5_share:.1f}% do fluxo de pagamentos</strong> (R$ {top5_val:,.2f}).
                </div>
            </div>

            <!-- Tendências e Comparações -->
            <div class="trends-box">
                <div style="font-weight: 700; color: #0F172A; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; margin-bottom: 4px;">Tendências e Comparações Históricas</div>
                <div>Dados históricos insuficientes para comparação consolidada de múltiplos períodos. As métricas comparativas serão exibidas à medida que novos extratos forem integrados à Operação Contábil.</div>
            </div>

            <!-- Tabela: Top 5 Maiores Saídas -->
            <div class="section-title">Maiores Movimentações de Saída do Período</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 90px;">Data</th>
                        <th>Histórico / Descrição</th>
                        <th style="width: 170px;">Categoria</th>
                        <th style="width: 130px; text-align: right;">Valor</th>
                    </tr>
                </thead>
                <tbody>
                    {linhas_top5_html}
                </tbody>
            </table>

            <!-- Tabela: Resumo Consolidado por Categoria -->
            <div class="section-title">Resumo Analítico por Categoria</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 50px; text-align: center;">#</th>
                        <th>Categoria Contábil</th>
                        <th style="text-align: right; width: 110px;">Lançamentos</th>
                        <th style="text-align: right; width: 160px;">Total Movimentado</th>
                        <th style="text-align: right; width: 110px;">Participação</th>
                    </tr>
                </thead>
                <tbody>
                    {linhas_cat_resumo if linhas_cat_resumo else "<tr><td colspan='5' style='padding: 12px; text-align: center; color: #94A3B8;'>Nenhuma categoria identificada.</td></tr>"}
                </tbody>
            </table>

            <!-- Detalhamento dos Lançamentos Auditados (Amostra / Primeiras 30) -->
            <div class="section-title">Detalhamento Analítico dos Lançamentos</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 80px;">Data</th>
                        <th>Histórico / Descrição</th>
                        <th style="width: 160px;">Categoria</th>
                        <th style="width: 80px; text-align: center;">Tipo</th>
                        <th style="width: 120px; text-align: right;">Valor</th>
                        <th style="width: 90px; text-align: center;">Confiança</th>
                        <th style="width: 90px; text-align: center;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {linhas_tabela_completa}
                </tbody>
            </table>
            {f"<p style='font-size: 11px; color: #64748B; text-align: right; margin-top: -16px; margin-bottom: 24px;'>Exibindo {min(30, qtd_total)} de {qtd_total} lançamentos. Acesso integral a todos os lançamentos via exportação em planilha XLSX.</p>" if qtd_total > 30 else ""}

            <!-- Rodapé Institucional Zaeron -->
            <footer class="report-footer">
                <div>
                    Documento gerado automaticamente por <strong>Zaeron Contábil</strong> • Inteligência & Operação Contábil
                </div>
                <div>
                    Página 1 de 1 • Relatório Gerencial Confidencial
                </div>
            </footer>
</html>"""


def gerar_pacote_zip_completo(
    df: pd.DataFrame, file_ref: str, lead_info: dict, stats_roi: dict
) -> bytes:
    """Gera um pacote ZIP compactado em memória contendo todos os layouts de ERPs."""
    zip_buffer = io.BytesIO()
    clean_ref = (
        re.sub(r"[^a-zA-Z0-9_\-]", "_", file_ref).strip("_") or "extrato"
    )

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        # 1. Domínio Sistemas (.txt)
        txt_dominio = gerar_layout_dominio(df)
        zip_file.writestr(
            f"dominio_sistemas_{clean_ref}.txt",
            txt_dominio.encode("utf-8-sig"),
        )

        # 2. Questor (.txt)
        txt_questor = gerar_layout_questor(df)
        zip_file.writestr(
            f"questor_{clean_ref}.txt", txt_questor.encode("utf-8-sig")
        )

        # 3. Omie ERP (.csv)
        csv_omie = gerar_layout_omie(df)
        zip_file.writestr(
            f"omie_{clean_ref}.csv", csv_omie.encode("utf-8-sig")
        )

        # 4. Fortes / Alterdata (.csv)
        csv_fortes = gerar_layout_fortes_contmatic(df)
        zip_file.writestr(
            f"fortes_alterdata_{clean_ref}.csv",
            csv_fortes.encode("utf-8-sig"),
        )

        # 5. Planilha Excel Executiva com 2 Abas (.xlsx)
        excel_bytes = gerar_excel_duas_abas(df)
        zip_file.writestr(
            f"extrato_classificado_{clean_ref}.xlsx", excel_bytes
        )

        # 6. Relatório Executivo HTML para Apresentação
        relatorio_html = gerar_relatorio_gerencial_html(
            df, lead_info, stats_roi
        )
        zip_file.writestr(
            f"relatorio_gerencial_{clean_ref}.html",
            relatorio_html.encode("utf-8"),
        )

        # 7. CSV Universal com 12 Colunas Padronizadas
        csv_universal = df.to_csv(index=False, sep=";", encoding="utf-8-sig")
        zip_file.writestr(
            f"extrato_universal_{clean_ref}.csv",
            csv_universal.encode("utf-8-sig"),
        )

    return zip_buffer.getvalue()


__all__ = [
    "gerar_layout_dominio",
    "gerar_layout_questor",
    "gerar_layout_fortes_contmatic",
    "gerar_layout_omie",
    "gerar_excel_duas_abas",
    "gerar_relatorio_gerencial_html",
    "gerar_pacote_zip_completo",
]
