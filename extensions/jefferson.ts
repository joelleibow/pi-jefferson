/**
 * pi-jefferson — a starship-style statusline for pi.
 *
 * `package.json` declares this file to pi:
 *   "pi": { "extensions": ["./extensions/jefferson.ts"] }
 * pi loads `jefferson.ts` — this file — as the extension. Every file in the
 * `extensions/jefferson/` directory beside it is the extension's working parts,
 * imported by relative path; the host never loads them.
 *
 * This file is the entry, and it only registers the extension: it hands the host's `pi`
 * to `startUp`, which holds the install lifecycle. Any shipped file may import a host
 * package (`@earendil-works/*`). Imports run one way only — from the entry to the working
 * parts, never back, and no cycles. Because the working-parts directory shares its stem
 * with this file, an import from here must name a file inside it
 * (`./jefferson/startup.ts`), not the bare `./jefferson`.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

import { startUp } from "./jefferson/startup.ts";

export const VERSION = "0.0.0-alpha";

export default function jefferson(pi: ExtensionAPI): void {
  startUp(pi);
}
