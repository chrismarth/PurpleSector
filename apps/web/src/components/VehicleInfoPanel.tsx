import { Car, Settings, Wrench, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface VehicleInfoPanelProps {
  vehicle?: {
    id: string;
    name: string;
    description?: string | null;
  } | null;
  configuration?: {
    id: string;
    name: string;
    description?: string | null;
    parts: string;
  } | null;
  setup?: {
    id: string;
    name: string;
    description?: string | null;
    parameters: string;
  } | null;
}

export function VehicleInfoPanel({ vehicle, configuration, setup }: VehicleInfoPanelProps) {
  if (!vehicle) {
    return null;
  }

  const configParts = configuration ? JSON.parse(configuration.parts) : {};
  const setupParams = setup ? JSON.parse(setup.parameters) : {};

  return (
    <Card>
      <div className="flex items-center px-4 py-2 border-b bg-muted/40">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Car className="h-4 w-4" />
          Vehicle Information
        </span>
      </div>
      <CardContent className="space-y-4">
        {/* Vehicle */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm text-muted-foreground">Vehicle</h4>
          </div>
          <div className="p-3 border rounded-lg">
            <p className="font-medium">{vehicle.name}</p>
            {vehicle.description && (
              <p className="text-sm text-muted-foreground mt-1">{vehicle.description}</p>
            )}
          </div>
        </div>

        {/* Configuration */}
        {configuration && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-sm text-muted-foreground flex items-center gap-1">
                <Settings className="h-4 w-4" />
                Configuration
              </h4>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1">
                    <Eye className="h-3 w-3" />
                    View
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{configuration.name}</DialogTitle>
                    <DialogDescription>
                      {configuration.description || 'Configuration details'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <h4 className="font-semibold">Parts</h4>
                    {Object.keys(configParts).length === 0 ? (
                      <p className="text-muted-foreground">No parts defined</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {Object.entries(configParts).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between p-2 border rounded">
                            <span className="text-sm font-medium">{key}</span>
                            <Badge variant="secondary" className="text-xs">{value as string}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="font-medium">{configuration.name}</p>
              {configuration.description && (
                <p className="text-sm text-muted-foreground mt-1">{configuration.description}</p>
              )}
              <div className="flex flex-wrap gap-1 mt-2">
                {Object.keys(configParts).slice(0, 3).map((key) => (
                  <Badge key={key} variant="outline" className="text-xs">
                    {key}
                  </Badge>
                ))}
                {Object.keys(configParts).length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{Object.keys(configParts).length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Setup */}
        {setup && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-sm text-muted-foreground flex items-center gap-1">
                <Wrench className="h-4 w-4" />
                Setup
              </h4>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1">
                    <Eye className="h-3 w-3" />
                    View
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{setup.name}</DialogTitle>
                    <DialogDescription>
                      {setup.description || 'Setup details'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <h4 className="font-semibold">Parameters</h4>
                    {Object.keys(setupParams).length === 0 ? (
                      <p className="text-muted-foreground">No parameters defined</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {Object.entries(setupParams).map(([key, value]) => {
                          // Handle both old format (string) and new format (object with value and units)
                          const displayValue = typeof value === 'object' && value !== null && 'value' in value
                            ? `${(value as any).value}${(value as any).units ? ' ' + (value as any).units : ''}`
                            : value as string;
                          
                          return (
                            <div key={key} className="flex items-center justify-between p-2 border rounded">
                              <span className="text-sm font-medium">{key}</span>
                              <Badge variant="secondary" className="text-xs">{displayValue}</Badge>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="p-3 border rounded-lg">
              <p className="font-medium">{setup.name}</p>
              {setup.description && (
                <p className="text-sm text-muted-foreground mt-1">{setup.description}</p>
              )}
              <div className="flex flex-wrap gap-1 mt-2">
                {Object.keys(setupParams).slice(0, 3).map((key) => (
                  <Badge key={key} variant="outline" className="text-xs">
                    {key}
                  </Badge>
                ))}
                {Object.keys(setupParams).length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{Object.keys(setupParams).length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
