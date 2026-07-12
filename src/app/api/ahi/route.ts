import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  // Ambil semua task summary
  let allTasks: any[] = [];

  let from = 0;

  const batchSize = 1000;

  let totalCount = 0;

  while (true) {

    const {
      data,
      error,
      count,
    } = await supabase
      .from("msp_tasks")
      .select(
        "task_name, outline_number, outline_level",
        {
          count:
            from === 0
              ? "exact"
              : undefined,
        }
      )
      .eq("summary", true)
      .order("task_name")
      .range(
        from,
        from + batchSize - 1
      );

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (from === 0) {
      totalCount = count || 0;
    }

    allTasks.push(...(data || []));

    if (
      !data ||
      data.length < batchSize
    ) {
      break;
    }

    from += batchSize;
  }

  const tasks = allTasks;

  const count = totalCount;

  // Ambil semua building level
  const { data: buildings, error: buildingError } =
    await supabase
      .from("msp_tasks")
      .select(
        "task_name, outline_number, outline_level"
      )
      .eq("summary", true)
      .eq("outline_level", 4);

  if (buildingError) {
    return NextResponse.json(
      { error: buildingError.message },
      { status: 500 }
    );
  }

  const taskMap = new Map(
    (tasks ?? []).map((t) => [
      t.outline_number,
      t,
    ])
  );
  const results = (tasks ?? []).map((task) => {
    const building = (buildings ?? []).find((b) =>
      task.outline_number.startsWith(
        `${b.outline_number}.`
      )
    );
    const parentOutline =
      task.outline_number
        .split(".")
        .slice(0, -1)
        .join(".");

    const parentTask =
      taskMap.get(parentOutline);

    return {
      task_name: task.task_name,

      outline_number:
        task.outline_number,

      display_name: building
        ? `${task.task_name} | ${building.task_name}`
        : task.task_name,

      context_name:
        parentTask?.task_name || "",
    };
  });
  const displayCount =
    results.reduce(
      (acc, item) => {
        acc[item.display_name] =
          (acc[item.display_name] || 0) + 1;

        return acc;
      },
      {} as Record<string, number>
    );

  return NextResponse.json(
    results.map((item) => {
      const key =
        item.display_name ||
        item.task_name;

      return {
        ...item,

        show_context:
          displayCount[key] > 1,
      };
    })
  );
}