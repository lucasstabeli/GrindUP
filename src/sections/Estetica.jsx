import { useAestheticPosts } from '../hooks/useAestheticPosts'

export default function Estetica() {
  const { data: posts, isLoading } = useAestheticPosts()

  if (isLoading) return (
    <div className="main-content">
      <div className="loading-screen" style={{ minHeight: 300 }}>
        <div className="spinner" />
      </div>
    </div>
  )

  return (
    <div className="main-content">
      <div style={{ marginBottom: 20 }}>
        <h2>Estética & Autocuidado ✨</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 6 }}>
          Dicas e novidades de autocuidado
        </p>
      </div>

      {!posts?.length && (
        <div className="plan-empty">
          <div className="plan-empty-icon">✨</div>
          <h3>Nenhuma publicação ainda</h3>
          <p>Em breve sua esteticista irá compartilhar dicas e novidades aqui.</p>
        </div>
      )}

      {posts?.map(post => {
        const authorName = post.professional_profiles?.profiles?.name || 'Profissional'
        const initials = authorName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
        return (
          <div key={post.id} className="post-card">
            <div className="post-card-header">
              <div className="post-author-avatar">{initials}</div>
              <div>
                <div className="post-author-name">{authorName}</div>
                <div className="post-author-role">Esteticista</div>
              </div>
            </div>
            <div className="post-card-body">
              <h3>{post.title}</h3>
              <p>{post.body}</p>
            </div>
            <div className="post-card-footer">
              {new Date(post.created_at).toLocaleDateString('pt-BR')}
            </div>
          </div>
        )
      })}
    </div>
  )
}
