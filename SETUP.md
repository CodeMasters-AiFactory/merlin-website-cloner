# Setup Guide - Merlin Website Clone

Complete setup instructions for the full-stack application.

## Prerequisites

- Node.js 18+ 
- npm or yarn
- (Optional) PostgreSQL for production database

## Quick Start

### 1. Backend Setup

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start server (development)
npm run dev

# Start server (production)
npm start
```

Backend runs on `http://localhost:3000`

### 2. Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

Frontend runs on `http://localhost:5173` (dev) or served by backend (production)

### 3. Production Build

```bash
# Build frontend
cd frontend
npm run build

# Build backend
cd ..
npm run build

# Start production server
npm start
```

The backend will serve the frontend from `frontend/dist` automatically.

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

## Database Setup (Optional)

Currently using in-memory database. For production:

1. Install PostgreSQL
2. Create database
3. Update `src/server/database.ts` to use PostgreSQL
4. Set `DATABASE_URL` in `.env`

## API Testing

### Sign Up
```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"password123"}'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'
```

### Clone Website
```bash
curl -X POST http://localhost:3000/api/clone \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"url":"https://example.com","options":{"maxPages":10}}'
```

## Project Structure

```
.
├── src/                    # Backend source code
│   ├── services/          # Core cloning services
│   │   ├── websiteCloner.ts
│   │   ├── assetCapture.ts
│   │   ├── cloudflareBypass.ts
│   │   └── ...
│   ├── utils/             # Utility functions
│   │   ├── urlRewriter.ts
│   │   ├── linkFixer.ts
│   │   └── ...
│   └── server/            # Express server
│       ├── index.ts       # Main server
│       ├── auth.ts        # Authentication
│       └── database.ts    # Database models
├── frontend/              # React frontend
│   ├── src/
│   │   ├── pages/         # Page components
│   │   │   ├── LandingPage.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Login.tsx
│   │   │   └── ...
│   │   ├── utils/         # Utilities
│   │   │   └── api.ts     # API client
│   │   └── App.tsx        # Main app
│   └── package.json
├── package.json           # Backend dependencies
└── README.md
```

## Troubleshooting

### Port Already in Use
Change port in `.env`:
```
PORT=3001
```

### Frontend Not Loading
1. Make sure frontend is built: `cd frontend && npm run build`
2. Check that `frontend/dist` exists
3. Verify backend is serving static files

### Authentication Issues
- Check token is being sent in Authorization header
- Verify token format: `Bearer <token>`
- Check token expiration (currently no expiration, add in production)

### Clone Jobs Failing
- Check Puppeteer is installed correctly
- Verify network connectivity
- Check proxy settings if using proxies
- Review job errors in dashboard

## Development Tips

1. **Hot Reload**: Use `npm run dev` for backend auto-reload
2. **Frontend Dev**: Use `npm run dev` in frontend for Vite HMR
3. **Type Checking**: Run `tsc --noEmit` to check types
4. **Linting**: Configure ESLint for code quality

## Production Deployment

### Docker (Recommended)

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
RUN cd frontend && npm ci && npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables

Set in production:
- `PORT` - Server port
- `DATABASE_URL` - PostgreSQL connection
- `JWT_SECRET` - Secret for JWT tokens
- `NODE_ENV=production`

### Security Checklist

- [ ] Use proper JWT library (not base64)
- [ ] Hash passwords with bcrypt
- [ ] Use PostgreSQL (not in-memory)
- [ ] Enable HTTPS
- [ ] Set CORS properly
- [ ] Rate limiting
- [ ] Input validation
- [ ] Error handling

## Support

For issues or questions, check:
- README.md
- Documentation at `/docs`
- API health: `GET /api/health`

