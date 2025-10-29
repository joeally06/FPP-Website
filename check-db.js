const Database = require('better-sqlite3');
const db = new Database('votes.db');

console.log('Jukebox Queue:');
console.log(db.prepare('SELECT * FROM jukebox_queue').all());

console.log('\nCurrently Playing:');
console.log(db.prepare('SELECT * FROM jukebox_queue WHERE status = "playing"').all());

db.close();