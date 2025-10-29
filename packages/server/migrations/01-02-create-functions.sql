CREATE OR REPLACE FUNCTION pzero.get_info(table_name text, schema_name text DEFAULT 'pzero')
RETURNS jsonb AS $$
    var stmt = `SELECT
    tc.table_schema,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema='${schema_name}'
        AND tc.table_name='${table_name}'`;
    var recs= plv8.execute(`select ${schema_name}.get_records($1, $2)`, stmt, ['']);
    for (var i = 0; i < recs.length; i++) {
        var rec = recs[i]['get_records'];
        plv8.elog(INFO, `rec: ${rec}`);
        recs[i] = rec;
    }
    return recs;
$$ LANGUAGE plv8 IMMUTABLE STRICT;


CREATE OR REPLACE FUNCTION is_valid_url(url text) RETURNS BOOLEAN AS $$
    if (!!!url) {
        return false;
    }
    url = url.trim();
    if (url.length === 0) {
        return false;
    }
    if (url.length > 255) {
        return false;
    }
    var regex = new RegExp(`^((http|https)://)?[a-zA-Z0-9.-]+.[a-zA-Z]{2,}$`)
    return regex.test(url);
$$ LANGUAGE plv8 IMMUTABLE STRICT;

CREATE OR REPLACE FUNCTION pzero.get_records_internal(stmt text)
RETURNS SETOF jsonb -- Or setof json
AS $$
  try {
    var users = plv8.execute(stmt);
    var len = users.length;
    for (var i = 0; i < len; i++) {
        // You can modify the objects here if needed
        plv8.return_next(users[i]); // Return each object as a row
    }
  } catch (err) {
    plv8.elog(ERROR, err);
  }
$$ LANGUAGE plv8;

CREATE OR REPLACE FUNCTION pzero.get_records(stmt text, columns text[])
RETURNS SETOF jsonb
AS $$
try {

    var recs = plv8.execute('select pzero.get_records_internal($1)', stmt);
    plv8.elog(INFO, `recs: ${recs.length}`);
    var len = recs.length;
    var results = new Array(len);
    plv8.elog(INFO, `recs: ${recs.length}`);
    var notColumns = columns.length === 0 || !!!columns[0];
    var singleton = columns.length === 1 && !!columns[0];
    var col = singleton && columns[0] ? columns[0] : null;
    plv8.elog(INFO, `notColumns: ${notColumns}`);
    plv8.elog(INFO, `singleton: ${singleton}`);
    for (var i = 0; i < len; i++) {
        results[i] = {};
        plv8.elog(INFO, `i: ${i}`);
        var rec= recs[i]['get_records_internal'];

        plv8.elog(INFO, `notColumns: ${notColumns}`);

        if (singleton) {
            results[i] = col ? rec[col] : rec[Object.keys(rec)[0]];
            continue;
        }
        plv8.elog(INFO,`columns 138: ${columns.length}`);
        if (notColumns) {
            results[i] = rec;
            continue;
        }
        for (var j = 0; j < columns.length; j++) {
            plv8.elog(INFO, `column: ${rec[columns[j]]} ${columns[j]}`);
            results[i][columns[j]] = rec[columns[j]];
        }
    }
}catch (err) {
    plv8.elog(ERROR, err);
    return `ERROR: ${err}`;
} finally {
    plv8.elog(INFO, `returning #150: ${results.length}`);
}
plv8.elog(INFO, `returning #153: ${results}`);
return results;
$$ LANGUAGE plv8;
select pzero.get_info('auth','pzero');


CREATE OR REPLACE FUNCTION incmix.check_table_exists( table_name text, schema_name text DEFAULT 'pzero')
RETURNS boolean
AS $$
    var  stmt = `SELECT 1 FROM pg_tables WHERE schemaname = ${schema_name} AND tablename = ${table_name}`;
    try {
        var result = plv8.execute(stmt);
        if (result && result.length > 0) {
            return true;
        }
    } catch (err) {
        plv8.elog(ERROR, err);
        return false;
    }
    return false;
$$ LANGUAGE plv8 IMMUTABLE STRICT;

CREATE OR REPLACE FUNCTION getColumnNo(table_name text, column_name text, schema_name text DEFAULT 'pzero') RETURNS INTEGER AS $$
    var stmt = `SELECT ordinal_position FROM information_schema.columns WHERE table_schema = $3 AND table_name = $1 AND column_name = $2`;
    var result = plv8.execute(stmt, table_name, column_name, schema_name);
    if (result.length > 0) {
        return result[0]['ordinal_position'];
    }
    return -1;
$$ LANGUAGE plv8 IMMUTABLE STRICT;

CREATE OR REPLACE FUNCTION pzero.generate_uuid(table_name text, id BIGINT, C_AT TIMES) RETURNS UUID AS $$
    var result = plv8.execute('SELECT mmn from mmn AS m WHERE m.table_name = $1', table_name);
    if (result.length === 0) {
        throw `No MMN found for table: ${table_name}`;
    }
    var mmn = result[0]['mmn'];
    return uuid[0]['uuid'];
$$ LANGUAGE plv8 IMMUTABLE STRICT;

CREATE OR REPLACE FUNCTION pzero.audit_trigger_plv8()
RETURNS TRIGGER LANGUAGE plv8 AS $$
    var txid = plv8.execute("SELECT txid_current()")[0].txid_current;
    var tableName = TD.table_name;
    var oldRow = TD.old; // Available for UPDATE and DELETE
    var newRow = TD.new; // Available for INSERT and UPDATE
    var auditColumns = ['id', 'c_by', 'c_at', 'u_by', 'u_at', 'is_del']; // Columns to audit
    var isDelColumn = 'is_del';
    var c_by = newRow.c_by;
    var data = newRow.data;
    if (data) {
        data = JSON.parse(data)
        if (data.meta) {
            c_by = data.meta.c_by;
            delete data.meta;
        }
    }
    delete newRow.c_by;
    delete newRow.u_by;
    if (!c_by) {
        throw `Missing Audit field - c_by`
    }
    var id = newRow.id;
    // Insert into txns table if not exists
    plv8.execute("SELECT mmn from pzero.mmn where table_name = $1", [tableName]);
    var mmn = result[0]['mmn'];
    if (TD.event === 'INSERT' && !newRow.id) {
        newRow.id = pzero.gen_monotonic_id(mmn);
    }
    plv8.execute("INSERT INTO pzero.txns (id, c_by, c_at) VALUES ($1, $2, NOW()) ON CONFLICT (txid) DO NOTHING", [txid, c_by]);
    if (newRow.is_del || (TD.event === 'DELETE')) {
        // If the is_del column is set to true, log a deletion
        plv8.execute(
            "INSERT INTO pzero.audits (txn_id, mmn, row_id, col_name, new_val, is_del) VALUES ($1, $2, $3, $4, $5, TRUE)",
            [txid, mmn, oldRow.id, isDelColumn, 'TRUE', true]
        );
        return TD.new; // For DELETE triggers, return the new row
    }

    if (TD.event === 'INSERT' || TD.event === 'UPDATE') {
        continue;
    } else {
        throw `Unsupported event type: ${TD.event}`;
    }
    for (var colName in newRow) {
        if ((auditColumns.indexOf(colName.toLowerCase()) !== -1) && newRow.hasOwnProperty(colName)) {
            plv8.execute(
                "INSERT INTO pzero.audits (txn_id, mmn, rowid, cname, cvalue) VALUES ($1, $2, $3, $4, $5)",
                [txid, mmn, id, colName, String(newRow[colName])]
            );
        }
    }
    return TD.new; // For INSERT and UPDATE triggers, return the new row
$$;

CREATE OR REPLACE FUNCTION pzero.create_triggers_plv8()
RETURNS void
AS $$
  var tables = ['pzero.devices', 'pzero.endpoints', 'pzero.active_sessions', 'pzero.orgs', 'pzero.auth', 'pzero.users', 'pzero.relations'];
  // Define a name for the new trigger.
  for (var i = 0; i < tables.length; i++) {
    var target_table = tables[i];
  // Build the dynamic CREATE TRIGGER statement
    var sql = `CREATE TRIGGER pzero.audit_trigger_${target_table}` +
            ' BEFORE INSERT OR UPDATE ON ' + target_table +
            ' FOR EACH ROW EXECUTE FUNCTION pzero.audit_trigger_plv8()';

  // Execute the dynamic SQL using plv8.execute().
    plv8.execute(sql);
    plv8.elog(NOTICE, 'Created trigger ' + trigger_name + ' on table ' + target_table);
  }
$$ LANGUAGE plv8;

select pzero.create_triggers_plv8();