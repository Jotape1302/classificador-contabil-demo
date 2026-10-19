# Zaeron Contábil — Classificador de Extratos (versão de demonstração)

Plataforma B2B para escritórios contábeis: transforma extratos bancários brutos (OFX, CSV e PDF)
em lançamentos classificados, com histórico contábil padronizado e exportação para ERPs
(Domínio, Questor, Omie, Fortes). Inclui a **Zaeron Academy**, com curso, quizzes e
certificado verificável publicamente.

> **Projeto de portfólio.** Cópia pública do produto, com histórico do git recomeçado. Ficaram
> de fora auditorias de infraestrutura, endereços e o script de deploy de produção; os domínios
> reais foram trocados por `zaeron.example`. Código, arquitetura e testes são os originais.

**🔗 Demonstração ao vivo:** https://jotape1302.github.io/classificador-contabil-demo/ — clique em
**“Entrar na demonstração”** e depois em **“Usar extrato de exemplo”** (ou envie um OFX/CSV seu:
o arquivo é lido no navegador e não sai dele).

## Como funciona a classificação

Cascata em três níveis, do mais barato e auditável ao mais caro:

1. **Memória do escritório** — termos que o contador cadastrou ou corrigiu (`/rules`), com
   contas de débito/crédito e código de histórico do ERP.
2. **Regras nativas** — 240 padrões de extratos brasileiros (PIX, TED, tarifas, DARF, folha,
   concessionárias…), com confiança 100%.
3. **IA com fallback semântico** — só o que sobra vai ao LLM (Gemini/Groq), **depois** de passar
   pelo sanitizador de PII (CPF, e-mail, telefone, chaves Pix), fail-closed. Sem resposta da IA,
   uma heurística por palavra-chave e faixa de valor garante categoria contábil real.

Antes disso, cada descrição é higienizada (prefixos de canal, NSU, datas embutidas, códigos), e
lançamentos já processados são marcados como duplicados por hash.

## O modo demonstração

O build `VITE_DEMO=true` troca a API por um roteador local (`web/src/demo/`) que responde às
mesmas rotas `/api/*`, com os mesmos formatos, guardando o estado no `localStorage`:

- `rules.generated.ts` é **gerado do motor Python** (`web/scripts/gen-demo-rules.py`, via `ast`),
  então a demo classifica com as mesmas regras do backend. O CI falha se o arquivo ficar
  desatualizado. A limpeza e a cascata foram portadas para TypeScript e conferidas contra o Python
  num conjunto de descrições reais de extrato (mesma descrição limpa, categoria, origem e histórico).
- Sem LLM na demo: o nível 3 usa o fallback semântico (origem “Motor Inteligente”), que é o
  mesmo comportamento do backend quando a IA não responde.
- PDF usa o extrato de exemplo (a leitura real de PDF é feita no servidor). PDF/XLSX da
  exportação viram, respectivamente, relatório pronto para “Salvar como PDF” e CSV.
- Login, cadastro e OTP são simulados (qualquer código de 6 dígitos). O botão **Reiniciar**
  restaura os dados de exemplo.

O código da demo é carregado por `import()` atrás de `import.meta.env.VITE_DEMO`, então não entra
no build de produção.

## Stack

- **API:** Python 3.11, FastAPI, SQLAlchemy, Alembic, PostgreSQL 15 com Row-Level Security por
  usuário e papéis separados (`zaeron_admin` para migração, `zaeron_app` para a aplicação),
  pandas/pypdf para leitura de extratos, openpyxl para exportação, JWT em cookie HttpOnly,
  rate limit, OTP por e-mail.
- **Web:** React 18, TypeScript, Vite, TanStack Query, React Router, Tailwind, Recharts e
  Three.js (logo 3D do login).
- **Infra:** Docker Compose com contêineres read-only, `cap_drop: ALL` e `no-new-privileges`;
  Caddy com TLS automático e cabeçalhos de segurança; NGINX servindo o SPA com CSP restritiva.
- **LGPD:** inventário de dados, bases legais, retenção, mapa controladora/operadora e
  procedimento de atendimento ao titular em `docs/privacy/`; termos e políticas em `legal/`.

## Rodando

```bash
# Demonstração (sem backend)
cd web && npm ci && npm run dev:demo         # http://localhost:5173

# Testes do backend
pip install -r requirements.txt pytest
pytest -q                                    # 197 testes

# Stack completa (precisa de .env com DATABASE_URL, POSTGRES_PASSWORD, JWT e chaves de IA/SMTP)
docker compose up -d --build
```

Depois de mudar `classifier_engine.py` ou o curso em `api/zaeron_api/content/`, rode
`npm --prefix web run gen:demo` e commite os arquivos gerados.
