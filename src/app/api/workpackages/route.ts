import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const building = request.nextUrl.searchParams.get("building");

  if (!building) {
    return NextResponse.json({ error: "building parameter required" }, { status: 400 });
  }

  // Find all non-summary tasks under this building WBS
  const { data, error } = await supabase
    .from("task")
    .select("task_id, task_name, wbs, outline_level")
    .eq("is_summary", false)
    .like("wbs", `${building}.%`)
    .order("wbs");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = (data || []).map((task: any) => ({
    id: task.task_id,
    task_name: task.task_name,
    outline_number: task.wbs,
    display_name: task.task_name,
    context_name: ""
  }));

  return NextResponse.json(results);
}