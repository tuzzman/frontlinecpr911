<?php
require_once __DIR__ . '/_common.php';
$pdo = pdo_or_503();
$method = effective_method();

if ($method === 'GET') {
    $public = isset($_GET['public']);
    $idParam = isset($_GET['id']) ? (int)$_GET['id'] : null;
    if ($public) {
        // Public single-class fetch (limited fields)
        if (!$idParam) json_response(400, ['success'=>false,'message'=>'id required']);
        $stmt = $pdo->prepare('SELECT id, course_type, start_datetime, location, price, max_capacity FROM classes WHERE id = :id');
        $stmt->execute([':id'=>$idParam]);
        $row = $stmt->fetch();
        if (!$row) json_response(404, ['success'=>false,'message'=>'Class not found']);
        // Registration count & spots_left
        $rStmt = $pdo->prepare('SELECT COUNT(*) AS registrations FROM registrations WHERE class_id = :cid');
        $rStmt->execute([':cid'=>$row['id']]);
        $reg = (int)$rStmt->fetch()['registrations'];
        $row['registrations'] = $reg;
        $maxCap = isset($row['max_capacity']) ? (int)$row['max_capacity'] : null;
        $row['spots_left'] = $maxCap !== null ? max($maxCap - $reg, 0) : null;
        json_response(200, ['success'=>true,'data'=>$row]);
    }
    // Admin listing (unchanged logic)
    require_admin($pdo);
    $stmt = $pdo->query('SELECT id, course_type, start_datetime, location, price, max_capacity, notes, created_at FROM classes ORDER BY start_datetime DESC');
    $rows = $stmt->fetchAll();
    if ($rows) {
        $ids = array_column($rows, 'id');
        if ($ids) {
            $in = implode(',', array_map('intval', $ids));
            $rStmt = $pdo->query("SELECT class_id, COUNT(*) AS registrations FROM registrations WHERE class_id IN ($in) GROUP BY class_id");
            $counts = [];
            foreach ($rStmt->fetchAll() as $r) { $counts[(int)$r['class_id']] = (int)$r['registrations']; }
            foreach ($rows as &$c) {
                $cid = (int)$c['id'];
                $reg = $counts[$cid] ?? 0;
                $c['registrations'] = $reg;
                $maxCap = isset($c['max_capacity']) ? (int)$c['max_capacity'] : null;
                $c['spots_left'] = $maxCap !== null ? max($maxCap - $reg, 0) : null;
            }
            unset($c);
        }
    }
    json_response(200, [ 'success' => true, 'data' => $rows ]);
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
    $newId = $pdo->lastInsertId();
    json_response(200, [ 'success' => true, 'id' => $newId ]);
}

if ($method === 'PUT') {
    require_admin($pdo);
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id <= 0) json_response(400, [ 'success' => false, 'message' => 'Valid id required' ]);
    $body = read_json_body();
    $course_type = trim($body['course_type'] ?? '');
    $start_datetime = trim($body['start_datetime'] ?? '');
    $location = trim($body['location'] ?? '');
    $price = isset($body['price']) && $body['price'] !== '' ? (float)$body['price'] : null;
    $max_capacity = isset($body['max_capacity']) && $body['max_capacity'] !== '' ? (int)$body['max_capacity'] : null;
    $notes = trim($body['notes'] ?? '');
    if ($course_type === '') json_response(400, [ 'success' => false, 'message' => 'course_type required' ]);
    // Optional: Prevent lowering capacity below current registrations
    if ($max_capacity !== null) {
        $capStmt = $pdo->prepare('SELECT COUNT(*) AS reg_count FROM registrations WHERE class_id = :cid');
        $capStmt->execute([':cid' => $id]);
        $regCount = (int)$capStmt->fetch()['reg_count'];
        if ($regCount > $max_capacity) {
            json_response(409, [ 'success' => false, 'message' => 'Cannot set capacity below existing registrations (' . $regCount . ')' ]);
        }
    }
    $stmt = $pdo->prepare('UPDATE classes SET course_type = :ct, start_datetime = :sd, location = :loc, price = :pr, max_capacity = :mc, notes = :nt WHERE id = :id');
    $stmt->execute([
        ':ct' => $course_type,
        ':sd' => $start_datetime ?: null,
        ':loc' => $location ?: null,
        ':pr' => $price,
        ':mc' => $max_capacity,
        ':nt' => $notes ?: null,
        ':id' => $id,
    ]);
    json_response(200, [ 'success' => true, 'id' => $id ]);
}

if ($method === 'DELETE') {
    require_admin($pdo);
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id <= 0) json_response(400, [ 'success' => false, 'message' => 'Valid id required' ]);
    // Prevent delete if registrations exist
    $rStmt = $pdo->prepare('SELECT COUNT(*) AS reg_count FROM registrations WHERE class_id = :cid');
    $rStmt->execute([':cid' => $id]);
    $regCount = (int)$rStmt->fetch()['reg_count'];
    if ($regCount > 0) {
        json_response(409, [ 'success' => false, 'message' => 'Cannot delete; ' . $regCount . ' registrations exist.' ]);
    }
    $del = $pdo->prepare('DELETE FROM classes WHERE id = :id');
    $del->execute([':id' => $id]);
    json_response(200, [ 'success' => true, 'deleted' => $id ]);
}

json_response(405, [ 'success' => false, 'message' => 'Method Not Allowed' ]);
