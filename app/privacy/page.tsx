export const metadata = {
  title: 'Privacy Policy – Reddi Industries',
}

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 740, margin: '0 auto', padding: '48px 24px', fontFamily: 'sans-serif', color: '#1a1a1a', lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Privacy Policy</h1>
      <p style={{ color: '#666', marginBottom: 32 }}>Reddi Industries, Inc. &nbsp;|&nbsp; Last updated: June 12, 2026</p>

      <p>Reddi Industries, Inc. ("Reddi") collects customer information (name, phone number, address, and service history) solely to provide and improve our residential and commercial services. We are committed to protecting your privacy and handling your data responsibly.</p>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 36, marginBottom: 12 }}>Information We Collect</h2>
      <ul>
        <li>Name, phone number, and address provided when scheduling service</li>
        <li>Service history and communication preferences</li>
        <li>Information submitted through our website or SMS opt-in forms</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 36, marginBottom: 12 }}>SMS Communications</h2>
      <ul>
        <li>We send appointment reminders, technician ETAs, and service updates via SMS.</li>
        <li>Message frequency varies by service activity.</li>
        <li>Message and data rates may apply.</li>
        <li>Reply <strong>STOP</strong> to opt out at any time. Reply <strong>HELP</strong> for help.</li>
        <li>We do not sell or share your phone number with third parties for marketing purposes.</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 36, marginBottom: 12 }}>How We Use Your Information</h2>
      <ul>
        <li>To schedule, dispatch, and complete service requests</li>
        <li>To send service-related communications via SMS or email</li>
        <li>To improve our services and customer experience</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 36, marginBottom: 12 }}>Data Sharing</h2>
      <p>We do not sell, rent, or share your personal information with third parties for marketing purposes. We may share information with service partners only as necessary to fulfill your service request.</p>

      <h2 style={{ fontSize: 20, fontWeight: 600, marginTop: 36, marginBottom: 12 }}>Contact</h2>
      <p>Questions about this policy? Contact us at <a href="mailto:info@reddiservices.com" style={{ color: '#c82027' }}>info@reddiservices.com</a></p>
    </main>
  )
}
