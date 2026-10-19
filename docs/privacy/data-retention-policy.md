# Política de retenção e eliminação de dados — proposta

**Atualização:** 28/08/2026
**Situação atual:** não foram encontrados jobs abrangentes de expurgo. Os prazos são metas sujeitas a aprovação jurídica, fiscal e comercial.

| Categoria | Prazo proposto | Gatilho | Eliminação | Exceções |
|---|---|---|---|---|
| Conta e perfil | vigência + 90 dias | término/solicitação válida | excluir ou anonimizar identificadores | obrigação legal, cobrança, litígio |
| Hash de senha e sessões | conta ativa; sessão até 8 h | troca de senha/logout/expiração | substituir hash; expirar token | evidência mínima de fraude |
| OTP | 24 h após expiração | uso ou expiração | hard delete do registro | incidente em investigação |
| Extratos, lotes, transações e regras | 90 dias após processamento ou prazo contratual menor | conclusão/término | exclusão por tenant e referências | obrigação documentada do controlador |
| Uso/limites | ciclo atual + 13 meses | fechamento do ciclo | agregação/anonimização | faturamento/disputa |
| Academy/progresso/certificados | vigência + prazo contratual | término | exclusão/anonimização; preservar certificado só se acordado | comprovação solicitada pelo titular/cliente |
| Logs de aplicação e segurança | 90 dias; registros legais conforme parecer | criação | rotação segura | obrigação legal ou incidente |
| Logs de proxy/container | 30 dias | criação | rotação | incidente |
| Leads/formulários | 90 dias sem conversão | última interação | exclusão | consentimento/legítimo interesse validado |
| Execuções n8n | 7–30 dias | execução | pruning automático | falha/incident response |
| Backups | diários 35 dias; mensais 12 meses | criação | expiração criptográfica e física | legal hold |
| Documentos em dumps locais | zero no Git; backup controlado conforme linha anterior | criação | armazenamento criptografado e expurgo | evidência preservada do incidente |

## Regras

- A finalidade e a necessidade prevalecem; prazo “indefinido” não é padrão aceitável.
- Um legal hold deve registrar escopo, aprovador, motivo, início e revisão; não congela dados alheios ao caso.
- A eliminação deve alcançar produção, réplicas, objetos e filas. Backups imutáveis expiram pelo ciclo; restauração deve reaplicar a fila de exclusões.
- Pedidos feitos à Zaeron como operadora são encaminhados ao cliente controlador, salvo dados da relação direta.
- Relatórios de expurgo devem conter contagem, tenant, regra e resultado, sem copiar o conteúdo removido.

## Implementação necessária

1. Aprovar prazos e contratos; criar tabela/fila auditável de retenção e legal hold.
2. Implementar jobs idempotentes por tenant para OTP, lotes, logs e leads.
3. Disponibilizar exportação e exclusão segura com autorização reforçada.
4. Configurar pruning do n8n e confirmar destinos de workflows.
5. Testar mensalmente o expurgo em ambiente isolado e trimestralmente a restauração com reaplicação das exclusões.

**AÇÃO HUMANA NECESSÁRIA:** jurídico deve aprovar bases, prazos fiscais/contábeis e exceções; produto deve decidir prazo contratual de extratos e certificados.
