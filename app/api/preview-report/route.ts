// app/api/report/preview/route.ts
import { NextResponse } from "next/server";
import { generateMonthlyReportPDF } from "@/lib/generateMonthlyReportPDF";

export async function GET(req: Request) {
  try {
    const pdfBytes = await generateMonthlyReportPDF(req);

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline; filename=preview.pdf",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
