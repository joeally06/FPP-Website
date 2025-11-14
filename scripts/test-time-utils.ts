import { parseDbTimestamp, toDbSqlString, formatDateTime, isRecent } from '../lib/time-utils';

(async () => {
  try {
    const sqlTs = '2025-11-14 20:00:00';
    const isoTs = '2025-11-14T20:00:00Z';

    const dtSql = parseDbTimestamp(sqlTs);
    const dtIso = parseDbTimestamp(isoTs);

    if (!dtSql || !dtIso) {
      console.error('[test-time-utils] ❌ parseDbTimestamp failed on inputs');
      process.exit(2);
    }

    const sqlToSql = toDbSqlString(dtSql);
    const isoToSql = toDbSqlString(dtIso);

    console.log('[test-time-utils] sqlToSql:', sqlToSql);
    console.log('[test-time-utils] isoToSql:', isoToSql);

    // They should be equal representation of the same UTC time
    if (sqlToSql !== isoToSql) {
      console.error('[test-time-utils] ❌ SQL -> SQL mismatch', sqlToSql, isoToSql);
      process.exit(3);
    }

    // formatDateTime should produce a human readable string
    const fmt = formatDateTime(sqlTs, 'medium');
    console.log('[test-time-utils] formatted:', fmt);

    // isRecent should return false for past date
    const recent = isRecent(sqlTs, 60 * 24 * 365); // 1 year -> true
    if (!recent) {
      console.error('[test-time-utils] ❌ isRecent false for 1 year boundary');
      process.exit(4);
    }

    console.log('[test-time-utils] ✅ All time utils validated');
    process.exit(0);
  } catch (err) {
    console.error('[test-time-utils] Error:', err);
    process.exit(1);
  }
})();
