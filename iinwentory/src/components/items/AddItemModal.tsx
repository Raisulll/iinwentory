import { useState } from 'react';
import { Loader2, ImagePlus, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../store/useAuthStore';
import { apiUploadPhoto } from '../../lib/api';
import CustomFieldsEditor from '../CustomFieldsEditor';
import { serializeCustomFields, type CustomField } from '../../lib/customFields';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AddItemModalProps {
  open: boolean;
  onClose: () => void;
  /** Folder to pre-select for new items. null = root ("All Items"). */
  currentFolderId: string | null;
  /** Pre-fill the SKU field (used by the Scanner's deep-link flow). */
  initialSku?: string;
}

const MAX_PHOTOS = 5;
const ROOT_SENTINEL = '__root__';

/**
 * Self-contained Add Item modal. Mount/unmount is controlled by the parent
 * via `open` — state resets each time the modal is opened.
 */
export default function AddItemModal({ open, onClose, currentFolderId, initialSku }: AddItemModalProps) {
  const store = useStore();
  const { plan } = useAuth();

  const [name, setName] = useState('');
  const [sku, setSku] = useState(initialSku ?? '');
  const [weight, setWeight] = useState('');
  const [location, setLocation] = useState('');
  const [qty, setQty] = useState('1');
  const [sellPrice, setSellPrice] = useState('0');
  const [costPrice, setCostPrice] = useState('');
  const [minLevel, setMinLevel] = useState('');
  const [notes, setNotes] = useState('');
  const [description, setDescription] = useState('');
  const [folderId, setFolderId] = useState<string | null>(currentFolderId);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handlePhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) return;
    const toUpload = Array.from(files).slice(0, room);
    setPhotoError(null);
    setPhotoUploading(true);
    try {
      const urls = await Promise.all(toUpload.map(f => apiUploadPhoto(f).then(r => r.url)));
      setPhotos(prev => [...prev, ...urls].slice(0, MAX_PHOTOS));
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      const weightValue = weight ? parseFloat(weight) : null;
      const item = await store.addItem({
        name: name.trim(),
        parentId: folderId,
        sku: sku.trim() || null,
        weight: weightValue !== null && !Number.isNaN(weightValue) ? weightValue : null,
        location: location.trim() || null,
        quantity: parseInt(qty) || 1,
        price: parseFloat(sellPrice) || 0,
        sellPrice: sellPrice ? (parseFloat(sellPrice) || 0) : null,
        costPrice: costPrice ? (parseFloat(costPrice) || 0) : null,
        minLevel: minLevel ? parseInt(minLevel) : null,
        notes,
        description: description.trim() || null,
        photos,
        customFields: customFields.length > 0
          ? serializeCustomFields(customFields, null)
          : undefined,
      });
      if (item) onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Item</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Photos */}
          <div>
            <Label className="mb-2 block">
              Photos <span className="font-normal text-muted-foreground">({photos.length}/{MAX_PHOTOS})</span>
            </Label>
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }}>
              {photos.map((url, idx) => (
                <div key={url} className="relative aspect-square overflow-hidden rounded-md border border-border">
                  <img src={url} alt={`Photo ${idx + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotos(prev => prev.filter((_, i) => i !== idx))}
                    title="Remove photo"
                    aria-label="Remove photo"
                    className="absolute right-1 top-1 inline-flex h-[22px] w-[22px] items-center justify-center rounded-full border-0 bg-destructive/90 text-white"
                  >
                    <X size={12} strokeWidth={2.4} />
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <label
                  className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-muted/50 text-[11px] font-semibold text-muted-foreground"
                  style={{ cursor: photoUploading ? 'wait' : 'pointer', opacity: photoUploading ? 0.6 : 1 }}
                >
                  {photoUploading
                    ? <Loader2 size={16} className="animate-spin" />
                    : <ImagePlus size={18} strokeWidth={1.8} />}
                  <span>{photoUploading ? 'Uploading…' : 'Add photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={photoUploading}
                    onChange={e => { void handlePhotos(e.target.files); e.target.value = ''; }}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            {photoError && <div className="mt-1.5 text-xs text-destructive">{photoError}</div>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="add-item-name">Item Name *</Label>
            <Input id="add-item-name" placeholder="e.g. Office Chair" value={name} onChange={e => setName(e.target.value)} autoFocus />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="add-item-desc">
              Description <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="add-item-desc"
              rows={2}
              placeholder="Brief details about the item…"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="add-item-sku">SKU / Product number</Label>
              <Input id="add-item-sku" placeholder="e.g. CHR-001" value={sku} onChange={e => setSku(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-item-loc">Location</Label>
              <Input id="add-item-loc" placeholder="e.g. Aisle 3, Shelf B" value={location} onChange={e => setLocation(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="grid gap-2">
              <Label htmlFor="add-item-qty">Quantity</Label>
              <Input id="add-item-qty" type="number" min="0" placeholder="1" value={qty} onChange={e => setQty(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-item-cost">
                Cost Price <span className="font-normal text-muted-foreground">(£ GBP)</span>
              </Label>
              <Input id="add-item-cost" type="number" min="0" step="0.01" placeholder="0.00" value={costPrice} onChange={e => setCostPrice(e.target.value)} title="What you paid — drives Total Value calculations" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-item-sell">
                Sell Price <span className="font-normal text-muted-foreground">(£ GBP)</span>
              </Label>
              <Input id="add-item-sell" type="number" min="0" step="0.01" placeholder="0.00" value={sellPrice} onChange={e => setSellPrice(e.target.value)} title="What you charge customers" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-item-weight">
                Weight <span className="font-normal text-muted-foreground">(kg)</span>
              </Label>
              <Input id="add-item-weight" type="number" min="0" step="0.01" placeholder="0.0" value={weight} onChange={e => setWeight(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Folder</Label>
            <Select
              value={folderId ?? ROOT_SENTINEL}
              onValueChange={(v) => setFolderId(v === ROOT_SENTINEL ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose folder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ROOT_SENTINEL}>All Items (no folder)</SelectItem>
                {store.folders.map(f => {
                  const path = store.getFolderPath(f.id).map(p => p.name).join(' / ');
                  return <SelectItem key={f.id} value={f.id}>{path}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="add-item-min">
              Min Stock Level <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input id="add-item-min" type="number" min="0" placeholder="Alert when stock falls to this level" value={minLevel} onChange={e => setMinLevel(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="add-item-notes">
              Notes <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="add-item-notes"
              rows={2}
              placeholder="Anything else worth remembering…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Custom Fields</Label>
            <CustomFieldsEditor
              fields={customFields}
              onChange={setCustomFields}
              max={plan.customFields === Infinity ? undefined : plan.customFields}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={!name.trim() || submitting}
          >
            {submitting ? 'Adding...' : 'Add Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
