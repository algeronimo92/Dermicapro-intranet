# Observabilidad

Monitoreo del **ERP** (este repo): métricas, logs, dashboards y alertas. Todo
self-hosted en el mismo VPS, sin servicios de terceros y sin que los datos de
pacientes salgan de la infraestructura propia.

## Arquitectura: dos stacks, un n8n

Hay dos sistemas en dos VPS distintos, y **cada uno tiene su propio stack de
observabilidad completo e independiente**:

| Sistema | VPS | Grafana |
|---|---|---|
| ERP (este repo) | vps-erp | `grafana.dermicapro.app` |
| CRM | vps-crm | `grafana.chat.dermicapro.app` |

No se centralizó a propósito. Un único Grafana con agentes remotos suena mejor
sobre el papel, pero acopla el monitoreo de un sistema a que la máquina *del
otro* esté viva y alcanzable, y obliga a exponer endpoints de ingesta públicos.
Con stacks independientes, si un VPS se cae el otro sigue viéndose a sí mismo
perfectamente, y la superficie expuesta a internet es cero: el único servicio
público es Grafana, detrás de Traefik y con login.

Lo que sí está unificado es **la capa de notificación**: los dos Alertmanager
apuntan al mismo n8n, cada uno por su propio webhook
(`/webhook/erp/health` aquí, otro distinto en el CRM). Así hay un
solo sitio donde decidir a quién se avisa, sin acoplar la infraestructura.

Además, toda serie de este stack lleva `system="erp"` y `host="vps-erp"`, y los
resúmenes de alerta empiezan por `[erp]`. Así, aunque los dos sistemas acaben
en el mismo grupo de WhatsApp, nunca hay duda de cuál se rompió.

La aplicación del ERP se sirve en el dominio apex (`dermicapro.app` y
`www.dermicapro.app`), de ahí que su Grafana sea `grafana.dermicapro.app`, con
el mismo patrón que el `splunk.dermicapro.app` que ya existía.

## Qué hay montado

| Componente | Para qué | Puerto |
|---|---|---|
| **Grafana** | Dashboards y exploración de logs | 3000 (loopback + Traefik) |
| **Prometheus** | Almacena métricas, evalúa reglas de alerta | 9090 (interno) |
| **Loki** | Almacena y busca logs | 3100 (interno) |
| **Alloy** | Lee los logs de Docker y los manda a Loki | 12345 (interno) |
| **Alertmanager** | Agrupa alertas y las envía al webhook de n8n | 9093 (interno) |
| **node-exporter** | CPU, RAM, disco y red del VPS | 9100 (interno) |
| **cAdvisor** | Recursos por contenedor | 8080 (interno) |
| **postgres-exporter** | Conexiones, transacciones, tamaño de la BD | 9187 (interno) |

Sólo Grafana es accesible desde fuera, a través de Traefik y con login. El resto
vive en la red privada `dermicapro-observability`.

```
                                  ┌──────────────┐
   Docker API ──► Alloy ─────────►│     Loki     │──┐
                                  └──────────────┘  │
                                                    ├──► Grafana ──► Traefik ──► navegador
   backend /metrics ──┐                             │
   node-exporter    ──┼──► Prometheus ──────────────┘
   cAdvisor         ──┤         │
   postgres-exporter──┤         └──► Alertmanager ──► webhook n8n ──► WhatsApp / Telegram / email
   Traefik /metrics ──┘
```

## Puesta en marcha

### 1. Variables de entorno

En `.env`:

```bash
# Token que protege /metrics en el backend
METRICS_TOKEN=<openssl rand -hex 32>

# Grafana
GRAFANA_ADMIN_PASSWORD=<contraseña fuerte>
GRAFANA_DOMAIN=grafana.dermicapro.app
GRAFANA_ROOT_URL=https://grafana.dermicapro.app

# n8n: webhook propio del ERP, distinto del que usa el CRM.
# OJO: la URL de PRODUCCION es /webhook/. La de /webhook-test/ solo responde
# mientras el editor de n8n esta abierto escuchando; si se deja esa, las
# alertas fallan en silencio en cuanto se cierra la pestana.
N8N_ALERT_WEBHOOK=https://n8n.dermicapro.online/webhook/erp/health

# Rol de solo lectura para postgres-exporter (ver más abajo)
DB_EXPORTER_USER=dermicapro_monitor
DB_EXPORTER_PASSWORD=<contraseña fuerte>

# Datasource "Leads": tabla leads_grafana, en la Postgres del OTRO VPS.
# Se alcanza por internet, no por la red de Docker.
LEADS_DB_HOST=panel.dermicapro.online
LEADS_DB_PORT=5432
LEADS_DB_NAME=dermicapro_leads
LEADS_DB_USER=<rol de solo lectura>
LEADS_DB_PASSWORD=<contraseña>
LEADS_DB_SSLMODE=require
```

El backend ya recibe `METRICS_TOKEN` desde `.env` en los cuatro ficheros de
compose, así que no hay que tocar nada más.

Si `METRICS_TOKEN` no está definido, `/metrics` queda abierto sin
autenticación. No está expuesto públicamente (el nginx del frontend sólo proxea
`/api` y `/uploads`), pero conviene ponerlo igualmente.

### 2. Rol de sólo lectura para PostgreSQL

El exporter no debe conectarse con el usuario dueño de la base. Un rol con
`pg_monitor` le da acceso a todas las vistas de estadísticas y a nada más:

```bash
make obs-db-role          # crear o verificar el rol
make obs-db-role-rotate   # generar contraseña nueva y actualizar .env
```

El script ([scripts/monitoring-setup.sh](scripts/monitoring-setup.sh)) es
idempotente y comprueba dos cosas al terminar: que el rol conecta y lee
`pg_stat_*`, y que **no** puede leer la tabla `patients`. Lo segundo se verifica
explícitamente en vez de darlo por hecho a partir del `GRANT`, porque es el
motivo entero de que el rol exista.

Se hace por script y no copiando el SQL a mano precisamente porque ahí es donde
se cuela un `GRANT` de más y el exporter acaba con permisos sobre datos de
pacientes.

El entorno explícito gana sobre `.env`, así que se puede apuntar a otra base sin
editar el fichero de producción:

```bash
DB_HOST=dermicapro-db ./scripts/monitoring-setup.sh   # contra la de desarrollo
```

Si `DB_EXPORTER_USER` se deja vacío, el exporter cae al usuario de la
aplicación: funciona, pero con muchos más permisos de los necesarios.

### 3. DNS

Apuntar `grafana.dermicapro.app` a la IP de este VPS. Traefik pedirá el
certificado a Let's Encrypt automáticamente en el primer acceso.

Al estar en segundo nivel, este dominio sí quedaría cubierto por un wildcard
`*.dermicapro.app` si algún día se pasa a DNS-01. El del CRM no:
`grafana.chat.dermicapro.app` es tercer nivel y necesitaría su propio
`*.chat.dermicapro.app`. Con HTTP-01 por dominio, que es lo que hay ahora, da
igual en ambos casos.

### 4. Levantar

```bash
make obs-check   # valida las configs antes de arrancar
make obs-up      # genera los secretos y levanta el stack
make obs-ps      # comprobar que todo está healthy
```

Grafana queda en `https://grafana.dermicapro.app` con el usuario `admin` y la
contraseña de `GRAFANA_ADMIN_PASSWORD`. Los tres dashboards aparecen
automáticamente en la carpeta "DermicaPro".

### 5. Recargar Traefik

Traefik necesita reiniciarse una vez para exponer sus métricas:

```bash
docker compose -f traefik/docker-compose.yml up -d
```

### 6. Redesplegar la aplicación

Los contenedores de la app tienen que arrancar de nuevo para coger el nuevo
driver de logs y el endpoint `/metrics`:

```bash
./scripts/deploy-prod.sh
```

## Dashboards

**DermicaPro - API** — peticiones por minuto, tasa de 5xx, latencia p50/p95/p99,
endpoints más lentos y con más tráfico, event loop lag y memoria del proceso.
Es el dashboard para responder "¿va lento? ¿por qué?".

**DermicaPro - Logs** — volumen de logs por contenedor, respuestas por estado,
endpoints que más errores devuelven y un buscador de texto libre sobre todos los
logs. Como el backend ya emite JSON, se puede filtrar por `http_status` y
`http_method` sin escribir expresiones regulares.

**DermicaPro - Infraestructura** — CPU/RAM/disco del VPS, recursos por
contenedor, conexiones y cache hit ratio de PostgreSQL, y días que quedan hasta
que caduque el certificado TLS.

**DermicaPro - Negocio** — citas atascadas, comisiones sin aprobar y sesiones
por encima del paquete, con su evolución en el tiempo. Si una línea sube y no
vuelve a bajar, hay un proceso que nadie está cerrando.

**DermicaPro - Leads y agenda** — el único dashboard que no lee de Prometheus:
consulta por SQL la tabla `leads_grafana`. Ver la sección siguiente.

## Leads: el datasource SQL

`leads_grafana` vive en la Postgres del VPS del CRM
(`panel.dermicapro.online/dermicapro_leads`) y no la escribe este backend, así
que no hay dónde colgar un exporter de Prometheus: son filas de agenda ya
escritas, no series temporales que alguien publique. Por eso este dashboard
consulta la base directamente con SQL en vez de con PromQL, y es la única
excepción a la regla del resto del stack.

La tabla tiene ocho columnas: `id`, `nombre`, `dni`, `telefono`, `tratamiento`,
`fecha`, `hora`, `vendedor`. **No hay columna de estado**, así que el dashboard
no puede decir nada sobre asistencia: "agendadas vs atendidas", "% de asistencia"
y "% de no-show" son imposibles hasta que la tabla guarde si la cita ocurrió.
Todo lo demás sale de las ocho columnas.

### Zona horaria

`fecha` es DATE y `hora` es TIME, ambas en hora de Trujillo. Grafana envía los
límites del rango en UTC, así que comparar contra `fecha + hora` a secas
desplazaría todo cinco horas. Las consultas usan siempre el mismo par de
patrones:

```sql
-- filtrar por el rango del dashboard
WHERE $__timeFilter((fecha + hora) AT TIME ZONE 'America/Lima')

-- devolver una columna de tiempo que caiga en el día correcto
SELECT (fecha::timestamp AT TIME ZONE 'America/Lima') AS "time"
```

Sin el `AT TIME ZONE`, las citas de después de las 19:00 aparecen contadas en el
día siguiente.

### Rol de sólo lectura

Quien entra a Grafana puede escribir SQL arbitrario contra este datasource desde
**Explore**: no queda limitado a los paneles. Con el usuario dueño de la base eso
es un `DROP TABLE` a un descuido de distancia. En la Postgres del CRM:

```sql
CREATE ROLE grafana_leads_ro LOGIN PASSWORD '<contraseña fuerte>';
GRANT CONNECT ON DATABASE dermicapro_leads TO grafana_leads_ro;
GRANT USAGE ON SCHEMA public TO grafana_leads_ro;
GRANT SELECT ON public.leads_grafana TO grafana_leads_ro;
```

Sólo esa tabla, y sólo `SELECT`.

### TLS

La conexión sale del VPS del ERP y cruza internet hasta el del CRM. Con
`sslmode=disable` viajan en claro la contraseña y los datos de los pacientes
(nombre, DNI y teléfono). Debe ser `require` como mínimo; si el servidor remoto
no tiene TLS configurado, la alternativa es no exponer el 5432 y llegar por
túnel o por red privada.

### Datos personales

Este dashboard muestra nombre, DNI y teléfono. Es el único del stack que lo
hace. Grafana no tiene acceso anónimo ni enlaces públicos habilitados
(`GF_AUTH_ANONYMOUS_ENABLED=false`), y así debe quedarse.

## Métricas de negocio

Antes que CPU y memoria, lo que de verdad duele son las fallas silenciosas: las
que no tumban nada, no generan un 5xx y no aparecen en ningún log de error.
[business-metrics.service.ts](backend/src/services/business-metrics.service.ts)
las calcula en segundo plano cada 60s y las publica en `/metrics`:

| Métrica | Qué detecta | Por qué importa |
|---|---|---|
| `dermicapro_appointments_stuck_in_progress` | Citas en `in_progress` cuya hora pasó hace más de 6h | Se abrieron y nadie las cerró: no generan historia clínica ni facturan |
| `dermicapro_commissions_pending_aged` | Comisiones en `pending` de más de 7 días | El equipo de ventas no cobra hasta que un admin las apruebe |
| `dermicapro_sessions_over_package` | Sesiones con `sessionNumber` > `totalSessions` del paquete (acumulado) | Se están regalando sesiones. Es justo la validación que CLAUDE.md marca como ausente |
| `dermicapro_sessions_over_package_recent` | Lo mismo, sólo las creadas en las últimas 24h | Es la que alerta: la acumulada nunca baja sola (ver más abajo) |
| `dermicapro_business_metrics_last_success_timestamp_seconds` | Cuándo se calcularon por última vez | Sin esto, si el recolector muere las gauges se congelan y todo parece correcto |

Los umbrales se ajustan con `METRICS_STUCK_APPOINTMENT_HOURS`,
`METRICS_AGED_COMMISSION_DAYS` y `METRICS_OVER_PACKAGE_WINDOW_HOURS` en `.env`.

### Por qué hay dos métricas para lo mismo

Las otras tres gauges se apagan solas: una cita atascada deja de contar en
cuanto se cierra, y una comisión vieja en cuanto un admin la aprueba. Las
sesiones por encima del paquete no: nada purga esa condición y una sesión mal
creada sólo sale del recuento si alguien la corrige o la borra a mano. Alertando
sobre el acumulado, la primera violación deja la alerta encendida para siempre y
el equipo aprende a ignorar los avisos de negocio — que es exactamente lo que
pasó en el CRM con los fallos del outbox.

Por eso la alerta mira la ventana móvil, que vuelve a cero una vez revisado el
caso y suena de nuevo si el problema se repite, y el acumulado se queda en el
dashboard como indicador de cuánta deuda de datos hay. El panel sigue el mismo
criterio: se pone en rojo por las de 24h, no por el histórico.

No se mide `completedSessions > totalSessions` porque la base ya lo impide con
el constraint `service_instances_completed_sessions_lte_total_check`: sería una
métrica que nunca puede dispararse, y esas dan una falsa sensación de cobertura.
Lo de `sessionNumber`, en cambio, cruza dos tablas y un CHECK de Postgres no
puede expresarlo, por eso ahí sí hace falta medir.

El cálculo va en un intervalo aparte y no durante el scrape a propósito: una
consulta lenta bloqueando `/metrics` haría que Prometheus perdiera **todas** las
métricas del backend por timeout, no sólo estas.

## Seguir una petición de punta a punta

Cada petición recibe un `request_id` ([requestId.ts](backend/src/middlewares/requestId.ts))
que se devuelve en la cabecera `X-Request-Id` y aparece en todas sus líneas de
log. Cuando alguien reporta un error, ese id lleva directo a su petición.

En Grafana el `request_id` de cualquier línea es un enlace: al pulsarlo trae el
resto de líneas de esa misma petición (está configurado como `derivedField` en
la fuente de datos de Loki).

Si una petición revienta, [errorHandler.ts](backend/src/middlewares/errorHandler.ts)
emite una línea `event="unhandled_error"` con el stack trace completo **en un
solo JSON**. Esto importa: un `console.error(err)` normal escupe el stack en
varias líneas y Loki las indexaría como entradas sueltas, dejando el error
partido en trozos que no se pueden correlacionar. El dashboard de Logs tiene un
panel dedicado a estos errores.

Es lo que normalmente se delega en Sentry, resuelto dentro de la propia
infraestructura y sin que los datos salgan a un tercero. Lo que Sentry daría
además: agrupación de errores repetidos, alertas por regresión y variables
locales del stack. Si algún día hace falta ese nivel, ahí encaja.

## Métricas del pool de conexiones

[db-metrics.ts](backend/src/middlewares/db-metrics.ts) publica el estado del
pool de `pg`: `dermicapro_pg_pool_total`, `_idle` y `_waiting`.

postgres-exporter ve las conexiones desde el lado del servidor; esto las ve
desde el lado de la aplicación. La diferencia importa: **`waiting` sólo se ve
aquí**, y es la señal de que el pool se quedó corto y las peticiones hacen cola
antes siquiera de tocar la base.

No se usan las métricas nativas de Prisma: con un driver adapter el pool lo
gestiona `pg`, no el motor de Prisma, así que `previewFeatures = ["metrics"]`
no reportaría este pool. Por eso `config/database.ts` crea el `pg.Pool`
explícitamente y se lo pasa a `PrismaPg`, en vez de dejar que lo construya a
partir del string de conexión.

## Alertas

Definidas en `observability/prometheus/alerts.yml`. Las `critical` son las que
justifican despertar a alguien:

| Alerta | Condición | Severidad |
|---|---|---|
| `SinBackendActivo` | Ni blue ni green responden | critical |
| `BackendCaido` | Un backend sin responder 2 min | critical |
| `PostgresCaido` | La base de datos no responde | critical |
| `TasaDeErrores5xxAlta` | >5% de 5xx durante 5 min | critical |
| `ContenedorReiniciandose` | >2 reinicios en 15 min | critical |
| `DiscoCasiLleno` | <15% de disco libre | critical |
| `LatenciaP95Alta` | p95 >2s durante 10 min | warning |
| `EndpointLento` | Un endpoint con p95 >5s | warning |
| `EventLoopBloqueado` | Lag p99 >0.5s | warning |
| `ConexionesPostgresAltas` | >80% de max_connections | warning |
| `DeadlocksEnPostgres` | Cualquier deadlock | warning |
| `PicoDeAutenticacionesFallidas` | >30 respuestas 401/min | warning |
| `RateLimitActivandose` | >10 respuestas 429/min | warning |
| `CertificadoTLSPorCaducar` | Menos de 14 días | warning |
| `MemoriaDelHostAlta` / `CPUDelHostAlta` | >90% RAM / >85% CPU | warning |
| `DiscoSeLlenaEn24h` | Proyección lineal a 24h | warning |
| `ContenedorSinMemoria` | >90% del límite | warning |
| `CitasAtascadasEnProgreso` | Citas en `in_progress` >6h | warning |
| `ComisionesPendientesAntiguas` | Comisiones `pending` >7 días | warning |
| `SesionesPorEncimaDelPaquete` | `sessionNumber` > `totalSessions` en sesiones de las últimas 24h | warning |
| `MetricasDeNegocioObsoletas` | El recolector lleva 5 min sin refrescar | warning |
| `ExporterCaido` | Un exporter sin responder | warning |

Hay dos reglas de inhibición para no recibir cascadas: si PostgreSQL cae no se
notifica además que el backend falla, y una alerta `critical` silencia la
`warning` equivalente.

Tras editar `alerts.yml` en local:

```bash
make obs-check && make obs-reload
```

En producción no hace falta: un push a `main` lo aplica solo (ver
[Despliegue automático](#despliegue-automático)).

## Dónde encaja n8n

Alertmanager hace un POST al webhook de n8n con este cuerpo:

```json
{
  "receiver": "n8n",
  "status": "firing",
  "alerts": [
    {
      "status": "firing",
      "labels": { "alertname": "TasaDeErrores5xxAlta", "severity": "critical", "instance": "dermicapro-backend-blue" },
      "annotations": { "summary": "...", "description": "..." },
      "startsAt": "2026-08-07T14:23:00Z"
    }
  ],
  "commonLabels": { "severity": "critical" }
}
```

A partir de ahí n8n decide qué hacer. Un workflow razonable para la clínica:

1. **Webhook** (POST, path `erp/health`)
2. **Switch** sobre `{{$json.commonLabels.severity}}`
   - `critical` → WhatsApp/Telegram inmediato, a cualquier hora
   - `warning` → si está entre las 8:00 y 20:00 hora de Lima, mensaje al grupo;
     si no, acumular para un resumen matutino
3. **IF** sobre `{{$json.status}}` → si es `resolved`, mandar el aviso de que ya
   se resolvió en vez de una alerta nueva

n8n también sirve para lo que ninguna de estas herramientas cubre: alertas de
negocio, no de infraestructura. Por ejemplo, un cron diario que consulte la base
de datos y avise de citas que quedaron en `in_progress` sin cerrar, comisiones
pendientes de aprobar más de una semana, o facturas vencidas. Eso es lógica de
negocio y n8n es el sitio correcto para ella.

Para probar el webhook sin esperar a que falle algo:

```bash
curl -X POST https://n8n.dermicapro.online/webhook/erp/health \
  -H 'Content-Type: application/json' \
  -d '{"status":"firing","commonLabels":{"severity":"critical"},"alerts":[{"labels":{"alertname":"Prueba"},"annotations":{"summary":"Prueba manual"}}]}'
```

## Operación

```bash
make obs-up        # levantar
make obs-down      # parar (conserva datos)
make obs-db-role   # crear/verificar el rol de sólo lectura de PostgreSQL
make obs-ps        # estado
make obs-logs      # logs del propio stack
make obs-check     # validar configs
make obs-reload    # recargar Prometheus sin reiniciar
make obs-targets   # ver qué está scrapeando Prometheus y si algo falla
make obs-alerts    # alertas activas ahora mismo
make obs-clean     # borrar TODO incluido el histórico
```

### Despliegue automático

En producción no se corre nada de lo anterior a mano. El job `deploy` de
`.github/workflows/docker-ci.yml`, tras desplegar la aplicación, ejecuta
`scripts/deploy-obs.sh` en el VPS: valida las configs, aplica los cambios de
imagen y de compose, recarga Prometheus y reinicia Alertmanager y Alloy.

Antes esto no ocurría y el despliegue quedaba a medias de una forma difícil de
notar. Las configs son bind mounts desde el repo, así que el `git reset --hard`
del deploy sí cambiaba los archivos en disco, pero cada uno se comportaba
distinto: los dashboards de Grafana se aplicaban solos (los relee cada 30 s),
`prometheus.yml` y compañía cambiaban en disco sin que nadie los releyera, y
las versiones de imagen no se aplicaban en absoluto. Lo peor no era el cambio
que no llegaba, sino la config inválida: la stack seguía funcionando con la
versión vieja en memoria y reventaba semanas después, en cuanto algo reiniciaba
ese contenedor, ya sin relación visible con el commit culpable.

El paso de observabilidad va en un step separado del deploy de la aplicación
porque `make obs-up` aborta si faltan `METRICS_TOKEN` o `DB_EXPORTER_PASSWORD`
en el `.env` del VPS, y un problema de monitoreo no debe tumbar el despliegue
de la aplicación.

### Consultas útiles en Grafana

LogQL, en la pestaña Explore con la fuente Loki:

```logql
# Todos los errores del backend
{container=~"dermicapro-backend.*", http_status=~"5.."}

# Peticiones lentas (más de 3 segundos)
{container=~"dermicapro-backend.*"} | json | duration_ms > 3000

# Todo lo que tocó una cita concreta
{container=~"dermicapro-backend.*"} |= "8f3e1c2a-..."

# Intentos de login fallidos
{container=~"dermicapro-backend.*", http_status="401"} | json | uri =~ ".*auth/login.*"
```

PromQL, con la fuente Prometheus:

```promql
# Endpoints ordenados por tiempo total consumido
topk(10, sum by (route) (rate(http_request_duration_seconds_sum[5m])))

# Peticiones por minuto por endpoint
sum by (route) (rate(http_requests_total[5m])) * 60

# Percentil 99 de un endpoint concreto
histogram_quantile(0.99, sum by (le) (rate(http_request_duration_seconds_bucket{route="/api/appointments"}[5m])))
```

## Retención y disco

| Dato | Retención | Dónde |
|---|---|---|
| Métricas | 90 días o 8 GB | volumen `dermicapro_prometheus_data` |
| Logs | 30 días | volumen `dermicapro_loki_data` |
| Logs en disco local | 20 MB x 5 por contenedor | `/var/lib/docker/containers` |

Los logs locales son sólo un buffer: si Loki se cae, Alloy los recupera cuando
vuelve. La fuente de verdad a largo plazo es Loki.

Para ajustar la retención de métricas, cambiar `--storage.tsdb.retention.time`
en `docker-compose.observability.yml`. Para la de logs, `retention_period` en
`observability/loki/loki-config.yml`.

Consumo aproximado en reposo: ~900 MB de RAM entre los ocho contenedores. Cada
uno tiene un límite en `deploy.resources.limits`; si el VPS va justo, los
primeros candidatos a recortar son cAdvisor (384 MB) y Prometheus (1 GB).

## Cambios que trajo este stack

**El driver de logs pasó de `splunk` a `json-file`** en los cuatro
`docker-compose.prod*.yml`. Con el driver splunk, `docker logs` y
`make logs-backend` no devolvían nada en producción (no hay buffer local) y el
arranque de un contenedor se bloqueaba si Splunk no respondía. Ahora Alloy lee
por la API de Docker, que necesita `json-file`.

El routing de `splunk.dermicapro.app` en `traefik/dynamic/splunk.yml` sigue en
pie por si se quiere conservar la instancia para consultar el histórico. Cuando
ya no haga falta, borrar ese fichero y las variables `SPLUNK_*` de `.env`.

**Traefik pasó de `--log.level=DEBUG` a `INFO`** y expone métricas en el puerto
interno 8082. Con DEBUG y los logs yendo a Loki, el disco del VPS se llenaría en
días.

**El backend expone `GET /metrics`** ([backend/src/middlewares/metrics.ts](backend/src/middlewares/metrics.ts)).
Las rutas se normalizan antes de usarse como etiqueta: los UUID y los números
se colapsan a `:id`, porque si no cada cita crearía una serie temporal nueva en
Prometheus. Hay además un tope de 200 rutas distintas.

## Verificado en local

El stack se levantó completo contra la aplicación de desarrollo y se comprobó
punta a punta: `/metrics` devuelve 401 sin token y 200 con él; Prometheus
descubre el backend por la API de Docker y lo scrapea; las 19 reglas de alerta
se evalúan sin errores; Alloy envía a Loki los logs de todos los contenedores
con las etiquetas `event`, `http_status` y `http_method` ya extraídas del JSON;
Grafana levanta con las 3 fuentes de datos y los 3 dashboards provisionados; y
una alerta real recorrió el camino completo hasta el webhook.

**Dos componentes no se pudieron verificar en local: node-exporter y cAdvisor.**
No es un problema de configuración sino de Docker Desktop en Windows:
node-exporter necesita montar `/` como `rslave`, que Docker Desktop no permite,
y cAdvisor busca el layout `image/overlay2/layerdb/` que no existe porque
Docker Desktop usa el driver `overlayfs`. En un VPS Linux con `overlay2` (lo
normal en Ubuntu/Debian) ambos funcionan. Al levantar el stack en el servidor,
lo primero que hay que mirar es `make obs-targets`: si esos dos aparecen como
`up`, los paneles de host y contenedores del dashboard de Infraestructura y las
alertas `DiscoCasiLleno`, `MemoriaDelHostAlta`, `CPUDelHostAlta`,
`ContenedorReiniciandose` y `ContenedorSinMemoria` tienen datos.

## Pendientes conocidos

**Las versiones están fijadas.** Todas las imágenes tienen tag explícito. Para
actualizar, cambiar el tag en `docker-compose.observability.yml`, correr
`make obs-check` y `make obs-up`. Los dashboards usan `schemaVersion: 39`,
compatible con Grafana 11.x.

**El datasource Leads conecta con el dueño de la base y sin TLS.** Las dos cosas
están explicadas arriba y las dos se arreglan en la Postgres del CRM, no aquí:
crear `grafana_leads_ro` y pasar `LEADS_DB_SSLMODE` a `require`.

**Al dashboard de leads le falta el estado de la cita.** En cuanto
`leads_grafana` tenga una columna que diga si la cita se atendió, entran los
paneles de asistencia y de no-show, que hoy no existen porque el dato no está.
