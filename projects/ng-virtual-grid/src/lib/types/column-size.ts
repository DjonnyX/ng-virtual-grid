import { SIZE_PERSENT, SIZE_FR } from "../const";

export type ColumnSize = number | `${number}${typeof SIZE_PERSENT}` | `${number}${typeof SIZE_FR}` | undefined;