import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { buildTaskLookup }
from "@/lib/mspHierarchy";

export async function GET(
  request: NextRequest
) {

  const today =
    new Date()
      .toISOString()
      .split("T")[0];

  const { data, error } =
    await supabase
      .from("site_diary_logs")
      .select(`
        *,
        site_diary_id
      `)
      .gte(
        "created_at",
        `${today}T00:00:00`
      )
      .lt(
        "created_at",
        `${today}T23:59:59`
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

  if (error) {

    return NextResponse.json(
      {
        error:
          error.message,
      },
      {
        status: 500,
      }
    );

  }

  const outlines = [
    ...new Set(
      (data || []).flatMap((item) => [

        item.ahi,

        item.subtask,

        item.ahi
          .split(".")
          .slice(0, -1)
          .join("."),

      ])
    ),
  ];

  const { data: taskLookup } =
    await supabase
      .from("msp_tasks")
      .select(
        "outline_number, task_name"
      )
      .in(
        "outline_number",
        outlines
      );

  const { data: buildings } =
    await supabase
      .from("msp_tasks")
      .select(
        "task_name, outline_number"
      )
      .eq("summary", true)
      .eq("outline_level", 4);

  const taskMap = new Map(
    (taskLookup || []).map((t) => [
      t.outline_number,
      t.task_name,
    ])
  );

  const enriched =
    (data || []).map((item) => {

      const building =
        (buildings || []).find((b) =>
          item.ahi.startsWith(
            `${b.outline_number}.`
          )
        );

      return {

        ...item,

        ahi_name:
          item.ahi_name ||
          taskMap.get(item.ahi) ||
          item.ahi,

        subtask_name:
          item.subtask_name ||
          taskMap.get(item.subtask) ||
          item.subtask,

        ahi_display_name:
          item.ahi_name ||
          taskMap.get(item.ahi) ||
          item.ahi

      };

    });

    const latestMap = new Map();

    enriched.forEach((row) => {

        const existing =
            latestMap.get(row.site_diary_id);

        if (!existing) {

            latestMap.set(
                row.site_diary_id,
                row
            );

            return;

        }

        if (
            new Date(row.created_at) >
            new Date(existing.created_at)
        ) {

            latestMap.set(
                row.site_diary_id,
                row
            );

        }

    });

    const latestReports =
        Array.from(
            latestMap.values()
        );

    console.log("========== API REPORTS ==========");

    latestReports.forEach((r: any) => {
      console.log({
        id: r.id,
        site_diary_id: r.site_diary_id,
        ahi: r.ahi,
        subtask: r.subtask,
      });
    });

    console.log("===============================");

  return NextResponse.json(
    latestReports

  );

}