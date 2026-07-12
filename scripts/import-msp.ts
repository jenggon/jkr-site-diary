import dotenv from "dotenv";

dotenv.config({
  path: ".env.local",
});

import fs from "fs";
import path from "path";
import { XMLParser } from "fast-xml-parser";
import { createClient } from "@supabase/supabase-js";
console.log("URL =", process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log("ROLE =", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  console.log("Reading XML...");

  const filePath = path.join(
    process.cwd(),
    "samples",
    "fptv-upsi-rev00.xml"
  );

  const xml = fs.readFileSync(filePath, "utf8");

  console.log("Parsing XML...");

  const parser = new XMLParser({
    ignoreAttributes: false,
  });

  const data = parser.parse(xml);

  const tasks = data.Project.Tasks.Task ?? [];
  const resources = data.Project.Resources.Resource ?? [];
  const assignments = data.Project.Assignments.Assignment ?? [];

  console.log(`Tasks: ${tasks.length}`);
  console.log(`Resources: ${resources.length}`);
  console.log(`Assignments: ${assignments.length}`);

  // PROJECT

  const { data: project } = await supabase
    .from("projects")
    .insert({
      project_code: "UPSI-FPTV",
      project_name:
        "FPTV UPSI Teluk Intan Rev00",
    })
    .select()
    .single();

  if (!project) throw new Error("Project insert failed");

  // REVISION

  const { data: revision } = await supabase
    .from("programme_revisions")
    .insert({
      project_id: project.id,
      revision_name: "REV00",
      is_active: true,
    })
    .select()
    .single();

  if (!revision)
    throw new Error("Revision insert failed");

  console.log("Revision Created");

  // TASKS

  const taskRows = tasks.map((t: any) => ({
    revision_id: revision.id,
    uid: String(t.UID ?? ""),
    task_uid: String(t.UID ?? ""),
    wbs: t.WBS ?? "",
    task_name: t.Name ?? "",
    summary_path: "",
    resource_names: "",
    outline_number: t.OutlineNumber ?? "",
    outline_level: Number(t.OutlineLevel ?? 0),
    start_date: t.Start ?? null,
    finish_date: t.Finish ?? null,
    summary:
      t.Summary === 1 ||
      t.Summary === "1",
  }));

  console.log("Insert Tasks...");

  for (let i = 0; i < taskRows.length; i += 500) {
    const batch = taskRows.slice(i, i + 500);

    const { error } = await supabase
      .from("msp_tasks")
      .insert(batch);

    if (error) throw error;

    console.log(
      `Tasks ${i + batch.length}/${taskRows.length}`
    );
  }

  // RESOURCES

  const resourceRows = resources.map(
    (r: any) => ({
      revision_id: revision.id,
      resource_uid: String(r.UID ?? ""),
      resource_name: r.Name ?? "",
    })
  );

  console.log("Insert Resources...");

  for (
    let i = 0;
    i < resourceRows.length;
    i += 500
  ) {
    const batch = resourceRows.slice(
      i,
      i + 500
    );

    const { error } = await supabase
      .from("msp_resources")
      .insert(batch);

    if (error) throw error;
  }

  // ASSIGNMENTS

  const assignmentRows = assignments.map(
    (a: any) => ({
      revision_id: revision.id,
      task_uid: String(
        a.TaskUID ?? ""
      ),
      resource_uid: String(
        a.ResourceUID ?? ""
      ),
    })
  );

  console.log("Insert Assignments...");

  for (
    let i = 0;
    i < assignmentRows.length;
    i += 500
  ) {
    const batch = assignmentRows.slice(
      i,
      i + 500
    );

    const { error } = await supabase
      .from("msp_assignments")
      .insert(batch);

    if (error) throw error;
  }

  console.log("");
  console.log("IMPORT COMPLETE");
}

run().catch(console.error);