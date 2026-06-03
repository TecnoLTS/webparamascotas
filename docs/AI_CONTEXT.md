# ParamascotasEC - AGENTS.md

Fuente canonica de contexto IA para `/home/admincenter/contenedores`.
`MapaCompleto.md` es el mapa tecnico amplio; este archivo conserva reglas operativas, decisiones vigentes y avances importantes.

## Proposito del proyecto

ParamascotasEC es un workspace integrado para e-commerce de mascotas en Ecuador. Incluye frontend Next.js, backend PHP, base PostgreSQL, microservicio de facturacion electronica SRI y gateway Nginx/Certbot.

El objetivo operativo es mantener un entorno desplegable por scripts, con reglas de negocio server-side, seguridad admin estricta y contexto suficiente para que una IA o un desarrollador pueda continuar trabajo sin redescubrir decisiones recientes.

## Mantenimiento de contexto IA

- `AGENTS.md` en la raiz del workspace es la fuente canonica.
- La copia versionada vive en `paramascotasec/docs/AI_CONTEXT.md`; si hay conflicto, manda este archivo raiz.
- Al cerrar trabajo importante, actualizar primero `AGENTS.md` y luego sincronizar la copia versionada.
- Registrar avances en `Historial de trabajo IA` con fecha, objetivo, cambios, decisiones y pendientes. Consolidar entradas antiguas para evitar duplicados temporales.
- No guardar secretos, passwords, tokens reales, certificados, llaves `.p12` ni datos sensibles de clientes.
- La raiz `/home/admincenter/contenedores` no es repo Git; los componentes (`paramascotasec`, `paramascotasec-backend`, `Facturador`, `Gateway`, `paramascotasec-DB`) son repos separados.

## Contexto operativo actual

- Ambiente local por defecto: `development`; no asumir `production` salvo pedido explicito del usuario.
- IP LAN del sistema en este ambiente: `192.168.100.229`.
- El Gateway development puede exponerse por esa IP segun configuracion de `GATEWAY_BIND_IP`; usar scripts de development para cambios y verificaciones locales.

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
Development usa `.env.development`; production usa `.env`.
PostgreSQL major actual: 18. La DB principal usa `postgres18_data` y conserva `postgres16_data` para rollback; Facturador usa el volumen Docker `postgres18-data` y conserva `postgres-data` para rollback.

## Red

El workspace usa redes Docker segmentadas, creadas por los scripts. `edge` queda para entrada del Gateway; las comunicaciones internas usan redes `internal` y los contenedores con salida externa tienen redes de egreso dedicadas.

- `paramascotasec-web-internal`: Gateway, Frontend y Backend Web.
- `paramascotasec-db-internal`: Backend App y DB principal.
- `paramascotasec-services-internal`: Gateway, Backend App y Facturador Nginx (`facturador`).
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
| Gateway | Nginx stable 1.30 + Certbot | `nginx-gateway`, `certbot` |

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
- Acceso publico del facturador, cuando aplique, entra por Gateway bajo `/facturador/api/...` y reescribe a las rutas internas `/api/...`; paneles/admin no se publican por Gateway.
- SRI por entorno: desarrollo usa `pruebas` (`celcer.sri.gob.ec`) y produccion usa `produccion` (`cel.sri.gob.ec`).
- El correo del facturador puede venir de la configuracion de sucursal en DB; `billing-service` y `billing-recovery-worker` requieren egreso SMTP cuando haya sucursales con mail activo.
- Rutas por entorno: `FACTURADOR_API_INVOICES_PATH=/api/test/v1/invoices` en dev y `/api/production/v1/invoices` en prod.

## Gateway

- Fragil para SSL y perfiles: nunca levantar manualmente con `docker compose up`.
- Usar `./scripts/deploy-development.sh gateway` o `./scripts/deploy-production.sh gateway` desde la raiz del workspace.
- Dominios publicados: solo `paramascotasec.com` y `www.paramascotasec.com`; no usar subdominio `api` ni dominios de terceros.
- En desarrollo `GATEWAY_BIND_IP` debe apuntar a localhost/LAN; en produccion publica solo `80/443`.
- `certbot` corre solo en produccion via perfil `certbot`.
- Renovacion manual:

```bash
cd Gateway && ./scripts/renew-letsencrypt.sh
```

## Verificacion

```bash
scripts/check-paramascotas.sh    # frontend lint + typecheck + backend PHP syntax + backend health
scripts/check-env-secrets.sh all # preflight .env/secrets sin imprimir valores
scripts/check-container-connectivity.sh development
scripts/check-container-connectivity.sh production
```

`check-container-connectivity.sh` tambien valida que `/api/products` devuelva productos publicos. Un deploy dev/prod debe fallar si el catalogo publico queda vacio; en development solo se permite sembrar datasets demo con `SEED_DEVELOPMENT_CATALOG=1`, no por defecto. `check-container-connectivity.sh production` valida el runtime de produccion; no correrlo esperando exito mientras el workspace esta desplegado en development. Para cambios acotados, correr tambien checks del componente afectado cuando aplique.

## Reglas de negocio criticas

- Pricing siempre server-side: el cliente nunca debe enviar `discount`, `total`, `subtotal`, `vat_*`, `shipping`, `grand_total`, `price`, `unit_cost`, `cost_total` ni campos monetarios derivados. `OrderController` los rechaza como manipulacion.
- IVA default: 15% Ecuador. `tax_exempt` por producto; soporta carritos mixtos exentos/no exentos.
- Envio: gratis en Centro/Norte Quito; USD 5.00 para Sur/Valles. Se determina desde direccion via `GET /api/settings/shipping`.
- Descuentos: server-side; tipos porcentaje o fijo; soportan `min_subtotal`, `max_discount`, `max_uses`.
- Consumidor final: `9999999999999` solo se permite hasta USD 50.00 oficiales. Ventas mayores deben tener cedula o RUC valido del cliente; backend y Facturador bloquean el caso antes de emitir.
- Inventario FIFO: `inventory_lots` rastrea lotes de compra; ordenes consumen lotes antiguos primero; costos se restauran al cancelar.
- Sitio unico: solo `paramascotasec.com` y `www.paramascotasec.com`; `DEFAULT_TENANT=paramascotasec`; dominios ajenos deben quedar rechazados por el Gateway.

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
- Se limpio solo el alcance single-site dentro de la copia de development: se elimino la DB `tecnolts` y el registro `Tenant` no principal, dejando solo `paramascotasec`.
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
- Frontend deja de permitir `api.paramascotasec.com`; las APIs e imagenes de uploads quedan bajo el mismo sitio (`/api`, `paramascotasec.com`, `www.paramascotasec.com`).
- DB dev principal queda solo con base `paramascotasec` y `Tenant=paramascotasec`; se elimino la DB dev auxiliar vacia no usada.
- Facturador conserva solo cliente/sucursal principal activa; clientes/sucursales no principales quedaron inactivos, sin SMTP/certificados/logos y con API keys historicas revocadas para evitar egresos o accesos accidentales.
- `scripts/check-env-secrets.sh` ahora valida alcance single-site, tenant unico, ausencia de egresos/certificados en sucursales no principales y ausencia de API keys vigentes no principales.

Verificacion:
- `./deploy-development.sh` completo paso y luego se redeplego frontend dev para recargar `next.config.js`.
- `./scripts/check-container-connectivity.sh development` paso completo: puertos cerrados, redes internas, backend/facturador/DB/SMTP/SRI pruebas y rutas criticas OK.
- `./scripts/check-env-secrets.sh all` paso con 0 fallos y 0 advertencias para dev/prod.
- Gateway dev: `https://paramascotasec.com/` 200, `https://www.paramascotasec.com/` 301, `/healthz` 200, `/api/health` 200, `/facturador/health` 200; `tecnolts.com` queda cerrado (`000`/empty reply).
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
