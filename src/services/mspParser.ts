import fs from "fs";
import path from "path";
import { XMLParser } from "fast-xml-parser";

export interface ParsedTask {
  uid: string;
  name: string;
  wbs?: string;

  outlineNumber?: string;
  outlineLevel?: number;

  summary?: boolean;

  startDate?: string;
  finishDate?: string;
}

export function loadTasks(): ParsedTask[] {
  const filePath = path.join(
    process.cwd(),
    "samples",
    "fptv-upsi-rev00.xml"
  );

  const xml = fs.readFileSync(
    filePath,
    "utf8"
  );

  const parser = new XMLParser({
    ignoreAttributes: false,
  });

  const data = parser.parse(xml);

  const tasks = data.Project.Tasks.Task;

  return tasks.map((task: Record<string, unknown>) => ({
    uid: String(task.UID ?? ""),
    name: task.Name ?? "",

    wbs: task.WBS,

    outlineNumber:
      task.OutlineNumber,

    outlineLevel: Number(
      task.OutlineLevel ?? 0
    ),

    summary:
      task.Summary === 1 ||
      task.Summary === "1",

    startDate: task.Start,

    finishDate: task.Finish,
  }));
}