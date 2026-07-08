import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  computeMacroAnalytics, pickLatestPerClient, type MacroAnalytics,
} from '@/lib/macroAnalytics';
import type { FmsAssessmentRow } from '@/lib/insights';

/**
 * Clinic-wide analytics query — single source of truth for the macro-analytics
 * data. The KPI row (ClinicalKpiRow) and the charts view (MacroAnalytics) both
 * call this with the stable queryKey ['macroAnalytics'], so React Query serves
 * them from one cache and fetches only once.
 */
export function useMacroAnalytics() {
  return useQuery({
    queryKey: ['macroAnalytics'],
    queryFn: async (): Promise<MacroAnalytics> => {
      const [{ data: clientsRows, error: clientsErr }, { data: fmsRows, error: fmsErr }] = await Promise.all([
        supabase.from('clients').select('id'),
        supabase.from('fms_assessments').select('*').order('assessed_at', { ascending: false }),
      ]);
      // Throw on error so failures surface as isError (not a misleading
      // "Dati insufficienti" computed from empty rows).
      if (clientsErr) throw clientsErr;
      if (fmsErr) throw fmsErr;
      const totalClients = clientsRows?.length ?? 0;
      const latestMap = pickLatestPerClient((fmsRows ?? []) as unknown as FmsAssessmentRow[]);
      const latestRows = [...latestMap.values()];
      return computeMacroAnalytics(totalClients, latestRows);
    },
  });
}
