import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useAestheticPosts() {
  return useQuery({
    queryKey: ['aesthetic-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aesthetic_posts')
        .select('*, professional_profiles(*, profiles(name))')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useCreatePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ professional_id, title, body }) => {
      const { data, error } = await supabase
        .from('aesthetic_posts')
        .insert({ professional_id, title, body })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aesthetic-posts'] }),
  })
}

export function useDeletePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('aesthetic_posts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aesthetic-posts'] }),
  })
}
