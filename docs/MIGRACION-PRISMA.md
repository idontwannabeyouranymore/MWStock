# Cómo arreglar la migración de Prisma

## El problema

La única migración del repo (`prisma/migrations/20260609035718_init/migration.sql`)
solo crea una tabla de prueba `TestConnection`, que ni siquiera existe en el schema.
Tus tablas reales (Usuario, Tienda, Producto, etc.) se crearon con `prisma db push`,
que **no** registra migraciones.

Consecuencia: en un deploy limpio, `prisma migrate deploy` no creará tus tablas y la
app fallará. Hay que generar una migración real.

> Estos comandos los corres **tú** en tu terminal local.

---

## Opción B (RECOMENDADA si aún no tienes datos reales)

Tu BD hoy solo tiene datos de prueba, así que lo más limpio es regenerar desde cero.

```bash
# 1. Borra las migraciones viejas
#    PowerShell:
Remove-Item -Recurse -Force prisma/migrations
#    Git Bash / Mac:
# rm -rf prisma/migrations

# 2. Crea una migración nueva y correcta, y aplícala a la BD
#    (Prisma pedirá resetear porque hay tablas de db push: acepta)
npx prisma migrate dev --name init

# 3. Vuelve a poblar los datos base
npx prisma db seed
npx tsx prisma/set-admin-password.ts

# 4. Verifica
npx prisma migrate status
```

A partir de aquí, cada cambio de schema se hace con
`npx prisma migrate dev --name <descripcion>` y el deploy usa
`npx prisma migrate deploy`.

---

## Opción A (si necesitas CONSERVAR los datos actuales — "baselining")

```bash
Remove-Item -Recurse -Force prisma/migrations   # o rm -rf en bash

mkdir prisma/migrations/0_init
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql

npx prisma migrate resolve --applied 0_init
npx prisma migrate status
```

Si `migrate status` se queja de la migración vieja `20260609035718_init`, límpiala
en el editor SQL de Supabase:

```sql
DELETE FROM "_prisma_migrations" WHERE migration_name = '20260609035718_init';
DROP TABLE IF EXISTS "TestConnection";
```

---

## Para el deploy (Fase 12)

```bash
npx prisma migrate deploy
```

Agrégalo al pipeline/build de producción.
