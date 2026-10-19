# Inventário de cookies e armazenamento do navegador

**Atualização:** 28/08/2026. Inventário baseado no código React, Streamlit, Nginx e Caddy.

| Item | Tipo | Categoria | Emissor | Conteúdo/finalidade | Duração | Consentimento |
|---|---|---|---|---|---|---|
| `zaeron_session` | cookie first-party | necessário | API | JWT assinado para autenticação; contém ID interno, `jti`, tempos e versão de sessão, sem senha | até 8 h; removido no logout | não, estritamente necessário |
| `zaeron_cookie_consent_v1` | `localStorage` | necessário | SPA | decisão `necessary/functional/analytics/marketing` e timestamp | até remoção pelo usuário | não; registra a própria escolha |
| `zaeron_theme` | `localStorage` | funcional | SPA | preferência `dark/light` | até remoção | sim, categoria funcional |
| cookie Streamlit | cookie técnico first-party | necessário | Streamlit legado | sessão técnica da aplicação legada | sessão/conforme framework | não, se o legado estiver publicado |

## Resultado da varredura

- Não foram encontrados Google Analytics, Google Tag Manager, Meta Pixel ou scripts de marketing ativos.
- As importações remotas de Google Fonts foram removidas. A aplicação usa fontes locais/fallback e não faz essa requisição antes do consentimento.
- O banner oferece aceitar todos, rejeitar não essenciais e preferências granulares.
- Correção aplicada: “somente essenciais” agora também desativa `functional`; o hook de tema só lê/grava `zaeron_theme` com permissão e remove o valor após rejeição.
- Não há cookie de CSRF separado. A API usa cookie `HttpOnly`, `Secure` configurável e `SameSite=Lax`, e valida `Origin` em métodos inseguros. Essa defesa deve ser retestada no domínio final.
- Links de WhatsApp são navegação iniciada pelo usuário, não tracker embutido; a plataforma externa passa a tratar dados quando o link é acionado.

## Controles operacionais pendentes

1. Publicar a política de cookies e manter link permanente “Preferências de cookies”.
2. Registrar versão da política junto à escolha, sem transformar o registro em perfil de marketing.
3. Bloquear tecnicamente qualquer analytics/marketing futuro até opt-in e atualizar este inventário.
4. Retestar cookies no HTTPS real, inclusive `Secure`, `HttpOnly`, `SameSite`, domínio, path, expiração, logout e navegadores móveis.
5. **AÇÃO HUMANA NECESSÁRIA:** jurídico deve validar a classificação do tema como funcional e a redação do banner.
