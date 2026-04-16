import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useUserStore } from '../stores/useUserStore'

export function useMyDietPlan() {
  const { profile } = useUserStore()
  return useQuery({
    queryKey: ['diet-plan', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diet_plans')
        .select('*')
        .eq('client_id', profile.id)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      return data || null
    },
    enabled: !!profile?.id,
  })
}

export function useClientDietPlan(clientId, proProfileId) {
  return useQuery({
    queryKey: ['diet-plan-pro', clientId, proProfileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diet_plans')
        .select('*')
        .eq('client_id', clientId)
        .eq('professional_id', proProfileId)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      return data || null
    },
    enabled: !!clientId && !!proProfileId,
  })
}

export function useSaveDietPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ client_id, professional_id, content, notes }) => {
      const { data, error } = await supabase
        .from('diet_plans')
        .upsert({ client_id, professional_id, content, notes, updated_at: new Date().toISOString() })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['diet-plan'] })
      qc.invalidateQueries({ queryKey: ['diet-plan-pro'] })
    },
  })
}
