# Collie DataBase

Collie-DB is a simple JSON database package that provides basic database functionalities. It allows you to create, read, update, and delete data in JSON format. This package is designed to be easy to use and understand, making it suitable for small projects and applications.

## How to Use

### Installation

You can install the package using npm:

```bash
npm install collie-db
```

### Importing the Database

First, import the database class into your project:

```ts
import DataBase from "collie-db";
const db = new DataBase({
  tables: [{ name: "users", mod: "users.json" }],
});
```

### Configuration

| option        | description                                       | type      | default                                |
| ------------- | ------------------------------------------------- | --------- | -------------------------------------- |
| timeoutsTable | Table name for timeouts.                          | `string`  | `"timeouts"`                             |
| autoSave      | Indicates whether it will be saved automatically. | `boolean` | `true`                                 |
| tables        | List of tables in the database.                   | `Table[]` | `[{ name: "main", mod: "main.json" }]` |
| mod           | Database directory path.                          | `string`  | `"./database/"`                             |

### Initializing the Database

Before using the database, you need to initialize it. You can do this asynchronously:

```ts
void (async function init() {
  await db.init();
  console.log("DataBase initialized and ready to use!");
})();
```

### Basic Operations

#### 1. **Setting Data:**

You can set data in the database using the `set` method:

```ts
// DataBase.set<T>(table: string | undefined, key: string | string[], value: T, emit?: boolean): T
db.set("users", "JonhDoe", { name: "John Doe", age: 30 });
```

#### 2. **Getting Data:**

To retrieve data, use the `get` method:

```ts
// DataBase.get<T extends unknown, K extends string | string[] = string, R = GetFieldType<T, K>>(table: string | undefined, key: K, dvalue?: R): R | undefined | null
const user = db.get("users", "JonhDoe");
console.log(user); // Output: { name: 'John Doe', age: 30 }
```

#### 3. **Updating Data:**

Update existing data using the `set` method:

```ts
db.set("users", "JonhDoe", { name: "John Doe", age: 31 });
```

Update existing data using the `edit` method:

```ts
// DataBase.edit<T>(table: string | undefined, key: string | string[], predicate: (value: T, key: string | string[]) => T, force?: boolean, emit?: boolean): boolean
db.edit("users", "JonhDoe", function (value) {
  value.job = null; // ¿Chamban't?
  return value;
});
```

#### 4. **Deleting Data:**

Remove data from the database with the `delete` method:

```ts
// DataBase.delete(table: string | undefined, key: string): true
db.delete("users", "JonhDoe");
```

### Timeouts

The database also supports timeouts. You can set a timeout for a specific piece of data:

```ts
// DataBase.timeout<T = unknown>(value: T, time: number, id?: string, table?: string): T
db.timeout(
  "This will disappear after 5 seconds",
  5000,
  "unique-id" // If you don't put something, the dabase generates a random token.
);
```

### Events

The database emits events when data is updated, deleted, or when a timeout expires. You can subscribe to these events:

```ts
db.on("update", function (key, value, table) {
  console.log(`Data updated: ${key} in table ${table}`);
});

db.on("delete", function (key, table) {
  console.log(`Data deleted: ${key} from table ${table}`);
});

db.on("expires", function (data) {
  console.log(`Timeout expired for data: ${data}`);
});
```

### Auto-saving

The database supports auto-saving, which means it will automatically save changes to the JSON files:

```javascript
const db = new Database({ autoSave: true });
```

By default, the database will use the `main` table. You can customize table names and file paths when initializing the database.

## Contributing

Feel free to contribute to this project by reporting issues or creating pull requests. Your contributions are highly appreciated!

- [Support](https://discord.gg/MeUcf5tHPZ)
