# SEO Google Setup ParaMascotasEC

Este archivo cubre las acciones externas que no se pueden completar solo con codigo.

## Estado visto el 6 de mayo de 2026

Search Console mostro:

- 1 URL indexada.
- 98 URLs sin indexar.
- 94 URLs en `Descubierta: actualmente sin indexar`.
- 3 URLs como `Pagina con redireccion`.
- 1 URL como `No se ha encontrado (404)`.
- En la inspeccion de la home: `La URL esta en Google`, rastreo permitido, indexacion permitida, pero `No se ha detectado ningun sitemap de referencia`.

Interpretacion:

- `Descubierta: actualmente sin indexar` normalmente significa que Google conoce la URL, pero todavia no la rastrea o no la considera suficientemente prioritaria. La respuesta es reforzar sitemap, enlaces internos, contenido unico y Merchant Center.
- `Pagina con redireccion` no es un error si la URL antigua redirige a una URL canonica nueva. Sirve para limpiar rutas con query o plantillas antiguas.
- `No se ha encontrado (404)` requiere abrir el detalle en Search Console y copiar la URL exacta. Si esa URL representa un producto/categoria real, se debe redirigir 301; si era basura o demo, puede quedarse 404/noindex.

## Search Console

1. Crear propiedad de dominio para `paramascotasec.com`.
2. Verificar por DNS o usar la variable `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` si prefieres meta tag.
3. Enviar sitemap: `https://paramascotasec.com/sitemap.xml`.
4. Revisar semanalmente:
   - Paginas indexadas.
   - Canonicas elegidas por Google.
   - Errores 404 o redirecciones.
   - Consultas para alimento, perros, gatos, marcas y productos.

## Recuperacion de indexacion

1. Desplegar los cambios SEO en produccion.
2. Abrir `https://paramascotasec.com/sitemap.xml` y confirmar que aparecen:
   - `/tienda`
   - `/tienda/alimento`
   - `/tienda/alimento-perros`
   - `/tienda/alimento-gatos`
   - `/productos/...`
   - `/tienda/marcas/...`
   - `/servicios/...`
   - `/guias/...`
3. En Search Console, enviar o reenviar el sitemap.
4. Inspeccionar y solicitar indexacion para estas URLs iniciales:
   - `https://paramascotasec.com/`
   - `https://paramascotasec.com/tienda`
   - `https://paramascotasec.com/tienda/alimento`
   - `https://paramascotasec.com/tienda/alimento-perros`
   - `https://paramascotasec.com/tienda/alimento-gatos`
   - 5 a 10 productos con stock, buen precio e imagen real.
5. Abrir el informe de paginas no indexadas y pulsar `Validar correccion` para:
   - `Pagina con redireccion`, si las antiguas rutas ya apuntan a URLs limpias.
   - `No se ha encontrado (404)`, despues de decidir si esa URL debe redirigir o quedar eliminada.
6. Esperar el recrawl. Primeras senales suelen tardar de 2 a 6 semanas; terminos competitivos pueden tardar meses.

## Reglas SEO para productos y servicios futuros

- Cada producto publicado con stock genera una URL limpia `/productos/[slug]`.
- Cada producto debe tener nombre claro, marca, categoria, especie, presentacion, descripcion, imagen real, precio y disponibilidad.
- Las categorias comerciales principales usan `/tienda/[categoria]`.
- Las categorias nuevas creadas desde productos publicados pueden generar landing SEO dinamica si tienen productos activos.
- Los servicios comerciales usan `/servicios/[slug]` con title, description, canonical, FAQ, breadcrumb y datos estructurados `Service`.
- Evitar publicar productos duplicados con el mismo nombre sin diferenciar presentacion, peso, sabor, etapa o marca.
- No usar categorias internas como `default`, `demo`, `test`, `template` o nombres administrativos en productos publicados.

## Merchant Center

1. Crear cuenta para Ecuador y reclamar `https://paramascotasec.com`.
2. Configurar politicas de envio, devoluciones, contacto y moneda USD.
3. Crear fuente programada con:
   - URL: `https://paramascotasec.com/feeds/google-products.xml`
   - Frecuencia: diaria.
4. Corregir errores de producto hasta que el feed quede aprobado.

## Business Profile

1. Crear o reclamar el perfil de ParaMascotasEC.
2. Usar categorias relacionadas con tienda de mascotas y tienda de productos para mascotas.
3. Completar telefono, WhatsApp, horario, zona de cobertura, sitio web, fotos reales y publicaciones.
4. Pedir reseñas reales despues de compras entregadas.

## Medicion

Registrar una linea base mensual:

- Impresiones organicas.
- Clics organicos.
- CTR.
- Posicion media por consulta.
- Productos aprobados en Merchant Center.
- Consultas con crecimiento: alimento para perros, alimento para gatos, comida humeda, marcas y SKU/productos.
