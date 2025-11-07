<?php
require_once __DIR__ . '/_common.php';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'POST') {
    $body = read_json_body();
    $first_name = trim($body['first_name'] ?? '');
    $last_name = trim($body['last_name'] ?? '');
    $email = trim($body['email'] ?? '');
    $phone = trim($body['phone'] ?? '');
    $dob = trim($body['dob'] ?? '');
    $address = trim($body['address'] ?? '');

    if ($first_name === '' || $last_name === '' || $email === '') {
        json_response(400, [ 'success' => false, 'message' => 'Missing required fields' ]);
    }
    $pdo = pdo_or_503();

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("INSERT INTO clients (first_name, last_name, email, phone, dob, address, created_at) VALUES (:fn, :ln, :em, :ph, :dob, :addr, NOW())");
        $stmt->execute([
            ':fn' => $first_name,
            ':ln' => $last_name,
            ':em' => $email,
            ':ph' => $phone,
            ':dob' => $dob,
            ':addr' => $address,
        ]);
        $clientId = $pdo->lastInsertId();

        // Optional: link to class if classId provided
        $classId = $body['classId'] ?? null;
        if ($classId) {
            $stmt2 = $pdo->prepare("INSERT INTO registrations (class_id, client_id, status, created_at) VALUES (:cid, :clid, 'pending', NOW())");
            $stmt2->execute([':cid' => $classId, ':clid' => $clientId]);
        }

        $pdo->commit();
        json_response(200, [ 'success' => true, 'client_id' => $clientId ]);
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_response(500, [ 'success' => false, 'message' => 'Server error', 'error' => $e->getMessage() ]);
    }
}

if ($method === 'GET') {
    // Admin listing with filters (date/class type)
    $pdo = pdo_or_503();

    $from = $_GET['from'] ?? null; // YYYY-MM-DD
    $to = $_GET['to'] ?? null;     // YYYY-MM-DD
    $course = $_GET['course_type'] ?? null; // BLS/Heartsaver/First Aid + CPR

    $where = [];
    $params = [];

    if ($from) { $where[] = 'c.start_datetime >= :from'; $params[':from'] = $from . ' 00:00:00'; }
    if ($to)   { $where[] = 'c.start_datetime <= :to';   $params[':to']   = $to   . ' 23:59:59'; }
    if ($course) { $where[] = 'c.course_type = :ct'; $params[':ct'] = $course; }

    $sql = "SELECT cl.id as client_id, cl.first_name, cl.last_name, cl.email, cl.phone, cl.dob,
                   r.status, c.id as class_id, c.course_type, c.start_datetime, c.location
            FROM clients cl
            LEFT JOIN registrations r ON r.client_id = cl.id
            LEFT JOIN classes c ON c.id = r.class_id";
    if ($where) { $sql .= ' WHERE ' . implode(' AND ', $where); }
    $sql .= ' ORDER BY c.start_datetime DESC, cl.last_name ASC';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
    json_response(200, [ 'success' => true, 'data' => $rows ]);
}

json_response(405, [ 'success' => false, 'message' => 'Method Not Allowed' ]);
