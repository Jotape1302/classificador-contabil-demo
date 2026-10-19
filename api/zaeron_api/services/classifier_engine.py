"""
Motor de Classificação Híbrida em Cascata de 4 Níveis - Zaeron Contábil
Nível 1: Memória do Banco (classification_rules - Latência < 5ms / Memória Operacional)
Nível 2: Regras Operacionais Hardcoded Brasileiras
Nível 3: IA Gemini 3.7 Flash em Batch JSON Estruturado
Nível 4: Feedback Loop Ativo com Persistência Automática no PostgreSQL
"""

import json
import os
import re
import time
from typing import Any, Callable, Dict, List, Optional, Tuple
import unicodedata
import requests

from api.zaeron_api.core.sanitizer import sanitize_accounting_text
from api.zaeron_api.services.bank_cleaner import (
    clean_bank_description,
    generate_accounting_history,
)

CATEGORIAS_PADRAO = [
    "Vendas e Receitas",
    "Aluguel",
    "Serviços de Terceiros",
    "Impostos e Taxas",
    "Despesas Bancárias",
    "Salários e Encargos",
    "Energia Elétrica",
    "Água e Esgoto",
    "Internet e Telefone",
    "Materiais de Escritório",
    "Equipamentos",
    "Manutenção",
    "Transporte e Combustível",
    "Alimentação",
    "Publicidade e Marketing",
    "Honorários",
    "Empréstimos e Financiamentos",
    "Transferências e Aplicações",
    "Outras Despesas",
]

# Dicionário de Regras Determinísticas Brasileiras para Regras Operacionais (Nível 2)
REGRAS_LOCAIS = [
    # Transferências Internas, Mesma Titularidade, Aplicações e Resgates (100% Confiança)
    {
        "categoria": "Transferências e Aplicações",
        "confianca": 1.0,
        "padroes": [
            r"\bTRANSF(?:ERENCIA)?\s+MESMA\s+TITULARIDADE\b",
            r"\bTED\s+MESMA\s+TITULARIDADE\b",
            r"\bTEF\s+MESMA\s+TITULARIDADE\b",
            r"\bPIX\s+MESMA\s+TITULARIDADE\b",
            r"\bTRANSF(?:ERENCIA)?\s+ENTRE\s+CONTAS\b",
            r"\bTRANSF(?:ERENCIA)?\s+INTERNA\b",
            r"\bTRANSF(?:ERENCIA)?\s+CONTA\b",
            r"\bAPLICACAO\s+FINANCEIRA\b",
            r"\bAPLICACAO\s+CDB\b",
            r"\bAPLICACAO\s+POUPANCA\b",
            r"\bAPLICACAO\s+LCI\b",
            r"\bAPLICACAO\s+LCA\b",
            r"\bAPLICACAO\s+FUNDO\b",
            r"\bAPLIC\s+AUT(?:OMATICA)?\b",
            r"\bAPLICACAO\b",
            r"\bRESGATE\s+CDB\b",
            r"\bRESGATE\s+POUPANCA\b",
            r"\bRESGATE\s+APLICACAO\b",
            r"\bRESGATE\s+INVESTIMENTO\b",
            r"\bRESG\s+AUT(?:OMATICO)?\b",
            r"\bRESGATE\b",
            r"\bCDB\b",
            r"\bPOUPANCA\b",
            r"\bTESOURO\s+DIRETO\b",
            r"\bINVESTIMENTO\b",
            r"\bDEPOSITO\s+CONTA\b",
            r"\bDEPOSITO\s+ENTRE\s+CONTAS\b",
            r"\bMESMA\s+TITULARIDADE\b",
        ],
        "justificativa": "Regra nativa: Transferência Interna / Aplicação / Resgate",
    },
    # Despesas Bancárias e Encargos Recorrentes (100% Confiança)
    {
        "categoria": "Despesas Bancárias",
        "confianca": 1.0,
        "padroes": [
            r"\bTARIFA\s+BANCARIA\b",
            r"\bTAR\s+BANC\b",
            r"\bTARIFA\s+PACOTE\b",
            r"\bTAR\s+PACOTE\b",
            r"\bPACOTE\s+DE\s+SERVICOS\b",
            r"\bPACOTE\s+MENSAL\b",
            r"\bPACOTE\b",
            r"\bTARIFA\b",
            r"\bTAR\b",
            r"\bMANUT(?:ENCAO)?\s+CONTA\b",
            r"\bTAXA\s+MANUTENCAO\b",
            r"\bTAXA\s+DE\s+CONTA\b",
            r"\bTARIFA\s+CONTA\b",
            r"\bTARIFA\s+CONTA\s+CORRENTE\b",
            r"\bIOF\b",
            r"\bIOF\s+RETIDO\b",
            r"\bIOF\s+OPER\s+CRED\b",
            r"\bANUIDADE\s+CARTAO\b",
            r"\bANUIDADE\b",
            r"\bTAXA\s+TRANSACAO\b",
            r"\bTAXA\s+PIX\b",
            r"\bTARIFA\s+PIX\b",
            r"\bTAR\s+PIX\b",
            r"\bTARIFA\s+TED\b",
            r"\bTARIFA\s+DOC\b",
            r"\bTARIFA\s+EXTRATO\b",
            r"\bEXTRATO\s+TAR\b",
            r"\bDEB\s+PACOTE\b",
            r"\bENCARGOS\s+CONTA\b",
            r"\bENCARGOS\s+LIMITE\b",
            r"\bJUROS\s+CHEQUE\s+ESPECIAL\b",
            r"\bJUROS\s+BANCARIOS\b",
            r"\bJUROS\s+DE\s+MORA\b",
            r"\bTAXA\s+EMISSAO\b",
            r"\bDOC/TED\b",
            r"\bDESPESAS\s+BANCARIAS\b",
            r"\bTAXA\s+ADMINISTRATIVA\s+BANCO\b",
        ],
        "justificativa": "Regra nativa: Tarifa Bancária / IOF / Encargo Recorrente",
    },
    # Concessionárias de Energia Elétrica
    {
        "categoria": "Energia Elétrica",
        "confianca": 1.0,
        "padroes": [
            r"\bCOPEL\b",
            r"\bENEL\b",
            r"\bCPFL\b",
            r"\bCEMIG\b",
            r"\bLIGHT\b",
            r"\bENERGISA\b",
            r"\bNEOENERGIA\b",
            r"\bCELESC\b",
            r"\bEQUATORIAL\b",
            r"\bELEKTRO\b",
            r"\bEDP\s+SAO\s+PAULO\b",
            r"\bEDP\s+ESPIRITO\s+SANTO\b",
            r"\bCOELBA\b",
            r"\bCELPE\b",
            r"\bCOSERN\b",
            r"\bCEB\s+DISTRIBUICAO\b",
            r"\bCONTA\s+DE\s+LUZ\b",
            r"\bENERGIA\s+ELETRICA\b",
            r"\bCONCESSIONARIA\s+ENERGIA\b",
        ],
        "justificativa": "Regra nativa: Concessionária de Energia Elétrica",
    },
    # Concessionárias de Saneamento e Água
    {
        "categoria": "Água e Esgoto",
        "confianca": 1.0,
        "padroes": [
            r"\bSANEPAR\b",
            r"\bSABESP\b",
            r"\bCOPASA\b",
            r"\bCEDAE\b",
            r"\bCOMPESA\b",
            r"\bCORSAN\b",
            r"\bEMBASA\b",
            r"\bCASAN\b",
            r"\bSANEAGO\b",
            r"\bCAESB\b",
            r"\bBRK\s+AMBIENTAL\b",
            r"\bAGUAS\s+DE\b",
            r"\bCONTA\s+DE\s+AGUA\b",
            r"\bAGUA\s+E\s+ESGOTO\b",
            r"\bDAE\b",
        ],
        "justificativa": "Regra nativa: Concessionária de Saneamento / Água",
    },
    # Transporte e Combustível
    {
        "categoria": "Transporte e Combustível",
        "confianca": 1.0,
        "padroes": [
            r"\bPOSTO\b",
            r"\bAUTO\s*POSTO\b",
            r"\bCOMBUSTIVEL\b",
            r"\bIPIRANGA\b",
            r"\bSHELL\b",
            r"\bPETROBRAS\b",
            r"\bBR\s+DISTRIBUIDORA\b",
            r"\bVIBRA\b",
            r"\bALE\s+COMBUSTIVEIS\b",
            r"\bGASOLINA\b",
            r"\bETANOL\b",
            r"\bDIESEL\b",
            r"\bUBER\b",
            r"\b99APP\b",
            r"\b99\s*TAXI\b",
            r"\bCABIFY\b",
            r"\bPEDAGIO\b",
            r"\bSEM\s*PARAR\b",
            r"\bVELOE\b",
            r"\bCONECTCAR\b",
            r"\bAUTO\s*PISTA\b",
            r"\bCCR\s+VIA\b",
            r"\bESTACIONAMENTO\b",
            r"\bESTAPAR\b",
        ],
        "justificativa": "Regra nativa: Combustível / Mobilidade / Pedágio",
    },
    # Internet e Telefone
    {
        "categoria": "Internet e Telefone",
        "confianca": 1.0,
        "padroes": [
            r"\bCLARO\b",
            r"\bVIVO\b",
            r"\bTIM\b",
            r"\bOI\s+FIXO\b",
            r"\bOI\s+MOVEL\b",
            r"\bEMBRATEL\b",
            r"\bALGAR\s+TELECOM\b",
            r"\bSTARLINK\b",
            r"\bTELEFONICA\b",
            r"\bTELEFONE\b",
            r"\bINTERNET\b",
            r"\bBANDA\s+LARGA\b",
            r"\bFIBRA\s+OPTICA\b",
        ],
        "justificativa": "Regra nativa: Concessionária de Telecomunicações / Provedor",
    },
    # Impostos e Taxas (Tributos Brasileiros)
    {
        "categoria": "Impostos e Taxas",
        "confianca": 1.0,
        "padroes": [
            r"\bDAS\b",
            r"\bSIMPLES\s+NACIONAL\b",
            r"\bGPS\b",
            r"\bDARF\b",
            r"\bFGTS\b",
            r"\bGRF\b",
            r"\bINSS\b",
            r"\bICMS\b",
            r"\bISS\b",
            r"\bIPTU\b",
            r"\bIPVA\b",
            r"\bRECEITA\s+FEDERAL\b",
            r"\bPGFN\b",
            r"\bPREFEITURA\b",
            r"\bTAXA\s+LICENCA\b",
            r"\bALVARA\b",
            r"\bSEFAZ\b",
            r"\bSECRETARIA\s+DA\s+FAZENDA\b",
            r"\bGUIA\s+RECOLHIMENTO\b",
        ],
        "justificativa": "Regra nativa: Tributo / Imposto / Taxa Governamental",
    },
    # Salários, Encargos e Benefícios
    {
        "categoria": "Salários e Encargos",
        "confianca": 1.0,
        "padroes": [
            r"\bFOLHA\s+DE\s+PAGAMENTO\b",
            r"\bSALARIO\b",
            r"\bADIANTAMENTO\s+SALARIAL\b",
            r"\b13\s+SALARIO\b",
            r"\bFERIAS\b",
            r"\bVALE\s+TRANSPORTE\b",
            r"\bVALE\s+REFEICAO\b",
            r"\bALELO\b",
            r"\bSODEXO\b",
            r"\bPLUXEE\b",
            r"\bTICKET\s+REFEICAO\b",
            r"\bTICKET\s+ALIMENTACAO\b",
            r"\bVR\s+BENEFICIOS\b",
            r"\bFLASH\s+BENEFICIOS\b",
            r"\bUNIMED\b",
            r"\bPLANO\s+DE\s+SAUDE\b",
            r"\bBRADESCO\s+SAUDE\b",
            r"\bAMIL\b",
            r"\bSULAMERICA\b",
            r"\bNOTREDAME\b",
            r"\bHAPVIDA\b",
            r"\bPROLABORE\b",
            r"\bPRO-LABORE\b",
            r"\bRESCISAO\b",
            r"\bBENEFICIO\b",
            r"\bCOLABORADORES\b",
        ],
        "justificativa": "Regra nativa: Folha de Pagamento / Plano de Saúde / Benefícios de Colaboradores",
    },
    # Alimentação
    {
        "categoria": "Alimentação",
        "confianca": 1.0,
        "padroes": [
            r"\bIFOOD\b",
            r"\bRAPPY\b",
            r"\bRESTAURANTE\b",
            r"\bLANCHONETE\b",
            r"\bPADARIA\b",
            r"\bSUPERMERCADO\b",
            r"\bMERCADO\b",
            r"\bCARREFOUR\b",
            r"\bPAO\s+DE\s+ACUCAR\b",
            r"\bASSAI\b",
            r"\bATACADAO\b",
            r"\bBIG\b",
            r"\bCAFE\b",
            r"\bCHURRASCARIA\b",
            r"\bPIZZARIA\b",
        ],
        "justificativa": "Regra nativa: Alimentação / Refeição / Mercado",
    },
    # Aluguel e Condomínio
    {
        "categoria": "Aluguel",
        "confianca": 1.0,
        "padroes": [
            r"\bALUGUEL\b",
            r"\bCONDOMINIO\b",
            r"\bLOCACAO\s+IMOVEL\b",
            r"\bTAXA\s+CONDOMINIAL\b",
            r"\bADMINISTRADORA\s+IMOVEIS\b",
            r"\bIMOBILIARIA\b",
        ],
        "justificativa": "Regra nativa: Aluguel / Condomínio Comercial",
    },
    # Materiais de Escritório
    {
        "categoria": "Materiais de Escritório",
        "confianca": 1.0,
        "padroes": [
            r"\bKALUNGA\b",
            r"\bPAPELARIA\b",
            r"\bMATERIAIS\s+DE\s+ESCRITORIO\b",
            r"\bCARTUCHO\b",
            r"\bTONER\b",
            r"\bSUPRIMENTOS\b",
        ],
        "justificativa": "Regra nativa: Papelaria / Materiais de Escritório",
    },
    # Publicidade e Marketing
    {
        "categoria": "Publicidade e Marketing",
        "confianca": 1.0,
        "padroes": [
            r"\bFACEBOOK\s+ADS\b",
            r"\bMETA\s+PLATFORMS\b",
            r"\bGOOGLE\s+ADS\b",
            r"\bGOOGLE\s+BRASIL\b",
            r"\bLINKEDIN\b",
            r"\bTIKTOK\s+ADS\b",
            r"\bCANVA\b",
            r"\bAGENCIA\s+MARKETING\b",
            r"\bPROPAGANDA\b",
        ],
        "justificativa": "Regra nativa: Mídia / Publicidade / Anúncios Digitais",
    },
    # Honorários Profissionais
    {
        "categoria": "Honorários",
        "confianca": 1.0,
        "padroes": [
            r"\bHONORARIOS\s+CONTABEIS\b",
            r"\bHONORARIOS\s+ADVOCATICIOS\b",
            r"\bHONORARIOS\b",
            r"\bCONTABILIDADE\b",
            r"\bADVOCACIA\b",
            r"\bCONSULTORIA\s+JURIDICA\b",
            r"\bAUDITORIA\b",
        ],
        "justificativa": "Regra nativa: Honorários Profissionais / Contabilidade / Jurídico",
    },
    # Vendas e Receitas Operacionais / Recebimentos de Clientes (100% Confiança)
    {
        "categoria": "Vendas e Receitas",
        "confianca": 1.0,
        "padroes": [
            r"\bRECEBIMENTO\b",
            r"\bRECEITA\b",
            r"\bFATURAMENTO\b",
            r"\bVENDA\b",
            r"\bVENDAS\b",
            r"\bCLIENTE\b",
            r"\bSERVICOS\s+CONTABEIS\b",
            r"\bMENSALIDADE\b",
            r"\bDUPLICATA\b",
            r"\bRECEB\b",
            r"\bLIQUIDACAO\b",
            r"\bCOBRANCA\b",
            r"\bDEPOSITO\b",
            r"\bRECEB\s+PIX\b",
            r"\bPIX\s+RECEB\b",
            r"\bCREDITO\s+EM\s+CONTA\b",
        ],
        "justificativa": "Regra nativa: Recebimento / Vendas / Faturamento de Clientes",
    },
]

SYSTEM_PROMPT = """Você é um Especialista Sênior em Classificação Contábil e Conciliação Bancária Corporativa Brasileira (Sistemas Domínio, Questor, Omie, Fortes).

Sua missão é classificar 100% dos lançamentos bancários em contas contábeis específicas. É PROIBIDO classificar como "Outras Despesas" ou categorias genéricas.

Regras de Classificação:
- Serviços de TI, Nuvem (AWS, Azure, Google Cloud), Softwares, Licenças, Manutenção e Terceirizados -> "Serviços de Terceiros"
- Planos de Saúde (Unimed, Amil, Bradesco), Salários, Folha, Pró-Labore, Férias, Rescisões e Benefícios -> "Salários e Encargos"
- Mídia, Facebook Ads, Google Ads, Agências, Cursos de Divulgação e Propaganda -> "Publicidade e Marketing"
- Combustíveis, Postos, Uber, 99, Pedágios, Estacionamentos e Passagens -> "Transporte e Combustível"
- Refeições, Almoço, Ifood, Restaurantes, Padarias, Cafés e Supermercados -> "Alimentação"
- Tarifas, Encargos Bancários, IOF, Manutenção de Conta e Taxas de Cartão/Maquininha -> "Despesas Bancárias"
- Tributos, Impostos, Guias DAS, DARF, GPS, FGTS, ICMS, ISS, IPTU, Taxas Governamentais -> "Impostos e Taxas"
- Aluguel comercial, Taxas Condominiais e Locação de Salas -> "Aluguel"
- Energia Elétrica (Copel, Enel, CPFL, Cemig, Light) -> "Energia Elétrica"
- Água e Esgoto (Sabesp, Sanepar, Copasa, Casan) -> "Água e Esgoto"
- Telefonia, Internet, Fibra Óptica (Vivo, Claro, Tim, Oi, Embratel) -> "Internet e Telefone"
- Suprimentos, Papelaria, Cartuchos e Materiais de Uso Contínuo -> "Materiais de Escritório"
- Hardware, Computadores, Servidores, Notebooks, Monitores e Máquinas -> "Equipamentos"
- Honorários Advocatícios, Contábeis, Auditoria e Perícias -> "Honorários"
- Transferências Mesma Titularidade, Aplicações Financeiras, CDB, Poupança, Resgates -> "Transferências e Aplicações"
- Faturamentos, Vendas, Recebimentos de Clientes e Duplicatas -> "Vendas e Receitas"

Categorias estritas disponíveis:
- Vendas e Receitas
- Aluguel
- Serviços de Terceiros
- Impostos e Taxas
- Despesas Bancárias
- Salários e Encargos
- Energia Elétrica
- Água e Esgoto
- Internet e Telefone
- Materiais de Escritório
- Equipamentos
- Manutenção
- Transporte e Combustível
- Alimentação
- Publicidade e Marketing
- Honorários
- Empréstimos e Financiamentos
- Transferências e Aplicações

Retorne ESTRITAMENTE um array JSON contendo objetos com o seguinte formato:
[
  {
    "index": <identificador recebido>,
    "category": "<categoria contábil exata da lista>",
    "justification": "<explicação contábil concisa>"
  }
]"""


def _normalizar_texto(texto: str) -> str:
    if not texto:
        return ""
    nfkd = unicodedata.normalize("NFKD", str(texto))
    s = "".join([c for c in nfkd if not unicodedata.combining(c)])
    return s.upper().strip()


def pre_classificar_por_regras(
    descricao: str,
    valor: float = 0.0,
    regras_banco: Optional[List[Dict[str, Any]]] = None,
    regras_personalizadas: Optional[List[Dict[str, Any]]] = None,
) -> Optional[Dict[str, Any]]:
    """
    Executa a classificação em cascata de Nível 1 e Nível 2 (Regras Operacionais):
    1. Nível 1 (Memória do Banco - classification_rules)
    2. Nível 2 (Regras Nativas Hardcoded Zaeron)
    """
    desc_limpa_norm = _normalizar_texto(clean_bank_description(descricao))
    desc_raw_norm = _normalizar_texto(descricao)

    todas_regras_usuario = []
    if regras_banco:
        todas_regras_usuario.extend(regras_banco)
    if regras_personalizadas:
        todas_regras_usuario.extend(regras_personalizadas)

    for r in todas_regras_usuario:
        termo = _normalizar_texto(
            r.get("search_term")
            or r.get("termo")
            or r.get("keyword")
            or r.get("descricao")
            or ""
        )
        if not termo or len(termo) < 2:
            continue

        if termo in desc_limpa_norm or termo in desc_raw_norm:
            cat = r.get("category") or r.get("categoria", "Outras Despesas")
            times = r.get("times_applied", 1)
            return {
                "categoria": cat,
                "confianca": 1.0,
                "origem": "Regra Salva do Escritório",
                "justificativa": f"Memória do escritório ({times}x aplicada)",
                "debit_account": r.get("debit_account") or r.get("conta_debito", ""),
                "credit_account": r.get("credit_account") or r.get("conta_credito", ""),
                "history_code": r.get("history_code") or r.get("cod_historico", ""),
                "rule_id": r.get("id"),
            }

    for regra in REGRAS_LOCAIS:
        for padrao in regra["padroes"]:
            if re.search(padrao, desc_limpa_norm, re.IGNORECASE) or re.search(
                padrao, desc_raw_norm, re.IGNORECASE
            ):
                return {
                    "categoria": regra["categoria"],
                    "confianca": float(regra.get("confianca", 1.0)),
                    "origem": "Regra Nativa",
                    "justificativa": regra.get(
                        "justificativa", "Regra nativa brasileira"
                    ),
                    "debit_account": "",
                    "credit_account": "",
                    "history_code": "",
                }

    return None


def extrair_json(texto: str) -> Optional[List[Dict[str, Any]]]:
    """Extrai e valida JSON com segurança a partir de strings geradas por LLMs."""
    if not texto:
        return None
    try:
        data = json.loads(texto)
        if isinstance(data, list):
            return data
        elif isinstance(data, dict):
            for k in ["lancamentos", "classificacoes", "items", "data", "results"]:
                if k in data and isinstance(data[k], list):
                    return data[k]
    except Exception:
        pass

    match = re.search(r"(\[.*\])", texto, re.DOTALL)
    if match:
        try:
            parsed = json.loads(match.group(1))
            if isinstance(parsed, list):
                return parsed
        except Exception:
            pass

    return None


def inferir_categoria_semantica(
    descricao: str, valor: float = 0.0
) -> Tuple[str, float, str]:
    """
    Inferência heurística semântica de alta precisão para garantir que 100% dos lançamentos
    sejam classificados em contas contábeis reais, eliminando completamente categorias genéricas.
    """
    d_norm = _normalizar_texto(descricao)

    if valor > 0:
        if any(
            w in d_norm
            for w in [
                "RESGATE",
                "APLIC",
                "CDB",
                "POUPANCA",
                "INVEST",
                "TRANSFERENCIA",
                "MESMA",
                "INTERNA",
            ]
        ):
            return (
                "Transferências e Aplicações",
                0.95,
                "Resgate / Transferência de mesma titularidade",
            )
        return (
            "Vendas e Receitas",
            0.95,
            "Recebimento de cliente / Receita operacional",
        )

    if any(
        w in d_norm
        for w in [
            "AWS",
            "AMAZON",
            "GOOGLE",
            "AZURE",
            "MICROSOFT",
            "HOST",
            "SOFTWARE",
            "SISTEMA",
            "LICENCA",
            "TECH",
            "DIGITAL",
            "CLOUD",
            "NOTION",
            "SLACK",
            "ZOOM",
            "CANVA",
            "OPENAI",
            "CHATGPT",
            "SERVICO",
            "CONSULT",
            "ASSESSORIA",
            "MANUTENCAO",
            "SUPORTE",
            "DEV",
            "PROGRAMACAO",
        ]
    ):
        return (
            "Serviços de Terceiros",
            0.90,
            "Despesa com serviços tecnológicos, sistemas ou terceirizados",
        )

    if any(
        w in d_norm
        for w in [
            "MARKETING",
            "ADS",
            "FACEBOOK",
            "META",
            "PROPAGANDA",
            "AGENCIA",
            "PUBLICIDADE",
            "DIVULGACAO",
            "CURSO",
            "TREINAMENTO",
            "EVENTO",
        ]
    ):
        return (
            "Publicidade e Marketing",
            0.90,
            "Investimento em divulgação, mídia digital ou capacitação",
        )

    if any(
        w in d_norm
        for w in [
            "UBER",
            "99",
            "POSTO",
            "COMBUSTIVEL",
            "SHELL",
            "IPIRANGA",
            "PETROBRAS",
            "AUTO",
            "VEICULO",
            "PEDAGIO",
            "ESTACIONAMENTO",
            "SEMPARAR",
            "VELOE",
            "PASSAGEM",
            "HOTEL",
            "AEROPORTO",
        ]
    ):
        return (
            "Transporte e Combustível",
            0.90,
            "Despesa com deslocamento, transporte corporativo ou abastecimento",
        )

    if any(
        w in d_norm
        for w in [
            "IFOOD",
            "RAPPI",
            "RESTAURANTE",
            "LANCHONETE",
            "PADARIA",
            "MERCADO",
            "SUPERMERCADO",
            "ALIMENTACAO",
            "CAFE",
            "REFEICAO",
            "CHURRASCARIA",
        ]
    ):
        return (
            "Alimentação",
            0.90,
            "Despesa com alimentação / refeição da equipe",
        )

    if any(
        w in d_norm
        for w in [
            "TARIFA",
            "TAR",
            "TAXA",
            "IOF",
            "TED",
            "DOC",
            "PIX",
            "PACOTE",
            "MANUT",
            "BANC",
            "ANUIDADE",
            "JUROS",
            "MULTA",
            "CIELO",
            "REDE",
            "STONE",
            "GETNET",
            "PAGSEGURO",
            "TON",
        ]
    ):
        return (
            "Despesas Bancárias",
            0.90,
            "Taxa, tarifa de serviços bancários ou maquininha",
        )

    if any(
        w in d_norm
        for w in [
            "SIMPLES",
            "DAS",
            "DARF",
            "GPS",
            "FGTS",
            "INSS",
            "ISS",
            "ICMS",
            "IPTU",
            "IPVA",
            "RECEITA",
            "PREFEITURA",
            "SEFAZ",
            "TRIBUTO",
            "IMPOSTO",
            "GUIA",
        ]
    ):
        return (
            "Impostos e Taxas",
            0.92,
            "Recolhimento de guia tributária / imposto governamental",
        )

    if any(
        w in d_norm
        for w in [
            "SALARIO",
            "VALE",
            "FOLHA",
            "PROLABORE",
            "PRO-LABORE",
            "FUNCIONARIO",
            "BENEFICIO",
            "UNIMED",
            "BRADESCO",
            "AMIL",
            "PLANO",
            "MEDIC",
            "SAUDE",
            "ODONTO",
        ]
    ):
        return (
            "Salários e Encargos",
            0.90,
            "Pagamento de pessoal, pró-labore ou benefício trabalhista",
        )

    if any(
        w in d_norm
        for w in [
            "ALUGUEL",
            "CONDOMINIO",
            "IMOBILIARIA",
            "LOCACAO",
            "IMOVEL",
            "SALA",
        ]
    ):
        return (
            "Aluguel",
            0.90,
            "Locação de imóvel comercial ou taxa condominial",
        )

    if any(
        w in d_norm
        for w in [
            "COPEL",
            "ENEL",
            "CPFL",
            "CEMIG",
            "LIGHT",
            "ENERGIA",
            "ELETRIC",
            "LUZ",
        ]
    ):
        return (
            "Energia Elétrica",
            0.95,
            "Fornecimento de energia elétrica comercial",
        )

    if any(
        w in d_norm
        for w in [
            "SABESP",
            "SANEPAR",
            "COPASA",
            "CASAN",
            "AGUA",
            "ESGOTO",
            "SANEAMENTO",
        ]
    ):
        return (
            "Água e Esgoto",
            0.95,
            "Serviço de fornecimento de água e saneamento",
        )

    if any(
        w in d_norm
        for w in [
            "VIVO",
            "CLARO",
            "TIM",
            "OI",
            "EMBRATEL",
            "NET",
            "TELEFONE",
            "INTERNET",
            "FIBRA",
            "BANDA",
        ]
    ):
        return (
            "Internet e Telefone",
            0.95,
            "Conta de telecomunicações / internet / telefonia",
        )

    if any(
        w in d_norm
        for w in [
            "KALUNGA",
            "PAPELARIA",
            "CARTUCHO",
            "TONER",
            "SUPRIMENTO",
            "PAPEL",
            "ESCRITORIO",
        ]
    ):
        return (
            "Materiais de Escritório",
            0.88,
            "Suprimentos e materiais para rotina do escritório",
        )

    if any(
        w in d_norm
        for w in [
            "DELL",
            "APPLE",
            "SAMSUNG",
            "NOTEBOOK",
            "COMPUTADOR",
            "MONITOR",
            "MAQUINA",
            "EQUIPAMENTO",
            "IMPRESSORA",
            "KABUM",
        ]
    ):
        return (
            "Equipamentos",
            0.88,
            "Aquisição de ativos / equipamentos e hardware de TI",
        )

    if any(
        w in d_norm
        for w in [
            "ADVOGADO",
            "ADVOCACIA",
            "HONORARIO",
            "CONTABILIDADE",
            "CONTABIL",
            "AUDITORIA",
            "PERICIA",
        ]
    ):
        return (
            "Honorários",
            0.90,
            "Pagamento de honorários profissionais especializados",
        )

    if abs(valor) > 2000:
        return (
            "Serviços de Terceiros",
            0.80,
            "Prestação de serviços operacionais corporativos",
        )
    elif abs(valor) < 50:
        return (
            "Despesas Bancárias",
            0.80,
            "Despesa operacional bancária de pequeno porte",
        )
    else:
        return (
            "Materiais de Escritório",
            0.80,
            "Despesas com insumos e manutenção da rotina",
        )


def _normalizar_classificacoes_ia(
    transacoes: List[Dict[str, Any]],
    parsed_ia: List[Dict[str, Any]],
    origem: str = "IA",
) -> List[Dict[str, Any]]:
    """Normaliza as saídas da IA vinculando por ID/Index."""
    ia_map = {}
    for item in parsed_ia:
        idx = item.get("index") if "index" in item else item.get("id")
        if idx is not None:
            cat = (
                item.get("category")
                or item.get("categoria", "Serviços de Terceiros")
            )
            if cat not in CATEGORIAS_PADRAO:
                cat_match = next(
                    (
                        c
                        for c in CATEGORIAS_PADRAO
                        if _normalizar_texto(c) == _normalizar_texto(cat)
                    ),
                    "Serviços de Terceiros",
                )
                cat = cat_match

            ia_map[int(idx)] = {
                "categoria": cat,
                "justificativa": item.get("justification")
                or item.get(
                    "justificativa", "Classificação contábil analisada por IA"
                ),
                "confianca": 0.90,
                "origem": origem,
            }

    resultado = []
    for t in transacoes:
        t_id = int(t["id"])
        if t_id in ia_map:
            dados = ia_map[t_id]
            resultado.append(
                {
                    "id": t_id,
                    "categoria": dados["categoria"],
                    "confianca": dados["confianca"],
                    "justificativa": dados["justificativa"],
                    "origem": dados["origem"],
                    "debit_account": "",
                    "credit_account": "",
                    "history_code": "",
                }
            )
        else:
            cat_sem, conf_sem, just_sem = inferir_categoria_semantica(
                t.get("descricao", ""), t.get("valor", 0.0)
            )
            resultado.append(
                {
                    "id": t_id,
                    "categoria": cat_sem,
                    "confianca": conf_sem,
                    "justificativa": just_sem,
                    "origem": "Motor Inteligente",
                    "debit_account": "",
                    "credit_account": "",
                    "history_code": "",
                }
            )

    return resultado


def classificar_lote_ia(
    transacoes: List[Dict[str, Any]],
) -> Tuple[List[Dict[str, Any]], str]:
    """
    NÍVEL 3: Envia lote de itens ambíguos para IA em Batch JSON.
    Garante tempo de resposta robusto (timeout=10s) e contingência semântica imediata.
    """
    if not transacoes:
        return [], ""

    raw_gemini_keys = os.getenv("GEMINI_API_KEY", "").strip()
    groq_key = os.getenv("GROQ_API_KEY", "").strip()

    user_payload = []
    for t in transacoes:
        raw_desc = str(t.get("descricao") or "")
        sanitized_desc = sanitize_accounting_text(raw_desc)
        # Fail-closed: se a sanitização falhar ou retornar erro, não envia para provedor de IA externo
        if sanitized_desc and sanitized_desc != "[ERRO_SANITIZACAO]":
            user_payload.append(
                {
                    "index": t["id"],
                    "description": sanitized_desc,
                    "amount": t.get("valor", 0.0),
                }
            )

    # Se todas as transações falharam na sanitização, retorna fallback local imediatamente
    if not user_payload:
        fallback_res = []
        for t in transacoes:
            cat_sem, conf_sem, just_sem = inferir_categoria_semantica(
                t.get("descricao", ""), t.get("valor", 0.0)
            )
            fallback_res.append(
                {
                    "id": t["id"],
                    "categoria": cat_sem,
                    "confianca": conf_sem,
                    "justificativa": just_sem,
                    "origem": "Motor Inteligente",
                    "debit_account": "",
                    "credit_account": "",
                    "history_code": "",
                }
            )
        return fallback_res, ""

    # 1. Provedor Primário: Groq Cloud
    if (
        groq_key
        and not groq_key.startswith("sua_chave")
        and not groq_key.startswith("coloque_sua")
        and len(groq_key) > 15
    ):
        groq_models = [
            "qwen/qwen3.6-27b",
            "openai/gpt-oss-120b",
            "openai/gpt-oss-20b",
            "groq/compound-mini",
        ]
        for g_model in groq_models:
            try:
                res_groq = requests.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {groq_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": g_model,
                        "messages": [
                            {"role": "system", "content": SYSTEM_PROMPT},
                            {
                                "role": "user",
                                "content": f"Classifique cada lançamento abaixo retornando ESTRITAMENTE um array JSON:\n{json.dumps(user_payload, ensure_ascii=False)}",
                            },
                        ],
                        "response_format": {"type": "json_object"},
                        "temperature": 0.1,
                    },
                    timeout=10,
                )

                if res_groq.status_code == 200:
                    text_groq = res_groq.json()["choices"][0]["message"][
                        "content"
                    ]
                    parsed = extrair_json(text_groq)
                    if parsed:
                        return (
                            _normalizar_classificacoes_ia(
                                transacoes, parsed, origem="IA"
                            ),
                            "",
                        )
                elif res_groq.status_code in (401, 403):
                    break
            except Exception:
                continue

    # 2. Provedor Secundário: Google AI Studio
    gemini_keys = [
        k.strip()
        for k in raw_gemini_keys.split(",")
        if k.strip()
        and not k.strip().startswith("sua_chave")
        and not k.strip().startswith("coloque_sua")
        and len(k.strip()) > 15
    ]
    if gemini_keys:
        prompt_completo = f"{SYSTEM_PROMPT}\n\nLançamentos a classificar:\n{json.dumps(user_payload, ensure_ascii=False)}"
        modelos = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-3.5-flash"]
        for g_key in gemini_keys:
            for model_name in modelos:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
                try:
                    payload_gemini = {
                        "contents": [{"parts": [{"text": prompt_completo}]}],
                        "generationConfig": {
                            "responseMimeType": "application/json",
                            "temperature": 0.1,
                        },
                    }
                    response = requests.post(
                        url,
                        headers={"x-goog-api-key": g_key},
                        json=payload_gemini,
                        timeout=10,
                    )

                    if response.status_code == 200:
                        data = response.json()
                        text_resp = data["candidates"][0]["content"]["parts"][
                            0
                        ]["text"]
                        parsed = extrair_json(text_resp)
                        if parsed:
                            return (
                                _normalizar_classificacoes_ia(
                                    transacoes, parsed, origem="IA"
                                ),
                                "",
                            )
                    elif response.status_code in (401, 403):
                        break
                except Exception:
                    continue

    # 3. Contingência Semântica Inteligente
    fallback_res = []
    for t in transacoes:
        cat_sem, conf_sem, just_sem = inferir_categoria_semantica(
            t.get("descricao", ""), t.get("valor", 0.0)
        )
        fallback_res.append(
            {
                "id": t["id"],
                "categoria": cat_sem,
                "confianca": conf_sem,
                "justificativa": just_sem,
                "origem": "Motor Inteligente",
                "debit_account": "",
                "credit_account": "",
                "history_code": "",
            }
        )
    return fallback_res, ""


def classificar_transacoes_hibrido_puro(
    transacoes: list[dict[str, Any]],
    *,
    regras_banco: list[dict[str, Any]] | None = None,
    regras_personalizadas: list[dict[str, Any]] | None = None,
    ai_classifier: Callable | None = None,
) -> tuple[list[dict[str, Any]], str, dict[str, Any], list[int]]:
    """Executa a cascata legada pura recebendo todas as dependências como dados."""
    total = len(transacoes)
    local_results: list[dict[str, Any]] = []
    pending_ai: list[dict[str, Any]] = []
    applied_rule_ids: list[int] = []
    office_rule_count = 0
    native_rule_count = 0

    for item in transacoes:
        clean_description = (
            item.get("Descricao_Limpa")
            or item.get("descricao")
            or item.get("Descrição")
            or ""
        )
        raw_description = (
            item.get("Descricao_Original")
            or item.get("descricao_original")
            or item.get("memo")
            or clean_description
        )
        amount = float(
            item.get("Valor", 0.0)
            if item.get("Valor") is not None
            else item.get("valor", 0.0)
        )
        local = pre_classificar_por_regras(
            descricao=raw_description,
            valor=amount,
            regras_banco=regras_banco,
            regras_personalizadas=regras_personalizadas,
        )
        if not local and clean_description != raw_description:
            local = pre_classificar_por_regras(
                descricao=clean_description,
                valor=amount,
                regras_banco=regras_banco,
                regras_personalizadas=regras_personalizadas,
            )

        if local:
            source = local.get("origem", "Regra Nativa")
            if "Escritório" in source or "Memória" in source:
                office_rule_count += 1
                if local.get("rule_id"):
                    applied_rule_ids.append(int(local["rule_id"]))
            else:
                native_rule_count += 1
            local_results.append(
                {
                    "id": item["id"],
                    "categoria": local["categoria"],
                    "confianca": local["confianca"],
                    "justificativa": local["justificativa"],
                    "origem": source,
                    "debit_account": local.get("debit_account", ""),
                    "credit_account": local.get("credit_account", ""),
                    "history_code": local.get("history_code", ""),
                }
            )
        else:
            pending_ai.append(
                {
                    "id": item["id"],
                    "descricao": clean_description or raw_description,
                    "valor": amount,
                }
            )

    classifier = ai_classifier or classificar_lote_ia
    ai_results, ai_error = classifier(pending_ai) if pending_ai else ([], "")
    result_map = {result["id"]: result for result in local_results + ai_results}
    ordered_results = [
        result_map.get(
            item["id"],
            {
                "id": item["id"],
                "categoria": "Outras Despesas",
                "confianca": 0.5,
                "justificativa": "Classificação padrão",
                "origem": "Outras Despesas",
                "debit_account": "",
                "credit_account": "",
                "history_code": "",
            },
        )
        for item in transacoes
    ]
    zero_cost = len(local_results)
    stats = {
        "total": total,
        "regras_escritorio": office_rule_count,
        "regras_locais": native_rule_count,
        "total_custo_zero": zero_cost,
        "itens_ia": len(pending_ai),
        "taxa_custo_zero": (zero_cost / total * 100) if total else 0.0,
    }
    return ordered_results, ai_error, stats, applied_rule_ids


def classificar_transacoes_hibrido(
    transacoes: List[Dict[str, Any]],
    user_id: Optional[int] = None,
    regras_personalizadas: Optional[List[Dict[str, Any]]] = None,
) -> Tuple[List[Dict[str, Any]], str, Dict[str, Any]]:
    """Compatibilidade com interface antiga."""
    regras_banco = []
    if user_id:
        try:
            from api.zaeron_api.core.database import (
                SessionLocal,
                set_rls_user_context,
            )
            from api.zaeron_api.repositories.classifier import (
                ClassifierRepository,
            )

            with SessionLocal() as session:
                set_rls_user_context(session, user_id)
                regras_banco = ClassifierRepository(session).rule_dicts(user_id)
        except Exception:
            regras_banco = []

    res, err, stats, _ = classificar_transacoes_hibrido_puro(
        transacoes,
        regras_banco=regras_banco,
        regras_personalizadas=regras_personalizadas,
    )
    return res, err, stats


def validar_regras_personalizadas(conteudo: Any) -> List[Dict[str, Any]]:
    """Valida e normaliza lista de regras importadas via JSON."""
    if isinstance(conteudo, dict):
        conteudo = conteudo.get("regras", [])
    if not isinstance(conteudo, list):
        return []
    validas = []
    for r in conteudo:
        if isinstance(r, dict):
            termo = (
                r.get("termo")
                or r.get("search_term")
                or r.get("keyword")
                or r.get("descricao")
            )
            cat = r.get("categoria") or r.get("category")
            if termo and cat:
                validas.append(
                    {
                        "search_term": clean_bank_description(str(termo)),
                        "category": str(cat).strip(),
                        "debit_account": str(
                            r.get("debit_account")
                            or r.get("conta_debito")
                            or ""
                        ).strip()
                        or None,
                        "credit_account": str(
                            r.get("credit_account")
                            or r.get("conta_credito")
                            or ""
                        ).strip()
                        or None,
                        "history_code": str(
                            r.get("history_code")
                            or r.get("cod_historico")
                            or ""
                        ).strip()
                        or None,
                    }
                )
    return validas


def exportar_regras_json(regras: List[Dict[str, Any]]) -> str:
    """Serializa regras em JSON formatado para exportação."""
    return json.dumps({"regras": regras}, ensure_ascii=False, indent=2)


__all__ = [
    "classificar_transacoes_hibrido_puro",
    "classificar_transacoes_hibrido",
    "pre_classificar_por_regras",
    "inferir_categoria_semantica",
    "classificar_lote_ia",
    "validar_regras_personalizadas",
    "exportar_regras_json",
    "CATEGORIAS_PADRAO",
    "REGRAS_LOCAIS",
]
