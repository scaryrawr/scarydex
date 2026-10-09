// ScaryDex repository lint config: oxlint with the anti-slop plugin shipped in this marketplace.
// JavaScript configs and JS plugins must load through Node.js:
//   bun run lint
//
// Scope: everything maintained in this repository. Ported plugin content
// (pstack, anti-slop) keeps upstream code verbatim per the port boundary in
// port-provenance.json, and checked-in CLI bundles are generated output;
// both stay out of scope here.
import antiSlop from "./plugins/anti-slop/oxlint.config.mjs";

export default {
  ...antiSlop,
  jsPlugins: antiSlop.jsPlugins.map((plugin) => ({
    ...plugin,
    specifier: `./plugins/anti-slop/${plugin.specifier.replace(/^\.\//, "")}`,
  })),
  ignorePatterns: [
    "node_modules/**",
    "plugins/anti-slop/**",
    "plugins/pstack/**",
    "plugins/omlx-media/scripts/**",
  ],
};
