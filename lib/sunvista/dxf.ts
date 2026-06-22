// Minimal DXF (AutoCAD) writer. Converts a SitePlanSpec into a real .dxf file
// using LINE and TEXT entities so the GC can open the AI-generated plan in
// AutoCAD and continue with detailed drafting.
import { SitePlanSpec } from './schemas';

function line(x1: number, y1: number, x2: number, y2: number, layer: string): string {
  return ['0', 'LINE', '8', layer, '10', x1, '20', y1, '30', 0, '11', x2, '21', y2, '31', 0].join('\n');
}

function text(x: number, y: number, height: number, value: string, layer: string): string {
  // Sanitize to keep the DXF parser happy.
  const safe = value.replace(/[\n\r]/g, ' ').slice(0, 80);
  return ['0', 'TEXT', '8', layer, '10', x, '20', y, '30', 0, '40', height, '1', safe].join('\n');
}

export function specToDxf(spec: SitePlanSpec): string {
  const H = spec.height;
  // Flip Y so the drawing reads the same in AutoCAD (Y up) as on screen (Y down).
  const fy = (y: number) => H - y;

  const entities: string[] = [];

  // Perimeter / walls
  for (const w of spec.walls) {
    entities.push(line(w.x1, fy(w.y1), w.x2, fy(w.y2), 'WALLS'));
  }

  // Zones as rectangles + labels
  for (const z of spec.zones) {
    const x2 = z.x + z.w;
    const y2 = z.y + z.h;
    entities.push(line(z.x, fy(z.y), x2, fy(z.y), 'ZONES'));
    entities.push(line(x2, fy(z.y), x2, fy(y2), 'ZONES'));
    entities.push(line(x2, fy(y2), z.x, fy(y2), 'ZONES'));
    entities.push(line(z.x, fy(y2), z.x, fy(z.y), 'ZONES'));
    entities.push(text(z.x + 0.5, fy(z.y + 1.6), 1.2, z.label, 'TEXT'));
  }

  // Dimensions (as lines + label)
  for (const d of spec.dimensions) {
    entities.push(line(d.x1, fy(d.y1), d.x2, fy(d.y2), 'DIMS'));
    entities.push(text((d.x1 + d.x2) / 2, fy((d.y1 + d.y2) / 2) + 0.5, 1, d.label, 'DIMS'));
  }

  // Annotations
  for (const a of spec.annotations) {
    entities.push(text(a.x, fy(a.y), 0.9, '* ' + a.text, 'NOTES'));
  }

  // Title block text
  entities.push(text(1, fy(H) + 2, 1.6, spec.title, 'TITLE'));
  entities.push(text(1, fy(H) + 0.2, 1, spec.address + '   |   Scale ' + spec.scale + '   |   SunVista Enterprises', 'TITLE'));

  return [
    '0', 'SECTION', '2', 'HEADER',
    '9', '$INSUNITS', '70', '2', // 2 = feet
    '0', 'ENDSEC',
    '0', 'SECTION', '2', 'ENTITIES',
    ...entities,
    '0', 'ENDSEC',
    '0', 'EOF', '',
  ].join('\n');
}
