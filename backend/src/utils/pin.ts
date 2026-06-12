export const PIN_LENGTH = 4;
export const MAX_PIN_ATTEMPTS = 5;

const WEAK_PINS = new Set([
  '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999',
  '1234', '4321', '0123', '9876',
]);

export const isValidPinFormat = (pin: string): boolean =>
  /^\d{4}$/.test(pin) && !WEAK_PINS.has(pin);
