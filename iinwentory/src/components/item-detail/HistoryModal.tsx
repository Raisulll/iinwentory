import { Clock } from 'lucide-react';
import type { ActivityLogEntry, TeamMember } from '../../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HistoryModalProps {
  open: boolean;
  onClose: () => void;
  history: ReadonlyArray<ActivityLogEntry>;
  members: ReadonlyArray<TeamMember>;
  canSeeAuthor: boolean;
  /** Stringifier for one entry's user-facing message. */
  formatEntry: (action: string, details: unknown, entityName: string) => string;
}

export default function HistoryModal({ open, onClose, history, members, canSeeAuthor, formatEntry }: HistoryModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock size={18} /> Change History ({history.length})
          </DialogTitle>
        </DialogHeader>

        {history.length === 0 ? (
          <p className="mt-3 text-[13px] text-muted-foreground">No changes yet.</p>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="flex flex-col gap-1.5">
              {history.map(h => {
                const memberName = h.userId ? (members.find(m => m.id === h.userId)?.name ?? 'Member') : 'System';
                return (
                  <div
                    key={h.id}
                    className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-[13px]"
                  >
                    <span>
                      {formatEntry(h.action, h.details, h.entityName)}
                      {canSeeAuthor && (
                        <span className="ml-1.5 text-muted-foreground">
                          · by <b className="text-foreground">{memberName}</b>
                        </span>
                      )}
                    </span>
                    <span className="ml-3 whitespace-nowrap text-[11px] text-muted-foreground">
                      {new Date(h.timestamp).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
