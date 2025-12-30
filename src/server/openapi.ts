/**
 * OpenAPI/Swagger Documentation
 * Auto-generated API documentation for Merlin Website Cloner
 */

import { Router } from 'express';

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Merlin Website Cloner API',
    description: `
# Merlin Website Cloner API

The most powerful website cloning solution with anti-bot bypass, SPA support, and disaster recovery.

## Features
- **Full Website Cloning** - Clone entire websites with all assets
- **Anti-Bot Bypass** - Cloudflare, DataDome, Akamai, PerimeterX support
- **SPA Support** - React, Vue, Angular, Next.js, Nuxt rendering
- **Multiple Export Formats** - ZIP, TAR, MHTML, WARC, WACZ, PDF
- **Disaster Recovery** - Continuous monitoring and failover
- **Authentication Cloning** - Clone behind login

## Authentication
All API endpoints require Bearer token authentication.
Include the token in the Authorization header:
\`\`\`
Authorization: Bearer <your-token>
\`\`\`

## Rate Limits
- General API: 1000 requests per 15 minutes
- Clone endpoint: 200 requests per hour
- Auth endpoints: 10 requests per 15 minutes

## Webhooks
Configure webhooks to receive real-time notifications for clone events.
`,
    version: '1.0.0',
    contact: {
      name: 'Merlin Support',
      email: 'support@merlin-clone.com',
      url: 'https://merlin-clone.com',
    },
    license: {
      name: 'Proprietary',
      url: 'https://merlin-clone.com/license',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
    {
      url: 'https://api.merlin-clone.com',
      description: 'Production server',
    },
  ],
  tags: [
    { name: 'Authentication', description: 'User authentication endpoints' },
    { name: 'Clone', description: 'Website cloning operations' },
    { name: 'Jobs', description: 'Job management and status' },
    { name: 'Export', description: 'Export and download operations' },
    { name: 'Webhooks', description: 'Webhook management' },
    { name: 'Disaster Recovery', description: 'DR monitoring and failover' },
    { name: 'Health', description: 'System health and metrics' },
  ],
  paths: {
    '/api/auth/signup': {
      post: {
        tags: ['Authentication'],
        summary: 'Create a new user account',
        description: 'Register a new user with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/SignupRequest',
              },
              example: {
                email: 'user@example.com',
                password: 'SecureP@ssw0rd!',
                name: 'John Doe',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'User created successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AuthResponse',
                },
              },
            },
          },
          '400': {
            description: 'Invalid input',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
              },
            },
          },
          '429': {
            description: 'Rate limit exceeded',
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Login to existing account',
        description: 'Authenticate with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/LoginRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AuthResponse',
                },
              },
            },
          },
          '401': {
            description: 'Invalid credentials',
          },
          '429': {
            description: 'Rate limit exceeded',
          },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get current user',
        description: 'Get the authenticated user profile',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'User profile',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/User',
                },
              },
            },
          },
          '401': {
            description: 'Not authenticated',
          },
        },
      },
    },
    '/api/clone': {
      post: {
        tags: ['Clone'],
        summary: 'Start a new clone job',
        description: 'Initiate cloning of a website with specified options',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CloneRequest',
              },
              examples: {
                simple: {
                  summary: 'Simple clone',
                  value: {
                    url: 'https://example.com',
                  },
                },
                advanced: {
                  summary: 'Advanced clone with options',
                  value: {
                    url: 'https://example.com',
                    maxPages: 100,
                    maxDepth: 5,
                    includeAssets: true,
                    useProxy: true,
                    bypassProtection: true,
                    exportFormat: 'zip',
                  },
                },
                spa: {
                  summary: 'SPA clone',
                  value: {
                    url: 'https://react-app.com',
                    renderJavaScript: true,
                    waitForNetworkIdle: true,
                    captureAPIEndpoints: true,
                  },
                },
              },
            },
          },
        },
        responses: {
          '202': {
            description: 'Clone job started',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CloneResponse',
                },
              },
            },
          },
          '400': {
            description: 'Invalid URL or options',
          },
          '401': {
            description: 'Not authenticated',
          },
          '429': {
            description: 'Clone limit exceeded',
          },
        },
      },
    },
    '/api/jobs': {
      get: {
        tags: ['Jobs'],
        summary: 'List all jobs',
        description: 'Get a list of all clone jobs for the authenticated user',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['pending', 'running', 'completed', 'failed'],
            },
            description: 'Filter by job status',
          },
          {
            name: 'limit',
            in: 'query',
            schema: {
              type: 'integer',
              default: 20,
              maximum: 100,
            },
            description: 'Number of results to return',
          },
          {
            name: 'offset',
            in: 'query',
            schema: {
              type: 'integer',
              default: 0,
            },
            description: 'Offset for pagination',
          },
        ],
        responses: {
          '200': {
            description: 'List of jobs',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    jobs: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/Job',
                      },
                    },
                    total: {
                      type: 'integer',
                    },
                    limit: {
                      type: 'integer',
                    },
                    offset: {
                      type: 'integer',
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Not authenticated',
          },
        },
      },
    },
    '/api/jobs/{id}': {
      get: {
        tags: ['Jobs'],
        summary: 'Get job details',
        description: 'Get detailed information about a specific clone job',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
            },
            description: 'Job ID',
          },
        ],
        responses: {
          '200': {
            description: 'Job details',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/JobDetails',
                },
              },
            },
          },
          '404': {
            description: 'Job not found',
          },
        },
      },
      delete: {
        tags: ['Jobs'],
        summary: 'Delete a job',
        description: 'Delete a clone job and its associated files',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          '204': {
            description: 'Job deleted',
          },
          '404': {
            description: 'Job not found',
          },
        },
      },
    },
    '/api/download/{id}': {
      get: {
        tags: ['Export'],
        summary: 'Download cloned site',
        description: 'Download the cloned website as a file',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
            },
          },
          {
            name: 'format',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['zip', 'tar', 'mhtml', 'warc', 'wacz', 'pdf'],
              default: 'zip',
            },
          },
        ],
        responses: {
          '200': {
            description: 'File download',
            content: {
              'application/zip': {},
              'application/x-tar': {},
              'message/rfc822': {},
              'application/warc': {},
              'application/pdf': {},
            },
          },
          '404': {
            description: 'Job not found',
          },
        },
      },
    },
    '/api/webhooks': {
      get: {
        tags: ['Webhooks'],
        summary: 'List webhooks',
        description: 'Get all registered webhooks',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of webhooks',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Webhook',
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Webhooks'],
        summary: 'Create webhook',
        description: 'Register a new webhook endpoint',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/WebhookCreate',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Webhook created',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Webhook',
                },
              },
            },
          },
        },
      },
    },
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Check API health status',
        responses: {
          '200': {
            description: 'API is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: {
                      type: 'string',
                      example: 'healthy',
                    },
                    version: {
                      type: 'string',
                      example: '1.0.0',
                    },
                    uptime: {
                      type: 'number',
                      description: 'Uptime in seconds',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token from login endpoint',
      },
    },
    schemas: {
      SignupRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
          },
          password: {
            type: 'string',
            minLength: 8,
            description: 'Minimum 8 characters',
          },
          name: {
            type: 'string',
          },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
          },
          password: {
            type: 'string',
          },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          token: {
            type: 'string',
            description: 'JWT access token',
          },
          user: {
            $ref: '#/components/schemas/User',
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
          },
          email: {
            type: 'string',
          },
          name: {
            type: 'string',
          },
          plan: {
            type: 'string',
            enum: ['free', 'pro', 'enterprise'],
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      CloneRequest: {
        type: 'object',
        required: ['url'],
        properties: {
          url: {
            type: 'string',
            format: 'uri',
            description: 'URL to clone',
          },
          maxPages: {
            type: 'integer',
            default: 50,
            description: 'Maximum pages to clone',
          },
          maxDepth: {
            type: 'integer',
            default: 3,
            description: 'Maximum crawl depth',
          },
          includeAssets: {
            type: 'boolean',
            default: true,
            description: 'Include images, CSS, JS, fonts',
          },
          useProxy: {
            type: 'boolean',
            default: false,
            description: 'Use residential proxy',
          },
          bypassProtection: {
            type: 'boolean',
            default: true,
            description: 'Attempt to bypass anti-bot protection',
          },
          renderJavaScript: {
            type: 'boolean',
            default: true,
            description: 'Render JavaScript (for SPAs)',
          },
          waitForNetworkIdle: {
            type: 'boolean',
            default: true,
            description: 'Wait for network to be idle',
          },
          captureAPIEndpoints: {
            type: 'boolean',
            default: false,
            description: 'Record and mock API endpoints',
          },
          exportFormat: {
            type: 'string',
            enum: ['zip', 'tar', 'mhtml', 'warc', 'wacz', 'pdf', 'static'],
            default: 'zip',
          },
          cookies: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                value: { type: 'string' },
                domain: { type: 'string' },
              },
            },
            description: 'Cookies for authenticated cloning',
          },
        },
      },
      CloneResponse: {
        type: 'object',
        properties: {
          jobId: {
            type: 'string',
          },
          status: {
            type: 'string',
            enum: ['pending', 'running'],
          },
          message: {
            type: 'string',
          },
          estimatedTime: {
            type: 'integer',
            description: 'Estimated time in seconds',
          },
        },
      },
      Job: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
          },
          url: {
            type: 'string',
          },
          status: {
            type: 'string',
            enum: ['pending', 'running', 'completed', 'failed'],
          },
          progress: {
            type: 'integer',
            minimum: 0,
            maximum: 100,
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          completedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      JobDetails: {
        allOf: [
          { $ref: '#/components/schemas/Job' },
          {
            type: 'object',
            properties: {
              stats: {
                type: 'object',
                properties: {
                  pagesCloned: { type: 'integer' },
                  assetsDownloaded: { type: 'integer' },
                  totalSize: { type: 'integer' },
                  duration: { type: 'integer' },
                  errors: { type: 'integer' },
                },
              },
              options: {
                $ref: '#/components/schemas/CloneRequest',
              },
              logs: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    timestamp: { type: 'string' },
                    level: { type: 'string' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
        ],
      },
      Webhook: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
          },
          url: {
            type: 'string',
            format: 'uri',
          },
          events: {
            type: 'array',
            items: {
              type: 'string',
              enum: [
                'clone.started',
                'clone.progress',
                'clone.completed',
                'clone.failed',
                'dr.alert',
                'dr.failover',
              ],
            },
          },
          enabled: {
            type: 'boolean',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      WebhookCreate: {
        type: 'object',
        required: ['url', 'events'],
        properties: {
          url: {
            type: 'string',
            format: 'uri',
          },
          events: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
          secret: {
            type: 'string',
            description: 'Secret for signing webhook payloads',
          },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
          },
          message: {
            type: 'string',
          },
          code: {
            type: 'string',
          },
        },
      },
    },
  },
};

/**
 * Setup OpenAPI routes
 */
export function setupOpenApiRoutes(router: Router): void {
  // OpenAPI JSON spec
  router.get('/api/openapi.json', (req, res) => {
    res.json(openApiSpec);
  });

  // Swagger UI HTML
  router.get('/api/docs', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Merlin API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <style>
    body { margin: 0; padding: 0; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .info .title { font-size: 2em; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: '/api/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout",
        tryItOutEnabled: true,
      });
    };
  </script>
</body>
</html>
    `);
  });

  // ReDoc alternative
  router.get('/api/redoc', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Merlin API Documentation</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
  <style>
    body { margin: 0; padding: 0; }
  </style>
</head>
<body>
  <redoc spec-url='/api/openapi.json'></redoc>
  <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
</body>
</html>
    `);
  });
}
