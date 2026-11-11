/**
 * The timed visual: a datum's text while the render's instant is before the datum's shown-until
 * instant, and nothing after it. A pure function of the text and the two instants, so it reads no
 * clock, holds no time and imports no file of this package. `undefined` is the hidden answer, so a
 * hidden datum is unknown to the cell and drops its label and gap with it.
 */
export function timed(
  text: string,
  shownUntil: number | undefined,
  now: number | undefined,
): string | undefined {
  if (shownUntil === undefined || now === undefined) return undefined;
  return now < shownUntil ? text : undefined;
}
