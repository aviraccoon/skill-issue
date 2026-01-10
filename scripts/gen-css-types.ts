import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const componentsDir = "src/components";

// Find all .module.css files
const cssFiles = readdirSync(componentsDir).filter((f) =>
	f.endsWith(".module.css"),
);

for (const file of cssFiles) {
	const cssPath = join(componentsDir, file);
	const css = readFileSync(cssPath, "utf-8");

	// Extract class names (handles .class, .class:hover, .class.other, etc.)
	const classRegex = /\.([a-zA-Z_][a-zA-Z0-9_-]*)/g;
	const classes = new Set<string>();

	for (const match of css.matchAll(classRegex)) {
		if (match[1]) classes.add(match[1]);
	}

	// Generate .d.ts content with tabs
	const sortedClasses = [...classes].sort();
	const lines = sortedClasses.map((c) => `\treadonly ${c}: string;`);
	const dts = `declare const styles: {\n${lines.join("\n")}\n};\nexport default styles;\n`;

	const dtsPath = `${cssPath}.d.ts`;
	writeFileSync(dtsPath, dts);
	console.log(`Generated ${basename(dtsPath)} with ${classes.size} classes`);
}
