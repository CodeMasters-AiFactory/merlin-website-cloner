import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const newPassword = 'Diamond2024!!!';
const targetEmail = 'rudolf@code-masters.co.za';

async function resetPassword() {
  try {
    // Load users
    const usersData = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    
    console.log('=== MERLIN USERS ===');
    Object.values(usersData).forEach(u => {
      console.log(`  ${u.email} | ${u.name} | ${u.plan}`);
    });
    
    // Find user
    const userEntry = Object.entries(usersData).find(([id, user]) => user.email === targetEmail);
    
    if (!userEntry) {
      console.log(`\n❌ User ${targetEmail} not found!`);
      return;
    }
    
    const [userId, user] = userEntry;
    
    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);
    
    // Update user
    usersData[userId] = {
      ...user,
      passwordHash
    };
    
    // Save
    fs.writeFileSync(USERS_FILE, JSON.stringify(usersData, null, 2));
    
    console.log(`\n✅ Password updated for: ${targetEmail}`);
    console.log(`   New password: ${newPassword}`);
    
    // Verify
    const verify = await bcrypt.compare(newPassword, passwordHash);
    console.log(`   Verification: ${verify ? 'PASS' : 'FAIL'}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

resetPassword();
