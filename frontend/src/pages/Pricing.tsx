import { useState } from 'react'
import { Check, Globe, Zap, ArrowRight, Gift, Home, Briefcase, Building2, X } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Pricing() {
  const [showCredits, setShowCredits] = useState(false)

  const plans = [
    {
      name: 'Home',
      price: '$19',
      period: 'per month',
      credits: 250,
      description: 'For personal projects & hobbyists',
      icon: Home,
      color: 'blue',
      features: [
        '250 credits per month',
        'Clone up to 50 pages per site',
        'Basic HTML/CSS cloning',
        'Standard image download',
        'Email support (48h response)',
        'Download as ZIP',
        '1 user account'
      ],
      notIncluded: [
        'JavaScript rendering',
        'Cloudflare bypass',
        'API access',
        'Priority support'
      ],
      cta: 'Start Free Trial',
      popular: false,
      planId: 'home',
      creditDiscount: 0
    },
    {
      name: 'Business',
      price: '$79',
      period: 'per month',
      credits: 2500,
      description: 'For professionals & small agencies',
      icon: Briefcase,
      color: 'primary',
      features: [
        '2,500 credits per month',
        'Clone up to 500 pages per site',
        'Full JavaScript/SPA rendering',
        'Cloudflare & bot protection bypass',
        'All asset types (fonts, videos, etc)',
        'Priority support (24h response)',
        'API access',
        'Webhook notifications',
        '5 team members',
        '10% discount on extra credits'
      ],
      notIncluded: [
        'White-label exports',
        'Dedicated account manager',
        'Custom integrations'
      ],
      cta: 'Start Free Trial',
      popular: true,
      planId: 'business',
      creditDiscount: 10
    },
    {
      name: 'Corporate',
      price: '$299',
      period: 'per month',
      credits: 15000,
      description: 'For enterprises & large teams',
      icon: Building2,
      color: 'purple',
      features: [
        '15,000 credits per month',
        'Unlimited pages per site',
        'Everything in Business',
        'White-label exports',
        'Dedicated account manager',
        'Custom API integrations',
        'Bulk cloning operations',
        'Priority queue processing',
        'SSO/SAML authentication',
        'Unlimited team members',
        'SLA guarantee (99.9% uptime)',
        'On-premise deployment option',
        '25% discount on extra credits'
      ],
      notIncluded: [],
      cta: 'Contact Sales',
      popular: false,
      planId: 'corporate',
      creditDiscount: 25
    }
  ]

  const creditPacks = [
    {
      name: 'Small Pack',
      credits: 100,
      price: '$9',
      pricePerCredit: '9¢',
      bonus: 0,
      popular: false
    },
    {
      name: 'Medium Pack',
      credits: 500,
      price: '$39',
      pricePerCredit: '7.8¢',
      bonus: 13,
      popular: true
    },
    {
      name: 'Large Pack',
      credits: 1500,
      price: '$99',
      pricePerCredit: '6.6¢',
      bonus: 27,
      popular: false
    },
    {
      name: 'Mega Pack',
      credits: 5000,
      price: '$249',
      pricePerCredit: '5¢',
      bonus: 45,
      popular: false
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2">
              <Globe className="w-8 h-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">Merlin Clone</span>
            </Link>
            <nav className="flex items-center space-x-6">
              <Link to="/proxy-network" className="text-gray-600 hover:text-primary-600">Earn Credits</Link>
              <Link to="/docs" className="text-gray-600 hover:text-primary-600">Docs</Link>
              <Link to="/login" className="text-gray-600 hover:text-primary-600">Login</Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Choose Your Perfect Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-4">
            From personal projects to enterprise solutions. Each tier is designed for specific needs with unique features.
          </p>
          <div className="flex items-center justify-center gap-8 text-sm text-gray-500 mb-8">
            <span className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-1" /> 14-day free trial</span>
            <span className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-1" /> No credit card required</span>
            <span className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-1" /> Cancel anytime</span>
          </div>

          {/* Toggle */}
          <div className="inline-flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setShowCredits(false)}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                !showCredits ? 'bg-white shadow text-gray-900' : 'text-gray-600'
              }`}
            >
              Subscription Plans
            </button>
            <button
              onClick={() => setShowCredits(true)}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                showCredits ? 'bg-white shadow text-gray-900' : 'text-gray-600'
              }`}
            >
              Buy Credits
            </button>
          </div>
        </div>

        {/* Subscription Plans */}
        {!showCredits && (
          <>
            <div className="grid md:grid-cols-3 gap-8 mb-12 max-w-6xl mx-auto">
              {plans.map((plan) => {
                const IconComponent = plan.icon
                const colorClasses = {
                  blue: 'bg-blue-100 text-blue-600',
                  primary: 'bg-primary-100 text-primary-600',
                  purple: 'bg-purple-100 text-purple-600'
                }
                return (
                  <div
                    key={plan.name}
                    className={`bg-white rounded-2xl shadow-sm p-8 relative flex flex-col ${
                      plan.popular ? 'ring-2 ring-primary-500 shadow-xl scale-105' : 'border border-gray-200'
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <span className="bg-primary-600 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-lg">
                          Most Popular
                        </span>
                      </div>
                    )}

                    <div className="text-center mb-6">
                      <div className={`w-16 h-16 rounded-2xl ${colorClasses[plan.color as keyof typeof colorClasses]} flex items-center justify-center mx-auto mb-4`}>
                        <IconComponent className="w-8 h-8" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                      <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
                      <div className="flex items-baseline justify-center mb-2">
                        <span className="text-5xl font-bold text-gray-900">{plan.price}</span>
                        <span className="text-gray-600 ml-2">/{plan.period.split(' ')[0]}</span>
                      </div>
                      <div className="flex items-center justify-center text-primary-600 font-semibold">
                        <Zap className="w-5 h-5 mr-1" />
                        {plan.credits.toLocaleString()} credits/month
                      </div>
                    </div>

                    {/* Included Features */}
                    <div className="flex-1">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">What's Included</h4>
                      <ul className="space-y-3 mb-6">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-start text-sm">
                            <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                            <span className="text-gray-700">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Not Included */}
                      {plan.notIncluded.length > 0 && (
                        <>
                          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Not Included</h4>
                          <ul className="space-y-2 mb-6">
                            {plan.notIncluded.map((feature, index) => (
                              <li key={index} className="flex items-start text-sm">
                                <X className="w-4 h-4 text-gray-300 mr-2 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-400">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>

                    <Link
                      to={plan.name === 'Corporate' ? '/contact' : `/signup?plan=${plan.planId}`}
                      className={`block w-full text-center py-4 rounded-xl font-semibold transition-all ${
                        plan.popular
                          ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg hover:shadow-xl'
                          : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                      }`}
                    >
                      {plan.cta}
                    </Link>
                  </div>
                )
              })}
            </div>

            {/* Earn Credits CTA */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-8 text-white text-center mb-12">
              <Gift className="w-12 h-12 mx-auto mb-4 opacity-80" />
              <h3 className="text-2xl font-bold mb-2">Earn Free Credits!</h3>
              <p className="text-primary-100 mb-4 max-w-2xl mx-auto">
                Join our P2P proxy network and earn credits by sharing your bandwidth.
                Every request you serve earns you credits for free website cloning.
              </p>
              <Link
                to="/proxy-network"
                className="inline-flex items-center px-6 py-3 bg-white text-primary-600 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
              >
                Learn How to Earn
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </div>
          </>
        )}

        {/* Credit Packs */}
        {showCredits && (
          <>
            <div className="max-w-4xl mx-auto">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {creditPacks.map((pack) => (
                  <div
                    key={pack.name}
                    className={`bg-white rounded-2xl shadow-sm p-6 relative ${
                      pack.popular ? 'ring-2 ring-primary-500 shadow-lg' : 'border border-gray-200'
                    }`}
                  >
                    {pack.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-primary-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                          Best Value
                        </span>
                      </div>
                    )}

                    {pack.bonus > 0 && (
                      <div className="absolute top-4 right-4">
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold">
                          Save {pack.bonus}%
                        </span>
                      </div>
                    )}

                    <div className="text-center mb-4">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{pack.name}</h3>
                      <div className="text-3xl font-bold text-gray-900 mb-1">{pack.price}</div>
                      <div className="text-primary-600 font-medium">
                        {pack.credits.toLocaleString()} credits
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {pack.pricePerCredit} per credit
                      </div>
                    </div>

                    <button
                      className={`w-full py-2.5 rounded-lg font-semibold transition-colors ${
                        pack.popular
                          ? 'bg-primary-600 text-white hover:bg-primary-700'
                          : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                      }`}
                    >
                      Buy Now
                    </button>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
                <h4 className="font-semibold text-blue-900 mb-2">Subscriber Discounts</h4>
                <p className="text-blue-700 text-sm">
                  Business subscribers get 10% off credit packs. Corporate gets 25% off.
                </p>
              </div>
            </div>
          </>
        )}

        {/* How Credits Work */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">How Credits Work</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">1</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">1 Credit = 1 Page</h4>
              <p className="text-sm text-gray-600">
                Clone any page for just 1 credit. Assets are included in the base cost.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">+</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Credits Roll Over</h4>
              <p className="text-sm text-gray-600">
                Unused subscription credits roll over. Purchased credits never expire.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gift className="w-6 h-6 text-primary-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Earn Free Credits</h4>
              <p className="text-sm text-gray-600">
                Contribute to our proxy network and earn credits for free cloning.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2">What happens if I run out of credits?</h4>
              <p className="text-gray-600">
                You can buy additional credit packs anytime. Subscribers also get discounts on credit purchases.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2">Do unused credits expire?</h4>
              <p className="text-gray-600">
                Purchased credits never expire. Subscription credits roll over for up to 3 months.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2">How can I earn free credits?</h4>
              <p className="text-gray-600">
                Join our P2P proxy network! By contributing your bandwidth, you earn credits that can be used for cloning. Visit the Proxy Network page to learn more.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2">Can I upgrade or downgrade my plan?</h4>
              <p className="text-gray-600">
                Yes! You can change your plan anytime. When upgrading, you'll receive the difference in credits immediately.
              </p>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-16 text-center">
          <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-1">14-Day Free Trial</h4>
              <p className="text-sm text-gray-600">Try all features risk-free</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-1">Cancel Anytime</h4>
              <p className="text-sm text-gray-600">No long-term contracts</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-1">30-Day Refund</h4>
              <p className="text-sm text-gray-600">Money-back guarantee</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; {new Date().getFullYear()} Merlin Clone. All rights reserved.</p>
          <div className="flex justify-center space-x-6 mt-4">
            <Link to="/terms" className="hover:text-white">Terms</Link>
            <Link to="/privacy" className="hover:text-white">Privacy</Link>
            <Link to="/acceptable-use" className="hover:text-white">Acceptable Use</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
