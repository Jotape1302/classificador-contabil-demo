# Inventário de dados pessoais (ROPA técnico)

**Atualização:** 28/08/2026. Prazos abaixo são propostas; nenhum job de expurgo foi encontrado.

| Processo | Dados | Titular | Finalidade | Armazenamento | Compartilhamento | Retenção | Risco |
|---|---|---|---|---|---|---|---|
| Cadastro/conta | nome, e-mail, CPF/CNPJ, escritório, endereço legado, hash Bcrypt, timestamps, status | usuário/contador | conta, autenticação, contrato, antifraude | `users` | Resend/SMTP para OTP quando usado | conta ativa + prazo jurídico a definir | Alto |
| Sessão | ID interno, `jti`, emissão/expiração, versão HMAC; IP em rate limit | usuário | autenticação e segurança | cookie HttpOnly; memória da API | nenhum | até 8 h por padrão; memória até reinício | Médio |
| OTP | e-mail, hash Bcrypt do código, tentativas, expiração | usuário | verificar e-mail em fluxo legado | `email_verifications` | Resend/SMTP | não há expurgo automático comprovado | Médio |
| Perfil | escritório, ERP, faixa de clientes, regras JSON | usuário/empresa | parametrização | `office_profiles` | nenhum | conta ativa; não automatizado | Médio |
| Upload/classificação | nome do arquivo; data, valor, descrições originais/limpas, contrapartes possíveis, categoria, contas, confiança | clientes finais, funcionários, fornecedores e empresa cliente | conciliação/classificação | lotes, transações e `processed_transactions` | Groq/Google para itens ambíguos | indefinida no código | Muito alto |
| Regras | termo/contraparte, categoria, contas contábeis | cliente e possíveis terceiros | memória de classificação | `classification_rules` | nenhum | até exclusão/conta; sem job | Médio |
| Métricas | volumes, horas/economia estimadas, fonte IA, arquivo | usuário/empresa | ROI, operação e cobrança | `usage_logs`, `batch_executions` | webhook legado quando configurado | indefinida no código | Médio |
| Academy | progresso, respostas, notas, nome em certificado, código público | aluno | ensino e certificação | tabelas `academy_*` | consulta pública por código | indefinida; revogação lógica | Médio |
| E-mail | endereço, assunto e OTP | usuário | comunicação transacional | provedor e memória da aplicação | Resend/SMTP | política do provedor não validada | Alto |
| Webhook/lead legado | ID interno, nome, e-mail, escritório, ERP, nome do arquivo, volume | usuário | suporte/comercial/telemetria | destino externo/n8n | endpoint configurado | não validada | Alto |
| IA | descrição higienizada, valor, índice; resposta e classificação | contrapartes e clientes finais | inferência contábil | memória; provedor externo | Groq/Google, possível transferência internacional | não validada | Muito alto |
| Logs | rota, status, request ID, timestamp; antes da correção havia e-mail/CPF/OTP/exceções | usuário/visitante | segurança/observabilidade | Docker `json-file` (3 x 10 MiB por container) | equipe operacional | por tamanho, não por prazo | Alto |
| Backups | cópia integral, inclusive contas, hashes e transações | todos acima | continuidade | dumps locais; volume | Git privado no incidente identificado | dois dumps estavam no histórico; sem política aplicada | Muito alto |
| Preferências web | tema e registro de preferências/categorias | usuário/visitante | UX e prova técnica de escolha | `localStorage` | nenhum | até limpeza/revogação | Baixo |
| IP/DNS/TLS | IP, host, rota, metadados | visitante/usuário | entrega e segurança | proxy/host/provedores | Caddy, hospedagem, ACME | não formalizada | Médio |

## Dados não encontrados

Telefone, geolocalização precisa, cartão, biometria, documentos de identidade enviados, chat/conversa e arquivos armazenados em bucket não aparecem no fluxo ativo. CPF/CNPJ e dados financeiros são tratados; descrições bancárias podem conter dados sensíveis por contexto e devem ser tratadas como conteúdo não confiável.

## Ações obrigatórias

- Definir prazos aprovados e implementar jobs de expurgo.
- Permitir exclusão/exportação por tenant com trilha de auditoria.
- Avaliar o commit com dumps como incidente e preservar evidências.
- Validar se descrições/valores podem sair para IA e aplicar pseudonimização adicional.
- Inventariar n8n e o webhook real antes de reativá-lo.
