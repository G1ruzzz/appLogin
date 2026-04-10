<?php

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ─── Leer variable de cualquier fuente ───────────────────────
function env(string $key): string {
    return getenv($key) ?: ($_ENV[$key] ?? $_SERVER[$key] ?? '');
}

// ─── OPCIÓN A: variables individuales (MySQL plugin Railway) ──
$host = env('MYSQLHOST');
$port = env('MYSQLPORT') ?: '3306';
$name = env('MYSQLDATABASE') ?: env('MYSQL_DATABASE');
$user = env('MYSQLUSER');
$pass = env('MYSQLPASSWORD');

// ─── OPCIÓN B: URL completa (Railway a veces la manda así) ────
if (empty($host)) {
    $url = env('MYSQL_URL')
        ?: env('MYSQL_PRIVATE_URL')
        ?: env('DATABASE_URL')
        ?: '';

    if (!empty($url)) {
        $p    = parse_url($url);
        $host = $p['host'] ?? '';
        $port = $p['port'] ?? '3306';
        $name = ltrim($p['path'] ?? '', '/');
        $user = $p['user'] ?? '';
        $pass = $p['pass'] ?? '';
    }
}

define('DB_HOST',     $host);
define('DB_PORT',     (string)$port);
define('DB_NAME',     $name);
define('DB_USER',     $user);
define('DB_PASSWORD', $pass);

// ─── Conexión PDO ─────────────────────────────────────────────
function getDB(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    // Si no hay host, devuelve diagnóstico para saber qué llegó
    if (empty(DB_HOST) || empty(DB_NAME)) {
        http_response_code(500);
        echo json_encode([
            'error'  => 'Variables de entorno no encontradas',
            'host'   => DB_HOST,
            'db'     => DB_NAME,
            'user'   => DB_USER,
            'port'   => DB_PORT,
        ]);
        exit;
    }

    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
        DB_HOST, DB_PORT, DB_NAME
    );

    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASSWORD, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
        return $pdo;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'error' => 'Fallo al conectar: ' . $e->getMessage(),
            'host'  => DB_HOST,
            'port'  => DB_PORT,
            'db'    => DB_NAME,
        ]);
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
