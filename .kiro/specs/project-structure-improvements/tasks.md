# Implementation Plan: Mejoras de Estructura del Proyecto

## Overview

Este plan traduce el diseño aprobado en una serie de tareas de codificación incrementales que endurecen el **tooling y la higiene del proyecto** sin tocar la lógica de dominio (`core/`, `modules/*`, `shared/`, `index.ts`). El lenguaje de implementación es **TypeScript**, alineado con el `tsconfig.json` estricto existente.

El orden respeta las dependencias del diseño: el Área 2 (dependencias dev ancladas en `package.json`) es prerrequisito del Área 1 (suite Jest + ts-jest) y del Área 3 (ESLint + Prettier), porque tanto las pruebas como el linter necesitan que sus paquetes estén declarados. El Área 4 (`.gitignore`) es independiente. El Área 5 (alineación frontend ↔ dominio) es la de mayor alcance y se aborda de forma incremental al final, preservando onboarding y persistencia local.

Las pruebas basadas en propiedades usan **fast-check** y verifican las Propiedades de Corrección del diseño a través de las interfaces públicas del dominio, con la base de datos en memoria y sin acceso a red.

## Tasks

- [ ] 1. Declarar el entorno de desarrollo reproducible (Área 2)
  - [ ] 1.1 Anclar dependencias de desarrollo y scripts en `package.json`
    - Reemplazar el especificador abierto de `typescript` (`^5.4.0`) por una versión exacta `MAJOR.MINOR.PATCH`
    - Añadir en `devDependencies`, con versiones exactas (sin `^`, `~`, `*`, `x`, `>=`, `<`, rangos ni `latest`/`next`): `ts-node`, `jest`, `ts-jest`, `@types/jest`, `@types/node`, `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, `prettier`, `eslint-config-prettier`, `fast-check`
    - Declarar los scripts `start`, `build`, `test` (una sola corrida, sin watch), `lint` y `format`
    - Mantener `start` con `ts-node index.ts` y `build` con `tsc`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 1.2 Escribir prueba de conformidad del manifiesto
    - Verificar mediante un test que cada herramienta referenciada por un script existe en `devDependencies` y que toda entrada de `devDependencies` usa el formato exacto `MAJOR.MINOR.PATCH`
    - **Valida: Property 4 (Reproducibilidad del entorno)**
    - _Requirements: 2.2, 2.3, 2.4, 2.5_

- [ ] 2. Configurar la suite de pruebas Jest + ts-jest (Área 1)
  - [ ] 2.1 Crear la configuración de Jest con ts-jest
    - Añadir `jest.config.js` (o sección `jest`) con el preset de ts-jest, `testEnvironment: "node"` y patrón `*.test.ts` / `*.spec.ts`
    - Resolver TypeScript según el `tsconfig.json` estricto existente
    - Garantizar que `npm test` corre una sola vez (sin modo watch) y propaga el código de salida
    - _Requirements: 1.4, 1.6, 1.7, 1.8, 2.1_

- [ ] 3. Pruebas de la lógica de cálculo crítica del dominio (Área 1)
  - [ ] 3.1 Escribir pruebas unitarias de `CycleCalculatorService`
    - Validar límites de las fases (menstrual, folicular, ovulatoria, lútea) sobre el ciclo por defecto (28 días / periodo 5) y ciclos de borde (21 y 35 días), vía interfaz pública y base de datos en memoria
    - Validar la supresión de `nextOvulationDate` y `fertileWindow` y la ausencia de fase fértil bajo un método con `isOvulationSuppressed`
    - _Requirements: 1.1, 1.3, 1.6, 1.8_

  - [ ]* 3.2 Escribir prueba de propiedad: cobertura total de fases
    - **Property 1: Cobertura total de fases**
    - Con fast-check, para `1 ≤ d ≤ longitudCiclo` y `21 ≤ longitudCiclo ≤ 35`, verificar que cada día recibe exactamente una fase y que la unión cubre `[1, longitudCiclo]` sin huecos ni solapes
    - **Valida: Requirements 1.1**
    - _Requirements: 1.1, 1.8_

  - [ ]* 3.3 Escribir prueba de propiedad: supresión coherente de la ventana fértil
    - **Property 3: Supresión coherente de la ventana fértil**
    - Con fast-check, para métodos con `isOvulationSuppressed`, verificar que la predicción omite `nextOvulationDate` y `fertileWindow` y no marca fase fértil
    - **Valida: Requirements 1.3**
    - _Requirements: 1.3, 1.8_

  - [ ] 3.4 Escribir pruebas unitarias de `DateUtils`
    - Validar `addDays`, `diffInDays` e `isPastDate` sobre fechas ISO `AAAA-MM-DD`, incluyendo cruces de mes
    - Validar que una cadena que no es una fecha ISO válida produce un resultado observable que la señala como inválida, no un cálculo normal
    - _Requirements: 1.2, 1.5, 1.6, 1.8_

  - [ ]* 3.5 Escribir prueba de propiedad: reversibilidad de la aritmética de fechas
    - **Property 2: Reversibilidad de la aritmética de fechas**
    - Con fast-check, para fecha ISO válida `f` y entero `−3650 ≤ n ≤ 3650`, verificar `diffInDays(f, addDays(f, n)) === n`
    - **Valida: Requirements 1.2**
    - _Requirements: 1.2, 1.8_

  - [ ] 3.6 Escribir pruebas unitarias de `HealthIndicatorsService`
    - Validar los indicadores clínicos esperados ante combinaciones de síntomas, flujo y método anticonceptivo, vía interfaz pública y base de datos en memoria
    - _Requirements: 1.6, 1.8_

- [ ] 4. Checkpoint - Asegurar que la suite de pruebas pasa
  - Asegúrate de que todas las pruebas pasan; pregunta al usuario si surgen dudas.

- [ ] 5. Configurar linter y formateador alineados con el compilador estricto (Área 3)
  - [ ] 5.1 Crear la configuración de ESLint para TypeScript
    - Añadir `.eslintrc(.json/.js)` con `@typescript-eslint/parser` y `@typescript-eslint/eslint-plugin`, alineado con el modo estricto del `tsconfig.json` y sin reglas que contradigan `strict: true` (integrar `eslint-config-prettier`)
    - Cubrir `core/`, `modules/`, `shared/` e `index.ts`; terminar sin modo interactivo, con código distinto de cero ante violaciones (archivo + línea) y cero cuando no las hay
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

  - [ ] 5.2 Crear la configuración de Prettier y las exclusiones compartidas
    - Añadir `.prettierrc` con las preferencias de formato y `.eslintignore` / `.prettierignore` que excluyan `dist/`, `node_modules/` y el directorio de cobertura (`coverage/`)
    - Asegurar que `npm run format` formatea `core/`, `modules/`, `shared/` e `index.ts` sin modo interactivo
    - _Requirements: 3.4, 3.6_

- [ ] 6. Crear el archivo `.gitignore` higiénico (Área 4)
  - [ ] 6.1 Escribir `.gitignore` en la raíz
    - Excluir `node_modules/`, `dist/`, `coverage/`, `*.log` y los directorios de log del gestor de paquetes, y artefactos locales de editor/SO (`.vscode/`, `.idea/`, `.DS_Store`, `Thumbs.db`)
    - No ignorar el código fuente del dominio ni la configuración necesaria (`package.json`, `package-lock.json`, `tsconfig.json`, configuración del linter y del formateador)
    - _Requirements: 4.1, 4.2, 4.3_

- [ ] 7. Alineación incremental entre frontend y dominio (Área 5)
  - [ ] 7.1 Inventariar la lógica de negocio duplicada entre `frontend/app.js` y el dominio
    - Documentar (en comentarios del propio `frontend/app.js` o en un archivo de notas de integración) el catálogo de métodos anticonceptivos, umbrales biológicos y cálculo de fases que el frontend reimplementa, mapeando cada uno a su símbolo exportado del dominio
    - Confirmar que `npm run build` emite `dist/` (JS + `.d.ts`) para `core/**/*`, `modules/**/*`, `shared/**/*` e `index.ts`, código de salida 0, sin sobrescribir artefactos válidos ante error
    - No modificar la lógica ni las firmas públicas del dominio
    - _Requirements: 5.1, 5.3, 5.4_

  - [ ] 7.2 Reutilizar los artefactos del dominio como única fuente de verdad en el frontend
    - Sustituir en `frontend/app.js` las reglas de negocio duplicadas (catálogo de métodos, umbrales biológicos, cálculo de fases) por consumo de los artefactos compilados de `dist/` o de los tipos compartidos del dominio
    - Preservar la misma secuencia de pasos de onboarding y el mismo comportamiento de persistencia local (mismas lecturas/escrituras en `localStorage`)
    - Impedir el uso de funciones que dependen de reglas de negocio y mostrar un error si los artefactos de `dist/` no están disponibles al iniciar
    - _Requirements: 5.2, 5.5, 5.6_

  - [ ]* 7.3 Escribir prueba de no regresión del dominio
    - **Property 6: No regresión del dominio**
    - Verificar que el conjunto de símbolos exportados (nombres y firmas públicas) de `core/`, `modules/*` y `shared/` permanece idéntico al previo a la capa de tooling
    - **Valida: Requirements 5.1**
    - _Requirements: 5.1_

- [ ] 8. Checkpoint final - Asegurar que todo pasa
  - Asegúrate de que `npm test`, `npm run lint`, `npm run format` y `npm run build` se ejecutan sin intervención interactiva tras un `npm install` limpio; pregunta al usuario si surgen dudas.

## Notes

- Las tareas marcadas con `*` son opcionales (pruebas unitarias, de propiedad e integración) y pueden omitirse para un MVP más rápido.
- Cada tarea referencia cláusulas específicas de requisitos para trazabilidad.
- Las pruebas de propiedad usan fast-check y validan las Propiedades de Corrección del diseño (Property 1, 2, 3 y 6).
- Las pruebas de propiedad se colocan junto a su implementación para detectar errores de forma temprana.
- Los checkpoints aseguran validación incremental.
- El Área 5 se trata como mejora incremental y documentada, no como reescritura del frontend, preservando onboarding y persistencia local.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "6.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "5.1", "5.2"] },
    { "id": 2, "tasks": ["3.1", "3.4", "3.6", "7.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.5", "7.2"] },
    { "id": 4, "tasks": ["7.3"] }
  ]
}
```
