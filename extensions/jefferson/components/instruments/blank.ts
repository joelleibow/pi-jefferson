/** The blank instrument: placeholder text, in a cell that takes the columns its row leaves. */
import { DEFAULT_CELL_TEXT, FOUNDATIONAL_OPTIONS, type InstrumentDeclaration } from "./instrument.ts";

export const blank: InstrumentDeclaration = {
  name: "blank",
  variables: {},
  defaultFormat: DEFAULT_CELL_TEXT,
  fills: true,
  options: FOUNDATIONAL_OPTIONS,
};
