# Política de Privacidade — minuta técnica

**Atualização:** 28/08/2026
**Não publicar sem preencher e validar os campos marcados.** Esta minuta não substitui aconselhamento jurídico.

## 1. Quem somos e nossos papéis

A Zaeron Contábil é oferecida por **[AÇÃO HUMANA NECESSÁRIA: razão social, CNPJ, endereço e contato]**. O encarregado/canal de privacidade é **[AÇÃO HUMANA NECESSÁRIA: nome ou função e canal testado]**.

Somos controladora dos dados usados para conta, contrato, segurança, suporte e comunicações próprias. Quando um escritório ou empresa envia extratos e dados de seus clientes, funcionários ou fornecedores, normalmente atuamos como operadora seguindo instruções desse cliente, que permanece controlador. Podemos ser controladora de finalidades próprias claramente informadas; isso deve ser separado contratualmente.

## 2. Dados e origens

Tratamos dados fornecidos pelo usuário ou cliente: nome, e-mail, CPF/CNPJ, escritório, ERP, credenciais protegidas por hash, preferências e mensagens. Arquivos contábeis podem conter datas, valores, históricos, contrapartes e outros dados financeiros ou profissionais de terceiros. Também geramos metadados de sessão, uso, IP nos controles de abuso, registros de segurança, classificações, regras, progresso e certificados. Recebemos dados do navegador, dos arquivos carregados, de clientes B2B e dos provedores necessários ao serviço.

Não solicitamos deliberadamente dados sensíveis no fluxo principal. Como texto livre e documentos podem contê-los, clientes devem minimizar o conteúdo e a plataforma deve tratá-lo como potencialmente sensível.

## 3. Finalidades e bases potenciais

Usamos dados para prestar e administrar o SaaS, autenticar usuários, processar e classificar lançamentos, manter regras, gerar métricas e certificados, oferecer suporte, faturar e proteger o serviço. Bases prováveis incluem execução de contrato, cumprimento de obrigação legal, exercício regular de direitos e legítimo interesse com teste de balanceamento. Consentimento será usado somente quando uma escolha genuína for necessária, como categorias opcionais de cookies ou marketing específico. Para dados processados como operadora, a base é definida pelo cliente controlador e as instruções são formalizadas em DPA.

**AÇÃO HUMANA NECESSÁRIA:** jurídico deve validar bases, marketing, registros legais e operações com dados de terceiros.

## 4. IA e decisões

Descrições limpas e valores de transações ambíguas podem ser enviados a Google Gemini ou Groq para sugestão de classificação. Não há ferramenta autônoma nem decisão jurídica automática no fluxo auditado; a saída pode exigir revisão humana e não deve ser usada como verdade infalível. A minimização/pseudonimização deve impedir o envio de nomes, documentos ou textos desnecessários. O cliente será informado dos provedores, países, retenção e mecanismo de transferência antes do uso em produção.

## 5. Compartilhamento e suboperadores

Podemos compartilhar o mínimo necessário com hospedagem/VPS, PostgreSQL autogerido, Google Gemini, Groq, Resend ou servidor SMTP, GitHub para código sem dados de produção, Caddy/autoridade certificadora e, quando configurado, n8n e destinos de workflows. O registro atual está em `docs/privacy/subprocessor-register.md`.

**AÇÃO HUMANA NECESSÁRIA:** confirmar entidade contratada, região, DPA, retenção, subcontratados e canal de exclusão de cada fornecedor. O incidente de dumps no Git deve ser apurado antes de declarar que o GitHub nunca recebeu dados pessoais.

## 6. Transferência internacional

Provedores de IA, e-mail, repositório ou suporte podem tratar dados fora do Brasil. A transferência só deve ocorrer após validação jurídica do mecanismo aplicável, transparência e garantias contratuais/técnicas. Países e regiões ainda não foram comprovados e devem ser publicados após due diligence.

## 7. Retenção e eliminação

Mantemos dados enquanto necessários à finalidade, ao contrato ou a obrigações e defesas legais. Prazos propostos constam na política de retenção; não existe ainda expurgo abrangente comprovado. Backups seguem ciclos próprios e, quando restaurados, devem reaplicar exclusões pendentes. Não mantemos dados indefinidamente por padrão.

## 8. Segurança

Adotamos hash Bcrypt, cookies de sessão `HttpOnly`, `SameSite=Lax` e `Secure` em produção, TLS, isolamento por usuário no backend, limites de requisição, validação de arquivos e registros técnicos. Nenhuma medida elimina todo risco. O programa ainda possui pendências bloqueadoras descritas no relatório de pré-lançamento; esta minuta não representa certificação de conformidade.

## 9. Cookies

A sessão autenticada é necessária. Preferência de tema é opcional e só é persistida com permissão funcional. Não foram identificados trackers analíticos/marketing ativos no código auditado. Consulte a Política de Cookies e altere a escolha pelo gerenciador de preferências.

## 10. Direitos

O titular pode solicitar confirmação, acesso, correção, anonimização, bloqueio, eliminação quando aplicável, portabilidade aplicável, informação de compartilhamento, oposição e revogação de consentimento. Verificaremos identidade proporcionalmente. Se atuarmos como operadora, encaminharemos ao cliente controlador. Respostas serão entregues por canal seguro e não incluirão dados de terceiros.

## 11. Crianças e adolescentes

O serviço B2B não é destinado a crianças. **AÇÃO HUMANA NECESSÁRIA:** confirmar regra de elegibilidade e tratamento acidental em documentos enviados por clientes.

## 12. Contato, incidentes e alterações

Pedidos e dúvidas: **[canal a confirmar]**. Incidentes serão avaliados conforme LGPD e regras da ANPD, incluindo comunicação quando aplicável. Mudanças materiais nesta política terão data/versão e aviso adequado.

### Aprovações antes de publicar

Entidade e contato; papéis contratuais; bases; prazos; fornecedores/países; mecanismo internacional; elegibilidade; canal DSAR; cookies; incidentes; texto de transparência da IA e histórico de versões.
