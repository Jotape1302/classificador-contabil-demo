# Migrações seguras do schema Zaeron

A revisão `20260827_0001` é apenas a baseline das nove tabelas legadas. A revisão
`20260827_0002` adiciona `classifier_batches` e
`classifier_batch_transactions`; ela não altera nem remove tabelas preexistentes.

Para um PostgreSQL legado que ainda não possui `alembic_version`, registre
explicitamente somente a baseline e depois aplique a migração aditiva:

```bash
alembic stamp 20260827_0001
alembic upgrade 20260827_0002
```

Se a Fase 1 já foi estampada, execute apenas:

```bash
alembic upgrade 20260827_0002
```

Não use `stamp head` em um banco que ainda precisa receber as tabelas da Fase 2,
pois isso marcaria a revisão aditiva como aplicada sem executar seu DDL. Os
downgrades destrutivos são deliberadamente bloqueados.
