{{/*
Expand the name of the chart.
*/}}
{{- define "didnotreadit.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "didnotreadit.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "didnotreadit.labels" -}}
helm.sh/chart: {{ include "didnotreadit.name" . }}-{{ .Chart.Version | replace "+" "_" }}
{{ include "didnotreadit.selectorLabels" . }}
app.kubernetes.io/version: {{ .Values.app.image.tag | default .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "didnotreadit.selectorLabels" -}}
app.kubernetes.io/name: {{ include "didnotreadit.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
App image
*/}}
{{- define "didnotreadit.appImage" -}}
{{ .Values.app.image.repository }}:{{ .Values.app.image.tag | default .Chart.AppVersion }}
{{- end }}

{{/*
Migrations image
*/}}
{{- define "didnotreadit.migrationsImage" -}}
{{ .Values.migrations.image.repository }}:{{ .Values.migrations.image.tag | default .Chart.AppVersion }}
{{- end }}

{{/*
Database URL — either from external config or built from bitnami subchart
*/}}
{{- define "didnotreadit.databaseUrl" -}}
{{- if not .Values.postgresql.enabled }}
{{- required "externalDatabase.url is required when postgresql.enabled is false" .Values.externalDatabase.url }}
{{- else }}
{{- $host := printf "%s-postgresql" .Release.Name }}
{{- $user := .Values.postgresql.auth.username }}
{{- $db := .Values.postgresql.auth.database }}
{{- printf "postgresql://%s:$(POSTGRES_PASSWORD)@%s:5432/%s" $user $host $db }}
{{- end }}
{{- end }}

{{/*
Secret name for the app
*/}}
{{- define "didnotreadit.secretName" -}}
{{ include "didnotreadit.fullname" . }}
{{- end }}
