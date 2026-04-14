# Replicated Release — Implementation Proposal

Distribute didnotreadit as a Replicated application using a Helm chart, enabling enterprise customers to install via Helm CLI, KOTS Admin Console, or Embedded Cluster.

---

## Overview

Replicated acts as a distribution layer between us (vendor) and customers. We:
1. Package the app as a Helm chart
2. Create a Replicated release containing the chart + manifests
3. Promote releases through channels (Unstable → Beta → Stable)
4. Customers pull from `registry.replicated.com` using their license

---

## What Needs to Be Created

### 1. Helm Chart (`chart/`)

Standard Helm chart packaging all three components:

```
chart/
├── Chart.yaml
├── values.yaml
├── templates/
│   ├── _helpers.tpl
│   ├── app-deployment.yaml       # Next.js app (didnotreadit-app image)
│   ├── app-service.yaml          # ClusterIP service for the app
│   ├── migrations-job.yaml       # Job using didnotreadit-migrations image
│   ├── postgresql-statefulset.yaml  # PostgreSQL 16
│   ├── postgresql-service.yaml   # Headless service for PG
│   ├── postgresql-pvc.yaml       # Persistent volume claim
│   ├── secret.yaml               # DB credentials, session secret
│   └── configmap.yaml            # Environment config
```

**Chart.yaml:**
```yaml
apiVersion: v2
name: didnotreadit
description: The front page of things nobody read
type: application
version: 0.1.0        # chart version — bumped with each release
appVersion: "1.0.0"   # app version — matches our git tags
dependencies:
  - name: replicated
    repository: oci://registry.replicated.com/library
    version: 1.18.2
```

**values.yaml (key settings):**
```yaml
app:
  replicaCount: 1
  image:
    repository: proxy.replicated.com/proxy/didnotreadit/DOCKERHUB_USER/didnotreadit-app
    tag: ""            # defaults to Chart.appVersion
  service:
    type: ClusterIP
    port: 3000
  sessionSecret: ""    # generated if empty

migrations:
  image:
    repository: proxy.replicated.com/proxy/didnotreadit/DOCKERHUB_USER/didnotreadit-migrations
    tag: ""

postgresql:
  image: postgres:16-alpine
  storage: 10Gi
  user: didnotreadit
  password: ""         # generated if empty
  database: didnotreadit
```

**Key template details:**
- `migrations-job.yaml` uses a Helm hook (`helm.sh/hook: pre-install,pre-upgrade`) to run `drizzle-kit push` + search trigger SQL before the app starts
- App deployment has an `initContainer` or `depends-on` waiting for migrations to complete
- Images reference the Replicated proxy registry (`proxy.replicated.com/proxy/<app-slug>/...`) so customers can pull private images using their license
- Secrets generate random values for `sessionSecret` and `postgresql.password` if not provided, using `randAlphaNum` with `lookup` to persist across upgrades

### 2. Replicated Manifests (`manifests/`)

```
manifests/
├── didnotreadit.yaml          # HelmChart v2 custom resource
├── app.yaml                   # Application branding
└── embedded-cluster.yaml      # Embedded Cluster config (optional)
```

**didnotreadit.yaml (HelmChart v2 CR):**
```yaml
apiVersion: kots.io/v1beta2
kind: HelmChart
metadata:
  name: didnotreadit
spec:
  chart:
    name: didnotreadit
    chartVersion: 0.1.0
  releaseName: didnotreadit
  values: {}
  optionalValues:
    - when: "repl{{ HasLocalRegistry }}"
      recursiveMerge: true
      values:
        app:
          image:
            repository: "repl{{ LocalRegistryHost }}/repl{{ LocalRegistryNamespace }}/didnotreadit-app"
        migrations:
          image:
            repository: "repl{{ LocalRegistryHost }}/repl{{ LocalRegistryNamespace }}/didnotreadit-migrations"
  builder:
    app:
      image:
        repository: proxy.replicated.com/proxy/didnotreadit/DOCKERHUB_USER/didnotreadit-app
        tag: 1.0.0
    migrations:
      image:
        repository: proxy.replicated.com/proxy/didnotreadit/DOCKERHUB_USER/didnotreadit-migrations
        tag: 1.0.0
```

**app.yaml (Application branding):**
```yaml
apiVersion: kots.io/v1beta1
kind: Application
metadata:
  name: didnotreadit
spec:
  title: did-not-read-it
  icon: ""
  statusInformers:
    - deployment/didnotreadit-app
```

### 3. `.replicated` Config File (project root)

```yaml
appSlug: didnotreadit
charts:
  - path: ./chart
manifests:
  - ./manifests/*.yaml
```

This tells the Replicated CLI where to find the chart and manifests when creating releases.

---

## Project Structure (new files)

```
/
├── .replicated                   # Replicated CLI config
├── chart/
│   ├── Chart.yaml
│   ├── values.yaml
│   └── templates/
│       ├── _helpers.tpl
│       ├── app-deployment.yaml
│       ├── app-service.yaml
│       ├── migrations-job.yaml
│       ├── postgresql-statefulset.yaml
│       ├── postgresql-service.yaml
│       ├── postgresql-pvc.yaml
│       ├── secret.yaml
│       └── configmap.yaml
├── manifests/
│   ├── didnotreadit.yaml         # HelmChart v2 CR
│   └── app.yaml                  # Application branding
```

---

## Release Workflow

### Manual (first time)

```bash
# 1. Create the app in Replicated (one-time)
replicated app create didnotreadit

# 2. Package the Helm chart
helm dependency update chart/
helm package chart/

# 3. Create a release and promote to Unstable
replicated release create \
  --version 1.0.0 \
  --promote Unstable \
  --release-notes "Initial release" \
  --app didnotreadit

# 4. Create a test customer
replicated customer create \
  --app didnotreadit \
  --name "Test Customer" \
  --channel Unstable

# 5. Test install
helm registry login registry.replicated.com \
  --username <email> --password <license-id>
helm install didnotreadit \
  oci://registry.replicated.com/didnotreadit/unstable/didnotreadit

# 6. When validated, promote to Stable
replicated release promote <SEQUENCE> Stable \
  --version 1.0.0 \
  --app didnotreadit
```

### CI/CD (GitHub Actions)

Add a step to the existing `release.yml` workflow (triggered on `v*` tags):

```yaml
  replicated:
    runs-on: ubuntu-latest
    needs: release   # after Docker images are pushed
    steps:
      - uses: actions/checkout@v4

      - name: Install Replicated CLI
        run: curl -s https://api.github.com/repos/replicatedhq/replicated/releases/latest | grep "browser_download_url.*linux_amd64" | cut -d '"' -f 4 | xargs curl -sL | tar xz -C /usr/local/bin

      - name: Install Helm
        uses: azure/setup-helm@v4

      - name: Package Helm chart
        run: |
          helm dependency update chart/
          helm package chart/ -d manifests/

      - name: Create and promote Replicated release
        env:
          REPLICATED_API_TOKEN: ${{ secrets.REPLICATED_API_TOKEN }}
          REPLICATED_APP: didnotreadit
        run: |
          VERSION=${GITHUB_REF#refs/tags/v}
          replicated release create \
            --version $VERSION \
            --promote Unstable \
            --ensure-channel \
            --release-notes "Release $VERSION"
```

---

## Customer Install Experience

Customers receive a license ID and install with standard Helm:

```bash
# Authenticate with Replicated registry
helm registry login registry.replicated.com \
  --username <email> --password <license-id>

# Install
helm install didnotreadit \
  oci://registry.replicated.com/didnotreadit/stable/didnotreadit \
  --namespace didnotreadit --create-namespace \
  --set app.sessionSecret="<random-secret>"
```

Or via KOTS Admin Console / Embedded Cluster for less Kubernetes-savvy customers.

---

## Implementation Steps

1. Create the Helm chart with all templates (deployment, statefulset, job, services, secrets)
2. Add the Replicated SDK as a chart dependency
3. Create the Replicated manifests (HelmChart v2 CR, Application CR)
4. Create the `.replicated` config file
5. Create the app in Replicated Vendor Portal
6. Test release creation with `replicated release create`
7. Test customer install on a test cluster
8. Add Replicated release step to GitHub Actions release workflow

---

## Open Questions

- **DockerHub username**: The proxy registry URLs need the actual DockerHub username (from `DOCKERHUB_USERNAME` secret). This will be templated in values.yaml.
    A: ivolginlab
- **PostgreSQL**: Use our own StatefulSet template or the Bitnami PostgreSQL subchart? Own template is simpler and more predictable; Bitnami adds HA options but more complexity.
    A: Let's use our own StatefulSet for simplicity
- **Ingress**: Should we include an Ingress template? Customers will likely need to expose the app. A basic Ingress template with configurable class/hostname is recommended.
    A: yes
- **TLS**: Should we support cert-manager annotations on the Ingress for automatic TLS?
    A: tentatively yes
