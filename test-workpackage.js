const { getWorkPackages } = require("./src/services/mspParser");

const packages = getWorkPackages();

console.log("Total Packages:", packages.length);

console.log("\nFirst 50:\n");

packages.slice(0, 50).forEach((p) => {
  console.log(
    `${p.outlineNumber} | L${p.outlineLevel} | ${p.name}`
  );
});