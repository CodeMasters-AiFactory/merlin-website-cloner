# Phase 4: DevOps (COD-12)

## Status: ⬚ NOT STARTED (0%)

## Linear Issue: COD-12
## Priority: 🟠 HIGH

---

## Overview
Set up Docker containers, CI/CD pipeline, and Azure deployment for production environment.

---

## Prerequisites
- [ ] Phase 1-3 complete
- [ ] Azure account ready
- [ ] Docker Desktop installed

---

## Steps (22 Total)

### 4.1 Docker Setup
| Step | Description | Executed | Verified | Tested |
|------|-------------|----------|----------|--------|
| COD-12-001 | Create backend Dockerfile | ⬚ | ⬚ | ⬚ |
| COD-12-002 | Create frontend Dockerfile | ⬚ | ⬚ | ⬚ |
| COD-12-003 | Create docker-compose.yml | ⬚ | ⬚ | ⬚ |
| COD-12-004 | Add PostgreSQL to compose | ⬚ | ⬚ | ⬚ |
| COD-12-005 | Add Redis to compose | ⬚ | ⬚ | ⬚ |

### 4.2 CI/CD Pipeline
| Step | Description | Executed | Verified | Tested |
|------|-------------|----------|----------|--------|
| COD-12-006 | Create GitHub Actions workflow | ⬚ | ⬚ | ⬚ |
| COD-12-007 | Add lint step | ⬚ | ⬚ | ⬚ |
| COD-12-008 | Add test step | ⬚ | ⬚ | ⬚ |
| COD-12-009 | Add build step | ⬚ | ⬚ | ⬚ |
| COD-12-010 | Add deploy step | ⬚ | ⬚ | ⬚ |

### 4.3 Azure Setup
| Step | Description | Executed | Verified | Tested |
|------|-------------|----------|----------|--------|
| COD-12-011 | Create Azure Resource Group | ⬚ | ⬚ | ⬚ |
| COD-12-012 | Create Azure Container Registry | ⬚ | ⬚ | ⬚ |
| COD-12-013 | Create Azure App Service | ⬚ | ⬚ | ⬚ |
| COD-12-014 | Create Azure PostgreSQL | ⬚ | ⬚ | ⬚ |
| COD-12-015 | Configure environment variables | ⬚ | ⬚ | ⬚ |

### 4.4 Monitoring
| Step | Description | Executed | Verified | Tested |
|------|-------------|----------|----------|--------|
| COD-12-016 | Add health check endpoint | ⬚ | ⬚ | ⬚ |
| COD-12-017 | Configure Azure App Insights | ⬚ | ⬚ | ⬚ |
| COD-12-018 | Set up alerting rules | ⬚ | ⬚ | ⬚ |

### 4.5 SSL & Domain
| Step | Description | Executed | Verified | Tested |
|------|-------------|----------|----------|--------|
| COD-12-019 | Configure custom domain | ⬚ | ⬚ | ⬚ |
| COD-12-020 | Enable SSL certificate | ⬚ | ⬚ | ⬚ |

### 4.6 Documentation
| Step | Description | Executed | Verified | Tested |
|------|-------------|----------|----------|--------|
| COD-12-021 | Document deployment process | ⬚ | ⬚ | ⬚ |
| COD-12-022 | Create runbook for incidents | ⬚ | ⬚ | ⬚ |

---

## Azure Resources Planned

| Resource | Type | Tier |
|----------|------|------|
| merlin-rg | Resource Group | - |
| merlinacr | Container Registry | Basic |
| merlin-app | App Service | B1 |
| merlin-db | PostgreSQL Flexible | Burstable B1ms |
| merlin-insights | Application Insights | Free |

---

## Progress: 0/22 (0%)

---

*Phase 4 Target: After Phase 3*
