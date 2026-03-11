interface LoadLayoutDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onLoad: (layoutId: string) => Promise<void>;
    context?: string;
}
export declare function LoadLayoutDialog({ open, onOpenChange, onLoad, context, }: LoadLayoutDialogProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=LoadLayoutDialog.d.ts.map