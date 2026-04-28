import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useUserStore } from '../stores/useUserStore'

export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

export const DEFAULT_GAME = {
  _v: 2,
  coins: 0, trophies: 0, streak: 0, vacation: false,
  lastResetDate: '',
  water: { current: 0, goal: 6 },
  kaffa: { name: 'Missão Principal', desc: 'Descreva sua missão mais importante do ano.', reward: 100, penalty: 0, trophy: 20, done: false },
  tasks: [
    { emoji: '⏰', title: 'Acordar cedo',     desc: 'Sem soneca, levanta direto.',       reward: 30, penalty: 15, trophy: 1, state: 'idle', days: ALL_DAYS },
    { emoji: '🏋️', title: 'Treino do dia',    desc: 'Foco total no treino.',             reward: 35, penalty: 20, trophy: 2, state: 'idle', days: [0,1,2,3,4] },
    { emoji: '💻', title: 'Estudo / Projeto', desc: 'Bloco profundo de estudo.',          reward: 25, penalty: 15, trophy: 1, state: 'idle', days: ALL_DAYS },
    { emoji: '💧', title: 'Meta de água',     desc: 'Beber todos os copos do dia.',       reward: 20, penalty: 10, trophy: 1, state: 'idle', days: ALL_DAYS },
  ],
  courses: [
    { emoji: '🐍', name: 'Python Avançado',      total: 313, done: 0, cpp: 20 },
    { emoji: '💻', name: 'C# .NET',              total: 278, done: 0, cpp: 20 },
    { emoji: '🗄️', name: 'SQL e Banco de Dados', total: 120, done: 0, cpp: 20 },
  ],
  routine: [
    { time: '06:30', title: 'Acordar',               desc: 'Sem soneca — água imediatamente.',               color: 'var(--purple)' },
    { time: '07:00', title: 'Academia — Seg/Qua/Sex', desc: 'Treino pesado. Ter/Qui: cardio ou esporte.',    color: 'var(--accent)' },
    { time: '09:00', title: 'Estudo / Projeto',       desc: 'Bloco profundo: Python, C#, SQL. Sem celular.', color: 'var(--blue)' },
    { time: '13:00', title: 'Kaffa Tecnologia',       desc: 'Estágio — ArcGIS, C#, SQL.',                    color: '#f3b63f' },
    { time: '20:30', title: 'Conteúdo / Revisão',     desc: 'Instagram, leitura leve ou pendências.',        color: 'var(--success)' },
  ],
  shop: [
    { emoji: '🏀', name: 'Jogar Basquete',   price: 500 },
    { emoji: '❤️', name: 'Sair c/ Namorada', price: 500 },
    { emoji: '🎁', name: 'Comprar Algo',      price: 1000 },
    { emoji: '🎮', name: 'Video Game',        price: 500 },
    { emoji: '🛹', name: 'Andar de Skate',    price: 500 },
    { emoji: '🍻', name: 'Sair com Amigos',   price: 500 },
  ],
  inventory: [],
  dietNotes: [],
  workoutLog: {},
  calendarLog: {},
  weeklyWorkouts: ['Peito', 'Costas', 'Perna', 'Ombro', 'Braços', 'Livre', 'Descanso'],
  myMeals: [],
  myWorkoutDays: [],
  friends: [],
  notifSettings: {
    enabled: false,
    times: ['08:00', '20:30'],
    messages: [
      'Bora treinar hoje! 💪 Não perde o streak!',
      'Hora de acordar! ☀️ Começa o dia forte.',
      'Já fez as missões de hoje? 👑 Bora lá!',
      'Bora estudar! 💻 Um bloco por dia faz diferença.',
      'Missões pendentes te esperando! 🎯 Foca.',
      'Bora acordar, vai ser um dia incrível! 🔥',
      'Não deixa o streak quebrar! 🔥 Bora!',
    ],
  },
}

export function getWeekWorkout(D, idx) {
  return (D?.weeklyWorkouts?.[idx]) ?? WORKOUTS[idx]
}

export function fmt(n) { return Number(n).toLocaleString('pt-BR') }
export function pct(a, b) { return b > 0 ? Math.round(a / b * 100) : 0 }
export const WORKOUTS = ['Peito', 'Costas', 'Perna', 'Ombro', 'Braço', 'Livre', 'Descanso']
export const DAY_LETTERS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']
export const DAY_NAMES_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
export function todayIdx() { const d = new Date().getDay(); return d === 0 ? 6 : d - 1 }
export function dayName() {
  return ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][new Date().getDay()]
}

export function useGameData() {
  const { profile } = useUserStore()
  const qc = useQueryClient()
  const saveTimer = useRef(null)
  const didReset = useRef(false)

  const { data: D, isLoading } = useQuery({
    queryKey: ['game-data', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_game_data')
        .select('data')
        .eq('user_id', profile.id)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      const loaded = data?.data || JSON.parse(JSON.stringify(DEFAULT_GAME))
      // Backfill new fields for existing users
      if (loaded.trophies === undefined) loaded.trophies = 0
      if (loaded.kaffa && loaded.kaffa.trophy === undefined) loaded.kaffa.trophy = 20
      if (Array.isArray(loaded.tasks)) {
        loaded.tasks = loaded.tasks.map(t => ({
          ...t,
          trophy: t.trophy ?? (t.title === 'Treino do dia' || t.emoji === '🏋️' ? 2 : 1),
        }))
      }
      return loaded
    },
    enabled: !!profile?.id,
    staleTime: Infinity,
  })

  function save(newD) {
    qc.setQueryData(['game-data', profile?.id], newD)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      const latest = qc.getQueryData(['game-data', profile?.id])
      if (latest) {
        const { error } = await supabase
          .from('user_game_data')
          .upsert({ user_id: profile.id, data: latest, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
        if (error) console.error('[save] supabase upsert FALHOU:', error)
      }
    }, 800)
  }

  async function saveImmediate(newD) {
    qc.setQueryData(['game-data', profile?.id], newD)
    clearTimeout(saveTimer.current)
    saveTimer.current = null
    const latest = qc.getQueryData(['game-data', profile?.id])
    const { error } = await supabase
      .from('user_game_data')
      .upsert({ user_id: profile.id, data: latest, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    if (error) console.error('[saveImmediate] supabase upsert FALHOU:', error)
    return !error
  }

  // Flush any pending debounced save when the page hides / unloads — otherwise
  // closing the app within the 800ms debounce window silently loses coins/trophies.
  useEffect(() => {
    if (!profile?.id) return
    function flush() {
      if (!saveTimer.current) return
      clearTimeout(saveTimer.current)
      saveTimer.current = null
      const latest = qc.getQueryData(['game-data', profile.id])
      if (latest) {
        supabase
          .from('user_game_data')
          .upsert(
            { user_id: profile.id, data: latest, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' }
          )
      }
    }
    function onVisibility() {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('pagehide', flush)
    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', flush)
      window.removeEventListener('beforeunload', flush)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  // Daily auto-reset: run at midnight boundary
  useEffect(() => {
    if (!D || !profile?.id || didReset.current) return
    const today = new Date().toISOString().split('T')[0]
    if (D.lastResetDate === today) return

    didReset.current = true

    let coins = D.coins
    let streak = D.streak || 0

    if (D.lastResetDate) {
      // Figure out which day-of-week (0=Mon…6=Sun) the last reset was
      const lastDate = new Date(D.lastResetDate + 'T12:00:00')
      const dow = lastDate.getDay()
      const lastDayIdx = dow === 0 ? 6 : dow - 1

      // Streak: increment if anything was done yesterday, else reset
      const anyDone = D.tasks.some(t => t.state === 'done') || D.kaffa.done
      streak = anyDone ? streak + 1 : 0

      // Kaffa penalty if not completed
      if (!D.kaffa.done && (D.kaffa.penalty || 0) > 0) {
        coins = Math.max(0, coins - D.kaffa.penalty)
      }

      // Task penalties: only for tasks that were idle AND were scheduled for yesterday
      D.tasks.forEach(t => {
        const taskDays = t.days ?? ALL_DAYS
        if (t.state === 'idle' && taskDays.includes(lastDayIdx) && (t.penalty || 0) > 0) {
          coins = Math.max(0, coins - t.penalty)
        }
      })
    }

    const newD = {
      ...D,
      tasks: D.tasks.map(t => ({ ...t, state: 'idle' })),
      kaffa: { ...D.kaffa, done: false },
      water: { ...D.water, current: 0 },
      coins,
      streak,
      lastResetDate: today,
    }

    qc.setQueryData(['game-data', profile.id], newD)
    supabase.from('user_game_data').upsert({
      user_id: profile.id,
      data: newD,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [D?.lastResetDate, profile?.id])

  return { D: D || JSON.parse(JSON.stringify(DEFAULT_GAME)), save, saveImmediate, isLoading }
}
