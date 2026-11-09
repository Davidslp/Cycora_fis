/**
 * Cycora - Plataforma de Seguimiento del Ciclo Menstrual
 * Demostración de arquitectura desacoplada basada en componentes
 * y comunicación entre 'Registro Diario', 'Controlador de Ciclo' y 'Notificaciones'.
 */

import { EventBus } from './core/events/event-bus';
import { AppEventType, DailyLogSavedPayload, PeriodStartedPayload } from './core/events/app-events';
import {
  InMemoryProfileRepository,
  InMemoryCycleRepository,
  InMemoryDailyLogRepository,
  InMemoryNotificationRepository
} from './core/database/memory-database.service';

// Módulo 1: Perfil y Método
import {
  ProfileService,
  MethodSelectorComponent,
  ContraceptiveCategory,
  ContraceptiveMethodType
} from './modules/profile';

// Módulo 2: Calendario y Ciclo
import {
  CycleController,
  CircularCycleViewComponent,
  LinearTimelineViewComponent
} from './modules/calendar';

// Módulo 3: Registro Diario
import {
  TrackingController,
  DailyLogFormComponent
} from './modules/tracking';

// Módulo 4: Notificaciones y Alertas
import {
  NotificationController,
  AlertBannerComponent
} from './modules/notifications';

async function bootstrapCycoraDemo() {
  console.log('='.repeat(70));
  console.log('🌸 CYCORA - Inicializando Arquitectura Basada en Componentes');
  console.log('='.repeat(70));

  // 1. Instanciación del bus de eventos global y de la persistencia desacoplada
  const eventBus = EventBus.getInstance();
  const profileRepo = new InMemoryProfileRepository();
  const cycleRepo = new InMemoryCycleRepository();
  const dailyLogRepo = new InMemoryDailyLogRepository();
  const notificationRepo = new InMemoryNotificationRepository();

  // 2. Controladores y Servicios
  const profileService = new ProfileService(profileRepo);
  const cycleController = new CycleController(cycleRepo, profileRepo, dailyLogRepo);
  const trackingController = new TrackingController(dailyLogRepo, profileRepo);
  const notificationController = new NotificationController(notificationRepo, profileRepo);

  // 3. Suscripción desacoplada entre módulos (Observer / Event-Driven):
  // El Controlador de Ciclo escucha cuando se guarda un registro diario para actualizar indicadores
  eventBus.subscribe<DailyLogSavedPayload>(AppEventType.DAILY_LOG_SAVED, async (payload) => {
    console.log(`\n📬 [EVENTO RECIBIDO] ${AppEventType.DAILY_LOG_SAVED}`);
    console.log(`   Usuaria: ${payload.userId} | Fecha: ${payload.date} | Ánimo: ${payload.mood}`);

    if (payload.hasCramps) {
      console.log(`   ⚠️ Cólicos registrados: Intensidad [${payload.crampsSeverity}]`);
    }

    // Si el registro diario indica sangrado regular, el sistema evalúa si inicia o actualiza el ciclo
    if (payload.flowType === 'flujo regular') {
      console.log(`   🩸 Flujo regular detectado: Notificando a CycleController para evaluar Día 1.`);
    }

    if (payload.healthFlags.length > 0) {
      console.log(`   💡 Banderas de salud generadas: ${payload.healthFlags.join(', ')}`);
    }
  });

  // Alertas automáticas cuando se detecta un nuevo periodo
  eventBus.subscribe<PeriodStartedPayload>(AppEventType.PERIOD_STARTED, async (payload) => {
    console.log(`\n📅 [EVENTO RECIBIDO] ${AppEventType.PERIOD_STARTED}`);
    console.log(`   Día 1 del ciclo registrado para fecha ${payload.startDate} (Retroactivo: ${payload.isRetroactive})`);
  });

  // -------------------------------------------------------------------------
  // PASO 1: Módulo de Perfil - Configuración del método anticonceptivo (Diagrama 1)
  // -------------------------------------------------------------------------
  console.log('\n--- PASO 1: Configurar Perfil y Método Anticonceptivo ---');
  const methodSelector = new MethodSelectorComponent();
  methodSelector.selectCategory(ContraceptiveCategory.DAILY);
  methodSelector.selectType(ContraceptiveMethodType.PILLS);
  methodSelector.setTime('21:00'); // Hora de toma diaria
  methodSelector.toggleReminder(true);

  const methodConfig = methodSelector.buildConfiguration();
  const userId = 'user-danna-101';

  const profileResult = await profileService.setupInitialProfile({
    userId,
    name: 'Danna Ruiz',
    averageCycleLength: 28,
    averagePeriodDuration: 5,
    method: methodConfig
  });

  if (!profileResult.success) {
    console.error('Error creando perfil:', profileResult.error);
    return;
  }

  const userProfile = profileResult.data;
  console.log(`✅ Perfil creado con éxito: ${userProfile.name}`);
  console.log(`   Método: ${userProfile.activeMethod.name} (${userProfile.activeMethod.category})`);
  console.log(`   Hora de pastilla: ${userProfile.activeMethod.dailyIntakeTime}`);

  // -------------------------------------------------------------------------
  // PASO 2: Módulo de Calendario - Registrar inicio de menstruación (Diagrama 2 y 8)
  // -------------------------------------------------------------------------
  console.log('\n--- PASO 2: Registrar Inicio de Periodo (Día 1 del Ciclo) ---');
  const periodStartResult = await cycleController.procesarEventoMenstruacion({
    userId,
    startDate: '2026-11-01' // Inicio retroactivo
  });

  if (periodStartResult.success) {
    console.log(`✅ Ciclo #${periodStartResult.data.cycleNumber} iniciado.`);
    console.log(`   Fecha de inicio: ${periodStartResult.data.startDate}`);
    console.log(`   Ajuste retroactivo validado: ${periodStartResult.data.isRetroactiveAdjustment}`);
  }

  // -------------------------------------------------------------------------
  // PASO 3: Módulo de Registro Diario - Captura de Síntomas y Ánimo (Diagramas 3, 9, 14)
  // -------------------------------------------------------------------------
  console.log('\n--- PASO 3: Registro Diario de Síntomas y Ánimo ---');
  const dailyForm = new DailyLogFormComponent('2026-11-02');
  dailyForm.selectMood('ansiosa');
  dailyForm.setCrampsSeverity('severa'); // Dismenorrea severa para evaluar
  dailyForm.togglePhysicalSymptom('dolor_de_cabeza');
  dailyForm.togglePhysicalSymptom('sensibilidad_de_senos');
  dailyForm.toggleFlowCharacteristic('presencia_de_coagulos');
  dailyForm.toggleFlowCharacteristic('flujo_regular');
  dailyForm.setNotes('Primeros días del ciclo, dolor punzante en la zona pélvica.');

  if (dailyForm.validate()) {
    const dto = dailyForm.toDTO(userId);
    const trackingResult = await trackingController.procesarYValidarRegistro(dto);

    if (trackingResult.success) {
      const { record, indicators } = trackingResult.data;
      console.log(`✅ Registro diario guardado para fecha: ${record.date}`);
      console.log(`   Estado de ánimo: ${record.mood}`);
      console.log(`   Cólicos: ${record.cramps?.severity} (Score clínico: ${record.cramps?.score})`);
      console.log(`   Síntomas físicos: ${record.physicalSymptoms.join(', ')}`);
      console.log(`   Flujo: ${record.flowCharacteristics.join(', ')}`);

      console.log('\n   🩺 Indicadores de salud generados por el motor de Cycora:');
      indicators.forEach((ind) => {
        console.log(`   [${ind.level.toUpperCase()}] ${ind.code}: ${ind.message}`);
        console.log(`   Recomendación: ${ind.recommendation}`);
      });
    }
  }

  // -------------------------------------------------------------------------
  // PASO 4: Visualización del Calendario y Conteo Regresivo (Diagrama 4, 11, 16)
  // -------------------------------------------------------------------------
  console.log('\n--- PASO 4: Visualización del Calendario (Circular y Lineal) ---');
  const calendarDataResult = await cycleController.obtenerDatosCalendario(userId);

  if (calendarDataResult.success) {
    const { prediction, circularView, recentDays } = calendarDataResult.data;
    const circularComponent = new CircularCycleViewComponent();
    const circularRender = circularComponent.renderCircularWheel(circularView);

    console.log(`📊 Vista Circular de 28 Días:`);
    console.log(`   ${circularRender.header}`);
    console.log(`   Fase activa: ${circularRender.activePhase.name} (${circularRender.activePhase.hormones})`);
    console.log(`   Conteo regresivo: ${circularRender.centerLabel} ${circularRender.subLabel}`);
    console.log(`   Siguiente periodo proyectado: ${prediction.nextPeriodStartDate}`);
    console.log(`   Ovulación suprimida por método: ${prediction.ovulationSuppressed}`);
    console.log(`   Nota adaptativa: ${prediction.methodRecommendationNote}`);

    const timelineComponent = new LinearTimelineViewComponent();
    const timelineRender = timelineComponent.renderTimeline(recentDays.slice(0, 5));
    console.log('\n   📅 Muestra de Línea de Tiempo (primeros 5 días):');
    timelineRender.forEach((day) => {
      console.log(
        `   Fecha: ${day.date} | ${day.dayLabel || 'Día -'} | Sangrado: ${day.periodDot ? '🩸' : '⚪'} | Síntomas: ${
          day.symptomDot ? '⚠️' : '⚪'
        } ${day.moodEmoji || ''} ${day.crampsBadge ? `[Cólico: ${day.crampsBadge}]` : ''}`
      );
    });
  }

  // -------------------------------------------------------------------------
  // PASO 5: Módulo de Alertas y Notificaciones (Diagrama 5, 12, 17)
  // -------------------------------------------------------------------------
  console.log('\n--- PASO 5: Gestión de Recordatorios e Interacción de la Usuaria ---');
  // 1 & 2: Disparar y programar alertas
  const alertsResult = await notificationController.procesarActivacionRecordatorios(userId);

  if (alertsResult.success && alertsResult.data.length > 0) {
    const alert = alertsResult.data[0];
    console.log(`🔔 Recordatorio programado: "${alert.title}" para ${alert.scheduledFor.toISOString()}`);

    // 3 & 4: Emitir alerta en dispositivo
    await notificationController.emitirAlertaEnDispositivo(alert.id);
    const alertBanner = new AlertBannerComponent();
    const renderedAlert = alertBanner.renderAlert(alert);
    console.log(`   📱 Alerta emitida en pantalla: [${renderedAlert.title}] - ${renderedAlert.message}`);
    console.log(`   Botones disponibles: [${renderedAlert.actions.map((a) => a.label).join(' | ')}]`);

    // 5 & 6 & 7 & 8: Usuaria interactúa seleccionando 'vista'
    const interactionResult = await notificationController.registrarRespuestaAlerta(alert.id, 'vista');
    if (interactionResult.success) {
      console.log(`✅ Respuesta de la usuaria registrada: Alerta marcada como [${interactionResult.data.alert.status}].`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('🎉 Flujo de Arquitectura Cycora ejecutado exitosamente.');
  console.log('='.repeat(70));
}

// Ejecutar demostración si se ejecuta directamente
if (require.main === module) {
  bootstrapCycoraDemo().catch((err) => console.error('Error en bootstrap:', err));
}

export { bootstrapCycoraDemo };
