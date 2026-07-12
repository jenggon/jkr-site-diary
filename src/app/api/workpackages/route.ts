import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const building = request.nextUrl.searchParams.get("building");

  if (!building) {
    return NextResponse.json(
      { error: "building parameter required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
  .from("msp_tasks")
  .select("task_name, outline_number, outline_level")
  .eq("summary", false)
  .like("outline_number", `${building}.%`)
  .order("outline_number");

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}