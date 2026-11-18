# Citas que llegan del CRM: cómo se ve en el ERP

Capturas de un entorno local con datos de prueba, enviados por
`POST /api/integrations/crm/appointments`.

## Las citas del CRM en el calendario

Aparecen como cualquier otra cita, a la hora de Lima.

![Calendario semanal con citas enviadas por el CRM](erp-1-calendario.png)

## Ficha de un paciente creado desde el CRM

"Datos por completar" en lugar de una edad y un sexo inventados, y el adelanto
ya como saldo a favor.

![Ficha de paciente con la etiqueta Datos por completar](erp-2-paciente.png)

## Al editarlo hay que completar sus datos

La fecha de nacimiento y el sexo llegan vacíos y son obligatorios.

![Formulario de paciente que exige fecha de nacimiento y sexo](erp-3-completar-datos.png)

## Detalle de la cita

El adelanto con su comprobante, la nota con lo que escribió ventas y el origen.

![Detalle de la cita con adelanto, nota del CRM y origen](erp-4-cita.png)

## Generar el token para el CRM

En Configuración, solo para administradores. Sin token, el ERP no acepta citas
del CRM.

![Sección Integración con el CRM sin token generado](erp-5-token-sin-generar.png)

Al generarlo se muestra una única vez, junto a la dirección del ERP: son los
dos datos que se pegan en el CRM. (El de la imagen es de prueba y ya no existe.)

![Token recién generado con botón para copiar](erp-6-token-generado.png)

Después solo se ven sus últimos caracteres, y se puede regenerar o desactivar.

![Token activo con las opciones de regenerar y desactivar](erp-7-token-activo.png)

Regenerar pide confirmación, porque el token anterior deja de funcionar al
instante.

![Confirmación antes de regenerar el token](erp-8-confirmar-regenerar.png)

