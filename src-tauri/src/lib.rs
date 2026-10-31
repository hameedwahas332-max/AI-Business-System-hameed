use tauri_plugin_sql::{Migration, MigrationKind};

fn build_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "initialize_outbox_and_ledger_tables",
            sql: "
                CREATE TABLE IF NOT EXISTS local_transactional_outbox (
                    uuid TEXT PRIMARY KEY,
                    tenantId TEXT NOT NULL,
                    userId TEXT NOT NULL,
                    deviceId TEXT NOT NULL,
                    transactionType TEXT NOT NULL,
                    createdAtClient TEXT NOT NULL,
                    idempotencyKey TEXT UNIQUE NOT NULL,
                    syncStatus TEXT NOT NULL,
                    schemaVersion INTEGER NOT NULL,
                    rowVersion INTEGER NOT NULL,
                    dependencyOrder INTEGER NOT NULL,
                    payload TEXT NOT NULL,
                    retryCount INTEGER DEFAULT 0,
                    lastAttemptAt TEXT,
                    errorReason TEXT,
                    serverSeq INTEGER
                );

                CREATE TABLE IF NOT EXISTS immutable_financial_ledger (
                    id TEXT PRIMARY KEY,
                    sequenceId INTEGER NOT NULL,
                    tenantId TEXT NOT NULL,
                    transactionUuid TEXT NOT NULL,
                    transactionType TEXT NOT NULL,
                    accountCode TEXT NOT NULL,
                    debit REAL DEFAULT 0,
                    credit REAL DEFAULT 0,
                    currency TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    referenceId TEXT,
                    description TEXT,
                    hash TEXT
                );

                CREATE TABLE IF NOT EXISTS sync_conflict_registry (
                    id TEXT PRIMARY KEY,
                    transactionUuid TEXT NOT NULL,
                    transactionType TEXT NOT NULL,
                    tenantId TEXT NOT NULL,
                    localPayload TEXT,
                    serverPayload TEXT,
                    conflictReason TEXT,
                    createdAt TEXT,
                    resolvedAt TEXT,
                    resolutionStrategy TEXT
                );

                CREATE TABLE IF NOT EXISTS device_sync_cursors (
                    deviceId TEXT PRIMARY KEY,
                    tenantId TEXT NOT NULL,
                    lastServerSeq INTEGER DEFAULT 0,
                    lastSyncTimestamp TEXT
                );
            ",
            kind: MigrationKind::Up,
        }
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:erp_local_vault.db", build_migrations())
                .add_migrations("sqlite:erp_desktop_offline.db", build_migrations())
                .build(),
        )
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running Wahas ERP Tauri application");
}
