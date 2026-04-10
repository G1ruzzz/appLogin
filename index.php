<?php
require 'config.php';

$pdo    = getDB();
$path   = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];
$input  = json_decode(file_get_contents("php://input"), true) ?? [];

// ─── LOGIN ──────────────────────────────────────────────────────────────────
if ($path === '/login' && $method === 'POST') {
    $stmt = $pdo->prepare("SELECT id, nombre FROM usuarios WHERE nombre = ? AND password = ?");
    $stmt->execute([$input['nombre'] ?? '', $input['password'] ?? '']);
    $user = $stmt->fetch();

    if ($user) {
        echo json_encode(['ok' => true, 'id' => $user['id'], 'nombre' => $user['nombre']]);
    } else {
        echo json_encode(['ok' => false, 'error' => 'credenciales_incorrectas']);
    }
    exit;
}

// ─── REGISTER ───────────────────────────────────────────────────────────────
if ($path === '/register' && $method === 'POST') {
    $nombre   = trim($input['nombre']   ?? '');
    $password = trim($input['password'] ?? '');

    if ($nombre === '' || $password === '') {
        echo json_encode(['ok' => false, 'error' => 'campos_vacios']);
        exit;
    }

    $check = $pdo->prepare("SELECT id FROM usuarios WHERE nombre = ?");
    $check->execute([$nombre]);
    if ($check->fetch()) {
        echo json_encode(['ok' => false, 'error' => 'nombre_en_uso']);
        exit;
    }

    $stmt = $pdo->prepare("INSERT INTO usuarios (id, nombre, password) VALUES (UUID(), ?, ?)");
    $stmt->execute([$nombre, $password]);
    echo json_encode(['ok' => true]);
    exit;
}

// ─── GET USERS ──────────────────────────────────────────────────────────────
if ($path === '/users' && $method === 'GET') {
    $res = $pdo->query("SELECT id, nombre FROM usuarios ORDER BY nombre ASC");
    echo json_encode($res->fetchAll());
    exit;
}

// ─── VERIFY ADMIN ───────────────────────────────────────────────────────────
if ($path === '/verify-admin' && $method === 'POST') {
    $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE nombre = 'Admin' AND password = ?");
    $stmt->execute([$input['password'] ?? '']);
    echo json_encode(['ok' => $stmt->fetch() ? true : false]);
    exit;
}

// ─── VER INFO USUARIO (admin) ───────────────────────────────────────────────
if ($path === '/admin/user-info' && $method === 'POST') {
    $stmt = $pdo->prepare("SELECT nombre, password FROM usuarios WHERE id = ?");
    $stmt->execute([$input['id'] ?? '']);
    $user = $stmt->fetch();
    echo json_encode($user ?: ['error' => 'no_encontrado']);
    exit;
}

// ─── DELETE USER (admin) ────────────────────────────────────────────────────
if ($path === '/admin/delete-user' && $method === 'POST') {
    $stmt = $pdo->prepare("DELETE FROM usuarios WHERE id = ?");
    $stmt->execute([$input['id'] ?? '']);
    echo json_encode(['ok' => true]);
    exit;
}

// ─── CAMBIAR NOMBRE ─────────────────────────────────────────────────────────
if ($path === '/change-name' && $method === 'POST') {
    $id          = $input['id']           ?? '';
    $password    = $input['password']     ?? '';
    $nuevoNombre = trim($input['nombre']  ?? '');

    // Verificar contraseña actual
    $check = $pdo->prepare("SELECT id FROM usuarios WHERE id = ? AND password = ?");
    $check->execute([$id, $password]);
    if (!$check->fetch()) {
        echo json_encode(['ok' => false, 'error' => 'contrasena_incorrecta']);
        exit;
    }

    // Verificar que el nuevo nombre no esté en uso
    $exist = $pdo->prepare("SELECT id FROM usuarios WHERE nombre = ? AND id != ?");
    $exist->execute([$nuevoNombre, $id]);
    if ($exist->fetch()) {
        echo json_encode(['ok' => false, 'error' => 'nombre_en_uso']);
        exit;
    }

    $stmt = $pdo->prepare("UPDATE usuarios SET nombre = ? WHERE id = ?");
    $stmt->execute([$nuevoNombre, $id]);
    echo json_encode(['ok' => true, 'nombre' => $nuevoNombre]);
    exit;
}

// ─── CAMBIAR CONTRASEÑA ─────────────────────────────────────────────────────
if ($path === '/change-password' && $method === 'POST') {
    $id          = $input['id']               ?? '';
    $passActual  = $input['password_actual']  ?? '';
    $passNueva   = $input['password_nueva']   ?? '';

    $check = $pdo->prepare("SELECT id FROM usuarios WHERE id = ? AND password = ?");
    $check->execute([$id, $passActual]);
    if (!$check->fetch()) {
        echo json_encode(['ok' => false, 'error' => 'contrasena_incorrecta']);
        exit;
    }

    $stmt = $pdo->prepare("UPDATE usuarios SET password = ? WHERE id = ?");
    $stmt->execute([$passNueva, $id]);
    echo json_encode(['ok' => true]);
    exit;
}

// ─── 404 ────────────────────────────────────────────────────────────────────
http_response_code(404);
echo json_encode(['error' => 'ruta_no_encontrada', 'path' => $path]);
