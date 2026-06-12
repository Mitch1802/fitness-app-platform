ARG PYTHON_VERSION=3.11.2-bullseye

FROM python:${PYTHON_VERSION} AS python

# =========================
# Build-Stage (Python Wheels)
# =========================
FROM python AS python-build-stage
ARG BUILD_ENVIRONMENT=production

RUN apt-get update && apt-get install --no-install-recommends -y \
    build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY ./django/requirements .
RUN pip wheel --wheel-dir /usr/src/app/wheels -r ${BUILD_ENVIRONMENT}.txt

# =========================
# Runtime-Stage
# =========================
FROM python AS python-run-stage
ARG BUILD_ENVIRONMENT=production
ARG APP_HOME=/app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV BUILD_ENV=${BUILD_ENVIRONMENT}

WORKDIR ${APP_HOME}

RUN addgroup --system django && \
    adduser --system --ingroup django django

RUN mkdir -p ${APP_HOME}/db ${APP_HOME}/staticfiles && \
    chown -R django:django ${APP_HOME}

COPY --from=python-build-stage /usr/src/app/wheels /wheels/
RUN pip install --no-cache-dir --no-index --find-links=/wheels/ /wheels/* \
    && rm -rf /wheels/

COPY --chown=django:django ./docker/django/entrypoint /entrypoint
RUN sed -i 's/\r$//g' /entrypoint && chmod +x /entrypoint

COPY --chown=django:django ./docker/django/start /start
RUN sed -i 's/\r$//g' /start && chmod +x /start

COPY --chown=django:django ./django ${APP_HOME}

USER django

ENTRYPOINT ["/entrypoint"]
