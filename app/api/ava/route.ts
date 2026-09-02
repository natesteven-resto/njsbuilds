import { NextResponse } from 'next/server'

const CHAPTERS = `The 5 chapters in Ava's Pathophysiology course (Fort Hays State University, instructor Tracey Post):
- Ch 1: Intro to Pathophysiology — disease, pathogenesis, etiology (pathogen, multifactorial, idiopathic, nosocomial, iatrogenic), clinical manifestations (signs vs symptoms, acute/subacute/chronic, remission/exacerbation), diagnosis/prognosis (morbidity vs mortality), individual vs population health, epidemiology (incidence vs prevalence, endemic/epidemic/pandemic), levels of prevention (primary/secondary/tertiary), evidence-based practice.
- Ch 2: Altered Cells & Tissues — cellular components/organelles, transport mechanisms (diffusion, osmosis, facilitated, active), reproduction (proliferation, differentiation), cellular responses (atrophy, hypertrophy, hyperplasia, metaplasia, dysplasia), injury/death (apoptosis vs necrosis; physical/mechanical/thermal/chemical causes), clinical models: cerebral atrophy, cardiac hypertrophy.
- Ch 3: Inflammation & Tissue Repair — lines of defense, acute inflammation, vascular response (vasodilation, capillary permeability), cell-derived mediators (mast cells, histamine, leukotrienes, prostaglandins, cytokines), cellular response (chemotaxis, adherence, migration), local vs systemic manifestations (erythema, pyrexia, leukocytosis), treatment (RICE, NSAIDs, glucocorticoids), tissue repair, wound healing nutrition, complications (dehiscence, keloids, adhesions), chronic inflammation (granulomas), clinical models: burns (classification, rule of 9s), rheumatoid arthritis.
- Ch 4: Altered Immunity — third line of defense, immune cells (T/B lymphocytes, NK cells, granulocytes: neutrophils/eosinophils/basophils, monocytes), innate vs adaptive immunity, active vs passive & natural vs artificial immunity, humoral vs cell-mediated, immunoglobulins (IgA/D/E/G/M), MHC/HLA, hypersensitivity Types I-IV, autoimmunity, alloimmunity, clinical models: AIDS/HIV (CD4), anaphylaxis (IgE, EpiPen), SLE.
- Ch 5: Infection — pathogens & mechanisms, factors affecting pathogenicity (virulence, infectivity, toxigenicity), types of pathogens, chain of infection, phases of acute infection (exposure, incubation, prodrome, acute illness, convalescence), complications (bacteremia, septicemia, septic shock), manifestations (local vs systemic), labs (WBC, culture & sensitivity, leukocytosis/leukopenia), treatment (antibacterials/antifungals/antivirals), clinical models: influenza, viral hepatitis, acute pyelonephritis.`

export async function POST(req: Request) {
  try {
    const { message, history, scope } = await req.json()

    const onSyllabus = scope !== 'broad'

    const systemPrompt = `You are Ava's friendly, encouraging Pathophysiology study tutor. Ava is a nursing student at Fort Hays State University. Your job is to help her UNDERSTAND the material — give hints, break down concepts, use memory tricks and simple analogies, and quiz her back sometimes to check understanding. Be warm and motivating, never condescending. Keep answers concise (2-5 sentences unless she asks for a deep dive). Use plain language, then the clinical term.

${onSyllabus ? `IMPORTANT SCOPE RULE: Stay ON-SYLLABUS. Only teach from these 5 chapters. If she asks something outside them, gently redirect to what's covered and offer the closest related on-syllabus concept.` : `You may explain broader pathophysiology concepts if she asks, but always tie it back to how it connects to her coursework.`}

${CHAPTERS}

If she seems stuck, give a hint first rather than the full answer, then offer to explain more. Celebrate progress. Never make up drug names or facts you're unsure of — nursing accuracy matters.`

    const messages = Array.isArray(history) ? history.slice(-10) : []
    messages.push({ role: 'user', content: String(message ?? '') })

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 700,
        system: systemPrompt,
        messages,
      }),
    })

    const data = await response.json()
    const reply = data.content?.[0]?.text ?? 'Hmm, try asking that again?'
    return NextResponse.json({ reply })
  } catch (err) {
    console.error('Ava tutor error:', err)
    return NextResponse.json({ reply: 'Connection hiccup — try that again in a sec.' }, { status: 500 })
  }
}
