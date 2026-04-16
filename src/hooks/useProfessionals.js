import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useUserStore } from '../stores/useUserStore'

export function useProfessionals(type) {
  return useQuery({
    queryKey: ['professionals', type],
    queryFn: async () => {
      let q = supabase
        .from('professional_profiles')
        .select('*, profiles(*)')
        .eq('active', true)
      if (type) q = q.eq('type', type)
      const { data, error } = await q
      if (error) throw error
      return data
    },
  })
}

export function useMyProfessionalProfile() {
  const { profile } = useUserStore()
  return useQuery({
    queryKey: ['my-pro-profile', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('professional_profiles')
        .select('*, services(*)')
        .eq('user_id', profile.id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!profile?.id,
  })
}

export function useMyClients() {
  const { data: proProfile } = useMyProfessionalProfile()
  return useQuery({
    queryKey: ['my-clients', proProfile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, profiles!bookings_client_id_fkey(*), services(*)')
        .eq('professional_id', proProfile.id)
        .eq('status', 'confirmed')
      if (error) throw error
      return data
    },
    enabled: !!proProfile?.id,
  })
}

export function usePendingBookings() {
  const { data: proProfile } = useMyProfessionalProfile()
  return useQuery({
    queryKey: ['pending-bookings', proProfile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, profiles!bookings_client_id_fkey(*), services(*)')
        .eq('professional_id', proProfile.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!proProfile?.id,
  })
}

export function useCreateBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (booking) => {
      const { data, error } = await supabase.from('bookings').insert(booking).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  })
}

export function useConfirmBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }) => {
      const { data, error } = await supabase.from('bookings').update({ status }).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending-bookings'] })
      qc.invalidateQueries({ queryKey: ['my-clients'] })
    },
  })
}
