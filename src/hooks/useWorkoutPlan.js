import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useUserStore } from '../stores/useUserStore'

export function useMyWorkoutPlan() {
  const { profile } = useUserStore()
  return useQuery({
    queryKey: ['workout-plan', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('client_id', profile.id)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      return data || null
    },
    enabled: !!profile?.id,
  })
}

export function useClientWorkoutPlan(clientId, proProfileId) {
  return useQuery({
    queryKey: ['workout-plan-pro', clientId, proProfileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_plans')
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

export function useSaveWorkoutPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ client_id, professional_id, content, notes }) => {
      const { data, error } = await supabase
        .from('workout_plans')
        .upsert({ client_id, professional_id, content, notes, updated_at: new Date().toISOString() })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workout-plan'] })
      qc.invalidateQueries({ queryKey: ['workout-plan-pro'] })
    },
  })
}
