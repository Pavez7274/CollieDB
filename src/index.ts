import { existsSync, mkdirSync, readFileSync } from "fs";
import { writeFile } from "fs/promises";
import { get, has, merge, set, unset } from "lodash";
import type { GetFieldType } from "lodash";
import { EventEmitter } from "events";
import { join } from "path";

/**
 * Generates a unique token.
 * @param {number} [len=5] - The length of the random sequence.
 * @returns {string} A random token.
 */
export function generateToken(len = 5): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, len);
  return timestamp + random;
}

/**
 * Type definition for database options.
 */
export interface DataBaseOptions {
  /**
   * Table name for timeouts.
   */
  timeoutsTable: string;
  /**
   * Indicates whether it will be saved automatically.
   */
  autoSave: boolean;
  /**
   * List of tables in the database.
   */
  tables: {
    /**
     * Table name.
     */
    name: string;
    /**
     * Table file path.
     */
    mod: string;
  }[];
  /**
   * Database directory path.
   */
  mod: string;
}

/**
 * Type definition for the timeout object.
 */
export type Timeout = {
  /**
   * Timestamp when the timeout will expire.
   */
  expires: number;
  /**
   * Value associated with the timeout.
   */
  value: unknown;
  /**
   * Timeout duration in milliseconds.
   */
  time: number;
  /**
   * Timeout Ids
   */
  id: string;
};

/**
 * Default options for the database.
 */
export const DefaultDataBaseOptions = {
  tables: [{ name: "main", mod: "main.json" }],
  timeoutsTable: "timeouts",
  mod: "./database/",
  autoSave: true,
};

/**
 * Class that represents the database and extends EventEmitter.
 */
export default class DataBase extends EventEmitter {
  public options: DataBaseOptions;
  public datas: Record<string, object> = {};
  private mods: Record<string, string> = {};
  private ready = false;

  /**
   * Build a new database instance.
   * @param options - Partial options to configure the database.
   */
  constructor(options: Partial<DataBaseOptions> = DefaultDataBaseOptions) {
    super();
    this.options = merge(options, DefaultDataBaseOptions);
  }

  /**
   * Initialize the database.
   */
  public async init() {
    this.options = merge(DefaultDataBaseOptions, this.options);

    for (const Table of this.options.tables) {
      if (!existsSync(this.options.mod)) {
        mkdirSync(this.options.mod);
      }
      const Path = join(this.options.mod, Table.mod);
      this.mods[Table.name] = Path;

      if (!existsSync(Path)) {
        await writeFile(Path, JSON.stringify({}, null, "\t"));
      }

      this.datas[Table.name] = JSON.parse(readFileSync(Path, "utf-8"));
    }

    this.ready = true;
    this.emit("ready", this);

    const Timeouts = this.datas[this.options.timeoutsTable] as Record<
      string,
      Timeout
    >;
    for (const TimeuotId in Timeouts) {
      if (Date.now() >= Timeouts[TimeuotId].expires) {
        this.expire(TimeuotId);
      } else {
        setTimeout(() => {
          this.expire(TimeuotId);
        }, Timeouts[TimeuotId].expires - Date.now() ?? 1);
      }
    }
  }

  /**
   * A timeout expires.
   * @param {string} tid - timeout ID.
   * @param {string} [table] - Table name.
   */
  public expire(tid: string, table: string = this.options.timeoutsTable) {
    this.checkTable(table);
    this.emit("expires", (this.datas[table] as Record<string, Timeout>)[tid]);
    this.delete(table, tid);
  }

  /**
   * Save the database.
   * @param {string} [table] - Table name.
   * @returns {Promise<boolean>} A boolean indicating whether the save was successful.
   */
  public async save(
    table: string = this.options.tables[0].name
  ): Promise<boolean> {
    this.checkTable(table);
    await writeFile(
      this.mods[table],
      JSON.stringify(this.datas[table], null, "\t")
    );
    return true;
  }

  /**
   * Sets a value in the database.
   * @param {string} [table] - Name of the table.
   * @param {string | string[]} key - Key or path to set the value.
   * @param {T} value - Value to set.
   * @param {boolean} emit - A boolean indicating whether to emit an update event.
   * @returns The set value.
   */
  public set<T>(
    table: string = this.options.tables[0].name,
    key: string | string[],
    value: T,
    emit: boolean = true
  ) {
    this.checkTable(table);
    set(this.datas[table], key, value ?? null);
    emit && this.emit("update", key, value, table);

    if (this.options.autoSave) {
      this.save(table);
    }

    return value;
  }

  /**
   * Edits a value in the database.
   * @param {string} [table] - Name of the table
   * @param {string | string[]} key - Key or path to edit the value.
   * @param {(value: T, key: string) => T} predicate - Function to edit
   * @param {boolean} emit - A boolean indicating whether to emit an update event.
   * @returns {boolean} True if the value can be edited.
   */
  public edit<T>(
    table: string = this.options.tables[0].name,
    key: string | string[],
    predicate: (value: T, key: string | string[]) => T,
    force = false,
    emit: boolean = true
  ): boolean {
    this.checkTable(table);
    if (this.has(table, key) || force) {
      this.set(
        table,
        key,
        predicate(
          this.get<T, string>(table, key as string) as T,
          key as string
        ),
        emit
      );
      return true;
    }
    return false;
  }

  /**
   * Create a timeout in the database.
   * @param {T} value - Value associated with the timeout.
   * @param {number} time - Timeout duration in milliseconds.
   * @param {string} id - ID of the timeout.
   * @param {string} [table] - Name of the table for timeouts.
   * @returns The provided value.
   */
  public timeout<T = unknown>(
    value: T,
    time: number,
    id: string = generateToken(),
    table: string = this.options.timeoutsTable
  ): Timeout {
    this.checkTable(table);
    const data = this.set<Timeout>(
      table,
      id,
      {
        expires: Date.now() + time,
        value,
        time,
        id,
      },
      false
    );
    this.emit("createTimeout", data);
    return data;
  }

  /**
   * Gets a value from the database.
   * @param {string} [table] - Name of the table.
   * @param {K} key - Key or path to the value.
   * @param {R} dvalue - Default value to return if the key does not exist.
   * @returns The returned value or the default value.
   */
  public get<
    T extends unknown,
    K extends string | string[] = string,
    R = GetFieldType<T, K>
  >(
    table: string = this.options.tables[0].name,
    key: K,
    dvalue?: R
  ): R | undefined | null {
    this.checkTable(table);
    return (get(this.datas[table], key) as R) ?? dvalue;
  }

  /**
   * Gets the entire data object of a table.
   * @param {string} [table] - Name of the table.
   * @returns The data object of the specified table.
   */
  public data(table: string = this.options.tables[0].name): object {
    this.checkTable(table);
    return this.datas[table];
  }

  /**
   * Checks if a key exists in the database.
   * @param {string} [table] - Name of the table.
   * @param {string | string[]} key - Key or path to verify.
   * @returns A boolean indicating whether the key exists.
   */
  public has(
    table: string = this.options.tables[0].name,
    key: string | string[]
  ): boolean {
    this.checkTable(table);
    return has(this.datas[table], key);
  }

  /**
   * Gets all the keys of a table.
   * @param {string} [table] - Name of the table.
   * @returns An array of keys in the specified table.
   */
  public keys(table: string = this.options.tables[0].name) {
    this.checkTable(table);
    return Object.keys(this.datas[table]);
  }

  /**
   * Delete a key from the database.
   * @param {string} [table] - Name of the table.
   * @param {string | string[]} key - Key or path to delete.
   * @returns A boolean indicating whether the deletion was successful.
   */
  public delete(
    table: string = this.options.tables[0].name,
    key: string
  ): true {
    this.checkTable(table);
    this.emit("delete", key, table);
    unset(this.datas[table], key);

    if (this.options.autoSave) {
      this.save(table);
    }

    return true;
  }

  /**
   * Check if the database is ready.
   * @returns A boolean indicating whether the database is ready.
   * @throws Error if the database is not yet initialized.
   */
  private checkReady(): true {
    if (!this.ready) {
      throw new Error("The database has not been initialized yet!");
    }
    return true;
  }

  /**
   * Checks if a table is registered and ready.
   * @param table - Name of the table.
   * @returns A boolean indicating whether the table is registered and ready.
   * @throws Error if table is not registered.
   */
  private checkTable(table: string): true {
    this.checkReady();

    if (!this.mods[table]) {
      throw new Error(`The table ${table} is not registered!`);
    }

    return true;
  }
}
