import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MoreVertical, History as HistoryIcon, ArrowLeftRight, Tag,
  Download, Copy, Trash2, GitMerge,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface ItemActionMenuProps {
  itemId: string;
  size?: number;
  align?: 'left' | 'right';
  /** Visual style of the trigger button. `inline` is normal text colour, `overlay` is a glass pill for use on top of dark thumbnails. */
  variant?: 'inline' | 'overlay';
  /** Forward extra classes onto the wrapper (e.g. position helpers). */
  className?: string;
}

export default function ItemActionMenu({
  itemId,
  size = 16,
  align = 'right',
  variant = 'inline',
  className,
}: ItemActionMenuProps) {
  const { getItemById, addItem, deleteItem } = useStore();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const item = getItemById(itemId);

  const goToDetail = (params?: string) => () => {
    navigate(`/items/detail/${itemId}${params ? `?${params}` : ''}`);
  };

  const handleExport = () => {
    if (!item) return;
    const blob = new Blob([JSON.stringify(item, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.name.replace(/\s+/g, '_').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClone = async () => {
    if (!item) return;
    await addItem({
      name: `${item.name} (Copy)`,
      parentId: item.parentId,
      sku: item.sku,
      weight: item.weight,
      location: item.location,
      quantity: item.quantity,
      unit: item.unit,
      minLevel: item.minLevel,
      price: item.price,
      notes: item.notes,
      tags: item.tags,
      photos: item.photos,
    });
  };

  const handleDelete = async () => {
    if (!item) return;
    await deleteItem(itemId);
  };

  const triggerClass = cn(
    variant === 'inline' && [
      'inline-flex items-center justify-center rounded-md border transition-colors h-7 w-7',
      'border-transparent bg-transparent text-muted-foreground',
      'hover:border-border hover:bg-card hover:text-foreground',
      'data-[state=open]:border-border data-[state=open]:bg-card data-[state=open]:text-foreground',
    ],
    // Overlay styling lives in a plain CSS class (.iam-overlay-trigger) so it
    // isn't overridden by the unlayered `button` reset in index.css.
    variant === 'overlay' && 'iam-overlay-trigger',
  );

  return (
    <>
      <div
        className={cn('inline-flex', className)}
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={triggerClass} aria-label="Item actions">
              <MoreVertical size={size} strokeWidth={2.2} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={align === 'right' ? 'end' : 'start'} className="min-w-[184px]">
            <DropdownMenuItem onSelect={goToDetail('history=1')}>
              <HistoryIcon size={14} /> <span>History</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={goToDetail('transactions=1')}>
              <ArrowLeftRight size={14} /> <span>Transactions</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={goToDetail('qr=1')}>
              <Tag size={14} /> <span>Create Label</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleExport}>
              <Download size={14} /> <span>Export</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void handleClone()}>
              <Copy size={14} /> <span>Clone</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled
              onSelect={(e) => e.preventDefault()}
              title="Coming soon"
            >
              <GitMerge size={14} /> <span className="flex-1">Merge</span>
              <span className="rounded-full bg-muted px-1.5 py-[2px] text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">
                soon
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setConfirmDelete(true)}
            >
              <Trash2 size={14} /> <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{item?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The item and its history will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => void handleDelete()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
