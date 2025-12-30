import { Shield, AlertTriangle, Scale, FileText, CheckCircle } from 'lucide-react'
import { Navbar, Footer } from '../components/layout'

export default function Terms() {
  const lastUpdated = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Important Notice Banner */}
        <div className="bg-red-50 border-l-4 border-red-500 p-6 mb-8 rounded-r-lg">
          <div className="flex items-start">
            <AlertTriangle className="w-6 h-6 text-red-500 mt-1 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-bold text-red-800">IMPORTANT: READ BEFORE USING THIS SERVICE</h3>
              <p className="text-red-700 mt-2">
                By using Merlin Clone, you acknowledge and agree that you have <strong>full legal authority and ownership rights</strong> to
                clone any website you submit to our service. Unauthorized cloning of websites you do not own is <strong>illegal</strong> and
                may violate copyright, trademark, and computer fraud laws. You accept <strong>full legal responsibility</strong> for your use of this service.
              </p>
            </div>
          </div>
        </div>

        <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
        <p className="text-gray-600 mb-8">Last Updated: {lastUpdated}</p>

        {/* User Agreement Summary */}
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-primary-900 mb-4 flex items-center">
            <CheckCircle className="w-6 h-6 mr-2" />
            By Using This Service, You Confirm:
          </h2>
          <ul className="space-y-3 text-primary-800">
            <li className="flex items-start">
              <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span>You are the <strong>legal owner</strong> or have <strong>explicit written authorization</strong> to clone the website(s) you submit</span>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span>You will use this service <strong>only for lawful purposes</strong> such as disaster recovery, backup, migration, or development</span>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span>You will <strong>NOT</strong> use this service to infringe on intellectual property rights, steal content, or engage in any illegal activity</span>
            </li>
            <li className="flex items-start">
              <span className="w-2 h-2 bg-primary-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              <span>You accept <strong>full legal and financial responsibility</strong> for any misuse of this service</span>
            </li>
          </ul>
        </div>

        <div className="prose prose-lg max-w-none">
          {/* Section 1 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <FileText className="w-6 h-6 mr-2 text-primary-600" />
              1. Acceptance of Terms
            </h2>
            <p>
              These Terms of Service ("Terms") constitute a legally binding agreement between you ("User," "you," or "your") and
              Merlin Clone ("Company," "we," "us," or "our") governing your access to and use of the Merlin Clone website backup
              and cloning service (the "Service").
            </p>
            <p>
              <strong>BY ACCESSING OR USING THE SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS.</strong>
              If you do not agree to these Terms, you must not access or use the Service.
            </p>
            <p>
              We reserve the right to modify these Terms at any time. Continued use of the Service after any modifications
              constitutes acceptance of the revised Terms.
            </p>
          </section>

          {/* Section 2 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Shield className="w-6 h-6 mr-2 text-primary-600" />
              2. Authorized Use & Ownership Requirements
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">2.1 Ownership Certification</h3>
            <p>
              By submitting any website URL to our Service, you hereby certify and warrant that:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You are the <strong>legal owner</strong> of the website and all content therein; OR</li>
              <li>You have obtained <strong>explicit written authorization</strong> from the website owner to create a backup/clone; OR</li>
              <li>You are an <strong>authorized representative</strong> (employee, contractor, or agent) acting on behalf of the website owner with documented permission; OR</li>
              <li>The content is in the <strong>public domain</strong> or licensed under terms that explicitly permit copying and redistribution</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">2.2 Legitimate Use Cases</h3>
            <p>The Service is designed exclusively for legitimate purposes including, but not limited to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Disaster Recovery:</strong> Creating backups of your own websites for business continuity</li>
              <li><strong>Website Migration:</strong> Moving your website between hosting providers or platforms</li>
              <li><strong>Development & Testing:</strong> Creating local copies for development, staging, or QA purposes</li>
              <li><strong>Archival:</strong> Preserving historical versions of your own web content</li>
              <li><strong>Agency Services:</strong> Backing up client websites with documented client authorization</li>
              <li><strong>Legal Compliance:</strong> Creating records for regulatory or legal requirements</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">2.3 Documentation Requirements</h3>
            <p>
              We reserve the right to request proof of ownership or authorization at any time. Users must be prepared to provide:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Domain registration records showing ownership</li>
              <li>Written authorization from website owners (for agency use)</li>
              <li>Employment verification (for corporate users)</li>
              <li>Any other documentation reasonably requested to verify authorization</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="w-6 h-6 mr-2 text-red-600" />
              3. Prohibited Activities
            </h2>

            <div className="bg-red-50 border border-red-200 rounded-lg p-6 my-6">
              <h3 className="text-lg font-bold text-red-800 mb-3">THE FOLLOWING ACTIVITIES ARE STRICTLY PROHIBITED:</h3>
              <ul className="space-y-3 text-red-700">
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">&#10006;</span>
                  <span><strong>Unauthorized Cloning:</strong> Cloning, copying, or scraping any website without explicit authorization from the owner</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">&#10006;</span>
                  <span><strong>Copyright Infringement:</strong> Copying content, images, code, or other materials protected by copyright without permission</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">&#10006;</span>
                  <span><strong>Trademark Violation:</strong> Cloning websites to impersonate brands, companies, or individuals</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">&#10006;</span>
                  <span><strong>Phishing & Fraud:</strong> Creating clones for deceptive purposes, credential harvesting, or financial fraud</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">&#10006;</span>
                  <span><strong>Competitive Intelligence:</strong> Scraping competitor websites without authorization</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">&#10006;</span>
                  <span><strong>Data Theft:</strong> Extracting personal data, customer information, or proprietary business data</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">&#10006;</span>
                  <span><strong>Bypassing Security:</strong> Using the Service to circumvent access controls on websites you are not authorized to access</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">&#10006;</span>
                  <span><strong>Malware Distribution:</strong> Cloning sites to distribute malware, viruses, or malicious code</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">&#10006;</span>
                  <span><strong>DMCA Circumvention:</strong> Using cloned content in ways that violate the Digital Millennium Copyright Act</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <Scale className="w-6 h-6 mr-2 text-primary-600" />
              4. Legal Liability & Indemnification
            </h2>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">4.1 User Responsibility</h3>
            <p>
              <strong>YOU ASSUME FULL LEGAL AND FINANCIAL RESPONSIBILITY</strong> for all activities conducted through your account
              and for ensuring that your use of the Service complies with all applicable local, state, national, and international
              laws and regulations, including but not limited to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Copyright Act (17 U.S.C. and international equivalents)</li>
              <li>Digital Millennium Copyright Act (DMCA)</li>
              <li>Computer Fraud and Abuse Act (CFAA)</li>
              <li>General Data Protection Regulation (GDPR)</li>
              <li>California Consumer Privacy Act (CCPA)</li>
              <li>Trademark laws and regulations</li>
              <li>Any other applicable intellectual property or data protection laws</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">4.2 Indemnification</h3>
            <p>
              You agree to <strong>indemnify, defend, and hold harmless</strong> Merlin Clone, its officers, directors, employees,
              agents, licensors, and suppliers from and against any and all claims, losses, damages, liabilities, costs, and
              expenses (including reasonable attorneys' fees) arising out of or related to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your use or misuse of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any rights of another party, including intellectual property rights</li>
              <li>Any claim that your use of the Service caused damage to a third party</li>
              <li>Any legal action or regulatory investigation resulting from your activities</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">4.3 Disclaimer of Warranties</h3>
            <p>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
              WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE. WE MAKE NO REPRESENTATIONS
              REGARDING THE LEGALITY OF YOUR SPECIFIC USE CASE.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">4.4 Limitation of Liability</h3>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, MERLIN CLONE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
              CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, OR GOODWILL,
              ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.
            </p>
          </section>

          {/* Section 5 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Account Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account immediately, without prior notice or liability, if:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You violate any provision of these Terms</li>
              <li>We receive a valid complaint from a website owner regarding unauthorized cloning</li>
              <li>We receive a DMCA takedown notice or similar legal notice</li>
              <li>We reasonably suspect fraudulent, abusive, or illegal activity</li>
              <li>You fail to provide documentation proving ownership or authorization when requested</li>
            </ul>
            <p className="mt-4">
              Upon termination, your right to use the Service will immediately cease. All provisions of these Terms which
              by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers,
              indemnity, and limitations of liability.
            </p>
          </section>

          {/* Section 6 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Cooperation with Law Enforcement</h2>
            <p>
              We will cooperate fully with law enforcement agencies and court orders requesting or directing us to disclose
              the identity, account information, or activity logs of any user suspected of illegal activity. We may also
              voluntarily report suspected illegal activity to appropriate authorities.
            </p>
          </section>

          {/* Section 7 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Governing Law & Dispute Resolution</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of [Jurisdiction], without regard
              to its conflict of law provisions. Any disputes arising under these Terms shall be resolved through binding
              arbitration in accordance with the rules of [Arbitration Association], except that either party may seek
              injunctive relief in any court of competent jurisdiction.
            </p>
          </section>

          {/* Section 8 */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Contact Information</h2>
            <p>
              For questions about these Terms or to report suspected violations, please contact us at:
            </p>
            <div className="bg-gray-100 p-4 rounded-lg mt-4">
              <p><strong>Email:</strong> legal@merlinclone.com</p>
              <p><strong>DMCA Agent:</strong> dmca@merlinclone.com</p>
              <p><strong>Abuse Reports:</strong> abuse@merlinclone.com</p>
            </div>
          </section>
        </div>

        {/* Final Agreement */}
        <div className="bg-gray-900 text-white rounded-lg p-8 mt-12">
          <h2 className="text-2xl font-bold mb-4">Agreement Acknowledgment</h2>
          <p className="text-gray-300 mb-6">
            By clicking "I Agree," creating an account, or using the Service in any way, you acknowledge that:
          </p>
          <ul className="space-y-3 text-gray-300 mb-6">
            <li className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
              <span>You have read and understood these Terms of Service in their entirety</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
              <span>You agree to be legally bound by these Terms</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
              <span>You certify that you have the legal authority to clone any website you submit</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
              <span>You accept full responsibility for any consequences arising from your use of the Service</span>
            </li>
          </ul>
          <p className="text-sm text-gray-400">
            If you do not agree to these Terms, you must not use the Service. Your continued use constitutes ongoing acceptance.
          </p>
        </div>

      </div>

      <Footer minimal />
    </div>
  )
}
