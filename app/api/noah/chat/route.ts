import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { message, draftedPlayers, availablePlayers, round, draftPosition, needs } = await req.json()

    const systemPrompt = `You are an elite fantasy football draft analyst helping a 12-year-old named Noah win his ESPN fantasy football draft. 
The league is PPR (Point Per Reception) scoring, snake draft format, with 16 roster spots.
Roster: QB, RB, RB, WR, WR, TE, FLEX, D/ST, K, plus 7 bench spots and 1 IR.

Noah's current draft state:
- Draft position: #${draftPosition}
- Current round: ${round}
- Players already on his team: ${draftedPlayers.length > 0 ? draftedPlayers.join(', ') : 'None yet'}
- Position needs: ${needs}
- Top available players: ${availablePlayers.join(', ')}

Give short, confident, hype advice. You're a cool analyst — not a textbook. Use football slang naturally. 
Keep answers under 3 sentences unless a detailed comparison is asked for.
Be direct about who to pick and why. Make Noah feel like a pro GM.
Never be boring. Be the analyst every 12-year-old wishes they had in their ear.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: 'user', content: message }],
      }),
    })

    const data = await response.json()
    const reply = data.content?.[0]?.text ?? 'Signal dropped — try again.'

    return NextResponse.json({ reply })
  } catch (err) {
    console.error('Noah chat error:', err)
    return NextResponse.json({ reply: 'Signal dropped — try again.' }, { status: 500 })
  }
}
