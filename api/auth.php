<?php
require_once __DIR__ . '/_common.php';
$pdo = pdo_or_503();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    // Return session user info (me)
    $u = current_user($pdo);
    if (!$u) json_response(401, [ 'success' => false, 'message' => 'Not authenticated' ]);
    json_response(200, [ 'success' => true, 'user' => $u ]);
}

if ($method === 'POST') {
    $body = read_json_body();
    $email = trim($body['email'] ?? ($body['username'] ?? ''));
    $password = (string)($body['password'] ?? '');

    if ($email === '' || $password === '') {
        json_response(400, [ 'success' => false, 'message' => 'Email and password required' ]);
    }

    // Optional bootstrap: if no user exists and bootstrap is allowed, create the first admin
    $stmt = $pdo->query('SELECT COUNT(*) AS c FROM users');
    $count = (int)$stmt->fetch()['c'];

    if ($count === 0) {
        // Try to include bootstrap constants if present
        @require_once __DIR__ . '/config.php';
        if (defined('ALLOW_FIRST_ADMIN') && ALLOW_FIRST_ADMIN === true) {
            $bootstrapEmail = defined('ADMIN_BOOTSTRAP_EMAIL') ? ADMIN_BOOTSTRAP_EMAIL : $email;
            $bootstrapPass = defined('ADMIN_BOOTSTRAP_PASSWORD') ? ADMIN_BOOTSTRAP_PASSWORD : $password;
            $hash = password_hash($bootstrapPass, PASSWORD_DEFAULT);
            $ins = $pdo->prepare('INSERT INTO users (email, password_hash, role, created_at) VALUES (:e, :ph, "admin", NOW())');
            $ins->execute([':e' => $bootstrapEmail, ':ph' => $hash]);
        }
    }

    // Look up user
    $stmt = $pdo->prepare('SELECT id, email, password_hash, role, created_at FROM users WHERE email = :e LIMIT 1');
    $stmt->execute([':e' => $email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        json_response(401, [ 'success' => false, 'message' => 'Invalid credentials' ]);
    }

    // Set session and harden
    start_session_once();
    session_regenerate_id(true);
    $_SESSION['uid'] = $user['id'];
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
    $_SESSION['fp'] = hash('sha256', $ip . '|' . $ua);

    unset($user['password_hash']);
    json_response(200, [ 'success' => true, 'user' => $user ]);
}

json_response(405, [ 'success' => false, 'message' => 'Method Not Allowed' ]);
