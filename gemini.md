# 📂 AtemiMX – App Docente (v1.2)

## 🎯 Objetivo del Proyecto

Desarrollar una aplicación web integral para docentes de México (Fases 2–6), alineada a la **Nueva Escuela Mexicana (NEM)**, que facilite la planeación, gestión y evaluación. La visión es crear una herramienta útil, fácil de usar y con una fuerte identidad mexicana, que resuelva las necesidades reales del personal docente.

---

## ⚙️ Stack Tecnológico y Arquitectura

- **Tecnología Principal:** HTML, CSS y JavaScript vanilla (ESM).
- **Frameworks:** Ninguno. La directiva es mantener el código sin dependencias externas complejas.
- **Estilo:** CSS con variables para una paleta de colores consistente (“mexicano futurista”).
- **Persistencia:** `localStorage` para guardar la configuración del usuario y los datos de la planeación.
- **Arquitectura:** Aplicación de Página Única (SPA) con una estructura modular.

### Estructura de Archivos Clave

```
/ATEMiX_AppDocente_v1.2
├── index.html         # Punto de entrada de la SPA
├── styles.css         # Hoja de estilos principal
├── GEMINI.md          # Este archivo de contexto
├── assets/
│   └── atemi-iso.svg  # Isotipo y otros recursos
├── data/
│   └── catalogo_nem_v1.json # Catálogo de contenidos y PDAs
├── modules/
│   ├── onboarding.js  # Lógica para la configuración inicial
│   ├── catalogo.js    # Lógica para el visor del catálogo NEM
│   └── planeacion.js  # Lógica para la creación de planeaciones
└── services/
    └── storage.js     # Wrapper para interactuar con localStorage
```

---

## ✅ Funcionalidad Implementada (v1.2)

- **Onboarding:** Formulario para que el docente ingrese sus datos (nombre, escuela, ciclo, fase, grados, campos, ejes).
- **Navegación SPA:** Interfaz de una sola página con menú lateral para cambiar entre vistas (Onboarding, Catálogo, Planeación) sin recargar la página.
- **Visor del Catálogo NEM:** Permite explorar el `catalogo_nem_v1.json` filtrando por Fase, Campo Formativo y Grado.
- **Planeación Mínima:** Los usuarios pueden seleccionar contenidos del catálogo y añadirlos a una planeación simple.
- **Exportación:** La planeación creada se puede exportar como un archivo JSON.
- **Persistencia:** Toda la configuración y la planeación se guardan en el navegador del usuario.

---

## 🔮 Próximos Pasos (Visión v2.0)

- **Libro de Calificaciones (Gradebook):** Gestionar listas de alumnos, actividades con ponderación, calcular promedios y exportar a CSV.
- **Plano de Asientos (Seating Plan):** Crear un mapa del salón de clases, asignar alumnos de forma aleatoria y tomar notas por asiento.
- **Módulo de Rúbricas:** Generar y aplicar rúbricas de evaluación.
- **Diario y Respaldo Docente:** Módulo para registrar incidencias con evidencia multimedia y generar actas, funcionando como un respaldo para el docente.

---

## 🚀 Cómo Ejecutar la Aplicación

Debido al uso de módulos de JavaScript (`import`/`export`), la aplicación **debe ser servida por un servidor web local**.

1.  Abrir una terminal en la carpeta raíz del proyecto (`ATEMiX_AppDocente_v1.2`).
2.  Ejecutar el comando: `npx serve`
3.  Abrir la dirección `http://localhost:3000` (o la que indique el comando) en un navegador web.
