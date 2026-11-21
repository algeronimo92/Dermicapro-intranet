import React, { useEffect, useRef, useState } from 'react';
import { Select, SelectOption } from './Select';

interface FormSelectProps {
  name: string;
  options: SelectOption[];
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  'aria-label'?: string;
}

/**
 * El Select propio para formularios no controlados (los que leen sus valores
 * con FormData al enviar, como Facturas): guarda su propio valor, vuelve al
 * inicial con el reset del formulario (botón "Limpiar") y conserva la
 * validación nativa de `required`, que el input oculto del Select no tiene.
 */
export const FormSelect: React.FC<FormSelectProps> = ({
  name,
  options,
  defaultValue = '',
  required,
  placeholder,
  'aria-label': ariaLabel,
}) => {
  const [value, setValue] = useState(defaultValue);
  const anchor = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const form = anchor.current?.closest('form');
    if (!form) return;
    const onReset = () => setValue(defaultValue);
    form.addEventListener('reset', onReset);
    return () => form.removeEventListener('reset', onReset);
  }, [defaultValue]);

  return (
    <>
      <Select
        name={name}
        options={options}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        required={required}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
      {/* Un input oculto (type=hidden) no participa en la validación del
          formulario; este sí, y el navegador avisa si queda vacío. */}
      {required && (
        <input
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          required
          value={value}
          onChange={() => undefined}
        />
      )}
      <span ref={anchor} hidden />
    </>
  );
};
