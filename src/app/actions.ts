"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import {
  COMBINE_COOKIE,
  PREF_MAX_AGE,
  THEME_COOKIE,
} from "@/lib/prefs";

/**
 * Flip light <-> dark. Implemented as a server action driven by a plain <form>
 * so it degrades gracefully without client JS, and so the new theme is baked
 * into the server-rendered HTML rather than applied after hydration.
 */
export async function toggleTheme() {
  const store = await cookies();
  const isDark = store.get(THEME_COOKIE)?.value === "dark";
  store.set(THEME_COOKIE, isDark ? "light" : "dark", {
    path: "/",
    maxAge: PREF_MAX_AGE,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}

/** Flip the timetable between the split (per-section) and combined views. */
export async function toggleCombine() {
  const store = await cookies();
  const isCombined = store.get(COMBINE_COOKIE)?.value === "1";
  store.set(COMBINE_COOKIE, isCombined ? "0" : "1", {
    path: "/",
    maxAge: PREF_MAX_AGE,
    sameSite: "lax",
  });
  revalidatePath("/timetable");
}
