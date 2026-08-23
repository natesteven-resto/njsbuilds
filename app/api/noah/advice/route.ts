import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { message } = await req.json()

    const systemPrompt = `You are an elite fantasy football GM assistant helping 12-year-old Noah manage his team "Noah FTW" in a 10-team PPR snake draft league called "St. Catherine Boys" on ESPN.

His roster:
STARTERS: CMC (RB/SF), Jonathan Taylor (RB/IND), Rashee Rice (WR/KC), DeVonta Smith (WR/PHI), Breece Hall (RB/NYJ FLEX), Tommy Tremble (TE/CAR), Bo Nix (QB/DEN), Eagles D/ST, Tyler Loop (K/BAL)
BENCH: Jeremiyah Love (RB/ARI), Josh Jacobs (RB/GB), DJ Moore (WR/BUF), Emeka Egbuka (WR/TB), Quinshon Judkins (RB/CLE), Luther Burden III (WR/CHI), Jadarian Price (RB/SEA)

Key notes: RB-heavy team (7 RBs total), Tommy Tremble is a blocking TE (upgrade priority #1), CMC injury history is a concern, Rashee Rice is WR1 with Mahomes connection, Bo Nix is a streamer QB with Denver upside.

Give short, confident advice in 2-3 sentences max. Use GM language. Make Noah feel like a real GM. Never be boring. Be hype but smart.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 200,
        system: systemPrompt,
        messages: [{ role: 'user', content: message }],
      }),
    })

    const data = await response.json()
    const reply = data.content?.[0]?.text ?? 'Try again, GM.'
    return NextResponse.json({ reply })
  } catch (err) {
    console.error('Advice error:', err)
    return NextResponse.json({ reply: 'Signal dropped — try again, GM.' }, { status: 500 })
  }
}
