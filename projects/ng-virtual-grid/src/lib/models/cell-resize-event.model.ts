import { Id } from "../types";

export interface ICellResizeEvent {
    rowId: Id;
    columnId: Id;
    width: number;
    height: number;
}