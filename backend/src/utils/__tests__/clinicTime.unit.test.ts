import {
  clinicDateKey,
  clinicDayStartUtc,
  clinicWeekday,
  enumerateDateKeys,
  shiftDateKey,
  weekdayOfDateKey,
  weekStartKey,
} from '../dateUtils';

/**
 * Las métricas diarias del dashboard dependen de que el corte del día sea el de
 * Trujillo (UTC-5) y no el de UTC: una venta de las 20:00 se almacena al día
 * siguiente en UTC y agruparla mal la movería de día, de semana y de weekday.
 */
describe('Helpers de hora local de la clínica (America/Lima, UTC-5)', () => {
  describe('clinicDateKey', () => {
    it('asigna una venta de las 20:00 en Perú al mismo día, no al siguiente', () => {
      // 2026-08-10 20:00 en Trujillo = 2026-08-11 01:00 UTC
      const date = new Date('2026-08-11T01:00:00.000Z');
      expect(date.toISOString().slice(0, 10)).toBe('2026-08-11'); // lo ingenuo
      expect(clinicDateKey(date)).toBe('2026-08-10');             // lo correcto
    });

    it('asigna la medianoche exacta de la clínica al día que empieza', () => {
      expect(clinicDateKey(new Date('2026-08-10T05:00:00.000Z'))).toBe('2026-08-10');
    });

    it('deja el último instante del día anterior fuera del día nuevo', () => {
      expect(clinicDateKey(new Date('2026-08-10T04:59:59.999Z'))).toBe('2026-08-09');
    });

    it('cruza correctamente el cambio de mes', () => {
      // 31 de julio 21:00 en Perú = 1 de agosto 02:00 UTC
      expect(clinicDateKey(new Date('2026-08-01T02:00:00.000Z'))).toBe('2026-07-31');
    });
  });

  describe('clinicWeekday', () => {
    it('usa numeración ISO: 1 = lunes ... 7 = domingo', () => {
      // 2026-08-10 es lunes
      expect(clinicWeekday(new Date('2026-08-10T15:00:00.000Z'))).toBe(1);
      expect(clinicWeekday(new Date('2026-08-16T15:00:00.000Z'))).toBe(7); // domingo
    });

    it('no adelanta el día de la semana con operaciones nocturnas', () => {
      // Domingo 22:00 en Perú = lunes 03:00 UTC, pero sigue siendo domingo
      expect(clinicWeekday(new Date('2026-08-17T03:00:00.000Z'))).toBe(7);
    });
  });

  describe('clinicDayStartUtc', () => {
    it('devuelve las 05:00 UTC del mismo día', () => {
      expect(clinicDayStartUtc('2026-08-10').toISOString()).toBe(
        '2026-08-10T05:00:00.000Z'
      );
    });

    it('es inverso de clinicDateKey', () => {
      expect(clinicDateKey(clinicDayStartUtc('2026-02-28'))).toBe('2026-02-28');
    });
  });

  describe('weekdayOfDateKey', () => {
    it('numera de 1 (lunes) a 7 (domingo)', () => {
      expect(weekdayOfDateKey('2026-08-10')).toBe(1); // lunes
      expect(weekdayOfDateKey('2026-08-14')).toBe(5); // viernes
      expect(weekdayOfDateKey('2026-08-16')).toBe(7); // domingo
    });

    it('coincide con clinicWeekday sobre el inicio del mismo día', () => {
      expect(weekdayOfDateKey('2026-08-16')).toBe(
        clinicWeekday(clinicDayStartUtc('2026-08-16'))
      );
    });
  });

  describe('shiftDateKey', () => {
    it('avanza y retrocede días cruzando meses y años', () => {
      expect(shiftDateKey('2026-08-31', 1)).toBe('2026-09-01');
      expect(shiftDateKey('2026-01-01', -1)).toBe('2025-12-31');
      expect(shiftDateKey('2026-08-10', -29)).toBe('2026-07-12');
    });

    it('respeta los años bisiestos', () => {
      expect(shiftDateKey('2028-02-28', 1)).toBe('2028-02-29');
    });
  });

  describe('weekStartKey', () => {
    it('devuelve el lunes de la semana', () => {
      expect(weekStartKey('2026-08-10')).toBe('2026-08-10'); // lunes
      expect(weekStartKey('2026-08-13')).toBe('2026-08-10'); // jueves
      expect(weekStartKey('2026-08-16')).toBe('2026-08-10'); // domingo
      expect(weekStartKey('2026-08-17')).toBe('2026-08-17'); // lunes siguiente
    });
  });

  describe('enumerateDateKeys', () => {
    it('incluye ambos extremos', () => {
      expect(enumerateDateKeys('2026-08-08', '2026-08-11')).toEqual([
        '2026-08-08',
        '2026-08-09',
        '2026-08-10',
        '2026-08-11',
      ]);
    });

    it('devuelve un solo día cuando el rango es de un día', () => {
      expect(enumerateDateKeys('2026-08-10', '2026-08-10')).toEqual(['2026-08-10']);
    });

    it('devuelve vacío si el rango está invertido', () => {
      expect(enumerateDateKeys('2026-08-11', '2026-08-10')).toEqual([]);
    });

    it('cubre 365 días sin saltos', () => {
      const keys = enumerateDateKeys('2025-08-11', '2026-08-10');
      expect(keys).toHaveLength(365);
    });
  });
});
