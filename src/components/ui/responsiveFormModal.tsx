import { ReactNode } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/useMobile';

interface ResponsiveFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}

export function ResponsiveFormModal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: ResponsiveFormModalProps) {
  const isMobile = useIsMobile();
  const preventOpenAutoFocus = (event: Event) => {
    event.preventDefault();
  };

  if (isMobile) {
    return (
      // `repositionInputs={false}` disables Vaul's translate-the-whole-
      // drawer-up-by-keyboard-height heuristic, which overshoots on iOS
      // Safari for tall drawers and parks the focused field above the
      // viewport. Letting Safari's native scroll-into-view handle it
      // only shifts the inner scroll container — no drawer transform,
      // no exposed page background above the drawer.
      <Drawer open={open} onOpenChange={onOpenChange} repositionInputs={false}>
        <DrawerContent
          className="flex h-[92vh] flex-col overflow-hidden px-4 pb-4"
          onOpenAutoFocus={preventOpenAutoFocus}
        >
          <DrawerHeader className="border-b pb-3 text-left">
            <DrawerTitle>{title}</DrawerTitle>
            {description ? <DrawerDescription>{description}</DrawerDescription> : null}
          </DrawerHeader>
          {children}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-auto max-h-[85vh] w-[calc(100vw-1rem)] max-w-[680px] flex-col overflow-hidden p-6"
        onOpenAutoFocus={preventOpenAutoFocus}
      >
        <DialogHeader className="border-b px-4 pb-4 text-left">
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
