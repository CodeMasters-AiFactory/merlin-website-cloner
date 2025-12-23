# API Design Rules

## RESTful Conventions

### HTTP Methods
| Method | Use For | Idempotent |
|--------|---------|------------|
| GET | Read data | Yes |
| POST | Create new | No |
| PUT | Full update | Yes |
| PATCH | Partial update | Yes |
| DELETE | Remove | Yes |

### URL Structure
```
GET    /api/v1/users          # List users
GET    /api/v1/users/:id      # Get user
POST   /api/v1/users          # Create user
PUT    /api/v1/users/:id      # Update user
DELETE /api/v1/users/:id      # Delete user

GET    /api/v1/users/:id/jobs # User's jobs (nested)
POST   /api/v1/clone          # Action endpoint
```

### Naming Rules
- Use nouns, not verbs: `/users` not `/getUsers`
- Plural for collections: `/users` not `/user`
- Lowercase with hyphens: `/clone-jobs` not `/cloneJobs`
- No trailing slashes: `/users` not `/users/`
- Version prefix: `/api/v1/`

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": [
      { "field": "email", "message": "Required field" }
    ]
  }
}
```

## Status Codes

### Success Codes
| Code | When to Use |
|------|-------------|
| 200 | Successful GET, PUT, PATCH |
| 201 | Successful POST (created) |
| 204 | Successful DELETE (no content) |

### Client Error Codes
| Code | When to Use |
|------|-------------|
| 400 | Bad request / validation error |
| 401 | Not authenticated |
| 403 | Authenticated but not authorized |
| 404 | Resource not found |
| 409 | Conflict (duplicate, etc.) |
| 422 | Unprocessable entity |
| 429 | Rate limit exceeded |

### Server Error Codes
| Code | When to Use |
|------|-------------|
| 500 | Internal server error |
| 502 | Bad gateway |
| 503 | Service unavailable |

## Request Validation

### Always Validate
- Required fields present
- Data types correct
- String lengths within limits
- Numbers within ranges
- Enums match allowed values
- URLs are valid format
- Emails are valid format

### Validation Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "url", "message": "Must be a valid URL" },
      { "field": "depth", "message": "Must be between 1 and 10" }
    ]
  }
}
```

## Pagination

### Request
```
GET /api/v1/users?page=2&limit=20
GET /api/v1/users?cursor=abc123&limit=20
```

### Response
```json
{
  "data": [...],
  "meta": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": true
  }
}
```

## Rate Limiting

### Headers to Include
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

### Limits by Endpoint
| Endpoint Type | Limit |
|---------------|-------|
| Auth | 10/15min |
| Read | 100/15min |
| Write | 50/15min |
| Clone | 20/hour |

## Documentation

### Every Endpoint Must Have
- Description
- Method and URL
- Request body schema
- Response schema
- Error cases
- Example request
- Example response
- Authentication requirements
