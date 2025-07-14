/**
 * Based on https://github.com/GordonLesti/dynamic-time-warping/
 * Original code Copyright (c) 2016 PART info@gordonlesti.com
 */

export class DynamicTimeWarping<T> {
    matrix: Array<Array<number>> | undefined;
    distance: number | undefined;
    ser1: Array<Array<T>>;
    ser2: Array<Array<T>>;
    distFunc: (a: Array<T>, b: Array<T>) => number;

    /**
     * Dynamic Time Warping (DTW) distance calculation between two time series.
     * @param {Array} ts1 - First time series.
     * @param {Array} ts2 - Second time series.
     * @param {Function} distanceFunction - Function to calculate distance between two points.
     */
    constructor(ts1: Array<Array<T>>, ts2: Array<Array<T>>, distanceFunction: (a: Array<T>, b: Array<T>) => number) {
        this.ser1 = ts1;
        this.ser2 = ts2;
        this.distFunc = distanceFunction;
        this.distance = undefined;
        this.matrix = undefined;
    }

    getDistance(windowSize: number = 0): number {
        if ( this.distance !== undefined ) {
            return this.distance;
        }

        this.matrix = [];
        const n = this.ser1.length;
        const m = this.ser2.length;
        const w = windowSize > 0 ? Math.max(windowSize, Math.abs(n - m)) : Math.max(n, m);
        for (let i = 0; i < n; i++) {
            this.matrix[i] = [];
            // Windowing: only compute for |i-j| <= w
            const jStart = windowSize > 0 ? Math.max(0, i - w) : 0;
            const jEnd = windowSize > 0 ? Math.min(m, i + w + 1) : m;
            for (let j = jStart; j < jEnd; j++) {
                let cost = Infinity;
                if (i > 0) {
                    cost = Math.min(cost, this.matrix[i - 1][j] ?? Infinity);
                    if (j > 0) {
                        cost = Math.min(cost, this.matrix[i - 1][j - 1] ?? Infinity);
                        cost = Math.min(cost, this.matrix[i][j - 1] ?? Infinity);
                    }
                } else {
                    if (j > 0) {
                        cost = Math.min(cost, this.matrix[i][j - 1] ?? Infinity);
                    } else {
                        cost = 0;
                    }
                }
                this.matrix[i][j] = cost + this.distFunc(this.ser1[i], this.ser2[j]);
            }
        }

        return this.matrix[n - 1][m - 1];
    };
}   

export function dtwDistance<T>(a: Array<Array<T>>, b: Array<Array<T>>, distanceFunction: ((a: Array<T>, b: Array<T>) => number) | null = null): number {
    if (distanceFunction === null) {
        distanceFunction = (x: Array<T>, y: Array<T>): number => {
            if (x.length !== y.length) {
                throw new Error("Input arrays must have the same length: " + x.length + " != " + y.length);
            }

            let sum = 0;
            for (let i = 0; i < x.length; i++) {
                sum += Math.pow(x[i] as number - (y[i] as number), 2);
            }

            return Math.sqrt(sum);            
        };
    }

    const dtw = new DynamicTimeWarping(a, b, distanceFunction);
    return dtw.getDistance(1);
}

// /**
//  * Compute DTW distance between two sequences of vectors (flexible for any vector length).
//  */
// export function dtwDistance(a: number[][], b: number[][]): number {
//   const seqA = a.map((v) => [...v]);
//   const seqB = b.map((v) => [...v]);
//   const dtw = DTWDistance(seqA, seqB, (x: number[], y: number[]) => {
//     let sum = 0;
//     for (let i = 0; i < x.length; i++) {
//       sum += Math.pow(x[i] - y[i], 2);
//     }
//     return Math.sqrt(sum);
//   });
//   return dtw;
// }
