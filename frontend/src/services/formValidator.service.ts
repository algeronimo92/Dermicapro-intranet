import { AppointmentFormData, FormErrors, SessionItem } from '../hooks/useAppointmentForm';
import { isDateTimeInPast } from '../utils/dateUtils';

// ============================================
// FORM VALIDATOR SERVICE - Chain of Responsibility Pattern
// ============================================

/**
 * Interfaz para validadores individuales
 */
interface IValidator {
  validate(formData: AppointmentFormData, sessions: SessionItem[]): FormErrors;
}

/**
 * Validador de paciente
 */
class PatientValidator implements IValidator {
  validate(formData: AppointmentFormData): FormErrors {
    const errors: FormErrors = {};
    if (!formData.patientId) {
      errors.patientId = 'Debe seleccionar un paciente';
    }
    return errors;
  }
}

/**
 * Validador de sesiones
 */
class SessionsValidator implements IValidator {
  validate(_formData: AppointmentFormData, sessions: SessionItem[]): FormErrors {
    const errors: FormErrors = {};
    if (sessions.length === 0) {
      errors.sessions = 'Debe agregar al menos una sesión a realizar';
    }
    return errors;
  }
}

/**
 * Validador de fecha y hora
 */
class DateTimeValidator implements IValidator {
  validate(formData: AppointmentFormData): FormErrors {
    const errors: FormErrors = {};

    if (!formData.scheduledDate) {
      errors.scheduledDate = 'La fecha y hora son requeridas';
    } else {
      // ✅ Validar correctamente usando dateUtils
      if (isDateTimeInPast(formData.scheduledDate)) {
        errors.scheduledDate = 'La fecha no puede ser en el pasado';
      }
    }

    return errors;
  }
}

/**
 * Validador de duración
 */
class DurationValidator implements IValidator {
  validate(formData: AppointmentFormData): FormErrors {
    const errors: FormErrors = {};

    if (!formData.durationMinutes || formData.durationMinutes < 30) {
      errors.durationMinutes = 'La duración mínima es 30 minutos';
    }

    return errors;
  }
}

/**
 * Validador de monto de reserva
 */
class ReservationAmountValidator implements IValidator {
  validate(formData: AppointmentFormData): FormErrors {
    const errors: FormErrors = {};

    if (formData.reservationAmount !== undefined && formData.reservationAmount < 0) {
      errors.reservationAmount = 'El monto debe ser mayor o igual a 0';
    }

    return errors;
  }
}

/**
 * Servicio principal de validación que coordina todos los validadores
 * Usa Chain of Responsibility para ejecutar validaciones en secuencia
 */
export class FormValidatorService {
  private validators: IValidator[];

  constructor() {
    this.validators = [
      new PatientValidator(),
      new SessionsValidator(),
      new DateTimeValidator(),
      new DurationValidator(),
      new ReservationAmountValidator()
    ];
  }

  /**
   * Valida el formulario ejecutando todos los validadores
   * Retorna objeto con errores (vacío si no hay errores)
   */
  validate(formData: AppointmentFormData, sessions: SessionItem[]): FormErrors {
    let allErrors: FormErrors = {};

    // Ejecutar cada validador en la cadena
    for (const validator of this.validators) {
      const errors = validator.validate(formData, sessions);
      allErrors = { ...allErrors, ...errors };
    }

    return allErrors;
  }

  /**
   * Verifica si el formulario es válido (no tiene errores)
   */
  isValid(formData: AppointmentFormData, sessions: SessionItem[]): boolean {
    const errors = this.validate(formData, sessions);
    return Object.keys(errors).length === 0;
  }
}

// Singleton instance
export const formValidator = new FormValidatorService();
