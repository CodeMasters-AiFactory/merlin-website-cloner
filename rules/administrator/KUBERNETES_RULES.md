# Kubernetes Management Rules

## kubectl Basics

### Configuration
```powershell
# View current context
kubectl config current-context

# List contexts
kubectl config get-contexts

# Switch context
kubectl config use-context my-context

# Set namespace for context
kubectl config set-context --current --namespace=my-namespace
```

### Cluster Information
```powershell
# Cluster info
kubectl cluster-info

# Node information
kubectl get nodes
kubectl describe node <node-name>

# Resource usage
kubectl top nodes
kubectl top pods
```

## Resource Management

### Pods
```powershell
# List pods
kubectl get pods
kubectl get pods -A                    # All namespaces
kubectl get pods -o wide               # More info
kubectl get pods -w                    # Watch

# Describe pod
kubectl describe pod <pod-name>

# Pod logs
kubectl logs <pod-name>
kubectl logs -f <pod-name>             # Follow
kubectl logs <pod-name> -c <container> # Specific container
kubectl logs <pod-name> --previous     # Previous instance

# Execute in pod
kubectl exec -it <pod-name> -- /bin/sh
kubectl exec -it <pod-name> -- /bin/bash

# Delete pod
kubectl delete pod <pod-name>
```

### Deployments
```powershell
# List deployments
kubectl get deployments

# Create deployment
kubectl create deployment my-app --image=my-image:tag

# Scale deployment
kubectl scale deployment my-app --replicas=3

# Update image
kubectl set image deployment/my-app my-app=my-image:new-tag

# Rollout status
kubectl rollout status deployment/my-app

# Rollout history
kubectl rollout history deployment/my-app

# Rollback
kubectl rollout undo deployment/my-app
kubectl rollout undo deployment/my-app --to-revision=2
```

### Services
```powershell
# List services
kubectl get services
kubectl get svc

# Create service
kubectl expose deployment my-app --port=80 --target-port=3000 --type=LoadBalancer

# Delete service
kubectl delete service my-app
```

### ConfigMaps & Secrets
```powershell
# Create ConfigMap
kubectl create configmap my-config --from-file=config.yaml
kubectl create configmap my-config --from-literal=key=value

# Create Secret
kubectl create secret generic my-secret --from-literal=password=mypass
kubectl create secret generic my-secret --from-file=.env

# View secrets (base64 encoded)
kubectl get secret my-secret -o yaml

# Decode secret
kubectl get secret my-secret -o jsonpath='{.data.password}' | base64 -d
```

## YAML Manifests

### Deployment Example
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: merlin-backend
  labels:
    app: merlin
spec:
  replicas: 3
  selector:
    matchLabels:
      app: merlin
  template:
    metadata:
      labels:
        app: merlin
    spec:
      containers:
      - name: backend
        image: merlin-backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: merlin-secrets
              key: database-url
        resources:
          requests:
            memory: "128Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Service Example
```yaml
apiVersion: v1
kind: Service
metadata:
  name: merlin-backend
spec:
  selector:
    app: merlin
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

## Helm

### Install Helm
```powershell
# Via Winget
winget install Helm.Helm

# Via Chocolatey
choco install kubernetes-helm -y
```

### Helm Commands
```powershell
# Add repository
helm repo add stable https://charts.helm.sh/stable
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Search charts
helm search repo postgresql

# Install chart
helm install my-postgres bitnami/postgresql

# Install with values
helm install my-postgres bitnami/postgresql -f values.yaml

# List releases
helm list

# Upgrade
helm upgrade my-postgres bitnami/postgresql

# Uninstall
helm uninstall my-postgres

# Show values
helm show values bitnami/postgresql
```

## Minikube (Local K8s)

### Setup
```powershell
# Install
winget install Kubernetes.minikube

# Start cluster
minikube start

# Start with specific resources
minikube start --cpus=4 --memory=8192 --driver=docker

# Stop
minikube stop

# Delete
minikube delete
```

### Minikube Commands
```powershell
# Dashboard
minikube dashboard

# Get IP
minikube ip

# Access service
minikube service my-service

# Load local image
minikube image load my-image:tag

# SSH into node
minikube ssh
```

## Troubleshooting

### Debug Pod
```powershell
# Get events
kubectl get events --sort-by='.lastTimestamp'

# Describe pod for events
kubectl describe pod <pod-name>

# Check resource limits
kubectl top pod <pod-name>

# Debug with temporary pod
kubectl run debug --image=busybox -it --rm -- /bin/sh
```

### Common Issues
```powershell
# ImagePullBackOff - Check image name, registry auth
kubectl describe pod <pod-name> | grep -A 5 "Events"

# CrashLoopBackOff - Check logs
kubectl logs <pod-name> --previous

# Pending - Check resources, node capacity
kubectl describe pod <pod-name> | grep -A 10 "Events"
```
