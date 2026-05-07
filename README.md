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

*(Modos internos vía `FRONTEND_DEV_RUNTIME`):*
*   `hot`: Hot Reload. Inyecta JavaScript. Soporta `FRONTEND_DEV_BUNDLER` como `webpack` o `turbopack`. Costo alto en memoria RAM.
*   `stable`: Compila temporalmente en formato `production` pero bajo `development`. Exige menor RAM y evita quiebres detrás del gateway.

---

## 📌 3. Datos Relevantes y Contexto a Tomar en Cuenta

*   **Red Docker Oculta (API Backend):**
    Aún cuando el panel interactúa vía web pública, existe una variable **super clave** e invisible al usuario donde Next extrae información directamente de la red sin cifrar cruzando internamente su propio ruteo: `BACKEND_URL_INTERNAL=http://paramascotasec-backend-web/api`.
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
