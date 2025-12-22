# API Documentation

Complete API reference for Merlin Website Cloner.

## Base URL

```
http://localhost:3000/api
```

All endpoints require authentication except `/api/health`.

## Authentication

Include the JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Endpoints

### Authentication

#### POST /api/auth/signup
Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### POST /api/auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### GET /api/auth/me
Get current user information.

**Response:**
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "name": "John Doe"
}
```

### Cloning

#### POST /api/clone
Start a new website cloning job.

**Request Body:**
```json
{
  "url": "https://example.com",
  "options": {
    "maxPages": 100,
    "maxDepth": 5,
    "concurrency": 5,
    "unlimited": false,
    "proxyConfig": {
      "enabled": false
    },
    "userAgentRotation": true,
    "cloudflareBypass": {
      "enabled": true,
      "captchaApiKey": "optional",
      "capsolverApiKey": "optional"
    },
    "verifyAfterClone": true,
    "exportFormat": "zip",
    "useCache": true,
    "cacheTTL": 3600000,
    "incremental": false,
    "captureScreenshots": false,
    "generatePdfs": false,
    "distributed": false,
    "mobileEmulation": {
      "enabled": false
    },
    "geolocation": {
      "latitude": 40.7128,
      "longitude": -74.0060
    }
  }
}
```

**Response:**
```json
{
  "id": "job_id",
  "url": "https://example.com",
  "status": "processing",
  "progress": 0
}
```

### Jobs

#### GET /api/jobs
List all jobs for the authenticated user.

**Response:**
```json
[
  {
    "id": "job_id",
    "url": "https://example.com",
    "status": "completed",
    "progress": 100,
    "pagesCloned": 50,
    "assetsCaptured": 200,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "completedAt": "2024-01-01T00:05:00.000Z",
    "outputDir": "./output/example.com",
    "exportPath": "./output/example.com.zip"
  }
]
```

#### GET /api/jobs/:id
Get details of a specific job.

**Response:**
```json
{
  "id": "job_id",
  "url": "https://example.com",
  "status": "completed",
  "progress": 100,
  "pagesCloned": 50,
  "assetsCaptured": 200,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "completedAt": "2024-01-01T00:05:00.000Z",
  "outputDir": "./output/example.com",
  "exportPath": "./output/example.com.zip",
  "errors": []
}
```

#### GET /api/jobs/:id/progress
Get real-time progress updates via Server-Sent Events (SSE).

**Response:** SSE stream with progress updates:
```
data: {"currentPage": 10, "totalPages": 100, "status": "processing", "message": "Cloning page 10/100"}
```

### Downloads

#### GET /api/download/:id
Download the cloned website archive.

**Response:** File download (ZIP, TAR, etc.)

### Configuration Management

#### GET /api/configs
List all saved configurations.

**Response:**
```json
[
  {
    "name": "my-config",
    "path": "./configs/my-config.yaml",
    "format": "yaml",
    "modified": "2024-01-01T00:00:00.000Z"
  }
]
```

#### GET /api/configs/default
Get the default configuration template.

**Response:**
```json
{
  "url": "",
  "outputDir": "./output",
  "maxPages": 100,
  "maxDepth": 5,
  "concurrency": 5,
  ...
}
```

#### GET /api/configs/:name
Get a specific configuration.

**Response:**
```json
{
  "url": "https://example.com",
  "maxPages": 100,
  ...
}
```

#### POST /api/configs
Create or update a configuration.

**Request Body:**
```json
{
  "name": "my-config",
  "config": {
    "url": "https://example.com",
    "maxPages": 100,
    ...
  },
  "format": "yaml"
}
```

**Response:**
```json
{
  "success": true,
  "name": "my-config",
  "path": "./configs/my-config.yaml",
  "format": "yaml",
  "warnings": []
}
```

#### PUT /api/configs/:name
Update an existing configuration.

**Request Body:**
```json
{
  "config": {
    "url": "https://example.com",
    "maxPages": 200,
    ...
  },
  "format": "yaml"
}
```

#### DELETE /api/configs/:name
Delete a configuration.

**Response:**
```json
{
  "success": true,
  "name": "my-config"
}
```

#### POST /api/configs/validate
Validate a configuration without saving.

**Request Body:**
```json
{
  "config": {
    "url": "https://example.com",
    ...
  }
}
```

**Response:**
```json
{
  "valid": true,
  "errors": [],
  "warnings": []
}
```

#### POST /api/configs/:name/clone
Start a clone job using a saved configuration.

**Response:**
```json
{
  "id": "job_id",
  "url": "https://example.com",
  "status": "processing",
  "progress": 0,
  "config": "my-config"
}
```

### Health & Monitoring

#### GET /api/health
Health check endpoint (no authentication required).

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### GET /metrics
Prometheus metrics endpoint.

**Response:** Prometheus metrics format

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "error": "Error message here"
}
```

**Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting

API requests are rate-limited to prevent abuse. Limits:
- 100 requests per minute per user
- 1000 requests per hour per user

## WebSocket/SSE

Progress updates are available via Server-Sent Events (SSE) at `/api/jobs/:id/progress`.

Example client code:
```javascript
const eventSource = new EventSource('/api/jobs/job_id/progress');
eventSource.onmessage = (event) => {
  const progress = JSON.parse(event.data);
  console.log('Progress:', progress);
};
```

## Examples

### Complete Clone Example

```javascript
// 1. Login
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password'
  })
});
const { token } = await loginResponse.json();

// 2. Start Clone
const cloneResponse = await fetch('/api/clone', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    url: 'https://example.com',
    options: {
      maxPages: 100,
      verifyAfterClone: true
    }
  })
});
const job = await cloneResponse.json();

// 3. Monitor Progress
const eventSource = new EventSource(`/api/jobs/${job.id}/progress`);
eventSource.onmessage = (event) => {
  const progress = JSON.parse(event.data);
  console.log(`Progress: ${progress.currentPage}/${progress.totalPages}`);
};

// 4. Download when complete
const downloadResponse = await fetch(`/api/download/${job.id}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const blob = await downloadResponse.blob();
// Save blob to file
```

