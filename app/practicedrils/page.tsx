export default function PracticeDrillsPage() {
  const drills = [
    {
      num: 1,
      name: 'Four Minute Drill',
      note: 'See Kelvin Sampson',
      points: [],
      videoId: 'i7wDanQ_DdU',
      videoNote: 'Kelvin Sampson Competitive Practice Drills',
    },
    {
      num: 2,
      name: 'Half-Court Four Minute Drill (4 Corners)',
      note: '',
      points: [
        'a. Quick think and quick move',
        'b. Call for reverse',
        'c. "Quick" 3 balls in tight',
      ],
      videoId: 'vIuxMQZMsTc',
      videoNote: 'Kelvin Sampson One Minute Passing Drill',
    },
    {
      num: 3,
      name: 'Four Minute Full-Court Drill "Celtic Drill"',
      note: '',
      points: [
        'a. Speed dribble to half court',
        'b. Do a dribble move and go shoot a lay-up',
      ],
      videoId: '3UC8dn2wsSQ',
      videoNote: 'Celtic Drill: Fastbreak Layup & Warm-Up',
    },
    {
      num: 4,
      name: 'Half-Court Moves',
      note: '',
      points: [
        'a. Everyone with a ball',
        'b. Catch, face, and go to the basket "Catch and Go"',
        'c. "Catch and Sweep"',
        'd. Catch, shot fake and go "Fake and Go"',
        'e. Pro Pivot, pivot on opposite foot',
      ],
      videoId: 'YRxgNQEYqtY',
      videoNote: 'Half-Court Moves & Footwork Drills',
    },
    {
      num: 5,
      name: 'Passing Drills "Vanderbilt Drill"',
      note: '',
      points: [
        'a. Player gets outlet and dribbles to half court',
        'b. Pass ahead to coach and get ball back for a lay-up',
      ],
      videoId: 'U2lcnLyRUBQ',
      videoNote: 'Outlet Pass & Vanderbilt Passing Drill',
    },
    {
      num: 6,
      name: 'Full Court 2 Minute Passing',
      note: '',
      points: [
        'a. Player in the middle passes side-to-side',
        'b. Whoever has the ball at the top of the key passes to the next line',
      ],
      videoId: 'hHqU7mMPv98',
      videoNote: 'Full Court Passing Drill',
    },
    {
      num: 7,
      name: '2 Man Plays',
      note: '',
      points: [
        'a. Basket cuts',
        'b. Back cut',
        'c. Give and get',
        'd. Pick and roll, pivot off inside foot',
      ],
      videoId: 'XmGpOvtlv0A',
      videoNote: '2-Man Game: Cuts, Give & Go, Pick & Roll',
    },
    {
      num: 8,
      name: 'Block to Block Drill',
      note: '',
      points: [
        'a. Passing back and forth the length of the floor',
        'b. Whoever catches on the far block dribbles back to the other end',
      ],
      videoId: 'NQhqSMFEHsE',
      videoNote: 'Block to Block Passing & Conditioning Drill',
    },
    {
      num: 9,
      name: 'Full Court Lay-Ups',
      note: '',
      points: ['a. Let them use 3, 4, or 5 dribbles to go end to end'],
      videoId: 'cTJAIBjCFcE',
      videoNote: 'Full Court Lay-Up Drill',
    },
    {
      num: 10,
      name: 'Chair Dribbling',
      note: '',
      points: [
        'a. Crossover',
        'b. Behind the back',
        'c. Between the legs',
        'd. Stop n\' go',
      ],
      videoId: 'k4CnLWsHiF8',
      videoNote: 'Chair Dribbling Ball Handling Workout',
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0d0f12', color: '#f1f5f9', fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #7c1d1d 0%, #0d0f12 60%)', padding: '48px 24px 40px', textAlign: 'center', borderBottom: '2px solid #f97316' }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#f97316', marginBottom: 12 }}>
          Phil Martelli&apos;s
        </div>
        <h1 style={{ fontSize: 'clamp(36px, 8vw, 72px)', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1, margin: '0 0 8px', textTransform: 'uppercase' }}>
          Practice Starter
        </h1>
        <h1 style={{ fontSize: 'clamp(36px, 8vw, 72px)', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1, margin: '0 0 24px', textTransform: 'uppercase', color: '#f97316' }}>
          Drills
        </h1>
        <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#94a3b8' }}>
          10 Drills to Start Practice
        </div>
      </div>

      {/* Grid */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
        {drills.map((drill) => (
          <div key={drill.num} style={{ background: '#141920', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
            {/* Video */}
            <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#000' }}>
              <iframe
                src={`https://www.youtube.com/embed/${drill.videoId}`}
                title={drill.name}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
              />
            </div>

            {/* Content */}
            <div style={{ padding: '20px 20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10, background: '#f97316',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 900, color: '#fff', flexShrink: 0,
                }}>
                  {drill.num}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, lineHeight: 1.3, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    {drill.name}
                  </h2>
                  {drill.note && (
                    <div style={{ fontSize: 12, color: '#f97316', marginTop: 3, fontWeight: 600 }}>{drill.note}</div>
                  )}
                </div>
              </div>

              {drill.points.length > 0 && (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {drill.points.map((point, i) => (
                    <li key={i} style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5, paddingLeft: 12, position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0, color: '#f97316', fontWeight: 700 }}>›</span>
                      {point}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '32px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', color: '#475569', fontSize: 13 }}>
        Phil Martelli&apos;s Practice Starter Drills · Saint Joseph&apos;s University
      </div>
    </div>
  )
}
