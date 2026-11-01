/**
 * pi-jefferson — a starship-style statusline for pi.
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
