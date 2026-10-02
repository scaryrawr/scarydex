#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { Value } from "@sinclair/typebox/value";
import { executeImage } from "./execute-image.ts";
import { executeSpeech, executeTranscription } from "./execute-audio.ts";
import { imageParameters, speechParameters, transcriptionParameters } from "./tool-schemas.ts";

const [operation, option, value, ...extra] = process.argv.slice(2);
if (["--help", "-h"].includes(operation) || !operation) {
  console.log(`Usage: node <plugin-root>/scripts/media.mjs <image|speech|transcribe> --input-json <file>
       node <plugin-root>/scripts/media.mjs <image|speech|transcribe> --json '<arguments>'

Uses OMLX_BASE_URL (default http://127.0.0.1:8000) and optional OMLX_API_KEY.
Outputs must be new absolute paths. Source files are never modified.
Image: prompt, output (.png), sources?, mask?, size?, model?, variants?, strength?, advanced?
Speech: input (text), output (.wav), model?, voice?, language?, speed?, instructions?, response_format?
Transcribe: input (audio path), output (.txt), model?, language?, prompt?
Results are JSON on stdout. Errors go to stderr with exit code 1.`);
} else {
  try {
    if (!value || extra.length || !["--input-json", "--json"].includes(option)) throw new Error("Use --input-json <file> or --json '<arguments>'; see --help");
    const args = JSON.parse(option === "--input-json" ? await readFile(value, "utf8") : value);
    let result;
    switch (operation) {
      case "image":
        if (!Value.Check(imageParameters, args)) throw new Error("Invalid image arguments");
        result = await executeImage(args);
        break;
      case "speech":
        if (!Value.Check(speechParameters, args)) throw new Error("Invalid speech arguments");
        result = await executeSpeech(args);
        break;
      case "transcribe":
        if (!Value.Check(transcriptionParameters, args)) throw new Error("Invalid transcription arguments");
        result = await executeTranscription(args);
        break;
      default: throw new Error(`Unknown operation: ${operation}`);
    }
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
