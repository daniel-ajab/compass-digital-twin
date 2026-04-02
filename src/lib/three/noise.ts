export function noise3D(x: number, y: number, z: number, f: number): number {
  return (
    Math.sin(x * f + 1.2) *
      Math.cos(y * f * 1.1 + 0.4) *
      Math.sin(z * f * 0.85 + 1.8) +
    Math.sin(x * f * 2 + 1.8) * Math.cos(z * f * 1.5) * 0.4 +
    Math.cos(y * f * 1.3 + 0.9) * Math.sin(x * f * 0.65 + 2.1) * 0.3
  );
}

export function fbm3D(x: number, y: number, z: number, oct: number): number {
  let v = 0;
  let a = 1;
  let f = 1;
  for (let i = 0; i < oct; i++) {
    v += a * noise3D(x, y, z, f);
    a *= 0.5;
    f *= 2.1;
  }
  return v;
}
