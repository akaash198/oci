import { NextResponse } from "next/server";
import { getAllTrainingDatasets } from "@/lib/ml/dataset-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const datasets = getAllTrainingDatasets();

  return NextResponse.json({
    success: true,
    count: datasets.length,
    data: datasets,
  });
}
