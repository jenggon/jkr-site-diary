import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const outline = searchParams.get("outline");

  if (!outline) {
    return NextResponse.json([]);
  }

  // Step 1 - Cari task UID
  const { data: task, error: taskError } = await supabase
    .from("msp_tasks")
    .select("uid")
    .eq("outline_number", outline)
    .single();

  if (taskError || !task) {
    return NextResponse.json([]);
  }

  // Step 2 - Cari assignments
  const { data: assignments, error: assignmentError } =
    await supabase
      .from("msp_assignments")
      .select("resource_uid")
      .eq("task_uid", task.uid);

  if (assignmentError || !assignments?.length) {
    return NextResponse.json([]);
  }

  const resourceIds = assignments.map(
    (a: any) => a.resource_uid
  );

  // Step 3 - Cari resources
  const { data: resources, error: resourceError } =
    await supabase
      .from("msp_resources")
      .select("resource_name")
      .in("resource_uid", resourceIds);

  if (resourceError) {
    return NextResponse.json(
      { error: resourceError.message },
      { status: 500 }
    );
  }

  return NextResponse.json(
    resources?.map((r: any) => r.resource_name).sort() || []
  );
}