interface SaveLayoutDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (name: string, description?: string) => Promise<void>;
}
export declare function SaveLayoutDialog({ open, onOpenChange, onSave, }: SaveLayoutDialogProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=SaveLayoutDialog.d.ts.map