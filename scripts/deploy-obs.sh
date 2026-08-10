#!/usr/bin/env bash
# Despliegue de la stack de observabilidad.
#
# Va aparte del blue-green a propósito: la stack vive en su propio proyecto de
# compose (dermicapro-obs) y no debe reiniciarse con cada deploy de la app, o
# perderíamos de vista justo el momento en el que algo puede romperse.
#
# Sin este script el despliegue quedaba a medias. Las configs son bind mounts
# desde el repo, así que el `git reset --hard` del deploy SÍ las cambia en
# disco, pero cada archivo se comportaba distinto:
#
#   - dashboards de Grafana -> se aplicaban solos (updateIntervalSeconds: 30)
#   - prometheus.yml, alerts.yml, alertmanager.yml, config.alloy -> cambiaban
#     en disco pero ningún proceso los releía
#   - versiones de imagen -> no se aplicaban en absoluto
#
# El caso peor no era el cambio que no llegaba, sino la config inválida: la
# stack seguía corriendo con la versión vieja en memoria y reventaba semanas
# después, cuando cualquier cosa reiniciaba ese contenedor, ya sin relación
# visible con el commit que lo causó.
set -euo pipefail

REPO_DIR="/docker/dermicapro-intranet"
cd "$REPO_DIR"

OBS=(docker compose -p dermicapro-obs -f docker-compose.observability.yml)

# 1. Validar antes de tocar nada, para que una config rota falle aquí, en el
#    deploy del commit que la introdujo, y no en un restart futuro.
echo "[obs] Validando configuraciones..."
make obs-check

# 2. Aplicar cambios de imagen y de docker-compose.observability.yml.
#    Idempotente: compose sólo recrea los servicios cuya definición cambió, así
#    que correr esto en cada deploy no reinicia nada de más y de paso corrige
#    el drift si alguien tocó el VPS a mano.
echo "[obs] Aplicando cambios de imagen y de compose..."
make obs-up

# 3. Lo anterior no cubre los cambios de *contenido* de las configs montadas:
#    para compose la definición del servicio no cambió, así que no recrea nada
#    y el proceso sigue con lo que leyó al arrancar.
#
#    Prometheus recarga en caliente, sin perder scrapes ni replay del WAL.
echo "[obs] Recargando Prometheus..."
make obs-reload

#    Alertmanager y Alloy se reinician en vez de recargarse por HTTP. Podrían
#    recargarse con un POST a /-/reload, pero eso obliga a tener un cliente
#    HTTP dentro del contenedor y estas imágenes están quitando BusyBox para
#    cerrar CVEs — a Loki le pasó en 3.5.8 y se quedó sin /bin/sh ni wget. El
#    reinicio tarda un par de segundos y no depende de qué traiga la imagen.
#    Los silencios de Alertmanager sobreviven: viven en su volumen, no en RAM.
echo "[obs] Reiniciando Alertmanager y Alloy..."
"${OBS[@]}" restart alertmanager alloy

echo "[obs] Estado final:"
"${OBS[@]}" ps

echo "[obs] Observabilidad actualizada"
