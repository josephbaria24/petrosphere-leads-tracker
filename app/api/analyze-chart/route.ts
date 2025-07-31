import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { areaChart, statCards, serviceChart } = await req.json()

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [
          {
            role: 'system',
            content:
              'You are a marketing data analyst. Analyze the CRM dashboard including stat cards, area chart, and service bar chart. Highlight trends, anomalies, and actionable insights.',
          },
          {
            role: 'user',
            content: `
Here are the dashboard datasets:

- Stat Cards: ${JSON.stringify(statCards)}
- Area Chart (Leads over time): ${JSON.stringify(areaChart)}
- Bar Chart (Top services): ${JSON.stringify(serviceChart)}

Give a well-structured analysis with section headings (e.g. ### Trends) and bullets (e.g. - **Label**: Detail).
            `,
          },
        ],
      }),
    })

    const data = await response.json()
    console.log('📊 Raw Groq Response:', JSON.stringify(data, null, 2))
    const analysis = data.choices?.[0]?.message?.content || null

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error('Groq AI analysis failed:', error)
    return NextResponse.json({ error: 'Failed to analyze dashboard.' }, { status: 500 })
  }
}
