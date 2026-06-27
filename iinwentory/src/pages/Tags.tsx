import { Tag as TagIcon } from 'lucide-react';
import HelpButton from '../components/HelpButton';
import TagsManager from '../components/TagsManager';

export default function Tags() {
  return (
    <div style={{ flex: 1, padding: '32px 36px', overflowY: 'auto' }}>
      <div style={{ maxWidth: '880px', margin: '0 auto' }}>
        <div className="page-hero">
          <div className="page-hero-text">
            <span className="page-eyebrow">
              <TagIcon size={12} strokeWidth={2.4} /> Tags
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1>Tag library</h1>
              <HelpButton topic="tags" size={16} />
            </div>
            <p className="page-hero-sub">
              Colour‑coded labels you can attach to any item — fast filtering, faster picking.
            </p>
          </div>
        </div>
        <TagsManager showHeader={false} />
      </div>
    </div>
  );
}
