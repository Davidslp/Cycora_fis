import { NotificationAlert } from '../models/notification.model';

export class AlertBannerComponent {
  /**
   * Renderiza el estado visual de una alerta activa con sus acciones interactivas ('vista' u 'omitida')
   */
  public renderAlert(alert: NotificationAlert): {
    id: string;
    type: string;
    badgeColor: string;
    title: string;
    message: string;
    actions: { label: string; action: 'vista' | 'omitida' }[];
  } {
    const badgeColors: Record<string, string> = {
      toma_anticonceptivo: '#FFB703',
      recordatorio_previo_menstruacion: '#FF4D6D',
      vencimiento_cambio_metodo: '#8338EC',
      alerta_salud: '#E63946'
    };

    return {
      id: alert.id,
      type: alert.type,
      badgeColor: badgeColors[alert.type] || '#2A9D8F',
      title: alert.title,
      message: alert.message,
      actions: [
        { label: 'Omitir', action: 'omitida' },
        { label: 'Entendido / Ver', action: 'vista' }
      ]
    };
  }
}
