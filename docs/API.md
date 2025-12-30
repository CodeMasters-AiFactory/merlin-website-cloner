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

### Proxy Network

#### GET /api/proxy-network/stats
Get network-wide statistics.

**Response:**
```json
{
  "totalNodes": 1250,
  "onlineNodes": 892,
  "totalBandwidth": 15000,
  "totalRequestsServed": 5420000,
  "averageLatency": 145,
  "averageSuccessRate": 0.94,
  "countryCoverage": ["US", "UK", "DE", "FR", "JP", "AU"],
  "bytesTransferredTotal": 1099511627776
}
```

#### GET /api/proxy-network/my-nodes
Get nodes registered by the current user.

**Response:**
```json
{
  "nodes": [
    {
      "id": "node_123",
      "host": "192.168.1.100",
      "port": 8899,
      "country": "US",
      "isOnline": true,
      "successRate": 0.97,
      "totalRequests": 45000,
      "bytesServed": 5368709120,
      "creditsEarned": 52.5,
      "registeredAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "totalCredits": 52.5
}
```

#### POST /api/proxy-network/register
Register a new proxy node.

**Request Body:**
```json
{
  "host": "192.168.1.100",
  "port": 8899,
  "bandwidth": 100
}
```

**Response:**
```json
{
  "id": "node_123",
  "token": "node_auth_token",
  "success": true
}
```

#### GET /api/proxy-network/leaderboard
Get top contributors leaderboard.

**Response:**
```json
[
  {
    "userId": "user_456",
    "totalCredits": 1250.5,
    "totalNodes": 5,
    "totalBytesServed": 10995116277760
  }
]
```

### Disaster Recovery

#### GET /api/dr/sites
List all monitored sites.

**Response:**
```json
[
  {
    "id": "site_123",
    "url": "https://mycompany.com",
    "name": "Company Website",
    "status": "online",
    "lastCheck": "2024-01-01T12:00:00.000Z",
    "lastBackup": "2024-01-01T11:00:00.000Z",
    "backupCount": 24,
    "syncEnabled": true,
    "syncInterval": 60,
    "uptime24h": 100,
    "uptime7d": 99.9,
    "uptime30d": 99.95,
    "responseTime": 245,
    "failoverEnabled": true,
    "failoverTriggered": false
  }
]
```

#### POST /api/dr/sites
Add a site to disaster recovery monitoring.

**Request Body:**
```json
{
  "url": "https://example.com",
  "name": "My Website",
  "syncInterval": 60,
  "failoverEnabled": true
}
```

**Response:**
```json
{
  "id": "site_123",
  "url": "https://example.com",
  "success": true
}
```

#### GET /api/dr/sites/:id/backups
List all backups for a site.

**Response:**
```json
[
  {
    "id": "backup_456",
    "siteId": "site_123",
    "timestamp": "2024-01-01T11:00:00.000Z",
    "size": 52428800,
    "pageCount": 45,
    "assetCount": 230,
    "type": "full",
    "status": "complete"
  }
]
```

#### POST /api/dr/sites/:id/restore
Restore a site from a backup.

**Request Body:**
```json
{
  "backupId": "backup_456"
}
```

**Response:**
```json
{
  "success": true,
  "restoreJobId": "restore_789",
  "message": "Restore initiated"
}
```

#### GET /api/dr/events
Get recent failover events.

**Response:**
```json
[
  {
    "id": "event_123",
    "siteId": "site_456",
    "siteName": "Company Website",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "type": "triggered",
    "reason": "Response time exceeded threshold",
    "duration": 45
  }
]
```

### Archives (WARC)

#### GET /api/archives
List all WARC archives.

**Response:**
```json
[
  {
    "id": "archive_123",
    "url": "https://example.com",
    "domain": "example.com",
    "captureDate": "2024-01-01T00:00:00.000Z",
    "size": 52428800,
    "pageCount": 45,
    "assetCount": 230,
    "warcFile": "example-com-2024-01-01.warc.gz",
    "status": "complete",
    "format": "warc.gz",
    "cdxIndexed": true
  }
]
```

#### GET /api/archives/timeline
Get capture timeline for calendar view.

**Response:**
```json
[
  {
    "date": "2024-01-01",
    "count": 3,
    "urls": ["https://example.com", "https://docs.company.com"]
  }
]
```

#### GET /api/archives/:id/snapshots
Get version snapshots for an archive.

**Response:**
```json
[
  {
    "id": "snap_123",
    "url": "https://example.com",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "title": "Latest Capture",
    "size": 52428800,
    "changes": 12
  }
]
```

#### GET /api/archives/:id/playback
Get playback URL for viewing archived content.

**Response:**
```json
{
  "playbackUrl": "/playback/archive_123/https://example.com/",
  "cdxUrl": "/cdx/archive_123"
}
```

#### GET /api/archives/:id/download
Download WARC archive file.

**Response:** WARC file download

#### POST /api/archives/:id/compare
Compare two archive snapshots.

**Request Body:**
```json
{
  "snapshotA": "snap_123",
  "snapshotB": "snap_456"
}
```

**Response:**
```json
{
  "addedPages": 5,
  "removedPages": 2,
  "modifiedPages": 12,
  "sizeDiff": 1048576,
  "details": [
    {
      "url": "/about",
      "change": "modified",
      "diff": "..."
    }
  ]
}
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

