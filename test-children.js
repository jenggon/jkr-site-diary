const fs = require("fs");
const { XMLParser } = require("fast-xml-parser");

const xml = fs.readFileSync(
  "./samples/fptv-upsi-rev00.xml",
  "utf8"
);

const parser = new XMLParser({
  ignoreAttributes: false,
});

const data = parser.parse(xml);

const tasks = data.Project.Tasks.Task;

const parent =
  "1.3.3.3.1.1.5";

console.log(
  "Children for:",
  parent
);

tasks.forEach((task) => {
  const outline =
    task.OutlineNumber || "";

  if (
    outline.startsWith(
      parent + "."
    )
  ) {
    console.log(
      outline,
      "|",
      task.Name
    );
  }
});