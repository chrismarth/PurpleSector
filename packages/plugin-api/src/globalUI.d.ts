import type * as React from 'react';
export interface GlobalPanelRegistration {
    id: string;
    position: 'sidebar-right' | 'sidebar-left' | 'drawer-bottom';
    icon: React.ComponentType<{
        className?: string;
    }>;
    label: string;
    render: () => React.ReactElement;
}
export interface SettingsTabRegistration {
    id: string;
    label: string;
    icon: React.ComponentType<{
        className?: string;
    }>;
    order?: number;
    render: () => React.ReactElement;
}
export interface TabDescriptor {
    id: string;
    type: string;
    label: string;
    breadcrumbs: string[];
    entityId?: string;
    parentIds?: Record<string, string>;
    closable?: boolean;
}
export interface NavTreeContext {
    openTab: (tab: TabDescriptor) => void;
    refreshNav: () => void;
}
export interface NavTabRegistration {
    id: string;
    label: string;
    icon: React.ComponentType<{
        className?: string;
    }>;
    order: number;
    disabled?: boolean;
    renderTree: (ctx: NavTreeContext) => React.ReactElement;
}
export interface ContentTabRegistration {
    type: string;
    render: (props: {
        entityId?: string;
        parentIds?: Record<string, string>;
    }) => React.ReactElement;
}
export interface ToolbarItemRegistration {
    id: string;
    icon: React.ComponentType<{
        className?: string;
    }>;
    label: string;
    position: 'top' | 'bottom';
    order: number;
    onClick?: (ctx: {
        openTab: (tab: TabDescriptor) => void;
    }) => void;
    renderPanel?: () => React.ReactElement;
}
//# sourceMappingURL=globalUI.d.ts.map