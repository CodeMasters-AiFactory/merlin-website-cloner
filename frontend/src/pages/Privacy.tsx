import { Globe, Shield, Eye, Lock, Database, UserCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Privacy() {
  const lastUpdated = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

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
            <nav className="flex space-x-6">
              <Link to="/terms" className="text-gray-600 hover:text-primary-600">Terms of Service</Link>
              <Link to="/acceptable-use" className="text-gray-600 hover:text-primary-600">Acceptable Use</Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
        <p className="text-gray-600 mb-8">Last Updated: {lastUpdated}</p>

        <div className="prose prose-lg max-w-none">
          {/* Introduction */}
          <section className="mb-12">
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-primary-900 mb-3 flex items-center">
                <Shield className="w-6 h-6 mr-2" />
                Our Commitment to Privacy
              </h2>
              <p className="text-primary-800">
                Merlin Clone is committed to protecting your privacy and handling your data responsibly.
                This Privacy Policy explains how we collect, use, store, and protect your information when
                you use our website cloning and backup service.
              </p>
            </div>
          </section>

          {/* Section 1 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Database className="w-6 h-6 mr-2 text-primary-600" />
              1. Information We Collect
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">1.1 Account Information</h3>
            <p>When you create an account, we collect:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Email address</li>
              <li>Name (optional)</li>
              <li>Password (encrypted)</li>
              <li>Company/Organization name (optional)</li>
              <li>Billing information (processed by our payment provider)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">1.2 Usage Information</h3>
            <p>When you use our Service, we collect:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>URLs of websites you clone (to provide the service)</li>
              <li>Timestamps of clone operations</li>
              <li>Clone configuration settings</li>
              <li>IP addresses</li>
              <li>Browser type and version</li>
              <li>Device information</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">1.3 Cloned Content</h3>
            <p>
              <strong>Important:</strong> When you use our Service to clone a website, the cloned content is
              processed through our servers temporarily. We do NOT store copies of your cloned websites
              on our servers beyond the time necessary to complete the download. Cloned content is:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Processed in memory during the clone operation</li>
              <li>Delivered directly to you via secure download</li>
              <li>Automatically purged from our systems within 24 hours</li>
              <li>Never shared with third parties</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Eye className="w-6 h-6 mr-2 text-primary-600" />
              2. How We Use Your Information
            </h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Provide the Service:</strong> Process your clone requests and deliver results</li>
              <li><strong>Account Management:</strong> Create and manage your account</li>
              <li><strong>Billing:</strong> Process payments and manage subscriptions</li>
              <li><strong>Communication:</strong> Send service updates, security alerts, and support messages</li>
              <li><strong>Improvement:</strong> Analyze usage patterns to improve our Service</li>
              <li><strong>Security:</strong> Detect and prevent fraud, abuse, and security threats</li>
              <li><strong>Legal Compliance:</strong> Comply with legal obligations and respond to lawful requests</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Lock className="w-6 h-6 mr-2 text-primary-600" />
              3. Data Security
            </h2>
            <p>We implement robust security measures to protect your data:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Encryption:</strong> All data is encrypted in transit (TLS 1.3) and at rest (AES-256)</li>
              <li><strong>Access Controls:</strong> Strict access controls limit who can access your data</li>
              <li><strong>Infrastructure:</strong> Secure cloud infrastructure with regular security audits</li>
              <li><strong>Password Security:</strong> Passwords are hashed using industry-standard algorithms</li>
              <li><strong>Monitoring:</strong> 24/7 monitoring for security threats</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Sharing</h2>
            <p>We do NOT sell your personal information. We may share data only in these limited circumstances:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Service Providers:</strong> Trusted third parties who help us operate our Service (payment processors, cloud providers)</li>
              <li><strong>Legal Requirements:</strong> When required by law, subpoena, or court order</li>
              <li><strong>Safety:</strong> To protect the rights, property, or safety of Merlin Clone, our users, or the public</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Retention</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Data:</strong> Retained while your account is active and for 30 days after deletion</li>
              <li><strong>Clone History:</strong> URL history retained for 90 days for your reference</li>
              <li><strong>Cloned Content:</strong> Automatically deleted within 24 hours of download</li>
              <li><strong>Logs:</strong> Security and access logs retained for 12 months</li>
              <li><strong>Billing Records:</strong> Retained as required by tax and accounting laws</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <UserCheck className="w-6 h-6 mr-2 text-primary-600" />
              6. Your Rights
            </h2>
            <p>You have the following rights regarding your data:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Request correction of inaccurate data</li>
              <li><strong>Deletion:</strong> Request deletion of your data (subject to legal requirements)</li>
              <li><strong>Portability:</strong> Request your data in a portable format</li>
              <li><strong>Objection:</strong> Object to certain processing activities</li>
              <li><strong>Withdrawal:</strong> Withdraw consent for marketing communications</li>
            </ul>
            <p className="mt-4">
              To exercise these rights, contact us at <strong>privacy@merlinclone.com</strong>
            </p>
          </section>

          {/* Section 7 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Cookies & Tracking</h2>
            <p>We use cookies and similar technologies for:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Essential Cookies:</strong> Required for the Service to function</li>
              <li><strong>Authentication:</strong> To keep you logged in</li>
              <li><strong>Preferences:</strong> To remember your settings</li>
              <li><strong>Analytics:</strong> To understand how you use our Service (anonymized)</li>
            </ul>
            <p className="mt-4">
              You can control cookies through your browser settings. Note that disabling certain cookies
              may affect the functionality of the Service.
            </p>
          </section>

          {/* Section 8 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. International Data Transfers</h2>
            <p>
              Your data may be processed in countries other than your own. We ensure appropriate safeguards
              are in place for international transfers, including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Standard Contractual Clauses (SCCs)</li>
              <li>Data Processing Agreements with all service providers</li>
              <li>Compliance with GDPR for EU users</li>
            </ul>
          </section>

          {/* Section 9 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Children's Privacy</h2>
            <p>
              Our Service is not intended for children under 16. We do not knowingly collect personal
              information from children. If you believe a child has provided us with personal information,
              please contact us immediately.
            </p>
          </section>

          {/* Section 10 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant changes
              by email or through the Service. Your continued use of the Service after changes constitutes
              acceptance of the updated policy.
            </p>
          </section>

          {/* Section 11 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Contact Us</h2>
            <div className="bg-gray-100 p-6 rounded-lg">
              <p><strong>Privacy Questions:</strong> privacy@merlinclone.com</p>
              <p><strong>Data Requests:</strong> datarequests@merlinclone.com</p>
              <p><strong>General Support:</strong> support@merlinclone.com</p>
            </div>
          </section>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-12 pt-8 border-t border-gray-200">
          <Link to="/terms" className="text-primary-600 hover:text-primary-700 font-medium">
            &larr; Terms of Service
          </Link>
          <Link to="/acceptable-use" className="text-primary-600 hover:text-primary-700 font-medium">
            Acceptable Use Policy &rarr;
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; {new Date().getFullYear()} Merlin Clone. All rights reserved.</p>
          <div className="flex justify-center space-x-6 mt-4">
            <Link to="/terms" className="hover:text-white">Terms of Service</Link>
            <Link to="/privacy" className="hover:text-white">Privacy Policy</Link>
            <Link to="/acceptable-use" className="hover:text-white">Acceptable Use</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
