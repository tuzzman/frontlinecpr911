<?php
// Copy this file to config.php and fill in your database credentials
// Place alongside this file: /api/config.php (kept out of git)

const DB_HOST = 'localhost';
const DB_NAME = 'frontlinecpr911';
const DB_USER = 'db_user';
const DB_PASS = 'db_password';
const DB_CHARSET = 'utf8mb4';

function get_pdo(): PDO {
    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    return new PDO($dsn, DB_USER, DB_PASS, $options);
}
