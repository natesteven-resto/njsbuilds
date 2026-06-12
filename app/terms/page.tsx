export const metadata = {
  title: 'Terms & Conditions – Reddi Industries',
}

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 740, margin: '0 auto', padding: '48px 24px', fontFamily: 'sans-serif', color: '#1a1a1a', lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Terms &amp; Conditions</h1>
      <p style={{ color: '#666', marginBottom: 32 }}>Reddi Industries, Inc. &nbsp;|&nbsp; Last updated: June 12, 2026</p>

      <p>By providing your phone number to Reddi Industries, Inc. ("Reddi"), you consent to receive SMS messages related to your service requests, appointments, and account updates. These messages are sent to facilitate the services you have requested from us.</p>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 36, marginBottom: 12 }}>SMS Terms</h2>
      <ul>
        <li>Reply <strong>STOP</strong> to unsubscribe at any time. You will receive a confirmation message and no further SMS will be sent.</li>
        <li>Reply <strong>HELP</strong> for assistance or contact us at <a href="mailto:info@reddiservices.com" style={{ color: '#c82027' }}>info@reddiservices.com</a>.</li>
        <li>Message and data rates may apply depending on your carrier and plan.</li>
        <li>Message frequency varies based on service activity and your requests.</li>
        <li>We do not use your number for unsolicited marketing.</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 36, marginBottom: 12 }}>Service Terms</h2>
      <ul>
        <li>Services provided by Reddi are subject to availability and scheduling.</li>
        <li>Pricing is provided upfront before work begins.</li>
        <li>Reddi reserves the right to update these terms at any time. Continued use of our services constitutes acceptance of any changes.</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 36, marginBottom: 12 }}>Contact</h2>
      <p>Questions about these terms? Contact us at <a href="mailto:info@reddiservices.com" style={{ color: '#c82027' }}>info@reddiservices.com</a></p>
    </main>
  )
}
