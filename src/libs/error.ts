import type { AbstractShape } from "../Tsh";
import type { PrimitiveShapes, TshConfig } from "./types";

export interface TshShapeErrorConstructor {
    code: string;
    message: string;
    value: unknown;
    shape: PrimitiveShapes;
    path?: string[];
    extra?: Record<string, unknown>;
    details?: TshShapeError[];
}

export type ErrorCreator = (value: unknown) => TshShapeErrorConstructor;

export class TshShapeError extends Error {
    public readonly code: string;
    public readonly value: unknown;
    public readonly shape: AbstractShape<any>;
    public readonly path: string[];
    public readonly details: TshShapeError[];
    public readonly extra: Record<string, unknown>;
    public readonly timestamp: number;

    constructor(data: {
        code: string;
        message: string;
        value?: unknown;
        shape?: AbstractShape<any>;
        path?: string[];
        details?: TshShapeError[];
        extra?: Record<string, unknown>;
    }) {
        super(data.message);
        this.name = 'TshShapeError';
        this.code = data.code;
        this.value = data.value;
        this.shape = data.shape ?? null;
        this.path = data.path ?? [];
        this.details = data.details ?? [];
        this.extra = data.extra ?? {};
        this.timestamp = Date.now();

        // Manter o stack trace limpo
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, TshShapeError);
        }
    }

    /**
     * Formata o erro para exibição
     */
    toString(): string {
        if (this.details.length > 0) {
            const details = this.details.map(e => `  - ${e.message} (${e.code})`).join('\n');
            return `Multiple validation errors [${this.code}] at "${this.path.join('.') || '<root>'}":\n${details}`;
        }
        
        return `[${this.code}] ${this.message} (path: ${this.path.join('.') || '<root>'})`;
    }

    /**
     * Converte o erro para formato JSON serializável
     */
    toJSON(): {
        code: string;
        message: string;
        path: string[];
        timestamp: number;
        details?: Array<ReturnType<TshShapeError['toJSON']>>;
        extra?: Record<string, unknown>;
    } {
        return {
            code: this.code,
            message: this.message,
            path: this.path,
            timestamp: this.timestamp,
            ...(this.details.length > 0 ? { 
                details: this.details.map(d => d.toJSON()) 
            } : {}),
            ...(Object.keys(this.extra).length > 0 ? { 
                extra: this.extra 
            } : {})
        };
    }

    /**
     * Verifica se o erro contém um código específico
     */
    hasCode(code: string): boolean {
        return this.code === code || 
               this.details.some(e => e.code === code);
    }

    /**
     * Cria um novo erro com informações adicionais
     */
    extend(additionalInfo: {
        code?: string;
        message?: string;
        extra?: Record<string, unknown>;
    }): TshShapeError {
        return new TshShapeError({
            ...this,
            ...additionalInfo,
            extra: { ...this.extra, ...additionalInfo.extra }
        });
    }

    /**
     * Filtra os erros detalhados por código
     */
    filterDetailsByCode(code: string): TshShapeError[] {
        return this.details.filter(e => e.code === code);
    }
}