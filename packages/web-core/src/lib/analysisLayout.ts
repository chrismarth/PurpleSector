export interface AnalysisPanelCell {
  id: string;
  x: number; // column index (0-based)
  y: number; // row index (0-based)
  colSpan: number;
  rowSpan: number;
  typeId: string | null;
  providerId?: string;
  title?: string;
  minHeight?: number;
  maxHeight?: number;
  state?: unknown;
}

export interface AnalysisLayoutJSON {
  version: 1;
  cols: number;
  panels: AnalysisPanelCell[];
}

/**
 * Default analysis layout used by both live sessions and archived laps when no
 * saved layout exists.  Panels carry their initial channel configuration in the
 * `state` field so the registered provider can render the correct channels.
 *
 * This is intentionally generic — it references the 'plot' panel type id which
 * is registered by whatever plugin provides telemetry plotting.
 */
export const DEFAULT_ANALYSIS_LAYOUT: AnalysisLayoutJSON = {
  version: 1,
  cols: 12,
  panels: [
    {
      id: 'default-throttle-brake',
      typeId: 'plot',
      x: 0,
      y: 0,
      colSpan: 12,
      rowSpan: 1,
      state: {
        id: 'throttle-brake',
        title: 'Throttle & Brake',
        xAxis: 'time',
        xAxisLabel: 'Time (s)',
        yAxisLabel: 'Input (%)',
        yAxisLabelSecondary: '',
        channels: [
          { id: 'throttle-1', channelId: 'throttle', color: '#10b981' },
          { id: 'brake-1', channelId: 'brake', color: '#ef4444' },
        ],
      },
    },
    {
      id: 'default-steering',
      typeId: 'plot',
      x: 0,
      y: 1,
      colSpan: 12,
      rowSpan: 1,
      state: {
        id: 'steering',
        title: 'Steering Input',
        xAxis: 'time',
        xAxisLabel: 'Time (s)',
        yAxisLabel: 'Steering (%)',
        yAxisLabelSecondary: '',
        channels: [
          { id: 'steering-1', channelId: 'steering', color: '#8b5cf6' },
        ],
      },
    },
    {
      id: 'default-speed',
      typeId: 'plot',
      x: 0,
      y: 2,
      colSpan: 12,
      rowSpan: 1,
      state: {
        id: 'speed',
        title: 'Speed',
        xAxis: 'time',
        xAxisLabel: 'Time (s)',
        yAxisLabel: 'Speed (km/h)',
        yAxisLabelSecondary: '',
        channels: [
          { id: 'speed-1', channelId: 'speed', color: '#3b82f6' },
        ],
      },
    },
  ],
};

// Row operations
export function insertRowBelow(layout: AnalysisLayoutJSON, r: number): AnalysisLayoutJSON {
  const panels = layout.panels.map((p) => ({ ...p }));
  for (const p of panels) {
    if (p.y > r) {
      p.y += 1;
    }
  }
  return { ...layout, panels };
}

export function insertRowAbove(layout: AnalysisLayoutJSON, r: number): AnalysisLayoutJSON {
  const panels = layout.panels.map((p) => ({ ...p }));
  for (const p of panels) {
    if (p.y >= r) {
      p.y += 1;
    }
  }
  return { ...layout, panels };
}

export function removeRow(layout: AnalysisLayoutJSON, r: number): AnalysisLayoutJSON {
  const kept: AnalysisPanelCell[] = [];

  for (const p of layout.panels) {
    const start = p.y;
    const end = p.y + p.rowSpan - 1;

    if (start === r && end === r) {
      // panel lies entirely in this row: drop it
      continue;
    }

    const clone = { ...p };

    if (start <= r && r <= end) {
      // spans across removed row: shrink
      clone.rowSpan -= 1;
      if (clone.rowSpan < 1) {
        continue;
      }
    }

    kept.push(clone);
  }

  for (const p of kept) {
    if (p.y > r) {
      p.y -= 1;
    }
  }

  return { ...layout, panels: kept };
}

// Column operations
export function insertColumnRight(layout: AnalysisLayoutJSON, c: number): AnalysisLayoutJSON {
  const panels = layout.panels.map((p) => ({ ...p }));
  for (const p of panels) {
    if (p.x > c) {
      p.x += 1;
    }
  }
  return { ...layout, cols: layout.cols + 1, panels };
}

export function insertColumnLeft(layout: AnalysisLayoutJSON, c: number): AnalysisLayoutJSON {
  const panels = layout.panels.map((p) => ({ ...p }));
  for (const p of panels) {
    if (p.x >= c) {
      p.x += 1;
    }
  }
  return { ...layout, cols: layout.cols + 1, panels };
}

export function removeColumn(layout: AnalysisLayoutJSON, c: number): AnalysisLayoutJSON {
  const kept: AnalysisPanelCell[] = [];

  for (const p of layout.panels) {
    const start = p.x;
    const end = p.x + p.colSpan - 1;

    if (start === c && end === c) {
      // panel lies entirely in this column: drop it
      continue;
    }

    const clone = { ...p };

    if (start <= c && c <= end) {
      // spans across removed column: shrink
      clone.colSpan -= 1;
      if (clone.colSpan < 1) {
        continue;
      }
    }

    kept.push(clone);
  }

  for (const p of kept) {
    if (p.x > c) {
      p.x -= 1;
    }
  }

  return { ...layout, cols: layout.cols - 1, panels: kept };
}

// Panel-local helpers
export function splitColumn(layout: AnalysisLayoutJSON, panelId: string): AnalysisLayoutJSON {
  const panels = [...layout.panels];
  const idx = panels.findIndex((p) => p.id === panelId);
  if (idx === -1) return layout;
  const p = panels[idx];
  if (p.colSpan < 2) return layout;

  const leftSpan = Math.floor(p.colSpan / 2);
  const rightSpan = p.colSpan - leftSpan;

  const left: AnalysisPanelCell = { ...p, colSpan: leftSpan };
  const right: AnalysisPanelCell = {
    ...p,
    id: `${p.id}-split-${Date.now()}`,
    x: p.x + leftSpan,
    colSpan: rightSpan,
    // New split starts as a blank analysis slot
    typeId: null,
    state: undefined,
  };

  panels.splice(idx, 1, left, right);
  return { ...layout, panels };
}

export function splitRow(layout: AnalysisLayoutJSON, panelId: string): AnalysisLayoutJSON {
  const panels = [...layout.panels];
  const idx = panels.findIndex((p) => p.id === panelId);
  if (idx === -1) return layout;
  const p = panels[idx];
  if (p.rowSpan < 2) {
    // For single-row panels, insert a new row directly below and create a new blank panel
    // in the same column region as the original. Panels that share this row but do NOT
    // overlap horizontally with the split panel are extended to span the new row, so the
    // visual result is: one tall region on one side and two half-height regions on the
    // other side.

    const base = insertRowBelow(layout, p.y);
    const splitColStart = p.x;
    const splitColEnd = p.x + p.colSpan - 1;

    const updatedPanels = base.panels.map((panel) => {
      if (panel.id === p.id) {
        // The original panel stays in the top row with the same span.
        return panel;
      }

      const rowStart = panel.y;
      const rowEnd = panel.y + panel.rowSpan - 1;

      // Only consider panels that intersect the split row.
      if (rowStart <= p.y && rowEnd >= p.y) {
        const colStart = panel.x;
        const colEnd = panel.x + panel.colSpan - 1;
        const overlapsHorizontally = !(colEnd < splitColStart || colStart > splitColEnd);

        // If the panel shares the row but does not overlap the split panel horizontally,
        // extend it to span the new row as well.
        if (!overlapsHorizontally) {
          return { ...panel, rowSpan: panel.rowSpan + 1 };
        }
      }

      return panel;
    });

    updatedPanels.push({
      ...p,
      id: `${p.id}-splitv-${Date.now()}`,
      x: p.x,
      colSpan: p.colSpan,
      y: p.y + 1,
      rowSpan: 1,
      typeId: null,
      state: undefined,
    });

    return { ...base, panels: updatedPanels };
  }

  const topSpan = Math.floor(p.rowSpan / 2);
  const bottomSpan = p.rowSpan - topSpan;

  const top: AnalysisPanelCell = { ...p, rowSpan: topSpan };
  const bottom: AnalysisPanelCell = {
    ...p,
    id: `${p.id}-splitv-${Date.now()}`,
    y: p.y + topSpan,
    rowSpan: bottomSpan,
    // New split starts as a blank analysis slot
    typeId: null,
    state: undefined,
  };

  panels.splice(idx, 1, top, bottom);
  return { ...layout, panels };
}

export function addRowBelowPanel(layout: AnalysisLayoutJSON, panelId: string): AnalysisLayoutJSON {
  const target = layout.panels.find((p) => p.id === panelId);
  if (!target) return layout;
  const insertAfterRow = target.y + target.rowSpan - 1;
  const base = insertRowBelow(layout, insertAfterRow);
  const panels = [
    ...base.panels,
    {
      ...target,
      id: `${target.id}-row-${Date.now()}`,
      x: 0,
      colSpan: base.cols,
      y: insertAfterRow + 1,
      rowSpan: 1,
      typeId: null,
      state: undefined,
    },
  ];
  return { ...base, panels };
}

export function addColumnRightOfPanel(layout: AnalysisLayoutJSON, panelId: string): AnalysisLayoutJSON {
  const target = layout.panels.find((p) => p.id === panelId);
  if (!target) return layout;
  const insertAfterCol = target.x + target.colSpan - 1;
  return insertColumnRight(layout, insertAfterCol);
}

// Delete a panel and compact empty rows/columns so other panels take up the space.
export function deletePanelAndCompact(layout: AnalysisLayoutJSON, panelId: string): AnalysisLayoutJSON {
  const target = layout.panels.find((p) => p.id === panelId);
  if (!target) return layout;

  // Never allow deletion of the last remaining panel; the UI has no way to add
  // a new panel into a completely empty layout yet.
  if (layout.panels.length <= 1) {
    return layout;
  }

  let result: AnalysisLayoutJSON = {
    ...layout,
    panels: layout.panels.filter((p) => p.id !== panelId),
  };

  // At this point, there should still be at least one panel, but be defensive.
  if (result.panels.length === 0) {
    return layout;
  }

  // If there is a vertically adjacent panel in the same column region, extend it
  // to cover the deleted panel's vertical space. Prefer a panel directly above;
  // if none, use a panel directly below.
  const sameColumnPanels = result.panels.filter(
    (p) => p.x === target.x && p.colSpan === target.colSpan,
  );

  let merged = false;
  // Try to merge with a panel directly above (its bottom touches target's top).
  for (const p of sameColumnPanels) {
    const pBottom = p.y + p.rowSpan;
    if (pBottom === target.y) {
      p.rowSpan += target.rowSpan;
      merged = true;
      break;
    }
  }

  // If not merged above, try merging with a panel directly below.
  if (!merged) {
    for (const p of sameColumnPanels) {
      const targetBottom = target.y + target.rowSpan;
      if (targetBottom === p.y) {
        p.y = target.y;
        p.rowSpan += target.rowSpan;
        merged = true;
        break;
      }
    }
  }

  // Remove any now-empty rows that were within the deleted panel's vertical span.
  const rowStart = target.y;
  const rowEnd = target.y + target.rowSpan - 1;
  const rowsToCheck: number[] = [];
  for (let r = rowStart; r <= rowEnd; r++) {
    rowsToCheck.push(r);
  }

  // Check from bottom to top so row indices remain valid after removals.
  rowsToCheck
    .sort((a, b) => b - a)
    .forEach((r) => {
      const hasPanelInRow = result.panels.some((p) => {
        const start = p.y;
        const end = p.y + p.rowSpan - 1;
        return start <= r && end >= r;
      });

      if (!hasPanelInRow) {
        result = removeRow(result, r);
      }
    });

  // If all panels are gone after row compaction, stop here.
  if (result.panels.length === 0) {
    return result;
  }

  // Remove any now-empty columns within the deleted panel's horizontal span.
  const colStart = target.x;
  const colEnd = target.x + target.colSpan - 1;
  const colsToCheck: number[] = [];
  for (let c = colStart; c <= colEnd; c++) {
    colsToCheck.push(c);
  }

  colsToCheck
    .sort((a, b) => b - a)
    .forEach((c) => {
      // Don't shrink below 1 column.
      if (result.cols <= 1) {
        return;
      }

      const hasPanelInCol = result.panels.some((p) => {
        const start = p.x;
        const end = p.x + p.colSpan - 1;
        return start <= c && end >= c;
      });

      if (!hasPanelInCol) {
        result = removeColumn(result, c);
      }
    });

  // After structural compaction, if a row has only a single single-row panel
  // overlapping it, expand that panel to span the full grid width for that row.
  // We restrict this to rowSpan === 1 so that tall multi-row panels (like a left
  // region spanning two rows) don't incorrectly grow to full width when a stacked
  // neighbor in another column is deleted.
  const panels = result.panels.map((p) => ({ ...p }));

  if (panels.length === 0) {
    return result;
  }

  let maxRow = 0;
  for (const p of panels) {
    const endRow = p.y + p.rowSpan - 1;
    if (endRow > maxRow) maxRow = endRow;
  }

  for (let r = 0; r <= maxRow; r++) {
    const overlappingIndexes: number[] = [];
    for (let i = 0; i < panels.length; i++) {
      const p = panels[i];
      const start = p.y;
      const end = p.y + p.rowSpan - 1;
      if (start <= r && end >= r) {
        overlappingIndexes.push(i);
      }
    }

    if (overlappingIndexes.length === 1) {
      const idx = overlappingIndexes[0];
      if (panels[idx].rowSpan === 1) {
        panels[idx].x = 0;
        panels[idx].colSpan = result.cols;
      }
    }
  }

  return { ...result, panels };
}
