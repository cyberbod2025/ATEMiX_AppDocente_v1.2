# Prompt Maestro para Atemix

Quiero que desarrolles **Atemix --- App Docente NEM**, la evolución
mexicana de iDoceo, con base en:

-   **Ley General de Educación (2024)**\
-   **Plan de Estudios 2022 de la SEP**\
-   **Programas Sintéticos (Fases 2 a 6)**\
-   **Marco de Convivencia Escolar (CDMX, 2023)**\
-   **Comparativa con iDoceo** y archivos previos del proyecto
    (`index_v1.html`, `CONT Y PDA.docx`)

## Objetivo Central

Crear una plataforma integral de **gestión educativa y evaluación**,
enfocada en el docente mexicano, que combine la potencia de iDoceo con
los principios pedagógicos de la **Nueva Escuela Mexicana (NEM)**.

## Funcionalidades Clave (mínimo indispensable)

1.  **Onboarding inicial** (docente, escuela, ciclo, fase, grados,
    grupos, campos, ejes).\
2.  **Visor y Catálogo NEM** con contenidos oficiales, saberes y
    procesos por fase/campo.\
3.  **Planeación anual/mensual/quincenal**, vinculada a Campos, Ejes y
    PDA.\
4.  **Gradebook / Libro de Calificaciones "Mi Progreso NEM"**:
    -   Tipos de notas flexibles (texto, íconos, numéricas).\
    -   Evaluación por criterios, saberes, rúbricas.\
    -   Cálculos configurables.\
    -   Exportación CSV/JSON.\
5.  **Plano de Asientos**: organización de alumnos, selección aleatoria,
    notas rápidas.\
6.  **Agenda y Diario Docente**: registro de clases, recursos, proyectos
    comunitarios.\
7.  **Rúbricas y Coevaluación** con autoevaluación y competencias
    transversales.\
8.  **Insignias digitales "Reconocimientos MX"** como microcredenciales
    culturales y de valores NEM.\
9.  **Convivencia Escolar**:
    -   Carta de derechos/deberes.\
    -   Registro de incidencias, acuerdos, protocolos.\
10. **Exportación e informes** en PDF/CSV/JSON.

## Diseño e Identidad

-   **Colores principales**: Turquesa jade (`#0ea5a5`), guinda/magenta
    (`#e11d48`), dorado sutil (`#e0b100`), gris azulado (`#1e293b`).\
-   **Tipografía**: Inter / Segoe UI (moderno y legible).\
-   **Estilo**: "Mexicano futurista": moderno minimalista, con acentos
    de identidad mexicana (símbolos, íconos, textiles digitales).\
-   **Íconos**: emojis 🇲🇽 o sets vectoriales educativos.\
-   **UX**: Navegación tipo SPA (Single Page App) con **sidebar →
    módulos**.

## Tecnología

-   **HTML/CSS/JS vanilla** (sin frameworks pesados).\
-   **SPA modular** con imports ES6 (`onboarding.js`, `catalogo.js`,
    `planeacion.js`, `storage.js`).\
-   **Persistencia local** en `localStorage`.\
-   **Compatibilidad** con navegadores modernos y posibilidad de
    empaquetar con **PWA / Capacitor** para correr en móvil.

## Cumplimiento NEM y LGE

-   Integrar Campos Formativos, Ejes Articuladores y PDA de los
    **Programas Sintéticos**.\
-   Alinear evaluación y planeación al **Perfil de egreso y fines de la
    LGE**.\
-   Incluir **convivencia escolar** y enfoque en **derechos humanos,
    inclusión, equidad de género, interculturalidad**.

## Entregables esperados

-   Carpeta con estructura:

        /AppDocente
         ├── index.html
         ├── styles.css
         ├── /modules
         │    ├── onboarding.js
         │    ├── catalogo.js
         │    ├── planeacion.js
         │    ├── gradebook.js
         │    ├── seating.js
         │    ├── rubricas.js
         ├── /services
         │    └── storage.js
         ├── /data
         │    └── catalogo_nem.json
         └── /assets
              └── atemi-iso.svg

-   Código funcional, navegable y persistente.\

-   Estilo consistente con la paleta y tipografía definida.\

-   Base para crecer hasta una **versión nacional**.
