<?php

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

function env(string $k): string {
    return getenv($k) ?: ($_ENV[$k] ?? $_SERVER[$k] ?? '');
}

$host = env('MYSQLHOST');
$port = env('MYSQLPORT') ?: '3306';
$name = env('MYSQLDATABASE') ?: env('MYSQL_DATABASE');
$user = env('MYSQLUSER');
$pass = env('MYSQLPASSWORD');

if (empty($host)) {
    $url = env('MYSQL_URL') ?: env('MYSQL_PRIVATE_URL') ?: env('DATABASE_URL') ?: '';
    if (!empty($url)) {
        $p = parse_url($url);
        $host = $p['host'] ?? ''; $port = $p['port'] ?? '3306';
        $name = ltrim($p['path'] ?? '', '/');
        $user = $p['user'] ?? ''; $pass = $p['pass'] ?? '';
    }
}

try {
    $pdo = new PDO(
        "mysql:host=$host;port=$port;dbname=$name;charset=utf8mb4",
        $user, $pass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
         PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
         PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => false]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'DB: ' . $e->getMessage()]); exit;
}

$path   = '/' . trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$method = $_SERVER['REQUEST_METHOD'];
$input  = json_decode(file_get_contents('php://input'), true) ?? [];

// GET /personas — listar todos
if ($path === '/personas' && $method === 'GET') {
    $res = $pdo->query("SELECT id, nombre, edad FROM personas ORDER BY id DESC");
    echo json_encode($res->fetchAll());
    exit;
}

// POST /personas — guardar nuevo
if ($path === '/personas' && $method === 'POST') {
    $nombre = trim($input['nombre'] ?? '');
    $edad   = intval($input['edad'] ?? 0);
    if ($nombre === '' || $edad <= 0) {
        echo json_encode(['ok' => false, 'error' => 'datos_invalidos']); exit;
    }
    $stmt = $pdo->prepare("INSERT INTO personas (nombre, edad) VALUES (?, ?)");
    $stmt->execute([$nombre, $edad]);
    echo json_encode(['ok' => true, 'id' => $pdo->lastInsertId()]);
    exit;
}

// POST /personas/editar — editar nombre y edad
if ($path === '/personas/editar' && $method === 'POST') {
    $id     = intval($input['id']     ?? 0);
    $nombre = trim($input['nombre']   ?? '');
    $edad   = intval($input['edad']   ?? 0);
    if ($id <= 0 || $nombre === '' || $edad <= 0) {
        echo json_encode(['ok' => false, 'error' => 'datos_invalidos']); exit;
    }
    $pdo->prepare("UPDATE personas SET nombre=?, edad=? WHERE id=?")->execute([$nombre, $edad, $id]);
    echo json_encode(['ok' => true]);
    exit;
}

// POST /personas/borrar — borrar por id
if ($path === '/personas/borrar' && $method === 'POST') {
    $id = intval($input['id'] ?? 0);
    if ($id <= 0) { echo json_encode(['ok' => false, 'error' => 'id_invalido']); exit; }
    $pdo->prepare("DELETE FROM personas WHERE id=?")->execute([$id]);
    echo json_encode(['ok' => true]);
    exit;
}

// Raíz
if ($path === '/' || $path === '') {
    echo json_encode(['status' => 'ok', 'api' => 'Personas']); exit;
}

http_response_code(404);
echo json_encode(['error' => 'ruta_no_encontrada']);
