/**
 * Componentes de interfaz de usuario desacoplados y reutilizables
 * para web y móvil (React / React Native / Angular).
 */

export interface ButtonProps {
  label: string;
  variant: 'primary' | 'secondary' | 'danger' | 'ghost';
  onClick: () => void;
  disabled?: boolean;
}

export interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children?: any;
}

export interface BadgeProps {
  label: string;
  colorHex: string;
}

export class SharedUIElements {
  public static createButtonDescriptor(props: ButtonProps) {
    return {
      type: 'BUTTON',
      props
    };
  }

  public static createBadgeDescriptor(label: string, colorHex: string) {
    return {
      type: 'BADGE',
      label,
      colorHex
    };
  }
}
