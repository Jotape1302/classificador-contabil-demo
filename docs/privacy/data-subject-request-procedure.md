# Procedimento de atendimento aos direitos dos titulares (DSAR)

**Atualização:** 28/08/2026
**Status:** procedimento proposto; canal e responsáveis ainda precisam ser formalizados.

## Escopo e papéis

Pedidos podem envolver confirmação, acesso, correção, anonimização, bloqueio, eliminação quando aplicável, portabilidade aplicável, informação sobre compartilhamento, oposição e revogação de consentimento. Para conteúdo enviado por cliente B2B, a Zaeron normalmente atua como operadora: registra o pedido, preserva-o e notifica o controlador sem responder sobre mérito por conta própria.

## Fluxo

1. Receber no canal **[AÇÃO HUMANA NECESSÁRIA: canal oficial testado]** e gerar protocolo sem incluir dados excessivos.
2. Classificar titular, direito, sistemas/tenants e papel da Zaeron.
3. Confirmar identidade de modo proporcional: usuário autenticado e nova confirmação; fora da conta, desafio por canal previamente verificado. Não pedir documento completo por e-mail salvo necessidade justificada; mascarar e apagar a cópia depois.
4. Para dado de terceiro em tenant B2B, validar vínculo e encaminhar ao controlador contratante em até **[prazo contratual]**.
5. Fazer busca por identificadores autorizados em PostgreSQL, arquivos, logs, n8n, suporte, e-mail e backups catalogados.
6. Avaliar exceções legais, legal hold e direitos de terceiros com jurídico; documentar a razão.
7. Executar ação com revisão por segunda pessoa em exclusão, portabilidade e mudança de identidade.
8. Entregar por canal autenticado/criptografado; nunca anexar dump bruto ou dados de outros titulares.
9. Registrar data, decisão, sistemas, operador e evidências mínimas. Encerrar dentro do prazo legal aplicável.
10. Propagar exclusões aos suboperadores e à fila pós-restauração; confirmar conclusão.

## Segurança

- Rate limit e detecção de fraude no formulário; resposta genérica que não confirme contas antes da verificação.
- Exportação estruturada, minimizada e protegida por expiração; link de uso único quando disponível.
- Separação por `user_id`/tenant e teste automatizado de isolamento antes da entrega.
- Acesso ao registro DSAR apenas para Privacidade, Jurídico e Segurança conforme necessidade.

## Matriz de responsabilidades

| Papel | Responsabilidade |
|---|---|
| Atendimento/Privacidade | triagem, identidade, prazos e comunicação |
| Controlador cliente | instrução e decisão sobre conteúdo B2B |
| Engenharia | busca, exportação, correção e eliminação |
| Segurança | fraude, incidentes e entrega segura |
| Jurídico | exceções, oposição, prazo e comunicação regulatória |

**AÇÃO HUMANA NECESSÁRIA:** nomear responsáveis, definir canal, SLA interno/contratual, ferramenta de tickets e aprovar modelos de resposta. O produto ainda não oferece automação completa de DSAR; até sua implementação, o processo é manual e deve ser testado antes do lançamento.
