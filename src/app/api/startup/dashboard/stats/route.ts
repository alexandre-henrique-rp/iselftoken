import { mockStartupStats } from "@/data/mock/startups-mock";
import { Delay } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";



export async function GET(request: NextRequest) {
  try {
     console.log('API Call: GET /api/startups/stats')
     
     await Delay(300)
     
     return NextResponse.json(mockStartupStats, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: 'Erro ao buscar startups' },
      { status: 500 },
    );
  }
}