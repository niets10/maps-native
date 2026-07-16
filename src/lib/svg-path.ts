/**
 * Minimal SVG path-data geometry helpers used to place map labels and to
 * center the world map on a given country. `@svg-maps/world` ships each
 * location as a raw `path.d` string (absolute + relative move/line/curve
 * commands) with no separate bounding-box or centroid metadata, so we derive
 * both ourselves. Curves are approximated by their control/end points, which
 * is fine for a bounding box -- we don't need pixel-accurate outlines.
 */

export type BoundingBox = { minX: number; minY: number; maxX: number; maxY: number };

const COMMAND_TOKEN = /[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g;

/**
 * Splits a path into its disconnected subpaths (each `M`/`m` starts a new one)
 * and returns the bounding box of the largest one by area.
 *
 * Many country shapes include far-away exclaves (e.g. Spain's path also draws
 * the Canary Islands, ~1,500km southwest of the mainland). Using the biggest
 * contiguous shape instead of the whole path's bbox keeps the centroid over
 * the country's main landmass instead of skewing it toward a small island.
 */
export function getLargestSubpathBoundingBox(d: string): BoundingBox | null {
  const tokens = d.match(COMMAND_TOKEN);
  if (!tokens) return null;

  let i = 0;
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  let command: string | null = null;
  let current: BoundingBox | null = null;
  let largest: (BoundingBox & { area: number }) | null = null;

  const nextNumber = () => parseFloat(tokens[i++]);

  const visit = (px: number, py: number) => {
    if (!current) return;
    current.minX = Math.min(current.minX, px);
    current.minY = Math.min(current.minY, py);
    current.maxX = Math.max(current.maxX, px);
    current.maxY = Math.max(current.maxY, py);
  };

  const closeSubpath = () => {
    if (!current) return;
    const area = (current.maxX - current.minX) * (current.maxY - current.minY);
    if (!largest || area > largest.area) largest = { ...current, area };
  };

  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) command = tokens[i++];
    if (!command) break;

    const isRelative: boolean = command === command.toLowerCase();
    const upper = command.toUpperCase();

    switch (upper) {
      case 'M': {
        closeSubpath();
        let nx = nextNumber();
        let ny = nextNumber();
        if (isRelative) {
          nx += x;
          ny += y;
        }
        x = nx;
        y = ny;
        startX = x;
        startY = y;
        current = { minX: x, minY: y, maxX: x, maxY: y };
        command = isRelative ? 'l' : 'L';
        break;
      }
      case 'L': {
        let nx = nextNumber();
        let ny = nextNumber();
        if (isRelative) {
          nx += x;
          ny += y;
        }
        x = nx;
        y = ny;
        visit(x, y);
        break;
      }
      case 'H': {
        let nx = nextNumber();
        if (isRelative) nx += x;
        x = nx;
        visit(x, y);
        break;
      }
      case 'V': {
        let ny = nextNumber();
        if (isRelative) ny += y;
        y = ny;
        visit(x, y);
        break;
      }
      case 'C': {
        let x1 = nextNumber();
        let y1 = nextNumber();
        let x2 = nextNumber();
        let y2 = nextNumber();
        let nx = nextNumber();
        let ny = nextNumber();
        if (isRelative) {
          x1 += x;
          y1 += y;
          x2 += x;
          y2 += y;
          nx += x;
          ny += y;
        }
        visit(x1, y1);
        visit(x2, y2);
        visit(nx, ny);
        x = nx;
        y = ny;
        break;
      }
      case 'S':
      case 'Q': {
        let cx1 = nextNumber();
        let cy1 = nextNumber();
        let nx = nextNumber();
        let ny = nextNumber();
        if (isRelative) {
          cx1 += x;
          cy1 += y;
          nx += x;
          ny += y;
        }
        visit(cx1, cy1);
        visit(nx, ny);
        x = nx;
        y = ny;
        break;
      }
      case 'T': {
        let nx = nextNumber();
        let ny = nextNumber();
        if (isRelative) {
          nx += x;
          ny += y;
        }
        visit(nx, ny);
        x = nx;
        y = ny;
        break;
      }
      case 'A': {
        // rx, ry, rotation, large-arc-flag, sweep-flag, then the endpoint.
        i += 5;
        let nx = nextNumber();
        let ny = nextNumber();
        if (isRelative) {
          nx += x;
          ny += y;
        }
        visit(nx, ny);
        x = nx;
        y = ny;
        break;
      }
      case 'Z': {
        x = startX;
        y = startY;
        break;
      }
      default: {
        i++;
      }
    }
  }
  closeSubpath();

  return largest;
}

export function getBoundingBoxCenter(box: BoundingBox): { x: number; y: number } {
  return { x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2 };
}

export function getBoundingBoxArea(box: BoundingBox): number {
  return (box.maxX - box.minX) * (box.maxY - box.minY);
}
