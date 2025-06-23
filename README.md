# CARID - Sistema de Reconocimiento Automático de Matrículas Peruanas

<div align="center">
  <img src="https://img.shields.io/badge/React-18.2.0-61DAFB?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.0.2-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-4.4.5-646CFF?style=for-the-badge&logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.3.3-38B2AC?style=for-the-badge&logo=tailwind-css" alt="TailwindCSS" />
</div>

## 📋 Descripción

CARID es un sistema de reconocimiento automático de matrículas vehiculares peruanas basado en tecnologías de Deep Learning. Utiliza modelos YOLOv8 optimizados para detectar y reconocer matrículas con alta precisión en diferentes condiciones de iluminación y ángulos.

El frontend está desarrollado con React, TypeScript y TailwindCSS, ofreciendo una interfaz moderna y responsive para la interacción con el sistema de reconocimiento.

## ✨ Características Principales

- **Detección Precisa**: YOLOv8-L optimizado para detectar regiones de matrículas peruanas con alta precisión.
- **Reconocimiento de Caracteres**: CNN especializada para identificar cada carácter (36 clases) en formatos ABC-123 y A1B-456.
- **Múltiples Entradas**: Procesamiento de imágenes estáticas, videos y streaming en tiempo real.
- **Adaptable a Condiciones**: Funciona eficazmente en diferentes condiciones de iluminación y ángulos.
- **Interfaz Moderna**: UI intuitiva con diseño responsive y feedback visual en tiempo real.
- **Tiempo de Inferencia**: Aproximadamente 30ms por imagen para detección y reconocimiento.

## 🚀 Modos de Reconocimiento

### 1. Reconocimiento por Imagen

Permite subir imágenes estáticas para detectar y reconocer matrículas vehiculares.

- Formatos soportados: JPG, PNG, WEBP, BMP, TIFF
- Procesamiento instantáneo
- Visualización de resultados con bounding boxes

### 2. Reconocimiento por Video

Procesa archivos de video para análisis frame por frame de matrículas.

- Formatos soportados: MP4, AVI, MOV
- Análisis completo con progreso visual
- Estadísticas de detección por video

### 3. Reconocimiento por Streaming

Conecta una cámara IP o webcam para reconocimiento en tiempo real.

- Compatible con cámaras IP y webcams
- Procesamiento en tiempo real (~30ms)
- Visualización de detecciones en vivo

## 🛠️ Tecnologías Utilizadas

### Frontend
- **React**: Biblioteca para construir interfaces de usuario
- **TypeScript**: Superset tipado de JavaScript
- **Vite**: Herramienta de construcción rápida para desarrollo web
- **TailwindCSS**: Framework CSS utilitario
- **Radix UI**: Componentes accesibles y sin estilos
- **Lucide React**: Iconos SVG limpios y consistentes
- **React Router**: Enrutamiento para aplicaciones React
- **React Query**: Gestión de estado del servidor

### Componentes UI
- Interfaz basada en componentes de Shadcn UI
- Diseño responsivo para todos los dispositivos
- Tema oscuro con gradientes modernos
- Animaciones y transiciones fluidas

## 📁 Estructura del Proyecto

```
├── public/                # Archivos estáticos
├── src/                   # Código fuente
│   ├── components/        # Componentes reutilizables
│   │   └── ui/            # Componentes de interfaz de usuario
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilidades y funciones auxiliares
│   ├── pages/             # Páginas de la aplicación
│   │   ├── Index.tsx              # Página de inicio
│   │   ├── Recognition.tsx        # Selección de método de reconocimiento
│   │   ├── ImageRecognition.tsx   # Reconocimiento por imagen
│   │   ├── VideoRecognition.tsx   # Reconocimiento por video
│   │   ├── StreamingRecognition.tsx # Reconocimiento por streaming
│   │   └── NotFound.tsx           # Página 404
│   ├── App.tsx            # Componente principal y configuración de rutas
│   ├── main.tsx           # Punto de entrada de la aplicación
│   └── index.css          # Estilos globales y variables CSS
├── tailwind.config.ts     # Configuración de TailwindCSS
├── tsconfig.json          # Configuración de TypeScript
├── vite.config.ts         # Configuración de Vite
└── package.json           # Dependencias y scripts
```

## 🔧 Instalación y Uso

### Requisitos Previos
- Node.js (v16 o superior)
- npm o yarn

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/GRUPO-PERCEPCION/carid-frontend.git
cd carid-frontend

# Instalar dependencias
npm install
# o
yarn install

# Iniciar servidor de desarrollo
npm run dev
# o
yarn dev
```

La aplicación estará disponible en `http://localhost:5173`

### Compilación para Producción

```bash
npm run build
# o
yarn build
```

## 📊 Rendimiento

- **Tiempo de inferencia**: ~30ms por imagen
- **Precisión de detección**: >95% en condiciones normales
- **FPS en streaming**: 30+ en hardware moderno

## 🔍 Modelos de IA Utilizados

- **Detector de Placas**: YOLOv8-L personalizado
- **Reconocedor OCR**: YOLOv8-M adaptado para OCR
- **Clases de Caracteres**: 36 (A-Z, 0-9)

## 🌐 Despliegue

Para desplegar este proyecto, puedes utilizar [Lovable](https://lovable.dev/projects/a6b8993e-1b8d-4e36-9524-6be870418e61) y hacer clic en Share -> Publish.

Alternativamente, puedes desplegar la aplicación en cualquier servicio que soporte aplicaciones de React/Vite como Vercel, Netlify o GitHub Pages.

## 🤝 Contribución

Las contribuciones son bienvenidas. Por favor, sigue estos pasos:

1. Haz fork del repositorio
2. Crea una rama para tu característica (`git checkout -b feature/amazing-feature`)
3. Haz commit de tus cambios (`git commit -m 'Add some amazing feature'`)
4. Haz push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia de mis dos huevazos.

---

Desarrollado con ❤️ para el reconocimiento automático de matrículas peruanas.
