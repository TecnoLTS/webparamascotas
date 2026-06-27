# Frontend Principal (`paramascotasec`)

Sitio ecommerce en Next.js.

## Hot local

Para cambios en caliente de UI:

```bash
cd /home/admincenter/contenedores/paramascotasec/app
npm install
npm run dev
```

Eso es solo para trabajo local.
No es el modo correcto del ambiente publicado detras del gateway.

## Deploy del componente

Desde el repo:

```bash
cd /home/admincenter/contenedores/paramascotasec
./scripts/deploy.sh development
./scripts/deploy.sh production
```

Desde la raiz del workspace:

```bash
cd /home/admincenter/contenedores
./scripts/deploy.sh development frontend
./scripts/deploy.sh production frontend
```

En `development`, el deploy correcto usa `FRONTEND_DEV_RUNTIME=stable`.
Eso compila y sirve un runtime estable con `APP_ENV=development`.
`hot`/HMR no debe usarse para validar el ambiente a traves de APISIX.

## Variables y contexto

- El archivo real es `entorno/.env`.
- La plantilla versionada vive en `templates/entorno/.env.example`.
- `BACKEND_URL_INTERNAL=http://paramascotasec-backend-web:8080/api` es el upstream interno canonico.
- `INTERNAL_PROXY_TOKEN` debe coincidir con backend/gateway cuando comparten proxy interno.
- El contenedor no debe exponerse directamente a Internet; el acceso publico correcto entra por `apisix-gateway`.

## Migracion y orden recomendado

En un host nuevo, el orden del workspace es:

```text
DB -> Backend -> Frontend -> Gateway
```

Deploy completo:

```bash
cd /home/admincenter/contenedores
./deploy.sh production
```

## Validacion

```bash
docker exec apisix-gateway sh -lc 'curl -fsS http://paramascotasec-frontend:3000/healthz'
cd /home/admincenter/contenedores/paramascotasec/app
npm run lint
npm run typecheck
```
