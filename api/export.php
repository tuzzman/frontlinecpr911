<?php
require_once __DIR__ . '/_common.php';
$pdo = pdo_or_503();
require_admin($pdo);

// Try to enable Dompdf if available locally
$dompdfAutoload = __DIR__ . '/vendor/dompdf/autoload.inc.php';
if (file_exists($dompdfAutoload)) {
    require_once $dompdfAutoload;
}

$type = $_GET['type'] ?? 'group_requests';

if ($type === 'group_requests') {
    $status = $_GET['status'] ?? null;
    $from = $_GET['from'] ?? null;
    $to = $_GET['to'] ?? null;

    $where = [];
    $params = [];
    if ($status) { $where[] = 'status = :st'; $params[':st'] = $status; }
    if ($from)   { $where[] = 'created_at >= :from'; $params[':from'] = $from . ' 00:00:00'; }
    if ($to)     { $where[] = 'created_at <= :to';   $params[':to']   = $to   . ' 23:59:59'; }

    $sql = 'SELECT id, org_name, contact_name, email, phone, course_type, participants, location_pref, address, preferred_dates, status, created_at FROM group_requests';
    if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
    $sql .= ' ORDER BY created_at DESC';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename=group_requests.csv');

    $out = fopen('php://output', 'w');
    fputcsv($out, array_keys($rows[0] ?? [
        'id' => 'id','org_name'=>'org_name','contact_name'=>'contact_name','email'=>'email','phone'=>'phone','course_type'=>'course_type','participants'=>'participants','location_pref'=>'location_pref','address'=>'address','preferred_dates'=>'preferred_dates','status'=>'status','created_at'=>'created_at'
    ]));
    foreach ($rows as $r) {
        fputcsv($out, $r);
    }
    fclose($out);
    exit;
}

// Roster export (CSV/PDF/HTML)
if ($type === 'roster') {
    $classId = isset($_GET['classId']) ? (int)$_GET['classId'] : 0;
    if ($classId <= 0) {
        json_response(400, [ 'success' => false, 'message' => 'classId required' ]);
    }

    // Load roster data
    $stmt = $pdo->prepare(
        "SELECT cl.first_name, cl.last_name, cl.email, cl.phone, cl.dob, cl.address,
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

    // Load class meta
    $metaStmt = $pdo->prepare('SELECT id, course_type, start_datetime, location FROM classes WHERE id = :id');
    $metaStmt->execute([':id' => $classId]);
    $cls = $metaStmt->fetch();
    $title = 'Roster - ' . ($cls['course_type'] ?? 'Class') . ' - ' . (($cls['start_datetime'] ?? '') ? substr($cls['start_datetime'],0,16) : '');

    $format = $_GET['format'] ?? 'pdf';

    if ($format === 'csv') {
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename=roster_class_' . $classId . '.csv');
        $out = fopen('php://output', 'w');
        fputcsv($out, ['First Name','Last Name','Email','Phone','DOB','Address','Payment Status']);
        foreach ($rows as $r) {
            fputcsv($out, [$r['first_name'],$r['last_name'],$r['email'],$r['phone'],$r['dob'],$r['address'],$r['payment_status']]);
        }
        fclose($out);
        exit;
    }

    // Try PDF via Dompdf if available
    $html = '<html><head><meta charset="utf-8"><style>body{font-family:DejaVu Sans, Arial, sans-serif;}h1{font-size:20px;margin:0 0 10px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #999;padding:6px;font-size:12px;text-align:left;}th{background:#eee;}</style></head><body>';
    $html .= '<h1>' . htmlspecialchars($title) . '</h1>';
    if ($cls) {
        $html .= '<p><strong>Location:</strong> ' . htmlspecialchars($cls['location'] ?? '') . '</p>';
    }
    $html .= '<table><thead><tr><th>#</th><th>Full Name</th><th>DOB</th><th>Email</th><th>Phone</th><th>Address</th><th>Status</th></tr></thead><tbody>';
    $i = 1;
    foreach ($rows as $r) {
        $full = trim(($r['first_name'] ?? '') . ' ' . ($r['last_name'] ?? ''));
        $html .= '<tr>'
              . '<td>' . $i++ . '</td>'
              . '<td>' . htmlspecialchars($full) . '</td>'
              . '<td>' . htmlspecialchars($r['dob'] ?? '') . '</td>'
              . '<td>' . htmlspecialchars($r['email'] ?? '') . '</td>'
              . '<td>' . htmlspecialchars($r['phone'] ?? '') . '</td>'
              . '<td>' . htmlspecialchars($r['address'] ?? '') . '</td>'
              . '<td>' . htmlspecialchars($r['payment_status'] ?? '') . '</td>'
              . '</tr>';
    }
    $html .= '</tbody></table></body></html>';

    if (class_exists('Dompdf\\Dompdf')) {
        // Render with dompdf
        $dompdf = new Dompdf\Dompdf(['isRemoteEnabled' => false]);
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();
        $dompdf->stream('roster_class_' . $classId . '.pdf', ['Attachment' => true]);
        exit;
    }

    // Fallback: serve HTML with a hint to print to PDF
    header('Content-Type: text/html; charset=utf-8');
    echo $html;
    exit;
}

json_response(400, [ 'success' => false, 'message' => 'Unknown export type' ]);
