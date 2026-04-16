import { useState } from 'react'
import { useGameData, fmt } from '../hooks/useGameData'

export default function Loja() {
  const { D, save } = useGameData()
  const [tab, setTab] = useState('loja')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ emoji: '🎁', name: '', price: '' })

  if (!D) return null

  function buy(i) {
    const item = D.shop[i]
    if (D.coins < item.price) return
    save({
      ...D,
      coins: D.coins - item.price,
      inventory: [...D.inventory, { ...item, boughtAt: new Date().toISOString() }],
    })
  }

  function removeInventory(i) {
    const inventory = D.inventory.filter((_, j) => j !== i)
    save({ ...D, inventory })
  }

  function addItem(e) {
    e.preventDefault()
    const item = { emoji: form.emoji || '🎁', name: form.name, price: Math.max(0, Number(form.price)) }
    save({ ...D, shop: [...D.shop, item] })
    setForm({ emoji: '🎁', name: '', price: '' })
    setAdding(false)
  }

  function removeShopItem(i) {
    const shop = D.shop.filter((_, j) => j !== i)
    save({ ...D, shop })
  }

  return (
    <div className="main-content">
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2>Loja 🛒</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Troque moedas por recompensas · <strong style={{ color: 'var(--accent)' }}>{fmt(D.coins)} 🪙</strong>
          </p>
        </div>
      </div>

      <div className="filter-tabs" style={{ marginBottom: 16 }}>
        <button className={`filter-tab ${tab === 'loja' ? 'active' : ''}`} onClick={() => setTab('loja')}>Loja</button>
        <button className={`filter-tab ${tab === 'inventario' ? 'active' : ''}`} onClick={() => setTab('inventario')}>
          Inventário {D.inventory.length > 0 && `(${D.inventory.length})`}
        </button>
      </div>

      {tab === 'loja' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button className="btn btn-ghost" style={{ padding: '8px 14px', width: 'auto' }} onClick={() => setAdding(v => !v)}>
              {adding ? '✕ Cancelar' : '+ Item'}
            </button>
          </div>

          {adding && (
            <form className="card" style={{ marginBottom: 16 }} onSubmit={addItem}>
              <p style={{ fontWeight: 700, marginBottom: 12 }}>Novo item</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <div className="input-group" style={{ width: 64 }}>
                  <label>Emoji</label>
                  <input value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} maxLength={2} />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Nome</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Jogar Basquete" required />
                </div>
              </div>
              <div className="input-group" style={{ marginBottom: 12 }}>
                <label>Preço (moedas)</label>
                <input type="number" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required />
              </div>
              <button className="btn btn-primary" type="submit">Adicionar</button>
            </form>
          )}

          {!D.shop.length && (
            <div className="plan-empty">
              <div className="plan-empty-icon">🛒</div>
              <h3>Loja vazia</h3>
              <p>Adicione recompensas para trocar com suas moedas.</p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {D.shop.map((item, i) => {
              const canBuy = D.coins >= item.price
              return (
                <div key={i} className="card" style={{ textAlign: 'center', padding: '16px 12px' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>{item.emoji}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>{item.name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 700, marginBottom: 12 }}>
                    {fmt(item.price)} 🪙
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn btn-primary"
                      style={{ flex: 1, padding: '8px', fontSize: '0.8rem', opacity: canBuy ? 1 : 0.4 }}
                      onClick={() => buy(i)}
                      disabled={!canBuy}
                    >
                      {canBuy ? 'Comprar' : 'Sem saldo'}
                    </button>
                    <button
                      className="btn btn-danger"
                      style={{ padding: '8px 8px', width: 'auto', fontSize: '0.8rem' }}
                      onClick={() => removeShopItem(i)}
                    >🗑</button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {tab === 'inventario' && (
        <>
          {!D.inventory.length && (
            <div className="plan-empty">
              <div className="plan-empty-icon">📦</div>
              <h3>Inventário vazio</h3>
              <p>Compre itens na loja para adicioná-los aqui.</p>
            </div>
          )}
          {D.inventory.map((item, i) => (
            <div key={i} className="card" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: 26 }}>{item.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{item.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                  Comprado em {new Date(item.boughtAt).toLocaleDateString('pt-BR')}
                </div>
              </div>
              <button
                className="btn btn-ghost"
                style={{ padding: '8px 12px', width: 'auto', fontSize: '0.8rem' }}
                onClick={() => removeInventory(i)}
              >Usar ✓</button>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
