<?php

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

function env(string $key): string {
    return getenv($key) ?: ($_ENV[$key] ?? $_SERVER[$key] ?? '');
}

$host = env('MYSQLHOST');     // mysql.railway.internal
$port = env('MYSQLPORT') ?: '3306';
$name = env('MYSQLDATABASE') ?: env('MYSQL_DATABASE');
$user = env('MYSQLUSER');
$pass = env('MYSQLPASSWORD');

define('DB_HOST',     $host);
define('DB_PORT',     (string)$port);
define('DB_NAME',     $name);
define('DB_USER',     $user);
define('DB_PASSWORD', $pass);

function getDB(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    // Railway interno usa socket en algunas configs, forzamos TCP
    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
        DB_HOST, DB_PORT, DB_NAME
    );

    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASSWORD, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => false,
        ]);
        return $pdo;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'DB: ' . $e->getMessage()]);
        exit;
    }
}

function json_response(array $data, int $code = 200): never {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function get_input(): array {
    return json_decode(file_get_contents('php://input'), true) ?? [];
}
