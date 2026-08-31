export const metadata = {
  title: 'Hoop Pilot — Support',
  description: 'Support and help for Hoop Pilot, the basketball coaching app.',
}

export default function HoopPilotSupport() {
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
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.5, margin: 0 }}>Hoop</h1>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -0.5, margin: 0, color: '#9AA1AC' }}>
          Pilot
        </h1>
      </div>
      <p style={{ color: '#5C626C', marginBottom: 32 }}>
        The all-in-one clipboard for basketball coaches.
      </p>

      <p>
        Hoop Pilot helps coaches run their whole program from one place — build your roster,
        design plays on a real court, plan and run practices with a live timer, and track live
        game stats. Everything lives on your device.
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 40, marginBottom: 12 }}>Support</h2>
      <p>
        Questions, bugs, or feature ideas? Email us and we&apos;ll get back to you.
      </p>
      <p>
        <a href="mailto:nate@reddi.com" style={{ color: '#16181D', fontWeight: 600 }}>
          nate@reddi.com
        </a>
      </p>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 40, marginBottom: 12 }}>
        Frequently Asked
      </h2>

      <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 24, marginBottom: 6 }}>
        Where is my data stored?
      </h3>
      <p>
        All of your rosters, plays, practice plans, and stats are stored locally on your device.
        Deleting the app deletes your data, so use the built-in Backup option in Settings to save a
        copy to iCloud Drive or Files.
      </p>

      <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 24, marginBottom: 6 }}>
        What does the subscription include?
      </h3>
      <p>
        Hoop Pilot Pro unlocks unlimited plays, practice plans, and stat games, plus access to the
        coaches community as it rolls out. New coaches get a one-week free trial. During the trial
        you can create up to 5 plays, 1 practice plan, and 2 stat games.
      </p>

      <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 24, marginBottom: 6 }}>
        How do I manage or cancel my subscription?
      </h3>
      <p>
        Subscriptions are billed through your Apple ID. Manage or cancel anytime in the App Store:
        open <strong>Settings → [your name] → Subscriptions</strong> on your iPhone.
      </p>

      <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 24, marginBottom: 6 }}>
        Does it work on Apple Watch?
      </h3>
      <p>
        Yes. When you start a practice, Hoop Pilot mirrors the practice timer and next drill to your
        paired Apple Watch, and you can pause or skip from your wrist.
      </p>

      <p style={{ marginTop: 40, fontSize: 13, color: '#9AA1AC' }}>
        <a href="/hooppilot/privacy" style={{ color: '#9AA1AC' }}>
          Privacy Policy
        </a>{' '}
        &nbsp;·&nbsp; &copy; {new Date().getFullYear()} Nate Steven
      </p>
    </main>
  )
}
