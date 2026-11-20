# 🧪 Plan de Testing QA - Utilidades de Fechas

**Autor**: Senior QA Engineer
**Fecha**: 2025-12-06
**Versión**: 1.0
**Scope**: Comprehensive testing for `dateUtils.ts` (Frontend & Backend)

---

## 📋 Tabla de Contenidos

1. [Estrategia de Testing](#estrategia-de-testing)
2. [Test Coverage Goals](#test-coverage-goals)
3. [Frontend Unit Tests](#frontend-unit-tests)
4. [Backend Unit Tests](#backend-unit-tests)
5. [Integration Tests](#integration-tests)
6. [Edge Cases & Boundary Testing](#edge-cases--boundary-testing)
7. [Performance Testing](#performance-testing)
8. [Test Data Fixtures](#test-data-fixtures)
9. [Execution Plan](#execution-plan)

---

## 🎯 Estrategia de Testing

### Principios de Testing

1. **AAA Pattern**: Arrange, Act, Assert
2. **Test Isolation**: Cada test es independiente
3. **Deterministic**: Resultados predecibles usando mocks
4. **Fast**: Tests rápidos para CI/CD
5. **Comprehensive**: >90% code coverage

### Testing Pyramid

```
        ╱──────────────╲
       ╱  E2E Tests (5%)╲
      ╱──────────────────╲
     ╱ Integration (15%)  ╲
    ╱──────────────────────╲
   ╱   Unit Tests (80%)     ╲
  ╱──────────────────────────╲
```

### Tools & Frameworks

- **Testing Framework**: Jest 29.x
- **Assertions**: Jest matchers + custom matchers
- **Mocking**: Jest mocks for Date objects
- **Coverage**: Jest coverage with istanbul
- **CI/CD**: GitHub Actions / GitLab CI

---

## 📊 Test Coverage Goals

| Categoría | Meta | Actual | Estado |
|-----------|------|--------|--------|
| **Line Coverage** | ≥ 90% | 0% | ⏳ Pendiente |
| **Branch Coverage** | ≥ 85% | 0% | ⏳ Pendiente |
| **Function Coverage** | ≥ 95% | 0% | ⏳ Pendiente |
| **Statement Coverage** | ≥ 90% | 0% | ⏳ Pendiente |

---

## 🧪 Frontend Unit Tests

**Archivo de tests**: `frontend/src/utils/__tests__/dateUtils.test.ts`

### Test Suite Structure

```typescript
describe('DateUtils - Frontend', () => {
  describe('getLocalDateString', () => {
    // Tests aquí
  });

  describe('getLocalDateTimeString', () => {
    // Tests aquí
  });

  // ... más grupos
});
```

---

### 1. getLocalDateString()

**Propósito**: Obtener fecha local en formato YYYY-MM-DD

#### Test Cases:

| # | Test Name | Input | Expected Output | Tipo |
|---|-----------|-------|-----------------|------|
| 1 | Retorna fecha actual en formato correcto | `new Date(2025, 11, 6)` | `"2025-12-06"` | Positive |
| 2 | Formatea correctamente meses de un dígito | `new Date(2025, 0, 5)` | `"2025-01-05"` | Boundary |
| 3 | Formatea correctamente días de un dígito | `new Date(2025, 11, 1)` | `"2025-12-01"` | Boundary |
| 4 | Maneja fin de año correctamente | `new Date(2025, 11, 31)` | `"2025-12-31"` | Edge Case |
| 5 | Maneja inicio de año correctamente | `new Date(2025, 0, 1)` | `"2025-01-01"` | Edge Case |
| 6 | Maneja años bisiestos | `new Date(2024, 1, 29)` | `"2024-02-29"` | Edge Case |
| 7 | Sin parámetros retorna hoy | `undefined` | Fecha actual | Positive |

#### Código de Tests:

```typescript
describe('getLocalDateString', () => {
  beforeEach(() => {
    // Mock system time to 2025-12-06 10:00:00 local time
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2025, 11, 6, 10, 0, 0));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return current date in YYYY-MM-DD format', () => {
    // Arrange
    const expectedDate = '2025-12-06';

    // Act
    const result = getLocalDateString();

    // Assert
    expect(result).toBe(expectedDate);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should format single-digit months correctly', () => {
    // Arrange
    const date = new Date(2025, 0, 5); // January 5th

    // Act
    const result = getLocalDateString(date);

    // Assert
    expect(result).toBe('2025-01-05');
  });

  it('should format single-digit days correctly', () => {
    // Arrange
    const date = new Date(2025, 11, 1); // December 1st

    // Act
    const result = getLocalDateString(date);

    // Assert
    expect(result).toBe('2025-12-01');
  });

  it('should handle end of year correctly', () => {
    // Arrange
    const date = new Date(2025, 11, 31); // Dec 31, 2025

    // Act
    const result = getLocalDateString(date);

    // Assert
    expect(result).toBe('2025-12-31');
  });

  it('should handle start of year correctly', () => {
    // Arrange
    const date = new Date(2025, 0, 1); // Jan 1, 2025

    // Act
    const result = getLocalDateString(date);

    // Assert
    expect(result).toBe('2025-01-01');
  });

  it('should handle leap year dates', () => {
    // Arrange
    const date = new Date(2024, 1, 29); // Feb 29, 2024 (leap year)

    // Act
    const result = getLocalDateString(date);

    // Assert
    expect(result).toBe('2024-02-29');
  });

  it('should return today when called without parameters', () => {
    // Arrange & Act
    const result = getLocalDateString();

    // Assert
    expect(result).toBe('2025-12-06');
  });
});
```

---

### 2. getLocalDateTimeString()

**Propósito**: Obtener fecha y hora local en formato YYYY-MM-DDTHH:mm

#### Test Cases:

| # | Test Name | Input | Expected Output | Tipo |
|---|-----------|-------|-----------------|------|
| 1 | Retorna datetime actual correctamente | `new Date(2025, 11, 6, 14, 30)` | `"2025-12-06T14:30"` | Positive |
| 2 | Formatea horas de un dígito | `new Date(2025, 11, 6, 9, 5)` | `"2025-12-06T09:05"` | Boundary |
| 3 | Maneja medianoche correctamente | `new Date(2025, 11, 6, 0, 0)` | `"2025-12-06T00:00"` | Edge Case |
| 4 | Maneja 23:59 correctamente | `new Date(2025, 11, 6, 23, 59)` | `"2025-12-06T23:59"` | Edge Case |
| 5 | Sin parámetros retorna ahora | `undefined` | DateTime actual | Positive |

#### Código de Tests:

```typescript
describe('getLocalDateTimeString', () => {
  it('should return datetime in YYYY-MM-DDTHH:mm format', () => {
    // Arrange
    const date = new Date(2025, 11, 6, 14, 30, 0);

    // Act
    const result = getLocalDateTimeString(date);

    // Assert
    expect(result).toBe('2025-12-06T14:30');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it('should format single-digit hours and minutes correctly', () => {
    // Arrange
    const date = new Date(2025, 11, 6, 9, 5, 0);

    // Act
    const result = getLocalDateTimeString(date);

    // Assert
    expect(result).toBe('2025-12-06T09:05');
  });

  it('should handle midnight correctly', () => {
    // Arrange
    const date = new Date(2025, 11, 6, 0, 0, 0);

    // Act
    const result = getLocalDateTimeString(date);

    // Assert
    expect(result).toBe('2025-12-06T00:00');
  });

  it('should handle 23:59 correctly', () => {
    // Arrange
    const date = new Date(2025, 11, 6, 23, 59, 0);

    // Act
    const result = getLocalDateTimeString(date);

    // Assert
    expect(result).toBe('2025-12-06T23:59');
  });
});
```

---

### 3. localToUTC()

**Propósito**: Convertir fecha local a UTC ISO string

#### Test Cases:

| # | Test Name | Input | Expected Output | Tipo |
|---|-----------|-------|-----------------|------|
| 1 | Convierte datetime local a UTC | `"2025-12-06T14:30"` | `"2025-12-06T19:30:00.000Z"` (GMT-5) | Positive |
| 2 | Maneja medianoche local correctamente | `"2025-12-06T00:00"` | `"2025-12-06T05:00:00.000Z"` | Edge Case |
| 3 | Maneja 23:59 local correctamente | `"2025-12-06T23:59"` | `"2025-12-07T04:59:00.000Z"` | Edge Case |
| 4 | Conversión causa cambio de día | `"2025-12-06T23:00"` | `"2025-12-07T04:00:00.000Z"` | Edge Case |

#### Código de Tests:

```typescript
describe('localToUTC', () => {
  it('should convert local datetime to UTC ISO string', () => {
    // Arrange
    const localDateTime = '2025-12-06T14:30';

    // Act
    const result = localToUTC(localDateTime);

    // Assert
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    const parsed = new Date(result);
    expect(parsed.getUTCHours()).toBe(19); // 14:30 local = 19:30 UTC (GMT-5)
  });

  it('should handle local midnight correctly', () => {
    // Arrange
    const localDateTime = '2025-12-06T00:00';

    // Act
    const result = localToUTC(localDateTime);

    // Assert
    const parsed = new Date(result);
    expect(parsed.getUTCHours()).toBe(5); // 00:00 local = 05:00 UTC
  });

  it('should handle day boundary crossing', () => {
    // Arrange
    const localDateTime = '2025-12-06T23:00';

    // Act
    const result = localToUTC(localDateTime);

    // Assert
    const parsed = new Date(result);
    expect(parsed.getUTCDate()).toBe(7); // Crosses to next day in UTC
  });
});
```

---

### 4. utcToLocal()

**Propósito**: Convertir UTC a formato local YYYY-MM-DDTHH:mm

#### Test Cases:

| # | Test Name | Input | Expected Output | Tipo |
|---|-----------|-------|-----------------|------|
| 1 | Convierte UTC a local correctamente | `"2025-12-06T19:30:00.000Z"` | `"2025-12-06T14:30"` | Positive |
| 2 | Maneja string vacío | `""` | `""` | Edge Case |
| 3 | Maneja null/undefined | `null` | `""` | Edge Case |
| 4 | Maneja fecha inválida | `"invalid-date"` | `""` | Negative |
| 5 | Conversión causa cambio de día hacia atrás | `"2025-12-07T04:00:00.000Z"` | `"2025-12-06T23:00"` | Edge Case |

#### Código de Tests:

```typescript
describe('utcToLocal', () => {
  it('should convert UTC to local datetime format', () => {
    // Arrange
    const utcString = '2025-12-06T19:30:00.000Z';

    // Act
    const result = utcToLocal(utcString);

    // Assert
    expect(result).toBe('2025-12-06T14:30'); // 19:30 UTC = 14:30 local (GMT-5)
  });

  it('should return empty string for empty input', () => {
    // Arrange
    const utcString = '';

    // Act
    const result = utcToLocal(utcString);

    // Assert
    expect(result).toBe('');
  });

  it('should return empty string for invalid date', () => {
    // Arrange
    const utcString = 'invalid-date';
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    // Act
    const result = utcToLocal(utcString);

    // Assert
    expect(result).toBe('');
    expect(consoleWarnSpy).toHaveBeenCalledWith('Invalid UTC string:', utcString);

    consoleWarnSpy.mockRestore();
  });

  it('should handle day boundary crossing backwards', () => {
    // Arrange
    const utcString = '2025-12-07T04:00:00.000Z';

    // Act
    const result = utcToLocal(utcString);

    // Assert
    expect(result).toBe('2025-12-06T23:00'); // Crosses back to previous day
  });
});
```

---

### 5. isDateTimeInPast()

**Propósito**: Validar si una fecha/hora está en el pasado

#### Test Cases:

| # | Test Name | Input | Expected Output | Tipo |
|---|-----------|-------|-----------------|------|
| 1 | Fecha en el pasado retorna true | 1 hora atrás | `true` | Positive |
| 2 | Fecha en el futuro retorna false | 1 hora adelante | `false` | Positive |
| 3 | Fecha actual retorna false | Ahora mismo | `false` | Boundary |
| 4 | Acepta Date object | `new Date(2020, 0, 1)` | `true` | Positive |
| 5 | Acepta ISO string | `"2020-01-01T00:00:00Z"` | `true` | Positive |

#### Código de Tests:

```typescript
describe('isDateTimeInPast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2025, 11, 6, 14, 30, 0)); // Dec 6, 2025 14:30
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return true for past datetime', () => {
    // Arrange
    const pastDate = new Date(2025, 11, 6, 13, 0, 0); // 1.5 hours ago

    // Act
    const result = isDateTimeInPast(pastDate);

    // Assert
    expect(result).toBe(true);
  });

  it('should return false for future datetime', () => {
    // Arrange
    const futureDate = new Date(2025, 11, 6, 15, 0, 0); // 30 min in future

    // Act
    const result = isDateTimeInPast(futureDate);

    // Assert
    expect(result).toBe(false);
  });

  it('should return false for current datetime', () => {
    // Arrange
    const now = new Date(2025, 11, 6, 14, 30, 0);

    // Act
    const result = isDateTimeInPast(now);

    // Assert
    expect(result).toBe(false);
  });

  it('should accept ISO string input', () => {
    // Arrange
    const pastDateString = '2020-01-01T00:00:00Z';

    // Act
    const result = isDateTimeInPast(pastDateString);

    // Assert
    expect(result).toBe(true);
  });
});
```

---

### 6. calculateAge()

**Propósito**: Calcular edad a partir de fecha de nacimiento

#### Test Cases:

| # | Test Name | Birth Date | Current Date | Expected Age | Tipo |
|---|-----------|------------|--------------|--------------|------|
| 1 | Cumpleaños ya pasó este año | `2000-01-15` | `2025-12-06` | `25` | Positive |
| 2 | Cumpleaños aún no llega este año | `2000-12-25` | `2025-12-06` | `24` | Boundary |
| 3 | Cumpleaños es hoy | `2000-12-06` | `2025-12-06` | `25` | Edge Case |
| 4 | Bebé menor de 1 año | `2025-06-01` | `2025-12-06` | `0` | Edge Case |
| 5 | Persona centenaria | `1925-01-01` | `2025-12-06` | `100` | Edge Case |
| 6 | Acepta Date object | `new Date(2000, 0, 15)` | - | `25` | Positive |

#### Código de Tests:

```typescript
describe('calculateAge', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2025, 11, 6)); // Dec 6, 2025
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should calculate age when birthday has passed this year', () => {
    // Arrange
    const birthDate = '2000-01-15';

    // Act
    const age = calculateAge(birthDate);

    // Assert
    expect(age).toBe(25);
  });

  it('should calculate age when birthday has not passed yet', () => {
    // Arrange
    const birthDate = '2000-12-25'; // Birthday in 19 days

    // Act
    const age = calculateAge(birthDate);

    // Assert
    expect(age).toBe(24); // Still 24 until Dec 25
  });

  it('should calculate age when birthday is today', () => {
    // Arrange
    const birthDate = '2000-12-06';

    // Act
    const age = calculateAge(birthDate);

    // Assert
    expect(age).toBe(25);
  });

  it('should return 0 for babies under 1 year', () => {
    // Arrange
    const birthDate = '2025-06-01'; // Born 6 months ago

    // Act
    const age = calculateAge(birthDate);

    // Assert
    expect(age).toBe(0);
  });

  it('should handle centenarians correctly', () => {
    // Arrange
    const birthDate = '1925-01-01';

    // Act
    const age = calculateAge(birthDate);

    // Assert
    expect(age).toBe(100);
  });

  it('should accept Date object as input', () => {
    // Arrange
    const birthDate = new Date(2000, 0, 15);

    // Act
    const age = calculateAge(birthDate);

    // Assert
    expect(age).toBe(25);
  });
});
```

---

### 7. formatDate()

**Propósito**: Formatear fecha en español (es-PE)

#### Test Cases:

| # | Test Name | Input | Expected Output | Tipo |
|---|-----------|-------|-----------------|------|
| 1 | Formatea fecha con opciones por defecto | `new Date(2025, 11, 6)` | `"6 de diciembre de 2025"` | Positive |
| 2 | Acepta opciones personalizadas | `new Date(2025, 11, 6)` con opciones | Formato custom | Positive |
| 3 | Acepta ISO string | `"2025-12-06T00:00:00Z"` | Fecha formateada | Positive |
| 4 | Retorna "Fecha inválida" para input inválido | `"invalid"` | `"Fecha inválida"` | Negative |

#### Código de Tests:

```typescript
describe('formatDate', () => {
  it('should format date with default options in Spanish', () => {
    // Arrange
    const date = new Date(2025, 11, 6);

    // Act
    const result = formatDate(date);

    // Assert
    expect(result).toBe('6 de diciembre de 2025');
  });

  it('should accept custom format options', () => {
    // Arrange
    const date = new Date(2025, 11, 6);
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    };

    // Act
    const result = formatDate(date, options);

    // Assert
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('should accept ISO string input', () => {
    // Arrange
    const isoString = '2025-12-06T00:00:00Z';

    // Act
    const result = formatDate(isoString);

    // Assert
    expect(result).toContain('diciembre');
    expect(result).toContain('2025');
  });

  it('should return "Fecha inválida" for invalid input', () => {
    // Arrange
    const invalidDate = 'not-a-date';

    // Act
    const result = formatDate(invalidDate);

    // Assert
    expect(result).toBe('Fecha inválida');
  });
});
```

---

### 8. compareDates()

**Propósito**: Comparar dos fechas para ordenamiento

#### Test Cases:

| # | Test Name | Date1 | Date2 | Expected | Tipo |
|---|-----------|-------|-------|----------|------|
| 1 | date1 < date2 retorna negativo | `2025-12-05` | `2025-12-06` | `< 0` | Positive |
| 2 | date1 > date2 retorna positivo | `2025-12-07` | `2025-12-06` | `> 0` | Positive |
| 3 | date1 === date2 retorna 0 | `2025-12-06` | `2025-12-06` | `0` | Boundary |
| 4 | Funciona con array.sort() | Array de fechas | Array ordenado | Integration |

#### Código de Tests:

```typescript
describe('compareDates', () => {
  it('should return negative when date1 < date2', () => {
    // Arrange
    const date1 = '2025-12-05T10:00:00Z';
    const date2 = '2025-12-06T10:00:00Z';

    // Act
    const result = compareDates(date1, date2);

    // Assert
    expect(result).toBeLessThan(0);
  });

  it('should return positive when date1 > date2', () => {
    // Arrange
    const date1 = '2025-12-07T10:00:00Z';
    const date2 = '2025-12-06T10:00:00Z';

    // Act
    const result = compareDates(date1, date2);

    // Assert
    expect(result).toBeGreaterThan(0);
  });

  it('should return 0 when dates are equal', () => {
    // Arrange
    const date1 = '2025-12-06T10:00:00Z';
    const date2 = '2025-12-06T10:00:00Z';

    // Act
    const result = compareDates(date1, date2);

    // Assert
    expect(result).toBe(0);
  });

  it('should work with Array.sort()', () => {
    // Arrange
    const dates = [
      '2025-12-08T10:00:00Z',
      '2025-12-05T10:00:00Z',
      '2025-12-06T10:00:00Z',
      '2025-12-07T10:00:00Z'
    ];

    // Act
    const sorted = dates.sort((a, b) => compareDates(a, b));

    // Assert
    expect(sorted[0]).toContain('2025-12-05');
    expect(sorted[1]).toContain('2025-12-06');
    expect(sorted[2]).toContain('2025-12-07');
    expect(sorted[3]).toContain('2025-12-08');
  });
});
```

---

## 🔧 Backend Unit Tests

**Archivo de tests**: `backend/src/utils/__tests__/dateUtils.test.ts`

### 1. parseStartOfDay()

**Propósito**: Parsear YYYY-MM-DD a UTC start of day

#### Test Cases:

| # | Test Name | Input | Expected Output | Tipo |
|---|-----------|-------|-----------------|------|
| 1 | Parsea fecha a UTC medianoche | `"2025-12-06"` | UTC midnight | Positive |
| 2 | Retorna Date object válido | `"2025-12-06"` | `instanceof Date` | Positive |
| 3 | Usa UTC, no local | `"2025-12-06"` | `getUTCHours() === 0` | Critical |
| 4 | Maneja fin de mes | `"2025-12-31"` | Correct UTC date | Edge Case |
| 5 | Maneja febrero 29 (leap year) | `"2024-02-29"` | Valid date | Edge Case |

#### Código de Tests:

```typescript
describe('parseStartOfDay', () => {
  it('should parse date string to UTC midnight', () => {
    // Arrange
    const dateString = '2025-12-06';

    // Act
    const result = parseStartOfDay(dateString);

    // Assert
    expect(result).toBeInstanceOf(Date);
    expect(result.getUTCFullYear()).toBe(2025);
    expect(result.getUTCMonth()).toBe(11); // December (0-indexed)
    expect(result.getUTCDate()).toBe(6);
    expect(result.getUTCHours()).toBe(0);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
    expect(result.getUTCMilliseconds()).toBe(0);
  });

  it('should use UTC timezone, not local', () => {
    // Arrange
    const dateString = '2025-12-06';

    // Act
    const result = parseStartOfDay(dateString);

    // Assert
    expect(result.toISOString()).toBe('2025-12-06T00:00:00.000Z');
  });

  it('should handle end of month correctly', () => {
    // Arrange
    const dateString = '2025-12-31';

    // Act
    const result = parseStartOfDay(dateString);

    // Assert
    expect(result.getUTCDate()).toBe(31);
    expect(result.getUTCMonth()).toBe(11);
  });

  it('should handle leap year dates', () => {
    // Arrange
    const dateString = '2024-02-29';

    // Act
    const result = parseStartOfDay(dateString);

    // Assert
    expect(result.getUTCFullYear()).toBe(2024);
    expect(result.getUTCMonth()).toBe(1); // February
    expect(result.getUTCDate()).toBe(29);
    expect(result.toISOString()).toBe('2024-02-29T00:00:00.000Z');
  });
});
```

---

### 2. parseEndOfDay()

**Propósito**: Parsear YYYY-MM-DD a UTC end of day (23:59:59.999)

#### Test Cases:

| # | Test Name | Input | Expected Output | Tipo |
|---|-----------|-------|-----------------|------|
| 1 | Parsea a UTC 23:59:59.999 | `"2025-12-06"` | End of day UTC | Positive |
| 2 | Milisegundos son 999 | `"2025-12-06"` | `.getUTCMilliseconds() === 999` | Boundary |

#### Código de Tests:

```typescript
describe('parseEndOfDay', () => {
  it('should parse date string to UTC end of day', () => {
    // Arrange
    const dateString = '2025-12-06';

    // Act
    const result = parseEndOfDay(dateString);

    // Assert
    expect(result.getUTCFullYear()).toBe(2025);
    expect(result.getUTCMonth()).toBe(11);
    expect(result.getUTCDate()).toBe(6);
    expect(result.getUTCHours()).toBe(23);
    expect(result.getUTCMinutes()).toBe(59);
    expect(result.getUTCSeconds()).toBe(59);
    expect(result.getUTCMilliseconds()).toBe(999);
  });

  it('should return correct ISO string', () => {
    // Arrange
    const dateString = '2025-12-06';

    // Act
    const result = parseEndOfDay(dateString);

    // Assert
    expect(result.toISOString()).toBe('2025-12-06T23:59:59.999Z');
  });
});
```

---

### 3. prepareDateRange()

**Propósito**: Preparar rangos de fechas para Prisma queries

#### Test Cases:

| # | Test Name | dateFrom | dateTo | Expected | Tipo |
|---|-----------|----------|--------|----------|------|
| 1 | Ambas fechas proporcionadas | `"2025-12-01"` | `"2025-12-06"` | `{ gte, lte }` | Positive |
| 2 | Solo dateFrom | `"2025-12-01"` | `undefined` | `{ gte }` | Boundary |
| 3 | Solo dateTo | `undefined` | `"2025-12-06"` | `{ lte }` | Boundary |
| 4 | Ninguna fecha | `undefined` | `undefined` | `{}` | Edge Case |

#### Código de Tests:

```typescript
describe('prepareDateRange', () => {
  it('should prepare range with both dates', () => {
    // Arrange
    const dateFrom = '2025-12-01';
    const dateTo = '2025-12-06';

    // Act
    const result = prepareDateRange(dateFrom, dateTo);

    // Assert
    expect(result).toHaveProperty('gte');
    expect(result).toHaveProperty('lte');
    expect(result.gte).toBeInstanceOf(Date);
    expect(result.lte).toBeInstanceOf(Date);
    expect(result.gte?.toISOString()).toBe('2025-12-01T00:00:00.000Z');
    expect(result.lte?.toISOString()).toBe('2025-12-06T23:59:59.999Z');
  });

  it('should prepare range with only dateFrom', () => {
    // Arrange
    const dateFrom = '2025-12-01';

    // Act
    const result = prepareDateRange(dateFrom);

    // Assert
    expect(result).toHaveProperty('gte');
    expect(result).not.toHaveProperty('lte');
    expect(result.gte?.toISOString()).toBe('2025-12-01T00:00:00.000Z');
  });

  it('should prepare range with only dateTo', () => {
    // Arrange
    const dateTo = '2025-12-06';

    // Act
    const result = prepareDateRange(undefined, dateTo);

    // Assert
    expect(result).toHaveProperty('lte');
    expect(result).not.toHaveProperty('gte');
    expect(result.lte?.toISOString()).toBe('2025-12-06T23:59:59.999Z');
  });

  it('should return empty object when no dates provided', () => {
    // Act
    const result = prepareDateRange();

    // Assert
    expect(result).toEqual({});
    expect(Object.keys(result)).toHaveLength(0);
  });
});
```

---

### 4. addDays()

**Propósito**: Agregar días a una fecha (UTC-aware)

#### Test Cases:

| # | Test Name | Date | Days | Expected | Tipo |
|---|-----------|------|------|----------|------|
| 1 | Agregar días positivos | `2025-12-06` | `7` | `2025-12-13` | Positive |
| 2 | Agregar días negativos | `2025-12-06` | `-3` | `2025-12-03` | Positive |
| 3 | Cruzar fin de mes | `2025-12-30` | `5` | `2026-01-04` | Edge Case |
| 4 | Cruzar fin de año | `2025-12-31` | `1` | `2026-01-01` | Edge Case |
| 5 | Agregar 0 días | `2025-12-06` | `0` | `2025-12-06` | Boundary |
| 6 | Inmutabilidad (no modifica original) | - | - | Original unchanged | Critical |

#### Código de Tests:

```typescript
describe('addDays', () => {
  it('should add positive days correctly', () => {
    // Arrange
    const date = new Date(Date.UTC(2025, 11, 6));
    const days = 7;

    // Act
    const result = addDays(date, days);

    // Assert
    expect(result.getUTCDate()).toBe(13);
    expect(result.getUTCMonth()).toBe(11);
  });

  it('should subtract days with negative input', () => {
    // Arrange
    const date = new Date(Date.UTC(2025, 11, 6));
    const days = -3;

    // Act
    const result = addDays(date, days);

    // Assert
    expect(result.getUTCDate()).toBe(3);
  });

  it('should handle month boundary crossing', () => {
    // Arrange
    const date = new Date(Date.UTC(2025, 11, 30));
    const days = 5;

    // Act
    const result = addDays(date, days);

    // Assert
    expect(result.getUTCDate()).toBe(4);
    expect(result.getUTCMonth()).toBe(0); // January
    expect(result.getUTCFullYear()).toBe(2026);
  });

  it('should handle year boundary crossing', () => {
    // Arrange
    const date = new Date(Date.UTC(2025, 11, 31));
    const days = 1;

    // Act
    const result = addDays(date, days);

    // Assert
    expect(result.getUTCDate()).toBe(1);
    expect(result.getUTCMonth()).toBe(0);
    expect(result.getUTCFullYear()).toBe(2026);
  });

  it('should not modify original date (immutability)', () => {
    // Arrange
    const original = new Date(Date.UTC(2025, 11, 6));
    const originalTime = original.getTime();

    // Act
    const result = addDays(original, 7);

    // Assert
    expect(original.getTime()).toBe(originalTime); // Original unchanged
    expect(result).not.toBe(original); // Different object
  });
});
```

---

## 🔗 Integration Tests

**Archivo**: `frontend/src/__tests__/integration/dateFlow.test.tsx`

### Escenarios de Integración:

#### 1. Flujo Completo: Crear Cita desde Formulario

```typescript
describe('Integration: Appointment Creation Flow', () => {
  it('should handle dates correctly from form to backend and back', async () => {
    // Arrange
    const localDateTime = '2025-12-15T14:30'; // User input

    // Act 1: Frontend prepara datos
    const apiPayload = {
      scheduledDate: localToUTC(localDateTime) // "2025-12-15T19:30:00.000Z"
    };

    // Mock backend response
    const backendResponse = {
      id: '123',
      scheduledDate: '2025-12-15T19:30:00.000Z' // UTC from DB
    };

    // Act 2: Frontend recibe y muestra
    const displayValue = utcToLocal(backendResponse.scheduledDate);

    // Assert
    expect(apiPayload.scheduledDate).toMatch(/Z$/); // UTC format
    expect(displayValue).toBe('2025-12-15T14:30'); // Same as user input
  });
});
```

#### 2. Flujo: Filtrar Citas de Hoy

```typescript
describe('Integration: Filter Today Appointments', () => {
  it('should correctly filter appointments for today', () => {
    // Arrange
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2025, 11, 6, 10, 0, 0));

    const today = getLocalDateString(); // "2025-12-06"

    // Mock appointments
    const appointments = [
      { scheduledDate: '2025-12-06T14:00:00.000Z' }, // Today (9am local)
      { scheduledDate: '2025-12-07T14:00:00.000Z' }, // Tomorrow
      { scheduledDate: '2025-12-05T14:00:00.000Z' }  // Yesterday
    ];

    // Act
    const todayAppointments = appointments.filter(apt => {
      const aptDate = utcToLocalDate(apt.scheduledDate);
      return aptDate === today;
    });

    // Assert
    expect(todayAppointments).toHaveLength(1);

    jest.useRealTimers();
  });
});
```

---

## 🎭 Edge Cases & Boundary Testing

### Critical Edge Cases:

| # | Scenario | Input | Expected Behavior | Priority |
|---|----------|-------|-------------------|----------|
| 1 | **Timezone Boundary** | `2025-12-06T23:30` local → UTC | Should be `2025-12-07T04:30Z` | CRITICAL |
| 2 | **Leap Year Feb 29** | `2024-02-29` | Should parse correctly | HIGH |
| 3 | **Non-Leap Year Feb 29** | `2025-02-29` | Should handle error gracefully | HIGH |
| 4 | **DST Transitions** | Spring forward / Fall back dates | Consistent handling | MEDIUM |
| 5 | **Year 2038 Problem** | Dates beyond 2038-01-19 | Should work (JS uses 64-bit) | LOW |
| 6 | **Negative Epoch** | Dates before 1970-01-01 | Should handle correctly | MEDIUM |
| 7 | **Far Future Dates** | Year 9999 | Should not crash | LOW |

### Boundary Test Suite:

```typescript
describe('Edge Cases & Boundaries', () => {
  describe('Timezone Boundaries', () => {
    it('should handle local datetime at 23:59 crossing to next day in UTC', () => {
      const local = '2025-12-06T23:59';
      const utc = localToUTC(local);
      const parsed = new Date(utc);

      expect(parsed.getUTCDate()).toBe(7); // Next day in UTC
    });
  });

  describe('Leap Years', () => {
    it('should handle Feb 29 in leap year', () => {
      const leapDate = '2024-02-29';
      const result = parseStartOfDay(leapDate);

      expect(result.getUTCMonth()).toBe(1);
      expect(result.getUTCDate()).toBe(29);
    });

    it('should handle Feb 28 to Mar 1 boundary in non-leap year', () => {
      const date = new Date(Date.UTC(2025, 1, 28));
      const result = addDays(date, 1);

      expect(result.getUTCMonth()).toBe(2); // March
      expect(result.getUTCDate()).toBe(1);
    });
  });

  describe('Month Boundaries', () => {
    it('should handle Jan 31 + 1 day correctly', () => {
      const date = new Date(Date.UTC(2025, 0, 31));
      const result = addDays(date, 1);

      expect(result.getUTCMonth()).toBe(1); // February
      expect(result.getUTCDate()).toBe(1);
    });

    it('should handle Apr 30 + 1 day correctly', () => {
      const date = new Date(Date.UTC(2025, 3, 30)); // April has 30 days
      const result = addDays(date, 1);

      expect(result.getUTCMonth()).toBe(4); // May
      expect(result.getUTCDate()).toBe(1);
    });
  });

  describe('Negative Dates', () => {
    it('should handle dates before Unix epoch', () => {
      const oldDate = new Date(1960, 0, 1);
      const formatted = getLocalDateString(oldDate);

      expect(formatted).toBe('1960-01-01');
    });
  });
});
```

---

## ⚡ Performance Testing

### Performance Benchmarks:

```typescript
describe('Performance Tests', () => {
  it('should format 1000 dates in under 100ms', () => {
    const dates = Array.from({ length: 1000 }, (_, i) =>
      new Date(2025, 0, 1 + i)
    );

    const start = performance.now();
    dates.forEach(date => formatDate(date));
    const end = performance.now();

    expect(end - start).toBeLessThan(100);
  });

  it('should compare 10000 dates in under 50ms', () => {
    const dates = Array.from({ length: 10000 }, (_, i) =>
      new Date(2025, 0, 1 + (i % 365)).toISOString()
    );

    const start = performance.now();
    dates.sort((a, b) => compareDates(a, b));
    const end = performance.now();

    expect(end - start).toBeLessThan(50);
  });
});
```

---

## 🗂️ Test Data Fixtures

**Archivo**: `frontend/src/__tests__/fixtures/dates.ts`

```typescript
export const dateFixtures = {
  // Fechas normales
  normalDates: {
    local: '2025-12-06T14:30',
    utc: '2025-12-06T19:30:00.000Z',
    dateOnly: '2025-12-06'
  },

  // Boundaries
  midnight: {
    local: '2025-12-06T00:00',
    utc: '2025-12-06T05:00:00.000Z'
  },
  almostMidnight: {
    local: '2025-12-06T23:59',
    utc: '2025-12-07T04:59:00.000Z'
  },

  // Leap year
  leapYear: {
    feb29: '2024-02-29',
    feb28NonLeap: '2025-02-28'
  },

  // Month boundaries
  monthEnd: {
    jan31: '2025-01-31',
    apr30: '2025-04-30',
    dec31: '2025-12-31'
  },

  // Invalid dates
  invalid: {
    emptyString: '',
    malformed: 'not-a-date',
    null: null,
    undefined: undefined
  }
};
```

---

## 📅 Execution Plan

### Phase 1: Setup (1 hora)

- [ ] Configurar Jest en frontend
- [ ] Configurar Jest en backend
- [ ] Crear estructura de carpetas `__tests__`
- [ ] Instalar dependencias de testing
- [ ] Configurar coverage reports

### Phase 2: Frontend Unit Tests (4 horas)

- [ ] Implementar tests para `getLocalDateString()` (30 min)
- [ ] Implementar tests para `getLocalDateTimeString()` (20 min)
- [ ] Implementar tests para `localToUTC()` (30 min)
- [ ] Implementar tests para `utcToLocal()` (30 min)
- [ ] Implementar tests para `isDateTimeInPast()` (20 min)
- [ ] Implementar tests para `calculateAge()` (30 min)
- [ ] Implementar tests para `formatDate()` (30 min)
- [ ] Implementar tests para `compareDates()` (20 min)
- [ ] Implementar tests para funciones restantes (1 hora)

### Phase 3: Backend Unit Tests (2 horas)

- [ ] Implementar tests para `parseStartOfDay()` (30 min)
- [ ] Implementar tests para `parseEndOfDay()` (20 min)
- [ ] Implementar tests para `prepareDateRange()` (30 min)
- [ ] Implementar tests para `addDays()` (30 min)
- [ ] Implementar tests para funciones restantes (30 min)

### Phase 4: Integration Tests (2 horas)

- [ ] Flujo de creación de citas (30 min)
- [ ] Flujo de filtrado de fechas (30 min)
- [ ] Flujo de pagos con fechas (30 min)
- [ ] Flujo de facturas con vencimientos (30 min)

### Phase 5: Edge Cases (1 hora)

- [ ] Tests de timezone boundaries (20 min)
- [ ] Tests de leap years (15 min)
- [ ] Tests de month boundaries (15 min)
- [ ] Tests de invalid inputs (10 min)

### Phase 6: Performance & Coverage (1 hora)

- [ ] Performance benchmarks (20 min)
- [ ] Verificar coverage >90% (20 min)
- [ ] Documentar resultados (20 min)

---

## 📊 Success Criteria

### Definición de "Done":

- [x] Plan de testing documentado
- [ ] ≥90% line coverage en `dateUtils.ts` (frontend)
- [ ] ≥90% line coverage en `dateUtils.ts` (backend)
- [ ] ≥85% branch coverage en ambos
- [ ] Todos los tests pasan en CI/CD
- [ ] Performance benchmarks cumplidos
- [ ] Edge cases documentados y cubiertos
- [ ] Documentación de tests actualizada

---

## 🔧 Configuración de Jest

### Frontend (`frontend/jest.config.js`):

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  collectCoverageFrom: [
    'src/utils/dateUtils.ts',
    '!src/**/*.d.ts'
  ],
  coverageThresholds: {
    global: {
      branches: 85,
      functions: 95,
      lines: 90,
      statements: 90
    }
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts']
};
```

### Backend (`backend/jest.config.js`):

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/utils/dateUtils.ts',
    '!src/**/*.d.ts'
  ],
  coverageThresholds: {
    global: {
      branches: 85,
      functions: 95,
      lines: 90,
      statements: 90
    }
  }
};
```

---

## 📝 Comandos de Testing

```bash
# Frontend
cd frontend
npm run test                 # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # Coverage report
npm run test:dateUtils      # Test solo dateUtils

# Backend
cd backend
npm run test
npm run test:watch
npm run test:coverage
npm run test:dateUtils

# CI/CD
npm run test:ci             # All tests + coverage
```

---

## 🎯 Next Steps

1. **Implementar setup de Jest** (Phase 1)
2. **Escribir tests frontend** (Phase 2)
3. **Escribir tests backend** (Phase 3)
4. **Integration tests** (Phase 4)
5. **Edge cases** (Phase 5)
6. **Verificar coverage** (Phase 6)

---

**Estado**: Plan completo ✅
**Tiempo estimado total**: 11 horas
**Prioridad**: ALTA
**Owner**: QA Team
