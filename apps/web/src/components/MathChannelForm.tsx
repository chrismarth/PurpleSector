'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RAW_CHANNELS,
  MathTelemetryChannel,
  MathChannelInput,
} from '@purplesector/telemetry';
import { parse } from 'mathjs';
import { ExpressionEditor } from './ExpressionEditor';

interface MathChannelFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel?: MathTelemetryChannel | null;
  onSave: (channel: MathTelemetryChannel) => void;
  embedded?: boolean; // If true, render without dialog wrapper
}

export function MathChannelForm({
  open,
  onOpenChange,
  channel,
  onSave,
  embedded = false,
}: MathChannelFormProps) {
  const [id, setId] = useState('');
  const [label, setLabel] = useState('');
  const [unit, setUnit] = useState('');
  const [expression, setExpression] = useState('');
  const [inputs, setInputs] = useState<MathChannelInput[]>([]);
  const [comment, setComment] = useState('');
  const [expressionError, setExpressionError] = useState<string | null>(null);

  // Initialize form when channel changes
  useEffect(() => {
    if (channel) {
      setId(channel.id);
      setLabel(channel.label);
      setUnit(channel.unit);
      setExpression(channel.expression);
      setInputs([...channel.inputs]);
      setComment(channel.comment || '');
    } else {
      // New channel
      setId(`math_${Date.now()}`);
      setLabel('');
      setUnit('');
      setExpression('');
      setInputs([]);
      setComment('');
    }
    setExpressionError(null);
  }, [channel, open]);

  // Generate a unique variable name from channel name
  const generateAlias = (channelId: string): string => {
    const channel = RAW_CHANNELS.find((ch) => ch.id === channelId);
    if (!channel) return `var${inputs.length + 1}`;

    // Convert channel label to camelCase variable name
    let baseName = channel.label
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special chars
      .split(/\s+/) // Split on whitespace
      .filter(Boolean)
      .map((word, i) => (i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
      .join('');

    // Ensure it starts with a letter
    if (!/^[a-z]/.test(baseName)) {
      baseName = 'var' + baseName;
    }

    // Make it unique
    let alias = baseName;
    let counter = 1;
    while (inputs.some((input) => input.alias === alias)) {
      alias = `${baseName}${counter}`;
      counter++;
    }

    return alias;
  };

  const handleAddInput = () => {
    setInputs([
      ...inputs,
      {
        channelId: '',
        alias: '',
      },
    ]);
  };

  const handleRemoveInput = (index: number) => {
    setInputs(inputs.filter((_, i) => i !== index));
  };

  const handleInputChange = (
    index: number,
    field: keyof MathChannelInput,
    value: string
  ) => {
    setInputs(
      inputs.map((input, i) => {
        if (i !== index) return input;
        
        // If changing channel, regenerate alias
        if (field === 'channelId') {
          return {
            channelId: value,
            alias: generateAlias(value),
          };
        }
        
        return { ...input, [field]: value };
      })
    );
  };

  // Validate when component mounts or channel changes (for editing existing channels)
  useEffect(() => {
    if (channel && expression.trim() && inputs.length > 0) {
      validateExpression();
    }
  }, [channel?.id]); // Only run when channel ID changes (i.e., when editing a different channel)

  const validateExpression = (): boolean => {
    if (!expression.trim()) {
      setExpressionError('Expression is required');
      return false;
    }

    // Check that all input aliases are valid identifiers
    for (const input of inputs) {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(input.alias)) {
        setExpressionError(
          `Invalid alias "${input.alias}". Must be a valid identifier (letters, numbers, underscore).`
        );
        return false;
      }
    }

    // Check for duplicate aliases
    const aliasSet = new Set<string>();
    for (const input of inputs) {
      if (aliasSet.has(input.alias)) {
        setExpressionError(`Duplicate alias "${input.alias}". Each variable must be unique.`);
        return false;
      }
      aliasSet.add(input.alias);
    }

    // Validate syntax using mathjs parser
    try {
      const node = parse(expression);
      
      // Check for undefined variables
      const definedVars = new Set(inputs.map((i) => i.alias));
      const usedVars = new Set<string>();
      const functionNames = new Set<string>();
      
      // First pass: collect all function names
      node.traverse((node: any) => {
        if (node.type === 'FunctionNode') {
          functionNames.add(node.fn.name || node.fn);
        }
      });
      
      // Second pass: collect symbols that are NOT function names
      node.traverse((node: any) => {
        if (node.type === 'SymbolNode' && 
            !node.name.match(/^(e|pi|true|false|i|Infinity|NaN)$/) &&
            !functionNames.has(node.name)) {
          usedVars.add(node.name);
        }
      });
      
      const undefinedVars = Array.from(usedVars).filter((v) => !definedVars.has(v));
      if (undefinedVars.length > 0) {
        setExpressionError(`Undefined variable(s): ${undefinedVars.join(', ')}`);
        return false;
      }
      
      // Test evaluation with sample values to catch potential runtime errors
      const scope: Record<string, number> = {};
      inputs.forEach((input) => {
        scope[input.alias] = 1; // Use 1 as test value
      });
      
      const compiled = node.compile();
      const result = compiled.evaluate(scope);
      
      // Check for invalid results
      if (typeof result !== 'number') {
        setExpressionError('Expression must evaluate to a number');
        return false;
      }
      
      if (!isFinite(result)) {
        setExpressionError('Expression produces infinite or invalid values. Check for division by zero.');
        return false;
      }
      
    } catch (error: any) {
      setExpressionError(`Syntax error: ${error.message || 'Invalid expression'}`);
      return false;
    }

    setExpressionError(null);
    return true;
  };

  const handleSave = (asDraft: boolean = false) => {
    if (!label.trim()) {
      alert('Please enter a channel name');
      return;
    }

    // If not saving as draft, validate the expression
    const isValid = asDraft ? false : validateExpression();
    if (!asDraft && !isValid) {
      return;
    }

    const mathChannel: MathTelemetryChannel = {
      id,
      label: label.trim(),
      unit: unit.trim(),
      kind: 'math',
      isTimeAxis: false,
      expression: expression.trim(),
      inputs,
      validated: isValid,
      comment: comment.trim() || undefined,
    };

    onSave(mathChannel);
  };

  // Check if the current expression would be valid (for button state)
  // Use useMemo to prevent infinite re-renders - don't call validateExpression during render
  const isExpressionValid = useMemo(() => {
    if (!label.trim() || !expression.trim() || inputs.length === 0) {
      return false;
    }
    
    // Perform validation without side effects (don't call setExpressionError)
    try {
      const node = parse(expression);
      const definedVars = new Set(inputs.map((i) => i.alias));
      const usedVars = new Set<string>();
      const functionNames = new Set<string>();
      
      node.traverse((node: any) => {
        if (node.type === 'FunctionNode') {
          functionNames.add(node.fn.name || node.fn);
        }
      });
      
      node.traverse((node: any) => {
        if (node.type === 'SymbolNode' && 
            !node.name.match(/^(e|pi|true|false|i|Infinity|NaN)$/) &&
            !functionNames.has(node.name)) {
          usedVars.add(node.name);
        }
      });
      
      const undefinedVars = Array.from(usedVars).filter((v) => !definedVars.has(v));
      return undefinedVars.length === 0;
    } catch (error) {
      return false;
    }
  }, [label, expression, inputs]);

  const formContent = (
    <div className="space-y-6">
          {/* Name and Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Channel Name</Label>
              <Input
                id="name"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g., Brake Bias"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g., %"
              />
            </div>
          </div>

          {/* Comment/Description */}
          <div className="space-y-2">
            <Label htmlFor="comment">Description (Optional)</Label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add notes or documentation about this channel..."
              className="w-full min-h-[60px] px-3 py-2 text-sm rounded-md border border-input bg-background resize-y"
              rows={2}
            />
          </div>

          {/* Input Channels */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Input Channels</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddInput}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Input
              </Button>
            </div>

            {inputs.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                No inputs defined. Add at least one input channel.
              </div>
            ) : (
              <div className="space-y-2">
                {inputs.map((input, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30"
                  >
                    <div className="flex-1">
                      <Select
                        value={input.channelId}
                        onValueChange={(value) =>
                          handleInputChange(index, 'channelId', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RAW_CHANNELS.map((ch) => (
                            <SelectItem key={ch.id} value={ch.id}>
                              {ch.label} ({ch.unit || 'no unit'})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-32">
                      <Input
                        value={input.alias}
                        onChange={(e) =>
                          handleInputChange(index, 'alias', e.target.value)
                        }
                        placeholder="Variable"
                        className="font-mono text-sm"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveInput(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Expression */}
          <div className="space-y-2">
            <Label htmlFor="expression">Expression</Label>
            <ExpressionEditor
              value={expression}
              onChange={setExpression}
              onBlur={validateExpression}
              variables={inputs.map((input) => input.alias)}
              height="120px"
              placeholder="e.g., rear / (front + rear) * 100"
            />
            {expressionError && (
              <p className="text-sm text-destructive">{expressionError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Available functions: min, max, abs, sqrt, pow, sin, cos, tan, derivative, integral, etc.
              <br />
              Use the variable names defined above in your expression. Press Ctrl+Space for autocomplete.
              <br />
              <strong>Examples:</strong> <code>derivative(throttle)</code> for throttle rate, <code>integral(speed)</code> for distance
              <br />
              <a 
                href="https://mathjs.org/docs/reference/functions.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                View all available functions →
              </a>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            {!embedded && (
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            )}
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={() => handleSave(true)}
                    disabled={isExpressionValid}
                  >
                    Save as Draft
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">{isExpressionValid ? "Expression is valid - use Create/Update button" : "Save without validation (work in progress)"}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button onClick={() => handleSave(false)}>
              {channel ? 'Update' : 'Create'} Channel
            </Button>
          </div>
    </div>
  );

  if (embedded) {
    return formContent;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {channel ? 'Edit Math Channel' : 'Create Math Channel'}
          </DialogTitle>
          <DialogDescription>
            Define a derived channel using a mathematical expression
          </DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
