<?php
require 'config.php';

$pdo    = getDB();

// Railway puede mandar la ruta en REQUEST_URI con o sin prefijo
// Tomamos solo el path limpio sin query string
$full   = $_SERVER['REQUEST_URI'] ?? '/';
$path   = parse_url($full, PHP_URL_PATH);
$path   = '/' . trim($path, '/');   // normalizar: siempre /algo o /
$method = $_SERVER['REQUEST_METHOD'];
$input  = json_decode(file_get_contents("php://input"), true) ?? [];

// ─── LOGIN ──────────────────────────────────────────────────────
if ($path === '/login' && $method === 'POST') {
    $stmt = $pdo->prepare("SELECT id, nombre FROM usuarios WHERE nombre=? AND password=?");
    $stmt->execute([$input['nombre'] ?? '', $input['password'] ?? '']);
    $user = $stmt->fetch();
    echo json_encode($user
        ? ['ok' => true,  'id' => $user['id'], 'nombre' => $user['nombre']]
        : ['ok' => false, 'error' => 'credenciales_incorrectas']
    );
    exit;
}

// ─── REGISTER ───────────────────────────────────────────────────
if ($path === '/register' && $method === 'POST') {
    $nombre   = trim($input['nombre']   ?? '');
    $password = trim($input['password'] ?? '');
    if ($nombre === '' || $password === '') {
        echo json_encode(['ok' => false, 'error' => 'campos_vacios']); exit;
    }
    $check = $pdo->prepare("SELECT id FROM usuarios WHERE nombre=?");
    $check->execute([$nombre]);
    if ($check->fetch()) {
        echo json_encode(['ok' => false, 'error' => 'nombre_en_uso']); exit;
    }
    $pdo->prepare("INSERT INTO usuarios (id, nombre, password) VALUES (UUID(),?,?)")
        ->execute([$nombre, $password]);
    echo json_encode(['ok' => true]);
    exit;
}

// ─── GET USERS ──────────────────────────────────────────────────
if ($path === '/users' && $method === 'GET') {
    $res = $pdo->query("SELECT id, nombre FROM usuarios ORDER BY nombre ASC");
    echo json_encode($res->fetchAll());
    exit;
}

// ─── VERIFY ADMIN ───────────────────────────────────────────────
if ($path === '/verify-admin' && $method === 'POST') {
    $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE nombre='Admin' AND password=?");
    $stmt->execute([$input['password'] ?? '']);
    echo json_encode(['ok' => $stmt->fetch() ? true : false]);
    exit;
}

// ─── VER INFO USUARIO (admin) ───────────────────────────────────
if ($path === '/admin/user-info' && $method === 'POST') {
    $stmt = $pdo->prepare("SELECT nombre, password FROM usuarios WHERE id=?");
    $stmt->execute([$input['id'] ?? '']);
    echo json_encode($stmt->fetch() ?: ['error' => 'no_encontrado']);
    exit;
}

// ─── DELETE USER (admin) ────────────────────────────────────────
if ($path === '/admin/delete-user' && $method === 'POST') {
    $pdo->prepare("DELETE FROM usuarios WHERE id=?")->execute([$input['id'] ?? '']);
    echo json_encode(['ok' => true]);
    exit;
}

// ─── CAMBIAR NOMBRE ─────────────────────────────────────────────
if ($path === '/change-name' && $method === 'POST') {
    $id    = $input['id']       ?? '';
    $pass  = $input['password'] ?? '';
    $nuevo = trim($input['nombre'] ?? '');
    $check = $pdo->prepare("SELECT id FROM usuarios WHERE id=? AND password=?");
    $check->execute([$id, $pass]);
    if (!$check->fetch()) {
        echo json_encode(['ok' => false, 'error' => 'contrasena_incorrecta']); exit;
    }
    $exist = $pdo->prepare("SELECT id FROM usuarios WHERE nombre=? AND id!=?");
    $exist->execute([$nuevo, $id]);
    if ($exist->fetch()) {
        echo json_encode(['ok' => false, 'error' => 'nombre_en_uso']); exit;
    }
    $pdo->prepare("UPDATE usuarios SET nombre=? WHERE id=?")->execute([$nuevo, $id]);
    echo json_encode(['ok' => true, 'nombre' => $nuevo]);
    exit;
}

// ─── CAMBIAR CONTRASEÑA ─────────────────────────────────────────
if ($path === '/change-password' && $method === 'POST') {
    $id     = $input['id']              ?? '';
    $actual = $input['password_actual'] ?? '';
    $nueva  = $input['password_nueva']  ?? '';
    $check  = $pdo->prepare("SELECT id FROM usuarios WHERE id=? AND password=?");
    $check->execute([$id, $actual]);
    if (!$check->fetch()) {
        echo json_encode(['ok' => false, 'error' => 'contrasena_incorrecta']); exit;
    }
    $pdo->prepare("UPDATE usuarios SET password=? WHERE id=?")->execute([$nueva, $id]);
    echo json_encode(['ok' => true]);
    exit;
}

// ─── ROOT — ping de salud ────────────────────────────────────────
if ($path === '/' || $path === '') {
    echo json_encode(['status' => 'ok', 'api' => 'AppLogin']);
    exit;
}

// ─── 404 ────────────────────────────────────────────────────────
http_response_code(404);
echo json_encode(['error' => 'ruta_no_encontrada', 'path' => $path]);
