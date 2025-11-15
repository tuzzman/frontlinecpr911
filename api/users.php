<?php
/**
 * Admin Users Management API
 * Handles CRUD operations for admin users
 */

require_once __DIR__ . '/_common.php';
$pdo = pdo_or_503();

// Require authentication
$currentUser = current_user($pdo);
if (!$currentUser) {
    json_response(401, ['success' => false, 'message' => 'Not authenticated']);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// GET - List all users
if ($method === 'GET') {
    try {
        $stmt = $pdo->query('SELECT id, email, role, created_at FROM users ORDER BY created_at DESC');
        $users = $stmt->fetchAll();
        json_response(200, ['success' => true, 'users' => $users]);
    } catch (Exception $e) {
        json_response(500, ['success' => false, 'message' => 'Failed to fetch users']);
    }
}

// POST - Create or update user
if ($method === 'POST') {
    $body = read_json_body();
    $userId = isset($body['id']) ? (int)$body['id'] : null;
    $email = trim($body['email'] ?? '');
    $password = $body['password'] ?? '';

    // Validate email
    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        json_response(400, ['success' => false, 'message' => 'Valid email is required']);
    }

    // Validate password (if provided or new user)
    if (!$userId && empty($password)) {
        json_response(400, ['success' => false, 'message' => 'Password is required for new users']);
    }

    if (!empty($password) && strlen($password) < 8) {
        json_response(400, ['success' => false, 'message' => 'Password must be at least 8 characters']);
    }

    try {
        if ($userId) {
            // Update existing user
            if (!empty($password)) {
                // Update password
                $hash = password_hash($password, PASSWORD_DEFAULT);
                $stmt = $pdo->prepare('UPDATE users SET password_hash = :hash WHERE id = :id');
                $stmt->execute([':hash' => $hash, ':id' => $userId]);
            } else {
                // Just update email
                $stmt = $pdo->prepare('UPDATE users SET email = :email WHERE id = :id');
                $stmt->execute([':email' => $email, ':id' => $userId]);
            }
            json_response(200, ['success' => true, 'message' => 'User updated successfully']);
        } else {
            // Create new user
            // Check if email already exists
            $stmt = $pdo->prepare('SELECT COUNT(*) as count FROM users WHERE email = :email');
            $stmt->execute([':email' => $email]);
            if ($stmt->fetch()['count'] > 0) {
                json_response(400, ['success' => false, 'message' => 'Email already exists']);
            }

            $hash = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare('INSERT INTO users (email, password_hash, role, created_at) VALUES (:email, :hash, "admin", NOW())');
            $stmt->execute([':email' => $email, ':hash' => $hash]);
            json_response(201, ['success' => true, 'message' => 'User created successfully', 'id' => $pdo->lastInsertId()]);
        }
    } catch (Exception $e) {
        error_log('User management error: ' . $e->getMessage());
        json_response(500, ['success' => false, 'message' => 'Database error occurred']);
    }
}

// DELETE - Remove user
if ($method === 'DELETE') {
    $body = read_json_body();
    $userId = isset($body['id']) ? (int)$body['id'] : null;

    if (!$userId) {
        json_response(400, ['success' => false, 'message' => 'User ID is required']);
    }

    // Prevent deleting yourself
    if ($userId === $currentUser['id']) {
        json_response(400, ['success' => false, 'message' => 'Cannot delete your own account']);
    }

    // Check if this is the last admin
    $stmt = $pdo->query('SELECT COUNT(*) as count FROM users');
    if ($stmt->fetch()['count'] <= 1) {
        json_response(400, ['success' => false, 'message' => 'Cannot delete the last admin user']);
    }

    try {
        $stmt = $pdo->prepare('DELETE FROM users WHERE id = :id');
        $stmt->execute([':id' => $userId]);
        json_response(200, ['success' => true, 'message' => 'User deleted successfully']);
    } catch (Exception $e) {
        error_log('Delete user error: ' . $e->getMessage());
        json_response(500, ['success' => false, 'message' => 'Failed to delete user']);
    }
}

json_response(405, ['success' => false, 'message' => 'Method Not Allowed']);
