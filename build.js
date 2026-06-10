const fs = require("fs");

const source = fs.readFileSync("course-data.json", "utf8");
const target = "netlify/course-data.js";
const content = "module.exports = " + source + ";\n";

fs.mkdirSync("netlify", { recursive: true });
fs.writeFileSync(target, content);

console.log(`[build] ${target} generado (${content.length} bytes)`);
