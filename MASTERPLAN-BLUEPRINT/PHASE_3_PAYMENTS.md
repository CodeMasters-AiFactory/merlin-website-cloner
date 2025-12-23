# Phase 3: Payments (COD-10)

## Status: ⬚ NOT STARTED (0%)

## Linear Issue: COD-10
## Priority: 🟠 HIGH

---

## Overview
Implement Stripe payment processing for subscription-based revenue model.

---

## Prerequisites
- [ ] Phase 1 (Security) complete
- [ ] Phase 2 (Database) complete
- [ ] Stripe account created
- [ ] Stripe API keys obtained

---

## Steps (28 Total)

### 3.1 Stripe Setup
| Step | Description | Executed | Verified | Tested |
|------|-------------|----------|----------|--------|
| COD-10-001 | Install stripe package | ⬚ | ⬚ | ⬚ |
| COD-10-002 | Add STRIPE_SECRET_KEY to .env | ⬚ | ⬚ | ⬚ |
| COD-10-003 | Add STRIPE_PUBLISHABLE_KEY | ⬚ | ⬚ | ⬚ |
| COD-10-004 | Add STRIPE_WEBHOOK_SECRET | ⬚ | ⬚ | ⬚ |

### 3.2 Products & Prices
| Step | Description | Executed | Verified | Tested |
|------|-------------|----------|----------|--------|
| COD-10-005 | Create Free plan in Stripe | ⬚ | ⬚ | ⬚ |
| COD-10-006 | Create Starter plan ($9.99/mo) | ⬚ | ⬚ | ⬚ |
| COD-10-007 | Create Pro plan ($29.99/mo) | ⬚ | ⬚ | ⬚ |
| COD-10-008 | Create Enterprise plan ($99.99/mo) | ⬚ | ⬚ | ⬚ |

### 3.3 Customer Management
| Step | Description | Executed | Verified | Tested |
|------|-------------|----------|----------|--------|
| COD-10-009 | Create Stripe customer on signup | ⬚ | ⬚ | ⬚ |
| COD-10-010 | Store stripeCustomerId in DB | ⬚ | ⬚ | ⬚ |

### 3.4 Checkout
| Step | Description | Executed | Verified | Tested |
|------|-------------|----------|----------|--------|
| COD-10-011 | Create checkout session endpoint | ⬚ | ⬚ | ⬚ |
| COD-10-012 | Handle success redirect | ⬚ | ⬚ | ⬚ |
| COD-10-013 | Handle cancel redirect | ⬚ | ⬚ | ⬚ |

### 3.5 Webhooks
| Step | Description | Executed | Verified | Tested |
|------|-------------|----------|----------|--------|
| COD-10-014 | Create webhook endpoint | ⬚ | ⬚ | ⬚ |
| COD-10-015 | Verify webhook signatures | ⬚ | ⬚ | ⬚ |
| COD-10-016 | Handle checkout.session.completed | ⬚ | ⬚ | ⬚ |
| COD-10-017 | Handle invoice.paid | ⬚ | ⬚ | ⬚ |
| COD-10-018 | Handle invoice.payment_failed | ⬚ | ⬚ | ⬚ |
| COD-10-019 | Handle customer.subscription.updated | ⬚ | ⬚ | ⬚ |
| COD-10-020 | Handle customer.subscription.deleted | ⬚ | ⬚ | ⬚ |

### 3.6 Customer Portal
| Step | Description | Executed | Verified | Tested |
|------|-------------|----------|----------|--------|
| COD-10-021 | Create portal session endpoint | ⬚ | ⬚ | ⬚ |
| COD-10-022 | Allow subscription management | ⬚ | ⬚ | ⬚ |

### 3.7 Usage Enforcement
| Step | Description | Executed | Verified | Tested |
|------|-------------|----------|----------|--------|
| COD-10-023 | Check subscription before clone | ⬚ | ⬚ | ⬚ |
| COD-10-024 | Enforce plan limits | ⬚ | ⬚ | ⬚ |
| COD-10-025 | Show upgrade prompts | ⬚ | ⬚ | ⬚ |

### 3.8 Testing & Documentation
| Step | Description | Executed | Verified | Tested |
|------|-------------|----------|----------|--------|
| COD-10-026 | Test with Stripe CLI | ⬚ | ⬚ | ⬚ |
| COD-10-027 | Test all webhook events | ⬚ | ⬚ | ⬚ |
| COD-10-028 | Document payment flow | ⬚ | ⬚ | ⬚ |

---

## Plan Limits

| Plan | Price | Clones/Month | Storage | Support |
|------|-------|--------------|---------|---------|
| Free | $0 | 3 | 100MB | Community |
| Starter | $9.99 | 25 | 1GB | Email |
| Pro | $29.99 | 100 | 10GB | Priority |
| Enterprise | $99.99 | Unlimited | 100GB | Dedicated |

---

## Progress: 0/28 (0%)

---

*Phase 3 Target: After Phase 2*
