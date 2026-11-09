# Requirements Document

## Introduction

Cycora es una aplicación modular de seguimiento del ciclo menstrual escrita en TypeScript. Su arquitectura de dominio (`core/`, `modules/*`, `shared/`) es sólida y se preserva sin cambios. Esta funcionalidad endurece el **tooling y la higiene del proyecto** alrededor del código existente, sin reescribir el dominio.

El diseño aprobado identifica cinco áreas de mejora: (1) una suite de pruebas automatizadas sobre la lógica de cálculo crítica de salud, (2) la declaración completa de dependencias de desarrollo con versiones ancladas para un entorno reproducible, (3) un linter y formateador alineados con el `tsconfig.json` estricto, (4) un `.gitignore` que evite el seguimiento de artefactos generados, y (5) la reducción de la duplicación de lógica entre el frontend y el dominio manteniendo una única fuente de verdad.

Estos requisitos se derivan del diseño y preservan la trazabilidad con sus propiedades de corrección, que referencian los anclajes 1.1, 1.2, 1.3, 2.1, 4.1 y 5.1.

## Glossary

- **Tooling**: Conjunto de herramientas de calidad (pruebas, linter, formateador, control de versiones y gestión de dependencias) que rodea el código fuente sin acoplarse a su lógica interna.
- **Test_Suite**: Componente de pruebas automatizadas basado en Jest con ts-jest que verifica la lógica de cálculo del dominio a través de sus interfaces públicas.
- **CycleCalculatorService**: Servicio del dominio que calcula las fases del ciclo y la predicción de la ventana fértil.
- **DateUtils**: Utilidad del dominio para aritmética de fechas ISO (desplazamiento de días, diferencia en días, detección de fecha pasada).
- **HealthIndicatorsService**: Servicio del dominio que genera indicadores clínicos a partir de síntomas, flujo y método anticonceptivo.
- **Package_Manifest**: Archivo `package.json` que declara scripts y dependencias del proyecto.
- **Linter**: Herramienta de análisis estático (ESLint con parser y plugin de TypeScript).
- **Formatter**: Herramienta de formateo de código (Prettier).
- **Version_Control_Config**: Archivo `.gitignore` que define las exclusiones del repositorio.
- **Domain**: Lógica de negocio contenida en `core/`, `modules/*` y `shared/`, considerada la única fuente de verdad.
- **Frontend**: Capa de presentación en JavaScript plano ubicada en `frontend/`.
- **Fase_Fértil**: Conjunto compuesto por `nextOvulationDate` y `fertileWindow` dentro de la predicción del ciclo.
- **Método_Inhibidor**: Método anticonceptivo que inhibe la ovulación, identificado por el indicador `isOvulationSuppressed`.
- **Longitud_Ciclo**: Número total de días de un ciclo configurado.

## Requirements

### Requirement 1: Suite de pruebas sobre la lógica de cálculo crítica

**User Story:** Como desarrollador del dominio de salud, quiero una suite de pruebas automatizadas sobre la lógica de cálculo del ciclo y la ventana fértil, para proteger decisiones de salud críticas ante cambios futuros.

#### Acceptance Criteria

1. WHEN el `Test_Suite` evalúa un día de ciclo `d` con `1 ≤ d ≤ Longitud_Ciclo` y `21 ≤ Longitud_Ciclo ≤ 35`, THE `CycleCalculatorService` SHALL asignar exactamente una fase a ese día, de modo que la unión de los rangos de día de todas las fases cubra el intervalo `[1, Longitud_Ciclo]` completo sin huecos ni solapes.
2. WHEN el `Test_Suite` evalúa una fecha ISO válida `f` con formato `AAAA-MM-DD` y un entero `n` con `−3650 ≤ n ≤ 3650`, THE `DateUtils` SHALL cumplir que `diffInDays(f, addDays(f, n))` es igual a `n`.
3. WHERE el método anticonceptivo es un `Método_Inhibidor` (equivalente al comportamiento con supresión de ovulación indicada por `isOvulationSuppressed`), THE `CycleCalculatorService` SHALL omitir `nextOvulationDate` y `fertileWindow` de la predicción del ciclo y SHALL no marcar ninguna fase como `Fase_Fértil`.
4. WHEN se ejecuta `npm test`, THE `Test_Suite` SHALL ejecutarse en una sola corrida no interactiva (sin modo watch), terminando con código de salida 0 cuando todas las pruebas pasan y con un código de salida distinto de 0 cuando alguna prueba falla.
5. IF el `Test_Suite` evalúa `DateUtils` con una cadena que no es una fecha ISO válida con formato `AAAA-MM-DD`, THEN THE `DateUtils` SHALL producir un resultado observable que señale la entrada como inválida en lugar de un cálculo de fecha normal.
6. THE `Test_Suite` SHALL cubrir los servicios `CycleCalculatorService`, `DateUtils` y `HealthIndicatorsService` a través de sus interfaces públicas sin modificar la lógica de dominio.
7. THE `Test_Suite` SHALL resolver TypeScript según el `tsconfig.json` estricto existente mediante el preset de ts-jest y el entorno `node`.
8. THE `Test_Suite` SHALL ejecutarse sin acceso a red ni estado externo, usando la base de datos en memoria que ofrece el dominio.

### Requirement 2: Entorno de desarrollo reproducible

**User Story:** Como desarrollador, quiero que todas las dependencias de desarrollo estén declaradas con versiones ancladas, para que `npm install` produzca un entorno reproducible y funcional.

#### Acceptance Criteria

1. WHEN se ejecuta un `npm install` limpio seguido de la invocación de cualquier script declarado (`start`, `build`, `test`, `lint`, `format`), THE `Package_Manifest` SHALL permitir que ese script se invoque y resuelva sus herramientas sin reportar dependencias faltantes.
2. THE `Package_Manifest` SHALL declarar en `devDependencies` toda herramienta referenciada por un script, incluyendo `ts-node`, `jest`, `ts-jest`, `@types/jest`, `typescript`, y las dependencias del `Linter` y el `Formatter`.
3. THE `Package_Manifest` SHALL anclar cada entrada de `devDependencies` a una versión exacta con el formato `MAJOR.MINOR.PATCH`, sin usar los especificadores `^`, `~`, `*`, `x`, `>=`, `<`, rangos con `-`, ni etiquetas como `latest` o `next`.
4. IF una herramienta referenciada por un script no está declarada en `devDependencies` o está declarada con un especificador no exacto, THEN THE `Package_Manifest` SHALL considerarse no conforme con este requisito.
5. THE `Package_Manifest` SHALL declarar los scripts `start`, `build`, `test`, `lint` y `format`.

### Requirement 3: Linter y formateador alineados con el compilador estricto

**User Story:** Como desarrollador, quiero un linter y un formateador configurados y alineados con el `tsconfig.json` estricto, para mantener un estilo consistente y detectar errores estáticos sin contradecir al compilador.

#### Acceptance Criteria

1. WHEN se ejecuta `npm run lint`, THE `Linter` SHALL analizar los archivos TypeScript de `core/`, `modules/`, `shared/` e `index.ts` y terminar sin solicitar entrada del usuario (sin modo interactivo).
2. IF `npm run lint` detecta una o más violaciones de reglas, THEN THE `Linter` SHALL terminar con un código de salida distinto de cero e indicar cada violación con su archivo y número de línea.
3. WHEN `npm run lint` finaliza sin detectar violaciones, THE `Linter` SHALL terminar con código de salida cero.
4. WHEN se ejecuta `npm run format`, THE `Formatter` SHALL formatear los archivos fuente TypeScript de `core/`, `modules/`, `shared/` e `index.ts` y terminar sin solicitar entrada del usuario (sin modo interactivo).
5. THE `Linter` SHALL usar el parser y el plugin de TypeScript, y SHALL evitar reglas que deshabiliten o contradigan las comprobaciones del modo estricto (`strict: true`) del `tsconfig.json` existente.
6. THE `Linter` and THE `Formatter` SHALL excluir `dist/`, `node_modules/` y los directorios de cobertura del análisis y del formateo.

### Requirement 4: Control de versiones higiénico

**User Story:** Como mantenedor del repositorio, quiero un `.gitignore` adecuado, para que los artefactos generados y las dependencias no queden bajo seguimiento de Git.

#### Acceptance Criteria

1. THE `Version_Control_Config` SHALL excluir del seguimiento de Git los artefactos generados (el directorio `dist/` y el directorio de cobertura `coverage/`) y el directorio de dependencias `node_modules/`, de modo que ninguna ruta contenida bajo esos directorios aparezca como archivo sin seguimiento.
2. THE `Version_Control_Config` SHALL excluir del seguimiento de Git los archivos de log (cualquier archivo con extensión `.log` y los directorios de log generados por el gestor de paquetes) y los artefactos locales de editor y sistema operativo (archivos y directorios como `.vscode/`, `.idea/`, `.DS_Store` y `Thumbs.db`) que no son necesarios para reproducir el entorno.
3. THE `Version_Control_Config` SHALL mantener bajo seguimiento el código fuente del `Domain` (`core/`, `modules/*`, `shared/` e `index.ts`) y los archivos de configuración necesarios para reproducir el entorno (`package.json`, `package-lock.json`, `tsconfig.json` y las configuraciones del `Linter` y del `Formatter`).
4. WHEN se consulta el estado de Git en un árbol de trabajo limpio tras generar `dist/`, el directorio de cobertura e instalar `node_modules/`, THE `Version_Control_Config` SHALL producir que esos artefactos y dependencias no aparezcan como cambios sin seguimiento mientras el código fuente y la configuración del entorno sí permanezcan bajo seguimiento.

### Requirement 5: Alineación entre frontend y dominio

**User Story:** Como arquitecto del sistema, quiero reducir la duplicación de lógica entre el frontend y el dominio, para que el dominio sea la única fuente de verdad sin regresión en su lógica ni en sus interfaces públicas.

#### Acceptance Criteria

1. WHEN se introduce la capa de tooling, THE `Domain` SHALL conservar en `core/`, `modules/*` y `shared/` un conjunto de símbolos exportados (nombres y firmas públicas de tipos, clases y funciones) idéntico al conjunto exportado antes de la introducción de la capa de tooling.
2. THE `Frontend` SHALL obtener las reglas de negocio (catálogo de métodos anticonceptivos, umbrales biológicos y cálculo de fases) exclusivamente de los artefactos compilados en `dist/` o de los tipos compartidos del `Domain`, sin contener ninguna definición propia y duplicada de dichas reglas.
3. WHEN se ejecuta `npm run build`, THE `Domain` SHALL compilarse a `dist/` según el `tsconfig.json` existente, finalizando con código de salida 0 y emitiendo los archivos JavaScript y de declaración de tipos correspondientes a `core/**/*`, `modules/**/*`, `shared/**/*` e `index.ts`.
4. IF `npm run build` encuentra un error de compilación, THEN THE `Domain` SHALL finalizar con un código de salida distinto de 0, emitir un mensaje de error que identifique el archivo y la causa, y no sobrescribir los artefactos válidos previos en `dist/` con una compilación parcial.
5. WHEN el `Frontend` reutiliza la lógica del `Domain`, THE `Frontend` SHALL mantener la misma secuencia de pasos de onboarding y el mismo comportamiento de persistencia local (lectura y escritura de los mismos datos en el almacenamiento local del navegador) que presentaba antes de la reutilización.
6. IF los artefactos compilados en `dist/` o los tipos compartidos del `Domain` no están disponibles al iniciar, THEN THE `Frontend` SHALL impedir el uso de las funciones que dependen de las reglas de negocio y mostrar una indicación de error señalando la falta de los artefactos del `Domain`.
