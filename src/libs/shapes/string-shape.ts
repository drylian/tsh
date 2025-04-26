import type { TshOptions } from '../types';
import { AbstractShape } from './abstract-shape';

export class StringShape<Type extends string = string> extends AbstractShape<Type> {
  public readonly _type = "string";
  public _min?: number;
  public _max?: number;
  public _email?: boolean = false;
  public _url?: boolean = false;
  public _uuid?: boolean = false;
  public _creditCard?: boolean = false;
  public _hexColor?: boolean = false;
  public _ipAddress?: boolean = false;
  public _isoDate?: boolean = false;
  public _trimmed?: boolean = false;
  public _lowercase?: boolean = false;
  public _uppercase?: boolean = false;
  public _alphanumeric?: boolean = false;
  public _contains?: string;
  public _startsWith?: string;
  public _endsWith?: string;

  private _coerce = false;

  parse(value: unknown): Type {
    if (typeof value === "undefined" && typeof this._default !== "undefined") value = this._default;
    if (typeof value === "undefined" && this._optional) return undefined as never;
    if (value === null && this._nullable) return null as never;

    if (this._coerce) {
      if (value === null || value === undefined) {
        value = '';
      } else if (typeof value === 'boolean' || typeof value === 'number') {
        value = String(value);
      } else if (typeof value === 'object') {
        value = JSON.stringify(value);
      } else {
        value = String(value);
      }
    }

    if (typeof value !== 'string') {
      this.createError((v) => ({
        code: 'NOT_STRING',
        message: 'Expected a string',
        value: v,
        shape: this,
      }), value);
    }

    let result = value as string;

    return this._operate(result);
  }

  min(length: number, opts: TshOptions = {}): this {
    this._min = length;
    return this.refine(
      (val) => val.length >= length,
      opts.message ?? `String must be at least ${length} characters long`,
      opts.code ?? 'STRING_TOO_SHORT',
      { ...opts?.extra ?? {}, min: length },
    );
  }

  max(length: number, opts: TshOptions = {}): this {
    this._max = length;
    return this.refine(
      (val) => val.length <= length,
      opts.message ?? `String must be at most ${length} characters long`,
      opts.code ?? 'STRING_TOO_LONG',
      { ...opts?.extra ?? {}, max: length },
    );
  }

  length(length: number, opts: TshOptions = {}): this {
    return this.refine(
      (val) => val.length === length,
      opts.message ?? `String must be exactly ${length} characters long`,
      opts.code ?? 'STRING_LENGTH_MISMATCH',
      { ...opts?.extra ?? {}, length },
    );
  }

  coerce(): this {
    this._coerce = true;
    return this;
  }

  pattern(pattern: RegExp, opts: TshOptions = {}): this {
    return this.regex(pattern, opts);
  }

  regex(pattern: RegExp, opts: TshOptions = {}): this {
    return this.refine(
      (val) => pattern.test(val),
      opts.message ?? `String must match pattern ${pattern}`,
      opts.code ?? 'REGEX_MISMATCH',
      { ...opts?.extra ?? {}, regex: pattern.source },
    );
  }

  email(opts: TshOptions = {}): this {
    this._email = true;
    return this.refine(
      (val) => /^[a-zA-Z0-9.!#$%&'*+\=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/.test(val),
      opts.message ?? `Email is invalid`,
      opts.code ?? 'INVALID_EMAIL',
      { ...opts?.extra ?? {} },
    );
  }

  url(opts: TshOptions = {}): this {
    this._url = true;
    return this.refine(
      (val) => {
        try {
          new URL(val);
          return true;
        } catch {
          return false;
        }
      },
      opts.message ?? `URL is invalid`,
      opts.code ?? 'INVALID_URL',
      { ...opts?.extra ?? {} },
    );
  }

  uuid(opts: TshOptions = {}): this {
    this._uuid = true;
    return this.refine(
      (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val),
      opts.message ?? `UUID is invalid`,
      opts.code ?? 'INVALID_UUID',
      { ...opts?.extra ?? {} },
    );
  }

  creditCard(opts: TshOptions = {}): this {
    this._creditCard = true;
    return this.refine(
      (val) => {
        // Luhn algorithm check for credit cards
        const sanitized = val.replace(/\D/g, '');
        if (!/^[0-9]{13,19}$/.test(sanitized)) return false;

        let sum = 0;
        for (let i = 0; i < sanitized.length; i++) {
          let digit = parseInt(sanitized[i], 10);
          if ((i + sanitized.length) % 2 === 0) {
            digit *= 2;
            if (digit > 9) digit -= 9;
          }
          sum += digit;
        }
        return sum % 10 === 0;
      },
      opts.message ?? `Credit card number is invalid`,
      opts.code ?? 'INVALID_CREDIT_CARD',
      { ...opts?.extra ?? {} },
    );
  }

  hexColor(opts: TshOptions = {}): this {
    this._hexColor = true;
    return this.refine(
      (val) => /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(val),
      opts.message ?? `Hex color is invalid`,
      opts.code ?? 'INVALID_HEX_COLOR',
      { ...opts?.extra ?? {} },
    );
  }

  ipAddress(opts: TshOptions = {}): this {
    this._ipAddress = true;
    return this.refine(
      (val) => {
        // IPv4 or IPv6
        return /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(val) ||
          /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/.test(val);
      },
      opts.message ?? `IP address is invalid`,
      opts.code ?? 'INVALID_IP_ADDRESS',
      { ...opts?.extra ?? {} },
    );
  }

  isoDate(opts: TshOptions = {}): this {
    this._isoDate = true;
    return this.refine(
      (val) =>
        typeof val === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(val) &&
        !isNaN(Date.parse(val)),
      opts.message ?? `Date must be a valid ISO 8601 string (UTC time required)`,
      opts.code ?? 'INVALID_ISO_DATE',
      { ...opts?.extra ?? {} },
    );
  }


  trimmed(opts: TshOptions = {}): this {
    this._trimmed = true;
    return this.refine(
      (val) => val === val.trim(),
      opts.message ?? `String is not trimmed`,
      opts.code ?? 'STRING_NOT_TRIMMED',
      { ...opts?.extra ?? {} },
    );
  }

  lowercase(opts: TshOptions = {}): this {
    this._lowercase = true;
    return this.refine(
      (val) => val === val.toLowerCase(),
      opts.message ?? `String is not fully lowercase`,
      opts.code ?? 'STRING_NOT_LOWERCASE',
      { ...opts?.extra ?? {} },
    );
  }

  uppercase(opts: TshOptions = {}): this {
    this._uppercase = true;
    return this.refine(
      (val) => typeof val === "string" && val === val.toUpperCase(),
      opts.message ?? `String is not fully uppercase`,
      opts.code ?? 'STRING_NOT_UPPERCASE',
      { ...opts?.extra ?? {} },
    );
  }

  alphanumeric(opts: TshOptions = {}): this {
    this._alphanumeric = true;
    return this.refine(
      (val) => /^[a-zA-Z0-9]+$/.test(val),
      opts.message ?? `String must contain only alphanumeric characters`,
      opts.code ?? 'INVALID_ALPHANUMERIC',
      { ...opts?.extra ?? {} },
    );
  }

  contains(substring: string, opts: TshOptions = {}): this {
    this._contains = substring;
    return this.refine(
      (val) => val.includes(substring),
      opts.message ?? `String must contain "${substring}"`,
      opts.code ?? 'MISSING_SUBSTRING',
      { ...opts?.extra ?? {}, substring },
    );
  }

  startsWith(prefix: string, opts: TshOptions = {}): this {
    this._startsWith = prefix;
    return this.refine(
      (val) => val.startsWith(prefix),
      opts.message ?? `String must start with "${prefix}"`,
      opts.code ?? 'MISSING_PREFIX',
      { ...opts?.extra ?? {} },
    );
  }

  endsWith(suffix: string, opts: TshOptions = {}): this {
    this._endsWith = suffix;
    return this.refine(
      (val) => val.endsWith(suffix),
      opts.message ?? `String must end with "${suffix}"`,
      opts.code ?? 'MISSING_SUFFIX',
      { ...opts?.extra ?? {} },
    );
  }

  includes(substring: string, opts: TshOptions = {}): this {
    return this.contains(substring, opts);
  }

  oneOf(options: string[], opts: TshOptions = {}): this {
    return this.refine(
      (val) => options.includes(val),
      opts.message ?? `String must be one of: ${options.join(', ')}`,
      opts.code ?? 'VALUE_NOT_IN_OPTIONS',
      { ...opts?.extra ?? {}, options },
    );
  }

  notEmpty(opts: TshOptions = {}): this {
    return this.refine(
      (val) => val.length > 0,
      opts.message ?? `String must not be empty`,
      opts.code ?? 'EMPTY_STRING',
      { ...opts?.extra ?? {} },
    );
  }

  asNumber(opts: TshOptions = {}): this {
    return this.refine(
      (val) => !isNaN(parseFloat(val)),
      opts.message ?? `String must represent a valid number`,
      opts.code ?? 'INVALID_NUMBER_STRING',
      { ...opts?.extra ?? {} },
    );
  }

  asInteger(opts: TshOptions = {}): this {
    return this.refine(
      (val) => /^-?\d+$/.test(val),
      opts.message ?? `String must represent a valid integer`,
      opts.code ?? 'INVALID_INTEGER_STRING',
      { ...opts?.extra ?? {} },
    );
  }

  asBoolean(opts: TshOptions = {}): this {
    return this.refine(
      (val) => ['true', 'false', '1', '0'].includes(val.toLowerCase()),
      opts.message ?? `String must represent a boolean (true/false/1/0)`,
      opts.code ?? 'INVALID_BOOLEAN_STRING',
      { ...opts?.extra ?? {} },
    );
  }

  asJson(opts: TshOptions = {}): this {
    return this.refine(
      (val) => {
        try {
          JSON.parse(val);
          return true;
        } catch {
          return false;
        }
      },
      opts.message ?? `String must be valid JSON`,
      opts.code ?? 'INVALID_JSON',
      { ...opts?.extra ?? {} },
    );
  }
}