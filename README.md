# Frontend Principal (`webparamascotas`)

Sitio ecommerce en Next.js.

## Hot local

Para cambios en caliente de UI:

```bash
cd /home/admincenter/contenedores/webparamascotas/app
npm install
npm run dev
```

Eso es solo para trabajo local.
No es el modo correcto del ambiente publicado detras del gateway.

## Despliegues

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

Despliegue individual desde este repo:

```bash
cd /home/admincenter/contenedores/webparamascotas
./scripts/deploy.sh
```

En QA, el deploy correcto usa `FRONTEND_QA_RUNTIME=stable` con `COMPOSE_PROFILES=qa`.
Eso compila y sirve un runtime estable con `APP_ENV=qa`.
`hot`/HMR no debe usarse para validar el ambiente a traves de APISIX.

## Variables y contexto

- El archivo real es `entorno/.env`.
- La plantilla versionada vive en `templates/entorno/.env.example`.
- `BACKEND_URL_INTERNAL=http://backend-http:8080/api` es el upstream interno canonico.
- `INTERNAL_PROXY_TOKEN` debe coincidir con backend/gateway cuando comparten proxy interno.
- El contenedor no debe exponerse directamente a Internet; el acceso publico correcto entra por `apisix-gateway`.

## Migracion y orden recomendado

En un host nuevo, el orden del workspace es:

```text
DB -> Backend -> Frontend -> gatewayapisix
```

Despliegue completo:

```bash
cd /home/admincenter/contenedores
./deploy.sh
```

## Validacion

```bash
docker exec apisix-gateway sh -lc 'curl -fsS http://webparamascotas:3000/healthz'
cd /home/admincenter/contenedores/webparamascotas/app
npm run lint
npm run typecheck
```
