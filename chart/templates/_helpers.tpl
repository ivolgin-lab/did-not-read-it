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
Image pull secret name
*/}}
{{- define "didnotreadit.pullSecretName" -}}
{{ include "didnotreadit.fullname" . }}-pull-secret
{{- end }}

{{/*
Docker config JSON with multiple registry credentials
*/}}
{{- define "didnotreadit.dockerconfigjson" -}}
{"auths":{
{{- $first := true }}
{{- range .Values.imagePullSecret.credentials }}
{{- if not $first }},{{ end }}
{{- $auth := printf "%s:%s" .username .password | b64enc }}
{{ .registry | quote }}: {"username":{{ .username | quote }},"password":{{ .password | quote }},"auth":{{ $auth | quote }}}
{{- $first = false }}
{{- end }}
}}
{{- end }}

{{/*
Secret name for the app
*/}}
{{- define "didnotreadit.secretName" -}}
{{ include "didnotreadit.fullname" . }}
{{- end }}
