# ParamascotasEC - AGENTS.md

Fuente canonica de contexto IA para `/home/admincenter/contenedores`.
`MapaCompleto.md` es el mapa tecnico amplio; este archivo conserva reglas operativas, decisiones vigentes y avances importantes.

## Proposito del proyecto

ParamascotasEC es un workspace integrado para e-commerce de mascotas en Ecuador. Incluye frontend Next.js, backend PHP, base PostgreSQL, microservicio de facturacion electronica SRI y gateway APISIX/etcd con Certbot oficial.

El objetivo operativo es mantener un entorno desplegable por scripts, con reglas de negocio server-side, seguridad admin estricta y contexto suficiente para que una IA o un desarrollador pueda continuar trabajo sin redescubrir decisiones recientes.

## Mantenimiento de contexto IA

- `AGENTS.md` en la raiz del workspace es la fuente canonica.
- La copia versionada vive en `paramascotasec/docs/AI_CONTEXT.md`; si hay conflicto, manda este archivo raiz.
- Al cerrar trabajo importante, actualizar primero `AGENTS.md` y luego sincronizar la copia versionada.
- Registrar avances en `Historial de trabajo IA` con fecha, objetivo, cambios, decisiones y pendientes. Consolidar entradas antiguas para evitar duplicados temporales.
- No guardar secretos, passwords, tokens reales, certificados, llaves `.p12` ni datos sensibles de clientes.
- La raiz `/home/admincenter/contenedores` no es repo Git; los componentes (`paramascotasec`, `paramascotasec-backend`, `Facturador`, `Gateway`, `paramascotasec-DB`) son repos separados.

## Contexto operativo actual

- Ambiente local vigente: QA local sobre el stack `development`; no asumir `production` salvo pedido explicito del usuario.
- IP LAN del host virtualizado en este ambiente: `192.168.100.229`.
- Dominio funcional del QA local: `paramascotasec.com`, resolviendo hacia `192.168.100.229`.
- Todas las verificaciones funcionales del sitio/API en este entorno deben entrar por APISIX usando el contrato publico y el dominio `paramascotasec.com`; usar puertos internos o sidecars solo para diagnostico explicito.
- El Gateway development puede exponerse por esa IP segun configuracion de `GATEWAY_BIND_IP`; usar scripts de development para cambios locales, aunque el ambiente operativo se trate como QA.

## Despliegue critico

**Nunca ejecutar `docker compose up` directamente**: rompe el ruteo SSL y el aislamiento por perfiles. Usar siempre scripts de deploy.

```bash
cd /home/admincenter/contenedores

# Workspace completo:
./deploy-development.sh       # development: certificado autofirmado
./deploy-production.sh        # production: Let's Encrypt

# Servicio individual development:
./scripts/deploy-development.sh facturador
./scripts/deploy-development.sh db
./scripts/deploy-development.sh backend
./scripts/deploy-development.sh frontend
./scripts/deploy-development.sh gateway

# Servicio individual production:
./scripts/deploy-production.sh facturador
./scripts/deploy-production.sh db
./scripts/deploy-production.sh backend
./scripts/deploy-production.sh frontend
./scripts/deploy-production.sh gateway

# Operaciones puntuales:
RUN_DB_SETUP=1 ./scripts/deploy-development.sh backend
RUN_DB_MIGRATIONS=1 ./scripts/deploy-development.sh facturador
```

Servicios validos para wrappers individuales: `facturador`, `db`, `backend`, `frontend`, `gateway`.
Orden del despliegue completo: Facturador -> DB -> Backend -> Frontend -> Gateway.
Los scripts materializan el modo activo en `entorno/.env` por componente; `development` y `production` se despliegan solo por los wrappers de deploy.
PostgreSQL major actual: 18. La DB principal usa `postgres18_data` y conserva `postgres16_data` para rollback; Facturador usa el volumen Docker `postgres18-data` y conserva `postgres-data` para rollback.

## Red

El workspace usa redes Docker segmentadas, creadas por los scripts. `edge` queda para entrada del Gateway; las comunicaciones internas usan redes `internal` y los contenedores con salida externa tienen redes de egreso dedicadas.

- `apisix-gateway-internal`: APISIX, etcd y webroot ACME interno.
- `paramascotasec-web-internal`: APISIX Gateway, Frontend y Backend Web.
- `paramascotasec-db-internal`: Backend App y DB principal.
- `paramascotasec-services-internal`: APISIX Gateway, Backend App y Facturador Nginx (`facturador`).
- Redes de egreso no publicadas: Backend App para SMTP; Facturador service/worker para SRI y SMTP.
- En desarrollo, los puertos locales de diagnostico del Facturador se publican mediante sidecars (`billing-nginx-local`, `billing-postgres-local`) en `127.0.0.1`; los servicios reales y DBs permanecen en redes internas.
- Mantener el aislamiento de redes tambien en development: no conectar contenedores internos a `bridge`/egreso temporal como solucion normal. Si una tarea exige egreso para instalar dependencias o diagnosticar, preferir los scripts/imagenes/caches previstos; cualquier excepcion debe ser explicita, temporal, documentada y revertida antes de cerrar.

| Servicio | Host interno | Notas |
|----------|--------------|-------|
| Backend API | `http://paramascotasec-backend-web:8080/api` | PHP-FPM detras de Nginx |
| Frontend | `http://paramascotasec-frontend:3000` | Next.js |
| Facturador | `http://facturador:8080` | Alias interno en `paramascotasec-services-internal` |
| DB principal | `db:5432` | PostgreSQL principal |

## Arquitectura

| Componente | Tech | Contenedores |
|------------|------|--------------|
| Frontend | Node 24 LTS + Next.js 16 + React 19 + Tailwind CSS 4 + TypeScript 6 | `paramascotasec-app` prod / `paramascotasec-app-dev` dev |
| Backend | PHP 8.5 MVC propio + PostgreSQL | `paramascotasec-backend-app`, `paramascotasec-backend-web` |
| Database | PostgreSQL 18 | `next-test-db` |
| Facturador | PHP 8.5 + PostgreSQL 18 | `billing-service`, `billing-recovery-worker`, `billing-postgres`, `billing-nginx`; dev agrega `billing-nginx-local`, `billing-postgres-local` |
| Gateway | APISIX 3.16 + etcd 3.5 + Certbot oficial | `apisix-gateway`, `apisix-etcd`, `apisix-acme-webroot`, `certbot` |

## Frontend `paramascotasec/app`

- Entry point: `src/app/layout.tsx`; rutas con Next.js App Router en `src/app/`.
- Comandos desde `paramascotasec/app`:

```bash
npm run dev          # hot reload; webpack por defecto, FRONTEND_DEV_BUNDLER=turbopack para Turbopack
npm run build        # build produccion
npm run lint         # ESLint --max-warnings=0
npm run typecheck    # tsc --noEmit
npm run test         # lint + typecheck
```

- Prebuild: `npm run images:manifest` antes de dev/build/lint/start; `images:home-performance` e `images:upload-variants` antes de build.
- Perfiles frontend exclusivos: `development` usa `paramascotasec-app-dev`; `production` usa `paramascotasec-app`. Los scripts remueven el perfil opuesto.
- Dev runtime de despliegue via `FRONTEND_DEV_RUNTIME=stable`: precompila produccion bajo `APP_ENV=development` detras del gateway con CSP estricta. `hot`/HMR no es un modo valido para el deploy del ambiente; usarlo solo como herramienta local explicita fuera de la validacion por gateway.

## Backend `paramascotasec-backend`

- Entry point: `public/index.php`.
- Arquitectura: MVC propio sin framework; Router custom, JWT auth, CORS, CSRF y tenant resolution.
- Namespace PHP: `App\` -> `src/`.
- Bootstrap DB: `scripts/bootstrap_schema.php`, ejecutado con `RUN_DB_SETUP=1`.
- Composer se ejecuta en build de imagen; no se instala ni corre dentro del contenedor runtime.

## Facturador SRI Ecuador

- Requiere certificado `.p12` en `Facturador/certs/firma.p12` como volumen read-only.
- API principal: `POST /api/{env}/v1/invoices` y `GET /api/{env}/v1/invoices/{accessKey}/status`.
- Auth: `X-API-Key` o `Authorization: Bearer`.
- Worker: `php bin/process_pending_invoices.php --limit=50 --min-age-seconds=3600`, ejecutado en loop por `billing-recovery-worker`.
- DB propia: `billing-postgres`, puerto interno 5432; en desarrollo `billing-postgres-local` publica `127.0.0.1:5434` solo para diagnostico.
- HTTP local de facturador `127.0.0.1:8084` existe solo en desarrollo via `billing-nginx-local` para diagnostico.
- Acceso publico del facturador, cuando aplique, entra por Gateway bajo `/${PUBLIC_TENANT_SLUG}/${PUBLIC_BILLING_SERVICE_SEGMENT}/health` y `/${PUBLIC_TENANT_SLUG}/${PUBLIC_BILLING_SERVICE_SEGMENT}/${PUBLIC_BILLING_ENV_SEGMENT}/v1/*`; APISIX reescribe a `/health` y `/api/{test|production}/v1/*`. Paneles/admin no se publican por Gateway.
- SRI por entorno: desarrollo usa `pruebas` (`celcer.sri.gob.ec`) y produccion usa `produccion` (`cel.sri.gob.ec`).
- El correo del facturador puede venir de la configuracion de sucursal en DB; `billing-service` y `billing-recovery-worker` requieren egreso SMTP cuando haya sucursales con mail activo.
- Rutas por entorno: `FACTURADOR_API_INVOICES_PATH=/api/test/v1/invoices` en dev y `/api/production/v1/invoices` en prod.

## Gateway

- Fragil para SSL, perfiles y reglas dinamicas: nunca levantar manualmente con `docker compose up`.
- Usar `./scripts/deploy-development.sh gateway` o `./scripts/deploy-production.sh gateway` desde la raiz del workspace.
- APISIX se configura desde `Gateway/entorno/.env`; no hardcodear dominio, tenant, base path ni upstream en rutas.
- Contrato publico: web `https://${PRIMARY_SITE_DOMAIN}/`; dashboard `https://${PRIMARY_SITE_DOMAIN}/${PUBLIC_DASHBOARD_SEGMENT}/`; backend `https://${PRIMARY_SITE_DOMAIN}/${PUBLIC_TENANT_SLUG}/${PUBLIC_API_SERVICE_SEGMENT}/*`; facturacion `https://${PRIMARY_SITE_DOMAIN}/${PUBLIC_TENANT_SLUG}/${PUBLIC_BILLING_SERVICE_SEGMENT}/${PUBLIC_BILLING_ENV_SEGMENT}/v1/*`.
- En QA local actual, probar ese contrato por `https://paramascotasec.com/` y, si el DNS/hosts del cliente no resuelve al host virtualizado, usar `--resolve paramascotasec.com:443:192.168.100.229` en `curl`.
- Variables clave: `PRIMARY_SITE_DOMAIN`, `PRIMARY_SITE_ALIASES`, `PRIMARY_SITE_PUBLIC_IP`, `PRIMARY_SITE_LOCAL_IPS`, `PUBLIC_TENANT_SLUG`, `PUBLIC_API_SERVICE_SEGMENT`, `PUBLIC_DASHBOARD_SEGMENT`, `PUBLIC_BILLING_SERVICE_SEGMENT`, `PUBLIC_BILLING_ENV_SEGMENT`, `FRONTEND_UPSTREAM`, `BACKEND_UPSTREAM`, `DASHBOARD_UPSTREAM`, `FACTURADOR_UPSTREAM`.
- Rutas legacy publicas `/api/*`, `/facturador/*` y `/uploads-api/*` quedan bloqueadas por APISIX.
- `sync-apisix.sh` aplica upstreams/services/routes/ssl por Admin API y limpia solo objetos con marca managed.
- Dashboard local de APISIX: `http://${APISIX_ADMIN_BIND_IP}:${APISIX_ADMIN_PORT}/ui/` (development actual: `127.0.0.1:9180`).
- En desarrollo `GATEWAY_BIND_IP` debe apuntar a localhost/LAN; en produccion publica solo `80/443`.
- `certbot` corre solo en produccion via perfil `certbot`.
- Renovacion manual:

```bash
cd Gateway && ./scripts/renew-letsencrypt.sh
```

## Verificacion

```bash
scripts/check-paramascotas.sh    # capability registry + frontend lint/typecheck + backend PHP syntax + backend health
scripts/check-env-secrets.sh all # preflight .env/secrets sin imprimir valores
scripts/check-container-connectivity.sh development
scripts/check-container-connectivity.sh production
scripts/e2e-development.sh       # suite development: contracts, checks, SEO, Facturador y probes Gateway

cd paramascotasec/app
npm run capabilities:check       # valida registro maestro de capacidades
npm run capabilities:generate    # regenera docs/system-capabilities.generated.json y helper TS
```

`check-container-connectivity.sh` tambien valida que `/${PUBLIC_TENANT_SLUG}/${PUBLIC_API_SERVICE_SEGMENT}/products` devuelva productos publicos y que las rutas legacy `/api/*`, `/facturador/*` y `/uploads-api/*` respondan 404. Un deploy dev/prod debe fallar si el catalogo publico queda vacio; en development solo se permite sembrar datasets demo con `SEED_DEVELOPMENT_CATALOG=1`, no por defecto. `check-container-connectivity.sh production` valida el runtime de produccion; no correrlo esperando exito mientras el workspace esta desplegado en development. Para cambios acotados, correr tambien checks del componente afectado cuando aplique.

El registro maestro de capacidades vive en `paramascotasec/docs/capabilities/*.json`; el manifiesto generado queda en `paramascotasec/docs/system-capabilities.generated.json` y el helper frontend en `paramascotasec/app/src/generated/systemCapabilities.ts`. Toda ruta backend nueva debe registrarse en `paramascotasec-backend/config/routes.php` con `capability`; toda ruta Facturador auditable debe registrarse en `Facturador/config/routes.capabilities.php`. Si una pagina, route handler o uso API queda fuera del registro, `npm run capabilities:check` debe fallar.

## Reglas de negocio criticas

- Pricing siempre server-side: el cliente nunca debe enviar `discount`, `total`, `subtotal`, `vat_*`, `shipping`, `grand_total`, `price`, `unit_cost`, `cost_total` ni campos monetarios derivados. `OrderController` los rechaza como manipulacion.
- IVA default: 15% Ecuador. `tax_exempt` por producto; soporta carritos mixtos exentos/no exentos.
- Envio: gratis en Centro/Norte Quito; USD 5.00 para Sur/Valles. Se determina desde direccion via `GET /api/settings/shipping`.
- Descuentos: server-side; tipos porcentaje o fijo; soportan `min_subtotal`, `max_discount`, `max_uses`.
- Consumidor final: `9999999999999` solo se permite hasta USD 50.00 oficiales. Ventas mayores deben tener cedula o RUC valido del cliente; backend y Facturador bloquean el caso antes de emitir.
- Inventario FIFO: `inventory_lots` rastrea lotes de compra; ordenes consumen lotes antiguos primero; costos se restauran al cancelar.
- Sitio publico: dominio principal, alias y tenant salen de `.env` del Gateway; en development actual son `paramascotasec.com`, `www.paramascotasec.com` y `paramascotasec`. Dominios ajenos deben quedar rechazados o redirigidos por APISIX segun reglas.

## Seguridad

- Auth: JWT HS256 en cookie httpOnly y Bearer opcional. Payload: `sub`, `email`, `name`, `role`, `tenant_id`, `jti`.
- CSRF: requerido para mutaciones API excepto auth/contact/health/quote. Header `X-CSRF-Token` debe coincidir con cookie `pm_csrf`.
- Rutas admin (`/api/admin/*`, `/api/reports/*`, `/api/users*`, `/api/shipments`): requieren `role='admin'` y allowlist IP (`ADMIN_IP_MODE=private` por defecto en dev/prod; usar `custom` para IP publica fija).
- Bloqueo de cuenta: despues de `AUTH_LOGIN_MAX_ATTEMPTS` (default 5), bloqueo por `AUTH_LOGIN_LOCK_MINUTES` (default 15).
- MFA: OTP por email para admins (`request-otp`, `verify-otp`).
- Proxy interno: `INTERNAL_PROXY_TOKEN` permite auth inter-contenedores sin login.

## Operaciones peligrosas

```bash
# Reset de ventas solamente: preserva clientes, catalogo y config.
cd paramascotasec-backend
./scripts/reset_sales_data.sh development --yes

# Wipe completo + redeploy:
docker stop $(docker ps -aq) 2>/dev/null || true
docker system prune -a --volumes -f
./deploy-development.sh
RUN_DB_SETUP=1 ./scripts/deploy-development.sh backend
```

Usar estas operaciones solo cuando el usuario las pida explicitamente o cuando el objetivo dependa de ellas y haya confirmacion clara.

## Analytics y SEO

- Analytics: no integrado. No hay GA4, Hotjar, Clarity, etc.
- Title template: `%s | ParaMascotasEC`.
- Sitemap: `/sitemap.xml`, generado desde `app/sitemap.ts`.
- Google Products Feed: `/feeds/google-products.xml` RSS 2.0.
- Search Console, estado mayo 2026: 1 URL indexada, 98 no indexadas, sitemap no detectado.
- Guia SEO/Google: `paramascotasec/SEO-GOOGLE-SETUP.md`.

## Historial de trabajo IA

### 2026-06-18 - QA: Campo definidor de variantes agrupadas

Objetivo: permitir que productos agrupados definan explicitamente que atributo cambia entre variantes (`peso`, `contenido`, `presentacion`, `empaque`, `sabor`, `etapa`, `talla`, `color`, etc.) y mantener consistencia entre Dashboard, backend y ecommerce publico.

Cambios:
- Dashboard: el editor de producto reemplaza `Eje publico` por `Define la variante`; al cambiarlo sincroniza `variantDefinitionField`, `variantAxis` real y `displayAxis` publico sin perder atributos de familia.
- Backend: `ProductVariantMetadata` separa campo definidor real (`variantDefinitionField`/`variantAxis`) del eje visible (`displayAxis`), acepta mas tipos de variante y excluye el campo variante del `variantGroupKey` para no romper familias.
- Sitio publico: `catalog.ts`, `catalogAttributes.ts` y `productMapper.ts` priorizan `variantDefinitionField`, eliminan ejes duplicados equivalentes (`size` vs `weight`/`volume`) y muestran un unico selector cuando corresponde.
- Se agrego `paramascotasec-backend/scripts/backfill_product_variant_definition_fields.php` para normalizar productos existentes de forma conservadora.

Operacion y verificacion:
- Backfill QA ejecutado para tenant `paramascotasec`: 166 revisados, 82 normalizados, 2 omitidos por conflicto de unicidad.
- Auditoria API por APISIX: 123 productos publicos, 16 familias agrupadas, 0 sin `variantDefinitionField`, 0 familias con eje mezclado; Guerpo 2 kg/25 kg queda como `variantDefinitionField=weight`, `displayAxis=presentation`.
- Playwright por APISIX QA local usando `--host-resolver-rules` a `192.168.100.229` valido la ficha Guerpo: selector unico `Presentación` con `2 kg` y `25 kg`, y al elegir `25 kg` aparece SKU `ALI-GUERPO-ADULTO-25KG-PERRO`.
- Pasaron `npm run typecheck`/`npm run lint` en `paramascotasec/app`, `npm run type:check`/`npm run lint`/`npm run arch:check`/`npm run docker:health` en `Dashboard`, `php -l` de backend afectado y `scripts/check-container-connectivity.sh development`.
- `npx vitest run src/app/features/dashboard/services/paramascotas-product-variant.service.spec.ts` sigue bloqueado por la dependencia opcional local faltante de Rollup `@rollup/rollup-linux-x64-gnu`; las specs compilan por `type:check`.

### 2026-06-18 - Dashboard QA: Paramascotas como tenant, Ecommerce como modulo

Objetivo: corregir la estructura del arbol para que ParamascotasEC quede claro como tenant/cliente y no como modulo funcional del Dashboard.

Cambios:
- Se elimina la carpeta/documentacion `Dashboard/src/app/features/paramascotas` para no presentar un tenant como feature SaaS.
- Se agrega `Dashboard/src/app/tenants/README.md` y `Dashboard/src/app/tenants/paramascotasec/README.md`, explicando que `paramascotasec` es tenant que contrata modulos como `ecommerce`, `products`, `inventory`, `invoicing`, `users` y `monitoring`.
- Se agrega `Dashboard/src/app/features/ecommerce/README.md` como ancla visible del modulo ecommerce reutilizable.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que `features/*` son modulos y `tenants/*` son adaptaciones/configuracion por cliente.
- `Dashboard/tools/check-architecture.mjs` permite `src/app/tenants` y bloquea que vuelvan carpetas tenant-specific como `features/paramascotas` o `features/paramascotasec`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint` y `npm run arch:check`.

### 2026-06-18 - Dashboard QA: Frontera clara para API central del Dashboard

Objetivo: hacer mas legible el arbol del Dashboard y dejar claro donde se centraliza el consumo de APIs.

Cambios:
- `Dashboard/src/app/core/api/` queda como frontera publica de contratos API del dashboard, reexportando `DashboardApiCatalogService`, `DASHBOARD_API_ENDPOINT_KEYS` y tipos desde los catalogos centrales.
- Los servicios API del Dashboard pasan a importar contratos desde `@core/api` en vez de rutas internas `@core/modules/dashboard-api.*`.
- La separacion tenant/modulo quedo corregida posteriormente: ParamascotasEC es tenant en `Dashboard/src/app/tenants/paramascotasec/`, no modulo bajo `features/*`.
- `Dashboard/src/app/features/dashboard/data/README.md` y `services/README.md` marcan que los archivos `paramascotas-*` son legado de transicion y que nuevas pantallas deben seguir `Page -> Facade -> data/*-api.service.ts -> @core/api -> Backend`.
- `Dashboard/tools/check-architecture.mjs` ahora bloquea imports directos al catalogo API interno fuera de `core/api`/`core/modules`, obligando a usar `@core/api`.
- `Dashboard/docs/API-FIRST-MODULES.md` queda alineado con la nueva frontera `@core/api`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint` y `npm run arch:check`.
- No se movio fisicamente el componente historico `paramascotas-panel` para evitar romper rutas y cambios acumulados; quedo documentado como siguiente migracion segura.

### 2026-06-18 - Dashboard QA: Restock editable de producto fuera del componente

Objetivo: continuar la separacion API-first/modular sacando de `ParamascotasPanelComponent` los calculos de reabastecimiento editable de producto.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-product-inventory.service.ts` agrega helpers y metodos de servicio para modo reabastecimiento, stock actual, unidades compradas y cantidad final (`paramascotasProductFormIsRestockMode`, `paramascotasProductFormCurrentStock`, `paramascotasProductFormRestockUnits`, `paramascotasProductRestockTargetQuantity`).
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` conserva los metodos usados por el template, pero delega esos calculos y la validacion de inventario a `ParamascotasProductInventoryService`.
- `Dashboard/src/app/features/dashboard/services/paramascotas-product-inventory.service.spec.ts` cubre el calculo de unidades compradas, stock actual redondeado, cantidad final y modo restock sin instanciar el componente.
- `Dashboard/tools/check-architecture.mjs` y `Dashboard/docs/API-FIRST-MODULES.md` documentan/bloquean que estos calculos de restock vuelvan al componente.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`, `git -C Dashboard diff --check` y Playwright focal de reabastecimiento de producto (`2/2`).
- APISIX sirve el bundle `main-3HSTPFV3.js` por `https://paramascotasec.com/dashboard/` resolviendo a `192.168.100.229`.
- `npx vitest run src/app/features/dashboard/services/paramascotas-product-inventory.service.spec.ts` sigue bloqueado por la dependencia opcional local faltante de Rollup `@rollup/rollup-linux-x64-gnu`; las specs compilan mediante `type:check`.

### 2026-06-18 - Dashboard QA: Preview de imagenes de producto fuera del componente

Objetivo: continuar la separacion API-first/modular sacando de `ParamascotasPanelComponent` la deduplicacion y seleccion de imagenes de preview de producto.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-product-page.service.ts` agrega `paramascotasProductPreviewImages()` y el metodo `previewImages()` para devolver miniaturas y galeria en orden, descartando URLs vacias y duplicados por URL+alt.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` conserva `productPreviewImages()` como delegado al servicio de ficha de producto.
- `Dashboard/src/app/features/dashboard/services/paramascotas-product-page.service.spec.ts` cubre orden thumbnail-first, deduplicacion y descarte de imagenes sin URL.
- `Dashboard/tools/check-architecture.mjs` y `Dashboard/docs/API-FIRST-MODULES.md` documentan/bloquean que la lista deduplicada de preview vuelva al componente.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`, `git -C Dashboard diff --check` y Playwright focal de catalogo/ficha de producto (`3/3`).
- APISIX sirve el bundle `main-PDYO54AJ.js` por `https://paramascotasec.com/dashboard/` resolviendo a `192.168.100.229`.
- `npx vitest run src/app/features/dashboard/services/paramascotas-product-page.service.spec.ts` sigue bloqueado por la dependencia opcional local faltante de Rollup `@rollup/rollup-linux-x64-gnu`; las specs compilan mediante `type:check`.

### 2026-06-18 - Dashboard QA: Etiquetas operativas de producto fuera del componente

Objetivo: continuar la separacion API-first/modular sacando de `ParamascotasPanelComponent` reglas visibles del catalogo de productos que dependian de datos de inventario/proveedor recibidos por API.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-product-catalog-search.service.ts` agrega etiquetas de proveedor, cobertura, vencimiento, ultima compra, ultima venta y tags de preview mediante helpers puros (`paramascotasProductSupplierLabel`, `paramascotasProductCoverageLabel`, `paramascotasProductExpirationLabel`, `paramascotasProductLastPurchaseLabel`, `paramascotasProductLastSaleLabel`, `paramascotasProductPreviewTags`) y metodos del servicio.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` conserva los metodos usados por el template, pero los delega a `ParamascotasProductCatalogSearchService`; tambien se removio el import local de `attributeString`.
- `Dashboard/src/app/features/dashboard/services/paramascotas-product-catalog-search.service.spec.ts` cubre labels operativos, fallbacks y tags de preview sin instanciar el componente.
- `Dashboard/tools/check-architecture.mjs` y `Dashboard/docs/API-FIRST-MODULES.md` documentan/bloquean que estas reglas de visualizacion del catalogo vuelvan al componente.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`, `git -C Dashboard diff --check` y Playwright focal de catalogo/productos (`3/3`).
- APISIX sirve el bundle `main-756M4FGS.js` por `https://paramascotasec.com/dashboard/` resolviendo a `192.168.100.229`.
- `npx vitest run src/app/features/dashboard/services/paramascotas-product-catalog-search.service.spec.ts` sigue bloqueado por la dependencia opcional local faltante de Rollup `@rollup/rollup-linux-x64-gnu`; las specs compilan mediante `type:check`.

### 2026-06-18 - Dashboard QA: Ventas recientes POS fuera del componente

Objetivo: continuar la separacion API-first/modular sacando de `ParamascotasPanelComponent` la logica visible que decide que pedidos aparecen como `Ventas recientes` dentro de `Venta en local`.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-pos-analytics.service.ts` agrega `buildParamascotasLocalSaleRecentOrders()` e `isParamascotasLocalSaleRecentOrder()` para filtrar pedidos `completed/delivered`, exigir canal `local_pos`, deduplicar contra la ultima venta creada y ordenar por fecha.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` conserva `localSaleRecentOrders()` e `isLocalSaleRecentOrder()` como delegados al servicio POS, sin `Map`, `Date.parse`, estado de pedido ni canal de pago calculados en la vista.
- `Dashboard/src/app/features/dashboard/services/paramascotas-pos-analytics.service.spec.ts` cubre ventas recientes POS con `payment_details` JSON/string, pedidos ecommerce ignorados, pendientes ignorados y deduplicacion de la ultima orden.
- `Dashboard/tools/check-architecture.mjs` y `Dashboard/docs/API-FIRST-MODULES.md` documentan/bloquean que la seleccion de ventas recientes POS vuelva al componente.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`, `git -C Dashboard diff --check` y Playwright focal de `Venta en local` (`2/2`).
- APISIX sirve el bundle `main-BQJNXWHH.js` por `https://paramascotasec.com/dashboard/` resolviendo a `192.168.100.229`.
- `npx vitest run src/app/features/dashboard/services/paramascotas-pos-analytics.service.spec.ts` sigue bloqueado por la dependencia opcional local faltante de Rollup `@rollup/rollup-linux-x64-gnu`; las specs compilan mediante `type:check`.

### 2026-06-18 - Dashboard QA: Resumen de facturas de compra fuera del componente

Objetivo: continuar la separacion API-first/modular sacando de `ParamascotasPanelComponent` el resumen de cabeceras de facturas de compra usado por `Productos x Compra`.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-product-purchase-analytics.service.ts` agrega `ParamascotasPurchaseInvoicesSummary`, `buildParamascotasPurchaseInvoicesSummary()` y el metodo `purchaseInvoicesSummary()` para calcular facturas, unidades, total comprado y proveedores unicos desde el contrato normalizado del backend.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` conserva `purchaseInvoicesSummary()` solo como delegado al servicio de analitica de compras, sin reducers ni conteo de proveedores en la vista.
- `Dashboard/src/app/features/dashboard/services/paramascotas-product-purchase-analytics.service.spec.ts` cubre el resumen con montos/unidades numericos y string, ademas de proveedor repetido.
- `Dashboard/tools/check-architecture.mjs` y `Dashboard/docs/API-FIRST-MODULES.md` documentan/bloquean que el resumen de cabeceras de facturas vuelva al componente.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`, `git -C Dashboard diff --check` y Playwright focal de `Productos x Compra`/facturas de compra (`2/2`).
- APISIX sirve el bundle `main-AB2CBNK7.js` por `https://paramascotasec.com/dashboard/` resolviendo a `192.168.100.229`.
- `npx vitest run src/app/features/dashboard/services/paramascotas-product-purchase-analytics.service.spec.ts` sigue bloqueado por la dependencia opcional local faltante de Rollup `@rollup/rollup-linux-x64-gnu`; las specs compilan mediante `type:check`.

### 2026-06-18 - Dashboard QA: Detalle operativo de pedidos fuera del componente

Objetivo: continuar la separacion API-first/modular sacando del componente principal reglas visibles de pedidos, facturacion interna, contacto, direccion y totales.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-order-analytics.service.ts` centraliza `OrderReadinessCard`, contacto/direcciones de pedido, labels de entrega/pago/factura, secuencial SRI visible, canal de pago, subtotal/IVA/envio/descuento, totales de item, fallback de imagen y permisos operativos de estado/factura.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` conserva los nombres usados por el template, pero delega esos calculos a `ParamascotasOrderAnalyticsService`; tambien se removieron helpers locales `parseJsonValue`, `asRecord`, `textValue` y `addressName`.
- `Dashboard/src/app/features/dashboard/services/paramascotas-order-analytics.service.spec.ts` cubre detalle fiscal/operativo de pedido, readiness, busqueda, labels y totales.
- `Dashboard/tools/check-architecture.mjs` y `Dashboard/docs/API-FIRST-MODULES.md` documentan/bloquean que estos calculos de detalle de pedido vuelvan al componente.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`, `git -C Dashboard diff --check` y Playwright focal de pedidos/admin-orders (`4/4`).
- APISIX sirve el bundle `main-DDW3DDG3.js` por `https://paramascotasec.com/dashboard/` resolviendo a `192.168.100.229`.
- `npx vitest run src/app/features/dashboard/services/paramascotas-order-analytics.service.spec.ts` sigue bloqueado por la dependencia opcional local faltante de Rollup `@rollup/rollup-linux-x64-gnu`; las specs compilan mediante `type:check`.

### 2026-06-18 - Dashboard QA: Metadata de imagenes de catalogos fuera del componente

Objetivo: continuar la separacion API-first/modular sacando de `ParamascotasPanelComponent` la decision de tipo de imagen y metadata para logos/multimedia de catalogos operativos.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-reference-catalog.service.ts` agrega `ParamascotasReferenceImageUploadRequest`, `buildParamascotasReferenceImageUploadRequest()` y el metodo `imageUploadRequest()` para centralizar `brandLogo`, `categoryFeatured*`, `variantLabel` y metadata `brandName/category/platform`.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` ya no importa `ParamascotasUploadImageKind` ni calcula `categoryRequirement`; ahora solo valida archivo/nombre y pasa `{ kind, metadata }` desde `ParamascotasReferenceCatalogService` al API.
- `Dashboard/src/app/features/dashboard/services/paramascotas-reference-catalog.service.spec.ts` cubre solicitudes de upload para logos de marca y slots publicos de categoria.
- `Dashboard/tools/check-architecture.mjs` y `Dashboard/docs/API-FIRST-MODULES.md` documentan/bloquean que esta metadata de catalogos vuelva al componente.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`, `git -C Dashboard diff --check` y Playwright focal de catalogos operativos (`4/4`).
- APISIX sirve el bundle `main-REU7DKEM.js` por `https://paramascotasec.com/dashboard/` resolviendo a `192.168.100.229`.
- `npx vitest run src/app/features/dashboard/services/paramascotas-reference-catalog.service.spec.ts` sigue bloqueado por la dependencia opcional local faltante de Rollup `@rollup/rollup-linux-x64-gnu`; las specs compilan mediante `type:check`.

### 2026-06-18 - Dashboard QA: Metadata de imagen de producto fuera del componente

Objetivo: continuar la separacion API-first/modular sacando del componente la metadata de negocio enviada al endpoint de subida de imagenes de producto.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-product-form.service.ts` agrega `buildParamascotasProductUploadMetadata()` y el metodo `uploadMetadata()` para centralizar `productName`, `brandName`, `category`, `productType`, `size`, `species`, `material`, `variantLabel` y proveedor.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` deja de declarar `productUploadMetadata()`; al subir imagenes solo prepara el archivo y delega la metadata al servicio de formulario de producto.
- `Dashboard/src/app/features/dashboard/services/paramascotas-product-form.service.spec.ts` cubre la metadata generada, el fallback de proveedor y la prioridad de `variantLabel`.
- `Dashboard/tools/check-architecture.mjs` y `Dashboard/docs/API-FIRST-MODULES.md` documentan/bloquean que la metadata de subida de producto vuelva al componente.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`, `git -C Dashboard diff --check` y Playwright focal de producto/catalogo (`3/3`).
- APISIX sirve el bundle `main-STOU5RCJ.js` por `https://paramascotasec.com/dashboard/` resolviendo a `192.168.100.229`.
- `npx vitest run src/app/features/dashboard/services/paramascotas-product-form.service.spec.ts` sigue bloqueado por la dependencia opcional local faltante de Rollup `@rollup/rollup-linux-x64-gnu`; las specs compilan mediante `type:check`.

### 2026-06-18 - Dashboard QA: Intencion de inventario de producto fuera del componente

Objetivo: continuar la separacion API-first/modular sacando mensajes y reglas de stock de la ficha de producto desde `ParamascotasPanelComponent`.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-product-inventory.service.ts` agrega `ParamascotasProductInventoryIntentSummary`, `buildParamascotasProductInventoryIntentSummary()` y el metodo `inventoryIntentSummary()` para centralizar los estados `stock inicial`, `compra/reabastecimiento`, `ajuste manual`, `cambio sin accion` y `sin ingreso de stock`.
- `paramascotas-panel.component.ts` deja de construir mensajes como `Factura obligatoria para stock inicial`, `Compra / reabastecimiento` y `Ajuste manual`; ahora solo delega en `ParamascotasProductInventoryService`.
- `paramascotas-product-inventory.service.spec.ts` cubre los cinco estados de intencion de inventario.
- `Dashboard/tools/check-architecture.mjs` y `Dashboard/docs/API-FIRST-MODULES.md` documentan/bloquean que esos resumenes de inventario vuelvan al componente.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health` y Playwright focal de producto/inventario (`3/3`).
- APISIX sirve el bundle `main-DD64ABPH.js` con `<base href="/dashboard/">`.
- `npx vitest run src/app/features/dashboard/services/paramascotas-product-inventory.service.spec.ts` sigue bloqueado por la dependencia opcional local faltante de Rollup `@rollup/rollup-linux-x64-gnu`; las specs compilan mediante `type:check`.

### 2026-06-18 - Dashboard QA: Checklist y SEO de producto fuera del componente

Objetivo: continuar la separacion API-first/modular sacando reglas de ficha de producto desde `ParamascotasPanelComponent`.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-product-form.service.ts` centraliza `ParamascotasProductPublicationChecklistItem`, checklist de publicacion del editor, evaluacion `editorCanPublish`, sugerencias SEO y aplicacion de alt text en miniaturas/galeria.
- `paramascotas-panel.component.ts` deja de calcular requisitos de publicacion y textos SEO; conserva solo metodos delegados para el template y actualiza el estado del formulario con `ParamascotasProductFormService`.
- `paramascotas-product-form.service.spec.ts` cubre checklist, publicabilidad, sugerencias SEO y aplicacion al formulario.
- `Dashboard/tools/check-architecture.mjs` y `Dashboard/docs/API-FIRST-MODULES.md` documentan/bloquean que checklist de publicacion y sugerencias SEO vuelvan al componente.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health` y Playwright focal de productos/catalogo (`4/4`).
- APISIX sirve el bundle `main-LYO7X6S4.js` con `<base href="/dashboard/">`.
- `npx vitest run src/app/features/dashboard/services/paramascotas-product-form.service.spec.ts` sigue bloqueado por la dependencia opcional local faltante de Rollup `@rollup/rollup-linux-x64-gnu`; las specs compilan mediante `type:check`.

### 2026-06-18 - Dashboard QA: Submenus con router interno y fallback publico

Objetivo: corregir el caso reportado donde los menus principales del sidebar ya funcionaban, pero los submenus no navegaban de forma confiable para el usuario.

Cambios:
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.ts` unifica la navegacion de items principales y submenus: ambos intentan primero `router.navigateByUrl(...)` con la ruta interna tenant-aware y caen al `href` publico real (`/dashboard/...`) si Angular cancela, rechaza o deja la URL anterior.
- `navigateSubmenuItem(...)` ya no fuerza siempre `location.assign(...)`; esto evita recargas innecesarias y deja a los submenus operar igual que los items principales, conservando el fallback publico para base path `/dashboard/`.
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.spec.ts` actualiza la cobertura para confirmar que submenus normales y flyout replegado usan router primero, preservan `?tenant` sin codificarlo como `%3Ftenant`, y cierran el flyout al seleccionar un hijo.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health` y Playwright focal de submenus mobile/desktop/replegado/grupo activo (`5/5`).
- APISIX sirve el bundle `main-PJC7SI7F.js` con `<base href="/dashboard/">`.
- `npx vitest run src/app/layout/shell/side-nav/side-nav.component.spec.ts` no arranco por la dependencia opcional local faltante de Rollup `@rollup/rollup-linux-x64-gnu`; la compilacion de specs quedo cubierta por `npm run type:check`.
- La comprobacion directa por `https://paramascotasec.com/dashboard/...` sin sesion redirige a login y no llega al sidebar, comportamiento esperado para host publico sin autenticacion.

### 2026-06-18 - Dashboard QA: Filtros de catalogo e IVA fuera del componente

Objetivo: continuar la separacion API-first/modular eliminando reglas de filtros de productos e impuestos desde `ParamascotasPanelComponent`.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-product-catalog-search.service.ts` centraliza `ParamascotasProductCatalogFilter`, normalizacion de filtros, resumen publicado/oculto/incompleto, quick filters, insights de catalogo, stock, costo unitario y margen bruto.
- `Dashboard/src/app/features/dashboard/services/paramascotas-tax-analytics.service.ts` centraliza `ParamascotasProductTaxFilter`, `PARAMASCOTAS_PRODUCT_TAX_FILTER_OPTIONS`, normalizacion y matching fiscal `all/taxed/exempt`.
- `paramascotas-panel.component.{ts,html}` deja de declarar `ProductCatalogFilter`, `ProductTaxFilter`, filas de insight y reglas `stock-risk`/`margin-risk`; la vista solo conserva senales y delega en servicios.
- Specs de servicios cubren filtros de catalogo, filtros fiscales, resumenes e insights. `tools/check-architecture.mjs` y `Dashboard/docs/API-FIRST-MODULES.md` documentan/bloquean que estas reglas vuelvan al componente.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`, Playwright de ruta `catalog/products` (`1/1`) y Playwright focal de filtros de productos/IVA (`2/2`).
- APISIX sirve el bundle `main-VKEMCDZH.js` con `<base href="/dashboard/">`.
- Vitest focal de servicios no arranco por la dependencia opcional local faltante de Rollup `@rollup/rollup-linux-x64-gnu`; la compilacion de specs quedo cubierta por `npm run type:check`.

### 2026-06-18 - Dashboard QA: Submenus por enlace publico directo

Objetivo: corregir que el menu lateral ya respondiera en estado replegado, pero los submenus siguieran fallando para el usuario al seleccionar hijos.

Cambios:
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.{ts,html}` separa la navegacion de submenus de la navegacion SPA de items principales: los hijos ahora usan `navigateSubmenuItem()` y van por el `href` publico ya calculado (`/dashboard/...`) mediante `DomService.navigateToExternalUrl`, preservando tenant query y evitando estados donde `Router.navigateByUrl()` acepte el click pero la vista no cambie.
- Los clicks modificados (`Ctrl`, `Meta`, `Shift`, `Alt` o boton no primario) siguen comportandose como enlaces normales del navegador.
- `side-nav.component.spec.ts` se actualiza para validar hrefs publicos, cierre de flyout y no codificar `?tenant` como `%3Ftenant`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`, Playwright focal de submenus mobile/desktop/replegado (`4/4`) y flujo real `paramascotasec.com` con login MFA (`1/1`, timeout 60s).
- APISIX sirve el bundle `main-CU3TBBUH.js` con `<base href="/dashboard/">`.
- Vitest focal de `side-nav.component.spec.ts` no arranco por la dependencia opcional local faltante de Rollup `@rollup/rollup-linux-x64-gnu`; la compilacion de specs si quedo cubierta por `npm run type:check`.

### 2026-06-18 - Dashboard QA: Opciones de accion de inventario fuera del componente

Objetivo: continuar la separacion API-first/modular sacando configuracion editable de stock desde `ParamascotasPanelComponent`.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-product-inventory.service.ts` exporta `PARAMASCOTAS_EDITABLE_INVENTORY_ACTION_OPTIONS`, `ParamascotasEditableInventoryAction` y `ParamascotasEditableInventoryActionOption`, ademas de exponer las opciones desde `ParamascotasProductInventoryService`.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` consume esas opciones centrales y elimina el arreglo local `inventoryActionOptions`.
- `Dashboard/src/app/features/dashboard/services/paramascotas-product-inventory.service.spec.ts` cubre las opciones esperadas.
- `Dashboard/tools/check-architecture.mjs` bloquea que opciones editables de inventario vuelvan a componentes visuales.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que opciones de accion de stock pertenecen a `ParamascotasProductInventoryService`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health` y Playwright focal de `catalog/products` (`1/1`).
- `npx vitest run src/app/features/dashboard/services/paramascotas-product-inventory.service.spec.ts` sigue bloqueado por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`); la spec compila mediante `type:check`.
- APISIX sirve el Dashboard con `base href="/dashboard/"` y bundle `main-CJAQB7ZS.js`.

### 2026-06-18 - Dashboard QA: Opciones de gastos fuera del componente

Objetivo: continuar la separacion API-first/modular sacando configuracion de filtros y recurrencias de gastos desde `ParamascotasPanelComponent`.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-expense-analytics.service.ts` exporta `PARAMASCOTAS_EXPENSE_STATUS_OPTIONS` y `ParamascotasExpenseStatusOption`, ademas de exponer las opciones desde `ParamascotasExpenseAnalyticsService`.
- `Dashboard/src/app/features/dashboard/services/paramascotas-expense-money.service.ts` exporta `PARAMASCOTAS_EXPENSE_RECURRENCE_FREQUENCY_OPTIONS`, `ParamascotasExpenseRecurrenceFrequency` y `ParamascotasExpenseRecurrenceFrequencyOption`, ademas de exponerlas desde el servicio.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` consume esas opciones centrales y elimina arreglos locales de estados/frecuencias.
- Las specs de `paramascotas-expense-analytics.service` y `paramascotas-expense-money.service` cubren las opciones esperadas.
- `Dashboard/tools/check-architecture.mjs` bloquea que esas opciones vuelvan a componentes visuales.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que opciones de estado y frecuencia de gastos pertenecen a servicios de dominio financiero.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health` y Playwright focal de `finance/expenses` + `operations/balances` (`2/2`).
- `npx vitest run src/app/features/dashboard/services/paramascotas-expense-analytics.service.spec.ts src/app/features/dashboard/services/paramascotas-expense-money.service.spec.ts` sigue bloqueado por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`); las specs compilan mediante `type:check`.
- APISIX sirve el Dashboard con `base href="/dashboard/"` y bundle `main-4Z66G4NI.js`.

### 2026-06-18 - Dashboard QA: Opciones de tendencia financiera fuera del componente

Objetivo: continuar la separacion API-first/modular sacando configuracion visible de reportes financieros desde `ParamascotasPanelComponent`.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-financial-analytics.service.ts` exporta `PARAMASCOTAS_FINANCIAL_TREND_MODE_OPTIONS`, `PARAMASCOTAS_FINANCIAL_TREND_SCOPE_OPTIONS` y `ParamascotasFinancialTrendOption`, ademas de exponerlas desde `ParamascotasFinancialAnalyticsService`.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` consume esas opciones centrales y elimina los arreglos tipados locales para modo/alcance de tendencia.
- `Dashboard/src/app/features/dashboard/services/paramascotas-financial-analytics.service.spec.ts` cubre las etiquetas e IDs esperados.
- `Dashboard/tools/check-architecture.mjs` bloquea que opciones de tendencia financiera vuelvan a componentes visuales.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que opciones de modo/alcance de tendencia pertenecen al dominio financiero.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health` y Playwright focal de rutas financieras `reporting/balance` y `operations/balances` (`2/2`).
- `npx vitest run src/app/features/dashboard/services/paramascotas-financial-analytics.service.spec.ts` sigue bloqueado por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`); la spec compila mediante `type:check`.
- APISIX sirve el Dashboard con `base href="/dashboard/"` y bundle `main-6ISJJ27H.js`.

### 2026-06-18 - Dashboard QA: Opciones POS fuera del componente

Objetivo: continuar la separacion API-first/modular sacando configuracion operativa de `Venta en local` desde `ParamascotasPanelComponent`.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-pos-analytics.service.ts` exporta `PARAMASCOTAS_POS_MOVEMENT_TYPES`, `PARAMASCOTAS_POS_PAYMENT_METHODS`, `ParamascotasPosMovementType` e `isParamascotasPosMovementType`, ademas de exponer las opciones desde el servicio.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` consume esas opciones centrales y elimina el validador local `isPosMovementType`.
- `Dashboard/src/app/features/dashboard/services/paramascotas-pos-analytics.service.spec.ts` cubre IDs de movimientos/metodos y validacion de tipo.
- `Dashboard/tools/check-architecture.mjs` bloquea que opciones POS o validadores de movimiento vuelvan a componentes visuales.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que opciones de movimiento y metodos de pago pertenecen al dominio POS.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health` y Playwright focal de `Venta en local` (`2/2`).
- `npx vitest run src/app/features/dashboard/services/paramascotas-pos-analytics.service.spec.ts` sigue bloqueado por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`); la spec compila mediante `type:check`.
- APISIX sirve el Dashboard con `base href="/dashboard/"` y bundle `main-B5Y2RRAR.js`.

### 2026-06-18 - Dashboard QA: Submenus robustos y opciones de producto centralizadas

Objetivo: corregir el caso reportado donde los menus principales funcionaban pero los submenus podian no cambiar de vista, y continuar la separacion modular de configuracion de catalogo.

Cambios:
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.ts` conserva `router.navigateByUrl`, pero ahora tambien cae al `href` publico real si Angular devuelve exito y la URL interna queda igual, cubriendo cancelaciones silenciosas bajo `/dashboard/`.
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.spec.ts` agrega cobertura para ese fallback de submenus replegados.
- `Dashboard/src/app/features/dashboard/services/paramascotas-product-form.service.ts` exporta `PARAMASCOTAS_PRODUCT_TYPE_OPTIONS` y `PARAMASCOTAS_PRODUCT_SPECIES_OPTIONS`; `ParamascotasPanelComponent` consume esas constantes en lugar de declarar arreglos locales.
- `Dashboard/tools/check-architecture.mjs` y `Dashboard/docs/API-FIRST-MODULES.md` documentan y protegen que esas opciones de producto no vuelvan a componentes visuales.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`, Playwright focal de submenus (`mobile`, `desktop`, `collapsed`, grupo activo) y Playwright autenticado por `https://paramascotasec.com/dashboard` (`tenant admin signs in with MFA and stays tenant-scoped`).
- APISIX sirve el Dashboard con `base href="/dashboard/"` y bundle `main-S5LIK7OQ.js`.
- `npx vitest run src/app/layout/shell/side-nav/side-nav.component.spec.ts` sigue bloqueado en este host por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`); las specs compilan mediante `type:check` y el flujo queda cubierto por Playwright.

### 2026-06-18 - Dashboard QA: Filtros de inventario fuera del componente

Objetivo: continuar la separacion API-first/modular sacando opciones operativas de inventario desde `ParamascotasPanelComponent`.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-inventory-analytics.service.ts` exporta `PARAMASCOTAS_INVENTORY_STATUS_OPTIONS`, `PARAMASCOTAS_INVENTORY_TYPE_OPTIONS` y `PARAMASCOTAS_INVENTORY_ACTION_OPTIONS`, ademas de exponerlas desde `ParamascotasInventoryAnalyticsService`.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` consume esas opciones centrales y elimina `INVENTORY_STATUS_OPTIONS`, `INVENTORY_TYPE_OPTIONS` e `INVENTORY_ACTION_OPTIONS` locales.
- `Dashboard/src/app/features/dashboard/services/paramascotas-inventory-analytics.service.spec.ts` cubre IDs y etiqueta critica de filtros.
- `Dashboard/tools/check-architecture.mjs` bloquea que opciones de inventario vuelvan a componentes visuales.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que opciones/filtros de inventario pertenecen a `ParamascotasInventoryAnalyticsService`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health` y Playwright focal de `catalog/inventory` (`1/1`).
- `npx vitest run src/app/features/dashboard/services/paramascotas-inventory-analytics.service.spec.ts` no arranco por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`); la spec compila mediante `type:check`.
- APISIX sirve el Dashboard con `base href="/dashboard/"` y bundle `main-QLL74THD.js`.

### 2026-06-18 - Dashboard QA: Presets de pausa de tienda fuera del componente

Objetivo: continuar la separacion API-first/modular sacando configuracion operativa fija de tienda desde `ParamascotasPanelComponent`.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-store-status-analytics.service.ts` exporta `PARAMASCOTAS_STORE_PAUSE_PRESETS`, `ParamascotasStorePausePreset` y lo expone desde `ParamascotasStoreStatusAnalyticsService`.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` consume los presets desde el servicio de dominio y elimina `STORE_PAUSE_PRESETS` local.
- `Dashboard/src/app/features/dashboard/services/paramascotas-store-status-analytics.service.spec.ts` cubre los IDs y mensaje esperado de presets.
- `Dashboard/tools/check-architecture.mjs` bloquea que `STORE_PAUSE_PRESETS` vuelva a componentes visuales.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que presets de pausa pertenecen al dominio de estado de tienda.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health` y Playwright focal de `operations/store-status` (`1/1`).
- `npx vitest run src/app/features/dashboard/services/paramascotas-store-status-analytics.service.spec.ts` no arranco por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`); la spec compila mediante `type:check`.
- APISIX sirve el Dashboard con `base href="/dashboard/"` y bundle `main-PIRD4QR6.js`.

### 2026-06-18 - Dashboard QA: Fallback robusto para submenus del sidebar

Objetivo: corregir el caso reportado donde los menus principales ya respondian, pero los submenus podian no cambiar de vista en el navegador del usuario.

Cambios:
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.ts` mantiene la navegacion interna por `router.navigateByUrl`, pero ahora usa el `href` publico real como fallback si Angular cancela o rechaza la navegacion del submenu.
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.spec.ts` agrega cobertura para el fallback de submenus replegados bajo base publica `/dashboard/`.
- `Dashboard/src/app/features/dashboard/services/paramascotas-order-state.service.ts` importa el tipo `ParamascotasOrderStatus`, corrigiendo una edicion parcial previa que bloqueaba `type:check`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`, Playwright focal de submenus (`mobile`, `desktop`, `collapsed`) y Playwright autenticado por `https://paramascotasec.com/dashboard` (`tenant admin signs in with MFA and stays tenant-scoped`).
- APISIX sirve el bundle nuevo `main-VZSLGKQC.js` con `<base href="/dashboard/"`.
- Vitest focal de `side-nav.component.spec.ts` no arranca en el host por la dependencia opcional local faltante `@rollup/rollup-linux-x64-gnu`; el caso queda cubierto por `type:check` y Playwright runtime.

### 2026-06-18 - Dashboard QA: Opciones de variantes de producto fuera del componente

Objetivo: continuar la separacion de catalogo moviendo la configuracion de ejes de variantes agrupadas fuera de `ParamascotasPanelComponent`.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-product-variant.service.ts` exporta `PARAMASCOTAS_PRODUCT_VARIANT_AXIS_OPTIONS` y lo expone desde `ParamascotasProductVariantService`.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` usa la constante central para `productVariantAxisOptions` y elimina `PRODUCT_VARIANT_AXIS_OPTIONS` local.
- `Dashboard/src/app/features/dashboard/services/paramascotas-product-variant.service.spec.ts` cubre los valores esperados de ejes de variante.
- `Dashboard/tools/check-architecture.mjs` bloquea que `PRODUCT_VARIANT_AXIS_OPTIONS` vuelva a componentes visuales.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que ejes/opciones de variante pertenecen a `ParamascotasProductVariantService`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health` y Playwright focal de `Productos` (`1/1`).
- `npx vitest run src/app/features/dashboard/services/paramascotas-product-variant.service.spec.ts` no arranco por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`); la spec compila mediante `type:check`.
- APISIX sirve el Dashboard con `base href="/dashboard/"` y bundle `main-VXXOBEBF.js`.

### 2026-06-18 - Dashboard QA: Cobertura de envios fuera del componente

Objetivo: completar el tramo de envios moviendo el calculo visual de cobertura de reglas de mapa fuera de `ParamascotasPanelComponent`.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-shipping-analytics.service.ts` agrega `coveragePercent()` y `paramascotasShippingCoveragePercent()` para calcular la barra de radio gratis/tarifa plana desde `ParamascotasShippingSettings`.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` delega `shippingCoveragePercent()` a `ParamascotasShippingAnalyticsService`.
- `Dashboard/src/app/features/dashboard/services/paramascotas-shipping-analytics.service.spec.ts` cubre cobertura normal y caso cero.
- `Dashboard/tools/check-architecture.mjs` bloquea que `shippingCoveragePercent` vuelva a componentes visuales.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que cobertura de reglas de mapa pertenece a `ParamascotasShippingAnalyticsService`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health` y Playwright focal de `Envios` (`1/1`).
- `npx vitest run src/app/features/dashboard/services/paramascotas-shipping-analytics.service.spec.ts` no arranco por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`); la spec compila mediante `type:check`.
- APISIX sirve el Dashboard con `base href="/dashboard/"` y bundle `main-4KX63SVJ.js`.

### 2026-06-18 - Dashboard QA: Payload de configuracion de envios fuera del componente

Objetivo: continuar la separacion API-first/modular moviendo defaults y payload sanitizado de configuracion de envios fuera de `ParamascotasPanelComponent`.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-settings-payload.service.ts` ahora centraliza `createDefaultParamascotasShippingSettings`, `normalizeParamascotasShippingSettings` y `paramascotasShippingSettingsPayload`.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` inicializa y guarda `shippingSettings` usando el servicio de payloads, manteniendo solo la validacion visible de direccion obligatoria y la llamada API.
- `Dashboard/src/app/features/dashboard/services/paramascotas-settings-payload.service.spec.ts` cubre defaults de envio y saneamiento de montos, coordenadas, radios, cooldowns y limites.
- `Dashboard/tools/check-architecture.mjs` bloquea defaults/normalizadores/payloads de `ShippingSettings` en componentes visuales.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que `shippingSettings` pertenece a `ParamascotasSettingsPayloadService`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health` y Playwright focal de `Envios` (`1/1`).
- `npx vitest run src/app/features/dashboard/services/paramascotas-settings-payload.service.spec.ts` no arranco por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`); la spec compila mediante `type:check`.
- APISIX sirve el Dashboard con `base href="/dashboard/"` y bundle `main-KM6LFFT4.js`.

### 2026-06-18 - Dashboard QA: Chart de categorias de inventario fuera del componente

Objetivo: seguir reduciendo acoplamiento visual/de dominio en inventario, moviendo el chart de capital por categoria fuera de `ParamascotasPanelComponent`.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-inventory-analytics.service.ts` ahora expone `categoryChart()` y `buildParamascotasInventoryCategoryChart()` con el chart de categorias, formato compacto de moneda y etiquetas recortadas.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` delega `inventoryCategoryChart` a `ParamascotasInventoryAnalyticsService` y elimina `buildInventoryCategoryChart` junto con helpers locales de chart.
- `Dashboard/src/app/features/dashboard/services/paramascotas-inventory-analytics.service.spec.ts` cubre el tipo de chart y serie principal del grafico de categorias.
- `Dashboard/tools/check-architecture.mjs` bloquea que `buildInventoryCategoryChart` vuelva a componentes visuales.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que charts de inventario pertenecen a `ParamascotasInventoryAnalyticsService`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health` y Playwright focal de inventario (`2/2`).
- `npx vitest run src/app/features/dashboard/services/paramascotas-inventory-analytics.service.spec.ts` no arranco por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`); la spec compila mediante `type:check`.
- APISIX sirve el Dashboard con `base href="/dashboard/"` y bundle `main-G5AI4KWP.js`.

### 2026-06-18 - Dashboard QA: Trazabilidad financiera fuera del componente

Objetivo: continuar la separacion API-first/modular sacando del componente del panel las reglas visibles de trazabilidad financiera y auditoria producto/pedido.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-traceability-analytics.service.ts` centraliza filas auditables de pedidos, incidencias de trazabilidad, severidades, tipos, filtros, resumen de cobertura y vinculos entre productos vendidos y pedidos.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` conserva estado visible, apertura de pedido/producto y llamadas API, pero delega calculos de documento faltante, pago, entrega, costo, margen, referencias y ficha de catalogo al servicio.
- `Dashboard/src/app/features/dashboard/services/paramascotas-traceability-analytics.service.spec.ts` cubre ordenes sin datos obligatorios, productos sin costo, referencias faltantes, filtros, etiquetas y resumen.
- `Dashboard/tools/check-architecture.mjs` bloquea que builders, tipos, interfaces o constantes de trazabilidad vuelvan a componentes visuales.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que trazabilidad debe vivir en servicios como `ParamascotasTraceabilityAnalyticsService`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health` y Playwright focal de `Reporte de trazabilidad` (`1/1`).
- `npx vitest run src/app/features/dashboard/services/paramascotas-traceability-analytics.service.spec.ts` no arranco por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`); la spec compila mediante `type:check`.
- APISIX sirve el Dashboard con `base href="/dashboard/"` y bundle `main-K5BSF4OZ.js`.

### 2026-06-18 - Dashboard QA: Analitica financiera fuera del componente

Objetivo: continuar la separacion API-first/modular sacando del componente del panel los derivados visibles de reportes financieros, tendencias, decisiones operativas y charts.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-financial-analytics.service.ts` centraliza KPIs de reportes, top de productos/categorias, pedidos recientes, anchos de barras, tendencias diarias/mensuales, totales por alcance, decisiones operativas y charts financieros.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` queda como orquestador de periodo/filtros/API y delega esos calculos al servicio de dominio, manteniendo al backend como fuente de verdad de datos financieros.
- `Dashboard/src/app/features/dashboard/services/paramascotas-financial-analytics.service.spec.ts` cubre ordenamiento, totales, seleccion de tendencia, decisiones y charts.
- `Dashboard/tools/check-architecture.mjs` bloquea que funciones/tipos/interfaces de analitica financiera vuelvan a componentes visuales.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que KPIs, tendencias, totales, decisiones y charts financieros deben vivir en servicios como `ParamascotasFinancialAnalyticsService`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health` y Playwright focal de reportes/submenus (`7/7`).
- `npx vitest run src/app/features/dashboard/services/paramascotas-financial-analytics.service.spec.ts` no arranco por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`); la spec compila mediante `type:check`.
- APISIX sirve el Dashboard con `base href="/dashboard/"` y bundle `main-GQJJDTHW.js`.

### 2026-06-18 - Dashboard QA: Analitica de gastos fuera del componente

Objetivo: reforzar la arquitectura API-first/modular separando reglas visibles de gastos de negocio del componente del panel y dejando el backend como fuente autoritativa de resumenes financieros.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-expense-analytics.service.ts` conserva la analitica de gastos en servicio de dominio y corrige el fallback de resumen: los totales/cantidades del API se respetan aunque sean `0`; solo se calcula localmente si el campo no existe.
- `Dashboard/src/app/features/dashboard/services/paramascotas-expense-analytics.service.spec.ts` cubre el caso de resumen API con valor cero autoritativo.
- `Dashboard/tools/check-architecture.mjs` ahora bloquea que funciones, tipos o interfaces de analitica/filtros/charts de gastos vuelvan a componentes visuales.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que resumenes, filtros, categorias, obligaciones y charts de gastos pertenecen a `ParamascotasExpenseAnalyticsService`, no al componente.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health` y Playwright focal de gastos (`1/1`).
- `npx vitest run src/app/features/dashboard/services/paramascotas-expense-analytics.service.spec.ts` no arranco por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`); la spec compila mediante `type:check`.
- APISIX sirve el Dashboard con `base href="/dashboard/"` y bundle `main-LTZ33WNV.js`.

### 2026-06-18 - Dashboard QA: Submenus del sidebar con enlaces robustos

Objetivo: corregir el caso reportado donde los menus principales del sidebar funcionaban, pero los submenus no navegaban de forma confiable.

Cambios:
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.html` reemplaza `routerLink` en enlaces del menu por `hrefForItem(...)` mas click explicito a `navigateMenuItem(...)`, tanto en submenus normales como en el flyout del sidebar replegado.
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.ts` retira `RouterLink` del componente y deja una sola ruta de navegacion controlada con `router.navigateByUrl`, preservando Ctrl/Cmd/Shift/Alt-click como enlaces normales del navegador.
- Los `href` visibles siguen respetando `base href="/dashboard/"`, mientras la navegacion SPA conserva la ruta interna y el query `tenant`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up` y `npm run docker:health`.
- `npx vitest run src/app/layout/shell/side-nav/side-nav.component.spec.ts` sigue bloqueado por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`); las specs compilan mediante `type:check`.
- Validado con Chromium real en `http://127.0.0.1:8081/dashboard/paramascotas-panel/reporting/general?tenant=demo`: sidebar replegado -> `Operacion` -> `Venta en local` navega a `/dashboard/paramascotas-panel/operations/local-sales?tenant=demo` y cierra el flyout; sidebar normal -> `Operacion` -> `Venta en local` tambien navega correctamente.
- APISIX sirve el Dashboard con `base href="/dashboard/"` y bundle `main-VDOGY7UK.js`.

### 2026-06-18 - Dashboard QA: Analitica de cotizaciones fuera del componente

Objetivo: seguir separando UI y dominio en `Cotizaciones`, moviendo estados, filtros, seguimiento, avisos y validaciones visibles fuera de `ParamascotasPanelComponent`.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-quotation-analytics.service.ts` centraliza estado de cotizacion, etiquetas/clases, total/unidades/contacto/direccion, estado de correo, resumenes, filas de estado, seguimiento comercial, filtros, charts, validaciones de conversion y avisos de correo/WhatsApp.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` conserva estado visible, seleccion, llamadas API, impresion y apertura de WhatsApp, pero delega derivados de cotizacion a `ParamascotasQuotationAnalyticsService`.
- `Dashboard/src/app/features/dashboard/services/paramascotas-quotation-analytics.service.spec.ts` cubre clasificacion de estados, totales, contacto, resumenes, status rows, filtros, follow-up, validaciones de conversion, avisos y charts.
- `Dashboard/tools/check-architecture.mjs` bloquea que reglas de analitica/estado de cotizaciones vuelvan a componentes.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que cotizaciones deben delegar estado, seguimiento, filtros, charts, conversion y avisos a servicios de dominio.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` ajusta el stub de impresion de cotizaciones para detectar el HTML imprimible con script `window.print`, alineado con `BrowserInteractionService`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health` y Playwright focal de cotizaciones (`3/3`).
- `npx vitest run src/app/features/dashboard/services/paramascotas-quotation-analytics.service.spec.ts` no arranco por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`); la spec compila mediante `type:check`.
- APISIX sirve el Dashboard con `base href="/dashboard/"` y bundle `main-X3HEFWHJ.js`.

### 2026-06-18 - Dashboard QA: Analitica POS y venta local fuera del componente

Objetivo: seguir separando UI y dominio en `Venta en local`, moviendo calculos visibles de POS fuera de `ParamascotasPanelComponent`.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-pos-analytics.service.ts` centraliza defaults del formulario de venta local, conversion producto API -> linea POS, catalogo buscable, cantidades/costo/utilidad, totales visibles, resumen de turno, filas de flujo, readiness de venta, clases de stock y chart de cobro.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` conserva estado, llamadas API y firmas usadas por el template, pero delega esos calculos a `ParamascotasPosAnalyticsService`.
- `Dashboard/src/app/features/dashboard/services/paramascotas-pos-analytics.service.spec.ts` cubre defaults, ranking de catalogo POS, totales con/sin quote, resumen/flujo/chart POS y readiness de venta.
- `Dashboard/tools/check-architecture.mjs` bloquea que defaults, mapeos, totales, readiness o charts POS vuelvan a componentes.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que los calculos visibles de POS pertenecen al servicio de dominio.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health` y Playwright focal de venta local (`2/2`).
- `npx vitest run src/app/features/dashboard/services/paramascotas-pos-analytics.service.spec.ts` no arranco por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`); la spec compila mediante `type:check`.
- APISIX sirve el Dashboard con `base href="/dashboard/"` y bundle `main-ZVF7BBWW.js`.

### 2026-06-18 - Dashboard QA: Ficha de producto fuera del componente

Objetivo: seguir reduciendo acoplamiento en `ParamascotasPanelComponent` moviendo reglas visibles de `Ficha de producto` a un servicio de dominio, alineado con la arquitectura API-first/modular.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-product-page.service.ts` centraliza defaults de configuracion, seleccion de producto de preview, URL/alt/contador de imagenes, completitud publicable, resumen del catalogo, filas de confianza, porcentaje de envio gratis y readiness operativo.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` conserva senales, carga/guardado por API y firmas usadas por el template, pero delega las reglas de ficha a `ParamascotasProductPageService`.
- `Dashboard/src/app/features/dashboard/services/paramascotas-product-page.service.spec.ts` cubre defaults, trust rows, preview, resumen, publicacion, readiness e imagenes/cache key.
- `Dashboard/tools/check-architecture.mjs` bloquea que helpers de ficha de producto vuelvan a componentes visuales.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que defaults/readiness/completitud/resumen de ficha publica pertenecen a `ParamascotasProductPageService`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health` y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "paramascotas route /paramascotas-panel/catalog/product-page loads without fatal operational errors"` (`1/1`).
- `npx vitest run src/app/features/dashboard/services/paramascotas-product-page.service.spec.ts` no arranco por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`); la spec compila mediante `type:check`.
- APISIX sirve el Dashboard con `base href="/dashboard/"` y bundle `main-FMZSTSFI.js`.

### 2026-06-18 - Dashboard QA: Estado vigente submenus del sidebar

Objetivo: dejar corregido el caso donde los menus principales del sidebar funcionaban, pero los submenus no navegaban de forma confiable, especialmente en sidebar replegado y con el Dashboard publicado bajo `/dashboard`.

Cambios:
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.{ts,html}` vuelve a usar `routerLink` en enlaces directos, submenus normales y flyout del sidebar replegado, con `queryParams` del tenant calculados por `TenantResolverService`.
- El codigo propio ya no cancela el clic para navegar en los submenus; solo cierra el sidebar o el flyout despues de un clic normal. Esto evita estados donde el hijo visible no ejecuta navegacion aunque el menu principal abra correctamente.
- Los `href` publicos quedan generados por Angular bajo el `base href="/dashboard/"`, manteniendo Ctrl/Cmd/Shift/Alt-click como comportamiento nativo del navegador.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`.
- `npx vitest run src/app/layout/shell/side-nav/side-nav.component.spec.ts` no arranco por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`), problema ya conocido del ambiente.
- Pasaron `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "sidebar submenus|submenu links|mobile sidebar|desktop sidebar submenus|collapsed active group|collapsed sidebar switches"` (`6/6`), cubriendo submenus normales, moviles y replegados bajo `/dashboard`.
- Paso `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-auth.spec.ts --grep "paramascotas tenant admin signs in with MFA and stays tenant-scoped"` (`1/1`), validando login real por `https://paramascotasec.com/dashboard`, MFA y navegacion del flyout replegado por Gateway.
- Bundle vigente publicado por el Dashboard y APISIX: `main-YWQL6VKM.js`.

### 2026-06-18 - Dashboard QA: Catalogos operativos fuera del componente

Objetivo: seguir separando UI y dominio en el panel Paramascotas moviendo normalizacion, validacion y analitica de catalogos operativos fuera de `ParamascotasPanelComponent`.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-reference-catalog.service.ts` centraliza el registro de catalogos reutilizables, requisitos de imagen publica por categoria, defaults de draft/data, normalizacion, validacion de duplicados/contactos/proveedores, edicion/remocion, filas seleccionadas, metricas y charts.
- `ParamascotasPanelComponent` delega esas reglas al nuevo `ParamascotasReferenceCatalogService` y conserva estado visible, subida de imagenes y llamada al API.
- `Dashboard/src/app/features/dashboard/services/paramascotas-reference-catalog.service.spec.ts` cubre normalizacion, resumenes, validaciones de proveedores/categorias, add/update/remove/toggle y filtros/filas.
- `Dashboard/tools/check-architecture.mjs` bloquea que reglas de catalogos operativos vuelvan a componentes visuales.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que catalogos operativos deben vivir en `ParamascotasReferenceCatalogService`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health` y Playwright focal de catalogos operativos con `5/5`.
- `npx vitest run src/app/features/dashboard/services/paramascotas-reference-catalog.service.spec.ts` sigue bloqueado por la dependencia opcional faltante de Rollup `@rollup/rollup-linux-x64-gnu`; la spec queda compilada por `type:check`.
- APISIX sirve el Dashboard con `base href="/dashboard/"` y bundle `main-5ZESRCNS.js`.

### 2026-06-18 - Dashboard QA: Analitica visible de inventario fuera del componente

Objetivo: seguir reduciendo acoplamiento del panel Paramascotas moviendo la transformacion visible de inventario fuera de `ParamascotasPanelComponent`, alineado con la arquitectura API-first/modular.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-inventory-analytics.service.ts` centraliza filas enriquecidas de inventario, cruces con `inventory/intelligence`, filtros rapidos, resumenes, categorias/proveedores, acciones recomendadas, razones operativas y barras de capital.
- `ParamascotasPanelComponent` delega esa analitica al nuevo servicio y conserva solo estado de UI, senales, etiquetas/clases visuales y acciones de pantalla.
- `Dashboard/src/app/features/dashboard/services/paramascotas-inventory-analytics.service.spec.ts` cubre matching por IDs legacy, estados de stock/vencimiento, filtros, resumenes, categorias/proveedores y acciones sugeridas.
- `Dashboard/tools/check-architecture.mjs` bloquea que builders o interfaces de analitica visible de inventario vuelvan a componentes.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que la analitica visible de inventario debe vivir en `ParamascotasInventoryAnalyticsService`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health` y Playwright focal de inventario (`catalog/inventory`, detalle auditado de facturas de compra y deduplicacion de resumen) con `3/3`.
- `npx vitest run src/app/features/dashboard/services/paramascotas-inventory-analytics.service.spec.ts` sigue bloqueado por la dependencia opcional faltante de Rollup `@rollup/rollup-linux-x64-gnu`; la spec queda compilada por `type:check`.
- APISIX sirve el Dashboard con `base href="/dashboard/"` y bundle `main-226HPS5F.js`.

### 2026-06-18 - Dashboard QA: Analitica de ranking de productos fuera del componente

Objetivo: continuar la arquitectura API-first/modular moviendo conversion de ranking, cruces con inventario, acciones recomendadas, filtros, resumenes y lideres de productos fuera de `ParamascotasPanelComponent`.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-product-ranking-analytics.service.ts` centraliza filas de ranking mensual/historico/reportes, cruce con inventario por `product_id`/`legacy_id`, decisiones operativas, acciones destacadas, filtros, resumen financiero, barras y lideres por unidades/ingreso/utilidad/margen.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` conserva carga API, seleccion de periodo/filtros, exportacion CSV y navegacion, pero delega la analitica a `ParamascotasProductRankingAnalyticsService`.
- `Dashboard/src/app/features/dashboard/services/paramascotas-product-ranking-analytics.service.spec.ts` cubre conversion de filas, cruce con inventario, acciones, filtros, resumen financiero y lideres.
- `Dashboard/tools/check-architecture.mjs` bloquea que la analitica de ranking de productos vuelva a componentes visuales.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que el ranking de productos debe vivir en el servicio de dominio.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health` y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "paramascotas route /paramascotas-panel/reporting/sales-ranking loads without fatal operational errors|paramascotas sales ranking joins grouped variant inventory by internal alias"` (`2/2`).
- El gateway QA local sirve el bundle del Dashboard `main-PJ534MEL.js`.
- `npx vitest run src/app/features/dashboard/services/paramascotas-product-ranking-analytics.service.spec.ts` sigue bloqueado por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`); la spec compila por `npm run type:check`.

### 2026-06-18 - Dashboard QA: Analitica fiscal de catalogo fuera del componente

Objetivo: continuar la arquitectura API-first/modular moviendo filas, resumenes, atencion y graficos de impuestos fuera de `ParamascotasPanelComponent`.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-tax-analytics.service.ts` centraliza filas auditables por producto, resumen gravado/exento/sin PVP, filas de atencion, labels/classes y charts de IVA por estado/categoria.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` conserva la configuracion fiscal visible, guardado API y apertura del producto relacionado, pero delega la analitica fiscal al servicio.
- `Dashboard/src/app/features/dashboard/services/paramascotas-tax-analytics.service.spec.ts` cubre clasificacion de productos, resumen, filas de atencion, labels/classes y charts.
- `Dashboard/tools/check-architecture.mjs` bloquea que `TaxProductRow`, `TaxSummary` o builders de analitica fiscal vuelvan a componentes visuales.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que la analitica fiscal de catalogo debe vivir en `ParamascotasTaxAnalyticsService`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health` y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "paramascotas route /paramascotas-panel/finance/taxes loads without fatal operational errors"` (`1/1`).
- El gateway QA local sirve el bundle del Dashboard `main-6F5DIAH2.js`.
- `npx vitest run src/app/features/dashboard/services/paramascotas-tax-analytics.service.spec.ts` sigue bloqueado por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`); la spec compila por `npm run type:check`.

### 2026-06-18 - Dashboard QA: Submenus del sidebar replegado con RouterLink nativo

Objetivo: corregir el caso reportado donde los menus principales del sidebar ya respondian, pero los submenus no navegaban de forma confiable al seleccionarlos.

Cambios:
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.html` cambia los submenus normales y el flyout del sidebar replegado a `routerLink` + `queryParams`, dejando que Angular genere y procese el enlace real bajo la base publica `/dashboard/`.
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.ts` deja de cancelar el click del submenu para navegar manualmente y solo difiere el cierre visual del sidebar/flyout hasta que `routerLink` procese la navegacion.
- Se conserva el comportamiento esperado de navegador para clicks modificados y enlaces con tenant.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health` y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "paramascotas collapsed sidebar submenus navigate for ecommerce groups|paramascotas desktop sidebar submenus navigate under the public dashboard base path|paramascotas mobile sidebar expands submenu links and navigates"` (`3/3`).
- Verificado por `https://paramascotasec.com/dashboard/` resolviendo a `192.168.100.229`: el Dashboard sirve `<base href="/dashboard/">` y el bundle `main-B6U5EPVV.js`.

### 2026-06-18 - Dashboard QA: Analitica de sesiones fuera del componente

Objetivo: continuar la arquitectura API-first/modular moviendo reglas de duracion, riesgo y graficos de sesiones fuera de `ParamascotasPanelComponent`.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-session-analytics.service.ts` centraliza presets de seguridad, resumen de riesgo, porcentajes de rango, etiquetas/clases y charts Apex de duracion/riesgo.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` conserva aplicacion de presets, guardado API y estado de UI, pero delega la analitica al servicio de dominio.
- `Dashboard/src/app/features/dashboard/services/paramascotas-session-analytics.service.spec.ts` cubre resumen, clasificacion de riesgo/perfil, presets, labels/classes y charts.
- `Dashboard/tools/check-architecture.mjs` bloquea que reglas o charts de sesiones vuelvan a componentes visuales.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que sesiones/seguridad debe usar `ParamascotasSessionAnalyticsService`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health` y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "paramascotas route /paramascotas-panel/monitoring/security-settings loads without fatal operational errors"` (`1/1`).
- El gateway QA local sirve el bundle del Dashboard `main-E35AW43U.js`.
- `npx vitest run src/app/features/dashboard/services/paramascotas-session-analytics.service.spec.ts` sigue bloqueado por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`); la spec compila por `npm run type:check`.

### 2026-06-18 - Dashboard QA: Analitica de estado de tienda fuera del componente

Objetivo: continuar la arquitectura API-first/modular moviendo reglas operativas de ventas activas/pausadas fuera de `ParamascotasPanelComponent`.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-store-status-analytics.service.ts` centraliza resumen de estado de tienda, pedidos activos/cancelados, ventas del mes, canales impactados, advertencias y charts Apex.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` conserva la configuracion visible, guardado API y navegacion hacia pedidos/cotizaciones/POS, pero delega los calculos al servicio de dominio.
- `Dashboard/src/app/features/dashboard/services/paramascotas-store-status-analytics.service.spec.ts` cubre resumen, clasificacion de pedidos, canales impactados y charts.
- `Dashboard/tools/check-architecture.mjs` bloquea que reglas o charts de estado de tienda vuelvan a componentes visuales.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que estado de tienda debe usar `ParamascotasStoreStatusAnalyticsService`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health` y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "paramascotas route /paramascotas-panel/operations/store-status loads without fatal operational errors"` (`1/1`).
- El gateway QA local sirve el bundle del Dashboard `main-TXZBN426.js`.
- `npx vitest run src/app/features/dashboard/services/paramascotas-store-status-analytics.service.spec.ts` sigue bloqueado por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`); la spec compila por `npm run type:check`.

### 2026-06-18 - Dashboard QA: Analitica de alertas fuera del componente

Objetivo: continuar la arquitectura API-first/modular moviendo reglas de monitoreo operativo y alertas fuera de `ParamascotasPanelComponent`.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-alert-analytics.service.ts` centraliza la fusion de alertas desde stats, inventario y catalogo, normalizacion de severidad/fuente, filtros, resumenes, salud de inventario, labels/classes y charts Apex.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` conserva solo filtros visibles y acciones de navegacion al modulo relacionado; delega calculos de alertas al servicio.
- `Dashboard/src/app/features/dashboard/services/paramascotas-product-inventory.service.ts` exporta `paramascotasInventoryActionLabel()` para reutilizar etiquetas de acciones de inventario sin duplicarlas en alertas.
- `Dashboard/src/app/features/dashboard/services/paramascotas-alert-analytics.service.spec.ts` cubre construccion de alertas, filtros, resumen, salud de inventario y charts.
- `Dashboard/tools/check-architecture.mjs` bloquea que reglas o charts de alertas vuelvan a componentes visuales.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que alertas/monitoreo operativo debe vivir en `ParamascotasAlertAnalyticsService`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health` y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "paramascotas route /paramascotas-panel/monitoring/alerts loads without fatal operational errors"` (`1/1`).
- El gateway QA local sirve el bundle del Dashboard `main-F25VHFV4.js`.
- `npx vitest run src/app/features/dashboard/services/paramascotas-alert-analytics.service.spec.ts` sigue bloqueado por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`); la spec compila por `npm run type:check`.

### 2026-06-18 - Dashboard QA: Analitica de envios fuera del componente

Objetivo: continuar la arquitectura API-first/modular moviendo calculos, foco operativo y graficos de envios fuera de `ParamascotasPanelComponent`.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-shipping-analytics.service.ts` centraliza resumen visible, listas de pedidos a domicilio/retiro, labels y conteos de foco, ademas de los charts de canal y revenue de envios.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` elimina builders locales de graficos de envios y delega los computeds al servicio de dominio.
- `Dashboard/src/app/features/dashboard/services/paramascotas-shipping-analytics.service.spec.ts` cubre resumen visible, listas de foco, conteos y opciones de chart.
- `Dashboard/tools/check-architecture.mjs` bloquea que reglas, listas, focos o charts de envios vuelvan a componentes visuales.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que envios debe vivir en `ParamascotasShippingAnalyticsService`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health` y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "paramascotas route /paramascotas-panel/operations/shipments loads without fatal operational errors"` (`1/1`).
- El gateway QA local sirve el bundle del Dashboard `main-FPXUZNUH.js`.
- `npx vitest run src/app/features/dashboard/services/paramascotas-shipping-analytics.service.spec.ts` sigue bloqueado por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`); la spec compila por `npm run type:check`.

### 2026-06-18 - Dashboard QA: Submenus replegados navegan con click explicito

Objetivo: corregir que los menus principales del sidebar funcionaran, pero los submenus del menu replegado no navegaran de forma confiable al seleccionarlos.

Cambios:
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.html` cambia los enlaces de submenus normales y flyout replegado para usar `href` real calculado con base `/dashboard` y navegar por `navigateSubmenuItem()` en clicks simples.
- Se conserva el comportamiento de navegador para clicks modificados o abrir en nueva pestana, y se mantiene el cierre del flyout/sidebar despues de iniciar la navegacion Angular.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health` y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "collapsed sidebar submenus|collapsed submenu links|collapsed active group submenu"` (`3/3`).
- El gateway QA local sirve el bundle del Dashboard `main-SIMGQKGR.js`.
- `npx vitest run src/app/layout/shell/side-nav/side-nav.component.spec.ts` sigue bloqueado por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`); la spec compila por `npm run type:check`.

### 2026-06-18 - Dashboard QA: Analitica de facturacion SRI fuera del componente

Objetivo: continuar la arquitectura API-first/modular moviendo reglas de facturacion, RIDE y ambiente SRI fuera de `ParamascotasPanelComponent`, sin ejecutar pruebas contra SRI produccion.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-billing-analytics.service.ts` centraliza filtros de facturas, resumenes, periodos, ambiente SRI (`pruebas/produccion/sin ambiente/otro`), estado PDF/correo, bloqueo de reemision en QA, labels/classes y charts Apex.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` conserva la carga API, seleccion visible, apertura de PDF y accion de anular/reemitir, pero delega calculos y reglas de ambiente al servicio.
- `Dashboard/src/app/features/dashboard/services/paramascotas-billing-analytics.service.spec.ts` cubre resumenes, filtros, estado de correo, periodos, charts y bloqueo de reemision marcada como produccion cuando el dashboard corre en QA/development.
- `Dashboard/tools/check-architecture.mjs` bloquea que reglas/charts de facturacion SRI vuelvan a componentes visuales.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que facturacion/SRI debe usar `ParamascotasBillingAnalyticsService`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health` y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "paramascotas route /paramascotas-panel/operations/billing-rides loads without fatal operational errors|paramascotas billing rides"` (`4/4`).
- Las pruebas e2e ejecutadas no envian correo ni reemiten comprobantes; validan visualizacion, correos pendientes/enviados y bloqueo local antes de mutacion para comprobantes marcados como ambiente produccion.
- `npx vitest run src/app/features/dashboard/services/paramascotas-billing-analytics.service.spec.ts` sigue bloqueado por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`); la spec compila por `npm run type:check`.
- El gateway QA local sirve el nuevo bundle del Dashboard `main-R7N3SSYV.js`.

### 2026-06-18 - Dashboard QA: Analitica del resumen Paramascotas fuera del componente

Objetivo: continuar la separacion API-first/modular retirando de `ParamascotasBackendComponent` calculos de tendencia, inventario, ranking y drilldowns que pertenecen a un servicio del dominio del resumen.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-backend-analytics.service.ts` centraliza charts de tendencia/inventario/ranking, lideres de productos por unidades/ingreso/utilidad/margen, etiquetas y clases de estado/inventario, preview de catalogo y filtros de drilldown.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-backend/paramascotas-backend.component.ts` queda como orquestador de estado, refresh y acciones de UI; delega analitica al nuevo servicio y sigue usando `ParamascotasOrderAnalyticsService` para el chart agregado de estados de pedidos.
- `Dashboard/src/app/features/dashboard/services/paramascotas-backend-analytics.service.spec.ts` cubre lideres, drilldowns, etiquetas/clases y opciones de charts.
- `Dashboard/tools/check-architecture.mjs` bloquea que builders y tipos de analitica del resumen Paramascotas vuelvan a componentes visuales.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que tendencias, inventario agregado, ranking/lideres y drilldowns del resumen pertenecen a `ParamascotasBackendAnalyticsService`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "paramascotas route /paramascotas-backend loads without fatal operational errors"` (`1/1`) y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-backend-layout.spec.ts` (`3/3`).
- `npx vitest run src/app/features/dashboard/services/paramascotas-backend-analytics.service.spec.ts` sigue bloqueado por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`); la spec compila por `npm run type:check`.
- El gateway QA local sirve el nuevo bundle del Dashboard `main-7B6UW6UJ.js`.

### 2026-06-18 - Dashboard QA: Analitica de pedidos fuera del componente

Objetivo: seguir limpiando `ParamascotasPanelComponent` para que pedidos no mezcle UI con filtros, totales, breakdowns y graficos de dominio.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-order-analytics.service.ts` centraliza filtros combinados de pedidos por rango/busqueda/canal/pago, filtro por estado, conteos, totales, ticket promedio, tarjetas resumen, filas de estado, desgloses, previews prioritarios y charts Apex.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` conserva senales, paginacion y callbacks de etiquetas, pero delega analitica de pedidos al nuevo servicio.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-backend/paramascotas-backend.component.ts` tambien delega el chart agregado de estados de pedidos al mismo servicio para evitar duplicar labels/colores.
- `Dashboard/src/app/features/dashboard/services/paramascotas-order-analytics.service.spec.ts` cubre filtros, aliases de estado, totales, resumenes, desgloses, ordenamiento operativo y opciones de charts.
- `Dashboard/tools/check-architecture.mjs` bloquea que builders/estructuras de analitica de pedidos vuelvan a componentes visuales.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que la analitica operativa de pedidos pertenece a `ParamascotasOrderAnalyticsService`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "paramascotas route /(paramascotas-backend|paramascotas-panel/operations/admin-orders) loads without fatal operational errors"` (`2/2`) y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-backend-layout.spec.ts` (`3/3`).
- `npx vitest run src/app/features/dashboard/services/paramascotas-order-analytics.service.spec.ts` sigue bloqueado por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`); la spec compila por `npm run type:check`.
- El gateway QA local sirve el nuevo bundle del Dashboard `main-CVXD4NCT.js`.

### 2026-06-18 - Dashboard QA: Analitica de usuarios fuera del componente

Objetivo: continuar la separacion API-first/modular moviendo reglas de usuarios fuera de `ParamascotasPanelComponent`.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-user-analytics.service.ts` centraliza filtros por rol/estado, busqueda operativa, resumen de usuarios, filas de roles/seguridad/revenue, tarjetas destacadas, iniciales, bloqueo, verificacion, direccion, telefono, busqueda de pedidos y graficos Apex.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` mantiene filtros, paginacion y acciones visibles, pero delega calculos de usuarios al servicio.
- `Dashboard/src/app/features/dashboard/services/paramascotas-user-analytics.service.spec.ts` cubre filtros, resumenes, bloqueo por seguridad, revenue, direccion, busqueda y charts.
- `Dashboard/tools/check-architecture.mjs` bloquea que la analitica de usuarios vuelva a componentes visuales.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que segmentacion, seguridad y revenue de usuarios pertenecen a `ParamascotasUserAnalyticsService`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health` y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "paramascotas route /paramascotas-panel/(catalog/users|finance/discount-codes)"` (`2/2`).
- `npx vitest run src/app/features/dashboard/services/paramascotas-user-analytics.service.spec.ts src/app/features/dashboard/services/paramascotas-discount-analytics.service.spec.ts` sigue bloqueado por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`); ambas specs compilan por `npm run type:check`.
- El gateway QA local sirve el nuevo bundle del Dashboard `main-JDM4H6E7.js`.

### 2026-06-18 - Dashboard QA: Analitica de cupones fuera del componente

Objetivo: seguir moviendo reglas de negocio fuera de `ParamascotasPanelComponent` y dejar la pantalla de cupones alineada con la arquitectura API-first/modular.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-discount-analytics.service.ts` centraliza estados operativos de cupones (`activo`, `inactivo`, `agotado`, `programado`, `vencido`), resumenes, filas de estado, filtros, filas de atencion, clases derivadas y graficos Apex.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` conserva senales de UI y acciones, pero delega analitica de cupones al servicio.
- `Dashboard/src/app/features/dashboard/services/paramascotas-discount-analytics.service.spec.ts` cubre estados, resumenes, filtros, atencion y opciones de graficos.
- `Dashboard/tools/check-architecture.mjs` bloquea que esa analitica vuelva a componentes visuales.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que la analitica operativa de cupones pertenece a `ParamascotasDiscountAnalyticsService`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health` y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "paramascotas route /paramascotas-panel/finance/discount-codes"` (`1/1`).
- `npx vitest run src/app/features/dashboard/services/paramascotas-discount-analytics.service.spec.ts` no pudo arrancar por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`); la spec compila por `npm run type:check`.
- El gateway QA local sirve el nuevo bundle del Dashboard `main-HSRD23TN.js`.

### 2026-06-18 - Dashboard QA: Submenus del sidebar con navegacion Angular real

Objetivo: corregir la navegacion de submenus del dashboard, especialmente en menu replegado y en grupos no cubiertos por las pruebas previas.

Cambios:
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.html` reemplaza la navegacion manual de submenus por `routerLink` + `queryParams`, dejando el cierre del menu/flyout como efecto visual y sin cancelar el click del enlace.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` amplia la cobertura de submenus para desktop y menu replegado, incluyendo `Precios y finanzas` y `Monitoreo`, ademas de Reportes/Catalogo/Operacion.
- Se redeplego solo el contenedor `dashboard` con `npm run docker:up`; el gateway QA local sirve el bundle `main-HD6RIDUX.js`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "submenu|sidebar submenus|mobile sidebar"` (`6/6`) y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-auth.spec.ts --grep "tenant admin signs in with MFA"` (`1/1`).
- Verificado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229` que `/dashboard/` entrega el nuevo bundle `main-HD6RIDUX.js`.

### 2026-06-18 - Dashboard QA: Analitica Productos x Compra fuera del componente

Objetivo: seguir desacoplando `ParamascotasPanelComponent` y mover reglas de negocio de `Productos x Compra` a un servicio de dominio de catalogo/inventario.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-product-purchase-analytics.service.ts` centraliza filas de productos vs compras, cruces con ventas del reporte, filtros `con/sin`, riesgos de compra, resumen, pedidos relacionados, lotes, totales de facturas de compra y graficos de ventas/unidades.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` conserva la seleccion de filtros, carga de detalle por API y callbacks visuales de imagen, pero delega los calculos al servicio.
- `Dashboard/src/app/features/dashboard/services/paramascotas-product-purchase-analytics.service.spec.ts` cubre construccion de filas, filtros de riesgo, resumen, pedidos relacionados, orden de lotes y totales/mismatch de factura.
- `Dashboard/tools/check-architecture.mjs` bloquea que la analitica de `Productos x Compra` vuelva a componentes.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que esa analitica pertenece a `ParamascotasProductPurchaseAnalyticsService`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `git diff --check` focal, `npm run docker:up`, `npm run docker:health` y Playwright `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "paramascotas route /paramascotas-panel/reporting/products-purchases"` (`1/1`).
- El Dashboard reconstruido sirve `<base href="/dashboard/">` y bundle `main-AJO2BKHU.js` tanto en `http://127.0.0.1:8081/dashboard/` como por APISIX con `curl -k --resolve paramascotasec.com:443:192.168.100.229 https://paramascotasec.com/dashboard/`.
- `npx vitest run src/app/features/dashboard/services/paramascotas-product-purchase-analytics.service.spec.ts` no arranco por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`); la spec compila mediante `type:check`.
- No se tocaron backend, DB, Gateway, Facturador, SRI, certificados ni production.

### 2026-06-18 - Dashboard QA: Formulario y payload de producto fuera del componente

Objetivo: avanzar la arquitectura API-first/modular sacando reglas de formulario, payload, imagenes y SEO de producto desde `ParamascotasPanelComponent` hacia un servicio de dominio.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-product-form.service.ts` centraliza defaults de formulario, conversion API -> formulario, validacion antes de guardar, sanitizacion del payload, normalizacion de imagenes, tamanos esperados, alt text, SEO y validacion de archivos.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` consume helpers del servicio para crear/editar/duplicar/guardar productos y para preparar imagenes, sin declarar esas reglas localmente.
- `Dashboard/src/app/features/dashboard/services/paramascotas-product-form.service.spec.ts` cubre defaults, conversion desde producto API, rechazo de SKU duplicado, sanitizacion de variantes/imagenes/SEO/factura de compra y validacion de colecciones/archivos de imagen.
- `Dashboard/tools/check-architecture.mjs` bloquea que factories, validadores, normalizadores de imagen, SEO o payload de producto vuelvan a componentes.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que formularios/payloads de producto pertenecen a `ParamascotasProductFormService`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:health`, `git diff --check` focal y Playwright `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "paramascotas route /paramascotas-panel/catalog/products"` (`1/1`).
- Verificado que `ParamascotasPanelComponent` ya no declara las funciones bloqueadas por el guardrail y que el Dashboard sigue sirviendo `<base href="/dashboard/">` con bundle `main-4HCNPYNU.js` por `http://127.0.0.1:8081/dashboard/` y por APISIX (`paramascotasec.com -> 192.168.100.229`).
- `npx vitest run src/app/features/dashboard/services/paramascotas-product-form.service.spec.ts` no arranco por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`); la spec compila mediante `type:check`.
- No se tocaron backend, DB, Gateway, Facturador, SRI, certificados ni production.

### 2026-06-18 - Dashboard QA: Submenus del sidebar con navegacion explicita de hijos

Objetivo: corregir el caso reportado donde los menus principales del sidebar funcionaban, pero los submenus no respondian de forma confiable en el navegador del usuario.

Cambios:
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.html` deja los submenus normales y del flyout replegado con `href` publico calculado por `routeHref(...)`, manteniendo URLs reales bajo `/dashboard/`.
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.ts` agrega `navigateSubmenuItem(...)`, que en click normal ejecuta `router.navigateByUrl(...)` y cierra sidebar/flyout, pero conserva Ctrl/Cmd/Shift/Alt-click como enlace normal del navegador.
- Los items principales del menu siguen con `RouterLink`; el cambio queda acotado a hijos de submenu para no alterar lo que ya funcionaba.

Decision:
- Esta entrada reemplaza la decision previa de depender solo de `RouterLink` nativo para submenus. El comportamiento final es `href` real + navegacion explicita para clicks normales de submenus.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `git diff --check` focal, `npm run docker:up`, `npm run docker:health`, Playwright local `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "sidebar submenus|submenu links|submenus navigate|mobile sidebar expands"` (`4/4`) y Playwright autenticado por `https://paramascotasec.com/dashboard` `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-auth.spec.ts --grep "tenant admin signs in with MFA and stays tenant-scoped"` (`1/1`).
- El Dashboard reconstruido sirve `<base href="/dashboard/">` y bundle `main-4HCNPYNU.js` tanto en `http://127.0.0.1:8081/dashboard/` como por APISIX con `curl -k --resolve paramascotasec.com:443:192.168.100.229 https://paramascotasec.com/dashboard/`.
- `npx vitest run src/app/layout/shell/side-nav/side-nav.component.spec.ts` no arranco por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`); la spec compila mediante `type:check`.
- No se tocaron backend, DB, Gateway, Facturador, SRI, certificados ni production.

### 2026-06-18 - Dashboard QA: Reglas de variantes agrupadas fuera del componente

Objetivo: avanzar la arquitectura API-first/modular sacando de `ParamascotasPanelComponent` reglas de negocio del catalogo, especialmente variantes y productos agrupados.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-product-variant.service.ts` centraliza normalizacion de tipo/categoria, medidas, ejes de variante, nombre base, `variantGroupKey`, resumen de agrupacion, duplicacion de variantes y validacion de valores repetidos.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` deja de declarar esas reglas y consume helpers del servicio para mostrar resumen de variante, duplicar productos, validar y sanitizar atributos antes de guardar.
- `Dashboard/src/app/features/dashboard/services/paramascotas-product-variant.service.spec.ts` cubre normalizacion legacy, metadata de productos agrupados, accesorios por color/talla, renombrado de duplicados y rechazo de variante repetida.
- `Dashboard/tools/check-architecture.mjs` bloquea que las reglas de variantes agrupadas vuelvan a componentes.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que variantes agrupadas pertenecen a `ParamascotasProductVariantService`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`, `git diff --check` focal y Playwright `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "paramascotas route /paramascotas-panel/catalog/products"` (`1/1`).
- El Dashboard reconstruido sirve `<base href="/dashboard/">` y bundle `main-X4NL2II5.js`; verificado tambien por APISIX con `curl -k --resolve paramascotasec.com:443:192.168.100.229 https://paramascotasec.com/dashboard/`.
- `npx vitest run src/app/features/dashboard/services/paramascotas-product-variant.service.spec.ts` no arranco por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`); la spec compila mediante `type:check`.
- No se tocaron backend, DB, Gateway, Facturador, SRI, certificados ni production.

### 2026-06-18 - Dashboard QA: Submenus del sidebar con RouterLink nativo

Objetivo: corregir el caso reportado donde los menus principales del sidebar funcionaban, pero los submenus no navegaban de forma confiable en el dashboard publicado bajo `/dashboard/`.

Cambios:
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.html` deja los submenus normales y los submenus del flyout replegado como enlaces Angular reales con `[routerLink]` y `[queryParams]`, igual que los items principales.
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.ts` elimina la navegacion manual de submenus (`navigateFromLink`, `navigateToItem` y fallback `location.assign`) para no bloquear el click normal ni pelear con el base path publico.
- Los links siguen cerrando el sidebar/flyout despues de un click normal mediante `closeNavigationAfterLinkClick`, pero clicks modificados (`Ctrl`, `Meta`, `Shift`, etc.) quedan como enlaces normales del navegador.

Decision:
- Esta entrada reemplaza la decision previa de "navegacion controlada" para submenus. El comportamiento final aceptado es usar `RouterLink` nativo con `tenant` en query params, y reservar la navegacion manual solo para acciones que no sean enlaces.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, `git diff --check` focal y Playwright `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "collapsed sidebar submenus|collapsed active group submenu|desktop sidebar submenus|mobile sidebar expands submenu"` (`4/4`).
- El Dashboard reconstruido sirve `<base href="/dashboard/">` y bundle `main-EUAUQDOA.js`; verificado en `http://127.0.0.1:8081/dashboard/` y por APISIX con `curl -k --resolve paramascotasec.com:443:192.168.100.229 https://paramascotasec.com/dashboard/`.
- No se tocaron backend, DB, Gateway, Facturador, SRI, certificados ni production.

### 2026-06-18 - Dashboard QA: Estado y filtros de pedidos fuera del componente

Objetivo: seguir reduciendo logica de negocio en `ParamascotasPanelComponent`, moviendo reglas de estado, filtros y prioridad de pedidos a un servicio de dominio.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-order-state.service.ts` centraliza tipos y opciones de filtros de pedidos, normalizacion de status, metadata visual, matching por estado, conteos, prioridad operativa y filtros por dia/semana/mes en hora Ecuador.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` deja de declarar `normalizeOrderStatus`, `orderStatusMeta`, `orderPriorityScore` e `isOrderInDateRange`; ahora usa el servicio para pedidos, ventas locales, envios y resumen operativo.
- `Dashboard/src/app/features/dashboard/services/paramascotas-order-state.service.spec.ts` cubre aliases de status, conteos, prioridad y rangos de fecha.
- `Dashboard/tools/check-architecture.mjs` bloquea que las reglas de estado/fecha de pedidos vuelvan a componentes.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta la regla de dominio para pedidos.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`, `git diff --check` focal y Playwright `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "paramascotas route /paramascotas-panel/operations/admin-orders"` (`1/1`).
- El Dashboard reconstruido sirve `<base href="/dashboard/">` y bundle `main-T7MHDC2A.js`.
- `npx vitest run src/app/features/dashboard/services/paramascotas-order-state.service.spec.ts` no arranco por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`); la spec compila mediante `type:check`.
- No se tocaron backend, DB, Gateway, Facturador, SRI, certificados ni production.

### 2026-06-18 - Dashboard QA: Reglas de inventario de producto fuera del componente

Objetivo: seguir desacoplando `ParamascotasPanelComponent` y mover reglas de negocio de producto hacia servicios de dominio, alineado con la arquitectura API-first/modular.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-product-inventory.service.ts` centraliza facturas de compra, matching de proveedor, normalizacion de factura, delta de stock, accion de inventario, requisito de factura y validacion de stock inicial/reabastecimiento/ajuste.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` deja de declarar esas funciones localmente y consume helpers del servicio para crear formularios, registrar compras, duplicar variantes, actualizar factura de compra y validar antes de `createProduct/updateProduct`.
- `Dashboard/src/app/features/dashboard/services/paramascotas-product-inventory.service.spec.ts` cubre normalizacion de proveedor/factura, metadata de compra desde producto, delta de stock, stock inicial, reabastecimiento y ajuste justificado.
- `Dashboard/tools/check-architecture.mjs` bloquea que factories/validadores de factura de compra e inventario de producto vuelvan a componentes.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que inventario de producto, facturas de compra y validaciones de reabastecimiento pertenecen a servicios de dominio.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`, `git diff --check` focal y Playwright `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "paramascotas route /paramascotas-panel/catalog/products"` (`1/1`).
- El Dashboard reconstruido sirve `<base href="/dashboard/">` y bundle `main-U5KALFCH.js`.
- `npx vitest run src/app/features/dashboard/services/paramascotas-product-inventory.service.spec.ts` sigue sin arrancar por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`); la spec compila mediante `type:check`.
- No se tocaron backend, DB, Gateway, Facturador, SRI, certificados ni production.

### 2026-06-18 - Dashboard QA: Submenus del sidebar con navegacion controlada

Objetivo: corregir el caso reportado donde los menus principales del sidebar funcionaban, pero los submenus no ejecutaban la navegacion de forma confiable en el dashboard publicado bajo `/dashboard/`.

Cambios:
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.html` cambia los enlaces de submenu normal y del flyout replegado a `href` publico calculado con `routeHref(...)`, conservando URLs correctas bajo `/dashboard/`.
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.ts` agrega `navigateFromLink(...)`, que en click normal usa la navegacion controlada existente (`router.navigateByUrl` + fallback `location.assign`) y en clicks modificados (`Ctrl`, `Meta`, `Shift`, etc.) deja actuar al navegador como link normal.
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.spec.ts` cubre que los submenus con click modificado no sean secuestrados por Angular.

Decision:
- Esta estrategia reemplaza el intento previo de depender solo de `routerLink` nativo en submenus. El submenu queda con `href` real para fallback/abrir en nueva pestana y con navegacion explicita para el click operativo normal.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health` y Playwright focal de submenus `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "collapsed|desktop sidebar submenus|mobile sidebar"` (`6/6`).
- El Dashboard reconstruido sirve `<base href="/dashboard/">` y bundle `main-VMMFISRG.js`; verificado tambien por APISIX con `curl -k --resolve paramascotasec.com:443:192.168.100.229 https://paramascotasec.com/dashboard/`.
- `npx vitest run src/app/layout/shell/side-nav/side-nav.component.spec.ts` no arranco por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`); la spec queda cubierta por `type:check` y la navegacion por Playwright.
- No se tocaron backend, DB, Gateway, Facturador, SRI, certificados ni production.

### 2026-06-18 - Dashboard QA: Payloads de ajustes operativos fuera del componente

Objetivo: sacar de `ParamascotasPanelComponent` defaults, normalizacion y payloads de estado de tienda, impuestos y sesiones para mantener settings como dominio/API.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-settings-payload.service.ts` centraliza defaults y normalizacion de `storeStatus`, `taxSettings` y `sessionSettings`, ademas de payloads `settings/store-status`, `settings/tax` y `settings/session`.
- `Dashboard/src/app/features/dashboard/services/paramascotas-settings-payload.service.spec.ts` cubre mensaje default de pausa, clamps de credito tributario, min/max de sesiones y payloads operativos.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` consume los helpers del servicio y deja de construir payloads inline para guardar estado de tienda, impuestos y sesiones.
- `Dashboard/tools/check-architecture.mjs` bloquea que defaults/normalizadores/payloads de settings vuelvan a declararse dentro de componentes.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que ajustes operativos deben normalizarse en servicios como `ParamascotasSettingsPayloadService`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint` y `npm run arch:check`.
- `npx vitest run src/app/features/dashboard/services/paramascotas-settings-payload.service.spec.ts` no arranco por dependencia opcional faltante de Rollup en `node_modules` (`@rollup/rollup-linux-x64-gnu`); `type:check` si compilo la spec.
- No se tocaron backend, DB, Gateway, Facturador, SRI, certificados ni produccion.

### 2026-06-18 - Dashboard QA: Payload de usuarios fuera del componente

Objetivo: sacar de `ParamascotasPanelComponent` la validacion y payload de usuarios para mantener usuarios como dominio/API y no como logica de pantalla.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-user-payload.service.ts` centraliza fabrica de formulario, normalizacion de rol, coercion de booleanos, telefono desde perfil, conversion API -> formulario y payload `create/update user`.
- `Dashboard/src/app/features/dashboard/services/paramascotas-user-payload.service.spec.ts` cubre formulario vacio, roles `service/admin/customer`, contacto desde `profile`, payload create/update y validaciones de nombre, email, password y documento.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` delega crear/editar/guardar usuario al servicio y consume helpers de usuario desde el dominio.
- `Dashboard/tools/check-architecture.mjs` bloquea que helpers/payloads de usuario vuelvan a declararse dentro de componentes.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que formularios, validacion y payloads de usuario pertenecen a `ParamascotasUserPayloadService`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up` y `npm run docker:health`.
- Pasaron Playwright focales contra el contenedor actualizado: ruta `/paramascotas-panel/catalog/users` y `paramascotas user contact actions use resolved valid channels only` (`2/2`).
- Runtime local verificado en `http://127.0.0.1:8081/dashboard/`: `<base href="/dashboard/">` y bundle `main-6WJQNM6M.js`.
- `npx vitest run src/app/features/dashboard/services/paramascotas-user-payload.service.spec.ts` no arranco por dependencia opcional faltante de Rollup en `node_modules` (`@rollup/rollup-linux-x64-gnu`); `type:check` si compilo la spec.
- No se tocaron backend, DB, Gateway, Facturador, SRI, certificados ni produccion.

### 2026-06-18 - Dashboard QA: Payloads de gastos fuera del componente

Objetivo: sacar de `ParamascotasPanelComponent` el armado de formularios y payloads de gastos/recurrencias para que la UI no conserve contratos de backend financieros.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-expense-money.service.ts` ahora centraliza, ademas de parseo y calculo monetario, las fabricas de formularios de gasto/recurrencia, conversion de recurrencia API -> formulario y payloads de `admin/expenses` y `admin/expense-recurrences`.
- `Dashboard/src/app/features/dashboard/services/paramascotas-expense-money.service.spec.ts` agrega cobertura de defaults con fecha Ecuador, payload de gasto, payload de recurrencia y conversion de recurrencia existente a formulario.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` delega creacion/reset de formularios, edicion de recurrencias y payloads financieros al servicio.
- `Dashboard/tools/check-architecture.mjs` bloquea que `createDefaultExpenseForm`, `createDefaultRecurrenceForm`, `recurrenceToForm`, `expensePayload` y `recurrencePayload` vuelvan como funciones locales en componentes.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que formularios/payloads de gastos y recurrencias pertenecen al servicio de dominio financiero.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up` y `npm run docker:health`.
- Paso Playwright focal contra el contenedor actualizado: `paramascotas business expenses reconciles subtotal tax and total before saving` (`1/1`).
- Runtime local verificado en `http://127.0.0.1:8081/dashboard/`: `<base href="/dashboard/">` y bundle `main-X4FHLKG2.js`.
- `npx vitest run src/app/features/dashboard/services/paramascotas-expense-money.service.spec.ts` no arranco por dependencia opcional faltante de Rollup en `node_modules` (`@rollup/rollup-linux-x64-gnu`); `type:check` si compilo la spec.
- No se tocaron backend, DB, Gateway, Facturador, SRI, certificados ni produccion.

### 2026-06-18 - Dashboard QA: Payload de ventas historicas fuera del componente

Objetivo: sacar de `ParamascotasPanelComponent` el armado de payload y calculos de venta historica para mantener el flujo API-first con UI separada del contrato backend.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-historical-sale.service.ts` centraliza fabrica de formulario/linea, calculo de gross/net/IVA/costo/utilidad y payload `admin/historical-sales`.
- `Dashboard/src/app/features/dashboard/services/paramascotas-historical-sale.service.spec.ts` cubre fecha Ecuador, calculos con IVA/exentos, normalizacion monetaria, textos opcionales y preservacion de identidad interna de producto agrupado.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` delega totales, alta de lineas, reset y payload historico al servicio, preservando que `product_id` sea la identidad seleccionada (`internalId`) para variantes agrupadas.
- `Dashboard/tools/check-architecture.mjs` bloquea que fabricas/payloads de venta historica vuelvan a declararse dentro de componentes.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que ventas historicas y sus calculos previos deben vivir en servicios de dominio como `ParamascotasHistoricalSaleService`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up` y `npm run docker:health`.
- Paso Playwright focal contra el contenedor actualizado: `paramascotas historical sales submit grouped variant internal product identity` (`1/1`).
- Runtime local verificado en `http://127.0.0.1:8081/dashboard/`: `<base href="/dashboard/">` y bundle `main-VOF3GW2P.js`.
- `npx vitest run src/app/features/dashboard/services/paramascotas-historical-sale.service.spec.ts` no arranco por dependencia opcional faltante de Rollup en `node_modules` (`@rollup/rollup-linux-x64-gnu`); `type:check` si compilo la spec.
- No se tocaron backend, DB, Gateway, Facturador, SRI, certificados ni produccion.

### 2026-06-18 - Dashboard QA: Motor de pricing fuera del componente

Objetivo: sacar de `ParamascotasPanelComponent` las reglas de margen, sugerencia de PVP y riesgo de rentabilidad para avanzar la separacion API-first entre UI y dominio.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-pricing-engine.service.ts` centraliza normalizacion de margenes/calculos/reglas, opciones de riesgo, filas de pricing por producto, resumen, filtros, simulacion de PVP y graficos derivados de pricing.
- `Dashboard/src/app/features/dashboard/services/paramascotas-pricing-engine.service.spec.ts` cubre defaults de configuracion, ordenamiento de margenes, riesgo por costo faltante/margen negativo, filtros y simulacion de precio.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` consume el motor de pricing y deja de declarar `buildPricingProductRows`, `pricingSuggestionForCost`, `buildPricingSummary`, `filterPricingRows`, `PRICING_RISK_OPTIONS` y graficos de pricing como helpers locales.
- `Dashboard/tools/check-architecture.mjs` bloquea que el motor de precios/margenes vuelva a declararse dentro de componentes.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que reglas de rentabilidad y pricing deben vivir en servicios de dominio como `ParamascotasPricingEngineService`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up` y `npm run docker:health`.
- Pasaron Playwright focales contra el contenedor actualizado: rutas `/finance/margins`, `/finance/calculations` y `/finance/pricing-rules` (`3/3`).
- Runtime local verificado en `http://127.0.0.1:8081/dashboard/`: `<base href="/dashboard/">` y bundle `main-5EARQWY7.js`.
- `npx vitest run src/app/features/dashboard/services/paramascotas-pricing-engine.service.spec.ts` no arranco por dependencia opcional faltante de Rollup en `node_modules` (`@rollup/rollup-linux-x64-gnu`); `type:check` si compilo la spec y Docker build uso Node 26 correctamente.
- No se tocaron backend, DB, Gateway, Facturador, SRI, certificados ni produccion.

### 2026-06-18 - Dashboard QA: Reglas fiscales de producto fuera del componente

Objetivo: sacar de `ParamascotasPanelComponent` las reglas de IVA/PVP de producto para avanzar la separacion API-first entre UI y dominio.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-product-tax.service.ts` centraliza tasa efectiva de IVA, alias de exento, conversion PVP bruto/neto, precio anterior neto/bruto y redondeo monetario de producto.
- `Dashboard/src/app/features/dashboard/services/paramascotas-product-tax.service.spec.ts` cubre `tax.rate`, `tax.multiplier`, atributos legacy `purchase_tax_rate`, alias `tax_exempt/taxExempt`, precio neto y PVP de formulario.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` consume esas funciones desde el servicio y deja de declarar helpers locales `productTaxRate`, `productNetPrice`, `productFormGrossPrice`, `isTaxExemptProduct` y equivalentes.
- `Dashboard/tools/check-architecture.mjs` bloquea que helpers fiscales de producto vuelvan a declararse dentro de componentes.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que reglas de IVA/PVP de producto deben vivir en servicios de dominio como `ParamascotasProductTaxService`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up` y `npm run docker:health`.
- Pasaron Playwright focales contra el contenedor actualizado: `product editor saves net base price`, `keeps legacy Spanish tax exemption` y `product catalog filters by legacy selectors and VAT status` (`3/3`).
- `npx vitest run src/app/features/dashboard/services/paramascotas-product-tax.service.spec.ts` no arranco por dependencia opcional faltante de Rollup en `node_modules` (`@rollup/rollup-linux-x64-gnu`); `type:check` si compilo la spec y Docker build uso Node 26 correctamente.
- No se tocaron backend, DB, Gateway, Facturador, SRI, certificados ni produccion.

### 2026-06-18 - Dashboard QA: Submenus del sidebar navegan con RouterLink nativo

Objetivo: corregir el reporte donde los menus principales del sidebar funcionaban, pero los submenus podian no navegar de forma consistente.

Cambios:
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.ts` importa `RouterLink`, expone `tenantQueryParams()` y agrega `closeNavigationAfterLinkClick()` para cerrar flyout/sidebar sin cancelar el click.
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.html` cambia enlaces reales de menu simple, submenu normal y flyout replegado a `[routerLink]` + `[queryParams]`, dejando que Angular genere el `href` publico bajo `/dashboard`.
- Se mantiene `routeHref()` para fallback/logo, pero los submenus ya no dependen de `navigateToItem()` ni de `preventDefault()` para operar.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up` y `npm run docker:health`.
- Pasaron Playwright focales de submenus: `mobile sidebar expands submenu`, `desktop sidebar submenus navigate`, `collapsed submenu links keep` y `collapsed sidebar submenus navigate for ecommerce groups` (`4/4`) antes y despues del redeploy.
- Paso Playwright publico autenticado: `paramascotas tenant admin signs in with MFA and stays tenant-scoped` (`1/1`) entrando por `https://paramascotasec.com/dashboard`.
- Verificacion directa en runtime: `Reporte de ventas` genera `href=/dashboard/paramascotas-panel/reporting/sales?tenant=demo` y el click navega a esa URL.
- Gateway QA local `https://paramascotasec.com/dashboard/` entrega el bundle nuevo `main-O72N4VUS.js` con `<base href="/dashboard/">`.
- No se tocaron backend, DB, Gateway, Facturador, SRI, certificados ni produccion.

### 2026-06-18 - Dashboard QA: Payload de cupones fuera del componente

Objetivo: sacar del componente la normalizacion y validacion de cupones/descuentos, dejando el contrato comercial como servicio de dominio.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-discount-payload.service.ts` centraliza normalizacion de codigo, validacion de tipo/valor, porcentaje maximo, vigencia, campos opcionales y payload backend de descuentos.
- `ParamascotasPanelComponent` usa `ParamascotasDiscountPayloadService` en `saveDiscount()` y deja de declarar helpers `discountFormToPayload`, `normalizeDiscountCode`, parseos numericos y validacion de fechas.
- `Dashboard/src/app/features/dashboard/services/paramascotas-discount-payload.service.spec.ts` cubre normalizacion, campos opcionales, redondeo de usos, porcentaje invalido y rango de fechas invalido.
- `Dashboard/tools/check-architecture.mjs` bloquea reglas/payload de descuentos dentro de componentes.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que contratos comerciales como cupones deben vivir en servicios/adapters.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up` y `npm run docker:health`.
- Playwright focal paso: `paramascotas discount form validates rules and normalizes payload before saving` (`1/1`).
- No se toco SRI, facturacion electronica ni ambiente de produccion.

### 2026-06-18 - Dashboard QA: Calculos de gastos fuera del componente

Objetivo: seguir separando UI y negocio financiero, moviendo el parseo y reconciliacion de montos de gastos fuera de `ParamascotasPanelComponent`.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-expense-money.service.ts` centraliza subtotal/IVA/total de gastos, parseo de moneda con coma/punto, heuristica vigente de IVA como tasa o monto, redondeo, enteros de recurrencia y validacion de fechas financieras.
- `ParamascotasPanelComponent` usa `resolveParamascotasExpenseMoney`, `parseParamascotasExpenseInteger` y `validateParamascotasExpenseDate` para payloads de gastos y recurrencias, sin mantener calculos locales duplicados.
- `Dashboard/src/app/features/dashboard/services/paramascotas-expense-money.service.spec.ts` cubre moneda estilo Ecuador, IVA como tasa segun la heuristica actual, subtotal+total, negativos, fechas invalidas e intervalos.
- `Dashboard/tools/check-architecture.mjs` bloquea calculos de gastos/IVA dentro de componentes.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que calculos financieros de formularios deben vivir en servicios de dominio.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up` y `npm run docker:health`.
- Playwright focal paso: `paramascotas business expenses reconciles subtotal tax and total before saving` (`1/1`).
- No se toco SRI, facturacion electronica ni ambiente de produccion.

### 2026-06-18 - Dashboard QA: Politica de consumidor final fuera del componente

Objetivo: sacar del componente monolitico una regla fiscal sensible de Ecuador, evitando que el limite de consumidor final y el documento oficial queden quemados en UI.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-final-consumer-policy.service.ts` centraliza identificacion de consumidor final (`9999999999999` y aliases), limite oficial de USD 50.00, redondeo de centavos y mensaje visible.
- `ParamascotasPanelComponent` usa `ParamascotasFinalConsumerPolicyService` para venta local y conversion de cotizaciones, y usa el helper exportado para trazabilidad/resumen de calidad.
- `ParamascotasLocalSalePayloadService` reutiliza `PARAMASCOTAS_FINAL_CONSUMER_IDENTIFICATION` en lugar de repetir el documento oficial.
- `Dashboard/src/app/features/dashboard/services/paramascotas-final-consumer-policy.service.spec.ts` cubre aliases, limite con centavos y mensaje visible.
- `Dashboard/tools/check-architecture.mjs` bloquea constantes/documento/mensaje de consumidor final dentro de componentes.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que reglas fiscales y POS deben vivir en servicios de dominio.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up` y `npm run docker:health`.
- Playwright focal `final consumer` paso (`2/2`): venta local y conversion de cotizacion bloquean consumidor final sobre limite antes de mutar backend.
- No se toco SRI, facturacion electronica ni ambiente de produccion.

### 2026-06-18 - Dashboard QA: Links y mensajes de email fuera de componentes

Objetivo: seguir cerrando acoplamientos de UI moviendo URLs `mailto:` y textos de contacto a servicios reutilizables, con guardrails aplicables a componentes y templates.

Cambios:
- `Dashboard/src/app/core/services/email-link.service.ts` centraliza validacion de email y construccion segura de links `mailto:` con asunto/cuerpo opcionales.
- `Dashboard/src/app/features/dashboard/services/paramascotas-email-message.service.ts` encapsula los mensajes de correo Paramascotas para seguimiento de usuarios y pedidos, delegando la URL base al servicio core.
- `ParamascotasPanelComponent` deja de armar asuntos, cuerpos y URLs `mailto:`; solo solicita la URL del servicio y abre la accion.
- `Dashboard/src/app/features/users/pages/users-grid/users-grid.component.{ts,html}` deja de concatenar `mailto:` en TS/template y usa `EmailLinkService`.
- `Dashboard/tools/check-architecture.mjs` bloquea construccion de emails en componentes y templates.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que mensajes de canales externos deben vivir en servicios/adapters de dominio.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up` y `npm run docker:health`.
- Playwright focal paso: `smoke.spec.ts --grep "users-list|tenant guard|permission"` (`5/5`) y `paramascotas-list-views.spec.ts --grep "catalog users"` (`1/1`).
- `rg "mailto:" src/app` confirma que `mailto:` solo queda en `EmailLinkService` y specs.
- No se toco SRI, facturacion electronica ni ambiente de produccion.

### 2026-06-18 - Dashboard QA: Busqueda de catalogo Paramascotas fuera del componente

Objetivo: avanzar la arquitectura API-first/modular sacando del componente monolitico la logica de busqueda de productos que impacta catalogo, POS y productos agrupados.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-product-catalog-search.service.ts` centraliza normalizacion, aliases, terminos de medida, claves legacy, scoring de busqueda, filtros select y helpers de identidad de productos.
- `ParamascotasPanelComponent` deja de declarar `PRODUCT_SEARCH_*`, builders de texto de busqueda y scoring; ahora filtra productos mediante `ParamascotasProductCatalogSearchService`.
- Los helpers `paramascotasProductIdentityKeys`, `paramascotasProductEntityId`, `paramascotasProductMatchesIdentity` y `paramascotasProductsByIdentity` pasan a ser funciones exportadas del servicio de dominio, reutilizables por catalogo, inventario, compras y POS.
- `Dashboard/src/app/features/dashboard/services/paramascotas-product-catalog-search.service.spec.ts` cubre aliases (`dog`/`felino`), medidas (`14 g`), SKU, ids legacy y opciones de filtro.
- `Dashboard/tools/check-architecture.mjs` bloquea `PRODUCT_SEARCH_*` y builders/scoring de busqueda de productos dentro de componentes.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que busqueda, matching, aliases y scoring de catalogo deben vivir en servicios de dominio.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up` y `npm run docker:health`.
- Playwright focal paso (`2/2`): `product search finds grouped variants by group metadata` y `local sales searches grouped aliases and blocks expired products like legacy POS`.
- No se toco SRI, facturacion electronica ni ambiente de produccion.

### 2026-06-18 - Dashboard QA: Mensajes WhatsApp fuera del componente

Objetivo: seguir reduciendo logica de negocio en `ParamascotasPanelComponent`, sacando construccion de mensajes y URLs WhatsApp de la UI y resolviendo la prueba de cotizacion WhatsApp que quedo fallando tras extraer impresion.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-whatsapp-message.service.ts` centraliza normalizacion de telefonos Ecuador y URLs `wa.me` para usuarios, cotizaciones y pedidos.
- `ParamascotasPanelComponent` delega al servicio los links WhatsApp de clientes, cotizaciones y ordenes; el componente conserva solo la orquestacion de acciones UI.
- `Dashboard/src/app/core/services/browser-interaction.service.ts` tolera ventanas/documentos de impresion simulados sin `document.open()` o `document.close()`, evitando que la impresion de cotizacion aborte la notificacion visual de WhatsApp en pruebas.
- `Dashboard/tools/check-architecture.mjs` bloquea construccion `wa.me` dentro de componentes.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que mensajes para canales externos deben vivir en servicios/adapters del modulo.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up` y `npm run docker:health`.
- Playwright focal `quotation conversion|quotations prepare WhatsApp` paso (`3/3`) despues del rebuild.
- El fallo documentado en la entrada de impresion de cotizaciones quedo resuelto; la cotizacion se crea, prepara WhatsApp y conserva payload sin campos de entrega prohibidos.
- No se toco SRI, facturacion electronica ni ambiente de produccion.

### 2026-06-18 - Dashboard QA: Impresion de cotizaciones fuera del componente

Objetivo: seguir separando documentos de negocio de la UI, sacando la plantilla HTML imprimible de cotizaciones del componente monolitico de Paramascotas.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-quotation-print.service.ts` centraliza la construccion del HTML imprimible de cotizaciones, con escape de datos, items, totales, IVA, descuento y estilos de impresion.
- `ParamascotasPanelComponent` ahora solo prepara el resumen visual existente y delega `buildPrintHtml(...)` al servicio antes de llamar `BrowserInteractionService.printHtml(...)`.
- `Dashboard/tools/check-architecture.mjs` bloquea builders `build*PrintHtml` y CSS `@media print` dentro de componentes.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que documentos imprimibles no deben construirse en componentes.
- `Dashboard/src/app/features/dashboard/services/paramascotas-quotation-print.service.spec.ts` agrega cobertura de tipo para escape y contenido del HTML generado.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up` y `npm run docker:health`.
- Playwright focal `quotation conversion` paso (`2/2`) despues del rebuild.
- La prueba Playwright `quotations prepare WhatsApp...` falla por una notificacion visual que no queda visible en el DOM; la conversion y payloads pasan, y el fallo no apunta al builder extraido.
- `npx vitest run src/app/features/dashboard/services/paramascotas-quotation-print.service.spec.ts` no pudo arrancar por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`); `type:check` si compilo el spec.

### 2026-06-18 - Dashboard QA: Payloads POS fuera del componente

Objetivo: seguir reduciendo acoplamiento de negocio en `ParamascotasPanelComponent`, moviendo contratos de mutacion POS/cotizacion a servicios tipados del modulo.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-local-sale-payload.service.ts` centraliza payloads de cotizacion de orden, venta local, cotizacion local y conversion de cotizacion, incluyendo `payment_details`, direccion, cliente, items y redondeo de pagos.
- `Dashboard/src/app/features/dashboard/models/paramascotas-admin.model.ts` tipa `ParamascotasConvertQuotationPayload` y reutiliza `ParamascotasLocalOrderPaymentDetails` para evitar `Record<string, unknown>` en conversiones.
- `Dashboard/src/app/features/dashboard/data/paramascotas-admin-api.service.ts` consume `convertQuotation(...)` con payload tipado.
- `ParamascotasPanelComponent` deja de construir inline `payment_details`, `delivery_method: 'pickup'` e items de venta local; el componente queda como orquestador UI/estado.
- `Dashboard/tools/check-architecture.mjs` bloquea payloads de pago/delivery/items dentro de componentes.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que payloads de mutaciones de negocio deben vivir en servicios/adapters del modulo.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint` y `npm run arch:check`.
- `rg` confirmo que `paramascotas-panel.component.ts` ya no contiene `payment_details:`, `delivery_method: 'pickup'`, `items: this.localSaleItems().map`, `localSaleAddressPayload`, `localQuotationPayload` ni `splitCustomerName`.
- La prueba Playwright focal `quotation conversion` paso (`2/2`) despues de reconstruir `Dashboard` con `npm run docker:up`; tambien paso `npm run docker:health`.
- No se toco SRI ni ambiente de produccion.

### 2026-06-18 - Dashboard QA: Exportacion de reportes fuera de componente

Objetivo: avanzar la arquitectura API-first/modular quitando logica de armado de archivos de negocio del componente monolitico de Paramascotas.

Cambios:
- `Dashboard/src/app/features/dashboard/services/paramascotas-native-report-export.service.ts` centraliza la construccion del workbook nativo de reportes Paramascotas, incluyendo resumen, pedidos, productos, categorias, tendencias financieras, compras, productos x compra e incidencias de trazabilidad.
- `ParamascotasPanelComponent` queda como orquestador: obtiene el reporte desde estado/API, llama al servicio de exportacion y descarga mediante `BrowserInteractionService`.
- Los calculos puros de tendencia financiera usados por exportaciones y charts se movieron a funciones compartidas del servicio para evitar duplicacion dentro del componente.
- `Dashboard/tools/check-architecture.mjs` bloquea construccion de workbooks y helpers de exportacion dentro de componentes.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que exportaciones, workbooks y documentos imprimibles deben vivir en servicios/adapters del modulo, no en UI.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint` y `npm run arch:check`.
- `rg` confirmo que `paramascotas-panel.component.ts` ya no contiene builders `workbook*`, `excelWorkbook`, `slugifyExport`, `formatDateTimeForExport` ni `*ExportSheet`.
- Se reconstruyo `Dashboard` con `npm run docker:up`, paso `npm run docker:health` y paso Playwright focal `paramascotas general report exports Excel workbook with operational sheets`.

### 2026-06-18 - Dashboard QA: Submenus del sidebar replegado validados

Objetivo: corregir el caso donde el menu lateral respondia al click, pero los submenus podian quedar sin navegar de forma confiable en el estado replegado.

Cambios:
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.ts` centraliza el corte de eventos de navegacion y usa `stopImmediatePropagation()` para evitar que listeners heredados del template intercepten clicks de submenus.
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.html` deja de interceptar `pointerdown/mousedown` dentro del flyout replegado; el contenedor solo detiene el `click`, de modo que los enlaces de submenu navegan de forma consistente en navegador real.
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.css` asegura que, en sidebar movil/overlay abierto, los labels de botones de grupo y carets vuelvan a mostrarse aunque el sidebar haya quedado marcado como `active`.
- `Dashboard/src/dashboard-overrides.css` elimina reglas globales antiguas que forzaban submenus por `.sidebar.active` en anchos medianos y podian competir con el estado real del componente.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` agrega cobertura para abrir un grupo ya activo (`Operacion`) en sidebar replegado, navegar desde su submenu y navegar desde un submenu normal de escritorio bajo `/dashboard`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, Playwright focal de submenus (`6/6`) y Playwright post-deploy de base `/dashboard` + grupo activo.
- Se reconstruyo `Dashboard` con `npm run docker:up` y paso `npm run docker:health`.
- La prueba real autenticada por `https://paramascotasec.com/dashboard` (`paramascotas tenant admin signs in with MFA and stays tenant-scoped`) paso, confirmando submenus replegados en el dominio QA publico.

### 2026-06-18 - Dashboard QA: ApiResource endpointKeys usan aliases centrales

Objetivo: cerrar el acoplamiento restante en servicios CRUD genericos, donde `ApiResource.endpointKeys` seguia declarando strings literales aunque ya existia `DASHBOARD_API_ENDPOINT_KEYS`.

Cambios:
- `Dashboard/src/app/core/modules/dashboard-api.config.ts` amplia `DASHBOARD_API_ENDPOINT_KEYS` para `users`, `roles`, `invoicing`, `products`, `monitoring.events`, `workspace.email` y `workspace.blog`.
- `UsersApiService`, `RolesApiService`, `ProductsApiService`, `InvoicesApiService`, `MonitoringApiService`, `WorkspaceEmailApiService` y `WorkspaceBlogApiService` usan aliases `DASHBOARD_API_ENDPOINT_KEYS.*` dentro de `endpointKeys`.
- `Dashboard/tools/check-architecture.mjs` bloquea strings literales dentro de `ApiResource.endpointKeys`.
- `Dashboard/docs/API-FIRST-MODULES.md` actualiza el ejemplo CRUD para usar aliases centrales.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint` y `npm run arch:check`.
- `rg` confirmo que no quedan valores literales de endpoint dentro de `endpointKeys` de servicios `*-api.service.ts`.

### 2026-06-18 - Dashboard QA: Servicios API consumen aliases de endpoints

Objetivo: eliminar el acoplamiento restante donde servicios de datos y helpers locales repetian claves de endpoint como strings (`apiCatalog.url('inventory.stock')`, `apiPath('ecommerce.orders')`, etc.) aunque el catalogo API ya era tipado.

Cambios:
- `Dashboard/src/app/core/modules/dashboard-api.config.ts` agrega `DASHBOARD_API_ENDPOINT_KEYS`, mapa de aliases nombrados tipado con `DashboardApiEndpointKey`.
- Servicios de tenant context, auth, dashboard base, inventario, monitoreo, workspace, tenant-admin, `ParamascotasBackendApiService` y `ParamascotasAdminApiService` consumen `DASHBOARD_API_ENDPOINT_KEYS` en lugar de pasar strings literales a `apiCatalog.url(...)`, `publicUrl(...)`, `apiPath(...)` o `putSetting(...)`.
- `Dashboard/tools/check-architecture.mjs` exige `DASHBOARD_API_ENDPOINT_KEYS`, bloquea literales en `apiCatalog.url/publicUrl/path/endpoint/endpointModule(...)` y bloquea literales en helpers locales `apiPath(...)`/`putSetting(...)`.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que todo endpoint nuevo debe registrarse en el catalogo API y consumirse mediante aliases de `DASHBOARD_API_ENDPOINT_KEYS`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint` y `npm run arch:check`.
- `rg` confirmo que no quedan llamadas con literales a `apiCatalog.url/publicUrl(...)`, `apiPath(...)` ni `putSetting(...)` en `src/app/features` o `src/app/core`.

### 2026-06-18 - Dashboard QA: Facades validan con permisos nombrados

Objetivo: quitar de las facades de features el acoplamiento a recursos/acciones (`authorization.canAction('products', 'create')`, etc.) y usar los permisos nombrados derivados del catalogo modular.

Cambios:
- Facades de `users`, `roles`, `products`, `invoices`, `inventory` y `monitoring` ahora validan `canCreate/canUpdate/canDelete` con `authorization.canAll(...)` sobre permisos de `Dashboard/src/app/core/modules/dashboard-module-access.config.ts`.
- `InvoicesFacade.create(...)` ahora valida `canCreate()` antes de ejecutar la mutacion, alineandose con update/delete y con el permiso de UI existente.
- `dashboard-module-access.config.ts` expone `dashboardPermissionOptionsForModules(...)` para que `RolesFacade` no importe `tenant-permissions` directamente al construir grupos de permisos.
- `Dashboard/tools/check-architecture.mjs` bloquea en codigo productivo de `features` el uso de `canAction(...)`, imports directos de `tenant-permissions` y checks `canAll/canAny/canMatch` con permisos literales.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que facades y componentes consumen permisos nombrados desde la capa modular central.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint` y `npm run arch:check`.
- `rg` confirmo que no quedan `canAction(...)`, `tenantPermission(...)` ni imports productivos de `@core/tenant/tenant-permissions` en `src/app/features`; solo queda `roles.fixtures.ts` como fixture de desarrollo.

### 2026-06-18 - Dashboard QA: Rutas de features derivan modulo desde routeSource

Objetivo: eliminar el acoplamiento donde cada `*.routes.ts` de feature repetia `module: 'products'`, `module: 'users'`, `module: 'invoicing'`, etc., aunque esa relacion ya existe en `TENANT_MODULE_CATALOG.routeSources`.

Cambios:
- `Dashboard/src/app/core/routing/route-data.ts` exporta `PrivateRoutePermissionAccess` para reutilizar el contrato de permisos de rutas.
- `Dashboard/src/app/core/modules/dashboard-route-access.config.ts` agrega `privateRouteSourceRoute(...)`, `moduleForRouteSource(...)` y `DASHBOARD_ROUTE_SOURCE_MODULES`, derivados desde `TENANT_MODULE_OPTIONS`.
- Las rutas de `business`, `dashboard`, `inventory`, `monitoring`, `products`, `tenant-admin`, `ui-kit`, `users` y `workspace` usan `privateRouteSourceRoute('route-source', ...)`; ya no declaran `module: '...'` localmente.
- `Dashboard/tools/check-architecture.mjs` reconoce `privateRouteSourceRoute(...)`, deriva metadata de rutas desde el catalogo tenant y bloquea `privateModuleRoute(...)`/`module: '...'` dentro de route files de features.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que los route files de features deben declarar la fuente de rutas, no el modulo propietario.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint` y `npm run arch:check` (`Navigation check passed (76 links)`).
- `rg` confirmo que los `*.routes.ts` de features ya no contienen `privateModuleRoute(...)` ni `module: '...'`; solo queda `permissions: [TENANT_ADMIN_PERMISSIONS.platformAdmin]` como permiso especial centralizado.

### 2026-06-18 - Dashboard QA: Permisos de UI centralizados por modulo

Objetivo: eliminar el acoplamiento de componentes visuales a recursos/permisos internos (`tenantPermission(...)`, `platform-admin`) y dejar esas decisiones en una capa modular central.

Cambios:
- `Dashboard/src/app/core/modules/dashboard-module-access.config.ts` centraliza permisos nombrados por modulo/dominio y los deriva desde `TENANT_MODULE_OPTIONS`; tambien agrupa casos cruzados como `USER_CREATE_PERMISSIONS` (`users.create + roles.read`) y `TENANT_ADMIN_PERMISSIONS.platformAdmin`.
- Componentes de productos, usuarios, roles, facturacion, inventario, monitoreo y pantallas publicas de bloqueo dejan de importar `tenantPermission`/`PLATFORM_ADMIN_PERMISSION` y consumen permisos nombrados desde `dashboard-module-access.config.ts`.
- `Dashboard/tools/check-architecture.mjs` valida que los componentes no construyan permisos ni importen `tenant-permissions` directamente, y reconoce `TENANT_ADMIN_PERMISSIONS.platformAdmin` en metadata de rutas.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que los permisos visibles en UI deben registrarse en `dashboard-module-access.config.ts`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint` y `npm run arch:check`.
- `rg` confirmo que no quedan `tenantPermission(...)` ni imports directos de `@core/tenant/tenant-permissions` en componentes de `src/app/features`.

### 2026-06-18 - Dashboard QA: Claves de endpoints API tipadas desde catalogo

Objetivo: cerrar el acoplamiento donde los endpoints estaban registrados en `dashboard-api.config.ts`, pero `DashboardApiCatalogService.url(...)`, helpers y `ApiResource.endpointKeys` todavia aceptaban `string`, permitiendo typos hasta runtime.

Cambios:
- `Dashboard/src/app/core/modules/dashboard-api.config.ts` exporta `DashboardApiEndpointKey`, derivado de `DASHBOARD_MODULE_API_ENDPOINTS_BY_MODULE`, y conserva permisos derivados por `dashboardModuleApiEndpoints(...)`.
- `Dashboard/src/app/core/modules/dashboard-api-catalog.service.ts` tipa `endpoint(...)`, `path(...)`, `url(...)`, `publicUrl(...)` y `endpointModule(...)` con `DashboardApiEndpointKey`.
- `Dashboard/src/app/core/http/api-resource.ts` tipa `ApiResourceEndpointKeys` con `DashboardApiEndpointKey`; los servicios CRUD (`users`, `roles`, `products`, `invoices`, `monitoring`, `workspace email/blog`) declaran `endpointKeys` con `satisfies ApiResourceEndpointKeys`.
- `Dashboard/src/app/core/auth/auth-api.service.ts`, `Dashboard/src/app/features/dashboard/data/paramascotas-admin-api.service.ts` y el registry del panel Paramascotas usan `DashboardApiEndpointKey` en helpers que reciben claves de endpoint.
- `Dashboard/tools/check-architecture.mjs` bloquea volver a `endpointKey: string`, exige `DashboardApiEndpointKey` y exige `satisfies ApiResourceEndpointKeys` en recursos CRUD.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta el contrato tipado para agregar y consumir endpoints.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint` y `npm run arch:check` (`Navigation check passed (76 links)`).
- No se tocaron backend, DB, Gateway, Facturador, SRI ni production; el cambio es de contrato TypeScript/guardrails sin alteracion runtime de endpoints.

### 2026-06-18 - Dashboard QA: Fuentes de rutas tipadas desde catalogo tenant

Objetivo: cerrar un acoplamiento debil donde `TENANT_MODULE_CATALOG.routeSources` decidia que rutas habilita cada modulo, pero `DashboardRouteSourceKey` seguia siendo `string`, dejando errores de registro para runtime.

Cambios:
- `Dashboard/src/app/core/tenant/tenant-module-catalog.ts` exporta `TenantRouteSourceKey`, derivado de las claves reales declaradas en `TENANT_MODULE_CATALOG.routeSources`.
- `Dashboard/src/app/core/modules/dashboard-route.config.ts` deriva `DashboardRouteSourceKey` desde `TenantRouteSourceKey`, evitando que fuentes de rutas arbitrarias se cuelen en la composicion privada.
- `Dashboard/src/app/app-route-sources.ts` registra `DASHBOARD_ROUTE_SOURCE_MAP` con `satisfies DashboardRouteSourceMap`, de modo que `type:check` falla si una fuente declarada en el catalogo no tiene rutas fisicas registradas o si sobra una clave no declarada.
- `Dashboard/tools/check-architecture.mjs` exige que las fuentes de rutas sigan derivadas del catalogo y que el mapa fisico este tipado con `satisfies DashboardRouteSourceMap`.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que `TenantRouteSourceKey` y `DashboardRouteSourceMap` son el contrato oficial para agregar fuentes de rutas.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint` y `npm run arch:check` (`Navigation check passed (76 links)`).
- No se tocaron backend, DB, Gateway, Facturador, SRI ni production; el cambio es de contrato TypeScript/guardrails sin alteracion runtime de rutas.

### 2026-06-18 - Dashboard QA: Submenus replegados abren solo por click

Objetivo: corregir el reporte donde el menu replegado ya respondia en los grupos principales, pero los submenus no eran confiables para seleccionar opciones.

Cambios:
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.{ts,html}` elimina la apertura de flyout por hover/focus en sidebar replegado; los grupos con hijos ahora abren/cierran el submenu solo con click explicito.
- Se elimina el estado interno `collapsedFlyoutPinned`, porque al quedar click-only ya no hay diferencia entre preview temporal y submenu fijado.
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.spec.ts` actualiza la expectativa para que hover no abra el flyout.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` valida que hover no abra submenus replegados, que click si los abra, y que los hijos naveguen en desktop replegado y mobile.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health` y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "collapsed sidebar|mobile sidebar expands submenu"` (`3/3`) contra el contenedor reconstruido.
- `npx vitest run src/app/layout/shell/side-nav/side-nav.component.spec.ts` no arranco por la dependencia opcional faltante de Rollup en el `node_modules` local (`@rollup/rollup-linux-x64-gnu`); la cobertura efectiva se valido con typecheck y Playwright.
- No se tocaron backend, DB, Gateway, Facturador, SRI ni ambiente production.

### 2026-06-18 - Dashboard QA: Rutas privadas derivan permisos por modulo

Objetivo: quitar la repeticion de `tenantPermission(...)` en los archivos `*.routes.ts`, alineando rutas con el mismo patron modular usado en endpoints API y navegacion.

Cambios:
- `Dashboard/src/app/core/routing/route-data.ts` agrega `privateModuleRoute(...)`, que deriva por defecto `<modulo>.read` y permite excepciones con `permissionAccess` o permisos especiales explicitos.
- `Dashboard/src/app/features/*/*.routes.ts` migra rutas privadas operativas a `privateModuleRoute(...)`, manteniendo paths, features, modulos y componentes existentes.
- `Dashboard/tools/check-architecture.mjs` acepta y verifica `privateModuleRoute(...)`, bloqueando `tenantPermission(...)` repetido en rutas de feature.
- `Dashboard/tools/check-navigation.mjs` entiende metadata generada por `privateModuleRoute(...)`, manteniendo la validacion del menu contra rutas y permisos.
- `Dashboard/src/app/core/modules/dashboard-modules.config.spec.ts` cubre que `privateModuleRoute(...)` derive permisos como `invoicing.read` y `products.read`.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta `privateModuleRoute(...)` como patron oficial para rutas privadas de features.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check` (`Navigation check passed (76 links)`), `node node_modules/playwright/cli.js test tests/e2e/smoke.spec.ts --grep "monitoring tenant sidebar|tenant navigation hides platform admin|tenant landing follows"`, `npm run docker:up` y `npm run docker:health`.

### 2026-06-18 - Dashboard QA: Navegacion modular con permisos derivados

Objetivo: quitar la repeticion de `module` y `tenantPermission(...)` dentro de cada item del blueprint de navegacion, manteniendo un unico punto central para declarar menus por modulo.

Cambios:
- `Dashboard/src/app/core/modules/dashboard-navigation.config.ts` agrega `moduleNavigationItem(...)`, `permissionAccess` y `defaultPermissions` para derivar modulo y permisos del menu desde el bloque correspondiente.
- El blueprint conserva las mismas secciones, etiquetas, iconos y rutas, pero ya no copia `module: '...'` ni `permissions: [tenantPermission(...)]` en cada item operativo.
- `Dashboard/tools/check-architecture.mjs` bloquea regresar a permisos/modulos repetidos por item y exige el helper de navegacion modular.
- `Dashboard/tools/check-navigation.mjs` ahora interpreta `moduleNavigationItem(...)`, `permissionAccess` y `defaultPermissions`, por lo que mantiene la validacion de 76 enlaces contra rutas y permisos despues del refactor.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta el patron de navegacion modular con `moduleNavigationItem(...)`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check` (`Navigation check passed (76 links)`), `node node_modules/playwright/cli.js test tests/e2e/smoke.spec.ts --grep "monitoring tenant sidebar|tenant navigation hides platform admin|tenant landing follows"`, `npm run docker:up` y `npm run docker:health`.

### 2026-06-18 - Dashboard QA: Landing tenant derivado del blueprint modular

Objetivo: eliminar la preferencia hardcodeada por `/home` en la navegacion del Dashboard, para que el destino inicial del tenant dependa de los modulos contratados y del orden del blueprint central.

Cambios:
- `Dashboard/src/app/core/navigation/navigation.service.ts` deja de priorizar `/home` y calcula `defaultRoute` desde el primer destino visible de `DASHBOARD_NAVIGATION_BLUEPRINT` luego de filtrar por modulos y permisos.
- `Dashboard/src/app/core/http/interceptors/error.interceptor.ts` usa `/` como fallback de retorno al login cuando la sesion expira y no hay URL actual, dejando que `tenantLandingGuard` resuelva el modulo correcto.
- `Dashboard/src/app/core/navigation/navigation.service.spec.ts` verifica que un tenant con `monitoring` + `ui-kit` aterrice en `/monitoring`, no en `/home`.
- `Dashboard/tests/e2e/smoke.spec.ts` agrega cobertura runtime para `/?tenant=monitoring-demo`, validando redireccion a `/monitoring?tenant=monitoring-demo`.
- `Dashboard/tools/check-architecture.mjs` bloquea volver a acoplar `NavigationService.defaultRoute` a `/home` o a preferencias fuera del blueprint filtrado.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta que la prioridad de landing se cambia en el blueprint central, no en servicios.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health` y `node node_modules/playwright/cli.js test tests/e2e/smoke.spec.ts --grep "monitoring tenant sidebar|tenant navigation hides platform admin|tenant landing follows"`.

### 2026-06-18 - Dashboard QA: Permisos de endpoints derivados para todos los modulos operativos

Objetivo: eliminar la repeticion de permisos endpoint por endpoint en el catalogo API central, dejando que cada bloque de modulo derive sus permisos desde `dashboardModuleApiEndpoints(...)`.

Cambios:
- `Dashboard/src/app/core/modules/dashboard-api.config.ts` extiende `dashboardModuleApiEndpoints(...)` con `defaultPermissions`, mantiene `permissionAccess` para excepciones y normaliza `users`, `invoicing`, `products`, `inventory`, `monitoring`, `workspace` y `tenant-admin`.
- El catalogo API conserva las mismas claves, backends, metodos, rutas y descripciones, pero deja de copiar `tenantPermission(...)` por endpoint fuera del bootstrap `dashboard.summary`.
- `Dashboard/src/app/core/modules/dashboard-api-catalog.service.spec.ts` agrega expectativas de permisos derivados para ecommerce, users/roles, invoicing, inventory, monitoring, workspace y tenant-admin.
- `Dashboard/tools/check-architecture.mjs` exige que todos los modulos operativos con endpoints usen `dashboardModuleApiEndpoints(...)`, valida `defaultPermissions: [PLATFORM_ADMIN_PERMISSION]` para tenant-admin y bloquea `permissions: [tenantPermission(...)]` repetidos por endpoint.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta `defaultPermissions` y establece que los modulos operativos no deben copiar permisos endpoint por endpoint.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health` y `node node_modules/playwright/cli.js test tests/e2e/smoke.spec.ts --grep "monitoring tenant sidebar|tenant navigation hides platform admin"`.
- La spec focal `node node_modules/vitest/vitest.mjs run src/app/core/modules/dashboard-api-catalog.service.spec.ts` no pudo arrancar por la dependencia opcional faltante `@rollup/rollup-linux-x64-gnu` en `node_modules`, problema ya conocido del entorno local.

### 2026-06-18 - Dashboard QA: Permisos de endpoints ecommerce derivados por bloque

Objetivo: reducir el acoplamiento y la duplicacion en el catalogo API, evitando repetir `tenantPermission('ecommerce', 'update')` en cada endpoint operativo de Paramascotas.

Cambios:
- `Dashboard/src/app/core/modules/dashboard-api.config.ts` agrega `dashboardModuleApiEndpoints(...)`, que aplica permisos por defecto desde el modulo del bloque y permite excepciones con `permissionAccess` o permisos especiales explicitos.
- El bloque `ecommerce` del catalogo API ahora deriva por defecto `ecommerce.update` desde `dashboardModuleApiEndpoints('ecommerce', ..., { defaultPermissionAccess: 'update' })`, conservando rutas, backends, metodos y descripciones existentes.
- `Dashboard/src/app/core/modules/dashboard-api-catalog.service.spec.ts` verifica que endpoints ecommerce como productos, cotizaciones de ordenes y RIDE PDF reciban permisos derivados.
- `Dashboard/tools/check-architecture.mjs` bloquea volver a repetir `tenantPermission('ecommerce', 'update')` endpoint por endpoint y exige el helper central.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta el patron de endpoints por modulo con permiso por defecto, `permissionAccess` para excepciones y `permissions` solo para permisos especiales.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint` y `npm run arch:check` en `Dashboard`.

### 2026-06-18 - Dashboard QA: Claves especiales de modulos centralizadas

Objetivo: evitar que reglas especiales como el modulo base `dashboard` o la configuracion adicional de Ecommerce dependan de strings repetidos en tenant-admin, fixtures o facades.

Cambios:
- `Dashboard/src/app/core/tenant/tenant-module-catalog.ts` exporta `BASE_TENANT_MODULE_KEY`, `ECOMMERCE_TENANT_MODULE_KEY`, `tenantContractModules()` y `tenantHasEcommerceModule()`.
- `Dashboard/src/app/core/tenant/tenant-fixture.store.ts` usa `tenantContractModules()` para contratos fixture y `tenantHasEcommerceModule()` para sincronizar configuracion ecommerce.
- `Dashboard/src/app/features/tenant-admin/data/tenant-admin.fixtures.ts`, `tenant-admin.component.ts` y `tenant-admin.facade.ts` dejan de decidir la logica operativa con strings `dashboard`/`ecommerce` y consumen los helpers del catalogo.
- `Dashboard/src/app/core/modules/dashboard-modules.config.spec.ts`, `Dashboard/tools/check-architecture.mjs` y `Dashboard/docs/API-FIRST-MODULES.md` documentan/verifican que estos contratos especiales sigan centralizados.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`.
- Pasaron Playwright focales: `node node_modules/playwright/cli.js test tests/e2e/smoke.spec.ts --grep "tenant admin|coverage matrix|quick presets"` (`4/4`) y `node node_modules/playwright/cli.js test tests/e2e/smoke.spec.ts --grep "monitoring tenant sidebar|tenant navigation hides platform admin"` (`2/2`).
- No se tocaron backend, DB, Gateway, Facturador, SRI, certificados ni produccion.

### 2026-06-18 - Dashboard QA: Tenant-admin valida modulos contra catalogo central

Objetivo: cerrar el borde donde alta/edicion de tenants podia aceptar claves de modulos no registradas en la arquitectura modular central.

Cambios:
- `Dashboard/src/app/features/tenant-admin/data/tenant-admin.fixtures.ts` valida `enabledModules` contra `TENANT_MODULE_OPTIONS`, agrega `dashboard` como modulo base y rechaza payloads invalidos con `400 TENANT_MODULES_INVALID`.
- `Dashboard/src/app/features/tenant-admin/data/tenant-admin-api.service.spec.ts` cubre create/update con un modulo inexistente (`ghost-service`) y espera rechazo de contrato.
- `Dashboard/tools/check-architecture.mjs` bloquea que tenant-admin vuelva a deduplicar `payload.enabledModules` sin validacion de catalogo.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta el contrato de `enabledModules`: toda clave debe existir en `TENANT_MODULE_CATALOG` y los fixtures/APIs de desarrollo deben rechazar desconocidos.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`.
- Pasaron Playwright focales: `node node_modules/playwright/cli.js test tests/e2e/smoke.spec.ts --grep "tenant admin|coverage matrix|quick presets"` (`4/4`) y `node node_modules/playwright/cli.js test tests/e2e/smoke.spec.ts --grep "monitoring tenant sidebar|tenant navigation hides platform admin"` (`2/2`).
- Vitest focal `npx vitest run src/app/features/tenant-admin/data/tenant-admin-api.service.spec.ts` no arranca por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`); la spec nueva queda cubierta por `type:check` y la build Docker.
- No se tocaron backend, DB, Gateway, Facturador, SRI, certificados ni produccion.

### 2026-06-18 - Dashboard QA: Submenus replegados con area clicable completa

Objetivo: cerrar el caso reportado donde el menu replegado respondia en los grupos principales, pero los submenus podian sentirse inoperables o no evidenciar cambio de vista.

Cambios:
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.css` fuerza los enlaces de menu y submenu a ocupar el ancho completo, con cursor y capa propia, para que toda la fila sea clicable y no solo el texto.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` ahora verifica que el click de submenu cambie tambien el H1 renderizado, no solo la URL, en desktop replegado y mobile.
- `Dashboard/tests/e2e/paramascotas-real-auth.spec.ts` valida el caso publico real: login por `https://paramascotasec.com/dashboard`, MFA, sidebar replegado, submenu `Reportes > Reporte de ventas` y render del reporte; tambien actualiza la expectativa POS a la nueva barra `Agregar producto`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`.
- Pasaron Playwright focales: `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "collapsed sidebar submenus|collapsed submenu links keep|mobile sidebar expands submenu"` (`3/3`) y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-auth.spec.ts --grep "tenant admin signs in"` (`1/1`).
- No se tocaron backend, DB, Gateway, Facturador, SRI, certificados ni produccion.

### 2026-06-18 - Dashboard QA: Catalogo API valida modulos contratados

Objetivo: impedir que un servicio frontend resuelva URLs de endpoints pertenecientes a modulos no contratados por el tenant cargado.

Cambios:
- `Dashboard/src/app/core/tenant/tenant-module-access.service.ts` agrega un estado transversal liviano de modulos habilitados y estado activo del tenant.
- `Dashboard/src/app/core/tenant/tenant-context.service.ts` actualiza/limpia ese estado al cargar, cambiar o fallar el contexto tenant; `hasModule()` ahora delega en esa capa.
- `Dashboard/src/app/core/modules/dashboard-api-catalog.service.ts` relaciona cada endpoint con su `ModuleKey`, expone `endpointModule()` y hace que `url()`/`publicUrl()` rechacen endpoints de modulos deshabilitados cuando ya existe contexto tenant cargado. Los endpoints bootstrap del modulo `dashboard` siguen disponibles para login, sesion y resolucion de contexto.
- `Dashboard/src/app/core/modules/dashboard-api-catalog.service.spec.ts` cubre el caso `billing-only` que permite `invoicing.invoices` y rechaza `ecommerce.products`.
- `Dashboard/tools/check-architecture.mjs` exige que el catalogo API valide contra `TenantModuleAccessService`.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta la validacion runtime de endpoints por modulo contratado.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`.
- Pasaron Playwright focales: `node node_modules/playwright/cli.js test tests/e2e/smoke.spec.ts --grep "fixture password sign-in|tenant navigation hides platform admin|monitoring tenant sidebar"` (`3/3`) y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "paramascotas route /paramascotas-backend|paramascotas route /paramascotas-panel/reporting/general"` (`2/2`).
- No se tocaron backend, DB, Gateway, Facturador, SRI, certificados ni produccion.

### 2026-06-18 - Dashboard QA: Fixtures tenant alineados al catalogo modular

Objetivo: evitar que el modo fixture conserve listas paralelas de modulos que contradigan la arquitectura API-first por servicios contratados.

Cambios:
- `Dashboard/src/app/core/tenant/tenant-fixture.store.ts` exporta `allTenantModuleKeys` derivado de `TENANT_MODULE_OPTIONS`; el tenant demo ya no mantiene una lista manual de todos los modulos.
- El mismo store agrega `tenantFixtureRecordBySlug()` y `fixtureModulesForTenant()` para que otros fixtures obtengan modulos habilitados desde el registro tenant fixture, no desde arrays propios.
- `Dashboard/src/app/core/auth/auth.fixtures.ts` elimina `fixtureSessionModules`; las sesiones fallback calculan permisos read-only con `fixtureModulesForTenant(tenantSlug)`.
- `Dashboard/src/app/core/tenant/tenant.fixtures.spec.ts` valida que el tenant demo devuelva exactamente las claves de `TENANT_MODULE_OPTIONS`.
- `Dashboard/tools/check-architecture.mjs` bloquea reintroducir una lista manual de modulos para auth fixtures o un `fullTenantModules` escrito a mano en el store tenant.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`.
- Pasaron Playwright focales: `node node_modules/playwright/cli.js test tests/e2e/smoke.spec.ts --grep "fixture password sign-in|tenant navigation hides platform admin|monitoring tenant sidebar"` (`3/3`) y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "paramascotas route /paramascotas-backend|paramascotas route /paramascotas-panel/reporting/general"` (`2/2`).
- La ejecucion focal de Vitest para `tenant.fixtures.spec.ts` y `auth-api.service.spec.ts` no pudo arrancar por la dependencia opcional faltante local de Rollup (`@rollup/rollup-linux-x64-gnu`), problema conocido del `node_modules` local; la cobertura efectiva se hizo con typecheck, lint, build Docker y Playwright.
- No se tocaron backend, DB, Gateway, Facturador, SRI, certificados ni produccion.

### 2026-06-18 - Dashboard QA: Backends API y generador sin listas paralelas

Objetivo: cerrar fuentes paralelas restantes en la arquitectura API-first y evitar que nuevos modulos generen endpoints o menus fuera del catalogo central.

Cambios:
- `Dashboard/src/app/core/navigation/navigation.registry.ts` se elimina; la unica fuente de navegacion queda en `core/modules/dashboard-navigation.config.ts`, consumida por `DashboardModuleRegistryService`.
- `Dashboard/src/app/core/modules/dashboard-api.config.ts` deriva `DashboardApiBackendKey` desde `DASHBOARD_API_BACKENDS`; ya no hay union manual para backends logicos.
- `Dashboard/tools/check-architecture.mjs` bloquea que vuelva `navigation.registry.ts`, que vuelva una union manual de `DashboardApiBackendKey`, que servicios API pasen endpoints crudos a `ApiClientService`, y exige que el generador derive acciones desde `TENANT_MODULE_CATALOG.permissionActions`.
- `Dashboard/tools/generate-feature.mjs` ahora lee `permissionActions` del catalogo tenant cuando el modulo existe; por ejemplo, `monitoring` genera endpoints `read/create/update` y ya no propone `delete`.
- `Dashboard/docs/API-FIRST-MODULES.md`, `FEATURE-BLUEPRINT.md`, `MODULE-API-BLUEPRINT.md` y `ARCHITECTURE.md` documentan que los backends y acciones generadas salen de catalogos centrales.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `node tools/generate-feature.mjs qa-api-first-guard --module=monitoring --endpoint=monitoring/qa-api-first-guard --endpoint-key=monitoring.qa-api-first-guard --label="QA API First Guard" --dry-run`, `npm run docker:up` y `npm run docker:health`.
- Pasaron Playwright focales: `node node_modules/playwright/cli.js test tests/e2e/smoke.spec.ts --grep "tenant navigation hides platform admin|monitoring tenant sidebar"` (`2/2`) y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "paramascotas route /paramascotas-backend|paramascotas route /paramascotas-panel/reporting/general"` (`2/2`).
- No se tocaron backend, DB, Gateway, Facturador, SRI, certificados ni produccion.

### 2026-06-18 - Dashboard QA: ModuleKey derivado del catalogo tenant

Objetivo: quitar la union manual de modulos y dejar que la identidad de modulos tenant salga de una sola fuente.

Cambios:
- `Dashboard/src/app/core/tenant/tenant-module-catalog.ts` ahora exporta `ModuleKey` como `keyof typeof TENANT_MODULE_CATALOG` y tambien concentra `PermissionAction`.
- `Dashboard/src/app/core/tenant/tenant.models.ts` deja de declarar una union paralela y reexporta `ModuleKey`/`PermissionAction` desde el catalogo tenant.
- `Dashboard/src/app/core/modules/dashboard-module-capabilities.config.ts` deriva capacidades con `reduce()` desde `TENANT_MODULE_OPTIONS`, compatible con el tipo derivado del catalogo.
- `Dashboard/tools/check-architecture.mjs` bloquea volver a declarar una union manual de `ModuleKey`, exige el reexport desde `tenant.models.ts` y valida que el catalogo sea la fuente del tipo.
- `Dashboard/tools/generate-feature.mjs` y docs de arquitectura/API-first ya no instruyen editar `tenant.models.ts` para registrar modulos.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `node tools/generate-feature.mjs qa-derived-module --module=monitoring --endpoint=monitoring/qa-derived-module --endpoint-key=monitoring.qa-derived-module --label="QA Derived Module" --dry-run`, `npm run docker:up`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/smoke.spec.ts --grep "tenant navigation hides platform admin|monitoring tenant sidebar"` y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "paramascotas route /paramascotas-backend|paramascotas route /paramascotas-panel/reporting/general"`.
- No se tocaron backend, DB, Gateway, Facturador, SRI ni produccion.

### 2026-06-18 - Dashboard QA: Route sources en catalogo central de modulos

Objetivo: eliminar otra lista paralela de arquitectura modular moviendo las fuentes de rutas al catalogo central de modulos tenant.

Cambios:
- `Dashboard/src/app/core/tenant/tenant-module-catalog.ts` agrega `routeSources` a cada `TenantModuleDefinition`; ahora cada modulo concentra identidad, permisos y fuentes de rutas habilitadas.
- `Dashboard/src/app/core/modules/dashboard-module-capabilities.config.ts` queda como adaptador derivado desde `TENANT_MODULE_OPTIONS`, sin mapa paralelo `modulo -> routeSources`.
- `Dashboard/src/app/core/modules/dashboard-modules.config.spec.ts` valida que las fuentes de ruta de cada modulo coincidan con `TENANT_MODULE_CATALOG[module].routeSources`.
- `Dashboard/tools/check-architecture.mjs` bloquea que vuelva un mapa paralelo de route sources y exige `routeSources` en `TENANT_MODULE_CATALOG`.
- `Dashboard/tools/generate-feature.mjs` y docs (`API-FIRST-MODULES.md`, `FEATURE-BLUEPRINT.md`, `MODULE-API-BLUEPRINT.md`, `ARCHITECTURE.md`) ahora indican registrar route sources en el catalogo tenant, y `app-route-sources.ts` solo como mapa fisico de rutas.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `node tools/generate-feature.mjs qa-route-source --module=monitoring --endpoint=monitoring/qa-route-source --endpoint-key=monitoring.qa-route-source --label="QA Route Source" --dry-run`, `npm run docker:up`, `npm run docker:health`.
- Pasaron Playwright focales: `node node_modules/playwright/cli.js test tests/e2e/smoke.spec.ts --grep "tenant navigation hides platform admin|monitoring tenant sidebar"` (`2/2`) y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "paramascotas route /paramascotas-backend|paramascotas route /paramascotas-panel/reporting/general"` (`2/2`).
- No se tocaron backend, DB, Gateway, Facturador, SRI, certificados ni produccion.

### 2026-06-18 - Dashboard QA: Textos y guardrails API sin rutas quemadas

Objetivo: seguir cerrando acoplamientos API-first eliminando residuos de rutas `/api/...` fuera del catalogo central y evitando regresiones en servicios API de features.

Cambios:
- `Dashboard/src/app/features/dashboard/data/paramascotas-backend-api.service.ts` deja de mostrar `/api/admin/dashboard/stats` como fuente textual; ahora recibe la firma publica calculada con `DashboardApiCatalogService.publicUrl('ecommerce.dashboard-stats')` y agrega los query examples sobre esa ruta registrada.
- `Dashboard/src/app/features/monitoring/README.md` documenta endpoints por clave (`monitoring.summary`, `monitoring.events`, etc.) y paths backend relativos, aclarando que `url(...)` resuelve consumo interno y `publicUrl(...)` documenta APISIX.
- `Dashboard/tools/check-architecture.mjs` amplía el guardrail para bloquear literales `/api/...` o `/dashboard/api/...` en todos los servicios API revisados, no solo en `paramascotas-panel-api.service.ts`.
- `Dashboard/src/app/core/auth/auth-api.service.ts` y `Dashboard/src/app/core/tenant/tenant-api.service.ts` dejan de importar `realBackendRequestContext` desde la carpeta `fixtures`; ahora usan el wrapper neutral `backendApiRequestContext()` de `core/http/api-request-context.ts`.
- El guardrail tambien bloquea imports directos a `fixtures/fixture-backend.context` desde servicios API/productivos, preservando ese archivo como detalle interno de infraestructura HTTP.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`.
- Pasaron Playwright focales: `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "paramascotas route /paramascotas-backend|paramascotas route /paramascotas-panel/reporting/general"` (`2/2`) y `node node_modules/playwright/cli.js test tests/e2e/smoke.spec.ts --grep "fixture password sign-in|tenant navigation hides platform admin|monitoring tenant sidebar"` (`3/3`).
- No se tocaron backend, DB, Gateway, Facturador, SRI, certificados ni produccion.

### 2026-06-18 - Dashboard QA: Fallback de navegacion para submenus replegados

Objetivo: corregir el caso donde el menu replegado abria grupos principales pero un submenu podia no navegar si Angular cancelaba o fallaba la navegacion interna.

Cambios:
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.ts` ahora calcula el destino logico de Angular y tambien el `href` publico bajo `/dashboard`; si `router.navigateByUrl()` devuelve `false` o rechaza, usa el `href` real como fallback.
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.spec.ts` agrega cobertura para el fallback cuando se cancela la navegacion de un submenu del flyout replegado.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`.
- Pasaron Playwright focales: `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "collapsed sidebar submenus|collapsed submenu links|switches submenu"` (`3/3`) despues del redeploy.
- `npm run test -- --run src/app/layout/shell/side-nav/side-nav.component.spec.ts` no arranco en el host por Node `22.22.2`; Angular CLI exige `22.22.3+`, `24.15+` o `26`. El build Docker con Node 26 si paso.
- No se tocaron backend, DB, Gateway, Facturador, SRI, certificados ni produccion.

### 2026-06-18 - Dashboard QA: Registro central de fixtures fuera del bootstrap

Objetivo: quitar de `app.config.ts` el conocimiento directo de fixtures por modulo/feature, manteniendo un punto unico para providers de backend simulado de desarrollo.

Cambios:
- `Dashboard/src/app/app-fixture-handlers.ts` centraliza los providers de fixtures (`APP_FIXTURE_HANDLERS`) de auth, tenant, dashboard, ecommerce/templates, usuarios, inventario, productos, monitoreo, workspace y tenant-admin.
- `Dashboard/src/app/app.config.ts` deja de importar `@features/*/*.fixtures` y solo registra `...APP_FIXTURE_HANDLERS`, manteniendo el bootstrap enfocado en router, HTTP, interceptores y environment.
- `Dashboard/tools/check-architecture.mjs` permite el nuevo archivo raiz y bloquea que `app.config.ts` vuelva a importar features o archivos `*.fixtures.ts` directamente.
- `Dashboard/tools/generate-feature.mjs` imprime el snippet de fixtures apuntando a `app-fixture-handlers.ts`.
- `Dashboard/docs/API-FIRST-MODULES.md`, `ARCHITECTURE.md` y `MODULE-API-BLUEPRINT.md` documentan que los fixtures se registran en `app-fixture-handlers.ts`, no en `app.config.ts`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `node tools/generate-feature.mjs qa-fixtures --module=monitoring --endpoint=monitoring/qa-fixtures --endpoint-key=monitoring.qa-fixtures --label="QA Fixtures" --dry-run`, `npm run docker:up`, `npm run docker:health`.
- Pasaron Playwright focales: `node node_modules/playwright/cli.js test tests/e2e/smoke.spec.ts --grep "tenant navigation hides platform admin|monitoring tenant sidebar"` (`2/2`) y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "paramascotas route /paramascotas-panel/reporting/general|paramascotas route /paramascotas-panel/operations/local-sales"` (`2/2`).
- `npm run test -- --run src/app/core/modules/dashboard-modules.config.spec.ts` no arranco en el host por Node `22.22.2`; Angular CLI exige `22.22.3+`, `24.15+` o `26`. El build Docker con Node 26 si paso.
- No se tocaron backend, DB, Gateway, Facturador, SRI, certificados ni produccion.

### 2026-06-18 - Dashboard QA: Catalogo API derivado del catalogo tenant

Objetivo: quitar otra lista paralela de modulos en la configuracion API, evitando declarar entradas vacias para modulos sin endpoints y manteniendo el mapa publico completo derivado desde el catalogo tenant.

Cambios:
- `Dashboard/src/app/core/modules/dashboard-api.config.ts` separa `DASHBOARD_MODULE_API_ENDPOINTS_BY_MODULE` como mapa parcial editable de endpoints reales y deriva `DASHBOARD_MODULE_API_ENDPOINTS` desde `TENANT_MODULE_OPTIONS`, rellenando automaticamente `[]` para modulos sin endpoints.
- Se eliminaron entradas vacias manuales para `email-service`, `medical-office` y `ui-kit` del mapa fuente de endpoints.
- `Dashboard/src/app/core/modules/dashboard-modules.config.spec.ts` valida que `DASHBOARD_MODULE_API_ENDPOINTS` tenga una entrada calculada para cada modulo tenant.
- `Dashboard/tools/check-architecture.mjs` exige que `dashboard-api.config.ts` derive el mapa publico desde `TENANT_MODULE_OPTIONS`.
- `Dashboard/tools/generate-feature.mjs` y docs (`API-FIRST-MODULES.md`, `MODULE-API-BLUEPRINT.md`, `FEATURE-BLUEPRINT.md`, `ARCHITECTURE.md`) apuntan al mapa parcial `DASHBOARD_MODULE_API_ENDPOINTS_BY_MODULE` como lugar editable para nuevos endpoints.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `node tools/generate-feature.mjs qa-api-first --module=monitoring --endpoint=monitoring/qa-api-first --endpoint-key=monitoring.qa-api-first --label="QA API First" --dry-run`, `npm run docker:up`, `npm run docker:health`.
- Pasaron Playwright focales: `node node_modules/playwright/cli.js test tests/e2e/smoke.spec.ts --grep "tenant navigation hides platform admin|monitoring tenant sidebar"` (`2/2`) y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "paramascotas route /paramascotas-panel/reporting/general|paramascotas route /paramascotas-panel/operations/local-sales"` (`2/2`).
- `npm run test -- --run src/app/core/modules/dashboard-api-catalog.service.spec.ts src/app/core/modules/dashboard-modules.config.spec.ts` no arranco en el host por Node `22.22.2`; Angular CLI exige `22.22.3+`, `24.15+` o `26`. El build Docker con Node 26 si paso.
- No se tocaron backend, DB, Gateway, Facturador, SRI, certificados ni produccion.

### 2026-06-18 - Dashboard QA: Fuentes de rutas sin union paralela

Objetivo: reducir otro acoplamiento de la arquitectura modular eliminando la lista manual de fuentes de rutas y derivando capacidades de modulos desde el catalogo tenant.

Cambios:
- `Dashboard/src/app/core/modules/dashboard-route.config.ts` deja de mantener una union hardcodeada de `DashboardRouteSourceKey`; las claves de fuentes pasan a ser strings registradas en `app-route-sources.ts`, y `buildDashboardPrivateRoutesFromRegistry()` falla rapido si una capacidad apunta a una fuente no registrada.
- `Dashboard/src/app/core/modules/dashboard-module-capabilities.config.ts` deriva `DASHBOARD_MODULE_CAPABILITIES` desde `TENANT_MODULE_OPTIONS`; solo queda un mapa interno de modulos con fuentes de ruta reales, evitando entradas vacias repetidas para modulos sin pantalla.
- `Dashboard/src/app/core/modules/dashboard-modules.config.spec.ts` agrega cobertura para el fallo rapido cuando falta una fuente de rutas registrada.
- `Dashboard/tools/check-architecture.mjs` ahora exige que capacidades se deriven de `TENANT_MODULE_OPTIONS` y bloquea que `DashboardRouteSourceKey` vuelva a ser una union manual.
- `Dashboard/docs/API-FIRST-MODULES.md` y `MODULE-API-BLUEPRINT.md` aclaran que `app-route-sources.ts` es el registro real de fuentes y que `dashboard-route.config.ts` valida la composicion.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`.
- Pasaron Playwright focales: `node node_modules/playwright/cli.js test tests/e2e/smoke.spec.ts --grep "tenant navigation hides platform admin|monitoring tenant sidebar"` (`2/2`) y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "paramascotas route /paramascotas-panel/reporting/general|paramascotas route /paramascotas-panel/operations/local-sales"` (`2/2`).
- `npm run test -- --run src/app/core/modules/dashboard-modules.config.spec.ts` no arranco en el host por Node `22.22.2`; Angular CLI exige `22.22.3+`, `24.15+` o `26`. El build Docker con Node 26 si paso.
- No se tocaron backend, DB, Gateway, Facturador, SRI, certificados ni produccion.

### 2026-06-18 - Dashboard QA: Paramascotas Panel y generador alineados al catalogo API

Objetivo: eliminar reconstrucciones manuales de rutas internas/publicas en `ParamascotasPanel` y evitar que el generador de features vuelva a crear servicios CRUD con endpoints legacy.

Cambios:
- `Dashboard/src/app/features/dashboard/data/paramascotas-panel-api.service.ts` resuelve rutas internas con `DashboardApiCatalogService.url(...)` y firmas publicas APISIX con `publicUrl(...)`; ya no recompone `/dashboard/api/...` ni `/api/...` a mano.
- `Dashboard/src/app/features/dashboard/data/paramascotas-panel-api.service.spec.ts` cubre que una fuente del panel use la URL interna `/dashboard/api/...` para HTTP y la firma publica tenantizada para auditoria.
- `Dashboard/tools/generate-feature.mjs` ahora genera servicios `ApiResource` con `endpointKeys`, imprime snippets para `DASHBOARD_MODULE_API_ENDPOINTS`, `dashboard-module-capabilities.config.ts` y `dashboard-navigation.config.ts`, y deja `--endpoint-key` como opcion explicita.
- `Dashboard/tools/check-architecture.mjs` bloquea regresiones del generador hacia `protected endpoint = ...`, `navigation.registry.ts` o ausencia de snippets del catalogo API.
- `Dashboard/docs/API-FIRST-MODULES.md`, `ARCHITECTURE.md`, `FEATURE-BLUEPRINT.md` y `MODULE-API-BLUEPRINT.md` documentan que las pantallas de auditoria/soporte tambien deben derivar rutas desde el catalogo, y que `--endpoint` es ruta backend mientras `--endpoint-key` es clave estable.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `node tools/generate-feature.mjs qa-api-first --module=monitoring --endpoint=monitoring/qa-api-first --endpoint-key=monitoring.qa-api-first --label="QA API First" --dry-run`, `npm run docker:health`.
- Pasaron Playwright focales: `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "paramascotas route /paramascotas-panel/reporting/general|paramascotas route /paramascotas-panel/operations/local-sales"` (`2/2`) y `--grep "collapsed sidebar submenus|mobile sidebar expands submenu|collapsed submenu links keep"` (`3/3`).
- El Dashboard ya habia sido redeplegado con `npm run docker:up` tras el cambio de `paramascotas-panel-api.service.ts`; los cambios posteriores del generador/documentacion no requieren redeploy de runtime.
- `npm run test -- --run src/app/layout/shell/side-nav/side-nav.component.spec.ts` no arranco en el host por Node `22.22.2`; Angular CLI exige `22.22.3+`, `24.15+` o `26`.
- No se tocaron backend, DB, Gateway, Facturador, SRI, certificados ni produccion.

### 2026-06-18 - Dashboard QA: Submenus del sidebar replegado accionables

Objetivo: corregir que el menu lateral replegado permitiera activar grupos principales pero dejara los submenus inconsistentes o dificiles de usar.

Cambios:
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.ts` diferencia previsualizacion por hover de apertura fijada por click (`collapsedFlyoutPinned`), permite cerrar el mismo submenu con un segundo click y recalcula la posicion del flyout desde el borde real del sidebar.
- `side-nav.component.html/css` posicionan el flyout con `left/top` calculados, elevan su `z-index`, mantienen `pointer-events` y preservan los `href` publicos bajo `/dashboard/` mientras Angular navega internamente.
- `side-nav.component.spec.ts` agrega cobertura para hover + click, cierre por segundo click y navegacion de submenus con query tenant.
- `tests/e2e/paramascotas-real-integrations.spec.ts` ahora valida que el segundo click cierre el flyout y que los submenus replegados sigan navegando.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`.
- Pasaron Playwright focales: `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "collapsed sidebar submenus|mobile sidebar expands submenu|collapsed submenu links|clean tablet layout"` (`4/4`) antes y despues del redeploy del Dashboard.
- `npm run test -- --run src/app/layout/shell/side-nav/side-nav.component.spec.ts` no arranco en el host por Node `22.22.2`; Angular CLI exige `22.22.3+`, `24.15+` o `26`. La cobertura quedo validada por `type:check`, lint, build Docker con Node 26 y Playwright.
- No se tocaron backend, DB, Gateway, Facturador, SRI, certificados ni produccion.

### 2026-06-18 - Dashboard QA: Permisos por modulo y rutas publicas API documentadas

Objetivo: seguir cerrando duplicaciones de arquitectura API-first, especialmente la lista paralela de permisos por modulo y la falta de trazabilidad entre endpoints internos del Dashboard y rutas publicas esperadas por APISIX.

Cambios:
- `Dashboard/src/app/core/tenant/tenant-module-catalog.ts` agrega `permissionActions` a cada modulo contratable, dejando en el catalogo central la politica `modulo -> acciones`.
- `Dashboard/src/app/core/tenant/tenant-permissions.ts` deriva `TENANT_PERMISSION_OPTIONS` desde `TENANT_MODULE_OPTIONS`, conservando permisos especiales de roles y `platform-admin` sin duplicar listas de modulos.
- `Dashboard/src/app/core/tenant/tenant-permissions.spec.ts` valida que las opciones de permisos, roles readonly y filtros por modulos contratados dependan del catalogo central.
- `Dashboard/src/app/core/modules/dashboard-api.config.ts` agrega `publicBasePath` por backend logico, separando el consumo interno del Dashboard (`basePath`, normalmente `/dashboard/api`) del contrato publico APISIX (`/${PUBLIC_TENANT_SLUG}/${PUBLIC_API_SERVICE_SEGMENT}` o facturacion tenantizada).
- `Dashboard/src/app/core/modules/dashboard-api-catalog.service.ts` agrega `publicUrl(...)` para mapear cualquier endpoint registrado a su ruta publica esperada, mientras los servicios siguen consumiendo `url(...)`.
- `Dashboard/docs/API-FIRST-MODULES.md` documenta como agregar modulos, endpoints, consumos internos, rutas publicas APISIX y guardrails. `ARCHITECTURE.md` y `MODULE-API-BLUEPRINT.md` enlazan esa guia.
- `Dashboard/tools/check-architecture.mjs` ahora exige permisos derivados del catalogo y `publicBasePath/publicUrl` para trazabilidad APISIX.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`.
- La prueba unitaria focal `npm run test -- --include src/app/core/tenant/tenant-permissions.spec.ts` no arranco en el host por Node `22.22.2`; Angular CLI exige `22.22.3+`, `24.15+` o `26`. La spec quedo cubierta por `type:check` y por build Docker con Node 26.
- Pasaron Playwright tenant/modulos/permisos: `node node_modules/playwright/cli.js test tests/e2e/smoke.spec.ts --grep "tenant admin|coverage matrix|quick presets|tenant navigation hides platform admin|monitoring tenant sidebar"` (`6/6`).
- Pasaron Playwright Paramascotas focales: `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "paramascotas route /paramascotas-panel/reporting/general|paramascotas route /paramascotas-panel/operations/local-sales"` (`2/2`).
- No se tocaron SRI, certificados ni produccion. El Gateway ya expone backend/facturacion por rutas tenantizadas generadas por `Gateway/scripts/sync-apisix.sh`; no se abrieron rutas legacy.

### 2026-06-18 - Dashboard QA: ApiResource solo consume endpoints del catalogo

Objetivo: eliminar la ruta legacy que permitia a servicios CRUD declarar endpoints manuales en frontend, reforzando que productos, usuarios, roles, facturas, monitoreo y workspace usen claves del catalogo API central.

Cambios:
- `Dashboard/src/app/core/http/api-resource.ts` elimina `endpoint` y `legacyEndpoint()`. Las operaciones `list/create/detail/update/remove` ahora fallan rapido si el servicio no declara la clave `endpointKeys` correspondiente.
- `Dashboard/src/app/core/http/api-resource.spec.ts` valida que un recurso CRUD construya URLs desde `DashboardApiCatalogService.url(...)` con `basePath` registrado y que no exista fallback manual cuando falta una clave.
- `Dashboard/tools/check-architecture.mjs` agrega guardrails para impedir que `ApiResource` recupere endpoints legacy y para validar que cada `endpointKeys` usado por servicios `data/*-api.service.ts` exista en `core/modules/dashboard-api.config.ts`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`.
- La prueba unitaria focal `npm run test -- --include src/app/core/http/api-resource.spec.ts` no arranco en el host por Node `22.22.2`; Angular CLI exige `22.22.3+`, `24.15+` o `26`. La spec quedo cubierta por `type:check` y por build Docker con Node 26.
- Pasaron Playwright CRUD/API-backed: `node node_modules/playwright/cli.js test tests/e2e/smoke.spec.ts --grep "fixture creates, edits, previews and deletes an invoice|tenant admin can create and delete custom roles|legacy RBAC routes use the API-backed roles screen"` (`3/3`).
- Pasaron Playwright de pantallas que consumen `ApiResource`: `node node_modules/playwright/cli.js test tests/e2e/smoke.spec.ts --grep "renders /products|renders /invoice-list|renders /users-list"` (`3/3`).

### 2026-06-18 - Dashboard QA: Catalogo API resuelve basePath por backend

Objetivo: cerrar una inconsistencia API-first donde los servicios ya usaban claves del catalogo central, pero las URLs HTTP finales seguian dependiendo del `API_BASE_URL` global y no del backend declarado por cada endpoint.

Cambios:
- `Dashboard/src/app/core/modules/dashboard-api-catalog.service.ts` agrega `url(endpointKey, params)`, resolviendo `backend.basePath + endpoint.path` desde `DASHBOARD_API_BACKENDS`.
- `Dashboard/src/app/core/http/api-client.service.ts` y `api-request.util.ts` reconocen URLs ya resueltas por cualquier backend registrado para no prefijarlas otra vez.
- `Dashboard/src/app/core/http/interceptors/fixture-backend.interceptor.ts` normaliza requests contra todos los `basePath` registrados, manteniendo fixtures locales compatibles con `/api` y `/dashboard/api`.
- Servicios de auth, tenant, tenant-admin, inventory, monitoring, workspace, resumen Paramascotas y recursos genericos migran requests HTTP a `apiCatalog.url(...)`.
- `ParamascotasPanelApiService` conserva `apiCatalog.path(...)` solo para mostrar firma/proxy de auditoria; el request real usa `apiCatalog.url(...)`.
- `Dashboard/tools/check-architecture.mjs` agrega guardrail para fallar si servicios API vuelven a usar `apiCatalog.path(...)` como URL de request.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`.
- Pasaron Playwright focales de Paramascotas: `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "paramascotas route /paramascotas-panel/reporting/general|paramascotas route /paramascotas-panel/operations/local-sales"` (`2/2`).
- Pasaron Playwright tenant-admin focales: `node node_modules/playwright/cli.js test tests/e2e/smoke.spec.ts --grep "demo tenant can open tenant admin|tenant admin renders the quick coverage matrix"` (`2/2`).
- Revalidados los submenus del sidebar replegado/mobile: `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "collapsed sidebar submenus|collapsed submenu links|mobile sidebar expands submenu links|switches submenu flyouts"` (`4/4`).

### 2026-06-18 - Dashboard QA: Route sources ecommerce y templates separados

Objetivo: separar las rutas ecommerce reales de Paramascotas de las rutas template/UI que convivian en `dashboard.routes.ts`, evitando que modulos distintos dependan del mismo source mixto.

Cambios:
- `Dashboard/src/app/features/dashboard/dashboard.routes.ts` exporta `ecommerceDashboardRoutes` para `paramascotas-backend`/`paramascotas-panel` y `dashboardTemplateRoutes` para `home*`, `widgets` y charts; conserva `dashboardRoutes` solo como agregado local/legacy.
- `Dashboard/src/app/app-route-sources.ts` registra sources separados `ecommerce` y `dashboard-templates`, dejando de consumir el source mixto.
- `Dashboard/src/app/core/modules/dashboard-route.config.ts` reemplaza el source key generico `dashboard` por `ecommerce` y `dashboard-templates`.
- `Dashboard/src/app/core/modules/dashboard-module-capabilities.config.ts` asigna `ecommerce -> ecommerce`, `ui-kit -> dashboard-templates + ui-kit` y deja el modulo base `dashboard` sin rutas visuales propias.
- `Dashboard/src/app/core/modules/dashboard-modules.config.spec.ts` actualiza las expectativas de route sources y confirma que UI Kit y ecommerce ya no comparten source.
- `Dashboard/tools/check-architecture.mjs` falla si `app-route-sources.ts` vuelve a importar `dashboardRoutes` en lugar de los sources separados.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`.
- Pasaron Playwright ecommerce focal: `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "paramascotas route /paramascotas-panel/reporting/general|paramascotas route /paramascotas-panel/operations/local-sales"` (`2/2`).
- Pasaron Playwright tenant-admin focal: `node node_modules/playwright/cli.js test tests/e2e/smoke.spec.ts --grep "demo tenant can open tenant admin|tenant admin renders the quick coverage matrix"` (`2/2`).
- Validado con Playwright directo que `http://127.0.0.1:8081/dashboard/home?tenant=demo` renderiza sin errores de pagina despues del split.

### 2026-06-18 - Dashboard QA: Capacidades de rutas por modulo centralizadas

Objetivo: eliminar el mapa paralelo `module -> routeSources` dentro de `dashboard-modules.config.ts`, reforzando que cada modulo tenga sus capacidades de rutas declaradas en una zona central clara.

Cambios:
- `Dashboard/src/app/core/modules/dashboard-module-capabilities.config.ts` registra `DASHBOARD_MODULE_CAPABILITIES`, con las fuentes de rutas habilitadas por cada `ModuleKey`.
- `Dashboard/src/app/core/modules/dashboard-modules.config.ts` deja de declarar `DASHBOARD_MODULE_ROUTE_SOURCES` y ahora arma cada `DashboardModuleDefinition` con `getDashboardModuleCapabilities(key)`.
- `Dashboard/src/app/core/modules/dashboard-modules.config.spec.ts` valida que las capacidades existan para todos los modulos del tenant catalog y que cada `routeSource` apunte a una fuente registrada.
- `Dashboard/tools/check-architecture.mjs` falla si `dashboard-modules.config.ts` vuelve a declarar un mapa paralelo de rutas o deja de resolver capacidades desde `dashboard-module-capabilities.config.ts`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`.
- Paso Playwright tenant-admin focal: `node node_modules/playwright/cli.js test tests/e2e/smoke.spec.ts --grep "tenant admin|coverage matrix|quick presets"` (`4/4`).

### 2026-06-18 - Dashboard QA: Navegaciones internas Paramascotas por manifiesto

Objetivo: eliminar otra fuente duplicada de rutas del panel Paramascotas, esta vez dentro del componente visual, para que los CTAs internos tambien dependan del manifiesto central de modulos/vistas.

Cambios:
- `Dashboard/src/app/core/modules/paramascotas-panel-manifest.config.ts` agrega `ParamascotasPanelRouteKey` y `paramascotasPanelRouteByKey()`, validando en runtime que la clave `grupo.item` exista en el manifiesto central antes de construir la URL.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` reemplaza las rutas hardcodeadas `/paramascotas-panel/...` por `navigatePanel('grupo.item')` para decisiones financieras, trazabilidad, inventario, alertas, usuarios y accesos cruzados de catalogo/operacion/finanzas.
- `Dashboard/src/app/features/dashboard/data/paramascotas-panel.registry.spec.ts` cubre que las rutas por clave del manifiesto resuelvan la misma URL esperada que las rutas por grupo/item.
- `Dashboard/tools/check-architecture.mjs` ahora falla si `ParamascotasPanelComponent` vuelve a declarar rutas `/paramascotas-panel/...` a mano.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`.
- Pasaron Playwright de rutas Paramascotas: `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "paramascotas route /paramascotas-panel/reporting/general|paramascotas route /paramascotas-panel/reporting/balance|paramascotas route /paramascotas-panel/operations/local-sales|paramascotas route /paramascotas-panel/finance/expenses"` (`4/4`).
- Pasaron Playwright de submenus: `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "collapsed sidebar submenus|collapsed sidebar switches|collapsed submenu|mobile sidebar expands submenu"` (`4/4`).

### 2026-06-18 - Dashboard QA: Submenus Paramascotas derivados de manifiesto central

Objetivo: corregir la fragilidad de los submenus de `Integraciones reales`, evitando que la navegacion lateral y el registry del panel Paramascotas declaren dos listas paralelas de vistas.

Cambios:
- `Dashboard/src/app/core/modules/paramascotas-panel-manifest.config.ts` centraliza grupos, items, labels de navegacion, iconos, tabs del panel anterior, modo de superficie y acciones verificadas de `ParamascotasPanel`.
- `Dashboard/src/app/core/modules/dashboard-navigation.config.ts` construye los submenus de `Reportes`, `Monitoreo`, `Catalogo`, `Operacion` y `Precios y finanzas` desde ese manifiesto mediante `paramascotasPanelRoute()`, dejando de quemar rutas `/paramascotas-panel/...`.
- `Dashboard/src/app/features/dashboard/data/paramascotas-panel.registry.ts` consume el mismo manifiesto y solo agrega el mapa de endpoints reales por vista, manteniendo la equivalencia visual/API sin duplicar estructura.
- `Dashboard/src/app/features/dashboard/models/paramascotas-panel.model.ts` reutiliza los tipos core del manifiesto para evitar divergencias entre capas.
- `Dashboard/tools/check-architecture.mjs` ahora falla si `dashboard-navigation.config.ts` vuelve a hardcodear subrutas de Paramascotas o deja de usar el manifiesto central.
- `Dashboard/src/app/features/dashboard/data/paramascotas-panel.registry.spec.ts` valida que el registry derive sus grupos/items desde `PARAMASCOTAS_PANEL_MANIFEST`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`.
- Pasaron Playwright de submenus: `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "collapsed sidebar submenus|collapsed sidebar switches|collapsed submenu|mobile sidebar expands submenu"` (`4/4`).
- Pasaron Playwright de rutas Paramascotas: `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "paramascotas route /paramascotas-panel/reporting/general|paramascotas route /paramascotas-panel/reporting/balance|paramascotas route /paramascotas-panel/operations/local-sales|paramascotas route /paramascotas-panel/finance/expenses"` (`4/4`).

### 2026-06-18 - Dashboard QA: Registry Paramascotas consume endpoints por catalogo

Objetivo: quitar rutas backend acopladas dentro del registry visual de `ParamascotasPanel`, para que las fuentes del panel anterior tambien dependan del catalogo central API-first.

Cambios:
- `Dashboard/src/app/features/dashboard/models/paramascotas-panel.model.ts` reemplaza `path()` por `endpointKey` y `pathParams`, separando la declaracion de fuente visual de la ruta backend concreta.
- `Dashboard/src/app/features/dashboard/data/paramascotas-panel-api.service.ts` resuelve cada fuente mediante `DashboardApiCatalogService`, manteniendo solo los query params y la firma de auditoria del panel.
- `Dashboard/src/app/features/dashboard/data/paramascotas-panel.registry.ts` deja de declarar rutas como `admin/report`, `products`, `orders` o `admin/settings/*`; ahora usa claves `ecommerce.*` registradas en `dashboard-api.config.ts`.
- El mismo registry deja de duplicar firmas `/api/...`; la firma visible y el path proxy se derivan en `ParamascotasPanelApiService` desde `DashboardApiCatalogService` mas query/path params.
- `Dashboard/src/app/core/modules/dashboard-api.config.ts` registra `ecommerce.pos-shifts` para el historial de turnos POS que faltaba en el catalogo central.
- `Dashboard/src/app/features/dashboard/data/paramascotas-panel.registry.spec.ts` valida que cada endpoint usado por el panel exista en el catalogo central.
- `Dashboard/tools/check-architecture.mjs` ahora falla si `paramascotas-panel.registry.ts` vuelve a declarar paths `/api/...` en lugar de `endpointKey`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`.
- Pasaron Playwright focales de panel: `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "paramascotas route /paramascotas-panel/reporting/general|paramascotas route /paramascotas-panel/reporting/balance|paramascotas route /paramascotas-panel/operations/local-sales|paramascotas route /paramascotas-panel/finance/expenses"` (`4/4`).
- La ejecucion directa de Vitest sigue bloqueada por la dependencia opcional faltante de Rollup en `node_modules` local (`@rollup/rollup-linux-x64-gnu`); el spec nuevo queda cubierto por `type:check` y por build Docker con Node 26.

### 2026-06-17 - Dashboard QA: Auth y contexto tenant por catalogo central

Objetivo: mover los contratos transversales de autenticacion y contexto tenant al catalogo central de APIs, separando sesion/tenant de la logica interna de los servicios.

Cambios:
- `Dashboard/src/app/core/modules/dashboard-api.config.ts` registra en el modulo base `dashboard` los endpoints de `tenant/context`, proveedores auth, sesion fixture/real, login fixture/real, solicitudes de acceso, recuperacion de clave, auth externa y logout.
- `Dashboard/src/app/core/auth/auth-api.service.ts` consume esas claves mediante `DashboardApiCatalogService`, manteniendo la separacion actual entre runtime fixture/local y backend real.
- `Dashboard/src/app/core/tenant/tenant-api.service.ts` consume `dashboard.tenant-context` desde el catalogo y conserva el desempaquetado del envelope real.
- `Dashboard/src/app/core/modules/dashboard-modules.config.spec.ts` valida que los endpoints core de `dashboard` sigan declarados junto al resto de modulos.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`.
- Pasaron Playwright auth fixture: `node node_modules/playwright/cli.js test tests/e2e/smoke.spec.ts --grep "sign-in|access request|password reset|fixture password|fixture logout|external auth callback"` (`11/11`).
- Paso Playwright publico real: `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-auth.spec.ts --grep "public auth endpoints require"` (`1/1`).

### 2026-06-17 - Dashboard QA: Tenant-admin y resumen Paramascotas consumen API por catalogo

Objetivo: seguir eliminando endpoints backend quemados en servicios del Dashboard, manteniendo la configuracion de APIs por modulo como fuente central.

Cambios:
- `Dashboard/src/app/features/tenant-admin/data/tenant-admin-api.service.ts` deja de construir `admin/tenants` y rutas hijas manualmente; usa `DashboardApiCatalogService` con `tenant-admin.tenants`, `tenant-admin.tenants.create`, `tenant-admin.tenants.modules` y `tenant-admin.tenants.configuration`.
- `Dashboard/src/app/features/dashboard/data/paramascotas-backend-api.service.ts` migra `health`, `products`, `admin/dashboard/stats` y `admin/inventory/intelligence` a claves registradas del modulo `ecommerce`.
- `Dashboard/src/app/core/modules/dashboard-modules.config.spec.ts` refuerza los guardrails para tenant-admin y para los endpoints ecommerce usados por el resumen Paramascotas.
- `Dashboard/tests/e2e/smoke.spec.ts` se alinea con el label central actual `Facturacion` en la matriz rapida.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`.
- Pasaron Playwright focales: `node node_modules/playwright/cli.js test tests/e2e/smoke.spec.ts --grep "tenant admin|coverage matrix|quick presets"` (`4/4`) y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "paramascotas route /paramascotas-backend loads"` (`1/1`).

### 2026-06-17 - Dashboard QA: Submenus operativos en sidebar replegado

Objetivo: corregir que el menu lateral replegado permitiera usar entradas principales pero no dejara operar de forma confiable los submenus.

Cambios:
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.{ts,html,css}` refuerza el flyout del sidebar replegado: los grupos con hijos abren submenu por click y por entrada de puntero/foco cuando no hay otro flyout activo, preservan `aria-expanded`, mantienen enlaces bajo `/dashboard` y evitan que un hover accidental reemplace el submenu antes de hacer click.
- Cuando un flyout ya esta abierto, pasar el puntero hacia el panel no cambia el grupo activo; para cambiar entre grupos replegados se usa click explicito sobre el icono del grupo, evitando que los enlaces del submenu se desmonten antes de seleccionarlos.
- El flyout ya no queda bloqueado por la regla responsive intermedia; solo se oculta en movil real, donde los submenus se expanden inline dentro del overlay.
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.spec.ts` y `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` agregan cobertura para submenu replegado por puntero, rutas con base publica, navegacion de Reportes/Catalogo/Operacion y cambio explicito entre flyouts de grupos.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`.
- Paso Playwright focal: `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "collapsed sidebar submenus|collapsed sidebar switches|collapsed submenu|mobile sidebar expands submenu"` (`4/4`).

### 2026-06-17 - Dashboard QA: Paramascotas Admin API completa settings y finanzas por catalogo

Objetivo: completar la migracion de `ParamascotasAdminApiService` para que settings, precios, descuentos, gastos, periodos financieros, ajustes, ventas historicas y CSRF de mutaciones no construyan rutas backend directamente.

Cambios:
- `Dashboard/src/app/core/modules/dashboard-api.config.ts` agrega claves por accion para actualizaciones de settings, pricing, creacion de descuentos/gastos, gastos recurrentes (`create/update/delete`) y mantiene los contratos financieros existentes con metodo explicito.
- `Dashboard/src/app/features/dashboard/data/paramascotas-admin-api.service.ts` reemplaza las rutas directas restantes por `this.apiPath(...)`, incluyendo `withMutationHeaders()` via `ecommerce.auth-session`.
- `Dashboard/src/app/core/modules/dashboard-modules.config.spec.ts` valida que las nuevas claves de settings/finanzas/descuentos/gastos sigan registradas en el modulo `ecommerce`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`.
- Pasaron Playwright focales: `discount form validates`, `business expenses reconciles`, `historical sales submit`, `shipments exposes`, `financial reports keep month` (`5/5`).
- Busqueda sobre `ParamascotasAdminApiService` ya no encuentra paths backend crudos como `admin/`, `orders/`, `products/`, `users/`, `uploads/` o `auth/session`; el unico match relacionado fue la clave central `ecommerce.shipments`.
- `ng test --include src/app/core/modules/dashboard-modules.config.spec.ts` sigue bloqueado por Node local `22.22.2`; Angular CLI exige `22.22.3+` o Node 24/26. Docker compila con Node 26.

### 2026-06-17 - Dashboard QA: Paramascotas Admin API migra bloque operacional al catalogo

Objetivo: seguir reduciendo acoplamiento API en `ParamascotasAdminApiService`, que aun concentraba rutas ecommerce escritas a mano pese al catalogo central de endpoints.

Cambios:
- `Dashboard/src/app/features/dashboard/data/paramascotas-admin-api.service.ts` inyecta `DashboardApiCatalogService` y migra a claves centrales los endpoints de productos, imagenes, RIDE PDF/reemision, pedidos, cotizacion server-side, detalle/factura de orden, estadisticas, inteligencia de inventario, facturas de compra, POS, cotizaciones, reportes y usuarios operativos.
- `Dashboard/src/app/core/modules/dashboard-api.config.ts` agrega claves faltantes `ecommerce.products.detail`, `ecommerce.billing-rides.pdf`, `ecommerce.admin-users.create` y `ecommerce.admin-users.update`.
- `Dashboard/src/app/core/modules/dashboard-modules.config.spec.ts` cubre esas claves dentro del registry central.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up` y `npm run docker:health`.
- Pasaron Playwright focales: `catalog products uses list view`, `catalog users keeps list view`, `local sales mirrors the real POS shift state` y `general report period selector` (`4/4`).
- El `ng test` focal sigue bloqueado por Node local `22.22.2`; Angular CLI exige `22.22.3+` o Node 24/26. El build Docker usa Node 26.

Pendiente:
- `ParamascotasAdminApiService` todavia conserva rutas directas en settings, precios/finanzas, gastos, periodos financieros, ajustes historicos y descuentos. Migrarlas en bloques pequenos para no mezclar cambios funcionales con la centralizacion.

### 2026-06-17 - Dashboard QA: Workspace APIs por catalogo central

Objetivo: reducir acoplamiento API restante en servicios Workspace, donde chat, calendario y kanban todavia armaban rutas `workspace/...` directamente en sus servicios.

Cambios:
- `Dashboard/src/app/core/modules/dashboard-api.config.ts` agrega claves faltantes para `workspace.calendar.create`, `workspace.chat.messages` y `workspace.chat.messages.send`.
- `Dashboard/src/app/features/workspace/data/workspace-chat-api.service.ts`, `workspace-calendar-api.service.ts` y `workspace-kanban-api.service.ts` ahora resuelven rutas con `DashboardApiCatalogService.path(...)`; ya no codifican manualmente paths ni parametros con `encodeURIComponent`.
- `Dashboard/src/app/core/modules/dashboard-modules.config.spec.ts` verifica que las claves Workspace usadas por esos servicios sigan registradas en el modulo central.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`.
- Pasaron Playwright focales de Workspace: `chat workspace`, `kanban workspace`, `calendar workspace` y `legacy calendar` (`4/4`).
- El `ng test` focal sigue bloqueado en host por Node `22.22.2`; Angular CLI exige `22.22.3+` o Node 24/26. El build Docker usa Node 26 y compila correctamente.

### 2026-06-17 - Dashboard QA: Presets tenant-admin centralizados en catalogo

Objetivo: quitar de `tenant-admin.component.ts` otra fuente paralela de verdad sobre servicios contratados, presets SaaS y columnas de cobertura, para que el dashboard siga avanzando hacia configuracion central API-first/modular.

Cambios:
- `Dashboard/src/app/core/tenant/tenant-module-catalog.ts` ahora exporta `TENANT_MODULE_PRESETS`, `DEFAULT_TENANT_MODULE_PRESET_KEY`, `TENANT_QUICK_MATRIX_COLUMNS`, tipos publicos de preset/matriz y `tenantModulePresetDefinition()`.
- `Dashboard/src/app/features/tenant-admin/pages/tenant-admin/tenant-admin.component.ts` deja de declarar localmente presets `platform-core`, `ecommerce-base`, `retail-ops`, `inventory-finance` y la matriz rapida; solo consume el catalogo central.
- `Dashboard/src/app/core/modules/dashboard-modules.config.spec.ts` agrega guardrail para validar que presets y columnas de matriz apunten a modulos registrados y a tipos de negocio existentes.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health` y Playwright focal de submenus (`mobile sidebar expands submenu`, `collapsed submenu`).
- Validado manualmente con Playwright que un submenu de escritorio expandido navega a `http://127.0.0.1:8081/dashboard/paramascotas-panel/reporting/sales?tenant=demo`.
- El test unitario focal por `ng test --include src/app/core/modules/dashboard-modules.config.spec.ts` no corrio en el host por Node `22.22.2`; Angular CLI exige `22.22.3+` o Node 24/26. El build Docker usa Node 26 y compilo correctamente.

### 2026-06-17 - Dashboard QA: Composition root de rutas por registry

Objetivo: quitar de `app.routes.ts` el armado manual de todas las fuentes de rutas privadas del dashboard, para que el shell consuma un registry y no vuelva a ser el punto donde se conectan modulos feature uno por uno.

Cambios:
- `Dashboard/src/app/app-route-sources.ts` centraliza `DASHBOARD_ROUTE_SOURCE_MAP` y `APP_PUBLIC_ROUTES`; es el archivo de composition root para asociar route source keys con los `*.routes.ts` de cada feature.
- `Dashboard/src/app/app.routes.ts` deja de importar rutas privadas de features directamente y solo consume `DASHBOARD_ROUTE_SOURCE_MAP` junto a `buildDashboardPrivateRoutesFromRegistry(...)`.
- `Dashboard/tools/check-architecture.mjs` permite el nuevo archivo raiz `app-route-sources.ts` y agrega guardrail para bloquear imports directos `@features/*/*.routes` desde `app.routes.ts`.
- `Dashboard/tools/generate-feature.mjs` actualiza las instrucciones de registro para apuntar a `app-route-sources.ts`, no al shell route file.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run arch:check`, `npm run lint`, `npm run docker:up` y `npm run docker:health`.
- Verificado por busqueda que `app.routes.ts` ya no importa rutas privadas de features; esos imports quedan concentrados en `app-route-sources.ts`.

### 2026-06-17 - Dashboard QA: ApiResource por claves centrales de endpoints

Objetivo: eliminar otra fuente de acoplamiento API en el frontend, donde servicios basados en `ApiResource` todavia declaraban rutas como `endpoint = 'products'`, `endpoint = 'invoices'`, etc.

Cambios:
- `Dashboard/src/app/core/http/api-resource.ts` ahora soporta `endpointKeys` por accion (`list`, `detail`, `create`, `replace`, `update`, `remove`) y resuelve paths desde `DashboardApiCatalogService`; mantiene fallback legacy solo para compatibilidad, pero ya no hay servicios feature usandolo.
- `Dashboard/src/app/core/modules/dashboard-api.config.ts` completa claves faltantes y corrige metodos reales para productos, facturas, usuarios, roles, monitoreo y blog/workspace (`PATCH`/`DELETE` cuando corresponde).
- Migrados a claves centrales: `InvoicesApiService`, `ProductsApiService`, `MonitoringApiService`, `UsersApiService`, `RolesApiService`, `WorkspaceEmailApiService` y `WorkspaceBlogApiService`.
- `Dashboard/src/app/core/modules/dashboard-api-catalog.service.spec.ts` cubre parametros codificados para `productId`, `eventId`, `invoiceId`, `userId`, `roleId` y `postId`.
- `Dashboard/tools/check-architecture.mjs` agrega guardrail: cualquier `data/*-api.service.ts` que extienda `ApiResource` debe usar `endpointKeys` y no puede declarar `protected override readonly endpoint = ...`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up` y `npm run docker:health`.
- La prueba unitaria focal con `npm run test -- --watch=false --include ...` sigue bloqueada por el host Node `22.22.2`; Angular CLI requiere `22.22.3+`, `24.15+` o `26+`. Las specs compilaron por `type:check` y el build Docker corrio con Node 26.

### 2026-06-17 - Dashboard QA: Catalogo central de endpoints API consumido por servicios

Objetivo: avanzar el dashboard API-first reduciendo la duplicacion entre `dashboard-api.config.ts` y los servicios de datos que aun escribian endpoints como strings propios.

Cambios:
- `Dashboard/src/app/core/modules/dashboard-api-catalog.service.ts` agrega `DashboardApiCatalogService`, que resuelve endpoints por `key` desde `DASHBOARD_MODULE_API_ENDPOINTS`, renderiza parametros de path con `encodeURIComponent` y falla si falta un parametro, sobran parametros o la clave no esta registrada.
- `Dashboard/src/app/core/modules/dashboard-api-catalog.service.spec.ts` documenta el contrato de resolucion, parametros codificados, errores explicitos y unicidad de claves de endpoints.
- `Dashboard/src/app/features/inventory/data/inventory-api.service.ts` deja de quemar `inventory/items` y variantes; ahora consume `inventory.stock`, `inventory.stock-detail` e `inventory.stock-adjust` desde el catalogo central.
- `Dashboard/src/app/features/dashboard/data/dashboard-api.service.ts` deja de quemar `dashboard/summary` y consume `dashboard.summary` desde el catalogo central.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up` y `npm run docker:health`.
- La prueba unitaria focal con `npm run test -- --watch=false --include ...` no corre en host porque Angular CLI requiere Node `22.22.3+`, `24.15+` o `26+`, y el host tiene `22.22.2`; las specs nuevas si compilaron por `type:check` y el build Docker corrio con Node 26.

### 2026-06-17 - Dashboard QA: Submenus del sidebar replegado bajo /dashboard

Objetivo: corregir que los grupos del menu replegado abrieran, pero sus submenus no fueran confiables al operar el dashboard publicado bajo el prefijo `/dashboard/`.

Cambios:
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.ts` agrega `routeHref()` base-aware: el `href` publico respeta el `<base href="/dashboard/">`, mientras `navigateByUrl()` sigue usando rutas internas del router sin duplicar el prefijo.
- `side-nav.component.html` usa `routeHref()` en logo, enlaces principales, submenus normales y flyout replegado; el flyout ahora detiene `pointerdown`, `mousedown` y `click` para que no se cierre antes de navegar.
- `side-nav.component.css` marca visualmente el link activo dentro del flyout replegado.
- `side-nav.component.spec.ts` cubre el contrato de `href` con base `/dashboard/` y navegacion interna sin `%3Ftenant`.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` agrega una prueba Playwright que entra por `/dashboard/paramascotas-backend`, repliega el menu, abre `Operacion` y navega a `Venta en local` desde el submenu.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "collapsed submenu links keep"` y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "fixed sidebar|mobile sidebar"`.
- `npm run test -- --watch=false --include src/app/layout/shell/side-nav/side-nav.component.spec.ts` no corrio en host porque Angular CLI requiere Node `22.22.3+`, `24.15+` o `26+`, y el host tiene `22.22.2`; la spec si compilo por `type:check`.

### 2026-06-17 - Dashboard QA: Exportaciones fuera de componentes

Objetivo: seguir desacoplando `ParamascotasPanelComponent` para que la UI no concentre infraestructura ni logica reutilizable, dentro del avance hacia un dashboard API-first y modular.

Cambios:
- `Dashboard/src/app/features/dashboard/services/file-export.service.ts` centraliza la serializacion descargable de CSV y Excel XML como `Blob`.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` deja de construir `Blob` locales para reportes, plan de compra y ranking de productos; ahora delega esa responsabilidad al servicio de exportacion.
- `Dashboard/src/app/features/dashboard/services/file-export.service.spec.ts` documenta el contrato de escape CSV y MIME de Excel XML.
- `Dashboard/tools/check-architecture.mjs` agrega guardrail para impedir `new Blob(...)` dentro de componentes; los componentes deben usar servicios/adaptadores.

Follow-up:
- `FileExportService` ahora tambien concentra el contrato y render de workbook Excel XML (`FileExportWorkbookWorksheet`, celdas, filas de titulo/subtitulo/header y serializacion XML).
- `ParamascotasPanelComponent` ya no contiene `buildWorkbookXml`, `renderWorkbookWorksheet`, `renderWorkbookCell` ni helpers XML; solo arma filas de negocio y solicita `fileExport.excelWorkbook(...)`.
- `check-architecture.mjs` agrega guardrail contra serializacion Excel XML dentro de componentes (`<Workbook xmlns=`, `<Worksheet ss:Name=`, `<Cell...>`).

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up` y `npm run docker:health`.
- `npm run arch:check` quedo en verde con `Architecture check passed`, `Navigation check passed (104 links)` y `no dependency violations` sobre 447 modulos.
- `npm run test -- --run src/app/features/dashboard/services/file-export.service.spec.ts` sigue bloqueado por Node `22.22.2`; Angular CLI requiere `22.22.3+` o `24.15+`. La spec quedo validada por `tsconfig.spec` dentro de `npm run type:check`.
- Un intento directo con `node_modules/.bin/vitest run src/app/features/dashboard/services/file-export.service.spec.ts` queda bloqueado por la dependencia opcional faltante `@rollup/rollup-linux-x64-gnu` en `node_modules`; no se reinstalaron dependencias para evitar churn del ambiente.

### 2026-06-17 - Dashboard QA: Periodos de reportes fuera del componente

Objetivo: sacar reglas de consulta por dia/semana/mes/ano/total desde `ParamascotasPanelComponent`, manteniendo el comportamiento de reportes, ranking y gastos.

Cambios:
- `Dashboard/src/app/features/dashboard/services/report-period.service.ts` centraliza `ReportPeriodScope`, opciones de periodo, normalizacion de mes/dia/ano, queries de reporte, queries de gastos y etiquetas de periodo.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` usa `ReportPeriodService` para inicializar periodos Ecuador, construir parametros de reportes/ranking/finanzas y normalizar cambios de filtros.
- `Dashboard/src/app/features/dashboard/services/report-period.service.spec.ts` documenta los contratos de query para `day`, `week`, `month`, `year`, `historical`, rangos de gastos y etiquetas.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up` y `npm run docker:health`.
- `npm run arch:check` quedo en verde con `Architecture check passed`, `Navigation check passed (104 links)` y `no dependency violations` sobre 449 modulos.
- `npm run test -- --run src/app/features/dashboard/services/report-period.service.spec.ts` sigue bloqueado por Node `22.22.2`; Vitest directo sigue bloqueado por la dependencia opcional faltante `@rollup/rollup-linux-x64-gnu`.

### 2026-06-17 - Dashboard QA: Submenus del sidebar replegado y movil

Objetivo: corregir que los menus principales del sidebar respondieran, pero los submenus no quedaran accesibles de forma confiable en modo replegado o en pantallas angostas.

Cambios:
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.{ts,html,css}` mantiene abierto el flyout del grupo replegado aunque se haga un segundo click sobre el mismo icono, agrega `aria-expanded` y estado visual al boton activo, cierra con `Escape` o click externo y habilita scroll vertical propio en el area del menu.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` refuerza la prueba desktop replegada para asegurar que el subflyout persista y agrega cobertura mobile para abrir `Reportes`, ver `Reporte de ventas` y navegar sin codificar mal el query de tenant.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health` y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "fixed sidebar|mobile sidebar expands submenu"` (`2/2`).
- El unit test directo de Angular sigue bloqueado en este host por Node `22.22.2`; Angular CLI requiere `22.22.3+` o `24.15+`. La validacion tipada de specs si paso via `npm run type:check`.

### 2026-06-17 - Dashboard QA: Registro API-first y navegacion modular consolidados

Objetivo: cerrar las deudas detectadas en el primer registro modular para que rutas, navegacion, permisos y APIs queden validados desde una fuente central coherente.

Cambios:
- `Dashboard/tools/check-navigation.mjs` ahora valida `DASHBOARD_NAVIGATION_BLUEPRINT` en `core/modules/dashboard-navigation.config.ts`, no el re-export legacy `navigation.registry.ts`; tambien entiende rutas parametrizadas como `paramascotas-panel/:group/:view`.
- `Dashboard/src/app/features/dashboard/dashboard.routes.ts` marca las pantallas demo `home*` y `widgets` como `ui-kit`, alineando permisos/rutas con la navegacion que las expone bajo `Recursos UI`.
- `NavigationService` deja de caer a `/home` cuando no hay rutas visibles; usa `/module-unavailable`, y `AuthRedirectService` normaliza retornos inseguros hacia `/` para que el landing guard elija segun modulos contratados.
- `Dashboard/src/app/core/modules/dashboard-api.config.ts` amplia el registro de endpoints por modulo con contratos reales de ecommerce/POS/cotizaciones/pedidos/reportes/compras/gastos/descuentos/workspace/monitoring/inventario/tenant-admin, corrigiendo rutas obsoletas como `tenant-admin/tenants` a `admin/tenants`.
- `dashboard-modules.config.spec.ts` agrega cobertura de endpoints criticos para evitar que la configuracion central vuelva a quedar incompleta.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/smoke.spec.ts --grep "demo tenant keeps dashboard template menu|tenant navigation hides platform admin|docker runtime exposes a health endpoint"` (`3/3`) y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "fixed sidebar"` (`1/1`).
- `npm run arch:check` queda completo en verde: `Architecture check passed`, `Navigation check passed (104 links)` y `no dependency violations`.

Follow-up API registry:
- `Dashboard/tools/check-architecture.mjs` ahora valida que todo endpoint literal o template simple consumido desde `features/**/data/*-api.service.ts` exista en `Dashboard/src/app/core/modules/dashboard-api.config.ts`.
- El nuevo check detecto y se registraron endpoints reales faltantes: reemision RIDE, desbloqueo de usuarios, settings de sesion/ficha, auditoria de cupones, estados de gastos, recurrencias, previews/cierres financieros, ajustes, ventas historicas, `auth/session`, `health`, detalle de inventario y mutaciones de calendario/Kanban.
- `dashboard-modules.config.spec.ts` agrega expectativas sobre rutas dinamicas criticas (`admin/billing/rides/:accessKey/cancel-and-reissue`, `admin/financial-periods/:periodKey/preview`, `inventory/items/:itemId`, `workspace/kanban/tasks/:taskId/move`).
- Pasaron `npm run type:check`, `npm run lint`, `npm run arch:check`, `npm run docker:up`, `npm run docker:health`, smoke focal de navegacion modular (`3/3`) y Playwright focal `fixed sidebar` (`1/1`).

### 2026-06-17 - Dashboard QA: Registro modular API-first

Objetivo: avanzar la arquitectura del Dashboard hacia una configuracion central de modulos, APIs, navegacion y fuentes de rutas segun servicios contratados por tenant.

Cambios:
- `Dashboard/src/app/core/modules/` concentra el registro modular: `dashboard-modules.config.ts`, `dashboard-api.config.ts`, `dashboard-navigation.config.ts`, `dashboard-route.config.ts` y `dashboard-module-registry.service.ts`.
- Cada modulo registrado declara `routeSources`, secciones de navegacion y endpoints API por backend (`dashboard-api`, `paramascotas-api`, `billing-api`); `NavigationService` consume `enabledNavigationSections()` desde el registro filtrado por contexto tenant.
- `app.routes.ts` ya no concatena manualmente arrays de rutas por feature; usa `buildDashboardPrivateRoutesFromRegistry()` con un mapa fisico de route sources, dejando el orden y pertenencia en el registro modular.
- `navigation.registry.ts` queda como re-export de compatibilidad hacia `DASHBOARD_NAVIGATION_BLUEPRINT`, evitando dos fuentes reales de navegacion.
- Se agrego `core/http/api-request-context.ts` como adaptador publico para contexto de backend real; los servicios Paramascotas dejan de importar directamente desde `core/http/fixtures`.
- Se eliminaron literales productivos crudos `platform-admin`, reemplazandolos por `PLATFORM_ADMIN_PERMISSION`.
- Se eliminaron `$any()` de templates de `ParamascotasPanelComponent` y `TenantAdminComponent`, moviendo parseo de eventos a helpers tipados.
- `ParamascotasPanelComponent` deja de inyectar directamente clases `*ApiService`; usa servicios de datos del feature (`ParamascotasAdminDataService`, `ParamascotasPanelDataService`) como paso intermedio hacia fachadas mas completas.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health` y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "fixed sidebar"` (`1/1`).
- `npm run arch:check` bajo de 23 a 5 hallazgos. Pendiente: encapsular en adaptadores/fachadas los usos restantes de `console`, `fetch`, `document.write` y DOM global dentro de `ParamascotasPanelComponent`.

### 2026-06-17 - Dashboard QA: POS desktop angosto sin solapamientos

Objetivo: corregir que `Venta en local` siguiera viendose apretada, montada y desbordada cuando el sidebar fijo aun estaba visible en anchos tipo laptop/tablet horizontal.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.html` agrega clases semanticas para las zonas POS `catalogo`, `carrito` y `caja/cobro`, ademas de clases especificas para el formulario de cliente y la busqueda de documento.
- `paramascotas-panel.component.css` agrega un breakpoint POS en `max-width: 1535px`: KPIs y dashboard quedan en dos columnas, el workspace POS pasa a una columna, caja/cobro usa columnas `auto-fit`, el formulario cliente baja a dos columnas y el catalogo evita cards comprimidas.
- En mobile, el formulario de cliente, la busqueda de documento y las cards de productos vuelven a una columna estable para evitar botones o textos cortados.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` agrega cobertura `1365x900` con sidebar fijo, productos con nombres largos y carrito activo, validando cero overflow horizontal, workspace apilado, formulario sin solapes y botones sin texto cortado.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health` y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "local sales stacks cleanly on mobile|overlay menu and clean tablet layout|fixed sidebar on constrained desktop"` (`3/3`).
- La primera corrida de la nueva prueba fallo contra el bundle anterior porque Dashboard aun no estaba reconstruido; despues de `npm run docker:up`, el runtime servido quedo actualizado y la suite focal paso completa.

Follow-up inmediato:
- Se corrigio que las lineas del carrito mostraran nombre, SKU, precio y stock atravesados en una sola linea: ahora el resumen del producto usa una clase propia y separa nombre/metadatos en bloques.
- Se corrigio que el campo `Documento`/cedula quedara casi invisible por heredar el ancho minimo de `.input-group`; el input ahora ocupa el ancho disponible y la prueba `1365x900` exige ancho util del documento mayor al doble del boton `Buscar`.
- Se reejecutaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, la prueba focal `fixed sidebar on constrained desktop` (`1/1`) y luego la suite focal POS mobile/tablet/desktop (`3/3`).

Segundo follow-up de UX POS:
- El catalogo POS deja de atrapar scroll interno en escritorio angosto; el workspace queda con `carrito/cobro` arriba y `catalogo` debajo para que las acciones de pago no queden enterradas bajo 80 productos.
- Las tarjetas de producto del catalogo pasan a lista de una columna en ese rango, evitando grillas atravesadas y textos comprimidos.
- Se agrega accion visible `Pago exacto`, que llena el pago por el total actual incluso si el calculo remoto aun esta llegando, usando fallback de lineas del carrito.
- Los importes de apertura/cierre de caja, cobro y movimientos usan campo visual con prefijo `$`; el parser numerico tolera valores pegados con simbolo de moneda o coma decimal.
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, la prueba focal `fixed sidebar on constrained desktop` (`1/1`) y la suite focal POS mobile/tablet/desktop (`3/3`).

Tercer follow-up de UX POS:
- Se elimina la lista gigante de productos visibles por defecto. `localSaleCatalog()` ahora exige busqueda de al menos 2 caracteres y limita resultados a 10 coincidencias.
- El bloque `Agregar producto` funciona como selector: buscar por nombre/categoria/marca/proveedor/SKU/ID, seleccionar `Agregar` o presionar Enter para agregar la primera coincidencia disponible; al agregar, la busqueda se limpia y el foco visual vuelve al carrito.
- Se actualizan pruebas POS y cotizaciones para usar el nuevo flujo buscar -> seleccionar -> agregar, manteniendo cobertura de cupones, mobile/tablet/desktop, productos agrupados/vencidos, consumidor final y cotizaciones con email/WhatsApp.
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, suite focal POS (`7/7`) y cotizaciones email/WhatsApp (`2/2`).

Cuarto follow-up de UX POS:
- El selector `Agregar producto` se mueve fuera del workspace y queda inmediatamente despues de `Preparacion de venta`, antes de `Carrito y cliente`/`Cobro`, para que la busqueda sea la siguiente accion natural.
- `paramascotas-pos-workspace` ahora solo organiza carrito y panel lateral; el selector queda como bloque propio arriba.
- Los campos monetarios con prefijo `$` reciben altura/min-height y alineacion centrada para que simbolo e importe queden visualmente centrados.
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, la prueba focal `fixed sidebar on constrained desktop` (`1/1`) y la suite focal POS (`7/7`).

Quinto follow-up de UX POS:
- `Caja POS` y `Movimiento caja` salen del lateral de venta y bajan juntos a `paramascotas-pos-cash-management`, debajo del workspace. El lateral de `Venta en local` queda reservado para `Cobro` y `Pago exacto`.
- Los prefijos monetarios dejan de depender de `span` generico y usan `paramascotas-money-input__prefix`, con layout flex y centrado vertical/horizontal estable para el simbolo `$`.
- La prueba `fixed sidebar on constrained desktop` ahora valida que el lateral contenga solo cobro, que caja/movimientos esten debajo del workspace y que los prefijos `$` esten centrados.
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, la prueba focal `fixed sidebar on constrained desktop` (`1/1`), suite focal POS (`7/7`) y cotizaciones/conversion (`4/4`).

Sexto follow-up de UX POS:
- En `Venta en local`, el bloque inferior ya no dice `Historial reciente de cotizaciones`; ahora muestra `Ventas recientes` con tabla de pedidos/ventas recientes, cliente, fecha, pago, items, total y estado. El historial de cotizaciones queda reservado para la pestaña `Cotizaciones`.
- `loadLocalSales()` tambien intenta cargar `orders` de forma no fatal para alimentar ese historial de ventas; si falla, no bloquea POS.
- El prefijo `$` recibe una regla especifica `.paramascotas-setting-field .paramascotas-money-input__prefix` para ganarle a los estilos generales de labels y mantener `display:flex`, `align-items:center` y `justify-content:center`.
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, la prueba focal `fixed sidebar on constrained desktop` (`1/1`), suite focal POS (`7/7`) y cotizaciones/conversion (`4/4`).

Septimo follow-up de UX POS:
- `OrderRepository::getAll()` ahora devuelve `payment_details`, `invoice_number`, `invoice_created_at` e `invoice_data`, permitiendo que el dashboard distinga ventas POS locales y muestre metadata real de facturacion.
- `Ventas recientes` filtra solo ventas realizadas (`completed`/`delivered`) con `payment_details.channel = local_pos`, evitando mezclar pedidos web o pendientes.
- La columna principal cambia de `Venta #ORD-*` a `Factura`: primero usa secuencial SRI desde `invoice_data.billing.sequential`; si no existe, usa `invoice_number` interno; si falta todo, muestra `Sin factura`.
- Verificado contra `http://127.0.0.1:8081/dashboard/api/orders`: las primeras filas POS reales muestran secuenciales SRI `001-001-000000124`, `001-001-000000123`, etc., con estado `completed` y canal `local_pos`.
- Pasaron `php -l src/Repositories/OrderRepository.php`, `npm run type:check`, `npm run lint`, `./scripts/deploy-development.sh backend`, `npm run docker:up`, `npm run docker:health`, `./scripts/check-container-connectivity.sh development`, prueba focal POS `fixed sidebar on constrained desktop` (`1/1`) y suite focal POS (`7/7`).

Octavo follow-up de UX POS/shell:
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.html` agrega `sidebar-collapse-toggle` dentro del bloque de marca del sidebar, con `Contraer menu lateral` / `Expandir menu lateral`, para que el control siga visible aunque el header superior haya quedado fuera por scroll.
- `side-nav.component.css` deja ese control sticky en el sidebar de escritorio y lo oculta en mobile/tablet, donde sigue aplicando el menu overlay.
- La prueba `fixed sidebar on constrained desktop` ahora scrollea la vista POS, exige que el boton del sidebar siga visible, lo pulsa y valida que `dashboard-main` entre en modo compacto.
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, prueba focal POS `fixed sidebar on constrained desktop` (`1/1`) y suite responsive POS (`3/3`).
- La corrida unitaria focal `npm test -- --watch=false --include=src/app/layout/shell/side-nav/side-nav.component.spec.ts` no arranco en la shell local porque Angular CLI requiere Node >=22.22.3/24.15/26 y la shell tiene Node 22.22.2; el build Docker usa Node 26 y paso correctamente.

Noveno follow-up de UX POS/shell:
- Se corrigio el boton de colapso del sidebar: deja de usar flechas sueltas, queda como control contenido dentro del bloque de marca y en estado compacto se reduce a un boton cuadrado centrado.
- `side-nav.component.css` neutraliza las reglas heredadas del template `sidebar.active:hover`, evitando que el menu se vuelva a expandir mientras el mouse sigue encima tras hacer click.
- La prueba `fixed sidebar on constrained desktop` ahora valida que el boton quede dentro del rectangulo del sidebar, que el ancho colapsado siga <= 96px incluso con hover y que no reaparezcan textos/submenus al pasar el mouse.
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, prueba focal POS `fixed sidebar on constrained desktop` (`1/1`) y suite responsive POS mobile/tablet/desktop (`3/3`).

Decimo follow-up de UX POS/shell:
- El boton de colapso deja de ocupar una fila completa: ahora es solo icono de 28x28 al lado del logo, sobre el mismo fondo del encabezado del sidebar.
- El encabezado del sidebar vuelve a 72px de alto y el area de menu recupera altura util (`calc(100vh - 72px)`), manteniendo el colapso estable sin reabrirse por hover.
- Verificado en navegador local: sidebar abierto 220px, boton 28x28 dentro del rectangulo; sidebar colapsado 86px, boton dentro del rectangulo y textos ocultos.
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, prueba focal POS `fixed sidebar on constrained desktop` (`1/1`) y suite responsive POS mobile/tablet/desktop (`3/3`).

Undecimo follow-up de UX POS/shell:
- Se elimino el icono duplicado de colapso dentro del encabezado del sidebar; en escritorio queda solo el control del header principal, a la izquierda del nombre del tenant.
- En mobile/tablet se conserva `sidebar-mobile-toggle` en el header, porque el menu lateral no esta visible de forma fija y necesita un control para abrir el overlay.
- La prueba `fixed sidebar on constrained desktop` ahora valida que no exista `.sidebar-brand-row .sidebar-collapse-toggle` y que el colapso siga funcionando desde `.navbar-header .sidebar-toggle`.
- Verificado en navegador local: desktop 1365px sin duplicado y mobile 390px con boton mobile visible; pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health` y suite responsive POS mobile/tablet/desktop (`3/3`).

Duodecimo follow-up de UX POS/shell:
- Se reubico correctamente el control de colapso: sale del header de contenido y queda dentro del encabezado del sidebar, a la izquierda del logo/nombre del tenant.
- En escritorio ya no existe `.navbar-header .sidebar-toggle`; el colapso se controla con `.sidebar-brand-row .sidebar-collapse-toggle`. En mobile/tablet se mantiene solo `sidebar-mobile-toggle`.
- Verificado en navegador local: desktop 1365px muestra boton 28x28 en `left=12` y logo desde `left=48`; `buttonBeforeLogo=true`, sin toggle desktop en header. Mobile 390px mantiene boton mobile visible.
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, prueba focal `fixed sidebar` (`1/1`) y suite responsive POS mobile/tablet/desktop (`3/3`).

Decimotercer follow-up de UX POS/shell:
- Se corrigio la orientacion final del control: el logo/nombre queda primero y el boton de colapso va a la derecha del logo dentro del encabezado del sidebar.
- La prueba `fixed sidebar` valida `buttonAfterLogo=true` y que no exista toggle desktop en `.navbar-header`; mobile conserva solo `sidebar-mobile-toggle`.
- Verificado en navegador local: desktop 1365px muestra logo `left=16/right=173` y boton `left=179/right=207`; mobile 390px mantiene boton mobile visible.
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, prueba focal `fixed sidebar` (`1/1`) y suite responsive POS mobile/tablet/desktop (`3/3`).

Decimocuarto follow-up de UX POS/shell:
- Se corrigio que los grupos del menu replegado parecieran no funcionar. En modo colapsado, `Reportes`, `Monitoreo`, `Catalogo`, `Operacion`, etc. navegan al primer destino real de su grupo en lugar de intentar abrir un submenu oculto.
- En modo abierto y en mobile overlay, los grupos conservan el comportamiento normal de desplegar/plegar submenus.
- `side-nav.component.spec.ts` cubre que un grupo replegado navegue al primer route; la prueba `fixed sidebar` hace click en `Reportes` estando colapsado y espera `/paramascotas-panel/reporting/general`.
- Verificado en navegador local: tras colapsar, click en Reportes navega a `/dashboard/paramascotas-panel/reporting/general?tenant=paramascotasec`, el sidebar sigue colapsado y no reaparece texto.
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, prueba focal `fixed sidebar` (`1/1`) y suite responsive POS mobile/tablet/desktop (`3/3`).

Decimoquinto follow-up de UX POS/shell:
- Se ajusto el comportamiento final del menu replegado: los grupos ya no navegan automaticamente al primer destino; ahora abren un flyout lateral con todas sus subopciones, permitiendo escoger `Reporte de ventas`, `Balance general`, `Venta en local`, etc.
- Los subitems del flyout navegan mediante `router.navigateByUrl` para conservar correctamente query params como `?tenant=paramascotasec` y evitar rutas codificadas como `%3Ftenant`.
- Verificado en navegador local: colapsar sidebar -> click `Reportes` -> flyout muestra todas las opciones -> click `Reporte de ventas` navega a `/dashboard/paramascotas-panel/reporting/sales?tenant=paramascotasec`, sin `%3Ftenant`, y el sidebar permanece colapsado.
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, prueba focal `fixed sidebar` (`1/1`) y suite responsive POS mobile/tablet/desktop (`3/3`).

Decimosexto follow-up de UX POS/shell:
- Se corrigio la navegacion de submenus del sidebar abierto: los enlaces hijos dejan de depender de `routerLink` con query ya concatenada y pasan a navegar con `router.navigateByUrl`, igual que el flyout colapsado.
- `side-nav.component.spec.ts` agrega cobertura para click en `Reporte de ventas` validando que la URL conserve `?tenant=demo` y no genere `%3Ftenant`.
- Verificado en navegador local: abrir `Reportes` con sidebar expandido -> click `Reporte de ventas` navega a `http://127.0.0.1:8081/dashboard/paramascotas-panel/reporting/sales?tenant=paramascotasec`, sin `%3Ftenant`.
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health` y prueba focal Playwright `fixed sidebar` (`1/1`). `npm run arch:check` sigue fallando por 23 deudas preexistentes fuera del sidebar; Vitest focal no arranca por la dependencia opcional local faltante `@rollup/rollup-linux-x64-gnu`.

Decimoseptimo follow-up de UX POS/shell:
- Se corrigio que los submenus del flyout replegado pudieran perder el click: `navigateToItem()` ahora dispara `router.navigateByUrl()` primero y cierra sidebar/flyout al finalizar la navegacion.
- Los subitems de `.sidebar-collapsed-flyout` dejan de ser botones y pasan a ser enlaces reales con `href`, manteniendo fallback nativo y navegacion controlada con query tenant.
- `side-nav.component.spec.ts` agrega cobertura especifica para `Reporte de ventas` dentro del flyout colapsado, validando `?tenant=demo` y evitando `%3Ftenant`.
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health` y prueba focal Playwright `fixed sidebar` (`1/1`). La corrida unitaria por Angular CLI queda bloqueada en el host por Node `22.22.2`; Angular requiere `22.22.3+` o `24.15+`.

### 2026-06-17 - Dashboard QA: Auditoria reproducible de login y ranking por periodo

Objetivo: dejar evidencia reproducible del diagnostico de login QA por correo y cerrar la cobertura temporal que faltaba en `Ranking de productos`.

Cambios:
- Se agrega `scripts/audit-dashboard-login.sh`, que inspecciona por correo en QA: tenant, rol, `email_verified`, `failed_login_attempts`, `login_locked_until`, presencia de token activo, `last_login_at` y eventos recientes de `AuthSecurityEvent`, sin imprimir passwords ni secretos.
- `Dashboard/tests/e2e/paramascotas-real-auth.spec.ts` agrega una regresion publica para confirmar que `GET /dashboard/api/auth/session` y `GET /dashboard/api/tenant/context` siguen respondiendo `401 AUTH_REQUIRED` sin sesion real.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` agrega cobertura explicita para `Ranking de productos`, validando `Dia`, `Semana`, `Mes`, `Ano` y `Total` contra `admin/dashboard/stats` y `admin/report`.

Diagnostico QA confirmado:
- `evasquez@paramascotasec.com` pertenece al tenant `paramascotasec`, tiene rol `admin`, `email_verified = yes`, `failed_login_attempts = 0`, `active_token_present = yes` y `login_success` reciente el `2026-06-17 11:09:17`.
- `edwin.eduardo.vm@gmail.com` pertenece al mismo tenant pero con rol `customer`, `email_verified = yes`, `failed_login_attempts = 2`, `active_token_present = no` y eventos `login_failed` el `2026-06-09 18:36:40` y `2026-06-17 08:36:59`.
- La causa observable en QA para el caso homonimo no es bloqueo ni tenant incorrecto: es una cuenta cliente distinta de la cuenta admin.

Operacion y verificacion:
- `curl -sk --resolve paramascotasec.com:443:192.168.100.229 https://paramascotasec.com/dashboard/api/auth/session` -> `{"ok":false,"error":{"message":"No autorizado","code":"AUTH_REQUIRED"}}`.
- `curl -sk --resolve paramascotasec.com:443:192.168.100.229 https://paramascotasec.com/dashboard/api/tenant/context` -> `{"ok":false,"error":{"message":"No autorizado","code":"AUTH_REQUIRED"}}`.
- Pasaron `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-auth.spec.ts` (`10/10`) y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "local sales stacks cleanly on mobile|overlay menu and clean tablet layout|general report period selector|sales report identifies product leaders|sales ranking requests day week month year and total scopes correctly|financial reports keep month as default|balance trends keep period metrics visible"` (`7/7`).

### 2026-06-17 - Dashboard QA: Login Paramascotas aclara cuentas cliente vs admin y revalida auth publica

Objetivo: cerrar la confusion reportada en el login del dashboard cuando una persona tiene cuenta cliente y cuenta admin separadas dentro del tenant, sin relajar permisos reales.

Cambios:
- `Dashboard/src/app/features/public/pages/sign-in/sign-in.component.ts` aclara en el copy de `Acceso ParaMascotasEC` que una cuenta cliente del ecommerce no abre el panel administrativo.
- `Dashboard/src/app/features/public/pages/permission-denied/permission-denied.component.ts` endurece el mensaje para cuentas `customer`: ahora explica que la cuenta puede operar el ecommerce publico, pero no el dashboard admin.
- Se ajustan `Dashboard/src/app/features/public/pages/sign-in/sign-in.component.spec.ts`, `Dashboard/src/app/features/public/pages/permission-denied/permission-denied.component.spec.ts` y `Dashboard/tests/e2e/paramascotas-real-auth.spec.ts` al nuevo criterio de guidance.

Diagnostico QA:
- La autenticacion publica del tenant Paramascotas sigue operativa para cuentas admin reales con MFA y eventos `login_success` recientes en `AuthSecurityEvent`.
- En QA se detecto un caso de homonimia: una cuenta admin y otra cuenta customer con el mismo nombre visible. La cuenta customer registra `login_failed` al intentar entrar al panel operativo; no es una falla del backend sino un perfil sin permisos admin.
- No se promovieron cuentas reales ni se alteraron roles productivos; la correccion se mantuvo en UX, validacion y evidencia de acceso real.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-auth.spec.ts` (`9/9`) y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "local sales stacks cleanly on mobile|overlay menu and clean tablet layout|general report period selector|sales report identifies product leaders|financial reports keep month as default|balance trends keep period metrics visible"` (`6/6`).
- `npx vitest run ...sign-in.component.spec.ts ...permission-denied.component.spec.ts` sigue sin poder ejecutarse en este workspace por la dependencia opcional faltante `@rollup/rollup-linux-x64-gnu`; el `type:check` y la validacion E2E/Playwright si pasaron.

### 2026-06-17 - Dashboard QA: Shell responsivo y POS tablet sin colapso defectuoso

Objetivo: corregir el comportamiento visual cuando el dashboard queda en ancho intermedio, especialmente el menu replegado y la pantalla `Venta en local`.

Cambios:
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.css` mueve el cambio a modo overlay hasta `1279px`, oculta el toggle de escritorio en ese rango y deja visible el toggle movil para evitar el sidebar colapsado estrecho con texto cortado.
- `Dashboard/src/dashboard-overrides.css` alinea el shell global con el mismo breakpoint `1279px`, manteniendo `dashboard-main` a ancho completo y el sidebar como overlay en tablets/laptops angostas.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.css` reorganiza `Venta en local` para ancho intermedio: workspace en una sola columna, dashboard POS en dos columnas, KPIs en dos columnas y formulario cliente/pago en dos columnas antes del corte movil.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` agrega una prueba para viewport `1260x900` que valida menu overlay, ausencia de overflow horizontal y layout limpio del POS; se conserva la prueba mobile existente.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health` y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "local sales stacks cleanly on mobile|overlay menu and clean tablet layout"` (`2/2`).
- Validado en runtime local del Dashboard sobre `http://127.0.0.1:8081`: el sidebar ya no entra en modo colapsado defectuoso en ancho intermedio y `Venta en local` deja de superponer bloques en ese rango.

### 2026-06-17 - Dashboard QA: Login real Paramascotas, reportes por periodo y POS mobile validados

Objetivo: cerrar el tramo prioritario del nuevo Dashboard sobre autenticacion real, filtros temporales de reportes y usabilidad responsive de `Venta en local`, alineandolo con el comportamiento esperado de `/my-account` sin tocar produccion ni SRI productivo.

Cambios:
- `Dashboard/src/app/core/tenant/tenant-resolver.service.ts` corrige la resolucion de tenant para aliases reservados como `www`, evitando que el dashboard intente resolver el tenant como `www` en lugar de `paramascotasec`.
- `Dashboard/src/app/features/public/pages/sign-in/sign-in.component.{ts,html}` y `Dashboard/src/app/core/auth/auth.facade.ts` mejoran el login real de Paramascotas con branding del tenant y mensajes claros para `AUTH_LOGIN_INVALID`, `AUTH_LOGIN_LOCKED` y `AUTH_EMAIL_NOT_VERIFIED`, manteniendo visible la recuperacion de clave.
- `Dashboard/src/app/features/public/pages/permission-denied/permission-denied.component.{ts,html,css}` ahora distingue mejor entre una sesion `Cliente` y una sesion `Admin tenant`, mostrando cuenta actual, perfil detectado y una explicacion concreta cuando falta `platform-admin` o cuando la cuenta autenticada no es admin del tenant.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.{ts,html,css}`, `Dashboard/src/app/features/dashboard/data/paramascotas-admin-api.service.ts`, `paramascotasec-backend/src/Controllers/DashboardController.php` y `paramascotasec-backend/src/Repositories/OrderRepository.php` extienden reportes y ranking a `day|week|month|year|historical`, con `month` como default visual/API y `historical` como total completo real.
- El layout de `Venta en local POS` queda reorganizado para mobile: catalogo, carrito/cliente/totales y caja/cobro/movimientos apilan sin overflow horizontal ni texto superpuesto, preservando validaciones de caja, cliente, descuentos server-side y productos agrupados.
- `Dashboard/tests/e2e/paramascotas-real-auth.spec.ts` deja de depender de credenciales hardcodeadas y agrega cobertura real para MFA admin, host canonico/`www`, customer sin acceso admin, credenciales invalidas, admin no verificado, cuenta bloqueada, recuperacion de clave y contrato real de `admin/report` para `day`, `week`, `month`, `year` y `historical`.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` agrega cobertura para filtros de reportes por periodo, gastos/finanzas con mapeo correcto de `year` y `total`, ranking con reenvio de periodo a `report`/`stats`, POS mobile sin overflow y comportamiento legacy de productos agrupados/autocompletado de cliente.

Operacion y verificacion:
- Pasaron `php -l` sobre backend afectado, `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, `tests/e2e/paramascotas-real-auth.spec.ts` (`9/9`) y el subconjunto focal de `tests/e2e/paramascotas-real-integrations.spec.ts` sobre POS/reportes/ranking (`8/8`).
- Se valido en QA local por el dominio publico `https://paramascotasec.com/dashboard` que un admin tenant real puede iniciar sesion con MFA, que un customer autenticado cae en `Permiso denegado` para rutas admin con copy especifico de cuenta cliente, y que un admin tenant sin `platform-admin` ve la guia correcta para ese faltante. `www.paramascotasec.com` redirige al host canonico sin romper el tenant.
- Se verifico por base de datos y `AuthSecurityEvent` que los admins reales `admin@paramascotasec.com`, `dnavas@tecnolts.com`, `evasquez@paramascotasec.com` y `gvasquez@paramascotasec.com` estan como `admin`, `email_verified=true`, sin bloqueo activo. El fallo real observado fuera de QA corresponde a `edwin.eduardo.vm@gmail.com`, que hoy existe como `customer`, verificado, con intentos fallidos pero sin bloqueo; no se cambiaron roles ni contraseñas reales.
- No se uso SRI/facturacion de produccion; el trabajo quedo limitado a QA/development.

### 2026-06-17 - Dashboard QA: Compra de producto usa unidades de reposicion legacy

Objetivo: cerrar la diferencia entre `/my-account` y el Dashboard nuevo al registrar una compra/reposicion de producto. El panel anterior pide `Unidades a ingresar` y calcula internamente `stock actual + unidades`; el Dashboard nuevo mostraba el stock final en el campo `Stock`, lo que podia confundir compras reales y ajustes manuales.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.html` muestra `Unidades a ingresar` solo cuando la accion de inventario es `Compra / reabastecimiento`, junto al resumen `Stock actual -> Resultado`.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` agrega helpers para detectar modo reposicion, calcular unidades ingresadas desde el stock persistido y mantener en el formulario el stock final que espera el backend.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` agrega la regresion `product restock uses purchased units while saving final stock`, validando que una compra de 3 unidades sobre stock 5 guarde `quantity=8`, `inventoryAction=restock` y la factura heredada desde la ultima compra.
- `Dashboard/tests/e2e/paramascotas-list-views.spec.ts` actualiza el smoke de `Compra` para leer `productRestockUnits` y endurece la espera del editor antes de editar una variante agrupada existente.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, los focos de reposicion (`2/2`), el subconjunto de productos/variantes/compras (`13/13`), `tests/e2e/paramascotas-list-views.spec.ts` (`9/9`), la suite completa `tests/e2e/paramascotas-real-integrations.spec.ts` (`76/76`, 1.4 min), `tests/e2e/paramascotas-real-auth.spec.ts` (`4/4`), todos los E2E del Dashboard (`tests/e2e`, `201/201`, 1.5 min), `./scripts/check-container-connectivity.sh development`, `./scripts/check-paramascotas.sh`, `./scripts/check-env-secrets.sh all` y `./scripts/e2e-development.sh`.
- `check-container-connectivity.sh development` y `e2e-development.sh` confirmaron que `billing-service` y `billing-recovery-worker` siguen en `SRI_ENVIRONMENT=pruebas`; no se uso facturacion/SRI de produccion. `check-env-secrets.sh all` quedo con advertencias no bloqueantes por `.p12` faltantes de sucursales QA y data no principal existente.

### 2026-06-17 - Dashboard QA: Duplicar producto no hereda stock ni familia

Objetivo: corregir un riesgo operativo en el nuevo Dashboard: la accion `Duplicar` copiaba la cantidad, lote/vencimiento y claves de familia agrupada del producto fuente. Eso podia crear stock ficticio o dejar una copia completa dentro de una familia de variantes cuando la accion correcta para variantes es `Nueva variante`.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` ajusta `duplicateProduct()` para que la copia conserve ficha comercial e imagenes, pero arranque con `quantity: 0`, `published: false`, sin `inventoryAction`, sin factura de compra, sin lote/vencimiento heredado y sin `variantBaseName`/`variantGroupKey` original.
- La copia mantiene un SKU derivado `-COPY`, pero ya no puede duplicar inventario real ni meterse accidentalmente en el grupo publico del producto fuente.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` agrega la regresion `duplicate product starts without inherited stock or grouped identity`, validando el formulario y el POST final (`quantity=0`, `purchaseInvoice=null`, sin lote heredado y sin `variantGroupKey` original).

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, el foco `--grep "duplicate product starts"` (`1/1`), el subconjunto de productos/duplicados (`12/12`) y la suite completa `tests/e2e/paramascotas-real-integrations.spec.ts` (`75/75`, 1.2 min).
- La suite completa volvio a cubrir rutas del panel, productos simples/agrupados, filtros, imagenes, POS, cotizaciones, pedidos, compras, reportes, RIDE/facturacion, correos y salvaguardas SRI QA; no se uso SRI/facturacion de produccion.

### 2026-06-17 - Dashboard QA: Nueva variante hereda factura de compra legacy

Objetivo: alinear el Dashboard nuevo con el flujo del panel anterior cuando se crea una variante desde un producto agrupado o se registra una reposicion. El panel anterior intenta precargar proveedor, documento, factura, fecha y notas desde la ultima compra/lote del producto base; el Dashboard nuevo solo estaba llevando proveedor y tasa, perdiendo contexto util para compras e inventario.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` agrega `createPurchaseInvoiceFromSourceProduct()`, tolerante a campos legacy como `lastPurchaseInvoice`, `inventory.lastPurchaseInvoice`, lotes de procurement, `lastPurchaseInvoiceNumber`, `purchase_invoice_number`, `lastPurchaseSupplierDocument` y fechas/notas heredadas.
- `registerProductPurchase()` y `duplicateProductVariant()` usan ese helper para precargar la factura de compra desde el producto fuente y normalizarla contra proveedores registrados antes de guardar.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` extiende la regresion de `Nueva variante` con `inventory.lastPurchaseInvoice`, verificando que el POST conserve `invoiceNumber`, `supplierName`, `supplierDocument`, `issuedAt` y `notes` junto con el nombre `Familia + variante`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, el foco `--grep "duplicate variant"` (`1/1`), la suite completa `tests/e2e/paramascotas-real-integrations.spec.ts` (`74/74`, 1.2 min) y `./scripts/check-container-connectivity.sh development`.
- La suite completa volvio a cubrir rutas del panel, productos agrupados, filtros, imagenes, POS, cotizaciones, pedidos, compras, reportes, RIDE/facturacion, correos y salvaguardas SRI QA; `check-container-connectivity.sh development` confirmo `SRI_ENVIRONMENT=pruebas` en facturador/worker y no se uso SRI/facturacion de produccion.

### 2026-06-17 - Dashboard QA: Nuevas variantes sincronizan nombre legacy

Objetivo: corregir otra diferencia con `/my-account` al crear una nueva variante desde un producto agrupado. El panel anterior actualizaba el nombre del formulario a `Familia + variante` cuando el usuario cambiaba el nuevo peso/talla/color/presentacion; el Dashboard nuevo dejaba el nombre como solo la familia, aunque los atributos quedaran correctos.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` cambia `updateProductAttribute()` para sincronizar drafts de nueva variante mediante `syncDuplicateProductVariantName()`, detectando los metadatos internos `__sourceVariantLabel`/`__variantDefinitionField` y componiendo el nombre con `variantBaseName + variantLabel`.
- La sincronizacion usa los mismos resolvers de variantes ya portados desde el panel anterior, por lo que aplica a peso/contenido, presentacion, talla, color, rango o dosis sin crear reglas por campo.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` endurece la regresion de `Nueva variante`: al cambiar de `2 kg` a `4 kg`, el input `Nombre` y el payload POST deben quedar como `Croqueta QA Familia 4 kg`, no solo `Croqueta QA Familia`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, el foco `--grep "duplicate variant"` (`1/1`), el subconjunto `--grep "paramascotas product"` (`10/10`) y la suite completa `tests/e2e/paramascotas-real-integrations.spec.ts` (`74/74`, 1.1 min).
- La suite completa volvio a cubrir rutas del panel, productos agrupados, filtros, imagenes, POS, cotizaciones, pedidos, compras, reportes, RIDE/facturacion, correos y salvaguardas SRI QA; no se uso SRI/facturacion de produccion.

### 2026-06-17 - Dashboard QA: Busqueda de catalogo replica tokens legacy

Objetivo: cerrar una brecha adicional con `/my-account` en la busqueda del catalogo admin. El panel anterior no hacia un `includes` literal: normalizaba tokens, unia medidas (`2 kg`/`2kg`), expandia alias (`perro`/`dog`, `gato`/`cat`, ofertas/novedades) y ordenaba por puntaje. El Dashboard nuevo aun podia perder productos agrupados cuando la consulta venia con tokens fuera de orden o alias.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` agrega el indice de busqueda del catalogo con alias legacy, unidades compactas, exclusion de descripciones genericas importadas, metadatos semanticos de oferta/novedad, identidades internas/legacy, atributos completos, `variantOptions`, proveedor de inventario y proveedor de factura.
- `filteredProducts()` conserva primero los filtros visibles de catalogo/selector/IVA, y luego puntua/ordena resultados con `getProductCatalogSearchScore()` en lugar de depender de una frase normalizada con `includes`.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` amplia la regresion de producto agrupado para validar busqueda por clave de grupo, familia, proveedor, alias `dog` sobre especie `Perro`, tokens desordenados (`familia rojo`), medida compacta (`2kg`) y valor inexistente.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, el foco `--grep "product search"` (`1/1`), el subconjunto `--grep "paramascotas product"` (`10/10`) y la suite completa `tests/e2e/paramascotas-real-integrations.spec.ts` (`74/74`, 1.2 min).
- La suite completa volvio a cubrir rutas del panel, productos agrupados, filtros, imagenes, POS, cotizaciones, pedidos, compras, reportes, RIDE/facturacion, correos y salvaguardas SRI QA; no se uso SRI/facturacion de produccion.

### 2026-06-17 - Dashboard QA: Publicacion de productos vuelve a regla legacy

Objetivo: corregir una incompatibilidad con `/my-account`: el panel anterior permite publicar un producto cuando tiene precio y stock mayor a cero, mientras el Dashboard nuevo estaba bloqueando la publicacion si faltaban imagenes, SEO o descripcion larga.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` agrega `productHasPublicationBasics()` y cambia `toggleProductPublication()` para bloquear solo cuando falta precio o stock, manteniendo `productCanPublish()` como chequeo de ficha completa/SEO.
- `paramascotas-panel.component.html` separa visualmente `Publicable: precio y stock` de `Ficha/SEO incompleta`, tanto en la tabla como en el modal de vista previa, para que una ficha incompleta no parezca imposible de publicar.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` agrega una regresion con producto sin imagenes/SEO completo pero con precio y stock, verificando que `Publicar` envie `published: true`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, el foco `--grep "publication follows legacy price and stock rule"` (`1/1`), el subconjunto de productos agrupados/precios/publicacion/imagenes (`12/12`) y la suite completa `tests/e2e/paramascotas-real-integrations.spec.ts` (`74/74`, 1.2 min).
- La suite completa volvio a cubrir productos agrupados, filtros, imagenes, POS, cotizaciones, pedidos, compras, reportes, RIDE/facturacion, correos y salvaguardas SRI QA sin usar produccion.

### 2026-06-17 - Dashboard QA: Imagenes de producto evitan cache viejo

Objetivo: recuperar una paridad puntual con `/my-account` en imagenes de productos: las imagenes subidas bajo `/uploads/` deben agregar un cache key basado en `updatedAt`/`updated_at`/`modifiedAt`/`modified_at` para que una imagen reemplazada no quede vieja en el navegador.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` agrega `appendProductImageCacheKey()` y lo usa en `productThumbnailUrl()` y en `productImagePreviewUrl(image, product)` para catalogo y modal de vista previa.
- `paramascotas-panel.component.html` pasa el producto a las miniaturas del modal, manteniendo URLs cacheadas solo para visualizacion; el editor de formulario conserva las URLs limpias para no guardar `?v=` en payloads.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` agrega una regresion con `imageMeta` en `/uploads/products/...` y `updatedAt`, verificando que la imagen de tabla y la vista previa incluyan `v=` con el timestamp codificado.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, el foco `--grep "cache key to uploaded product images"` (`1/1`), el subconjunto de productos agrupados/precios/imagenes (`11/11`) y la suite completa `tests/e2e/paramascotas-real-integrations.spec.ts` (`73/73`, 1.2 min).
- La suite completa volvio a cubrir productos agrupados, imagenes, filtros, POS, cotizaciones, pedidos, compras, reportes, RIDE/facturacion, correos y salvaguardas SRI QA sin usar produccion.

### 2026-06-17 - Dashboard QA: Filtros legacy vuelven al catalogo de productos

Objetivo: recuperar en el Dashboard nuevo capacidades operativas del panel anterior `/my-account`: filtrar productos del catalogo por categoria, proveedor, marca, mascota, condicion tributaria (`Con IVA` / `IVA 0%`) y filtros rapidos legacy (`Publicables`, `Bloqueados`, `Con stock`, `Sin stock`, `Sin precio`) sin depender solo de busqueda libre ni mezclar esos estados con filtros de imagenes o riesgo.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` agrega `ProductTaxFilter`, opciones derivadas del catalogo, estados de filtro para categoria/proveedor/marca/mascota/IVA, filtros rapidos legacy en `ProductCatalogFilter`, setters dedicados, `clearProductFilters()` y filtrado combinado con busqueda/publicacion usando la misma lectura corregida de IVA/exencion.
- `paramascotas-panel.component.html` agrega selectores compactos `Categoria`, `Proveedor`, `Marca`, `Mascota` e `IVA` en la barra de productos; debajo agrega chips compactos `Todos`, `Publicables`, `Bloqueados`, `Con stock`, `Sin stock` y `Sin precio`; cada opcion muestra conteo y cada fila muestra una etiqueta `IVA 15%` o `IVA 0%`.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` agrega regresiones con productos gravados/exentos y productos sin stock/sin precio, validando etiquetas, filtros por categoria/proveedor/marca/mascota, filtros de IVA, filtros rapidos legacy y limpieza de filtros.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, el foco `--grep "quick filters match legacy stock and price rules|legacy selectors and VAT status"` (`2/2`), el subconjunto de productos agrupados/precios (`10/10`), `tests/e2e/paramascotas-list-views.spec.ts --grep "catalog products"` (`1/1`) y la suite completa `tests/e2e/paramascotas-real-integrations.spec.ts` (`72/72`, 1.2 min).
- Verificacion visual automatizada sobre `http://127.0.0.1:8081/paramascotas-panel/catalog/products`: desktop `1365x900` y mobile `390x844` quedaron con `overflow` horizontal `0`; los 6 selectores compactos y los 6 chips rapidos se envuelven en mobile sin romper el ancho.
- La suite completa volvio a cubrir rutas del panel, productos agrupados, POS, cotizaciones, pedidos, compras, reportes, RIDE/facturacion, correos y salvaguardas SRI QA sin usar produccion.

### 2026-06-17 - Dashboard QA: IVA exento respeta alias legacy en productos

Objetivo: corregir una brecha de paridad con `/my-account` en la edicion de productos: productos antiguos con `taxExempt`/`tax_exempt` en aliases como `sí`, `si`, `on` o `y` debian tratarse como exentos y no dividir su PVP por IVA al abrir el editor.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` centraliza la lectura de exencion con `isTaxExemptProduct()`, aceptando `tax.exempt`, `taxExempt`, `attributes.taxExempt` y `attributes.tax_exempt` con los aliases booleanos del panel anterior.
- `productTaxRate()`, `productFormTaxRate()`, `productToForm()` y `sanitizeProductForm()` usan esa normalizacion para mantener precios netos/PVP correctos y enviar `taxExempt` canonico `true/false` al backend.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` agrega una regresion con un producto exento heredado `attributes.tax_exempt = 'sí'`, verificando que el editor preserve precio base/PVP sin restar IVA y que el PUT envie `taxExempt: 'true'`.

Operacion y verificacion:
- La regresion fallo primero contra el runtime anterior mostrando `8.6957` para un PVP exento de `10`, confirmando el bug.
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, el foco `--grep "legacy Spanish tax exemption|saves net base price"` (`2/2`), el subconjunto de productos agrupados/precios (`8/8`), la suite completa `tests/e2e/paramascotas-real-integrations.spec.ts` (`70/70`, 1.2 min) y `./scripts/check-container-connectivity.sh development`.
- `check-container-connectivity.sh development` confirmo que `billing-service` y `billing-recovery-worker` siguen en `SRI_ENVIRONMENT=pruebas`; no se uso facturacion/SRI de produccion.

### 2026-06-17 - Dashboard QA: Tendencias financieras sin scroll interno

Objetivo: continuar la mejora de visibilidad de estadisticas del Dashboard nuevo frente a `/my-account`, corrigiendo que las tarjetas de tendencia financiera por periodo quedaran recortadas dentro de un contenedor con scroll vertical.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.css` elimina `max-height` y `overflow: auto` de `.paramascotas-trend-grid--compact`, dejando visibles las tarjetas de periodos financieros sin esconder metricas dentro del panel.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` agrega una regresion que inyecta 10 periodos financieros, entra a `reporting/balance`, cambia a `Mes a mes` y valida que todas las tarjetas se rendericen sin `overflow-y: auto/scroll` ni recorte interno.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, la regresion enfocada `--grep "balance trends keep period metrics"` (`1/1`) y la suite completa `tests/e2e/paramascotas-real-integrations.spec.ts` (`69/69`, 1.1 min).
- La suite completa cubrio rutas del panel, productos agrupados, POS, cotizaciones, pedidos, envios, compras, reportes, RIDE/facturacion y salvaguardas SRI QA sin usar produccion.

### 2026-06-17 - Dashboard QA: Productos agrupados respetan alias legacy de modo separado

Objetivo: cerrar una brecha fina de paridad con `/my-account` en productos agrupados/variantes: el panel anterior y backend aceptan `sí` como alias legacy para publicar una variante separada en catalogo, pero el nuevo Dashboard solo reconocia `si`.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` ahora normaliza `catalogDisplayMode` con `sí` hacia `separate`, igual que el panel anterior/backend.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` extiende la regresion del editor de productos para abrir un producto con `catalogDisplayMode: 'sí'`, verificar que el selector muestre `Separado en catalogo` y confirmar que el PUT envie `catalogDisplayMode: 'separate'`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, la regresion enfocada `--grep "product editor saves net base price"` (`1/1`), el subconjunto agrupados/precio (`9/9`) y la suite completa `tests/e2e/paramascotas-real-integrations.spec.ts` (`68/68`, 1.0 min).
- La validacion completa cubrio productos agrupados, POS, ventas historicas, compras por variante, reportes, facturacion/RIDE y salvaguardas SRI QA sin usar produccion.

### 2026-06-17 - Dashboard QA: Ranking de ventas visible con metricas completas

Objetivo: responder al problema de estadisticas ocultas por scroll y tops ambiguos, alineando el reporte de ventas del nuevo Dashboard con una lectura operativa clara frente al panel anterior `/my-account`.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.html` ajusta el bloque financiero `Productos lideres` para que el ranking detalle por fila posicion, ingreso, unidades vendidas, utilidad y margen, en vez de mostrar solo venta neta y utilidad.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.css` elimina el `max-height`/scroll interno de listas de detalle de reportes y agrega un badge compacto de posicion, evitando que estadisticas importantes queden ocultas dentro de paneles pequenos.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` valida que el reporte de ventas muestre lideres por metrica, exponga el ranking con `ingreso`, `uds`, `utilidad` y `margen`, y que la lista no quede recortada por scroll interno.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, la regresion enfocada `--grep "sales report identifies product leaders"` (`1/1`) y la suite completa `tests/e2e/paramascotas-real-integrations.spec.ts` (`68/68`, 1.1 min).
- La suite completa volvio a cubrir productos agrupados, precios netos/PVP, POS, cotizaciones, pedidos, envios, compras, reportes, facturacion/RIDE y salvaguardas SRI QA; no se uso SRI produccion.

### 2026-06-17 - Dashboard QA: Editor de productos guarda precio base y permite editar PVP

Objetivo: corregir un desajuste critico frente al panel anterior `/my-account`: el nuevo Dashboard estaba rotulando `Precio PVP` pero enviaba ese valor al backend como `price`, que en la DB es precio base sin IVA. Eso podia inflar precios, margenes y futuras ventas al editar productos gravados.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` convierte el PVP devuelto por la API a precio base neto en `productToForm()`, usando `tax.rate`/`tax.multiplier` del backend o la tasa general como respaldo.
- El mismo componente calcula el margen del catalogo sobre precio neto y agrega helpers de formulario para editar PVP/PVP anterior recalculando base neta, ademas de mostrar margen neto sin cambiar el contrato backend.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.html` cambia los rótulos del editor a `Precio base sin IVA`, `PVP venta`, `Precio anterior base` y `PVP anterior`, dejando claro que el backend guarda base neta pero el usuario puede operar con PVP como en `/my-account`.
- `Dashboard/src/app/features/dashboard/models/paramascotas-admin.model.ts` declara el bloque `tax` que ya entrega el backend para productos.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` agrega una regresion que edita un producto gravado con PVP 11.50 / IVA 15%, confirma que el formulario carga base 10.00, permite escribir PVP 13.80 y verifica que el PUT envie `price: 12`, no el PVP.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, la regresion enfocada `--grep "product editor saves net base price"` (`1/1`), el subset de productos agrupados/precio (`9/9`) y la suite completa `tests/e2e/paramascotas-real-integrations.spec.ts` (`68/68`, 3.7 min).
- La suite completa valido tambien rutas de reportes, inventario, catálogos, POS, cotizaciones, pedidos, envios, finanzas, facturas de compra, RIDE/facturacion y salvaguardas SRI QA sin usar produccion.

### 2026-06-17 - Dashboard QA: Busqueda de productos reconoce metadatos agrupados

Objetivo: acercar la gestion de productos del nuevo Dashboard al comportamiento del panel anterior `/my-account`, donde los productos agrupados/variantes se localizan por datos comerciales y no solo por nombre o SKU visible.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` amplia `filteredProducts()` para indexar identidades internas/legacy, descripcion, proveedor, SEO search terms, `variantBaseName`, `variantLabel`, `variantGroupKey`, modo/eje de variante, peso, presentacion, empaque, talla, color, material, rango/edad, dosis, uso/sabor y proveedores de inventario/factura.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.html` actualiza el placeholder del buscador a `Nombre, SKU, variante, proveedor o grupo`, haciendo explicito el alcance real del filtro.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` agrega una regresion que carga un producto agrupado y confirma que el catalogo admin lo encuentra por clave de agrupacion, nombre base de familia y proveedor aunque esos valores no sean el nombre principal.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "product search finds grouped variants"` (`1/1`) y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "grouped|product search|duplicate variant|product form|products purchases|sales ranking"` (`8/8`).
- El subconjunto validado cubre formulario de margen, duplicado de variantes agrupadas, busqueda por metadatos agrupados, venta historica con identidad interna, POS con aliases agrupados, ranking con alias interno y productos x compra con identidad interna.

### 2026-06-17 - Dashboard QA: Smoke local recuperado sin romper auth real publica

Objetivo: cerrar los fallos de `smoke.spec.ts` detectados al validar permisos/navegacion tras migrar el Dashboard a auth real en el dominio publico, conservando fixtures solo para desarrollo local.

Cambios:
- `Dashboard/src/app/core/auth/auth-api.service.ts` separa autenticacion fixture/local y autenticacion real/publica: en localhost vuelve a usar `auth/providers`, `auth/password`, `auth/password-reset-requests`, `auth/password-reset-completions`, `auth/me` y `auth/logout`; fuera de localhost usa `auth/session`, `auth/login`, `auth/password-reset/request`, `auth/password-reset/confirm` y bypass de fixtures.
- `Dashboard/src/app/features/public/pages/auth-callback/auth-callback.component.ts` normaliza primero `returnUrl` y despues adjunta `tenant`, evitando que una URL externa como `https://evil.test` se convierta en una ruta interna falsa antes de ser saneada.
- `Dashboard/tests/e2e/smoke.spec.ts` queda alineado con la UI compacta vigente: navegacion `Servicios adicionales`/`Recursos UI`, editor de productos abierto bajo demanda, cards de productos/inventario/monitoreo y textos fixture actuales de workspace.
- `Dashboard/src/app/core/auth/auth-api.service.spec.ts` ajusta el fixture de auth a `localhost`, que es el runtime donde corresponde permitir datos simulados.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/smoke.spec.ts --grep "external auth callback fixture keeps return url"` (`1/1`), `node node_modules/playwright/cli.js test tests/e2e/smoke.spec.ts` (`73/73`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-auth.spec.ts` (`4/4`) y `./scripts/check-container-connectivity.sh development`.
- La validacion real sigue entrando por `https://paramascotasec.com/dashboard` via APISIX con MFA y tenant real; la validacion local conserva fixtures solo en `127.0.0.1:8081`.
- `check-container-connectivity.sh development` confirmo nuevamente `SRI_ENVIRONMENT=pruebas` en Facturador y worker, endpoints SRI `celcer.sri.gob.ec`, catalogo publico por Gateway y rutas legacy bloqueadas.

Nota:
- `npx vitest run src/app/core/auth/auth-api.service.spec.ts` no pudo ejecutarse por la dependencia opcional faltante de Rollup en el `node_modules` local (`@rollup/rollup-linux-x64-gnu`); el tramo quedo cubierto con typecheck/lint, build Docker, smoke completo, auth real y conectividad development.

### 2026-06-17 - Dashboard QA: Auth real, MFA y permisos tenant validados

Objetivo: validar el bloque explicito de login/autenticacion del objetivo integral, usando el dominio publico QA y no solo fixtures locales.

Operacion y verificacion:
- Paso `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-auth.spec.ts` (`4/4`) desde `Dashboard`.
- La suite crea usuarios reales temporales, valida login por `https://paramascotasec.com/dashboard`, MFA por OTP, contexto tenant real, productos/POS accesibles para admin tenant, bloqueo de `tenant-admin` sin permiso `platform-admin`, denegacion de rutas admin a cliente, resincronizacion POS tras rechazo de abrir/cerrar caja y recuperacion de clave con longitud minima backend.
- La prueba usa resolucion de `paramascotasec.com` hacia `192.168.100.229`, por lo que valida el contrato publico por APISIX en el entorno development/QA.

Pendientes:
- Seguir auditoria integral de filtros/caltulos y pantallas restantes contra `/my-account`; auth queda validado en este tramo sin cambios de codigo.

### 2026-06-17 - Workspace QA: E2E development completo posterior a ajustes Dashboard

Objetivo: validar el estado integral del workspace tras los ajustes recientes del Dashboard, incluyendo contratos publicos, capacidades, SEO, Facturador y conectividad Gateway en development/QA.

Operacion y verificacion:
- Pasaron `npm run capabilities:check` en `paramascotasec/app`, `scripts/check-env-secrets.sh all`, `scripts/check-paramascotas.sh`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-list-views.spec.ts` (`9/9`), `node node_modules/playwright/cli.js test tests/e2e/layout-density.spec.ts` (`33/33`) y `scripts/e2e-development.sh`.
- `scripts/e2e-development.sh` confirmo capability registry valido (`27` capacidades, `101` rutas backend, `17` rutas Facturador), lint/typecheck frontend publico, sintaxis backend, backend health, conectividad development, auditoria SEO sin failures, PHPUnit Facturador `18/18` (`44` assertions) y probes E2E de capacidades OK con reporte en `reports/e2e/development/capability-e2e-report.json`.
- El entorno se mantuvo en `development`; Facturador y worker reportaron `SRI_ENVIRONMENT=pruebas` y conectividad a `celcer.sri.gob.ec`. No se uso SRI produccion.

Advertencias conocidas:
- `check-env-secrets.sh all` y `e2e-development.sh` siguen mostrando advertencias existentes por sucursales/API keys no principales y certificados `.p12` faltantes en sucursales de pruebas; no son fallos del tramo y no se modifico data.

### 2026-06-17 - Dashboard QA: Reemision SRI produccion bloqueada en development

Objetivo: confirmar y cubrir con regresion que el flujo de reemision de comprobantes no pueda tocar endpoints SRI/Facturador de produccion desde el ambiente development/QA, incluso si un comprobante viene marcado como `produccion`.

Cambios:
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` agrega una prueba que simula un RIDE reemitible con `ambiente=produccion`; la UI debe mostrar `Bloqueada QA`, deshabilitar `Bloqueada en QA`, explicar que el documento esta marcado como produccion y no emitir ningun POST a `cancel-and-reissue`.
- Se verifico que `paramascotasec-backend/src/Services/FacturadorApiService.php` ya bloquea server-side `/api/production/v1/invoices` cuando `APP_ENV` no es `production/prod`, por lo que no se requirio cambio funcional de backend.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `php -l src/Services/FacturadorApiService.php`, una prueba CLI directa con `APP_ENV=development FACTURADOR_API_KEY=dummy` confirmando `Uso de Facturador production bloqueado`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "billing rides"` (`3/3`) y `./scripts/check-container-connectivity.sh development`.
- `check-container-connectivity.sh development` confirmo `SRI_ENVIRONMENT=pruebas` para `billing-service` y `billing-recovery-worker`, endpoints SRI `celcer.sri.gob.ec`, APISIX operativo y rutas legacy bloqueadas.

Pendientes:
- Continuar auditoria integral de filtros restantes, calculos cruzados y facturacion operativa contra `/my-account`.

### 2026-06-17 - Dashboard QA: Cotizaciones imprimibles conservan calculos y envio seguro

Objetivo: alinear el flujo de cotizaciones del nuevo Dashboard con `/my-account`, donde al crear una cotizacion se imprimia el documento comercial con detalle economico completo, sin forzar envio de correo invalido ni disparar pruebas de mail/RIDE.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` vuelve a imprimir automaticamente la cotizacion recien creada, de forma silenciosa si el navegador bloquea la ventana para no tapar el aviso principal.
- El HTML imprimible de cotizacion ahora usa `quote_snapshot.items` calculado por backend y muestra producto, cantidad, PVP, total por linea, subtotal, descuento cuando aplica, envio cuando aplica, IVA y total; si falta snapshot conserva fallback simple.
- `Dashboard/src/app/features/dashboard/models/paramascotas-admin.model.ts` declara `product_name` opcional en items del snapshot de cotizacion.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` captura la impresion en pruebas, valida que una cotizacion con correo invalido no envie `send_email`, y confirma que el HTML imprimible conserva producto, PVP, IVA y total; el test de WhatsApp distingue impresion local de apertura de WhatsApp sin mandar `send_whatsapp` al backend.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "quotations|billing rides exposes email"` (`4/4`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts` (`65/65`) y `./scripts/check-container-connectivity.sh development`.
- La conectividad development confirmo otra vez `SRI_ENVIRONMENT=pruebas`, endpoints SRI `celcer.sri.gob.ec`, contrato publico por APISIX, catalogo publico activo y rutas legacy bloqueadas; no se uso SRI produccion ni se disparo endpoint `mail-test`.

Pendientes:
- Continuar auditoria integral de facturacion, filtros restantes y calculos cruzados de ventas/compras contra `/my-account`.

### 2026-06-17 - Dashboard QA: Pedidos y reportes deduplican ventas repetidas

Objetivo: alinear pedidos operativos y reportes del nuevo Dashboard con `/my-account`, que ya deduplicaba filas de ventas antes de mostrar listados y trazabilidad, evitando conteos/totales inflados cuando el backend devuelve filas repetidas por joins o reintentos.

Cambios:
- `Dashboard/src/app/features/dashboard/data/paramascotas-admin-api.service.ts` normaliza `listOrders()` deduplicando por `id` y, si falta, por fecha/cliente/correo/total/items; el cambio aplica centralmente a pedidos, envios, estado de tienda y vistas que reutilizan ordenes.
- `getAdminReport()` ahora deduplica `orders` del reporte por la misma regla de estabilidad del panel anterior y corrige `orders_count`, `total`, `net`, `tax` y `shipping` solo cuando esos valores coinciden exactamente con la suma inflada de filas duplicadas.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` agrega regresiones que simulan duplicados en `/dashboard/api/orders` y `/dashboard/api/admin/report`, verificando que la UI muestre un solo pedido, un solo registro reciente y totales no inflados.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "deduplicate|admin orders"` (`5/5`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts` (`65/65`) y `./scripts/check-container-connectivity.sh development`.
- `check-container-connectivity.sh development` confirmo nuevamente `SRI_ENVIRONMENT=pruebas` para Facturador y worker, endpoints SRI `celcer.sri.gob.ec`, contrato publico por APISIX, catalogo publico activo y rutas legacy bloqueadas; no se uso SRI produccion.

Pendientes:
- Continuar la auditoria integral de notificaciones/correos, facturacion, filtros restantes y calculos cruzados de ventas/compras contra `/my-account`.

### 2026-06-17 - Dashboard QA: Facturas de compra deduplicadas y normalizadas

Objetivo: alinear el resumen de facturas de compra del nuevo Dashboard con `/my-account`, evitando KPIs inflados o totales fragiles cuando el listado reciente trae filas repetidas o montos como texto.

Cambios:
- `Dashboard/src/app/features/dashboard/data/paramascotas-admin-api.service.ts` normaliza `listPurchaseInvoices()`: convierte importes/unidades/productos a numeros, estabiliza strings y deduplica por `id` o por la combinacion factura/proveedor/fecha/total como hacia el panel anterior.
- El resumen de inventario y cualquier pantalla que consuma `purchaseInvoices()` reciben ya el contrato limpio, sin mover la logica a una vista puntual.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` agrega una regresion que simula dos filas identicas con numeros como strings y verifica que `Ultimas facturas de compra` muestre `1 registros`, `8` unidades, `$119,60` y una sola accion.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "purchase invoice"` (`2/2`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-list-views.spec.ts --grep "purchase invoice|initial stock"` (`2/2`) y `./scripts/check-container-connectivity.sh development`.
- `check-container-connectivity.sh development` confirmo `SRI_ENVIRONMENT=pruebas` en Facturador y worker, endpoints SRI `celcer.sri.gob.ec`, contrato publico por APISIX y rutas legacy bloqueadas; no se uso SRI produccion.

Pendientes:
- Continuar auditoria integral de pedidos/facturas, notificaciones, reportes y calculos de ventas/compras contra `/my-account`.

### 2026-06-17 - Dashboard QA: Catalogos operativos editables sin borrar registros

Objetivo: acercar el nuevo Dashboard al comportamiento de `/my-account` en catalogos reutilizables, evitando que proveedores, marcas o valores de variantes/filtros tengan que borrarse y recrearse para corregir datos.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` agrega estado de edicion para catalogos (`editingReferenceId`), precarga de registros existentes y actualizacion segura con `updateReferenceValue()`.
- Proveedores y marcas preservan su `id` al editar; los valores simples de catalogos reutilizables se reemplazan sin duplicar ni borrar el resto del catalogo.
- La validacion de catalogos ahora excluye el registro editado al revisar duplicados, pero sigue bloqueando nombres, documentos de proveedor y valores repetidos contra otros registros.
- `paramascotas-panel.component.html/css` cambia el formulario a modo `Editar registro`/`Guardar cambios` con `Cancelar`, y agrega accion `Editar` en filas editables.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` extiende proveedores para precargar, bloquear nombre duplicado y guardar cambios en payload; agrega prueba para editar `Pesos/contenidos` sin borrar/recrear y bloquear duplicados.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "supplier catalog|category catalog"` (`3/3`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "supplier catalog|category catalog|reusable catalog"` (`4/4`) y `./scripts/check-container-connectivity.sh development`.
- `check-container-connectivity.sh development` confirmo `SRI_ENVIRONMENT=pruebas` en Facturador y worker, endpoints SRI `celcer.sri.gob.ec`, contrato publico por APISIX y rutas legacy bloqueadas; no se uso SRI produccion.

Pendientes:
- Continuar auditoria integral de compras detalladas, pedidos/facturas, notificaciones y reportes contra `/my-account`.

### 2026-06-17 - Dashboard QA: Edicion de imagenes publicas conserva visibilidad

Objetivo: recuperar en el nuevo Dashboard un comportamiento del panel anterior `/my-account`: completar o reemplazar imagenes de una categoria publica no debe resetear si la categoria esta visible u oculta en el carril superior y/o bloque destacado.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` agrega `editCategoryReferenceImages()`, que precarga en el formulario las 5 URLs actuales de la categoria seleccionada.
- `addReferenceValue()` ahora preserva `showInTopSection`, `showInFeaturedSection` y `showInImageSection` al hacer upsert de imagenes de categoria, en vez de volverlas siempre `true`.
- `paramascotas-panel.component.html/css` agrega la accion compacta `Editar imagenes` en filas de `Categorias publicas`, junto a `Eliminar`, sin romper el layout de lista.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` extiende la regresion de categorias: oculta una categoria, edita/reemplaza la imagen superior y verifica que el payload guardado siga con `showInTopSection:false`, `showInFeaturedSection:false` y `showInImageSection:false`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "category catalog"` (`2/2`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "supplier catalog|category catalog"` (`3/3`) y `./scripts/check-container-connectivity.sh development`.
- `check-container-connectivity.sh development` confirmo `SRI_ENVIRONMENT=pruebas` en Facturador y worker, endpoints SRI `celcer.sri.gob.ec`, contrato publico por APISIX y rutas legacy bloqueadas; no se uso SRI produccion.

Pendientes:
- Continuar auditoria integral de formularios mutables de productos/compras, pedidos/facturas, notificaciones y reportes contra `/my-account`.

### 2026-06-17 - Dashboard QA: Resize de imagenes de producto conserva encuadre

Objetivo: alinear un detalle pendiente del nuevo Dashboard con `/my-account` en la carga de imagenes de producto: cuando una foto no tiene el tamano exacto, debe ajustarse al canvas requerido sin recortar el producto.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` cambia el helper de redimensionado de producto para usar escalado proporcional tipo contain sobre fondo blanco, igual que el panel anterior, en lugar de recorte tipo cover.
- `Dashboard/tests/e2e/paramascotas-list-views.spec.ts` agrega una prueba funcional de subida real: genera un PNG cuadrado, lo sube como miniatura, intercepta el multipart enviado a `/uploads/images` y valida que el archivo resultante sea `640x800`, con banda superior blanca y centro rojo.
- Las pruebas de proveedor/imagenes en esa spec se ajustaron para respetar las reglas ya vigentes de producto `Alimento` con stock: vencimiento obligatorio antes de guardar.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-list-views.spec.ts --grep "product image upload"`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-list-views.spec.ts` (`9/9`) y `./scripts/check-container-connectivity.sh development`.
- `check-container-connectivity.sh development` confirmo `SRI_ENVIRONMENT=pruebas` en Facturador y worker, endpoints SRI `celcer.sri.gob.ec`, contrato publico por APISIX y rutas legacy bloqueadas; no se uso SRI produccion.

Pendientes:
- Continuar auditoria integral de edicion posterior de referencias/imagenes publicas, compras detalladas, pedidos/facturas, notificaciones y reportes contra `/my-account`.

### 2026-06-17 - Dashboard QA: Verificacion integral development posterior a ajustes

Objetivo: validar el stack development/QA despues de los ajustes acumulados en Dashboard, productos, catalogos, resumen y ranking.

Operacion y verificacion:
- Paso `./scripts/e2e-development.sh` desde `/home/admincenter/contenedores`.
- La suite valido capability registry, frontend publico `lint`/`typecheck`, sintaxis y health del backend, preflight de secretos/env, conectividad completa por APISIX, SEO/Merchant, pruebas PHPUnit del Facturador (`18/18`, `44` assertions) y probes E2E de capacidades.
- Resultado final: `E2E development OK`.
- Advertencias no bloqueantes reportadas: dos sucursales de pruebas con API habilitada sin `.p12`, tenants/sucursales/API keys adicionales conservados en datos locales. No se modifico data para resolver esas advertencias.
- La verificacion confirmo Facturador en `SRI_ENVIRONMENT=pruebas` y endpoints SRI de pruebas `celcer.sri.gob.ec`; no se uso ambiente SRI de produccion.

Decision:
- Este checkpoint queda como validacion integral del ambiente development/QA posterior a los cambios de Dashboard. Las advertencias son operativas/datos locales y no bloquean el entorno desplegado.

### 2026-06-17 - Dashboard QA: Ranking del resumen declara lideres por metrica

Objetivo: evitar que el top de productos del resumen Paramascotas sea ambiguo; debe quedar claro cual producto lidera por unidades, ingresos, utilidad y margen.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-backend/paramascotas-backend.component.{ts,html,css}` agrega tarjetas compactas dentro de `Ranking de productos`: `Mas vendido`, `Mayor ingreso`, `Mayor utilidad` y `Mayor margen`.
- Las tarjetas se calculan desde `admin.topProducts` ya disponible, sin nuevos endpoints, y mantienen fallback `Sin datos` cuando el periodo no tenga ventas.
- El encabezado del ranking explicita que el bloque cruza `venta neta, unidades, utilidad y margen`.
- `Dashboard/tests/e2e/paramascotas-backend-layout.spec.ts` agrega regresion para exigir que esas etiquetas de liderazgo sigan visibles.

Operacion y verificacion:
- Se redeplego solo Dashboard con `cd /home/admincenter/contenedores/Dashboard && npm run docker:up`; no se desplego production ni se tocaron DB, backend, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run lint`, `npm run type:check`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-backend-layout.spec.ts --grep "backend"` (`3/3`) y `./scripts/check-container-connectivity.sh development`.
- `check-container-connectivity.sh development` confirmo Facturador en `SRI_ENVIRONMENT=pruebas` contra `celcer.sri.gob.ec`; no se uso ambiente SRI de produccion.

Decision:
- Todo ranking o top visible debe nombrar su criterio de liderazgo. Si se muestran varias metricas en una tabla, la vista debe destacar explicitamente los lideres por metrica para evitar lecturas equivocadas.

### 2026-06-17 - Dashboard QA: Visibilidad de categorias publicas vuelve al Dashboard

Objetivo: recuperar en el nuevo Dashboard la capacidad del panel anterior `/my-account` de decidir si cada categoria publica aparece en el carril superior y/o en el bloque destacado de la home.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.{ts,html,css}` agrega checkboxes compactos `Carril superior` y `Bloque destacado` en filas de `Categorias publicas` con imagenes completas.
- Los controles actualizan `showInTopSection`, `showInFeaturedSection` y `showInImageSection` sin crear referencias visuales vacias para categorias historicas sin imagen.
- El texto meta de la fila ahora distingue `Carril superior`, `Bloque destacado` y `Oculta en home`, evitando que la visibilidad quede implicita o perdida.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` extiende la regresion de categorias para desactivar ambas ubicaciones y verificar el payload guardado.

Operacion y verificacion:
- Se redeplego solo Dashboard con `cd /home/admincenter/contenedores/Dashboard && npm run docker:up`; no se desplego production ni se tocaron DB, backend, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run lint`, `npm run type:check`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "category catalog"` (`2/2`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "supplier catalog|category catalog"` (`3/3`) y `./scripts/check-container-connectivity.sh development`.
- `check-container-connectivity.sh development` confirmo Facturador en `SRI_ENVIRONMENT=pruebas` contra `celcer.sri.gob.ec`; no se uso ambiente SRI de produccion.

Decision:
- La configuracion de imagenes de categorias no solo debe validar archivos completos; tambien debe exponer la decision operativa de donde aparece cada categoria en la home, como en el panel anterior.

### 2026-06-17 - Dashboard QA: KPIs principales visibles en resumen movil

Objetivo: corregir que estadisticas importantes del resumen Paramascotas quedaran ocultas por scroll vertical en movil, manteniendo una vista compacta y util.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-backend/paramascotas-backend.component.css` deja de forzar `.paramascotas-kpi-grid` a una sola columna bajo `480px`; los 6 KPIs principales quedan en dos columnas compactas con menor alto/padding.
- `Dashboard/tests/e2e/paramascotas-backend-layout.spec.ts` agrega una regresion movil que exige 6 KPIs totales, 6 visibles dentro del primer viewport, 2 columnas y cero overflow horizontal.

Operacion y verificacion:
- Medicion previa en `390x844`: 6 KPIs totales, solo 5 visibles, grid de 1 columna.
- Se redeplego solo Dashboard con `cd /home/admincenter/contenedores/Dashboard && npm run docker:up`; no se desplego production ni se tocaron DB, backend, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run lint`, `npm run type:check`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-backend-layout.spec.ts tests/e2e/layout-density.spec.ts --grep "paramascotas backend|mobile report summary"` (`3/3`) y `./scripts/check-container-connectivity.sh development`.
- `check-container-connectivity.sh development` confirmo Facturador en `SRI_ENVIRONMENT=pruebas` contra `celcer.sri.gob.ec`; no se uso ambiente SRI de produccion.

Decision:
- En pantallas de resumen, los KPIs primarios deben entrar completos en el primer viewport movil; los bloques secundarios pueden bajar a una columna, pero la lectura ejecutiva no debe requerir scroll para completar el set principal.

### 2026-06-17 - Dashboard QA: Productos validan margen y variantes agrupadas antes de guardar

Objetivo: acercar el alta/edicion de productos del nuevo Dashboard al comportamiento del panel anterior `/my-account`, especialmente en validaciones de negocio y duplicacion de variantes agrupadas.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` agrega validacion cliente previa al `create/update` de productos: nombre, marca, tipo, categoria, precio, costo, margen precio >= costo, stock entero, descripcion, SKU obligatorio/unico, especie, talla para ropa, vencimiento para Alimento con stock y campos de variante para cuidado.
- `Nueva variante` ahora se bloquea si el producto base no tiene un valor de variante reconocible; al guardar una variante duplicada, el Dashboard exige que el nuevo valor sea distinto al original.
- La normalizacion existente sigue generando `variantLabel`, `variantBaseName` y `variantGroupKey`, pero ahora los casos ambiguos se detienen antes de llegar al backend.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` agrega regresiones para bloquear precio menor al costo sin POST y para duplicar una variante agrupada, rechazando el mismo peso original y verificando payload correcto al cambiar a `4 kg`.

Operacion y verificacion:
- Se redeplego solo Dashboard con `cd /home/admincenter/contenedores/Dashboard && npm run docker:up`; no se desplego production ni se tocaron DB, backend, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run lint`, `npm run type:check`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "product form|duplicate variant"` (`2/2`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "supplier catalog|category catalog|product form|duplicate variant"` (`5/5`) y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts` (`61/61`).
- `./scripts/check-container-connectivity.sh development` paso por APISIX y confirmo Facturador en `SRI_ENVIRONMENT=pruebas` contra `celcer.sri.gob.ec`; no se uso ambiente SRI de produccion.

Decision:
- El Dashboard nuevo no debe depender de errores tardios del backend para reglas basicas que el panel anterior ya comunicaba antes de guardar. Las variantes agrupadas deben conservar una familia publica estable y exigir un valor diferenciador real.

### 2026-06-17 - Dashboard QA: Categorias publicas exigen imagenes completas

Objetivo: alinear los catalogos operativos del nuevo Dashboard con el panel anterior `/my-account`, donde una categoria publica no puede agregarse ni completarse visualmente sin todas las imagenes requeridas para la home.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` ahora valida que `Categorias publicas` tenga las 5 imagenes (`Superior 4:5`, `Movil grande`, `Movil pequena`, `Desktop grande`, `Desktop horizontal`) antes de agregar una categoria.
- `saveReferenceData()` bloquea el guardado si existe una referencia visual de categoria parcialmente cargada, por ejemplo `1/5`, para no persistir datos que romperian la portada publica.
- Los KPIs y metricas de catalogos ya no consideran una categoria como `media ready` con una sola imagen; solo cuenta como lista cuando tiene `5/5`.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` agrega regresiones para categoria incompleta al agregar, categoria completa en payload y bloqueo de referencias parciales existentes.

Operacion y verificacion:
- Se redeplego solo Dashboard con `cd /home/admincenter/contenedores/Dashboard && npm run docker:up`; no se desplego production ni se tocaron DB, backend, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run lint`, `npm run type:check`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "category catalog"` (`2/2`) y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "supplier catalog|category catalog"` (`3/3`).
- `./scripts/check-container-connectivity.sh development` paso por APISIX y confirmo Facturador en `SRI_ENVIRONMENT=pruebas` contra `celcer.sri.gob.ec`; no se uso ambiente SRI de produccion.

Decision:
- En el Dashboard nuevo, una categoria publica con referencia visual debe ser atomica: 5 imagenes completas o bloqueo antes de agregar/guardar. Las categorias historicas sin imagen siguen visibles como atencion operativa, pero las referencias visuales parciales no se guardan.

### 2026-06-17 - Dashboard QA: Tenant-admin queda reservado a platform-admin real

Objetivo: confirmar que la ruta SaaS `/dashboard/tenant-admin` no se mezcle con el panel operativo Paramascotas y que un admin del tenant autenticado por dominio publico no pueda abrir la consola de tenants por URL directa.

Cambios:
- `Dashboard/tests/e2e/paramascotas-real-auth.spec.ts` amplia el flujo real de login + MFA del admin Paramascotas: tras verificar contexto tenant sin `platform-admin` y panel POS operativo, navega a `/dashboard/tenant-admin?tenant=paramascotasec` y exige `permission-denied`.
- La prueba confirma que la pantalla de tenants (`Clientes y paquetes contratados`) no queda visible para admin de tenant, y que el permiso faltante reportado es `platform-admin`.

Operacion y verificacion:
- Pasaron `npm run type:check` y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-auth.spec.ts` (`4/4`) sobre `https://paramascotasec.com/dashboard` resolviendo a `192.168.100.229`.

Decision:
- `PLATFORM_ADMIN_PERMISSION` en `Dashboard/src/app/features/tenant-admin/tenant-admin.routes.ts` es intencional: `tenant-admin` administra clientes/paquetes SaaS de la plataforma, mientras Paramascotas usa `paramascotas-panel` con permisos tenant (`ecommerce.*`, `products.*`, etc.).

### 2026-06-17 - Dashboard QA: POS bloquea vencidos y busca aliases agrupados

Objetivo: acercar `Venta en local` al comportamiento del panel anterior para productos agrupados, evitando vender articulos vencidos y haciendo que el selector POS encuentre variantes por identidad interna, marca o proveedor, no solo por nombre/SKU visible.

Cambios:
- `Dashboard/src/app/features/dashboard/models/paramascotas-admin.model.ts` agrega metadatos opcionales de caducidad y busqueda a `ParamascotasLocalSaleLineItem`.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` deriva lineas POS con `inventory.expiration`, `attributes.expirationDate`, estado `expired`, aliases `internalId/id/legacyId/legacy_id/product_id`, marca, tipo, proveedor, especie y terminos SEO.
- El catalogo POS ahora filtra por ese texto ampliado, ordena vencidos al final y mantiene prioridad por stock/nombre como el panel anterior.
- `addLocalSaleProduct()` bloquea productos vencidos y sin stock antes de refrescar la cotizacion; la UI muestra `Vencido` y deshabilita `Agregar`.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.html` actualiza el placeholder de busqueda POS para incluir marca, proveedor e ID.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` agrega regresion donde una variante agrupada se busca por ID interno y se envia a `orders/quote` con `product_id` interno, mientras otra variante vencida se encuentra por proveedor pero queda deshabilitada.

Operacion y verificacion:
- Se redeplego solo Dashboard con `cd /home/admincenter/contenedores/Dashboard && npm run docker:up`; no se desplego production ni se tocaron DB, backend, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "local sales"` (`5/5`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts` (`57/57`) y `./scripts/check-container-connectivity.sh development`.
- `check-container-connectivity.sh development` confirmo el stack por APISIX y Facturador en `SRI_ENVIRONMENT=pruebas`; no se uso ambiente SRI de produccion.

Decision:
- El POS del Dashboard debe tratar caducidad como regla de bloqueo cliente antes de llamar a cotizacion/orden, igual que el panel anterior, aunque el backend siga siendo la autoridad de precios, IVA, descuentos y totales.

### 2026-06-17 - Dashboard QA: Ranking de ventas cruza inventario por alias interno

Objetivo: evitar que `Ranking de productos` pierda stock, proveedor, cobertura y accion recomendada cuando una venta de producto agrupado llega con un ID publico/legado distinto del ID interno usado por inventario.

Cambios:
- `paramascotasec-backend/src/Repositories/OrderRepository.php` ahora incluye `legacy_id` y `sku` en productos de `GET /api/admin/report` y en filas de ranking de `GET /api/admin/dashboard/stats`, igualando el contrato que necesita el panel para productos agrupados/migrados.
- `Dashboard/src/app/features/dashboard/models/paramascotas-admin.model.ts` conserva `legacy_id` opcional en filas crudas de ranking, productos del reporte y filas normalizadas de ventas.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` cruza ranking de ventas e inteligencia de inventario usando aliases `product_id`/`legacy_id`, no solo `product_id` literal.
- Los lideres comerciales de utilidad y margen ahora excluyen productos vendidos sin costo auditado (`cost <= 0`), evitando mostrar margen 100% por dato incompleto; esos casos quedan como riesgo operativo en `Productos x Compra`.
- Las acciones recomendadas del ranking tambien evitan duplicar productos sin movimiento cuando cualquier alias de inventario ya aparece vendido en el periodo.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` agrega una regresion donde el ranking mensual trae un ID publico y alias interno, mientras inventario trae el ID interno; la UI debe mostrar `Comprar ahora`, proveedor, stock y compra sugerida desde inventario. Tambien cubre que un producto sin costo no gane `Mayor margen`.
- `npm run capabilities:generate` regenera `paramascotasec/docs/system-capabilities.generated.json` y `paramascotasec/app/src/generated/systemCapabilities.ts`, que estaban desactualizados y bloqueaban el preflight de `scripts/e2e-development.sh`.

Operacion y verificacion:
- Se redeplego backend con `./scripts/deploy-development.sh backend` y luego Dashboard con `cd /home/admincenter/contenedores/Dashboard && npm run docker:up`; no se desplego production ni se tocaron DB, Facturador, certificados, SRI o datos reales.
- Validado por API local del Dashboard: `admin/dashboard/stats?period=2026-06&include_report=0` devuelve filas de ranking con `legacy_id` y `sku`, y `admin/report?period=2026-06` devuelve productos del reporte con `legacy_id` y `sku`.
- Pasaron `php -l src/Repositories/OrderRepository.php`, `npm run type:check`, `npm run lint`, multiples `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "sales report identifies|missing-cost|sales ranking joins grouped variant"` (`3/3`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts` (`56/56`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-auth.spec.ts` (`4/4`), `node node_modules/playwright/cli.js test tests/e2e/layout-density.spec.ts` (`33/33`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-list-views.spec.ts` (`8/8`) y `./scripts/check-container-connectivity.sh development` antes y despues del redeploy backend.
- Tras regenerar capacidades, paso `npm run capabilities:check` y `./scripts/e2e-development.sh` completo: capability registry, frontend lint/typecheck, backend syntax/health, env/secrets, conectividad APISIX, SEO/Merchant, Facturador PHPUnit (`18/18`) y capability E2E probes. El preflight mantiene 6 advertencias operativas ya existentes sobre sucursales/certificados/API keys de pruebas no principales, sin fallos.
- `check-container-connectivity.sh development` confirmo APISIX y el stack development, con Facturador en `SRI_ENVIRONMENT=pruebas` y endpoints SRI de pruebas `celcer.sri.gob.ec`.

Decision:
- El Dashboard debe resolver cruces operativos por aliases de identidad cuando consume datos agregados; depender solo de un `product_id` textual no es suficiente para paridad con productos agrupados del panel anterior.

### 2026-06-17 - Dashboard QA: Compras usa identidad interna para productos agrupados

Objetivo: corregir la paridad de `Productos x Compra` con el panel anterior cuando un producto agrupado/variante expone un `id` publico distinto de la identidad administrable usada por ventas, compras, lotes FIFO y detalle de producto.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` agrega helpers de identidad de producto compatibles con `internalId`, `id`, `legacyId`, `legacy_id` y `product_id`.
- `Productos x Compra` cruza reporte financiero, pedidos, compras, detalle de lotes y busqueda usando aliases de identidad; asi ventas, utilidad, compras y FIFO ya no quedan en cero cuando el backend reporta ventas por el ID interno de una variante agrupada.
- Inventario y trazabilidad reutilizan el mismo mapa por identidad para enlazar filas de inteligencia, incidencias y acciones de producto sin depender solo de `product.id`.
- Las lineas de POS/cotizacion local ahora conservan `productId/internalId` con la identidad administrable resuelta, evitando enviar al backend un posible ID publico de agrupacion.
- `Venta historica` usa la misma identidad administrable en el selector, calculos de IVA/costo y payload a `POST /api/admin/historical-sales`, evitando registrar ventas historicas con el ID publico de una variante agrupada.
- Catalogo de productos usa la identidad administrable al editar, registrar compra/restock, publicar/ocultar, retirar y resincronizar seleccion; las listas se actualizan comparando aliases de identidad y no solo `product.id`.
- Alertas, filas de impuestos y filas de precios tambien usan la identidad administrable para IDs visuales internos, evitando duplicados o cruces ambiguos en variantes agrupadas.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` agrega regresiones interceptadas donde `id` publico e `internalId` difieren; una exige que el Dashboard cargue detalle de compras con el ID interno y otra valida que `Venta historica` envie `product_id` interno con costo e IVA correctos.
- `Dashboard/tests/e2e/paramascotas-list-views.spec.ts` agrega regresion para editar y publicar una variante agrupada, verificando que ambos `PUT /dashboard/api/products/{id}` usen `internalId` y nunca el ID publico.

Operacion y verificacion:
- Se redeplego solo Dashboard con `cd /home/admincenter/contenedores/Dashboard && npm run docker:up`; no se desplego production ni se tocaron DB, Facturador, SRI o datos reales.
- Pasaron `npm run type:check`, `npm run lint`, multiples `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "internal product identity"` (`1/1`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "historical sales"` (`1/1`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "products purchases|inventory purchase invoices|local sales"` (`7/7`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-list-views.spec.ts --grep "product edit and publication"` (`1/1`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-list-views.spec.ts` (`8/8`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts` (`54/54`) y `./scripts/check-container-connectivity.sh development`.
- `check-container-connectivity.sh development` confirmo APISIX, frontend, backend, DB, Facturador en `SRI_ENVIRONMENT=pruebas`, endpoints SRI `celcer.sri.gob.ec`, SMTP alcanzable, catalogo publico con 123 productos, rutas legacy bloqueadas y facturador publico anonimo rechazado.

Decision:
- La identidad administrable queda resuelta en frontend para compatibilidad con el comportamiento del panel anterior; no se cambia el contrato backend en este tramo.

Pendientes:
- Continuar auditoria integral en ventas/reportes/calculos restantes y contrastar otros flujos donde aun pueda haber cruces directos por `product.id`.

### 2026-06-17 - Dashboard QA: Contacto publico con validacion y proteccion antispam

Objetivo: auditar formularios y notificaciones publicas fuera de auth/facturas, empezando por contacto, manteniendo la experiencia del sitio y evitando envios reales innecesarios durante pruebas.

Cambios:
- `paramascotasec-backend/src/Controllers/ContactController.php` agrega honeypot server-side (`website`, `company`, `url`) que responde exito generico con `spamFiltered=true` sin guardar mensaje ni enviar correos cuando se llena un campo trampa.
- `paramascotasec-backend/src/Repositories/ContactMessageRepository.php` agrega conteos recientes por email e IP para aplicar limites horarios configurables antes de guardar/enviar mensajes reales.
- `paramascotasec/app/src/lib/api/contact.ts` y `paramascotasec/app/src/tenants/paramascotasec.com/pages/contact/page.tsx` incorporan el campo oculto `website` y mantienen las validaciones visibles de nombre, correo, asunto y mensaje.
- `Dashboard/tests/e2e/paramascotas-public-contact.spec.ts` cubre el formulario publico por `https://paramascotasec.com/pages/contact`, validando errores requeridos y que una solicitud limpia envie el payload esperado.

Operacion y verificacion:
- Se redeplego backend con `./scripts/deploy-development.sh backend` y frontend con `./scripts/deploy-development.sh frontend`; no se desplego production ni se tocaron datos de ventas/facturacion.
- Pasaron `php -l` sobre los archivos PHP tocados, `cd paramascotasec/app && npm run lint`, `cd paramascotasec/app && npm run typecheck`, `cd Dashboard && npm run type:check`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-public-contact.spec.ts` (`1/1`) y `./scripts/check-container-connectivity.sh development`.
- Validacion directa por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: un POST con `website` lleno devuelve `ok=true`, `id=null`, `delivered=false`, `confirmationDelivered=false` y `spamFiltered=true`, sin disparar correo real.
- `check-container-connectivity.sh development` confirmo APISIX, frontend, backend, DB, Facturador en `SRI_ENVIRONMENT=pruebas`, endpoints SRI `celcer.sri.gob.ec`, SMTP alcanzable, catalogo publico con 123 productos, rutas legacy bloqueadas y facturador publico anonimo rechazado.

Decision:
- El honeypot devuelve exito generico para no revelar la regla a bots; las solicitudes legitimas siguen usando el flujo existente de almacenamiento, notificacion interna y confirmacion al cliente.

Pendientes:
- Continuar auditoria integral con compras/ventas/reportes y pantallas operativas restantes, sin considerar terminado el objetivo global hasta cubrir productos agrupados y equivalencia completa contra `/my-account`.

### 2026-06-17 - Dashboard QA: Recuperacion de clave vuelve al Dashboard y valida 12 caracteres

Objetivo: cerrar brechas de autenticacion/notificaciones en el Dashboard nuevo, manteniendo paridad con el panel anterior y el backend real sin enviar correos reales durante las pruebas.

Cambios:
- `paramascotasec-backend/src/Controllers/AuthController.php` acepta `resetPath`/`reset_path` en `POST /api/auth/password-reset/request`, lo normaliza contra una allowlist estricta (`/reset-password` o `/dashboard/reset-password`) y construye el enlace de correo con esa ruta. El flujo publico antiguo sigue usando `/reset-password` por defecto.
- `Dashboard/src/app/core/auth/auth.models.ts` agrega `resetPath` opcional a `PasswordResetRequestDto`.
- `Dashboard/src/app/features/public/pages/forgot-password/forgot-password.component.ts` solicita recuperacion con `resetPath: /dashboard/reset-password`, para que admins que empiezan en el Dashboard vuelvan al Dashboard.
- `Dashboard/src/app/features/public/pages/reset-password/reset-password.component.{ts,html}` alinea la longitud minima con backend/panel anterior: 12 caracteres. Tambien muestra errores inline desde el componente padre para que una clave debil no falle en silencio.
- `Dashboard/src/app/shared/ui/form-field-error/form-field-error.component.ts` deja de usar `OnPush`, evitando que errores basados en `AbstractControl` queden sin refrescar cuando un formulario marca controles como tocados.
- `Dashboard/tests/e2e/paramascotas-real-auth.spec.ts` agrega prueba no destructiva que intercepta recuperacion de clave, verifica `resetPath=/dashboard/reset-password`, valida el bloqueo frontend de claves menores a 12 caracteres y confirma que no se llama a confirmacion hasta tener una clave valida.

Operacion y verificacion:
- Se redeplego backend con `./scripts/deploy-development.sh backend` y Dashboard con `cd /home/admincenter/contenedores/Dashboard && npm run docker:up`; no se desplego production.
- Pasaron `php -l paramascotasec-backend/src/Controllers/AuthController.php`, `npm run type:check`, `npm run lint`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-auth.spec.ts --grep "password recovery"` (`1/1`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-auth.spec.ts` (`4/4`) y `./scripts/check-container-connectivity.sh development`.
- La suite auth real volvio a validar login admin con MFA por OTP real, tenant scope sin `platform-admin`, bloqueo de usuario customer en rutas administrativas, resincronizacion POS y recuperacion de clave interceptada.
- `check-container-connectivity.sh development` confirmo APISIX, backend, Dashboard, Facturador QA/pruebas, endpoints SRI `celcer.sri.gob.ec`, SMTP alcanzable, catalogo publico con 123 productos, rutas legacy bloqueadas y facturador publico anonimo rechazado.

Decision:
- El backend no acepta rutas arbitrarias para recuperacion; solo permite la ruta publica antigua y la ruta del Dashboard para evitar open redirects en correos.

Pendientes:
- Continuar auditoria de contacto publico, formularios publicos y otras notificaciones fuera de auth/MFA y RIDE.

### 2026-06-17 - Dashboard QA: Estado de correo RIDE visible sin envios manuales

Objetivo: completar la auditoria de correos/notificaciones en facturas RIDE comparando contra el panel anterior, sin disparar correos reales ni tocar SRI produccion.

Cambios:
- `Facturador/src/Billing/Infrastructure/Persistence/InvoiceRepository.php` incluye `mail_sent_at` en el listado historico de facturas RIDE; es el campo que marca los envios automaticos exitosos de documentos autorizados.
- `Facturador/public/index.php` devuelve `mail_sent_at` tanto en `GET /api/{test|production}/v1/invoices/rides` como en la consulta por referencia, manteniendo el endpoint de prueba de correo sin uso desde el Dashboard.
- `Dashboard/src/app/features/dashboard/models/paramascotas-admin.model.ts` agrega `mail_sent_at` al contrato `BillingRidePdf`.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.{ts,html}` clasifica cada RIDE como `Correo enviado`, `Correo pendiente`, `Sin correo` o `Correo espera SRI`; el listado, badges, buscador, selector de estado y detalle de la factura muestran el estado sin agregar acciones que envien correo.
- El resumen de facturas conserva 4 tarjetas compactas; la tarjeta `Total` ahora muestra correos enviados y pendientes para evitar una fila visual extra.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` agrega prueba con facturas interceptadas que valida estados de correo y filtro `Correo pendiente`, y confirma que no se llama a `/mail-test`.

Operacion y verificacion:
- Se redeplego Facturador con `./scripts/deploy-development.sh facturador` y Dashboard con `cd /home/admincenter/contenedores/Dashboard && npm run docker:up`; no se desplego production.
- Pasaron `php -l` en los archivos PHP tocados, `npm run type:check`, `npm run lint`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "billing rides"` (`2/2`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts` (`52/52`) y `node node_modules/playwright/cli.js test tests/e2e/layout-density.spec.ts --grep "paramascotas|billing|dashboard"` (`4/4`).
- Verificacion interna desde `paramascotasec-backend-app` confirmo que `GET ${FACTURADOR_API_URL}${FACTURADOR_API_INVOICES_PATH}/rides?limit=1` ya contiene `mail_sent_at`, usando la API key solo dentro del contenedor y sin imprimir secretos.
- `./scripts/check-container-connectivity.sh development` paso despues de los deploys y confirmo Facturador/worker en `SRI_ENVIRONMENT=pruebas`, endpoints SRI `celcer.sri.gob.ec`, SMTP alcanzable, catalogo publico con 123 productos, rutas legacy bloqueadas y facturador publico anonimo rechazado.

Decision:
- El Dashboard no agrega boton de envio manual de correo RIDE porque el panel anterior no lo exponia y esa accion puede enviar mensajes reales; por ahora se muestra estado operativo y se deja el endpoint `mail-test` solo como herramienta tecnica QA.

Pendientes:
- Continuar auditoria de notificaciones de auth/MFA y contacto publico fuera del modulo RIDE.

### 2026-06-17 - Dashboard QA: Resumen Paramascotas y lenguaje operativo sin backend visible

Objetivo: completar la limpieza de lenguaje tecnico visible en el Dashboard, especialmente terminos como `backend`, `proxy`, `SMTP`, `API`, `Endpoints` y referencias directas a `/my-account`, manteniendo la trazabilidad interna y la ruta existente.

Cambios:
- `Dashboard/src/app/core/navigation/navigation.registry.ts` renombra el item visible `Paramascotas backend` a `Resumen Paramascotas`, sin cambiar la ruta interna `/paramascotas-backend`.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-backend/paramascotas-backend.component.{ts,html}` renombra el titulo visible a `Resumen Paramascotas` y reemplaza mensajes tecnicos de carga/error por textos operativos: salud/catalogo/inventario, servicio publico, base, metricas operativas y vista consolidada.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.html` elimina ayudas visibles con `backend`, `proxy`, `SMTP`, `API`, `firma de /my-account` y `validado por backend`; quedan mensajes de operador como `calculo validado`, `envio automatico`, `limites vigentes` y `validaciones del sistema`.
- `Dashboard/src/app/features/dashboard/data/paramascotas-panel.registry.ts` limpia descripciones visibles del panel para no nombrar `/my-account` ni backend, conservando las firmas/rutas internas que usa el comparador.
- `Dashboard/src/app/features/dashboard/data/paramascotas-panel-api.service.ts` cambia el fallback de error de lectura de `endpoint` a `fuente`.
- `Dashboard/src/app/core/navigation/navigation.service.spec.ts` y `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` actualizan las expectativas al label `Resumen Paramascotas`.

Operacion y verificacion:
- Se redeplego solo Dashboard con `cd /home/admincenter/contenedores/Dashboard && npm run docker:up`.
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "route /paramascotas-backend|support mode"` (`2/2`), `node node_modules/playwright/cli.js test tests/e2e/layout-density.spec.ts tests/e2e/paramascotas-backend-layout.spec.ts` (`34/34`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts` (`51/51`) y `./scripts/check-container-connectivity.sh development`.
- Medicion Playwright directa despues del redeploy confirma que el menu y la ruta muestran `Resumen Paramascotas` y que no aparecen `Paramascotas backend`, `proxy interno`, `Consultando metricas reales del backend`, `Backend publico no disponible` ni `El backend respondio`.
- `check-container-connectivity.sh development` confirmo APISIX, 123 productos publicos, rutas legacy bloqueadas, rechazo anonimo del facturador publico y Facturador/worker en `SRI_ENVIRONMENT=pruebas` contra `celcer.sri.gob.ec`; no se uso SRI produccion.

Nota:
- `npx vitest run src/app/core/navigation/navigation.service.spec.ts` no arranco por la dependencia opcional local faltante de Rollup (`@rollup/rollup-linux-x64-gnu`), problema ya observado en este entorno; la validacion efectiva se cubrio con `type:check`, `lint`, build Docker y Playwright.

Pendientes:
- Continuar auditoria integral contra el panel anterior en notificaciones de auth/MFA, contacto publico y correo de facturas RIDE.

### 2026-06-17 - Dashboard QA: Contacto de usuarios usa canales resueltos

Objetivo: ampliar la validacion de correos/notificaciones fuera de cotizaciones, cubriendo las acciones de contacto del catalogo de usuarios del Dashboard nuevo.

Cambios:
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` agrega prueba no destructiva para `paramascotas-panel/catalog/users` que intercepta `GET /dashboard/api/users`, captura `window.open` y valida que las acciones `Email` y `WhatsApp` usen `resolvedEmail` y `resolvedPhone` cuando existen.
- La misma prueba confirma que no se muestren acciones de contacto para usuarios con correo invalido o telefono no normalizable, y que no se use el email de cuenta original ni el telefono secundario del `profile` cuando hay canales resueltos.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "user contact actions"` (`1/1`) y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts` (`51/51`).
- La prueba usa endpoints interceptados; no modifica usuarios reales, no envia correos reales, no abre WhatsApp real y no toca SMTP/SRI.

Pendientes:
- Seguir auditando notificaciones de auth/MFA, contacto publico y correo de facturas RIDE, manteniendo SRI solo en QA/pruebas.

### 2026-06-17 - Dashboard QA: KPIs moviles visibles y soporte sin endpoints

Objetivo: atender el problema de estadisticas ocultas por scroll vertical y seguir limpiando la experiencia operativa del Dashboard nuevo, especialmente en `Reporte general`, sin perder la trazabilidad contra `/my-account`.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.css` deja que los KPIs principales de reportes usen dos columnas en mobile, en vez de caer a una sola columna; en viewport `390x844` los 6 KPIs de `Reporte general` quedan visibles antes del primer corte vertical y sin overflow horizontal.
- `paramascotas-panel.component.html` reemplaza textos visibles de soporte como `Endpoints`, `Lecturas API`, `Firma /my-account`, `Proxy Dashboard` y mensajes de `endpoint` por `Fuentes`, `Lecturas verificadas`, `Referencia`, `Uso` y mensajes operativos.
- `paramascotas-panel.component.ts` cambia los badges de error de lecturas para mostrar `Sin permisos` o `Error de lectura` en vez de `HTTP ###`.
- `Dashboard/tests/e2e/layout-density.spec.ts` agrega regresion mobile que exige 6 KPIs visibles, 2 columnas y `overflow` horizontal en cero para `paramascotas-panel/reporting/general`.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` actualiza la expectativa del soporte visible de `Endpoints` a `Fuentes`.

Operacion y verificacion:
- Se redeplego solo Dashboard con `cd /home/admincenter/contenedores/Dashboard && npm run docker:up`.
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/layout-density.spec.ts --grep "mobile report summary"` (`1/1`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "support mode"` (`1/1`), `node node_modules/playwright/cli.js test tests/e2e/layout-density.spec.ts` (`33/33`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts` (`50/50`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-list-views.spec.ts` (`7/7`) y `./scripts/check-container-connectivity.sh development`.
- Medicion Playwright directa despues del redeploy: desktop `1365x900` muestra 6/6 KPIs con 6 columnas; mobile `390x844` muestra 6/6 KPIs con 2 columnas, `overflowX=0`, `supportText` con `Fuentes 0 / 4` y sin `Endpoints` visible.
- `check-container-connectivity.sh development` confirmo APISIX, 123 productos publicos, rutas legacy bloqueadas, rechazo anonimo del facturador publico y Facturador/worker en `SRI_ENVIRONMENT=pruebas` contra `celcer.sri.gob.ec`; no se uso SRI produccion.

Pendientes:
- Continuar auditoria integral contra `/my-account` en correos/notificaciones fuera de cotizaciones, reportes no cubiertos por criterios finos y limpieza visual de pantallas operativas con listas largas.

### 2026-06-17 - Dashboard QA: Panel sin textos tecnicos visibles y verificacion completa

Objetivo: mejorar la claridad operativa del Dashboard nuevo, reduciendo textos de contrato interno visibles para usuarios finales y manteniendo intactas las rutas reales, productos agrupados y flujos ya corregidos durante la auditoria contra `/my-account`.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.html` reemplaza referencias visibles a metodos HTTP, rutas `/api`, `/dashboard/api`, `server-side` y mensajes tipo `Consultando /api` por descripciones operativas en usuarios, pagina de producto, envios, POS, cotizaciones, reportes, inventario, rankings, estado de tienda, seguridad, impuestos, precios, descuentos, productos, RIDE/facturas y pedidos.
- La limpieza mantiene los contratos reales en servicios/tests; solo cambia el texto mostrado al operador para que cada bloque explique su utilidad de negocio en lugar de exponer endpoints internos.
- Durante el tramo se recupero el template desde el sourcemap del build de Dashboard vigente despues de una sobrescritura accidental local por redireccion de shell, y se verifico el archivo recuperado antes de continuar con los cambios.

Operacion y verificacion:
- Se redeplego solo Dashboard con `cd /home/admincenter/contenedores/Dashboard && npm run docker:up`.
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-list-views.spec.ts --grep "autofills supplier|grouped variant"` (`2/2`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "route /paramascotas-panel/(catalog/products|operations/local-sales|operations/admin-orders|operations/billing-rides|finance/taxes|finance/pricing-rules|reporting/general)"` (`7/7`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-list-views.spec.ts` (`7/7`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts` (`50/50`) y `./scripts/check-container-connectivity.sh development`.
- `rg` confirma que `paramascotas-panel.component.html` ya no muestra `GET/POST/PUT/PATCH/DELETE`, `/api`, `/dashboard/api`, `server-side` ni `Consultando /api`.
- `check-container-connectivity.sh development` confirmo APISIX, 123 productos publicos, rutas legacy bloqueadas, rechazo anonimo del facturador publico y Facturador/worker en `SRI_ENVIRONMENT=pruebas` contra `celcer.sri.gob.ec`; no se uso SRI produccion.

Pendientes:
- Continuar auditoria integral contra `/my-account` en correos/notificaciones fuera de cotizaciones, reportes no cubiertos por criterios finos y revision visual de densidad en pantallas restantes.

### 2026-06-17 - Dashboard QA: Factura de compra autocompleta proveedor como my-account

Objetivo: cerrar otra brecha de compras/proveedores entre el Dashboard nuevo y `/my-account`. En el panel anterior, al seleccionar un proveedor registrado en la factura de compra del producto, se autocompletan nombre normalizado, RUC/documento, IVA de compra y `attributes.supplier`; el Dashboard nuevo solo guardaba esos datos al final y no mostraba feedback inmediato al operador.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` actualiza `updatePurchaseInvoiceField()` para resolver proveedores del catalogo maestro al cambiar `supplierName` o `supplierDocument`, rellenar `supplierDocument`, `purchaseTaxRate` y sincronizar `attributes.supplier` en el formulario antes de guardar.
- La misma vista agrega `selectedProductPurchaseSupplier()` para exponer el proveedor resuelto al template.
- `paramascotas-panel.component.html` muestra un resumen del proveedor seleccionado dentro de `Factura de compra para ingresar stock`: RUC/documento, contacto, canal e IVA compra; si el proveedor no existe en catalogo, advierte que se complete RUC/documento e IVA.
- `Dashboard/tests/e2e/paramascotas-list-views.spec.ts` agrega prueba no destructiva que intercepta `product-reference-data`, selecciona un proveedor con IVA `12.5%` y confirma que el payload de creacion sale con documento, IVA y `attributes.supplier` sin escribirlos manualmente.

Operacion y verificacion:
- Se redeplego solo Dashboard con `cd /home/admincenter/contenedores/Dashboard && npm run docker:up`.
- Pasaron `npm run docker:health`, `npm run type:check`, `npm run lint`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-list-views.spec.ts --grep "autofills supplier"` (`1/1`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-list-views.spec.ts` (`7/7`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts` (`50/50`) y `./scripts/check-container-connectivity.sh development`.
- La prueba nueva intercepta endpoints y no crea productos reales, stock real ni facturas reales.
- `check-container-connectivity.sh development` confirmo APISIX, 123 productos publicos, rutas legacy bloqueadas, SMTP accesible y Facturador/worker en `SRI_ENVIRONMENT=pruebas` contra `celcer.sri.gob.ec`; no se uso SRI produccion.

Pendientes:
- Continuar auditoria integral contra `/my-account` en reportes restantes, correos/notificaciones fuera de cotizaciones, compras/proveedores que aun no tengan paridad fina y limpieza progresiva de textos tecnicos visibles.

### 2026-06-17 - Dashboard QA: Proveedores validados como catalogo de compras

Objetivo: alinear el catalogo operativo de proveedores del Dashboard nuevo con `/my-account`. El panel anterior no permitia agregar proveedores sin nombre suficiente, RUC/documento completo, email valido o con nombre/documento duplicado; el Dashboard nuevo podia agregarlos al borrador y dejar que backend sanee o descarte informacion sin explicacion clara al operador.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` agrega validacion local para referencias de proveedores: nombre minimo, documento obligatorio con clave comparable, email valido, IVA de compra entre `0` y `100`, duplicado por nombre y duplicado por documento.
- Al cambiar de catalogo se limpia el error vigente para no arrastrar mensajes entre listas maestras.
- `paramascotas-panel.component.html` reemplaza el texto tecnico visible `GET/PUT /api/admin/settings/product-reference-data` por una descripcion operativa de listas maestras para productos, compras, proveedores e imagenes publicas.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` agrega prueba no destructiva que intercepta `product-reference-data`, valida errores locales y confirma que un proveedor valido se guarda con email normalizado y sin duplicados.

Operacion y verificacion:
- Se redeplego solo Dashboard con `cd /home/admincenter/contenedores/Dashboard && npm run docker:up`.
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "supplier catalog"` (`1/1`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts` (`50/50`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-list-views.spec.ts` (`6/6`) y `./scripts/check-container-connectivity.sh development`.
- La prueba de proveedores usa endpoints interceptados; no modifica proveedores reales, facturas reales, stock ni comprobantes.
- `check-container-connectivity.sh development` confirmo contrato publico por APISIX, 123 productos publicos, rutas legacy bloqueadas, SMTP accesible y Facturador/worker en `SRI_ENVIRONMENT=pruebas` contra `celcer.sri.gob.ec`; no se uso SRI produccion.

Pendientes:
- Continuar auditoria integral contra `/my-account` en compras/proveedores restantes, reportes restantes, correos/notificaciones fuera de cotizaciones y limpieza progresiva de textos tecnicos visibles.

### 2026-06-17 - Dashboard QA: Cotizaciones preparan WhatsApp como my-account

Objetivo: completar la paridad de correos/notificaciones de cotizaciones entre el Dashboard nuevo y `/my-account`, donde el panel anterior activaba correo por defecto si el email era valido y podia abrir WhatsApp con el mensaje listo al crear la cotizacion, sin enviar WhatsApp por backend.

Cambios:
- `Dashboard/src/app/features/dashboard/models/paramascotas-admin.model.ts` agrega `sendWhatsApp` al formulario local de venta/cotizacion.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` vuelve a dejar `sendEmail` activo por defecto como en `/my-account`, conserva `send_email=false` cuando no hay email valido, agrega preparacion automatica de WhatsApp al crear cotizacion y reutiliza la normalizacion comun de telefonos ecuatorianos para no generar enlaces `wa.me` invalidos.
- `paramascotas-panel.component.html` agrega el control `Preparar WhatsApp al crear` con aviso de telefono valido/no valido, sin mostrar advertencias de correo vacio como error antes de que el operador ingrese un email.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` cubre que un email invalido no solicite SMTP y que WhatsApp se prepare con numero `593...` normalizado sin mandar campos de entrega WhatsApp al backend.

Operacion y verificacion:
- Se redeplego solo Dashboard con `cd /home/admincenter/contenedores/Dashboard && npm run docker:up`.
- Pasaron `npm run docker:health`, `npm run type:check`, `npm run lint`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "quotations.*email|quotations prepare WhatsApp|quotation conversion"` (`4/4`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts` (`49/49`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-list-views.spec.ts` (`6/6`) y `./scripts/check-container-connectivity.sh development`.
- `check-container-connectivity.sh development` confirmo nuevamente contrato publico por APISIX, 123 productos publicos, rutas legacy bloqueadas, SMTP accesible y Facturador/worker en `SRI_ENVIRONMENT=pruebas` contra `celcer.sri.gob.ec`; no se uso SRI produccion.

Pendientes:
- Continuar auditoria integral contra `/my-account` en compras/proveedores, reportes restantes, correos/notificaciones fuera de cotizaciones y limpieza progresiva de textos tecnicos visibles en otras pantallas.

### 2026-06-17 - Dashboard QA: Gastos concilian subtotal, IVA y total como my-account

Objetivo: corregir una diferencia financiera entre el Dashboard nuevo y `/my-account`. En gastos/recurrentes, el panel anterior reconciliaba subtotal, IVA/porcentaje y total antes de guardar; el Dashboard nuevo podia enviar total incompleto si el operador llenaba subtotal + IVA pero dejaba total vacio, o degradar entradas invalidas a cero.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` agrega resolucion robusta de montos para gastos y recurrencias: parsea moneda con coma/punto, rechaza negativos/no numericos, interpreta IVA como valor o porcentaje segun el caso, deriva subtotal/IVA/total de forma consistente y valida fechas `YYYY-MM-DD`.
- `createBusinessExpense()`, `saveBusinessExpenseRecurrence()` y `createBusinessExpenseRecurrence()` capturan errores de validacion local y los muestran en la vista sin disparar mutaciones.
- `paramascotas-panel.component.html` reemplaza textos tecnicos visibles de endpoints en reportes financieros, gastos, venta historica y productos por mensajes operativos utiles para el administrador.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` agrega prueba no destructiva para gastos: al registrar subtotal `100` + IVA `15` sin total manual, el payload enviado queda `amount=100`, `tax_amount=15`, `total=115`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "business expenses|discount form"` (`2/2`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts` (`48/48`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-list-views.spec.ts` (`6/6`) y `./scripts/check-container-connectivity.sh development`.
- La prueba de gastos intercepta `POST /dashboard/api/admin/expenses`; no crea gastos reales, no modifica cierres reales y no toca comprobantes.
- `check-container-connectivity.sh development` confirmo Facturador y worker en `SRI_ENVIRONMENT=pruebas`, endpoints `celcer.sri.gob.ec`, contrato publico por APISIX y rutas legacy bloqueadas; no se uso SRI produccion.

Pendientes:
- Continuar auditoria integral contra `/my-account`: correos/notificaciones, compras/proveedores, reportes restantes y limpieza progresiva de textos tecnicos visibles en otras pantallas.

### 2026-06-17 - Dashboard QA: Cupones validados antes de guardar

Objetivo: alinear la gestion de cupones/descuentos del Dashboard nuevo con `/my-account` y con las reglas reales del backend, evitando que valores invalidos lleguen serializados como `null` o que el operador vea rechazos tardios y poco claros.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` refuerza `discountFormToPayload()`: normaliza codigo en mayusculas sin espacios, valida tipo, valor numerico, porcentaje maximo 100, minimo, maximo descuento, limite de usos y rango `inicio <= fin` antes de llamar a `POST/PUT /api/admin/discounts`.
- `paramascotas-panel.component.html` reemplaza el texto tecnico de endpoints por una descripcion operativa de vigencia, cupos y uso acumulado, manteniendo creacion, edicion, activacion/desactivacion, filtros, metricas y auditoria.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` agrega prueba no destructiva para el formulario de cupones: porcentaje mayor a 100 no muta backend, fecha fin anterior al inicio no muta backend y un cupon valido se envia con payload normalizado (`code`, `min_subtotal`, `max_discount`, `max_uses`, vigencia y estado).

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "discount form"` (`1/1`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts` (`47/47`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-list-views.spec.ts` (`6/6`) y `./scripts/check-container-connectivity.sh development`.
- La prueba de cupones intercepta endpoints y no crea descuentos reales ni pedidos; las validaciones de SRI del chequeo development confirmaron `SRI_ENVIRONMENT=pruebas`, endpoints `celcer.sri.gob.ec` y rutas legacy bloqueadas.

Pendientes:
- Continuar auditoria integral contra `/my-account`: correos/notificaciones, gastos/cierres financieros, compras, reportes restantes y cualquier opcion visible que aun pueda depender de contratos incompletos.

### 2026-06-17 - Dashboard QA: Rutas Paramascotas requieren permiso operativo, no solo lectura

Objetivo: cerrar una brecha de permisos entre el panel nuevo y la seguridad esperada. El backend entrega `ecommerce.read` a usuarios de consulta/customer del tenant, pero las pantallas del nuevo Dashboard Paramascotas son administrativas; permitir su ruta con solo lectura exponia pantallas operativas que luego fallaban por API o podian confundir al usuario.

Cambios:
- `Dashboard/src/app/features/dashboard/dashboard.routes.ts` cambia `paramascotas-backend` y `paramascotas-panel/:group/:view` para requerir `ecommerce.update` en lugar de `ecommerce.read`.
- `Dashboard/src/app/core/navigation/navigation.registry.ts` actualiza la seccion `Integraciones reales` para que `Paramascotas backend`, reportes, monitoreo, catalogo, operacion y finanzas solo aparezcan a usuarios con permiso operativo `ecommerce.update`.
- `Dashboard/src/app/core/navigation/navigation.service.spec.ts` distingue explicitamente lector ecommerce (`ecommerce.read`, sin menu administrativo) de operador/admin (`ecommerce.update`, con menu Paramascotas).
- `Dashboard/tests/e2e/paramascotas-real-auth.spec.ts` agrega validacion publica real: un usuario `customer` autenticado por `https://paramascotasec.com/dashboard` conserva `ecommerce.read`, no recibe `ecommerce.update` ni `platform-admin`, y al intentar abrir POS termina en `permission-denied` con permiso requerido `ecommerce.update`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-auth.spec.ts` (`3/3`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts` (`46/46`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-list-views.spec.ts` (`6/6`) y `./scripts/check-container-connectivity.sh development`.
- `npm test -- --watch=false --include src/app/core/navigation/navigation.service.spec.ts` no pudo ejecutarse en el host por version de Node local `22.22.2`; Angular CLI exige `22.22.3+`, `24.15+` o `26+`. La compilacion Docker paso con Node 26.
- `check-container-connectivity.sh development` confirmo Facturador y worker en `SRI_ENVIRONMENT=pruebas`, endpoints `celcer.sri.gob.ec`, contrato publico por APISIX y rutas legacy bloqueadas; no se uso SRI produccion.

Pendientes:
- Continuar auditoria integral contra `/my-account`: edicion de cupones, notificaciones server-side, correos y restantes pantallas visibles que aun puedan depender de contratos parciales.

### 2026-06-17 - Dashboard QA: Consumidor final se bloquea antes de venta fiscal

Objetivo: anticipar en el nuevo Dashboard una regla critica que backend y Facturador ya aplican: ventas mayores a USD 50.00 no pueden facturarse como consumidor final (`9999999999999`). Antes, el operador podia llegar al submit/conversion y recibir el rechazo tarde; ahora el Dashboard muestra el motivo antes de mutar datos.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` agrega helpers de identificacion de consumidor final por tipo de documento, placeholder `9999999999999` o nombre `Consumidor final`, y compara el total server-side redondeado contra USD 50.00.
- `localSaleIssues(true)` bloquea `Registrar venta` cuando el carrito POS supera el limite con consumidor final; `quotationConversionIssues()` bloquea convertir una cotizacion equivalente antes de llamar al backend.
- `paramascotas-panel.component.html` muestra el primer pendiente de venta/cotizacion en avisos inline, desactiva acciones invalidas y advierte que una cotizacion puede guardarse pero no convertirse sin cedula o RUC valido.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` agrega pruebas no destructivas para POS y conversion de cotizaciones, verificando que no se dispare `POST /orders` ni `POST /admin/quotes/{id}/convert` cuando consumidor final supera USD 50.00.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "final consumer"` (`2/2`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts` (`46/46`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-list-views.spec.ts` (`6/6`) y `./scripts/check-container-connectivity.sh development`.
- Las pruebas usan endpoints interceptados y no registran ventas reales, no convierten cotizaciones reales ni emiten comprobantes.
- `check-container-connectivity.sh development` confirmo Facturador y worker en `SRI_ENVIRONMENT=pruebas`, endpoints `celcer.sri.gob.ec`, contrato publico por APISIX y rutas legacy bloqueadas; no se uso SRI produccion.

Pendientes:
- Continuar auditoria integral contra `/my-account`: permisos por rol, edicion de cupones, notificaciones server-side, correos y cualquier pantalla visible que aun pueda depender de contratos parciales.

### 2026-06-17 - Dashboard QA: Venta local autocompleta cliente por documento como my-account

Objetivo: cerrar una brecha operativa de `Venta en local POS` frente a `/my-account`. El panel anterior permitia buscar cliente por cedula/documento antes de facturar, cargando datos de ordenes previas o perfil; el Dashboard nuevo obligaba a reescribir todo manualmente y podia terminar con clientes duplicados, direcciones incompletas o documentos mal reutilizados.

Cambios:
- `Dashboard/src/app/features/dashboard/data/paramascotas-admin-api.service.ts` agrega `lookupPosCustomerByDocument()` sobre el contrato existente `GET /api/admin/pos/customer-by-document`.
- `Dashboard/src/app/features/dashboard/models/paramascotas-admin.model.ts` documenta el payload `ParamascotasPosCustomerLookup` con cliente, direccion, documento y origen (`order`/`user_profile`).
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` agrega estado de busqueda, autocompletado de nombre, telefono, email, direccion, ciudad y tipo/numero de documento, conserva valores existentes si el backend no trae un campo y bloquea guardar mientras la busqueda esta en curso.
- `paramascotas-panel.component.html` agrega boton `Buscar`, soporte por Enter/blur y mensajes de resultado sin contaminar el nombre accesible del input `Documento`.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` cubre el flujo no destructivo con intercept: documento -> `customer-by-document` -> campos de cliente autocompletados y mensaje `Cliente encontrado`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "customer by document"` (`1/1`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts` (`44/44`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-list-views.spec.ts` (`6/6`) y `./scripts/check-container-connectivity.sh development`.
- La prueba usa rutas interceptadas y no registra ventas reales, no convierte cotizaciones ni emite comprobantes.
- `check-container-connectivity.sh development` confirmo Facturador y worker en `SRI_ENVIRONMENT=pruebas`, endpoints `celcer.sri.gob.ec`, contrato publico por APISIX y rutas legacy bloqueadas; no se uso SRI produccion.

Pendientes:
- Continuar auditoria integral contra `/my-account`: permisos por rol, consumidor final > USD 50, edicion de cupones, notificaciones server-side y pantallas visibles que aun puedan depender de contratos parciales.

### 2026-06-17 - Dashboard QA: Conversion de cotizaciones valida pago como my-account

Objetivo: alinear la conversion de cotizaciones a venta con `/my-account`. El panel anterior bloqueaba conversion si la caja estaba cerrada, ventas pausadas, cotizacion ya convertida o datos de pago incompletos; el Dashboard nuevo solo verificaba seleccion/caja/estado y podia intentar convertir transferencia sin referencia ni detalles completos de pago.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` agrega `quotationPaymentAmounts()` y `quotationConversionIssues()` para calcular total/pagado/pendiente/cambio sobre la cotizacion seleccionada, no sobre el carrito actual.
- `convertSelectedQuotation()` ahora reutiliza esas validaciones: ventas habilitadas, caja abierta, cotizacion no convertida, efectivo suficiente, referencia de transferencia, pagos mixtos con efectivo/electronico/referencia y pendiente cubierto.
- El payload de conversion vuelve a incluir detalles operativos equivalentes a `/my-account`: `reference`, `cash_received`, `electronic_amount`, `paid_amount`, `pending_amount` y `change_due`, ademas de `channel` y `shift_id`.
- `paramascotas-panel.component.html` muestra campos de efectivo/electronico segun metodo, resumen de `Total cotizacion`, `Pagado`, `Pendiente`, `Cambio`, y bloquea `Convertir en venta` hasta resolver el primer pendiente.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` agrega una prueba no destructiva que intercepta cotizaciones, caja y conversion; valida que transferencia sin referencia no llame al backend y que, al ingresar referencia, el payload incluya los montos correctos.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "quotation conversion"` (`1/1`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts` (`43/43`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-list-views.spec.ts` (`6/6`) y `./scripts/check-container-connectivity.sh development`.
- La prueba intercepta `POST /dashboard/api/admin/quotes/{id}/convert`; no convierte cotizaciones reales ni crea pedidos reales.
- `check-container-connectivity.sh development` confirmo Facturador y worker en `SRI_ENVIRONMENT=pruebas`, endpoints `celcer.sri.gob.ec`, contrato publico por APISIX y rutas legacy bloqueadas; no se uso SRI produccion ni se emitieron comprobantes.

Pendientes:
- Continuar auditoria de permisos por rol, edicion de cupones, gastos/cierres financieros y notificaciones server-side restantes contra `/my-account`.

### 2026-06-17 - Dashboard QA: POS muestra rechazos server-side de cupones

Objetivo: cerrar una brecha de venta local frente a `/my-account`. El backend ya devuelve `discount_rejections` cuando un cupon no aplica por estado, vigencia, minimo o limite, y el panel anterior mostraba esos mensajes; el nuevo Dashboard solo mostraba descuento USD 0 y `sin cupon`, dejando al operador sin causa clara.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` agrega `localSaleDiscountRejections()` para normalizar mensajes `message/reason` devueltos por `POST /api/orders/quote`.
- `paramascotas-panel.component.html` muestra un aviso compacto bajo los totales de POS/cotizacion cuando el backend rechaza un cupon, sin alterar calculos ni permitir descuentos cliente-side.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` agrega una prueba no destructiva que intercepta catalogo POS, caja, cotizaciones y `/dashboard/api/orders/quote`, devuelve un rechazo `BADCOUPON` y verifica que el Dashboard lo muestre junto a descuento `$0,00`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "discount rejection"` (`1/1`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts` (`42/42`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-list-views.spec.ts` (`6/6`) y `./scripts/check-container-connectivity.sh development`.
- La prueba no registra venta ni crea cotizacion; solo valida la respuesta de cotizacion server-side.
- `check-container-connectivity.sh development` confirmo Facturador y worker en `SRI_ENVIRONMENT=pruebas`, endpoints `celcer.sri.gob.ec`, contrato publico por APISIX y rutas legacy bloqueadas; no se uso SRI produccion ni se emitieron comprobantes.

Pendientes:
- Continuar auditoria de conversion de cotizaciones, permisos por rol, edicion de cupones y mensajes de error restantes contra `/my-account`.

### 2026-06-17 - Dashboard QA: Pedidos pickup visibles y accionables en logistica

Objetivo: alinear `Envios` del nuevo Dashboard con `/my-account`. El panel anterior mostraba pedidos `pickup/ready_for_pickup/ready` como listos para retiro y permitia abrir `Ver pedido`; el Dashboard nuevo dependia casi solo de `delivery_method=pickup`, dejaba estados de retiro sin clasificar en logistica y mostraba filas sin accion directa.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` agrega `isPickupReadyStatus()` y hace que `shippingMethodBucket()` clasifique como pickup los estados `pickup`, `ready_for_pickup` y `ready` cuando no hay metodo explicito.
- `deliveryLabel()` y `orderDeliveryDescription()` ahora infieren retiro como `/my-account`: metodo explicito, ventana/proveedor de pickup, estados pickup/ready y, solo como respaldo, direccion o costo de envio.
- `paramascotas-panel.component.html` agrega accion `Detalle` en filas de pedidos de `Pickup` y `Domicilio`, usando el modal real de pedido, y muestra el contacto operativo con la misma prioridad corregida en `orderContact()`.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` agrega una prueba no destructiva que intercepta pedidos/envios/settings, simula un pedido `ready_for_pickup` sin `delivery_method`, verifica que aparezca en `Pickup` y abre su detalle como `Retiro en tienda`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "ready pickup"` (`1/1`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts` (`41/41`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-list-views.spec.ts` (`6/6`) y `./scripts/check-container-connectivity.sh development`.
- La primera ejecucion de la prueba detecto la brecha adicional del modal (`Metodo no especificado` para `ready_for_pickup`); se corrigio antes de cerrar el tramo.
- `check-container-connectivity.sh development` confirmo Facturador y worker en `SRI_ENVIRONMENT=pruebas`, endpoints `celcer.sri.gob.ec`, contrato publico por APISIX y rutas legacy bloqueadas; no se uso SRI produccion ni se emitieron comprobantes.

Pendientes:
- Continuar con permisos por rol, notificaciones server-side y otros estados de pedido/venta que todavia puedan diferir de `/my-account`.

### 2026-06-17 - Dashboard QA: Contacto operativo de pedidos iguala prioridad de my-account

Objetivo: corregir una diferencia de notificaciones/contacto en pedidos. `/my-account` usa primero datos del pedido y de la direccion de envio para email/telefono operativo; el nuevo Dashboard estaba priorizando `user_email` y facturacion antes de envio, lo que podia abrir email o WhatsApp al contacto equivocado cuando comprador, facturacion y destinatario no coinciden.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` cambia `orderContact()` para priorizar `customer_*`, luego direccion de envio, luego facturacion y finalmente datos de usuario/cuenta.
- El modal de pedido, botones `Email` y `WhatsApp`, mensajes generados y tarjetas de contacto usan ahora el destinatario operativo equivalente al panel anterior.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` agrega una prueba no destructiva con un pedido interceptado que tiene contacto distinto en cuenta, facturacion y envio; valida que la UI muestre envio y que `mailto:`/`wa.me` usen email y telefono de envio.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "contact actions prefer"` (`1/1`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts` (`40/40`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-list-views.spec.ts` (`6/6`) y `./scripts/check-container-connectivity.sh development`.
- La prueba intercepta pedidos y no muta datos reales.
- `check-container-connectivity.sh development` confirmo Facturador y worker en `SRI_ENVIRONMENT=pruebas`, endpoints `celcer.sri.gob.ec`, contrato publico por APISIX y rutas legacy bloqueadas; no se uso SRI produccion ni se emitieron comprobantes.

Pendientes:
- Continuar auditoria de notificaciones server-side, permisos por rol de cliente/admin, estados especiales de retiro y facturas RIDE contra `/my-account`.

### 2026-06-17 - Dashboard QA: Estados de pedidos resincronizan datos operativos

Objetivo: cerrar una brecha con `/my-account` en la gestion de pedidos. El panel anterior recargaba datos administrativos despues de cambiar estado; el nuevo Dashboard solo actualizaba el pedido visible, aunque el backend al cancelar/reactivar/entregar puede afectar inventario FIFO, costos, ventas realizadas y reportes.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` agrega `refreshOrderStatusDependencies()` y lo ejecuta tras `updateOrderStatus()` exitoso.
- El refresco respeta la seccion activa: `Pedidos` recarga pedidos, `Reporte general` recarga reporte, `Inventario` recarga inventario, `Ranking` recarga ranking y las vistas financieras/reporting nativas recargan su paquete completo con pedidos, productos, inventario, compras, gastos y periodos.
- Se mantiene la regla del panel anterior para admins: pueden gestionar estado salvo pedidos `canceled/cancelled` o `delivered`; no se eliminaron acciones existentes.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` agrega una prueba no destructiva que intercepta `GET/PATCH /dashboard/api/orders...`, marca un pedido simulado como `delivered` y verifica que el Dashboard haga un nuevo `GET /orders` posterior al `PATCH`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "admin orders refreshes"` (`1/1`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts` (`39/39`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-list-views.spec.ts` (`6/6`) y `./scripts/check-container-connectivity.sh development`.
- La prueba de estados usa rutas interceptadas y no muta pedidos reales de QA.
- `check-container-connectivity.sh development` confirmo Facturador y worker en `SRI_ENVIRONMENT=pruebas`, endpoints `celcer.sri.gob.ec`, contrato publico por APISIX y rutas legacy bloqueadas; no se uso SRI produccion ni se emitieron comprobantes.

Pendientes:
- Continuar auditoria integral contra `/my-account`: notificaciones de pedidos, edicion/cancelacion de ventas segun rol, flujo de facturas RIDE, compras/egresos restantes y pantallas visibles que aun puedan depender de datos desactualizados o contratos parciales.

### 2026-06-17 - Dashboard QA: Exportacion Excel de reportes nativos

Objetivo: cerrar la brecha con `/my-account`, donde los reportes podian descargarse como libro compatible con Excel. El nuevo Dashboard solo tenia exportaciones CSV puntuales para plan de compra y ranking, dejando Reporte general/ventas/balance/trazabilidad/compras sin salida operativa equivalente.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` agrega `exportNativeReport()` y un generador local de workbook XML `.xls` compatible con Excel/LibreOffice.
- La exportacion usa datos ya cargados del Dashboard, sin rutas nuevas ni mutaciones: resumen financiero, pedidos, productos, categorias, tendencias financieras, facturas de compra recientes y, cuando aplica, ventas vs compras e incidencias de trazabilidad.
- `paramascotas-panel.component.html` agrega `Exportar Excel` en `Reporte general` y en las vistas financieras/reporting nativas junto al control de actualizacion.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` valida descarga real del archivo desde `Reporte general`, nombre `reporte-general-YYYY-MM-DD.xls`, marca Excel XML y hojas `Resumen`, `Pedidos` y `Productos`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "general report exports"` (`1/1`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts` (`38/38`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-list-views.spec.ts` (`6/6`) y `./scripts/check-container-connectivity.sh development`.
- `check-container-connectivity.sh development` confirmo Facturador y worker en `SRI_ENVIRONMENT=pruebas`, endpoints `celcer.sri.gob.ec`, contrato publico por APISIX y rutas legacy bloqueadas; esta exportacion no toca SRI ni emite comprobantes.

Pendientes:
- Seguir auditando edicion de pedidos/estados, facturas RIDE, notificaciones restantes y cualquier opcion visible que aun sea template o no tenga contrato backend equivalente a `/my-account`.

### 2026-06-17 - Dashboard QA: Comprobante interno de pedidos vuelve a flujo de impresion

Objetivo: igualar el comportamiento de `/my-account` para comprobantes internos de pedidos completados/entregados. El panel anterior obtenia el HTML del backend, abria una ventana controlada y disparaba impresion/guardar PDF; el nuevo Dashboard solo navegaba a la URL del comprobante.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` cambia `openOrderInvoice()` para abrir una ventana de impresion, mostrar estado de carga, pedir `GET /dashboard/api/orders/{id}/invoice?format=html` con credenciales y escribir el HTML con script `window.print()`/`afterprint`.
- Si el navegador bloquea el popup o falla el backend, el error se muestra en `ordersError` sin mutar pedidos ni emitir facturas.
- `paramascotas-panel.component.html` cambia los botones visibles de comprobante a `Imprimir` o `Imprimir / Guardar PDF`, aclarando la accion real para el operador.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` agrega una prueba no destructiva que intercepta el HTML del comprobante, abre el popup y verifica que el Dashboard escriba el contenido con script de impresion.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "admin orders print"` (`1/1`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts` (`37/37`) y `./scripts/check-container-connectivity.sh development`.
- La prueba intercepta el comprobante interno y no toca Facturador ni SRI; `check-container-connectivity.sh development` confirmo Facturador y worker en `SRI_ENVIRONMENT=pruebas`, endpoints `celcer.sri.gob.ec` y rutas legacy bloqueadas.

Pendientes:
- Continuar auditoria de reportes exportables, edicion de pedidos/estados, facturas RIDE y notificaciones restantes contra `/my-account`.

### 2026-06-17 - Dashboard QA: Facturas de compra auditables desde inventario

Objetivo: alinear el detalle de facturas de compra del nuevo Dashboard con `/my-account`, haciendo que el operador pueda abrir facturas recientes desde Inventario y verificar totales de compra contra las lineas que alimentan costos, margenes y reposicion.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` agrega `purchaseInvoiceComputedTotals()` y `purchaseInvoiceTotalsMismatch()` para recalcular subtotal, IVA, total, unidades y diferencia contra el total de cabecera usando las lineas reales de la factura.
- `paramascotas-panel.component.html` mueve el modal de detalle de factura de compra a nivel global del panel, por lo que `openProductPurchaseInvoice()` funciona tanto desde `Productos x Compra` como desde `Inventario`.
- El modal ahora muestra `Total compra` y `Total lineas` en el resumen, y alerta si la cabecera y las lineas difieren por mas de USD 0.01.
- La lista `Ultimas facturas de compra` de Inventario dejo de ser solo informativa: cada factura reciente es una accion que abre el detalle auditado.
- `paramascotas-panel.component.css` ajusta las filas compactas accionables y la advertencia de auditoria sin convertirlas en controles pesados.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` agrega una prueba no destructiva que abre una factura reciente desde Inventario y valida `Total compra`, `Total lineas`, `Subtotal`, `IVA` y `Total linea`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts` (`36/36`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-list-views.spec.ts` (`6/6`) y `./scripts/check-container-connectivity.sh development`.
- La primera version de la prueba detecto una brecha real: el modal existia solo dentro de `Productos x Compra`; se corrigio moviendolo a nivel global antes de considerar el tramo cerrado.
- `check-container-connectivity.sh development` confirmo nuevamente Facturador y worker en `SRI_ENVIRONMENT=pruebas`, endpoints `celcer.sri.gob.ec`, contrato publico por APISIX y rutas legacy bloqueadas; no se uso SRI produccion ni se emitieron comprobantes.

Pendientes:
- Continuar auditoria integral de compras/ventas contra `/my-account`: edicion completa de facturas de compra, pedidos/facturas, reportes exportables y notificaciones restantes.

### 2026-06-17 - Dashboard QA: Accion Compra explicita para reabastecimiento

Objetivo: cerrar la brecha de UX con `/my-account` donde productos, inventario y ranking tenian una accion directa `Compra`/`Registrar compra`; en el nuevo Dashboard esas rutas estaban cayendo en edicion generica y obligaban al operador a clasificar manualmente el reabastecimiento.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` agrega `registerProductPurchase()`, `registerProductPurchaseById()`, `registerInventoryPurchase()` y busqueda de producto por id/legacy id, preparando el editor con `inventoryAction='restock'`, cantidad actual + unidades sugeridas, costo conocido y factura de compra prellenada con proveedor/IVA cuando hay referencia.
- `paramascotas-panel.component.html` agrega boton `Compra` separado de `Editar` en la tabla de productos, filas de inventario y ranking de ventas/acciones recomendadas; las filas sin recomendacion de compra quedan como seguimiento, no abren reabastecimiento por error.
- `Dashboard/tests/e2e/paramascotas-list-views.spec.ts` agrega una prueba no destructiva: clic en `Compra` desde catalogo abre el editor como `restock`, aumenta stock y muestra `Factura de compra para ingresar stock` sin enviar mutacion.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-list-views.spec.ts` (`6/6`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts` (`35/35`) y `./scripts/check-container-connectivity.sh development`.
- Validado en runtime local que productos, inventario y ranking no tienen `overflowX` en desktop/mobile; `Compra` queda visible en productos y ranking, y en inventario tras esperar datos reales hay 154 botones `Compra` en desktop.
- `check-container-connectivity.sh development` confirmo Facturador y worker en `SRI_ENVIRONMENT=pruebas`, endpoints `celcer.sri.gob.ec`, contrato publico por APISIX y rutas legacy bloqueadas; no se uso SRI produccion.

Pendientes:
- Continuar auditoria de compras detalladas, edicion completa de facturas de compra, pedidos/facturas y notificaciones contra `/my-account`; este tramo cubre la entrada operativa al flujo de reabastecimiento desde vistas clave.

### 2026-06-17 - Dashboard QA: Stock inicial y compras exigen factura como en my-account

Objetivo: alinear el editor de productos del nuevo Dashboard con `/my-account` para que el ingreso de stock inicial o reabastecimiento no quede sin factura de compra, proveedor/documento, fecha e IVA, preservando trazabilidad FIFO, costos y reportes de compras.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` ahora calcula la intencion de inventario segun producto nuevo, edicion sin cambio, ajuste manual o `Compra / reabastecimiento`; ya no envia `initial_stock` por defecto en ediciones con stock.
- `sanitizeProductForm()` recibe el producto actual y referencias de proveedores, normaliza la factura de compra, completa documento/IVA desde proveedor cuando coincide y solo envia `purchaseInvoice` cuando hay datos reales o cuando la compra es obligatoria.
- Se agrega validacion cliente antes del POST: stock inicial y `restock` requieren costo de compra, numero de factura, proveedor, RUC/documento, fecha `YYYY-MM-DD` e IVA 0-100; cambios de stock por ajuste requieren motivo.
- `paramascotas-panel.component.html/css` agrega una pista compacta en `Factura de compra para ingresar stock`, indicando si el flujo actual es stock inicial, reabastecimiento, ajuste manual, cambio pendiente de clasificar o sin ingreso nuevo.
- `Dashboard/tests/e2e/paramascotas-list-views.spec.ts` actualiza el alta de variante agrupada para incluir factura de compra completa y agrega una prueba no destructiva que bloquea stock inicial sin factura antes de llamar `POST /products`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-list-views.spec.ts` (`5/5`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts` (`35/35`) y `./scripts/check-container-connectivity.sh development`.
- Validado en runtime local `http://127.0.0.1:8081/dashboard/paramascotas-panel/catalog/products` en desktop `1440x1000` y mobile `390x844`: `overflowX=0`, editor visible y pista de intencion de inventario/factura presente.
- `check-container-connectivity.sh development` confirmo Facturador y worker en `SRI_ENVIRONMENT=pruebas`, endpoints `celcer.sri.gob.ec`, contrato publico por APISIX y rutas legacy bloqueadas; no se uso SRI produccion.

Pendientes:
- Continuar auditoria integral de edicion/reabastecimiento de productos existentes, compras detalladas, pedidos/facturas y notificaciones contra `/my-account`; este tramo cubre alta de producto con stock inicial, clasificacion de cambio de stock y contrato de factura de compra.

### 2026-06-17 - Dashboard QA: Imagenes de producto alineadas con panel anterior

Objetivo: cerrar una brecha de paridad entre el nuevo Dashboard y `/my-account` en gestion de imagenes de productos, evitando altas con imagenes incompletas y preservando el contrato que el backend espera para miniaturas y galeria.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` separa errores del editor (`productFormError`) de errores de carga del listado, muestra fallas de subida/guardado junto al formulario y bloquea el guardado mientras existan cargas de imagen activas.
- El guardado de productos normaliza las imagenes antes de llamar al backend: miniaturas `thumb` a `640x800`, galeria `gallery` a `1200x1500`, `kind`, `altText` con fallback SEO y filtro de URLs vacias.
- Si falta al menos una miniatura o una imagen de ficha, el Dashboard ya no dispara `POST/PUT /api/products` y muestra el mismo tipo de error operativo del panel anterior.
- `Dashboard/src/app/features/dashboard/models/paramascotas-admin.model.ts` agrega el alias legacy `images` al payload de producto; `sanitizeProductForm()` envia `images` con la galeria ademas de `galleryImages`, manteniendo compatibilidad con `/my-account` y el backend.
- `Dashboard/tests/e2e/paramascotas-list-views.spec.ts` ahora valida de forma no destructiva que una variante agrupada envie metadata de agrupacion junto con imagenes normalizadas, y que un producto sin miniatura/ficha quede bloqueado antes del POST.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-list-views.spec.ts` (`4/4`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts` (`35/35`) y `./scripts/check-container-connectivity.sh development`.
- Validado en runtime local `http://127.0.0.1:8081/dashboard/paramascotas-panel/catalog/products` en desktop `1440x1000` y mobile `390x844`: `overflowX=0`, editor de `Imagen miniatura` y `Imagenes de ficha` visible.
- `check-container-connectivity.sh development` confirmo Facturador y worker en `SRI_ENVIRONMENT=pruebas`, endpoints `celcer.sri.gob.ec`, contrato publico por APISIX y rutas legacy bloqueadas; no se uso SRI produccion.

Pendientes:
- Continuar auditoria integral de formularios mutables de pedidos/compras, imagenes en otros catalogos, notificaciones y calculos de compras/ventas contra `/my-account`; este tramo cubre imagenes del editor de productos y su contrato de guardado.

### 2026-06-17 - Dashboard QA: Cotizaciones respetan validacion y resultado de correo

Objetivo: avanzar la paridad con `/my-account` en correos/notificaciones de cotizaciones, donde el panel anterior solo solicitaba envio SMTP si el correo era valido y mostraba al operador el resultado devuelto por `email_delivery`.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` agrega `quotationNotice`, validacion `localSaleCustomerEmailValid()`, helpers `quotationEmailDelivery*()` y `buildQuotationNotice()` para mostrar si la cotizacion fue creada, enviada por correo o creada sin correo.
- `localQuotationPayload()` ahora envia `send_email=true` solo cuando el checkbox esta activo y el correo del cliente pasa validacion basica; si el correo es invalido, la cotizacion se crea pero no se solicita envio SMTP, igual que en el flujo anterior.
- `paramascotas-panel.component.html` muestra validacion inline del email, un aviso posterior a crear cotizacion, estado de entrega en detalle/tarjetas/tabla y una columna `Correo` en el historial.
- `paramascotas-panel.component.css` agrega estilos compactos para el hint y badges de correo sin romper desktop/mobile.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` agrega una prueba no destructiva que intercepta `POST /dashboard/api/admin/quotes`, marca envio de correo con email invalido y verifica que el payload salga con `send_email=false` y que la UI informe `Cotizacion creada sin correo`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "quotations do not request email"` (`1/1`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts` (`35/35`) y `./scripts/check-container-connectivity.sh development`.
- Verificado en runtime local `http://127.0.0.1:8081/dashboard/paramascotas-panel/operations/quotations` en desktop `1440x900` y mobile `390x844`: formulario de correo visible, sin overflow horizontal (`overflowX=0`).
- `check-container-connectivity.sh development` confirmo nuevamente `SRI_ENVIRONMENT=pruebas`, endpoints SRI `celcer.sri.gob.ec`, SMTP alcanzable y rutas legacy bloqueadas; no se uso SRI produccion ni se envio correo real en la prueba interceptada.

Pendientes:
- Continuar auditoria integral de imagenes, formularios mutables de pedidos/compras y otros flujos de notificacion contra `/my-account`; este tramo cubre creacion de cotizaciones y visibilidad de entrega de correo.

### 2026-06-17 - Dashboard QA: Ambiente SRI visible y reemision production bloqueada en development

Objetivo: auditar la pantalla nueva de facturas/RIDE contra el panel anterior `/my-account`, manteniendo el listado historico, PDF, estados SRI y reemision, pero asegurando que este ambiente development/QA no pueda operar accidentalmente contra endpoints SRI de produccion.

Cambios:
- `paramascotasec-backend/src/Services/FacturadorApiService.php` agrega una barrera server-side: si `APP_ENV` no es `production/prod`, cualquier endpoint `/api/production/v1/invoices` queda bloqueado, tanto por configuracion `FACTURADOR_API_INVOICES_PATH` como por `ambiente=produccion` recibido al reemitir.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.{ts,html,css}` agrega resumen compacto `Ambiente SRI`, clasifica RIDE como `Pruebas`, `Produccion`, `Sin ambiente` u `Otro`, muestra el ambiente en lista/detalle y avisa que development opera solo con Facturador QA/pruebas.
- En el Dashboard, las reemisiones de documentos marcados como `Produccion` quedan bloqueadas visualmente cuando el build no es productivo; la barrera real queda en backend.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` agrega cobertura para que `operations/billing-rides` exponga los controles de ambiente SRI.

Operacion y verificacion:
- Se redeplego `backend` con `./scripts/deploy-development.sh backend` y `Dashboard` con `npm run docker:up`.
- Pasaron `php -l` sobre `BillingDocumentController.php` y `FacturadorApiService.php`, `npm run type:check`, `npm run lint`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "billing-rides|billing rides"` (`2/2`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts` (`34/34`) y `./scripts/check-container-connectivity.sh development`.
- Validado dentro de `paramascotasec-backend-app` que `ambiente=produccion` y una mala configuracion `FACTURADOR_API_INVOICES_PATH=/api/production/v1/invoices` fallan antes de usar red con `Uso de Facturador production bloqueado en APP_ENV=development`.
- Runtime local `http://127.0.0.1:8081/dashboard/paramascotas-panel/operations/billing-rides`: el panel muestra 7 RIDE `Pruebas` y 101 `Produccion`, conserva `overflowX=0` y ya no presenta conteos ambiguos de reemision.
- `check-container-connectivity.sh development` confirmo `SRI_ENVIRONMENT=pruebas`, endpoints `celcer.sri.gob.ec`, facturador anonimo rechazado y rutas legacy bloqueadas; no se uso SRI produccion.

Pendientes:
- Continuar auditoria integral de correos/notificaciones, formularios de pedidos/compras, imagenes y flujos mutables contra `/my-account`; este tramo cubre facturas/RIDE, visibilidad de ambiente y bloqueo de produccion en QA.

### 2026-06-17 - Dashboard QA: Riesgos accionables en Productos x Compra

Objetivo: continuar la paridad funcional con `/my-account` en compras, costos y margenes por producto, haciendo visibles los casos que afectan utilidad, trazabilidad FIFO y calidad de datos sin cambiar los contratos server-side.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` agrega `ProductPurchaseRiskFilter`, `ProductPurchaseRiskRow`, `productPurchaseRiskRows()` y `productPurchaseRowMatchesRisk()`, usando datos ya calculados por backend/productos/reporte: compras, costo ponderado, stock remanente, ventas, utilidad y margen.
- `paramascotas-panel.component.html` agrega un panel clicable de riesgos en `Reporte > Productos x Compra`: `Vendido sin compra/costo`, `Margen negativo`, `Stock sin compra`, `Stock sin venta` y `Todos`.
- El filtro de riesgo se integra con la lista existente de productos, busqueda y filtros `Con ventas/Con compras`, de modo que el superadmin pueda abrir directamente los productos que requieren correccion o auditoria.
- `paramascotas-panel.component.css` agrega estilos compactos/responsive para mantener el panel como control operativo, no como bloque decorativo.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` verifica que la ruta `reporting/products-purchases` cargue el panel de riesgos y que `Margen negativo` quede activo al seleccionarlo.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts --grep "products purchases|products-purchases"` (`2/2`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts` (`33/33`), `node node_modules/playwright/cli.js test tests/e2e/layout-density.spec.ts --grep "paramascotas-panel/reporting/general"` (`2/2`) y `./scripts/check-container-connectivity.sh development`.
- Verificado en runtime local `http://127.0.0.1:8081/dashboard/paramascotas-panel/reporting/products-purchases`: el panel muestra 5 filtros de riesgo y `overflowX=0` en viewport desktop.
- `check-container-connectivity.sh development` confirmo Facturador y worker en `SRI_ENVIRONMENT=pruebas`, endpoints SRI `celcer.sri.gob.ec` y rutas legacy bloqueadas; no se uso SRI produccion.

Pendientes:
- Seguir auditando facturas/RIDE, correos/notificaciones, formularios de pedidos y creacion/edicion de compras contra el panel anterior; este tramo cubre lectura y filtrado accionable de riesgos de compras/stock/margen.

### 2026-06-17 - Dashboard QA: Lideres comerciales claros en reportes de ventas

Objetivo: avanzar la auditoria integral del Dashboard contra `/my-account` corrigiendo una brecha de experiencia y lectura financiera: los reportes mostraban productos lideres casi solo por venta neta, sin dejar claro cual era el mas vendido, el de mayor ingreso, el de mayor utilidad y el de mayor margen.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` agrega `ProductMetricLeader` y `buildProductMetricLeaders()`, calculando lideres desde `report.products` con datos server-side ya existentes: `units_sold`, `net_revenue`, `profit` y `margin`.
- `paramascotas-panel.component.html` muestra el bloque compacto `paramascotas-product-leaders` en `Reporte general` y `Reporte de ventas`, antes de las barras de productos, con etiquetas explicitas `Mas vendido`, `Mayor ingreso`, `Mayor utilidad` y `Mayor margen`.
- `paramascotas-panel.component.css` agrega estilos compactos y responsive para que esos indicadores queden visibles sin crear scroll interno innecesario ni romper mobile.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` valida que la ruta `reporting/sales` exponga los cuatro lideres por metrica.
- `Dashboard/tests/e2e/paramascotas-real-auth.spec.ts` extiende el flujo real por `https://paramascotasec.com/dashboard` con login + MFA para comprobar que, tras autenticarse por APISIX, el reporte de ventas muestra esos lideres con sesion real.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts` (`32/32`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-auth.spec.ts` (`2/2`), `node node_modules/playwright/cli.js test tests/e2e/layout-density.spec.ts --grep "paramascotas-panel/reporting/general"` (`2/2`) y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229` que `https://paramascotasec.com/dashboard/paramascotas-panel/reporting/sales` responde `200`; el contenido del reporte se verifico autenticado dentro de `paramascotas-real-auth.spec.ts`.
- `check-container-connectivity.sh development` confirmo nuevamente que Facturador y worker estan en `SRI_ENVIRONMENT=pruebas` y usan endpoints SRI de pruebas `celcer.sri.gob.ec`; no se uso ambiente SRI de produccion.

Pendientes:
- Continuar la comparacion funcional de compras, facturas, correos/notificaciones, formularios de pedidos y calculos de precio/margen contra `/my-account`; este tramo cubre claridad de estadisticas/rankings comerciales, no la auditoria completa del sistema.

### 2026-06-17 - Dashboard QA: Paridad inicial de productos agrupados con panel anterior

Objetivo: iniciar la auditoria integral del nuevo Dashboard contra el panel anterior `/my-account`, corrigiendo primero la brecha critica de gestion de productos agrupados/variantes sin cambiar la logica server-side ni tocar ambiente SRI de produccion.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.{ts,html,css}` incorpora normalizacion de atributos de variantes basada en la logica del panel anterior: nombre base de agrupacion, etiqueta visible, eje de variante, modo de catalogo y clave `variantGroupKey`.
- El editor de productos agrega un bloque compacto de `Variantes y agrupacion` con campos operativos para presentacion, talla, color, material, rango, dosis, uso, empaque y modo de visualizacion, mas resumen visible de grupo/variante antes de guardar.
- La tabla de productos muestra informacion de agrupacion cuando existe y agrega la accion `Nueva variante`, que duplica un producto como variante nueva preservando el contexto del grupo pero limpiando SKU, lote, expiracion y cantidad inicial.
- `Dashboard/tests/e2e/paramascotas-list-views.spec.ts` agrega una prueba no destructiva que intercepta el alta de producto y verifica que un accesorio con color/talla envie `variantBaseName`, `variantLabel`, `displayAxis`, `variantAxis`, `catalogDisplayMode` y `variantGroupKey` equivalentes al panel anterior.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-list-views.spec.ts` (`3/3`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts` (`31/31`), `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-auth.spec.ts` (`2/2`), `node node_modules/playwright/cli.js test tests/e2e/layout-density.spec.ts --grep "paramascotas|products|catalog|tenant-admin"` (`8/8`), `npm run docker:health` y `./scripts/check-container-connectivity.sh development`.
- Se redeplego solo `Dashboard` con `npm run docker:up`; el build Docker uso Node 26 y quedo servido en `http://127.0.0.1:8081`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229` que `https://paramascotasec.com/dashboard/paramascotas-panel/catalog/products` responde `200`, y `check-container-connectivity.sh development` confirmo Facturador en `SRI_ENVIRONMENT=pruebas` contra endpoints `celcer.sri.gob.ec`.

Pendientes:
- Continuar la auditoria completa de compras, ventas, facturas, correos, reportes, estadisticas y calculos contra el comportamiento anterior; este tramo cerro la brecha critica de productos agrupados y dejo una prueba e2e especifica para evitar regresion.
- `npm run build` local de Dashboard no se pudo ejecutar fuera de Docker porque el Node local es `v22.22.2` y Angular exige `v22.22.3`, `v24.15.0` o `v26.0.0`; el build Docker si paso con Node 26.

### 2026-06-16 - Dashboard QA: Matriz rapida de modulos por tenant

Objetivo: permitir al superadmin escanear rapidamente que tiene habilitado cada tenant sin abrir fila por fila, manteniendo la pantalla compacta y sin sacar tablas del viewport.

Cambios:
- `Dashboard/src/app/features/tenant-admin/pages/tenant-admin/tenant-admin.component.{ts,html,css}` agrega una `Matriz rapida de cobertura` arriba del listado de tenants, con columnas compactas para `Ecommerce`, `Facturacion`, `Inventario`, `Productos`, `Correo`, `Workspace` y `Monitoreo`, mas conteo de capacidades y accion `Abrir`.
- La matriz usa tabla responsiva con contenedor propio y pills compactos `Si/No` por modulo, de modo que funcione como tablero de supervision y no solo como formulario de edicion.
- `Dashboard/tests/e2e/smoke.spec.ts` ahora verifica que la matriz exista y muestre a `ParaMascotasEC` junto a columnas clave como `Ecommerce` y `Facturacion`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/smoke.spec.ts --grep "tenant admin|coverage matrix|quick presets"` (`4/4`) y `node node_modules/playwright/cli.js test tests/e2e/layout-density.spec.ts --grep "tenant-admin"` (`2/2`).
- Verificado en runtime local `http://127.0.0.1:8081/tenant-admin?tenant=demo`: la matriz existe, `overflow` global sigue en `0` y la tabla queda contenida sin romper el layout.

### 2026-06-16 - Dashboard QA: Presets rapidos para contratacion SaaS en tenant-admin

Objetivo: reducir pasos al crear y reconfigurar tenants, evitando que el superadmin tenga que marcar modulo por modulo para combinaciones repetidas.

Cambios:
- `Dashboard/src/app/features/tenant-admin/pages/tenant-admin/tenant-admin.component.{ts,html,css}` agrega presets rapidos para `Plataforma base`, `Ecommerce base`, `Retail operativo` e `Inventario + facturacion`, disponibles tanto en alta como dentro de la gestion de tenants existentes.
- `Dashboard/src/app/features/tenant-admin/state/tenant-admin.facade.ts` agrega `applyPreset()`, que encadena `updateModules` y `updateConfiguration` cuando el preset incluye Ecommerce.
- `Dashboard/tests/e2e/smoke.spec.ts` verifica que tenant-admin exponga presets en la creacion y en la gestion de `ParaMascotasEC`.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/smoke.spec.ts --grep "tenant admin"` (`3/3`) y `node node_modules/playwright/cli.js test tests/e2e/layout-density.spec.ts tests/e2e/smoke.spec.ts --grep "tenant-admin|tenant admin|Clientes y paquetes contratados"` (`4/4`).
- Validado en runtime local `http://127.0.0.1:8081/tenant-admin?tenant=demo`: el bloque de alta muestra presets accionables arriba de `Paquetes SaaS`, y cada tenant expandido muestra presets rapidos sin obligar a abrir todas las secciones de modulos.

Nota:
- Las specs unitarias de Vitest para este tramo no pudieron ejecutarse por una dependencia opcional faltante de `rollup` en el `node_modules` local (`@rollup/rollup-linux-x64-gnu`); la validacion efectiva se cubrio con `type:check`, `lint`, build Docker y Playwright.

### 2026-06-16 - Dashboard QA: Tenant Admin mas compacto para alta y gestion de paquetes

Objetivo: mejorar la comodidad real de la zona de tenants/modulos, reduciendo el bloque excesivamente largo de alta y la saturacion visual al gestionar paquetes SaaS por tenant.

Cambios:
- `Dashboard/src/app/features/tenant-admin/pages/tenant-admin/tenant-admin.component.ts` agrega estados de expansion para paquetes del alta (`expandedCreateBusinessKey`) y para paquetes dentro de cada tenant (`expandedTenantBusinessKeys`), ademas de helpers de preview por paquete.
- `tenant-admin.component.html` convierte la seleccion de paquetes en una experiencia plegable: cada paquete muestra resumen corto y solo expone modulos internos al abrir su detalle; la gestion por tenant replica ese patron para no mostrar todas las casillas y descripciones a la vez.
- `tenant-admin.component.css` agrega acciones compactas por paquete, previews visuales de modulos y ajustes responsive para que los botones de detalle/ocultar no rompan mobile.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:up`, `npm run docker:health` y `node node_modules/playwright/cli.js test tests/e2e/layout-density.spec.ts tests/e2e/smoke.spec.ts --grep "tenant-admin|tenant admin|Clientes y paquetes contratados"` (`4/4`).
- Validado en runtime local del Dashboard (`http://127.0.0.1:8081/tenant-admin?tenant=demo`) con capturas desktop/mobile: la pantalla ya no deja todos los paquetes abiertos permanentemente y la edicion de modulos por tenant queda progresiva, mas cercana a una consola operativa que a una pared de cards.

Pendiente:
- La zona tenant-admin todavia puede ganar una matriz mas compacta de permisos/capacidades y acciones batch por tenant, pero ya quedo publicada una mejora usable y verificada en QA local.

### 2026-06-16 - Dashboard QA: Auth tenant real, tenant-admin compacto y auditoria publica POS

Objetivo: quitar el falso superadmin implicito en QA, endurecer la validacion del login real por `paramascotasec.com` y responder la duda operativa sobre funciones aparentando fallar en `Venta en local`.

Cambios:
- `paramascotasec-backend/src/Controllers/TenantController.php` deja de tratar a cualquier `admin` como `platform-admin` por estar en `development`; ahora solo lo son `service_auth` o correos explicitamente listados en `platform_admin_emails`.
- `Dashboard/tests/e2e/paramascotas-real-auth.spec.ts` valida el flujo publico completo por `https://paramascotasec.com/dashboard`: redireccion a `sign-in`, login con password, MFA por OTP real, contexto tenant sin `platform-admin`, estado POS sincronizado y catalogo POS cargado.
- `Dashboard/src/app/features/tenant-admin/pages/tenant-admin/tenant-admin.component.{ts,html,css}` compacta la vista de tenants: busqueda, filtros por estado/enfoque, preview corto de modulos y detalle expandible por fila en lugar de exponer toda la configuracion de cada cliente de una sola vez.

Operacion y verificacion:
- Pasaron `npm run type:check`, `npm run lint`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-auth.spec.ts` y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts tests/e2e/paramascotas-real-auth.spec.ts` (`31/31`).
- Verificado sobre el dominio publico QA `paramascotasec.com` resolviendo a `192.168.100.229`: el POS real sigue teniendo abierto el turno `SHIFT-20260605102440-5CBBAB` desde `2026-06-05 10:24:40 -05`, por lo que la accion correcta es `Cerrar caja`, no `Abrir caja`.
- En la misma auditoria publica autenticada, `GET /dashboard/api/admin/pos/shift/active` y `GET /dashboard/api/products?scope=admin` responden `200`, y la pantalla `Venta en local` muestra el turno abierto y productos cargados.

Decision:
- Una accion visible en `Integraciones reales` no se considera confiable solo porque su API responda; debe quedar validada tambien dentro del flujo autenticado real por el dominio publico y respetar el estado operativo vigente del backend.

### 2026-06-16 - Dashboard QA: Tenant Context Real y Auth Publica para Paramascotas

Objetivo: avanzar el dashboard desde un modo hibrido hacia autenticacion real del tenant Paramascotas, manteniendo fixtures solo para localhost/desarrollo y evitando que el proxy interno siguiera autenticando al navegador publico como `service admin`.

Cambios:
- `paramascotasec-backend/config/routes.php` publica `GET /api/tenant/context` con `TenantController@context`.
- `paramascotasec-backend/src/Controllers/TenantController.php` queda operativo como contrato real de contexto tenant, devolviendo `tenant`, `enabledModules`, `permissions`, `roles`, `currentUser` y `branding` en el envelope normal del backend.
- `paramascotasec-backend/public/index.php` y `src/Core/Auth.php` ya no aceptan `X-Internal-Proxy-Token` como `service_auth` cuando la solicitud entra por host publico; ese privilegio queda limitado a localhost/hosts internos de servicio para desarrollo.
- `Dashboard/src/app/core/tenant/tenant-api.service.ts` usa fixture tenant context solo en localhost; fuera de localhost consume el backend real `tenant/context` con `realBackendRequestContext()` y desempaqueta `response.data`.
- `Dashboard/src/app/core/tenant/tenant-resolver.service.ts` expone `shouldUseFixtureTenantContext()` y `shouldUseRealTenantContext()` para separar claramente runtime local vs runtime publico.
- `Dashboard/src/app/core/auth/auth.guard.ts` ahora exige sesion real cuando el dashboard se abre en host no local, aunque `routeGuardsEnabled` siga desactivado en el build de development; asi Paramascotas en QA entra por login real, mientras localhost conserva el flujo fixture.
- Se ajustan `auth.guard.spec.ts` y `tenant-resolver.service.spec.ts` para cubrir el nuevo criterio de enforcement por host.

Operacion y verificacion:
- Se redeplego `backend` con `./scripts/deploy-development.sh backend` y luego solo `Dashboard` con `cd /home/admincenter/contenedores/Dashboard && npm run docker:up`.
- Pasaron `php -l` sobre `public/index.php`, `src/Core/Auth.php`, `src/Controllers/TenantController.php`, `config/routes.php`, `npm run lint`, `npm run type:check`, `npm run docker:health`, `./scripts/check-container-connectivity.sh development` y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`:
  - `GET /dashboard/api/auth/session` responde `401 AUTH_REQUIRED` sin sesion.
  - `GET /dashboard/api/tenant/context` responde `401 AUTH_REQUIRED` sin sesion.
  - `GET /dashboard/api/admin/pos/shift/active` responde `401 AUTH_REQUIRED` sin sesion cuando entras por `paramascotasec.com`, pero sigue respondiendo `200` en `http://127.0.0.1:8081/dashboard/api/admin/pos/shift/active` para el modo local de pruebas.
- Validado con navegador headless usando `--host-resolver-rules=MAP paramascotasec.com 192.168.100.229`: abrir `https://paramascotasec.com/dashboard/paramascotas-panel/reporting/general` redirige a `https://paramascotasec.com/dashboard/sign-in?returnUrl=%2Fparamascotas-panel%2Freporting%2Fgeneral`.

Pendientes:
- Completar la validacion end-to-end de login real + MFA con credenciales admin del tenant en QA local; en este tramo quedo validado el redireccionamiento y el cierre del acceso anonimo, no el ciclo completo de autenticacion.
- Seguir migrando pantallas y permisos para que el menu completo dependa de contratos backend reales y no de datos fixture fuera del entorno local.

### 2026-06-16 - Dashboard QA: Auditoria de Integraciones Reales y POS Validado

Objetivo: responder por que `Venta en local` parecia rota al abrir caja y reducir el riesgo de otras opciones aparentando funcionar cuando en realidad estaban desincronizadas o mal validadas.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` ahora bloquea `Abrir caja` cuando ya hay un turno abierto o cuando el monto inicial es `<= 0`, mostrando un mensaje especifico antes de disparar la mutacion.
- La misma vista bloquea `Registrar movimiento` cuando no existe turno POS abierto, para no dejar acciones visibles fuera de estado operativo.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.html` deshabilita el boton `Abrir caja` mientras el monto inicial siga vacio o en cero.
- Se agrega `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts`, que recorre rutas clave de `Integraciones reales` y valida ausencia de errores fatales, ademas de comprobar que `Venta en local` refleje el estado real de `GET /dashboard/api/admin/pos/shift/active`.

Operacion y verificacion:
- Se verifico por APISIX con resolucion a `192.168.100.229` que las 27 firmas activas usadas hoy por `Integraciones reales` respondan `200`, incluyendo reportes, catalogo, POS, cotizaciones, facturas PDF, gastos y cupones.
- El backend real reporta un turno POS abierto: `SHIFT-20260605102440-5CBBAB` con `status = open`; por eso el problema observado no era una caja inutil sino UI desincronizada y validacion floja del formulario.
- Se redeplego solo `Dashboard` con `cd /home/admincenter/contenedores/Dashboard && npm run docker:up`.
- Pasaron `npm run lint`, `npm run type:check`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts`, `npm run docker:health` y `./scripts/check-container-connectivity.sh development`.

Decision:
- Mientras siga visible una opcion dentro de `Integraciones reales`, debe quedar respaldada por contrato backend verificable y por al menos una prueba de smoke; si no cumple eso, debe pasar a templates/demos o esconderse.

### 2026-06-16 - Dashboard QA: Estado POS Real y Auth Session sin Proxy Falso

Objetivo: corregir que `Venta en local` siguiera permitiendo `Abrir caja` aunque el backend ya tenia un turno abierto, y endurecer el dashboard para que `/dashboard/api/auth/session` ya no heredara autenticacion falsa desde el proxy interno.

Cambios:
- `Dashboard/src/app/core/http/interceptors/error.interceptor.ts` ahora desempaqueta el contrato real del backend (`{ ok:false, error:{ message, code, details } }`) para conservar `message` y `code` utiles en toda la UI, en lugar de degradar todo a mensajes HTTP genericos.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` reutiliza ese mensaje real en POS y, cuando `abrir/cerrar caja` falla por conflicto de turno (`ya existe abierto` / `no hay abierto`), vuelve a consultar `GET /api/admin/pos/shift/active` para resincronizar el estado visible.
- `Dashboard/nginx.conf` separa las rutas `/dashboard/api/auth/*` del proxy admin interno; esas rutas ya no reciben `X-Internal-Proxy-Token`, por lo que `auth/session` vuelve a exigir sesion real del navegador.
- `Dashboard/src/app/core/auth/auth-api.service.spec.ts` se ajusto lo minimo para que la union `AuthSession | AuthMfaChallenge` no deje roto el `type:check` completo.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd /home/admincenter/contenedores/Dashboard && npm run docker:up`; no se desplego production ni se tocaron DB, Facturador, SRI, certificados o datos financieros.
- Pasaron `npm run lint`, `npm run type:check`, `npx tsc -p tsconfig.app.json --noEmit`, `npm run docker:health` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con resolucion a `192.168.100.229`:
  - `GET https://paramascotasec.com/dashboard/api/auth/session` responde `401 AUTH_REQUIRED` sin sesion, ya no `service admin`.
  - `GET https://paramascotasec.com/dashboard/api/admin/pos/shift/active` responde `shift.status = open` con turno `SHIFT-20260605102440-5CBBAB`.
  - `POST https://paramascotasec.com/dashboard/api/admin/pos/shift/open` devuelve `400 POS_SHIFT_OPEN_FAILED` con el mensaje real `Ya existe un turno de caja abierto.`, que ahora el frontend puede mostrar y usar para corregir su estado.

Pendientes:
- Reescribir las specs funcionales de auth que todavia asumen fixtures antiguos; el `type:check` ya pasa, pero la suite de auth aun necesita alinearse con login real + MFA.
- Seguir etiquetando o podando mejor las pantallas template/demo fuera de `Integraciones reales`, para que no se confundan con modulos productivos.

### 2026-06-16 - Dashboard QA: POS Local Robusto ante Falla de Cotizaciones

Objetivo: corregir la falsa falla de `Venta en local`, donde la vista mostraba `Operacion no disponible` y `Caja cerrada` aunque ya existia un turno POS abierto, y verificar si habia mas opciones visibles rotas en el panel nativo.

Cambios:
- `paramascotasec-backend/src/Repositories/QuotationRepository.php` deja de intentar `CREATE TABLE IF NOT EXISTS "Quotation"` en runtime con el usuario app; ahora solo valida que la tabla exista y devuelve un error explicito de schema no inicializado si falta.
- `paramascotasec-backend/src/Controllers/QuotationController.php` pasa a inicializar `QuotationRepository` y `OrderRepository` de forma lazy, evitando que una falla del modulo de cotizaciones tumbe el controlador entero durante `__construct()`.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` captura fallas de `listQuotations(12)` dentro de `loadLocalSales()` y sigue cargando POS, productos y estado de tienda aunque cotizaciones falle.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.html` deja de bloquear `Venta en local` por `quotationError()` y muestra ese caso como aviso informativo aislado, no como error fatal del flujo POS.

Operacion y verificacion:
- Se redeplego `backend` con `cd /home/admincenter/contenedores && ./scripts/deploy-development.sh backend` y luego solo `Dashboard` con `cd /home/admincenter/contenedores/Dashboard && npm run docker:up`; no se desplego production ni se tocaron Gateway, Facturador, certificados, SRI o datos de clientes.
- Pasaron `php -l` sobre los archivos PHP tocados, `npm run type:check`, `npm run lint`, `npm run docker:health` y `npm run runtime:check` en `Dashboard`.
- Validado por APISIX con resolucion a `192.168.100.229`: `https://paramascotasec.com/dashboard/api/admin/quotes?limit=12` y `https://paramascotasec.com/dashboard/api/admin/pos/shift/active` responden `200`.
- Validado en el runtime local del Dashboard con Playwright: `/dashboard/paramascotas-panel/operations/local-sales` queda sin `Operacion no disponible`, muestra `CAJA Abierta` con el turno `SHIFT-20260605102440-5CBBAB` y cambia la accion disponible a `Cerrar caja`.
- Se hizo una auditoria corta de 25 rutas nativas de `reporting`, `catalog`, `operations` y `finance`; no aparecieron respuestas `4xx/5xx` del proxy `/dashboard/api/*` en esa revision.

### 2026-06-16 - Dashboard QA: POS Resiliente y Smoke Completo de Integraciones Reales

Objetivo: evitar que `Venta en local` vuelva a quedar en un estado enganoso cuando falla una sola llamada del bloque POS, y ampliar la verificacion de rutas reales para detectar antes cualquier opcion visible rota.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` ahora carga `productos`, `store-status`, `turno POS` y `cotizaciones` con degradacion parcial tanto en `loadLocalSales()` como en `loadQuotationsPanel()`: si una firma falla, la vista conserva el resto de datos reales y muestra el error especifico correspondiente.
- La misma vista deja de mantener un error POS viejo despues de resincronizar caja: cuando `abrir/cerrar caja` falla por conflicto y la recarga de estado posterior tiene exito, se limpia el banner rojo y se vuelve a cargar el panel operativo real.
- `Dashboard/tests/e2e/paramascotas-real-integrations.spec.ts` se amplia de una muestra corta a 30 rutas reales del sidebar (`reporting`, `catalog`, `monitoring`, `operations` y `finance`), incluyendo `Venta en local`, `Envios`, `Facturas PDF`, `Balances`, `Precios`, `Impuestos`, `Margenes`, `Calculos` y `Reglas de precio`.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd /home/admincenter/contenedores/Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados o SRI.
- Pasaron `npm run type:check`, `npm run lint`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts` (30/30), `npm run docker:health` y `git -C Dashboard diff --check`.
- Validado por APISIX con resolucion a `192.168.100.229` y sesion admin real:
  - `GET /dashboard/api/auth/session`, `GET /dashboard/api/tenant/context` y `GET /dashboard/api/admin/pos/shift/active` responden `200`.
  - `GET /dashboard/api/products?scope=admin`, `GET /dashboard/api/admin/settings/store-status`, `GET /dashboard/api/admin/quotes?limit=12`, `GET /dashboard/api/admin/report?period=2026-06`, `GET /dashboard/api/admin/dashboard/stats?period=2026-06&include_report=0`, `GET /dashboard/api/admin/inventory/intelligence`, `GET /dashboard/api/admin/purchase-invoices`, `GET /dashboard/api/shipments`, `GET /dashboard/api/admin/billing/rides`, `GET /dashboard/api/admin/financial-periods`, `GET /dashboard/api/admin/expenses`, `GET /dashboard/api/admin/discounts`, `GET /dashboard/api/admin/discounts/audit` y `GET /dashboard/api/users` responden `200`.
  - El turno POS sigue abierto en backend como `SHIFT-20260605102440-5CBBAB`, por lo que `Abrir caja` no debe ser la accion primaria mientras ese turno exista.
- La sesion admin temporal usada para la auditoria se elimino al cerrar la validacion; no se dejo un usuario extra persistente en QA.

Decision:
- Una vista dentro de `Integraciones reales` no debe colapsar a un error fatal por la caida de una sola dependencia secundaria; debe seguir mostrando el resto del estado real y dejar claro que parte puntual fallo.

### 2026-06-16 - Dashboard QA: Paramascotas Backend con Resumen Publico Integrado

Objetivo: eliminar el espacio muerto que todavia quedaba en `Paramascotas backend` debajo de `Pedidos recientes`, causado porque el resumen publico y el catalogo seguian renderizando fuera de la columna principal.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-backend/paramascotas-backend.component.html` encapsula `Estado publico`, drilldown de inventario y `Catalogo publico` en un `ng-template` reutilizable y lo monta dentro de la columna principal cuando existe snapshot admin.
- Cuando no hay snapshot admin, el mismo bloque reutilizable sigue pudiendo renderizarse de forma standalone, preservando estados de carga/error y el consumo del backend publico.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-backend/paramascotas-backend.component.css` ajusta la densidad del bloque movido: `Estado publico` pasa a 3 columnas dentro de la columna principal y el strip de productos publicos a 3 columnas desktop, 2 en pantallas medianas y 1 en mobile estrecho.
- `Dashboard/tests/e2e/paramascotas-backend-layout.spec.ts` ahora valida tambien que `paramascotas-public-strip` viva dentro de `.paramascotas-dashboard-column--main` y que el gap real contra `Pedidos recientes` sea compacto.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run lint`, `npm run type:check`, `npm run docker:health` y `node ./node_modules/playwright/cli.js test tests/e2e/paramascotas-backend-layout.spec.ts tests/e2e/layout-density.spec.ts` (33/33).
- Validado por APISIX con resolucion a `192.168.100.229`: `https://paramascotasec.com/dashboard/paramascotas-backend` responde `200`, mantiene `overflow: 0`, `titleSize: 14`, `publicGap: 10`, `catalogGap: 10`, `publicInMainColumn: true` y `catalogInMainColumn: true`.

### 2026-06-16 - Dashboard QA: Paramascotas Backend sin Huecos Verticales

Objetivo: corregir el gran espacio vacio que dejaba `Paramascotas backend` entre la grafica de ventas y los bloques inferiores, para que la pantalla use mejor el ancho y la altura disponibles.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-backend/paramascotas-backend.component.html` reemplaza la grilla unica con auto-placement por dos columnas apiladas explicitas: columna principal con `Ventas del periodo` + `Pedidos recientes`, y columna lateral con `Inventario`/`Pedidos`/`Alertas` + `Ranking de productos`.
- La misma vista agrega clases semanticas (`paramascotas-panel--sales`, `paramascotas-panel--recent-orders`, `paramascotas-panel--product-ranking`) para estabilizar pruebas de layout y futuras iteraciones visuales.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-backend/paramascotas-backend.component.css` sustituye `paramascotas-dashboard-grid` por `paramascotas-dashboard-columns`, apila cada columna con `gap` controlado y reduce el `h1` de la vista a `14px` desktop / `12.5px` mobile para mantener coherencia con la escala compacta global.
- `Dashboard/tests/e2e/paramascotas-backend-layout.spec.ts` valida que no reaparezca el hueco vertical, midiendo las separaciones reales entre `Ventas del periodo` -> `Pedidos recientes` y `side-stack` -> `Ranking de productos`.
- `Dashboard/tests/e2e/layout-density.spec.ts` incorpora `/paramascotas-backend` a la auditoria global de tipografia compacta y overflow.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run lint`, `npm run type:check`, `npm run docker:health` y `node ./node_modules/playwright/cli.js test tests/e2e/paramascotas-backend-layout.spec.ts tests/e2e/layout-density.spec.ts` (33/33).
- Validado por APISIX con resolucion a `192.168.100.229`: `https://paramascotasec.com/dashboard/paramascotas-backend` responde `200`, queda con `titleSize: 14`, `overflow: 0`, `mainGap: 10` y `sideGap: 10`.

### 2026-06-16 - Dashboard QA: Catalogo de Productos y Usuarios en Vista de Lista

Objetivo: reemplazar las cards incomodas de `Catalogo > Productos` y `Catalogo > Usuarios` en el panel nativo de Paramascotas por listas densas, alineadas con la usabilidad de `Reporte de inventario`.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.html` elimina el bloque `paramascotas-user-card-grid` y deja `Usuarios` en tabla/lista operativa como vista principal.
- La misma vista de `Usuarios` mejora la primera columna con avatar por iniciales, identidad compacta y acciones agrupadas en fila.
- `Catalogo > Productos` deja de renderizar `paramascotas-product-card` y pasa a una tabla con columnas `Producto`, `Publicacion`, `Inventario`, `Trazabilidad`, `Precios` y `Acciones`, reutilizando el patron de lista del inventario.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.css` agrega estilos de tabla para productos/usuarios y elimina la conversion forzada de la tabla de usuarios a cards en mobile; ambas vistas mantienen scroll horizontal contenido como una lista real.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.ts` agrega `productInventoryLabel()` para no duplicar logica de estado de stock en el template.
- `Dashboard/tests/e2e/paramascotas-list-views.spec.ts` valida que `/paramascotas-panel/catalog/products` y `/paramascotas-panel/catalog/users` publiquen tablas y no cards.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run lint`, `npm run type:check`, `npm run docker:health`, `git -C Dashboard diff --check` y `node ./node_modules/playwright/cli.js test tests/e2e/paramascotas-list-views.spec.ts` (2/2).
- Validado por APISIX con resolucion a `192.168.100.229`: `https://paramascotasec.com/dashboard/paramascotas-panel/catalog/products` publica `12` filas en `.paramascotas-products-table` y `0` `.paramascotas-product-card`; `https://paramascotasec.com/dashboard/paramascotas-panel/catalog/users` publica `10` filas en `.paramascotas-users-table` y `0` `.paramascotas-user-card`; ambas rutas quedan sin overflow horizontal incoherente (`scrollWidth === clientWidth` a nivel de pagina).

### 2026-06-16 - Dashboard QA: Densidad Extendida y Pantallas de Estado Compactas

Objetivo: cerrar la percepcion de titulos gigantes y mobile inestable en mas rutas del Dashboard, incluyendo pantallas de estado que todavia conservaban estilos locales sobredimensionados.

Cambios:
- `Dashboard/src/app/features/public/pages/tenant-unavailable/tenant-unavailable.component.css`, `permission-denied.component.css` y `module-unavailable.component.css` se alinean al sistema compacto compartido: menos padding, iconos mas contenidos, `h1` y copy atados a variables de header del Dashboard y acciones full-width en mobile.
- `Dashboard/tests/e2e/layout-density.spec.ts` amplia la cobertura de regresion a 15 rutas reales del dashboard: `payment-gateway`, `pricing`, `company`, `currencies`, `permission-denied`, `tenant-unavailable`, `module-unavailable` y las rutas ya compactadas de usuarios, facturas, productos, inventario, monitoreo, tenant-admin y `paramascotas-panel/reporting/general`.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run lint`, `npm run type:check`, `npm run docker:health`, `git -C Dashboard diff --check` y `node ./node_modules/playwright/cli.js test tests/e2e/layout-density.spec.ts` (30/30).
- Validado por APISIX con resolucion a `192.168.100.229`: `https://paramascotasec.com/dashboard/paramascotas-panel/reporting/general` queda en `14px` desktop y `12.5px` mobile, `scrollWidth === clientWidth`, `userChipWidth=30` y texto de logout oculto; el HTML publicado referencia `styles-WTT3KHMP.css` y `main-4OLCV2VE.js`.

### 2026-06-16 - Dashboard QA: Facturas como Bandeja Operativa y Cobro Rapido

Objetivo: reemplazar la tabla basica de `Facturas` por una bandeja de cobranza/facturacion mas util, compacta y accionable, manteniendo el contrato API interno y el CRUD existente.

Cambios:
- `Dashboard/src/app/features/business/state/invoices.facade.ts` baja el `pageSize` inicial a 6 para que la paginacion real sea visible en QA y agrega `resetFilters()`.
- `Dashboard/src/app/features/business/data/invoices.fixtures.ts` amplia el dataset fixture por tenant, mezcla estados `paid`, `pending`, `overdue` y `draft`, define fechas de vencimiento coherentes y deja algunos avatars vacios para probar placeholder visual.
- `Dashboard/src/app/features/business/pages/invoice-list/*` rediseña la pantalla completa: cards de resumen clicables, buscador, filtro por estado, selector de pagina, chips de filtros activos, cards de factura con datos del cliente, estado, importe, items, cobro pendiente y acciones `Ver`, `Editar`, `Marcar pagada/Reabrir` y `Eliminar`.
- La misma pantalla incorpora una columna lateral de detalle con cliente, contacto, fechas, subtotal, impuesto, total e items de la factura seleccionada.
- `Dashboard/src/app/features/business/pages/invoice-add/invoice-add.component.html` elimina el texto visible heredado de "Template demo" y lo reemplaza por copy funcional.
- Se agregan validaciones e2e nuevas en `Dashboard/tests/e2e/invoice-workspace.spec.ts`, se incluye `/invoice-list?tenant=demo` en `layout-density.spec.ts` y se adapta el smoke historico de CRUD de facturas al nuevo DOM de cards.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run lint`, `npm run runtime:check`, `npm run docker:health`, `git -C Dashboard diff --check`, `node ./node_modules/playwright/cli.js test tests/e2e/layout-density.spec.ts tests/e2e/invoice-workspace.spec.ts` (17/17) y el smoke puntual `node ./node_modules/playwright/cli.js test tests/e2e/smoke.spec.ts --grep "fixture creates, edits, previews and deletes an invoice"` (1/1).
- Validado por APISIX con resolucion a `192.168.100.229`: `https://paramascotasec.com/dashboard/invoice-list?tenant=demo` responde con titulo `14px` desktop y `12.5px` mobile, `scrollWidth === clientWidth`, 6 cards iniciales, selector `6 / pag` visible y filtro `Vencidas` reduciendo la lista a 2 cards con chips activos.

### 2026-06-16 - Dashboard QA: Monitoreo Operativo con Drilldown y Filtros Reales

Objetivo: reemplazar la pantalla plana de `Monitoreo` por una consola operativa real, coherente con el resto del Dashboard y con filtros, breakdowns y detalle lateral accionables.

Cambios:
- `Dashboard/src/app/features/monitoring/models/monitoring.model.ts` amplía el contrato del resumen con breakdowns por severidad, estado, modulo y origen; los filtros tambien soportan `module` y `source`.
- `Dashboard/src/app/features/monitoring/data/monitoring.fixtures.ts` ahora siembra 8 eventos mas realistas por tenant demo de monitoreo y filtra por severidad, estado, modulo, origen, busqueda, pagina y tamano de pagina; el resumen expone breakdowns agregados y `latestCritical`.
- `Dashboard/src/app/features/monitoring/state/monitoring.facade.ts` adopta `pageSize` inicial de 6, agrega `setModule()`, `setSource()`, `setPage()` y `resetFilters()` para soportar drilldowns y paginacion real.
- `Dashboard/src/app/features/monitoring/pages/monitoring-list/*` rediseña la vista completa: KPIs clicables, toolbar compacta, chips de filtros activos, cards de incidentes con acciones, paginacion visible, paneles de severidad/estado/modulos/origenes y detalle lateral del evento seleccionado.
- `Dashboard/tests/e2e/monitoring-workspace.spec.ts` agrega una prueba de interaccion que valida filtrado por modulo y paginacion real; `Dashboard/tests/e2e/layout-density.spec.ts` ahora incluye tambien la ruta `/monitoring`.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run lint`, `npm run runtime:check`, `npm run docker:health`, `git -C Dashboard diff --check` y `node ./node_modules/playwright/cli.js test tests/e2e/layout-density.spec.ts tests/e2e/monitoring-workspace.spec.ts` (15/15).
- Validado por APISIX con resolucion a `192.168.100.229`: `https://paramascotasec.com/dashboard/monitoring?tenant=monitoring-demo` responde con titulo `14px` desktop y `12.5px` mobile, `scrollWidth === clientWidth`, 6 eventos iniciales, selector `4 / pag` visible y filtro por modulo `Inventario` reduciendo la lista a 1 evento y mostrando chips activos.

### 2026-06-16 - Dashboard QA: Densidad Global Blindada y Header Mobile Minimo

Objetivo: corregir de forma transversal la percepcion de titulos sobredimensionados y el header movil recargado, dejando una validacion automatica para evitar regresiones en otras pantallas.

Cambios:
- `Dashboard/src/dashboard-overrides.css` reduce un paso adicional la escala global de `app-page-header`, `breadcrumb`, headings y `card-header`, junto con paddinges y gaps del shell para aprovechar mejor el espacio en escritorio y mobile.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.css` alinea las rutas nativas de Paramascotas con esa densidad compartida: baja `Reporte general` y sus encabezados internos, reduce padding de cards y cierra una colision de selectores que dejaba algunos `card-header` a `12.5px`.
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.css` compacta el header movil: menos gap, controles de 30px, chip de usuario reducido a avatar y boton de logout solo con icono en pantallas pequenas para no competir con el contenido.
- `Dashboard/tests/e2e/layout-density.spec.ts` agrega una prueba Playwright de regresion que recorre rutas representativas en desktop/mobile y exige titulos compactos, ausencia de overflow horizontal y header movil condensado.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run lint`, `npm run runtime:check`, `npm run docker:health`, `git -C Dashboard diff --check` y `node ./node_modules/playwright/cli.js test tests/e2e/layout-density.spec.ts` (12/12).
- Validado por APISIX con resolucion a `192.168.100.229`: `https://paramascotasec.com/dashboard/paramascotas-panel/reporting/general`, `/dashboard/products?tenant=inventory-demo`, `/dashboard/inventory?tenant=inventory-demo` y `/dashboard/tenant-admin` quedan en `14px` desktop y `12.5px` mobile para el titulo principal, `12px` o menos en headers internos, `scrollWidth === clientWidth` y header movil con `userChipWidth=30` y texto de logout oculto.

### 2026-06-16 - Dashboard QA: Inventario Operativo y Fixtures con Query Real

Objetivo: llevar `Inventario` al mismo nivel operativo/visual que `Productos` y corregir un problema de fondo donde los fixtures del Dashboard no estaban leyendo query strings, dejando paginacion y filtros visuales sin efecto real.

Cambios:
- `Dashboard/src/app/features/inventory/pages/inventory-list/*` rediseña `Inventario` como panel util: resumen superior clicable por estado, cards responsivas por SKU, buscador, filtro, selector de pagina, detalle lateral, ajuste rapido y paginacion visible.
- Las cards de inventario ahora muestran SKU, producto, almacen, disponible, reservado, vendible, punto de reorden, faltante, costo y cobertura, con acciones `Ver`, `Restar 1` y `Sumar 1`.
- `Dashboard/src/app/features/inventory/state/inventory.facade.ts` agrega `setPage()` para paginacion real.
- `Dashboard/src/app/core/http/interceptors/fixture-backend.interceptor.ts` clona la request usando `request.urlWithParams` antes de llegar a los handlers mock; con eso los fixtures ya reciben query string real (`search`, `status`, `page`, `pageSize`) en inventario, productos y el resto de modulos que usan el backend fixture.
- `Dashboard/src/app/features/products/pages/products-list/products-list.component.ts` inicia con `pageSize: 4`, de modo que la paginacion del nuevo catalogo visual sea real y no solo decorativa.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run lint`, `npm run runtime:check`, `npm run docker:health` y `git -C Dashboard diff --check`.
- Playwright por APISIX con resolucion forzada a `192.168.100.229` valido `https://paramascotasec.com/dashboard/inventory?tenant=inventory-demo` y `https://paramascotasec.com/dashboard/products?tenant=inventory-demo` en mobile y desktop: titulos a `13px` mobile y `15px` desktop, `scrollWidth === clientWidth`, 4 cards por pagina en ambas rutas y paginacion real (`pageText` `["1","2"]`, `nextDisabled=false`).
- Tambien se verifico interaccion real en inventario: al pulsar `Stock bajo` queda 1 card y al pulsar `Sin stock` queda 1 card, confirmando que los widgets resumen ya filtran la data en vez de ser solo decorativos.

### 2026-06-16 - Dashboard QA: Catalogo de Productos Visual y Editable

Objetivo: convertir la vista generica de `Productos` en una pantalla de catalogo mas util y presentable, evitando la tabla plana y el formulario dominante que desperdiciaban espacio y no mostraban bien los productos.

Cambios:
- `Dashboard/src/app/features/products/pages/products-list/*` rediseña la pantalla como workspace real: tarjetas de producto responsivas, resumen visible filtrable por estado, detalle lateral del producto seleccionado, paginacion, buscador, filtro por estado, selector de pagina y editor lateral para crear/editar sin poner el formulario arriba de todo.
- Las tarjetas ahora muestran SKU, nombre, descripcion truncada con `title`, categoria, precio, costo, margen y acciones claras (`Ver`, `Editar`, `Duplicar`, `Activar/Archivar`, `Eliminar`) usando el store existente.
- `Dashboard/src/app/features/products/state/products.facade.ts` agrega `setPage()` para paginacion real.
- `Dashboard/src/app/features/products/data/products.fixtures.ts` deja el fixture menos artificial: mezcla estados `active`, `draft` y `archived`, y fuerza un caso sin imagen para validar placeholder elegante.
- Cuando el dataset trae las imagenes demo `product-img*.png` de baja calidad, la UI las reemplaza por covers visuales internos mas limpios con icono por categoria e inicial del producto, reservando la imagen real para cuando exista una util.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run lint`, `npm run runtime:check`, `npm run docker:health` y `git -C Dashboard diff --check`.
- Playwright por APISIX con resolucion forzada a `192.168.100.229` valido `https://paramascotasec.com/dashboard/products?tenant=inventory-demo` en mobile y desktop: titulos a `13px` mobile y `15px` desktop, `scrollWidth === clientWidth`, 5 tarjetas visibles, sidebar de detalle operativa y editor lateral visible al pulsar `Editar producto`; las capturas muestran el nuevo layout sin tabla fuera de pantalla ni imagenes demo borrosas.

### 2026-06-16 - Dashboard QA: Breadcrumb Compacto y Buscadores Mobile Visibles

Objetivo: terminar de normalizar la escala de titulos en pantallas fuera de Paramascotas y corregir el patron mobile donde varios buscadores quedaban ocultos por el CSS legacy del template.

Cambios:
- `Dashboard/src/app/shared/ui/breadcrumb/breadcrumb.component.html` y `.css` reemplazan el breadcrumb plano heredado por un encabezado compacto y consistente con el resto del Dashboard: titulo denso, trail pequeno, wrapping correcto y mobile sin desperdicio de espacio.
- `Dashboard/src/dashboard-overrides.css` agrega soporte global para `app-breadcrumb` y fuerza que los `navbar-search` dentro de `card-header` sigan visibles en mobile cuando no estan ocultos de forma explicita, manteniendo inputs/selects a ancho completo.
- `Dashboard/src/app/features/users/pages/users-list/*` compacta la barra de filtros de `Usuarios` para mobile, evitando que `Mostrar`, buscador y estado se monten o desaparezcan por reglas antiguas del template.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run runtime:check`, `npm run docker:health` y `git -C Dashboard diff --check`.
- Playwright por APISIX con resolucion forzada a `192.168.100.229` valido en mobile y desktop `https://paramascotasec.com/dashboard/paramascotas-panel/reporting/general`, `users-list?tenant=demo`, `users-grid?tenant=demo`, `products?tenant=inventory-demo`, `inventory?tenant=inventory-demo`, `monitoring?tenant=monitoring-demo`, `table-data?tenant=demo` y `marketplace?tenant=demo`: titulos a `13px` mobile y `15px` desktop, `scrollWidth === clientWidth` en todas las rutas probadas y buscadores visibles en `users-list`, `users-grid` y `marketplace`.

### 2026-06-16 - Dashboard QA: Facturacion Demo Responsive y Header sin Fuga Horizontal

Objetivo: corregir el siguiente lote de pantallas reales fuera del panel Paramascotas, priorizando facturacion demo con tablas anchas en mobile y el desborde residual del `navbar-header`.

Cambios:
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.css` resetea margenes/paddings horizontales del `row` y `col-auto` del header/footer shell para eliminar la fuga de ~4px que todavia aparecia en mobile por las clases Bootstrap.
- `Dashboard/src/app/features/business/pages/invoice-add/*` e `invoice-edit/*` convierten la tabla de items editable en una tabla responsive real: `data-label` por celda, tarjeta apilada en `<=767px`, boton `Agregar item` compacto y totales alineados sin salir del viewport.
- `Dashboard/src/app/features/business/pages/invoice-preview/*` compacta acciones, limita el header visual de la factura y transforma la tabla de items en layout apilado para mobile, manteniendo los datos de cliente, items y totales dentro de pantalla.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run lint`, `npm run runtime:check`, `npm run docker:health` y `git -C Dashboard diff --check`.
- Playwright por APISIX con resolucion forzada a `192.168.100.229` valido `https://paramascotasec.com/dashboard/invoice-preview?tenant=acme`, `https://paramascotasec.com/dashboard/invoice-add?tenant=acme`, `https://paramascotasec.com/dashboard/invoice-edit?tenant=acme` y `https://paramascotasec.com/dashboard/users-list?tenant=demo`: `scrollWidth === clientWidth`, sin tablas sobredimensionadas, `Agregar item` baja a `11.5px` y `32px` de alto, y el `navbar-header .row` queda dentro del viewport (`left: 8`, `right: 385` en mobile de 393px).

### 2026-06-16 - Dashboard QA: Paramascotas Backend Compacto y Tablas Mobile Reales

Objetivo: alinear la vista `Paramascotas backend` con la escala compacta del resto del Dashboard y eliminar las tablas anchas que en mobile dependian de scroll horizontal.

Cambios:
- `Dashboard/src/app/features/dashboard/pages/paramascotas-backend/paramascotas-backend.component.css` baja la escala propia de la pantalla (`h1`, `h2`, copys, metricas, botones y paddings), compacta KPIs y hace que mobile use una jerarquia similar al panel nativo.
- La barra superior de `Paramascotas backend` ahora se comporta mejor en mobile: filtros mas densos, acciones compactas y controles apilados sin desbordes.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-backend/paramascotas-backend.component.html` agrega `data-label` a las tablas de `Pedidos recientes` y `Ranking de productos`; la CSS las transforma en tarjetas apiladas en `<=767px`, evitando que salgan de pantalla.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run lint`, `npm run runtime:check`, `npm run docker:health` y `git -C Dashboard diff --check`.
- Playwright por APISIX con resolucion forzada a `192.168.100.229` valido `https://paramascotasec.com/dashboard/paramascotas-backend`: en mobile `h1` queda en `13px`, `h2` en `11.5px`, `scrollWidth === clientWidth`, ambas tablas bajan a `347px` de ancho real y se renderizan como tarjetas apiladas; en desktop `scrollWidth === clientWidth` y las tablas siguen funcionales.

### 2026-06-16 - Dashboard QA: Shell Mobile Mas Compacto y Acciones de Header Densas

Objetivo: terminar de corregir el shell mobile y los headers de accion del Dashboard para que el panel no vuelva a sentirse sobredimensionado en pantallas pequenas.

Cambios:
- `Dashboard/src/app/shared/ui/page-header/page-header.component.css` reduce la densidad visible de las acciones del `PageHeader`: botones de cabecera con tipografia menor y padding compacto, especialmente en mobile.
- `Dashboard/src/dashboard-overrides.css` endurece el override mobile para botones de accion en `PageHeader` y `card-header`, y reduce gap/margin del header compartido para que las vistas no desperdicien alto al inicio.
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.css` reordena el topbar `<=767px`: `theme toggle`, chip de usuario y `Cerrar sesion` quedan en una sola fila util cuando el ancho lo permite; el drawer mobile baja a `272px` y solo vuelve a ancho completo en `<=360px`.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run lint`, `npm run runtime:check`, `npm run docker:health` y `git -C Dashboard diff --check`.
- Playwright por APISIX con resolucion forzada a `192.168.100.229` valido `https://paramascotasec.com/dashboard/paramascotas-panel/reporting/general`, `https://paramascotasec.com/dashboard/paramascotas-panel/catalog/products` y `https://paramascotasec.com/dashboard/tenant-admin` en desktop/mobile: `h1` en `15px` desktop / `13px` mobile, `Actualizar` en mobile baja a `11.5px` y `39.3px` de alto, navbar mobile baja a `74px`, `Cerrar sesion` queda en `116.5px x 32px`, drawer en `272px` y sin overflow horizontal.

### 2026-06-16 - Dashboard QA: Titulos Compactos con Datos Reales y Proxy Interno Corregido

Objetivo: cerrar el ajuste transversal de titulos/mobile en las pantallas reales del Dashboard y corregir el proxy interno para que los reportes nativos consuman el backend sin exigir login web adicional.

Cambios:
- `Dashboard/src/dashboard-overrides.css`, `PageHeaderComponent` y `side-nav.component.css` bajan otra vez la escala compartida: H1 reales en `15px` desktop / `13px` mobile, headers internos en `13px` / `11.5px`, drawer mobile estable en `280px` y `Cerrar sesion` reacomodado sin desperdicio de altura.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.css` alinea la escala propia del panel nativo con el override global para que `Reporte general`, `Ventas por categoria`, `Productos por venta neta` y demas subpantallas no reintroduzcan titulos gigantes por reglas tardias del template.
- Se limpio el token interno del Dashboard: `Dashboard/.env` deja de almacenar `TECNOLTS_INTERNAL_PROXY_TOKEN`; `docker-compose.yml` ahora inyecta `INTERNAL_PROXY_TOKEN` via `env_file` desde el backend compartido y `Dashboard/nginx.conf` sigue enviando `X-Internal-Proxy-Token` solo en runtime.
- `paramascotasec-backend/docker/nginx.conf` ahora pasa `HTTP_X_INTERNAL_PROXY_TOKEN` a PHP-FPM, corrigiendo el salto `dashboard -> backend-web -> backend-app` que estaba rompiendo la autenticacion inter-contenedores.

Operacion y verificacion:
- Se redeplego `Dashboard` con `cd Dashboard && npm run docker:up` y luego solo `backend` con `./scripts/deploy-development.sh backend`; no se desplego production ni se tocaron DB, Facturador, certificados o SRI.
- Pasaron `npm run env:check`, `npm run type:check`, `npm run lint`, `npm run runtime:check`, `npm run docker:health`, `php -l public/index.php src/Core/Auth.php src/Controllers/AuthController.php`, `git -C Dashboard diff --check`, `git -C paramascotasec-backend diff --check` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `GET /dashboard/api/admin/report?period=2026-06` responde `200` con datos reales.
- Playwright con resolucion forzada a `192.168.100.229` valido `https://paramascotasec.com/dashboard/paramascotas-panel/reporting/general` y `https://paramascotasec.com/dashboard/tenant-admin`: H1 en `15px` desktop / `13px` mobile, cards compactas, drawer mobile sin overflow y `Reporte general` cargando metricas reales en vez de `401`.

### 2026-06-16 - Dashboard QA: Escala Transversal y Mobile sin Desperdicio

Objetivo: terminar de compactar la escala visual compartida del Dashboard para que todas las pantallas reales del panel hereden titulos coherentes y el shell mobile deje de desperdiciar espacio con botones y drawer sobredimensionados.

Cambios:
- `Dashboard/src/dashboard-overrides.css` reduce otra vez la escala global de `h1-h6`, `PageHeader`, `display-*`, `fs-*` y `text-*`, compacta iconos/titulos/descripcion del header y evita que las acciones del `PageHeader` vuelvan a ocupar todo el ancho en mobile.
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.css` estrecha el drawer mobile a `280px`, baja padding/gaps del navbar, deja el chip de usuario a ancho util y cambia `Cerrar sesion` de bloque enorme a boton compacto, manteniendo `overflow-x` en cero.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.css` baja la escala interna del panel nativo (`--pm-panel-title-*`), reduce paddings de cards y evita que headers/modales/acciones del panel vuelvan a crecer por reglas tardias del template.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron DB, Facturador, SRI, certificados o datos financieros.
- Pasaron `npm run type:check`, `npm run lint`, `npm run runtime:check`, `npm run docker:health`, `git -C Dashboard diff --check` y `./scripts/check-container-connectivity.sh development`.
- Playwright por APISIX con resolucion forzada a `192.168.100.229` valido desktop/mobile en `https://paramascotasec.com/dashboard/paramascotas-panel/reporting/general?tenant=paramascotasec` y `https://paramascotasec.com/dashboard/tenant-admin?tenant=demo`: titulos en `16px/14px`, headers de card en `12px-12.5px`, boton `Actualizar` ya no full-width, logout mobile en `119px`, drawer mobile en `280px` y sin overflow horizontal (`scrollWidth === innerWidth`).

### 2026-06-16 - Dashboard QA: Superadmin SaaS con Ecommerce Configurable

Objetivo: convertir `tenant-admin` en una consola SaaS mas cercana al objetivo final, para que el superadmin no se limite a marcar checkboxes sino que pueda configurar tenants y un Ecommerce unificado por giro de negocio.

Cambios:
- `tenant-module-catalog.ts` agrega el modelo base de Ecommerce configurable: giros (`petshop`, `technology`, `fashion`, `hardware`, `supermarket`, `pharmacy`, `other`), capacidades operativas (`products`, `categories`, `attributes`, `variants`, `images`, `inventory`, `pricing`, `orders`, `invoicing`, `payments`, `customers`, `shipping`, `reporting`) y helpers de normalizacion/resumen.
- `tenant-admin.model.ts`, `tenant-fixture.store.ts`, `tenant-admin.fixtures.ts`, `tenant-admin-api.service.ts` y `tenant-admin.facade.ts` extienden el tenant summary con `ecommerceConfiguration` y agregan `PATCH /admin/tenants/:id/configuration` para guardar vertical, nombre comercial, capacidades y notas del modulo Ecommerce.
- `tenant-admin.component.*` se redisenan como consola de planes: tarjetas KPI, alta de tenant con paquetes SaaS, preset inicial de Ecommerce, resumen de tenants, configuracion inline por tenant y combinacion de modulos sin separar verticales de ecommerce por industria.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run lint`, `git -C Dashboard diff --check`, `npm run runtime:check` y `npm run docker:health`.
- La ejecucion focalizada de `ng test` no fue posible en el host porque el Angular CLI exige Node `v22.22.3+` y el host tiene `v22.22.2`; se valido el bundle dentro del build Docker con Node 26.
- Playwright por APISIX con resolucion forzada a `192.168.100.229` valido `https://paramascotasec.com/dashboard/tenant-admin?tenant=demo` en desktop/mobile: 4 KPIs de cabecera, configurador inline con 13 capacidades Ecommerce, header mobile sin overflow horizontal y guardado funcional de configuracion (`Retail tech QA`) reflejado en el resumen del tenant.

### 2026-06-16 - Dashboard QA: Escala Global de Pantallas y Header Mobile Compacto

Objetivo: corregir que varias pantallas siguieran heredando tipografias sobredimensionadas del template y que el header mobile desperdiciara espacio con chips y logout mal acomodados.

Cambios:
- `dashboard-overrides.css` baja otra vez la escala compartida de headings, `PageHeader`, utilidades `text-*` y `display-*`; ademas fija `--font-2xxl`, compacta paddings de `card-header/card-body` y fuerza controles `w-auto` a ocupar ancho util en mobile.
- `paramascotas-panel.component.css` declara variables de escala propias (`--pm-panel-title-*`) y agrega un bloque final de overrides para que los headers internos, modales y metricas no vuelvan a crecer por reglas tardias del mismo componente.
- `side-nav.component.css` reorganiza el header `<=767px` en dos filas limpias: chip de usuario a ancho util, slug oculto en mobile y boton `Cerrar sesion` a ancho completo tambien en tablets pequenas, no solo en `<=575px`.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run lint`, `git -C Dashboard diff --check`, `npm run runtime:check` y `npm run docker:health`.
- Validado por APISIX con resolucion forzada a `192.168.100.229` y Playwright:
  - `https://paramascotasec.com/dashboard/paramascotas-panel/reporting/general?tenant=paramascotasec`: `PageHeader` 17px desktop / 15px mobile, card title 13px desktop / 12px mobile, header mobile en grid de 74px sin overflow horizontal.
  - `https://paramascotasec.com/dashboard/tenant-admin?tenant=demo`: `PageHeader` 17px y titulo de card 13px, confirmando que el override global tambien aplica fuera del panel de Paramascotas.

### 2026-06-16 - Dashboard QA: Usuarios con Paginacion y Navegacion a Pedidos

Objetivo: convertir la vista nativa `Usuarios` en una tabla operativa real, con paginacion, filtros persistentes y acciones conectadas a otras pantallas del dashboard en lugar de quedarse como listado plano.

Cambios:
- `Paramascotas panel > Usuarios` agrega paginacion local sobre datos reales (`10/20/50` filas), contador `mostrando X-Y`, cambio de pagina, resumen por pagina y reseteo automatico de pagina al buscar o filtrar.
- Los filtros de usuarios pasan a setters explicitos para controlar mejor estado y UX; `loadUsers()` vuelve a la primera pagina tras recargar datos.
- Cada usuario destacado y cada fila de tabla puede abrir `Pedidos`, `Email` y `WhatsApp` cuando hay datos validos, ademas de `Editar` y `Desbloquear`.
- `openUserOrders()` navega a `/dashboard/paramascotas-panel/operations/admin-orders` con `tenant` y `search` en query string; la vista `Pedidos` ahora hidrata `orderSearch` desde la URL al entrar, limpiando los otros filtros operativos para mostrar el contexto del usuario.
- La tabla de usuarios mantiene truncado elegante con `title`, sigue adaptandose a mobile cards y suma footer de paginacion responsive.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se tocaron backend, DB, Facturador, SRI, certificados ni produccion.
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:health`, `npm run runtime:check`, `git diff --check` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con resolucion local de `paramascotasec.com`: `Usuarios` toma `search=ana` desde la URL, publica el selector de filas `10/20/50 por pagina` sin overflow en desktop/mobile, y `Pedidos` toma `search=ana@paramascotas.test` desde la query string al abrir la ruta.

### 2026-06-16 - Dashboard QA: Tipografia Global Compacta y Drawer Mobile

Objetivo: corregir que siguieran apareciendo titulos desproporcionados fuera de `Paramascotas backend` y cerrar el problema del sidebar mobile que aun podia asomarse en estado colapsado.

Cambios:
- `Dashboard/src/dashboard-overrides.css` compacta la escala global del shell: `h1/h2/h3`, `PageHeader`, tarjetas, botones, footer y breakpoints mobile usan tamanos mas densos para que reportes, formularios y vistas legacy no vuelvan a heredar tipografia gigante del template.
- `Dashboard/src/app/shared/ui/page-header/page-header.component.css` reduce icono, eyebrow, titulo y descripcion en desktop/mobile para que todos los encabezados del Dashboard queden alineados al mismo patron compacto.
- `Dashboard/src/app/layout/shell/side-nav/side-nav.component.css` refuerza el drawer mobile: el sidebar oculto queda realmente fuera del viewport, el boton de cierre no se filtra cuando esta cerrado y la barra superior reorganiza tenant, usuario y logout sin romperse en pantallas angostas.
- `Dashboard/src/app/features/dashboard/pages/paramascotas-panel/paramascotas-panel.component.css` endurece la escala compacta de las pantallas nativas Paramascotas para que `Reporte general` y vistas afines no vuelvan a mostrar headers sobredimensionados.
- Las pantallas publicas `tenant-unavailable`, `module-unavailable` y `permission-denied` tambien se compactan para mantener coherencia visual y mejor uso del espacio en mobile.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se tocaron backend, DB, Facturador, SRI, certificados ni produccion.
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:health`, `npm run runtime:check`, `git diff --check` y `./scripts/check-container-connectivity.sh development`.
- `npm run build` local en el host sigue bloqueado por Node `v22.22.2` mientras Angular CLI exige `v22.22.3+`; la compilacion efectiva para QA se valido dentro del build Docker.
- Validado con Playwright por APISIX usando resolucion local de `paramascotasec.com`: en `/dashboard/paramascotas-panel/reporting/general?tenant=paramascotasec` el titulo principal queda en 15px desktop / 14px mobile, el titulo de tarjeta en 14px / 12px y el sidebar permanece oculto en mobile (`visibility:hidden`, `left:-328`) sin overflow horizontal.

### 2026-06-16 - Dashboard QA: Tablas Legacy Responsivas y Calendario Mobile

Objetivo: extender la correccion visual fuera de las pantallas Paramascotas, eliminando desbordes residuales del template legacy en listas de usuarios/facturas/productos/inventario/monitoreo, DataTable demo y toolbar del calendario en mobile.

Cambios:
- `dashboard-overrides.css` agrega helpers globales `table-fit` y `table-card-mobile` para convertir tablas legacy en tarjetas legibles en mobile, sin scroll lateral ni headers gigantes, y para forzar ajuste de columnas en vistas con muchas celdas.
- `Users list`, `Invoice list`, `Products list`, `Inventory list`, `Monitoring list` y `UI Kit > Table Data` se marcan con esos helpers y cada celda recibe `data-label`, alineando el comportamiento responsive con el patron ya aplicado en `Paramascotas panel`.
- `Inventory` y `Monitoring` dejan de desbordar incluso en desktop al usar layout de tabla ajustado al ancho disponible.
- `Calendar` mueve el fix del toolbar movil a overrides globales porque FullCalendar inyecta DOM fuera del alcance del CSS encapsulado; los grupos de botones ahora se reordenan sin salir del viewport.
- `Kanban` ajusta badges y botones para que el tag no se salga del card en mobile.

Operacion y verificacion:
- Se reconstruyo solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se tocaron backend, DB, Facturador, SRI, certificados ni produccion.
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:health` y `npm run runtime:check`.
- Validado con Playwright por APISIX en desktop 1365x900 y mobile 390x900: `users-list`, `roles`, `invoice-list`, `products`, `inventory`, `monitoring`, `email`, `chat-message`, `calendar-main`, `kanban`, `blog` y `table-data` responden 200, quedan con overflow 0, sin elementos fuera del viewport y con sidebar cerrado en mobile.

### 2026-06-16 - Dashboard QA: Ecommerce Unificado y Validacion Visual APISIX

Objetivo: alinear el modelo SaaS del Dashboard con el requisito vigente de un unico modulo `Ecommerce` configurable por negocio, y verificar que las pantallas principales ya no muestren titulos gigantes ni desbordes en mobile.

Cambios:
- Se elimino del codigo del Dashboard el modelo visible separado `ecommerce-petshop` / `ecommerce-technology`; `ModuleKey`, catalogo de modulos, permisos, fixtures, rutas y navegacion usan ahora un unico modulo `ecommerce`.
- El paquete de negocio `Ecommerce` del superadmin describe configuracion por giro comercial y cubre catalogo, imagenes, inventario, precios, pedidos, pagos, facturacion, envios, reportes y trazabilidad como modulos internos configurables.
- Las rutas Paramascotas reales (`Paramascotas backend`, reportes, monitoreo, catalogo, operacion y finanzas) quedan protegidas por `ecommerce.read`, no por verticales petshop/tecnologia.
- El superadmin refuerza contencion responsive en cards, chips y encabezados para evitar textos desbordados al administrar modulos de tenants.

Operacion y verificacion:
- Se reconstruyo solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se tocaron backend, DB, Facturador, SRI, certificados ni produccion.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run docker:health`, `npm run runtime:check` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/tenant-admin?tenant=paramascotasec` y `/dashboard/paramascotas-panel/reporting/general?tenant=paramascotasec` responden 200.
- Validado con Playwright por APISIX en desktop 1365x900 y mobile 390x900: `tenant-admin`, `paramascotas-backend`, `Reporte general`, `Reporte de ventas`, `Productos x Compra` y `Productos` quedan con overflow 0, sin elementos fuera del viewport, sidebar cerrado en mobile y encabezados maximos de 16-18px.

### 2026-06-16 - Dashboard QA: Tablas Responsivas y Editor de Imagenes

Objetivo: continuar la auditoria visual del Dashboard Paramascotas contra el objetivo de no tener tablas ni controles fuera de la zona observable, especialmente en reportes y editor de productos.

Cambios:
- Se auditaron rutas Paramascotas con Playwright por APISIX en desktop y mobile usando datos simulados para forzar tablas, productos, pedidos, compras y graficas.
- `Reporte de ventas`, `Reporte de trazabilidad` y `Productos x Compra` convierten sus tablas criticas en tarjetas legibles en mobile mediante `paramascotas-card-table` y `data-label` por celda.
- Las tablas de lotes de compra y lineas de factura de compra dejan de imponer min-width amplio en estas vistas, evitando scroll interno innecesario.
- El editor de imagenes de `Productos` reorganiza miniatura/galeria en una grilla compacta con campos explicitos para URL, archivo, alt, ancho y alto; las acciones quedan en fila propia.
- Se agrego reset responsive para que los campos de imagen no creen columnas implicitas cuando la vista colapsa a una sola columna.

Operacion y verificacion:
- Se reconstruyo solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se tocaron backend, DB, Facturador, SRI, certificados ni produccion.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run docker:health`, `npm run runtime:check`, `git diff --check` en `Dashboard` y `paramascotasec`, y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/reporting/sales?tenant=paramascotasec` y `/dashboard/paramascotas-panel/catalog/products?tenant=paramascotasec` responden 200.
- Validado con Playwright por APISIX en desktop 1365x900 y mobile 390x900: `Reporte de ventas`, `Reporte de trazabilidad`, `Productos x Compra` y `Productos` quedan con overflow 0, sin elementos fuera del viewport y con encabezados maximos de 16-17px.

### 2026-06-16 - Dashboard QA: Pedidos con Busqueda y Contacto Operativo

Objetivo: acercar `Operacion > Pedidos` al flujo real de `/my-account`, manteniendo la escala compacta global y corrigiendo usabilidad mobile con busqueda, filtros accionables y detalle operativo.

Cambios:
- `Pedidos` agrega busqueda global por pedido, cliente, telefono, correo, producto, documento, direccion y notas, combinable con filtros de fecha, estado, entrega y pago.
- Los resumenes de entrega y pago ahora son accionables y alternan filtros sin depender solo de la tabla.
- Las tarjetas y tabla de pedidos agregan acciones directas para `Detalle`, `WhatsApp`, `Email` y `Comprobante` cuando aplica.
- El modal de pedido agrega una franja de preparacion operativa con contacto, facturacion, operacion y comprobante, ademas de botones de contacto en el bloque del cliente.
- Se agregan estilos compactos y responsive para toolbar, botones, tabla, cards y modal, evitando scroll horizontal y textos cortados en mobile.
- No se cambio el contrato API: sigue usando `GET /api/orders`, `GET /api/orders/:id`, `PATCH /api/orders/:id/status` y URL de comprobante mediante el proxy interno directo del Dashboard.

Operacion y verificacion:
- Se reconstruyo solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se tocaron backend, DB, Facturador, SRI, certificados ni produccion.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run docker:health`, `npm run runtime:check`, `git diff --check` en `Dashboard` y `paramascotasec`, y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/operations/admin-orders?tenant=paramascotasec` responde 200.
- Validado con Playwright por APISIX en desktop 1440x1000 y mobile 390x900 usando datos simulados: busqueda `Procan`, filtro de entrega, apertura de detalle, cards, tabla y modal quedan sin overflow horizontal.

### 2026-06-16 - Dashboard QA: Escala Global de Titulos y Drawer Mobile

Objetivo: corregir que pantallas del Dashboard volvieran a mostrar titulos sobredimensionados del template y que la version mobile dejara una barra lateral estrecha montada sobre el contenido.

Cambios:
- `dashboard-overrides.css` refuerza la escala global de encabezados y clases grandes del template dentro de `dashboard-main`, con contencion de ancho para cards, grids, filas, tablas, botones y formularios.
- `Paramascotas panel` agrega reglas finales de tipografia compacta para `h1/h2/h3`, clases `display-*`, `text-*` grandes y headers internos, evitando que nuevas pantallas hereden tamaños gigantes.
- El shell mobile cambia el sidebar a drawer real: oculto fuera de pantalla en `max-width:1199px`, ancho maximo controlado, backdrop clicable y labels visibles solo cuando el menu esta abierto.
- Se agregan reglas mobile para filtros, tabs, botones y chips de Paramascotas, evitando overflow horizontal y textos cortados.

Operacion y verificacion:
- Se reconstruyo solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se tocaron backend, DB, Facturador, SRI, certificados ni produccion.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run docker:health`, `npm run runtime:check`, `git diff --check` en `Dashboard` y `paramascotasec`, y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-backend`, `/dashboard/paramascotas-panel/operations/admin-orders` y `/dashboard/paramascotas-panel/catalog/products` responden 200.
- Validado con Playwright por APISIX en desktop 1440x1000 y mobile 390x900: `Reporte general` queda con titulo 16-17px y H2 14px, `Paramascotas backend`, `Pedidos` y `Productos` no tienen overflow horizontal, y el menu mobile abre como drawer con backdrop.

### 2026-06-16 - Dashboard QA: Balances con Decisiones Accionables

Objetivo: acercar `Operacion > Balances` al panel de `/my-account`, haciendo que el balance no sea solo lectura de tendencias sino una vista de decision con acciones directas, grafica compacta y mejor comportamiento mobile.

Cambios:
- `Balances` agrega un bloque `Acciones recomendadas` con tarjetas accionables para rentabilidad, obligaciones, pedidos, IVA/envio y trazabilidad.
- Cada accion navega a la pantalla nativa correspondiente: margenes, gastos, pedidos, impuestos o trazabilidad.
- Se agrega grafica Apex `Composicion financiera`, comparando utilidad bruta, gastos del periodo, gastos pagados, pendientes/vencidos, ajustes y utilidad neta.
- Las acciones calculan margen neto, margen bruto, margen de caja, obligaciones, IVA y venta neta desde los datos ya consumidos de stats/reporte/gastos.
- Se agregan estilos compactos y responsive para evitar desbordes y textos montados en desktop/mobile.
- No se cambio el contrato API: la vista sigue usando `admin/report`, `admin/dashboard/stats`, `admin/expenses`, `admin/financial-periods`, productos, pedidos, inventario y compras mediante el proxy interno directo del Dashboard.

Operacion y verificacion:
- Se reconstruyo solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se tocaron backend, DB, Facturador, SRI, certificados ni produccion.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run docker:health`, `npm run runtime:check`, `git diff --check` en `Dashboard` y `paramascotasec`, y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/operations/balances?tenant=paramascotasec` responde 200.
- Validado con Playwright en 1365x900 y 390x844 usando datos simulados: 5 acciones, grafica de composicion, grafica de tendencia, tarjetas de tendencia, navegacion a margenes, titulos compactos, sin overflow horizontal y sidebar contenido en mobile.

### 2026-06-16 - Dashboard QA: Catalogos Operativos con Graficas y Busqueda Global

Objetivo: acercar `Catalogo > Catalogos operativos` a `/my-account`, haciendo visible la salud de referencias reutilizables, busqueda global y campos completos de proveedor sin sacrificar densidad ni mobile.

Cambios:
- `Catalogos operativos` agrega overview compacto con KPIs accionables para catalogos, vacios, atencion, media y contactos.
- Se agregan dos graficas Apex: opciones por catalogo y salud de catalogos, usando los datos de `GET /api/admin/settings/product-reference-data`.
- La busqueda global filtra catalogos y filas por categoria, marca, proveedor, contacto, direccion, notas, tallas, colores y demas opciones reutilizables.
- La lista de catalogos muestra conteo y alerta especifica: categorias sin imagen publica, marcas sin logo, proveedores sin contacto o catalogos vacios.
- El formulario de proveedores ahora expone `Contacto`, `Direccion` y `Notas`, campos que ya existian en el modelo pero no estaban disponibles en la pantalla.
- Categorias y marcas muestran fallback visual cuando no tienen imagen/logo, evitando filas pobres o sin contexto.
- No se cambio el contrato API: sigue usando `GET/PUT /api/admin/settings/product-reference-data` y subidas existentes por el proxy interno directo del Dashboard.

Operacion y verificacion:
- Se reconstruyo solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se tocaron backend, DB, Facturador, SRI, certificados ni produccion.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run docker:health`, `npm run runtime:check`, `git diff --check` en `Dashboard` y `paramascotasec`, y `./scripts/check-container-connectivity.sh development`.
- `npm run build` local no pudo ejecutarse por Node del host `v22.22.2`; el build equivalente paso dentro de Docker con Node 26 durante `npm run docker:up`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/catalog/catalogs?tenant=paramascotasec` responde 200.
- Validado con Playwright en 1365x900 y 390x844 usando datos simulados: 5 KPIs, 2 graficas, busqueda por marca, filtros de contacto, campos de proveedor, titulos compactos, sin overflow horizontal y sidebar contenido en mobile.

### 2026-06-16 - Dashboard QA: Cotizaciones con Busqueda, WhatsApp e Impresion

Objetivo: mejorar `Operacion > Cotizaciones` para que el historial sea consultable, accionable y compacto en desktop/mobile, manteniendo paridad operativa con `/my-account` sin cambiar contratos de API.

Cambios:
- `Cotizaciones` agrega controles superiores compactos de busqueda, estado y limpieza; la busqueda cubre ID, cliente, documento, email, telefono, direccion, cupon, notas, estado, venta convertida, fechas e items.
- El detalle de cotizacion agrega acciones directas `Imprimir` y `WhatsApp`; la URL normaliza telefonos Ecuador a `593...` y el comprobante imprimible se genera desde los datos ya cargados.
- La tabla reciente agrega columnas `Items` y `Acciones`, con impresion y WhatsApp por fila; los contadores y filtros se mantienen sincronizados con KPIs y seguimiento.
- No se cambio el contrato API: sigue usando `GET/POST /api/admin/quotes` y las rutas existentes de conversion mediante el proxy interno directo del Dashboard.

Operacion y verificacion:
- Se reconstruyo solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se tocaron backend, DB, Facturador, SRI, certificados ni produccion.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run build`, `npm run docker:health`, `npm run runtime:check`, `git diff --check` en `Dashboard` y `paramascotasec`, y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/operations/quotations?tenant=paramascotasec` responde 200.
- Validado con Playwright en 1365x900 y 390x844 usando datos simulados: KPIs, 2 graficas, busqueda por direccion/nota, filtro de vencidas, boton limpiar, WhatsApp, impresion, titulos compactos, sin overflow horizontal y sidebar contenido en mobile.

### 2026-06-16 - Dashboard QA: Usuarios con Contacto, Seguridad y Filtros Operativos

Objetivo: acercar `Catalogo > Usuarios` a `/my-account`, mostrando mejor datos de contacto, direccion, registro y bloqueos de seguridad sin perder densidad ni romper mobile.

Cambios:
- `Usuarios` agrega KPIs accionables para clientes, admins, verificados, bloqueados, con direccion, con telefono y nuevos 30 dias; cada tarjeta aplica filtros sobre el listado.
- La busqueda ahora incluye direccion, tipo/documento, empresa, telefono, fechas de registro/actualizacion y metadatos de bloqueo de seguridad.
- Las tarjetas de usuarios muestran fecha de registro, direccion y bloqueos activos; los bloqueos `order_pricing_tamper` exponen campos detectados como `subtotal`, `grand_total` o `discount_total`.
- La tabla agrega columnas compactas de registro, contacto y direccion con truncado contenido; en mobile conserva tarjetas sin overflow horizontal.
- El formulario cambia `Tipo documento` a selector controlado (`Sin documento`, `Cedula`, `RUC`, `Pasaporte`, `Otro`) como en `/my-account`; no cambia firmas ni contratos de API.

Operacion y verificacion:
- Se reconstruyo solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se tocaron backend, DB, Facturador, SRI, certificados ni produccion.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run docker:health`, `npm run runtime:check`, `git diff --check` en `Dashboard` y `paramascotasec`, y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/catalog/users?tenant=paramascotasec` responde 200.
- Validado con Playwright en 1440x900 y 390x844 usando datos simulados: H1 16px, 7 KPIs, 2 graficas, busqueda por direccion y bloqueo, filtros de direccion/telefono/nuevos, selector de documento, texto de seguridad visible, sin overflow horizontal y sidebar oculto en mobile.

### 2026-06-16 - Dashboard QA: Facturas PDF con Busqueda Ampliada

Objetivo: mejorar `Operacion > Facturas PDF` para que el historial RIDE sea compacto, consultable y util en desktop/mobile sin depender de titulos grandes ni filtros genericos.

Cambios:
- La busqueda de facturas ahora cubre clave de acceso, secuencial, referencia origen, autorizacion, fechas de emision/contabilidad/pedido, periodo financiero, cliente, documento, correo, totales, establecimiento, punto de emision, ambiente, estado SRI, anulacion/reemision, errores operativos y disponibilidad de PDF.
- Los controles usan `paramascotas-billing-controls` dedicado, con columnas compactas en escritorio, una columna en mobile y boton `Limpiar`; ya no heredan la grilla de inventario.
- No se cambio el contrato API: sigue consumiendo `GET /api/admin/billing/rides?limit=150` mediante el proxy interno directo del Dashboard; las acciones de abrir PDF y anular/reemitir quedan sobre las firmas existentes.

Operacion y verificacion:
- Se mantuvo el despliegue solo del Dashboard QA con `cd Dashboard && npm run docker:up`; no se tocaron backend, DB, Facturador, SRI, certificados ni produccion.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run docker:health`, `npm run runtime:check`, `git diff --check` en `Dashboard` y `paramascotasec`, y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/operations/billing-rides?tenant=paramascotasec` responde 200.
- Validado con Playwright en 1440x900 y 390x844 usando datos simulados: titulo 16px, 2 graficas renderizadas, busqueda por periodo/autorizacion/PDF generable, boton limpiar, sin overflow horizontal y sidebar oculto en mobile.
- Auditoria Playwright transversal por APISIX sobre 29 rutas reales de Paramascotas: todas responden 200, H1 entre 16px y 18px, sin overflow horizontal en desktop/mobile y sidebar con ancho visible 0 en mobile.

### 2026-06-16 - Dashboard QA: Gastos con Busqueda Operativa

Objetivo: mejorar `Precios y finanzas > Gastos` para que el listado nativo sea navegable cuando hay muchos registros, manteniendo la paridad de datos y acciones con `/my-account`.

Cambios:
- `Gastos del periodo` agrega busqueda nativa por descripcion, categoria, estado, tipo, metodo de pago, referencia, notas, origen, periodo financiero, fechas y monto.
- La busqueda se combina con los filtros existentes de estado y categoria, y actualiza tarjetas, tabla y contador de coincidencias sin recargar datos.
- Se agrega boton `Limpiar` y contador compacto dentro del bloque de filtros.
- La grilla de filtros de gastos se separa de la grilla de inventario para evitar columnas excesivas y queda responsive en mobile.
- No se cambian firmas ni contratos: la pantalla sigue consumiendo internamente `GET /api/admin/expenses`, `GET /api/admin/expenses/recurrences`, `GET /api/admin/financial-periods` y acciones existentes.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run docker:health`, `npm run runtime:check`, `git -C Dashboard diff --check`, `git -C paramascotasec diff --check` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/finance/expenses?tenant=paramascotasec` responde 200.
- Playwright por `https://paramascotasec.com/dashboard/paramascotas-panel/finance/expenses?tenant=paramascotasec` valido desktop/mobile con datos simulados de API: H1 16px, 2 graficas ApexCharts, 4 controles de filtro, 4 tarjetas/filas iniciales, busqueda `internet` reduce a 1 coincidencia, limpiar vuelve a 4 y no hay overflow horizontal.

### 2026-06-16 - Dashboard QA: Simulador Visual de Pricing

Objetivo: reforzar `Precios y finanzas > Margenes/Calculos/Reglas de precio` para que los ajustes no sean solo formularios, sino una consola compacta que muestre el impacto real de margen, IVA, redondeo, envio y promociones.

Cambios:
- Se agrega un simulador de precio dentro del bloque nativo de pricing, visible en `Precios`, `Margenes`, `Calculos` y `Reglas de precio`.
- El simulador permite cambiar el costo neto de ejemplo y recalcula de inmediato costo, piso minimo, objetivo, precio protegido para promocion y PVP final.
- Se agrega una grafica ApexCharts `Escalera de precio` para visualizar la progresion desde costo hasta PVP final.
- El simulador reutiliza las configuraciones reales ya consumidas internamente: `pricing-margins`, `pricing-calc`, `pricing-rules`, IVA vigente y productos reales; no cambia firmas ni contratos de API.
- Las tarjetas del simulador y la grafica quedan contenidas en desktop y mobile sin scroll horizontal.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run docker:health`, `npm run runtime:check`, `git -C Dashboard diff --check`, `git -C paramascotasec diff --check` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/finance/margins?tenant=paramascotasec` responde 200.
- Playwright por `https://paramascotasec.com/dashboard/paramascotas-panel/finance/margins?tenant=paramascotasec` valido desktop/mobile con datos simulados de API: H1 16px, 3 graficas ApexCharts, simulador visible, 5 etapas de precio, 4 productos de pricing, sin overflow horizontal y el input de costo recalcula de USD 10 a USD 20.

### 2026-06-16 - Dashboard QA: Escala Global Mobile y Productos Accionables

Objetivo: corregir titulos gigantes residuales y problemas de layout mobile en el Dashboard, y hacer que `Catalogo > Productos` aproveche mejor sus contadores como filtros operativos.

Cambios:
- `dashboard-overrides.css` endurece la escala global del template para `display-*`, `text-3xl`, `text-4xl` y `text-5xl`, manteniendo H1/H2 compactos dentro de `.dashboard-main`.
- El sidebar colapsado queda completamente oculto en mobile; solo aparece como drawer cuando se abre, evitando que la columna de iconos tape el contenido.
- `Productos` convierte los KPIs de total/publicados/ocultos/incompletos y las tarjetas de publicados/con imagen/stock bajo/margen en riesgo en filtros accionables.
- La busqueda de productos se combina con esos filtros; se puede limpiar el filtro sin perder la consulta ni recargar datos.
- No se cambian firmas ni contratos: la pantalla sigue usando `GET /api/products?scope=admin`, `GET /api/admin/settings/product-reference-data` y los endpoints existentes de creacion/edicion/imagenes.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run docker:health`, `npm run runtime:check`, `git -C Dashboard diff --check`, `git -C paramascotasec diff --check` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/catalog/products?tenant=paramascotasec` responde 200.
- Playwright por `https://paramascotasec.com/dashboard/paramascotas-panel/catalog/products?tenant=paramascotasec` valido desktop/mobile: H1 16px, sin overflow horizontal, sidebar oculto correctamente en mobile, 4 botones KPI y 4 filtros de insight.
- Playwright con datos simulados de API valido 4 tarjetas de producto con imagen, filtro `Ocultos` reduce a 1 producto, filtro `Stock bajo` reduce a 2 productos y busqueda `cat chow` reduce a 1 producto en desktop y mobile.

### 2026-06-16 - Dashboard QA: Precios con Busqueda Operativa

Objetivo: mejorar `Precios y finanzas > Precios` para que el analisis operativo de precios sea navegable como en `/my-account`, sin depender solo de filtros de riesgo ni de una lista recortada.

Cambios:
- `Precios` agrega busqueda nativa por nombre, SKU, marca, categoria o riesgo dentro del analisis operativo de precios.
- La busqueda se combina con el filtro de riesgo existente y actualiza el contador de productos visibles/coincidentes antes de la grilla.
- La pantalla mantiene las graficas existentes de salud de margen y PVP actual vs sugerido, y conserva las tarjetas visuales con imagen, costo, PVP, margen, sugerido y brecha.
- No se cambian firmas ni contratos: sigue consumiendo internamente `GET /api/products?scope=admin`, `GET/PUT /api/admin/settings/pricing-margins`, `pricing-calc`, `pricing-rules` y `GET /api/admin/settings/tax`.
- El control nuevo es responsive y baja a una columna en mobile sin provocar scroll horizontal.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run docker:health`, `npm run runtime:check`, `git -C Dashboard diff --check`, `git -C paramascotasec diff --check` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/finance/prices?tenant=paramascotasec` responde 200.
- Playwright por `https://paramascotasec.com/dashboard/paramascotas-panel/finance/prices?tenant=paramascotasec` valido desktop/mobile con datos simulados de API: H1 16px, 2 graficas ApexCharts, 1 control de busqueda, 4 productos antes de buscar, 1 despues de buscar `cat`, imagen de producto visible y sin overflow horizontal de pagina en 1440px ni 390px.

### 2026-06-16 - Dashboard QA: Venta en Local con Flujo Compacto

Objetivo: mejorar `Operacion > Venta en local` para que el POS tenga lectura rapida de caja, cobro y preparacion de venta, sin duplicar graficas ni desperdiciar espacio en mobile.

Cambios:
- `Venta en local` agrega un resumen superior compacto con grafica ApexCharts de cobro del turno, barras de flujo de caja y checks de preparacion de venta.
- Los checks muestran caja, productos, cliente, calculo server-side y cobro usando las validaciones existentes del POS; no se agregan reglas nuevas fuera del backend.
- La grafica de cobro se elimina del panel lateral `Caja POS` para evitar duplicacion; ese panel queda enfocado en abrir/cerrar caja y registrar acciones.
- La pantalla conserva el workspace nativo de catalogo, carrito, cliente, cobro y movimientos, usando las mismas firmas internas `GET /api/products?scope=admin`, `GET /api/admin/settings/store-status`, `GET /api/admin/pos/shift/active`, `POST /api/orders/quote`, `POST /api/orders`, `POST /api/admin/pos/shift/open|close` y `POST /api/admin/pos/movements`.
- Se agregan reglas responsive para que dashboard POS, flujo y checks bajen a una columna en mobile sin scroll horizontal de pagina.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run docker:health`, `npm run runtime:check`, `git -C Dashboard diff --check`, `git -C paramascotasec diff --check` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/operations/local-sales?tenant=paramascotasec` responde 200.
- Playwright por `https://paramascotasec.com/dashboard/paramascotas-panel/operations/local-sales?tenant=paramascotasec` valido desktop/mobile con datos simulados de API: H1 16px, 1 grafica ApexCharts, 5 filas de flujo, 5 checks de preparacion, 3 productos, 1 item agregado al carrito y sin overflow horizontal de pagina en 1440px ni 390px.

### 2026-06-16 - Dashboard QA: Cotizaciones con Embudo Visual y Mobile

Objetivo: mejorar `Operacion > Cotizaciones` para que deje de depender de tabla/historial como lectura principal, mantenga las firmas reales de `/my-account` y se vea compacto en desktop y mobile.

Cambios:
- `Cotizaciones` agrega dos graficas ApexCharts compactas: distribucion por estado comercial y valor cotizado por estado.
- Se agrega panel de seguimiento que prioriza cotizaciones vencidas, proximas a vencer, de mayor monto o sin contacto claro, con seleccion directa de la cotizacion.
- El historial reciente suma tarjetas accionables con cliente, estado, total, unidades, validez y contacto antes de la tabla auditable.
- La vista conserva el workspace POS existente para catalogo, cliente, carrito, creacion y conversion de cotizaciones, usando las mismas firmas internas `GET /api/products?scope=admin`, `GET /api/admin/settings/store-status`, `GET /api/admin/pos/shift/active`, `GET/POST /api/admin/quotes`, `POST /api/admin/quotes/:id/convert` y `POST /api/orders/quote`.
- Se agregan reglas responsive para que graficas, seguimiento, tarjetas y resumen bajen a una columna en mobile sin scroll horizontal de pagina.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run docker:health`, `npm run runtime:check`, `git -C Dashboard diff --check`, `git -C paramascotasec diff --check` y `./scripts/check-container-connectivity.sh development`.
- `npm run build` local no arranco porque el host tiene Node `v22.22.2` y Angular CLI exige minimo `v22.22.3`, `v24.15.0` o `v26.0.0`; el build Docker si paso con Node 26 durante `npm run docker:up`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/operations/quotations?tenant=paramascotasec` responde 200.
- Playwright por `https://paramascotasec.com/dashboard/paramascotas-panel/operations/quotations?tenant=paramascotasec` valido desktop/mobile con datos simulados de API: H1 16px, 2 graficas ApexCharts, 5 KPIs, 5 tarjetas de seguimiento, 5 tarjetas de historial y sin overflow horizontal de pagina en 1440px ni 390px.

### 2026-06-16 - Dashboard QA: Usuarios con Graficas y Tarjetas Accionables

Objetivo: mejorar `Catalogo > Usuarios` para acercarlo a `/my-account`, evitando que la gestion quede limitada a KPIs y tabla, y manteniendo creacion/edicion/desbloqueo nativos.

Cambios:
- `Usuarios` agrega dos graficas ApexCharts compactas: distribucion de roles del filtro actual y clientes por facturacion.
- La pantalla agrega panel de seguridad/actividad con filtros accionables para verificados, sin verificar, bloqueados y usuarios con pedidos.
- Se agrega grilla de tarjetas de usuarios destacados con iniciales, rol, contacto, documento, empresa, pedidos, facturacion, ultima compra, estado de seguridad y acciones `Editar`/`Desbloquear`.
- Los graficos y tarjetas respetan los filtros actuales de busqueda, rol y estado; las tarjetas priorizan bloqueados y clientes con mayor facturacion.
- La tabla auditable y el formulario lateral se mantienen con las mismas firmas reales internas `GET/POST/PUT /api/users` y `POST /api/users/:id/unlock`.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run docker:health`, `npm run runtime:check`, `git -C Dashboard diff --check`, `git -C paramascotasec diff --check` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/catalog/users?tenant=paramascotasec` responde 200.
- Playwright por `https://paramascotasec.com/dashboard/paramascotas-panel/catalog/users?tenant=paramascotasec` valido desktop/mobile con datos simulados de API: H1 16px, 2 graficas ApexCharts, 4 KPIs, 4 filtros de seguridad, 6 tarjetas, 1 usuario bloqueado destacado, tabla sin overflow horizontal de pagina, filtro `Bloqueados` reduce a 1/7 y `Editar` llena el formulario.

### 2026-06-16 - Dashboard QA: Pedidos con Tarjetas Visuales y Canales

Objetivo: mejorar `Operacion > Pedidos` para que no dependa solo de tabla/lista, conserve acciones operativas y muestre mejor productos, canales, pagos y detalle sin desbordes.

Cambios:
- `Pedidos` agrega una segunda grafica ApexCharts compacta de total vendido por canal de entrega, derivada de los pedidos filtrados.
- La vista agrega desglose interactivo de metodos de pago con barras proporcionales y total por metodo.
- Se agrega una grilla de tarjetas de pedidos recientes con estado, cliente, contacto, miniaturas de productos, total, entrega, pago, items y acceso directo al detalle.
- El modal existente de pedido conserva detalle de cliente, resumen, direcciones, productos con imagen, comprobante interno y cambio de estado.
- La tabla auditable se mantiene, con contencion responsive existente; en mobile la lectura prioritaria queda en tarjetas y la tabla pasa a formato de filas tipo card.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run docker:health`, `npm run runtime:check`, `git -C Dashboard diff --check`, `git -C paramascotasec diff --check` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/operations/admin-orders?tenant=paramascotasec` responde 200.
- Playwright por `https://paramascotasec.com/dashboard/paramascotas-panel/operations/admin-orders?tenant=paramascotasec` valido desktop/mobile con datos simulados de API: H1 16px, 2 graficas ApexCharts, 5 KPIs, 6 tarjetas de pedidos, 13 miniaturas de productos, 4 filas de pagos, tabla sin overflow horizontal de pagina y modal con 3 imagenes de items y 4 acciones.

### 2026-06-16 - Dashboard QA: Productos x Compra con Graficas Comparativas

Objetivo: mejorar `Reportes > Productos x Compra` para que la pantalla no dependa solo de listas y tablas, manteniendo titulos compactos y comportamiento mobile-safe.

Cambios:
- `Productos x Compra` agrega dos graficas ApexCharts compactas: venta/utilidad por producto y unidades compradas/vendidas/restantes.
- Las graficas se derivan de los datos que la pantalla ya consume por proxy interno directo del Dashboard: `GET /api/admin/report`, `GET /api/products?scope=admin`, `GET /api/orders`, `GET /api/admin/inventory/intelligence` y `GET /api/admin/purchase-invoices`.
- La seccion nueva entra despues de los KPIs y antes del detalle, en dos columnas desktop y una columna mobile, sin anchos minimos que rompan el layout.
- La pantalla conserva lista de productos, imagenes, detalle de lotes FIFO, pedidos asociados y tablas con scroll interno contenido.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run docker:health`, `npm run runtime:check`, `git -C Dashboard diff --check`, `git -C paramascotasec diff --check` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/reporting/products-purchases?tenant=paramascotasec` responde 200.
- Playwright por `https://paramascotasec.com/dashboard/paramascotas-panel/reporting/products-purchases?tenant=paramascotasec` valido desktop/mobile con datos simulados de API: H1 16px, 2 graficas ApexCharts, 5 KPIs, productos con imagen, ancho de workspace 1089px desktop/346px mobile y sin overflow horizontal de pagina.

### 2026-06-16 - Dashboard QA: Tablas Mobile y Preview Real de Productos

Objetivo: cerrar los problemas visibles que seguian quedando en mobile dentro de `Paramascotas panel` y completar la experiencia operativa de `Productos`/`Pedidos` con preview real sin romper el layout compartido.

Cambios:
- `Catalogo > Productos` agrega modal nativo de preview con imagen principal, miniaturas, tags comerciales, 6 metricas compactas y 3 bloques de detalle operativo/SEO/trazabilidad; el estado del preview se sincroniza cuando se refresca, publica, duplica o elimina el producto.
- `Productos` y `Pedidos` consolidan su paginacion visible y estilos de acciones en desktop/mobile, evitando botones comprimidos o alineaciones inconsistentes.
- Las tablas que aun quedaban planas en `Reporte general`, `Gastos`, `Ranking de productos` y detalle de lineas del pedido pasan al patron `paramascotas-card-table` con `data-label`, de modo que en mobile se renderizan como tarjetas legibles en vez de columnas aplastadas.
- No se agrego una segunda capa de CSS global; se reutilizo el responsive existente del panel para mantener consistencia y bajar el riesgo del cambio.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run lint`, `git -C Dashboard diff --check`, `npm run docker:health` y `npm run runtime:check`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/reporting/general?tenant=paramascotasec`, `/dashboard/paramascotas-panel/catalog/products?tenant=paramascotasec` y `/dashboard/paramascotas-panel/operations/admin-orders?tenant=paramascotasec` responden 200.
- Playwright con sesion backend real del QA valido desktop/mobile: `Reporte general` queda en H1 24px desktop / 16px mobile, `overflowX=false`, drawer mobile de 304px sin desbordar, `Productos` carga 12 cards y abre modal con 2 miniaturas/6 metricas/3 detail cards, `Pedidos` muestra 10 filas con paginacion y el reporte mobile renderiza 8 pedidos recientes como tarjetas legibles.

### 2026-06-16 - Dashboard QA: Tipografia Compartida y Navbar Mobile Estables

Objetivo: corregir que las pantallas compartidas del Dashboard siguieran mostrando titulos desproporcionados y que el navbar/header mobile todavia se rompiera en rutas fuera de `Paramascotas backend`.

Cambios:
- `dashboard-overrides.css` pasa a usar variables compartidas de escala (`--dashboard-heading-*`, `--dashboard-page-header-*`) para headings, `PageHeader`, titulos de tarjeta y utilidades de texto dentro de `dashboard-main-body`.
- Los selectores globales suben especificidad sobre `app-page-header`, de modo que el template base ya no recupere H1/H2 gigantes por orden de inyeccion o clases utilitarias heredadas.
- `PageHeaderComponent` consume esas variables globales y deja el titulo compartido en 24px desktop y 16px mobile, con icono, eyebrow y descripcion en proporcion estable.
- `side-nav.component.css` compacta el navbar mobile: tenant flexible, acciones en grilla estable, `user-chip` expandible y `logout` icon-only en anchos pequenos para no desbordar.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run lint`, `git -C Dashboard diff --check`, `npm run docker:health`, `npm run runtime:check` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `curl -k -I --resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/reporting/general?tenant=paramascotasec` y `/dashboard/tenant-admin?tenant=demo` responden 200.
- Playwright contra `https://paramascotasec.com` forzado a `192.168.100.229` valido `Reportes > Reporte general` y `Tenant admin` en desktop/mobile: `pageOverflowX=false`, `bodyOverflowX=false`, H1 24px desktop / 16px mobile y drawer mobile de 304px sin invadir horizontalmente la pagina.

### 2026-06-16 - Dashboard QA: Escala Compartida Refinada y Shell Mobile Compacto

Objetivo: bajar aun mas la escala visual de las pantallas compartidas del Dashboard y corregir el shell mobile para que no vuelva a verse sobredimensionado ni mezcle el estado de sidebar colapsado con el drawer abierto.

Cambios:
- `dashboard-overrides.css` reduce otra vez la escala global de headings y `PageHeader`: el titulo compartido queda en 19px desktop y 15px mobile, con eyebrow, descripcion, icono y botones en proporcion mas densa.
- `PageHeaderComponent` agrega `page-header__copy` para asegurar `min-width: 0` y mantener cortes limpios cuando el titulo o la descripcion ocupan varias lineas.
- `side-nav.component.html` deja de aplicar la clase `active` cuando el drawer mobile esta abierto, evitando que el sidebar herede el modo colapsado mientras se navega en anchos pequenos.
- `side-nav.component.css` compacta mas el shell mobile: `user-chip` mas corto, avatar menor, logout a ancho completo en `<=575px`, botones mas bajos y textos del menu con wrapping en vez de recorte.
- Se agrega `body.overlay-active { overflow: hidden; }` para bloquear scroll del documento cuando el drawer mobile esta abierto.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run lint`, `git -C Dashboard diff --check`, `npm run runtime:check` y `npm run docker:health`.
- Playwright por APISIX sobre `https://paramascotasec.com/dashboard/sign-in?tenant=paramascotasec&returnUrl=/paramascotas-panel/reporting/general`, forzando resolucion a `192.168.100.229`, valido desktop/mobile y drawer abierto: H1 compartido 19px desktop / 15px mobile, sidebar mobile 304px sin colapsar y shell sin overflow horizontal.

### 2026-06-16 - Dashboard QA: POS Reconciliado y Auditoria Real de Pantallas

Objetivo: corregir la percepcion de funciones "rotas" en `Venta en local` cuando la UI quedaba desfasada frente al estado real del turno POS, y verificar por APISIX que las pantallas operativas principales no estuvieran devolviendo errores fatales.

Cambios:
- `paramascotas-panel` agrega `posNotice` y deja de tratar como falla fatal los casos de reconciliacion del turno: si la UI intenta abrir una caja ya abierta o cerrar una ya cerrada, el panel consulta otra vez `GET /api/admin/pos/shift/active`, actualiza el estado real y muestra un aviso informativo en lugar del banner rojo `Operacion no disponible`.
- `openPosShift()` y `closePosShift()` ahora limpian avisos previos, re-sincronizan snapshot tras rechazos de mutacion y muestran mensajes explicitos: `La caja ya estaba abierta...` o `La caja ya estaba cerrada...`.
- `tests/e2e/paramascotas-real-auth.spec.ts` agrega una regresion real contra `https://paramascotasec.com/dashboard`: intercepta una lectura POS obsoleta, fuerza una accion incoherente y valida que el dashboard se recupere solo mostrando el turno correcto.
- Se rehizo la auditoria de integraciones reales del tenant `paramascotasec` sobre 30 rutas del dashboard para detectar pantallas con errores fatales visibles.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-auth.spec.ts --grep "stale POS state|signs in with MFA"` y `node node_modules/playwright/cli.js test tests/e2e/paramascotas-real-integrations.spec.ts`.
- La auditoria real por APISIX quedo en `30/30` rutas sin `Tenant no disponible`, sin `Operacion no disponible` y sin errores fatales de carga; `Venta en local POS` tambien valida el estado real de caja contra `GET /dashboard/api/admin/pos/shift/active`.

Pendientes:
- La auditoria actual cubre rutas y el caso critico de reconciliacion POS; sigue pendiente ampliar el barrido a acciones internas mas profundas por modulo para etiquetar o retirar cualquier boton que aun no tenga operacion real.

### 2026-06-16 - Dashboard QA: Tenant Admin con Cobertura Real por Paquete

Objetivo: reducir opciones huecas en la administracion SaaS mostrando que paquetes estan realmente operativos, cuales son parciales y cuales todavia no deben activarse.

Cambios:
- `tenant-admin` clasifica cada paquete SaaS como `Operativo`, `Parcial` o `Proximamente` segun la cobertura real de sus flujos internos (`implemented` en `TENANT_BUSINESS_TYPE_OPTIONS`).
- Los cards de alta y gestion por tenant ahora muestran cobertura `flujos listos / total`, junto con un pill de disponibilidad visible antes de expandir detalles.
- Los paquetes totalmente no implementados, como `Consultorio medico`, dejan de ser activables desde tenant-admin; el toggle se deshabilita y se muestra como `Proximamente`.
- La validacion de smoke del tenant-admin ahora exige que el estado `Proximamente` sea visible en el paquete medico mientras el resto de la gestion SaaS sigue funcional.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/smoke.spec.ts --grep "tenant admin|coverage matrix|quick presets"` y `node node_modules/playwright/cli.js test tests/e2e/layout-density.spec.ts --grep "tenant-admin"`.
- Resultado validado: el tenant-admin sigue compacto en desktop/mobile y ya no invita a activar verticales sin implementacion real completa.

Pendientes:
- Extender el mismo criterio de cobertura real al resto de paquetes parcialmente implementados, especialmente `Correo y colaboracion`, para decidir si conviene separar mejor `workspace` de `email-service` o reordenar la oferta SaaS.

### 2026-06-16 - Dashboard QA: Tenant Admin con Bundles Ecommerce y Preset Coherente

Objetivo: hacer que la administracion de tenants y modulos sea mas clara y comoda para el superadmin, separando paquetes SaaS del alcance interno de `Ecommerce` y eliminando estados iniciales inconsistentes del formulario de alta.

Cambios:
- `tenant-admin` mantiene `Ecommerce` como modulo unico configurable por giro, pero ahora agrupa sus capacidades en bundles operativos: `Catalogo visual`, `Operacion comercial`, `Precios y finanzas`, `Clientes y envios` y `Reportes y control`.
- La configuracion de Ecommerce en alta y edicion deja de mostrar una pared plana de checkboxes: agrega resumen lateral, contadores por bundle, selector avanzado colapsable para ajuste fino y preview de grupos activos.
- El formulario de `Crear cliente` ya no nace incoherente: si el preset visual por defecto es `Ecommerce base`, sus modulos y configuracion se aplican realmente desde el inicio y tambien despues de crear un tenant.
- `business-type-list` pasa a un layout mas denso y la configuracion inline del tenant usa paneles compactos para `Perfil del negocio`, `Bundles funcionales` y `Ajuste fino`.
- `smoke.spec.ts` y `tenant-admin.component.spec.ts` amplian cobertura para presets coherentes y bundles Ecommerce visibles.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:health`, `node node_modules/playwright/cli.js test tests/e2e/smoke.spec.ts --grep "tenant admin|coverage matrix|quick presets"` y `node node_modules/playwright/cli.js test tests/e2e/layout-density.spec.ts --grep "tenant-admin"`.
- Resultado validado: tenant-admin mantiene tipografia compacta desktop/mobile, abre con preset Ecommerce coherente y permite llegar a `Bundles funcionales` y `Ajuste fino` sin overflow ni paneles gigantes.

Pendientes:
- Seguir densificando la gestion SaaS del superadmin: falta resumir mejor modulos standalone como `Facturacion`, `Inventario` y `Correo`, y luego auditar acciones profundas por modulo para retirar o etiquetar cualquier operacion que aun sea solo de plantilla.

### 2026-06-16 - Dashboard QA: Ruta Inicial por Tenant y Sesion Fixture Coherente

Objetivo: eliminar defaults de demo que seguian contaminando el tenant real, de modo que cada tenant aterrice en una pantalla util, conserve su contexto y muestre el usuario correcto en el shell.

Cambios:
- `Dashboards base` deja de colgar del modulo `dashboard` y pasa a `ui-kit`, para que `dashboard` siga siendo base del tenant sin exponer demos a clientes reales como `paramascotasec`.
- `NavigationService` expone `defaultRoute()`: prioriza `/home` cuando el tenant realmente tiene visibles dashboards base; si no, usa la primera ruta funcional disponible.
- Se agrega `tenantLandingGuard`, usado en la ruta vacia del shell para resolver la pantalla inicial segun tenant y modulos visibles en vez de redirigir fijo a `/home`.
- `side-nav` ahora usa esa ruta inicial tenant-aware en el logo y prioriza `tenantContext.currentUser` sobre el fallback de auth para el nombre visible del usuario.
- `TenantResolverService` agrega helpers para conservar `?tenant=` cuando el contexto depende del query string; el login, callback OAuth y la navegacion lateral ya no pierden el tenant al moverse dentro del SPA.
- `auth.fixtures.ts` deja de devolver siempre un usuario demo generico: si el tenant fixture existe, la sesion usa su `currentUser`, roles y permisos efectivos.
- Los links publicos internos que antes apuntaban a `/home` ahora apuntan a `/`, dejando que la resolucion tenant-aware decida el destino correcto.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run lint`, `git -C Dashboard diff --check`, `npm run docker:health` y `npm run runtime:check`.
- Playwright por APISIX con resolucion forzada a `192.168.100.229` valido:
  - `https://paramascotasec.com/dashboard/sign-in` -> `https://paramascotasec.com/dashboard/paramascotas-backend` con chip `Administrador ParaMascotasEC`.
  - `https://paramascotasec.com/dashboard/sign-in?tenant=paramascotasec` -> `.../paramascotas-backend?tenant=paramascotasec`, sin `Recursos UI` ni `Dashboards base`.
  - `https://paramascotasec.com/dashboard/sign-in?tenant=demo` -> `.../home?tenant=demo`, con chip `Administrador TECNOLTS` y menu `Recursos UI > Dashboards base`.

### 2026-06-16 - Dashboard QA: Soporte Explicito por Vista y POS Transparente

Objetivo: reducir la sensacion de "funciones que no sirven" en Paramascotas dejando claro, dentro de cada pantalla nativa, si la vista es de consulta o de gestion y que acciones reales estan verificadas contra backend.

Cambios:
- `paramascotas-panel.model.ts` y `paramascotas-panel.registry.ts` ahora catalogan cada vista con `surfaceMode` (`read` o `manage`) y una lista corta de acciones reales verificadas.
- Reportes y pantallas analiticas quedan marcadas como `Consulta`; pantallas operativas como POS, pedidos, cupones, usuarios, catalogos, balances y precios quedan marcadas como `Gestion`.
- `ParamascotasPanelComponent` agrega una franja compacta bajo el header con chips `Consulta/Gestion`, `Operativa/Con incidencias/Pendiente`, conteo de endpoints verificados y las acciones reales de la vista actual.
- La franja usa el snapshot real de endpoints ya existente, de modo que la pantalla no solo dice que deberia hacer, sino tambien si sus lecturas API estan sanas en ese momento.
- Esto complementa la correccion previa de POS: `Venta en local` ya no deja el mensaje generico de fallo cuando habia desincronizacion de turno; ahora, ademas, la propia vista declara que soporta `Abrir o cerrar caja`, `Movimientos POS` y `Venta local y cotizacion`.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run lint`, `npm run docker:health` y Playwright focalizado `tests/e2e/paramascotas-real-integrations.spec.ts` para:
  - `Reporte general` sin errores fatales.
  - `Venta en local` sin `Operacion no disponible`.
  - estado POS real consistente con `/dashboard/api/admin/pos/shift/active`.
  - presencia visible del soporte `Consulta` en reportes y `Gestion` en POS con accion `Abrir o cerrar caja`.

### 2026-06-15 - Dashboard QA: Envios con Graficas y Cobertura Visual

Objetivo: mejorar `Operacion > Envios y mapa` para que deje de ser una pantalla de listas/configuracion y funcione como dashboard logistico compacto, legible y mobile-safe.

Cambios:
- `Envios y mapa` conserva las firmas reales internas `GET /api/shipments`, `GET/PUT /api/admin/settings/shipping` y `GET /api/orders`, sin encadenar llamadas internas por APISIX.
- Se agregan metricas derivadas de pedidos: domicilio, retiro, sin metodo, envio cobrado, promedio de envio, entregas pendientes y completadas.
- Se integran dos graficas ApexCharts compactas: dona de canales de entrega y barras horizontales de envio cobrado por estado.
- Se agrega una tarjeta visual de cobertura local con escala de radio gratis/tarifa plana, mini mapa funcional y resumen de cola/completados/cobrado.
- La configuracion logistica lateral pasa de 4 columnas comprimidas a 2 columnas en escritorio y 1 columna en mobile, evitando inputs cortados y texto montado.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run docker:health`, `npm run runtime:check`, `git -C Dashboard diff --check`, `git -C paramascotasec diff --check` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/operations/shipments?tenant=paramascotasec` responde 200.
- Playwright por `https://paramascotasec.com/dashboard/paramascotas-panel/operations/shipments?tenant=paramascotasec` valido desktop/mobile con datos simulados de API: 2 graficas, 4 KPIs, 3 paneles de insight, H1 16px, H2/H3 14px, `overflow=0`, inputs de configuracion de 141px minimo en escritorio y 346px en mobile.

### 2026-06-15 - Dashboard QA: Alertas Compactas y Escala Global Ajustada

Objetivo: corregir que las pantallas nativas del Dashboard siguieran heredando titulos grandes del template y mejorar `Monitoreo > Alertas` como pantalla operativa compacta y usable en mobile.

Cambios:
- `dashboard-overrides.css`, `PageHeaderComponent` y el shell mobile reducen otra vez la escala global: H1 queda en 16px dentro del dashboard, H2/H3 en 14px, y el navbar mobile reparte tenant/usuario/logout sin tapar contenido.
- El drawer mobile del sidebar queda explicitamente fuera de pantalla cuando esta cerrado y abre como panel completo, evitando la barra estrecha de iconos sobre el contenido.
- `Monitoreo > Alertas` reemplaza la lista plana por KPIs accionables, filtros por severidad y origen, dos graficas ApexCharts compactas, panel de inventario sensible y tarjetas clicables.
- Las tarjetas de alertas navegan al contexto relevante: inventario, catalogo/productos, pedidos, reporte general o precios segun origen y texto de la alerta.
- La pantalla mantiene consumo interno directo por proxy del Dashboard hacia las mismas firmas reales: `GET /api/admin/dashboard/stats`, `GET /api/admin/inventory/intelligence` y `GET /api/products?scope=admin`; APISIX sigue siendo solo entrada publica externa.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run docker:health`, `npm run runtime:check`, `git -C Dashboard diff --check`, `git -C paramascotasec diff --check` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/monitoring/alerts?tenant=paramascotasec` responde 200.
- Playwright por `https://paramascotasec.com/dashboard/paramascotas-panel/monitoring/alerts?tenant=paramascotasec` valido desktop/mobile con datos simulados de API: H1 16px, H2/H3 14px, 2 graficas, 4 KPIs, 7 alertas clicables, metadatos de accion con ancho estable y `overflow=0`.

### 2026-06-15 - Dashboard QA: Ficha de Producto con Preview Real

Objetivo: mejorar `Catalogo > Ficha de producto` para que deje de ser un formulario plano y muestre mejor el impacto real de la configuracion comun de productos.

Cambios:
- La vista mantiene la firma real `GET/PUT /api/admin/settings/product-page` y agrega lectura interna directa de `GET /api/products?scope=admin` para previsualizar una ficha con producto real.
- Se agrega preview visual con imagen, nombre, marca, categoria, precio, stock y badges publicos de entrega, personas viendo y envio gratis.
- Se agrega panel de salud de configuracion con score, observaciones, resumen de catalogo, productos con imagen y productos publicables.
- Se reorganizan los textos visibles de ficha comun en tarjetas compactas de confianza y un formulario de edicion separado, manteniendo el guardado existente.
- El registro del modulo declara tambien `Productos admin` como endpoint de soporte para `product-page`.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run docker:health`, `npm run runtime:check`, `git -C Dashboard diff --check`, `git -C paramascotasec diff --check` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/catalog/product-page` responde 200.
- Playwright con datos simulados de API valido desktop/mobile: imagen visible, producto real en preview, 4 tarjetas de confianza, actualizacion reactiva de `Personas viendo`, titulos 18px/15px desktop y 16px/14px mobile, layout mobile de una columna y `overflow=0`.

### 2026-06-15 - Dashboard QA: Titulos Compactos Globales y Mobile

Objetivo: corregir que pantallas nativas del Dashboard siguieran mostrando titulos desproporcionados y que algunas vistas moviles desperdiciaran espacio o quedaran mal alineadas.

Cambios:
- `dashboard-overrides.css` refuerza la escala global de encabezados dentro de `.dashboard-main`, incluyendo titulos de cards, secciones y modales, sin afectar iconos.
- `Paramascotas panel` refuerza la escala local de `h1/h2/h3/h4`, encabezados de cards, graficas, paneles, modales y tarjetas de producto/precios/gastos.
- En mobile, los `card-header` flex pasan a grilla de una columna para evitar botones y titulos comprimidos o desbordados.
- Se valido el drawer mobile del sidebar abierto/cerrado: el menu abre completo con overlay, sin dejar una barra estrecha sobre el contenido ni scroll horizontal.
- `Ventas` ajusta la grafica de canales a barras apiladas para que disponibles/controlados/bloqueados sean visibles aun con valores cero o parciales.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run docker:health`, `npm run runtime:check`, `git -C Dashboard diff --check`, `git -C paramascotasec diff --check` y `./scripts/check-container-connectivity.sh development`.
- `npm run build` local no se pudo ejecutar en el host porque Node es `22.22.2` y Angular exige `22.22.3+` o Node 24; el build Docker uso Node 26 y completo correctamente.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/reporting/general` responde 200.
- Playwright por `https://paramascotasec.com/dashboard` valido `Reporte general` desktop/mobile con datos renderizados: titulos 18px/15px en desktop, 16px/14px en mobile, 2 graficas y `overflow=0`; tambien valido `Ventas` mobile con 2 graficas, barras visibles y `overflow=0`.

### 2026-06-15 - Dashboard QA: Seguridad con Graficas y Presets

Objetivo: convertir `Monitoreo > Seguridad` en una pantalla operativa compacta, con lectura visual de riesgo y controles comodos, evitando que quede como una configuracion plana de dos inputs.

Cambios:
- `Seguridad` mantiene el contrato real `GET/PUT /api/admin/settings/session` y normaliza la respuesta para conservar TTL, minimos y maximos aunque el backend omita campos opcionales.
- Se agregan KPIs compactos de sesion cliente, sesion admin, perfil actual y rango permitido.
- Se integran dos graficas ApexCharts: riesgo por duracion contra el rango permitido y horas configuradas contra minimos tecnicos.
- Se agregan presets interactivos `Estricto`, `Balanceado` y `Extendido`; al seleccionarlos actualizan cliente/admin localmente y no persisten hasta `Guardar seguridad`.
- Los controles de horas pasan a sliders con barras de riesgo, warnings operativos y layout responsive 3 columnas desktop / 1 columna mobile sin scroll horizontal.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run docker:health`, `npm run runtime:check`, `git -C Dashboard diff --check`, `git -C paramascotasec diff --check` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/monitoring/security-settings` responde 200.
- Playwright por `https://paramascotasec.com/dashboard/paramascotas-panel/monitoring/security-settings?tenant=paramascotasec` valido desktop/mobile con 2 graficas, preset `Estricto`, titulo 18px/16px, `overflow=0` y layout 3 columnas desktop / 1 columna mobile.

### 2026-06-15 - Dashboard QA: Cupones con Graficas y Filtros Accionables

Objetivo: corregir `Precios y finanzas > Cupones` para que deje de ser una lista/formulario plano, mantenga titulos compactos y funcione bien en mobile sin romper las firmas reales de `/my-account`.

Cambios:
- `Cupones` agrega KPIs operativos de total, activos, atencion y usos acumulados sobre `GET /api/admin/discounts` y `GET /api/admin/discounts/audit`.
- Se integran graficas ApexCharts compactas: dona de disponibilidad real por vigencia/limite y barras horizontales de uso vs limite por cupon.
- Se agregan filtros accionables por estado: todos, agotados, vencidos, programados, activos e inactivos; el listado se actualiza localmente y conserva las acciones `Editar`, `Activar` y `Desactivar`.
- El panel de atencion muestra cupones agotados, vencidos y programados con uso, limite y fecha de cierre; al seleccionar un cupon carga el formulario de edicion.
- Se reforzaron las grillas/formularios nativos con `align-items: start`, `min-width: 0` y `max-width: 100%` para evitar tarjetas estiradas, campos de fecha invadiendo columnas y scroll horizontal en mobile.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run docker:health`, `npm run runtime:check`, `git -C Dashboard diff --check`, `git -C paramascotasec diff --check` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/finance/discount-codes` responde 200.
- Playwright por `https://paramascotasec.com/dashboard/paramascotas-panel/finance/discount-codes?tenant=paramascotasec` valido desktop/mobile con 2 graficas, filtro `Agotados`, edicion de cupon, titulo 18px/16px, `overflow=0`, `formOverflow=0` y layout de 2 columnas desktop / 1 columna mobile.

### 2026-06-15 - Dashboard QA: Margenes, Calculos y Reglas con Analisis Visual

Objetivo: evitar que `Precios y finanzas > Margenes`, `Calculos` y `Reglas de precio` queden como simples formularios, y darles el mismo analisis visual/accionable que la vista `Precios`.

Cambios:
- `Margenes`, `Calculos` y `Reglas de precio` ahora cargan el bundle completo por proxy interno del Dashboard: `GET /api/products?scope=admin`, `GET /api/admin/settings/tax`, `GET /api/admin/settings/pricing-margins`, `GET /api/admin/settings/pricing-calc` y `GET /api/admin/settings/pricing-rules`.
- Las tres vistas reutilizan el analisis operativo con KPIs de margen ponderado, productos bajo objetivo, productos sin costo y brecha sugerida por stock actual.
- Las tres vistas muestran graficas ApexCharts de salud de margen y PVP actual vs sugerido, mas filtros interactivos de riesgo que actualizan las tarjetas de productos.
- Las tarjetas de productos quedan con imagen, SKU, stock, costo, PVP, margen, sugerido, brecha y accion `Editar ficha`.
- Se corrigio el layout mobile de tarjetas de precios: miniatura compacta de 64px y metricas en dos columnas para evitar imagenes enormes y desperdicio vertical.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run docker:health`, `npm run runtime:check`, `git -C Dashboard diff --check`, `git -C paramascotasec diff --check` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/finance/margins`, `/dashboard/paramascotas-panel/finance/calculations` y `/dashboard/paramascotas-panel/finance/pricing-rules` responden 200.
- Playwright valido las tres rutas en desktop con 2 graficas, tarjetas de producto, imagenes visibles, filtros de riesgo activos y `overflow=0`; mobile en `calculations` valido 2 graficas, filtro `Sin costo`, titulo 16px, `overflow=0` y miniatura de producto de 64px.

### 2026-06-15 - Dashboard QA: Impuestos con Impacto Fiscal y Rutas Internas

Objetivo: convertir `Precios y finanzas > Impuestos` en una pantalla operativa compacta y visual, con productos presentados con imagen/datos relevantes y sin romper el consumo interno directo del Dashboard.

Cambios:
- `Impuestos` ahora carga `GET /api/admin/settings/tax`, `GET /api/admin/settings/shipping` y `GET /api/products?scope=admin` en el mismo flujo interno para calcular impacto fiscal del catalogo.
- Se agregan KPIs compactos de IVA general, base gravada, IVA estimado y productos exentos/sin PVP.
- Se agregan graficas ApexCharts: dona de distribucion fiscal y barras horizontales de IVA estimado por categoria.
- Se agrega revision fiscal accionable con productos exentos/sin precio y tarjetas de productos con imagen, marca, categoria, PVP, base, IVA, stock y acceso al panel de productos.
- Se corrigieron navegaciones internas del panel Paramascotas que usaban `/dashboard/...` dentro del router Angular; ahora usan rutas SPA reales `/paramascotas-panel/...`, dejando `/dashboard` solo como base publica de APISIX.
- El layout responsive mantiene miniaturas compactas en mobile, evita tablas/desbordes y conserva titulos compactos.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run docker:health`, `npm run runtime:check`, `git -C Dashboard diff --check`, `git -C paramascotasec diff --check` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/finance/taxes` responde 200.
- Playwright por `https://paramascotasec.com/dashboard/paramascotas-panel/finance/taxes?tenant=paramascotasec` valido desktop/mobile con 2 graficas, 6 tarjetas de producto, imagenes visibles, `overflow=0`, titulo 18px/16px y navegacion desde producto hacia `/dashboard/paramascotas-panel/catalog/products`.

### 2026-06-15 - Dashboard QA: Gastos con Graficas y Tarjetas Mobile

Objetivo: corregir `Precios y finanzas > Gastos` para mantener titulos compactos, lectura operativa rapida y mobile usable, sin cambiar las firmas reales de `/my-account`.

Cambios:
- `Gastos` agrega analisis visual compacto antes de los formularios: dona de estado de gastos, barras por categoria, KPIs filtrables y panel de atencion inmediata para pendientes/vencidos.
- La carga de gastos conserva el contrato real `GET/POST /api/admin/expenses` y `/api/admin/expenses/recurrences`; el filtro por estado/categoria se aplica localmente para no perder el contexto del periodo completo.
- El listado desktop conserva tabla compacta; en mobile la tabla se oculta y se reemplaza por tarjetas accionables con estado, total, IVA, fechas, metodo, referencia y acciones `Pagado`/`Anular`.
- El layout evita tarjetas estiradas y mantiene H1 compacto: validado en desktop con titulo 18px y en mobile con titulo 16px, sin overflow horizontal.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `cd Dashboard && npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run docker:health`, `npm run runtime:check`, `git -C Dashboard diff --check`, `git -C paramascotasec diff --check` y `./scripts/check-container-connectivity.sh development`.
- `npm run build` local quedo bloqueado por Node `22.22.2`; Angular CLI exige `22.22.3+`, `24.15+` o `26+`. El build Docker del Dashboard uso la imagen `node:26-alpine` y levanto correctamente.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/finance/expenses` responde 200.
- Playwright por `https://paramascotasec.com/dashboard/paramascotas-panel/finance/expenses?tenant=paramascotasec` valido desktop/mobile con 2 graficas, filtro `Vencidos`, tabla visible solo en desktop, tarjetas visibles en mobile y `overflow=0`.

### 2026-06-15 - Dashboard QA: Precios con Analisis Visual y Mobile Compacto

Objetivo: convertir `Precios y finanzas > Precios` en una pantalla util para auditar rentabilidad, evitando que el usuario vea primero formularios y tablas anchas, y manteniendo las mismas firmas reales de `/my-account`.

Cambios:
- `Precios` ahora calcula desde productos reales, IVA vigente, margenes, calculos y reglas ya cargadas por `GET /api/products?scope=admin` y `GET /api/admin/settings/pricing-*`.
- Se agrega analisis visual prioritario antes de los formularios: margen ponderado, productos bajo objetivo, productos sin costo y brecha sugerida por stock actual.
- Se incorporan dos graficas ApexCharts compactas: dona de salud de margen y barra horizontal de PVP actual vs PVP sugerido para productos con mayor brecha.
- Se agregan filtros accionables por riesgo: todos, margen negativo, bajo minimo, bajo objetivo, sin costo y saludable.
- El listado de impacto deja de ser tabla y pasa a tarjetas con imagen/placeholder, SKU, stock, costo, PVP, margen, PVP sugerido, brecha y accion `Editar ficha`.
- En mobile, los KPIs de precios usan dos columnas responsivas, las graficas se contienen sin overflow y las tarjetas pasan a una columna legible.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `npm run docker:up`; no se tocaron production, DB, Backend PHP, Frontend publico, Gateway, Facturador, SRI, certificados ni datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run docker:health`, `npm run runtime:check`, `./scripts/check-container-connectivity.sh development`, `git -C Dashboard diff --check` y `git -C paramascotasec diff --check`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/finance/prices` responde 200.
- Validacion Playwright desktop/mobile con datos simulados confirma dos graficas renderizadas, filtros accionables, panel visible dentro del primer viewport y cero overflow horizontal en 1365px y 390px.

Pendiente:
- Continuar auditoria pantalla por pantalla, especialmente `Impuestos`, `Margenes`, `Calculos`, `Reglas de precio`, `Gastos` y subflujos financieros que aun pueden requerir comparacion fina con `/my-account`.

### 2026-06-15 - Dashboard QA: Facturas PDF con Graficas y Filtro por Periodo

Objetivo: mejorar `Operacion > Facturas PDF` para que sea una pantalla operativa de facturacion, no solo una lista, manteniendo consumo nativo de `GET /api/admin/billing/rides?limit=150`.

Cambios:
- Se agregan dos graficas ApexCharts nativas: dona de salud SRI/PDF y grafica de facturacion por periodo.
- La dona clasifica cada factura en un unico estado visual: autorizada, reemitible, auditoria, sin PDF o revisar SRI, evitando conteos solapados.
- Se agrega panel de periodos con total facturado, cantidad de facturas y documentos por revisar; cada periodo filtra la lista y sincroniza el detalle seleccionado.
- El filtro superior ahora incluye periodo junto a busqueda y estado, manteniendo los filtros accionables por Total, Autorizadas, PDF y Revisar.
- Se conserva el detalle operativo: abrir PDF, anular y reemitir cuando aplica, clave de acceso, cliente, fechas, estado SRI/PDF y trazabilidad de reemision.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `npm run docker:up`; no se tocaron production, DB, Backend PHP, Frontend publico, Gateway, Facturador, SRI, certificados ni datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run docker:health`, `npm run runtime:check`, `./scripts/check-container-connectivity.sh development`, `git -C Dashboard diff --check` y `git -C paramascotasec diff --check`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/operations/billing-rides` responde 200.
- Validacion Playwright desktop/mobile con datos simulados confirma dos graficas renderizadas, dona con total real de 5 facturas, filtro por periodo reduciendo lista de 5 a 2 facturas, detalle sincronizado y cero overflow horizontal.

Pendiente:
- Continuar auditoria pantalla por pantalla, especialmente pantallas financieras secundarias, precios/impuestos/margenes y formularios/tablas extensas aun no comparados con `/my-account`.

### 2026-06-15 - Dashboard QA: Titulos Globales y Balances Mobile

Objetivo: corregir titulos desproporcionados en las pantallas nativas del Dashboard Paramascotas y estabilizar la vista mobile, avanzando especialmente `Operacion > Balances`.

Cambios:
- Se reduce la escala global de encabezados en `dashboard-overrides.css`: `h1`, `PageHeader`, `h2` y `h3` quedan compactos dentro de `dashboard-main`.
- `Paramascotas panel` agrega overrides propios para `PageHeader`, cards, headers internos, KPIs y estados, evitando que el template base vuelva a inflar titulos.
- `Balances` agrega un panel de periodo seleccionado junto a la grafica financiera, con venta neta, pedidos, costo, utilidad, gastos, pendientes/vencidos, ajustes y utilidad neta.
- Los KPIs financieros y tarjetas de tendencia quedan mas densos; la tabla de balances recibe `data-label` y en mobile se convierte en cards con grilla de dos columnas para no desperdiciar alto ni producir scroll horizontal.
- Se mantiene el consumo interno directo del Dashboard hacia el backend; no se cambio ninguna firma API ni se encadeno trafico interno por APISIX.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `npm run docker:up`; no se tocaron production, DB, Facturador, SRI, certificados ni datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run docker:health`, `npm run runtime:check`, `./scripts/check-container-connectivity.sh development`, `git -C Dashboard diff --check` y `git -C paramascotasec diff --check`.
- `npm run build` local no pudo ejecutarse porque el host tiene Node `v22.22.2` y Angular CLI exige `v22.22.3+`, `v24.15+` o `v26+`; el build Docker de `npm run docker:up` compilo correctamente con `node:26-alpine`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/reporting/general`, `/dashboard/paramascotas-panel/operations/balances` y `/dashboard/paramascotas-panel/operations/admin-orders` responden 200.
- Validacion Playwright desktop/mobile confirma titulos compactos (`18px` desktop y `16px` mobile), cero overflow horizontal; con datos simulados, `Balances` muestra 15 filas como cards mobile en dos columnas y panel de periodo seleccionado.

Pendiente:
- Continuar auditoria pantalla por pantalla, especialmente pantallas financieras secundarias y formularios/tablas extensas aun no revisados con datos reales de sesion admin.

### 2026-06-15 - Dashboard QA: Cotizaciones Accionables

Objetivo: mejorar `Operacion > Cotizaciones` como pantalla dedicada, manteniendo consumo nativo y firmas reales `/api/admin/quotes`, `/api/admin/quotes/:id/convert`, `/api/orders/quote` y `/api/admin/pos/*`.

Cambios:
- Se agregan KPIs accionables de cotizaciones: total, abiertas, convertidas, vencidas y canceladas; filtran el historial sin cambiar de pantalla.
- La tabla de cotizaciones permite seleccionar una cotizacion desde el ID, marca la fila seleccionada y alimenta el panel de conversion.
- El panel `Convertir` muestra detalle de la cotizacion seleccionada: cliente, contacto, estado, total, items, unidades, vencimiento, direccion y venta generada cuando existe.
- Se normalizan estados de cotizacion (`quoted`, `converted`, `expired`, `cancelled`) para que KPIs, badges, filtros y detalle usen el mismo criterio.
- En mobile los KPIs bajan a una columna controlada y el historial sigue usando tarjetas sin overflow.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `npm run docker:up`; no se tocaron production, DB, Facturador, SRI, certificados ni datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run docker:health`, `npm run runtime:check`, `./scripts/check-container-connectivity.sh development`, `git -C Dashboard diff --check` y `git -C paramascotasec diff --check`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/operations/quotations` responde 200.
- Validacion Playwright desktop/mobile con datos simulados confirma cero overflow horizontal, KPIs interactivos, filtros por estado, seleccion de cotizacion y panel de detalle.

Pendiente:
- Continuar auditoria pantalla por pantalla, especialmente `Balances` operativos, pantallas financieras secundarias y flujos con formularios/tablas extensas.

### 2026-06-15 - Dashboard QA: Venta en Local POS Compacta

Objetivo: mejorar `Operacion > Venta en local` y el bloque compartido con `Cotizaciones`, manteniendo consumo nativo de APIs internas y las firmas reales `/api/admin/pos/*`, `/api/orders/quote`, `/api/orders` y `/api/admin/quotes`.

Cambios:
- `Venta en local` reemplaza la tabla rigida de catalogo por tarjetas compactas con imagen, marca, categoria, SKU, precio, stock y boton `Agregar`.
- El item POS interno ahora conserva `imageUrl`, `imageAlt`, `brand` e `inventoryStatus`; las imagenes usan normalizacion compatible con `/dashboard/` y fallback visual si falla la carga.
- El carrito se reorganiza en filas compactas con imagen, SKU, precio, stock, controles de cantidad, total, utilidad y accion `Quitar` sin montarse sobre otros elementos.
- Se agrega grafica ApexCharts de caja POS por efectivo/electronico/diferencia dentro del panel de caja abierta.
- El layout principal usa una grilla de tres zonas: catalogo, carrito/cliente y caja/cobro/movimientos; en mobile baja a una columna sin overflow.
- El historial reciente de cotizaciones queda en `paramascotas-contained-table` y en mobile se transforma en tarjetas con etiquetas.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `npm run docker:up`; no se tocaron production, DB, Facturador, SRI, certificados ni datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run docker:health`, `npm run runtime:check`, `./scripts/check-container-connectivity.sh development`, `git -C Dashboard diff --check` y `git -C paramascotasec diff --check`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/operations/local-sales` y `/dashboard/paramascotas-panel/operations/quotations` responden 200.
- Validacion Playwright desktop/mobile con datos simulados confirma cero overflow horizontal, catalogo con imagenes, agregar al carrito, grafica POS renderizada, historial de cotizaciones y `brokenImages=0`.

Pendiente:
- Continuar auditoria pantalla por pantalla, especialmente `Cotizaciones` en modo dedicado, `Balances` operativos y pantallas secundarias con flujos de seleccion/convertir.

### 2026-06-15 - Dashboard QA: Pedidos con Grafica y Mobile Cards

Objetivo: mejorar `Operacion > Pedidos` para que la administracion de pedidos sea compacta, operativa y estable en mobile, manteniendo las firmas reales `GET /api/orders`, `GET /api/orders/:id` y `PATCH /api/orders/:id/status`.

Cambios:
- Los KPIs de pedidos pasan a ser filtros accionables por estado y respetan el rango de fecha seleccionado.
- Se agrega grafica ApexCharts de distribucion por estado y una cola operativa de pedidos prioritarios con acceso directo al detalle.
- La tabla de pedidos queda dentro de `paramascotas-contained-table`; en mobile se transforma en tarjetas con etiquetas `Pedido`, `Cliente`, `Fecha`, `Entrega / pago`, `Total`, `Estado` y `Acciones`.
- El detalle de pedido conserva cliente, resumen, entrega/pago, direcciones, productos, cambio de estado y comprobante interno; las imagenes de productos ahora usan fallback relativo compatible con `/dashboard/` y manejan errores de carga.
- Los conteos de chips, KPIs, grafica y tabla usan el mismo subconjunto filtrado por fecha para evitar inconsistencias.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `npm run docker:up`; no se tocaron production, DB, Facturador, SRI, certificados ni datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run docker:health`, `npm run runtime:check`, `./scripts/check-container-connectivity.sh development`, `git -C Dashboard diff --check` y `git -C paramascotasec diff --check`.
- `npm run build` local no pudo ejecutarse porque el host tiene Node `v22.22.2` y Angular CLI exige `v22.22.3+`, `v24.15+` o `v26+`; el build Docker de `npm run docker:up` si compilo correctamente con `node:26-alpine`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/operations/admin-orders` responde 200.
- Validacion Playwright desktop/mobile con datos simulados confirma cero overflow horizontal, grafica renderizada, KPIs interactivos, modal de detalle y `brokenImages=0`.

Pendiente:
- Continuar auditoria pantalla por pantalla, especialmente `Venta en local`, `Cotizaciones` y pantallas secundarias con formularios extensos.

### 2026-06-15 - Dashboard QA: Envios y Mapa Operativo

Objetivo: compactar y volver accionable la pantalla `Operacion > Envios y mapa`, manteniendo las mismas firmas API de `/my-account` y sin encadenar trafico interno por APISIX.

Cambios:
- `Envios y mapa` reemplaza tarjetas pasivas por KPIs accionables: Domicilio, Retiro, Radio gratis y Logistica filtran el panel operativo sin navegar.
- Se agrega un tablero de cobertura y reglas con direccion local, radio gratis, limite de tarifa plana, IVA de envio, busqueda de mapa, cooldown y consultas por sesion.
- El panel de foco alterna proveedores logisticos, recogidas programadas, pedidos para retiro, pedidos a domicilio y reglas de mapa con listas compactas y mobile-safe.
- Las llamadas se mantienen en `GET /api/shipments`, `GET/PUT /api/admin/settings/shipping` y `GET /api/orders` a traves del proxy interno directo del Dashboard; APISIX queda solo para entrada externa.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `npm run docker:up`; no se tocaron production, DB, Facturador, SRI, certificados ni datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run build`, `npm run docker:health`, `npm run runtime:check`, `./scripts/check-container-connectivity.sh development`, `git -C Dashboard diff --check` y `git -C paramascotasec diff --check`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/operations/shipments` responde 200.
- Validacion Playwright desktop/mobile con datos simulados confirma cero overflow horizontal, foco interactivo de Domicilio/Retiro y titulos compactos.

Pendiente:
- Continuar auditoria pantalla por pantalla, especialmente flujos de Pedidos, Venta local y pantallas secundarias con tablas o formularios extensos.

### 2026-06-15 - Dashboard QA: Usuarios con Filtros Accionables y Mobile Cards

Objetivo: mejorar `Catalogo > Usuarios` para que la administracion de usuarios del Dashboard sea mas compacta, accionable y legible en mobile, manteniendo las mismas firmas reales de `/api/users`.

Cambios:
- Los KPIs `Clientes`, `Admins`, `Verificados` y `Bloqueados` pasan a ser botones de filtro rapido; limpian la busqueda, aplican rol/estado y llevan al listado.
- Se agrega filtro de estado: todos, verificados, sin verificar, bloqueados y con pedidos.
- El resumen del listado muestra usuarios encontrados, usuarios con pedidos y total facturado.
- La tabla queda dentro de `paramascotas-contained-table` con ancho controlado y layout de dos columnas mas balanceado para dar mas espacio al listado frente al formulario.
- En mobile, la tabla de usuarios se transforma en tarjetas con etiquetas `Usuario`, `Rol`, `Pedidos`, `Facturado`, `Seguridad` y `Acciones`.
- La lectura de `email_verified` ahora normaliza booleanos, numeros y strings para evitar tratar `"false"` como verificado.
- No se cambio la firma de APIs ni el modelo de red interna: se conservan `GET/POST/PUT /api/users` y `POST /api/users/:id/unlock` por el proxy interno directo del Dashboard.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `npm run docker:up`; no se desplego production ni se tocaron DB, Backend, Gateway, Facturador, SRI, certificados o datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run docker:health`, `npm run runtime:check`, `git diff --check` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/catalog/users` responde 200.
- Validado con Playwright en desktop 1440px y mobile 390px usando respuestas representativas de `/dashboard/api/users`: sin overflow horizontal, H1 22px/20px, filtros dentro del viewport, KPIs filtran bloqueados a 1 fila, badges de rol sin wrap y mobile usa filas tipo tarjeta (`display: block`).

Pendiente:
- Continuar la auditoria pantalla por pantalla contra `/my-account`, especialmente `Envios y mapa`, `Pedidos`, `Venta en local` y demas pantallas que todavia pueden requerir cards/drilldowns/graficas especificas.

### 2026-06-15 - Dashboard QA: Inventario Accionable y Mobile Card Layout

Objetivo: mejorar `Catalogo > Inventario` para que deje de depender de una tabla ancha como superficie principal en mobile, agregue lectura visual compacta y mantenga acciones de inventario consumiendo las mismas APIs reales.

Cambios:
- Los KPIs de inventario ahora son botones de filtro rapido: todos, sin stock/criticos, por vencer, compra sugerida y riesgo operativo filtran la tabla y llevan al usuario al resultado.
- `Panorama por categoria` agrega grafica Apex horizontal de capital al costo por categoria, conservando debajo la lista compacta con SKUs, bajo/critico y por vencer.
- Las filas de inventario muestran imagen/fallback del producto, SKU, categoria, marca, inventario, decision recomendada, trazabilidad de lote/proveedor y precios/capital.
- Los filtros superiores de inventario se compactan para que el boton `Limpiar` no quede fuera del viewport en escritorio.
- En mobile, la tabla de inventario se transforma en tarjetas con etiquetas `Producto`, `Inventario`, `Decision`, `Trazabilidad`, `Precios` y `Acciones`, evitando una tabla ancha poco legible.
- No se cambio la firma de APIs ni el modelo de red interna: se mantienen `GET /api/products?scope=admin`, `GET /api/admin/inventory/intelligence` y `GET /api/admin/purchase-invoices` por el proxy interno directo del Dashboard.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `npm run docker:up`; no se desplego production ni se tocaron DB, Backend, Gateway, Facturador, SRI, certificados o datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run docker:health`, `npm run runtime:check`, `git diff --check` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/catalog/inventory` responde 200.
- Validado con Playwright en desktop 1440px y mobile 390px usando respuestas representativas de las mismas rutas internas: sin overflow horizontal, H1 22px/20px, filtros dentro del viewport, 1 grafica Apex, imagenes de producto renderizadas, filtro rapido reduce resultados y mobile usa filas tipo tarjeta (`display: block`).

Pendiente:
- Continuar la auditoria pantalla por pantalla contra `/my-account`, especialmente subflujos de compra/facturas, modales de detalle y pantallas de operacion que aun pueden beneficiarse de drilldowns.

### 2026-06-15 - Dashboard QA: Balance General con Grafica Financiera

Objetivo: mejorar `Balance general` para que muestre la tendencia financiera como grafica nativa, reduzca el espacio consumido por tarjetas repetidas y mantenga la tabla larga contenida.

Cambios:
- `Balance general` agrega `financialBalanceTrendChart` con ApexCharts sobre `financialTrendRows`: venta neta, gastos del periodo, utilidad neta y caja.
- La grafica de balance se renderiza antes de los botones de tendencia, usando la misma data real de `/api/admin/dashboard/stats` que ya alimenta la vista.
- La grilla de dias/meses queda como control interactivo compacto con scroll interno (`paramascotas-trend-grid--compact`) para no ocupar toda la pantalla cuando hay muchos puntos.
- La tabla financiera de 12 columnas queda dentro de `paramascotas-contained-table`, manteniendo scroll horizontal interno sin romper el viewport.
- No se cambio la firma de APIs ni el modelo de red interna; el Dashboard sigue consumiendo directo por proxy interno y APISIX solo se usa como entrada externa.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `npm run docker:up`; no se desplego production ni se tocaron DB, Facturador, SRI, certificados o datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run build`, `npm run docker:health`, `npm run runtime:check`, `git diff --check` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/reporting/balance` responde 200 y el bundle publicado contiene `financialBalanceTrendChart`.
- Validado con Playwright en desktop 1365px y mobile 390px usando respuestas representativas de las mismas rutas internas: sin overflow horizontal, H1 22px/20px, 1 grafica Apex de balance, 30 trend cards contenidas en 368px y tabla contenida.

Pendiente:
- Continuar la auditoria pantalla por pantalla contra `/my-account`, especialmente vistas de inventario/operacion que aun pueden requerir mas graficas, drilldowns y presentacion visual de productos.

### 2026-06-15 - Dashboard QA: Reporte de Ventas con Graficas Nativas

Objetivo: mejorar `Reporte de ventas` para que use graficas reales, aproveche mejor el espacio en desktop comun y mantenga una vista legible en mobile.

Cambios:
- `Reporte de ventas` reemplaza la tabla como superficie principal por un layout operativo con tendencia comercial, categorias por venta neta, productos lideres y ventas recientes.
- Se agregan charts Apex calculados desde `financialReport` y `financialStats`: area de venta neta/utilidad/costo, dona de categorias y barras horizontales de productos.
- Las listas de detalle quedan compactas con scroll interno y la tabla de ventas recientes queda contenida dentro de `paramascotas-contained-table`.
- La grilla de la pantalla pasa de `col-xxl` a `col-xl` para usar dos columnas ya en escritorios de 1365px, evitando tarjetas full-width innecesarias.
- No se cambio la firma de APIs ni el modelo de red interna; el Dashboard sigue consumiendo directo por proxy interno y APISIX solo se usa como entrada externa.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `npm run docker:up`; no se desplego production ni se tocaron DB, Facturador, SRI, certificados o datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run build`, `npm run docker:health`, `npm run runtime:check`, `git diff --check` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/reporting/sales` responde 200 y el bundle publicado contiene `Tendencia comercial`, `Productos lideres` y `financialSalesTrendChart`.
- Validado con Playwright en desktop 1365px y mobile 390px usando respuestas representativas de las mismas rutas internas: sin overflow horizontal, H1 22px/20px, 3 frames de grafica, 3 ApexCharts renderizados y tabla contenida.

Pendiente:
- Continuar la auditoria pantalla por pantalla contra `/my-account`, especialmente vistas que aun tienen tablas como superficie principal o widgets sin drilldown.

### 2026-06-15 - Dashboard QA: Reporte General con Graficas Compactas

Objetivo: mejorar `Reporte general` dentro del Dashboard nativo para que deje de depender de barras HTML simples, mantenga escala compacta y se vea correctamente en desktop/mobile.

Cambios:
- `Reporte general` integra `NgApexchartsModule` y genera opciones calculadas desde los datos reales de `/api/admin/report`: dona de ventas por categoria y barras horizontales de productos por venta neta.
- Las listas de detalle por categoria/producto se conservan como apoyo compacto con scroll interno, sin agrandar innecesariamente las tarjetas.
- Se agregan restricciones CSS para que ApexCharts no desborde el ancho del contenedor y para mantener alturas compactas en mobile.
- No se cambio la firma del API ni el ruteo interno: el Dashboard sigue consumiendo el backend por su proxy interno directo; APISIX queda solo como entrada publica.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `npm run docker:up`; no se desplego production ni se tocaron DB, Facturador, SRI, certificados o datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run build`, `npm run docker:health`, `npm run runtime:check`, `git diff --check` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/reporting/general` responde 200 y el bundle publicado contiene `paramascotas-report-chart-frame` y `buildReportCategoryChart`.
- Validado con Playwright en desktop 1365px y mobile 390px usando datos representativos interceptados para el GET admin: sin overflow horizontal, H1 22px/20px, 2 frames de grafica y 2 ApexCharts renderizados.

Pendiente:
- Continuar paridad visual/operativa pantalla por pantalla con `/my-account`, especialmente flujos secundarios y pantallas que aun heredan tablas o layouts del template.

### 2026-06-15 - Dashboard QA: Facturas PDF en Workspace Nativo

Objetivo: mejorar `Operacion > Facturas PDF` para acercarla al panel `/my-account`, evitando una tabla ancha como superficie principal y manteniendo acciones operativas de RIDE.

Cambios:
- La vista `Facturas PDF` pasa de tabla principal a workspace nativo con KPIs clicables, filtros, lista de documentos y panel de detalle del RIDE seleccionado.
- Los KPIs `Total`, `Autorizadas`, `PDF` y `Revisar` ahora actuan como filtros rapidos; la alerta de error operativo filtra directamente documentos marcados para auditoria.
- Se agrega seleccion sincronizada de factura: al cargar, buscar o cambiar filtro, el panel mantiene un documento valido seleccionado o muestra estado vacio.
- El detalle muestra secuencial, estado SRI, estado PDF, total/IVA, fecha de venta/SRI/PDF, cliente, correo, clave de acceso, establecimiento, punto de emision, secuencial, ambiente y trazabilidad de reemision.
- Se conservan las acciones reales `Abrir PDF` y `Anular y reemitir` usando las mismas llamadas internas del Dashboard al backend; no se agrego iframe ni consumo interno por APISIX.
- CSS nuevo `paramascotas-billing-*` evita overflow horizontal, rompe claves largas con `overflow-wrap`, apila acciones en mobile y mantiene layout compacto en desktop/tablet.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `npm run docker:up`; no se desplego production ni se tocaron backend, DB, Gateway, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, build con Node 26 en contenedor, `npm run docker:health`, `npm run runtime:check`, `git diff --check` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/operations/billing-rides` responde 200; el chunk publicado `chunk-CKBKIICQ.js` contiene `Factura seleccionada`, `setBillingStatusFilter`, `selectedBillingRide`, `Anular y reemitir` y `Clave de acceso`.
- Validado visualmente con Playwright en desktop 1365x768 y mobile 390x844: el workspace no produce overflow horizontal y el layout se apila correctamente en mobile.

Pendientes:
- La paridad completa con `/my-account` sigue abierta en otras opciones: continuar revisando graficas, subflujos, modales, selects, cargas de imagen y acciones secundarias.

### 2026-06-15 - Dashboard QA: Escala Global y Shell Mobile

Objetivo: corregir titulos gigantes, proporciones desbalanceadas y problemas de mobile donde el sidebar ocupaba espacio/cortaba el contenido del Dashboard.

Cambios:
- `dashboard-overrides.css` refuerza escala global dentro de `.dashboard-main`: H1/H2/H3, utilidades de texto, `app-page-header`, headers de cards, botones y paddings quedan en tamanos de panel operativo.
- El sidebar del Dashboard inicia cerrado en mobile, se comporta como drawer overlay y se cierra al navegar para no dejar una columna lateral tapando contenido.
- El branding lateral usa icono compacto + nombre del tenant, evitando que el wordmark TECNOLTS y `ParaMascotasEC` se monten.
- Se mantienen tablas y cards contenidas sin overflow horizontal global; el dashboard real conserva el consumo de APIs por proxy interno directo, sin encadenar llamadas internas via APISIX.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `npm run docker:up`; no se desplego production ni se tocaron backend, DB, Gateway, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, build con Node 26 en contenedor, `npm run docker:health`, `npm run runtime:check`, `git diff --check` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/reporting/general` responde 200 y publica los chunks `styles-GCD4B4KU.css`/`main-W44XQB3R.js`.
- Validado visualmente con Playwright en desktop 1365x768 y mobile 390x844: sin overflow horizontal, H1 de `Reporte general` queda en 22px desktop y 20px mobile, el sidebar mobile queda fuera de pantalla cerrado y el logo lateral no se superpone.

Pendientes:
- La paridad completa con `/my-account` sigue abierta: continuar pantalla por pantalla con graficas, subflujos, modales, selects, cargas de imagen, acciones secundarias e interaccion de widgets.

### 2026-06-15 - Dashboard QA: Productos x Compra Nativo

Objetivo: avanzar la paridad del Dashboard con `/my-account` en la vista `Reportes > Productos x Compra`, eliminando la tabla pasiva y dando detalle real de ventas, compras, lotes y facturas sin modo embebido.

Cambios:
- `Productos x Compra` pasa a una vista nativa compacta con KPIs, filtros `Ventas/Compras`, busqueda, filtros rapidos, lista de productos con imagen/fallback, datos de marca/categoria/SKU y metricas por producto.
- Al seleccionar un producto, el Dashboard consulta `GET /api/products/{id}?scope=admin&procurement_detail=1` por el proxy interno del Dashboard hacia el backend, no via APISIX interno.
- El detalle muestra PVP, costo ponderado, capital en stock, margen de stock, ventas/utilidad del periodo, compras registradas, unidades consumidas/restantes, costos minimo/maximo y utilidad estimada del stock.
- Los lotes de compra se muestran en una tabla contenida con scroll interno; cada lote enlazado permite abrir el detalle de la factura de compra.
- Se agrega modal nativo de factura de compra usando `GET /api/admin/purchase-invoices/{id}` con proveedor, fecha, subtotal, IVA, total, lineas de productos y calculo de impuesto por linea.
- Se refuerza CSS responsive para que la vista apile en mobile y evite tablas fuera de pantalla o textos montados.

Operacion y verificacion:
- Se desplego solo `Dashboard` con `npm run docker:up`; no se desplego production ni se tocaron backend, DB, Gateway, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, build con Node 26 en contenedor, `npm run docker:health`, `npm run runtime:check`, `git diff --check` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/reporting/products-purchases` responde 200 y el bundle publicado contiene `Ventas vs compras por producto`, `getProductProcurementDetail` y `Factura de compra`.
- El contrato operativo se mantiene: APISIX queda como entrada externa; la comunicacion Dashboard -> backend se hace por proxy interno hacia los contenedores/redes internas.

Pendientes:
- La paridad completa con `/my-account` sigue abierta en otras opciones del menu: faltan mas subflujos, modales, graficas especificas y acciones secundarias de compras, facturacion, productos, POS, pedidos y configuraciones.

### 2026-06-15 - Dashboard QA: Paquetes de Negocio e Interactividad Inicial

Objetivo: convertir el dashboard QA en una consola mas util para Paramascotas, evitando plantillas genericas y preparando el superadmin para vender/habilitar modulos reales por cliente.

Cambios:
- Dashboard agrega un catalogo de tipos de negocio combinables sobre `enabledModules`: ecommerce petshop, ecommerce tecnologia, facturacion, comunicaciones/correo, sistema de inventario, consultorio medico, plataforma y templates.
- El superadmin de tenants muestra clientes y paquetes contratados; cada paquete agrupa modulos habilitables y modulos internos esperados. Los permisos siguen saliendo de `enabledModules` para no romper el modelo actual.
- Se agregan las claves de modulo `email-service` y `medical-office`; el fixture de Paramascotas queda limitado a ecommerce petshop y modulos comprados/visibles, sin activar tecnologia, correo ni consultorio medico por accidente.
- El dashboard real de Paramascotas conserva consumo interno directo hacia el backend, no a traves de APISIX; APISIX queda para el contrato externo por `https://paramascotasec.com/dashboard`.
- Los widgets iniciales de inventario en `Paramascotas backend` ahora son accionables: sin stock, stock bajo, critico, sobrestock, riesgo y catalogo abren un drilldown con productos filtrados, imagen, precio y estado. El snapshot conserva el catalogo completo para ese drilldown y limita solo la vista previa.

Operacion y verificacion:
- Se desplego solo el Dashboard QA con `cd Dashboard && npm run docker:up`; no se desplegaron backend, frontend publico, Gateway, DB, Facturador ni production.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run build`, `npm run docker:health`, `npm run runtime:check`, `./scripts/check-container-connectivity.sh development` y `git diff --check` en los repos tocados.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-backend` y `/dashboard/tenant-admin` responden 200.
- No se tocaron datos, certificados, secretos, SRI, Facturador, facturas ni produccion.

Pendientes:
- La paridad completa con `/my-account` sigue abierta: faltan mas pantallas nativas, modales de detalle, cargas de imagen, facturas/compras avanzadas y hacer accionables todos los widgets relevantes, no solo los de inventario/riesgo iniciales.

### 2026-06-15 - Dashboard nativo: Trazabilidad y Catalogo Visual

Objetivo: avanzar la paridad visual/operativa del Dashboard nativo con `/my-account`, corrigiendo pantallas con poco valor informativo, productos sin presentacion visual y tablas que podian expandir el layout en mobile.

Cambios:
- `Reporte de trazabilidad` deja de ser una lista simple y pasa a un panel compacto con resumen de cobertura, ventas auditadas, utilidad, margen, incidencias criticas/advertencias, productos vinculados, filtros por severidad/tipo, cola de acciones, pedidos auditados y productos auditados.
- La trazabilidad detecta incidencias desde los datos reales ya cargados: pedidos sin contacto/documento/pago/entrega, productos vendidos sin costo, margen negativo/bajo, productos sin referencia en items de pedidos y fichas incompletas.
- `Productos` reemplaza la tabla principal por tarjetas responsivas con miniatura real, fallback visual, SKU, marca, categoria, especie, publicacion, stock, PVP, costo, margen, numero de imagenes y acciones `Editar`, `Publicar/Ocultar` y `Retirar`.
- Se agrega un bloque grafico compacto de salud del catalogo: publicados, con imagen, stock bajo y margen en riesgo.
- `dashboard-overrides.css` refuerza contencion global de cards y tablas (`table-responsive` con scroll interno, `overflow-wrap` y max-width) para evitar que tablas anchas rompan pantallas moviles.

Operacion y verificacion:
- Se reconstruyo solo `Dashboard` con `npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run build`, `npm run docker:health`, `npm run runtime:check`, `git -C Dashboard diff --check`, `git -C paramascotasec diff --check` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/catalog/products` y `/dashboard/paramascotas-panel/reporting/traceability` responden 200; el bundle publicado contiene `paramascotas-product-card` y `Control de trazabilidad`.

Pendiente:
- La paridad total del Dashboard con todas las opciones y subflujos de `/my-account` sigue abierta; continuar auditoria pantalla por pantalla, especialmente flujos con selects avanzados, graficas especificas, detalle de compras/facturas y acciones secundarias.

### 2026-06-15 - Dashboard: Titulos Compactos y Mobile

Objetivo: corregir que pantallas del Dashboard siguieran heredando titulos gigantes del template y que el layout movil mostrara contenido cortado o mal distribuido.

Cambios:
- Se agrega `src/dashboard-overrides.css` cargado despues de `public/assets/css/style.css`, reduciendo las variables globales `--h1`, `--h2`, `--h3`, `--h4`, `--h5` y `--h6` que el template usa con `!important`.
- `PageHeaderComponent` fuerza titulos compactos y ajusta icono, descripcion y acciones en mobile.
- El shell movil corrige ancho del contenido, drawer del sidebar, chips de usuario y boton de logout para evitar scroll horizontal y texto cortado.
- `Paramascotas panel` reduce titulos internos, KPIs y tarjetas de reporte; `Ventas por categoria` y `Productos por venta neta` pasan a una grilla compacta de dos columnas en escritorio y una columna en mobile.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `npm run docker:up`; no se desplego production ni se tocaron DB, Facturador, SRI, certificados o datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run build`, `npm run docker:health`, `npm run runtime:check`, `git diff --check` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/reporting/general` responde 200; el bundle publicado contiene `paramascotas-report-grid`, variables compactas y reglas de sidebar mobile.

### 2026-06-15 - Dashboard: Graficas Reales y Modulos Verticales

Objetivo: corregir la vista `Paramascotas backend` para que use visualizaciones utiles y compactas, y separar Paramascotas como modulo tenant de e-commerce petshop en lugar de mezclarlo con demos genericos.

Cambios:
- `Paramascotas backend` integra ApexCharts reales: area de ventas/utilidad/caja por periodo, dona de riesgo de inventario, dona de estados de pedidos y barras horizontales de ranking de productos.
- Las graficas usan los datos ya consumidos del backend interno por el Dashboard, respetando los filtros superiores `Dia`, `Semana`, `Mes`, `Anio` y `Total`.
- Se agregan modulos tenant verticales `ecommerce-petshop` y `ecommerce-technology` al catalogo SaaS del Dashboard, con permisos CRUD dedicados.
- Las rutas y menus Paramascotas (`Paramascotas backend`, reportes, monitoreo, catalogo, operacion, precios y finanzas) ahora requieren `ecommerce-petshop.read`.
- El tenant fixture de Paramascotas habilita `ecommerce-petshop` y excluye `ecommerce-technology`; los tenants demo/full pueden habilitar ambos para compra o prueba separada.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `npm run docker:up`; no se desplego production ni se tocaron DB, Facturador, SRI, certificados o datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run build`, tests unitarios focalizados del Dashboard (26/26), `npm run docker:health`, `npm run runtime:check`, `git diff --check` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-backend` responde 200 y el bundle publicado contiene `apx-chart`, `ecommerce-petshop` y `ecommerce-technology`.

### 2026-06-15 - Dashboard: Escala Compacta y Cache Busting Visual

Objetivo: corregir que `Paramascotas backend` siguiera mostrando titulos y tarjetas desproporcionados, con desperdicio de espacio visible en QA local.

Cambios:
- `Paramascotas backend` reduce escala visual: H1 18px, titulos de panel 16px, KPIs y tablas mas densos, menor padding y tarjetas sin altura minima artificial.
- La grilla principal se reorganiza: `Ventas del periodo` queda como bloque principal y `Inventario`, `Pedidos` y `Alertas` se apilan en una columna lateral para evitar tarjetas enormes vacias.
- El build `development` del Dashboard activa `outputHashing=all`, de modo que los lazy chunks cambian de nombre cuando cambia la pantalla.
- Nginx del Dashboard agrega `Cache-Control: no-store` en `/dashboard/*` para evitar que el navegador conserve chunks viejos del SPA.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `npm run docker:up`; no se desplego production ni se tocaron DB, Facturador, SRI, certificados o datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run build`, `npm run docker:health`, `npm run runtime:check` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-backend` responde 200; `main-*.js` y el chunk `paramascotas-backend-component` responden 200 con `Cache-Control: no-store`.

### 2026-06-15 - Dashboard: Catalogos con Carga Interna de Imagenes

Objetivo: avanzar la paridad de `Catalogos operativos` con `/my-account`, especialmente en carga de imagenes para marcas y categorias sin iframe ni llamadas internas a APISIX.

Cambios:
- `ParamascotasAdminApiService.uploadProductImage()` acepta los kinds reales del handler Next (`brandLogo`, `categoryTop`, etc.) ademas de `thumb`/`gallery`.
- La vista nativa `Catalogos operativos` permite subir archivo JPG/PNG/WebP para `Logo` de marca y para los cinco slots publicos de categoria usando `/dashboard/api/uploads/images`: superior 4:5, movil grande, movil pequena, desktop grande y desktop horizontal.
- El formulario valida nombre previo, formato y limite de 8 MB, bloquea agregar/guardar mientras sube y actualiza `logoUrl`, `topImageUrl` o `featuredImages` con la URL devuelta por el backend.
- Las filas de catalogo muestran preview con la primera imagen disponible y resumen `n/5 imagenes configuradas` para categorias.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `npm run docker:up`; no se desplego production ni se tocaron DB, Facturador, SRI, certificados o datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run build`, `npm run docker:health`, `npm run runtime:check`, `git diff --check` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/catalog/catalogs` responde 200; `HEAD /dashboard/api/uploads/images` responde 405 desde el handler Next, esperado para endpoint POST-only; `POST /dashboard/api/uploads/images` sin sesion admin responde 401.
- Validado dentro del contenedor `dashboard`: nginx efectivo mantiene `proxy_pass http://paramascotasec-frontend:3000/api/uploads/images` para subidas y `proxy_pass http://paramascotasec-backend-web:8080/api/` para API PHP.

### 2026-06-15 - Dashboard: Paramascotas Backend Operativo Compacto

Objetivo: redisenar la opcion `Paramascotas backend` para que sea un dashboard util, denso y entendible, evitando titulos/tarjetas sobredimensionadas y desperdicio de espacio.

Cambios:
- `Paramascotas backend` reemplaza el `PageHeader` grande por una barra superior compacta con filtros a la derecha: Dia, Semana, Mes, Anio y Total.
- El facade/API del Dashboard ahora consulta `/api/admin/dashboard/stats` con `date`, `scope=week`, `period=YYYY-MM` o `scope=historical` segun el filtro; el filtro anual se calcula desde `financialTrends.monthly` del backend.
- La vista muestra KPIs compactos de ventas netas, pedidos, utilidad bruta, utilidad de caja, gastos, alertas de stock y ticket promedio.
- Se reorganizan secciones de tendencia, inventario, pedidos por estado, alertas, pedidos recientes, ranking de productos, salud publica y catalogo publico en un grid denso sin tarjetas gigantes.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `npm run docker:up`; no se desplego production ni se tocaron DB, Facturador, SRI, certificados o datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run build`, `npm run docker:health`, `npm run runtime:check`, `git diff --check` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-backend` responde 200, `/dashboard/api/health` responde OK y `/dashboard/api/admin/dashboard/stats?include_report=1&period=2026-06` responde 401 sin cookie admin, como corresponde.

### 2026-06-15 - Dashboard: Productos con Carga Interna de Imagenes

Objetivo: cerrar una brecha funcional de `Productos` frente a `/my-account`, manteniendo el consumo interno directo y sin encadenar llamadas internas hacia APISIX.

Cambios:
- `Dashboard/nginx.conf`, `Dockerfile`, `docker-compose.yml`, `.env`, `.env.example` y tools de entorno agregan `TECNOLTS_UPLOAD_PROXY_URL`, separado de `TECNOLTS_API_PROXY_URL`.
- En QA local `TECNOLTS_API_PROXY_URL` apunta directo a `http://paramascotasec-backend-web:8080/api/` y `TECNOLTS_UPLOAD_PROXY_URL` apunta directo a `http://paramascotasec-frontend:3000/api/uploads/images`; APISIX queda solo como entrada publica externa.
- El editor nativo de `Productos` del Dashboard carga referencias reales de marca/categoria/proveedor, agrega `datalist`, preview de imagen, selector de archivo JPG/PNG/WebP, carga multiple para galeria, ordenamiento de imagenes y bloqueo de guardado mientras suben archivos.
- La preparacion de imagen replica el comportamiento de `/my-account`: valida formato/tamano maximo 8 MB y recorta/redimensiona miniaturas a 640x800 y galeria a 1200x1500 antes de enviar al handler Next.

Operacion y verificacion:
- Se redeplego solo `Dashboard` con `npm run docker:up`; no se desplego production ni se tocaron DB, Facturador, SRI, certificados o datos financieros.
- Pasaron `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm run build`, `npm run env:check`, `npm run docker:health` y `npm run runtime:check`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/catalog/products` responde 200; `HEAD /dashboard/api/uploads/images` responde 405 desde el handler Next, esperado para endpoint POST-only; `POST /dashboard/api/uploads/images` sin sesion admin responde 401.
- Validado dentro del contenedor `dashboard`: nginx efectivo usa `proxy_pass http://paramascotasec-backend-web:8080/api/` para API PHP y `proxy_pass http://paramascotasec-frontend:3000/api/uploads/images` para subida de imagenes; ambos upstreams internos responden health 200.

### 2026-06-15 - Dashboard: Proxy Interno Directo al Backend

Objetivo: aclarar que el Dashboard no debe encadenar llamadas internas hacia APISIX; APISIX queda como entrada publica y el proxy interno del Dashboard debe apuntar directo al backend.

Cambios:
- Textos visibles de `Paramascotas Panel` y `Paramascotas Backend` reemplazan "por APISIX" por "proxy interno del Dashboard" cuando describen consumo backend.
- `Dashboard/docs/ARCHITECTURE.md`, `Dashboard/docs/ENVIRONMENTS.md` y `Dashboard/.env.example` documentan que `TECNOLTS_API_BASE_PATH=/dashboard/api` es la ruta publica del navegador, mientras `TECNOLTS_API_PROXY_URL=http://paramascotasec-backend-web:8080/api/` es el upstream interno directo.

Decision:
- En QA local, el navegador entra por `https://paramascotasec.com/dashboard/api/*` via APISIX porque es trafico externo; dentro de Docker, nginx del Dashboard reescribe y proxifica a `paramascotasec-backend-web:8080/api/` sin volver a pasar por APISIX.

### 2026-06-15 - Dashboard nativo: Cupones y Auditoria

Objetivo: cerrar la brecha de la opcion `Cupones` entre `/my-account` y el Dashboard nativo, conservando las mismas firmas reales `GET/POST/PUT/PATCH /api/admin/discounts` y `GET /api/admin/discounts/audit`.

Cambios:
- `Cupones` se reorganiza como el panel origen: formulario de creacion/edicion a la izquierda y listado operativo con resumen/auditoria a la derecha, sin iframe ni modo embebido.
- El formulario replica campos y ayudas de `/my-account`: codigo en mayusculas, estado, nombre interno, tipo, valor, compra minima, maximo descuento, limite de usos, vigencia y descripcion.
- El listado muestra estado activo/inactivo, bandera de agotado por `used_count >= max_uses`, beneficio, minimo, uso acumulado y vigencia por cupon.
- La auditoria reciente ahora muestra observacion, fecha, pedido asociado y monto cuando el API lo entrega.
- Al activar/desactivar un cupon se recarga la lista y auditoria completa para mantener el mismo comportamiento de `/my-account`; la auditoria usa limite 20 como el panel origen.

Operacion y verificacion:
- Se reconstruyo solo `Dashboard` con `npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron en contenedor Node 26: `npm run type:check`, `npm run type:any-check`, `npm run lint` y `npm run build`.
- Pasaron `npm run docker:health`, `npm run env:check`, `npm run runtime:check`, `git -C Dashboard diff --check`, `git -C paramascotasec diff --check` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/finance/discount-codes` responde 200; `/dashboard/api/admin/discounts` y `/dashboard/api/admin/discounts/audit?limit=20` responden 401 sin cookie admin, como corresponde.
- No se crearon, editaron, activaron ni desactivaron cupones reales durante la verificacion.

Estado:
- `Cupones` ya replica los subflujos principales de `/my-account` con UI propia del Dashboard. La paridad total sigue abierta hasta completar la auditoria de todas las opciones y subflujos restantes.

### 2026-06-15 - Dashboard nativo: Margenes, Calculos y Reglas de Precio

Objetivo: cerrar brechas del bloque `Margenes`, `Calculos` y `Reglas de precio` entre `/my-account` y el Dashboard nativo, conservando consumo real de `GET/PUT /api/admin/settings/pricing-*`.

Cambios:
- El Dashboard normaliza margenes igual que el panel origen: `baseMargin` nunca queda por debajo de `minMargin` y `targetMargin` nunca queda por debajo de `baseMargin`.
- `Calculos` valida estrategia permitida (`cost_plus`, `target_margin`, `competitive`), redondeo no negativo, booleano `includeVatInPvp` y buffer de envio no negativo.
- `Reglas de precio` redondea umbrales a enteros, fuerza minimo 1 unidad/dia y limita descuentos de volumen/liquidacion entre 0% y 90%.
- Las respuestas de API y la carga combinada de `Precios` normalizan los objetos antes de mostrarlos, evitando estados incoherentes si el API devuelve datos parciales.
- Los formularios agregan ayudas visibles por campo, deshabilitan entradas/botones durante carga/guardado y conservan el simulador nativo de impacto de precios.

Operacion y verificacion:
- Se reconstruyo solo `Dashboard` con `npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron en contenedor Node 26: `npm run type:check`, `npm run type:any-check`, `npm run lint` y `npm run build`.
- Pasaron `npm run docker:health`, `npm run env:check`, `npm run runtime:check` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/finance/margins`, `/finance/calculations` y `/finance/pricing-rules` responden 200; `/dashboard/api/admin/settings/pricing-margins`, `/pricing-calc` y `/pricing-rules` responden 401 sin cookie admin, como corresponde.
- No se modificaron margenes, calculos ni reglas reales durante la verificacion.

Estado:
- El bloque de configuracion avanzada de precios ya replica normalizaciones y ayudas principales de `/my-account`, manteniendo elementos propios del Dashboard. La paridad total sigue abierta hasta completar la auditoria de todas las opciones y subflujos restantes.

### 2026-06-15 - Dashboard nativo: Impuestos y Cargos

Objetivo: cerrar la brecha de la opcion `Impuestos` entre `/my-account` y el Dashboard nativo, manteniendo consumo real de `GET/PUT /api/admin/settings/tax` y enlazando con la configuracion de envios.

Cambios:
- `Impuestos` ahora carga en conjunto `GET /api/admin/settings/tax` y `GET /api/admin/settings/shipping`, igualando el contexto del panel origen donde los cargos de envio se administran en `Envios y mapa`.
- El formulario muestra estado de carga, deshabilita campos durante guardado y agrega ayudas de IVA, credito utilizable y credito diferido.
- Se normalizan valores tributarios antes de guardar: IVA no negativo y creditos entre 0 y 100, preservando 0 como valor valido.
- La vista agrega nota de parametros del balance y un bloque de `Envios y limites del mapa` con entrega base, retiro, IVA de envio, radio gratis y direccion del local, mas accion para abrir `Envios y mapa`.
- La carga de `Precios` tambien normaliza el objeto tributario compartido.

Operacion y verificacion:
- Se reconstruyo solo `Dashboard` con `npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron en contenedor Node 26: `npm run type:check`, `npm run type:any-check`, `npm run lint` y `npm run build`.
- Pasaron `npm run docker:health`, `npm run env:check`, `npm run runtime:check` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/finance/taxes` responde 200; `/dashboard/api/admin/settings/tax` y `/dashboard/api/admin/settings/shipping` responden 401 sin cookie admin, como corresponde.
- No se modificaron impuestos ni configuracion de envios durante la verificacion.

Estado:
- `Impuestos` ya replica el formulario tributario, nota de balance y acceso a envios del panel origen con elementos propios del Dashboard. La paridad total del Dashboard sigue abierta hasta completar la auditoria de todas las opciones y subflujos restantes.

### 2026-06-15 - Dashboard nativo: Estado de Ventas

Objetivo: cerrar la brecha de la opcion `Ventas`/`Estado de ventas` entre `/my-account` y el Dashboard nativo, manteniendo consumo real de `GET/PUT /api/admin/settings/store-status`.

Cambios:
- El Dashboard normaliza `storeStatus` igual que el panel origen: ventas activas salvo `salesEnabled=false` y mensaje vacio reemplazado por el mensaje de pausa por defecto.
- La vista muestra estado de carga mientras consulta el endpoint, en lugar de mostrar valores viejos o defaults durante la lectura.
- El textarea usa el mismo placeholder de pausa y conserva edicion libre; al guardar se normaliza el mensaje.
- El guardado envia solo `salesEnabled` y `message`, igual que `/my-account`; `updatedAt` y `updatedBy` quedan como campos de respuesta del backend.
- Las cargas de POS/venta local y cotizaciones tambien normalizan el estado de ventas que consumen para bloquear operaciones cuando la tienda esta pausada.

Operacion y verificacion:
- Se reconstruyo solo `Dashboard` con `npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron en contenedor Node 26: `npm run type:check`, `npm run type:any-check`, `npm run lint` y `npm run build`.
- Pasaron `npm run docker:health`, `npm run env:check`, `npm run runtime:check` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/operations/store-status` responde 200; `/dashboard/api/admin/settings/store-status` responde 401 sin cookie admin, como corresponde.
- No se apago/reactivo la tienda ni se modifico el mensaje real durante la verificacion.

Estado:
- `Ventas` ya replica la operacion principal del panel origen con elementos propios del Dashboard. La paridad total del Dashboard sigue abierta hasta completar la auditoria de todas las opciones y subflujos restantes.

### 2026-06-15 - Dashboard nativo: Seguridad de Sesion

Objetivo: cerrar la brecha de la opcion `Seguridad` entre `/my-account` y el Dashboard nativo, conservando consumo real de `GET/PUT /api/admin/settings/session`.

Cambios:
- El Dashboard normaliza la configuracion de sesion igual que `/my-account`: minimo 6h para clientes, minimo 12h para admins, maximo dinamico desde API, redondeo entero y clamp antes de guardar.
- Los campos de sesion usan `min`/`max` reales, quedan deshabilitados durante carga/guardado y muestran los minimos por rol.
- Los cards de resumen calculan TTL localmente si el backend no devuelve segundos, y la vista muestra el aviso de que los cambios aplican a nuevos inicios de sesion.
- Los defaults locales de seguridad se alinean con el panel origen: 6h clientes, 12h admins y maximo 168h.

Operacion y verificacion:
- Se reconstruyo solo `Dashboard` con `npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron en contenedor Node 26: `npm run type:check`, `npm run type:any-check`, `npm run lint` y `npm run build`.
- Pasaron `npm run docker:health`, `npm run env:check`, `npm run runtime:check` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/monitoring/security-settings` responde 200; `/dashboard/api/admin/settings/session` responde 401 sin cookie admin, como corresponde.
- No se modificaron sesiones reales durante la verificacion.

Estado:
- `Seguridad` ya replica la operacion de duracion de sesiones del panel origen con elementos propios del Dashboard. La paridad total del Dashboard sigue abierta hasta completar la auditoria de todas las opciones y subflujos restantes.

### 2026-06-15 - Dashboard nativo: Pedidos con Detalle Operativo

Objetivo: acercar la opcion `Pedidos` del Dashboard a `/my-account`, manteniendo UI nativa y las mismas firmas reales `GET /api/orders`, `GET /api/orders/:id`, `PATCH /api/orders/:id/status` e invoice URL.

Cambios:
- El modal de detalle de pedidos del Dashboard muestra estado en cabecera, cliente, correo, telefono, direcciones de envio/facturacion y deteccion de direccion compartida.
- El resumen financiero ahora separa subtotal sin IVA, IVA con tasa o mezcla aplicada, descuento cuando existe, envio y total.
- `Entrega y pago` expone retiro/envio, metodo de pago, proveedor/ventana de retiro, documento fiscal, razon social y observaciones del cliente.
- La tabla de productos del pedido agrega imagen normalizada, codigo visible, precio unitario, etiqueta de IVA por linea y total.
- Los cambios de estado dejan de depender de confirmacion global del navegador y usan confirmacion contextual dentro del modal antes de ejecutar el `PATCH`.

Operacion y verificacion:
- Se reconstruyo solo `Dashboard` con `npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron en contenedor Node 26: `npm run type:check`, `npm run type:any-check`, `npm run lint` y `npm run build`.
- Pasaron `npm run docker:health`, `npm run env:check`, `npm run runtime:check` y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/operations/admin-orders` responde 200; `/dashboard/api/orders` responde 401 sin cookie admin, como corresponde.
- No se actualizaron pedidos, no se imprimieron comprobantes ni se modificaron datos durante la verificacion.

Estado:
- `Pedidos` ya tiene detalle operativo comparable al modal de `/my-account`. La paridad total del Dashboard sigue abierta hasta completar la auditoria de las opciones restantes del menu.

### 2026-06-15 - Dashboard nativo: Facturas RIDE con Auditoria Operativa

Objetivo: acercar la opcion `Facturas PDF` del Dashboard a `/my-account`, mostrando no solo el listado sino tambien resumen operativo, alertas fiscales, filtros y acciones seguras de PDF/reemision.

Cambios:
- `/dashboard/paramascotas-panel/operations/billing-rides` agrega resumen de RIDE: total, autorizadas, PDF disponibles/generables y documentos que requieren revision.
- La vista muestra alerta cuando hay `operational_error`, con conteo para auditoria/contador y etiqueta/motivo por fila.
- Se agregan busqueda y filtros por `Todas`, `Autorizadas`, `Revisar SRI`, `Reemitibles`, `PDF disponible` y `Error operativo`.
- La tabla expone estados SRI/PDF con clases diferenciadas, clave de acceso, correo, fechas de venta/SRI/PDF, reemplazos (`replacement_access_key`) y reemisiones (`replaced_access_key`).
- La accion `Anular y reemitir` normaliza la clave de acceso, exige motivo minimo y confirmacion `REEMITIR` antes de llamar `POST /api/admin/billing/rides/{accessKey}/cancel-and-reissue`.

Operacion y verificacion:
- Se reconstruyo solo `Dashboard` con `npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron en contenedor Node 26: `npm run type:check`, `npm run type:any-check` y `npm run lint`.
- Pasaron `npm run docker:health`, `npm run env:check`, `npm run runtime:check`, `./scripts/check-container-connectivity.sh development` y `git -C Dashboard diff --check`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/operations/billing-rides` responde 200; `/dashboard/api/admin/billing/rides?limit=150` responde 401 sin cookie admin, como corresponde.
- No se abrieron PDFs, no se anularon ni reemitieron comprobantes durante la verificacion.

Estado:
- `Facturas PDF` ya muestra la informacion operativa/fiscal clave de `/my-account` con elementos propios del Dashboard. Siguen pendientes revisiones finas de otros subflujos del menu antes de poder declarar paridad total.

### 2026-06-15 - Dashboard nativo: Editor de Productos SEO e Imagenes

Objetivo: acercar la opcion `Productos` del Dashboard a la operatividad de `/my-account`, especialmente para agregar/editar productos publicables con SEO, imagenes, precio anterior, IVA y checklist de requisitos.

Cambios:
- `Dashboard` amplia el modelo de producto con `originPrice`, `thumbImage`, `imageMeta`, `thumbImages`, `galleryImages` y atributos SEO (`seoTitle`, `seoDescription`, `seoImageAlt`, `seoSearchTerms`), compatibles con el contrato real de `POST/PUT /api/products`.
- `/dashboard/paramascotas-panel/catalog/products` agrega resumen de publicacion: total, publicados, ocultos e incompletos para publicar.
- El listado marca productos incompletos antes de intentar publicarlos, evitando errores opacos del backend cuando faltan SEO, imagen, precio, stock o datos base.
- El formulario nativo de producto agrega precio anterior, IVA de venta/exento, bloque `SEO y busqueda` con generador local de SEO, edicion de miniaturas y galeria por URL/alt/ancho/alto, y checklist de publicacion similar al panel origen.
- El payload de guardado preserva/normaliza `thumbImages` y `galleryImages`, completa alt de imagen desde `seoImageAlt` y mantiene factura de compra/stock como antes.

Operacion y verificacion:
- Se reconstruyo solo `Dashboard` con `npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron en contenedor Node 26: `npm run type:check`, `npm run type:any-check` y `npm run lint`.
- Pasaron `npm run docker:health`, `npm run env:check`, `npm run runtime:check`, `./scripts/check-container-connectivity.sh development` y `git -C Dashboard diff --check`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/catalog/products` responde 200; `/dashboard/api/products?scope=admin` responde 401 sin cookie admin, como corresponde.
- No se crearon, editaron ni eliminaron productos reales durante la verificacion.

Estado:
- La operacion de agregar/editar productos en el Dashboard ahora cubre SEO, imagenes y checklist de publicacion, que eran una brecha importante frente a `/my-account`. Sigue pendiente, como mejora fina, portar carga binaria directa de imagenes si se requiere igualar el uploader exacto del panel origen.

### 2026-06-15 - Dashboard nativo: Tendencias Financieras

Objetivo: acercar `Balance general` y `Balances` del Dashboard a la operatividad visual de `/my-account`, portando la lectura de tendencias financieras diaria/mensual con elementos propios del Dashboard.

Cambios:
- `Dashboard` tipa `businessMetrics.financialTrends` desde `GET /api/admin/dashboard/stats?period=...&include_report=0`, el mismo contrato usado por `/my-account`.
- `/dashboard/paramascotas-panel/reporting/balance` y `/dashboard/paramascotas-panel/operations/balances` agregan bloque nativo de `Tendencias financieras` con selector `30 dias`/`Mes a mes`, selector `Periodo`/`Total`, KPIs de venta neta, utilidad bruta, gastos, pendientes/vencidos, utilidad neta del periodo y utilidad neta pagada.
- La vista agrega tarjetas tipo grafica de barras por dia/mes y tabla detallada con pedidos, venta bruta/neta, costo, utilidad bruta, gastos del periodo, gastos pagados, pendientes/vencidos, ajustes, utilidad neta y utilidad neta pagada.
- Al seleccionar un mes en la tendencia mensual, el Dashboard sincroniza el periodo financiero activo y recarga la vista real por APISIX.

Operacion y verificacion:
- Se reconstruyo solo `Dashboard` con `npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron en contenedor Node 26: `npm run type:check`, `npm run type:any-check` y `npm run lint`.
- Pasaron `npm run docker:health`, `npm run env:check`, `npm run runtime:check`, `./scripts/check-container-connectivity.sh development` y `git -C Dashboard diff --check`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/reporting/balance` y `/dashboard/paramascotas-panel/operations/balances` responden 200; `/dashboard/api/admin/dashboard/stats?period=2026-06&include_report=0` y `/dashboard/api/admin/report?period=2026-06` responden 401 sin cookie admin, como corresponde.
- Confirmado en backend que `BusinessIntelligenceService::getFullDashboardStats()` siempre incluye `financialTrends` desde `OrderRepository::getFinancialTrends()`.

Estado:
- Los balances del Dashboard ya tienen grafica/tabla de tendencias financieras comparable al panel origen, sin modo embebido y con consumo API real.

### 2026-06-15 - Dashboard nativo: Cierres, Reversos y Ventas Historicas

Objetivo: cerrar la brecha funcional de `Gastos`/finanzas entre `/my-account` y el Dashboard nativo, manteniendo UI propia sin iframe y consumiendo las mismas APIs reales por APISIX.

Cambios:
- `Dashboard` agrega modelos y metodos API para `DELETE /api/admin/expenses/recurrences/{id}`, `POST /api/admin/financial-periods/{period}/close`, `POST /api/admin/financial-adjustments` y `POST /api/admin/historical-sales`.
- `/dashboard/paramascotas-panel/finance/expenses` incorpora cierre financiero mensual con vista previa, notas y accion de cierre; muestra KPIs del preview y ajustes recientes del periodo.
- La tabla de gastos diferencia periodos abiertos/cerrados: en abiertos permite anular, y en cerrados ofrece crear reverso financiero sin modificar el cierre original.
- La vista agrega registro de venta historica con lineas de producto, calculo de bruto/neto/IVA/utilidad, costo unitario y opcion de afectar inventario.
- Las recurrencias de gastos ahora se pueden crear, editar, pausar/activar y eliminar desde el Dashboard, usando las mismas firmas admin que el panel original.

Operacion y verificacion:
- Se reconstruyo solo `Dashboard` con `npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron en contenedor Node 26: `npm run type:check`, `npm run type:any-check` y `npm run lint`.
- Pasaron `npm run docker:health`, `npm run env:check`, `npm run runtime:check`, `./scripts/check-container-connectivity.sh development` y `./scripts/check-env-secrets.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/finance/expenses` responde 200; endpoints admin de financial-periods, financial-adjustments, historical-sales, expenses y recurrences responden 401 sin cookie admin, como corresponde.
- No se ejecutaron mutaciones reales de cierre, reverso, venta historica ni eliminacion de recurrencias durante la verificacion.

Estado:
- La paridad visible de `Gastos` queda extendida a flujos secundarios importantes de `/my-account`: cierre mensual, reversos, venta historica y mantenimiento completo de recurrencias. Cualquier mejora posterior debe ser ajuste fino de UX o cobertura de submodales especificos, no reemplazo por iframe/modo embebido.

### 2026-06-15 - Dashboard nativo: POS, Cotizaciones, Gastos y Balances

Objetivo: completar la paridad visible del menu admin de `/my-account` dentro del Dashboard sin iframe ni modo embebido, consumiendo las mismas APIs reales de Paramascotas por APISIX.

Cambios:
- `Dashboard` agrega modelos y metodos API para POS/caja, cotizaciones, gastos, recurrencias y periodos financieros: `GET/POST /api/admin/pos/*`, `POST /api/orders/quote`, `POST /api/orders`, `GET/POST /api/admin/quotes`, `POST /api/admin/quotes/{id}/convert`, `GET/POST/PATCH /api/admin/expenses`, `GET/POST/PUT /api/admin/expenses/recurrences`, `GET /api/admin/financial-periods`, `GET /api/admin/financial-periods/{period}/preview`, `GET /api/admin/report` y `GET /api/admin/purchase-invoices`.
- `/dashboard/paramascotas-panel/operations/local-sales` muestra venta local/POS nativa con apertura/cierre de caja, movimientos, catalogo de productos, calculo de quote server-side, registro de pedido local y vista de cotizaciones recientes.
- `/dashboard/paramascotas-panel/operations/quotations` muestra cotizaciones nativas con creacion desde carrito local y conversion a venta usando caja abierta.
- `/dashboard/paramascotas-panel/finance/expenses` muestra gastos reales con filtros por periodo/estado/categoria, alta de gasto, cambio de estado pagado/anulado, resumen financiero y creacion/pausa de recurrencias.
- `/dashboard/paramascotas-panel/reporting/sales`, `/reporting/balance`, `/reporting/traceability`, `/reporting/products-purchases` y `/operations/balances` ahora tienen UI nativa con KPIs, ventas recientes, categorias, trazabilidad, productos x compra, gastos comprometidos, periodos y preview financiero.

Operacion y verificacion:
- Se reconstruyo solo `Dashboard` con `npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron en contenedor Node 26: `npm run type:check`, `npm run type:any-check` y `npm run lint`.
- Pasaron `npm run docker:health`, `npm run env:check`, `npm run runtime:check`, `./scripts/check-container-connectivity.sh development`, `./scripts/check-env-secrets.sh development` y `git diff --check` en `Dashboard` y `paramascotasec`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: rutas de POS/cotizaciones/reportes/balances/gastos responden 200; endpoints admin de POS, cotizaciones, gastos, periodos, compras y reportes responden 401 sin cookie admin, como corresponde.

Estado:
- Las opciones visibles del menu admin de `/my-account` ya tienen pantalla nativa en `Integraciones reales` del Dashboard. Los flujos avanzados de cierre/ajustes contables y edicion/eliminacion completa de recurrencias se completaron en la entrada posterior de esta misma fecha.

### 2026-06-15 - Dashboard nativo: Alertas, Usuarios, Catalogos y Envios

Objetivo: seguir la paridad nativa del Dashboard con `/my-account`, portando opciones administrativas adicionales sin iframe ni modo embebido.

Cambios:
- `Dashboard` agrega modelos y metodos API para `GET/POST/PUT /api/users`, `POST /api/users/{id}/unlock`, `GET/PUT /api/admin/settings/product-reference-data`, `GET/PUT /api/admin/settings/product-page`, `GET/PUT /api/admin/settings/shipping` y `GET /api/shipments`, siempre via `/dashboard/api/*` con cookies `pm_*` y CSRF same-origin para mutaciones.
- `/dashboard/paramascotas-panel/monitoring/alerts` consolida alertas nativas desde stats, inteligencia de inventario y productos: KPIs por severidad, filtros critica/advertencia/info y acciones recomendadas.
- `/dashboard/paramascotas-panel/catalog/users` muestra usuarios reales con busqueda, filtro por rol, resumen, tabla operativa, alta/edicion y desbloqueo de cuentas.
- `/dashboard/paramascotas-panel/catalog/catalogs` muestra catalogos operativos reales: categorias, marcas, proveedores y atributos reutilizables; permite agregar/eliminar entradas y guardar contra `product-reference-data`.
- `/dashboard/paramascotas-panel/catalog/product-page` muestra configuracion comun de ficha publica de producto y guarda contra `product-page`.
- `/dashboard/paramascotas-panel/operations/shipments` muestra envios nativos con proveedores, recogidas/pedidos pickup, costos, coordenadas del local, radio gratis y limites de busqueda de mapa.

Operacion y verificacion:
- Se reconstruyo solo `Dashboard` con `npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron en contenedor Node 26: `npm run type:check`, `npm run type:any-check` y `npm run lint`.
- Pasaron `npm run docker:health`, `npm run env:check`, `npm run runtime:check`, `./scripts/check-container-connectivity.sh development`, `./scripts/check-env-secrets.sh development` y `git diff --check` en `Dashboard` y `paramascotasec`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/monitoring/alerts`, `/catalog/users`, `/catalog/catalogs`, `/catalog/product-page` y `/operations/shipments` responden 200; sus endpoints admin responden 401 JSON sin cookie admin, como corresponde.

Pendientes:
- Ya hay vistas nativas funcionales para productos, facturas/RIDE, pedidos, reporte general, inventario, ranking, estado de ventas, seguridad de sesion, impuestos, precios/margenes/calculos/reglas, cupones, alertas, usuarios, catalogos operativos, ficha de producto y envios/mapa. Sigue pendiente portar con paridad completa venta local/POS, cotizaciones, balances, gastos y reportes financieros/profundos restantes.

### 2026-06-15 - Dashboard nativo: Configuracion, Precios y Cupones

Objetivo: continuar la paridad nativa del Dashboard con `/my-account`, llevando opciones de configuracion y finanzas a pantallas propias que consumen las mismas firmas API admin por APISIX.

Cambios:
- `Dashboard` agrega modelos y metodos API para `GET/PUT /api/admin/settings/store-status`, `GET/PUT /api/admin/settings/tax`, `GET/PUT /api/admin/settings/session`, `GET/PUT /api/admin/settings/pricing-margins`, `GET/PUT /api/admin/settings/pricing-calc`, `GET/PUT /api/admin/settings/pricing-rules`, `GET/POST/PUT /api/admin/discounts`, `PUT /api/admin/discounts/{id}/status` y `GET /api/admin/discounts/audit`, usando el proxy `/dashboard/api/*` con cookies `pm_*` y CSRF same-origin.
- `/dashboard/paramascotas-panel/operations/store-status` muestra estado de ventas en linea, mensaje operativo y acciones para apagar/reactivar ventas.
- `/dashboard/paramascotas-panel/monitoring/security-settings` muestra configuracion nativa de duracion de sesion cliente/admin.
- `/dashboard/paramascotas-panel/finance/taxes` muestra IVA y credito tributario configurables.
- `/dashboard/paramascotas-panel/finance/prices`, `/finance/margins`, `/finance/calculations` y `/finance/pricing-rules` comparten un panel nativo de precios con margenes, calculadora, reglas comerciales, previsualizacion de precio y tabla de impacto sobre productos reales.
- `/dashboard/paramascotas-panel/finance/discount-codes` muestra cupones nativos con alta/edicion, activacion/desactivacion, limites de uso, vigencia y auditoria.

Operacion y verificacion:
- Se reconstruyo solo `Dashboard` con `npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron en contenedor Node 26: `npm run type:check`, `npm run type:any-check` y `npm run lint`.
- Pasaron `npm run docker:health`, `npm run env:check`, `npm run runtime:check`, `./scripts/check-container-connectivity.sh development`, `./scripts/check-env-secrets.sh development` y `git diff --check` en `Dashboard` y `paramascotasec`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: las nuevas rutas del Dashboard responden 200; `/dashboard/api/admin/settings/store-status`, `/dashboard/api/admin/settings/tax` y `/dashboard/api/admin/discounts` responden 401 JSON sin cookie admin, como corresponde.

Pendientes:
- Ya hay vistas nativas funcionales para productos, facturas/RIDE, pedidos, reporte general, inventario, ranking, estado de ventas, seguridad de sesion, impuestos, precios/margenes/calculos/reglas y cupones. Sigue pendiente portar con paridad completa alertas, catalogos operativos, usuarios, ficha de producto, venta local/POS, cotizaciones, envios/mapa, balances, gastos y reportes financieros/profundos restantes.

### 2026-06-15 - Dashboard nativo: Inventario y Ranking

Objetivo: continuar la paridad nativa del Dashboard con `/my-account`, reemplazando vistas de explorador por pantallas operativas propias para inventario y ranking de productos.

Cambios:
- `Dashboard` agrega modelos y metodos API para `GET /api/admin/dashboard/stats`, `GET /api/admin/inventory/intelligence`, `GET /api/admin/purchase-invoices` y `GET /api/admin/report` con `period`, `scope` o `date`, manteniendo el proxy `/dashboard/api/*`.
- `/dashboard/paramascotas-panel/catalog/inventory` y `/dashboard/paramascotas-panel/reporting/inventory-report` muestran inventario nativo con KPIs, acciones recomendadas, plan de compra exportable CSV, panorama por categoria, ultimas facturas de compra, filtros por estado/tipo/accion/categoria/proveedor y tabla operativa con stock, costos, capital, margen, lote y proveedor.
- `/dashboard/paramascotas-panel/reporting/sales-ranking` muestra ranking nativo con vistas `Dia`, `Semana`, `Mes` y `Todo`, KPIs comerciales, acciones recomendadas cruzadas con inteligencia de inventario, filtros por busqueda/categoria/accion, orden por prioridad/unidades/venta/utilidad/margen/contribucion/cobertura, barras de contribucion y export CSV.
- Las decisiones de ranking replican la logica base de `/my-account`: corregir costo si hubo venta sin costo, proteger margen negativo o bajo, reponer productos vendidos sin stock, promover sobrestock y revisar datos faltantes.

Operacion y verificacion:
- Se reconstruyo solo `Dashboard` con `npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron en contenedor Node 26: `npm run type:check`, `npm run type:any-check` y `npm run lint`.
- Pasaron `npm run docker:health`, `npm run env:check`, `npm run runtime:check`, `git diff --check` en `Dashboard` y `paramascotasec`, y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/catalog/inventory`, `/dashboard/paramascotas-panel/reporting/inventory-report` y `/dashboard/paramascotas-panel/reporting/sales-ranking` responden 200; `/dashboard/api/admin/inventory/intelligence?window_days=30&target_days=30` y `/dashboard/api/admin/dashboard/stats?period=2026-06&include_report=0` responden 401 JSON sin cookie admin, como corresponde.

Pendientes:
- Ya hay vistas nativas funcionales para productos, facturas/RIDE, pedidos, reporte general, inventario y ranking. Sigue pendiente portar con paridad completa las opciones de alertas, seguridad, catalogos operativos, usuarios, ficha de producto, estado de ventas, venta local, cotizaciones, envios/mapa, balances, precios, impuestos, margenes, calculadora, reglas de precio, cupones y gastos.

### 2026-06-15 - Dashboard nativo: Pedidos y Reporte general

Objetivo: avanzar la paridad real del Dashboard con `https://paramascotasec.com/my-account` sin iframe, portando pantallas admin completas que consumen las mismas firmas API por APISIX.

Cambios:
- `Dashboard` agrega modelos y metodos API nativos para `GET /api/orders`, `GET /api/orders/{id}`, `PATCH /api/orders/{id}/status`, `GET /api/orders/{id}/invoice` y `GET /api/admin/report?period=YYYY-MM`.
- `/dashboard/paramascotas-panel/operations/admin-orders` ahora muestra pedidos reales con filtros por dia/semana/mes/todo, filtros por estado, tarjetas de resumen, tabla, modal de detalle, totales, direcciones, items, acciones de estado y enlace a comprobante interno.
- `/dashboard/paramascotas-panel/reporting/general` ahora muestra reporte general nativo con KPIs, graficas de ventas por categoria, ranking de productos por venta neta y pedidos recientes del periodo.
- Las pantallas siguen usando cookies `pm_*` y CSRF same-origin por `/dashboard/api/*`, igual que `/my-account`; sin cookie admin, los endpoints admin responden 401 JSON y el Dashboard no redirige ni filtra esa respuesta.

Operacion y verificacion:
- Se reconstruyo solo `Dashboard` con `npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados, SRI o datos financieros.
- Pasaron en contenedor Node 26: `npm run type:check`, `npm run type:any-check` y `npm run lint`.
- Pasaron `npm run docker:health`, `npm run env:check`, `npm run runtime:check`, `git diff --check` en `Dashboard` y `paramascotasec`, `./scripts/check-container-connectivity.sh development` y `./scripts/check-env-secrets.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/reporting/general` y `/dashboard/paramascotas-panel/operations/admin-orders` responden 200; `/dashboard/api/orders` y `/dashboard/api/admin/report?period=2026-06` responden 401 JSON sin cookie admin, como corresponde.

Pendientes:
- La paridad completa de `/my-account` sigue abierta. Ya hay CRUD nativo de productos, facturas/RIDE, pedidos y reporte general; faltan vistas nativas completas para alertas, seguridad, inventario, catalogos, usuarios, pagina de producto, estado de tienda, venta local, cotizaciones, envios, balances, precios, impuestos, margenes, calculos, reglas de precio, cupones, gastos y ranking de ventas.

### 2026-06-15 - Dashboard Paramascotas nativo sin embebido

Objetivo: descartar el modo embebido de `/my-account` y empezar la paridad real del Dashboard con pantallas nativas que consumen las mismas APIs admin de Paramascotas.

Cambios:
- `Dashboard` elimina la ruta/componente `/paramascotas-admin`; la navegacion real queda en `/paramascotas-backend` y `/paramascotas-panel/:group/:view`.
- `ParamascotasAdminApiService` consume el backend PHP real por `/dashboard/api/*` usando `realBackendRequestContext()`: salta fixtures, no envia Bearer demo del Dashboard y conserva cookies `pm_*`/CSRF same-origin igual que `/my-account`.
- `/paramascotas-panel/catalog/products` ahora muestra un CRUD nativo de productos con busqueda, alta/edicion, publicar/ocultar, retirar, accion de inventario y datos de factura de compra para stock; usa `GET/POST/PUT/DELETE /api/products`.
- `/paramascotas-panel/operations/billing-rides` ahora lista facturas/RIDE PDF reales y expone acciones nativas para abrir PDF y anular/reemitir contra `/api/admin/billing/rides`.
- Se mantiene el mapeo de opciones de `/my-account` como backlog navegable por grupos, pero las funcionalidades pendientes deben portarse nativamente; no debe reintroducirse iframe ni modo `embed`.

Operacion y verificacion:
- Se reconstruyo solo `Dashboard` con `npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados o datos.
- Pasaron en contenedor Node 26: `npm run type:check`, `npm run type:any-check` y `npm run lint`.
- Pasaron `npm run env:check`, `npm run runtime:check`, `npm run docker:health`, `git diff --check` en `Dashboard` y `paramascotasec`, y `./scripts/check-container-connectivity.sh development`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/`, `/dashboard/paramascotas-panel/catalog/products` y `/dashboard/paramascotas-panel/operations/billing-rides` responden 200; `/dashboard/api/products?scope=admin` y `/dashboard/api/admin/billing/rides?limit=150` responden 401 JSON sin cookie admin, como corresponde.

Decisiones:
- La decision anterior de cubrir paridad completa mediante `/paramascotas-admin` embebido queda supersedida por instruccion del usuario. La paridad con `/my-account` debe avanzar por vistas nativas independientes que consumen APIs reales por APISIX.

### 2026-06-15 - Opciones nativas de my-account en Dashboard

Objetivo: hacer visibles en el nuevo Dashboard las opciones admin de `https://paramascotasec.com/my-account` y consumir el backend con las mismas firmas API que usa ese panel.

Cambios:
- `Dashboard` agrega la ruta nativa `/paramascotas-panel/:group/:view`, un registro de vistas `paramascotas-panel.registry.ts` y `ParamascotasPanelApiService` para leer endpoints reales por `/dashboard/api/*`.
- La navegacion `Integraciones reales` ahora expone los grupos de `/my-account`: `Reportes`, `Monitoreo`, `Catalogo`, `Operacion`, `Precios y finanzas`; incluye opciones como `Reporte general`, `Productos`, `Venta en local`, `Cupones` y `Gastos`.
- Cada vista nativa muestra la firma original `/api/...` usada por `/my-account`, el path proxy `/dashboard/api/...`, estado HTTP por endpoint, resumen y preview del payload; las fallas 401/403 quedan visibles sin redirigir el Dashboard.
- `/my-account?tab=...` ahora acepta cualquier tab admin registrada; queda como enlace de referencia externa, no como mecanismo de paridad dentro del Dashboard.

Operacion y verificacion:
- Se redeplego solo Frontend development con `./scripts/deploy-development.sh frontend` y Dashboard con `npm run docker:up`; no se desplego production ni se tocaron backend, DB, Facturador, certificados o datos.
- Pasaron en `Dashboard`: `npm run type:check`, `npm run type:any-check`, `npm run lint`, `npm test` completo (167 archivos / 359 tests), `npm run env:check`, `npm run runtime:check`, `npm run docker:health`.
- Pasaron en `paramascotasec/app`: `npm run typecheck` y `npm run lint`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-panel/finance/prices` responde 200, `/dashboard/api/health` responde `ok`, `/dashboard/api/admin/settings/pricing-margins` responde 401 JSON sin redireccion cuando no hay cookie admin, y `/my-account?tab=prices` responde 200.
- Pasaron `./scripts/check-container-connectivity.sh development`, `./scripts/check-env-secrets.sh development` y `git diff --check` en `Dashboard` y `paramascotasec`. Persisten solo las 6 advertencias preexistentes del preflight sobre certificados/data historica del Facturador.

### 2026-06-15 - Integracion Real Paramascotas Backend en Dashboard

Objetivo: hacer disponible en el Dashboard la funcionalidad real de Paramascotas que vive en `/my-account`, manteniendo Paramascotas como superadmin temporal en QA local y empezando la migracion nativa por endpoints reales.

Cambios:
- `Dashboard` agrega la seccion de navegacion `Integraciones reales` con las rutas `/paramascotas-admin` y `/paramascotas-backend`.
- `/paramascotas-admin` embebe `/my-account` en un iframe same-origin para que todo el panel real de Paramascotas quede disponible dentro del Dashboard sin duplicar ni recortar funcionalidad; incluye accesos para refrescar, abrir aparte e iniciar sesion Paramascotas.
- `/paramascotas-backend` consume `/dashboard/api/health`, `/dashboard/api/products`, `/dashboard/api/admin/dashboard/stats?include_report=0` y `/dashboard/api/admin/inventory/intelligence?window_days=30&target_days=30`; muestra estado API/DB, catalogo real y un resumen admin nativo de ventas, utilidad, inventario, pedidos recientes, estados y ranking.
- Se agregaron contextos HTTP para integraciones reales: saltar fixtures, no enviar el Bearer demo del Dashboard al backend PHP y no redirigir el Dashboard cuando Paramascotas responda 401/403 por falta de cookie admin.
- `TECNOLTS_API_PROXY_URL` del `.env` local del Dashboard apunta a `http://paramascotasec-backend-web:8080/api/`, usando la red interna `paramascotasec-web-internal`.
- `Dashboard/.env.example`, `docs/ENVIRONMENTS.md` y `docs/ARCHITECTURE.md` documentan la distincion entre integraciones reales y templates.

Operacion y verificacion:
- Se reconstruyo `Dashboard` con `npm run docker:up`; no se redeplego production.
- Pasaron `npm run type:check`, `npm run lint`, `npm run type:any-check`, `npm test` completo (167 archivos / 359 tests) y `npm run docker:health`.
- Validado por APISIX con `--resolve paramascotasec.com:443:192.168.100.229`: `/dashboard/paramascotas-admin` y `/dashboard/paramascotas-backend` responden 200; `/dashboard/api/health` responde `ok`; `/dashboard/api/products` devuelve 123 productos reales; `/dashboard/api/admin/dashboard/stats?include_report=0` devuelve 401 sin cookie admin, que es esperado para usuarios no autenticados en Paramascotas.
- `/my-account` responde con `X-Frame-Options: SAMEORIGIN` y `frame-ancestors 'self'`, por lo que puede cargarse dentro del Dashboard bajo el mismo origen `https://paramascotasec.com`.
- Pasaron `./scripts/check-container-connectivity.sh development` y `./scripts/check-env-secrets.sh development`; persisten solo las 6 advertencias preexistentes de data/certificados Facturador/tenants no principales.

Decisiones:
- Paramascotas queda como superadmin temporal del Dashboard en QA local; mas adelante podra convertirse en tenant real cuando se modele el multi-tenant definitivo.
- La paridad total inmediata con `/my-account` se cubre mediante el panel embebido; las vistas nativas del Dashboard deben migrar funcionalidad de forma incremental consumiendo endpoints reales por APISIX.

### 2026-06-15 - Dashboard como Templates y Demos

Objetivo: evitar que el Dashboard de QA parezca integrado a modulos API reales antes de iniciar las integraciones definitivas.

Cambios:
- La navegacion del Dashboard reemplaza `Modulos API` por `Templates por integrar` y el acceso de plataforma por `Tenants demo`.
- El admin de tenants muestra `Tenants demo`, `Crear tenant demo`, `Templates iniciales` y cuenta `templates`, dejando claro que usa fixtures locales.
- Las descripciones visibles de catalogo de modulos, monitoreo, productos, facturacion, kanban, chat y blog se ajustaron a lenguaje de templates/demo.
- Se conservaron los servicios `data/*-api.service.ts` como contratos tecnicos para integraciones futuras; no se conecto ningun backend real nuevo ni APIs externas.
- `Dashboard/docs/ARCHITECTURE.md` y `features/monitoring/README.md` documentan que en QA local las pantallas consumen fixtures locales hasta conectar integraciones reales.

Operacion y verificacion:
- Se reconstruyo `Dashboard` con `npm run docker:up`; no se redeplego production.
- En contenedor Node 26 con dependencias aisladas pasaron `npm run type:check`, `npm run lint`, `npm run type:any-check` y `npm test` completo (167 archivos / 357 tests).
- Pasaron `npm run docker:health`, `curl -k --resolve paramascotasec.com:443:192.168.100.229 https://paramascotasec.com/dashboard/home`, `curl -k --resolve paramascotasec.com:443:192.168.100.229 https://paramascotasec.com/dashboard/tenant-admin`, `./scripts/check-container-connectivity.sh development`, `./scripts/check-env-secrets.sh development` y verificacion del bundle sin textos visibles legacy de `Modulos API`/`API-first`/`backend real`.
- `check-env-secrets.sh development` conserva solo las 6 advertencias preexistentes de data/certificados Facturador/tenants no principales.

### 2026-06-15 - Acceso Superadmin sin Tenant Paramascotas en Dashboard

Objetivo: permitir entrar al superadmin y a los modulos del Dashboard en QA local usando `paramascotasec` como tenant activo del Dashboard.

Cambios:
- `Dashboard` registra `paramascotasec` / `ParaMascotasEC` como tenant fixture activo de QA, primero en la lista de tenants, con todos los modulos habilitados.
- El usuario actual del tenant `paramascotasec` queda como administrador con override `platform-admin` para poder entrar a `tenant-admin` y navegar dashboards/modulos sin caer en `tenant-unavailable`.
- Las sesiones fixture de `active-directory` y `azure-ad` ahora reciben rol/permisos `platform-admin`.
- `/auth/me` preserva el provider del token fixture guardado, de modo que un refresh o entrada directa con `fixture-token.*.active-directory`/`azure-ad` no degrade la sesion a `password` ni pierda `platform-admin`.
- Si `/tenant/context` recibe otro tenant inexistente con token fixture de plataforma, devuelve un contexto efimero de plataforma con solo el modulo `tenant-admin`.
- El guard de tenant redirige a `/tenant-admin` cuando una sesion `platform-admin` intenta entrar a un modulo tenant-scoped no habilitado por ese contexto de plataforma.
- La pagina `tenant-unavailable` detecta sesiones `platform-admin`, redirige a `/tenant-admin` y muestra un acceso explicito al superadmin para sesiones ya autenticadas.
- Se agregaron pruebas para tenant `paramascotasec` con modulos completos, sesion AD superadmin, preservacion de provider en `/auth/me`, contexto de plataforma en tenant inexistente, redireccion al superadmin y salida desde `tenant-unavailable`.

Operacion y verificacion:
- Se reconstruyo `Dashboard` con `npm run docker:up`; no se redeplego production.
- En contenedor Node 26 con dependencias aisladas pasaron `npm run type:check`, `npm run lint`, `npm run type:any-check` y `npm test` completo (167 archivos / 357 tests).
- Pasaron `npm run docker:health`, `curl -k --resolve paramascotasec.com:443:192.168.100.229 https://paramascotasec.com/dashboard/home`, `curl -k --resolve paramascotasec.com:443:192.168.100.229 https://paramascotasec.com/dashboard/tenant-admin`, `./scripts/check-container-connectivity.sh development`, `./scripts/check-env-secrets.sh development` y `git diff --check` en `Dashboard`.
- `check-env-secrets.sh development` conserva solo las 6 advertencias preexistentes de data/certificados Facturador/tenants no principales.

### 2026-06-15 - Dashboard publicado por APISIX en QA local

Objetivo: exponer el proyecto `Dashboard` por el Gateway APISIX del QA local bajo `https://paramascotasec.com/dashboard/`.

Cambios:
- `Dashboard` ahora compila con `TECNOLTS_BASE_HREF=/dashboard/` y `TECNOLTS_API_BASE_PATH=/dashboard/api` para cargar assets y API bajo el prefijo publico.
- `Dashboard/nginx.conf` atiende `/dashboard`, `/dashboard/` y `/dashboard/api/*`; el redirect de `/dashboard` es relativo para conservar HTTPS detras de APISIX.
- `Dashboard/docker-compose.yml` conecta el contenedor `dashboard` a `paramascotasec-web-internal` para que APISIX lo alcance por DNS Docker.
- `Gateway/scripts/sync-apisix.sh` agrega upstream/servicio/rutas gestionadas opcionales para Dashboard cuando `DASHBOARD_UPSTREAM` esta definido.
- `Gateway/entorno/.env` declara `PUBLIC_DASHBOARD_SEGMENT=dashboard` y `DASHBOARD_UPSTREAM=http://dashboard:80`; la plantilla y README del Gateway quedan sincronizados.

Operacion y verificacion:
- Se reconstruyo `Dashboard` con `npm run docker:up` y se redeplego solo Gateway development con `./scripts/deploy-development.sh gateway`.
- `https://paramascotasec.com/dashboard` responde `301` relativo a `/dashboard/`; `https://paramascotasec.com/dashboard/` y `/dashboard/main.js` responden `200` via APISIX.
- Pasaron `npm run env:check`, `npm run runtime:check`, `npm run docker:health`, `./scripts/check-container-connectivity.sh development`, `./scripts/check-env-secrets.sh development` y `git diff --check` en `Dashboard`.
- No se desplego production ni se tocaron certificados reales, datos, Facturador ni SRI.

### 2026-06-15 - Contexto QA Local por APISIX

Objetivo: ajustar el contexto operativo del workspace al entorno QA local indicado por el usuario.

Cambios:
- `Contexto operativo actual` ahora identifica el ambiente como QA local sobre el stack `development`.
- Se registra `192.168.100.229` como IP LAN del host virtualizado y `paramascotasec.com` como dominio funcional del QA local.
- Las verificaciones funcionales del sitio/API deben entrar por APISIX usando el contrato publico; los puertos internos quedan solo para diagnostico explicito.
- La seccion Gateway documenta el uso de `--resolve paramascotasec.com:443:192.168.100.229` cuando el DNS/hosts del cliente no apunte al host virtualizado.

Operacion y verificacion:
- No se desplegaron servicios, no se tocaron certificados, secretos, bases de datos, Facturador ni SRI.
- Se sincronizo la copia versionada `paramascotasec/docs/AI_CONTEXT.md`.

### 2026-06-15 - Despliegue Development del Dashboard

Objetivo: desplegar el proyecto separado `Dashboard` en el ambiente local de desarrollo.

Cambios:
- Se creo `Dashboard/.env` local ignorado por Git con `APP_ENV=development` y `TECNOLTS_HTTP_PORT=8081`; permisos ajustados a `600`.
- `Dashboard/docker-compose.yml` agrega `extra_hosts: host.docker.internal:host-gateway` para que Nginx pueda resolver el proxy `/api/` en Docker Linux.

Operacion y verificacion:
- Se ejecuto `npm run docker:up` desde `Dashboard`; la imagen Angular/Nginx se construyo con Node 26 dentro de Docker.
- `dashboard` quedo `Up` y `healthy`, publicado en `127.0.0.1:8081->80/tcp`.
- Pasaron `npm run env:check`, `npm run docker:health`, `curl http://127.0.0.1:8081/health` y `curl -I http://127.0.0.1:8081/`.
- No se desplego production ni se tocaron servicios, certificados, secretos, bases de datos, Facturador ni SRI de ParamascotasEC.

### 2026-06-11 - Portabilidad E2E sin ripgrep en PATH

Objetivo: corregir que `./scripts/e2e-development.sh` fallara en shells donde `rg` no esta instalado o no esta en `PATH`, aunque el ambiente estuviera correcto.

Cambios:
- `scripts/check-env-secrets.sh` agrega helper `search_files`: usa `rg` si existe y cae a `grep -E -n` si no existe.
- Las verificaciones de puertos publicados, hardcoding APISIX y dominios backend ya no dependen exclusivamente de `ripgrep`.

Verificacion:
- `PATH=/usr/bin:/bin ./scripts/check-env-secrets.sh development` paso con 0 fallos.
- `PATH=/usr/bin:/bin ./scripts/e2e-development.sh` paso completo: capability registry, lint/typecheck, backend health, preflight, conectividad, SEO audit, PHPUnit Facturador y probes de capacidades.
- Persisten solo las 6 advertencias preexistentes de data/certificados Facturador development.

### 2026-06-11 - Registro Maestro de Capacidades y E2E Development

Objetivo: crear una base trazable para que nuevas funcionalidades declaren pantallas, endpoints, permisos, SEO, datos, SRI/correos y pruebas antes de entrar al flujo development.

Cambios:
- Se agrego `paramascotasec/docs/capabilities/*.json` como registro declarativo por dominio y `paramascotasec/scripts/generate-system-capabilities.mjs` como generador/validador.
- El generador produce `paramascotasec/docs/system-capabilities.generated.json` y `paramascotasec/app/src/generated/systemCapabilities.ts`; `src/lib/api/endpoints.ts` construye sus rutas desde ese helper.
- Backend mueve su lista de rutas a `paramascotasec-backend/config/routes.php`, cada entrada con `capability`; `public/index.php` registra desde ese archivo.
- Facturador agrega `Facturador/config/routes.capabilities.php` para auditar rutas de health, SRI test/production, RIDE/XML/PDF y mail-test.
- Se agrego `scripts/e2e-development.sh`, que valida capability registry, checks del workspace, preflight de secretos, conectividad, SEO audit, PHPUnit del Facturador y probes Gateway/API/SEO desde el manifiesto.
- `npm run test` y `scripts/check-paramascotas.sh` ahora ejecutan `capabilities:check`, de modo que rutas/paginas/API nuevas sin registrar bloquean development.

Operacion y verificacion:
- Se redeplego solo Backend y Frontend development con `./scripts/deploy-development.sh backend` y `./scripts/deploy-development.sh frontend`; no se desplego production.
- Pasaron `npm run test`, sintaxis PHP completa de Backend/Facturador, `Facturador/scripts/test-phpunit.sh --bootstrap vendor/autoload.php tests` (18 tests / 44 assertions) y `./scripts/e2e-development.sh`.
- El E2E development valido 27 capacidades, 100 rutas backend, 17 rutas Facturador, 53 probes Gateway/API/paginas, SEO audit sin fallos y conectividad completa. Reporte: `reports/e2e/development/capability-e2e-report.json`.
- Persisten advertencias preexistentes del preflight: sucursales Facturador development con API test sin `.p12` y data/keys de tenants no principales; no se modificaron por ser limpieza de datos separada.
- No se tocaron production, certificados, secretos, SRI production, facturas ni datos financieros.

### 2026-06-11 - Correccion Generador SEO en Admin de Productos

Objetivo: corregir que el boton `Generar SEO` en `/my-account` dejara el checklist con `Pendiente - Titulo SEO` cuando el titulo generado superaba 70 caracteres.

Cambios:
- `ProductEditorController` usa `buildProductSeoProfile`, la misma regla SEO del sitio publico/backend, para generar titulo, descripcion, alt base y terminos de busqueda.
- El guardado frontend reemplaza `seoTitle` y `seoDescription` existentes si estan fuera del rango valido, evitando reenviar valores invalidos desde el admin.

Operacion y verificacion:
- Se redeplego solo Frontend development con `./scripts/deploy-development.sh frontend`.
- Pasaron `npm run typecheck`, `npm run lint`, `SEO_AUDIT_RESOLVE_IP=192.168.100.229 npm run seo:audit` y `./scripts/check-container-connectivity.sh development`.
- No se tocaron production, backend, datos, SRI, Facturador, certificados ni secretos.

### 2026-06-11 - Limpieza SEO sin Redirecciones de Contenido

Objetivo: dejar el frontend publico con solo paginas reales y utiles para Google, Search Console y agentes IA, eliminando rutas de template o no usadas sin crear redirecciones de contenido.

Cambios:
- Frontend elimina rutas publicas no reales/no usadas: `/pages/faqs`, `/pages/store-list`, `/pages/customer-feedbacks`, `/pages/coming-soon`, `/pages/page-not-found`, `/checkout2`, `/order-tracking`, `/compare`, `/wishlist`, `/product/*`, `/shop/*`, `/blog/*` y `/homepages/*`.
- Se agrega `src/app/not-found.tsx` como 404 interno no enlazado; las rutas eliminadas devuelven 404 normal sin `Location`. Se conservan solo redirecciones tecnicas de dominio canonico.
- Enlaces internos, sitemap y `llms.txt` quedan apuntando a URLs reales; `/contact` ya no se publica y la FAQ canonica es `/pages/preguntas-frecuentes`.
- Las paginas transaccionales existentes (`/cart`, `/checkout`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/my-account`, `/search-result`) quedan con `noindex, follow`; `robots.txt` ya no las bloquea.
- `scripts/audit-seo-merchant.mjs` soporta `SEO_AUDIT_RESOLVE_IP`, usa la API publica tenantizada y falla si sitemap/feed/canonicals/JSON-LD/enlaces internos incumplen las reglas SEO acordadas.

Operacion y verificacion:
- Se redeplego solo Frontend development con `./scripts/deploy-development.sh frontend`. No se desplego production.
- No se tocaron datos, certificados, secretos, backend, facturador ni SRI.
- Pasaron `npm run typecheck`, `npm run lint`, `git diff --check`, `SEO_AUDIT_RESOLVE_IP=192.168.100.229 npm run seo:audit` y `./scripts/check-container-connectivity.sh development`.
- Auditoria SEO development: 167 URLs en sitemap, 123 productos en feed/API, 0 redirects/404/noindex en sitemap, 0 enlaces a rutas eliminadas, 0 canonicals faltantes y 103 paginas de producto con JSON-LD valido.
- `curl -k --resolve paramascotasec.com:443:192.168.100.229 -I https://paramascotasec.com/pages/store-list` devuelve `HTTP/2 404`; las demas rutas eliminadas probadas tambien devuelven 404 sin redireccion.

### 2026-06-11 - SEO Integral Dinamico, Merchant y Auditoria APISIX

Objetivo: reforzar la limpieza SEO con reglas dinamicas para productos futuros, superficies publicas en espanol oficial, feed Merchant consistente, contexto `llms.txt` util para IA y verificaciones APISIX/Google-ready.

Cambios:
- Frontend centraliza SEO de producto en `productSeoProfile`: titulo, descripcion, alt base, terminos de busqueda, titulo Merchant y descripcion Merchant salen de una misma regla; campos custom solo se usan si cumplen rangos SEO.
- JSON-LD de producto usa descripciones SEO como fallback; `WebSite` ya no publica `SearchAction`; `PetStore` usa valores en espanol para contacto e idioma.
- Feed `/feeds/google-products.xml`, `llms.txt`, sitemap de imagenes, servicios SEO, checkout y textos globales quedan en espanol oficial y sin contenido visible de template en ingles.
- Backend agrega `ProductSeoMetadata` y el `ProductController` autogenera/persiste `seoTitle`, `seoDescription`, `seoImageAlt` y `seoSearchTerms`; publicar exige marca, SKU, especie, categoria, precio, stock, descripcion util, imagenes y SEO valido (`PRODUCT_SEO_PUBLICATION_REQUIRED` incluye `seoTitle`, `seoDescription`, `image_alt`).
- Scripts de importacion de productos aplican la misma regla SEO; `import_provider_products.php` tambien persiste `alt_text` cuando genera imagenes.
- Nuevo script idempotente `scripts/backfill_product_seo_attributes.php` para completar/corregir SEO en `Product.attributes` sin tocar precios, stock ni publicacion.
- `seo:audit` valida sitemap sin 404/redirect/noindex, canonical propia, JSON-LD Product completo, feed Merchant consistente, productos publicos con SEO minimo, noindex transaccional, rutas eliminadas y textos template en superficies publicas.
- Nuevo `scripts/check-seo-gateway.sh development` verifica APISIX gestionado, rutas esperadas, `www`/HTTP como redirecciones tecnicas, legacy bloqueado, rutas eliminadas 404, sitemap/robots/feed/llms servidos por web y API tenantizada.

Operacion y verificacion:
- Se redeplego solo development por scripts: backend y frontend. No se desplego production.
- Backfill development aplicado: primera pasada completo 109 productos con SEO faltante; segunda pasada corrigio 47 productos con SEO fuera de rango; dry-run final quedo en 0 pendientes.
- Pasaron `npm run typecheck`, `npm run lint`, sintaxis PHP de archivos tocados, `SEO_AUDIT_RESOLVE_IP=192.168.100.229 npm run seo:audit`, `./scripts/check-seo-gateway.sh development` y `./scripts/check-container-connectivity.sh development`.
- Auditoria final: 123 productos publicos, 123 items Merchant, 167 URLs sitemap, 103 fichas de producto en sitemap, 0 fallos; sitemap sin 404/redirect/noindex y Merchant sin canonicals fuera del sitemap.
- Se valido en contenedor PHP 8.5 que un producto nuevo sin SEO explicito genera `seoTitle`, `seoDescription`, `seoImageAlt`, alt de imagen y queda sin gaps SEO.
- No se tocaron production, certificados, secretos, SRI, Facturador, facturas ni datos financieros.

Decisiones:
- "No redirecciones" aplica a contenido publico eliminado; se conservan solo redirecciones tecnicas HTTP->HTTPS y `www -> paramascotasec.com`.
- Los 404 de rutas eliminadas son intencionales y correctos para Search Console hasta que Google las retire.

### 2026-06-09 - Perimetro APISIX Dinamico por .env

Objetivo: sustituir el perimetro Nginx por APISIX y dejar dominio, tenant, prefijos publicos y upstreams configurables desde `.env`, manteniendo ParamascotasEC solo como configuracion development actual.

Cambios:
- Gateway migra a `apache/apisix:3.16.0-debian` + `quay.io/coreos/etcd:v3.5.31` + `certbot/certbot:v5.6.0`, con webroot ACME interno y Admin API local.
- `Gateway/scripts/sync-apisix.sh` valida `Gateway/entorno/.env`, aplica upstreams/services/routes/ssl por Admin API y limpia solo objetos marcados como managed.
- Rutas publicas quedan tenantizadas: web `/`, backend `/${PUBLIC_TENANT_SLUG}/${PUBLIC_API_SERVICE_SEGMENT}/*` y facturacion `/${PUBLIC_TENANT_SLUG}/${PUBLIC_BILLING_SERVICE_SEGMENT}/${PUBLIC_BILLING_ENV_SEGMENT}/v1/*`.
- APISIX bloquea rutas legacy `/api/*`, `/facturador/*` y `/uploads-api/*`; alias del sitio redirigen al dominio principal y HTTP redirige a HTTPS salvo ACME.
- Frontend y backend leen dominio, alias, tenant y base API desde env; el frontend traduce sus llamadas publicas al prefijo tenantizado y conserva rutas internas `/api/...` solo como contrato intra-app.
- Checks de workspace se ajustan a APISIX, rutas tenantizadas, Admin API local y `entorno/.env`.

Operacion y verificacion:
- Se desplego solo development por scripts: backend, frontend y gateway. No se desplego production.
- No se ejecutaron migraciones, no se limpiaron datos y no se emitieron comprobantes SRI.
- Validado: `https://paramascotasec.com/`, `/paramascotasec/api/health`, `/paramascotasec/api/products`, `/paramascotasec/facturacion/health`, alias `www` con 301 y rutas legacy con 404.
- Pasaron `npm run typecheck`, `npm run lint`, sintaxis PHP/config/scripts, `docker compose --env-file Gateway/entorno/.env config`, `./scripts/check-container-connectivity.sh development`, `./scripts/check-env-secrets.sh development`, `./scripts/check-env-secrets.sh all`, `./scripts/check-paramascotas.sh` y `paramascotasec/scripts/check-api-routes.sh`.
- Quedan advertencias operativas preexistentes: sucursales Facturador development con API test sin `.p12` y datos/keys historicos de tenants no principales; no se modificaron por ser limpieza de datos separada.

### 2026-06-09 - Erradicacion de Identificadores Legacy en Preflight

Objetivo: eliminar nombres legacy del propio sistema de verificacion single-site sin perder la proteccion contra reintroducciones de tenants/dominios no permitidos.

Cambios:
- `scripts/check-env-secrets.sh` reemplaza la lista negra textual de identificadores antiguos por controles positivos: `server_name` del Gateway solo permite `paramascotasec.com` y `www.paramascotasec.com`; upstreams solo permiten los servicios internos esperados; backend config solo declara `paramascotasec`; frontend solo conserva el directorio de tenant `paramascotasec.com`.
- `AGENTS.md` y `paramascotasec/docs/AI_CONTEXT.md` neutralizan menciones historicas explicitas a nombres legacy, conservando el contexto como "legacy no permitido".

Operacion y verificacion:
- No se desplego ningun servicio y no se tocaron `.env`, bases de datos, certificados ni secretos.
- `bash -n scripts/check-env-secrets.sh` paso.
- `rg` confirma que el workspace ya no contiene los identificadores legacy consultados fuera de historial Git.

### 2026-06-08 - Gestion de Recurrencias y Arriendo Junio

Objetivo: hacer visible y corregible el gasto recurrente de arriendo desde `/my-account`, y reflejar el arriendo de junio ya pagado en el balance general development.

Cambios:
- Backend agrega `DELETE /api/admin/expenses/recurrences/{id}` para eliminar una plantilla recurrente preservando los gastos historicos generados (`ON DELETE SET NULL` en `BusinessExpense.recurrence_id`).
- Frontend de Gastos del negocio agrega acciones `Editar`, `Pausar/Activar` y `Eliminar` en tarjetas de recurrencias; `Editar` reutiliza el formulario principal con estado de edicion y cancelacion.
- UX de gastos aclarada: `Editar plantilla` hace scroll al formulario superior y muestra aviso de plantilla en edicion; `Anular gasto` abre un modal con `Que hara` / `Que no hara`, confirmacion explicita y detalle de que conserva historial pero excluye del balance; gastos de meses cerrados usan `Crear reverso` con modal equivalente que explica el ajuste financiero negativo en el mes abierto y que no modifica el cierre original.
- Se registro en development el arriendo de junio como gasto recurrente pagado: USD 184.00, fecha de gasto `2026-06-01`, metodo `Transferencia`, id `exp_arriendo_20260601`.
- La recurrencia `Arriendo local` quedo activa con proximo vencimiento `2026-07-01` para evitar que se genere otro arriendo el `2026-06-30`.

Operacion y verificacion:
- Se redeplego solo Backend y Frontend development con `./scripts/deploy-development.sh backend` y `./scripts/deploy-development.sh frontend`; luego se redeplego solo Frontend development por ajuste UX. No se desplego production.
- La DB development confirma `june_period_expenses=184.00` y `june_paid_expenses=184.00`.
- Pasaron `php -l` de archivos backend tocados, `npm run typecheck`, `npm run lint`, `git diff --check`, `./scripts/check-container-connectivity.sh development` y `./scripts/check-paramascotas.sh`; tras los ajustes UX volvio a pasar `npm run typecheck`, `npm run lint`, `git diff --check` y `./scripts/check-container-connectivity.sh development`.
- No se emitieron comprobantes, no se llamo al SRI y no se aplicaron migraciones.

### 2026-06-08 - Panel Principal Local del Facturador

Objetivo: permitir entrar a un panel principal del Facturador en development desde `http://127.0.0.1:8084/`.

Cambios:
- `Facturador/public/index.php` atiende `GET /` y `GET /index.php` con un panel inicial local con estado del servicio, conteo de clientes/sucursales y accesos a administracion de clientes, registro, healthcheck y rutas RIDE de pruebas.
- `Facturador/docker/nginx.conf` mantiene `index.php` como indice principal, conservando el front controller existente para endpoints PHP/API.

Operacion y verificacion:
- Se redeplego solo Facturador development con `./scripts/deploy-development.sh facturador`; no se desplego production.
- `GET http://127.0.0.1:8084/` devuelve el panel HTML, `GET /health` responde `healthy`, `docker exec billing-nginx nginx -t` pasa y `GET /api/manage_clients.php` responde desde la DB local.
- No se emitieron comprobantes, no se llamo al SRI y no se aplicaron migraciones.

### 2026-06-05 - Correccion Filtros Reporte de Ventas

Objetivo: corregir en `/my-account`, dentro del reporte general/de ventas, los filtros `Dia`, `Semana`, `Mes` y `Todo`, dejando `Semana` como ventana movil de los ultimos 7 dias y evitando que el reporte general muestre unidades de otro rango.

Causa:
- `/api/admin/report?scope=week` fallaba con 500 porque `FinancialPeriodRepository::buildSnapshot()` pasaba un `period_key` tipo `week:2026-05-30:2026-06-05` a `adjustmentSummary()`, que solo acepta periodos financieros mensuales `YYYY-MM`.
- La vista semanal podia mezclar datos precargados de dashboard; cuando un periodo real venia vacio, el frontend podia caer a totales/listas de otro rango.
- En Reporte general, el filtro `Dia` podia mostrar 109 unidades porque `reportSalesRankingRows` y las tarjetas financieras reutilizaban el acumulado precargado de ranking/rango mientras el reporte diario canonico aun no estaba activo o venia sin ventas.

Cambios:
- `FinancialPeriodRepository` agrega resumen de ajustes financieros por rango de fechas y `buildSnapshot()` lo usa para reportes diarios, semanales, historicos y mensuales.
- `OrderRepository` resuelve `scope=week` como ultimos 7 dias en `America/Guayaquil` (fecha ancla incluida + 6 dias previos); `Día`, `Mes` y `Todo` usan limites inclusivo/exclusivo consistentes.
- La serie semanal del dashboard, el filtro de pedidos admin y el movimiento de producto `period=week` usan la misma ventana movil de ultimos 7 dias.
- Frontend centraliza claves de fecha Ecuador, evita interpretar `YYYY-MM-DD` como UTC, cachea el reporte semanal por rango de ultimos 7 dias y usa el reporte canonico aun cuando el periodo no tenga ventas.
- Reporte general sincroniza sus botones `Dia/Semana/Mes/Todo` con la fuente canonica de ventas, no usa el ultimo dia con datos como fallback para `Dia`, muestra ventas recientes del periodo activo y exporta el resumen financiero del filtro visible.
- La exportacion del reporte de ventas usa `businessMetrics.report` para `Dia`, `Semana`, `Mes` y `Todo`; ya no toma `rangeFinancial` para los cortes diarios/semanales cuando existe reporte canonico.
- Las operaciones mensuales existentes de ajustes, cierre y preview de periodos financieros siguen validando y usando `period_key` mensual.

Operacion y verificacion:
- Se redeplego Backend y Frontend development con `./scripts/deploy-development.sh backend` y `./scripts/deploy-development.sh frontend`; el ultimo ajuste de Reporte general requirio redeploy solo de Frontend. No se desplego production.
- Pruebas por Gateway con JWT admin temporal: `Dia` 2026-06-05 devuelve 0 pedidos/0 unidades sin fallback; `Semana` devuelve `2026-05-30 -> 2026-06-05`, 14 pedidos, 38 unidades y ventas netas USD 154.10; `Mes` junio devuelve 11 pedidos, 20 unidades y ventas netas USD 130.59; `Todo` historico devuelve 101 pedidos, 217 unidades y ventas netas USD 947.23.
- La carga base del dashboard entrega 7 puntos `2026-05-30 -> 2026-06-05`; `GET /api/products/{id}/movement?period=week` devuelve `Últimos 7 días` con el mismo rango.
- Pasaron `php -l` de repositorios tocados, `npm run typecheck`, `npm run lint`, `git diff --check`, `./scripts/check-container-connectivity.sh development` y `./scripts/check-paramascotas.sh`.
- No se emitieron comprobantes SRI.

### 2026-06-03 - Orden Explicito de Imagenes de Producto

Objetivo: permitir que el admin ordene las imagenes de productos desde `/my-account` y elija cual se ve primero en listados y ficha publica.

Cambios:
- Backend agrega `Image.display_order` mediante `db/migrations/024_add_image_display_order.sql`, alinea `bootstrap_schema.php` y ordena `images`, `thumbImage` e `imageMeta` por `display_order, id`.
- `ProductRepository` y `scripts/import_provider_products.php` guardan `display_order` segun la posicion del arreglo recibido.
- Frontend agrega controles subir/bajar y etiqueta `Principal` en miniaturas e imagenes grandes del editor de productos.

Operacion y verificacion:
- Migracion aplicada solo en development sobre `next-test-db`; 378 imagenes existentes recibieron orden inicial y no quedaron filas con `display_order` nulo.
- Redeploy solo development: `./scripts/deploy-development.sh backend` y `./scripts/deploy-development.sh frontend`.
- Pasaron `npm run typecheck`, `npm run lint`, sintaxis PHP de archivos tocados, `git diff --check`, `./scripts/check-paramascotas.sh` y `./scripts/check-container-connectivity.sh development`.
- No se desplego production.

### 2026-06-03 - Restore Development desde Backup Production

Objetivo: recuperar la visibilidad del catalogo en development despues de restaurar DB principal y Facturador desde backups cifrados de production.

Causa:
- El backup production restauro el rol `paramascotasec_backend_app` con credenciales/permisos distintos a `.env.development`; el backend quedo con `/api/health` en 503 por `password authentication failed`.
- Tras alinear password, el backend aun no podia ver tablas como `ProductReferenceCatalog` por falta de `USAGE` en schema `public` y grants DML sobre la DB real `DB_DATABASE`.

Cambios:
- Se alineo en development el password del rol runtime del backend con `paramascotasec-backend/.env.development`, sin imprimir secretos.
- Se restauraron permisos runtime: `GRANT USAGE ON SCHEMA public`, DML sobre tablas y uso/lectura de secuencias para `paramascotasec_backend_app`.
- `paramascotasec-DB/scripts/restore-from-backup.sh` ahora llama una rutina idempotente que, despues de un restore, ajusta automaticamente el rol del backend segun `.env`/`.env.development` del modo destino.

Operacion y verificacion:
- No se reimporto ni se limpio data; los conteos restaurados se conservaron.
- API por Gateway `https://paramascotasec.com/api/products` devuelve 123 productos publicos y `/tienda` renderiza tarjetas reales.
- Facturador development autentica con `billing_user` en `billing_service`; no se emitieron comprobantes SRI.
- `./scripts/check-container-connectivity.sh development` paso completo.

### 2026-06-02 - Regla Consumidor Final Maximo USD 50

Objetivo: aplicar correctamente la regla SRI de consumidor final: no generar facturas como consumidor final por montos mayores a USD 50.00.

Cambios:
- Backend `OrderController` centraliza resolucion de cliente para Facturador: documento faltante, tipo consumidor final o identificacion invalida caen a `9999999999999` solo si el total oficial no supera USD 50.00.
- `store()` valida la cotizacion server-side antes de crear la orden; `updateStatus()` valida antes de pasar a `completed`/`delivered`; ambos responden `409 FINAL_CONSUMER_LIMIT_EXCEEDED` si una venta mayor a USD 50.00 quedaria como consumidor final.
- Facturador `EmitInvoice` bloquea `9999999999999` mayor a USD 50.00 antes de reservar secuencial, firmar XML o llamar al SRI.
- Facturador valida la identificacion del cliente antes de reservar secuencial para evitar consumo de numeracion por solicitudes directas con cedula/RUC invalido.

Operacion y verificacion:
- Se redeplego solo development con `./scripts/deploy-development.sh facturador` y `./scripts/deploy-development.sh backend`; no se desplego production.
- No se emitieron nuevos documentos SRI. El ultimo comprobante en Facturador siguio siendo `001-001-000000121` (`AUTORIZADO`, creado `2026-06-02 18:58:46-05`).
- `Facturador/scripts/test-phpunit.sh --filter 'EmitInvoiceFinalConsumerLimitTest|XmlInvoiceBuilderTest|RucTest'` paso con 9 tests / 30 assertions.
- Sintaxis PHP backend completa, `./scripts/check-container-connectivity.sh development`, `./scripts/check-env-secrets.sh all` y `./scripts/check-paramascotas.sh` pasaron.
- Prueba PHP interna del backend: consumidor final USD 50.01 queda bloqueado; cedula valida `1702527887` con USD 50.01 queda permitida.

### 2026-06-02 - Alineacion Development con Correcciones de Facturacion Production

Objetivo: comparar la conversacion de production sobre facturacion/RIDE con el workspace development y dejar ambos ambientes alineados en reglas fiscales y operativas.

Hallazgos:
- Development ya contenia las correcciones principales de production: RIDE desde datos locales (`invoice_details` y `raw_request.items` antes que XML), exclusion de anuladas por defecto en listados RIDE, `include_cancelled`, idempotencia por `source_reference`, indice unico parcial, sincronizacion backend -> Facturador por orden existente, consumidor final `9999999999999` como tipo SRI `07`, candados de mantenimiento/reemision y 404/409 limpio para PDFs anulados.
- Diferencia encontrada: la cedula `1702527887` aceptada en production no estaba aceptada explicitamente en development.

Cambios:
- `Facturador/src/Shared/Domain/ValueObjects/Identification.php` acepta `1702527887` como excepcion controlada de cedula y devuelve tipo SRI `05`.
- `paramascotasec-backend/src/Controllers/OrderController.php` acepta la misma cedula antes de aplicar fallback a consumidor final.

Operacion y verificacion:
- Se redeplego solo development por scripts: `./scripts/deploy-development.sh facturador` y `./scripts/deploy-development.sh backend`.
- No se emitieron facturas, no se generaron documentos nuevos y no se consulto al SRI.
- Prueba runtime Facturador: `1702527887=05` y `9999999999999=07`.
- Prueba runtime Backend por reflexion: `validateEcuadorCedula('1702527887')` devuelve `true`.
- Facturador DB development: 93 cabeceras, 0 duplicados activos por `source_reference`, 1 factura anulada/reemplazada local.
- `Facturador/scripts/test-phpunit.sh --filter 'XmlInvoiceBuilderTest|RucTest'`, `./scripts/check-paramascotas.sh` y `./scripts/check-container-connectivity.sh development` pasaron.

### 2026-06-02 - Correccion Frontend Development CSP e Hidratacion

Objetivo: corregir que la home quedara en skeletons sin mostrar productos y que `/my-account` quedara en `Cargando tu cuenta...` en development.

Causa:
- El despliegue development estaba corriendo `next dev --webpack` detras del gateway; ese runtime usa `eval` para hot reload y no es compatible con una CSP estricta.
- Next dev tambien reportaba un hydration warning por el atributo `nonce` en scripts JSON-LD; el navegador oculta ese atributo al comparar el DOM hidratado.

Cambios:
- Se elimino la excepcion `unsafe-eval` de la CSP aplicada y de report-only; development y production quedan con politica estricta.
- `FRONTEND_DEV_RUNTIME=stable` queda como modo canonical de despliegue development; los defaults de `docker-compose.yml` y `scripts/common.sh` pasan a `stable`.
- `scripts/common.sh` rechaza `FRONTEND_DEV_RUNTIME` distinto de `stable` en deploy development para no levantar HMR detras del gateway.
- Se retiro `NEXT_PUBLIC_CSP_ALLOW_UNSAFE_EVAL` de compose/env example/development.
- Los scripts JSON-LD con nonce agregan `suppressHydrationWarning` para evitar avisos falsos de hidratacion.

Operacion y verificacion:
- Se redeplego solo Frontend development con `./scripts/deploy-development.sh frontend`; no se desplego production.
- `npm run typecheck` y `git diff --check` pasaron en el frontend.
- `./scripts/check-container-connectivity.sh development` paso completo; `/api/products` devuelve 127 productos publicos.
- Playwright contra `https://paramascotasec.com` resuelto a `192.168.100.229` encontro `.pm-product-card__name`, la captura full-page muestra catalogo real, y `/my-account` sin sesion muestra el formulario de login.

### 2026-06-02 - Emision de Factura de Prueba SRI Pruebas para Precision

Objetivo: generar un comprobante real en SRI pruebas desde development para validar la correccion de decimales/centavos del Facturador sin tocar production.

Operacion y resultado:
- Se emitio por el endpoint development del Facturador `POST /api/test/v1/invoices`, usando SRI `pruebas` y sin desplegar production.
- Comprobante autorizado: `001-001-000000120`, clave de acceso/autorizacion `0206202601175968768200110010010000001202082890613`, source reference `precision-test-20260602185204`.
- Caso validado: precio bruto esperado `19.90` con IVA 15%; detalle guardado con `quantity=1.000000`, `unit_price=17.304348`, `line_subtotal=17.304348`, `tax_amount=2.595652`.
- XML generado, firmado y autorizado conserva precision en `cantidad=1.000000` y `precioUnitario=17.304348`; totales oficiales quedan `totalSinImpuestos=17.30`, IVA `valor=2.60`, `importeTotal=19.90`, pago `total=19.90`.
- Se genero ademas una venta POS backend completada y sin impacto de inventario: `ORD-20260602185846-BF66984F`, total `16.20`, source reference `backend-pos-precision-20260602185846`; emitio SRI pruebas autorizado `001-001-000000121`, clave `0206202601175968768200110010010000001211829837317`.
- La prueba backend verifico `OrderController -> Facturador`: `OrderItem.price_net=14.0870`, `net_total=14.0870`, `tax_amount=2.1130`; `invoice_details` guardo `quantity=1.000000`, `unit_price=14.087000`, `line_subtotal=14.087000`, `tax_amount=2.113000`; XML autorizado `totalSinImpuestos=14.09`, IVA `2.11`, `importeTotal=16.20`.
- Intentos previos de diagnostico: `001-001-000000118` fue `NO AUTORIZADO` por razon social de consumidor final distinta de `CONSUMIDOR FINAL`; `001-001-000000119` fue `DEVUELTA` por `ERROR SECUENCIAL REGISTRADO`. Ambos quedaron en SRI pruebas y no afectan production.

### 2026-06-02 - Cierre de Pendientes Preflight sin Emision SRI

Objetivo: corregir pendientes detectados en development para mejorar preparacion production sin generar facturas ni documentos SRI.

Cambios:
- `PANEL_IP_MODE` y `ADMIN_IP_MODE` quedan en `private` para development y production; los scripts ya no normalizan backend dev a `off`.
- `PANEL_IP_MODE` no debe bloquear el panel de cliente (`/my-account` sin pestaña admin); solo aplica a deep links administrativos dentro de `/my-account` y las APIs admin se protegen server-side.
- Gateway enruta rutas admin API (`/api/admin/*`, `/api/reports/*`, `/api/users*`, `/api/shipments`) por Next/proxy interno para preservar IP real y permitir enforcement server-side de allowlist.
- Facturador runtime sube a PHP 8.5 con imagen Debian bookworm; `composer.json` exige `php ^8.5`.
- Se agrega runner `Facturador/scripts/test-phpunit.sh` con `docker/Dockerfile.phpunit` PHP 8.5 para evitar depender del PHP del host.
- Tests del Facturador se alinean con namespaces/API actuales (`AccessKey::fromValue/create`) y RUC invalido real.

Operacion y verificacion:
- Se redeplego solo development por scripts: `facturador`, `backend`, `frontend`, `gateway`.
- No se desplego production y no se llamaron endpoints de emision SRI; las pruebas fueron locales o de conectividad.
- Antes y despues del trabajo, Facturador mantuvo conteos `AUTORIZADO=88` y `ANULADA_LOCAL=1`; no aparecieron comprobantes pendientes ni logs de procesamiento del worker.
- `Facturador/scripts/test-phpunit.sh` paso con 16 tests / 38 assertions en PHP 8.5.
- `./scripts/check-env-secrets.sh all`, `./scripts/check-container-connectivity.sh development`, `./scripts/check-paramascotas.sh`, `docker exec nginx-gateway nginx -t` y `git diff --check` pasaron.

### 2026-06-02 - Preflight Produccion desde Development

Objetivo: estimar si el workspace esta listo para pasar a produccion sin desplegar produccion.

Cambios:
- Frontend Next 16: se migro la politica de seguridad de `middleware.ts` a `src/proxy.ts`, que es la convencion activa cuando el proyecto usa `src/app`; la CSP con nonce vuelve a salir por Next y por Gateway.
- `app/tsconfig.json` actualiza `ignoreDeprecations` a `6.0` para TypeScript 6 y desbloquea el typecheck estandar.
- `app/docker-entrypoint.sh` da propiedad a `next-env.d.ts` y `tsconfig.tsbuildinfo` en development para que Next dev no quede bloqueado por permisos al correr como `appuser`.
- `scripts/check-paramascotas.sh` queda ejecutable.

Verificacion:
- No se desplego produccion.
- `./scripts/check-env-secrets.sh all` paso con 0 fallos y 0 advertencias; renderizo compose production y valido que solo Gateway publique 80/443.
- `npm run build`, `npm run lint`, `npm run typecheck` y `./scripts/check-paramascotas.sh` pasaron.
- `./scripts/check-container-connectivity.sh development` paso completo con catalogo publico de 127 productos.
- CSP activa validada por Gateway en `https://paramascotasec.com/` resolviendo a `192.168.100.229`.
- Egreso TCP hacia SRI produccion `cel.sri.gob.ec:443` respondio OK desde `billing-service`, sin emitir documentos.

Riesgo pendiente:
- Si los administradores necesitan entrar desde Internet sin VPN/LAN, `PANEL_IP_MODE=private` / `ADMIN_IP_MODE=private` bloqueara ese acceso; en ese caso configurar `custom` con IPs publicas fijas antes del corte productivo.

### 2026-06-02 - Fix Permisos Schema Public en Modulos Financieros Development

Objetivo: corregir errores de consola/admin en development por `SQLSTATE[42501] permission denied for schema public` al cargar datos que instanciaban `FinancialPeriodRepository`.

Causa:
- `FinancialPeriodRepository`, `BusinessExpenseRepository` y `PosRepository` ejecutaban `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX` en runtime.
- El rol de aplicacion `paramascotasec_backend_app` tiene permisos DML sobre tablas existentes, pero no permiso DDL `CREATE` sobre el schema `public`, como corresponde para runtime.

Cambios:
- Se agrego `db/migrations/023_add_financial_expense_pos_tables.sql` para crear tablas/indexes de periodos financieros, ajustes, gastos y POS, con grants DML/sequence al rol backend cuando exista.
- `scripts/bootstrap_schema.php` queda alineado para DBs nuevas.
- Los repositorios financieros/gastos/POS ya no ejecutan DDL en runtime; ahora verifican que las tablas requeridas existan y fallan con mensaje operativo si falta bootstrap/migracion.

Operacion y verificacion:
- Se aplico la migracion en development con `psql` dentro de `next-test-db`, sin imprimir secretos.
- Se redeplego solo backend development con `./scripts/deploy-development.sh backend`.
- Reproduccion directa OK: `FinancialPeriodRepository`, `BusinessExpenseRepository` y `PosRepository` instancian sin error.
- `./scripts/check-container-connectivity.sh development` paso completo.

### 2026-06-02 - Comandos Claros de Despliegue por Ambiente

Objetivo: ordenar la operacion para que existan dos comandos generales y comandos simples por servicio desde la raiz del workspace.

Cambios:
- Se agregaron wrappers raiz `scripts/deploy-development.sh <servicio>` y `scripts/deploy-production.sh <servicio>` para `facturador`, `db`, `backend`, `frontend` y `gateway`.
- `README.md` quedo como guia corta de despliegues, reglas de ambiente, operaciones puntuales y verificaciones.
- `AGENTS.md` y `paramascotasec/docs/AI_CONTEXT.md` documentan los wrappers canonicos y reemplazan los comandos antiguos por carpeta para deploys individuales.

Decisiones:
- Se mantienen `./deploy-development.sh` y `./deploy-production.sh` como unicos comandos generales del workspace.
- Los wrappers por servicio solo despachan a scripts existentes; no ejecutan `docker compose up` directamente.

### 2026-06-02 - Precision SRI en Facturas Development

Objetivo: evitar redondeos prematuros en facturas SRI nuevas, preservando precision compatible con SRI en calculos internos y dejando centavos solo en campos oficiales del XML.

Causa:
- Backend enviaba algunos valores con 4-6 decimales, pero el Facturador recortaba despues en `Money`, `calculateTaxes`, XML, `invoice_details` y RIDE con `round(..., 2)` / `number_format(..., 2)`.
- `invoice_details` guardaba `quantity`, `discount` y `line_subtotal` con escala 2 y no persistia `tax_amount`, dificultando auditoria/regeneracion sin perdida.

Cambios:
- Backend `OrderController::buildFacturadorPayload` ahora prioriza `price_net`, `net_total` y `tax_amount` ya calculados por la orden cuando existen, y envia montos al Facturador como strings decimales de 6 posiciones.
- Facturador conserva montos internos a 6 decimales: `Money` ya no redondea en constructor y `EmitInvoice::calculateTaxes` agrupa base/IVA con escala 6.
- `XmlInvoiceBuilder` emite `cantidad` y `precioUnitario` con 6 decimales; subtotales, descuentos, IVA, pagos y total se formatean a 2 decimales como salida oficial SRI.
- `invoice_details` sube precision a `NUMERIC(18,6)` para `quantity`, `discount`, `line_subtotal` y agrega `tax_amount NUMERIC(18,6)` mediante `db/migrations/007_invoice_detail_precision.sql`; `db/init/001_schema.sql` queda alineado.
- RIDE muestra cantidad/precio unitario con 6 decimales y mantiene totales oficiales a centavos.

Operacion:
- Se aplico solo en development.
- Se redeplegaron Backend y Facturador con scripts development; Facturador requirio `RUN_DB_MIGRATIONS=1`.
- El volumen DB del Facturador aceptaba la credencial de `.env`; se alineo el rol `billing_user` con `.env.development` sin imprimir secretos para que el runtime development y migraciones conecten correctamente.
- Durante el deploy orquestado, `paramascotasec-app-dev` no tenia egreso por estar solo en `paramascotasec-web-internal`; se conecto temporalmente a `bridge` solo para completar `npm ci` y luego se desconecto. El frontend quedo nuevamente solo en `paramascotasec-web-internal`.

Verificacion:
- Prueba enfocada XML: `docker run --rm -v /home/admincenter/contenedores/Facturador:/app -w /app pm-facturador-php85-check ./vendor/bin/phpunit tests/Integration/Infrastructure/XmlInvoiceBuilderTest.php` paso con 3 tests / 17 assertions; valida `precioUnitario=17.304348`, `subtotal=17.30`, `IVA=2.60`, `total=19.90` y mezcla IVA 0/15.
- Sintaxis PHP de Backend y Facturador paso; `git diff --check` paso en ambos repos.
- Migracion verificada: `invoice_details.quantity`, `unit_price`, `discount`, `line_subtotal` y `tax_amount` quedan con escala 6.
- `./scripts/check-container-connectivity.sh development` paso completo; Gateway development quedo en `192.168.100.229:80/443`, frontend dev healthy, Facturador en `APP_ENV=development` y `SRI_ENVIRONMENT=pruebas`.
- Suite completa del Facturador sigue bloqueada por tests preexistentes no relacionados (`App\...`, constructor privado de `AccessKey`, caso viejo de `RucTest`).

### 2026-06-02 - Correccion de RIDE PDF del Facturador

Objetivo: corregir PDFs RIDE que salian con `Sin detalles` y totales/IVA incompletos, observado en la factura `001-001-000000036`.

Causa:
- El generador de RIDE solo usaba `invoice_details`; facturas historicas/importadas sin filas en esa tabla quedaban sin productos aunque tuvieran encabezado autorizado.
- La factura `001-001-000000036` provenia de `sri-import-001-001-000000036` con `raw_request` marcado como `Importacion historica sin detalle de items ni XML local`, sin orden local vinculada y sin XML autorizado guardado.
- Se detecto deriva operativa: el volumen PostgreSQL del Facturador aceptaba la credencial de `.env.development`, mientras el servicio production usaba `.env`; se alineo el password del rol DB con `.env` sin imprimir secretos.

Cambios Facturador:
- `RidePdfInvoiceDataFactory` ahora construye datos del RIDE en cascada:
  - usa `invoice_details` cuando existen;
  - si faltan, intenta parsear XML autorizado/firmado guardado;
  - si faltan XML y detalles, reconstruye desde `raw_request.items`;
  - para imports historicos `user_provided_sri_report` sin detalle local, genera una linea explicita `SRI-IMPORT / Factura historica importada sin detalle de productos` e infiere subtotal/IVA 15% desde `valor_total_reportado`.
- `public/index.php` ya no sirve cache PDF a ciegas: al abrir `ride.pdf` regenera el RIDE; si faltan datos intenta recuperar XML autorizado desde SRI sin enviar correo; si aun no hay detalle, falla en vez de emitir un PDF incompleto.
- Se agregaron pruebas unitarias para fallback por `raw_request.items`, XML guardado e import historico sin items/XML.

Operacion:
- Se redeplego solo Facturador production con `Facturador/scripts/deploy-production.sh`.
- Se regeneraron 36 PDFs historicos autorizados importados sin detalle; todos respondieron OK por la ruta interna.

Verificacion:
- `001-001-000000036` ahora genera PDF con linea `SRI-IMPORT`, subtotal 15% `17.30`, IVA 15% `2.60` y total `19.90`; ya no aparece `Sin detalles`.
- Una factura normal reciente (`001-001-000000090`) sigue generando desde `invoice_details` reales y no usa `SRI-IMPORT`.
- `docker exec billing-service` conecta OK a DB con `.env` production; `https://paramascotasec.com/facturador/health` responde 200 al Gateway local.
- Prueba enfocada: `docker run --rm -v /home/admincenter/contenedores/Facturador:/app -w /app pm-facturador-php85-check ./vendor/bin/phpunit tests/Unit/Infrastructure/Services/RidePdfInvoiceDataFactoryTest.php` paso con 3 tests / 22 assertions.
- Suite completa del Facturador sigue bloqueada por tests preexistentes (namespaces `App\...`, constructor privado de `AccessKey`, constructor de `XmlInvoiceBuilder` sin config).

### 2026-05-31 - Restauracion Completa de Data Development

Objetivo: recuperar el estado real completo del ambiente de desarrollo (productos, imagenes, facturas/compras, ordenes e inventario) tras detectar que el data dir nuevo de development no contenia la data historica.

Causa:
- La separacion de ambientes dejo development apuntando a `postgres18_development_data`, un data dir creado el 2026-05-31. La data completa estaba en `postgres18_data` (snapshot previo del workspace), no perdida.

Cambios:
- Se respaldo el data dir parcial en `paramascotasec-DB/postgres18_development_data.before-full-restore-20260531-125837`.
- Se copio `paramascotasec-DB/postgres18_data` hacia `postgres18_development_data` y se levanto la DB con `paramascotasec-DB/scripts/deploy-development.sh`.
- Se limpio solo el alcance single-site dentro de la copia de development: se elimino la DB legacy no principal y el registro `Tenant` no principal, dejando solo `paramascotasec`.
- Se corrigieron 31 referencias de imagen antiguas `.jpg` en la tabla `Image` para apuntar a sus archivos `.webp` existentes.
- `scripts/deploy-workspace.sh` ya no siembra catalogo demo por defecto; si el catalogo publico esta vacio, falla. Solo permite reimportar datasets demo con `SEED_DEVELOPMENT_CATALOG=1`.

Estado restaurado:
- DB principal dev: 166 productos, 378 imagenes, 31 facturas de compra, 185 lineas de compra, 89 ordenes y 187 lotes de inventario.
- Facturador dev mantiene 89 `invoice_headers` y 88 `invoice_details`.
- Imagenes referenciadas por DB: 378/378 encontradas en disco.
- Catalogo publico visible: 127 productos.

Verificacion:
- `https://paramascotasec.com/api/products` devuelve 127 productos publicos; primer producto `Avant Premium Control de Peso` con imagen servida `200 image/webp`.
- `https://paramascotasec.com/tienda` responde 200 y contiene catalogo restaurado.
- `./scripts/check-container-connectivity.sh development` paso, incluyendo `gateway /api/products returns 127 public products`.
- `./scripts/check-env-secrets.sh all` paso con 0 fallos y 0 advertencias.

### 2026-05-31 - Recuperacion de Catalogo Development y Guardrail Produccion

Objetivo: corregir que la pagina de tienda mostraba `0 productos` en development tras separar ambientes y asegurar que production no se marque como desplegado correctamente con catalogo publico vacio.

Causa:
- Development quedo usando su data dir separado (`postgres18_development_data`) y la tabla `Product` estaba vacia, aunque API/frontend/gateway respondian correctamente.
- Nota posterior: esta recuperacion parcial fue reemplazada por la restauracion completa del data dir anterior; conservar solo como antecedente de la proteccion contra catalogo vacio.

Cambios:
- Se reimporto el catalogo development con scripts existentes del backend:
  - `import_provider_products.php` (185 productos).
  - `import_misha_fashion_pets.php` (18 productos + 20 lineas de compra).
  - `import_viba_pets.php` (28 productos + 28 lineas de compra).
- `scripts/deploy-workspace.sh` valida en cualquier ambiente que el catalogo publico tenga productos visibles; no siembra datos por defecto y falla el deploy si `/api/products` queda en cero.
- `scripts/check-container-connectivity.sh` valida `gateway /api/products` y falla si devuelve 0 productos publicos.

Verificacion:
- `./deploy-development.sh` completo paso; durante deploy mostro `Catalogo publico development disponible (46 productos visibles)` y al final `Catalogo publico verificado (46 productos visibles)`.
- `./scripts/check-container-connectivity.sh development` paso, incluyendo `gateway /api/products returns 46 public products`.
- `./scripts/check-env-secrets.sh all` paso con 0 fallos y 0 advertencias.
- `https://paramascotasec.com/api/products` en development devuelve 46 productos publicos; primer producto: `Arenero verde`.
- `https://paramascotasec.com/tienda` responde 200 y contiene contenido de catalogo/productos.

### 2026-05-31 - Alcance Single-Site ParamascotasEC

Objetivo: dejar el workspace limitado a `paramascotasec.com` / `www.paramascotasec.com`, sin dominios/tenants anteriores ni egresos hacia servicios de terceros no usados.

Cambios:
- Gateway queda sin bloques/upstreams de dominios anteriores; `CERTBOT_DOMAINS` dev/prod solo incluye `paramascotasec.com,www.paramascotasec.com`.
- Backend `config/tenants.php` y migracion `006_add_tenants.sql` quedan solo con `paramascotasec`; scripts auxiliares de tenants ya no crean DBs no usadas.
- Frontend deja de permitir el subdominio API dedicado; las APIs e imagenes de uploads quedan bajo el mismo sitio (`/api`, `paramascotasec.com`, `www.paramascotasec.com`).
- DB dev principal queda solo con base `paramascotasec` y `Tenant=paramascotasec`; se elimino la DB dev auxiliar vacia no usada.
- Facturador conserva solo cliente/sucursal principal activa; clientes/sucursales no principales quedaron inactivos, sin SMTP/certificados/logos y con API keys historicas revocadas para evitar egresos o accesos accidentales.
- `scripts/check-env-secrets.sh` ahora valida alcance single-site, tenant unico, ausencia de egresos/certificados en sucursales no principales y ausencia de API keys vigentes no principales.

Verificacion:
- `./deploy-development.sh` completo paso y luego se redeplego frontend dev para recargar `next.config.js`.
- `./scripts/check-container-connectivity.sh development` paso completo: puertos cerrados, redes internas, backend/facturador/DB/SMTP/SRI pruebas y rutas criticas OK.
- `./scripts/check-env-secrets.sh all` paso con 0 fallos y 0 advertencias para dev/prod.
- Gateway dev: `https://paramascotasec.com/` 200, `https://www.paramascotasec.com/` 301, `/healthz` 200, `/api/health` 200, `/facturador/health` 200; un dominio legacy no permitido queda cerrado (`000`/empty reply).
- Certificado publico productivo validado contra Let's Encrypt E8, SAN `paramascotasec.com,www.paramascotasec.com`, vigente del 2026-04-21 al 2026-07-20.

### 2026-05-31 - Auditoria de .env, Secretos y Preflight Produccion

Objetivo: revisar todos los `.env` reales y de desarrollo sin exponer valores, asegurar consistencia dev/prod y dejar produccion lista a nivel de configuracion sin activar worker/SRI produccion.

Cambios:
- Se agrega `scripts/check-env-secrets.sh development|production|all` para validar existencia/permisos de `.env`, secretos configurados sin imprimirlos, tokens internos frontend/backend, rutas del facturador por ambiente, bind del gateway, puertos renderizados de compose y API key del backend contra `api_keys` del facturador.
- Se limpia un password real que estaba comentado en `Facturador/.env` y `Facturador/.env.development`; queda como placeholder y el correo real del facturador sigue saliendo de `client_branches`.
- Backend queda alineado: `SRI_ENVIRONMENT=pruebas` en dev y `SRI_ENVIRONMENT=produccion` en prod; los scripts del backend lo normalizan en despliegues futuros.
- Facturador ahora carga ambiente desde variables Docker y/o el archivo activo (`BILLING_ENV_FILE`), no depende de leer siempre `.env`; PHP-FPM queda con `clear_env=no`.
- `config/sri.php` del facturador recupera defaults de empresa, certificado y correo desde variables de entorno para evitar fallos duros si un contexto de sucursal queda incompleto.

Verificacion:
- `./scripts/check-env-secrets.sh all` paso con 0 fallos y 0 advertencias tras limitar el alcance a la sucursal principal.
- `./scripts/check-container-connectivity.sh development` paso completo despues del redeploy de development.
- Produccion no se desplego para no activar worker/SRI produccion; preflight confirma prod con `SRI_ENVIRONMENT=produccion`, backend hacia `http://facturador:8080` + `/api/production/v1/invoices`, solo Gateway publica `80/443`, y certificado publico Let's Encrypt vigente hasta 2026-07-20.

### 2026-05-31 - Segmentacion de Red y Verificacion de Puertos (Dev)

Objetivo: reducir superficie de ataque sin cambiar flujos funcionales, manteniendo comunicaciones internas y egreso solo donde aplica (SMTP, SRI, API facturador).

Cambios infraestructura:
- Gateway publica solo `80/443`; en development se liga a IP LAN/local y en production a `0.0.0.0`.
- Gateway se une a `paramascotasec-services-internal` y publica el facturador solo bajo `/facturador/api/...`, reescribiendo a `/api/...`; el resto de `/facturador/` queda bloqueado salvo `/facturador/health`.
- Facturador queda segmentado en `billing_internal` (DB/service/worker/nginx), `billing_egress` (service/worker para SRI/SMTP) y `paramascotasec-services-internal` (nginx alias `facturador`).
- Desarrollo agrega sidecars `billing-nginx-local` y `billing-postgres-local` para diagnostico local `127.0.0.1:8084` y `127.0.0.1:5434`; los contenedores reales no publican puertos.
- Backend App se une a `paramascotasec-services-internal` para `http://facturador:8080` y a `backend_egress` para SMTP; Backend Web y Frontend siguen internos por gateway.
- Scripts normalizan ambientes: dev usa `development`/`SRI_ENVIRONMENT=pruebas`; prod usa `production`/`SRI_ENVIRONMENT=produccion`; frontend publico queda en `https://paramascotasec.com/api`.
- Se agrega `scripts/check-container-connectivity.sh development|production` para validar modo, puertos, redes, salud, DB, facturador, SMTP, SRI, gateway y rechazo no autenticado del facturador.

Verificacion:
- `./deploy-development.sh` completo dejo Facturador, DB, Backend, Frontend y Gateway healthy.
- `scripts/check-container-connectivity.sh development` paso completo: gateway LAN `192.168.100.229:80/443`, diagnostico local `127.0.0.1:8084/5434`, backend->DB/facturador/SMTP, facturador->DB/SRI pruebas/SMTP y rutas `/`, `/healthz`, `/api/health`, `/facturador/health`.
- Produccion no se desplego para no activar worker/SRI produccion; se validaron configs renderizadas: solo Gateway publica `0.0.0.0:80/443`, Facturador prod usa `SRI_ENVIRONMENT=produccion`, no hay sidecars/puertos de diagnostico, y frontend prod usa `https://paramascotasec.com/api`.
- Certificado publico actual de `paramascotasec.com` validado contra Let's Encrypt E8, SAN `paramascotasec.com,www.paramascotasec.com`, vigente del 2026-04-21 al 2026-07-20.
- Nota posterior: el workspace quedo limitado a `paramascotasec.com`; se retiro la DB dev auxiliar no usada y se dejo solo el tenant logico `paramascotasec`.

### 2026-05-25 - Ajuste de Espaciado del Slide 3 Hero (Dev)

Objetivo: separar el contenido del slide 3 y centrarlo un poco mas hacia la derecha en resoluciones compactas, sin modificar el alto global del slider ni las imagenes de fondo.

Cambios frontend:
- `app/src/styles/globals.scss` ajusta solo la variante `pet-hero-showcase--slide-3`:
  - en `1024-1279.98px` mueve el copy a `26%`, reduce ligeramente ancho/tamanos internos y baja los dots del slide 3 para que no tapen el subtitulo.
  - en `640-1023.98px` mueve el copy a `26%`, reduce el ancho maximo, ajusta `line-height`/margenes del titulo compuesto y aumenta la separacion entre etiqueta, subtitulo y CTA.

Verificacion:
- `git diff --check` paso.
- `http://127.0.0.1:3000/` respondio `200` y `/healthz` respondio `ok`.
- Capturas Playwright generadas:
  - `paramascotasec/docs/screenshots/2026-05-25-slide-showcase-proportions/slide3_spacing_viewport_1024x768_v3.png`
  - `paramascotasec/docs/screenshots/2026-05-25-slide-showcase-proportions/slide3_spacing_viewport_768x768_v3.png`

### 2026-05-25 - Fix Responsive y Fecha en Ventas por Factura (Dev)

Objetivo: corregir en `Productos x Compra > Ventas` que la fecha no aparecia y que la informacion se perdia hacia la derecha por falta de ancho.

Cambios frontend:
- `app/src/app/my-account/reports/ProductPurchaseHistoryPanel.tsx`:
  - fix de fecha para ventas con `formatSalesOrderDate`, que acepta timestamps completos (`YYYY-MM-DDTHH:mm:ss...`) y no solo `YYYY-MM-DD`.
  - normalizacion de referencias de factura/pedido (`normalizeOrderReference`) para resolver mejor `order_refs` contra `id`/`order_number`.
  - reemplazo de la tabla horizontal ancha por tarjetas responsivas por factura en la vista ventas:
    - bloque superior con `Factura / pedido`, estado y `Fecha`.
    - bloque de `Cliente` y `Pago / entrega`.
    - grilla de metricas (`Venta neta`, `Costo`, `Utilidad`, `Margen`, `IVA`, `Envío`) sin overflow horizontal.
  - ajuste de placeholder cuando no hay producto seleccionado: ahora menciona ventas o compras.

Verificacion:
- `git diff --check` paso.
- `npx tsc --noEmit --ignoreDeprecations 6.0` mantiene unico bloqueo preexistente en `tailwind.config.ts`: `mode` no reconocido por `Config`.

### 2026-05-25 - Ventas por Factura en Reporte Productos x Compra (Dev)

Objetivo: ajustar la vista **Ventas** del reporte `Productos x Compra` para mostrar una lista separada por factura/pedido, no solo agregados por producto.

Cambios frontend:
- `app/src/app/my-account/reports/ProductPurchaseHistoryPanel.tsx`:
  - agrega prop `salesOrders` y construye un indice por referencia (`id`/`order_number`).
  - usa `selectedSalesRow.order_refs` para resolver las facturas/pedidos del producto seleccionado.
  - reemplaza el bloque agregado de ventas por una tabla de filas individuales por factura con: `Fecha`, `Factura / pedido`, `Cliente`, `Pago / entrega`, `Venta neta`, `Costo`, `Utilidad`, `Margen`, `IVA`, `Envío`.
  - mensaje vacio cuando no existan facturas vinculadas en el periodo.
  - la vista de ventas ya no depende del estado/error de compras para renderizar.
- `app/src/app/my-account/MyAccountController.tsx`:
  - pasa `reportSalesOrders` al panel (`salesOrders={reportSalesOrders}`) para habilitar el desglose por factura.

Verificacion:
- `git diff --check` paso.
- `npx tsc --noEmit --ignoreDeprecations 6.0` mantiene bloqueo preexistente en `tailwind.config.ts`: `mode` no reconocido por `Config`.

### 2026-05-25 - Reporte Productos x Compra con Vista Ventas por Defecto (Dev)

Objetivo: extender el reporte `Productos x Compra` para incluir lectura de ventas y dejar **Ventas** como vista por defecto, con conmutador manual a **Compras** (la vista existente de lotes/procurement).

Cambios frontend:
- `app/src/app/my-account/reports/ProductPurchaseHistoryPanel.tsx` agrega modo dual:
  - segmentado `Ventas / Compras` con estado local y default `Ventas`.
  - modo `Ventas`: lista y detalle comercial por producto usando datos existentes de `SalesRankingRow` (pedidos, unidades, venta neta, costo, utilidad, margen, IVA y envío) para el periodo activo del reporte.
  - modo `Compras`: conserva la vista actual de historial de lotes/compras con factura, proveedor, cantidades y costos.
  - filtros rapidos adaptativos segun modo (`Con/Sin ventas` o `Con/Sin compras`).
  - tarjetas resumen superiores enfocadas en ventas (total productos, con ventas, unidades vendidas, venta neta, utilidad).
- `app/src/app/my-account/MyAccountController.tsx`:
  - pasa `reportSalesRankingRows` y `reportSalesPeriodLabel` al panel para alimentar modo ventas sin endpoints nuevos.
  - ajusta el badge contextual de cabecera en esta seccion para mostrar cobertura dual:
    - `Ventas: X SKU`
    - `Compras: Y SKU`.

Verificacion:
- `git diff --check` paso.
- Validacion de tipos acotada con `npx tsc --noEmit --ignoreDeprecations 6.0`:
  - sin errores nuevos del reporte.
  - persiste bloqueo preexistente en `tailwind.config.ts`: `mode` no reconocido por tipo `Config`.

### 2026-05-25 - Reporte Productos x Compra (Dev)

Objetivo: crear en **Reportes** una vista interna tipo maestro-detalle para consultar productos admin y su historial de compras/lotes, reutilizando endpoints existentes y sin cambios de backend.

Cambios frontend:
- Se agrega la seccion `products-purchases` en:
  - `app/src/app/my-account/types.ts` (`AdminReportSection`).
  - `app/src/app/my-account/reportSections.ts` (`REPORT_SECTION_META`).
  - `app/src/app/my-account/hooks/useAdminSidebarNavigation.ts` (allowlist de secciones por query param y navegacion).
- `app/src/app/my-account/components/AccountSidebar.tsx` agrega el boton **Productos x Compra** dentro del grupo **Reportes**, navegando a `activeTab='reports'` con `adminReportSection='products-purchases'`.
- Se crea `app/src/app/my-account/reports/ProductPurchaseHistoryPanel.tsx` con:
  - layout responsive maestro-detalle (lista izquierda + panel derecho en desktop, apilado en movil).
  - buscador y filtros rapidos `Todos / Con compras / Sin compras`.
  - orden de lista por compra mas reciente primero.
  - tarjetas de resumen: total productos, productos con compras, unidades compradas, unidades restantes y capital restante.
  - panel de detalle con metricas del producto y tabla de lotes con columnas: `Fecha`, `Factura / origen`, `Proveedor`, `Comprado`, `Consumido`, `Restante`, `Costo unitario`, `Total compra`, `Estado`.
  - lotes sin factura asociados a su `source_type/source_ref` como origen no enlazado (sin ocultarlos).
  - click en factura enlazada abre `PurchaseInvoiceDetailModal` via `onOpenPurchaseInvoice`.
- `app/src/app/my-account/MyAccountController.tsx` integra:
  - estado para producto seleccionado, detalle seleccionado, loading/error.
  - cache por `product_id` (`productPurchaseReportDetailCache`).
  - loader del detalle con `/api/products/{id}?scope=admin&procurement_detail=1`.
  - reutilizacion del listado admin existente (`/api/products?scope=admin`) y de normalizacion `normalizeProductProcurementDetail`.
  - render condicional de `ProductPurchaseHistoryPanel` dentro de `activeTab === 'reports'`.

Verificacion:
- `git diff --check` paso.
- `npm run lint` (en `paramascotasec/app`) mantiene bloqueo preexistente de ESLint 10.4.0: `TypeError: scopeManager.addGlobals is not a function`.
- `npm run typecheck` (en `paramascotasec/app`) mantiene bloqueo preexistente TS6: `TS5101` por `baseUrl` deprecado sin `ignoreDeprecations`.
- Verificacion adicional de tipos del cambio con `npx tsc --noEmit --ignoreDeprecations 6.0`: no reporta errores nuevos del reporte; persiste issue preexistente en `tailwind.config.ts` (`mode` no reconocido en `Config`).

Pendientes:
- QA manual en `/my-account?tab=reports` para validar UX completa (filtros, seleccion de producto, apertura de factura y comportamiento responsive en browser real).

### 2026-05-25 - Rebalance de Proporciones Internas del Hero (Dev)

Objetivo: reducir la escala interna de los elementos graficos de los 3 slides sin tocar tamanos globales, aspect ratios ni breakpoints del slider, manteniendo aire superior e inferior.

Cambios frontend:
- `app/src/styles/globals.scss` reduce tipografias, badges, CTAs, iconos y bloques de beneficios de `pet-hero-showcase*` para que el overlay no se vea sobredimensionado.
- Se agrego un breakpoint especifico `1920-2559.98px` para el overlay nuevo; evita que FHD use una escala demasiado grande antes de saltar a QHD.
- Slides 2 y 3 compactan beneficios y CTAs en FHD para que no rocen ni se recorten contra el limite inferior del hero.
- Se conservan los tamanos globales del banner y las reglas existentes de tablet/movil; bajo `1280px` los beneficios siguen ocultos para priorizar CTA/copy.

Verificacion:
- Capturas Playwright actualizadas en `paramascotasec/docs/screenshots/2026-05-25-slide-showcase-proportions/`; se regeneraron las de `1920x961` despues del ajuste FHD.
- `127.0.0.1:3000` responde `200` y `/healthz` responde `ok`.
- `git diff --check` paso.
- `npm run lint` sigue bloqueado por incompatibilidad preexistente de ESLint 10.4.0: `TypeError: scopeManager.addGlobals is not a function`.
- `npm run typecheck` sigue bloqueado por configuracion preexistente TS6: `TS5101` por `baseUrl` deprecado sin `ignoreDeprecations`.

### 2026-05-25 - Extension del Overlay Grafico a Slides 2 y 3 (Dev)

Objetivo: aplicar a los slides 2 y 3 el mismo enfoque visual del slide 1, construyendo el tratamiento grafico con React/CSS sobre las imagenes actuales y sin cambiar los tamanos globales del slider.

Cambios frontend:
- `app/src/components/Slider/SliderPet.tsx` refactoriza el hero para que los 3 slides usen render especializado via `SlideShowcase`.
- Slide 2 agrega `SlideTwoShowcase` con:
  - badge `EDICION ECUADOR` con bandera CSS.
  - titulo compuesto `La Tri` amarillo, `tambien`, `se vive en` y banda amarilla `cuatro patas`.
  - CTA amarillo `Ver camisetas` con flecha circular.
  - beneficios `Calidad premium`, `Diseno oficial de Ecuador`, `Hechos para los fanaticos`.
- Slide 3 agrega `SlideThreeShowcase` con:
  - badge `PARA SU DIA A DIA` con huella.
  - titulo compuesto `Todo para su`, `dia a dia,` y etiqueta `en un solo lugar`.
  - CTA teal `Ver productos` con flecha circular.
  - beneficios con iconos circulares: alimentos, snacks/juguetes y cuidado diario.
- `SliderPet.tsx` sincroniza dimensiones declarativas QHD/UHD con el ratio visual ya corregido (`5120x1000`, `6400x1200`).
- Los overlays se renderizan solo para el slide activo para evitar fugas visuales de elementos absolutos durante cambios de slide.
- `app/src/styles/globals.scss` agrega variantes `pet-hero-showcase--slide-2` y `--slide-3`, capas pseudo-elemento, CTAs, badges, bandas, beneficios y decoraciones por slide.
- CSS responsive:
  - beneficios visibles en desktop amplio.
  - slide 3 compacta beneficios en `1280-1535.98px` ocultando el tercero para evitar choque con el perro y el paginador.
  - beneficios ocultos bajo `1280px` por la regla base ya existente.
  - movil/tablet mantienen CTA visible y copy compacto.
- `app/src/generated/imageVersionManifest.json` fue regenerado por el prelint (`npm run images:manifest`).

Despliegue/verificacion:
- No se ejecuto deploy de produccion. El cambio quedo servido en `127.0.0.1:3000` por hot reload del contenedor dev activo.
- Capturas Playwright guardadas en `paramascotasec/docs/screenshots/2026-05-25-slide-showcase-all/` para slides 1, 2 y 3 en:
  - `2560x1440`
  - `1920x961`
  - `1366x768`
  - `1024x768`
  - `390x844`
- Verificacion visual: slide 1 mantiene proporciones restauradas; slides 2 y 3 usan los fondos actuales y se aproximan a las referencias; CTAs visibles; beneficios no quedan recortados; dots visibles en slides 2/3 sin tapar contenido critico.
- `git diff --check` paso.
- `npm run lint` no pudo completarse por incompatibilidad preexistente de ESLint 10.4.0: `TypeError: scopeManager.addGlobals is not a function`.
- `npm run typecheck` no pudo completarse por configuracion preexistente TS6: `TS5101` por `baseUrl` deprecado sin `ignoreDeprecations`.

Pendientes:
- QA visual manual en navegador real antes de promover a produccion, especialmente autoplay y transiciones en desktop.
- Corregir toolchain preexistente de ESLint/TS para recuperar `npm run test`.

### 2026-05-25 - Redisenio del Slide 1 Hero con Overlay Comercial (Dev)

Objetivo: rehacer visualmente el slide 1 del hero para aproximarlo a la referencia adjunta, manteniendo la misma imagen de fondo actual y construyendo los efectos con codigo.

Cambios frontend:
- `app/src/components/Slider/SliderPet.tsx` agrega un render especializado para `slide.id === 1` (`SlideOneShowcase`) con:
  - badge superior `TIENDA ONLINE EN ECUADOR` con bandera CSS.
  - H1 compuesto `Todo para tu` + banda amarilla `mascota` + etiqueta `en un solo lugar`.
  - CTA amarillo `Comprar ahora` con icono de bolsa.
  - barra de beneficios con iconos (`Perros y gatos`, `Entrega a domicilio`, `Atencion cercana`).
  - decoracion en codigo: corazones, huellas, trazos punteados y marcas tipo doodle.
- `SliderPet.tsx` conserva el render anterior para slides 2 y 3, y agrega clase dinamica `pet-hero-frame--slide-{id}` para poder ocultar dots solo en desktop cuando el slide 1 esta activo.
- `app/src/styles/globals.scss` agrega estilos scoped `pet-hero-showcase*`:
  - capas pseudo-elemento sobre la imagen actual para profundidad/contraste sin reemplazar assets.
  - tipografias, bandas, sombras, bordes punteados, CTA y decoraciones responsive.
  - version compacta en movil/tablet con CTA visible y barra de beneficios oculta bajo 1280px.
  - dots del carousel ocultos solo en desktop para `pet-hero-frame--slide-1`, alineado con la referencia y evitando solapes con CTA/beneficios.
- Correccion posterior solicitada por el usuario:
  - Se revierte cualquier cambio de proporcion/altura exclusivo del slide 1; quedan intactos los aspect-ratio y breakpoints globales del hero que ya estaban funcionando.
  - Se eliminan los recortes CSS duplicados de perro/gato; vuelve a usarse la imagen actual del slide como fondo unico.
  - Se conserva solo el tratamiento grafico dentro del marco original: badge, H1 compuesto, banda `mascota`, CTA, beneficios y doodles.
- Ajuste posterior para pantallas 1440p/QHD:
  - `app/src/styles/globals.scss` corrige el breakpoint `min-width: 2560px` de `aspect-ratio: 5120 / 1300` a `5120 / 1000`, reduciendo el alto visual del hero en pantallas 2560x1440 de ~646px a ~500px.
  - El breakpoint `min-width: 3840px` pasa de `6400 / 2200` a `6400 / 1200` para evitar la misma desproporcion en 4K.
  - El overlay `pet-hero-showcase` baja en QHD con `--pet-showcase-top: clamp(46px, 2.35vw, 68px)` para distribuir mejor titulo, subtitulo, CTA y beneficios dentro del nuevo alto.
- Ajuste menor posterior: se corrigen ambos doodles junto al titulo (`pet-hero-showcase__burst--left/right`) redefiniendo cada trazo con posicion propia para que se lean como rayos separados, no como flechas.
- Ajuste fino posterior contra referencia:
  - Badge superior mas ancho y centrado en desktop (`min-width` responsive) para acercarse al pill de la referencia.
  - Titulo/banda `mascota` ligeramente mas dominante en `>=1280px`, con rayos mas largos y separados alrededor del titulo.
  - Se agrega override compacto para `1280-1919.98px` porque ese rango tiene menor alto de hero; evita recorte del CTA/barra de beneficios tras agrandar el bloque superior.
  - CTA y barra de beneficios en desktop grande bajan su altura maxima a `clamp(..., 50px)` para no quedar pegados al borde inferior.

Despliegue/verificacion:
- No se ejecuto deploy de produccion. El cambio quedo servido en el contenedor dev activo `paramascotasec-app-dev` via hot reload.
- `curl http://127.0.0.1:3000/healthz` responde `ok` y `/` responde HTTP 200.
- CSS servido local confirma reglas `pet-hero-showcase*` en `/_next/static/css/app/layout.css` y no contiene los overrides retirados (`aspect-ratio: 1920 / 670`, `min-height: clamp(440px, 35vw, 680px)`, recortes `pet-hero-showcase__animal`).
- `git diff --check` paso.
- Capturas Playwright guardadas en `paramascotasec/docs/screenshots/2026-05-25-slide1-showcase/`:
  - `home_slide1_1920x961_restored_proportions.png`
  - `home_slide1_1366x768_restored_proportions.png`
  - `home_slide1_1024x768_restored_proportions.png`
  - `home_slide1_390x844_restored_proportions.png`
  - `home_slide1_2560x1440_qhd_fix_v2.png`
  - `home_slide1_1920x961_after_qhd_fix.png`
  - `home_slide1_1366x768_after_qhd_fix.png`
  - `home_slide1_burst_right_flipped_1920x961.png`
  - `home_slide1_burst_right_outward_v2_1920x961.png`
  - `home_slide1_title_rays_v1_1920x961.png`
  - `home_slide1_reference_tune_v2_1366x768.png`
  - `home_slide1_reference_tune_v3_1920x961.png`
  - `home_slide1_reference_tune_v3_2560x1440.png`
- CSS servido local confirma `aspect-ratio: 5120/1000`, `aspect-ratio: 6400/1200` y el nuevo `--pet-showcase-top` QHD; ya no aparece `5120/1300`.
- CSS servido local confirma posiciones independientes para los trazos de `pet-hero-showcase__burst--left/right`, evitando el efecto de flecha.
- CSS servido local confirma el override `1280-1919.98px`, el nuevo `--pet-showcase-title-top: clamp(42px, 3.2vw, 66px)` para desktop grande y CTA/barra con altura maxima de `50px`.
- `npm run lint` no pudo completarse por incompatibilidad preexistente de ESLint 10.4.0: `TypeError: scopeManager.addGlobals is not a function`.
- `npm run typecheck` no pudo completarse por configuracion preexistente TS6: `TS5101` por `baseUrl` deprecado sin `ignoreDeprecations`.

Pendientes:
- QA visual final en navegador real del usuario y, si se aprueba, promover a produccion usando scripts de deploy.

### 2026-05-25 - Rebuild Responsive del Slider Hero en Movil (Dev)

Objetivo: corregir recorte del CTA y exceso de texto apretado en el hero principal en resoluciones moviles.

Cambios frontend:
- `app/src/components/Slider/SliderPet.tsx` agrega `mobileTitle` y `mobileSubtitle` por slide para mostrar copy corto en `<= 639.98px` sin depender de JS por viewport.
- `SliderPet.tsx` envuelve titulo/subtitulo en spans `pet-hero-text--desktop` / `pet-hero-text--mobile` y agrega clases `pet-hero-dots*` para controlar paginador movil por CSS.
- `app/src/styles/globals.scss` agrega reglas base `pet-hero-text*` y redefine solo movil:
  - copy mas compacto y mejor posicionado por slide (`left/top/width/max`).
  - tipografias, line-height y espaciados del CTA optimizados para evitar corte.
  - `min-height` movil moderado (`clamp(208px, 56vw, 246px)` y `clamp(214px, 59vw, 252px)` para `<400px`) para asegurar visibilidad del boton sin recortar agresivamente la imagen.
  - clamp de texto movil (titulo max 3 lineas, subtitulo max 2 lineas).
  - paginador movil mas compacto (`pet-hero-dots__track`, `__btn`, `__dot`) para que no tape el CTA.
- Segunda pasada (desktop/FHD): se corrige escala pequena de copy y botones en resoluciones grandes para los 3 slides:
  - `1280-1919.98px`: `--pet-hero-title-size: clamp(34px, 2.62vw, 48px)`, `--pet-hero-subtitle-size: clamp(15px, 1.12vw, 20px)`, `--pet-hero-cta-size: clamp(16px, 1.12vw, 21px)` y `--pet-hero-copy-top: 17%`.
  - `1920-2559.98px`: `--pet-hero-title-size: clamp(46px, 2.58vw, 60px)`, `--pet-hero-subtitle-size: clamp(18px, 1.02vw, 24px)`, `--pet-hero-cta-size: clamp(19px, 1.02vw, 24px)` y `--pet-hero-copy-top: 14.8%`.
- Tercera pasada (texto aun mayor en desktop/FHD): se incrementa especificamente `title/subtitle` manteniendo el CTA:
  - `1280-1919.98px`: `--pet-hero-title-size: clamp(40px, 2.95vw, 56px)` y `--pet-hero-subtitle-size: clamp(17px, 1.28vw, 24px)`.
  - `1920-2559.98px`: `--pet-hero-title-size: clamp(54px, 2.9vw, 72px)` y `--pet-hero-subtitle-size: clamp(21px, 1.22vw, 29px)`.
- Cuarta pasada (H1 claramente dominante en resoluciones grandes): incremento fuerte del titulo para evitar desproporcion con el boton y el fondo:
  - `1280-1919.98px`: `--pet-hero-title-size: clamp(52px, 3.42vw, 74px)` (`--pet-hero-title-line: 1.1`).
  - `1920-2559.98px`: `--pet-hero-title-size: clamp(68px, 3.58vw, 94px)` (`--pet-hero-title-line: 1.08`).
  - `2560+`: base QHD sube a `--pet-hero-title-size: clamp(78px, 2.95vw, 98px)`.
  - `3840+`: base UHD sube a `--pet-hero-title-size: clamp(92px, 2.05vw, 116px)`.
- Quinta pasada (ajuste solicitado: texto aun pequeno en los 3 slides): se incrementa de forma agresiva el texto superior en todos los rangos grandes y se sube el bloque de copy para conservar composicion:
  - `1280-1919.98px`: `--pet-hero-title-size: clamp(66px, 4.08vw, 98px)`, `--pet-hero-subtitle-size: clamp(24px, 1.68vw, 34px)`, `--pet-hero-copy-top: 14.2%`.
  - `1920-2559.98px`: `--pet-hero-title-size: clamp(86px, 4.22vw, 124px)`, `--pet-hero-subtitle-size: clamp(30px, 1.52vw, 42px)`, `--pet-hero-copy-top: 12.6%`.
  - `2560+`: base QHD sube a `--pet-hero-title-size: clamp(102px, 3.55vw, 142px)` y `--pet-hero-subtitle-size: clamp(34px, 1.45vw, 52px)`.
  - `3840+`: base UHD sube a `--pet-hero-title-size: clamp(126px, 2.65vw, 182px)` y `--pet-hero-subtitle-size: clamp(42px, 1.08vw, 62px)`.
- Sexta pasada (correccion definitiva solicitada): se aplican overrides directos sobre el selector exacto del bloque superior `.pet-hero-copy` para evitar que cualquier regla global reduzca el texto:
  - `1280-1919.98px`: `.pet-hero-copy .pet-hero-title { font-size: clamp(72px, 4.45vw, 106px) !important; }` y subtitulo `clamp(26px, 1.8vw, 36px) !important`.
  - `1920-2559.98px`: titulo `clamp(94px, 4.62vw, 138px) !important` y subtitulo `clamp(34px, 1.72vw, 48px) !important`.
  - `2560+`: titulo `clamp(116px, 4.05vw, 170px) !important` y subtitulo `clamp(40px, 1.65vw, 58px) !important`.
  - No se modifica `.pet-hero-cta`; solo texto superior de los 3 slides.
- Septima pasada (causa raiz encontrada): el texto del hero venia envuelto en `<span class=\"pet-hero-text\">` y una regla global (`div, span, p { font-size: 16px; line-height: 26px; }`) le imponia 16px, anulando visualmente el escalado de `h1/h2`.
  - Fix definitivo: `.pet-hero-text` ahora hereda tipografia del contenedor (`font-size/line-height/font-weight/letter-spacing/color: inherit`), permitiendo que los tamanos grandes del titulo/subtitulo apliquen en los 3 slides.
- Octava pasada (rebalance): tras validar overflow en desktop, se reducen los overrides directos de texto superior para mantener impacto visual sin salirse del slide:
  - `1280-1919.98px`: titulo `clamp(50px, 3.15vw, 72px)` y subtitulo `clamp(18px, 1.15vw, 24px)`.
  - `1920-2559.98px`: titulo `clamp(62px, 3.2vw, 88px)` y subtitulo `clamp(22px, 1.18vw, 30px)`.
  - `2560+`: titulo `clamp(74px, 2.72vw, 108px)` y subtitulo `clamp(26px, 1.08vw, 36px)`.
  - Boton CTA se conserva sin cambios.
- Novena pasada (ajuste fino solicitado): se reduce solo el titulo superior del `slide-1` (`ParaMascotasEC...`) manteniendo el resto de slides y CTA:
  - `1280-1919.98px`: `clamp(42px, 2.75vw, 60px)`.
  - `1920-2559.98px`: `clamp(52px, 2.75vw, 76px)`.
  - `2560+`: `clamp(62px, 2.28vw, 92px)`.
  - Implementado con selector especifico `.pet-hero-copy--slide-1 .pet-hero-title`.
- Decima pasada (rebalance global solicitado): el texto seguia grande; se unifica y reduce para los 3 slides, eliminando el override exclusivo de `slide-1` y ajustando posicion vertical:
  - `1280-1919.98px`: titulo `clamp(38px, 2.45vw, 54px)`, subtitulo `clamp(15px, 0.98vw, 20px)`, `top: 10.5%`.
  - `1920-2559.98px`: titulo `clamp(48px, 2.56vw, 66px)`, subtitulo `clamp(18px, 0.95vw, 24px)`, `top: 9.8%`.
  - `2560+`: titulo `clamp(58px, 2.2vw, 80px)`, subtitulo `clamp(22px, 0.88vw, 30px)`, `top: 9.2%`.
  - CTA queda sin cambios.

Despliegue/verificacion:
- No se ejecuto deploy de produccion; cambio aplicado para este workspace en `development`.
- Se aplico `paramascotasec/scripts/deploy-development.sh` y `paramascotasec-app-dev` quedo healthy en `127.0.0.1:3000`.
- Verificado en `127.0.0.1:3000/_next/static/css/app/layout.css` que compilacion incluye los nuevos `clamp()` desktop/FHD y `--pet-hero-copy-top` de la segunda pasada.
- Verificado en CSS servido local que la tercera pasada refleja `clamp(40px, 2.95vw, 56px)`, `clamp(17px, 1.28vw, 24px)`, `clamp(54px, 2.9vw, 72px)` y `clamp(21px, 1.22vw, 29px)`.
- Verificado en CSS servido local que la cuarta pasada refleja `clamp(52px, 3.42vw, 74px)`, `clamp(68px, 3.58vw, 94px)`, `clamp(78px, 2.95vw, 98px)` y `clamp(92px, 2.05vw, 116px)`.
- Verificado en CSS servido local que la quinta pasada refleja `clamp(66px, 4.08vw, 98px)`, `clamp(86px, 4.22vw, 124px)`, `clamp(102px, 3.55vw, 142px)`, `clamp(126px, 2.65vw, 182px)`, y los nuevos `--pet-hero-copy-top` (`14.2%`, `12.6%`).
- Verificado en CSS servido local la presencia de reglas directas `.slider-block.style-one.pet-hero-frame .pet-hero-copy .pet-hero-title`/`.pet-hero-subtitle` con `!important` y `clamp(...)` grandes para `1280+`.
- Verificado en `127.0.0.1:3000/_next/static/css/app/layout.css` que `.pet-hero-text` compila con `font-size: inherit; line-height: inherit; font-weight: inherit; letter-spacing: inherit; color: inherit;`.
- Verificado en CSS servido local que la octava pasada refleja los nuevos clamps balanceados (`50/18`, `62/22`, `74/26` por breakpoint) en los overrides directos del hero.
- Verificado en CSS servido local la presencia de los nuevos overrides de `slide-1` con `clamp(42,2.75,60)`, `clamp(52,2.75,76)` y `clamp(62,2.28,92)`.
- Verificado en CSS servido local que la decima pasada compila con `clamp(38/15)`, `clamp(48/18)`, `clamp(58/22)` y offsets `top: 10.5% / 9.8% / 9.2%`.
- `npm run lint` no pudo completarse por error preexistente de ESLint 10.4.0: `TypeError: scopeManager.addGlobals is not a function`.
- `npm run typecheck` no pudo completarse por configuracion preexistente de TS6: `TS5101` por `baseUrl` deprecado sin `ignoreDeprecations`.

Dimensiones recomendadas para nuevas imagenes moviles (si se decide regenerar arte):
- `slade{1,2,3}-mobile-xs.webp`: **960x560** (aspect ratio 12:7), con area segura de texto en el 60% izquierdo y 12% superior.
- `slade{1,2,3}-mobile.webp`: **1200x700** (aspect ratio 12:7), misma area segura.
- `slade{1,2,3}-mobile-wide.webp`: **1440x760** (aspect ratio 1.89:1), dejando sujeto principal hacia derecha y margen inferior libre para dots.

Pendientes:
- Validar visual en `127.0.0.1:3000` en viewports moviles reales (360x800, 390x844, 412x915 y 430x932).
- Si se crean nuevos assets moviles con las dimensiones sugeridas, reemplazar tanto `public/images/slider/*.webp` como `public/images/slider/generated/*.webp` para slides 1-3.

### 2026-05-24 - Hotfix de Recorte en Slider Superior por Resolucion

Objetivo: evitar que el contenido del hero principal (titulo/subtitulo/CTA) se recorte en resoluciones desktop intermedias donde el banner quedaba demasiado bajo para el texto.

Cambios frontend:
- `app/src/styles/globals.scss` agrega un ajuste scoped para `@media (min-width: 1024px) and (max-width: 1535.98px)`:
  - Primera pasada: `pet-hero-frame` con `min-height: clamp(260px, 24vw, 332px)` y ajuste de espaciado vertical del copy.
  - Segunda pasada: `pet-hero-frame` sube a `min-height: clamp(300px, 25vw, 360px)` y `pet-hero-copy` cambia a anclaje por `bottom: clamp(50px, 4.2vw, 76px)` (en lugar de depender de `top`) para evitar recorte del boton "Descubrir ahora".
  - Las variantes `--slide-1/2/3` mantienen ajustes de `left/width/max` para reducir wrapping agresivo.
- Tercera pasada: se agrega override global para desktop de poca altura `@media (min-width: 1024px) and (max-height: 920px)` que reduce tipografias del hero, sube el bloque de copy (`top` fijo por slide) y fuerza `min-height: clamp(330px, 47vh, 430px)` para evitar recortes cuando el viewport es ancho pero bajo.
- Cuarta pasada: se agrega override final para `@media (min-width: 1280px) and (max-width: 1919.98px)`, caso tipico al acoplar DevTools, con `aspect-ratio: 2560 / 660`, `min-height: clamp(360px, 25.8vw, 440px)`, tipografias mas contenidas y `top: 18%` para mantener visible el CTA dentro del slide.
- Quinta pasada: la captura mostro `section` en `1920 x 360`; se ajusto el override FHD `@media (min-width: 1920px) and (max-width: 2559.98px)` conservando el ratio real del asset (`aspect-ratio: 3840 / 720`, `min-height: 360px`) y compactando tipografias/espaciados para que el CTA entre sin deformar ni recortar la imagen de fondo.
- Sexta pasada: para el caso FHD donde el hero quedaba alrededor de `360px` y seguia recortando el CTA, el override `1920-2559.98px` ahora usa `min-height: clamp(390px, 23vw, 460px)`, compacta tipografia y ancla `pet-hero-copy*` con `top: auto` + `bottom: clamp(56px, 3.4vw, 78px)` para garantizar visibilidad del boton.
- Septima pasada (ajuste correctivo): se revierte el enfoque de la sexta pasada porque generaba recorte lateral del gato y distribuia el texto demasiado abajo. El override `1920-2559.98px` vuelve a `min-height: 360px`, compacta ligeramente tipografia/espaciado y reubica el copy con `--pet-hero-copy-top: 16.5%` (sin anclaje por `bottom`) para equilibrar composicion y mantener el CTA visible.
- Octava pasada (ajuste de legibilidad): se incrementan de forma moderada titulo, subtitulo y CTA del hero en `1920-2559.98px` (`--pet-hero-title-size: clamp(37px, 2.02vw, 44px)`, `--pet-hero-cta-size: clamp(13px, 0.82vw, 15px)`, padding de CTA mayor) y se sube levemente el bloque de copy a `--pet-hero-copy-top: 15.8%` para conservar balance visual.
- Novena pasada (copy comercial slides 2 y 3): en `app/src/components/Slider/SliderPet.tsx` se mejora el texto de los slides promocionales:
  - Slide 2: `La Tri también se vive en cuatro patas`, subtitulo enfocado en camiseta de Ecuador y CTA `Ver camisetas`.
  - Slide 3: `Todo para su día a día, en un solo lugar`, subtitulo orientado a categorias de compra recurrente y CTA `Ver productos`.
- Decima pasada (CTA mas grande): se agranda visualmente el boton del hero para `1920-2559.98px` aumentando `--pet-hero-cta-size` a `clamp(14px, 0.9vw, 16px)` y padding a `9px 18px`, manteniendo el layout sin recorte.
- Undecima pasada (CTA claramente mayor): para que el cambio sea visible tambien en resoluciones `1280-1919.98px` como el caso `1752px` del navegador con DevTools acoplado, se aumenta el CTA a `--pet-hero-cta-size: clamp(16px, 1.05vw, 20px)` con `padding: 10px 22px`; en `1920-2559.98px` sube a `clamp(16px, 1vw, 19px)` con `padding: 10px 22px`.

Despliegue/verificacion:
- Se valido el diff CSS en `globals.scss` con reglas nuevas del rango `1024-1535.98px`.
- Correccion de entorno: este workspace opera en `development`; se aplico `paramascotasec/scripts/deploy-development.sh` y quedo `paramascotasec-app-dev` healthy en `127.0.0.1:3000`.
- Verificado en `127.0.0.1:3000/_next/static/css/app/layout.css` que la compilacion incluye `min-height: clamp(300px, 25vw, 360px)` y `bottom: clamp(50px, 4.2vw, 76px)` en el media query critico.
- Verificado adicionalmente en `127.0.0.1:3000/_next/static/css/app/layout.css` la presencia del media query `@media (min-width: 1024px) and (max-height: 920px)` con `min-height: clamp(330px, 47vh, 430px)` y `top` ajustado para `pet-hero-copy*`.
- Verificado en CSS servido local que el override final `1280-1919.98px` incluye `min-height: clamp(360px, 25.8vw, 440px)` y `--pet-hero-title-size: clamp(31px, 2.35vw, 42px)`.
- Verificado en CSS servido local que el override `1920-2559.98px` incluye `min-height: 360px` y `--pet-hero-title-size: clamp(36px, 1.95vw, 42px)`.
- Verificado en `127.0.0.1:3000/_next/static/css/app/layout.css` que el override `1920-2559.98px` refleja `min-height: clamp(390px, 23vw, 460px)` y `bottom: clamp(56px, 3.4vw, 78px)`.
- Captura Playwright de control en `paramascotasec/docs/screenshots/2026-05-24-slider-cta-fix/hero_fhd_after.png` confirma el CTA completo visible en ancho ~1923.
- Verificado en `127.0.0.1:3000` (despues del ajuste correctivo) que el hero mantiene CTA visible sin recorte lateral evidente de la imagen en `1923x900` y `1923x700` con capturas `hero_fhd_after_v2.png` y `hero_fhd_after_v2_h700.png`.
- Entorno restaurado a modo correcto de este workspace (`development`) con `paramascotasec/scripts/deploy-development.sh`; solo queda activo `paramascotasec-app-dev`.
- Verificado en CSS servido local que el override final FHD refleja `--pet-hero-title-size: clamp(37px, 2.02vw, 44px)`, `--pet-hero-cta-size: clamp(13px, 0.82vw, 15px)` y `--pet-hero-copy-top: 15.8%`.
- Capturas Playwright de la octava pasada en `paramascotasec/docs/screenshots/2026-05-24-slider-cta-fix/hero_fhd_after_v3.png` y `hero_fhd_after_v3_h700.png` confirman mayor legibilidad sin recortar gato ni CTA.
- Capturas Playwright de control de copy para los nuevos slides:
  - `paramascotasec/docs/screenshots/2026-05-24-slider-cta-fix/hero_slide2_copy_v1.png`
  - `paramascotasec/docs/screenshots/2026-05-24-slider-cta-fix/hero_slide3_copy_v1.png`
- Verificado en `127.0.0.1:3000` el agrandado de CTA con capturas:
  - `paramascotasec/docs/screenshots/2026-05-24-slider-cta-fix/hero_cta_bigger_v1.png`
  - `paramascotasec/docs/screenshots/2026-05-24-slider-cta-fix/hero_slide2_cta_bigger_v1.png`
- Verificado adicionalmente en viewport `1752x342` y `1752x480` (escenario similar a DevTools docked) con:
  - `paramascotasec/docs/screenshots/2026-05-24-slider-cta-fix/hero_slide3_cta_bigger_v2_1752x342.png`
  - `paramascotasec/docs/screenshots/2026-05-24-slider-cta-fix/hero_slide3_cta_bigger_v2_1752x480.png`
- `npm run lint` no pudo completarse por error preexistente de toolchain (`TypeError: scopeManager.addGlobals is not a function` en ESLint 10.4.0).
- `npm run typecheck` no pudo completarse por configuracion preexistente (`TS5101` por `baseUrl` deprecado sin `ignoreDeprecations` en TS6).

Pendientes:
- Validar visualmente el hero en resoluciones objetivo (especialmente 1024-1366 y 1280-1535) tras redeploy del frontend.
- Promover el ajuste al host real de produccion (la URL publica puede seguir sirviendo otro host si el DNS no apunta a este workspace).

### 2026-05-24 - Auditoria de Solapes de Estilos (Modales + Buscadores)

Objetivo: corregir solapes visuales adicionales detectados en modal de edicion admin, buscador rapido del header y buscador del catalogo/tienda.

Cambios frontend:
- `app/src/app/my-account/components/AdminAccountShellStyles.tsx` reduce alcance de reglas tipograficas/wrapping dentro de tabs (`p/li/label` + `.break-words`) para evitar que estilos globales de shell deformen componentes complejos.
- `app/src/app/my-account/components/product-editor/ProductEditorController.tsx` agrega clases `pm-product-editor-modal*` y elimina la barra meta sticky con offsets fijos (`top-[88px]/[96px]`) para evitar solapes bajo headers variables.
- `app/src/styles/visual-polish.scss` agrega hardening scoped para `pm-product-editor-modal*`, `pm-quickview-modal*` y `pm-catalog-search*`; corrige alineacion/espaciado de acciones en buscadores y wrapping en quickview.
- `app/src/components/Product/AllProducts.tsx` y `app/src/components/Shop/ShopBreadCrumb1.tsx` cambian `type=\"search\"` por `type=\"text\"` para eliminar el clear nativo del browser que se montaba sobre acciones custom.
- `app/src/components/Modal/ModalQuickview.tsx` incorpora clases `pm-quickview-modal*` para aislar correcciones de layout.
- `app/src/styles/modal.scss` elimina un bloque duplicado de `.modal-cart-main` para reducir ruido de cascada.

Despliegue/verificacion:
- `npm run lint`, `npm run typecheck` y `bash /home/admincenter/contenedores/scripts/check-paramascotas.sh` pasaron.
- Se verifico en `127.0.0.1:3000` que el CSS compilado incluye reglas nuevas (`pm-product-editor-modal`, `pm-catalog-search__actions`, `pm-quickview-modal`) y se generaron capturas en `paramascotasec/docs/screenshots/2026-05-24-overlap-audit`.

Pendientes:
- QA autenticada completa del modal admin de producto y tabs de cuenta sigue pendiente por credenciales temporales.

### 2026-05-24 - Hotfix de Recortes y Overflow (Publico + Panel)

Objetivo: corregir regresiones visuales reportadas tras la pasada integral (botones/paginacion recortados, textos que se salen del contenedor y panel con sensacion de corte en secciones anchas).

Cambios frontend:
- `app/src/components/Product/AllProducts.tsx` elimina `button-main` de la navegacion de paginacion (`Anterior/Siguiente`) para evitar herencia de caja negra y recorte de texto.
- `app/src/styles/visual-polish.scss` rehace `pm-catalog-pagination__nav`/`__page` con anchos independientes (nav auto + min-width, numeros cuadrados), hover/disabled claros y ajuste movil; ademas agrega `overflow-wrap`/`word-break` en bloques publicos clave para evitar desbordes de texto.
- `app/src/app/my-account/components/AdminAccountShellStyles.tsx` quita `overflow-x: hidden` del shell, fuerza `max-width/min-width` seguros en grid/main tabs, mejora wrappers scrollables y wrapping de texto en `tab/tab_address`; en movil el sidebar admin vuelve a `position: static` para evitar cortes visuales.
- `app/src/app/my-account/MyAccountController.tsx` ajusta paddings del contenedor admin y reduce el ancho de columna sidebar para dar mas aire al contenido principal.
- `app/src/app/my-account/components/{ProductReferenceSectionCard,BrandReferenceSectionCard,SupplierReferenceSectionCard}.tsx` normaliza paginacion interna con botones de ancho minimo y `flex-wrap`, evitando botones comprimidos.

Despliegue/verificacion:
- `npm run lint`, `npm run typecheck` y `bash /home/admincenter/contenedores/scripts/check-paramascotas.sh` pasaron.
- `paramascotasec/scripts/deploy-development.sh` recreo `paramascotasec-app-dev` y quedo healthy.
- Verificado que `127.0.0.1:3000` sirve el CSS actualizado (regla `pm-catalog-pagination__nav` nueva).
- Capturas Playwright de validacion en `paramascotasec/docs/screenshots/2026-05-24-visual-hotfix`, incluyendo home con paginacion cargada (`home_pagination_after_redeploy.png`) y rutas base de tienda/cuenta.

Pendientes:
- QA autenticada completa de tabs admin/cliente sigue pendiente por credenciales temporales.

### 2026-05-24 - Reacomodo Visual Integral Publico + Cuenta (Dev)

Objetivo: reacomodar paddings, margins y distribucion en paginas publicas + cuenta/autenticacion, consolidar la cascada de estilos y mantener el boton flotante de WhatsApp siempre visible sin tapar CTAs.

Cambios frontend:
- `visual-polish.scss` se dejo consolidado como fuente unica para layout publico (checkout, carrito, tienda, contacto, FAQ, footer, catalogo, buscadores y detalle), removiendo bloques duplicados de overrides y reforzando espaciado responsive.
- Se agrego `auth-account.scss` y se importa al final de `styles.scss` para normalizar layout/cards/formularios en `/login`, `/register`, `/forgot-password`, `/reset-password`, `/order-tracking` y estado no autenticado de `/my-account`.
- `login`, `register`, `forgot-password`, `reset-password` y `order-tracking` ahora usan clases `pm-auth-page*` con paneles, campos, alturas y separaciones consistentes.
- `MyAccountController.tsx` agrega estructura `pm-account-shell*` y `pm-account-guest*`; `AdminAccountShellStyles.tsx` refuerza contenedor, sidebar sticky, ritmo tipografico/vertical y overflow horizontal de tablas para tabs admin/cliente.
- `WhatsAppFloatingButton.tsx` ya no se oculta en checkout; permanece visible en todas las rutas y se compensa con safe bottom spacing en vistas criticas (publico, auth y cuenta).

Despliegue/verificacion:
- `paramascotasec/scripts/deploy-development.sh` recreo `paramascotasec-app-dev` (healthy) en `127.0.0.1:3000`.
- `npm run lint`, `npm run typecheck` y `bash /home/admincenter/contenedores/scripts/check-paramascotas.sh` pasaron.
- Capturas Playwright desktop + movil regeneradas para: `/`, `/tienda`, `/pages/contact`, `/pages/preguntas-frecuentes`, `/cart`, `/checkout`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/order-tracking`, `/my-account`.
- Evidencia en `paramascotasec/docs/screenshots/2026-05-24-visual-reacomodo`.

Pendientes:
- Validacion autenticada completa de tabs admin/cliente pendiente por credenciales temporales (y recovery/MFA si aplica).
- Promover los cambios al host de produccion real y confirmar visual desde Internet publica.

### 2026-05-24 - Reordenamiento Visual de Paginas Publicas

Objetivo: corregir espacios, alturas, paddings, margins y jerarquia visual de las paginas publicas despues de la migracion Tailwind 4, especialmente home, tienda, contacto y preguntas frecuentes.

Cambios frontend:
- `visual-polish.scss` consolida ritmo vertical publico con variables de seccion/card, espaciado consistente para home, catalogo, tienda, contacto, FAQ y footer.
- Home: se ajustan categorias, catalogo, beneficios, bloque "Las mejores razones", novedades y marcas; en movil se elimina la imagen flotante del bloque de razones porque invadia el texto durante carga lazy.
- Tienda: la grilla publica usa productos limpios sin cajas pesadas, thumbnails estables, nombres con clamp y mejor separacion entre sidebar, filtros, toolbar y paginacion.
- Contacto: formulario, inputs, textarea, cards laterales y quick links quedan con radios/paddings responsivos; se reducen letter-spacings excesivos en movil.
- Preguntas frecuentes: `pages/preguntas-frecuentes` recibe clases `pm-faq-page*`, cards/acordeones scoped, layout responsivo limpio y el enlace de contacto apunta a `/pages/contact`.
- Segunda pasada: `AllProducts` separa el buscador del catalogo en `pm-catalog-search*`, agrega paginacion `pm-catalog-pagination*` con color de marca, aumenta distancia filtro/grilla/paginacion y corrige badges `Nuevo`/`Oferta` con padding, line-height y sombra consistentes.
- Segunda pasada: el buscador del header usa clases `pm-header-search*` y resultados rapidos en grid para que imagen, nombre, meta, precio y accion no se aplasten ni se solapen.
- Tercera pasada: se recupera el lenguaje visual anterior de catalogo/home/novedades quitando bordes, sombras y fondos de cards de producto; paginacion vuelve a negro/gris, filtros quedan mas compactos y `Nuevo`/`Oferta` se apilan sin solaparse cuando coexisten.
- Tercera pasada: `/tienda` reutiliza `pm-catalog-search*`, en movil muestra primero busqueda/catalogo y luego filtros; `Product/Detail/Default.tsx` agrega clases `pm-product-detail*` para estabilizar ficha de producto, cantidad, CTAs, tarjetas informativas, tabs y relacionados.
- Cuarta pasada: checkout, carrito y footer reciben clases `pm-checkout-page*`, `pm-cart-page*` y `pm-site-footer`; se redistribuyen contenedores, steps, formularios, resumen de pedido, tabla de carrito, estado vacio y links del footer con grids y paddings estables.
- `CartContext` expone `hydrated` y `/checkout` espera la hidratacion del carrito antes de redirigir a `/cart`, evitando falsos vacios al abrir checkout directo con carrito en `localStorage`.
- `WhatsAppFloatingButton` se oculta en `/checkout` para no tapar campos del formulario en movil.

Despliegue/verificacion:
- `paramascotasec/scripts/deploy-development.sh` recreo el frontend dev y quedo healthy.
- `paramascotasec/scripts/deploy-production.sh` recreo el frontend production de este workspace (`paramascotasec-app`) y quedo healthy.
- Screenshots Playwright revisados en home movil/desktop, tienda desktop, contacto movil, about desktop y FAQ movil; tambien se verifico que el CSS servido por `127.0.0.1:3000` contiene las reglas `pm-*` nuevas.
- Segunda pasada verificada con capturas Playwright de catalogo desktop/movil, buscador rapido del header y tienda; `bash scripts/check-paramascotas.sh` paso.
- `npm run lint`, `npm run typecheck`, build Docker de produccion con Node 24 y `bash scripts/check-paramascotas.sh` pasaron. El build mantiene advertencias preexistentes de Sass `@import`, trazas dinamicas de uploads y peer deps de ESLint/TypeScript.
- Tercera pasada verificada con capturas Playwright de home, catalogo, paginacion/beneficios, buscador rapido, tienda desktop/movil y ficha de producto desktop/movil; `paramascotasec/scripts/deploy-production.sh` dejo `paramascotasec-app` healthy y `bash scripts/check-paramascotas.sh` paso.
- Cuarta pasada verificada con capturas Playwright de checkout desktop/movil, carrito desktop con producto y catalogo desktop; `paramascotasec/scripts/deploy-production.sh` dejo `paramascotasec-app` healthy y `bash scripts/check-paramascotas.sh` paso.
- Diagnostico de publicacion: `paramascotasec.com` resuelve a `80.241.213.31`, mientras este workspace sale a Internet como `157.100.87.179`; por DNS, la URL publica real sigue sirviendo otro host/build aunque este workspace este actualizado.

Pendientes:
- Promover estos cambios en el host real de produccion o actualizar el DNS/ruteo correspondiente; luego revisar visualmente `https://paramascotasec.com/` desde fuera del servidor.

### 2026-05-23 - Correccion de Regresion Visual Tras Tailwind 4

Objetivo: recuperar layout de home, tienda, contacto y panel privado despues de la migracion a Tailwind CSS 4, donde utilidades globales empezaron a pisar estilos del tema y componentes.

Cambios frontend:
- `styles.scss` carga Tailwind antes de los estilos del tema para que `.container` y reglas propias de Paramascotas mantengan el ancho esperado.
- `loading.scss` limita la regla `.icon` al loader (`.ajax-loader .icon`) para no estirar iconos de secciones como "Las mejores razones para elegirnos".
- `shop.scss` elimina redefiniciones globales de `.grid-cols-2`, `.grid-cols-3` y `.grid-cols-4`, evitando que pisen variantes responsive como `lg:grid-cols-4`.
- `header.scss` fija explicitamente `position: fixed; left: 0; right: 0;` cuando el header usa estado `fixed`.
- Segunda pasada: `visual-polish.scss` agrega estilos scoped `pm-contact-*`, `pm-catalog-*` y `pm-feature-products*` para estabilizar contacto, buscador/categorias del catalogo y tabs de novedades sin depender solo de utilidades Tailwind.
- El panel admin limita el ancho del shell a `max-w-[1720px]` para evitar estiramiento excesivo en monitores grandes.
- Tercera pasada: home usa `pm-home`/`pm-home-categories` para separar categorias del catalogo; `/tienda` usa `pm-shop-page*` con grid sidebar/contenido, filtros compactos y grilla `xl:grid-cols-4`.
- Cuarta pasada: el filtro secundario del home/catalogo (`Marcas`) usa `pm-catalog-filter__tabs--secondary` como fila horizontal desplazable, reduciendo altura y evitando que el card crezca con varias filas de pills.

Despliegue/verificacion:
- `NODE_ENV=production npm run build` ejecutado dentro de `paramascotasec-app-dev` paso.
- `paramascotasec/scripts/deploy-development.sh` recreo el frontend dev y quedo healthy.
- `scripts/check-paramascotas.sh` paso tras las pasadas visuales.

Pendientes:
- Si el navegador apunta al DNS publico de produccion, promover estos cambios con el script de produccion en una ventana controlada.

### 2026-05-23 - Actualizacion Tecnologica General

Objetivo: subir runtimes, dependencias e imagenes base a ramas estables/LTS actuales para reducir exposicion por versiones obsoletas.

Cambios workspace:
- Frontend objetivo: Node 24 LTS, Next 16.2, React 19.2, Tailwind 4.3, ESLint 10 y TypeScript 6; se elimino dependencias frontend directas sin uso detectado y se migro PostCSS a `@tailwindcss/postcss`.
- Backend y Facturador objetivo: PHP 8.5, Composer 2, extensiones PHP declaradas/instaladas explicitamente y lockfiles actualizados; Facturador versiona `composer.lock`.
- Infraestructura objetivo: PostgreSQL 18, Nginx stable 1.30 y pulls/builds con base actualizada dentro de scripts de deploy/renovacion.
- Tests Facturador se ajustaron al dominio actual (`AccessKey::fromValue()`, namespace PSR-4 real, config obligatoria de `XmlInvoiceBuilder`) para correr en PHPUnit 13.

Despliegue/verificacion:
- Development migrado con `backup-and-stop.sh` + `restore-from-backup.sh` sobre PostgreSQL 18; luego `./deploy-development.sh` dejo Facturador, DB, Backend, Frontend y Gateway healthy.
- Conteos post-restore: DB principal PostgreSQL 18.4 con productos=163, usuarios=23, ordenes=79; Facturador PostgreSQL 18.4 con invoice_headers=77 e invoice_details=60.

Decisiones:
- No adoptar ramas current/beta/mainline: Node 26, TypeScript 7 preview y Nginx mainline quedan fuera.
- La migracion PostgreSQL 16 -> 18 usa snapshot cifrado + restore sobre volumen nuevo; los volumenes PostgreSQL 16 se conservan para rollback.
- En PostgreSQL 18 el mount debe apuntar a `/var/lib/postgresql`, no a `/var/lib/postgresql/data`, porque la imagen oficial usa subdirectorios versionados.

Pendientes:
- Promover a produccion en ventana de mantenimiento con backup cifrado previo y rollback apuntando a los volumenes PostgreSQL 16 conservados.

### 2026-05-23 - Sitemap de Imagenes Robusto Para Search Console

Objetivo: corregir el error de Search Console en `https://paramascotasec.com/sitemap-images.xml` ("Falta la etiqueta XML url") y evitar respuestas vacias cuando fallan datos dinamicos.

Cambios frontend:
- `sitemap-images.xml/route.ts` sanitiza caracteres XML invalidos, reutiliza render de `<url>` y registra fallos al cargar productos/categorias.
- Si productos/categorias no generan entradas, devuelve fallback valido con `/tienda` y una imagen publica estable, evitando `<urlset>` vacio.
- `audit-seo-merchant.mjs` valida `/sitemap-images.xml`: conteo de `<url>`, imagenes, `<loc>`, imagen por URL y falla con exit code si hay errores estructurales.

Despliegue/verificacion:
- Publicado en este ambiente dev/QA con perfil frontend `production` usando `paramascotasec/scripts/deploy-production.sh`; pendiente promover el mismo cambio a produccion real.
- Verificado `https://paramascotasec.com/sitemap-images.xml`: HTTP 200, 107 URLs, 281 imagenes, `urlsetIsEmpty=false`, `errors=[]`.
- `robots.txt` incluye `sitemap.xml` y `sitemap-images.xml`.

Decisiones:
- Mantener `sitemap-images.xml` como sitemap separado listado en robots; no retirarlo de Search Console porque ya aporta URLs e imagenes validas.
- La causa probable del fallo del 22/05 fue una lectura de Google mientras el generador entrego un `urlset` sin entradas por fallo/intermitencia de datos.

Pendientes:
- Promover el cambio a produccion real, verificar `https://paramascotasec.com/sitemap-images.xml` desde fuera del servidor y reenviar `sitemap-images.xml` en Search Console; Google debe reemplazar el error tras nueva lectura.

### 2026-05-23 - Reportes Actualizados Tras Corregir Costos

Objetivo: evitar que Reporte de trazabilidad, Ranking de productos y resumen financiero sigan mostrando advertencias invalidas o utilidad inflada despues de corregir el costo de un producto.

Cambios backend:
- `OrderRepository::orderItemCostExpression()` y `orderItemUnitCostExpression()` ya no tratan `OrderItem.cost_total = 0` o `unit_cost = 0` como costo definitivo; usan el costo actual de `Product.cost` como respaldo cuando el costo historico de la linea esta vacio o en cero.
- `FinancialPeriodRepository::buildSnapshot()` usa la misma regla de costo efectivo para costo, utilidad bruta y margen del periodo.

Cambios frontend:
- Guardar, retirar, optimizar precio o cambiar publicacion de productos invalida los caches del panel admin, incluyendo `/api/admin/report`, dashboard, inventario y ranking.
- `PanelModals` dispara invalidacion del panel cuando `ProductEditorModal` actualiza productos, por lo que las incidencias de costo cero desaparecen tras guardar el costo y recargar datos.

Decisiones:
- V1 no reescribe historicos en `OrderItem`; el reporte calcula costo efectivo al vuelo para no mantener advertencias obsoletas cuando la ficha del producto ya tiene costo confiable.

Pendientes:
- Validar en produccion que al corregir el costo de un SKU vendido, desaparecen las incidencias "vendido sin costo" en trazabilidad/ranking y cambian utilidad/margen del periodo.

### 2026-05-23 - Utilidad Operativa Para Trazabilidad y Ranking

Objetivo: convertir Reporte de trazabilidad y Ranking de productos en herramientas diarias de decision usando ventas realizadas, productos, costos, inventario, lotes y compras existentes, sin migraciones ni rutas nuevas.

Cambios frontend:
- `reportingUtils.ts` agrega constructores compartidos para `TraceabilitySummary`, `TraceabilityIssue`, `ProductRankingDecisionRow` y cola "Que hacer ahora", reutilizados por UI y exportacion.
- Reporte de trazabilidad usa el `ReportPeriodSummary` activo de `/api/admin/report`, por lo que Dia/Mes/Historico cambian pedidos, productos, categorias, KPIs e incidencias.
- Nuevo `TraceabilityPanel` con KPIs de ventas auditadas, utilidad, margen, cobertura de datos, incidencias filtrables por severidad/tipo y acciones directas para ver pedido, abrir producto o registrar compra cuando falta costo.
- `SalesRankingPanel` cruza ventas con `inventoryIntelligence`, agrega contribucion, stock, cobertura, proveedor, compra sugerida, utilidad por unidad, prioridad, filtros, ordenamiento y exportacion directa desde la pestana.
- `useAdminDataLoader` carga productos e inteligencia de inventario tambien para `sales-ranking`; `reports` carga productos para acciones de trazabilidad.
- `reportExport.ts` amplia trazabilidad con hojas Resumen, Incidencias, Pedidos auditados, Productos auditados y Categorias; ranking exporta accion recomendada, prioridad, stock, cobertura, proveedor, compra sugerida, contribucion y hoja de acciones.

Decisiones:
- V1 calcula recomendaciones al vuelo y no modifica inventario, ordenes ni configuracion persistente.
- Las acciones de compra/edicion reutilizan el modal admin de producto/restock existente.
- Productos sin venta en la ventana de inventario entran como acciones de revision cuando tienen stock sin movimiento o sobrestock.

Pendientes:
- Validar manualmente en `/my-account` que Dia/Mes/Historico cambian trazabilidad/ranking y que las exportaciones abren correctamente en Excel con datos reales.

### 2026-05-23 - Centro Operativo de Inventario

Objetivo: convertir la pestana Inventario de `/my-account` en el centro principal de gestion y decision, dejando Reportes > Inventario como resumen ejecutivo coherente.

Cambios backend:
- `InventoryIntelligenceService` calcula `GET /api/admin/inventory/intelligence?window_days=30&target_days=30` con ventas realizadas (`completed`, `delivered`), stock actual, lotes FIFO abiertos, facturas de compra, costo ponderado, vencimientos, margen, proveedor y calidad de datos.
- `InventoryController::intelligence()` expone el endpoint admin y `public/index.php` registra la ruta.
- `BusinessIntelligenceService` usa el mismo payload para `inventoryValue`, `inventoryDeepDive` e `inventoryIntelligence`, evitando diferencias entre dashboard, reportes e inventario.
- Los umbrales de stock usan `reorderPoint`/`stockMin` y `stockMax`/`idealStock`; fallback minimo 5 y critico = mitad del minimo.

Cambios frontend:
- Nuevo tipo `InventoryIntelligence` y carga cacheada del endpoint desde `useAdminDataLoader.ts` para `inventory`, `reports` y `alerts`.
- `InventoryManagementPanel` agrega KPIs operativos, cola "Que hacer ahora", plan de compra por proveedor, filtros por accion/categoria/proveedor, exportacion CSV del plan y acciones rapidas de compra, ajuste, edicion, balance/lotes y factura.
- Reportes > Inventario ahora muestra resumen ejecutivo alimentado por `InventoryIntelligence`, CTAs hacia Inventario y listas de riesgo basadas en `status` calculado, no en umbrales fijos 2/5.
- `reportExport.ts` agrega hojas de plan de compra y acciones usando el mismo payload de inteligencia.

Decisiones:
- V1 no crea ordenes de compra, conteo fisico, barcode, multi-bodega ni ledger nuevo; reutiliza lotes FIFO, facturas de compra, ajustes y `PUT /api/products/{id}`.
- "Disponible" significa `Product.quantity`, porque el sistema descuenta stock al crear pedidos activos.
- Costo de inventario usa lotes abiertos cuando existen; fallback a `Product.cost`.

Pendientes:
- Validar manualmente con datos reales los escenarios de compra urgente, sobrestock, vencidos, compra/ajuste y coherencia de exportacion.

### 2026-05-18 - Optimizacion del Reporte de ventas

Objetivo: hacer que las listas y tarjetas inferiores del Reporte de ventas en `/my-account` respondan al toggle Dia/Mes/Historico y que cambiar entre vistas sea rapido.

Cambios backend:
- `OrderRepository::getReportPeriodSummary()` acepta `$selectedDate` y `$scope` para filtrar por dia, mes o historico.
- `DashboardController::report()` expone `GET /api/admin/report` como endpoint liviano que solo calcula el resumen del reporte.
- `public/index.php` registra `GET /api/admin/report`.
- `scripts/bootstrap_schema.php` agrega indice compuesto `Order_tenant_status_local_date_idx` para consultas por tenant/status/fecha local.

Cambios frontend:
- `MyAccountClient.tsx` usa `salesRankingView` como estado global del toggle para ordenes, rankings y categorias del reporte.
- Un efecto separado consulta `/api/admin/report?scope=...&date=...&period=...`, cancela peticiones previas con `AbortController` y mergea solo `businessMetrics.report`.
- `rankingCacheRef` conserva `productSalesRanking` entre toggles para evitar recalcular el ranking pesado.
- `useAdminDataLoader.ts` siempre carga el dashboard completo con `?period=YYYY-MM`; no depende de `salesRankingDate` ni `salesRankingView`.
- `useAdminDataLoader.ts` elimina `report` de la respuesta del dashboard antes de mergear para evitar que un refresh pasivo sobrescriba la vista daily/historical.
- `reportExport.ts` acepta vista `daily`.
- Tarjetas superiores del reporte se expandieron a `xl:grid-cols-10` con Ganancia bruta y Ganancia neta en color condicional.

Decisiones:
- Separar `/api/admin/report` del dashboard completo para que el toggle ejecute una consulta liviana y no el CTE pesado de `getProductSalesRanking`.
- Mantener `productSalesRanking` cacheado en ref; se refresca con cambio de mes o recarga manual, no con cada toggle.
- Mantener `period_key` como `YYYY-MM` incluso en vista diaria, porque `adjustmentSummary()` y `normalizePeriodKey()` esperan formato mensual.

Bugs corregidos:
- Race condition donde `/api/admin/dashboard/stats` sobrescribia `businessMetrics.report` con datos mensuales mientras el usuario estaba en vista diaria o historica.
- Error "Periodo financiero invalido" causado por pasar `YYYY-MM-DD` a logica que espera `YYYY-MM`.

Pendientes:
- Monitorear si el indice compuesto reduce el tiempo de `getProductSalesRanking`.
- Considerar cache similar para "Resumen y orden comercial" si se percibe lento.
