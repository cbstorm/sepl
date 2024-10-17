import { WebElement } from 'selenium-webdriver';
import { SeleniumDriver } from './selenium';

const ASSIGN_OP = ':=';
const VAR_OP = '$';

function IndicesOf(str: string, p: string) {
  const indices: number[] = [];
  str.split('').forEach((c, idx) => {
    if (c == p) {
      indices.push(idx);
    }
  });
  return indices;
}

function Wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(0);
    }, ms);
  });
}

function IsVarToken(val: string) {
  return val && !/[= '"]/.test(val);
}

function IsVarOp(val: string) {
  return val.startsWith(VAR_OP) && IsVarToken(val);
}

function IsWrappedByDoubleQuote(val: string): boolean {
  return !!val && val[0] == '"' && val[val.length - 1] == '"';
}

function UnwrapDoubleQuote(val: string): string {
  return val.slice(1, val.length - 1);
}

export type IVars = { [key: string]: string };

export enum Keyword {
  DECLARE = 'DECLARE',
  INTO = 'INTO',
  BEGIN = 'BEGIN',
  END = 'END',
}
export enum EStatementAction {
  GOTO = 'GOTO',
  CLICK = 'CLICK',
  SEND_KEYS = 'SEND_KEYS',
  GET_TEXT = 'GET_TEXT',
  GET_HTML = 'GET_HTML',
  WAIT = 'WAIT',
}

export enum EStatementLocationType {
  TEXT = 'text',
  XPATH = 'xpath',
  CSS = 'css',
}

export enum EStatementValueType {
  PLAIN = 0,
  VAR = 1,
}

export interface IStatementLocation {
  type?: EStatementLocationType;
  value?: string;
  SelectElement: (sdriver: SeleniumDriver) => Promise<WebElement>;
}

export interface IStatementValue {
  type: EStatementValueType;
  raw_val: string;
  val: string;
}

export interface IStatement {
  action: EStatementAction;
  Do: (sdriver: SeleniumDriver) => Promise<any>;
}

export interface IHasValueStatement extends IStatement {
  value: IStatementValue;
  vars: IVars;
}
export interface IHasLocationStatement extends IStatement {
  location: IStatementLocation;
}

export interface IHasDestinationStatement extends IStatement {
  vars: IVars;
  destination: string;
}

export class WithValueStatement {
  protected _validateVal(raw_val: string, vars: IVars) {
    let is_use_var = IsVarOp(raw_val);
    if (!is_use_var && !IsWrappedByDoubleQuote(raw_val)) {
      throw new Error('value invalid');
    }
    if (is_use_var) {
      raw_val = raw_val.slice(1);
      if (vars[raw_val] == undefined) {
        throw new Error(`varible ${raw_val} is not declared in DECLARE section`);
      }
    } else {
      raw_val = UnwrapDoubleQuote(raw_val);
    }
    if (!raw_val) {
      throw new Error('value invalid');
    }
    return new StatementValue(
      is_use_var ? EStatementValueType.VAR : EStatementValueType.PLAIN,
      raw_val,
      is_use_var ? vars[raw_val] : raw_val
    );
  }
}

export class WithDestinationStatement {
  protected _validateDst(line: string[], vars: IVars) {
    if (line[2] != Keyword.INTO) {
      throw new Error("the statement has been missing 'INTO' keyword");
    }
    let dst = line[3];
    if (!dst) {
      throw new Error('the statement has been missing the destination to store value"');
    }
    if (!IsVarOp(dst)) {
      throw new Error('the destination variable must be start with "$"');
    }
    dst = dst.slice(1);
    if (vars[dst] == undefined) {
      throw new Error(`variable "${dst}" isn't declared in DECLARE section`);
    }
    return dst;
  }
}

export class StatementValue implements IStatementValue {
  type: EStatementValueType;
  raw_val: string;
  val: string;
  constructor(type: EStatementValueType, raw_val: string, val: string) {
    this.type = type;
    this.raw_val = raw_val;
    this.val = val;
  }
}

export class StatementLocation implements IStatementLocation {
  type: EStatementLocationType = '' as EStatementLocationType;
  value!: string;
  constructor(location: string) {
    if (location.startsWith(`${EStatementLocationType.XPATH}::`)) {
      this.type = EStatementLocationType.XPATH;
      this.value = location.replace(`${EStatementLocationType.XPATH}::`, '');
    }
    if (location.startsWith(`${EStatementLocationType.TEXT}::`)) {
      this.type = EStatementLocationType.TEXT;
      this.value = location.replace(`${EStatementLocationType.TEXT}::`, '');
    }
    if (location.startsWith(`${EStatementLocationType.CSS}::`)) {
      this.type = EStatementLocationType.CSS;
      this.value = location.replace(`${EStatementLocationType.CSS}::`, '');
    }
    if (!this.type || !this.value) {
      throw new Error(`location invalid with: ${location}`);
    }
    if (this.value[0] != '"' || this.value[this.value.length - 1] != '"') {
      throw new Error(`location value must be wrapped by '"' (double quote)`);
    }
    this.value = this.value.slice(1, this.value.length - 1);
    if (!this.value) {
      throw new Error(`location invalid with: ${location}`);
    }
  }
  async SelectElement(sdriver: SeleniumDriver) {
    switch (this.type) {
      case EStatementLocationType.CSS:
        return await sdriver.GetElementByCss(this.value!);
      case EStatementLocationType.TEXT:
        return await sdriver.GetElementByText(this.value);
      case EStatementLocationType.XPATH:
        return await sdriver.GetElementByXPath(this.value);
    }
  }
}

export class GotoStatement extends WithValueStatement implements IHasValueStatement {
  action: EStatementAction = EStatementAction.GOTO;
  value: IStatementValue;
  vars: IVars;
  constructor(line: string[], vars: IVars) {
    super();
    this.value = this._validateVal(line[1], vars);
    this.vars = vars;
  }
  async Do(sdriver: SeleniumDriver) {
    await sdriver.Driver().get(this.value.val);
  }
}
export class SendKeysStatement extends WithValueStatement implements IHasValueStatement, IHasLocationStatement {
  action: EStatementAction = EStatementAction.SEND_KEYS;
  value: IStatementValue;
  location: IStatementLocation;
  vars: IVars;
  constructor(line: string[], vars: IVars) {
    super();
    this.location = new StatementLocation(line[1]);
    this.value = this._validateVal(line[2], vars);
    this.vars = vars;
  }
  async Do(sdriver: SeleniumDriver) {
    const el = await this.location.SelectElement(sdriver);
    await el.sendKeys(this.value.val);
  }
}

export class ClickStatement implements IHasLocationStatement {
  action: EStatementAction = EStatementAction.CLICK;
  location: IStatementLocation;
  constructor(line: string[]) {
    this.location = new StatementLocation(line[1]);
  }
  async Do(sdriver: SeleniumDriver) {
    const el = await this.location.SelectElement(sdriver);
    await el.click();
  }
}

export class WaitStatement implements IStatement {
  action: EStatementAction = EStatementAction.WAIT;
  value: number;
  constructor(line: string[]) {
    const v = line[1];
    if (!v) {
      throw new Error('value is required with WAIT statement');
    }

    let is_s = false;
    let is_ms = false;
    switch (true) {
      case v.endsWith('ms'):
        is_ms = true;
        break;
      case v.endsWith('s'):
        is_s = true;
        break;
      default:
        break;
    }
    if (!is_ms && !is_s) {
      throw new Error('unit is required with WAIT statement');
    }
    let num = 0;
    if (is_ms) {
      const n = v.replace('ms', '');
      num = parseInt(n);
    }
    if (is_s) {
      const n = v.replace('s', '');
      num = parseInt(n);
    }
    if (!num || num <= 0) {
      throw new Error(`WAIT statement value invalid with ${num}`);
    }
    this.value = num;
    if (is_ms) return;
    this.value = this.value * 1000;
  }
  async Do(sdriver: SeleniumDriver) {
    await Wait(this.value);
  }
}

export class GetTextStatement
  extends WithDestinationStatement
  implements IHasDestinationStatement, IHasLocationStatement
{
  action: EStatementAction = EStatementAction.GET_TEXT;
  location: IStatementLocation;
  destination: string;
  vars: IVars;
  constructor(line: string[], vars: IVars) {
    super();
    this.location = new StatementLocation(line[1]);
    const dst = this._validateDst(line, vars);
    this.destination = dst;
    this.vars = vars;
  }
  async Do(sdriver: SeleniumDriver) {
    const el = await this.location.SelectElement(sdriver);
    const text = await el.getText();
    this.vars[this.destination] = text;
  }
}

export class GetHTMLStatement
  extends WithDestinationStatement
  implements IHasDestinationStatement, IHasLocationStatement
{
  action: EStatementAction = EStatementAction.GET_HTML;
  destination: string;
  location: IStatementLocation;
  vars: IVars;
  constructor(line: string[], vars: IVars) {
    super();
    this.location = new StatementLocation(line[1]);
    const dst = this._validateDst(line, vars);
    this.destination = dst;
    this.vars = vars;
  }
  async Do(sdriver: SeleniumDriver) {
    const el = await this.location.SelectElement(sdriver);
    const html = await el.getAttribute('innerHTML');
    this.vars[this.destination] = html;
  }
}

export class SEPL {
  private _raw: string;
  private _procedures: IStatement[] = [];
  private _nomalized_lines: string[][] = [];
  private _declare_lines: string[] = [];
  private _procedure_lines: string[] = [];
  private _variables: { [key: string]: string } = {};
  constructor(raw: string) {
    this._raw = raw;
  }

  Variables() {
    return this._variables;
  }
  ProcedureStatements() {
    return this._procedures;
  }

  Compile() {
    this._parseSection();
    this._parseLines();
    this._mapping();
    return this;
  }
  // Parse sections from raw text input to separate DECLARE section and BEGIN procedure section.
  private _parseSection() {
    const lines = this._raw
      .split('\n')
      .map((e) => e.trim())
      .filter(Boolean);
    if (![Keyword.DECLARE, Keyword.BEGIN].includes(lines[0] as Keyword)) {
      throw new Error('procedure statement must be start with DECLARE or BEGIN');
    }
    let end_idx = lines.indexOf(Keyword.END);
    if (end_idx == -1) {
      throw new Error('each section must be end with END keyword');
    }
    if (lines[0] == Keyword.DECLARE) {
      this._declare_lines = lines.splice(0, end_idx + 1);
      this._declare_lines.splice(0, 1);
      this._declare_lines.splice(this._declare_lines.length - 1, 1);
    }
    end_idx = lines.indexOf(Keyword.END);
    if (end_idx == -1) {
      throw new Error('each section must be end with END keyword');
    }
    if (lines[0] == Keyword.BEGIN) {
      this._procedure_lines = lines.splice(0, end_idx + 1);
      this._procedure_lines.splice(0, 1);
      this._procedure_lines.splice(this._procedure_lines.length - 1, 1);
      if (this._procedure_lines.length <= 0) {
        throw new Error('Statements is empty');
      }
    }
    this._raw = '';
  }
  private _parseLines() {
    this._parseDeclares();
    this._parseProcedures();
  }
  private _parseDeclares() {
    this._declare_lines
      .join('')
      .split(';')
      .map((e) => e.trim())
      .filter(Boolean)
      .forEach((e) => {
        const t = e.split(ASSIGN_OP);
        const is_initial_with_val = t.length > 1;
        let x, y;
        if (is_initial_with_val) {
          x = t.splice(0, 1).join('');
          y = t.join(ASSIGN_OP).trim();
          if (!IsWrappedByDoubleQuote(y)) {
            throw new Error(`initial value must be wrapped by '""' (double quote)`);
          }
          y = UnwrapDoubleQuote(y);
          if (!y) {
            throw new Error('initial value cannot empty');
          }
        } else {
          x = t[0];
          y = '';
        }
        x = x.trim();
        if (!x || !IsVarToken(x)) {
          throw new Error(`variable '${x}' invalid`);
        }
        this._variables[x] = y;
      });
    this._declare_lines = [];
  }
  private _parseProcedures() {
    let lines = this._procedure_lines
      .join('')
      .split(';')
      .map((e) => e.trim())
      .filter(Boolean)
      .map((l) =>
        l
          .split(' ')
          .map((e) => e.trim())
          .filter(Boolean)
      );
    const nomalized_lines: string[][] = [];
    lines.forEach((l, i) => {
      let open_quote = -1;
      let close_quote = -1;
      l.forEach((t, idx) => {
        const quote_indices = IndicesOf(t, '"');
        const is_include_quote = quote_indices.length > 0;
        if ((!is_include_quote || quote_indices.length > 1) && open_quote == -1 && close_quote == -1) {
          if (!nomalized_lines[i]) nomalized_lines[i] = [];
          nomalized_lines[i].push(t);
          return;
        }
        if (is_include_quote && open_quote == -1) {
          open_quote = idx;
          return;
        }
        if (is_include_quote && open_quote != -1) {
          close_quote = idx;
        }
        if (open_quote != -1 && close_quote != -1) {
          nomalized_lines[i] = nomalized_lines[i].concat(l.slice(open_quote, close_quote + 1).join(' '));
          open_quote = -1;
          close_quote = -1;
        }
      });
    });
    this._nomalized_lines = nomalized_lines;
    this._procedure_lines = [];
  }
  private _mapping() {
    const procedures: IStatement[] = this._procedures;
    for (const l of this._nomalized_lines) {
      switch (l[0]) {
        case EStatementAction.GOTO:
          procedures.push(new GotoStatement(l, this._variables));
          break;
        case EStatementAction.CLICK:
          procedures.push(new ClickStatement(l));
          break;
        case EStatementAction.SEND_KEYS:
          procedures.push(new SendKeysStatement(l, this._variables));
          break;
        case EStatementAction.GET_TEXT:
          procedures.push(new GetTextStatement(l, this._variables));
          break;
        case EStatementAction.GET_HTML:
          procedures.push(new GetHTMLStatement(l, this._variables));
          break;
        case EStatementAction.WAIT:
          procedures.push(new WaitStatement(l));
          break;
      }
    }
  }
  static async Execute(statements: IStatement[], otps: { close?: boolean } = { close: true }) {
    let sdriver!: SeleniumDriver;
    try {
      sdriver = await SeleniumDriver.New();
      for (const s of statements) {
        await s.Do(sdriver);
      }
    } catch (error) {
      console.log('Execute error: ', error);
      throw error;
    } finally {
      if (otps.close && sdriver) {
        await sdriver.Quit();
      }
    }
  }
}
