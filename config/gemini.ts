/**
 * Which Gemini model each job uses, in one place rather than hardcoded in two routes.
 *
 * Checked against the live model list on 2026-09-11, because model ids rot: `gemini-2.5-flash-lite`
 * now 404s with "no longer available to new users", and a hardcoded id that dies is a button that
 * stops working for a reason nobody can see from the code.
 */

/**
 * Alt text: a short factual sentence about an image. Measured on a real room photo, the lite
 * models answer in about 2 seconds and the full 3.8 Flash took 23, which is far too long for a
 * button someone clicks in Studio. The answers were equally good, so this takes the fast one.
 */
export const GEMINI_ALT_TEXT_MODEL = "gemini-3.5-flash-lite";

/**
 * Descriptions: longer prose where the wording is the point, so this keeps the fuller model.
 * Nobody is waiting on it the way they wait on the alt text button.
 */
export const GEMINI_DESCRIPTION_MODEL = "gemini-2.5-flash";
