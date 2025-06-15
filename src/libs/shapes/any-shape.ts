import { AbstractShape } from "./abstract-shape";

export class AnyShape<AnyType extends any = any> extends AbstractShape<AnyType> {
    public readonly _type = "any";

    constructor() {
        super({
            sync: (value) => {
                if (typeof value === "undefined" && typeof this._default !== "undefined") {
                    return { success: true, value: this._default };
                }
                if (typeof value === "undefined" && this._optional) {
                    return { success: true, value: undefined };
                }
                if (value === null && this._nullable) {
                    return { success: true, value: null };
                }
                
                return { success: true, value };
            }
        });
    }
}