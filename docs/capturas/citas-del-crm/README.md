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
