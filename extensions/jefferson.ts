/**
 * pi-jefferson — a starship-style statusline for pi.
 *
 * `package.json` declares this file to pi:
 *   "pi": { "extensions": ["./extensions/jefferson.ts"] }
 * pi loads `jefferson.ts` — this file — as the extension. Every file in the
 * `extensions/jefferson/` directory beside it is the extension's working parts,
 * imported by relative path; the host never loads them.
 *
 * This file is the entry and the only module that may contain a runtime import of a
 * host package (`@earendil-works/*`); modules under `extensions/jefferson/` import
 * each other by relative path and use `import type` for host types. Because the
 * working-parts directory shares its stem with this file, an import from here must
 * name a file inside it (`./jefferson/rows.ts`), not the bare `./jefferson`.
 *
 * This file is the whole of 0.0.0-alpha, and its only job is to prove the package
 * installs and loads. It registers one command and touches nothing else: a name claim
 * should not be able to change anyone's session. The statusline itself does not exist
 * yet, and the design for it lives in `openspec/`.
 */

// Type-only, so this module resolves nothing at runtime and needs no dependency tree.
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export const VERSION = "0.0.0-alpha";

export default function jefferson(pi: ExtensionAPI): void {
  pi.registerCommand("jefferson", {
    description: "Report the pi-jefferson version",
    handler: async (_args, ctx) => {
      ctx.ui.notify(`pi-jefferson ${VERSION} — the statusline is not built yet.`, "info");
    },
  });
}
