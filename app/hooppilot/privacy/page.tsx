export const metadata = {
  title: 'Hoop Pilot — Privacy Policy',
  description: 'Privacy Policy for the Hoop Pilot basketball coaching app.',
}

export default function HoopPilotPrivacy() {
  return (
    <main
      style={{
        maxWidth: 740,
        margin: '0 auto',
        padding: '48px 24px',
        fontFamily: 'sans-serif',
        color: '#16181D',
        lineHeight: 1.7,
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4, letterSpacing: -0.4 }}>
        Privacy Policy
      </h1>
      <p style={{ color: '#5C626C', marginBottom: 32 }}>
        Hoop Pilot &nbsp;|&nbsp; Last updated: August 30, 2026
      </p>

      <p>
        Hoop Pilot (&quot;the app&quot;) is a basketball coaching tool. We designed it to keep your
        coaching data private. This policy explains what the app does and does not collect.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 36, marginBottom: 12 }}>
        Data Stored on Your Device
      </h2>
      <p>
        Your rosters, plays, practice plans, drills, and game stats are stored locally on your
        device only. This information is not transmitted to us and we cannot access it. If you use
        the Backup feature, a copy is saved to your own iCloud Drive or Files — under your control,
        not ours.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 36, marginBottom: 12 }}>
        Subscriptions
      </h2>
      <p>
        Subscriptions are processed by Apple through your Apple ID. We use RevenueCat to manage
        subscription status. We do not receive or store your payment information. Apple and
        RevenueCat handle purchase data under their own privacy policies.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 36, marginBottom: 12 }}>
        Information We Do Not Collect
      </h2>
      <ul>
        <li>We do not require an account to use the core app.</li>
        <li>We do not collect your name, email, or contacts.</li>
        <li>We do not track your location.</li>
        <li>We do not sell or share any personal information.</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 36, marginBottom: 12 }}>
        Future Community Features
      </h2>
      <p>
        As community features (such as a coaches discussion board) become available, using them may
        require signing in and will involve storing the content you choose to post. This policy will
        be updated before those features collect any additional information.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 36, marginBottom: 12 }}>Contact</h2>
      <p>
        Questions about this policy? Contact us at{' '}
        <a href="mailto:nate@reddi.com" style={{ color: '#16181D', fontWeight: 600 }}>
          nate@reddi.com
        </a>
        .
      </p>
    </main>
  )
}
