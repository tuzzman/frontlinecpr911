<?php
require_once __DIR__ . '/_common.php';
$pdo = pdo_or_503();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    // Admin-only listing for now (can be public later if needed)
    require_admin($pdo);
    $stmt = $pdo->query('SELECT id, course_type, start_datetime, location, price, max_capacity, notes, created_at FROM classes ORDER BY start_datetime DESC');
    json_response(200, [ 'success' => true, 'data' => $stmt->fetchAll() ]);
}

if ($method === 'POST') {
    require_admin($pdo);
    $body = read_json_body();
    $course_type = trim($body['course_type'] ?? '');
    $start_datetime = trim($body['start_datetime'] ?? ''); // 'YYYY-MM-DD HH:MM:SS'
    $location = trim($body['location'] ?? '');
    $price = isset($body['price']) ? (float)$body['price'] : null;
    $max_capacity = isset($body['max_capacity']) ? (int)$body['max_capacity'] : null;
    $notes = trim($body['notes'] ?? '');

    if ($course_type === '') {
        json_response(400, [ 'success' => false, 'message' => 'course_type required' ]);
    }

    $stmt = $pdo->prepare('INSERT INTO classes (course_type, start_datetime, location, price, max_capacity, notes, created_at) VALUES (:ct, :sd, :loc, :pr, :mc, :nt, NOW())');
    $stmt->execute([
        ':ct' => $course_type,
        ':sd' => $start_datetime ?: null,
        ':loc' => $location ?: null,
        ':pr' => $price,
        ':mc' => $max_capacity,
        ':nt' => $notes ?: null,
    ]);
    json_response(200, [ 'success' => true, 'id' => $pdo->lastInsertId() ]);
}

json_response(405, [ 'success' => false, 'message' => 'Method Not Allowed' ]);
