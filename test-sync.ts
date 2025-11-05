// Test FPP sync functionality
import { syncFppData, getSyncStatus } from './lib/fpp-sync';

async function test() {
  console.log('\n🔄 Testing FPP Sync...\n');
  
  // Test sync
  const result = await syncFppData();
  
  console.log('\n📊 Sync Result:');
  console.log('  Success:', result.success);
  console.log('  Playlists:', result.playlistsCount);
  console.log('  Sequences:', result.sequencesCount);
  console.log('  Timestamp:', result.timestamp);
  if (result.error) {
    console.log('  Error:', result.error);
  }
  
  // Test status
  console.log('\n📋 Sync Status:');
  const status = getSyncStatus();
  console.log('  Last Sync:', status.lastSync);
  console.log('  Last Success:', status.lastSuccess);
  console.log('  Last Error:', status.lastError);
  console.log('  Playlists Count:', status.playlistsCount);
  console.log('  Sequences Count:', status.sequencesCount);
  
  console.log('\n✅ Test complete!\n');
}

test().catch(console.error);
