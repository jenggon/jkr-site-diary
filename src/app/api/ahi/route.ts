import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const programmeId = searchParams.get('programmeId') || '0651e125-3ef4-47c4-a3fa-8aec49bdf979';

  const { data, error } = await supabase
    .from("task")
    .select("task_id, task_name, wbs, outline_level")
    .eq("programme_id", programmeId)
    .eq("is_summary", true)
    .order("wbs");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Find level 4 buildings to provide context names
  const buildings = (data || []).filter((t: any) => t.outline_level === 4);
  
  const results = (data || []).map((task: any) => {
    const building = buildings.find((b: any) =>
      task.wbs && task.wbs.startsWith(`${b.wbs}.`) && task.wbs !== b.wbs
    );

    return {
      id: task.task_id,
      task_name: task.task_name,
      outline_number: task.wbs,
      display_name: building ? `${task.task_name} | ${building.task_name}` : task.task_name,
      context_name: ""
    };
  });

  return NextResponse.json(results);
}