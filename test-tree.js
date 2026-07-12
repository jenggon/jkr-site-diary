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

console.log("Total Tasks:", tasks.length);
console.log("");

const summaries = tasks.filter(
  (t) => t.Summary === 1 || t.Summary === "1"
);

console.log("Total Summary Tasks:", summaries.length);
console.log("");

console.log("First 100 Summary Tasks:");
console.log("");

summaries.slice(0, 100).forEach((task) => {
  console.log(
    `${task.OutlineNumber} | L${task.OutlineLevel} | ${task.Name}`
  );
});