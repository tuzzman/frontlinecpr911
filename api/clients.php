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
    // Admin-only
    $pdo = pdo_or_503();
    require_admin($pdo);

    // Support class dropdown for filters
    $listType = $_GET['listType'] ?? null; // 'classes'
    if ($listType === 'classes') {
        $stmt = $pdo->query(
            "SELECT c.id, c.course_type, c.start_datetime, c.location,
                    (SELECT COUNT(*) FROM registrations r WHERE r.class_id = c.id) AS registrations
             FROM classes c
             ORDER BY c.start_datetime DESC"
        );
        $classes = $stmt->fetchAll();
        json_response(200, [ 'success' => true, 'classes' => $classes ]);
    }

    // Roster for a single class
    $classId = isset($_GET['classId']) ? (int)$_GET['classId'] : null;
    if ($classId) {
        $stmt = $pdo->prepare(
            "SELECT cl.id AS client_id,
                    CONCAT(cl.first_name, ' ', cl.last_name) AS full_name,
                    cl.email, cl.phone, cl.dob, cl.address,
                    r.status AS payment_status,
                    c.id AS class_id, c.course_type, c.start_datetime, c.location
             FROM registrations r
             INNER JOIN clients cl ON cl.id = r.client_id
             INNER JOIN classes c ON c.id = r.class_id
             WHERE r.class_id = :cid
             ORDER BY cl.last_name ASC, cl.first_name ASC"
        );
        $stmt->execute([':cid' => $classId]);
        $rows = $stmt->fetchAll();
        json_response(200, [ 'success' => true, 'data' => $rows ]);
    }

    // General listing with filters (date/course)
    $from = $_GET['from'] ?? null; // YYYY-MM-DD
    $to = $_GET['to'] ?? null;     // YYYY-MM-DD
    $course = $_GET['course_type'] ?? null; // BLS/Heartsaver/First Aid + CPR

    $where = [];
    $params = [];

    if ($from) { $where[] = 'c.start_datetime >= :from'; $params[':from'] = $from . ' 00:00:00'; }
    if ($to)   { $where[] = 'c.start_datetime <= :to';   $params[':to']   = $to   . ' 23:59:59'; }
    if ($course) { $where[] = 'c.course_type = :ct'; $params[':ct'] = $course; }

    $sql = "SELECT cl.id as client_id, CONCAT(cl.first_name,' ',cl.last_name) AS full_name, cl.email, cl.phone, cl.dob, cl.address,
                   r.status AS payment_status, c.id as class_id, c.course_type, c.start_datetime, c.location
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
