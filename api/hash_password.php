<?php
/**
 * Password Hash Generator
 * Usage: php hash_password.php yourpassword
 * 
 * This script generates a bcrypt hash for a password that can be
 * inserted directly into the users table.
 */

if (php_sapi_name() !== 'cli') {
    die('This script must be run from the command line.');
}

$password = $argv[1] ?? '';

if (empty($password)) {
    echo "Usage: php hash_password.php <password>\n";
    echo "Example: php hash_password.php MySecurePassword123\n";
    exit(1);
}

$hash = password_hash($password, PASSWORD_DEFAULT);

echo "\n========================================\n";
echo "Password Hash Generator\n";
echo "========================================\n";
echo "Password: {$password}\n";
echo "Hash:     {$hash}\n";
echo "========================================\n\n";
echo "SQL Query to add new admin:\n";
echo "INSERT INTO users (email, password_hash, role, created_at)\n";
echo "VALUES ('admin@example.com', '{$hash}', 'admin', NOW());\n\n";
echo "Remember to change 'admin@example.com' to the actual email!\n\n";
