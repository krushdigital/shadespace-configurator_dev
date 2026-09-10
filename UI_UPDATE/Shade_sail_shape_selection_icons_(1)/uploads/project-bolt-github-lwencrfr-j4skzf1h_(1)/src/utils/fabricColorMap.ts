const COLOR_MAP: Record<string, string> = {
  // Greens
  'Koonunga Green': '#2d6b3f',
  'Persian Green': '#00695c',
  'Lime Fizz': '#b2d235',
  'Lime Green': '#7cb342',
  'Forest Green': '#2e7d32',
  'Olive Green': '#556b2f',
  'Mint Green': '#81c784',
  'Bright Green': '#43a047',
  'Brunswick Green': '#1b5e20',
  'Meadow Green': '#4caf50',
  'Rivergum': '#607d5a',

  // Blues
  'Sheba Navy': '#1a237e',
  'Bundena Blue': '#1565c0',
  'Navy': '#0d2240',
  'Dove Blue': '#5c99c5',
  'Navy Blue': '#0d3b66',
  'True Blue': '#1976d2',
  'Sky Blue': '#64b5f6',
  'Deep Sea Navy': '#0a1929',
  'Ocean Blue': '#1565c0',
  'Aquamarine': '#4db6ac',
  'Aquatic Blue': '#0097a7',
  'Bluebird': '#42a5f5',
  'Turquoise': '#00897b',

  // Reds / Oranges / Pinks
  'Candy Red': '#c62828',
  'Abaroo Red': '#b71c1c',
  'Oxide Red': '#8b2500',
  'Red': '#d32f2f',
  'Cherry Red': '#c0392b',
  'Lava Red': '#bf360c',
  'Sherbet Orange': '#f4841f',
  'Orange': '#ef6c00',
  'Bubblegum Pink': '#ec407a',
  'Sunblaze': '#ff8f00',

  // Yellows
  'Mellow Haze Yellow': '#fdd835',
  'Yellow': '#f9a825',
  'Sunshine Yellow': '#fbc02d',

  // Browns / Tans / Creams
  'Marrocan Terracotta': '#a0522d',
  'Karloo Sand': '#c8a96e',
  'Chino Cream': '#e8d5a3',
  'Chocolate': '#4e342e',
  'Beige': '#c8b88a',
  'Latte': '#b08d6e',
  'Cream': '#f5f0e0',
  'Canyon Tan': '#b8860b',
  'Desert Sand': '#c2a278',
  'River Sand': '#a68b5b',
  'Coastal Cream': '#f0e8d0',
  'Deep Ochre': '#bf6900',
  'Driftwood': '#8b7d6b',
  'Natural': '#ddd0b4',
  'Stone': '#9e9684',

  // Greys / Blacks / Silvers
  'Graphite Grey': '#3c3c3c',
  'Domino Black': '#1a1a1a',
  'Charcoal': '#37474f',
  'Charcoal Grey': '#424242',
  'Carbon Black': '#1b1b1b',
  'Black': '#111111',
  'Gun Metal': '#4a4a50',
  'Steel Grey': '#6b6b6b',
  'Silver': '#bcc0c4',
  'Alpine Silver': '#a8acb0',
  'Titanium': '#6e7078',
  'Midnight': '#191933',

  // Whites
  'Arctic White': '#f8f8f8',
  'White': '#fafafa',

  // Purples
  'Jazzberry Purple': '#6a1b6a',
  'Purple': '#6a1b9a',

  // Other
  'Pearl Onyx': '#2c2c2c',
};

const FALLBACK_COLOR = '#4a8c5c';

export function getFabricHexColor(colorName: string): string {
  if (!colorName) return FALLBACK_COLOR;

  const direct = COLOR_MAP[colorName];
  if (direct) return direct;

  const lower = colorName.toLowerCase();
  for (const [key, hex] of Object.entries(COLOR_MAP)) {
    if (key.toLowerCase() === lower) return hex;
  }

  if (lower.includes('green')) return '#2e7d32';
  if (lower.includes('blue')) return '#1565c0';
  if (lower.includes('red')) return '#c62828';
  if (lower.includes('black')) return '#1a1a1a';
  if (lower.includes('white')) return '#f8f8f8';
  if (lower.includes('grey') || lower.includes('gray')) return '#5c5c5c';
  if (lower.includes('cream') || lower.includes('sand')) return '#d4c49a';
  if (lower.includes('navy')) return '#0d2240';
  if (lower.includes('yellow')) return '#f9a825';
  if (lower.includes('orange')) return '#ef6c00';

  return FALLBACK_COLOR;
}
