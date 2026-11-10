/**
 * Where the footer is installed: the one place that knows pi's footer factory and the component it
 * returns. It builds the footer tree from the rows it is given, hands the repaint request back out
 * of the host's factory, hands the factory's footer data to the attachment, and returns the release
 * it was given as the component's own.
 */
import type { ExtensionUIContext, ReadonlyFooterDataProvider } from "@earendil-works/pi-coding-agent";

import type { Readings } from "./data/session-data-store.ts";
import { createFooter } from "./components/row/row-renderer.ts";
import type { Row } from "./components/row/row.ts";

export function installFooter(
  ui: ExtensionUIContext,
  { rows, rowGap, sample, dispose, receiveRepaint, attachFooterData }: {
    rows: Row[];
    rowGap: number;
    sample: () => Readings;
    dispose: () => void;
    receiveRepaint: (requestRepaint: () => void) => void;
    attachFooterData: (footerData: ReadonlyFooterDataProvider) => void;
  },
): void {
  ui.setFooter((tui, theme, footerData) => {
    // The footer's own data is only reachable here, and it is seeded before the first sample.
    attachFooterData(footerData);
    const footer = createFooter(rows, sample, theme, rowGap);
    receiveRepaint(() => tui.requestRender());
    return {
      render: (width: number) => footer.render(width),
      invalidate: () => footer.invalidate(),
      dispose,
    };
  });
}
