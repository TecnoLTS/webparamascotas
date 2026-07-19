# Manual técnico integral de ParamascotasEC

- **Versión:** 2026-07-17
- **Workspace:** `/home/admincenter/contenedores`
- **Ambiente activo al redactar:** QA local
- **Objetivo:** permitir que una persona de soporte, desarrollo u operaciones entienda, opere, diagnostique y amplíe la plataforma sin redescubrir su arquitectura.

Este manual explica el sistema que está implementado. La fuente canónica de decisiones operativas es [`AGENTS.md`](AGENTS.md); el mapa técnico resumido es [`MapaCompleto.md`](MapaCompleto.md). Si un ejemplo de este manual entra en conflicto con `AGENTS.md` o con un control ejecutable del código, prevalecen estos últimos.

> Este documento no contiene contraseñas, API keys, llaves privadas, certificados `.p12` ni datos reales. Los valores entre `<...>` son marcadores que deben obtenerse por el canal seguro autorizado.

## Índice

1. [Reglas de seguridad antes de operar](#1-reglas-de-seguridad-antes-de-operar)
2. [Modelo mental y arquitectura](#2-modelo-mental-y-arquitectura)
3. [Repositorios, servicios y responsabilidades](#3-repositorios-servicios-y-responsabilidades)
4. [Cómo se comunica el ecosistema](#4-cómo-se-comunica-el-ecosistema)
5. [Servicios funcionales que presta](#5-servicios-funcionales-que-presta)
6. [Ambientes y configuración](#6-ambientes-y-configuración)
7. [Despliegue, parada y validación](#7-despliegue-parada-y-validación)
8. [Uso normal de la plataforma](#8-uso-normal-de-la-plataforma)
9. [Crear o modificar una API](#9-crear-o-modificar-una-api)
10. [Crear o evolucionar un módulo](#10-crear-o-evolucionar-un-módulo)
11. [Crear una pantalla en Dashboard](#11-crear-una-pantalla-en-dashboard)
12. [Crear una página en Next.js](#12-crear-una-página-en-nextjs)
13. [PostgreSQL y acceso seguro a datos](#13-postgresql-y-acceso-seguro-a-datos)
14. [Tenants: alta, aislamiento y ciclo de vida](#14-tenants-alta-aislamiento-y-ciclo-de-vida)
15. [Autenticación, autorización y protección](#15-autenticación-autorización-y-protección)
16. [Cifrado, secretos, TLS y almacenamiento](#16-cifrado-secretos-tls-y-almacenamiento)
17. [Workers e integraciones externas](#17-workers-e-integraciones-externas)
18. [Backups, restore y recuperación](#18-backups-restore-y-recuperación)
19. [Observabilidad, rendimiento y capacidad](#19-observabilidad-rendimiento-y-capacidad)
20. [Soporte y diagnóstico por síntoma](#20-soporte-y-diagnóstico-por-síntoma)
21. [Pruebas, entrega y rollback de cambios](#21-pruebas-entrega-y-rollback-de-cambios)
22. [Operación de producción y alta disponibilidad](#22-operación-de-producción-y-alta-disponibilidad)
23. [Gobierno técnico que también debe administrarse](#23-gobierno-técnico-que-también-debe-administrarse)
24. [Referencia rápida y glosario](#24-referencia-rápida-y-glosario)

## 1. Reglas de seguridad antes de operar

Estas reglas son obligatorias, incluso durante una emergencia:

1. **Nunca ejecutar `docker compose up` directamente.** El gateway, los perfiles, las redes, los certificados y los secretos se preparan mediante scripts. Use `./deploy.sh` o `./scripts/deploy.sh <servicio>` desde la raíz.
2. **Toda prueba funcional entra por APISIX.** Los puertos, nombres Docker y sidecars internos se usan solo para diagnóstico explícito. En QA, el contrato se valida con `https://paramascotasec.com` y, si hace falta, `curl --resolve`.
3. **No publicar PostgreSQL en el host.** El contenedor `basesdedatos` no expone `5432`; no se debe crear un túnel a la IP cambiante del contenedor.
4. **No transportar secretos en argumentos, historial, logs o variables improvisadas.** No usar `PGPASSWORD`, `docker exec -e`, `psql -v password=...`, URL con credenciales ni archivos `.pgpass` persistentes.
5. **No cambiar de QA a producción pasando un argumento a los scripts.** El ambiente lo definen los `.env` activos. Primero se revisa configuración, luego se despliega.
6. **No desactivar RLS para resolver un incidente.** Se corrige el contexto de tenant, el rol o la política; si la data quedó dañada, se restaura un backup validado.
7. **No editar manualmente APISIX como fuente de verdad.** Las rutas se derivan de los contratos del backend y de las plantillas de `gatewayapisix`; la consola sirve para inspección.
8. **No poner lógica de negocio ni credenciales en el frontend.** Precios, descuentos, impuestos, inventario, autorización y aislamiento son decisiones server-side.
9. **No guardar secretos reales en Git, documentación, tickets ni capturas.** Registrar solo el nombre lógico del secreto, su owner, fecha de rotación y evidencia de verificación.
10. **Antes de una mutación destructiva, tomar backup y definir rollback.** Un `--yes` no elimina la necesidad de una clave de backup ni convierte una operación en segura.

### 1.1 Operaciones que requieren autorización explícita

- Borrar contenedores, volúmenes o directorios de PostgreSQL.
- Restaurar una base sobre un ambiente existente.
- Rotar credenciales, llaves de cifrado o certificados.
- Cambiar DNS, dominios, SNI o publicación externa.
- Habilitar SRI de producción, migrar almacenamiento o retirar un tenant.
- Ejecutar seeds, reparaciones masivas o scripts históricos sobre datos reales.

### 1.2 Regla de oro de soporte

Primero preservar evidencia; luego diagnosticar; después cambiar una sola capa; finalmente verificar por el mismo contrato que usa el cliente. No reiniciar todo el stack como primera respuesta.

## 2. Modelo mental y arquitectura

La plataforma es **API-first, multi-tenant y modular**, aunque hoy varios dominios viven dentro de un único runtime PHP llamado `platform-core`.

![Arquitectura actual de ParamascotasEC](reports/arquitectura-actual-optimizada-paramascotasec-2026-07-17.svg)

Versión simplificada:

```text
Internet / navegador / integración externa
                     |
                     v
            APISIX Gateway :80/:443
             |        |         |
             |        |         +-- etcd + ACME/Certbot
             |        +------------ Angular Dashboard (shell)
             +--------------------- Next.js ecommerce
             |
             `-- APIs registradas --> backend-http --> PHP-FPM platform-core
                                                        |-- IdentityPlatform
                                                        |-- CatalogInventory
                                                        |-- Commerce
                                                        |-- Billing SRI
                                                        |-- ReportingFinance
                                                        |-- LoyaltyRewards
                                                        `-- Mailer
                                                               |
                                                               v
                                                     PostgreSQL compartido
                                                     |-- dashboard
                                                     |-- ecommerce
                                                     |-- facturacion
                                                     `-- loyalty

Workers pares: Billing/SRI | Commerce→Billing | Mailer | Google Wallet
```

### 2.1 Qué significa “API-first” aquí

- APISIX es la única entrada pública y solo publica contratos registrados.
- Dashboard y ecommerce no acceden directamente a PostgreSQL.
- Los contenedores se comunican por HTTP/API sobre redes internas y credenciales de alcance limitado.
- Los módulos que comparten proceso PHP usan puertos, adaptadores, DTO y eventos internos; no hacen HTTP loopback innecesario.
- Cada ruta backend declara método, path, handler y `capability`.
- Cada consumidor frontend usa un catálogo central, no URLs dispersas.
- Una API desconocida falla cerrada en el edge; no cae en el wildcard del Dashboard.

### 2.2 Qué significa “modular” aquí

El backend es un monolito modular desplegado como una unidad. Cada dominio tiene owner de datos y reglas, pero algunos comparten una base lógica por servicio. Un módulo puede evolucionar dentro de `platform-core` o extraerse más adelante a un runtime independiente sin cambiar de golpe su contrato público.

### 2.3 Qué significa “multi-tenant” aquí

El tenant se determina y verifica en varias capas:

```text
Host registrado
  -> ruta APISIX del tenant
  -> identidad/sesión o API key tenantizada
  -> entitlement y permiso
  -> TenantContext del backend
  -> app.tenant_id en la conexión SQL
  -> política PostgreSQL RLS/FORCE RLS
```

Ninguna capa por sí sola es suficiente. El menú oculto es experiencia de usuario; la autorización backend y RLS son la seguridad real.

### 2.4 Estado de calidad vigente

El receipt QA [`reports/architecture-scorecard-qa.json`](reports/architecture-scorecard-qa.json) registra `PASS`, 14/14 evidencias y seis dimensiones en 10/10. La carga sostenida y el restore aislado también tienen evidencia en `reports/`. Esto **no demuestra alta disponibilidad física externa**: el failover multinodo real permanece fuera de puntuación hasta ejecutarse en infraestructura independiente.

## 3. Repositorios, servicios y responsabilidades

La raíz no es un repositorio Git. Los proyectos runtime son repositorios separados; antes de preparar un commit se revisa el estado de cada uno.

| Carpeta | Tecnología | Responsabilidad | No debe hacer |
|---|---|---|---|
| `gatewayapisix` | APISIX 3.16, etcd 3.5, Certbot | TLS, hosts, rutas, rewrites, rate limit, headers y entrada pública | Guardar negocio o convertirse en fuente manual de contratos |
| `webparamascotas` | Next.js 16, React 19, Node 24 | Tienda, SEO, cuenta de cliente y consumo API ecommerce | Administrar tenants o llamar DB |
| `dashboard` | Angular + Nginx | Canal administrativo, navegación, permisos visibles y orquestación UI | Ser owner de pedidos, productos, clientes o facturas |
| `backend` | PHP 8.5 MVC modular, Nginx, PHP-FPM | APIs, autenticación, autorización y reglas de dominio | Exponer un bypass directo al edge o mezclar owners de datos |
| `basesdedatos` | PostgreSQL 18 | Persistencia por base lógica, roles, RLS, backup/restore | Publicarse en Internet o permitir FKs entre bases |
| `scripts` | Bash/PHP/Python | Deploy y verificaciones integrales | Sustituir los scripts canónicos con comandos manuales |
| `reports` | Evidencias | Receipts, scorecards, pruebas de carga y restore | Contener secretos o datos sensibles sin sanitizar |
| `infra/production-ha` | IaC y contratos HA | Diseño/provider-neutral para producción HA | Hacerse pasar por HA verificada sin infraestructura real |

### 3.1 Contenedores principales

| Contenedor | Función |
|---|---|
| `apisix-gateway` | Entrada pública HTTP/HTTPS y políticas edge |
| `apisix-etcd` | Configuración de APISIX; no es base de negocio |
| `apisix-acme-webroot` / `certbot` | Challenges y certificados |
| `webparamascotas` | Next.js ecommerce |
| Dashboard/Nginx | Shell Angular del canal administrativo |
| `backend-http` | Nginx interno delante de PHP-FPM |
| `backend-api` | PHP-FPM/API y egreso SMTP autorizado |
| `backend-sri-worker` | Recuperación fiscal SRI |
| workers Commerce/Mailer/Wallet | Procesos diferidos especializados |
| `basesdedatos` | Cluster PostgreSQL compartido |

Los nombres exactos de algunos contenedores Dashboard/workers pueden derivarse del Compose activo; para inventariarlos sin asumir nombres:

```bash
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
```

### 3.2 Redes

- `apisix-gateway-internal`: gateway, etcd y webroot ACME.
- `webparamascotas-internal`: APISIX, frontend y `backend-http`.
- `basesdedatos-internal`: API/workers autorizados y PostgreSQL.
- Redes de egreso dedicadas: solo para servicios que necesitan SRI, SMTP, Wallet u object storage.

No conectar un contenedor interno a `bridge` o a una red de egreso genérica como solución permanente.

### 3.3 Bases lógicas y owners

| Base | Owners principales | Tipo de información |
|---|---|---|
| `dashboard` | IdentityPlatform, Mailer | tenants, staff, roles, sesiones, permisos, entitlements, outbox de correo |
| `ecommerce` | CatalogInventory, Commerce, ReportingFinance | catálogo, inventario, clientes ecommerce, pedidos, cotizaciones y proyecciones |
| `facturacion` | Billing | emisores, compradores fiscales, comprobantes, XML/RIDE, eventos y configuración SRI |
| `loyalty` | LoyaltyRewards | programas, cuentas, ledger, premios, canjes, navegación y Wallet |

`postgres` es la base administrativa del cluster, no una quinta base de negocio. No se crean foreign keys entre bases lógicas; se intercambian IDs estables, snapshots o contratos API.

## 4. Cómo se comunica el ecosistema

### 4.1 Entrada pública

Los nombres concretos salen de `gatewayapisix/entorno/.env`; no se deben fijar en código.

| Canal | Contrato exterior |
|---|---|
| Ecommerce | `https://${PRIMARY_SITE_DOMAIN}/...` |
| API genérica tenantizada | `https://${PRIMARY_SITE_DOMAIN}/${PUBLIC_TENANT_SLUG}/${PUBLIC_API_SERVICE_SEGMENT}/...` |
| API especializada ecommerce | `https://${PRIMARY_SITE_DOMAIN}/${PUBLIC_TENANT_SLUG}/${PUBLIC_ECOMMERCE_SERVICE_SEGMENT}/...` |
| Dashboard Paramascotas | `https://${PRIMARY_SITE_DOMAIN}/${PUBLIC_DASHBOARD_SEGMENT}/...` y aliases primarios |
| Dashboard tenantizado | `https://{host-tenant}/...` |
| API Dashboard | `https://{host-dashboard}/${PUBLIC_DASHBOARD_SEGMENT}/api/...` |
| Billing salud | `.../{tenant}/${PUBLIC_BILLING_SERVICE_SEGMENT}/health` |
| Billing público | `.../{tenant}/${PUBLIC_BILLING_SERVICE_SEGMENT}/{test|production}/v1/...` |
| Loyalty salud | `https://{host-tenant}/{tenant}/${PUBLIC_LOYALTY_SERVICE_SEGMENT}/health` |
| Loyalty público | `https://{host-tenant}/{tenant}/${PUBLIC_LOYALTY_SERVICE_SEGMENT}/v1/...` |

En el QA actual, las comprobaciones funcionales usan:

```text
https://paramascotasec.com/
https://paramascotasec.com/dashboard/
https://www.paramascotasec.com/dashboard/
https://paramascotasec.com/paramascotasec/api/health
https://paramascotasec.com/paramascotasec/facturacion/health
https://fidepuntos.tecnolts.com/fidepuntos/fidelizacion/health
```

Las rutas legacy permanecen bloqueadas:

```text
/api/*
/facturador/*
/uploads-api/*
```

Una llamada funcional no se considera válida si solo funciona contra `localhost`, un puerto interno o `backend-http`. Debe funcionar por el contrato APISIX correspondiente.

### 4.2 Flujo de una petición Dashboard

```text
Navegador
 -> TLS/host/rate-limit en APISIX
 -> ruta Dashboard registrada por método + path
 -> credencial interna edge y headers confiables
 -> backend-http
 -> PHP-FPM
 -> TenantResolver + AuthSurface dashboard
 -> autenticación + CSRF si aplica
 -> TenantAccessService (entitlement + permiso)
 -> módulo owner
 -> conexión DB owner con app.tenant_id
 -> RLS
 -> respuesta JSON normalizada
```

El Dashboard Angular sirve el shell. Las APIs de negocio registradas van del gateway al backend; no atraviesan un proxy genérico del shell. La excepción explícita de upload conserva su adaptador y superficie de autenticación.

### 4.3 Flujo de una petición ecommerce

En navegador:

```text
Browser -> APISIX -> API tenantizada -> backend -> owner -> DB/RLS
```

En renderizado servidor:

```text
Next.js SSR -> backend-http:8080 -> backend
             usando STOREFRONT_BACKEND_PROXY_TOKEN
             y X-Auth-Surface confiable = ecommerce
```

El helper central decide si usa la base interna SSR o el contrato público. El código de página no construye la URL.

### 4.4 Comunicación interna del backend

- Dentro de `platform-core`: puertos de aplicación, adaptadores, DTO, repositorios y eventos.
- Entre contenedores: HTTP en redes internas, con timeouts y credenciales scoped.
- Procesos diferidos: outbox/worker con idempotencia, lease, reintentos y cola de fallos.
- Entre bases lógicas: ID estable, snapshot o API; nunca FK física nueva.
- Egresos: solamente desde la red/contenedor autorizado.

### 4.5 Credenciales por salto

| Credencial | Salto permitido |
|---|---|
| `EDGE_BACKEND_PROXY_TOKEN` | APISIX -> `backend-http` |
| `STOREFRONT_BACKEND_PROXY_TOKEN` | Next.js -> `backend-http` |
| `DASHBOARD_PROXY_TOKEN` | APISIX -> shell Dashboard |
| API key/Bearer Billing | Cliente externo -> API fiscal del tenant |
| API key/Bearer Loyalty | Cliente externo -> API loyalty del tenant |

No reutilizar una credencial entre saltos. APISIX no debe recibir el token Storefront y el navegador no debe conocer ninguno de los tokens internos.

### 4.6 Contrato de respuesta backend

Éxito:

```json
{
  "ok": true,
  "data": {},
  "meta": {}
}
```

Error:

```json
{
  "ok": false,
  "error": {
    "code": "CODIGO_ESTABLE",
    "message": "Mensaje apto para el consumidor",
    "details": {}
  }
}
```

Los códigos son contrato. No se debe hacer que una UI dependa de texto libre ni devolver trazas/SQL al cliente. En producción, los errores 5xx se registran internamente y se sanitizan.

## 5. Servicios funcionales que presta

### 5.1 IdentityPlatform

- Registro y resolución de tenants y dominios.
- Identidades `platform`, `tenant_staff` y `service`.
- Login, logout, sesión, MFA/OTP y recuperación.
- Roles, permisos, navegación y entitlements por módulo.
- Auditoría de acceso y revocación de sesiones.
- Ciclo de vida de tenant: alta, módulos, configuración, dominios, suspensión, reanudación, reconciliación, offboarding y rollback.

Los clientes finales ecommerce no son usuarios operativos del Dashboard. Viven en `ecommerce."Customer"` y tienen superficie de sesión separada.

### 5.2 CatalogInventory

- Catálogo público y administrativo.
- Productos, categorías, marcas, proveedores e imágenes.
- Variantes, referencias, lotes e inventario FIFO.
- Reseñas, compras y datos auxiliares del catálogo.
- Políticas fiscales y atributos publicables del producto.

### 5.3 Commerce

- Clientes ecommerce, direcciones y credenciales.
- Carrito/checkout, pedidos, POS, cotizaciones y descuentos.
- Configuración de envíos y estado de tienda.
- Cálculo server-side de precios, IVA, envío y totales.
- Outbox hacia Billing para desacoplar pedido y comprobante.

Reglas críticas actuales: IVA por defecto 15 %, consumidor final `9999999999999` solo hasta USD 50, envío según zona, descuentos server-side e inventario FIFO.

### 5.4 Billing SRI

- Emisión de comprobantes electrónicos.
- XML, firma XAdES-BES, envío/consulta SRI y RIDE PDF.
- Ambientes SRI de pruebas y producción.
- API fiscal externa con API key/Bearer.
- Sucursales, certificados, configuración, correo y recuperación.
- Eventos `invoice.emitted`, `invoice.authorized` e `invoice.rejected`.

Billing vive dentro de `platform-core`; no existe un servicio `facturador` desplegable en paralelo.

### 5.5 ReportingFinance

- Reportes comerciales y financieros.
- Gastos, períodos, rentabilidad y proyecciones.
- Inteligencia de inventario y paneles operativos.

Las proyecciones no cambian el owner de los datos: pedidos siguen en Commerce, catálogo en CatalogInventory y facturas en Billing.

### 5.6 LoyaltyRewards

- Programas, partners, cuentas y ledger de puntos.
- Premios, stock, reservas, canjes y solicitudes administradas.
- API externa tenantizada y control de idempotencia/rate limit.
- Catálogo de navegación versionado para Fidepuntos.
- Portal temporal y Google Wallet sin exponer tokens de cliente.

Los modos de premio actuales son `staff_only`, `in_store` y `managed`. Toda reserva debe devolver puntos y stock al expirar/cancelarse.

### 5.7 Mailer

- Contacto y outbox de correo.
- Auditoría de entregas y salud operativa.
- Transporte SMTP desde el worker autorizado.

`email-service` no es aún un producto tenant activo con runtime propio; Mailer es una frontera técnica de `platform-core`.

### 5.8 Canales frontend

- **Next.js ecommerce:** navegación pública, SEO, catálogo, compra y cuenta de cliente.
- **Angular Dashboard:** administración de plataforma/tenant, operación de ecommerce, facturación y loyalty según módulos y permisos.

Los canales están separados por host, cookies, CSRF, `X-Auth-Surface`, permisos y tokens internos. `/login` y `/my-account` del host principal pertenecen al cliente ecommerce, no al administrador.

## 6. Ambientes y configuración

### 6.1 Fuentes de ambiente

| Componente | Archivo activo | Selector principal |
|---|---|---|
| Backend | `backend/entorno/.env` | `ENTORNO_MODE=qa|production` |
| Frontend | `webparamascotas/entorno/.env` | `ENTORNO_MODE=qa|production` |
| Gateway | `gatewayapisix/entorno/.env` | `ENTORNO_MODE=qa|production` |
| DB | `basesdedatos/entorno/.env` | `ENTORNO_MODE=qa|production` |
| Dashboard | `dashboard/.env` | `APP_ENV=qa|production` |

Use los `.env.example` como catálogo de nombres. Nunca copie valores reales a documentación ni edite los archivos Angular generados a mano.

Dashboard genera `environment.*.ts` mediante:

```bash
cd /home/admincenter/contenedores/dashboard
npm run env:sync
npm run env:print
```

### 6.2 QA

- Dominio local: `paramascotasec.com` hacia `192.168.100.229` en el entorno actual.
- SRI siempre apunta a pruebas, incluso si la base fue restaurada desde producción.
- TLS usa CA local de `gatewayapisix/entorno/certs/local-ca.crt`.
- El frontend desplegado usa runtime estable; HMR es solo herramienta local.
- Datos demo solo con `SEED_QA_CATALOG=1` explícito.

Si el cliente no resuelve DNS:

```bash
curl --resolve paramascotasec.com:443:192.168.100.229 \
  --cacert gatewayapisix/entorno/certs/local-ca.crt \
  https://paramascotasec.com/paramascotasec/api/health
```

Solo se distribuye `local-ca.crt`. Nunca `local-ca.key` ni la llave privada del servidor.

### 6.3 Producción

- Publica únicamente los puertos 80/443 del gateway.
- Usa DNS real, certificados ACME/Let's Encrypt y validación externa.
- SRI de producción se habilita solo con configuración explícita y guardrails aprobados.
- Requiere object storage/CDN y secretos mediante mecanismo de producción.
- La política HA exige infraestructura externa real; un Compose en un solo host no equivale a HA.

### 6.4 Preflight de configuración

Antes de desplegar:

```bash
cd /home/admincenter/contenedores
./scripts/check-env-secrets.sh all
./scripts/check-runtime-secret-boundaries.sh
```

Para inspeccionar modo sin imprimir secretos, use los scripts de ambiente o los comandos `env:print` provistos; no haga `cat` masivo de `.env` en una sesión compartida.

## 7. Despliegue, parada y validación

### 7.1 Despliegue completo

```bash
cd /home/admincenter/contenedores
./deploy.sh
```

Orden canónico:

```text
DB -> Backend -> Frontend -> Dashboard -> Gateway
```

### 7.2 Despliegue por componente

```bash
cd /home/admincenter/contenedores
./scripts/deploy.sh db
./scripts/deploy.sh backend
./scripts/deploy.sh frontend
./scripts/deploy.sh dashboard
./scripts/deploy.sh gateway
```

Si hay esquema nuevo o DB vacía:

```bash
RUN_DB_SETUP=1 ./scripts/deploy.sh backend
```

En QA vacío y solo si se desea dataset demo:

```bash
RUN_DB_SETUP=1 SEED_QA_CATALOG=1 ./scripts/deploy.sh backend
```

Servicios válidos: `db`, `backend`, `frontend`, `dashboard`, `gateway`. `billing` y `facturador` no son servicios válidos.

### 7.3 Desarrollo local con recarga

```bash
cd /home/admincenter/contenedores/webparamascotas/app
npm run dev

cd /home/admincenter/contenedores/dashboard
npm start
```

Estos procesos son para UI local. No sustituyen el deploy estable ni sirven como evidencia de QA.

### 7.4 Verificación posterior

```bash
cd /home/admincenter/contenedores
./scripts/check-env-secrets.sh all
./scripts/check-container-connectivity.sh qa
./scripts/check-paramascotas.sh
```

Para un release QA completo:

```bash
./scripts/e2e-qa.sh
```

No ejecutar `check-container-connectivity.sh production` mientras el workspace está en QA.

### 7.5 Parada y mantenimiento

La parada debe pasar por los scripts del componente o por el procedimiento de backup/restore. No improvise `docker compose down` desde subproyectos porque puede seleccionar perfiles/volúmenes incorrectos.

La tarea semanal segura de secretos es solo auditoría:

```bash
./scripts/rotate-owned-secrets.sh audit
```

No rota ni despliega. La rotación DB de aplicación es manual:

```bash
./scripts/rotate-owned-secrets.sh rotate-db-app --confirm
```

## 8. Uso normal de la plataforma

### 8.1 Como cliente ecommerce

1. Ingresar por el dominio principal.
2. Navegar catálogo y detalle de producto.
3. Registrarse/iniciar sesión por la superficie ecommerce.
4. Mantener direcciones y perfil en `/my-account`.
5. Crear pedido; el backend recalcula todos los valores monetarios.
6. Consultar estado/historial sin usar credenciales del Dashboard.

### 8.2 Como operador de tenant

1. Ingresar por el host Dashboard autorizado para el tenant.
2. Completar login y MFA cuando corresponda.
3. El backend devuelve `/api/tenant/context` con tenant, módulos y permisos.
4. El Dashboard construye menú y rutas solo para esos grants.
5. Las operaciones vuelven a verificarse en backend y RLS.

Un operador no debe cambiar manualmente `tenant_id`, módulos o permisos desde DevTools. El backend ignora/rechaza el contexto no confiable.

### 8.3 Como superadministrador de plataforma

La identidad `platform` con `tenant_id=platform` administra tenants, módulos y ciclo de vida. Puede entrar por un dominio tenant para soporte autorizado, pero no se convierte en staff del tenant ni debe aparecer en `/api/users` de ese tenant.

### 8.4 Como integración externa

1. Obtener una credencial tenant-scoped por canal seguro.
2. Usar exclusivamente la ruta versionada de APISIX.
3. Enviar `X-API-Key` o `Authorization: Bearer` según el contrato.
4. Incluir `Idempotency-Key` donde el endpoint lo exija.
5. Respetar rate limits, timeouts, códigos de error y reintentos con backoff.
6. No acceder a hosts internos, DB o Admin API de APISIX.

### 8.5 Mapa de accesos y administración QA

Este inventario corresponde al QA vigente. Los dominios y segmentos siempre se confirman en `gatewayapisix/entorno/.env`; no deben convertirse en constantes de código.

Si el DNS del equipo de soporte no apunta al QA, configure DNS dividido o una entrada local hacia `192.168.100.229` para `paramascotasec.com`, `www.paramascotasec.com` y `fidepuntos.tecnolts.com`, e instale únicamente `gatewayapisix/entorno/certs/local-ca.crt`. Nunca distribuya `local-ca.key`. `admin.paramascotasec.com` no es requisito para acceder al Dashboard Paramascotas en QA.

#### Accesos web funcionales

| Área | URL QA | Uso y restricción |
|---|---|---|
| Ecommerce | `https://paramascotasec.com/` | Canal de clientes finales |
| Dashboard de plataforma | `https://paramascotasec.com/dashboard/` o `https://www.paramascotasec.com/dashboard/` | Entrada canónica de administración Paramascotas |
| Login plataforma | `https://paramascotasec.com/dashboard/sign-in` o `https://www.paramascotasec.com/dashboard/sign-in` | Identidades `platform` o staff autorizado |
| Dashboard Fidepuntos | `https://fidepuntos.tecnolts.com/dashboard/` | Operación del tenant `fidepuntos` |
| Login Fidepuntos | `https://fidepuntos.tecnolts.com/dashboard/sign-in` | Staff del tenant; menú podado por grants |
| Tenants | `https://paramascotasec.com/dashboard/tenant-admin` | Alta, módulos, dominios, lifecycle y reconciliación; exige `platform-admin` |
| Acceso global | `https://paramascotasec.com/dashboard/platform-access` | Inventario actual de identidades platform; pantalla de solo lectura |
| Topología | `https://paramascotasec.com/dashboard/module-topology` | Vista informativa de runtimes, owners, bases y dependencias |
| Catálogo API | `https://paramascotasec.com/dashboard/api-catalog` | Inventario/auditoría; un draft local no publica una API |
| Usuarios | `https://{host-dashboard}/dashboard/access/users` | Staff, invitaciones, estado, roles y sesiones según permisos |
| Roles | `https://{host-dashboard}/dashboard/access/roles` | Roles, permisos y grants de navegación/acciones |
| Seguridad propia | `https://{host-dashboard}/dashboard/account/security` | Contraseña y revocación de sesiones propias |
| Alertas del negocio | `https://paramascotasec.com/dashboard/paramascotas-panel/monitoring/alerts` | Riesgos comerciales, catálogo, ventas e inventario; no infraestructura |
| Política de sesiones | `https://paramascotasec.com/dashboard/paramascotas-panel/monitoring/security-settings` | Configuración funcional de sesiones; no configura APISIX/TLS/WAF |

Las pantallas privadas pueden devolver `permission-denied` o no aparecer en el menú. Conocer la URL no concede acceso: sesión, tenant, entitlement y permiso se validan de nuevo en backend.

Facturación se opera en el Dashboard de plataforma bajo `/dashboard/`:

```text
invoice-list              facturas, XML y RIDE
billing-services          emisión
billing-status            consulta SRI
billing-products          productos fiscales
billing-clients           receptores fiscales
billing-configuration     configuración fiscal
```

Loyalty se opera en el host del tenant bajo `/dashboard/loyalty-points`, con subrutas `customers`, `rewards`, `redemptions`, `register-purchase`, `notifications`, `settings`, `rules` y `reports`.

#### APIs y salud expuestas por APISIX

| Contrato | URL base/health QA |
|---|---|
| Gateway/front health | `https://paramascotasec.com/healthz` |
| Core API | `https://paramascotasec.com/paramascotasec/api/` |
| Core health | `https://paramascotasec.com/paramascotasec/api/health` |
| Core liveness | `https://paramascotasec.com/paramascotasec/api/livez` |
| Core readiness | `https://paramascotasec.com/paramascotasec/api/readyz` |
| Ecommerce API | `https://paramascotasec.com/paramascotasec/webparamascotas/` |
| Billing health | `https://paramascotasec.com/paramascotasec/facturacion/health` |
| Billing test v1 | `https://paramascotasec.com/paramascotasec/facturacion/test/v1/` |
| Loyalty Fidepuntos health | `https://fidepuntos.tecnolts.com/fidepuntos/fidelizacion/health` |
| Loyalty Fidepuntos v1 | `https://fidepuntos.tecnolts.com/fidepuntos/fidelizacion/v1/` |

El catálogo Angular no administra el gateway vivo. Una API se modifica en el registro owner PHP y, cuando requiere exposición especializada, en `gatewayapisix/scripts/sync-apisix.sh`; se aplica con `./scripts/deploy.sh gateway`. No cree recursos managed manualmente en la UI porque la siguiente sincronización puede reemplazarlos.

#### Consolas y canales de infraestructura

| Sistema | Acceso | Regla operativa |
|---|---|---|
| APISIX UI | `http://127.0.0.1:9180/ui/` | Solo localhost, para inspección |
| APISIX Admin API | `http://127.0.0.1:9180/apisix/admin/...` | Solo localhost y Admin Key; usar scripts canónicos |
| Dashboard diagnóstico | `http://127.0.0.1:8081/` y `/health` | Solo host, diagnóstico; no sustituye APISIX |
| PostgreSQL | `db:5432` | Solo red Docker; no hay pgAdmin/Adminer ni puerto host |
| Backend HTTP | `http://backend-http:8080/api` | Solo redes Docker; diagnóstico interno |
| Next.js | `http://webparamascotas:3000` | Solo red Docker |
| Dashboard Angular | `http://dashboard:80` | Solo red Docker |
| etcd | `http://apisix-etcd:2379` | Solo red Docker, sin UI; no editar a mano |
| Workers | Sin URL/UI | Healthchecks, métricas propias y logs Docker |

Para consultar la UI de APISIX desde una estación autorizada, mantenga el bind local y use un túnel SSH:

```bash
ssh -N \
  -o ExitOnForwardFailure=yes \
  -o ServerAliveInterval=30 \
  -L 127.0.0.1:19180:127.0.0.1:9180 \
  USUARIO_SSH@192.168.100.229
```

La terminal queda abierta sin prompt mientras el túnel funciona. Después abra `http://127.0.0.1:19180/ui/`; usar `19180` evita confundirlo con otro proceso local. En Windows puede comprobarlo con `curl.exe -I http://127.0.0.1:19180/ui/`: se espera `200 OK` y `Server: openresty`. Detenga el túnel con `Ctrl+C`. No publique el puerto remoto `9180` en LAN o Internet y no copie la Admin Key al navegador de un tercero.

PostgreSQL no se administra mediante URL. Use primero APIs o scripts de diagnóstico; para una consulta DBA aplique la receta read-only y transporte seguro de la sección 13.4. No use `PGPASSWORD`, URI con contraseña, `docker inspect` ni un `docker exec ... psql` improvisado.

#### Monitoreo actual

Este QA no tiene desplegados Grafana, Prometheus, Loki, OpenTelemetry Collector, pgAdmin, Adminer ni Portainer. El IaC de producción define observabilidad externa, pero no equivale a un runtime activo en este host.

La operación QA usa:

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
docker logs --since 15m CONTENEDOR
./scripts/check-container-connectivity.sh qa
./scripts/check-paramascotas.sh

RESOLVE_IP=192.168.100.229 \
  ./backend/scripts/collect_runtime_metrics.sh

./backend/scripts/check_runtime_slo.sh --preflight
```

La ruta Dashboard de alertas es monitoreo de negocio, no una consola de CPU, memoria, APISIX o PostgreSQL. Para producción se debe aprovisionar y verificar el stack externo descrito en `infra/production-ha`; no se debe inventar una URL Grafana hasta que exista el runtime.

## 9. Crear o modificar una API

Una API no está terminada cuando responde desde PHP. Debe quedar alineada en backend, autorización, contrato semántico, catálogo consumidor, gateway, pruebas y operación.

### 9.1 Ficha de diseño obligatoria

Antes de programar, defina:

| Decisión | Pregunta mínima |
|---|---|
| Owner | ¿Qué módulo es dueño de la regla y de la escritura? |
| Consumidor | ¿Dashboard, ecommerce, integración externa o proceso interno? |
| Exposición | ¿Anónima, sesión ecommerce, sesión admin, API key, Bearer o interna? |
| Tenant | ¿Global, tenant u opcional? ¿De dónde sale el tenant confiable? |
| Permiso | ¿Qué `module.action` exacto autoriza cada método? |
| Contrato | Request, response, errores, paginación, filtros, versión y límites |
| Idempotencia | ¿La mutación puede repetirse por timeout? |
| Datos | Base owner, tablas, RLS, retención y auditoría |
| Efectos | Correo, SRI, Wallet, storage, outbox o transacción |
| Operación | Health, logs, métricas, SLO, runbook y rollback |

No diseñe una API alrededor de una pantalla concreta. Diseñe una capacidad de dominio estable y deje que las UIs la consuman.

### 9.2 Crear la ruta en el módulo owner

Registros vigentes:

```text
backend/src/Modules/IdentityPlatform/routes.php
backend/src/Modules/CatalogInventory/routes.php
backend/src/Modules/Commerce/routes.php
backend/src/Modules/Billing/routes.php
backend/src/Modules/ReportingFinance/routes.php
backend/src/Modules/Mailer/routes.php
backend/src/Modules/LoyaltyRewards/routes.php
```

`backend/config/routes.php` solo agrega estos archivos; no debe volver a crecer como lista plana.

Formato exacto:

```php
[
    'method' => 'GET',
    'path' => '/api/widgets/{id}',
    'handler' => 'App\\Modules\\CatalogInventory\\Controllers\\WidgetController@show',
    'capability' => 'catalog.widgets.read',
],
```

Reglas verificadas:

- Métodos: `GET`, `HEAD`, `POST`, `PUT`, `PATCH`, `DELETE`.
- El path empieza con `/` y no incluye query string ni fragmento.
- Cada placeholder `{id}` es único.
- El handler es público, concreto y vive en el bounded context owner.
- La capability usa minúsculas y puntos.
- `method + path` no se repite.
- Conservar el orden textual `method`, `path`, `handler`, `capability`: el parser actual de APISIX depende de la estructura textual esperada.

### 9.3 Implementar por capas

Estructura recomendada:

```text
backend/src/Modules/<Owner>/
|-- Domain/             # invariantes, value objects, eventos
|-- Application/        # casos de uso y puertos
|-- Infrastructure/     # PostgreSQL, HTTP, SMTP, storage
|-- Controllers/        # traducción HTTP; delgados
|-- Tests/
`-- routes.php
```

Un controller debe:

1. Leer y validar input HTTP.
2. Invocar un caso de uso o puerto.
3. Traducir resultado a `Response::json(...)`.
4. Traducir fallos esperados a códigos HTTP y `error.code` estables.
5. No contener SQL, cálculo comercial complejo ni secretos.

Ejemplo mínimo de forma, no de dominio:

```php
<?php

namespace App\Modules\CatalogInventory\Controllers;

use App\Core\Response;

final class WidgetController
{
    public function show(string $id): void
    {
        // Validar $id, invocar el caso de uso y obtener el DTO.
        $dto = ['id' => $id];
        Response::json($dto);
    }
}
```

Use statements preparados reales y la conexión del owner mediante `ConnectionRegistry`; no cree una conexión global ni reciba `tenant_id` del payload como autoridad.

### 9.4 Registrar autorización real

La clave `capability` permite inventariar y clasificar, pero **no crea por sí sola un permiso de negocio**. Revise en conjunto:

- `backend/public/index.php`: público/anónimo, sesión, admin, CSRF y superficie.
- `backend/src/Modules/IdentityPlatform/Application/TenantAccessService.php`: `routeAccessDecision(...)` y permiso por método/ruta.
- El catálogo de permisos/navegación del tenant owner.
- Las pruebas de acceso permitido, sin módulo, sin permiso y cross-tenant.

El fallback actual de una capability no mapeada puede requerir autenticación general sin exigir un permiso granular. Por eso toda API protegida nueva debe añadir una decisión explícita y una prueba negativa; no se acepta “tiene capability” como evidencia suficiente.

Para una mutación con sesión/cookie:

- Exigir CSRF.
- Verificar `Origin`/`Referer` y superficie.
- Rechazar campos derivados o sensibles que el cliente no debe decidir.
- Usar idempotencia si repetir la llamada puede duplicar efectos.

### 9.5 Registrar el contrato maestro de capabilities

La capability debe existir en el archivo de dominio apropiado:

```text
webparamascotas/docs/capabilities/admin.json
webparamascotas/docs/capabilities/billing-mail-system.json
webparamascotas/docs/capabilities/catalog.json
webparamascotas/docs/capabilities/content-seo.json
webparamascotas/docs/capabilities/users-orders.json
```

Registre resumen, auth, exposición de gateway, consumidores, efectos externos, datos y evidencia E2E. Una mutación con estado necesita fixture, comprobación de DB y cleanup controlado.

Después regenere deliberadamente:

```bash
cd /home/admincenter/contenedores/webparamascotas/app
npm run capabilities:generate
npm run capabilities:check
npm run api:contracts:check
```

Archivos generados:

```text
webparamascotas/docs/system-capabilities.generated.json
webparamascotas/app/src/generated/systemCapabilities.ts
```

No edite esos generados a mano.

### 9.6 Añadir esquema OpenAPI semántico

`/openapi.json` se genera desde las rutas. Las APIs públicas, externas y mutaciones críticas también deben tener request/response semánticos en:

```text
backend/src/Support/ModuleOpenApiSchemaCatalog.php
```

La construcción y clasificación viven en:

```text
backend/src/Support/ModuleOpenApiDocument.php
```

Validación:

```bash
cd /home/admincenter/contenedores
php backend/scripts/check_modular_routes.php
php backend/scripts/check_openapi_contract.php
php backend/scripts/check_openapi_contract.php --self-test
```

OpenAPI es interno, no un endpoint público APISIX:

```bash
docker exec backend-http \
  wget -qO- http://127.0.0.1:8080/openapi.json | jq
```

El documento incluye extensiones como `x-capability`, `x-route-source`, `x-internal-path`, `x-exposure`, `x-auth-surface` y `x-security-policy`.

### 9.7 Registrar la API en Dashboard

Si Angular la consume, edite:

```text
dashboard/src/app/core/modules/dashboard-api.config.ts
```

1. Añada backend lógico a `DASHBOARD_API_BACKENDS` solo si realmente es un origen nuevo.
2. Añada el endpoint a `DASHBOARD_MODULE_API_ENDPOINTS_BY_MODULE` dentro de su módulo.
3. Añada/reutilice un alias estable en `DASHBOARD_API_ENDPOINT_KEYS`.
4. Declare método, path relativo, descripción, auth, tenant scope, owner y permiso.

Patrón:

```ts
{
  key: 'ecommerce.widgets.detail',
  backend: 'webparamascotas-api',
  method: 'GET',
  path: 'admin/widgets/:widgetId',
  description: 'Detalle administrativo del widget.',
  authType: 'cookie-session',
  tenantScope: 'tenant',
  owner: 'CatalogInventory',
  permissionAccess: 'read'
}
```

El servicio consume el alias:

```ts
this.api.get(
  this.apiCatalog.url(DASHBOARD_API_ENDPOINT_KEYS.ecommerce.widgetDetail, { widgetId })
);
```

`url(...)` es para la llamada Dashboard; `publicUrl(...)` sirve para mostrar/auditar el contrato exterior. La pantalla `/api-catalog` y sus drafts locales no activan APIs reales.

Verifique:

```bash
node dashboard/tools/check-dashboard-api-contracts.mjs
```

### 9.8 Registrar consumo en Next.js

Todo path backend del ecommerce se centraliza en:

```text
webparamascotas/app/src/lib/api/endpoints.ts
```

Use `buildApiRoute(...)` respaldado por la capability generada. Cree una función tipada por dominio bajo `src/lib/api/` y use los helpers de transporte existentes. No agregue literales `/api/...`, `/quote` o URLs de backend en pages/components.

### 9.9 Exposición APISIX

El deploy del gateway lee los registros PHP y crea rutas administradas. Para una API normal registrada:

```bash
cd /home/admincenter/contenedores
./scripts/deploy.sh gateway
```

No cree la ruta en la UI. Inspección local:

```text
http://127.0.0.1:9180/ui/
```

Una API externa nueva requiere además un contrato dedicado en `gatewayapisix/scripts/sync-apisix.sh`, equivalente a Billing/Loyalty:

- path versionado y tenantizado;
- métodos y rewrite interno explícitos;
- API key/Bearer y validación backend;
- 401 sin credencial, 404/405 fail-closed;
- CORS mínimo necesario;
- rate limit por perfil;
- labels de tenant, owner, capability, exposición y auth;
- health separado de readiness profunda;
- test de tenant equivocado y path incompleto.

APISIX comprueba presencia/formato básico de API key/Bearer; el backend valida hash, tenant, scopes, revocación y uso.

### 9.10 Versionado y compatibilidad

- Versione el path exterior cuando el cambio sea incompatible (`/v1`, `/v2`).
- Los cambios aditivos conservan campos y semántica anteriores.
- No reutilice un campo con significado diferente.
- Defina fecha de deprecación, consumidores, telemetría de uso y plan de retiro.
- Mantenga ambos contratos durante la ventana acordada.
- Documente migración y rollback antes de cortar el anterior.

### 9.11 Checklist final de API

```bash
cd /home/admincenter/contenedores

php backend/scripts/check_modular_routes.php
php backend/scripts/check_openapi_contract.php
node dashboard/tools/check-dashboard-api-contracts.mjs

cd webparamascotas/app
npm run capabilities:check
npm run api:contracts:check

cd /home/admincenter/contenedores
./scripts/check-paramascotas.sh
./scripts/deploy.sh backend
./scripts/deploy.sh frontend     # si cambió Next.js/capabilities
./scripts/deploy.sh dashboard    # si cambió Angular
./scripts/deploy.sh gateway
./scripts/check-container-connectivity.sh qa
```

Además pruebe al menos: feliz, input inválido, sin autenticación, sin permiso, sin módulo, CSRF incorrecto, tenant equivocado, duplicado/idempotencia, rate limit y rollback del efecto externo.

## 10. Crear o evolucionar un módulo

### 10.1 Decidir antes de crear

| Situación | Decisión |
|---|---|
| Nueva pantalla/regla de un dominio existente | Ampliar el módulo owner actual |
| Nueva capacidad con lifecycle, storage o integración propia | Crear módulo/runtime nuevo |
| Dominio de `platform-core` que necesita independencia | Extraer gradualmente conservando contrato |
| Cambio solo visual/navegación | Resolver en Dashboard; no mover ownership |
| Idea sin owner/runtime real | Mantener `planned`; no vender ni habilitar |

Responder antes de empezar:

1. ¿Quién es owner del dato y escritura?
2. ¿Qué API ofrece?
3. ¿Qué base/storage controla?
4. ¿Qué permisos necesita?
5. ¿Cómo corre individualmente?
6. ¿Cómo lo orquesta Dashboard?
7. ¿Cómo se migra, observa, respalda y revierte?

La guía canónica de decisión es [`dashboard/docs/MODULE-EVOLUTION-PLAYBOOK.md`](dashboard/docs/MODULE-EVOLUTION-PLAYBOOK.md).

### 10.2 Crear un módulo dentro de `platform-core`

1. Crear el árbol `backend/src/Modules/<Modulo>/` con `Domain`, `Application`, `Infrastructure`, `Controllers`, `Tests` y `routes.php`.
2. Definir una clase Domain con `KEY`, `STORE_KEY` y, si aplica, clave de producto público.
3. Diseñar puertos de aplicación; no importar repositorios de otro módulo.
4. Implementar adapters de infraestructura y DTO explícitos.
5. Registrar rutas en el `routes.php` owner.
6. Agregar el registro al agregador `backend/config/routes.php` si es un módulo nuevo.
7. Mapear la base en `backend/config/module-databases.php`.
8. Agregar bootstrap/migraciones, ownership, grants y RLS.
9. Agregar la decisión de acceso/capabilities y pruebas negativas.
10. Agregar schemas OpenAPI, manifests y catálogo de capabilities.
11. Proyectarlo en Dashboard solo si es visible/contratable.
12. Agregar health, logs, métricas, backup/restore y runbook.

Si comparte un owner lógico, use una de las cuatro bases actuales. No cree una base solo porque el namespace es nuevo.

### 10.3 Crear una base lógica nueva

Solo aplica cuando el módulo tiene frontera real de ownership, lifecycle y recuperación.

1. Registrar dominio, alias y `target_database` en `backend/config/module-databases.php`.
2. Añadir `moduleKey`, `databaseName` y contrato runtime en `basesdedatos/config/module-databases.json`.
3. Añadir `DB_DATABASE_<MODULO>` y roles dedicados a templates, Compose y validaciones.
4. Crear migraciones/bootstrap propios.
5. Definir roles app/worker/owner/admin y políticas RLS.
6. Añadir la base gestionada al contrato de backup/restore mediante el registro JSON.
7. Desplegar canónicamente:

```bash
cd /home/admincenter/contenedores
./scripts/deploy.sh db
RUN_DB_SETUP=1 ./scripts/deploy.sh backend
```

8. Validar DB mapping, RLS y restore aislado.

### 10.4 Crear un runtime independiente

Contrato mínimo:

- repo/carpeta y deploy propios;
- contenedor no root y redes mínimas;
- `GET /health` barato y `readyz` con dependencias;
- `GET /module.json` versionado;
- OpenAPI/contrato HTTP;
- base o storage owner;
- migraciones, backup y restore propios;
- permisos/capabilities;
- métricas, logs y request ID;
- timeouts, idempotencia y política de reintentos;
- modo individual y modo orquestado;
- rollback y compatibilidad de versión.

Registros a actualizar si Dashboard lo proyecta:

```text
dashboard/public/module-registry.json
dashboard/public/system-runtime-topology.json
dashboard/public/tenant-module-topology.json
dashboard/src/app/core/tenant/tenant-module-catalog.ts
dashboard/src/app/core/modules/dashboard-api.config.ts
```

Mientras el runtime no exista y no pase su contrato, use `planned-runtime`; no publique rutas ni entitlements activos.

### 10.5 Extraer un dominio de `platform-core`

1. Congelar el bounded context exacto.
2. Crear runtime y store destino.
3. Mantener un contrato API compatible.
4. Preparar migración/replicación con reconciliación verificable.
5. Publicar `module.json` nuevo.
6. Cambiar topología a `extract-to-target` durante transición.
7. Cortar escrituras duplicadas solo después de comprobar lectura, permisos, observabilidad y rollback.
8. Retirar adapters legacy y cambiar a `expand-owner-runtime` cuando el owner nuevo sea definitivo.

No hay extracción completa si el owner viejo continúa escribiendo o la UI sigue ocultando una doble fuente de verdad.

### 10.6 Dependencias entre módulos

Permitido:

- puerto de aplicación definido por el consumidor;
- adapter hacia el owner;
- DTO estable;
- evento/outbox con idempotencia;
- ID estable y snapshot.

Prohibido:

- importar repositorios concretos de otro módulo;
- escribir su tabla directamente;
- joins o FKs cross-database nuevos;
- HTTP loopback dentro del mismo PHP;
- copiar reglas de negocio al Dashboard.

### 10.7 Manifiestos y topología

- `module.json`: contrato del módulo/runtime.
- `dashboard/public/module-registry.json`: descubrimiento del orquestador.
- `dashboard/public/tenant-module-topology.json`: módulo contratado, owner y política de cambio.
- `dashboard/public/system-runtime-topology.json`: runtimes, entrypoints, dependencias, data ownership y migración.

Validación:

```bash
cd /home/admincenter/contenedores/dashboard
npm run module:check
npm run type:check
npm run verify
```

Más detalles: [`dashboard/docs/MODULAR-ORCHESTRATION.md`](dashboard/docs/MODULAR-ORCHESTRATION.md), [`dashboard/docs/MODULE-OPERATING-MODEL.md`](dashboard/docs/MODULE-OPERATING-MODEL.md) y [`dashboard/docs/MODULE-API-BLUEPRINT.md`](dashboard/docs/MODULE-API-BLUEPRINT.md).

## 11. Crear una pantalla en Dashboard

### 11.1 Arquitectura obligatoria de feature

```text
dashboard/src/app/features/<feature>/
|-- README.md
|-- <feature>.routes.ts
|-- models/
|-- data/
|   |-- <feature>-api.service.ts
|   `-- <feature>-api.service.spec.ts
|-- state/
|   |-- <feature>.facade.ts
|   `-- <feature>.facade.spec.ts
|-- pages/<pantalla>/
`-- components/
```

Flujo:

```text
Page -> Facade -> data/*-api.service.ts -> DashboardApiCatalogService
     -> ApiClientService -> interceptores -> API registrada
```

- La página renderiza, captura interacción y llama a la fachada.
- La fachada orquesta estado, carga, errores, reintentos y autorización funcional.
- El servicio `data` traduce DTO y transporte.
- Modelos/DTO viven en `models`.
- Componentes no usan `HttpClient`, `ApiClientService`, rutas ni permisos literales.
- Las reglas de negocio derivadas viven en servicios de dominio, no en el template.

### 11.2 Generar el scaffold

```bash
cd /home/admincenter/contenedores/dashboard

npm run generate:feature -- monitoring \
  --module=monitoring \
  --endpoint=monitoring/events \
  --endpoint-key=monitoring.events \
  --label="Monitoring" \
  --icon="solar:chart-outline"

npm run generate:feature -- monitoring --dry-run
```

**Advertencia vigente:** el generador sirve solo como scaffold. Su salida actual puede traer imports/guards anteriores. Antes de validar:

- sustituir `privateRoute(...)` por `privateRouteSourceRoute(...)`;
- usar permisos nombrados de `dashboard-module-access.config.ts`;
- sustituir `canAction(...)` por `canAll`, `canAny` o `canMatch` según el caso.

Si no se adapta, `npm run arch:check` debe fallar. No desactive el check para aceptar el scaffold.

### 11.3 Registrar rutas

En `<feature>.routes.ts`:

```ts
import { Routes } from '@angular/router';
import { privateRouteSourceRoute } from '@core/modules/dashboard-route-access.config';
import { tenantModuleGuard } from '@core/tenant/tenant-module.guard';
import { MY_FEATURE_PERMISSIONS } from '@core/modules/dashboard-module-access.config';

const featureRoute = privateRouteSourceRoute('my-feature', {
  feature: 'my-feature',
  permissions: [MY_FEATURE_PERMISSIONS.read]
});

export const myFeatureRoutes: Routes = [
  {
    path: 'my-feature',
    loadComponent: () => import('./pages/my-feature-list/my-feature-list.component')
      .then(module => module.MyFeatureListComponent),
    canActivate: [tenantModuleGuard],
    data: featureRoute
  }
];
```

Después:

1. Importar las rutas en `dashboard/src/app/app-route-sources.ts`.
2. Añadirlas a `DASHBOARD_ROUTE_SOURCE_MAP`.
3. Añadir el `routeSource` al módulo owner en `dashboard/src/app/core/tenant/tenant-module-catalog.ts`.
4. Confirmar que `/api/tenant/context` entrega ese módulo en `enabledModules`.
5. No importar la feature directamente en `app.routes.ts`.

### 11.4 Registrar navegación y permisos

Archivos:

```text
dashboard/src/app/core/modules/dashboard-navigation.config.ts
dashboard/src/app/core/modules/dashboard-module-access.config.ts
dashboard/src/app/core/modules/dashboard-route-access.config.ts
dashboard/src/app/core/modules/dashboard-modules.config.ts
dashboard/src/app/core/tenant/tenant-module-catalog.ts
```

- Añada navegación mediante `moduleNavigationItem(...)`.
- Exporte permisos como constantes nombradas.
- En template use `*appCan` y los helpers vigentes.
- La UI puede ocultar acciones, pero la fachada y el backend vuelven a validar.
- Un módulo deshabilitado no debe dejar ruta profunda accesible.

Módulos contractuales visibles actuales:

```text
dashboard
users
ecommerce
billing-sri
loyalty-points
```

No publique `products`, `inventory`, `monitoring`, `invoicing`, `workspace`, `email-service` o `medical-office` como productos tenant activos solo porque exista código legacy o una pantalla.

### 11.5 Conectar la pantalla a la API

1. Complete primero el procedimiento de [Crear o modificar una API](#9-crear-o-modificar-una-api).
2. Registre el endpoint en `dashboard-api.config.ts`.
3. Cree `data/<feature>-api.service.ts` usando aliases tipados.
4. Cree `state/<feature>.facade.ts` y haga que la página dependa de ella.
5. Normalize errores mediante la capa HTTP común; no inspeccione textos libres.
6. En mutaciones use el mecanismo común de CSRF/idempotencia.

Para CRUD, prefiera `ApiResource` y su mapa de endpoints:

```ts
protected override readonly endpointKeys = {
  list: DASHBOARD_API_ENDPOINT_KEYS.myFeature.list,
  detail: DASHBOARD_API_ENDPOINT_KEYS.myFeature.detail,
  create: DASHBOARD_API_ENDPOINT_KEYS.myFeature.create,
  update: DASHBOARD_API_ENDPOINT_KEYS.myFeature.update,
  remove: DASHBOARD_API_ENDPOINT_KEYS.myFeature.remove
} satisfies ApiResourceEndpointKeys;
```

### 11.6 Fixtures

Los fixtures son para desarrollo controlado y pruebas:

- agregarlos a `app-fixture-handlers.ts` cuando aplique;
- mantenerlos tenant-aware;
- no aceptar `tenantId` del formulario como fuente confiable;
- imitar códigos, envoltura y paginación del API real;
- no permitir que el modo fixture oculte que el contrato real no existe.

### 11.7 UI, formularios y accesibilidad

- Usar formularios reactivos y validaciones visibles.
- Asociar cada input con label, hint y error.
- Soportar teclado, foco y estados loading/empty/error/success.
- Reutilizar `PageHeaderComponent`, `StateMessageComponent`, `FormFieldErrorComponent` y componentes compartidos.
- No codificar colores como única señal; mantener contraste y texto.
- Las tablas deben tener encabezados, paginación y comportamiento responsive.
- Confirmar acciones destructivas y evitar doble submit.
- No mostrar IDs internos, tokens o payloads sensibles sin necesidad de soporte.

### 11.8 Pruebas de una pantalla

- Unit test del data service: URL del catálogo, método, params, payload y error.
- Unit test de fachada: estados, permiso, reintento y race/cancelación.
- Component test: loading, vacío, error, éxito, permiso y accesibilidad básica.
- E2E: login real, tenant/módulo, navegación, mutación y persistencia.
- Negative E2E: módulo o permiso ausente.

Comandos:

```bash
cd /home/admincenter/contenedores/dashboard

npm run type:check
npm run type:any-check
npm run lint
npm run arch:check
npm run module:check
npm run blueprint:check
npm test -- --watch=false
npm run build
npm run verify
```

Antes de release integral:

```bash
npm run deploy:check
```

`verify` incluye environment/runtime/ports, tipos, lint, arquitectura, módulos, blueprint, performance, código no usado, tests, build y bundle. `deploy:check` añade E2E, auditoría de dependencias y salud Docker.

## 12. Crear una página en Next.js

### 12.1 Ubicaciones

```text
webparamascotas/app/src/app/                         # App Router
webparamascotas/app/src/app/layout.tsx               # layout raíz
webparamascotas/app/src/components/                  # UI compartida
webparamascotas/app/src/tenants/paramascotasec.com/  # implementación del tenant
webparamascotas/app/src/lib/api/endpoints.ts          # catálogo HTTP
webparamascotas/app/src/lib/api/*.ts                  # adapters por dominio
webparamascotas/app/src/lib/apiClient.ts              # transporte
webparamascotas/app/src/lib/api/backendBase.ts        # base SSR
```

### 12.2 Procedimiento

1. Crear `src/app/<ruta>/page.tsx`.
2. Usar `[slug]` para segmento dinámico.
3. Mantener Server Component salvo que necesite estado/eventos del navegador.
4. Mover solo la parte interactiva a un Client Component con `'use client'`.
5. Colocar componentes reutilizables en `src/components`.
6. Para UI tenantizada, dejar un wrapper delgado en App Router y la implementación en `src/tenants/...`.
7. Añadir `generateMetadata`, canonical, robots y datos estructurados cuando aplique.
8. Registrar página/handler/capability en el JSON maestro correspondiente.
9. Regenerar capabilities y ejecutar checks.

Ejemplo de forma:

```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nueva sección',
  alternates: { canonical: '/nueva-seccion' }
};

export default async function NuevaSeccionPage() {
  return <main>{/* UI server-side */}</main>;
}
```

### 12.3 Consumir backend

Nunca escriba `/api/...` fuera de `src/lib/api/endpoints.ts`.

1. Añada la ruta con `buildApiRoute(...)` y capability generada.
2. Cree una función tipada en `src/lib/api/<dominio>.ts`.
3. Use `fetchJson`, `fetchJsonEnvelope` o `requestApi` según el contrato.
4. La página/componente llama la función de dominio, no `fetch` con URL literal.

La infraestructura decide:

- SSR -> `http://backend-http:8080/api` y token Storefront.
- Browser -> ruta pública tenantizada por APISIX.
- Cookie/superficie ecommerce, CSRF y host.
- Política de cache/revalidación de GET público.

No exponga el token interno con variables `NEXT_PUBLIC_*`.

### 12.4 Route handlers y proxy

Los handlers viven en `src/app/**/route.ts`. Un handler debe:

- validar método, path e input;
- usar el endpoint catalogado;
- preservar request ID y superficie;
- no convertirse en proxy abierto;
- limitar tamaño/tipo en uploads;
- propagar estados/códigos seguros;
- aplicar cache explícita.

El catch-all existente tiene alcance Storefront. No se debe reutilizar para APIs administrativas ni hacer que `/api/*` legacy vuelva a publicarse.

### 12.5 Seguridad y SEO de página

- No renderizar secretos o payloads privados en HTML/cache público.
- Separar datos públicos y sesión.
- Sanear contenido enriquecido y URLs.
- Mantener CSP, headers, canonical y sitemap.
- Evitar que una respuesta tenant quede cacheada para otro host.
- Usar variantes optimizadas de imagen y `alt` descriptivo.
- Los precios visibles son presentación; checkout siempre recalcula en backend.

### 12.6 Validación Next.js

```bash
cd /home/admincenter/contenedores/webparamascotas/app

npm run capabilities:check
npm run api:contracts:check
npm run test
npm run lint
npm run typecheck
npm run build
```

`npm run test` incluye capabilities, contratos API, separación de canales, storage/auth de uploads, performance de catálogo, resumen de pedidos, runtime cluster, lint y tipos.

## 13. PostgreSQL y acceso seguro a datos

### 13.1 Modelo de despliegue

Existe un servicio PostgreSQL 18 (`basesdedatos`) sin puerto host publicado. Aloja cuatro bases de negocio gestionadas y la base administrativa `postgres`.

El backend resuelve el store por dominio mediante:

```text
backend/src/Core/ConnectionRegistry.php
backend/src/Core/Database.php
backend/config/module-databases.php
basesdedatos/config/module-databases.json
```

### 13.2 Roles

| Rol | Propósito |
|---|---|
| App | API normal, sujeto a RLS y `app.tenant_id` |
| Worker de dominio | Capacidad mínima para el worker y tablas allowlisted |
| Owner | `NOLOGIN`, dueño de objetos |
| Platform auth | `NOLOGIN BYPASSRLS`, solo funciones `SECURITY DEFINER` auditadas |
| FDW | Bootstrap/compatibilidad, no acceso runtime |
| Admin PostgreSQL | Infraestructura/bootstrap por canal efímero |

Un worker no reutiliza el rol App, otro worker, FDW o admin. API y workers no pueden `SET ROLE` hacia owners.

### 13.3 Conexión desde código backend

Use el módulo owner, no el nombre DB hardcodeado:

```php
use App\Core\Database;
use App\Modules\CatalogInventory\Domain\CatalogInventoryDomain;

$pdo = Database::getModuleInstance(CatalogInventoryDomain::KEY);
$statement = $pdo->prepare(
    'SELECT id, name FROM "Product" WHERE id = :id'
);
$statement->execute(['id' => $id]);
```

La entrada HTTP ya debió resolver `TenantContext`. `Database`:

- selecciona la base owner;
- usa credencial App/Worker según runtime;
- deshabilita conexiones PDO persistentes;
- usa prepared statements reales;
- establece `app.tenant_id` en la sesión;
- falla si RLS enforce no tiene tenant;
- impide transaction/statement pooling con contexto de sesión.

No ejecute `SET app.tenant_id` a partir de un campo del body. No cree PDO fuera de esta fábrica.

### 13.4 Acceso de soporte

Nivel preferido, no destructivo:

```bash
cd /home/admincenter/contenedores
./scripts/check-module-databases.sh
./basesdedatos/scripts/tenant-isolation.sh --check
./basesdedatos/scripts/check-tenant-rls-negative.sh
./basesdedatos/scripts/check-worker-capabilities-negative.sh
./basesdedatos/scripts/check-secret-transport.sh
```

Para consultas de negocio, prefiera la API o un script de diagnóstico limitado, revisado y auditable. No existe una consola SQL genérica para soporte de aplicación por diseño.

Si un DBA autorizado necesita una consulta puntual, debe usar el transporte de `basesdedatos/scripts/common.sh`, una sentencia explícita y una transacción read-only. Ejemplo que solo identifica conexión:

```bash
cd /home/admincenter/contenedores/basesdedatos

bash -c '
  source scripts/common.sh
  mode="$(active_mode_from_env)"
  env_file="$(resolve_env_file "$mode")"
  load_env_file "$env_file"
  assert_db_mode "$env_file"
  db_psql "$env_file" -X -v ON_ERROR_STOP=1 \
    -h 127.0.0.1 -U "$POSTGRES_USER" -d dashboard \
    -c "BEGIN READ ONLY; SELECT current_database(), current_user; COMMIT;"
'
```

El helper inyecta la credencial por stdin y crea un `PGPASSFILE` efímero `0600` dentro del contenedor. Para una consulta real:

> **Atención:** `POSTGRES_USER` es un rol administrativo y puede omitir RLS. La transacción `READ ONLY` evita escrituras, pero no limita qué filas puede leer. El DBA debe incluir un filtro explícito e inmutable por `tenant_id`/ID y revisar el alcance antes de ejecutar; soporte ordinario debe usar la API o el rol App sujeto a RLS.

1. Revisar que sea `SELECT` y esté acotada por tenant/ID/fecha.
2. Evitar columnas sensibles o aplicar redacción.
3. Ejecutar en `BEGIN READ ONLY` con `ON_ERROR_STOP`.
4. Guardar ticket, propósito, operador y resultado sanitizado.
5. No convertir esta receta en un alias general ni compartir el `.env`.

Nunca usar:

```text
docker exec -e PGPASSWORD=...
PGPASSWORD=... psql ...
psql -v password=...
postgresql://usuario:clave@host/base
docker inspect para extraer passwords
un .pgpass persistente
un puerto 5432 expuesto
```

### 13.5 Crear una tabla tenantizada

Ejemplo de esquema:

```sql
CREATE TABLE example_items (
    tenant_id text NOT NULL,
    id text NOT NULL,
    name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, id)
);

CREATE UNIQUE INDEX example_items_tenant_name_uq
    ON example_items (tenant_id, lower(name));
```

Reglas:

- `tenant_id` es `NOT NULL`.
- PK/unique funcional incluye tenant.
- Índices empiezan por `tenant_id` cuando filtran por tenant.
- FK dentro de la misma base incluye/valida tenant; nunca FK entre bases.
- No confiar solo en `WHERE tenant_id = ...`; activar `ENABLE` y `FORCE ROW LEVEL SECURITY`.
- Owner `NOLOGIN`; grants App/Worker mínimos.
- Auditoría, retención y datos sensibles se definen antes del release.

La política App esperada equivale a:

```sql
USING (
  tenant_id = NULLIF(current_setting('app.tenant_id', true), '')
)
WITH CHECK (
  tenant_id = NULLIF(current_setting('app.tenant_id', true), '')
)
```

No aplique esta política manualmente como cambio aislado. Añada la tabla al bootstrap/registro y permita que el flujo canónico sincronice ownership, policies y auditorías.

Las identidades y filas globales `platform` requieren una política o función privilegiada específica, mínima y auditada. No añada a una política tenant una condición amplia como `tenant_id = 'platform'`, porque abriría datos globales a conexiones que no corresponden.

### 13.6 Migraciones y bootstrap

Archivos principales:

```text
backend/scripts/bootstrap_schema.php
backend/scripts/bootstrap_module_databases.php
```

Billing usa migraciones inmutables con checksum:

```text
backend/src/Modules/Billing/Native/Billing/Infrastructure/Persistence/Migrations/
```

Nunca edite una migración Billing aplicada. Cree una nueva versión. Para otros owners, siga el mecanismo existente del módulo y haga que el bootstrap sea idempotente, transaccional cuando sea posible y fail-closed.

Ejecución autorizada:

```bash
cd /home/admincenter/contenedores
RUN_DB_SETUP=1 ./scripts/deploy.sh backend
```

No invoque directamente `bootstrap_module_databases.php`: el deploy quiesce consumidores, sincroniza bases, transporta credenciales por stdin, ejecuta bootstrap, aplica RLS y vuelve a verificar.

### 13.7 Validación de una tabla nueva

```bash
cd /home/admincenter/contenedores
./basesdedatos/scripts/tenant-isolation.sh --check
./basesdedatos/scripts/check-tenant-rls-negative.sh
./basesdedatos/scripts/check-worker-capabilities-negative.sh
./scripts/check-module-databases.sh
```

Pruebas mínimas:

- tenant A puede CRUD de A;
- tenant A no puede ver/modificar B;
- fila sin tenant falla;
- App no puede asumir owner/worker;
- worker solo ve/actualiza columnas y tablas allowlisted;
- unicidad no colisiona entre tenants;
- restore conserva policy/owner/grants;
- no apareció FK cross-database ni escritura FDW.

### 13.8 Concurrencia y transacciones

- Bloquee la fila/recurso dentro de la transacción antes de revalidar saldo, stock o estado.
- Use `FOR UPDATE`, advisory lock o constraint única según el problema.
- No haga “leer, decidir, escribir” sin protección concurrente.
- Reserve idempotencia antes del efecto externo.
- Mantenga transacciones cortas; no llame SMTP/SRI/HTTP mientras retiene locks.
- Use outbox para comunicar un commit con un efecto diferido.
- Capture `delivery_unknown` cuando no se pueda saber si el proveedor procesó el request.

### 13.9 Datos personales y soporte

- Aplicar mínimo privilegio y propósito legítimo.
- No copiar dumps a laptops/tickets.
- Redactar email, teléfono, documento, dirección, tokens y payload fiscal en evidencias.
- Definir retención y borrado/anominización por dominio y obligación legal.
- Registrar toda reparación manual con antes/después, tenant, actor y aprobación.

Runbook detallado: [`basesdedatos/docs/TENANT-ISOLATION-RUNBOOK.md`](basesdedatos/docs/TENANT-ISOLATION-RUNBOOK.md).

## 14. Tenants: alta, aislamiento y ciclo de vida

### 14.1 Fuente de verdad

IdentityPlatform es owner de:

- tenants, slug, dominios y configuración;
- módulos contratados/entitlements;
- staff, roles, permisos y sesiones Dashboard;
- journal, snapshots y estado de reconciliación.

`TenantRuntimeRegistry` combina configuración base y tenants persistidos. APISIX consume su proyección; no es necesario agregar cada tenant persistido a una variable estática.

### 14.2 Alta recomendada desde Dashboard

Use `Plataforma > Tenants` con identidad `platform-admin`:

1. Crear nombre y slug estable.
2. Asignar dominio primario y aliases no colisionantes.
3. Elegir módulos contractuales válidos.
4. Crear/asignar staff y roles mínimos.
5. Configurar DNS hacia el edge.
6. Reconciliar gateway/TLS.
7. Esperar receipt válido y estado `ready`.
8. Probar login, contexto, rutas, aislamiento y backup.

No entregar el tenant mientras siga `pending_gateway`, `pending_dns` o `error`.

### 14.3 API administrativa del ciclo de vida

Por el host Dashboard:

```text
GET    /dashboard/api/admin/tenants
POST   /dashboard/api/admin/tenants
PATCH  /dashboard/api/admin/tenants/{tenantId}/modules
PATCH  /dashboard/api/admin/tenants/{tenantId}/configuration
POST   /dashboard/api/admin/tenants/{tenantId}/lifecycle
PUT    /dashboard/api/admin/tenants/{tenantId}/domains
POST   /dashboard/api/admin/tenants/{tenantId}/reconcile
POST   /dashboard/api/admin/tenants/{tenantId}/rollback
GET    /dashboard/api/admin/tenants/{tenantId}/events
```

Mutaciones requieren:

- Bearer/sesión platform autorizada;
- `If-Match` con el ETag vigente;
- `Idempotency-Key` único y estable para ese intento;
- razón auditable donde aplique.

Lectura del ETag:

```bash
curl --include \
  --cacert gatewayapisix/entorno/certs/local-ca.crt \
  --resolve paramascotasec.com:443:192.168.100.229 \
  -H 'Authorization: Bearer <JWT-PLATFORM>' \
  https://paramascotasec.com/dashboard/api/admin/tenants
```

Creación ilustrativa:

```bash
curl \
  --cacert gatewayapisix/entorno/certs/local-ca.crt \
  --resolve paramascotasec.com:443:192.168.100.229 \
  -X POST \
  -H 'Authorization: Bearer <JWT-PLATFORM>' \
  -H 'Content-Type: application/json' \
  -H 'If-Match: "tenant-registry-N"' \
  -H 'Idempotency-Key: tenant-create-miempresa-001' \
  --data '{
    "name": "Mi Empresa",
    "slug": "miempresa",
    "primaryDomain": "panel.miempresa.example",
    "enabledModules": ["dashboard", "users", "ecommerce"]
  }' \
  https://paramascotasec.com/dashboard/api/admin/tenants
```

Nunca pegue un JWT real en un manual o ticket. Si hay 409/412, no cambie el ETag a mano: relea el registro, evalúe la mutación concurrente y reintente con nueva idempotency key solo si es una intención nueva.

### 14.4 Reconciliación de edge

```bash
cd /home/admincenter/contenedores/gatewayapisix
./scripts/reconcile-tenants.sh
```

El proceso:

1. Exporta la revisión del registro runtime.
2. Normaliza y valida hosts/slugs/módulos.
3. Compara hash/inventario con APISIX.
4. Genera rutas, upstreams, SSL/SNI y bloqueos.
5. Verifica HTTPS y tenant correcto.
6. Emite receipt firmado/hasheado.
7. El backend aplica el receipt y cambia a `ready`.

Producción exige DNS/HTTPS externos verificables. Un `--resolve` QA no es prueba válida de publicación pública.

Evidencia local:

```bash
cd /home/admincenter/contenedores/gatewayapisix/entorno/runtime
sha256sum -c tenant-business-publication-receipt.json.sha256
jq . tenant-business-publication-receipt.json
sed -n '1,120p' apisix-sync.state
sed -n '1,120p' tenant-reconcile.state
```

### 14.5 Cambios de dominio

1. Añadir/verificar DNS antes del corte cuando sea posible.
2. Mutar dominios con CAS/idempotencia.
3. Reconciliar gateway.
4. Comprobar SAN, SNI, HTTPS, host-to-tenant y cookies host-only.
5. Mantener redirección/ventana del dominio anterior según contrato.
6. Retirarlo solo después de revisar uso y rollback.

No reutilice el mismo host en dos tenants y no convierta un host Dashboard tenantizado en alias del ecommerce principal.

### 14.6 Suspensión, reanudación y offboarding

Transiciones válidas:

```text
active -> suspended
suspended -> active
active|suspended -> inactive (offboard)
```

Suspensión debe bloquear operación sin borrar evidencia. Offboarding requiere:

- motivo y aprobación;
- backup/retención definidos;
- revocar sesiones/API keys;
- detener workers/efectos del tenant;
- retirar rutas/certificados cuando corresponda;
- exportar datos contractuales;
- preservar journal y obligaciones fiscales;
- registrar fecha de eliminación/anominización.

Un tenant offboarded es inmutable y solo vuelve mediante rollback explícito y auditable.

### 14.7 Cómo se protege un tenant

| Capa | Control |
|---|---|
| DNS/host | Solo hosts registrados; colisiones rechazadas |
| APISIX | Ruta con slug/host, mismatch 404/deny, rutas desconocidas cerradas |
| Proxy trust | El cliente no puede inyectar tokens/headers internos |
| Sesión/API key | `tenant_id`, surface, audience, estado y revocación |
| Entitlements | Módulo contratado y activo |
| RBAC | Permiso `resource.action` por operación |
| Backend | `TenantContext` resuelto y consistente |
| DB | `app.tenant_id`, RLS + FORCE RLS |
| Storage | Prefijo/key tenantizada y autorización del owner |
| Async | `tenant_id` en outbox, idempotencia y worker capability |
| Auditoría | actor, tenant, request ID, antes/después y resultado |

### 14.8 Pruebas de aislamiento

```bash
cd /home/admincenter/contenedores
./basesdedatos/scripts/check-tenant-rls-negative.sh
./basesdedatos/scripts/check-worker-capabilities-negative.sh
./scripts/check-module-databases.sh
gatewayapisix/scripts/check-apisix-security.sh qa
gatewayapisix/scripts/check-tenant-reconciler.sh
```

Además:

- token de A contra host/ruta de B;
- API key de A en B;
- host desconocido;
- slug ajeno bajo host correcto;
- usuario sin módulo y sin permiso;
- URL directa de storage de otro tenant;
- idempotency key igual en tenants distintos;
- suspensión con sesión ya emitida;
- job pendiente después de offboarding.

Todas deben fallar cerradas sin revelar si el recurso de otro tenant existe.

## 15. Autenticación, autorización y protección

### 15.1 Tipos de identidad

| Tipo | Uso |
|---|---|
| `platform` | Superadmin/recovery global TECNOLTS |
| `tenant_staff` | Administrador u operador de un tenant |
| `customer` | Comprador ecommerce del módulo owner |
| `service` | Integración interna sin sesión humana |

Los perfiles operativos de módulo pueden referenciar `tenant_id + user_id`, pero no deben guardar password, sesión o rol global.

### 15.2 Superficies separadas

| Superficie | Cookie auth | Cookie CSRF | Header confiable |
|---|---|---|---|
| Dashboard | `pm_auth_dashboard` | `pm_csrf_dashboard` | `X-Auth-Surface: dashboard` |
| Ecommerce | `pm_auth_ecommerce` | `pm_csrf_ecommerce` | `X-Auth-Surface: ecommerce` |

Las cookies de autenticación son `Secure`, `HttpOnly`, `SameSite=Lax` y host-only. CSRF debe ser legible por el cliente para double-submit. El fallback `pm_auth`/`pm_csrf` legacy está deshabilitado por defecto.

APISIX/Next eliminan headers internos aportados por el cliente y reinyectan el valor autenticado. El backend rechaza `X-Auth-Surface` si no viene de un proxy interno válido.

### 15.3 Login y sesión

1. Resolver host/tenant y superficie.
2. Buscar identidad en el owner correcto.
3. Verificar password con `password_verify`; se guarda `password_hash(PASSWORD_DEFAULT)`.
4. Aplicar estado, lockout y allowlist admin.
5. Para admin, emitir challenge MFA por email o recovery autorizado.
6. Crear JWT HS256 con `sub`, `email`, `name`, `role`, `tenant_id`, `jti`, audience/surface y expiración.
7. Persistir sesión relacional revocable.
8. Emitir cookies de esa superficie y CSRF.
9. En cada request validar firma, expiración, `jti`, tenant, surface, identidad, sesión y estado.

Rotación JWT usa `JWT_SECRET` actual y `JWT_SECRET_PREVIOUS` durante una ventana corta. Retire la clave anterior al finalizar la migración.

### 15.4 Lockout, MFA y recuperación

- Default de login: 5 fallos, bloqueo 15 minutos.
- MFA/OTP admin: email, 10 minutos y máximo de intentos.
- Password nueva: mínimo vigente de 12 caracteres.
- Resets/invitaciones usan tokens de un solo uso y expiración.
- Los códigos de recovery son para contingencia privada, no bypass cotidiano.

Ante sospecha de compromiso:

1. Suspender/revocar identidad o sesiones.
2. Rotar credencial afectada, no todos los secretos sin diagnóstico.
3. Revisar eventos de acceso por request/tenant/IP.
4. Confirmar que no hubo cambio de roles, módulos o dominios.
5. Documentar alcance y preservar evidencia.

### 15.5 CSRF

Una mutación autenticada por cookie necesita:

```http
X-CSRF-Token: <valor de la cookie CSRF de la misma superficie>
```

El backend también valida `Sec-Fetch-Site`, `Origin`/`Referer` y hosts permitidos. Una API externa Bearer/API key puede tener política diferente porque no depende de cookie, pero debe estar clasificada explícitamente; no la exima por conveniencia.

### 15.6 RBAC y entitlements

Orden de decisión:

```text
identidad activa
  + tenant activo
  + módulo habilitado
  + ruta/capability clasificada
  + permiso requerido
  + recurso dentro del tenant
= operación permitida
```

Los grants centrales viven en las tablas `tenant_*` de `dashboard`. Para Fidepuntos, Loyalty publica navegación versionada e IdentityPlatform combina el catálogo con grants. No volver a roles/menu legacy como fuente efectiva.

Regla de permiso: usar nombres `resource.action`, separar `read/create/update/delete/assign/...` y otorgar mínimo privilegio. No crear un rol “admin” con comodín si el trabajo se puede expresar con grants concretos.

### 15.7 Administración por IP

- QA puede usar `ADMIN_IP_MODE=private` con LAN/loopback y reglas adicionales.
- Producción exige `ADMIN_IP_MODE=custom` y al menos dos CIDR explícitos válidos.
- No se acepta `0.0.0.0/0` ni confiar en `X-Forwarded-For` de un salto no autorizado.

La allowlist complementa MFA/RBAC; no los reemplaza.

### 15.8 API keys externas

Billing y Loyalty:

- aceptan `X-API-Key` o Bearer opaco;
- guardan hash SHA-256, nunca la clave recuperable;
- asocian tenant, scopes/ambiente, estado y uso;
- permiten revocación/rotación;
- aplican rate limit e idempotencia donde corresponde.

La clave debe ser aleatoria y larga. Se muestra una sola vez, se entrega por un gestor seguro y jamás se coloca en frontend, URL, log o ticket.

Rotación:

1. Crear credencial nueva con scopes mínimos.
2. Entregar por canal seguro.
3. Observar uso de ambas durante ventana corta.
4. Revocar la anterior.
5. Probar 401 con la anterior y éxito con la nueva.
6. Registrar actor/fecha/consumidor.

### 15.9 Seguridad edge y HTTP

APISIX aplica TLS, host allowlist, CORS por perfil, rate limit, headers, métodos y rutas fail-closed. El backend sigue siendo autoridad: nunca confiar en que el gateway validó negocio, tenant o scopes.

Perfiles QA actuales de referencia:

| Perfil | Límite principal |
|---|---:|
| Público lectura | 600/min |
| Público mutación | 90/min y 5/s, burst 20 |
| Sesión lectura | 900/min |
| Sesión mutación | 360/min y 20/s, burst 40 |
| Admin/Dashboard API | 900/min y 30/s, burst 60 |
| Billing externo | 300/min y 15/s, burst 30 |
| Loyalty externo | 600/min y 30/s, burst 60 |
| Dashboard auth | 60/min y 3/s, burst 10 |

Son configuración operacional, no promesa eterna. Revise `sync-apisix.sh` antes de ajustar capacidad; múltiples réplicas requieren un contador compartido, no política local por pod.

### 15.10 Auditorías de seguridad

```bash
cd /home/admincenter/contenedores
./scripts/check-env-secrets.sh all
./scripts/check-runtime-secret-boundaries.sh
./basesdedatos/scripts/check-secret-transport.sh
./scripts/rotate-owned-secrets.sh audit
gatewayapisix/scripts/check-apisix-security.sh qa

cd dashboard
npm run env:check
npm run runtime:check
npm run security:check
```

No interprete `npm audit` aislado como prueba total: debe evaluar exploitabilidad, runtime, compensating controls y upgrade con pruebas.

## 16. Cifrado, secretos, TLS y almacenamiento

### 16.1 Matriz de protección

| Activo | Protección actual |
|---|---|
| HTTP público | TLS X.509 en APISIX |
| DB en producción HA | TLS `verify-full` hacia PgBouncer + CA |
| Passwords | `password_hash(PASSWORD_DEFAULT)` |
| JWT | HMAC HS256 con clave actual/anterior |
| API keys Billing/Loyalty | Hash SHA-256 tenantizado |
| Password de `.p12` y SMTP Billing | Envelope AES-256-GCM con keyring versionado |
| Snapshot de tenants | HMAC SHA-256, hash, revisión y escritura atómica |
| Config sensible APISIX | data encryption key + previous keys |
| Backups DB | AES-256-CBC + PBKDF2 + checksum/manifest |
| Object storage | TLS/credenciales del proveedor; key tenantizada |

El volumen PostgreSQL no obtiene automáticamente cifrado de disco por estas capas. En producción, cifrado at-rest de disco/snapshot, KMS, backups y object storage es responsabilidad de infraestructura y debe tener evidencia propia.

### 16.2 Secretos Billing con envelope encryption

Campos `certificate_password` y `mail_password` usan:

- DEK aleatoria;
- AES-256-GCM;
- DEK envuelta por KEK versionada;
- AAD con tenant, sucursal y campo;
- envelope `pmbillenc:v1`.

Keyring runtime:

```text
/run/secrets/backend/billing-secret-keyring.json
```

Se monta read-only. En QA la ruta host vive bajo `backend/entorno/.secrets`; producción debe provisionarla desde Secret/KMS.

Validar, añadir y activar una KEK:

```bash
cd /home/admincenter/contenedores/backend

php scripts/manage_billing_secret_keyring.php validate \
  --file=/ruta/segura/billing-secret-keyring.json

php scripts/manage_billing_secret_keyring.php add-key \
  --file=/ruta/segura/billing-secret-keyring.json \
  --key-id=KEK_NUEVA

php scripts/manage_billing_secret_keyring.php activate-key \
  --file=/ruta/segura/billing-secret-keyring.json \
  --key-id=KEK_NUEVA
```

Flujo de rotación:

1. Backup y restore drill con keyring anterior preservado.
2. Añadir KEK inactiva.
3. Distribuir a todos los runtimes y verificar lectura.
4. Activar y redesplegar para que nuevas escrituras usen la KEK nueva.
5. Ejecutar migrador de reenvoltura autorizado.
6. Verificar cero envelopes antiguos y recuperación SRI.
7. Retirar una KEK solo cuando expiró la retención de todos los backups que la necesitan y existe attestación.

Comandos de mutación de keyring o `migrate_billing_secrets.php --execute` requieren ventana, aprobación y rollback; nunca se prueban sobre producción por curiosidad.

Checks:

```bash
cd /home/admincenter/contenedores
php backend/scripts/check_billing_secret_encryption.php
php backend/scripts/check_billing_secret_storage.php
php backend/scripts/check_billing_secret_runtime_readiness.php
```

### 16.3 TLS

QA:

```bash
cd /home/admincenter/contenedores/gatewayapisix
./scripts/setup-ssl-local.sh
./scripts/sync-apisix.sh
```

Instale en clientes únicamente:

```text
gatewayapisix/entorno/certs/local-ca.crt
```

Producción:

```bash
cd /home/admincenter/contenedores/gatewayapisix
./scripts/setup-letsencrypt.sh
./scripts/renew-letsencrypt.sh
```

Antes de reemplazar SSL, los scripts validan X.509/PKCS, pareja certificado/llave, SAN, hosts y vigencia. Una renovación inválida no debe reemplazar el certificado funcional.

Nunca mover `privkey.pem`, `.p12`, `local-ca.key` ni KEK por correo/chat.

### 16.4 APISIX data encryption

Variables:

```text
APISIX_DATA_ENCRYPTION_KEY
APISIX_DATA_ENCRYPTION_PREVIOUS_KEYS
```

La actual cifra valores compatibles de configuración y las anteriores permiten lectura durante rotación. Después de reconciliar todo el inventario con la nueva, retire las anteriores. No confundir esta llave con Admin API key, TLS private key o tokens de proxy.

La rotación coordinada de credenciales runtime se prepara sin imprimir valores:

```bash
cd /home/admincenter/contenedores
php scripts/rotate-gateway-runtime-secrets.php --prepare
./scripts/deploy.sh backend
./scripts/deploy.sh dashboard
./scripts/deploy.sh gateway
./scripts/check-env-secrets.sh qa
./scripts/check-container-connectivity.sh qa
./gatewayapisix/scripts/check-apisix-security.sh
```

Durante esa ventana, backend acepta `EDGE_BACKEND_PROXY_TOKEN_PREVIOUS`, Dashboard acepta `DASHBOARD_PROXY_TOKEN_PREVIOUS`, APISIX acepta `APISIX_ADMIN_KEY_PREVIOUS` y el keyring conserva `APISIX_DATA_ENCRYPTION_PREVIOUS_KEYS`. Después de aprobar los probes se retiran todos los predecesores y se redespliegan los consumidores:

```bash
php scripts/rotate-gateway-runtime-secrets.php --finalize
./scripts/deploy.sh backend
./scripts/deploy.sh dashboard
./scripts/deploy.sh gateway
```

`--restore-active-data-key` solo recupera hacia el `.env` la clave activa del archivo runtime local cuando una edición accidental la reemplazó por un marcador inválido; no imprime ni rota la clave.

### 16.5 Backups cifrados

Los backups actuales usan AES-256-CBC/PBKDF2 y archivos `.manifest`/`.sha256`. La passphrase se solicita interactivamente o por descriptor privado; no va en `.env` ni argv.

Conserve por separado:

- ciphertext;
- manifest/checksum;
- passphrase en gestor seguro;
- keyrings necesarios para secretos internos restaurados;
- evidencia de restore.

Un backup que no ha sido restaurado en un entorno aislado es solo una esperanza, no una recuperación comprobada.

### 16.6 Almacenamiento de archivos

QA puede usar storage local. Producción HA usa la abstracción S3/object storage y CDN.

Scopes principales:

- uploads públicos de catálogo/premios;
- artefactos Billing (XML/RIDE/certificados);
- objetos privados de integración.

Reglas:

- key/prefijo incluye tenant y scope;
- autorización antes de generar URL;
- `.p12/.pfx` siempre privado y con atestación KMS/retención;
- validar MIME real, tamaño, extensión, nombre y contenido;
- URLs públicas solo para assets expresamente públicos;
- credenciales S3 solo en backend/worker;
- producción debe usar HTTPS, bucket policy mínima, versionado/lifecycle y cifrado proveedor/KMS.

Config:

```text
OBJECT_STORAGE_ACCESS_KEY[_FILE]
OBJECT_STORAGE_SECRET_KEY[_FILE]
OBJECT_STORAGE_SESSION_TOKEN[_FILE]
OBJECT_STORAGE_ENDPOINT
OBJECT_STORAGE_BUCKET
```

Si usa variantes `_FILE`, deje vacías las variables directas: actualmente las directas tienen precedencia.

Migración local -> S3:

```bash
cd /home/admincenter/contenedores/backend
php scripts/migrate_local_storage_to_s3.php --help
```

Primero dry-run/inventario; luego execute bajo cambio aprobado; finalmente `--verify-only`/canary según las opciones que muestre la versión vigente. No retire los archivos locales antes de verificar hash, tamaño, URL y rollback.

### 16.7 Inventario y rotación de secretos

Cada secreto necesita:

| Campo | Ejemplo de contenido |
|---|---|
| Owner | Gateway, Identity, Billing, Storage, DB |
| Scope | salto/tenant/ambiente exacto |
| Ubicación | gestor o secret mount, nunca el valor |
| Creación/rotación | fechas y actor |
| Consumidores | contenedores concretos |
| Revocación | procedimiento y verificación |
| Restore | qué backups/keyrings dependen de él |

Auditoría:

```bash
./scripts/rotate-owned-secrets.sh audit
./scripts/check-env-secrets.sh all
./scripts/check-runtime-secret-boundaries.sh
```

No programe una rotación automática que muta credenciales sin verificar consumidores y rollback. El cron histórico instala únicamente auditoría.

## 17. Workers e integraciones externas

### 17.1 Workers actuales

| Worker | Entrada/owner | Efecto |
|---|---|---|
| `backend-sri-worker` | `facturacion` | Consulta/reintento SRI y correo fiscal |
| `backend-commerce-billing-worker` | outbox `ecommerce` | Entrega pedido a Billing por HTTP interno |
| `backend-mailer-worker` | outbox `dashboard` | Entrega SMTP y auditoría |
| `backend-wallet-notify-worker` | `loyalty` | Actualiza/notifica pases Google Wallet |

Son pares del backend, no APIs públicas. Cada uno tiene rol DB, redes, secretos y allowlist propios.

### 17.2 Patrón operativo

```text
Transacción de negocio
  -> escribe estado + outbox/idempotencia
  -> commit
  -> worker reclama con lease/lock
  -> llama integración con timeout
  -> registra éxito, retry, delivery_unknown o DLQ
  -> emite métrica/auditoría
```

Requisitos:

- `tenant_id` obligatorio;
- idempotency key/fingerprint tenantizado;
- selección justa entre tenants;
- `FOR UPDATE SKIP LOCKED` o mecanismo equivalente;
- lease con token y recuperación de locks vencidos;
- reintentos con backoff/jitter y máximo;
- distinguir fallo definitivo, transitorio y entrega desconocida;
- DLQ y requeue/ack con actor + razón;
- no retener transacción SQL durante una llamada externa;
- health y métricas baratas.

### 17.3 Diagnóstico no destructivo

```bash
docker exec backend-commerce-billing-worker \
  php /var/www/html/scripts/process_commerce_billing_outbox.php --metrics

docker exec backend-commerce-billing-worker \
  php /var/www/html/scripts/process_commerce_billing_outbox.php --health-only

docker exec backend-mailer-worker \
  php /var/www/html/scripts/process_mailer_outbox.php --metrics

docker exec backend-mailer-worker \
  php /var/www/html/scripts/process_mailer_outbox.php --health-only
```

Para otros workers, primero consulte las opciones del script vigente. No ejecute flags `--requeue-*`, `--acknowledge-*` o procesado manual sin confirmar que mutan estado y sin tenant/actor/razón.

### 17.4 Crear un worker nuevo

Use como patrones:

```text
backend/docker-compose.yml
backend/docker/periodic-worker.sh
backend/docker/check-periodic-worker-health.sh
backend/scripts/process_commerce_billing_outbox.php
backend/scripts/process_mailer_outbox.php
```

Checklist:

1. Definir mensaje/outbox, owner y estados.
2. Crear caso de uso y repositorio dentro del módulo owner.
3. Diseñar idempotencia, lease, retry, DLQ y reparación.
4. Crear script con `--metrics` y `--health-only`.
5. Crear rol `DB_WORKER_USERNAME_<MODULO>` dedicado.
6. Añadir grants/allowlist/RLS al flujo de tenant isolation.
7. Añadir contenedor no root, `read_only`, `cap_drop: ALL`, `no-new-privileges` y tmpfs.
8. Conectar solo a DB/red/egreso/secretos necesarios.
9. Añadir healthcheck, logs estructurados y métricas.
10. Probar concurrencia, fairness, caída, timeout, duplicado y recuperación.
11. Incluirlo en deploy, checks, diagrama, topología y runbook.

Validación:

```bash
./scripts/check-runtime-secret-boundaries.sh
./basesdedatos/scripts/tenant-isolation.sh --check
./basesdedatos/scripts/check-worker-capabilities-negative.sh
./scripts/check-module-databases.sh
```

### 17.5 SRI Ecuador

QA usa exclusivamente endpoints de pruebas (`celcer.sri.gob.ec`). Producción usa `cel.sri.gob.ec` solo cuando el ambiente activo y los guardrails lo permiten.

Si QA contiene una factura restaurada con `ambiente=produccion`:

- no cambiar el endpoint QA a producción;
- no consultar SRI producción;
- conservar autorización local para diagnóstico;
- probar recuperación contra el contrato permitido de QA.

El worker fiscal respeta al menos 3600 segundos entre reintentos y registra eventos de dominio. Un fallo al registrar el evento no debe bloquear la operación fiscal principal.

### 17.6 SMTP

- Solo contenedores con egreso autorizado conocen credenciales SMTP.
- Mailer usa outbox; Billing puede usar configuración de sucursal cifrada.
- Registrar message ID, estado y error sanitizado; nunca body completo con secretos.
- El `Message-ID` debe usar un dominio público del remitente; Mailer deriva por defecto el dominio de `MAIL_FROM_ADDRESS` y permite `MAIL_MESSAGE_ID_DOMAIN` como override validado. Nunca deje el hostname efímero del contenedor.
- Probar DNS, TLS, auth, remitente, rebotes y rate limits del proveedor.
- `sent` confirma que el SMTP aceptó el mensaje, no que el proveedor destino lo colocó en bandeja. Revise rebotes, spam y trazabilidad del relay antes de clasificarlo como entregado al usuario.
- Un timeout después de enviar puede ser `delivery_unknown`; no reenvíe ciegamente.

### 17.7 Google Wallet

- No incluir token secreto de cliente en `linksModuleData`.
- El link público usa account ID no secreto, luego OTP por correo y portal temporal.
- Los tokens del portal son aleatorios, hasheados, tenantizados y expiran.
- El worker Wallet necesita solo credencial/egreso/DB de Loyalty.
- Auditar campañas, fallos y reintentos sin exponer service account.

### 17.8 Object storage/CDN

- Backend genera claves y decide visibilidad.
- Frontend recibe URL pública o acceso temporal, nunca credenciales.
- Health/canary debe probar put/get/hash/delete en un prefijo de diagnóstico aislado.
- Ante caída, no cambiar silenciosamente a storage local en producción HA: declarar degradación y preservar consistencia.

## 18. Backups, restore y recuperación

### 18.1 Alcances

| Opción | Contenido |
|---|---|
| `--all` | Bases gestionadas: `dashboard`, `ecommerce`, `facturacion`, `loyalty` |
| `--cluster` | Cluster completo, incluida `postgres` y bases admin/legacy |
| `--database X` | Una base lógica |
| `--databases A,B` | Selección de bases |

Los backups parciales tienen manifest y restauran solo su selección. No actualizan `latest.sql.enc`.

### 18.2 Crear backup cifrado

```bash
cd /home/admincenter/contenedores/basesdedatos

./scripts/backup-and-stop.sh --list-databases
./scripts/backup-and-stop.sh --all
./scripts/backup-and-stop.sh --cluster
./scripts/backup-and-stop.sh --database loyalty
./scripts/backup-and-stop.sh --databases ecommerce,facturacion
```

La passphrase se pide y confirma. Un backup nuevo exige clave robusta. El nombre es neutral:

```text
backup-YYYYMMDDTHHMMSSZ.sql.enc
```

No codifica el ambiente. El ambiente activo define el origen/destino, no el nombre del archivo.

### 18.3 Transferencia entre ambientes

En origen:

```bash
cd /home/admincenter/contenedores/basesdedatos
./scripts/transfer-db.sh export --label entrega --all
./scripts/transfer-db.sh export --label loyalty --database loyalty
```

Transfiera el paquete completo: `.sql.enc`, `.manifest`, `.sha256` y `.bundle.sha256` si existe. La passphrase viaja por un canal diferente.

En destino:

```bash
./scripts/transfer-db.sh restore --yes
```

Sin archivo, selecciona el paquete real más reciente con manifest en `git-transfer/` o `backups/`.

### 18.4 Restore

```bash
cd /home/admincenter/contenedores/basesdedatos

./scripts/restore-from-backup.sh --list
./scripts/restore-from-backup.sh backups/<ARCHIVO-REAL>.sql.enc --yes
./scripts/restore-from-backup.sh --yes
```

`--yes` solo salta confirmación destructiva. Siempre se necesita la passphrase del backup origen.

Antes:

1. Confirmar ambiente y directorio destino.
2. Verificar hash/manifest/bundle.
3. Guardar backup actual del destino.
4. Confirmar alcance completo o parcial.
5. Identificar keyrings/certificados/object storage que la data restaurada referencia.
6. Definir ventana y rollback.

Después:

```bash
cd /home/admincenter/contenedores
RUN_DB_SETUP=1 ./scripts/deploy.sh backend
./scripts/deploy.sh frontend
./scripts/deploy.sh dashboard
./scripts/deploy.sh gateway
./scripts/check-container-connectivity.sh qa
./scripts/check-module-databases.sh
```

Un pase de base entre QA y produccion siempre se trata como restore de un
esquema potencialmente anterior: el primer deploy de backend debe llevar
`RUN_DB_SETUP=1`. Un deploy ordinario posterior no lo necesita. Si el
bootstrap detecta filas legacy sin `tenant_id`, se detiene antes de asignarlas;
el operador debe validar el owner y repetir solo esa ejecucion con
`ECOMMERCE_LEGACY_TENANT_ID=<slug>` y/o
`BILLING_LEGACY_TENANT_ID=<slug>`. Esos fallbacks son one-shot: no se guardan
en `.env` ni se infieren automaticamente, especialmente en produccion.

La rotacion de credenciales es un flujo separado. No se deben rotar tokens de
proxy ni la credencial DB para corregir un catalogo ausente. Primero comprobar
el estado de `backend-api`/`backend-http`, el preflight RLS y el contrato
publico APISIX; una desincronizacion de token produce rechazo de autenticacion,
mientras un upstream backend apagado produce HTTP 503.

### 18.5 Restore drill aislado

```bash
cd /home/admincenter/contenedores/basesdedatos

exec 3<entorno/.secrets/backup.passphrase
BACKUP_PASSPHRASE_FD=3 \
  ./scripts/run-isolated-restore-drill.sh backups/<BACKUP-REAL>.sql.enc
exec 3<&-
```

El archivo de passphrase debe ser regular, propiedad del operador y modo `0400`/`0600`. El drill:

- usa PostgreSQL 18 efímero;
- crea red interna exclusiva;
- usa tmpfs y no publica puertos;
- valida las cuatro bases y tablas mínimas;
- comprueba que QA no cambió;
- elimina contenedor/red/temporales;
- genera receipt en `reports/`.

### 18.6 Política de recuperación

Defina por dominio:

- RPO: cuánto dato se puede perder;
- RTO: cuánto puede tardar el servicio;
- frecuencia y retención;
- ubicación externa y failure domain;
- cifrado/passphrase/keyring;
- dueño de ejecutar y aprobar restore;
- orden de dependencias;
- prueba periódica y evidencia.

En producción HA también se necesita WAL/PITR, replica en otro failure domain y restore externo reciente. Un archivo local junto al servidor no es una estrategia de desastre.

### 18.7 Qué no respalda automáticamente la DB

Inventariar y respaldar por su mecanismo:

- certificados TLS y configuración ACME;
- keyrings/llaves necesarios para descifrar secretos;
- certificados `.p12` y artefactos Billing;
- object storage y lifecycle/versiones;
- configuración APISIX/etcd o su fuente regenerable;
- `.env`/secret references, no valores en Git;
- receipts, runbooks y código desplegado.

## 19. Observabilidad, rendimiento y capacidad

### 19.1 Semántica de probes

| Probe | Pregunta | Debe consultar dependencias profundas |
|---|---|---|
| Liveness | ¿El proceso responde y no está bloqueado? | No |
| Readiness | ¿Puede atender tráfico correctamente? | Sí, con timeout acotado |
| Health/diagnóstico | ¿Cuál es el estado resumido? | Según contrato |

Endpoints:

| Componente | Endpoints |
|---|---|
| Backend | `/api/livez`, `/api/readyz`, `/api/health` |
| Next.js | `/livez`, `/readyz`, `/healthz` |
| Dashboard | `/livez`, `/readyz`, `/health` |
| Billing/Loyalty | health público dedicado por su prefijo |

No haga que liveness consulte SRI/SMTP/DB pesada: una dependencia caída no debe provocar restart infinito de un proceso sano.

### 19.2 Validación pública QA

```bash
CA=gatewayapisix/entorno/certs/local-ca.crt
IP=192.168.100.229

curl --fail --silent --show-error \
  --cacert "$CA" \
  --resolve paramascotasec.com:443:$IP \
  https://paramascotasec.com/paramascotasec/api/livez

curl --fail --silent --show-error \
  --cacert "$CA" \
  --resolve paramascotasec.com:443:$IP \
  https://paramascotasec.com/paramascotasec/api/readyz
```

Si liveness pasa y readiness falla, investigue dependencia/configuración; no reinicie el proceso repetidamente.

### 19.3 Logs y correlación

Cada petición debe conservar un `X-Request-ID`/request ID desde el edge hasta backend y efectos. Registrar como mínimo:

- timestamp UTC;
- nivel/evento/código estable;
- request/correlation ID;
- tenant sanitizado;
- módulo/operación;
- status, duración y upstream;
- actor ID hasheado/estable cuando sea necesario;
- intento/worker/idempotencia sin secreto.

Nunca registrar Authorization, cookies, API keys, passwords, OTP, XML completo con datos, `.p12`, claves privadas o body indiscriminado.

Comandos:

```bash
docker logs --since 15m --tail 300 apisix-gateway
docker logs --since 15m --tail 300 backend-http
docker logs --since 15m --tail 300 backend-api
docker logs --since 15m --tail 300 dashboard
docker logs --since 15m --tail 300 webparamascotas
```

Filtre por request ID/código, no por datos personales. Si el nombre no existe, obténgalo con `docker ps` en vez de asumir.

### 19.4 PHP-FPM

```bash
docker exec backend-http \
  wget -qO- http://127.0.0.1:8080/internal/fpm-status
```

Observe procesos active/idle, max active, max children reached, slow requests y cola. `max children reached > 0` exige revisar capacidad, latencia DB/externa y sizing antes de aumentar procesos a ciegas.

### 19.5 Métricas y SLO

Benchmark corto:

```bash
cd /home/admincenter/contenedores/backend

RESOLVE_IP=192.168.100.229 \
REQUESTS=50 \
CONCURRENCY=10 \
./scripts/benchmark-api.sh
```

Snapshot Prometheus:

```bash
RESOLVE_IP=192.168.100.229 \
OUTPUT_FILE=/tmp/paramascotas-runtime.prom \
./scripts/collect_runtime_metrics.sh
```

SLO:

```bash
./scripts/check_runtime_slo.sh --preflight

RESOLVE_IP=192.168.100.229 \
./scripts/check_runtime_slo.sh
```

La evidencia debe incluir gateway, backend, DB, PHP-FPM, workers y frontend, no solo un `curl` exitoso.

### 19.6 Carga sostenida

```bash
cd /home/admincenter/contenedores/backend

OUTPUT_DIR=/ruta/durable/load-$(date -u +%Y%m%dT%H%M%SZ) \
RESOLVE_IP=192.168.100.229 \
DURATION_SECONDS=600 \
CONCURRENCY=8 \
./scripts/run_sustained_mixed_load.sh
```

Evidencia oficial mínima vigente:

- ventana de 600 segundos;
- concurrencia 8;
- al menos 3000 requests;
- éxito >= 99.9 %;
- p95 <= 1 segundo;
- p99 <= 2 segundos;
- métricas completas y manifest verificable.

`ALLOW_SHORT_TEST=true` sirve para desarrollo, no para atestación. Guarde evidencia en almacenamiento durable; no solo `/tmp`.

### 19.7 Scorecard de arquitectura

```bash
cd /home/admincenter/contenedores
scripts/check-architecture-scorecard.sh --preflight
scripts/check-architecture-scorecard.sh qa
```

Evidencia vigente:

```text
reports/architecture-scorecard-qa.json
reports/load/evidence-20260717T030708Z/manifest.json
reports/backup-restore-drill-20260716T174946Z.json
```

No edite receipts. Verifique sus checksums y regenérelos ejecutando el gate.

### 19.8 Alertas mínimas recomendadas

- disponibilidad/error rate/latencia por host y ruta;
- expiración TLS y fallo de renovación;
- readiness DB/storage/worker;
- conexiones, locks, espacio, WAL/replication lag;
- PHP-FPM saturation;
- outbox backlog, edad máxima, retries, DLQ y delivery_unknown;
- login lockouts, MFA/recovery, 401/403/429 anómalos;
- errores SRI/SMTP/Wallet y certificados próximos a expirar;
- backup faltante, checksum inválido o restore drill vencido;
- tenant `pending_*`/error durante demasiado tiempo;
- object storage canary y capacidad de volumen local.

Una alerta necesita owner, severidad, umbral, runbook, ventana y criterio de cierre.

### 19.9 Capacity planning

Revise al menos mensualmente y antes de campañas:

- RPS, p95/p99, error rate y payload size;
- CPU/RAM/IO por contenedor;
- FPM workers y conexiones DB;
- tablas/índices más grandes y consultas lentas;
- almacenamiento, crecimiento de uploads/XML/RIDE/WAL;
- backlog y tasa de drenaje de workers;
- límites SRI/SMTP/Wallet/S3;
- caché Next.js/CDN y cardinalidad por tenant.

Escalar réplicas sin resolver locks, DB o contador de rate-limit compartido puede empeorar el sistema.

## 20. Soporte y diagnóstico por síntoma

### 20.1 Secuencia universal

1. Registrar hora, host, tenant, usuario/surface, URL/método, request ID y síntoma.
2. Confirmar impacto: un usuario, un tenant, un módulo o todo el sistema.
3. Preservar status/body sanitizado y logs correlacionados.
4. Verificar edge -> frontend/backend -> owner -> DB/worker -> integración.
5. Cambiar una sola causa probable.
6. Validar por APISIX con el caso original y un control negativo.
7. Documentar causa, corrección, evidencia y prevención.

Inventario inicial:

```bash
cd /home/admincenter/contenedores
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
./scripts/check-container-connectivity.sh qa
```

`./scripts/check-paramascotas.sh` es integral, pero no es estrictamente read-only: ejecuta ejercicios controlados que crean y limpian fixtures. Úselo cuando el entorno permite esa verificación.

### 20.2 Matriz rápida

| Síntoma/status | Capa probable | Comprobación | Acción segura |
|---|---|---|---|
| DNS no resuelve | DNS/hosts | `getent hosts <host>` o `curl --resolve` | Corregir DNS/hosts; no cambiar código |
| Error TLS/SAN | Gateway/certificado | `openssl s_client`/script TLS | Reconciliar certificado; no usar `-k` como solución |
| 404 API registrada | APISIX/contrato | route registries + gateway logs | Backend deploy, luego gateway deploy |
| 404 host/tenant | Registro/reconciliación | tenant state/receipt/SNI | Resolver DNS y ejecutar reconciler |
| 401 | Sesión/API key | surface, cookie/header, expiración, revocación | Renovar/login/rotar; no relajar auth |
| 403 | RBAC/entitlement/IP/CSRF-origin | contexto tenant, permiso, módulo, allowlist | Corregir grant/config exacto |
| 409 | Estado/idempotencia/conflicto | `error.code`, estado actual | Releer; no repetir mutación ciegamente |
| 412 | ETag obsoleto | ETag/revisión tenant | GET y decidir sobre nueva revisión |
| 429 | Edge/backend lockout | rate profile, IP, Retry-After | Backoff; corregir cliente o capacidad |
| 5xx | Backend/dependencia | request ID + logs + readiness | Aislar módulo/dependencia, rollback si regresión |
| UI carga pero API falla | Catálogo/gateway/auth | Network + endpoint alias + APISIX | Registrar endpoint, no proxy genérico |
| Datos de otro tenant | Incidente crítico | preservar evidencia, suspender acceso | Revocar, aislar, activar respuesta a incidente |
| Worker atrasado | outbox/egreso/DB | `--metrics`, edad y health | Resolver dependencia; requeue con aprobación |
| SRI no autoriza | Billing/SRI/certificado | ambiente, XML, firma, estado, logs | Corregir causa; respetar retry/idempotencia |
| Correo no llega | Mailer/SMTP | superficie de identidad, outbox, delivery log, Message-ID, SPF/DKIM/DMARC y provider | Distinguir cuenta inexistente, `failed`, aceptación SMTP y entrega real; revisar spam/rebotes |
| Imagen rota/upload falla | Storage/auth | driver, scope, MIME, canary | Corregir storage/permiso; no exponer bucket |
| Lento | Gateway/FPM/DB/externo | p95/p99, FPM, métricas, query | Corregir cuello medido; no escalar a ciegas |

### 20.3 API no registrada

Códigos edge útiles:

```text
GATEWAY_API_ROUTE_NOT_REGISTERED
GATEWAY_DASHBOARD_API_ROUTE_NOT_REGISTERED
GATEWAY_API_TENANT_MISMATCH
GATEWAY_BILLING_AUTH_REQUIRED
GATEWAY_LOYALTY_METHOD_NOT_ALLOWED
GATEWAY_LOYALTY_INCOMPLETE_ROUTE
TENANT_EDGE_PROVISIONING_INCOMPLETE
GATEWAY_CROSS_ORIGIN_FORBIDDEN
```

Diagnóstico:

```bash
php backend/scripts/check_modular_routes.php
php backend/scripts/check_openapi_contract.php
node dashboard/tools/check-dashboard-api-contracts.mjs

./scripts/deploy.sh backend
./scripts/deploy.sh gateway
```

No añada un wildcard Nginx/Angular para “hacerla pasar”. Eso elimina el fail-closed.

### 20.4 Contratos frontend desalineados

```bash
cd /home/admincenter/contenedores/dashboard
npm run type:check
npm run arch:check
npm run module:check

cd ../webparamascotas/app
npm run capabilities:check
npm run api:contracts:check
```

Si la pantalla `/api-catalog` muestra un draft pero el endpoint no existe en source, el draft no está versionado/activo.

### 20.5 Tenant pendiente o dominio caído

```bash
cd /home/admincenter/contenedores/gatewayapisix
./scripts/check-tenant-reconciler.sh
./scripts/reconcile-tenants.sh
```

Revise DNS, host collision, SAN/SNI, estado `pending_gateway|pending_dns|error`, receipt y eventos. No marque manualmente `ready` sin receipt válido.

### 20.6 DB o RLS

```bash
cd /home/admincenter/contenedores
./scripts/check-module-databases.sh
./basesdedatos/scripts/tenant-isolation.sh --check
./basesdedatos/scripts/check-tenant-rls-negative.sh
./basesdedatos/scripts/check-worker-capabilities-negative.sh
```

Errores comunes: TenantContext no resuelto, conexión al owner incorrecto, tabla nueva fuera del inventario RLS, rol worker sin grant o pooling incompatible. No desactive FORCE RLS.

### 20.7 Dashboard no abre

1. Probar TLS/host y `/livez`/`readyz` por APISIX.
2. Verificar contenedor y logs Dashboard/APISIX.
3. Revisar `dashboard/.env` con `npm run env:print` sin revelar secretos.
4. Confirmar `base href="/dashboard/"`, dominio principal/alias y token de proxy.
5. Verificar que las APIs no están siendo capturadas por el shell.

```bash
cd /home/admincenter/contenedores/dashboard
npm run env:check
npm run runtime:check
npm run docker:health
```

### 20.8 Ecommerce inconsistente o catálogo vacío

- Verificar catálogo público por APISIX.
- Confirmar tenant y DB `ecommerce`.
- Ejecutar capabilities/API/channel checks.
- Revisar caché/SSR y versión desplegada.
- No sembrar demo sobre datos reales; `SEED_QA_CATALOG=1` solo en QA vacío y explícito.

### 20.9 Incidente cross-tenant

Severidad crítica:

1. No borrar logs ni “corregir” filas primero.
2. Revocar/suspender la superficie afectada y limitar tráfico.
3. Preservar request IDs, tokens hasheados, actor, hosts, queries y timestamps.
4. Ejecutar pruebas negativas sin ampliar exposición.
5. Determinar capa: cache, host, token, acceso, SQL/RLS, storage o worker.
6. Corregir, restaurar/reconciliar datos, rotar credencial si aplica.
7. Evaluar notificación legal/contractual y alcance de datos.
8. Añadir prueba regresiva y postmortem.

### 20.10 Reinicio como último recurso

Un restart puede borrar síntomas y no corrige contratos, datos ni credenciales. Si es necesario:

- capture logs/estado primero;
- redepliegue solo el componente afectado con el script canónico;
- valide readiness y caso original;
- no reinicie DB durante escritura sin backup/ventana.

## 21. Pruebas, entrega y rollback de cambios

### 21.1 Antes de cambiar

1. Identificar repos afectados; la raíz no es Git.
2. Revisar cambios existentes y no sobrescribir trabajo ajeno.
3. Definir owner, alcance, tenant/ambiente y consumidores.
4. Tomar backup si toca esquema/datos/secretos.
5. Definir compatibilidad hacia atrás y orden de deploy.
6. Definir métricas de éxito, pruebas negativas y rollback.
7. Evitar mezclar refactor, migración y feature sin necesidad.

Estado por repositorio:

```bash
git -C webparamascotas status --short
git -C dashboard status --short
git -C backend status --short
git -C gatewayapisix status --short
git -C basesdedatos status --short
```

### 21.2 Pirámide de validación

1. Sintaxis/tipos/lint.
2. Unit tests de dominio y adapters.
3. Contrato de API/OpenAPI/capabilities.
4. DB schema/RLS/roles y pruebas negativas.
5. Integración entre módulo/worker/proveedor fake.
6. E2E por APISIX con tenant real de QA.
7. Performance/carga si cambia ruta crítica.
8. Backup/restore si cambia persistencia.
9. Scorecard si cambia arquitectura o release mayor.

### 21.3 Checks por componente

Backend:

```bash
cd /home/admincenter/contenedores/backend
php scripts/check_modular_routes.php
php scripts/check_openapi_contract.php
php scripts/check_openapi_contract.php --self-test
./scripts/check_operational_runtime.sh
```

Dashboard:

```bash
cd /home/admincenter/contenedores/dashboard
npm run verify
```

Next.js:

```bash
cd /home/admincenter/contenedores/webparamascotas/app
npm run test
npm run build
```

DB/gateway/integral:

```bash
cd /home/admincenter/contenedores
./scripts/check-module-databases.sh
./basesdedatos/scripts/check-secret-transport.sh
gatewayapisix/scripts/check-apisix-security.sh qa
./scripts/check-container-connectivity.sh qa
./scripts/check-paramascotas.sh
```

Ejecute además tests específicos del módulo tocado. No afirme que “todo pasó” si omitió un check por falta de dependencia; registre `SKIP`/bloqueo y riesgo.

### 21.4 Orden compatible de entrega

Para una API aditiva consumida por UI:

```text
1. DB compatible (si aplica)
2. Backend que soporta contrato viejo + nuevo
3. Workers compatibles
4. Frontend/Dashboard consumidor
5. Gateway que publica el nuevo contrato
6. Verificación y observación
7. Retiro posterior del contrato viejo
```

No despliegue primero una UI que exige un campo que el backend aún no entrega. Las migraciones expand/contract deben separar agregar, migrar, cortar y retirar.

### 21.5 Release QA

```bash
cd /home/admincenter/contenedores
./deploy.sh
./scripts/check-container-connectivity.sh qa
./scripts/e2e-qa.sh
```

Registrar:

- hashes/commits por repo;
- ambiente y timestamp;
- migraciones y backups;
- checks ejecutados y receipts;
- incidencias/skips;
- operador y aprobador;
- rollback exacto.

### 21.6 Rollback por tipo

| Cambio | Rollback preferido |
|---|---|
| UI Angular/Next | Desplegar imagen/commit anterior compatible |
| Backend aditivo | Imagen anterior si schema sigue compatible |
| Ruta APISIX | Reconciliar fuente anterior; no editar objeto a mano |
| Config/secret | Restaurar versión previa aún válida y redeploy |
| Migración de datos | Script compensatorio probado o restore según alcance |
| RLS/ownership | Restore; no desactivar RLS |
| Tenant/domain | Endpoint de rollback con revisión/receipt |
| Worker | Detener consumidor, preservar outbox y desplegar versión anterior |
| Object storage | Revertir resolver/driver solo si los objetos están reconciliados |

Un rollback de aplicación no revierte automáticamente efectos externos ya aceptados por SRI/SMTP/Wallet. Esos requieren reconciliación/idempotencia y una acción de negocio válida.

### 21.7 Criterios de cierre

- Caso original y happy path pasan por APISIX.
- Pruebas negativas siguen fallando cerradas.
- No hay regresión cross-tenant/surface.
- Logs no contienen secretos.
- Health/readiness y métricas están estables.
- Backlog de workers vuelve a nivel normal.
- Backup/restore/rollback se verificó en proporción al riesgo.
- Contratos, diagramas y manual se actualizaron.

## 22. Operación de producción y alta disponibilidad

### 22.1 Estado real

QA/Compose es deliberadamente **single-host**. La presencia de manifiestos HA o réplicas en un mismo daemon no demuestra disponibilidad ante caída física. La arquitectura QA está validada; HA production necesita infraestructura externa y evidencia runtime.

### 22.2 Topología objetivo

- Load balancer multizona.
- Al menos 2 APISIX en failure domains distintos.
- etcd de 3 nodos.
- Redis compartido/cluster TLS para rate limits.
- Al menos 2 réplicas backend, ecommerce y Dashboard.
- PgBouncer redundante en `pool_mode=session`.
- PostgreSQL primary + standby sync/quorum, WAL/PITR externo.
- Object storage/CDN multizona con KMS, versionado y réplica.
- Métricas/logs/alertamiento externos al host primario.
- Imágenes por digest, rollout con health gates y rollback probado.
- Secret manager externo y NetworkPolicy default-deny.

Contrato e IaC: [`infra/production-ha/README.md`](infra/production-ha/README.md) y [`infra/production-ha/kubernetes/README.md`](infra/production-ha/kubernetes/README.md).

### 22.3 Restricción RLS/PgBouncer

El contexto tenant vive en sesión PostgreSQL. Configuración requerida:

```ini
pool_mode = session
server_reset_query = DISCARD ALL
server_reset_query_always = 1
```

`transaction` y `statement` pooling están prohibidos hasta rediseñar el contexto por transacción y demostrar aislamiento equivalente.

### 22.4 Validación estática

```bash
cd /home/admincenter/contenedores
./scripts/check-production-iac.py
./scripts/check-production-ha-readiness.sh --preflight
gatewayapisix/scripts/check-ha-contract.sh
```

Esto demuestra que la política/IaC es coherente, no que el proveedor existe.

### 22.5 Validación runtime

```bash
./scripts/check-production-ha-readiness.sh \
  --evidence /ruta/privada/production-readiness.env
```

El archivo debe ser `0400/0600` y contener endpoints/evidencia reales de LB, backup/PITR, object storage, snapshot de tenants, admin ingress, observabilidad y despliegue. Los probes deben venir del sistema externo que opera/observa el recurso; un JSON servido por el host primario no cuenta.

Solo un PASS técnico más revisión humana de audit trails puede declarar GO. QA debe producir NO-GO para HA externa.

### 22.6 Drills obligatorios

- caída de un nodo APISIX/backend/frontend;
- pérdida de una zona Redis/etcd;
- failover PostgreSQL y comprobación RLS;
- PITR/restore en otro failure domain;
- pérdida/recuperación de object storage;
- registry tenant fuera de servicio y uso de snapshot HMAC válido;
- certificado próximo a expirar/renovación fallida;
- rollback de despliegue;
- pérdida del sistema de métricas/logs;
- aislamiento/revocación de un tenant comprometido.

Cada drill necesita timestamp, participantes, RTO/RPO medidos, evidencia externa, hallazgos y acciones con dueño/fecha.

### 22.7 Operación 24x7

- Guardia y escalamiento definidos.
- Runbooks accesibles aun si la plataforma cae.
- Backups/llaves separados del failure domain primario.
- Dashboards y alertas con SLO/burn rate.
- Cambios con ventana, aprobación y rollback.
- Revisión periódica de accesos, certificados, dominios, capacidad y proveedores.
- Status público/comunicación de incidentes según contrato.

## 23. Gobierno técnico que también debe administrarse

Una plataforma operable no termina en código y contenedores. Estas áreas deben tener dueño, calendario y evidencia.

### 23.1 Matriz de ownership

Defina nombres/equipos reales para:

| Área | Responsabilidad |
|---|---|
| Plataforma/Identity | tenants, staff, RBAC, sesiones y auditoría |
| Edge/TLS/DNS | APISIX, dominios, certificados, rate limit |
| Ecommerce | catálogo, pedidos, clientes, inventario |
| Billing/SRI | cumplimiento fiscal, certificados y recuperación |
| Loyalty | puntos, premios, fraude, Wallet |
| Data/DBA | schema, RLS, backups, restore, performance |
| SRE/Operaciones | deploy, SLO, incidentes, capacidad y HA |
| Seguridad/Privacidad | accesos, secretos, vulnerabilidades y notificación |
| Producto/Soporte | impacto, comunicación, prioridad y aceptación |

Todo alerta/runbook/cambio necesita owner primario y sustituto.

### 23.2 Gestión de accesos

- Alta/cambio/baja de staff vinculada al ciclo laboral.
- MFA obligatorio para administradores.
- Revisión periódica de roles, platform admins, API keys y CIDR.
- Revocación inmediata al salir o cambiar función.
- Cuenta personal; no compartir usuarios.
- Service accounts sin login humano y con scope/rotación.
- Auditoría de accesos de emergencia y recovery.

### 23.3 Clasificación y retención de datos

Clasifique al menos:

- público: catálogo/assets;
- interno: topología/config no secreta;
- confidencial: clientes, pedidos, finanzas;
- altamente sensible: documentos, credenciales, certificados, tokens, payload fiscal.

Por cada conjunto defina owner, finalidad, ubicación, cifrado, acceso, retención, exportación, borrado/anominización y obligación legal. RLS evita cruce tenant, pero no sustituye privacidad, consentimiento o retención.

### 23.4 Respuesta a incidentes

El plan debe incluir:

1. clasificación SEV y canal fuera de banda;
2. incident commander y responsables técnicos;
3. preservación de evidencia/chain of custody;
4. contención sin destruir data;
5. comunicación interna, cliente y regulatoria;
6. recuperación y validación negativa;
7. postmortem sin culpa y acciones con fecha;
8. simulacro periódico.

Severidades sugeridas:

| Nivel | Ejemplo | Respuesta inicial objetivo |
|---|---|---:|
| SEV-1 | fuga cross-tenant, caída total, emisión fiscal incorrecta masiva | inmediata |
| SEV-2 | tenant/módulo crítico caído, backlog con riesgo comercial | <= 30 min |
| SEV-3 | degradación parcial/workaround disponible | mismo día |
| SEV-4 | consulta, defecto menor o mejora | planificación |

### 23.5 Dependencias, vulnerabilidades y supply chain

- Mantener Node/PHP/APISIX/PostgreSQL e imágenes soportadas.
- Fijar lockfiles e imágenes por digest en producción HA.
- Escanear CVE y secretos sin imprimir hallazgos sensibles.
- Generar/conservar SBOM por release.
- Evaluar licencias y provenance de dependencias.
- Probar upgrades en QA, incluida migración/rollback.
- Eliminar scripts/servicios legacy deshabilitados cuando termine su retención.

Controles disponibles:

```bash
./scripts/scan-container-images.sh
./scripts/scan-all-containers.sh
./scripts/security-baseline.sh
cd dashboard && npm run security:check
```

### 23.6 API lifecycle y catálogo

Mantenga para cada API:

- owner y consumidores;
- versión y estado (`active/testing/deprecated/retired`);
- auth, scopes, tenant y rate limit;
- DTO/errores/idempotencia;
- SLO y dashboards;
- fecha de deprecación/retirada;
- evidencia E2E y cleanup;
- contacto/runbook.

La fuente de verdad es código/registries/OpenAPI. La pantalla `/api-catalog` ayuda a auditar; no reemplaza versionado.

### 23.7 Proveedores externos

Para SRI, SMTP, DNS/CA, Google Wallet, object storage/CDN y observabilidad:

- contrato/SLA y contactos;
- límites/cuotas y costos;
- credenciales y rotación;
- data residency/privacidad;
- sandbox/producción separados;
- health/status externo;
- estrategia de caída, retry y salida del proveedor.

### 23.8 Tiempo, correo y dominios

- Todos los nodos deben sincronizar NTP; JWT, OTP, SRI, TLS y logs dependen del reloj.
- Monitorear expiración de DNS, dominios, certificados y `.p12` SRI.
- Configurar SPF, DKIM, DMARC, rebotes y reputación del remitente.
- Verificar zona horaria de presentación versus timestamps UTC persistidos.

### 23.9 SEO, analítica y consentimiento

El ecommerce expone sitemap y feed de Google; revise [`webparamascotas/SEO-GOOGLE-SETUP.md`](webparamascotas/SEO-GOOGLE-SETUP.md). La analítica de terceros no está integrada actualmente. Antes de añadir GA4/Clarity/Hotjar u otro:

- definir finalidad y owner;
- consentimiento/cookies y privacidad;
- CSP y data sent;
- separación por tenant/ambiente;
- retención y acceso;
- prueba de rendimiento y no bloqueo.

No insertar un script de analítica directamente en producción sin esta revisión.

### 23.10 Continuidad documental

Al cerrar un cambio importante:

1. actualizar `AGENTS.md`;
2. sincronizar `webparamascotas/docs/AI_CONTEXT.md`;
3. actualizar este manual/mapa/diagramas si cambió arquitectura;
4. guardar receipts y checksums;
5. evitar secretos/datos personales;
6. consolidar historial antiguo para que el contexto siga usable.

### 23.11 Hardening y cautelas conocidas

Estas observaciones no invalidan el scorecard QA ya emitido, pero soporte no debe presentarlas como garantías resueltas de producción estricta:

| Prioridad | Observación vigente | Tratamiento recomendado |
|---|---|---|
| Alta | QA es single-host; HA externa no verificada | Provisionar topología externa y pasar readiness + revisión humana |
| Alta | `exposure_profile()` de APISIX clasifica como público todo GET cuyo path empieza `/api/products` | Reemplazar la herencia por allowlist explícita y añadir test de subrutas admin |
| Alta | El check Loyalty exige `Access-Control-Allow-Credentials: true`, pero el perfil generado configura `allow_credential=false`; el check QA ejecutado el 2026-07-17 falla por esa diferencia | Definir contrato deseado; para API key/Bearer sin cookie, normalmente false; alinear código y test |
| Alta | OTP de usuario y recovery MFA tienen persistencia recuperable/en claro en rutas actuales | Migrar a hash/HMAC de un solo uso y rotación segura |
| Media | Sesión admin tiene mínimo/default actual de 12 horas | Revisar política y permitir TTL menor/idle timeout según riesgo |
| Alta | `OBJECT_STORAGE_ENDPOINT` puede aceptar `http://` | Exigir HTTPS y validación de CA en producción |
| Media | Variables S3 directas preceden a `_FILE` | Vaciar directas y añadir gate fail-closed al usar secret files |
| Media | Backup usa CBC/PBKDF2 + checksums no autenticados como un único envelope | Evolucionar a AEAD o firma autenticada de ciphertext + manifest + scope |
| Media | API keys se hashean con SHA-256 directo | Mantener claves aleatorias largas; considerar HMAC con pepper/KMS |
| Media | `JWT_SECRET_PREVIOUS` y claves APISIX anteriores pueden quedar activas | Alertar y retirar al cerrar ventana de rotación |
| Media | Trazabilidad HA actual es principalmente edge, no tracing distribuido E2E | No declarar distributed tracing; instrumentar PHP/Next/Angular si se requiere |

Antes de production GO, convierta las prioridades altas aplicables en tickets con owner, fecha y prueba de aceptación.

## 24. Referencia rápida y glosario

### 24.1 Comandos diarios

```bash
cd /home/admincenter/contenedores

# Deploy completo o por componente
./deploy.sh
./scripts/deploy.sh db
./scripts/deploy.sh backend
./scripts/deploy.sh frontend
./scripts/deploy.sh dashboard
./scripts/deploy.sh gateway

# Estado y salud
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
./scripts/check-container-connectivity.sh qa
./scripts/check-paramascotas.sh

# Seguridad/DB
./scripts/check-env-secrets.sh all
./scripts/check-runtime-secret-boundaries.sh
./scripts/check-module-databases.sh
```

### 24.2 Mapa de archivos esenciales

| Necesidad | Archivo/directorio |
|---|---|
| Contexto canónico | `AGENTS.md` |
| Mapa técnico | `MapaCompleto.md` |
| Este manual | `MANUAL-TECNICO-PLATAFORMA.md` |
| Diagrama | `reports/arquitectura-actual-optimizada-paramascotasec-2026-07-17.svg` |
| Rutas backend | `backend/src/Modules/*/routes.php` |
| Autorización | `backend/src/Modules/IdentityPlatform/Application/TenantAccessService.php` |
| OpenAPI | `backend/src/Support/ModuleOpenApi*.php` |
| DB mapping | `backend/config/module-databases.php` |
| Registro DB | `basesdedatos/config/module-databases.json` |
| RLS | `basesdedatos/scripts/tenant-isolation.sh` |
| Catálogo API Dashboard | `dashboard/src/app/core/modules/dashboard-api.config.ts` |
| Módulos Dashboard | `dashboard/src/app/core/tenant/tenant-module-catalog.ts` |
| Rutas Dashboard | `dashboard/src/app/app-route-sources.ts` |
| Endpoints Next.js | `webparamascotas/app/src/lib/api/endpoints.ts` |
| Capabilities | `webparamascotas/docs/capabilities/*.json` |
| Sincronización edge | `gatewayapisix/scripts/sync-apisix.sh` |
| Tenant reconciler | `gatewayapisix/scripts/reconcile-tenants.sh` |
| Backups/restores | `basesdedatos/scripts/{backup-and-stop,restore-from-backup}.sh` |
| HA production | `infra/production-ha/` |

### 24.3 Códigos HTTP

| Código | Significado operativo |
|---:|---|
| 200/201 | éxito/creación |
| 202 | aceptado/diferido; seguir estado |
| 204 | éxito sin body/preflight |
| 400 | input/estado inválido del request |
| 401 | falta o falla autenticación |
| 403 | autenticado sin autorización/CSRF/origen/IP |
| 404 | recurso/ruta/tenant no visible; fail-closed |
| 405 | método no permitido |
| 409 | conflicto de estado/idempotencia/unicidad |
| 412 | precondición/ETag obsoleto |
| 413 | payload demasiado grande |
| 415 | tipo de contenido no permitido |
| 422 | validación semántica |
| 429 | rate limit/lockout; aplicar backoff |
| 500 | fallo interno sanitizado |
| 502/503/504 | upstream no disponible/no ready/timeout |

Siempre use `error.code` y request ID para diagnóstico; el texto puede cambiar.

### 24.4 Registro mínimo de ticket

```text
Fecha/hora UTC y local:
Ambiente:
Host/tenant/surface:
Usuario/actor sanitizado:
URL + método:
Request ID:
Status + error.code:
Impacto y alcance:
Último cambio conocido:
Evidencia/logs sanitizados:
Checks ejecutados:
Causa:
Acción/rollback:
Validación positiva y negativa:
Owner y seguimiento:
```

### 24.5 Glosario

| Término | Definición |
|---|---|
| APISIX | Gateway y única entrada pública |
| etcd | Store de configuración APISIX, no datos de negocio |
| `platform-core` | Runtime PHP modular único actual |
| Owner | Módulo responsable de regla, escritura y store |
| Tenant | Organización aislada por host/identidad/contexto/RLS |
| Capability | Identificador de operación para inventario/exposición |
| Entitlement | Módulo contratado/habilitado para tenant |
| RBAC | Roles y permisos que autorizan acciones |
| RLS | Row-Level Security de PostgreSQL |
| Surface | Canal de autenticación `dashboard` o `ecommerce` |
| Outbox | Registro transaccional de un efecto que procesa un worker |
| Idempotencia | Repetir una intención no duplica el efecto |
| DLQ | Cola/estado de fallos que requieren intervención |
| SLO | Objetivo medible de disponibilidad/latencia/error |
| RPO/RTO | Pérdida máxima de datos/tiempo máximo de recuperación |
| Receipt | Evidencia inmutable/verificable de un gate o reconciliación |
| CAS/ETag | Control optimista para no pisar una revisión concurrente |
| KEK/DEK | Llave que envuelve / llave que cifra el dato |
| SNI/SAN | Selección TLS por host / hosts válidos del certificado |

### 24.6 Orden de lectura para una persona nueva

1. Este manual, secciones 1 a 8.
2. [`MapaCompleto.md`](MapaCompleto.md).
3. [`AGENTS.md`](AGENTS.md), especialmente reglas operativas vigentes.
4. Documentación del componente que va a tocar.
5. Rutas/manifests/checks ejecutables del código.
6. Un despliegue y diagnóstico supervisado en QA.
7. Un ejercicio de API/pantalla con pruebas negativas.
8. Un backup + restore drill aislado.
9. Un simulacro de incidente tenant/worker antes de dar soporte solo.

### 24.7 Definición de “listo para dar soporte completo”

La persona puede, sin saltarse controles:

- identificar owner y flujo de una petición;
- desplegar/revertir por scripts;
- diagnosticar edge, UI, backend, DB, worker e integración;
- crear API con autorización/OpenAPI/APISIX/consumidor;
- crear pantalla Angular y página Next.js bajo catálogos;
- crear/evolucionar módulo, schema y worker;
- operar tenant, RBAC, dominio y reconciliación;
- consultar datos de forma limitada/auditable;
- ejecutar backup y restore drill;
- responder a incidente y preservar evidencia;
- distinguir QA validada de HA production verificada.

Si falta cualquiera de estas capacidades, el relevo debe seguir acompañado y no recibir acceso de producción total.
