<?php
// Common helpers for JSON APIs
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
