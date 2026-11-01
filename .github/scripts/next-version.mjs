/**
 * The next release version.
 *
 * The base is the highest `v*` tag reachable from the commit *before* the one being
 * released — not the highest tag overall. That matters because re-running a failed release
 * must compute the same version it did the first time, or a re-run publishes a second
 * release. The parent is a fixed point; the repository is not.
 *
 * Tags are the source of truth rather than package.json, because main accepts no direct
 * pushes. A workflow cannot commit an updated version back, so package.json would drift
 * from what has shipped. A tag for a shipped version is created by the release workflow
 * itself, and cannot drift.
 *
 * Prereleases are ignored. A prerelease is not a release, so it is not a base to bump from.
 *
 * The second argument is the ref to read tags from. It defaults to HEAD~1 and exists so
 * this can be exercised against a repository from outside a release run.
 *
 * Usage: node next-version.mjs <major|minor|patch> [ref]
 */
import { execFileSync } from "node:child_process";

const BUMP = process.argv[2] ?? "patch";
const REF = process.argv[3] ?? "HEAD~1";
if (!["major", "minor", "patch"].includes(BUMP)) {
  console.error(`unknown bump: ${BUMP} — expected major, minor or patch`);
  process.exit(1);
}

function highestReleaseTag(ref) {
  const tags = execFileSync("git", ["tag", "--list", "v*", "--merged", ref, "--sort=-v:refname"], {
    encoding: "utf8",
  })
    .split("\n")
    .map((tag) => tag.trim())
    .filter(Boolean)
    // A prerelease tag names something that never became a release.
    .filter((tag) => !tag.includes("-"));

  return tags[0] ?? "v0.0.0";
}

const base = highestReleaseTag(REF).replace(/^v/, "");
const [major, minor, patch] = base.split(".").map((n) => Number.parseInt(n, 10));

const next =
  BUMP === "major"
    ? `${major + 1}.0.0`
    : BUMP === "minor"
      ? `${major}.${minor + 1}.0`
      : `${major}.${minor}.${patch + 1}`;

console.log(next);
