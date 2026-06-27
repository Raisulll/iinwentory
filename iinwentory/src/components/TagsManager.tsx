import { useState } from 'react';
import { useStore } from '../store/useStore';
import { Plus, X, Edit2, Trash2, Tag, Check } from 'lucide-react';

const TAG_COLORS = ['#294EA7', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#64748b'];

interface TagsManagerProps {
  showHeader?: boolean;
}

export default function TagsManager({ showHeader = true }: TagsManagerProps) {
  const store = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const handleAdd = () => {
    if (!newName.trim()) return;
    void store.addTag(newName.trim(), newColor);
    setNewName('');
    setNewColor(TAG_COLORS[0]);
    setShowAdd(false);
  };

  const startEdit = (id: string, name: string, color: string) => {
    setEditId(id);
    setEditName(name);
    setEditColor(color);
  };

  const handleSaveEdit = () => {
    if (editId && editName.trim()) {
      void store.updateTag(editId, { name: editName.trim(), color: editColor });
      setEditId(null);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this tag?')) void store.deleteTag(id);
  };

  const getItemCount = (tagId: string) => store.items.filter(i => i.tags.includes(tagId)).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {showHeader && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Tags</h1>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Organize and label items with colored tags.</p>
          </div>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={15} /> ADD TAG
          </button>
        </div>
      )}
      {!showHeader && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={15} /> ADD TAG
          </button>
        </div>
      )}

      {store.tags.length === 0 && !showAdd ? (
        <div className="empty-state" style={{ marginTop: '20px' }}>
          <Tag size={48} />
          <p>You don't have any tags</p>
          <p>Click Add Tag to get started!</p>
          <button className="btn-primary" style={{ marginTop: '16px' }} onClick={() => setShowAdd(true)}>
            <Plus size={15} /> ADD TAG
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {store.tags.map(tag => (
            <div key={tag.id} className="card animate-fade" style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', gap: '12px', cursor: 'default' }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: tag.color, flexShrink: 0 }} />
              {editId === tag.id ? (
                <>
                  <input className="input" value={editName} onChange={e => setEditName(e.target.value)} style={{ flex: 1, fontSize: '14px' }} autoFocus />
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {TAG_COLORS.map(c => (
                      <button key={c} onClick={() => setEditColor(c)} style={{ width: '20px', height: '20px', borderRadius: '50%', background: c, border: editColor === c ? '2px solid var(--text-dark)' : '2px solid transparent', transition: 'all 0.15s' }} />
                    ))}
                  </div>
                  <button className="btn-primary" onClick={handleSaveEdit} style={{ padding: '7px 12px' }}><Check size={14} /></button>
                  <button className="btn-outline" onClick={() => setEditId(null)} style={{ padding: '7px 12px' }}><X size={14} /></button>
                </>
              ) : (
                <>
                  <span style={{ fontWeight: 600, flex: 1 }}>{tag.name}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{getItemCount(tag.id)} items</span>
                  <button onClick={() => startEdit(tag.id, tag.name, tag.color)} style={{ color: 'var(--text-muted)', padding: '4px' }}><Edit2 size={15} /></button>
                  <button onClick={() => handleDelete(tag.id)} style={{ color: 'var(--text-muted)', padding: '4px' }}><Trash2 size={15} /></button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Add New Tag</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-medium)' }}>Tag Name</label>
                <input className="input" placeholder="e.g. Electronics" value={newName} onChange={e => setNewName(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && handleAdd()} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-medium)' }}>Color</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {TAG_COLORS.map(c => (
                    <button key={c} onClick={() => setNewColor(c)} style={{
                      width: '32px', height: '32px', borderRadius: '50%', background: c,
                      border: newColor === c ? '3px solid var(--text-dark)' : '3px solid transparent',
                      transition: 'all 0.15s', transform: newColor === c ? 'scale(1.1)' : 'scale(1)',
                    }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleAdd}>Add Tag</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
