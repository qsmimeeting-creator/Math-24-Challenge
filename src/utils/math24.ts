/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class Math24Solver {
  static solve(numbers: number[]): string[] {
    const results = new Set<string>();
    const items = numbers.map(n => ({ val: n, expr: `${n}` }));
    this.permute(items, results);
    return Array.from(results);
  }

  private static permute(arr: { val: number; expr: string }[], results: Set<string>) {
    if (arr.length === 1) {
      if (Math.abs(arr[0].val - 24) < 1e-6) {
        results.add(arr[0].expr);
      }
      return;
    }

    for (let i = 0; i < arr.length; i++) {
      for (let j = 0; j < arr.length; j++) {
        if (i === j) continue;

        const nextArr = [];
        for (let k = 0; k < arr.length; k++) {
          if (k !== i && k !== j) nextArr.push(arr[k]);
        }

        const a = arr[i];
        const b = arr[j];

        // Addition
        this.permute([...nextArr, { val: a.val + b.val, expr: `(${a.expr} + ${b.expr})` }], results);

        // Subtraction
        this.permute([...nextArr, { val: a.val - b.val, expr: `(${a.expr} - ${b.expr})` }], results);

        // Multiplication
        this.permute([...nextArr, { val: a.val * b.val, expr: `(${a.expr} * ${b.expr})` }], results);

        // Division
        if (Math.abs(b.val) > 1e-6) {
          this.permute([...nextArr, { val: a.val / b.val, expr: `(${a.expr} / ${b.expr})` }], results);
        }
      }
    }
  }

  static generateSolvable(difficulty: number = 1): { numbers: number[]; solutions: string[] } {
    // Basic difficulty: just ensure it's solvable
    // More difficulty could mean fewer solutions or more complex steps
    while (true) {
      const nums = Array.from({ length: 4 }, () => Math.floor(Math.random() * 9) + 1);
      const solutions = this.solve(nums);
      if (solutions.length > 0) {
        return { numbers: nums, solutions };
      }
    }
  }

  static validate(numbers: number[], expression: string): boolean {
    try {
      // Very strict validation: only numbers from original set, basic operators, parens
      const tokens = expression.match(/\d+|\+|\-|\*|\/|\(|\)/g) || [];
      const usedNums = tokens.filter(t => /\d+/.test(t)).map(Number).sort();
      const expectedNums = [...numbers].sort();

      if (JSON.stringify(usedNums) !== JSON.stringify(expectedNums)) return false;

      // Use a safe evaluation (using Function constructor but strictly limited to math)
      // For a production app, a math-only parser would be safer.
      const result = new Function(`return ${expression.replace(/[^0-9\+\-\*\/\(\)\.]/g, '')}`)();
      return Math.abs(result - 24) < 1e-6;
    } catch (e) {
      return false;
    }
  }
}
