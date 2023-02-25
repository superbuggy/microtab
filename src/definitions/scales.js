import { centsToEDO, scaleFromIntervallicDistances } from "../helpers";
import { scalarIntervallicDistances } from "./scalar-intervals";

const bohlenPierceCents = [
  0, 301.85, 435.08, 582.51, 884.36, 1017.6, 1319.44, 1466.87, 1768.72, 1901.96,
];

export const scales = Object.fromEntries(
  Object.entries(scalarIntervallicDistances).map(([scaleName, intervals]) => [
    scaleName,
    scaleFromIntervallicDistances(intervals),
  ])
);

scales["Bohlen-Pierce 24 EDO Approximation"] = centsToEDO(
  bohlenPierceCents,
  24
);
