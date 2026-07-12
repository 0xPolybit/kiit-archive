/**
 * User preferences that must be known server-side at first paint.
 *
 * Both live in cookies rather than localStorage: the server needs them while
 * rendering (the theme class on <body>, the timetable view mode) so the first
 * byte of HTML is already correct. localStorage would force a client round-trip
 * and flash the wrong state.
 */

export const THEME_COOKIE = "theme";
export const COMBINE_COOKIE = "tt_combine";

export type Theme = "light" | "dark";

/** One year, in seconds — these are long-lived UI preferences. */
export const PREF_MAX_AGE = 60 * 60 * 24 * 365;
