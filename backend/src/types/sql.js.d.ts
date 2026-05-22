declare module 'sql.js' {
  export interface Database {
    run(sql: string, params?: any[]): void
    exec(sql: string, params?: any[]): Array<{ columns: string[]; values: unknown[][] }>
    export(): Uint8Array
    close(): void
  }

  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number>) => Database
  }

  export default function initSqlJs(config?: { locateFile?: (file: string) => string }): Promise<SqlJsStatic>
}
