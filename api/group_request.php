<?php
require_once __DIR__ . '/_common.php';

$method = effective_method();

if ($method === 'POST') {
    $body = read_json_body();

    $org_name = trim($body['org_name'] ?? '');
    $contact_name = trim($body['contact_name'] ?? '');
    $email = trim($body['email'] ?? '');
    $phone = trim($body['phone'] ?? '');
    $course_type = trim($body['course_type'] ?? '');
    $participants = (int)($body['participants'] ?? 0);
    $location_pref = trim($body['location_pref'] ?? '');
    $address = trim($body['address'] ?? '');
    $preferred_dates = trim($body['preferred_dates'] ?? '');
    $notes = trim($body['notes'] ?? '');

    if ($org_name === '' || $contact_name === '' || $email === '' || $course_type === '' || $participants < 1) {
        json_response(400, [ 'success' => false, 'message' => 'Missing required fields' ]);
    }

    $pdo = pdo_or_503();

    $sql = "INSERT INTO group_requests (org_name, contact_name, email, phone, course_type, participants, location_pref, address, preferred_dates, notes, status, created_at, updated_at)
            VALUES (:org_name, :contact_name, :email, :phone, :course_type, :participants, :location_pref, :address, :preferred_dates, :notes, 'new', NOW(), NOW())";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':org_name' => $org_name,
        ':contact_name' => $contact_name,
        ':email' => $email,
        ':phone' => $phone,
        ':course_type' => $course_type,
        ':participants' => $participants,
        ':location_pref' => $location_pref,
        ':address' => $address,
        ':preferred_dates' => $preferred_dates,
        ':notes' => $notes,
    ]);

    json_response(200, [ 'success' => true, 'message' => 'Group request received', 'id' => $pdo->lastInsertId() ]);
}

if ($method === 'GET') {
    $pdo = pdo_or_503();
    // Require admin for listing
    require_admin($pdo);

    $status = $_GET['status'] ?? null; // new/contacted/scheduled/closed
    $from = $_GET['from'] ?? null;     // YYYY-MM-DD
    $to = $_GET['to'] ?? null;         // YYYY-MM-DD

    $where = [];
    $params = [];
    if ($status) { $where[] = 'gr.status = :st'; $params[':st'] = $status; }
    if ($from)   { $where[] = 'gr.created_at >= :from'; $params[':from'] = $from . ' 00:00:00'; }
    if ($to)     { $where[] = 'gr.created_at <= :to';   $params[':to']   = $to   . ' 23:59:59'; }

    $sql = "SELECT gr.* FROM group_requests gr";
    if ($where) { $sql .= ' WHERE ' . implode(' AND ', $where); }
    $sql .= ' ORDER BY gr.created_at DESC LIMIT 500';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
    json_response(200, [ 'success' => true, 'data' => $rows ]);
}

if ($method === 'PUT') {
    $pdo = pdo_or_503();
    require_admin($pdo);
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id <= 0) json_response(400, [ 'success' => false, 'message' => 'Valid id required' ]);
    $body = read_json_body();
    $status = trim($body['status'] ?? ''); // new/contacted/scheduled/closed
    $notes = trim($body['notes'] ?? '');
    if ($status !== '' && !in_array($status, ['new','contacted','scheduled','closed'], true)) {
        json_response(400, [ 'success' => false, 'message' => 'Invalid status' ]);
    }
    $fields = [];
    $params = [ ':id' => $id ];
    if ($status !== '') { $fields[] = 'status = :st'; $params[':st'] = $status; }
    if ($notes !== '')  { $fields[] = 'notes = :nt';  $params[':nt'] = $notes; }
    if (!$fields) json_response(400, [ 'success' => false, 'message' => 'No changes provided' ]);
    $fields[] = 'updated_at = NOW()';
    $sql = 'UPDATE group_requests SET ' . implode(', ', $fields) . ' WHERE id = :id';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    json_response(200, [ 'success' => true, 'id' => $id ]);
}

json_response(405, [ 'success' => false, 'message' => 'Method Not Allowed' ]);
