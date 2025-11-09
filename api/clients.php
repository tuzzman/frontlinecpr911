<?php
require_once __DIR__ . '/_common.php';
$method = effective_method();

if ($method === 'POST') {
    $body = read_json_body();
    $first_name = trim($body['first_name'] ?? '');
    $last_name = trim($body['last_name'] ?? '');
    $email = trim($body['email'] ?? '');
    $phone = trim($body['phone'] ?? '');
    $dob = trim($body['dob'] ?? '');
    $address = trim($body['address'] ?? '');
    $classId = isset($body['classId']) ? (int)$body['classId'] : null;
    $force = !empty($body['force']); // allow admin override of capacity when true

    if ($first_name === '' || $last_name === '' || $email === '') {
        json_response(400, [ 'success' => false, 'message' => 'Missing required fields' ]);
    }
    $pdo = pdo_or_503();
    $pdo->beginTransaction();
    try {
        // Attempt to find existing client by email
        $stmtFind = $pdo->prepare('SELECT id, first_name, last_name FROM clients WHERE email = :em LIMIT 1');
        $stmtFind->execute([':em'=>$email]);
        $existing = $stmtFind->fetch();
        if ($existing) {
            $clientId = (int)$existing['id'];
            // Optionally update contact fields (non-destructive minimal update)
            $upd = $pdo->prepare('UPDATE clients SET first_name=:fn,last_name=:ln,phone=:ph,dob=:dob,address=:addr WHERE id=:id');
            $upd->execute([
                ':fn'=>$first_name ?: $existing['first_name'],
                ':ln'=>$last_name ?: $existing['last_name'],
                ':ph'=>$phone ?: null,
                ':dob'=>$dob ?: null,
                ':addr'=>$address ?: null,
                ':id'=>$clientId
            ]);
            $created = false;
        } else {
            $ins = $pdo->prepare('INSERT INTO clients (first_name,last_name,email,phone,dob,address,created_at) VALUES (:fn,:ln,:em,:ph,:dob,:addr,NOW())');
            $ins->execute([
                ':fn'=>$first_name,
                ':ln'=>$last_name,
                ':em'=>$email,
                ':ph'=>$phone ?: null,
                ':dob'=>$dob ?: null,
                ':addr'=>$address ?: null,
            ]);
            $clientId = (int)$pdo->lastInsertId();
            $created = true;
        }

        $alreadyRegistered = false;
        if ($classId) {
            // Check if class exists for basic validation
            $cCheck = $pdo->prepare('SELECT id, max_capacity FROM classes WHERE id = :cid');
            $cCheck->execute([':cid'=>$classId]);
            $classRow = $cCheck->fetch();
            if (!$classRow) {
                throw new Exception('Class not found');
            }
            // Check existing registration
            $regCheck = $pdo->prepare('SELECT id FROM registrations WHERE class_id = :cid AND client_id = :clid LIMIT 1');
            $regCheck->execute([':cid'=>$classId, ':clid'=>$clientId]);
            $regRow = $regCheck->fetch();
            if ($regRow) {
                $alreadyRegistered = true;
            } else {
                // Optional capacity check
                if (!empty($classRow['max_capacity']) && !$force) {
                    $capCnt = $pdo->prepare('SELECT COUNT(*) AS cnt FROM registrations WHERE class_id = :cid');
                    $capCnt->execute([':cid'=>$classId]);
                    $current = (int)$capCnt->fetch()['cnt'];
                    if ($current >= (int)$classRow['max_capacity']) {
                        // At capacity
                        json_response(409, ['success'=>false,'message'=>'Class is full']);
                    }
                }
                $insReg = $pdo->prepare('INSERT INTO registrations (class_id, client_id, status, created_at) VALUES (:cid,:clid,\'pending\',NOW())');
                $insReg->execute([':cid'=>$classId, ':clid'=>$clientId]);
            }
        }

        $pdo->commit();
    json_response(200, [ 'success' => true, 'client_id' => $clientId, 'created_new' => $created, 'already_registered' => $alreadyRegistered, 'forced' => $force ]);
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_response(500, [ 'success' => false, 'message' => 'Server error', 'error' => $e->getMessage() ]);
    }
}

if ($method === 'PUT') {
    $pdo = pdo_or_503();
    require_admin($pdo);
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    $classId = isset($_GET['classId']) ? (int)$_GET['classId'] : null; // optional for updating registration payment status
    if ($id <= 0) json_response(400, [ 'success' => false, 'message' => 'Valid client id required' ]);
    $body = read_json_body();
    $first_name = trim($body['first_name'] ?? '');
    $last_name = trim($body['last_name'] ?? '');
    $email = trim($body['email'] ?? '');
    $phone = trim($body['phone'] ?? '');
    $dob = trim($body['dob'] ?? '');
    $address = trim($body['address'] ?? '');
    $payment_status = trim($body['payment_status'] ?? ''); // paid/pending/blank
    if ($first_name === '' || $last_name === '' || $email === '') {
        json_response(400, [ 'success' => false, 'message' => 'Missing required fields' ]);
    }
    $stmt = $pdo->prepare("UPDATE clients SET first_name=:fn,last_name=:ln,email=:em,phone=:ph,dob=:dob,address=:addr WHERE id=:id");
    $stmt->execute([
        ':fn' => $first_name,
        ':ln' => $last_name,
        ':em' => $email,
        ':ph' => $phone,
        ':dob' => $dob ?: null,
        ':addr' => $address ?: null,
        ':id' => $id,
    ]);
    $registrationUpdated = false;
    if ($classId && $payment_status !== '') {
        $valid = in_array($payment_status, ['paid','pending'], true) ? $payment_status : null;
        if ($valid) {
            $updReg = $pdo->prepare('UPDATE registrations SET status = :st WHERE client_id = :cid AND class_id = :clid');
            $updReg->execute([':st'=>$valid, ':cid'=>$id, ':clid'=>$classId]);
            if ($updReg->rowCount() > 0) $registrationUpdated = true;
        }
    }
    json_response(200, [ 'success' => true, 'id' => $id, 'registration_updated' => $registrationUpdated ]);
}

if ($method === 'DELETE') {
    $pdo = pdo_or_503();
    require_admin($pdo);
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id <= 0) json_response(400, [ 'success' => false, 'message' => 'Valid client id required' ]);
    // Optional safety: check registrations
    $r = $pdo->prepare('SELECT COUNT(*) AS cnt FROM registrations WHERE client_id = :cid');
    $r->execute([':cid' => $id]);
    $cnt = (int)$r->fetch()['cnt'];
    if ($cnt > 0) {
        json_response(409, [ 'success' => false, 'message' => 'Cannot delete; client has registrations (' . $cnt . ')' ]);
    }
    $del = $pdo->prepare('DELETE FROM clients WHERE id = :id');
    $del->execute([':id' => $id]);
    json_response(200, [ 'success' => true, 'deleted' => $id ]);
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
                    (SELECT COUNT(*) FROM registrations r WHERE r.class_id = c.id) AS registrations,
                    c.max_capacity
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
