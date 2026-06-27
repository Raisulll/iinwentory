import { useState } from 'react';
import { Loader2, ImagePlus, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { apiUploadPhoto } from '../../lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface AddFolderModalProps {
  open: boolean;
  onClose: () => void;
  /** Parent folder id for the new folder; null = root */
  parentFolderId: string | null;
}

export default function AddFolderModal({ open, onClose, parentFolderId }: AddFolderModalProps) {
  const store = useStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cover, setCover] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleCoverUpload = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const res = await apiUploadPhoto(file);
      setCover(res.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      await store.addFolder(name.trim(), parentFolderId, {
        description,
        coverImage: cover,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create new folder</DialogTitle>
          <DialogDescription>
            Group related items together. You can nest folders to mirror your real-world storage.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="add-folder-name">Folder Name *</Label>
            <Input
              id="add-folder-name"
              placeholder="e.g. Main Warehouse"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="add-folder-desc">
              Description <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="add-folder-desc"
              rows={3}
              placeholder="What lives in this folder?"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>
              Cover Image <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            {cover ? (
              <div className="flex items-center gap-3">
                <img src={cover} alt="" className="h-[88px] w-[88px] rounded-md border border-border object-cover" />
                <div className="flex flex-col gap-1.5">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent">
                    <ImagePlus size={14} /> Replace
                    <input type="file" accept="image/*" onChange={e => void handleCoverUpload(e.target.files?.[0])} className="hidden" />
                  </label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setCover(null)} className="text-destructive">
                    <X size={14} /> Remove
                  </Button>
                </div>
              </div>
            ) : (
              <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-[12px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-raised)] px-4 py-2.5 text-sm font-semibold text-[var(--text-medium)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)]">
                {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
                {uploading ? 'Uploading…' : 'Upload cover image'}
                <input type="file" accept="image/*" onChange={e => void handleCoverUpload(e.target.files?.[0])} className="hidden" />
              </label>
            )}
            {error && <div className="mt-1 text-xs text-destructive">{error}</div>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => void handleSubmit()} disabled={!name.trim() || submitting || uploading}>
            {submitting ? 'Creating...' : 'Create Folder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
