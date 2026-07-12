import { supabase } from "@/lib/supabase";

export async function buildTaskLookup(
  outlines: string[]
) {
  if (outlines.length === 0) {
    return new Map();
  }

  const { data: tasks } = await supabase
    .from("msp_tasks")
    .select(
      "outline_number, task_name"
    )
    .in(
      "outline_number",
      outlines
    );

  const taskMap = new Map(
    (tasks || []).map((t) => [
      t.outline_number,
      t.task_name,
    ])
  );

  const result = new Map();

  outlines.forEach((outline) => {

    const ahiName =
      taskMap.get(outline);

    const parentOutline =
      outline
        .split(".")
        .slice(0, -1)
        .join(".");

    const grandParentOutline =
      parentOutline
        .split(".")
        .slice(0, -1)
        .join(".");

    result.set(outline, {

      task_name:
        ahiName,

      parent_name:
        taskMap.get(parentOutline),

      grandparent_name:
        taskMap.get(grandParentOutline),

      display_name:
        taskMap.get(grandParentOutline)

          ? `${taskMap.get(grandParentOutline)} | ${ahiName}`

          : ahiName,

    });

  });

  return result;
}