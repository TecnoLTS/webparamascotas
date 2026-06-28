# Frontend `webparamascotas/app`

Aplicacion Next.js del sitio publico.

## Lo importante para editar

- Configuracion global: [siteConfig.ts](/home/admincenter/contenedores/webparamascotas/app/src/config/siteConfig.ts)
- Tarjetas/categorias visibles: [petCategoryCards.ts](/home/admincenter/contenedores/webparamascotas/app/src/data/petCategoryCards.ts)
- Home principal: [Home.tsx](/home/admincenter/contenedores/webparamascotas/app/src/tenants/paramascotasec.com/Home.tsx)

## Hot reload local

```bash
cd /home/admincenter/contenedores/webparamascotas/app
npm install
npm run dev
```

Ese es el flujo correcto para cambios en caliente.

## Deploy Docker estable

Despliegue completo del workspace:

```bash
cd /home/admincenter/contenedores
./deploy.sh
```

Despliegue individual del frontend desde la raiz:

```bash
cd /home/admincenter/contenedores
./scripts/deploy.sh frontend
```

Despliegue individual desde el repo del frontend:

```bash
cd /home/admincenter/contenedores/webparamascotas
./scripts/deploy.sh
```

O desde este directorio:

```bash
npm run deploy
```

El deploy QA usa `FRONTEND_QA_RUNTIME=stable` con `COMPOSE_PROFILES=qa`.
No usar HMR detras de APISIX como validacion del ambiente.

## Validacion

```bash
cd /home/admincenter/contenedores/webparamascotas/app
npm run lint
npm run typecheck
```
