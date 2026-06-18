declare module 'node:sqlite' {
  export type SqliteRunResult = { changes: number; lastInsertRowid: number | bigint };

  export class StatementSync {
    run(...anonymousParameters: unknown[]): SqliteRunResult;
    get(...anonymousParameters: unknown[]): unknown;
    all(...anonymousParameters: unknown[]): unknown[];
  }

  export class DatabaseSync {
    constructor(location: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
