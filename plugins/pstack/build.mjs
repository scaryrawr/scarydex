import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { build } from "esbuild";

const directory = "plugins/pstack/skills/statechart/scripts/compiler";
const manifestFile = "plugins/pstack/bundle-manifest.json";
const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
const files = new Set(["package.json", "plugins/pstack/build.mjs"]);

for (const entry of ["statechart", "worker"]) {
  const result = await build({
    entryPoints: [`${directory}/${entry}.ts`],
    outfile: `${directory}/${entry}.mjs`,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    metafile: true,
  });

  for (const input of Object.keys(result.metafile.inputs)) {
    if (!input.split("/").includes("node_modules")) files.add(input);
  }

  for (const output of Object.keys(result.metafile.outputs)) files.add(output);
}

for (const file of files) {
  manifest.files[file] = createHash("sha256").update(await readFile(file)).digest("hex");
}

manifest.files = Object.fromEntries(Object.entries(manifest.files).sort(([a], [b]) => a.localeCompare(b)));
await writeFile(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
