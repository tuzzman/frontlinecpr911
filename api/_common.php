<?php
// Common helpers for JSON APIs

// CORS headers to allow requests from www subdomain
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-HTTP-Method-Override');
header('Access-Control-Max-Age: 86400');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

function json_response(int $status, array $data): void {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

function read_json_body(): array {
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

// Support method override via header or query (_method) when hosting blocks PUT/DELETE.
function effective_method(): string {
    $original = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    $override = '';
    // Header override
    if (!empty($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'])) {
        $override = strtoupper(trim($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE']));
    }
    // Query param override if header not set
    if ($override === '' && isset($_GET['_method'])) {
        $override = strtoupper(trim($_GET['_method']));
    }
    // Body field override (JSON) only if not already set
    if ($override === '' && in_array($original, ['POST'])) {
        $body = read_json_body();
        if (isset($body['_method'])) {
            $maybe = strtoupper(trim($body['_method']));
            if ($maybe) $override = $maybe;
        }
    }
    if ($override && in_array($override, ['PUT','DELETE','PATCH'])) {
        return $override;
    }
    return $original;
}

function require_method(string $method): void {
    if (strtoupper($_SERVER['REQUEST_METHOD'] ?? '') !== strtoupper($method)) {
        json_response(405, [ 'success' => false, 'message' => 'Method Not Allowed' ]);
    }
}

function pdo_or_503(): ?PDO {
    // Try to include local config.php (ignored in git)
    $configPath = __DIR__ . '/config.php';
    if (!file_exists($configPath)) {
        json_response(503, [ 'success' => false, 'message' => 'Server not configured. Create /api/config.php based on config.sample.php' ]);
    }
    require_once $configPath;
    try {
        return get_pdo();
    } catch (Throwable $e) {
        json_response(503, [ 'success' => false, 'message' => 'Database unavailable', 'error' => $e->getMessage() ]);
    }
}

// -------- Sessions & Auth helpers ---------
function start_session_once(): void {
    if (session_status() === PHP_SESSION_NONE) {
        $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
        session_set_cookie_params([
            'lifetime' => 0,
            'path' => '/',
            'domain' => '',
            'secure' => $secure,
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
        session_start();
    }
}

function current_user(PDO $pdo): ?array {
    start_session_once();
    // Optional fingerprint validation (IP + UA)
    $fp = $_SESSION['fp'] ?? null;
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
    $expect = hash('sha256', $ip . '|' . $ua);
    if ($fp && !hash_equals($fp, $expect)) {
        // Invalidate session if fingerprint changes
        $_SESSION = [];
        session_destroy();
        return null;
    }

    $uid = $_SESSION['uid'] ?? null;
    if (!$uid) return null;
    $stmt = $pdo->prepare('SELECT id, email, role, created_at FROM users WHERE id = :id');
    $stmt->execute([':id' => $uid]);
    $user = $stmt->fetch();
    return $user ?: null;
}

function require_admin(PDO $pdo): array {
    $u = current_user($pdo);
    if (!$u) {
        json_response(401, [ 'success' => false, 'message' => 'Unauthorized' ]);
    }
    return $u;
}
