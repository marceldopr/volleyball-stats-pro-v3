# Volleyball Stats Pro V3

Aplicación profesional de estadísticas de voleibol con análisis en vivo y gestión de clubes.

## 🚀 Características

- **Análisis en vivo**: Seguimiento de partidos en tiempo real
- **Gestión de equipos**: Administra equipos y jugadores
- **Estadísticas avanzadas**: Análisis detallado de rendimiento
- **Autenticación**: Sistema de login con Supabase
- **Multi-club**: Soporte para múltiples clubes y roles

## 🛠️ Tecnologías

- **Frontend**: React + TypeScript + Vite
- **Estilos**: TailwindCSS
- **Estado**: Zustand (con persistencia)
- **Routing**: React Router DOM
- **Backend**: Supabase (Auth + Database)
- **Gráficos**: Chart.js + Recharts

## 📦 Instalación

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/marceldopr/volleyball-stats-pro-v3.git
   cd volleyball-stats-pro-v3
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**:
   
   Crea un archivo `.env` en la raíz del proyecto:
   ```bash
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-clave-anon-aqui
   ```

4. **Configurar Supabase**:
   
   Crea la tabla `profiles` en tu proyecto de Supabase:
   ```sql
   CREATE TABLE profiles (
     id UUID PRIMARY KEY REFERENCES auth.users(id),
     club_id UUID NOT NULL,
     full_name TEXT NOT NULL,
     role TEXT CHECK (role IN ('director_tecnic', 'entrenador')),
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

5. **Iniciar el servidor de desarrollo**:
   ```bash
   npm run dev
   ```

   La aplicación estará disponible en `http://localhost:3000`

## 🔑 Autenticación

La aplicación incluye un sistema de autenticación con Supabase:

- **Login**: Navega a `/login` para iniciar sesión
- **Roles**: Soporta dos roles: `director_tecnic` y `entrenador`
- **Persistencia**: La sesión se guarda automáticamente

## 📝 Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run preview` - Previsualiza la build de producción
- `npm run typecheck` - Verifica los tipos de TypeScript
- `npm run lint` - Ejecuta el linter

## 🏗️ Estructura del Proyecto

```
src/
├── components/        # Componentes reutilizables
│   ├── layout/       # Componentes de layout (Sidebar, etc.)
│   └── ...
├── lib/              # Configuración de librerías
│   └── supabaseClient.ts
├── pages/            # Páginas de la aplicación
│   ├── Dashboard.tsx
│   ├── Login.tsx
│   ├── Teams.tsx
│   └── ...
├── stores/           # Stores de Zustand
│   ├── authStore.ts
│   ├── matchStore.ts
│   └── teamStore.ts
└── App.tsx           # Componente principal
```

## 🔐 Roles y Permisos

- **Director Técnico**: Acceso completo a todas las funcionalidades
- **Entrenador**: Acceso a equipos y partidos asignados

## 📄 Licencia

© 2024 Volleyball Stats Pro V3. Desarrollado con ❤️ para la comunidad del voleibol.

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor, abre un issue o pull request para sugerencias o mejoras.
