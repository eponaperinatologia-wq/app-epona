import React, { useState } from 'react';
import { Icon } from './icons';
import { TopBar } from './screens';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const mesLabel = (mesStr) => {
  const [ano, mes] = mesStr.split('-');
  return `${MESES[parseInt(mes)-1]} ${ano}`;
};

const mesAtual = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
};

const mesesDisponiveis = (compras) => {
  const set = new Set(compras.map(c => c.mes));
  return Array.from(set).sort().reverse();
};

const ListaComprasScreen = ({ compras = [], addCompra, deleteCompra, toggleCompra, currentUser }) => {
  const [nome, setNome] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [aba, setAba] = useState('atual');
  const [mesArquivo, setMesArquivo] = useState('');
  const [copiado, setCopiado] = useState(false);

  const gerarTextoLista = (itens, titulo) => {
    const linhas = [`📋 ${titulo}`, ''];
    itens.forEach(it => {
      const qtd = it.quantidade ? ` — ${it.quantidade}` : '';
      const check = it.comprado ? '✓' : '•';
      linhas.push(`${check} ${it.nome}${qtd}`);
    });
    linhas.push('');
    linhas.push(`${itens.length} ${itens.length === 1 ? 'item' : 'itens'}`);
    return linhas.join('\n');
  };

  const copiarLista = async (itens, titulo) => {
    if (itens.length === 0) return;
    const texto = gerarTextoLista(itens, titulo);
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (e) {
      // Fallback pra browsers sem clipboard API
      const ta = document.createElement('textarea');
      ta.value = texto;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch {}
      document.body.removeChild(ta);
    }
  };

  const hoje = mesAtual();
  const meses = mesesDisponiveis(compras);
  const pendentes = compras.filter(c => !c.comprado);
  const compradosEsteMes = compras.filter(c => c.comprado && c.mes === hoje);

  const arquivoItems = mesArquivo ? compras.filter(c => c.mes === mesArquivo) : [];

  const handleAdd = () => {
    if (!nome.trim()) return;
    addCompra({
      id: 'c_' + Date.now(),
      nome: nome.trim(),
      quantidade: quantidade.trim(),
      comprado: false,
      mes: hoje,
      criadoPor: currentUser?.nome || 'Sistema',
    });
    setNome('');
    setQuantidade('');
  };

  return (
    <div style={{ paddingBottom: 110 }}>
      <TopBar title="Lista de Compras" />

      {/* Abas: Atual / Histórico */}
      <div style={{ padding: '8px 20px 0' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setAba('atual')} style={{
            flex: 1, padding: '10px', borderRadius: 10, border: 'none',
            background: aba === 'atual' ? 'var(--accent)' : 'var(--card)',
            color: aba === 'atual' ? '#fff' : 'var(--ink-2)',
            fontWeight: 600, fontSize: 13, cursor: 'pointer',
          }}>
            Pendentes ({pendentes.length})
          </button>
          <button onClick={() => setAba('historico')} style={{
            flex: 1, padding: '10px', borderRadius: 10, border: 'none',
            background: aba === 'historico' ? 'var(--accent)' : 'var(--card)',
            color: aba === 'historico' ? '#fff' : 'var(--ink-2)',
            fontWeight: 600, fontSize: 13, cursor: 'pointer',
          }}>
            Histórico
          </button>
        </div>
      </div>

      {aba === 'atual' ? (
        <>
          {/* Form de adicionar */}
          <div style={{ padding: '12px 20px 0', display: 'flex', gap: 8 }}>
            <input value={nome} onChange={e => setNome(e.target.value)}
              placeholder="Nome do item"
              style={{
                flex: 1, padding: '12px 14px', borderRadius: 12, border: '1px solid var(--line)',
                background: 'var(--card)', fontSize: 14, color: 'var(--ink)', outline: 'none',
                fontFamily: 'var(--sans)',
              }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <input value={quantidade} onChange={e => setQuantidade(e.target.value)}
              placeholder="Qtd"
              style={{
                width: 80, padding: '12px 10px', borderRadius: 12, border: '1px solid var(--line)',
                background: 'var(--card)', fontSize: 14, color: 'var(--ink)', outline: 'none',
                fontFamily: 'var(--sans)', textAlign: 'center',
              }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <button onClick={handleAdd} style={{
              width: 44, height: 44, borderRadius: 12, border: 'none',
              background: 'var(--accent)', color: '#fff', cursor: 'pointer',
              display: 'grid', placeItems: 'center', flexShrink: 0,
            }}>
              <Icon name="plus" size={20} />
            </button>
          </div>

          {/* Pendentes */}
          <div style={{ padding: '16px 20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Pendentes
              </div>
              {pendentes.length > 0 && (
                <button
                  onClick={() => copiarLista(pendentes, `Lista de Compras · ${mesLabel(hoje)}`)}
                  style={{
                    background: copiado ? '#15803d' : 'var(--card)',
                    color: copiado ? '#fff' : 'var(--accent)',
                    border: '1px solid ' + (copiado ? '#15803d' : 'var(--line)'),
                    borderRadius: 8, padding: '4px 10px',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--sans)',
                  }}
                >
                  <Icon name={copiado ? 'check' : 'copy'} size={12} color={copiado ? '#fff' : 'var(--accent)'} />
                  {copiado ? 'Copiado' : 'Copiar lista'}
                </button>
              )}
            </div>
            {pendentes.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
                Nenhum item pendente.
              </div>
            )}
            {pendentes.map(c => (
              <ItemRow key={c.id} item={c} currentUser={currentUser}
                onToggle={toggleCompra} onDelete={deleteCompra} />
            ))}
          </div>

          {/* Comprados este mês */}
          {compradosEsteMes.length > 0 && (
            <div style={{ padding: '16px 20px 0' }}>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Comprados este mês
              </div>
              {compradosEsteMes.map(c => (
                <ItemRow key={c.id} item={c} currentUser={currentUser}
                  onToggle={toggleCompra} onDelete={deleteCompra} />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Seletor de mês */}
          <div style={{ padding: '12px 20px 0' }}>
            <select value={mesArquivo} onChange={e => setMesArquivo(e.target.value)}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--line)',
                background: 'var(--card)', fontSize: 14, color: 'var(--ink)', outline: 'none',
                fontFamily: 'var(--sans)',
              }}
            >
              <option value="">Selecione um mês</option>
              {meses.map(m => (
                <option key={m} value={m}>{mesLabel(m)}</option>
              ))}
            </select>
          </div>

          {mesArquivo && (
            <div style={{ padding: '16px 20px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {mesLabel(mesArquivo)}
                </div>
                {arquivoItems.length > 0 && (
                  <button
                    onClick={() => copiarLista(arquivoItems, `Compras · ${mesLabel(mesArquivo)}`)}
                    style={{
                      background: copiado ? '#15803d' : 'var(--card)',
                      color: copiado ? '#fff' : 'var(--accent)',
                      border: '1px solid ' + (copiado ? '#15803d' : 'var(--line)'),
                      borderRadius: 8, padding: '4px 10px',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--sans)',
                    }}
                  >
                    <Icon name={copiado ? 'check' : 'copy'} size={12} color={copiado ? '#fff' : 'var(--accent)'} />
                    {copiado ? 'Copiado' : 'Copiar lista'}
                  </button>
                )}
              </div>
              {arquivoItems.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
                  Nenhum item neste mês.
                </div>
              )}
              {arquivoItems.map(c => (
                <ItemRow key={c.id} item={c} currentUser={currentUser}
                  onToggle={toggleCompra} onDelete={deleteCompra} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const ItemRow = ({ item, currentUser, onToggle, onDelete }) => {
  const isAdmin = currentUser?.role === 'admin';
  const canDelete = currentUser?.role === 'admin' || currentUser?.role === 'vet';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
      background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12,
      marginBottom: 6,
      opacity: item.comprado ? 0.5 : 1,
    }}>
      {isAdmin && (
        <button onClick={() => onToggle(item.id)} style={{
          width: 28, height: 28, borderRadius: 8, border: '1.5px solid ' + (item.comprado ? 'var(--accent)' : 'var(--line-2)'),
          background: item.comprado ? 'var(--accent)' : 'transparent',
          display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0,
        }}>
          {item.comprado && <Icon name="check" size={14} color="#fff" />}
        </button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 500, color: 'var(--ink)',
          textDecoration: item.comprado ? 'line-through' : 'none',
        }}>
          {item.nome}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>
          {item.quantidade && <span>{item.quantidade} · </span>}
          {item.criadoPor} · {mesLabel(item.mes)}
        </div>
      </div>
      {canDelete && (
        <button onClick={() => onDelete(item.id)} style={{
          width: 32, height: 32, borderRadius: 8, border: 'none',
          background: 'transparent', color: 'var(--ink-3)', cursor: 'pointer',
          display: 'grid', placeItems: 'center', flexShrink: 0,
        }}>
          <Icon name="trash" size={16} />
        </button>
      )}
    </div>
  );
};

export { ListaComprasScreen };
