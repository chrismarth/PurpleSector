'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  Check,
  Info,
  Layers,
  Loader2,
  Pencil,
  Sliders,
  Upload,
  User,
  UserCog,
} from 'lucide-react';

import { useAuth } from '@/components/AuthProvider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { getLoadedPlugins } from '@/plugins';
import { AvatarCropDialog } from '@/components/settings/AvatarCropDialog';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type VersionInfo = {
  frontend: { name: string; version: string };
  backend: { name: string; version: string };
  runtime: { node: string; env: string };
};

const DEFAULT_AVATARS = [
  { id: 'helmet-red', src: '/images/avatars/helmet-red.svg', label: 'Red Helmet' },
  { id: 'helmet-blue', src: '/images/avatars/helmet-blue.svg', label: 'Blue Helmet' },
  { id: 'helmet-green', src: '/images/avatars/helmet-green.svg', label: 'Green Helmet' },
  { id: 'helmet-purple', src: '/images/avatars/helmet-purple.svg', label: 'Purple Helmet' },
  { id: 'helmet-orange', src: '/images/avatars/helmet-orange.svg', label: 'Orange Helmet' },
  { id: 'helmet-yellow', src: '/images/avatars/helmet-yellow.svg', label: 'Yellow Helmet' },
  { id: 'helmet-white', src: '/images/avatars/helmet-white.svg', label: 'White Helmet' },
  { id: 'helmet-black', src: '/images/avatars/helmet-black.svg', label: 'Black Helmet' },
];

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { user, refresh } = useAuth();
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);

  // Profile state
  const [fullName, setFullName] = useState('');
  const [fullNameTouched, setFullNameTouched] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fullNameError = fullNameTouched && fullName.trim().length === 0
    ? 'Full name is required'
    : null;

  // Sync local state when dialog opens or user changes
  useEffect(() => {
    if (open && user) {
      setFullName(user.fullName || '');
      setSelectedAvatar(user.avatarUrl);
      setProfileSaved(false);
      setFullNameTouched(false);
    }
  }, [open, user]);

  // Fetch version info
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as VersionInfo;
        if (!cancelled) setVersionInfo(data);
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const saveProfile = useCallback(async () => {
    setSavingProfile(true);
    setProfileSaved(false);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, avatarUrl: selectedAvatar }),
      });
      if (res.ok) {
        await refresh();
        setProfileSaved(true);
        setTimeout(() => setProfileSaved(false), 2000);
      }
    } catch {
      // ignore
    } finally {
      setSavingProfile(false);
    }
  }, [fullName, selectedAvatar, refresh]);

  const handleFileSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Create a local object URL for the crop dialog
    const url = URL.createObjectURL(file);
    setCropImageSrc(url);
    // Reset file input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleCropConfirm = useCallback(
    async (croppedBlob: Blob) => {
      setCropImageSrc(null);
      setUploadingAvatar(true);
      try {
        const formData = new FormData();
        formData.append('file', new File([croppedBlob], 'avatar.png', { type: 'image/png' }));

        const res = await fetch('/api/user/avatar', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          setSelectedAvatar(data.avatarUrl);
          await refresh();
        }
      } catch {
        // ignore
      } finally {
        setUploadingAvatar(false);
      }
    },
    [refresh],
  );

  const handleCropClose = useCallback(() => {
    if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
    setCropImageSrc(null);
  }, [cropImageSrc]);

  const plugins = getLoadedPlugins();

  const isFullNameValid = fullName.trim().length > 0;
  const hasProfileChanges =
    user && (fullName !== user.fullName || selectedAvatar !== user.avatarUrl);

  return (
    <>
    {cropImageSrc && (
      <AvatarCropDialog
        open
        imageSrc={cropImageSrc}
        onClose={handleCropClose}
        onConfirm={handleCropConfirm}
      />
    )}
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-12 gap-4">
          <Tabs defaultValue="profile" className="col-span-12">
            <div className="grid grid-cols-12 gap-4">
              <TabsList className="col-span-4 h-auto flex flex-col items-stretch justify-start bg-transparent p-0">
                <TabsTrigger value="profile" className="justify-start gap-2">
                  <User className="h-4 w-4" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="account" className="justify-start gap-2">
                  <UserCog className="h-4 w-4" />
                  Account
                </TabsTrigger>
                <TabsTrigger value="general" className="justify-start gap-2">
                  <Sliders className="h-4 w-4" />
                  General Settings
                </TabsTrigger>
                <TabsTrigger value="extensions" className="justify-start gap-2">
                  <Layers className="h-4 w-4" />
                  Extensions
                </TabsTrigger>
                <TabsTrigger value="about" className="justify-start gap-2">
                  <Info className="h-4 w-4" />
                  About
                </TabsTrigger>
              </TabsList>

              <div className="col-span-8 border rounded-md">
                <ScrollArea className="h-[60vh]">
                  <div className="p-5">
                  {/* ── Profile ── */}
                  <TabsContent value="profile" className="m-0">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full name</Label>
                        <Input
                          id="fullName"
                          value={fullName}
                          onChange={(e) => { setFullName(e.target.value); setFullNameTouched(true); }}
                          onBlur={() => setFullNameTouched(true)}
                          placeholder="Enter your full name"
                          className={`max-w-xs ${fullNameError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                        />
                        {fullNameError && (
                          <p className="text-xs text-destructive">{fullNameError}</p>
                        )}
                      </div>

                      <div className="space-y-3">
                        <Label>Avatar</Label>

                        {/* Current avatar preview */}
                        <div className="flex items-center gap-4">
                          <div className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-border bg-muted flex items-center justify-center">
                            {selectedAvatar ? (
                              <Image
                                src={selectedAvatar}
                                alt="Avatar"
                                width={64}
                                height={64}
                                className="object-cover"
                              />
                            ) : (
                              <User className="h-8 w-8 text-muted-foreground" />
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {selectedAvatar
                              ? 'Your current avatar'
                              : 'No avatar set — choose one below or upload your own'}
                          </div>
                        </div>

                        {/* Default avatar grid */}
                        <div className="grid grid-cols-4 gap-2">
                          {DEFAULT_AVATARS.map((avatar) => (
                            <button
                              key={avatar.id}
                              type="button"
                              onClick={() => setSelectedAvatar(avatar.src)}
                              className={`relative rounded-lg border-2 p-1 transition-colors hover:border-primary ${
                                selectedAvatar === avatar.src
                                  ? 'border-primary bg-primary/10'
                                  : 'border-transparent'
                              }`}
                              title={avatar.label}
                            >
                              <Image
                                src={avatar.src}
                                alt={avatar.label}
                                width={64}
                                height={64}
                                className="rounded-md"
                              />
                              {selectedAvatar === avatar.src && (
                                <div className="absolute top-0 right-0 rounded-full bg-primary p-0.5">
                                  <Check className="h-3 w-3 text-primary-foreground" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>

                        {/* Upload custom */}
                        <div className="flex items-center gap-2">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/svg+xml"
                            className="hidden"
                            onChange={handleFileSelected}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingAvatar}
                          >
                            {uploadingAvatar ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="mr-2 h-4 w-4" />
                            )}
                            Upload custom image
                          </Button>
                          {selectedAvatar && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedAvatar(null)}
                            >
                              Remove avatar
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Save button */}
                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          onClick={saveProfile}
                          disabled={savingProfile || !hasProfileChanges || !isFullNameValid}
                        >
                          {savingProfile ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : profileSaved ? (
                            <Check className="mr-2 h-4 w-4" />
                          ) : (
                            <Pencil className="mr-2 h-4 w-4" />
                          )}
                          {profileSaved ? 'Saved' : 'Save profile'}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  {/* ── Account ── */}
                  <TabsContent value="account" className="m-0">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label>Username</Label>
                        <div className="text-sm font-mono bg-muted px-3 py-2 rounded-md w-fit">
                          {user?.username ?? '—'}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Password</Label>
                        <div className="text-sm font-mono bg-muted px-3 py-2 rounded-md w-fit tracking-widest">
                          ••••••••
                        </div>
                        <div className="flex items-center gap-3 pt-1">
                          <Button variant="outline" size="sm" disabled>
                            Reset password
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            Available when an authentication provider is configured.
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Role</Label>
                        <div>
                          <Badge variant={user?.role === 'ORG_ADMIN' ? 'default' : 'secondary'}>
                            {user?.role === 'ORG_ADMIN' ? 'Admin' : 'User'}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm font-medium mt-6">Subscription</div>
                        <div className="text-sm text-muted-foreground">(placeholder)</div>
                        <div className="text-sm font-medium mt-6">Organization & Groups</div>
                        <div className="text-sm text-muted-foreground">(placeholder — create org/groups + invites for admins)</div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* ── General Settings ── */}
                  <TabsContent value="general" className="m-0">
                    <div className="space-y-4">
                      <div className="text-sm font-medium">Theme</div>
                      <ThemeToggle />
                      <div className="text-sm font-medium mt-6">Other settings</div>
                      <div className="text-sm text-muted-foreground">(placeholder)</div>
                    </div>
                  </TabsContent>

                  {/* ── Extensions ── */}
                  <TabsContent value="extensions" className="m-0">
                    <div className="space-y-4">
                      <div className="text-sm font-medium">Installed extensions</div>
                      {plugins.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No extensions installed.</div>
                      ) : (
                        <div className="space-y-3">
                          {plugins.map((plugin) => (
                            <div
                              key={plugin.id}
                              className="border rounded-lg p-4 space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-sm">{plugin.name}</div>
                                <Badge variant="outline" className="text-xs font-mono">
                                  v{plugin.version}
                                </Badge>
                              </div>
                              {plugin.description && (
                                <div className="text-sm text-muted-foreground">
                                  {plugin.description}
                                </div>
                              )}
                              <div className="flex gap-1 pt-1">
                                {plugin.capabilities.map((cap) => (
                                  <Badge key={cap} variant="secondary" className="text-xs">
                                    {cap}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="text-sm font-medium mt-6">Search registry</div>
                      <div className="text-sm text-muted-foreground">(placeholder)</div>
                    </div>
                  </TabsContent>

                  {/* ── About ── */}
                  <TabsContent value="about" className="m-0">
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Versions</div>
                      {versionInfo ? (
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>
                            Frontend: {versionInfo.frontend.name} {versionInfo.frontend.version}
                          </div>
                          <div>
                            Backend: {versionInfo.backend.name} {versionInfo.backend.version}
                          </div>
                          <div>
                            Runtime: Node {versionInfo.runtime.node} ({versionInfo.runtime.env})
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">Loading...</div>
                      )}
                      <div className="text-sm font-medium mt-6">Legal</div>
                      <div className="text-sm text-muted-foreground">(placeholder OSS licenses / terms)</div>
                    </div>
                  </TabsContent>
                  </div>
                </ScrollArea>
              </div>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
