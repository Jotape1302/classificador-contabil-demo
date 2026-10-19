# Registro de fornecedores e suboperadores

**Atualização:** 28/08/2026. “Não verificado” impede declarar o fornecedor aprovado.

| Fornecedor/serviço | Finalidade | Dados possíveis | País/região | Criticidade | Contrato/DPA | Risco/observações |
|---|---|---|---|---|---|---|
| Provedor da VPS **a confirmar** | containers, rede e volumes | todos os dados e logs | não verificado | Crítica | não verificado | confirmar empresa, região, acesso e descarte |
| Hostinger DNS | DNS dos domínios observados | domínio e metadados da conta | não verificado | Alta | não verificado | DNS não prova que seja o host da VPS; exigir MFA |
| Google Gemini | classificação por IA | descrição limpa e valor; PII pode sobreviver à limpeza | internacional/não verificado | Alta | não verificado | transferência, retenção, suboperadores; chave saiu da URL após correção |
| Groq | classificação por IA | descrição limpa e valor | internacional/não verificado | Alta | não verificado | mesma due diligence e minimização |
| Resend | OTP/e-mail transacional | e-mail, código temporário e metadados | não verificado | Alta | não verificado | retenção, logs e supressões |
| SMTP configurável | e-mail transacional | e-mail, OTP e metadados | não identificado | Alta | não verificado | identificar antes de habilitar |
| GitHub | hospedagem do repositório | código; dumps pessoais foram versionados em commit | não verificado | Crítica | termos padrão/não revisados | incidente aberto; purgar histórico e inventariar clones |
| Let's Encrypt/Caddy | certificados e proxy | domínio, IP e metadados de emissão/acesso | internacional | Média | termos padrão | logs e transparência |
| n8n autohospedado | automação/webhooks | depende dos workflows; potencial lead/PII/credenciais | mesma VPS; destinos desconhecidos | Crítica | interno; destinos não verificados | pruning, workflows, backups e acessos pendentes |
| OmniRoute autohospedado | gateway/gestão de IA | chaves, modelos, métricas e payload conforme configuração | mesma VPS; upstreams desconhecidos | Crítica | interno/upstreams não verificados | painel público via domínio; validar auth e segregação |
| WhatsApp/Meta | contato iniciado por link | telefone, perfil e mensagem fornecidos pelo usuário | internacional/não verificado | Média | não verificado | informar que usuário deixa a plataforma |
| ViaCEP (código legado) | completar endereço por CEP | CEP | Brasil | Baixa | não verificado | integração encontrada inativa; remover ou documentar antes de reativar |

## Processo de aprovação

Antes de ativar/renovar: Segurança e Privacidade avaliam finalidade, minimização, região, criptografia, retenção, subcontratados, incidentes, exclusão, auditoria, continuidade, portabilidade e mecanismo de transferência internacional. Jurídico valida DPA/contrato e Produto registra dono e alternativa de saída. Revisão anual ou após mudança material/incidente.

**AÇÃO HUMANA NECESSÁRIA:** preencher entidades legais, países, links de termos/DPA, data de aprovação e responsável. Obter autorização contratual para suboperadores usados em dados B2B.
