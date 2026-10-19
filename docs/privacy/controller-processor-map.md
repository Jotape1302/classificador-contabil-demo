# Mapa Controladora–Operadora–Suboperadora

**Atualização:** 28/08/2026. Classificação técnica sujeita a revisão jurídica.

| Fluxo | Papel provável da Zaeron | Outro agente | Justificativa | Revisão |
|---|---|---|---|---|
| Conta, cobrança, segurança, suporte e marketing próprio | Controladora | usuário/cliente B2B | Zaeron define finalidades e meios essenciais | validar entidade legal e finalidades |
| Extratos e dados de clientes finais enviados pelo escritório | Operadora | escritório/empresa cliente como controladora | processamento ocorre por instrução contratual B2B | DPA obrigatório |
| Dados que a Zaeron reutilize para produto, fraude ou analytics próprio | Controladora ou controladora conjunta | cliente | finalidade própria não é mera operação | delimitar e minimizar |
| Groq/Google sobre dados de transação | Zaeron como operadora que contrata suboperador | provedores como suboperadores | recebem payload para executar a instrução | autorização, DPA e transferência |
| Resend/SMTP | Controladora para conta; operadora quando a mensagem deriva de instrução B2B | provedor de e-mail | entrega transacional | DPA/retenção |
| VPS/hosting e backup | Suboperadores de infraestrutura | provedor a confirmar | hospedam todos os dados | contrato e região |
| n8n/webhook de lead | Controladora no uso comercial; operador se execução for instruída | n8n/host e destinos dos workflows | finalidade varia por workflow | inventário obrigatório |
| Certificado público | Controladora | aluno e validador | Zaeron define emissão e exposição | transparência e mecanismo de oposição/revogação |
| Cookies essenciais e logs de segurança | Controladora | navegador/hosting | meios e finalidade definidos pela Zaeron | teste de legítimo interesse |

A Zaeron não deve declarar-se controladora de todo o conteúdo contábil. O contrato precisa separar dados de relacionamento próprios de dados inseridos pelo cliente e prever instruções documentadas, confidencialidade, suboperadores, DSAR, incidente, devolução e eliminação.
