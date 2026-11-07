/**
 * Where the footer is installed: the one place that knows pi's footer factory and the component it
 * returns. It builds the footer tree from the rows it is given, hands the repaint request back out
 * of the host's factory, and returns the release it was given as the component's own.
 */
import type { ExtensionUIContext } from "@earendil-works/pi-coding-agent";

import type { Readings } from "./data/session-data-store.ts";
import { createFooter } from "./visuals/row-renderer.ts";
import type { Row } from "./visuals/row.ts";

export function installFooter(
  ui: ExtensionUIContext,
  { rows, sample, dispose, receiveRepaint }: {
    rows: Row[];
    sample: () => Readings;
    dispose: () => void;
    receiveRepaint: (requestRepaint: () => void) => void;
  },
): void {
  ui.setFooter((tui, theme) => {
    const footer = createFooter(rows, sample, theme);
    receiveRepaint(() => tui.requestRender());
    return {
      render: (width: number) => footer.render(width),
      invalidate: () => footer.invalidate(),
      dispose,
    };
  });
}
