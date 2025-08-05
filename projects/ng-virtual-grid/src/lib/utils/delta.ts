export const normalizeDeltaX = (deltaSequence: Array<number>): number => {
    let result = 0;
    const dict: { [value: number]: number } = {};
    for (let i = 0, l = deltaSequence.length; i < l; i++) {
        const value = deltaSequence[i];
        if (!dict.hasOwnProperty(value)) {
            dict[value] = 0;
        }
        dict[value] += 1;
    }
    let maxCount = 0;
    for (let value in dict) {
        if (dict[value] > maxCount) {
            maxCount = dict[value];
            result = Number(value);
        }
    }
    return result;
}