import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const activityDate = searchParams.get("activityDate");

  if (!activityDate) {
    return NextResponse.json([]);
  }

  // Ambil semua rekod sebelum tarikh semasa
  const { data, error } = await supabase
    .from("site_diary")
    .select("*")
    .lt("activity_date", activityDate)
    .order("activity_date", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  if (!data?.length) {
    return NextResponse.json([]);
  }

  // Lookup semua task sekali sahaja
  const outlines = [
    ...new Set(
      data.flatMap((x) => [
        x.ahi,
        x.subtask,
      ])
    ),
  ];

  const { data: tasks } = await supabase
    .from("msp_tasks")
    .select(
      `
      outline_number,
      task_name,
      finish_date,
      outline_level
    `
    )
    .in("outline_number", outlines);

  const taskMap = new Map(
    (tasks || []).map((t) => [
      t.outline_number,
      t,
    ])
  );

  const buildings =
    (tasks || []).filter(
      (x) => x.outline_level === 4
    );

  // Group ikut outline number (BUKAN nama)
  const grouped = new Map();

  for (const row of data) {

    const key =
      `${row.ahi}|${row.subtask}`;

    const ahiTask =
      taskMap.get(row.ahi);

    const subtaskTask =
      taskMap.get(row.subtask);

    const building =
      buildings.find((b) =>
        row.ahi.startsWith(
          `${b.outline_number}.`
        )
      );

    if (!grouped.has(key)) {

      grouped.set(key, {

        ...row,

        site_diary_id: row.id,

        created_at: row.created_at,

        ahi_name:
          ahiTask?.task_name ??
          row.ahi,

        ahi_display_name:
          building
            ? `${ahiTask?.task_name ?? row.ahi} | ${building.task_name}`
            : ahiTask?.task_name ??
            row.ahi,

        subtask_name:
          subtaskTask?.task_name ??
          row.subtask,

        planned_finish:
          subtaskTask?.finish_date,

        active_since:
          row.activity_date,

        latest_date:
          row.activity_date,

        latest_status:
          row.work_status,

      });

      continue;
    }

    const existing =
      grouped.get(key);

    // Active sejak paling awal
    if (
      new Date(row.activity_date) <
      new Date(existing.active_since)
    ) {
      existing.active_since =
        row.activity_date;
    }

    // Status terkini
    if (
      new Date(row.created_at) >
      new Date(existing.created_at)
    ) {

      existing.latest_date =
        row.activity_date;

      existing.latest_status =
        row.work_status;

      existing.work_status =
        row.work_status;

      existing.id =
        row.id;

      existing.site_diary_id =
        row.id;

      existing.notes =
        row.notes;

      existing.weather =
        row.weather;

      existing.manpower =
        row.manpower;

      existing.actual_start_date =
        row.actual_start_date;

      existing.created_at =
        row.created_at;

    }

  }

  const result =
    Array.from(grouped.values())
      .filter(
        (x) =>
          x.latest_status !==
          "Siap"
      )
      .sort(
        (a, b) =>
          new Date(
            b.latest_date
          ).getTime() -
          new Date(
            a.latest_date
          ).getTime()
      );

  console.log(
    "PREVIOUS COUNT:",
    result.length
  );

  console.table(
    result.map((x: any) => ({
      ahi: x.ahi,
      subtask: x.subtask,
      status: x.latest_status,
      active_since: x.active_since,
      latest: x.latest_date,
    }))
  );

  console.log("============== GROUPED ==============");

  for (const item of grouped.values()) {

    console.log({

      ahi: item.ahi,

      subtask: item.subtask,

      activity_date: item.activity_date,

      latest_date: item.latest_date,

      latest_status: item.latest_status,

      work_status: item.work_status,

    });

  }

  console.log("====================================");

  return NextResponse.json(result);
}