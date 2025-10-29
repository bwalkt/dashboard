CREATE OR REPLACE FUNCTION pzero.get_info (table_name text, schema_name text DEFAULT 'pzero') returns jsonb AS $$
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
$$ language plv8 immutable strict;

CREATE OR REPLACE FUNCTION is_valid_url (url text) returns boolean AS $$
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
$$ language plv8 immutable strict;

CREATE OR REPLACE FUNCTION pzero.get_records_internal (stmt text) returns setof jsonb -- Or setof json
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
$$ language plv8;

CREATE OR REPLACE FUNCTION pzero.get_records (stmt text, columns TEXT[]) returns setof jsonb AS $$
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
$$ language plv8;

SELECT
  pzero.get_info ('auth', 'pzero');

CREATE OR REPLACE FUNCTION incmix.check_table_exists (table_name text, schema_name text DEFAULT 'pzero') returns boolean AS $$
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
$$ language plv8 immutable strict;

CREATE OR REPLACE FUNCTION getcolumnno (
  table_name text,
  column_name text,
  schema_name text DEFAULT 'pzero'
) returns integer AS $$
    var stmt = `SELECT ordinal_position FROM information_schema.columns WHERE table_schema = $3 AND table_name = $1 AND column_name = $2`;
    var result = plv8.execute(stmt, table_name, column_name, schema_name);
    if (result.length > 0) {
        return result[0]['ordinal_position'];
    }
    return -1;
$$ language plv8 immutable strict;

CREATE OR REPLACE FUNCTION pzero.generate_uuid (table_name text, id bigint, c_at times) returns uuid AS $$
    var result = plv8.execute('SELECT mmn from mmn AS m WHERE m.table_name = $1', table_name);
    if (result.length === 0) {
        throw `No MMN found for table: ${table_name}`;
    }
    var mmn = result[0]['mmn'];
    return uuid[0]['uuid'];
$$ language plv8 immutable strict;

CREATE OR REPLACE FUNCTION jsonb_diff (a jsonb, b jsonb) returns jsonb AS $$
  // Helper function to find all keys in both objects
  const allKeys = (obj1, obj2) => {
    const keys = new Set();
    if (typeof obj1 === 'object') {
      Object.keys(obj1).forEach(key => keys.add(key));
    }
    if (typeof obj2 === 'object') {
      Object.keys(obj2).forEach(key => keys.add(key));
    }
    return Array.from(keys);
  };

  // Recursive diffing function
  const diff = (obj1, obj2) => {
    const changes = {};
    const keys = allKeys(obj1, obj2);

    for (const key of keys) {
      const val1 = obj1 ? obj1[key] : undefined;
      const val2 = obj2 ? obj2[key] : undefined;

      // New key added to obj2
      if (val1 === undefined) {
        changes[key] = { status: 'added', newValue: val2 };
        continue;
      }

      // Key deleted from obj2
      if (val2 === undefined) {
        changes[key] = { status: 'deleted', oldValue: val1 };
        continue;
      }

      // Values differ (check for nested objects)
      if (typeof val1 === 'object' && typeof val2 === 'object' && val1 !== null && val2 !== null) {
        const nestedChanges = diff(val1, val2);
        if (Object.keys(nestedChanges).length > 0) {
          changes[key] = { status: 'updated', changes: nestedChanges };
        }
      } else if (val1 !== val2) {
        changes[key] = { status: 'updated', oldValue: val1, newValue: val2 };
      }
    }
    return changes;
  };

  // Entry point for the function
  const obj_a = JSON.parse(a);
  const obj_b = JSON.parse(b);
  const result = diff(obj_a, obj_b);
  
  return JSON.stringify(result);
$$ language plv8 immutable strict;

--SELECT jsonb_diff(
--  '{"user": {"name": "Alice", "id": 123}, "active": true}'::jsonb,
--  '{"user": {"name": "Bob", "email": "bob@example.com"}, "active": true}'::jsonb
--);
-- {
--  "user": {
--    "status": "updated",
--    "changes": {
--      "name": { "status": "updated", "oldValue": "Alice", "newValue": "Bob" },
--      "id": { "status": "deleted", "oldValue": 123 },
--      "email": { "status": "added", "newValue": "bob@example.com" }
--    }
--  }
--}
CREATE OR REPLACE FUNCTION get_country_name (country_id smallint) returns text AS $$
        plv8.elog(NOTICE, 'Initializing country cache...');
        const data = plv8.execute("SELECT id, name FROM country_codes");
        plv8.country_cache = {}; // Create the cache object.
        for (let i = 0; i < data.length; i++) {
            plv8.country_cache[data[i].id] = data[i].name; // Populate the cache.
        }
    }

    // Return the value from the cache.
    return plv8.country_cache[country_id];
$$ language plv8 immutable;

CREATE OR REPLACE FUNCTION pzero.audit_trigger_plv8 () returns trigger language plv8 AS $$
    var txid = plv8.execute("SELECT txid_current()")[0].txid_current;
    var tableName = TD.table_name;
    var oldRow = TD.old; // Available for UPDATE and DELETE
    var newRow = TD.new; // Available for INSERT and UPDATE
    var auditColumns = ['id', 'c_by', 'c_at', 'u_by', 'u_at', 'is_del', 'last_seen']; // Columns to audit
    var isDelColumn = 'is_del';
    var result;
    var c_by = newRow.c_by;
    var diffs = {}
    if (TD.event === 'DELETE') {
        throw 'cannot delete record'
    }
    if (oldRow && newRow.u_by) {
        c_by = newRow.u_by
    }
    if ((oldRow && newRow) && (oldRow.id !== newRow.id)) {
        throw 'id for tableName not mutable';
    }
    var data = newRow.data;
    if (data) {
        data = JSON.parse(data)
        if (data.meta) {
            c_by = data.meta.c_by;
            if (data.meta.u_by) {
                c_by = data.meta.u_by
            }
            delete data.meta;
            if (!(object.keys(data).length)) {
               delete newRow.data 
            }
        }
        if (data.diff) {
            var diffKeys = object.keys(data.diff)
            if (diffKeys.length) {
                diffs = {...data.diff}
            }
            delete data.diff;
        }
    }
    
    if (!c_by) {
        throw `Missing Audit field - c_by`
    }
    var id = newRow.id;
    if (!id) {
        try {
            result = plv8.execute("select pzero.gen_monotonic_id() as id");
            id = result[0]['id']
            newRow.id = id;
        } exception() {
            throw 'Unable to gen id'
        }
    }
    // Insert into txns table if not exists
    result = plv8.execute("SELECT mmn from pzero.mmn where table_name = $1", [tableName]);
    var mmn = result[0]['mmn'];
    if (!mn) {
        throw 'mneumonic not defined';
    }
    if (TD.event === 'INSERT' && !newRow.id) {
        newRow.id = pzero.gen_monotonic_id(mmn);
    } else {
        if (newRow.id !=== oldRow.id) {
            throw 'Ids do not match'
        }
    }
    plv8.execute("INSERT INTO pzero.txns (id, c_by, c_at) VALUES ($1, $2, NOW()) ON CONFLICT (txid) DO NOTHING", [txid, c_by]);
    if (newRow.is_del) {
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
            var colValue = String(newRow[colName]);
            if (colName === 'loc') {
                if (diffAddress) {

                }
            }
            var colValue = String(newRow[colName]);
            if (diffs[colName]) {
                colValue = JSON.stringify(diffs[colName]);
            }
            plv8.execute(
                "INSERT INTO pzero.audits (txn_id, mmn, rowid, cname, cvalue) VALUES ($1, $2, $3, $4, $5)",
                [txid, mmn, id, colName, colValue]
            );
        }
    }
    return newRow; // For INSERT and UPDATE triggers, return the new row
$$;

CREATE OR REPLACE FUNCTION pzero.audit_threads_trigger_plv8 () returns trigger language plv8 AS $$
    var txid = plv8.execute("SELECT txid_current()")[0].txid_current;
    var tableName = TD.table_name;
    if (TD.event === 'UPDATE' || TD.event === 'DELETE') {
        plv8.elog('Update or Delete on threads not allowed')
        throw 'Update or Delete on threads not allowed'
    }
    var newRow = TD.new; // Available for INSERT and UPDATE
    var data = newRow.data;
    if (data) {
        data = JSON.parse(data)
        if (data.meta) {
            delete data.meta;
        }
    }
    try {
        result = plv8.execute("select pzero.gen_monotonic_id() as id");
        id = result[0]['id']
        newRow.id = id;
    } exception() {
        plv8.elog('Unable to gen id');
        throw 'Unable to gen id'
    }
    if (!newRow.root_id) {
        newRow.root_id = id;
    }
    return newRow;
$$;

CREATE OR REPLACE FUNCTION pzero.create_triggers_plv8 () returns void AS $$
  var tables = ['pzero.devices', 'pzero.endpoints', 'pzero.active_sessions', 'pzero.orgs', 'pzero.auth', 'pzero.users', 'pzero.relations'];
  // Define a name for the new trigger.
  for (var i = 0; i < tables.length; i++) {
    var target_table = tables[i];
  // Build the dynamic CREATE TRIGGER statement
    var sql = `CREATE TRIGGER pzero.audit_trigger_${target_table}` +
            ' BEFORE INSERT OR UPDATE OR DELETE ON ' + target_table +
            ' FOR EACH ROW EXECUTE FUNCTION pzero.audit_trigger_plv8()';

  // Execute the dynamic SQL using plv8.execute().
    plv8.execute(sql);
    plv8.elog(NOTICE, 'Created trigger ' + trigger_name + ' on table ' + target_table);
  }
   var sql = `CREATE TRIGGER pzero.audit_trigger_threads` +
            ' BEFORE INSERT OR UPDATE OR DELETE ON ' + pzero.threads +
            ' FOR EACH ROW EXECUTE FUNCTION pzero.audit_threads_trigger_plv8()';

  // Execute the dynamic SQL using plv8.execute().
    plv8.execute(sql);
    plv8.elog(NOTICE, 'Created trigger ' + trigger_name + ' on table ' + target_table);

$$ language plv8;

SELECT
  pzero.create_triggers_plv8 ();
