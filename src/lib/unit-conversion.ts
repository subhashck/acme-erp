// Unit conversion utility with direct, inverse, and multi-step graph resolution (BFS)

export interface UnitTypeItem {
  id: number;
  name: string;
  symbol: string;
  category?: string | null;
  isBaseUnit?: boolean | null;
}

export interface UnitConversionItem {
  id: number;
  fromUnitId: number;
  toUnitId: number;
  multiplier: number | string;
  notes?: string | null;
}

export interface ConversionResult {
  convertible: boolean;
  factor: number;
  fromUnit?: UnitTypeItem | null;
  toUnit?: UnitTypeItem | null;
}

/**
 * Finds a unit by its ID, symbol, or name (case-insensitive)
 */
export function findUnit(
  identifier: string | number | null | undefined,
  unitTypes: UnitTypeItem[] = []
): UnitTypeItem | undefined {
  if (!identifier || !unitTypes || unitTypes.length === 0) return undefined;

  if (typeof identifier === "number") {
    return unitTypes.find((u) => Number(u.id) === identifier);
  }

  const str = String(identifier).trim().toLowerCase();
  if (!str) return undefined;

  // Exact ID check if string is numeric
  const numericId = Number(str);
  if (!isNaN(numericId) && numericId > 0) {
    const byId = unitTypes.find((u) => Number(u.id) === numericId);
    if (byId) return byId;
  }

  // Symbol match (primary)
  const bySymbol = unitTypes.find(
    (u) => (u.symbol || "").trim().toLowerCase() === str
  );
  if (bySymbol) return bySymbol;

  // Name match (secondary)
  return unitTypes.find(
    (u) => (u.name || "").trim().toLowerCase() === str
  );
}

/**
 * Computes conversion multiplier from one unit to another via direct, inverse, or multi-step graph search.
 */
export function getUnitConversionFactor(
  fromUnitIdentifier: string | number | null | undefined,
  toUnitIdentifier: string | number | null | undefined,
  unitTypes: UnitTypeItem[] = [],
  unitConversions: UnitConversionItem[] = []
): ConversionResult {
  if (!fromUnitIdentifier || !toUnitIdentifier) {
    return { convertible: false, factor: 1 };
  }

  const fromUnit = findUnit(fromUnitIdentifier, unitTypes);
  const toUnit = findUnit(toUnitIdentifier, unitTypes);

  // If same string/symbol directly
  const fromStr = String(fromUnit?.symbol || fromUnitIdentifier).trim().toLowerCase();
  const toStr = String(toUnit?.symbol || toUnitIdentifier).trim().toLowerCase();

  if (fromStr === toStr && fromStr !== "") {
    return { convertible: true, factor: 1, fromUnit, toUnit };
  }

  if (!fromUnit || !toUnit || !unitConversions || unitConversions.length === 0) {
    return { convertible: false, factor: 1, fromUnit, toUnit };
  }

  const fromId = Number(fromUnit.id);
  const toId = Number(toUnit.id);

  if (fromId === toId) {
    return { convertible: true, factor: 1, fromUnit, toUnit };
  }

  // 1. Direct Conversion
  const direct = unitConversions.find(
    (c) => Number(c.fromUnitId) === fromId && Number(c.toUnitId) === toId
  );
  if (direct && Number(direct.multiplier) > 0) {
    return { convertible: true, factor: Number(direct.multiplier), fromUnit, toUnit };
  }

  // 2. Inverse Conversion
  const inverse = unitConversions.find(
    (c) => Number(c.fromUnitId) === toId && Number(c.toUnitId) === fromId
  );
  if (inverse && Number(inverse.multiplier) > 0) {
    return { convertible: true, factor: 1 / Number(inverse.multiplier), fromUnit, toUnit };
  }

  // 3. Multi-step Graph BFS
  const adj = new Map<number, Array<{ to: number; factor: number }>>();
  for (const c of unitConversions) {
    const f = Number(c.fromUnitId);
    const t = Number(c.toUnitId);
    const m = Number(c.multiplier);
    if (m > 0) {
      if (!adj.has(f)) adj.set(f, []);
      if (!adj.has(t)) adj.set(t, []);
      adj.get(f)!.push({ to: t, factor: m });
      adj.get(t)!.push({ to: f, factor: 1 / m });
    }
  }

  const queue: Array<{ unitId: number; cumulativeFactor: number }> = [
    { unitId: fromId, cumulativeFactor: 1 },
  ];
  const visited = new Set<number>([fromId]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.unitId === toId) {
      // Normalize IEEE 754 precision
      const factor = Number(current.cumulativeFactor.toPrecision(10));
      return {
        convertible: true,
        factor,
        fromUnit,
        toUnit,
      };
    }

    const neighbors = adj.get(current.unitId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.to)) {
        visited.add(neighbor.to);
        queue.push({
          unitId: neighbor.to,
          cumulativeFactor: current.cumulativeFactor * neighbor.factor,
        });
      }
    }
  }

  return { convertible: false, factor: 1, fromUnit, toUnit };
}

/**
 * Format a converted number cleanly without trailing zero noise
 */
export function formatQtyNumber(val: number, maxDecimals = 3): string {
  if (isNaN(val) || !isFinite(val)) return "0";
  // Round to maxDecimals to avoid floating point imprecision like 0.30000000000000004
  const rounded = Number(val.toFixed(maxDecimals));
  return rounded.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
}
