import { NextResponse } from "next/server";
import {
  getDashboardData,
  getDashboardDataErrorMessage,
} from "@/lib/google-sheets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getDashboardData();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: getDashboardDataErrorMessage(error) },
      {
        status: 503,
        headers: { "Cache-Control": "no-store, max-age=0" },
      },
    );
  }
}
