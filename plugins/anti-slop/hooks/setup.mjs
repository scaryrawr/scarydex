#!/usr/bin/env node
import { oxlintExecutable } from "./oxlint-runtime.mjs";
console.log(await oxlintExecutable({ install: true }));
