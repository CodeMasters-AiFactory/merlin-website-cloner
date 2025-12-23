# API Testing & Development Tools Rules

## Postman

### Installation
```powershell
winget install Postman.Postman
```

### CLI (Newman)
```powershell
# Install Newman
npm install -g newman

# Run collection
newman run collection.json

# Run with environment
newman run collection.json -e environment.json

# Run with iterations
newman run collection.json -n 10

# Export results
newman run collection.json -r html,json --reporter-html-export report.html
```

## Insomnia

### Installation
```powershell
winget install Insomnia.Insomnia
```

### CLI (Inso)
```powershell
# Install Inso
npm install -g insomnia-inso

# Run tests
inso run test "Test Suite"

# Generate config
inso generate config
```

## HTTPie

### Installation
```powershell
# Via pip
pip install httpie

# Via Chocolatey
choco install httpie -y
```

### Usage
```powershell
# GET request
http GET https://api.example.com/users

# POST with JSON
http POST https://api.example.com/users name=John email=john@example.com

# With headers
http GET https://api.example.com/users Authorization:"Bearer token"

# Download file
http --download https://example.com/file.zip
```

## cURL

### Installation
```powershell
# Usually pre-installed on Windows 10+
# Or via Chocolatey
choco install curl -y
```

### Common Commands
```powershell
# GET request
curl https://api.example.com/users

# POST with JSON
curl -X POST https://api.example.com/users \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com"}'

# With authentication
curl -H "Authorization: Bearer token" https://api.example.com/users

# Save response
curl -o response.json https://api.example.com/users

# Follow redirects
curl -L https://example.com

# Verbose output
curl -v https://api.example.com/users

# POST form data
curl -X POST -F "file=@image.png" https://api.example.com/upload
```

## jq (JSON Processor)

### Installation
```powershell
winget install jqlang.jq
choco install jq -y
```

### Usage
```powershell
# Pretty print JSON
cat data.json | jq .

# Get specific field
cat data.json | jq '.name'

# Get array element
cat data.json | jq '.[0]'

# Filter array
cat data.json | jq '.[] | select(.age > 21)'

# Map array
cat data.json | jq '[.[] | {name, email}]'

# With curl
curl -s https://api.example.com/users | jq '.data[].name'
```

## API Documentation

### Swagger/OpenAPI
```powershell
# Install Swagger CLI
npm install -g @apidevtools/swagger-cli

# Validate spec
swagger-cli validate openapi.yaml

# Bundle spec
swagger-cli bundle openapi.yaml -o bundled.yaml
```

### Swagger UI
```powershell
# Run Swagger UI locally
docker run -p 8080:8080 -e SWAGGER_JSON=/app/openapi.yaml -v ${PWD}:/app swaggerapi/swagger-ui
```

## GraphQL Tools

### GraphQL Playground
```powershell
npm install -g graphql-playground-electron
```

### GraphQL CLI
```powershell
npm install -g graphql-cli

# Initialize project
graphql init

# Get schema
graphql get-schema
```

## Mock Servers

### JSON Server
```powershell
# Install
npm install -g json-server

# Create db.json
# {
#   "users": [{"id": 1, "name": "John"}],
#   "posts": [{"id": 1, "title": "Hello"}]
# }

# Run server
json-server --watch db.json --port 3001
```

### Mockoon
```powershell
winget install Mockoon.Mockoon
```

### WireMock
```powershell
# Via Docker
docker run -d -p 8080:8080 wiremock/wiremock
```

## Load Testing

### k6
```powershell
# Install
choco install k6 -y

# Run test
k6 run script.js

# With virtual users
k6 run --vus 10 --duration 30s script.js
```

### Artillery
```powershell
# Install
npm install -g artillery

# Quick test
artillery quick --count 10 --num 5 https://api.example.com/

# Run config
artillery run config.yaml

# Generate report
artillery run config.yaml --output report.json
artillery report report.json
```

### Apache Bench (ab)
```powershell
# Comes with Apache, or install separately
# 100 requests, 10 concurrent
ab -n 100 -c 10 https://api.example.com/
```

## Database GUI Tools

### pgAdmin (PostgreSQL)
```powershell
winget install PostgreSQL.pgAdmin
```

### DBeaver (Universal)
```powershell
winget install dbeaver.dbeaver
```

### MongoDB Compass
```powershell
winget install MongoDB.Compass.Full
```

### Redis Insight
```powershell
winget install RedisInsight.RedisInsight
```

### TablePlus
```powershell
winget install TablePlus.TablePlus
```
