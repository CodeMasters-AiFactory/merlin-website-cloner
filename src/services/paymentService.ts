/**
 * Payment Service
 * Stripe integration for subscriptions and payments
 */

import Stripe from 'stripe';
import { LoggingService } from './logging.js';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number; // in cents
  currency: string;
  interval: 'month' | 'year';
  pagesLimit: number;
  creditsIncluded: number; // Monthly credits included
  features: string[];
  stripePriceId: string;
}

// Credit packs for purchasing additional credits
export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price: number; // in cents
  pricePerCredit: number; // in cents, for display
  bonus: number; // bonus percentage
  popular?: boolean;
  stripePriceId: string;
}

// Credit transaction history
export interface CreditTransaction {
  id: string;
  userId: string;
  type: 'subscription' | 'purchase' | 'usage' | 'bonus' | 'proxy_earned' | 'refund';
  amount: number; // positive = added, negative = used
  balance: number; // balance after transaction
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  clientSecret: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
}

export class PaymentService {
  private stripe: Stripe | null;
  private logger: LoggingService;
  private plans: Map<string, SubscriptionPlan> = new Map();
  private creditPacks: Map<string, CreditPack> = new Map();

  // Credit conversion rates
  static readonly CREDITS_PER_PAGE = 1; // 1 credit = 1 page cloned
  static readonly CREDITS_PER_MB_ASSET = 0.1; // 0.1 credits per MB of assets
  static readonly PROXY_CREDITS_CONVERSION = 10; // 1 proxy credit = 10 clone credits

  constructor() {
    const stripeKey = process.env.STRIPE_SECRET_KEY || '';
    if (!stripeKey) {
      // Don't throw - allow service to work without Stripe for development
      console.warn('STRIPE_SECRET_KEY not set - payment features will be disabled');
      this.stripe = null;
      this.logger = new LoggingService('./logs');
      this.initializePlans();
      this.initializeCreditPacks();
      return;
    }
    this.stripe = new Stripe(stripeKey, {
      apiVersion: '2025-12-15.clover',
    });
    this.logger = new LoggingService('./logs');
    this.initializePlans();
    this.initializeCreditPacks();
  }

  private initializePlans(): void {
    // Starter plan - for individuals
    this.plans.set('starter', {
      id: 'starter',
      name: 'Starter',
      price: 2900, // $29/month
      currency: 'usd',
      interval: 'month',
      pagesLimit: 500,
      creditsIncluded: 500, // 500 credits/month included
      features: [
        '500 credits per month',
        'Basic cloning features',
        'Cloudflare bypass',
        'Email support',
        'Standard processing speed',
        'Config file support',
        'Basic verification',
        'Buy extra credits anytime',
      ],
      stripePriceId: process.env.STRIPE_STARTER_PRICE_ID || '',
    });

    // Professional plan - for freelancers & small agencies
    this.plans.set('pro', {
      id: 'pro',
      name: 'Professional',
      price: 7900, // $79/month
      currency: 'usd',
      interval: 'month',
      pagesLimit: 5000,
      creditsIncluded: 5000, // 5000 credits/month included
      features: [
        '5,000 credits per month',
        'All advanced features',
        'SPA state extraction',
        'WebSocket capture',
        'API access',
        'Priority support',
        '10x faster processing',
        'Advanced verification',
        'Mobile emulation',
        'Geolocation support',
        'Distributed scraping',
        '10% discount on extra credits',
      ],
      stripePriceId: process.env.STRIPE_PRO_PRICE_ID || '',
    });

    // Agency plan - for agencies managing multiple clients
    this.plans.set('agency', {
      id: 'agency',
      name: 'Agency',
      price: 14900, // $149/month
      currency: 'usd',
      interval: 'month',
      pagesLimit: 20000,
      creditsIncluded: 20000, // 20000 credits/month included
      features: [
        '20,000 credits per month',
        'Everything in Professional',
        'Client management dashboard',
        'Bulk cloning operations',
        'White-label exports',
        'Webhook notifications',
        'Team seats (5 included)',
        '20% discount on extra credits',
        'Priority queue',
      ],
      stripePriceId: process.env.STRIPE_AGENCY_PRICE_ID || '',
    });

    // Enterprise plan - unlimited for large organizations
    this.plans.set('enterprise', {
      id: 'enterprise',
      name: 'Enterprise',
      price: 49900, // $499/month
      currency: 'usd',
      interval: 'month',
      pagesLimit: Infinity,
      creditsIncluded: Infinity, // Unlimited
      features: [
        'Unlimited credits',
        'Everything in Agency',
        'Dedicated support manager',
        'Custom integrations',
        'SLA guarantee (99.9% uptime)',
        'Advanced security features',
        'Unlimited team seats',
        'Custom features on request',
        'On-premise deployment option',
        'Training & onboarding',
        'Account manager',
      ],
      stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || '',
    });
  }

  private initializeCreditPacks(): void {
    // Small pack - for occasional extra usage
    this.creditPacks.set('small', {
      id: 'small',
      name: 'Small Pack',
      credits: 100,
      price: 900, // $9
      pricePerCredit: 9, // $0.09 per credit
      bonus: 0,
      stripePriceId: process.env.STRIPE_CREDITS_SMALL_ID || '',
    });

    // Medium pack - popular choice
    this.creditPacks.set('medium', {
      id: 'medium',
      name: 'Medium Pack',
      credits: 500,
      price: 3900, // $39 (save 13%)
      pricePerCredit: 7.8, // $0.078 per credit
      bonus: 13,
      popular: true,
      stripePriceId: process.env.STRIPE_CREDITS_MEDIUM_ID || '',
    });

    // Large pack - best value
    this.creditPacks.set('large', {
      id: 'large',
      name: 'Large Pack',
      credits: 1500,
      price: 9900, // $99 (save 27%)
      pricePerCredit: 6.6, // $0.066 per credit
      bonus: 27,
      stripePriceId: process.env.STRIPE_CREDITS_LARGE_ID || '',
    });

    // Mega pack - for heavy users
    this.creditPacks.set('mega', {
      id: 'mega',
      name: 'Mega Pack',
      credits: 5000,
      price: 24900, // $249 (save 45%)
      pricePerCredit: 4.98, // $0.0498 per credit
      bonus: 45,
      stripePriceId: process.env.STRIPE_CREDITS_MEGA_ID || '',
    });
  }

  /**
   * Get all available plans
   */
  getPlans(): SubscriptionPlan[] {
    return Array.from(this.plans.values());
  }

  /**
   * Get a specific plan
   */
  getPlan(planId: string): SubscriptionPlan | undefined {
    return this.plans.get(planId);
  }

  /**
   * Create a Stripe customer
   */
  async createCustomer(email: string, name: string, userId: string): Promise<Stripe.Customer> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
    }
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: {
          userId,
        },
      });

      await this.logger.info('Stripe customer created', { customerId: customer.id, userId });
      return customer;
    } catch (error) {
      await this.logger.error('Failed to create Stripe customer', error as Error, { email, userId });
      throw error;
    }
  }

  /**
   * Create a checkout session for subscription
   */
  async createCheckoutSession(
    customerId: string,
    planId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<Stripe.Checkout.Session> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
    }
    try {
      const plan = this.getPlan(planId);
      if (!plan || !plan.stripePriceId) {
        throw new Error(`Invalid plan: ${planId}`);
      }

      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: plan.stripePriceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          planId,
        },
      });

      await this.logger.info('Checkout session created', { sessionId: session.id, planId });
      return session;
    } catch (error) {
      await this.logger.error('Failed to create checkout session', error as Error, { planId });
      throw error;
    }
  }

  /**
   * Create a billing portal session
   */
  async createBillingPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<Stripe.BillingPortal.Session> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
    }
    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      await this.logger.info('Billing portal session created', { sessionId: session.id });
      return session;
    } catch (error) {
      await this.logger.error('Failed to create billing portal session', error as Error);
      throw error;
    }
  }

  /**
   * Get subscription by Stripe subscription ID
   */
  async getSubscription(stripeSubscriptionId: string): Promise<Stripe.Subscription> {
    if (!this.stripe) throw new Error('Stripe not configured');
    try {
      const subscription = await this.stripe.subscriptions.retrieve(stripeSubscriptionId);
      return subscription;
    } catch (error) {
      await this.logger.error('Failed to get subscription', error as Error, { stripeSubscriptionId });
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(stripeSubscriptionId: string, immediately: boolean = false): Promise<Stripe.Subscription> {
    try {
      if (immediately) {
        if (!this.stripe) throw new Error('Stripe not configured');
        const subscription = await this.stripe.subscriptions.cancel(stripeSubscriptionId);
        await this.logger.info('Subscription canceled immediately', { stripeSubscriptionId });
        return subscription;
      } else {
        if (!this.stripe) throw new Error('Stripe not configured');
        const subscription = await this.stripe.subscriptions.update(stripeSubscriptionId, {
          cancel_at_period_end: true,
        });
        await this.logger.info('Subscription scheduled for cancellation', { stripeSubscriptionId });
        return subscription;
      }
    } catch (error) {
      await this.logger.error('Failed to cancel subscription', error as Error, { stripeSubscriptionId });
      throw error;
    }
  }

  /**
   * Resume subscription
   */
  async resumeSubscription(stripeSubscriptionId: string): Promise<Stripe.Subscription> {
    if (!this.stripe) throw new Error('Stripe not configured');
    try {
      const subscription = await this.stripe.subscriptions.update(stripeSubscriptionId, {
        cancel_at_period_end: false,
      });
      await this.logger.info('Subscription resumed', { stripeSubscriptionId });
      return subscription;
    } catch (error) {
      await this.logger.error('Failed to resume subscription', error as Error, { stripeSubscriptionId });
      throw error;
    }
  }

  /**
   * Handle webhook event
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
    }
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        default:
          await this.logger.debug('Unhandled webhook event', { type: event.type });
      }
    } catch (error) {
      await this.logger.error('Failed to handle webhook', error as Error, { type: event.type });
      throw error;
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const userId = session.metadata?.userId;
    const planId = session.metadata?.planId;

    if (userId && planId) {
      await this.logger.info('Checkout completed', { userId, planId, sessionId: session.id });
      // Update user plan in database (handled by webhook endpoint)
    }
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata?.userId;
    if (userId) {
      await this.logger.info('Subscription updated', { userId, subscriptionId: subscription.id });
      // Update user subscription in database (handled by webhook endpoint)
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const userId = subscription.metadata?.userId;
    if (userId) {
      await this.logger.info('Subscription deleted', { userId, subscriptionId: subscription.id });
      // Downgrade user to free plan (handled by webhook endpoint)
    }
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    await this.logger.info('Payment succeeded', { invoiceId: invoice.id });
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    await this.logger.warn('Payment failed', { invoiceId: invoice.id });
  }

  /**
   * Track usage for a user
   */
  async trackUsage(userId: string, pagesUsed: number): Promise<void> {
    // This would integrate with Stripe Usage Records for metered billing
    // For now, we track in our database
    await this.logger.debug('Usage tracked', { userId, pagesUsed });
  }

  /**
   * Get all available credit packs
   */
  getCreditPacks(): CreditPack[] {
    return Array.from(this.creditPacks.values());
  }

  /**
   * Get a specific credit pack
   */
  getCreditPack(packId: string): CreditPack | undefined {
    return this.creditPacks.get(packId);
  }

  /**
   * Create a checkout session for purchasing credits
   */
  async createCreditCheckoutSession(
    customerId: string,
    packId: string,
    successUrl: string,
    cancelUrl: string,
    userId: string
  ): Promise<Stripe.Checkout.Session> {
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
    }
    try {
      const pack = this.getCreditPack(packId);
      if (!pack || !pack.stripePriceId) {
        throw new Error(`Invalid credit pack: ${packId}`);
      }

      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: pack.stripePriceId,
            quantity: 1,
          },
        ],
        mode: 'payment', // One-time payment, not subscription
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          type: 'credit_purchase',
          packId,
          userId,
          credits: pack.credits.toString(),
        },
      });

      await this.logger.info('Credit checkout session created', {
        sessionId: session.id,
        packId,
        credits: pack.credits,
      });
      return session;
    } catch (error) {
      await this.logger.error('Failed to create credit checkout session', error as Error, { packId });
      throw error;
    }
  }

  /**
   * Calculate credits needed for a clone job
   */
  calculateCreditsNeeded(options: {
    pagesCount: number;
    assetsSizeMB?: number;
    useDistributed?: boolean;
    usePriorityQueue?: boolean;
  }): number {
    let credits = options.pagesCount * PaymentService.CREDITS_PER_PAGE;

    // Asset storage costs
    if (options.assetsSizeMB) {
      credits += options.assetsSizeMB * PaymentService.CREDITS_PER_MB_ASSET;
    }

    // Premium features cost extra
    if (options.useDistributed) {
      credits *= 1.2; // 20% extra for distributed scraping speed
    }
    if (options.usePriorityQueue) {
      credits *= 1.1; // 10% extra for priority queue
    }

    return Math.ceil(credits);
  }

  /**
   * Get credit discount percentage for a plan
   */
  getCreditDiscount(planId: string): number {
    switch (planId) {
      case 'pro':
        return 0.10; // 10% discount
      case 'agency':
        return 0.20; // 20% discount
      case 'enterprise':
        return 0.30; // 30% discount
      default:
        return 0;
    }
  }

  /**
   * Calculate credit pack price with plan discount
   */
  calculateDiscountedCreditPrice(packId: string, planId: string): number {
    const pack = this.getCreditPack(packId);
    if (!pack) return 0;

    const discount = this.getCreditDiscount(planId);
    return Math.round(pack.price * (1 - discount));
  }
}

