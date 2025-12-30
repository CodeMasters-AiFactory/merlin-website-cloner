import { AlertTriangle, CheckCircle, XCircle, Shield, Gavel } from 'lucide-react'
import { Navbar, Footer } from '../components/layout'

export default function AcceptableUse() {
  const lastUpdated = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Acceptable Use Policy</h1>
        <p className="text-gray-600 mb-8">Last Updated: {lastUpdated}</p>

        {/* Critical Warning */}
        <div className="bg-red-50 border-l-4 border-red-500 p-6 mb-8 rounded-r-lg">
          <div className="flex items-start">
            <AlertTriangle className="w-6 h-6 text-red-500 mt-1 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-bold text-red-800">WARNING: UNAUTHORIZED USE IS ILLEGAL</h3>
              <p className="text-red-700 mt-2">
                Using Merlin Clone to scrape, copy, or clone websites without authorization may violate
                federal and international laws including the Computer Fraud and Abuse Act (CFAA),
                Copyright Act, and DMCA. Violations can result in <strong>civil penalties up to $150,000
                per work infringed</strong> and <strong>criminal penalties including imprisonment</strong>.
              </p>
            </div>
          </div>
        </div>

        <div className="prose prose-lg max-w-none">
          {/* Introduction */}
          <section className="mb-12">
            <p className="text-lg">
              This Acceptable Use Policy ("AUP") describes prohibited uses of Merlin Clone's website
              cloning service. This AUP is incorporated by reference into our Terms of Service and
              applies to all users of our Service.
            </p>
          </section>

          {/* Acceptable Uses */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <CheckCircle className="w-6 h-6 mr-2 text-green-600" />
              Acceptable Uses
            </h2>
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <p className="text-green-800 mb-4">
                Merlin Clone may be used for the following legitimate purposes:
              </p>
              <ul className="space-y-3">
                <li className="flex items-start text-green-700">
                  <CheckCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-green-500" />
                  <span><strong>Backing up your own websites</strong> - Create disaster recovery copies of websites you own</span>
                </li>
                <li className="flex items-start text-green-700">
                  <CheckCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-green-500" />
                  <span><strong>Website migration</strong> - Move your website between hosting providers or platforms</span>
                </li>
                <li className="flex items-start text-green-700">
                  <CheckCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-green-500" />
                  <span><strong>Development environments</strong> - Create local copies for testing and development</span>
                </li>
                <li className="flex items-start text-green-700">
                  <CheckCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-green-500" />
                  <span><strong>Authorized agency work</strong> - Backup client websites with documented written authorization</span>
                </li>
                <li className="flex items-start text-green-700">
                  <CheckCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-green-500" />
                  <span><strong>Archival purposes</strong> - Preserve historical versions of your own web content</span>
                </li>
                <li className="flex items-start text-green-700">
                  <CheckCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-green-500" />
                  <span><strong>Legal compliance</strong> - Create records required for regulatory or legal purposes</span>
                </li>
                <li className="flex items-start text-green-700">
                  <CheckCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-green-500" />
                  <span><strong>Public domain content</strong> - Clone content explicitly licensed for copying</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Prohibited Uses */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <XCircle className="w-6 h-6 mr-2 text-red-600" />
              Prohibited Uses
            </h2>
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <p className="text-red-800 mb-4 font-semibold">
                The following activities are STRICTLY PROHIBITED and may result in immediate account
                termination and legal action:
              </p>

              <h3 className="font-bold text-red-800 mt-6 mb-3">Intellectual Property Violations</h3>
              <ul className="space-y-2">
                <li className="flex items-start text-red-700">
                  <XCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-red-500" />
                  <span>Cloning websites without authorization from the owner</span>
                </li>
                <li className="flex items-start text-red-700">
                  <XCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-red-500" />
                  <span>Copying copyrighted content, images, videos, or code without permission</span>
                </li>
                <li className="flex items-start text-red-700">
                  <XCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-red-500" />
                  <span>Infringing on trademarks, trade dress, or brand identity</span>
                </li>
                <li className="flex items-start text-red-700">
                  <XCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-red-500" />
                  <span>Stealing proprietary designs, templates, or functionality</span>
                </li>
              </ul>

              <h3 className="font-bold text-red-800 mt-6 mb-3">Fraud & Deception</h3>
              <ul className="space-y-2">
                <li className="flex items-start text-red-700">
                  <XCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-red-500" />
                  <span>Creating phishing sites or credential harvesting pages</span>
                </li>
                <li className="flex items-start text-red-700">
                  <XCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-red-500" />
                  <span>Impersonating businesses, organizations, or individuals</span>
                </li>
                <li className="flex items-start text-red-700">
                  <XCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-red-500" />
                  <span>Creating fake e-commerce sites for fraud</span>
                </li>
                <li className="flex items-start text-red-700">
                  <XCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-red-500" />
                  <span>Spreading misinformation using cloned news sites</span>
                </li>
              </ul>

              <h3 className="font-bold text-red-800 mt-6 mb-3">Data Theft & Privacy Violations</h3>
              <ul className="space-y-2">
                <li className="flex items-start text-red-700">
                  <XCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-red-500" />
                  <span>Scraping personal data without consent</span>
                </li>
                <li className="flex items-start text-red-700">
                  <XCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-red-500" />
                  <span>Harvesting email addresses, phone numbers, or contact information</span>
                </li>
                <li className="flex items-start text-red-700">
                  <XCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-red-500" />
                  <span>Extracting customer databases or user information</span>
                </li>
                <li className="flex items-start text-red-700">
                  <XCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-red-500" />
                  <span>Violating GDPR, CCPA, or other data protection regulations</span>
                </li>
              </ul>

              <h3 className="font-bold text-red-800 mt-6 mb-3">Competitive & Commercial Abuse</h3>
              <ul className="space-y-2">
                <li className="flex items-start text-red-700">
                  <XCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-red-500" />
                  <span>Scraping competitor websites for intelligence gathering</span>
                </li>
                <li className="flex items-start text-red-700">
                  <XCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-red-500" />
                  <span>Price scraping or monitoring without authorization</span>
                </li>
                <li className="flex items-start text-red-700">
                  <XCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-red-500" />
                  <span>Cloning sites to create competing products</span>
                </li>
                <li className="flex items-start text-red-700">
                  <XCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-red-500" />
                  <span>Republishing content for commercial gain without rights</span>
                </li>
              </ul>

              <h3 className="font-bold text-red-800 mt-6 mb-3">Security Violations</h3>
              <ul className="space-y-2">
                <li className="flex items-start text-red-700">
                  <XCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-red-500" />
                  <span>Bypassing security measures or access controls</span>
                </li>
                <li className="flex items-start text-red-700">
                  <XCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-red-500" />
                  <span>Circumventing rate limits or anti-bot protections</span>
                </li>
                <li className="flex items-start text-red-700">
                  <XCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-red-500" />
                  <span>Using cloned sites to distribute malware</span>
                </li>
                <li className="flex items-start text-red-700">
                  <XCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-red-500" />
                  <span>Exploiting vulnerabilities discovered during cloning</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Legal Consequences */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Gavel className="w-6 h-6 mr-2 text-primary-600" />
              Legal Consequences
            </h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <p className="text-yellow-800 mb-4">
                Violations of this AUP may result in:
              </p>
              <ul className="space-y-3 text-yellow-800">
                <li className="flex items-start">
                  <span className="font-bold mr-2">1.</span>
                  <span><strong>Immediate account termination</strong> without refund</span>
                </li>
                <li className="flex items-start">
                  <span className="font-bold mr-2">2.</span>
                  <span><strong>Civil liability</strong> - Copyright damages can reach $150,000 per work infringed</span>
                </li>
                <li className="flex items-start">
                  <span className="font-bold mr-2">3.</span>
                  <span><strong>Criminal prosecution</strong> - CFAA violations can result in fines and imprisonment</span>
                </li>
                <li className="flex items-start">
                  <span className="font-bold mr-2">4.</span>
                  <span><strong>Reporting to authorities</strong> - We cooperate fully with law enforcement</span>
                </li>
                <li className="flex items-start">
                  <span className="font-bold mr-2">5.</span>
                  <span><strong>Permanent ban</strong> from our services</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Verification Requirements */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Shield className="w-6 h-6 mr-2 text-primary-600" />
              Verification Requirements
            </h2>
            <p>
              We reserve the right to verify your authorization at any time. You may be required to provide:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>Proof of domain ownership (WHOIS records, DNS verification)</li>
              <li>Written authorization from website owners (for agencies)</li>
              <li>Business relationship documentation</li>
              <li>Employment verification</li>
              <li>Legal documentation supporting your right to clone</li>
            </ul>
            <p className="mt-4">
              Failure to provide verification when requested will result in account suspension.
            </p>
          </section>

          {/* Reporting Violations */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Reporting Violations</h2>
            <p>
              If you believe your website has been cloned without authorization, or if you witness
              misuse of our Service, please report it immediately:
            </p>
            <div className="bg-gray-100 p-6 rounded-lg mt-4">
              <p><strong>Abuse Reports:</strong> abuse@merlinclone.com</p>
              <p><strong>DMCA Notices:</strong> dmca@merlinclone.com</p>
              <p><strong>Copyright Claims:</strong> copyright@merlinclone.com</p>
            </div>
            <p className="mt-4">
              We respond to all valid reports within 24 hours and take swift action against violators.
            </p>
          </section>

          {/* Agreement */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Agreement</h2>
            <div className="bg-gray-900 text-white rounded-lg p-6">
              <p className="text-gray-300 mb-4">
                By using Merlin Clone, you affirm that you:
              </p>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-green-400" />
                  <span>Have read and understood this Acceptable Use Policy</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-green-400" />
                  <span>Will only clone websites you own or have explicit authorization to clone</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-green-400" />
                  <span>Accept full legal responsibility for your use of the Service</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 text-green-400" />
                  <span>Will provide verification of ownership when requested</span>
                </li>
              </ul>
            </div>
          </section>
        </div>

      </div>

      <Footer minimal />
    </div>
  )
}
