# Frontend `paramascotasec/app`

Aplicacion Next.js del sitio publico.

## Lo importante para editar

- Configuracion global: [siteConfig.ts](/home/admincenter/contenedores/paramascotasec/app/src/config/siteConfig.ts)
- Tarjetas/categorias visibles: [petCategoryCards.ts](/home/admincenter/contenedores/paramascotasec/app/src/data/petCategoryCards.ts)
- Home principal: [Home.tsx](/home/admincenter/contenedores/paramascotasec/app/src/tenants/paramascotasec.com/Home.tsx)

## Hot reload local

```bash
cd /home/admincenter/contenedores/paramascotasec/app
npm install
npm run dev
```

Ese es el flujo correcto para cambios en caliente.

## Deploy Docker estable

Para validar el frontend dentro del ambiente del workspace:

```bash
cd /home/admincenter/contenedores/paramascotasec
./scripts/deploy.sh development
./scripts/deploy.sh production
```

O desde este directorio:

```bash
npm run deploy:dev
npm run deploy:prod
```

El deploy `development` usa `FRONTEND_DEV_RUNTIME=stable`.
No usar HMR detras de APISIX como validacion del ambiente.

## Validacion

```bash
cd /home/admincenter/contenedores/paramascotasec/app
npm run lint
npm run typecheck
```
