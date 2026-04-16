import { useState } from 'react'
import { useAestheticPosts, useCreatePost, useDeletePost } from '../../hooks/useAestheticPosts'
import { useMyProfessionalProfile, usePendingBookings, useConfirmBooking } from '../../hooks/useProfessionals'

export default function AestheticianPanel() {
  const { data: proProfile } = useMyProfessionalProfile()
  const { data: posts } = useAestheticPosts()
  const { data: pending } = usePendingBookings()
  const confirmBooking = useConfirmBooking()
  const createPost = useCreatePost()
  const deletePost = useDeletePost()

  const [tab, setTab] = useState('posts')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')

  const myPosts = posts?.filter(p => p.professional_id === proProfile?.id) || []

  async function handleCreatePost(e) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return
    setError('')
    try {
      await createPost.mutateAsync({ professional_id: proProfile.id, title, body })
      setTitle('')
      setBody('')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div style={{ minHeight: '100dvh' }}>
      <div className="panel-tabs">
        <button className={`panel-tab ${tab === 'posts' ? 'active' : ''}`} onClick={() => setTab('posts')}>
          Publicações ({myPosts.length})
        </button>
        <button className={`panel-tab ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>
          Agendamentos {pending?.length ? `(${pending.length})` : ''}
        </button>
      </div>

      {tab === 'posts' && (
        <div className="main-content">
          <form className="post-form" onSubmit={handleCreatePost}>
            <h3 style={{ marginBottom: 4 }}>Nova publicação</h3>
            {error && <div className="auth-error">{error}</div>}
            <div className="input-group">
              <label>Título</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Benefícios da vitamina C na pele" required />
            </div>
            <div className="input-group">
              <label>Conteúdo</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Compartilhe dicas, novidades e benefícios de autocuidado..."
                rows={4}
                required
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={createPost.isPending}>
              {createPost.isPending ? 'Publicando…' : 'Publicar'}
            </button>
          </form>

          {myPosts.map(post => (
            <div key={post.id} className="post-card">
              <div className="post-card-body">
                <h3>{post.title}</h3>
                <p>{post.body}</p>
              </div>
              <div className="post-card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{new Date(post.created_at).toLocaleDateString('pt-BR')}</span>
                <button
                  onClick={() => deletePost.mutate(post.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'pending' && (
        <div className="main-content">
          {!pending?.length && (
            <div className="plan-empty">
              <div className="plan-empty-icon">📋</div>
              <h3>Sem agendamentos pendentes</h3>
            </div>
          )}
          {pending?.map(booking => (
            <div key={booking.id} className="booking-card">
              <div className="booking-card-header">
                <div>
                  <div className="booking-client">{booking.profiles?.name}</div>
                  <div className="booking-service">{booking.services?.name}</div>
                </div>
                <span className="booking-status pending">Pendente</span>
              </div>
              <div className="booking-details">
                {booking.client_notes && `Obs: ${booking.client_notes}`}
              </div>
              <div className="booking-actions">
                <button
                  className="btn btn-primary"
                  style={{ background: 'var(--success)' }}
                  onClick={() => confirmBooking.mutate({ id: booking.id, status: 'confirmed' })}
                >
                  ✓ Confirmar
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => confirmBooking.mutate({ id: booking.id, status: 'cancelled' })}
                >
                  ✕ Recusar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
