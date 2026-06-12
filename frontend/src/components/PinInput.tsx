import React, { useEffect, useRef } from 'react';
import { Delete } from 'lucide-react';

const PIN_LENGTH = 4;

interface PinInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  autoFocus?: boolean;
  error?: boolean;
  disabled?: boolean;
}

export const PinInput: React.FC<PinInputProps> = ({
  value,
  onChange,
  onComplete,
  autoFocus,
  error,
  disabled,
}) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const lastCompletedRef = useRef<string | null>(null);

  useEffect(() => {
    if (autoFocus) inputsRef.current[0]?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (value.length === PIN_LENGTH) {
      if (lastCompletedRef.current !== value) {
        lastCompletedRef.current = value;
        onComplete?.(value);
      }
    } else {
      lastCompletedRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const digits = Array.from({ length: PIN_LENGTH }, (_, i) => value[i] ?? '');

  const setDigit = (index: number, digit: string) => {
    const next = digits.slice();
    next[index] = digit;
    onChange(next.join(''));
  };

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) {
      setDigit(index, '');
      return;
    }
    setDigit(index, raw[raw.length - 1]);
    if (index < PIN_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, PIN_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    if (pasted.length === PIN_LENGTH) {
      inputsRef.current[PIN_LENGTH - 1]?.focus();
    } else {
      inputsRef.current[pasted.length]?.focus();
    }
  };

  const handleKeypadDigit = (digit: string) => {
    if (disabled || value.length >= PIN_LENGTH) return;
    const next = value + digit;
    onChange(next);
    inputsRef.current[Math.min(next.length, PIN_LENGTH - 1)]?.focus();
  };

  const handleKeypadBackspace = () => {
    if (disabled || value.length === 0) return;
    const next = value.slice(0, -1);
    onChange(next);
    inputsRef.current[next.length]?.focus();
  };

  return (
    <div className="pin-input-wrapper">
      <div className={`pin-input-group${error ? ' pin-input-group--error' : ''}`}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => { inputsRef.current[index] = el; }}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={1}
            className="pin-input-box"
            value={digit}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={disabled}
          />
        ))}
      </div>

      <div className="pin-keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button
            key={digit}
            type="button"
            className="pin-keypad-btn"
            onClick={() => handleKeypadDigit(digit)}
            disabled={disabled || value.length >= PIN_LENGTH}
            tabIndex={-1}
          >
            {digit}
          </button>
        ))}
        <div className="pin-keypad-spacer" />
        <button
          type="button"
          className="pin-keypad-btn"
          onClick={() => handleKeypadDigit('0')}
          disabled={disabled || value.length >= PIN_LENGTH}
          tabIndex={-1}
        >
          0
        </button>
        <button
          type="button"
          className="pin-keypad-btn pin-keypad-btn--action"
          onClick={handleKeypadBackspace}
          disabled={disabled || value.length === 0}
          aria-label="Borrar"
          tabIndex={-1}
        >
          <Delete size={18} />
        </button>
      </div>
    </div>
  );
};
