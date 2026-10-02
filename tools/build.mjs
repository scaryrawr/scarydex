import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { build } from "esbuild";

async function buildPlugin(plugin, bundles) {
  const files = new Set(["package-lock.json", "tools/build.mjs"]);
  for (const [entry, outfile] of bundles) {
    const result = await build({
      entryPoints: [entry],
      outfile,
      bundle: true,
      platform: "node",
      format: "esm",
      target: "node22",
      banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' },
      legalComments: "linked",
      metafile: true,
    });
    for (const input of Object.keys(result.metafile.inputs)) if (!input.startsWith("node_modules/")) files.add(input);
    for (const output of Object.keys(result.metafile.outputs)) files.add(output);
  }
  const hashes = {};
  for (const file of [...files].sort()) hashes[file] = createHash("sha256").update(await readFile(file)).digest("hex");
  await writeFile(`plugins/${plugin}/bundle-manifest.json`, JSON.stringify({ version: 1, files: hashes }, null, 2) + "\n");
}
await buildPlugin("omlx-media", [["plugins/omlx-media/src/media.ts", "plugins/omlx-media/scripts/media.mjs"]]);
await buildPlugin("pstack", [
  ["tools/entries/orch.mjs", "plugins/pstack/skills/poteto-mode/scripts/orch/orch.mjs"],
  ["tools/entries/watch-pr.mjs", "plugins/pstack/skills/poteto-mode/scripts/watch-pr/watch-pr.mjs"],
]);
