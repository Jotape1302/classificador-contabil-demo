// GERADO por web/scripts/gen-demo-rules.py a partir de classifier_engine.py. Não editar à mão.

export const CATEGORIES = [
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
  "Outras Despesas"
] as const;

export const NATIVE_RULES = [
  {
    "category": "Transferências e Aplicações",
    "confidence": 1.0,
    "justification": "Regra nativa: Transferência Interna / Aplicação / Resgate",
    "patterns": [
      "\\bTRANSF(?:ERENCIA)?\\s+MESMA\\s+TITULARIDADE\\b",
      "\\bTED\\s+MESMA\\s+TITULARIDADE\\b",
      "\\bTEF\\s+MESMA\\s+TITULARIDADE\\b",
      "\\bPIX\\s+MESMA\\s+TITULARIDADE\\b",
      "\\bTRANSF(?:ERENCIA)?\\s+ENTRE\\s+CONTAS\\b",
      "\\bTRANSF(?:ERENCIA)?\\s+INTERNA\\b",
      "\\bTRANSF(?:ERENCIA)?\\s+CONTA\\b",
      "\\bAPLICACAO\\s+FINANCEIRA\\b",
      "\\bAPLICACAO\\s+CDB\\b",
      "\\bAPLICACAO\\s+POUPANCA\\b",
      "\\bAPLICACAO\\s+LCI\\b",
      "\\bAPLICACAO\\s+LCA\\b",
      "\\bAPLICACAO\\s+FUNDO\\b",
      "\\bAPLIC\\s+AUT(?:OMATICA)?\\b",
      "\\bAPLICACAO\\b",
      "\\bRESGATE\\s+CDB\\b",
      "\\bRESGATE\\s+POUPANCA\\b",
      "\\bRESGATE\\s+APLICACAO\\b",
      "\\bRESGATE\\s+INVESTIMENTO\\b",
      "\\bRESG\\s+AUT(?:OMATICO)?\\b",
      "\\bRESGATE\\b",
      "\\bCDB\\b",
      "\\bPOUPANCA\\b",
      "\\bTESOURO\\s+DIRETO\\b",
      "\\bINVESTIMENTO\\b",
      "\\bDEPOSITO\\s+CONTA\\b",
      "\\bDEPOSITO\\s+ENTRE\\s+CONTAS\\b",
      "\\bMESMA\\s+TITULARIDADE\\b"
    ]
  },
  {
    "category": "Despesas Bancárias",
    "confidence": 1.0,
    "justification": "Regra nativa: Tarifa Bancária / IOF / Encargo Recorrente",
    "patterns": [
      "\\bTARIFA\\s+BANCARIA\\b",
      "\\bTAR\\s+BANC\\b",
      "\\bTARIFA\\s+PACOTE\\b",
      "\\bTAR\\s+PACOTE\\b",
      "\\bPACOTE\\s+DE\\s+SERVICOS\\b",
      "\\bPACOTE\\s+MENSAL\\b",
      "\\bPACOTE\\b",
      "\\bTARIFA\\b",
      "\\bTAR\\b",
      "\\bMANUT(?:ENCAO)?\\s+CONTA\\b",
      "\\bTAXA\\s+MANUTENCAO\\b",
      "\\bTAXA\\s+DE\\s+CONTA\\b",
      "\\bTARIFA\\s+CONTA\\b",
      "\\bTARIFA\\s+CONTA\\s+CORRENTE\\b",
      "\\bIOF\\b",
      "\\bIOF\\s+RETIDO\\b",
      "\\bIOF\\s+OPER\\s+CRED\\b",
      "\\bANUIDADE\\s+CARTAO\\b",
      "\\bANUIDADE\\b",
      "\\bTAXA\\s+TRANSACAO\\b",
      "\\bTAXA\\s+PIX\\b",
      "\\bTARIFA\\s+PIX\\b",
      "\\bTAR\\s+PIX\\b",
      "\\bTARIFA\\s+TED\\b",
      "\\bTARIFA\\s+DOC\\b",
      "\\bTARIFA\\s+EXTRATO\\b",
      "\\bEXTRATO\\s+TAR\\b",
      "\\bDEB\\s+PACOTE\\b",
      "\\bENCARGOS\\s+CONTA\\b",
      "\\bENCARGOS\\s+LIMITE\\b",
      "\\bJUROS\\s+CHEQUE\\s+ESPECIAL\\b",
      "\\bJUROS\\s+BANCARIOS\\b",
      "\\bJUROS\\s+DE\\s+MORA\\b",
      "\\bTAXA\\s+EMISSAO\\b",
      "\\bDOC/TED\\b",
      "\\bDESPESAS\\s+BANCARIAS\\b",
      "\\bTAXA\\s+ADMINISTRATIVA\\s+BANCO\\b"
    ]
  },
  {
    "category": "Energia Elétrica",
    "confidence": 1.0,
    "justification": "Regra nativa: Concessionária de Energia Elétrica",
    "patterns": [
      "\\bCOPEL\\b",
      "\\bENEL\\b",
      "\\bCPFL\\b",
      "\\bCEMIG\\b",
      "\\bLIGHT\\b",
      "\\bENERGISA\\b",
      "\\bNEOENERGIA\\b",
      "\\bCELESC\\b",
      "\\bEQUATORIAL\\b",
      "\\bELEKTRO\\b",
      "\\bEDP\\s+SAO\\s+PAULO\\b",
      "\\bEDP\\s+ESPIRITO\\s+SANTO\\b",
      "\\bCOELBA\\b",
      "\\bCELPE\\b",
      "\\bCOSERN\\b",
      "\\bCEB\\s+DISTRIBUICAO\\b",
      "\\bCONTA\\s+DE\\s+LUZ\\b",
      "\\bENERGIA\\s+ELETRICA\\b",
      "\\bCONCESSIONARIA\\s+ENERGIA\\b"
    ]
  },
  {
    "category": "Água e Esgoto",
    "confidence": 1.0,
    "justification": "Regra nativa: Concessionária de Saneamento / Água",
    "patterns": [
      "\\bSANEPAR\\b",
      "\\bSABESP\\b",
      "\\bCOPASA\\b",
      "\\bCEDAE\\b",
      "\\bCOMPESA\\b",
      "\\bCORSAN\\b",
      "\\bEMBASA\\b",
      "\\bCASAN\\b",
      "\\bSANEAGO\\b",
      "\\bCAESB\\b",
      "\\bBRK\\s+AMBIENTAL\\b",
      "\\bAGUAS\\s+DE\\b",
      "\\bCONTA\\s+DE\\s+AGUA\\b",
      "\\bAGUA\\s+E\\s+ESGOTO\\b",
      "\\bDAE\\b"
    ]
  },
  {
    "category": "Transporte e Combustível",
    "confidence": 1.0,
    "justification": "Regra nativa: Combustível / Mobilidade / Pedágio",
    "patterns": [
      "\\bPOSTO\\b",
      "\\bAUTO\\s*POSTO\\b",
      "\\bCOMBUSTIVEL\\b",
      "\\bIPIRANGA\\b",
      "\\bSHELL\\b",
      "\\bPETROBRAS\\b",
      "\\bBR\\s+DISTRIBUIDORA\\b",
      "\\bVIBRA\\b",
      "\\bALE\\s+COMBUSTIVEIS\\b",
      "\\bGASOLINA\\b",
      "\\bETANOL\\b",
      "\\bDIESEL\\b",
      "\\bUBER\\b",
      "\\b99APP\\b",
      "\\b99\\s*TAXI\\b",
      "\\bCABIFY\\b",
      "\\bPEDAGIO\\b",
      "\\bSEM\\s*PARAR\\b",
      "\\bVELOE\\b",
      "\\bCONECTCAR\\b",
      "\\bAUTO\\s*PISTA\\b",
      "\\bCCR\\s+VIA\\b",
      "\\bESTACIONAMENTO\\b",
      "\\bESTAPAR\\b"
    ]
  },
  {
    "category": "Internet e Telefone",
    "confidence": 1.0,
    "justification": "Regra nativa: Concessionária de Telecomunicações / Provedor",
    "patterns": [
      "\\bCLARO\\b",
      "\\bVIVO\\b",
      "\\bTIM\\b",
      "\\bOI\\s+FIXO\\b",
      "\\bOI\\s+MOVEL\\b",
      "\\bEMBRATEL\\b",
      "\\bALGAR\\s+TELECOM\\b",
      "\\bSTARLINK\\b",
      "\\bTELEFONICA\\b",
      "\\bTELEFONE\\b",
      "\\bINTERNET\\b",
      "\\bBANDA\\s+LARGA\\b",
      "\\bFIBRA\\s+OPTICA\\b"
    ]
  },
  {
    "category": "Impostos e Taxas",
    "confidence": 1.0,
    "justification": "Regra nativa: Tributo / Imposto / Taxa Governamental",
    "patterns": [
      "\\bDAS\\b",
      "\\bSIMPLES\\s+NACIONAL\\b",
      "\\bGPS\\b",
      "\\bDARF\\b",
      "\\bFGTS\\b",
      "\\bGRF\\b",
      "\\bINSS\\b",
      "\\bICMS\\b",
      "\\bISS\\b",
      "\\bIPTU\\b",
      "\\bIPVA\\b",
      "\\bRECEITA\\s+FEDERAL\\b",
      "\\bPGFN\\b",
      "\\bPREFEITURA\\b",
      "\\bTAXA\\s+LICENCA\\b",
      "\\bALVARA\\b",
      "\\bSEFAZ\\b",
      "\\bSECRETARIA\\s+DA\\s+FAZENDA\\b",
      "\\bGUIA\\s+RECOLHIMENTO\\b"
    ]
  },
  {
    "category": "Salários e Encargos",
    "confidence": 1.0,
    "justification": "Regra nativa: Folha de Pagamento / Plano de Saúde / Benefícios de Colaboradores",
    "patterns": [
      "\\bFOLHA\\s+DE\\s+PAGAMENTO\\b",
      "\\bSALARIO\\b",
      "\\bADIANTAMENTO\\s+SALARIAL\\b",
      "\\b13\\s+SALARIO\\b",
      "\\bFERIAS\\b",
      "\\bVALE\\s+TRANSPORTE\\b",
      "\\bVALE\\s+REFEICAO\\b",
      "\\bALELO\\b",
      "\\bSODEXO\\b",
      "\\bPLUXEE\\b",
      "\\bTICKET\\s+REFEICAO\\b",
      "\\bTICKET\\s+ALIMENTACAO\\b",
      "\\bVR\\s+BENEFICIOS\\b",
      "\\bFLASH\\s+BENEFICIOS\\b",
      "\\bUNIMED\\b",
      "\\bPLANO\\s+DE\\s+SAUDE\\b",
      "\\bBRADESCO\\s+SAUDE\\b",
      "\\bAMIL\\b",
      "\\bSULAMERICA\\b",
      "\\bNOTREDAME\\b",
      "\\bHAPVIDA\\b",
      "\\bPROLABORE\\b",
      "\\bPRO-LABORE\\b",
      "\\bRESCISAO\\b",
      "\\bBENEFICIO\\b",
      "\\bCOLABORADORES\\b"
    ]
  },
  {
    "category": "Alimentação",
    "confidence": 1.0,
    "justification": "Regra nativa: Alimentação / Refeição / Mercado",
    "patterns": [
      "\\bIFOOD\\b",
      "\\bRAPPY\\b",
      "\\bRESTAURANTE\\b",
      "\\bLANCHONETE\\b",
      "\\bPADARIA\\b",
      "\\bSUPERMERCADO\\b",
      "\\bMERCADO\\b",
      "\\bCARREFOUR\\b",
      "\\bPAO\\s+DE\\s+ACUCAR\\b",
      "\\bASSAI\\b",
      "\\bATACADAO\\b",
      "\\bBIG\\b",
      "\\bCAFE\\b",
      "\\bCHURRASCARIA\\b",
      "\\bPIZZARIA\\b"
    ]
  },
  {
    "category": "Aluguel",
    "confidence": 1.0,
    "justification": "Regra nativa: Aluguel / Condomínio Comercial",
    "patterns": [
      "\\bALUGUEL\\b",
      "\\bCONDOMINIO\\b",
      "\\bLOCACAO\\s+IMOVEL\\b",
      "\\bTAXA\\s+CONDOMINIAL\\b",
      "\\bADMINISTRADORA\\s+IMOVEIS\\b",
      "\\bIMOBILIARIA\\b"
    ]
  },
  {
    "category": "Materiais de Escritório",
    "confidence": 1.0,
    "justification": "Regra nativa: Papelaria / Materiais de Escritório",
    "patterns": [
      "\\bKALUNGA\\b",
      "\\bPAPELARIA\\b",
      "\\bMATERIAIS\\s+DE\\s+ESCRITORIO\\b",
      "\\bCARTUCHO\\b",
      "\\bTONER\\b",
      "\\bSUPRIMENTOS\\b"
    ]
  },
  {
    "category": "Publicidade e Marketing",
    "confidence": 1.0,
    "justification": "Regra nativa: Mídia / Publicidade / Anúncios Digitais",
    "patterns": [
      "\\bFACEBOOK\\s+ADS\\b",
      "\\bMETA\\s+PLATFORMS\\b",
      "\\bGOOGLE\\s+ADS\\b",
      "\\bGOOGLE\\s+BRASIL\\b",
      "\\bLINKEDIN\\b",
      "\\bTIKTOK\\s+ADS\\b",
      "\\bCANVA\\b",
      "\\bAGENCIA\\s+MARKETING\\b",
      "\\bPROPAGANDA\\b"
    ]
  },
  {
    "category": "Honorários",
    "confidence": 1.0,
    "justification": "Regra nativa: Honorários Profissionais / Contabilidade / Jurídico",
    "patterns": [
      "\\bHONORARIOS\\s+CONTABEIS\\b",
      "\\bHONORARIOS\\s+ADVOCATICIOS\\b",
      "\\bHONORARIOS\\b",
      "\\bCONTABILIDADE\\b",
      "\\bADVOCACIA\\b",
      "\\bCONSULTORIA\\s+JURIDICA\\b",
      "\\bAUDITORIA\\b"
    ]
  },
  {
    "category": "Vendas e Receitas",
    "confidence": 1.0,
    "justification": "Regra nativa: Recebimento / Vendas / Faturamento de Clientes",
    "patterns": [
      "\\bRECEBIMENTO\\b",
      "\\bRECEITA\\b",
      "\\bFATURAMENTO\\b",
      "\\bVENDA\\b",
      "\\bVENDAS\\b",
      "\\bCLIENTE\\b",
      "\\bSERVICOS\\s+CONTABEIS\\b",
      "\\bMENSALIDADE\\b",
      "\\bDUPLICATA\\b",
      "\\bRECEB\\b",
      "\\bLIQUIDACAO\\b",
      "\\bCOBRANCA\\b",
      "\\bDEPOSITO\\b",
      "\\bRECEB\\s+PIX\\b",
      "\\bPIX\\s+RECEB\\b",
      "\\bCREDITO\\s+EM\\s+CONTA\\b"
    ]
  }
] as const;

export const SEMANTIC_INCOME = {
  "transfer": {
    "words": [
      "RESGATE",
      "APLIC",
      "CDB",
      "POUPANCA",
      "INVEST",
      "TRANSFERENCIA",
      "MESMA",
      "INTERNA"
    ],
    "category": "Transferências e Aplicações",
    "confidence": 0.95,
    "justification": "Resgate / Transferência de mesma titularidade"
  },
  "default": {
    "category": "Vendas e Receitas",
    "confidence": 0.95,
    "justification": "Recebimento de cliente / Receita operacional"
  }
} as const;

export const SEMANTIC_EXPENSE = [
  {
    "words": [
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
      "PROGRAMACAO"
    ],
    "category": "Serviços de Terceiros",
    "confidence": 0.9,
    "justification": "Despesa com serviços tecnológicos, sistemas ou terceirizados"
  },
  {
    "words": [
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
      "EVENTO"
    ],
    "category": "Publicidade e Marketing",
    "confidence": 0.9,
    "justification": "Investimento em divulgação, mídia digital ou capacitação"
  },
  {
    "words": [
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
      "AEROPORTO"
    ],
    "category": "Transporte e Combustível",
    "confidence": 0.9,
    "justification": "Despesa com deslocamento, transporte corporativo ou abastecimento"
  },
  {
    "words": [
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
      "CHURRASCARIA"
    ],
    "category": "Alimentação",
    "confidence": 0.9,
    "justification": "Despesa com alimentação / refeição da equipe"
  },
  {
    "words": [
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
      "TON"
    ],
    "category": "Despesas Bancárias",
    "confidence": 0.9,
    "justification": "Taxa, tarifa de serviços bancários ou maquininha"
  },
  {
    "words": [
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
      "GUIA"
    ],
    "category": "Impostos e Taxas",
    "confidence": 0.92,
    "justification": "Recolhimento de guia tributária / imposto governamental"
  },
  {
    "words": [
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
      "ODONTO"
    ],
    "category": "Salários e Encargos",
    "confidence": 0.9,
    "justification": "Pagamento de pessoal, pró-labore ou benefício trabalhista"
  },
  {
    "words": [
      "ALUGUEL",
      "CONDOMINIO",
      "IMOBILIARIA",
      "LOCACAO",
      "IMOVEL",
      "SALA"
    ],
    "category": "Aluguel",
    "confidence": 0.9,
    "justification": "Locação de imóvel comercial ou taxa condominial"
  },
  {
    "words": [
      "COPEL",
      "ENEL",
      "CPFL",
      "CEMIG",
      "LIGHT",
      "ENERGIA",
      "ELETRIC",
      "LUZ"
    ],
    "category": "Energia Elétrica",
    "confidence": 0.95,
    "justification": "Fornecimento de energia elétrica comercial"
  },
  {
    "words": [
      "SABESP",
      "SANEPAR",
      "COPASA",
      "CASAN",
      "AGUA",
      "ESGOTO",
      "SANEAMENTO"
    ],
    "category": "Água e Esgoto",
    "confidence": 0.95,
    "justification": "Serviço de fornecimento de água e saneamento"
  },
  {
    "words": [
      "VIVO",
      "CLARO",
      "TIM",
      "OI",
      "EMBRATEL",
      "NET",
      "TELEFONE",
      "INTERNET",
      "FIBRA",
      "BANDA"
    ],
    "category": "Internet e Telefone",
    "confidence": 0.95,
    "justification": "Conta de telecomunicações / internet / telefonia"
  },
  {
    "words": [
      "KALUNGA",
      "PAPELARIA",
      "CARTUCHO",
      "TONER",
      "SUPRIMENTO",
      "PAPEL",
      "ESCRITORIO"
    ],
    "category": "Materiais de Escritório",
    "confidence": 0.88,
    "justification": "Suprimentos e materiais para rotina do escritório"
  },
  {
    "words": [
      "DELL",
      "APPLE",
      "SAMSUNG",
      "NOTEBOOK",
      "COMPUTADOR",
      "MONITOR",
      "MAQUINA",
      "EQUIPAMENTO",
      "IMPRESSORA",
      "KABUM"
    ],
    "category": "Equipamentos",
    "confidence": 0.88,
    "justification": "Aquisição de ativos / equipamentos e hardware de TI"
  },
  {
    "words": [
      "ADVOGADO",
      "ADVOCACIA",
      "HONORARIO",
      "CONTABILIDADE",
      "CONTABIL",
      "AUDITORIA",
      "PERICIA"
    ],
    "category": "Honorários",
    "confidence": 0.9,
    "justification": "Pagamento de honorários profissionais especializados"
  }
] as const;

export const SEMANTIC_MAGNITUDE = {
  "high": {
    "above": 2000,
    "category": "Serviços de Terceiros",
    "confidence": 0.8,
    "justification": "Prestação de serviços operacionais corporativos"
  },
  "low": {
    "below": 50,
    "category": "Despesas Bancárias",
    "confidence": 0.8,
    "justification": "Despesa operacional bancária de pequeno porte"
  },
  "default": {
    "category": "Materiais de Escritório",
    "confidence": 0.8,
    "justification": "Despesas com insumos e manutenção da rotina"
  }
} as const;
