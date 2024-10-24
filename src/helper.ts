// Function to generate a color palette with shades of blue ranging from dark to light, avoiding white
function generateColorPalette(numColors: number): string[] {
    const colors: string[] = [];
    
    // Start with a base dark blue (can be adjusted if needed)
    const baseHue = 210; // Hue value for blue (210° in HSL)
    
    // Loop through and generate varying shades of blue, avoid very light shades (e.g., white)
    for (let i = 0; i < numColors; i++) {
      // Calculate lightness, starting from very dark to light but avoiding too light (e.g., max 85%)
      const lightness = (10 + (i * (75 / (numColors - 1)))); // Range from 10% to 85% lightness
      
      // Generate the HSL color and convert to a hex code
      const hslColor = `hsl(${baseHue}, 70%, ${lightness}%)`; // Keeping saturation at 70% for vibrant blues
      
      // Push the generated color to the array
      colors.push(hslToHex(baseHue, 70, lightness));
    }
  
    return colors;
}
  
// Helper function to convert HSL to HEX
function hslToHex(h: number, s: number, l: number): string {
    s /= 100;
    l /= 100;
    const k = (n: number) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) =>
      l - a * Math.max(Math.min(k(n) - 3, 9 - k(n), 1), -1);
    const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
  }

export { generateColorPalette, hslToHex };