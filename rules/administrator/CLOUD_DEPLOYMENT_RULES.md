# Cloud & Deployment Rules

## Azure

### Azure CLI Installation
```powershell
# Install Azure CLI
winget install Microsoft.AzureCLI

# Or via Chocolatey
choco install azure-cli -y
```

### Azure CLI Commands
```powershell
# Login
az login

# Set subscription
az account set --subscription "subscription-name"

# List subscriptions
az account list --output table

# Create resource group
az group create --name myResourceGroup --location eastus

# List resource groups
az group list --output table
```

### Azure Web Apps
```powershell
# Create App Service plan
az appservice plan create --name myPlan --resource-group myRG --sku B1 --is-linux

# Create web app
az webapp create --name myapp --resource-group myRG --plan myPlan --runtime "NODE:20-lts"

# Deploy from local
az webapp deployment source config-local-git --name myapp --resource-group myRG

# Set environment variables
az webapp config appsettings set --name myapp --resource-group myRG --settings KEY=value

# View logs
az webapp log tail --name myapp --resource-group myRG
```

### Azure Container Registry
```powershell
# Create ACR
az acr create --resource-group myRG --name myacr --sku Basic

# Login to ACR
az acr login --name myacr

# Build and push image
az acr build --registry myacr --image myapp:v1 .
```

### Azure PostgreSQL
```powershell
# Create PostgreSQL server
az postgres flexible-server create --resource-group myRG --name mypostgres --admin-user myadmin --admin-password MyPassword123!

# Create database
az postgres flexible-server db create --resource-group myRG --server-name mypostgres --database-name mydb

# Configure firewall
az postgres flexible-server firewall-rule create --resource-group myRG --name mypostgres --rule-name AllowMyIP --start-ip-address 0.0.0.0 --end-ip-address 255.255.255.255
```

## Vercel

### Vercel CLI
```powershell
# Install
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod

# Set environment variables
vercel env add DATABASE_URL
vercel env pull .env.local

# View deployments
vercel list
```

## Railway

### Railway CLI
```powershell
# Install
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up

# Link to existing project
railway link

# Set environment variables
railway variables set KEY=value

# View logs
railway logs
```

## Netlify

### Netlify CLI
```powershell
# Install
npm install -g netlify-cli

# Login
netlify login

# Initialize
netlify init

# Deploy
netlify deploy

# Deploy to production
netlify deploy --prod

# Set environment variables
netlify env:set KEY value
```

## Docker Registry

### Docker Hub
```powershell
# Login
docker login

# Tag image
docker tag myapp:latest username/myapp:latest

# Push
docker push username/myapp:latest

# Pull
docker pull username/myapp:latest
```

### GitHub Container Registry
```powershell
# Login
echo $env:GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Tag
docker tag myapp:latest ghcr.io/username/myapp:latest

# Push
docker push ghcr.io/username/myapp:latest
```

## CI/CD Configuration

### GitHub Actions Example
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Azure
        uses: azure/webapps-deploy@v2
        with:
          app-name: 'my-app-name'
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
          package: .
```

### Azure Pipelines Example
```yaml
# azure-pipelines.yml
trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '20.x'
    displayName: 'Install Node.js'

  - script: npm ci
    displayName: 'Install dependencies'

  - script: npm test
    displayName: 'Run tests'

  - script: npm run build
    displayName: 'Build'

  - task: AzureWebApp@1
    inputs:
      azureSubscription: 'my-subscription'
      appName: 'my-app'
      package: '$(System.DefaultWorkingDirectory)'
```

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] Secrets in secure storage
- [ ] Backup created
- [ ] Rollback plan ready

### Post-Deployment
- [ ] Health check passing
- [ ] Logs reviewed
- [ ] Performance verified
- [ ] Monitoring active
- [ ] Documentation updated
