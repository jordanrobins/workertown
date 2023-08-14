import { Kysely, type MigrationResult, Migrator } from "kysely";
import { PlanetScaleDialect } from "kysely-planetscale";

import { MigrationProvider } from "./migrations.js";
import { StorageAdapter } from "./storage-adapter.js";

export interface PlanetscaleStorageAdapterOptions {
  url?: string;
  host?: string;
  username?: string;
  password?: string;
  migrationsPrefix?: string;
}

export class PlanetscaleStorageAdapter<T = {}> extends StorageAdapter {
  public readonly client: Kysely<T>;

  public readonly migrationsPrefix: string = "wt";

  constructor(options: PlanetscaleStorageAdapterOptions = {}) {
    super();

    this.client = new Kysely<T>({
      dialect: new PlanetScaleDialect(options),
    });
    this.migrationsPrefix = options.migrationsPrefix ?? this.migrationsPrefix;
  }

  public async runMigrations(down = false) {
    if (this.migrations.length > 0) {
      const migrator = new Migrator({
        db: this.client,
        provider: new MigrationProvider(this.migrations),
        migrationLockTableName: `${this.migrationsPrefix}_migrations_lock`,
        migrationTableName: `${this.migrationsPrefix}_migrations`,
      });

      if (!down) {
        return await migrator.migrateToLatest();
      } else {
        const allResults: MigrationResult[] = [];
        let error: unknown;

        try {
          let results;
          for (const _migration of this.migrations) {
            ({ results, error } = await migrator.migrateDown());

            allResults.push(...(results as MigrationResult[]));

            if (error) {
              break;
            }
          }
        } catch (_) {
          error = (_ as Error).message;
        }

        return { results: allResults, error };
      }
    }

    return { results: [] };
  }
}
