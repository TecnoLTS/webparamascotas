# Frontend Principal (`paramascotasec`) 🌐

Tienda e-commerce en Next.js.

## 🏭 1. Entorno de Producción
El framework de Next se pre-compila y genera archivos estáticos robustos antes de ofrecerse.

```bash
cd /home/admincenter/contenedores/paramascotasec
./scripts/deploy-production.sh
```

---

## 🛠️ 2. Entorno de Desarrollo
Modo virtualizado para testear componentes a nivel visual.

```bash
cd /home/admincenter/contenedores/paramascotasec
./scripts/deploy-development.sh
```

El despliegue de development usa `FRONTEND_DEV_RUNTIME=stable`: compila temporalmente en formato `production`, conserva `APP_ENV=development` y corre detrás del gateway con CSP estricta.

`hot`/HMR no es un modo de despliegue del ambiente detrás del gateway. Si se necesita para editar UI, debe usarse como herramienta local explícita, no como validación de development.

---

## 📌 3. Datos Relevantes y Contexto a Tomar en Cuenta

*   **Configuracion Local:**
    El servicio usa solo `entorno/.env` y `entorno/servidor.env`. Si falta el archivo real, el deploy crea una copia desde `templates/entorno/` y aborta para que completes secretos.
    `templates/entorno/.env.example` y `templates/entorno/servidor.env.example` son las plantillas versionadas; `entorno/.secrets/` guarda secretos runtime generados por el deploy.

*   **Red Docker Oculta (API Backend):**
    Aún cuando el panel interactúa vía web pública, existe una variable **super clave** e invisible al usuario donde Next extrae información directamente de la red sin cifrar cruzando internamente su propio ruteo: `BACKEND_URL_INTERNAL=http://paramascotasec-backend-web:8080/api`.
*   **Token Proxied (Autenticador):**
    Otra llave secreta puente se llama `INTERNAL_PROXY_TOKEN`. Este valor permite a los sistemas evadir logins para llamadas inter-contenedores.
*   **Limites de Acceso Privado (Protección IP):**
    El Panel maestro (Backoffice) rechaza tráfico si defines `PANEL_IP_MODE=custom` o `private`. 
    Si estás tras un firewall y no logras autenticar el backend para probarlo localmente, puedes correr esto para rastrear qué CIDR/IP Docker le ha expuesto al Host:
    ```bash
    ./scripts/recommend-allowlist.sh
    ```
    Te mostrará la IP que debes inyectar en `PANEL_IP_ALLOWLIST`.

## 🔎 4. SEO y Google

La arquitectura publica usa URLs canonicas limpias:

* Catalogo: `https://paramascotasec.com/tienda`
* Categorias: `/tienda/alimento`, `/tienda/alimento-perros`, `/tienda/alimento-gatos`
* Categorias futuras publicadas desde productos: `/tienda/[categoria]`
* Productos: `/productos/[slug]`
* Marcas: `/tienda/marcas/[marca]`
* Servicios: `/servicios/[slug]`
* Feed Merchant: `https://paramascotasec.com/feeds/google-products.xml`

Para Search Console, Merchant Center y Business Profile revisa `SEO-GOOGLE-SETUP.md`.

---

## 🚚 5. Migrar el sistema de un servidor a otro

Antes de mover este frontend a otro servidor, confirma que el cambio incluya toda la arquitectura relacionada. Este contenedor no debe exponerse directamente a Internet; debe quedar detras de `nginx-gateway` en la red Docker `edge`.

### Archivos y secretos

* Copia el codigo actualizado de `paramascotasec`.
* Copia `entorno/.env` y `entorno/servidor.env` del servidor origen o crea uno nuevo desde `templates/entorno/.env.example`.
* No copies `entorno/.secrets/` como artefacto versionado. El deploy lo regenera desde `INTERNAL_PROXY_TOKEN` en `entorno/.env`.
* Verifica que `INTERNAL_PROXY_TOKEN` coincida con el backend si ambos validan el mismo token interno.
* Verifica `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_BACKEND_URL`, `BACKEND_URL_INTERNAL` y la llave publica de Google Maps.
* Restringe `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` por HTTP referrer en Google Cloud.

### Red y gateway

* Debe existir la red Docker externa `edge`. Los scripts la crean si falta.
* `nginx-gateway` debe estar conectado a `edge`.
* El gateway debe apuntar al alias interno `paramascotasec-frontend:3000`.
* El frontend debe verse en `docker ps` como `3000/tcp`, sin publish tipo `127.0.0.1:3000->3000` ni `0.0.0.0:3000->3000`.
* Los unicos puertos publicos esperados para la web son `80` y `443` en `nginx-gateway`.

### Volumen de uploads

El contenedor de produccion corre como UID/GID `10001:10001`. El deploy prepara `app/public/uploads` para que ese usuario pueda guardar imagenes; si alguna vez se corrige manualmente un servidor, usa:

```bash
cd /home/admincenter/contenedores/paramascotasec
sudo chown -R 10001:10001 app/public/uploads
```

No cambies el contenedor para correr como `root` o como un usuario poderoso del host.

### Orden recomendado de despliegue

En el servidor destino, levanta primero las piezas internas y al final el gateway:

```bash
cd /home/admincenter/contenedores/paramascotasec-DB && ./scripts/deploy-production.sh
cd /home/admincenter/contenedores/paramascotasec-backend && ./scripts/deploy-production.sh
cd /home/admincenter/contenedores/paramascotasec && ./scripts/deploy-production.sh
cd /home/admincenter/contenedores/Gateway && ./scripts/deploy-production.sh
```

Si usas el script del workspace completo, confirma que este apuntando al ambiente correcto:

```bash
cd /home/admincenter/contenedores
./deploy-production.sh
```

### Validaciones despues del cambio

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
docker exec nginx-gateway sh -lc 'wget -q -O - http://paramascotasec-frontend:3000/healthz'
cd /home/admincenter/contenedores/paramascotasec && ./scripts/check-api-routes.sh
curl -k -I https://paramascotasec.com/
```

Resultado esperado:

* `paramascotasec-app` healthy.
* `paramascotasec-app` solo muestra `3000/tcp`.
* `nginx-gateway` publica `0.0.0.0:80` y `0.0.0.0:443`.
* La prueba interna desde gateway responde `ok`.
* `https://paramascotasec.com/` responde `200`, no `502`.

### DNS y cambio de IP

Antes de concluir la migracion, confirma que el DNS publico apunte al servidor correcto:

```bash
getent hosts paramascotasec.com
curl -4 -fsS https://ifconfig.me && echo
```

Si el dominio apunta a otro host, puedes tener el nuevo servidor sano y seguir viendo `502` desde el navegador. En ese caso, actualiza DNS, proxy externo o balanceador para que `paramascotasec.com` llegue al servidor donde corre `nginx-gateway`.
