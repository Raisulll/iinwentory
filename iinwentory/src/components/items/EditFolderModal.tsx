import { useEffect, useState } from 'react';
import { Loader2, ImagePlus, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { apiUploadPhoto } from '../../lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface EditFolderModalProps {
  /** Folder ID being edited, or null when modal is closed. */
  folderId: string | null;
  onClose: () => void;
}

export default function EditFolderModal({ folderId, onClose }: EditFolderModalProps) {
  const store = useStore();
  const folder = folderId ? store.getFolderById(folderId) : null;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cover, setCover] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Re-populate state whenever the target folder changes (modal opens with a new id)
  useEffect(() => {
    if (!folder) return;
    setName(folder.name);
    setDescription(folder.description ?? '');
    setCover(folder.coverImage ?? null);
    setError(null);
  }, [folder?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = !!folderId && !!folder;

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

  const handleSave = async () => {
    if (!folderId || !name.trim() || saving) return;
    setSaving(true);
    try {
      await store.updateFolder(folderId, {
        name: name.trim(),
        description,
        coverImage: cover,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Folder</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="edit-folder-name">Folder Name *</Label>
            <Input id="edit-folder-name" value={name} onChange={e => setName(e.target.value)} autoFocus />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-folder-desc">Description</Label>
            <Textarea id="edit-folder-desc" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label>Cover Image</Label>
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
              <label className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent">
                {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
                {uploading ? 'Uploading…' : 'Upload Cover Image'}
                <input type="file" accept="image/*" onChange={e => void handleCoverUpload(e.target.files?.[0])} className="hidden" />
              </label>
            )}
            {error && <div className="mt-1 text-xs text-destructive">{error}</div>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => void handleSave()} disabled={!name.trim() || saving || uploading}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
