// Small admin hooks the staff app runs all the time (sidebar badge counts,
// salary adjustments). They live here, apart from the admin tabs, so the tabs
// themselves can be downloaded only when they're opened.
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient.js";

// How many rows of a table are still "pending", refreshed every minute, and a
// reload to call after the admin acts on one.
function usePendingCount(table, enabled) {
  const [count, setCount] = useState(0);
  const load = useCallback(async () => {
    if (!enabled) return;
    const { count: n, error } = await supabase.from(table).select("id", { count: "exact", head: true }).eq("status", "pending");
    if (!error) setCount(n || 0);
  }, [table, enabled]);
  useEffect(() => {
    load();
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, [load]);
  return [count, load];
}

export const usePendingWorkshopCount = (enabled) => usePendingCount("workshop_registrations", enabled);
export const usePendingHifzTestCount = (enabled) => usePendingCount("hifz_test_registrations", enabled);
export const usePendingSlipCount = (enabled) => usePendingCount("payment_slips", enabled);
export const usePendingReviewCount = (enabled) => usePendingCount("reviews", enabled);
export const usePendingRegistrationCount = (enabled) => usePendingCount("class_registrations", enabled);
export const usePendingInfoCount = (enabled) => usePendingCount("student_info_updates", enabled);

const ADJ_FROM_DB = (r) => ({ adjustment: Number(r.adjustment) || 0, adjustmentNote: r.adjustment_note || "", bonus: Number(r.bonus) || 0, bonusNote: r.bonus_note || "" });

// The month's adjustments and bonuses by teacher id, and a save for one.
export function useSalaryAdjustments(month, enabled) {
  const [byMonth, setByMonth] = useState({});
  useEffect(() => {
    if (!enabled || byMonth[month]) return;
    supabase.from("teacher_salary_adjustments").select("*").eq("month", month).then(({ data, error }) => {
      setByMonth((prev) => ({ ...prev, [month]: error ? {} : Object.fromEntries((data || []).map((r) => [r.teacher_id, ADJ_FROM_DB(r)])) }));
    });
  }, [month, enabled, byMonth]);
  const save = useCallback(async (teacherId, adj) => {
    const { data, error } = await supabase.from("teacher_salary_adjustments").upsert({
      teacher_id: teacherId, month,
      adjustment: Number(adj.adjustment) || 0, adjustment_note: adj.adjustmentNote.trim() || null,
      bonus: Number(adj.bonus) || 0, bonus_note: adj.bonusNote.trim() || null,
      updated_at: new Date().toISOString(),
    }).select().single();
    if (error) throw error;
    setByMonth((prev) => ({ ...prev, [month]: { ...(prev[month] || {}), [teacherId]: ADJ_FROM_DB(data) } }));
  }, [month]);
  return [byMonth[month] || {}, save];
}

// Adjustments plus bonuses across all teachers, for the profit summary.
export const salaryExtrasTotal = (adjustments) =>
  Object.values(adjustments).reduce((n, a) => n + (Number(a.adjustment) || 0) + (Number(a.bonus) || 0), 0);
