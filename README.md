# BoardGameGeek Explorer

BoardGameGeek Explorer es una aplicación web moderna y minimalista construida sobre **Next.js 15** para explorar, buscar, filtrar y organizar tu colección personal de juegos de mesa. Toda la navegación se realiza de manera instantánea sobre una base de datos local **SQLite**, sin realizar llamadas externas a BoardGameGeek durante la navegación ordinaria.

---

## 🚀 Características Principales

*   **Arquitectura Simple:** Sin Redis, colas de procesamiento ni dependencias externas pesadas. Base de datos local SQLite administrada con **Prisma ORM**.
*   **Diseño Premium y Minimalista:** Inspirado en las interfaces limpias de Emil Kowalski. Cuenta con espacio en blanco generoso, tipografía elegante, sombras discretas, transiciones fluidas y modo oscuro automático según las preferencias del sistema.
*   **Búsqueda y Filtros Instantáneos:** Buscador por nombre y filtros avanzados combinables por valoración, ranking BGG, año, número de jugadores, duración y complejidad.
*   **Sección de Favoritos:** Guardado inmediato mediante `localStorage`. Soporta paginación y ordenamiento del lado del servidor de tus juegos favoritos.
*   **Soporte Multilingüe y SEO:** Integración nativa de SEO mediante metadatos dinámicos, OpenGraph, sitemap.xml y robots.txt.
*   **Despliegue Fácil con Docker:** Empaquetamiento de producción multi-etapa listo para producción mediante Docker Compose.

---

## 🛠️ Stack Tecnológico

*   **Frontend:** Next.js 15 (App Router), React 19, TypeScript, TailwindCSS, Lucide Icons.
*   **Backend:** Next.js API Routes y React Server Components.
*   **Persistencia:** SQLite y Prisma ORM.
*   **Contenedores:** Docker y Docker Compose.

---

## 🔑 Requisito de API Token para BoardGameGeek

> [!IMPORTANT]
> **Cambio Reciente en la API de BoardGameGeek (Finales de 2025):**  
> BGG ahora requiere autenticación obligatoria para realizar peticiones a su API XML v2. Las peticiones sin token recibirán un error `401 Unauthorized`.
>
> 1.  **Obtén tu API Token:** Regístrate e inicia sesión en [BoardGameGeek](https://boardgamegeek.com) y accede a la sección de [Aplicaciones / BGG Developer](https://boardgamegeek.com/applications) para obtener tu clave de acceso.
> 2.  **Configuración:** Añade esta clave en tu archivo `.env` o en las variables de entorno de Docker Compose como `BGG_API_KEY`.
>
> **💡 Sistema de Respaldo Demo Incorporado:**  
> Si no configuras una API Key o la petición resulta en un error 401, el sistema **activará automáticamente un fallback de demostración** cargando una colección de 12 de los mejores juegos de mesa del mundo (se descargarán sus portadas y se rellenarán las relaciones completas de categorías, mecánicas y diseñadores). ¡La app es 100% funcional inmediatamente tras la instalación!

---

## ⚙️ Instalación y Configuración Local

### 1. Requisitos Previos

*   Node.js (versión 20 o superior recomendada)
*   npm (versión 10 o superior)

### 2. Configurar Variables de Entorno

Copia el archivo de ejemplo para crear tu configuración local:

```bash
cp .env.example .env
```

Edita el archivo `.env` para añadir tu usuario de BGG y tu token:

```env
DATABASE_URL="file:./dev.db"
BGG_USERNAME="tu_usuario_de_bgg"
BGG_API_KEY="tu_bearer_token_de_bgg"
```

### 3. Instalar Dependencias

```bash
npm install --legacy-peer-deps
```

### 4. Inicializar Base de Datos

Ejecuta las migraciones de Prisma para generar las tablas y el cliente local SQLite:

```bash
npx prisma migrate dev --name init
```

### 5. Sincronizar Catálogo

Ejecuta el script de sincronización. Si no hay API Key configurada, se cargará el conjunto de datos de prueba:

```bash
# Sincroniza usando el usuario por defecto de tu archivo .env
npm run sync:bgg

# O especifica un usuario directamente en la terminal:
npm run sync:bgg tu_usuario_de_bgg
```

### 6. Iniciar Servidor de Desarrollo

```bash
npm run dev
```

Abre tu navegador en `http://localhost:3000`.

---

## 🐳 Despliegue con Docker y Docker Compose

La aplicación se puede compilar y arrancar de manera completamente automática utilizando Docker Compose. La base de datos SQLite y las imágenes descargadas se guardarán en directorios locales mapeados en el host para evitar pérdida de datos al apagar el contenedor.

### Arrancar la aplicación

```bash
docker compose up -d
```

Este comando:
1. Descargará y construirá la imagen del contenedor de producción.
2. Aplicará automáticamente las migraciones pendientes sobre la base de datos local SQLite.
3. Expondrá la aplicación en el puerto **3000** (`http://localhost:3000`).

### Detener la aplicación

```bash
docker compose down
```

---

## 📂 Estructura del Proyecto

```text
├── prisma/
│   ├── migrations/          # Historial de migraciones SQL de la base de datos
│   └── schema.prisma        # Definición del modelo de datos de Prisma
├── public/
│   ├── images/
│   │   ├── games/           # Carpeta persistente para carátulas descargadas
│   │   └── placeholder.svg  # Imagen vector de fallback offline
├── scripts/
│   ├── mock-games.json      # Datos de prueba para el fallback offline
│   └── sync-bgg.ts          # CLI para ejecutar sincronizaciones
├── src/
│   ├── app/
│   │   ├── admin/           # Ruta y controles de administración (/admin)
│   │   ├── api/admin/sync/  # Endpoint administrativo para sincronizar vía POST
│   │   ├── game/[id]/       # Ruta de detalle para cada juego (/game/[id])
│   │   ├── globals.css      # Sistema de diseño, fuentes y animaciones premium
│   │   ├── layout.tsx       # Estructura principal y configuración SEO global
│   │   ├── page.tsx         # Página principal (Catálogo y listados)
│   │   ├── robots.ts        # Dynamic robots.txt
│   │   └── sitemap.ts       # Dynamic sitemap.xml
│   ├── components/          # Componentes visuales (Filtros, Cartas, Header, etc.)
│   ├── hooks/               # Custom React Hooks (Favoritos en LocalStorage)
│   └── lib/
│       ├── actions.ts       # Server Actions y consultas a la base de datos
│       ├── db.ts            # Cliente unificado de Prisma
│       └── sync.ts          # Lógica central del importador/sincronizador BGG
├── .env.example             # Variables de entorno de referencia
├── Dockerfile               # Configuración de compilación de producción de Docker
├── docker-compose.yml       # Mapeos de red, variables y volúmenes de producción
├── tailwind.config.ts       # Configuración y extensión de tokens de Tailwind
└── tsconfig.json            # Configuración del compilador de TypeScript
```

---

## ⚡ Administración y Endpoints de API

*   **Endpoint de Sincronización:** En cualquier momento puedes forzar una sincronización mediante una petición `POST` al endpoint:
    `POST http://localhost:3000/api/admin/sync`  
    *(Opcional: puedes pasar el parámetro `?username=nombre` para sincronizar un usuario diferente en segundo plano)*.
*   **Administración Web:** Accede a la sección `/admin` para ver estadísticas de base de datos (nº total de mecánicas, categorías, diseñadores y juegos), vaciar la base de datos de manera limpia, o forzar una actualización desde la interfaz web.
