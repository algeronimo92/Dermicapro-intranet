# Documentación de DermicaPro

Toda la documentación del proyecto vive aquí. En la raíz solo quedan
`README.md` (presentación del repo) y `CLAUDE.md` (guía para Claude Code).

> Muchos documentos antiguos usan nombres de modelos previos:
> `Order` → `ServiceInstance`, `AppointmentService` → `Session`,
> `Invoice` → `PaymentOrder`.

| Carpeta | Contenido | Vigencia |
|---|---|---|
| [`arquitectura/`](arquitectura/) | Arquitectura de backend, analytics, formulario de citas y diagramas ER | Referencia (revisar contra el código) |
| [`negocio/`](negocio/) | Reglas de negocio, comisiones, RR. HH., escenarios de paquetes, features | Referencia |
| [`modulos/`](modulos/) | Documentación por módulo: citas, pacientes, historial médico, roles, iconos, tema dark/light | Referencia |
| [`infraestructura/`](infraestructura/) | Docker, observabilidad, rate limiting | Vigente |
| [`guias/`](guias/) | Instalación, inicio rápido, troubleshooting, pruebas de analytics | Parcialmente desactualizado |
| [`planes/`](planes/) | Planes y propuestas antiguos, y el [plan de rediseño actual](planes/PLAN_REDISENO_2027.md) | Ver cada archivo |
| [`historial/`](historial/) | Resúmenes de implementaciones, fixes y mejoras ya hechas | Histórico, solo consulta |

## Documentos clave

- [Reglas de negocio](negocio/REGLAS_DE_NEGOCIO.md)
- [Módulo de comisiones](negocio/MODULO_COMISIONES.md)
- [Arquitectura del backend](arquitectura/BACKEND_ARCHITECTURE.md)
- [Arquitectura de analytics](arquitectura/ANALYTICS_ARCHITECTURE.md)
- [Guía de Docker](infraestructura/DOCKER-README.md)
- [Observabilidad](infraestructura/OBSERVABILIDAD.md)

La documentación que acompaña al código se queda junto a él:
[`frontend/src/config/README.md`](../frontend/src/config/README.md) y
[`frontend/src/config/STATE_MACHINE_README.md`](../frontend/src/config/STATE_MACHINE_README.md).
