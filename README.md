# 🌸 Cycora - Arquitectura Basada en Componentes

Base de código inicial para **Cycora**, plataforma web y móvil para el seguimiento del ciclo menstrual, registro sintomatológico diario y recomendaciones adaptativas según el método anticonceptivo activo.

---

## 🎨 Interfaz de Usuario (Carpeta Independiente: `frontend/`)

La aplicación frontend se encuentra desacoplada en su propia carpeta dedicada [`frontend/`](file:///c:/Users/santi/Documents/Cycora_fis/frontend/):

- **Vista HTML Principal**: [`frontend/index.html`](file:///c:/Users/santi/Documents/Cycora_fis/frontend/index.html)
- **Hoja de Estilos Responsive**: [`frontend/styles.css`](file:///c:/Users/santi/Documents/Cycora_fis/frontend/styles.css)
- **Lógica Reactiva y Persistencia**: [`frontend/app.js`](file:///c:/Users/santi/Documents/Cycora_fis/frontend/app.js)

### 👤 Sin Usuario Predeterminado (Flujo de Onboarding):
- La aplicación **no inicia con un usuario predeterminado**.
- Al abrir Cycora por primera vez, se despliega automáticamente la pantalla modal de **Onboarding / Creación de Usuaria**.
- Permite ingresar:
  - Nombre de la usuaria.
  - Duración estimada de ciclo y sangrado.
  - Selección de categoría y método anticonceptivo (mostrando condicionalmente campos de fechas o de hora de toma).
- En cualquier momento se puede pulsar **"➕ Nueva Usuaria"** (en el header, barra lateral o pestaña de perfil) para registrar un nuevo perfil y reiniciar ciclos de prueba.

### ⚡ Mejoras de Rendimiento Aplicadas por Carpeta:
- **`frontend/`**:
  - Caché de selectores DOM en el inicio para evitar consultas repetitivas al árbol de elementos.
  - Inserción de elementos dinámicos mediante `DocumentFragment`, reduciendo los *reflows* y *repaints* del navegador.
  - Memoization de la adaptación del método anticonceptivo.
  - Aceleración por hardware en CSS (`transform: translateZ(0)` y contención de layout `contain: content`).
- **`core/`**:
  - **`event-bus.ts`**: Despacho directo sin asignaciones de microtareas cuando los suscriptores son sincrónicos; desuscripción en $\mathcal{O}(1)$.
  - **`memory-database.service.ts`**: Índices secundarios compuestos por `userId` y `date` en `Map`, transformando las búsquedas y filtrados de $\mathcal{O}(N)$ a $\mathcal{O}(1)$.
- **`modules/profile/`**:
  - Memoization funcional en `algorithm-adapter.service.ts` con caché inmutable para evitar recrear objetos de comportamiento biológico idénticos.
- **`modules/calendar/`**:
  - `cycle-calculator.service.ts`: Cálculo de predicciones y fechas mediante aritmética de enteros en milisegundos (`86400000 ms/día`).
  - Umbrales biológicos numéricos directos para determinar fases en $\mathcal{O}(1)$ en vez de reconstruir y buscar en arrays de 4 objetos en cada día del bucle.
- **`modules/tracking/`**:
  - `health-indicators.service.ts`: Conversión de síntomas y flujos a `Set` para comprobaciones de pertenencia en $\mathcal{O}(1)$ en lugar de múltiples `.includes()` en arrays.
- **`modules/notifications/`**:
  - `reminder-scheduler.service.ts`: Comprobación previa de alertas pendientes para evitar duplicación y consumo innecesario de memoria.
- **`shared/`**:
  - `date.utils.ts`: Operaciones de desplazamiento de días y diferencias optimizadas por marcas de tiempo en milisegundos.

---

## 📐 Estructura de Directorios

La estructura de directorios sigue una **Arquitectura Basada en Componentes** modular y altamente desacoplada:

```text
Cycora_fis/
│
├── core/                                      # Núcleo del sistema: configuración, eventos y contratos de persistencia
│   ├── config/app.config.ts                   # Parámetros biológicos y constantes de configuración
│   ├── database/database.interface.ts         # Contratos e interfaces de repositorio (DIP)
│   ├── database/memory-database.service.ts    # Implementación en memoria para pruebas y desarrollo
│   ├── events/app-events.ts                   # Definición de eventos de dominio tipados
│   ├── events/event-bus.ts                    # Bus de eventos asíncrono desacoplado (Pub/Sub)
│   ├── types/common.types.ts                  # Tipos base (UUID, ISODate, Result Pattern)
│   └── index.ts
│
├── modules/                                   # Componentes y módulos principales del sistema
│   │
│   ├── profile/                               # MÓDULO 1: Perfil y Método Anticonceptivo (Diagrama 1)
│   │   ├── components/method-selector.component.ts   # UI reactiva para selección de métodos y campos condicionales
│   │   ├── services/algorithm-adapter.service.ts     # Adaptador dinámico del algoritmo del calendario
│   │   ├── services/profile.service.ts               # Orquestador del perfil y reglas de negocio
│   │   ├── models/profile.model.ts                   # Modelos de dominio y configuración anticonceptiva
│   │   └── index.ts
│   │
│   ├── calendar/                              # MÓDULO 2: Calendario y Ciclo Menstrual (Diagrama 2 y 4)
│   │   ├── components/circular-cycle-view.component.ts # Rueda circular de 28 días con 4 fases
│   │   ├── components/linear-timeline-view.component.ts# Vista lineal con indicadores gráficos
│   │   ├── controllers/cycle.controller.ts            # Controlador de inicio/fin de periodo y cálculo de fases
│   │   ├── services/cycle-calculator.service.ts       # Algoritmo de cálculo de fases y ventana fértil
│   │   ├── services/cycle-history.service.ts          # Gestión de historial y recálculo de promedios
│   │   ├── models/calendar.model.ts                   # Entidades de ciclo, fases y predicciones
│   │   └── index.ts
│   │
│   ├── tracking/                              # MÓDULO 3: Registro Diario (Síntomas y Ánimo) (Diagrama 3)
│   │   ├── components/daily-log-form.component.ts     # Formulario de captura de ánimo, síntomas y flujo
│   │   ├── controllers/tracking.controller.ts         # Validación de intensidad y procesamiento de notas
│   │   ├── services/health-indicators.service.ts      # Evaluación clínica de cólicos y banderas de salud
│   │   ├── models/tracking.model.ts                   # Esquema de registros diarios y sintomatología
│   │   └── index.ts
│   │
│   └── notifications/                         # MÓDULO 4: Alertas y Notificaciones (Diagrama 5)
│       ├── components/alert-banner.component.ts       # Visualización interactiva con respuestas (vista/omitida)
│       ├── controllers/notification.controller.ts     # Controlador de ciclo de vida de alertas
│       ├── services/reminder-scheduler.service.ts     # Programador de tomas, aviso previo y vencimientos
│       ├── models/notification.model.ts               # Modelos de notificaciones y estados
│       └── index.ts
│
├── shared/                                    # Elementos reutilizables transversales
│   ├── components/ui-primitives.ts            # Descriptores de componentes UI (botones, badges, modales)
│   ├── utils/date.utils.ts                    # Utilidades de fechas ISO
│   └── index.ts
│
├── index.ts                                   # Demostración ejecutable de comunicación desacoplada
├── package.json
└── tsconfig.json
```

---

## 🔄 Trazabilidad con los Diagramas UML

| Módulo / Componente | Diagramas UML Asociados | Responsabilidad Principal |
| :--- | :--- | :--- |
| **Profile** | Diagrama 1 (Casos de Uso) | Selección de métodos (Hormonales de larga duración, Diarios, Barrera/Ninguno), renderizado de campos condicionales (fecha DIU/implante, hora pastillas) y adaptación del algoritmo. |
| **Calendar** | Diagrama 2, 4 (Casos de Uso), 8, 11, 13, 16 (Secuencia y Comunicación) | Registro de inicio (con ajuste retroactivo y validación de Día 1) y fin de menstruación; cálculo de conteo regresivo; visualización circular de 28 días y lineal. |
| **Tracking** | Diagrama 3 (Casos de Uso), 9, 10, 14, 15 (Secuencia y Comunicación) | Registro de ánimo (Feliz, Ansiosa, Irritable, Triste, Enérgica, Neutral), cólicos (leve, moderada, severa), flujo (manchado, regular, coágulos, no menstrual) y cálculo de indicadores de salud. |
| **Notifications**| Diagrama 5 (Casos de Uso), 12, 17 (Secuencia y Comunicación) | Alertas automáticas para toma diaria, aviso previo al sangrado y vencimiento de método; gestión de respuestas de la usuaria (`vista` u `omitida`). |

---

## 🚀 Desacoplamiento y Patrón de Comunicación

El componente **Tracking** (`DailyLogFormComponent` / `TrackingController`) se comunica con el **CycleController** a través del `EventBus` (`Event-Driven Architecture` / Patrón Mediador):

1. La usuaria registra síntomas y características de flujo en `DailyLogFormComponent`.
2. `TrackingController` procesa la intensidad de cólicos y genera indicadores de salud adaptados al método anticonceptivo activo.
3. Se persiste el registro y se publica el evento `tracking:daily_log_saved`.
4. El `CycleController` y el componente de calendario consumen dicho evento para:
   - Pintar los indicadores visuales en el día correspondiente del calendario circular y lineal.
   - Si se reporta `flujo regular`, se notifica al controlador de ciclo para evaluar si constituye el inicio de un nuevo periodo (Día 1).
