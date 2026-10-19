# Registro de bases legais potenciais

**Minuta técnica — revisão jurídica obrigatória.** Não é parecer jurídico.

| Operação | Base provável | Justificativa | Pendência |
|---|---|---|---|
| Criar/autenticar conta e prestar SaaS | execução de contrato (art. 7º V) | necessário ao serviço solicitado | identificar contratante e aceite |
| Segurança, antifraude e rate limit | legítimo interesse (art. 7º IX) e/ou exercício regular de direitos (VI) | proteção do serviço e usuários | documentar teste de balanceamento |
| Guarda de registros de acesso, se aplicável | obrigação legal (II) | Marco Civil conforme enquadramento | jurídico deve definir quais logs e 6 meses |
| Suporte e comunicação operacional | contrato (V) | execução e continuidade | separar marketing |
| Marketing/leads | legítimo interesse ou consentimento conforme canal/contexto | não é necessário ao core | LIA, opt-out e política; webhook hoje não tem governança |
| Processar extratos como operadora | instrução do controlador e base por ele definida | art. 39; Zaeron não escolhe automaticamente a base do cliente | DPA e registro de instruções |
| Obrigações contábeis/fiscais | obrigação legal do controlador cliente, quando demonstrada | pode justificar parte da retenção | Zaeron não deve presumir prazo de 5 anos para tudo |
| IA sobre lançamentos | mesma base do processamento principal, com necessidade/transparência | consentimento não é resposta padrão | DPA, transferência, minimização e opção contratual |
| E-mail OTP | contrato e segurança/legítimo interesse | validação de acesso | retenção do provedor |
| Academy | contrato (V); legítimo interesse apenas após LIA | entregar curso/certificado | publicidade do nome exige transparência e possível escolha |
| Cookies essenciais | contrato/legítimo interesse | sessão e segurança | não requer consentimento |
| Tema funcional | consentimento ou escolha solicitada | preferência não essencial | corrigido: não persiste se rejeitado |
| Analytics/marketing futuros | consentimento específico | opcionais | nenhum script deve carregar antes da escolha |
| DSAR e incidente | obrigação legal (II), exercício regular de direitos (VI) | atender LGPD e defender direitos | criar registros e responsáveis |

Pontos jurídicos: entidade/CNPJ/endereço, encarregado/canal, bases do marketing, prazo dos logs, transferência internacional, publicidade de certificados, critérios de retenção e hipóteses do art. 16.
