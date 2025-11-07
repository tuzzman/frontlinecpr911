<?php
require_once __DIR__ . '/_common.php';
require_method('POST');

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
