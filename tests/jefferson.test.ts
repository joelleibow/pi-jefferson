import assert from "node:assert/strict";
import { test } from "node:test";

import jefferson, { VERSION } from "../extensions/jefferson.ts";

/**
 * Tests live in `tests/`, never beside the extension.
 *
 * Pi loads every direct `.ts` file in `extensions/` as an extension, so a test file
 * sitting next to one is executed on every pi start. A subdirectory or a sibling tree
 * is not traversed that way.
 */

interface CommandDef {
  description: string;
  handler: (args: string, ctx: { ui: { notify(message: string): void } }) => Promise<void>;
}

function load(): Map<string, CommandDef> {
  const commands = new Map<string, CommandDef>();
  const fakePi = {
    registerCommand: (name: string, def: CommandDef) => void commands.set(name, def),
  };
  (jefferson as unknown as (pi: unknown) => void)(fakePi);
  return commands;
}

test("registers exactly one command", () => {
  assert.deepEqual([...load().keys()], ["jefferson"]);
});

test("the alpha announces that it is a name claim and nothing more", async () => {
  const notified: string[] = [];
  const def = load().get("jefferson");
  assert.ok(def, "no jefferson command registered");

  await def.handler("", { ui: { notify: (message) => void notified.push(message) } });

  assert.deepEqual(notified, [`pi-jefferson ${VERSION} — the statusline is not built yet.`]);
  assert.equal(VERSION, "0.0.0-alpha");
});
