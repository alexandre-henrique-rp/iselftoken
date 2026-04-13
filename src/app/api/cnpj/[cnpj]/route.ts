import { NextResponse } from "next/server"


export async function GET(request: Request, ctx: RouteContext<'/api/cnpj/[cnpj]'>) {
  try {
    const {cnpj} = await ctx.params
    if (!cnpj) {
        return NextResponse.json({ error: 'CNPJ is required' }, { status: 400 })
    }
    const resp = await fetch(`https://publica.cnpj.ws/cnpj/${cnpj}`, {
      method: 'GET',
      headers: {
        "Accept": "*/*"
      },
    })
    const data = await resp.json()

    if(!resp.ok) {
      return NextResponse.json({ error: 'CNPJ not found' }, { status: 404 })
    }

    return NextResponse.json(data)
    
  } catch (error) {
    console.log(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}