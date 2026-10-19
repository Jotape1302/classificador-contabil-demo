// GERADO por web/scripts/gen-demo-rules.py a partir de content/ia_rotina_contabil. Não editar à mão.

export const COURSE = {
  "course_key": "ia_rotina_contabil",
  "version": "1.0.0",
  "title": "IA Aplicada à Rotina Contábil",
  "description": "Curso prático para aplicar inteligência artificial com segurança, revisão humana e foco em produtividade nas rotinas de escritórios contábeis.",
  "passing_score": 70,
  "estimated_duration_minutes": 210,
  "modules": [
    {
      "module_key": "m01",
      "order": 1,
      "title": "IA na rotina contábil",
      "description": "Fundamentos, limites e seleção de tarefas adequadas para IA.",
      "lessons": [
        {
          "lesson_key": "m01_a01",
          "order": 1,
          "title": "Onde a IA gera valor na contabilidade",
          "estimated_minutes": 30,
          "passing_score": 60,
          "questions": [
            {
              "question_key": "m01_a01_q01",
              "prompt": "Qual tarefa é a melhor candidata inicial para uso assistido de IA?",
              "options": {
                "a": "Uma decisão societária subjetiva e de alto impacto.",
                "b": "Uma rotina repetitiva, verificável e de baixo impacto.",
                "c": "Uma obrigação fiscal sem fonte para conferência.",
                "d": "Uma aprovação financeira totalmente automática."
              },
              "correct_option": "b",
              "explanation": "Tarefas repetitivas, verificáveis e de baixo impacto permitem começar com controles claros."
            },
            {
              "question_key": "m01_a01_q02",
              "prompt": "No uso de IA na contabilidade, quem mantém a responsabilidade pela decisão final?",
              "options": {
                "a": "A ferramenta de IA.",
                "b": "O fornecedor do software.",
                "c": "O profissional responsável.",
                "d": "O cliente, automaticamente."
              },
              "correct_option": "c",
              "explanation": "A IA atua como assistente; a revisão e a decisão continuam sob responsabilidade profissional."
            },
            {
              "question_key": "m01_a01_q03",
              "prompt": "Qual sequência representa o fluxo recomendado na aula?",
              "options": {
                "a": "Entrada, processamento, validação e aprovação.",
                "b": "Aprovação, exclusão, entrada e envio.",
                "c": "Processamento, publicação e esquecimento.",
                "d": "Entrada, decisão automática e descarte da origem."
              },
              "correct_option": "a",
              "explanation": "O ciclo seguro preserva validação e aprovação humana após o processamento."
            },
            {
              "question_key": "m01_a01_q04",
              "prompt": "O que fazer com uma saída de IA incerta?",
              "options": {
                "a": "Usá-la por parecer convincente.",
                "b": "Separá-la para revisão baseada em evidências.",
                "c": "Apagar o arquivo original.",
                "d": "Enviar diretamente ao cliente."
              },
              "correct_option": "b",
              "explanation": "Casos incertos precisam ser identificados e revisados antes do uso."
            },
            {
              "question_key": "m01_a01_q05",
              "prompt": "Por que preservar o documento ou arquivo original?",
              "options": {
                "a": "Para aumentar o volume de dados enviado.",
                "b": "Para eliminar a necessidade de revisão.",
                "c": "Para permitir conferência e rastreabilidade.",
                "d": "Para substituir a aprovação humana."
              },
              "correct_option": "c",
              "explanation": "O original é a referência necessária para reconciliar e auditar o resultado."
            }
          ],
          "content_markdown": "# Onde a IA gera valor na contabilidade\n\n## Objetivos da aula\n\nAo final desta aula, você será capaz de identificar tarefas adequadas para automação assistida, reconhecer situações que exigem julgamento profissional e organizar um primeiro caso de uso com controles claros.\n\n## IA como assistente, não como responsável técnico\n\nFerramentas de inteligência artificial trabalham por padrões. Elas resumem textos, organizam informações, sugerem classificações e produzem rascunhos rapidamente. Isso não significa que compreendam integralmente a legislação, o contrato do cliente ou a materialidade de um lançamento.\n\nNa rotina contábil, a melhor aplicação é aquela em que a IA reduz trabalho repetitivo e o profissional mantém a decisão. Bons exemplos são:\n\n- padronizar descrições de extratos;\n- sugerir categorias para lançamentos recorrentes;\n- resumir documentos e apontar campos ausentes;\n- preparar checklists e rascunhos de comunicação;\n- comparar listas e destacar divergências para revisão.\n\nAtividades com efeito fiscal, societário ou financeiro relevante devem continuar submetidas a evidência, revisão e aprovação humana.\n\n## Escolha a tarefa pelo risco\n\nClassifique uma tarefa em três dimensões:\n\n1. **Repetitividade:** ocorre com frequência e segue um padrão?\n2. **Verificabilidade:** existe uma fonte confiável para conferir a saída?\n3. **Impacto do erro:** um resultado incorreto pode gerar obrigação, multa ou informação enganosa?\n\nUma tarefa repetitiva, facilmente verificável e de baixo impacto é uma boa candidata inicial. Uma decisão pouco frequente, subjetiva e de alto impacto não deve ser automatizada sem controles adicionais.\n\n## Fluxo recomendado\n\nUse o ciclo **entrada → processamento → validação → aprovação**:\n\n1. Defina a finalidade e os dados estritamente necessários.\n2. Preserve o documento ou arquivo original.\n3. Solicite uma saída estruturada e sinalização de incerteza.\n4. Confira totais, fontes e exceções.\n5. Registre a decisão humana antes de usar o resultado no ERP ou enviá-lo ao cliente.\n\n## Prática guiada\n\nEscolha uma rotina semanal do escritório, como revisar descrições bancárias. Escreva:\n\n- qual é a entrada;\n- qual saída a IA deve produzir;\n- quais dados não precisam ser compartilhados;\n- como a saída será conferida;\n- quem aprova o resultado.\n\nExemplo: “Receber descrição e valor do lançamento, sugerir categoria e justificar em uma frase. Não enviar nome completo ou documento do cliente. Conferir contra histórico e plano de contas. O analista aprova exceções antes da exportação.”\n\n## Checklist de encerramento\n\n- A IA possui uma tarefa delimitada?\n- Existe uma fonte para conferir a resposta?\n- Casos incertos são separados para revisão?\n- O profissional continua responsável pela decisão final?\n\n> Regra de ouro: produtividade sustentável vem de processos verificáveis, não de confiança cega na resposta mais convincente.\n"
        }
      ]
    },
    {
      "module_key": "m02",
      "order": 2,
      "title": "Prompts para contabilidade",
      "description": "Como transformar solicitações contábeis em instruções claras e verificáveis.",
      "lessons": [
        {
          "lesson_key": "m02_a01",
          "order": 1,
          "title": "Prompts confiáveis e reutilizáveis",
          "estimated_minutes": 30,
          "passing_score": 60,
          "questions": [
            {
              "question_key": "m02_a01_q01",
              "prompt": "Quais elementos formam um prompt profissional segundo a aula?",
              "options": {
                "a": "Papel, tarefa, contexto, formato e critérios de qualidade.",
                "b": "Somente tarefa e tom.",
                "c": "Nome do cliente, senha e resposta desejada.",
                "d": "Criatividade, tamanho e velocidade."
              },
              "correct_option": "a",
              "explanation": "Esses cinco elementos tornam a solicitação clara e verificável."
            },
            {
              "question_key": "m02_a01_q02",
              "prompt": "Qual instrução ajuda a reduzir informações inventadas?",
              "options": {
                "a": "Complete todas as lacunas livremente.",
                "b": "Use apenas os dados fornecidos.",
                "c": "Escolha a resposta mais provável.",
                "d": "Não sinalize dúvidas."
              },
              "correct_option": "b",
              "explanation": "Delimitar as fontes reduz a tendência de preencher lacunas sem evidência."
            },
            {
              "question_key": "m02_a01_q03",
              "prompt": "Por que preferir saídas estruturadas?",
              "options": {
                "a": "Porque dispensam validação.",
                "b": "Porque escondem casos incertos.",
                "c": "Porque facilitam validação e automação posterior.",
                "d": "Porque permitem qualquer categoria."
              },
              "correct_option": "c",
              "explanation": "Campos definidos permitem validar valores e tratar a saída de modo determinístico."
            },
            {
              "question_key": "m02_a01_q04",
              "prompt": "Que dados devem aparecer nos exemplos de um prompt reutilizável?",
              "options": {
                "a": "Dados fictícios ou anonimizados.",
                "b": "Credenciais reais.",
                "c": "CPFs completos de clientes.",
                "d": "Tokens de integração."
              },
              "correct_option": "a",
              "explanation": "Exemplos devem ensinar o padrão sem expor dados pessoais ou segredos."
            },
            {
              "question_key": "m02_a01_q05",
              "prompt": "Como o prompt deve tratar evidência insuficiente?",
              "options": {
                "a": "Inventar uma categoria próxima.",
                "b": "Omitir a linha.",
                "c": "Declarar a incerteza e marcar para revisão.",
                "d": "Aumentar a confiança automaticamente."
              },
              "correct_option": "c",
              "explanation": "A instrução deve definir explicitamente o comportamento seguro para casos duvidosos."
            }
          ],
          "content_markdown": "# Prompts confiáveis e reutilizáveis\n\n## Objetivos da aula\n\nVocê aprenderá a escrever instruções claras, reduzir respostas ambíguas e criar modelos de prompt que possam ser reutilizados pela equipe contábil.\n\n## A anatomia de um bom prompt\n\nUm prompt profissional deve informar cinco elementos:\n\n1. **Papel:** qual perspectiva a ferramenta deve adotar.\n2. **Tarefa:** o que precisa ser produzido.\n3. **Contexto:** regras, período e finalidade.\n4. **Formato:** campos, tabela ou estrutura esperada.\n5. **Critérios de qualidade:** o que fazer quando faltar evidência e como sinalizar dúvidas.\n\nExemplo:\n\n> Atue como assistente de revisão contábil. Analise somente os lançamentos fornecidos. Para cada linha, retorne descrição padronizada, categoria sugerida, confiança de 0 a 1 e justificativa curta. Não invente documento ou conta. Quando a evidência for insuficiente, use status “Revisar”.\n\n## Delimite a fonte\n\nA instrução “use apenas os dados fornecidos” reduz o risco de a ferramenta complementar lacunas com informações inventadas. Se uma norma ou política interna for necessária, forneça a referência aprovada e peça que a resposta indique o trecho utilizado.\n\nNunca trate uma citação gerada como verdadeira sem abrir e conferir a fonte original.\n\n## Prefira saídas estruturadas\n\nPara comparar ou automatizar etapas, defina colunas ou chaves, como identificador da linha, categoria sugerida, confiança, justificativa e status de revisão.\n\nUma saída estruturada é mais fácil de validar do que um parágrafo longo. Também permite rejeitar valores fora da lista de categorias autorizadas.\n\n## Use exemplos sem expor dados\n\nExemplos ajudam a fixar o padrão esperado, mas devem usar dados fictícios ou anonimizados. Mostre um caso normal e um caso de exceção. Evite inserir CPF, credenciais, dados bancários completos ou informações desnecessárias do cliente.\n\n## Técnica de revisão do prompt\n\nAntes de executar, pergunte:\n\n- A tarefa tem começo e fim claros?\n- A resposta poderá ser conferida?\n- O formato está explícito?\n- A ferramenta sabe como declarar incerteza?\n- Foram removidos dados que não contribuem para a finalidade?\n\n## Exercício prático\n\nTransforme “Classifique meu extrato” em uma instrução operacional. Inclua uma lista fechada de categorias, um limiar de confiança e o comportamento esperado para casos duvidosos.\n\nUma versão adequada deve separar sugestões de decisões e impedir que um lançamento de baixa confiança siga automaticamente para exportação.\n\n## Modelo reutilizável\n\n> Atue como [papel]. Execute [tarefa] usando somente [fontes]. Retorne [formato]. Respeite [regras]. Não faça [proibições]. Quando [condição de incerteza], marque [status]. A saída será revisada por [responsável].\n\n> Um bom prompt não elimina a conferência: ele torna a conferência mais rápida e objetiva.\n"
        }
      ]
    },
    {
      "module_key": "m03",
      "order": 3,
      "title": "Excel e CSV com IA",
      "description": "Preparação, análise e conferência de planilhas sem perder rastreabilidade.",
      "lessons": [
        {
          "lesson_key": "m03_a01",
          "order": 1,
          "title": "Análise assistida de planilhas contábeis",
          "estimated_minutes": 30,
          "passing_score": 60,
          "questions": [
            {
              "question_key": "m03_a01_q01",
              "prompt": "Qual deve ser o primeiro cuidado ao tratar uma planilha?",
              "options": {
                "a": "Substituir imediatamente o arquivo recebido.",
                "b": "Preservar o original e criar uma cópia de trabalho.",
                "c": "Remover o cabeçalho.",
                "d": "Converter todos os valores em texto."
              },
              "correct_option": "b",
              "explanation": "O original imutável garante referência para reconciliação e auditoria."
            },
            {
              "question_key": "m03_a01_q02",
              "prompt": "O que precisa ser validado ao abrir um CSV?",
              "options": {
                "a": "Cor das células e tamanho da fonte.",
                "b": "Separador, codificação, datas e convenção decimal.",
                "c": "Somente o nome do arquivo.",
                "d": "A marca do computador."
              },
              "correct_option": "b",
              "explanation": "Essas convenções determinam se textos, datas e valores serão lidos corretamente."
            },
            {
              "question_key": "m03_a01_q03",
              "prompt": "Para que serve um identificador estável por linha?",
              "options": {
                "a": "Para relacionar a saída ao registro original.",
                "b": "Para ocultar divergências.",
                "c": "Para substituir valores monetários.",
                "d": "Para dispensar a contagem de registros."
              },
              "correct_option": "a",
              "explanation": "O identificador permite rastrear cada sugestão até sua linha de origem."
            },
            {
              "question_key": "m03_a01_q04",
              "prompt": "Qual conferência é obrigatória depois do processamento?",
              "options": {
                "a": "Apenas conferir se o arquivo abre.",
                "b": "Comparar linhas, totais e identificadores antes e depois.",
                "c": "Excluir silenciosamente duplicidades.",
                "d": "Ordenar alfabeticamente todas as colunas."
              },
              "correct_option": "b",
              "explanation": "Reconciliação detecta perdas, duplicações e alterações indevidas."
            },
            {
              "question_key": "m03_a01_q05",
              "prompt": "Se duplicidades forem removidas, o que deve acontecer?",
              "options": {
                "a": "Nada deve ser registrado.",
                "b": "O original também deve ser apagado.",
                "c": "Uma lista separada das linhas removidas deve ser gerada.",
                "d": "Os valores devem ser arredondados."
              },
              "correct_option": "c",
              "explanation": "Exclusões precisam ficar explícitas e rastreáveis."
            }
          ],
          "content_markdown": "# Análise assistida de planilhas contábeis\n\n## Objetivos da aula\n\nNesta aula você aprenderá a preparar Excel e CSV para análise assistida, preservar rastreabilidade e validar se nenhuma linha ou valor foi alterado indevidamente.\n\n## Comece pela cópia de trabalho\n\nNunca substitua o arquivo recebido. Mantenha o original imutável e crie uma cópia identificada com data ou versão. Registre a quantidade de linhas e os totais relevantes antes de qualquer tratamento.\n\nEm arquivos CSV, confirme:\n\n- separador, como vírgula ou ponto e vírgula;\n- codificação, preferencialmente UTF-8;\n- formato de datas;\n- uso de vírgula ou ponto como separador decimal;\n- presença de cabeçalho e colunas obrigatórias.\n\nUm valor “1.234,56” interpretado de forma incorreta pode mudar totalmente uma análise.\n\n## Prepare uma tabela legível\n\nCada linha deve representar um registro e cada coluna um atributo. Evite células mescladas, subtotais misturados aos dados e títulos repetidos no meio da tabela. Crie um identificador de linha antes do processamento; ele permitirá relacionar a sugestão da IA ao registro original.\n\n## Solicite operações específicas\n\nEm vez de pedir “melhore esta planilha”, defina ações observáveis:\n\n- padronizar descrições sem apagar o texto original;\n- apontar datas inválidas;\n- localizar valores duplicados por critérios definidos;\n- sugerir categoria usando uma lista fechada;\n- indicar linhas que não puderam ser interpretadas.\n\nPeça que a saída preserve o identificador da linha e não altere valores monetários.\n\n## Reconciliação obrigatória\n\nDepois do processamento, compare:\n\n1. quantidade de linhas antes e depois;\n2. soma dos valores antes e depois;\n3. identificadores ausentes ou duplicados;\n4. datas fora do período esperado;\n5. campos que ficaram vazios;\n6. categorias fora da lista permitida.\n\nSe o processo remove duplicidades, gere uma lista separada das linhas removidas. Nunca faça exclusão silenciosa.\n\n## Exemplo prático\n\nUma base possui as colunas identificador, data, descrição e valor. Solicite uma saída com identificador, descrição padronizada, categoria sugerida, confiança e motivo. Em seguida, reconcilie identificador e valor com a base original.\n\nSe a ferramenta não puder processar o arquivo diretamente, use-a para gerar uma fórmula ou um script revisável. Teste primeiro em uma amostra e valide o resultado antes de aplicar ao conjunto completo.\n\n## Checklist de encerramento\n\n- O original está preservado?\n- Formato decimal e datas foram confirmados?\n- Existe identificador estável por linha?\n- Totais e quantidade foram reconciliados?\n- Exceções ficaram visíveis para revisão?\n\n> Em dados contábeis, uma transformação só está concluída quando seu resultado pode ser reconciliado com a origem.\n"
        }
      ]
    },
    {
      "module_key": "m04",
      "order": 4,
      "title": "Classificação bancária inteligente",
      "description": "Combinação de regras, IA e revisão humana para classificar lançamentos.",
      "lessons": [
        {
          "lesson_key": "m04_a01",
          "order": 1,
          "title": "Classificação em cascata e tratamento de exceções",
          "estimated_minutes": 30,
          "passing_score": 60,
          "questions": [
            {
              "question_key": "m04_a01_q01",
              "prompt": "Qual é a primeira etapa da cascata de classificação apresentada?",
              "options": {
                "a": "IA generativa para todos os itens.",
                "b": "Memória validada do escritório.",
                "c": "Revisão por amostragem.",
                "d": "Exportação automática."
              },
              "correct_option": "b",
              "explanation": "Decisões anteriores validadas e específicas devem ter prioridade na cascata."
            },
            {
              "question_key": "m04_a01_q02",
              "prompt": "O que significa uma confiança alta informada pela IA?",
              "options": {
                "a": "Prova de que a categoria está correta.",
                "b": "Autorização para ignorar regras.",
                "c": "Um sinal operacional que ainda exige controles adequados ao risco.",
                "d": "Garantia jurídica da classificação."
              },
              "correct_option": "c",
              "explanation": "Confiança organiza o fluxo, mas não substitui evidência nem validação."
            },
            {
              "question_key": "m04_a01_q03",
              "prompt": "Como tratar um lançamento de baixa confiança?",
              "options": {
                "a": "Exportar automaticamente.",
                "b": "Submeter à revisão individual.",
                "c": "Escolher uma categoria aleatória.",
                "d": "Apagar o lançamento."
              },
              "correct_option": "b",
              "explanation": "Baixa confiança deve bloquear a automação e acionar revisão humana."
            },
            {
              "question_key": "m04_a01_q04",
              "prompt": "Como uma possível duplicidade deve ser tratada?",
              "options": {
                "a": "Apagada automaticamente.",
                "b": "Destacada para decisão do contador.",
                "c": "Classificada como tarifa.",
                "d": "Ignorada se os valores coincidirem."
              },
              "correct_option": "b",
              "explanation": "A assinatura ajuda a detectar repetição, mas a decisão exige contexto humano."
            },
            {
              "question_key": "m04_a01_q05",
              "prompt": "Quando faltam evidências para classificar um PIX ambíguo, qual é a saída segura?",
              "options": {
                "a": "Marcar como revisar.",
                "b": "Definir pró-labore.",
                "c": "Definir fornecedor.",
                "d": "Exportar sem categoria."
              },
              "correct_option": "a",
              "explanation": "Sem contexto suficiente, deve-se solicitar evidência ou encaminhar para revisão."
            }
          ],
          "content_markdown": "# Classificação em cascata e tratamento de exceções\n\n## Objetivos da aula\n\nVocê compreenderá como combinar memória do escritório, regras determinísticas, IA e revisão humana para classificar lançamentos bancários com controle.\n\n## Por que usar uma cascata\n\nNem todo lançamento precisa de IA generativa. Descrições recorrentes podem ser tratadas com regras rápidas e auditáveis. A IA deve atuar principalmente nos casos em que padrões determinísticos não são suficientes.\n\nUma cascata segura pode seguir esta ordem:\n\n1. **Memória validada do escritório:** regra criada a partir de decisão anterior do contador.\n2. **Regras nativas:** padrões claros, como tarifa bancária ou transferência entre contas.\n3. **IA para ambiguidades:** sugestão de categoria, confiança e justificativa.\n4. **Revisão humana:** aprovação de baixa confiança, duplicidades ou impacto relevante.\n\n## Confiança não é certeza\n\nA confiança serve para organizar o trabalho, não para provar que a categoria está correta. Defina faixas operacionais:\n\n- alta confiança e regra conhecida: conferência em lote;\n- confiança intermediária: revisão por amostragem ou contexto;\n- baixa confiança: revisão individual obrigatória.\n\nO limiar deve considerar risco, qualidade das descrições e maturidade das regras do escritório.\n\n## Use contexto suficiente\n\nDescrição e valor ajudam, mas podem não ser suficientes. Data, tipo da movimentação, histórico anterior e plano de contas podem melhorar a decisão. Ainda assim, não inclua dados pessoais que não tenham função na classificação.\n\nQuando faltarem evidências, a resposta correta é “revisar”, e não uma categoria inventada.\n\n## Duplicidade e rastreabilidade\n\nAntes de gravar um lançamento, compare uma assinatura estável composta por usuário, data, valor e descrição normalizada. Um item repetido deve ser destacado, não apagado automaticamente. O contador decide se é reprocessamento legítimo ou duplicidade indevida.\n\nToda correção humana pode alimentar uma regra futura, desde que o termo seja suficientemente específico. Regras amplas, como apenas “PAGAMENTO”, geram falsos positivos.\n\n## Exercício prático\n\nConsidere três descrições:\n\n- TARIFA PACOTE MENSAL;\n- COPEL ENERGIA ELETRICA;\n- PIX JOAO DA SILVA.\n\nAs duas primeiras podem ser classificadas por regras claras. A terceira exige contexto: pode ser fornecedor, reembolso, pró-labore ou transferência. A ação segura é solicitar evidência ou encaminhar para revisão.\n\n## Checklist de encerramento\n\n- Regras determinísticas têm prioridade?\n- A IA informa confiança e justificativa?\n- Baixa confiança impede exportação automática?\n- Duplicidades são sinalizadas?\n- Correções ficam vinculadas ao usuário e podem ser auditadas?\n\n> A melhor automação não é a que classifica tudo; é a que sabe separar o que pode decidir do que precisa perguntar.\n"
        }
      ]
    },
    {
      "module_key": "m05",
      "order": 5,
      "title": "Comunicação com clientes",
      "description": "Rascunhos claros, contextualizados e revisados para o relacionamento contábil.",
      "lessons": [
        {
          "lesson_key": "m05_a01",
          "order": 1,
          "title": "Comunicação assistida sem perder responsabilidade",
          "estimated_minutes": 30,
          "passing_score": 60,
          "questions": [
            {
              "question_key": "m05_a01_q01",
              "prompt": "Antes de gerar uma mensagem, o que deve ser definido?",
              "options": {
                "a": "Público, finalidade, ação esperada e prazo verdadeiro.",
                "b": "Somente o tamanho do texto.",
                "c": "Uma multa provável.",
                "d": "Todos os dados disponíveis do cliente."
              },
              "correct_option": "a",
              "explanation": "Finalidade, destinatário, ação e prazo orientam um rascunho adequado."
            },
            {
              "question_key": "m05_a01_q02",
              "prompt": "Qual informação a IA não deve inventar em uma mensagem?",
              "options": {
                "a": "Uma saudação.",
                "b": "Prazos, multas ou obrigações.",
                "c": "Uma frase curta.",
                "d": "Um encerramento cordial."
              },
              "correct_option": "b",
              "explanation": "Fatos com impacto precisam vir de fontes confirmadas."
            },
            {
              "question_key": "m05_a01_q03",
              "prompt": "O que fazer antes de enviar o rascunho gerado?",
              "options": {
                "a": "Revisar destinatário, fatos, datas, anexos e tom.",
                "b": "Enviar automaticamente.",
                "c": "Remover o canal de dúvidas.",
                "d": "Adicionar dados de outro cliente."
              },
              "correct_option": "a",
              "explanation": "A revisão humana previne erros factuais, de contexto e de privacidade."
            },
            {
              "question_key": "m05_a01_q04",
              "prompt": "Como usar IA em uma orientação tributária de impacto?",
              "options": {
                "a": "Para definir sozinha a conclusão final.",
                "b": "Para organizar tópicos, com fontes vigentes e revisão técnica.",
                "c": "Para criar uma regra sem fonte.",
                "d": "Para evitar consultar o caso concreto."
              },
              "correct_option": "b",
              "explanation": "A ferramenta pode apoiar a organização, mas a conclusão depende de fontes e revisão."
            },
            {
              "question_key": "m05_a01_q05",
              "prompt": "Se não houver evidência suficiente para responder ao cliente, qual postura é adequada?",
              "options": {
                "a": "Apresentar a hipótese como certeza.",
                "b": "Confirmar que o caso será verificado antes da resposta final.",
                "c": "Inventar um prazo legal.",
                "d": "Encerrar a conversa sem registro."
              },
              "correct_option": "b",
              "explanation": "Transparência sobre a necessidade de verificar é mais segura que uma afirmação provável."
            }
          ],
          "content_markdown": "# Comunicação assistida sem perder responsabilidade\n\n## Objetivos da aula\n\nVocê aprenderá a usar IA para criar rascunhos claros e consistentes, mantendo revisão humana, contexto do cliente e responsabilidade sobre cada mensagem enviada.\n\n## Defina finalidade e público\n\nAntes de gerar uma mensagem, registre quem receberá, qual ação é esperada e qual prazo é verdadeiro. Um pedido de documento, um aviso de pendência e uma explicação gerencial exigem tons diferentes.\n\nForneça somente o contexto necessário. Na maioria dos casos, nome completo, documento e detalhes bancários não são necessários para redigir um lembrete.\n\n## Estrutura útil para mensagens\n\nUm bom rascunho contém:\n\n1. saudação adequada;\n2. motivo objetivo do contato;\n3. lista exata do que está pendente;\n4. prazo confirmado;\n5. canal para dúvidas;\n6. encerramento coerente com a identidade do escritório.\n\nPeça frases curtas e evite linguagem acusatória. A IA não deve inventar prazos, multas ou obrigações.\n\n## Revisão antes do envio\n\nConfira sempre:\n\n- nome e empresa do destinatário;\n- competência e documentos citados;\n- datas e valores;\n- fundamento de qualquer orientação;\n- anexos mencionados;\n- tom e ausência de dados de outro cliente.\n\nMensagens em massa exigem atenção especial a campos de personalização. Um dado trocado pode caracterizar incidente de privacidade.\n\n## Exemplo de prompt\n\n> Crie um rascunho cordial para solicitar os extratos bancários da competência agosto de 2026. Informe prazo de 5 de setembro somente porque ele foi confirmado abaixo. Não mencione multa. Use até 100 palavras e termine oferecendo ajuda. Não inclua dados além do primeiro nome e do nome do escritório.\n\nO resultado ainda deve ser revisado pelo responsável antes do disparo.\n\n## Respostas a dúvidas técnicas\n\nQuando a mensagem envolver interpretação tributária ou orientação com impacto, use a IA para organizar tópicos, não para estabelecer a conclusão final. Forneça as fontes aprovadas, verifique a vigência e faça a revisão técnica.\n\nSe não houver evidência suficiente, prefira uma resposta transparente: “Vamos confirmar o tratamento aplicável ao seu caso e retornaremos”, em vez de uma afirmação provável.\n\n## Exercício prático\n\nEscolha uma pendência frequente e crie dois modelos: um lembrete inicial e um segundo contato. Defina quais campos podem ser personalizados e quem aprova o envio.\n\n## Checklist de encerramento\n\n- A mensagem tem finalidade e ação claras?\n- Datas e fatos foram conferidos?\n- Dados de outros clientes estão ausentes?\n- O tom representa o escritório?\n- Uma pessoa aprovou antes do envio?\n\n> A IA pode escrever o rascunho, mas o escritório responde pelo conteúdo e pelo relacionamento com o cliente.\n"
        }
      ]
    },
    {
      "module_key": "m06",
      "order": 6,
      "title": "Conferência e detecção de erros",
      "description": "Uso de IA como segunda leitura, com evidências e testes de consistência.",
      "lessons": [
        {
          "lesson_key": "m06_a01",
          "order": 1,
          "title": "Revisão orientada por risco e evidência",
          "estimated_minutes": 30,
          "passing_score": 60,
          "questions": [
            {
              "question_key": "m06_a01_q01",
              "prompt": "Qual exemplo representa uma regra verificável de conferência?",
              "options": {
                "a": "O texto deve parecer profissional.",
                "b": "Débitos e créditos devem fechar.",
                "c": "A resposta deve ser longa.",
                "d": "A hipótese deve ser criativa."
              },
              "correct_option": "b",
              "explanation": "O fechamento entre débitos e créditos pode ser calculado e reproduzido."
            },
            {
              "question_key": "m06_a01_q02",
              "prompt": "Como uma hipótese apontada pela IA deve ser tratada?",
              "options": {
                "a": "Como prova definitiva de erro.",
                "b": "Como prioridade de investigação, não como evidência.",
                "c": "Como autorização para corrigir automaticamente.",
                "d": "Como substituta do documento original."
              },
              "correct_option": "b",
              "explanation": "Hipóteses orientam a investigação, mas precisam de evidência para confirmar divergências."
            },
            {
              "question_key": "m06_a01_q03",
              "prompt": "Qual ação ajuda a combater alucinações?",
              "options": {
                "a": "Conferir conclusões contra origem, cálculo e regra vigente.",
                "b": "Confiar no tom seguro do texto.",
                "c": "Pedir somente uma resposta maior.",
                "d": "Ocultar as fontes."
              },
              "correct_option": "a",
              "explanation": "A verificação reproduzível é o controle efetivo contra conclusões inventadas."
            },
            {
              "question_key": "m06_a01_q04",
              "prompt": "Em testes de reconciliação, como tratar diferenças monetárias?",
              "options": {
                "a": "Ignorar todas.",
                "b": "Definir tolerâncias explicitamente e distinguir arredondamento de diferença material.",
                "c": "Arredondar até desaparecerem.",
                "d": "Alterar o saldo inicial."
              },
              "correct_option": "b",
              "explanation": "Tolerâncias claras permitem classificar corretamente diferenças pequenas e materiais."
            },
            {
              "question_key": "m06_a01_q05",
              "prompt": "O que compõe uma boa trilha de decisão?",
              "options": {
                "a": "Somente a saída final.",
                "b": "Dado original, sugestão, evidência, correção e responsável.",
                "c": "Apenas o nome da ferramenta.",
                "d": "Somente a confiança informada pela IA."
              },
              "correct_option": "b",
              "explanation": "Esses elementos preservam contexto e responsabilidade sobre a decisão."
            }
          ],
          "content_markdown": "# Revisão orientada por risco e evidência\n\n## Objetivos da aula\n\nNesta aula você aprenderá a usar IA como segunda leitura, construir testes de consistência e investigar divergências sem confundir uma explicação plausível com evidência.\n\n## Comece por regras verificáveis\n\nA conferência funciona melhor quando a ferramenta recebe critérios objetivos. Exemplos:\n\n- débitos e créditos devem fechar;\n- total do relatório deve coincidir com a soma das linhas;\n- datas devem estar dentro da competência;\n- CNPJ e campos obrigatórios devem respeitar formato esperado;\n- identificadores não podem se repetir;\n- categorias devem pertencer ao plano autorizado.\n\nPeça uma lista de exceções contendo identificador, regra violada, valor observado e evidência utilizada.\n\n## IA como segunda leitura\n\nA IA pode destacar padrões incomuns, comparar descrições e sugerir hipóteses. Essas hipóteses servem para priorizar a investigação. Não são prova de erro ou fraude.\n\nUma saída de revisão deve distinguir:\n\n- divergência confirmada por cálculo;\n- dado ausente;\n- comportamento atípico;\n- hipótese que depende de documento adicional.\n\n## Combata alucinações\n\nTextos seguros podem estar errados. Para cada conclusão relevante:\n\n1. localize a linha ou documento de origem;\n2. refaça o cálculo determinístico;\n3. confirme a regra aplicável e sua vigência;\n4. registre quem revisou e qual decisão foi tomada.\n\nSolicitar que a IA “explique o raciocínio” não substitui essa verificação. O que importa é a evidência reproduzível.\n\n## Testes de reconciliação\n\nEm uma base de lançamentos, execute pelo menos:\n\n- contagem total de registros;\n- soma por sinal e soma líquida;\n- comparação com saldo inicial e final, quando aplicável;\n- procura por chaves duplicadas;\n- procura por lacunas de datas ou sequências;\n- distribuição por categoria e variações incomuns.\n\nDefina tolerâncias monetárias explicitamente. Diferenças de arredondamento devem ser tratadas de forma diferente de diferenças materiais.\n\n## Exercício prático\n\nCrie um checklist para revisar uma importação bancária. Para cada teste, defina resultado esperado, fonte de comparação e ação quando houver falha. Depois peça à IA que organize as exceções por risco, sem autorizar correções automáticas.\n\n## Registro da decisão\n\nUma boa trilha contém o dado original, a sugestão, a evidência consultada, a correção aplicada e o responsável. Isso permite melhorar regras sem apagar o contexto da decisão anterior.\n\n## Checklist de encerramento\n\n- As regras de conferência são objetivas?\n- Cálculos podem ser reproduzidos sem IA?\n- Hipóteses estão separadas de divergências confirmadas?\n- Exceções materiais recebem revisão humana?\n- A decisão final fica registrada?\n\n> Use IA para ampliar a atenção do revisor, nunca para reduzir a exigência de evidência.\n"
        }
      ]
    },
    {
      "module_key": "m07",
      "order": 7,
      "title": "Segurança e privacidade de dados",
      "description": "Princípios práticos de proteção de dados e uso responsável de ferramentas de IA.",
      "lessons": [
        {
          "lesson_key": "m07_a01",
          "order": 1,
          "title": "IA responsável no escritório contábil",
          "estimated_minutes": 30,
          "passing_score": 60,
          "questions": [
            {
              "question_key": "m07_a01_q01",
              "prompt": "Antes de enviar dados a uma ferramenta de IA, o que deve ser confirmado?",
              "options": {
                "a": "Que a ferramenta e a conta são autorizadas.",
                "b": "Que o arquivo é grande.",
                "c": "Que a resposta será rápida.",
                "d": "Que um login é compartilhado."
              },
              "correct_option": "a",
              "explanation": "Autorização organizacional é condição prévia para tratar os dados na ferramenta."
            },
            {
              "question_key": "m07_a01_q02",
              "prompt": "Qual informação nunca deve ser enviada em prompts?",
              "options": {
                "a": "Uma descrição anonimizada.",
                "b": "Uma categoria contábil.",
                "c": "Senhas, tokens ou certificados digitais.",
                "d": "Um código interno temporário."
              },
              "correct_option": "c",
              "explanation": "Credenciais e segredos podem permitir acesso indevido e devem ficar fora de prompts."
            },
            {
              "question_key": "m07_a01_q03",
              "prompt": "O que significa minimização de dados?",
              "options": {
                "a": "Enviar apenas os dados necessários à finalidade.",
                "b": "Remover somente o nome do arquivo.",
                "c": "Compartilhar a base completa.",
                "d": "Guardar credenciais no prompt."
              },
              "correct_option": "a",
              "explanation": "Minimização limita a exposição aos campos estritamente necessários."
            },
            {
              "question_key": "m07_a01_q04",
              "prompt": "Qual é a primeira resposta a um envio indevido de dados?",
              "options": {
                "a": "Ocultar o incidente.",
                "b": "Interromper o processamento e novos compartilhamentos.",
                "c": "Enviar mais dados.",
                "d": "Apagar apenas o histórico do navegador."
              },
              "correct_option": "b",
              "explanation": "A contenção imediata reduz a continuidade da exposição."
            },
            {
              "question_key": "m07_a01_q05",
              "prompt": "Como devem ser tratadas as saídas que contêm dados sensíveis?",
              "options": {
                "a": "Sem controles, porque foram geradas.",
                "b": "Com as mesmas regras de armazenamento e envio aplicadas às entradas.",
                "c": "Em contas compartilhadas.",
                "d": "Como dados públicos."
              },
              "correct_option": "b",
              "explanation": "A sensibilidade permanece mesmo quando o dado aparece em uma saída gerada."
            }
          ],
          "content_markdown": "# IA responsável no escritório contábil\n\n## Objetivos da aula\n\nAo final, você reconhecerá dados de maior risco, aplicará minimização e saberá reagir a um envio indevido ou uso de ferramenta não autorizada.\n\n## Dados contábeis exigem cuidado\n\nA rotina do escritório pode envolver documentos pessoais, dados bancários, folha, faturamento, contratos e informações estratégicas. O fato de uma ferramenta aceitar um arquivo não significa que o envio esteja autorizado.\n\nAntes do uso, confirme:\n\n- ferramenta e conta aprovadas pela organização;\n- finalidade específica;\n- dados estritamente necessários;\n- regras de retenção e uso pelo fornecedor;\n- controles de acesso e compartilhamento;\n- existência de alternativa anonimizada.\n\nNunca envie senhas, tokens, certificados digitais ou credenciais em prompts.\n\n## Minimização e anonimização\n\nRemova campos que não contribuem para a tarefa. Para testar uma classificação, descrição e valor podem ser suficientes; CPF, endereço e conta bancária completa provavelmente não são.\n\nQuando possível, substitua identificadores por códigos internos temporários. Mantenha a tabela de correspondência em ambiente controlado e fora da ferramenta de IA.\n\nAnonimização efetiva exige avaliar combinações de dados. Remover apenas o nome pode não ser suficiente se outros campos identificarem a pessoa.\n\n## Controle de acesso\n\nUse contas corporativas individuais, autenticação forte e princípio do menor privilégio. Evite compartilhar logins. Revogue acessos quando alguém muda de função ou deixa a equipe.\n\nSaídas geradas também podem conter dados sensíveis e precisam seguir as mesmas regras de armazenamento e envio das entradas.\n\n## Incidentes\n\nSe um dado foi enviado indevidamente:\n\n1. interrompa o processamento e novos compartilhamentos;\n2. preserve informações necessárias para entender o ocorrido;\n3. comunique o responsável interno pelo procedimento de segurança e privacidade;\n4. avalie contenção, exclusão no fornecedor e demais medidas previstas;\n5. registre decisões e ações executadas.\n\nNão tente ocultar o incidente nem presuma que apagar o histórico do navegador removeu o dado do serviço.\n\n## Uso responsável\n\nDefina políticas simples: ferramentas permitidas, tipos de dados proibidos, casos que exigem autorização e responsáveis pela revisão. Treine a equipe com exemplos reais e revise os controles quando processos ou fornecedores mudarem.\n\n## Exercício prático\n\nPegue um processo que hoje usa documentos completos e liste quais campos são realmente necessários. Crie uma versão minimizada da entrada e defina onde o original permanecerá protegido.\n\n## Checklist de encerramento\n\n- A ferramenta está autorizada?\n- A finalidade está documentada?\n- Somente dados necessários serão enviados?\n- Credenciais e segredos estão excluídos?\n- Entrada e saída possuem acesso controlado?\n- A equipe conhece o procedimento de incidente?\n\n> Segurança não é uma etapa posterior à automação. É uma condição para que a automação possa existir.\n"
        }
      ]
    }
  ],
  "quiz": {
    "quiz_key": "quiz_final_v1",
    "title": "Quiz final — IA Aplicada à Rotina Contábil",
    "questions": [
      {
        "question_key": "q01",
        "prompt": "Antes de enviar uma base de clientes a uma ferramenta de IA, qual é a conduta mais adequada?",
        "options": {
          "a": "Enviar a base completa para aumentar o contexto.",
          "b": "Remover dados desnecessários, anonimizar quando possível e confirmar a ferramenta autorizada.",
          "c": "Trocar apenas o nome do arquivo.",
          "d": "Compactar a base com senha e informar a senha no mesmo prompt."
        },
        "correct_option": "b",
        "explanation": "Minimização, anonimização e uso de ferramenta autorizada reduzem exposição e atendem ao princípio da necessidade."
      },
      {
        "question_key": "q02",
        "prompt": "Qual prompt tende a produzir uma análise contábil mais verificável?",
        "options": {
          "a": "Analise isso para mim.",
          "b": "Seja criativo e encontre qualquer problema.",
          "c": "Atue como analista contábil, use apenas os dados fornecidos, liste divergências por linha e informe quando não houver evidência suficiente.",
          "d": "Dê a resposta mais provável sem explicar."
        },
        "correct_option": "c",
        "explanation": "Papel, escopo, fonte, formato e tratamento de incerteza tornam a saída mais controlável."
      },
      {
        "question_key": "q03",
        "prompt": "Ao usar IA para tratar uma planilha, qual controle deve ser preservado?",
        "options": {
          "a": "Substituir o arquivo original pelo resultado.",
          "b": "Manter o original imutável e reconciliar quantidade de linhas e totais antes e depois.",
          "c": "Excluir linhas que a IA não compreendeu.",
          "d": "Converter todos os valores em texto."
        },
        "correct_option": "b",
        "explanation": "Rastreabilidade e reconciliação permitem detectar perdas, duplicações ou alterações indevidas."
      },
      {
        "question_key": "q04",
        "prompt": "Um lançamento bancário recebeu classificação com baixa confiança. Qual é a ação correta?",
        "options": {
          "a": "Exportar automaticamente porque a IA já respondeu.",
          "b": "Marcar para revisão humana e consultar documento ou histórico de apoio.",
          "c": "Escolher aleatoriamente uma categoria próxima.",
          "d": "Apagar o lançamento."
        },
        "correct_option": "b",
        "explanation": "Baixa confiança é um sinal de exceção e deve acionar revisão baseada em evidências."
      },
      {
        "question_key": "q05",
        "prompt": "Como usar IA na comunicação com clientes sem transferir responsabilidade à ferramenta?",
        "options": {
          "a": "Permitir envio automático de qualquer resposta gerada.",
          "b": "Usar a IA como rascunho, revisar fatos, tom, prazos e aprovar antes do envio.",
          "c": "Informar ao cliente que nenhuma revisão será feita.",
          "d": "Copiar a resposta sem considerar o contexto do cliente."
        },
        "correct_option": "b",
        "explanation": "A IA pode acelerar o rascunho, mas a responsabilidade pela mensagem e pelos fatos continua humana."
      },
      {
        "question_key": "q06",
        "prompt": "Qual procedimento ajuda a detectar uma alucinação em uma análise gerada por IA?",
        "options": {
          "a": "Confiar quando o texto estiver bem escrito.",
          "b": "Pedir uma resposta mais longa.",
          "c": "Conferir cada conclusão relevante contra documentos, regras e totais de origem.",
          "d": "Executar o mesmo prompt uma única vez."
        },
        "correct_option": "c",
        "explanation": "Fluência não é evidência; conclusões relevantes precisam ser reconciliadas com fontes confiáveis."
      },
      {
        "question_key": "q07",
        "prompt": "Qual princípio é mais adequado ao selecionar dados para um prompt contábil?",
        "options": {
          "a": "Enviar tudo porque mais dados sempre melhoram o resultado.",
          "b": "Usar somente os dados necessários para a finalidade declarada.",
          "c": "Incluir credenciais para facilitar integrações.",
          "d": "Copiar dados pessoais para ferramentas públicas gratuitas."
        },
        "correct_option": "b",
        "explanation": "O princípio da necessidade limita o tratamento ao mínimo compatível com a finalidade."
      },
      {
        "question_key": "q08",
        "prompt": "Ao interpretar um CSV financeiro brasileiro, o que deve ser especificado ou validado?",
        "options": {
          "a": "Somente a cor das colunas.",
          "b": "Separador, codificação, formato de datas e convenção decimal.",
          "c": "A ordem alfabética dos clientes apenas.",
          "d": "O nome do computador que gerou o arquivo."
        },
        "correct_option": "b",
        "explanation": "Esses elementos evitam leitura incorreta de valores, datas e caracteres."
      },
      {
        "question_key": "q09",
        "prompt": "Para integrar uma resposta de IA a um processo automatizado, qual formato é preferível?",
        "options": {
          "a": "Texto livre sem padrão.",
          "b": "Uma resposta estruturada com campos definidos e validação posterior.",
          "c": "Uma imagem do resultado.",
          "d": "Uma conclusão sem indicar os dados utilizados."
        },
        "correct_option": "b",
        "explanation": "Estrutura e validação reduzem ambiguidades e permitem tratamento determinístico."
      },
      {
        "question_key": "q10",
        "prompt": "Se um dado sensível foi enviado por engano a uma ferramenta não autorizada, qual deve ser a primeira postura?",
        "options": {
          "a": "Ignorar se a resposta parecer correta.",
          "b": "Enviar mais dados para substituir o contexto.",
          "c": "Interromper o uso, registrar o incidente e seguir o procedimento interno de segurança e privacidade.",
          "d": "Apagar apenas o histórico do navegador."
        },
        "correct_option": "c",
        "explanation": "Incidentes exigem contenção, registro e tratamento conforme o procedimento definido pela organização."
      }
    ]
  }
};
