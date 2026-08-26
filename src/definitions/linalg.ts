// Small dense linear algebra (plain number[][], row-major). Sized for the
// handful of generators/commas RTT deals with, so clarity beats performance.

export type Matrix = number[][];

export const transpose = (m: Matrix): Matrix =>
  m[0]?.map((_, colIndex) => m.map((row) => row[colIndex])) ?? [];

export const matMul = (a: Matrix, b: Matrix): Matrix =>
  a.map((row) =>
    b[0].map((_, colIndex) =>
      row.reduce((sum, value, k) => sum + value * b[k][colIndex], 0)
    )
  );

export const matVec = (m: Matrix, v: number[]): number[] =>
  m.map((row) => row.reduce((sum, value, k) => sum + value * v[k], 0));

// Solve A·x = b by Gaussian elimination with partial pivoting.
export const solveLinearSystem = (a: Matrix, b: number[]): number[] | null => {
  const n = a.length;
  const m = a.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(m[row][col]) > Math.abs(m[pivotRow][col])) pivotRow = row;
    }
    if (Math.abs(m[pivotRow][col]) < 1e-12) return null;
    [m[col], m[pivotRow]] = [m[pivotRow], m[col]];

    for (let row = col + 1; row < n; row++) {
      const factor = m[row][col] / m[col][col];
      for (let k = col; k <= n; k++) m[row][k] -= factor * m[col][k];
    }
  }

  const x = new Array<number>(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    let sum = m[row][n];
    for (let k = row + 1; k < n; k++) sum -= m[row][k] * x[k];
    x[row] = sum / m[row][row];
  }
  return x;
};

// Least-squares solution of A·x ≈ b via the normal equations.
export const leastSquares = (a: Matrix, b: number[]): number[] | null => {
  const at = transpose(a);
  const ata = matMul(at, a);
  const atb = matVec(at, b);
  return solveLinearSystem(ata, atb);
};

// Row-reduced echelon form with pivots tracked, for nullspace construction.
const rref = (m: Matrix): { matrix: Matrix; pivotColumns: number[] } => {
  const matrix = m.map((row) => [...row]);
  const rowCount = matrix.length;
  const colCount = matrix[0]?.length ?? 0;
  const pivotColumns: number[] = [];
  let pivotRow = 0;

  for (let col = 0; col < colCount && pivotRow < rowCount; col++) {
    let best = pivotRow;
    for (let row = pivotRow; row < rowCount; row++) {
      if (Math.abs(matrix[row][col]) > Math.abs(matrix[best][col])) best = row;
    }
    if (Math.abs(matrix[best][col]) < 1e-10) continue;

    [matrix[pivotRow], matrix[best]] = [matrix[best], matrix[pivotRow]];
    const pivot = matrix[pivotRow][col];
    for (let k = 0; k < colCount; k++) matrix[pivotRow][k] /= pivot;

    for (let row = 0; row < rowCount; row++) {
      if (row === pivotRow) continue;
      const factor = matrix[row][col];
      if (Math.abs(factor) < 1e-12) continue;
      for (let k = 0; k < colCount; k++) matrix[row][k] -= factor * matrix[pivotRow][k];
    }

    pivotColumns.push(col);
    pivotRow++;
  }

  return { matrix, pivotColumns };
};

// Rational nullspace basis of a matrix (each basis vector has unit length,
// scaled so its first nonzero entry is 1).
export const nullspaceOverQ = (rows: Matrix, dim: number): Matrix => {
  if (rows.length === 0) {
    return Array.from({ length: dim }, (_, i) =>
      Array.from({ length: dim }, (_, j) => (i === j ? 1 : 0))
    );
  }

  const { matrix, pivotColumns } = rref(rows);
  const freeColumns = Array.from({ length: dim }, (_, i) => i).filter(
    (col) => !pivotColumns.includes(col)
  );

  return freeColumns.map((freeColumn) => {
    const vector = new Array<number>(dim).fill(0);
    vector[freeColumn] = 1;
    pivotColumns.forEach((pivotColumn, rowIndex) => {
      vector[pivotColumn] = -matrix[rowIndex][freeColumn];
    });
    return vector;
  });
};

// Scale a rational vector to the nearest primitive integer vector. Returns
// null when the vector has no plausible integer representation.
export const primitiveIntegerVector = (
  vector: number[],
  tolerance = 1e-7
): number[] | null => {
  const denominator = vector.find((value) => Math.abs(value) > tolerance);
  if (denominator === undefined) return null;

  const scaled = vector.map((value) => value / denominator);
  if (scaled.some((value) => Math.abs(value - Math.round(value)) > tolerance)) {
    return null;
  }

  const integers = scaled.map((value) => Math.round(value));
  const gcd = integers.reduce((a, b) => {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y) [x, y] = [y, x % y];
    return x;
  }, 0);

  return gcd === 0 ? null : integers.map((value) => value / gcd);
};

// Minimum-norm least squares subject to hard equality constraints C·x = d.
// Parametrizes x = x0 + N·y with N the nullspace of C, then solves (A·N)y ≈ b − A·x0.
export const constrainedLeastSquares = (
  a: Matrix,
  b: number[],
  c: Matrix,
  d: number[]
): number[] | null => {
  const unknowns = a[0]?.length ?? 0;
  if (c.length === 0) return leastSquares(a, b);

  // Particular solution of C·x = d via least squares (constraints assumed
  // consistent; residual indicates otherwise).
  const x0 = leastSquares(c, d);
  if (!x0) return null;

  const nullBasis = nullspaceOverQ(c, unknowns);
  if (nullBasis.length === 0) return x0.slice();

  const n = transpose(nullBasis); // columns are basis vectors
  const an = matMul(a, n);
  const target = b.map((value, i) => value - matVec(a, x0)[i]);
  const y = leastSquares(an, target);
  if (!y) return null;

  return x0.map((value, i) => value + n[i].reduce((sum, nv, k) => sum + nv * y[k], 0));
};
