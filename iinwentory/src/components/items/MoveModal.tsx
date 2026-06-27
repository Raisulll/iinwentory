import { useEffect, useState } from 'react';
import { Folder, FolderOpen } from 'lucide-react';
import { useStore } from '../../store/useStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface MoveTarget {
  id: string;
  type: 'item' | 'folder';
}

interface MoveModalProps {
  open: boolean;
  onClose: () => void;
  /** What's being moved. */
  target: MoveTarget | null;
}

export default function MoveModal({ open, onClose, target }: MoveModalProps) {
  const store = useStore();
  const [destination, setDestination] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !target) return;
    const currentParent = target.type === 'item'
      ? (store.getItemById(target.id)?.parentId ?? null)
      : (store.getFolderById(target.id)?.parentId ?? null);
    setDestination(currentParent);
  }, [open, target, store]);

  const handleMove = () => {
    if (!target) return;
    if (target.type === 'folder') void store.updateFolder(target.id, { parentId: destination });
    else void store.updateItem(target.id, { parentId: destination });
    onClose();
  };

  return (
    <Dialog open={open && !!target} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move to folder</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[300px] rounded-md border border-border">
          <div className="flex flex-col gap-1 p-3">
            <label
              className={cn(
                'flex cursor-pointer items-center gap-2.5 rounded-md p-2',
                destination === null ? 'bg-accent' : 'hover:bg-muted',
              )}
            >
              <input
                type="radio"
                name="folder"
                checked={destination === null}
                onChange={() => setDestination(null)}
                className="accent-primary"
              />
              <FolderOpen size={16} className="text-muted-foreground" /> (Root) All Items
            </label>
            {store.folders.map(f => (
              <label
                key={f.id}
                className={cn(
                  'flex cursor-pointer items-center gap-2.5 rounded-md p-2',
                  destination === f.id ? 'bg-accent' : 'hover:bg-muted',
                )}
              >
                <input
                  type="radio"
                  name="folder"
                  checked={destination === f.id}
                  onChange={() => setDestination(f.id)}
                  className="accent-primary"
                />
                <Folder size={16} style={{ color: f.color }} /> {f.name}
              </label>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>CANCEL</Button>
          <Button onClick={handleMove}>MOVE</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
