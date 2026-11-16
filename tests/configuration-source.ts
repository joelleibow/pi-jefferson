/**
 * A configuration source built from real objects, never a stub resolver: a registry that has
 * accepted Jefferson's own payload, and the fallback and notice gate `shipped.ts` names, so a test
 * drives what the composition root builds (CB-7; design 8). Its members land with the tasks that
 * add them.
 */
import type { Theme } from "@earendil-works/pi-coding-agent";

import type { ConfigurationSource } from "../extensions/jefferson/configuration.ts";
import { createRegistry, type Registry } from "../extensions/jefferson/registration.ts";
import { FALLBACK, NOTICE_GATE, SHIPPED } from "../extensions/jefferson/shipped.ts";

export function configurationSource({ agentPath, projectPath, projectTrusted, theme }: {
  agentPath: string;
  projectPath: string;
  projectTrusted: boolean;
  theme: Theme;
}): { source: ConfigurationSource; registry: Registry } {
  const registry = createRegistry();
  registry.accept("jefferson", SHIPPED);
  return {
    source: {
      agentPath,
      projectPath,
      projectTrusted,
      theme,
      resolve: name => registry.instrument(name),
      fallback: FALLBACK,
      noticeGate: NOTICE_GATE,
      watch: registry.watch,
    },
    registry,
  };
}
