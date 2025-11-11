import db from "./db.js";
import bcrypt from "bcrypt";

async function resetPassword() {
  const username = "DAIRY";
  const newPassword = "dairy123"; // New password for DAIRY account
  
  try {
    console.log(`Resetting password for ${username}...`);
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the password
    await db.query(
      "UPDATE AccountInfo SET PasswordHash = ? WHERE Username = ?",
      [hashedPassword, username]
    );
    
    console.log("✅ Password reset successful!");
    console.log(`Username: ${username}`);
    console.log(`New Password: ${newPassword}`);
    console.log("\nYou can now log in with these credentials.");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error resetting password:", error);
    process.exit(1);
  }
}

resetPassword();
