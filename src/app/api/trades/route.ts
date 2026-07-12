import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const workpackage = searchParams.get("workpackage");

  if (!workpackage) {
    return NextResponse.json([]);
  }

  const { data, error } = await supabase
    .from("msp_tasks")
    .select("task_name, outline_number, outline_level")
    .like("outline_number", `${workpackage}.%`)
    .eq("outline_level", 8)
    .order("task_name");

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}