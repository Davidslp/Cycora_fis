/**
 * CYCORA - FRONTEND APPLICATION
 * Arquitectura Basada en Componentes, Rendimiento Optimizado y Sin Usuario Predeterminado
 */

(function () {
  'use strict';

  // ==========================================================================
  // 1. ESTADO DE LA APLICACIÓN & PERSISTENCIA LOCAL 
  // ==========================================================================
  const STORAGE_KEY = 'CYCORA_USER_APP_DATA_V2';

  // Estado inicial limpio: sin usuario predeterminado
  const INITIAL_STATE = {
    profile: null,        // Se creará mediante el onboarding / registro
    cycles: [],           // Historial de ciclos de la usuaria
    dailyLogs: {},        // Mapa O(1): fecha -> registro diario
    notifications: []     // Lista de alertas programadas
  };

  let state = loadPersistedState();

  function loadPersistedState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.profile) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[Cycora] Error leyendo almacenamiento local:', e);
    }
    return JSON.parse(JSON.stringify(INITIAL_STATE));
  }

  function persistState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('[Cycora] Error persistiendo estado:', e);
    }
  }

  // ==========================================================================
  // 2. MÉTODOS ANTICONCEPTIVOS Y ADAPTACIÓN DEL ALGORITMO (Diagrama 1 y 4)
  // ==========================================================================
  const METHODS_BY_CATEGORY = {
    HORMONAL_LARGA_DURACION: [
      { id: 'IMPLANTE', name: 'Implante Subdérmico' },
      { id: 'DIU_HORMONAL', name: 'DIU Hormonal (Mirena/Kyleena)' },
      { id: 'INYECCION', name: 'Inyección Anticonceptiva' },
      { id: 'PARCHE', name: 'Parches Transdérmicos' },
      { id: 'ANILLO', name: 'Anillo Vaginal' }
    ],
    DIARIOS: [
      { id: 'PASTILLAS', name: 'Pastillas Anticonceptivas Diarias' }
    ],
    BARRERA_NINGUNO: [
      { id: 'PRESERVATIVO', name: 'Preservativo / Método de Barrera' },
      { id: 'DIU_COBRE', name: 'DIU de Cobre (No hormonal)' },
      { id: 'BUSQUEDA_EMBARAZO_NINGUNO', name: 'Búsqueda de Embarazo / Ninguno' }
    ]
  };

  // Cache para evitar recalcular la adaptación del algoritmo en cada render
  let memoizedMethodBehavior = null;
  let lastCachedMethodId = '';

  const BiologicalEngine = {
    adaptMethod(method) {
      if (!method) {
        return {
          isOvulationSuppressed: false,
          hasWithdrawalBleed: false,
          allowsSpotting: false,
          fertilityWindowActive: true,
          note: 'Configura tu perfil para adaptar las predicciones a tu método.'
        };
      }

      const cacheKey = `${method.category}_${method.type}`;
      if (memoizedMethodBehavior && lastCachedMethodId === cacheKey) {
        return memoizedMethodBehavior;
      }

      let behavior;
      if (method.category === 'HORMONAL_LARGA_DURACION') {
        const isImplantOrIUD = method.type === 'IMPLANTE' || method.type === 'DIU_HORMONAL';
        behavior = {
          isOvulationSuppressed: true,
          hasWithdrawalBleed: !isImplantOrIUD,
          allowsSpotting: true,
          fertilityWindowActive: false,
          note: isImplantOrIUD
            ? 'Bajo implante o DIU hormonal, la ovulación se inhibe y el endometrio permanece delgado. El sangrado puede ser irregular (spotting) o ausente (amenorrea benigna).'
            : 'Tu método hormonal regula el ciclo mediante sangrado por privación; las fases ovulatorias naturales no aplican.'
        };
      } else if (method.category === 'DIARIOS') {
        behavior = {
          isOvulationSuppressed: true,
          hasWithdrawalBleed: true,
          allowsSpotting: false,
          fertilityWindowActive: false,
          note: 'Con pastillas anticonceptivas diarias, el sangrado ocurre por privación en los días de descanso o placebo. La ovulación natural está suprimida.'
        };
      } else {
        behavior = {
          isOvulationSuppressed: false,
          hasWithdrawalBleed: false,
          allowsSpotting: method.type === 'DIU_COBRE',
          fertilityWindowActive: true,
          note: method.type === 'DIU_COBRE'
            ? 'El DIU de cobre no contiene hormonas; tu ciclo conserva las 4 fases biológicas con ventana fértil activa.'
            : 'Ciclo biológico natural completo: 4 fases activas (menstrual, proliferativa, ovulación con ventana fértil y secretora/lútea).'
        };
      }

      memoizedMethodBehavior = behavior;
      lastCachedMethodId = cacheKey;
      return behavior;
    },

    getActiveCycle() {
      if (!state.cycles || state.cycles.length === 0) return null;
      return state.cycles.find(c => c.status === 'activo') || state.cycles[state.cycles.length - 1];
    },

    calculatePredictions() {
      const activeCycle = this.getActiveCycle();
      const cycleLength = Number(state.profile?.averageCycleLength) || 28;
      const periodDuration = Number(state.profile?.averagePeriodDuration) || 5;
      const behavior = this.adaptMethod(state.profile?.activeMethod);

      if (!activeCycle) {
        return {
          hasActiveCycle: false,
          cycleLength,
          periodDuration,
          currentCycleDay: 0,
          countdownDays: cycleLength,
          nextPeriodDate: 'Registra tu Día 1',
          phaseName: 'Esperando Registro Inicial',
          phaseHormones: 'Parámetros basales',
          phaseDesc: 'Comienza registrando la fecha de inicio de tu sangrado menstrual.',
          phaseColor: 'var(--primary)',
          isFertile: false,
          behavior
        };
      }

      const startDate = new Date(activeCycle.startDate + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Calcular día del ciclo actual en O(1) con cálculo de enteros
      const diffTime = today.getTime() - startDate.getTime();
      const diffDays = Math.floor(diffTime / 86400000); // 1000 * 60 * 60 * 24
      const currentCycleDay = Math.max(1, ((diffDays) % cycleLength) + 1);

      // Siguiente periodo proyectado
      const nextPeriodDate = new Date(startDate.getTime() + (cycleLength * 86400000));
      const countdownDiff = nextPeriodDate.getTime() - today.getTime();
      const countdownDays = Math.max(0, Math.ceil(countdownDiff / 86400000));

      let phaseName = 'Fase Menstrual';
      let phaseHormones = 'Estrógenos y progesterona bajos';
      let phaseDesc = 'El revestimiento del útero (endometrio) se desprende en forma de sangrado.';
      let phaseColor = 'var(--phase-menstrual)';
      let isFertile = false;

      if (currentCycleDay <= periodDuration) {
        phaseName = behavior.hasWithdrawalBleed ? 'Sangrado por Privación' : 'Fase Menstrual';
        phaseColor = 'var(--phase-menstrual)';
      } else if (behavior.isOvulationSuppressed) {
        phaseName = 'Fase Activa Anticonceptiva';
        phaseHormones = 'Hormonas reguladas por medicación';
        phaseDesc = 'Mantenimiento del endometrio delgado sin ovulación activa.';
        phaseColor = 'var(--phase-luteal)';
      } else {
        const estimatedOvulationDay = cycleLength - 14;
        const fertileStart = estimatedOvulationDay - 4;
        const fertileEnd = estimatedOvulationDay + 1;

        if (currentCycleDay >= fertileStart && currentCycleDay <= fertileEnd) {
          phaseName = currentCycleDay === estimatedOvulationDay ? 'Ovulación (Pico Fértil)' : 'Ventana Fértil';
          phaseHormones = 'Pico de Hormona Luteinizante (LH)';
          phaseDesc = 'Liberación del óvulo hacia la trompa de Falopio. Máxima fertilidad.';
          phaseColor = 'var(--phase-ovulatory)';
          isFertile = true;
        } else if (currentCycleDay < fertileStart) {
          phaseName = 'Fase Folicular / Proliferativa';
          phaseHormones = 'FSH y estrógenos en aumento';
          phaseDesc = 'Maduración de folículos y engrosamiento endometrial. Claridad y energía mental.';
          phaseColor = 'var(--phase-follicular)';
        } else {
          phaseName = 'Fase Lútea / Secretora';
          phaseHormones = 'Dominancia de progesterona';
          phaseDesc = 'El cuerpo lúteo produce progesterona. El útero se estabiliza.';
          phaseColor = 'var(--phase-luteal)';
        }
      }

      return {
        hasActiveCycle: true,
        activeCycle,
        currentCycleDay,
        cycleLength,
        periodDuration,
        countdownDays,
        nextPeriodDate: formatDate(nextPeriodDate),
        phaseName,
        phaseHormones,
        phaseDesc,
        phaseColor,
        isFertile,
        behavior
      };
    }
  };

  // ==========================================================================
  // 3. CACHÉ DE ELEMENTOS DEL DOM PARA ALTO RENDIMIENTO
  // ==========================================================================
  const DOM = {};

  function cacheDOMElements() {
    DOM.headerTitle = document.getElementById('header-title');
    DOM.headerCurrentDate = document.getElementById('header-current-date');
    DOM.headerNotifDot = document.getElementById('header-notif-dot');
    DOM.badgeNotifCount = document.getElementById('badge-notifications-count');
    DOM.bottomNotifDot = document.getElementById('bottom-notif-dot');

    // Sidebar
    DOM.sidebarUserName = document.getElementById('sidebar-user-name');
    DOM.sidebarUserMethod = document.getElementById('sidebar-user-method');
    DOM.sidebarUserAvatar = document.getElementById('sidebar-user-avatar');

    // Rueda y Dashboard
    DOM.cycleWheelSvg = document.getElementById('cycle-wheel-svg');
    DOM.wheelCountdownDays = document.getElementById('wheel-countdown-days');
    DOM.wheelCountdownLabel = document.getElementById('wheel-countdown-label');
    DOM.wheelCycleDay = document.getElementById('wheel-cycle-day');
    DOM.heroPhaseBadge = document.getElementById('hero-phase-badge');
    DOM.methodAdaptationTitle = document.getElementById('method-adaptation-title');
    DOM.methodAdaptationDesc = document.getElementById('method-adaptation-desc');

    // Detalle Biológico
    DOM.bioHormones = document.getElementById('bio-hormones');
    DOM.bioDescription = document.getElementById('bio-description');
    DOM.bioNextPeriodDate = document.getElementById('bio-next-period-date');
    DOM.fertilityBadge = document.getElementById('fertility-badge');
    DOM.todaySummaryContent = document.getElementById('today-summary-content');

    // Calendario e Historial
    DOM.calendarMonthTitle = document.getElementById('calendar-month-title');
    DOM.calendarDaysGrid = document.getElementById('calendar-days-grid');
    DOM.historyCycleCount = document.getElementById('history-cycle-count');
    DOM.avgCycleLen = document.getElementById('avg-cycle-len');
    DOM.avgPeriodLen = document.getElementById('avg-period-len');
    DOM.cycleHistoryList = document.getElementById('cycle-history-list');

    // Alertas
    DOM.alertsContainer = document.getElementById('alerts-container');

    // Modales
    DOM.modalOnboarding = document.getElementById('modal-onboarding');
    DOM.modalRetroactivePeriod = document.getElementById('modal-retroactive-period');
  }

  // ==========================================================================
  // 4. RENDERIZADO OPTIMIZADO DE LA RUEDA CIRCULAR (SVG)
  // ==========================================================================
  function renderCycleWheel() {
    if (!DOM.cycleWheelSvg) return;
    DOM.cycleWheelSvg.innerHTML = '';

    const pred = BiologicalEngine.calculatePredictions();
    const totalDays = pred.cycleLength;
    const currentDay = pred.currentCycleDay;
    const periodDays = pred.periodDuration;

    if (!pred.hasActiveCycle) {
      // Estado sin ciclo activo: mostrar rueda neutral invitando a registrar
      drawEmptyWheel(totalDays);
      DOM.wheelCountdownDays.textContent = `${totalDays}`;
      DOM.wheelCountdownLabel.textContent = 'días de ciclo';
      DOM.wheelCycleDay.textContent = 'Sin ciclo iniciado';
      DOM.heroPhaseBadge.textContent = 'Registrar Día 1';
      DOM.heroPhaseBadge.style.background = 'var(--primary-light)';
      DOM.heroPhaseBadge.style.color = 'var(--primary-dark)';
      DOM.bioHormones.textContent = 'Esperando Día 1';
      DOM.bioDescription.textContent = 'Registra el inicio de tu menstruación con el botón inferior para comenzar el seguimiento biológico.';
      DOM.bioNextPeriodDate.textContent = 'Por definir';
      DOM.fertilityBadge.textContent = 'Por inicializar';
      DOM.fertilityBadge.style.background = 'var(--border-light)';
      DOM.fertilityBadge.style.color = 'var(--text-muted)';
      DOM.methodAdaptationTitle.textContent = state.profile ? `${state.profile.activeMethod.name}` : 'Crea tu perfil';
      DOM.methodAdaptationDesc.textContent = pred.behavior.note;
      return;
    }

    const cx = 160;
    const cy = 160;
    const rOuter = 145;
    const rInner = 108;
    const sliceAngle = 360 / totalDays;

    // Uso de DocumentFragment para insertar todas las rutas SVG de una sola vez
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < totalDays; i++) {
      const day = i + 1;
      const startDeg = i * sliceAngle;
      const endDeg = (i + 1) * sliceAngle - 1.2;

      let color = '#E9ECEF';
      if (day <= periodDays) {
        color = '#FF4D6D'; // Menstrual
      } else if (pred.behavior.isOvulationSuppressed) {
        color = '#8338EC'; // Lútea / Reposo medicamentoso
      } else {
        const estOvu = totalDays - 14;
        if (day >= estOvu - 4 && day <= estOvu + 1) {
          color = day === estOvu ? '#FFB703' : '#48CAE4'; // Ovulación / Fértil
        } else if (day < estOvu - 4) {
          color = '#00B4D8'; // Folicular
        } else {
          color = '#8338EC'; // Lútea
        }
      }

      const isTodaySlice = day === currentDay;
      const pathD = createAnnularSectorPath(cx, cy, rInner, isTodaySlice ? rOuter + 6 : rOuter, startDeg, endDeg);

      const pathElem = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathElem.setAttribute('d', pathD);
      pathElem.setAttribute('fill', color);
      pathElem.setAttribute('opacity', isTodaySlice ? '1' : '0.85');
      if (isTodaySlice) {
        pathElem.setAttribute('stroke', '#7209B7');
        pathElem.setAttribute('stroke-width', '3');
      }
      pathElem.style.transition = 'opacity 0.2s ease';
      pathElem.style.cursor = 'pointer';

      fragment.appendChild(pathElem);
    }

    DOM.cycleWheelSvg.appendChild(fragment);

    // Actualizar textos
    DOM.wheelCountdownDays.textContent = pred.countdownDays;
    DOM.wheelCountdownLabel.textContent = 'días restantes';
    DOM.wheelCycleDay.textContent = `Día ${pred.currentCycleDay} de ${pred.cycleLength}`;
    DOM.heroPhaseBadge.textContent = pred.phaseName;
    DOM.heroPhaseBadge.style.background = pred.phaseColor;
    DOM.heroPhaseBadge.style.color = '#FFFFFF';

    DOM.bioHormones.textContent = pred.phaseHormones;
    DOM.bioDescription.textContent = pred.phaseDesc;
    DOM.bioNextPeriodDate.textContent = pred.nextPeriodDate;

    if (pred.behavior.isOvulationSuppressed) {
      DOM.fertilityBadge.textContent = 'Ovulación Suprimida';
      DOM.fertilityBadge.style.background = '#EDE9FE';
      DOM.fertilityBadge.style.color = '#6D28D9';
    } else if (pred.isFertile) {
      DOM.fertilityBadge.textContent = 'Ventana Fértil Activa';
      DOM.fertilityBadge.style.background = '#FFFBEB';
      DOM.fertilityBadge.style.color = '#B45309';
    } else {
      DOM.fertilityBadge.textContent = 'Baja Probabilidad Fértil';
      DOM.fertilityBadge.style.background = '#ECFDF5';
      DOM.fertilityBadge.style.color = '#047857';
    }

    DOM.methodAdaptationTitle.textContent = `${state.profile.activeMethod.name} (${state.profile.activeMethod.category})`;
    DOM.methodAdaptationDesc.textContent = pred.behavior.note;
  }

  function drawEmptyWheel(totalDays) {
    const cx = 160, cy = 160, rOuter = 145, rInner = 108;
    const sliceAngle = 360 / totalDays;
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < totalDays; i++) {
      const startDeg = i * sliceAngle;
      const endDeg = (i + 1) * sliceAngle - 1.2;
      const pathD = createAnnularSectorPath(cx, cy, rInner, rOuter, startDeg, endDeg);
      const pathElem = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathElem.setAttribute('d', pathD);
      pathElem.setAttribute('fill', '#EBE4F3');
      fragment.appendChild(pathElem);
    }
    DOM.cycleWheelSvg.appendChild(fragment);
  }

  function createAnnularSectorPath(cx, cy, rIn, rOut, startAngle, endAngle) {
    const toRad = 0.017453292519943295; // Math.PI / 180 precalculado para rendimiento
    const a1 = (startAngle - 90) * toRad;
    const a2 = (endAngle - 90) * toRad;

    const x1 = cx + rOut * Math.cos(a1);
    const y1 = cy + rOut * Math.sin(a1);
    const x2 = cx + rOut * Math.cos(a2);
    const y2 = cy + rOut * Math.sin(a2);

    const x3 = cx + rIn * Math.cos(a2);
    const y3 = cy + rIn * Math.sin(a2);
    const x4 = cx + rIn * Math.cos(a1);
    const y4 = cy + rIn * Math.sin(a1);

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${rOut} ${rOut} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${rIn} ${rIn} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  }

  // ==========================================================================
  // 5. CALENDARIO MENSUAL & HISTORIAL
  // ==========================================================================
  let currentCalendarDate = new Date();

  function renderCalendarMonth() {
    if (!DOM.calendarDaysGrid) return;
    DOM.calendarDaysGrid.innerHTML = '';

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    DOM.calendarMonthTitle.textContent = `${monthNames[month]} ${year}`;

    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const pred = BiologicalEngine.calculatePredictions();
    const activeCycle = pred.activeCycle;
    const cycleLength = pred.cycleLength;
    const periodDuration = pred.periodDuration;

    const fragment = document.createDocumentFragment();

    // Días del mes previo
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const cell = document.createElement('div');
      cell.className = 'cal-day-cell other-month';
      cell.textContent = prevMonthDays - i;
      fragment.appendChild(cell);
    }

    const todayStr = getTodayISO();

    // Días del mes en curso
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const cell = document.createElement('div');
      cell.className = 'cal-day-cell';
      cell.textContent = day;

      if (dateStr === todayStr) {
        cell.classList.add('is-today');
      }

      if (activeCycle) {
        const startMs = new Date(activeCycle.startDate + 'T00:00:00').getTime();
        const currentMs = new Date(dateStr + 'T00:00:00').getTime();
        const diffDays = Math.floor((currentMs - startMs) / 86400000);

        if (diffDays >= 0) {
          const cycleDayNum = (diffDays % cycleLength) + 1;
          if (cycleDayNum <= periodDuration) {
            cell.classList.add('period-day');
          } else if (!pred.behavior.isOvulationSuppressed) {
            const ovuDay = cycleLength - 14;
            if (cycleDayNum === ovuDay) {
              cell.classList.add('ovulation-day');
            } else if (cycleDayNum >= ovuDay - 4 && cycleDayNum <= ovuDay + 1) {
              cell.classList.add('fertile-day');
            }
          }
        }
      }

      // Consulta O(1) en el mapa de registros
      const log = state.dailyLogs[dateStr];
      if (log) {
        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'cal-day-dots';

        if (log.flowCharacteristics && log.flowCharacteristics.includes('flujo_regular')) {
          const pDot = document.createElement('span');
          pDot.className = 'cal-dot dot-period';
          dotsContainer.appendChild(pDot);
        }

        if ((log.physicalSymptoms && log.physicalSymptoms.length > 0) || (log.cramps && log.cramps.severity)) {
          const sDot = document.createElement('span');
          sDot.className = 'cal-dot dot-symptom';
          dotsContainer.appendChild(sDot);
        }

        cell.appendChild(dotsContainer);
      }

      cell.addEventListener('click', () => {
        const dateInput = document.getElementById('log-date-input');
        if (dateInput) {
          dateInput.value = dateStr;
          loadLogIntoForm(dateStr);
        }
        switchTab('tab-tracking');
      });

      fragment.appendChild(cell);
    }

    DOM.calendarDaysGrid.appendChild(fragment);
    renderCycleHistory();
  }

  function renderCycleHistory() {
    if (!DOM.cycleHistoryList) return;
    DOM.cycleHistoryList.innerHTML = '';

    const cycles = state.cycles || [];
    DOM.historyCycleCount.textContent = `${cycles.length} ciclos`;

    const completed = cycles.filter(c => c.status === 'completado' || c.periodDurationDays);
    const avgCycle = completed.length > 0
      ? Math.round(completed.reduce((a, b) => a + (b.cycleLengthDays || 28), 0) / completed.length)
      : (state.profile?.averageCycleLength || 28);
    const avgPeriod = completed.length > 0
      ? Math.round(completed.reduce((a, b) => a + (b.periodDurationDays || 5), 0) / completed.length)
      : (state.profile?.averagePeriodDuration || 5);

    DOM.avgCycleLen.textContent = avgCycle;
    DOM.avgPeriodLen.textContent = avgPeriod;

    if (cycles.length === 0) {
      DOM.cycleHistoryList.innerHTML = '<p class="text-muted" style="text-align:center; padding:16px;">Aún no hay ciclos registrados. Usa "Marcar Inicio de Periodo" para registrar tu Día 1.</p>';
      return;
    }

    const fragment = document.createDocumentFragment();
    cycles.slice().reverse().forEach(cycle => {
      const item = document.createElement('div');
      item.className = 'history-item';
      item.innerHTML = `
        <div>
          <strong>Ciclo #${cycle.cycleNumber} (${cycle.status.toUpperCase()})</strong>
          <div style="font-size:0.75rem; color:var(--text-muted);">
            Inicio: ${cycle.startDate} ${cycle.periodEndDate ? `→ Fin sangrado: ${cycle.periodEndDate}` : ''}
          </div>
        </div>
        <span class="badge" style="background:${cycle.status === 'activo' ? 'var(--primary-light)' : '#E9ECEF'}; color:var(--primary-dark);">
          ${cycle.periodDurationDays ? `${cycle.periodDurationDays} días sangrado` : 'En curso'}
        </span>
      `;
      fragment.appendChild(item);
    });

    DOM.cycleHistoryList.appendChild(fragment);
  }

  // ==========================================================================
  // 6. REGISTRO DIARIO (SÍNTOMAS, ÁNIMO Y EVALUACIÓN CLÍNICA)
  // ==========================================================================
  function setupTrackingForm() {
    const form = document.getElementById('daily-log-form');
    const dateInput = document.getElementById('log-date-input');
    if (!form || !dateInput) return;

    dateInput.value = getTodayISO();

    const severityBtns = document.querySelectorAll('.severity-buttons .btn-chip');
    severityBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        severityBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const sev = btn.dataset.severity;
        document.getElementById('cramps-severity-label').textContent = sev || 'Ninguno';
      });
    });

    dateInput.addEventListener('change', (e) => {
      loadLogIntoForm(e.target.value);
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const date = dateInput.value;
      const mood = form.querySelector('input[name="mood"]:checked')?.value || 'neutral';
      const activeSevBtn = document.querySelector('.severity-buttons .btn-chip.active');
      const crampsSev = activeSevBtn ? activeSevBtn.dataset.severity : '';

      const symptoms = Array.from(form.querySelectorAll('input[name="symptom"]:checked')).map(i => i.value);
      const flow = Array.from(form.querySelectorAll('input[name="flow"]:checked')).map(i => i.value);
      const notes = document.getElementById('log-notes').value;

      const healthIndicators = [];
      const healthFlags = [];

      if (crampsSev === 'severa') {
        healthIndicators.push({
          level: 'alerta',
          title: 'Dismenorrea Severa Detectada',
          desc: 'Cólicos de intensidad severa. Aplica compresas calientes, mantén reposo e hidrátate. Si el dolor interfiere significativamente o no cede, consulta a tu ginecólogo.'
        });
        healthFlags.push('DISMENORREA_SEVERA');
      }

      if (flow.includes('presencia_de_coagulos') && (crampsSev === 'moderada' || crampsSev === 'severa')) {
        healthIndicators.push({
          level: 'alerta',
          title: 'Flujo Denso con Coágulos y Dolor',
          desc: 'Monitorea la cantidad y frecuencia de cambio de toallas o tampones. Registra si observas sangrado persistente excesivo.'
        });
        healthFlags.push('FLUJO_DENSO_DOLOROSO');
      }

      if (flow.includes('manchado') && state.profile?.activeMethod?.category === 'HORMONAL_LARGA_DURACION') {
        healthIndicators.push({
          level: 'info',
          title: 'Spotting Hormonal Esperado',
          desc: 'El manchado intermenstrual o irregular es benigno y frecuente durante los primeros meses bajo implante o DIU hormonal.'
        });
        healthFlags.push('SPOTTING_HORMONAL_ESPERADO');
      }

      state.dailyLogs[date] = {
        date,
        mood,
        cramps: crampsSev ? { severity: crampsSev, score: crampsSev === 'leve' ? 1 : crampsSev === 'moderada' ? 2 : 3 } : null,
        physicalSymptoms: symptoms,
        flowCharacteristics: flow,
        notes,
        healthFlags
      };

      persistState();
      displayHealthIndicators(healthIndicators);

      // Si registró flujo regular, ofrecer marcar Día 1
      if (flow.includes('flujo_regular')) {
        const activeCycle = BiologicalEngine.getActiveCycle();
        if (!activeCycle || activeCycle.startDate !== date) {
          if (confirm(`Has marcado flujo menstrual regular para el ${date}. ¿Deseas iniciar un nuevo ciclo (Día 1) con esta fecha?`)) {
            startNewPeriod(date);
          }
        }
      }

      renderTodaySummary();
      renderCycleWheel();
      renderCalendarMonth();

      alert(`✅ Registro del día ${date} guardado correctamente.`);
    });

    loadLogIntoForm(dateInput.value);
  }

  function loadLogIntoForm(dateStr) {
    const log = state.dailyLogs[dateStr];
    const form = document.getElementById('daily-log-form');
    if (!form) return;

    if (!log) {
      const defRadio = form.querySelector('input[name="mood"][value="neutral"]');
      if (defRadio) defRadio.checked = true;
      document.querySelectorAll('.severity-buttons .btn-chip').forEach(b => b.classList.remove('active'));
      document.querySelector('.severity-buttons .btn-chip[data-severity=""]')?.classList.add('active');
      document.getElementById('cramps-severity-label').textContent = 'Ninguno';
      form.querySelectorAll('input[name="symptom"]').forEach(i => i.checked = false);
      form.querySelectorAll('input[name="flow"]').forEach(i => i.checked = false);
      document.getElementById('log-notes').value = '';
      document.getElementById('health-indicators-alert-box').style.display = 'none';
      return;
    }

    const moodRadio = form.querySelector(`input[name="mood"][value="${log.mood}"]`);
    if (moodRadio) moodRadio.checked = true;

    document.querySelectorAll('.severity-buttons .btn-chip').forEach(b => b.classList.remove('active'));
    const targetSev = document.querySelector(`.severity-buttons .btn-chip[data-severity="${log.cramps ? log.cramps.severity : ''}"]`);
    if (targetSev) targetSev.classList.add('active');
    document.getElementById('cramps-severity-label').textContent = log.cramps ? log.cramps.severity : 'Ninguno';

    form.querySelectorAll('input[name="symptom"]').forEach(i => {
      i.checked = log.physicalSymptoms.includes(i.value);
    });

    form.querySelectorAll('input[name="flow"]').forEach(i => {
      i.checked = log.flowCharacteristics.includes(i.value);
    });

    document.getElementById('log-notes').value = log.notes || '';
  }

  function displayHealthIndicators(indicators) {
    const box = document.getElementById('health-indicators-alert-box');
    const list = document.getElementById('health-indicators-list');
    list.innerHTML = '';

    if (!indicators || indicators.length === 0) {
      box.style.display = 'none';
      return;
    }

    box.style.display = 'block';
    const fragment = document.createDocumentFragment();
    indicators.forEach(ind => {
      const card = document.createElement('div');
      card.className = `health-indicator-card ${ind.level}`;
      card.innerHTML = `<strong>${ind.title}</strong><p>${ind.desc}</p>`;
      fragment.appendChild(card);
    });
    list.appendChild(fragment);
  }

  function renderTodaySummary() {
    if (!DOM.todaySummaryContent) return;
    const todayStr = getTodayISO();
    const log = state.dailyLogs[todayStr];

    if (!log) {
      DOM.todaySummaryContent.className = 'today-summary-empty';
      DOM.todaySummaryContent.innerHTML = `
        <p>No has registrado tus síntomas o ánimo el día de hoy.</p>
        <button class="btn btn-secondary btn-sm" id="btn-log-first-time">
          📝 Registrar síntomas ahora
        </button>
      `;
      document.getElementById('btn-log-first-time')?.addEventListener('click', () => {
        document.getElementById('log-date-input').value = todayStr;
        switchTab('tab-tracking');
      });
      return;
    }

    const moodMap = {
      feliz: '😊 Feliz', ansiosa: '😰 Ansiosa', irritable: '😤 Irritable',
      triste: '😢 Triste', energica: '⚡ Enérgica', neutral: '😐 Neutral'
    };

    DOM.todaySummaryContent.className = '';
    DOM.todaySummaryContent.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:8px;">
        <div style="font-size:1.1rem; font-weight:700;">${moodMap[log.mood] || log.mood}</div>
        <div style="font-size:0.85rem; color:var(--text-muted);">
          Cólicos: <strong>${log.cramps ? log.cramps.severity.toUpperCase() : 'Ninguno'}</strong> | 
          Síntomas: ${log.physicalSymptoms.length > 0 ? log.physicalSymptoms.join(', ') : 'Ninguno'}
        </div>
        <div style="font-size:0.85rem;">
          Flujo: <em>${log.flowCharacteristics.join(', ') || 'No especificado'}</em>
        </div>
        ${log.notes ? `<div style="font-size:0.82rem; background:var(--bg-page); padding:8px; border-radius:8px;">"${log.notes}"</div>` : ''}
      </div>
    `;
  }

  // ==========================================================================
  // 7. ALERTAS Y NOTIFICACIONES (Diagrama 5 y 12)
  // ==========================================================================
  function renderNotifications() {
    if (!DOM.alertsContainer) return;
    DOM.alertsContainer.innerHTML = '';

    const pending = state.notifications.filter(n => n.status === 'pendiente');
    if (pending.length > 0) {
      DOM.badgeNotifCount.textContent = pending.length;
      DOM.badgeNotifCount.style.display = 'inline-block';
      if (DOM.headerNotifDot) DOM.headerNotifDot.style.display = 'block';
      if (DOM.bottomNotifDot) DOM.bottomNotifDot.style.display = 'block';
    } else {
      DOM.badgeNotifCount.style.display = 'none';
      if (DOM.headerNotifDot) DOM.headerNotifDot.style.display = 'none';
      if (DOM.bottomNotifDot) DOM.bottomNotifDot.style.display = 'none';
    }

    if (state.notifications.length === 0) {
      DOM.alertsContainer.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:20px;">No tienes alertas en este momento.</p>';
      return;
    }

    const fragment = document.createDocumentFragment();
    state.notifications.forEach(notif => {
      const card = document.createElement('div');
      card.className = `alert-item-card ${notif.status}`;

      const iconMap = {
        toma_anticonceptivo: '💊',
        recordatorio_previo_menstruacion: '🩸',
        vencimiento_cambio_metodo: '⏰',
        alerta_salud: '🩺'
      };

      card.innerHTML = `
        <div class="alert-badge-icon">${iconMap[notif.type] || '🔔'}</div>
        <div class="alert-content">
          <h4>${notif.title}</h4>
          <p>${notif.message}</p>
          <span class="alert-timestamp">Programada para: ${new Date(notif.scheduledFor).toLocaleDateString()} | Estado: <strong>${notif.status.toUpperCase()}</strong></span>
          ${notif.status === 'pendiente' ? `
            <div class="alert-actions-row">
              <button class="btn btn-primary btn-sm btn-action-view" data-id="${notif.id}">✓ Entendido / Vista</button>
              <button class="btn btn-outline btn-sm btn-action-dismiss" data-id="${notif.id}">Omitir</button>
            </div>
          ` : ''}
        </div>
      `;
      fragment.appendChild(card);
    });

    DOM.alertsContainer.appendChild(fragment);

    DOM.alertsContainer.querySelectorAll('.btn-action-view').forEach(b => {
      b.addEventListener('click', () => respondToAlert(b.dataset.id, 'vista'));
    });
    DOM.alertsContainer.querySelectorAll('.btn-action-dismiss').forEach(b => {
      b.addEventListener('click', () => respondToAlert(b.dataset.id, 'omitida'));
    });
  }

  function respondToAlert(id, response) {
    const alert = state.notifications.find(n => n.id === id);
    if (alert) {
      alert.status = response;
      alert.respondedAt = new Date().toISOString();
      persistState();
      renderNotifications();
    }
  }

  function triggerTestAlert() {
    const newAlert = {
      id: `notif-${Date.now()}`,
      type: 'toma_anticonceptivo',
      title: 'Toma diaria de Anticonceptivo',
      message: `Son las ${state.profile?.activeMethod?.dailyIntakeTime || '21:00'}. Recuerda tu dosis diaria para mantener la efectividad anticonceptiva.`,
      scheduledFor: new Date().toISOString(),
      status: 'pendiente'
    };
    state.notifications.unshift(newAlert);
    persistState();
    renderNotifications();
    switchTab('tab-notifications');
  }

  // ==========================================================================
  // 8. ONBOARDING & CREACIÓN DE USUARIO (SIN USUARIO PREDETERMINADO)
  // ==========================================================================
  function checkUserRegistration() {
    if (!state.profile) {
      showOnboardingModal();
    } else {
      updateUserChips();
    }
  }

  function showOnboardingModal() {
    if (!DOM.modalOnboarding) return;
    DOM.modalOnboarding.style.display = 'flex';
    setupOnboardingCategoryTabs('HORMONAL_LARGA_DURACION');
  }

  function setupOnboardingCategoryTabs(defaultCategory) {
    let activeCat = defaultCategory;
    const catBtns = document.querySelectorAll('[data-onboard-cat]');
    const select = document.getElementById('onboarding-method-select');
    const dateBox = document.getElementById('onboarding-date-field');
    const timeBox = document.getElementById('onboarding-time-field');

    function populate(cat) {
      select.innerHTML = '';
      (METHODS_BY_CATEGORY[cat] || []).forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.name;
        select.appendChild(opt);
      });

      if (cat === 'HORMONAL_LARGA_DURACION') {
        dateBox.style.display = 'block';
        timeBox.style.display = 'none';
      } else if (cat === 'DIARIOS') {
        dateBox.style.display = 'none';
        timeBox.style.display = 'block';
      } else {
        dateBox.style.display = 'none';
        timeBox.style.display = 'none';
      }
    }

    catBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        catBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeCat = btn.dataset.onboardCat;
        populate(activeCat);
      });
    });

    populate(activeCat);

    document.getElementById('onboarding-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('onboarding-name').value.trim();
      const cycleLen = Number(document.getElementById('onboarding-cycle-len').value) || 28;
      const periodLen = Number(document.getElementById('onboarding-period-len').value) || 5;
      const selectedType = select.value;
      const selectedName = select.options[select.selectedIndex]?.text || '';
      const appDate = document.getElementById('onboarding-app-date')?.value;
      const expDate = document.getElementById('onboarding-exp-date')?.value;
      const pillTime = document.getElementById('onboarding-pill-time')?.value;

      state.profile = {
        userId: `user-${Date.now()}`,
        name,
        averageCycleLength: cycleLen,
        averagePeriodDuration: periodLen,
        activeMethod: {
          category: activeCat,
          type: selectedType,
          name: selectedName,
          applicationDate: appDate || undefined,
          expirationDate: expDate || undefined,
          dailyIntakeTime: pillTime || '21:00',
          reminderActive: true
        }
      };

      // Si es pastilla diaria, programar recordatorio inicial
      if (activeCat === 'DIARIOS') {
        state.notifications.unshift({
          id: `notif-init-${Date.now()}`,
          type: 'toma_anticonceptivo',
          title: 'Recordatorio diario de toma',
          message: `Recordatorio configurado a las ${pillTime || '21:00'} para la toma de tu pastilla anticonceptiva.`,
          scheduledFor: new Date().toISOString(),
          status: 'pendiente'
        });
      }

      persistState();
      DOM.modalOnboarding.style.display = 'none';

      updateUserChips();
      syncProfileTabForm();
      renderCycleWheel();
      renderCalendarMonth();
      renderNotifications();

      alert(`🌸 ¡Bienvenida a Cycora, ${name}! Tu perfil ha sido configurado.`);
    });
  }

  function setupProfileTab() {
    const profileForm = document.getElementById('profile-form');
    if (!profileForm) return;

    let currentCat = state.profile?.activeMethod?.category || 'HORMONAL_LARGA_DURACION';
    const catBtns = document.querySelectorAll('.category-tabs .cat-tab-btn');

    catBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        catBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCat = btn.dataset.cat;
        populateProfileMethodSelect(currentCat);
      });
    });

    profileForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!state.profile) return;

      const name = document.getElementById('profile-name').value.trim();
      const cycleLen = Number(document.getElementById('profile-cycle-len').value) || 28;
      const periodLen = Number(document.getElementById('profile-period-len').value) || 5;

      const select = document.getElementById('profile-method-select');
      const selectedType = select.value;
      const selectedName = select.options[select.selectedIndex]?.text || '';
      const appDate = document.getElementById('method-app-date')?.value;
      const expDate = document.getElementById('method-exp-date')?.value;
      const pillTime = document.getElementById('method-pill-time')?.value;
      const reminderActive = document.getElementById('profile-reminder-active')?.checked;

      state.profile.name = name;
      state.profile.averageCycleLength = cycleLen;
      state.profile.averagePeriodDuration = periodLen;
      state.profile.activeMethod = {
        category: currentCat,
        type: selectedType,
        name: selectedName,
        applicationDate: appDate || undefined,
        expirationDate: expDate || undefined,
        dailyIntakeTime: pillTime || '21:00',
        reminderActive: !!reminderActive
      };

      memoizedMethodBehavior = null; // Invalidar caché
      persistState();
      updateUserChips();
      renderCycleWheel();
      renderCalendarMonth();

      alert('✅ Parámetros de perfil y método anticonceptivo actualizados con éxito.');
    });

    // Botón para crear nueva usuaria desde la pestaña de perfil
    document.getElementById('btn-create-new-profile-tab')?.addEventListener('click', () => {
      resetAndCreateNewUser();
    });

    document.getElementById('btn-switch-user')?.addEventListener('click', () => {
      resetAndCreateNewUser();
    });

    document.getElementById('btn-header-new-user')?.addEventListener('click', () => {
      resetAndCreateNewUser();
    });
  }

  function resetAndCreateNewUser() {
    if (confirm('¿Deseas registrar un nuevo perfil de usuaria? Los datos anteriores se reiniciarán.')) {
      state = JSON.parse(JSON.stringify(INITIAL_STATE));
      persistState();
      memoizedMethodBehavior = null;
      showOnboardingModal();
    }
  }

  function syncProfileTabForm() {
    if (!state.profile) return;
    document.getElementById('profile-name').value = state.profile.name;
    document.getElementById('profile-cycle-len').value = state.profile.averageCycleLength;
    document.getElementById('profile-period-len').value = state.profile.averagePeriodDuration;

    const cat = state.profile.activeMethod.category;
    document.querySelectorAll('.category-tabs .cat-tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.cat === cat);
    });

    populateProfileMethodSelect(cat);
  }

  function populateProfileMethodSelect(category) {
    const select = document.getElementById('profile-method-select');
    if (!select) return;
    select.innerHTML = '';

    (METHODS_BY_CATEGORY[category] || []).forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.name;
      if (m.id === state.profile?.activeMethod?.type) opt.selected = true;
      select.appendChild(opt);
    });

    const dateBox = document.getElementById('conditional-date-field');
    const timeBox = document.getElementById('conditional-time-field');

    if (category === 'HORMONAL_LARGA_DURACION') {
      dateBox.style.display = 'block';
      timeBox.style.display = 'none';
      if (state.profile?.activeMethod?.applicationDate) {
        document.getElementById('method-app-date').value = state.profile.activeMethod.applicationDate;
      }
      if (state.profile?.activeMethod?.expirationDate) {
        document.getElementById('method-exp-date').value = state.profile.activeMethod.expirationDate;
      }
    } else if (category === 'DIARIOS') {
      dateBox.style.display = 'none';
      timeBox.style.display = 'block';
      document.getElementById('method-pill-time').value = state.profile?.activeMethod?.dailyIntakeTime || '21:00';
    } else {
      dateBox.style.display = 'none';
      timeBox.style.display = 'none';
    }
  }

  function updateUserChips() {
    if (!state.profile) {
      DOM.sidebarUserName.textContent = 'Sin usuaria';
      DOM.sidebarUserMethod.textContent = 'Registrar perfil';
      DOM.sidebarUserAvatar.textContent = '?';
      return;
    }
    DOM.sidebarUserName.textContent = state.profile.name;
    DOM.sidebarUserMethod.textContent = state.profile.activeMethod.name;
    DOM.sidebarUserAvatar.textContent = state.profile.name.charAt(0).toUpperCase();
  }

  // ==========================================================================
  // 9. GESTIÓN DE PERIODOS (DÍA 1, RETROACTIVO Y FIN)
  // ==========================================================================
  function setupPeriodActions() {
    const dateInput = document.getElementById('period-start-date-input');
    const warning = document.getElementById('retroactive-warning');

    document.getElementById('btn-start-period')?.addEventListener('click', () => {
      dateInput.value = getTodayISO();
      warning.style.display = 'none';
      DOM.modalRetroactivePeriod.style.display = 'flex';
    });

    document.getElementById('btn-close-period-modal')?.addEventListener('click', () => {
      DOM.modalRetroactivePeriod.style.display = 'none';
    });

    document.getElementById('btn-cancel-period-modal')?.addEventListener('click', () => {
      DOM.modalRetroactivePeriod.style.display = 'none';
    });

    dateInput?.addEventListener('change', () => {
      warning.style.display = dateInput.value < getTodayISO() ? 'block' : 'none';
    });

    document.getElementById('btn-confirm-start-period')?.addEventListener('click', () => {
      const selected = dateInput.value;
      DOM.modalRetroactivePeriod.style.display = 'none';
      startNewPeriod(selected);
    });

    document.getElementById('btn-end-period')?.addEventListener('click', () => {
      const activeCycle = BiologicalEngine.getActiveCycle();
      if (!activeCycle || activeCycle.status !== 'activo') {
        alert('No hay un periodo menstrual activo para marcar fin de sangrado.');
        return;
      }

      const today = getTodayISO();
      activeCycle.periodEndDate = today;
      const startMs = new Date(activeCycle.startDate).getTime();
      const endMs = new Date(today).getTime();
      const dur = Math.max(1, Math.round((endMs - startMs) / 86400000) + 1);
      activeCycle.periodDurationDays = dur;

      persistState();
      renderCycleWheel();
      renderCalendarMonth();
      alert(`✓ Fin de sangrado registrado. Duración: ${dur} días.`);
    });
  }

  function startNewPeriod(startDateStr) {
    const activeCycle = BiologicalEngine.getActiveCycle();
    if (activeCycle && activeCycle.status === 'activo' && activeCycle.startDate !== startDateStr) {
      const diffMs = new Date(startDateStr).getTime() - new Date(activeCycle.startDate).getTime();
      activeCycle.endDate = startDateStr;
      activeCycle.cycleLengthDays = Math.max(20, Math.round(diffMs / 86400000));
      activeCycle.status = 'completado';
    }

    const isRetro = startDateStr < getTodayISO();
    const newCycle = {
      id: `cycle-${Date.now()}`,
      cycleNumber: (state.cycles?.length || 0) + 1,
      startDate: startDateStr,
      status: 'activo',
      isRetroactiveAdjustment: isRetro
    };

    if (!state.cycles) state.cycles = [];
    state.cycles.push(newCycle);
    persistState();

    renderCycleWheel();
    renderCalendarMonth();

    alert(`🩸 Ciclo #${newCycle.cycleNumber} iniciado para ${startDateStr} ${isRetro ? '(Ajuste retroactivo validado)' : ''}.`);
  }

  // ==========================================================================
  // 10. NAVEGACIÓN Y SINCRONIZACIÓN DE PESTAÑAS
  // ==========================================================================
  function switchTab(tabId) {
    document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.bottom-nav-item').forEach(el => el.classList.remove('active'));

    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');

    document.querySelectorAll(`.nav-item[data-tab="${tabId}"]`).forEach(el => el.classList.add('active'));
    document.querySelectorAll(`.bottom-nav-item[data-tab="${tabId}"]`).forEach(el => el.classList.add('active'));

    const titles = {
      'tab-today': 'Mi Ciclo',
      'tab-calendar': 'Calendario Menstrual',
      'tab-tracking': 'Registro Diario',
      'tab-notifications': 'Alertas y Recordatorios',
      'tab-profile': 'Mi Perfil'
    };
    if (DOM.headerTitle) DOM.headerTitle.textContent = titles[tabId] || 'Cycora';

    if (tabId === 'tab-today') renderCycleWheel();
    if (tabId === 'tab-calendar') renderCalendarMonth();
    if (tabId === 'tab-notifications') renderNotifications();
    if (tabId === 'tab-profile') syncProfileTabForm();
  }

  function setupNavigation() {
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    document.getElementById('btn-quick-log')?.addEventListener('click', () => {
      document.getElementById('log-date-input').value = getTodayISO();
      switchTab('tab-tracking');
    });

    document.getElementById('btn-quick-notif')?.addEventListener('click', () => {
      switchTab('tab-notifications');
    });

    document.getElementById('btn-edit-today-log')?.addEventListener('click', () => {
      document.getElementById('log-date-input').value = getTodayISO();
      loadLogIntoForm(getTodayISO());
      switchTab('tab-tracking');
    });

    document.getElementById('btn-trigger-test-alert')?.addEventListener('click', triggerTestAlert);

    document.getElementById('btn-prev-month')?.addEventListener('click', () => {
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
      renderCalendarMonth();
    });

    document.getElementById('btn-next-month')?.addEventListener('click', () => {
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
      renderCalendarMonth();
    });
  }

  // ==========================================================================
  // 11. UTILITARIOS & ARRANQUE
  // ==========================================================================
  function getTodayISO() {
    return new Date().toISOString().split('T')[0];
  }

  function formatDate(d) {
    return d.toISOString().split('T')[0];
  }

  function init() {
    cacheDOMElements();

    if (DOM.headerCurrentDate) {
      DOM.headerCurrentDate.textContent = new Date().toLocaleDateString('es-ES', {
        weekday: 'long', day: 'numeric', month: 'long'
      });
    }

    setupNavigation();
    setupPeriodActions();
    setupTrackingForm();
    setupProfileTab();

    checkUserRegistration();

    renderTodaySummary();
    renderCycleWheel();
    renderCalendarMonth();
    renderNotifications();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
