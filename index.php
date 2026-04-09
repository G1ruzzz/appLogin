<?php
require 'config.php';

header('Content-Type: application/json');
$pdo = getDB();

$path = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];

$input = json_decode(file_get_contents("php://input"), true);

// ─── LOGIN ─────────────────────────────
if (strpos($path, "/login") !== false && $method === "POST") {

    $stmt = $pdo->prepare("SELECT * FROM usuarios WHERE nombre=? AND password=?");
    $stmt->execute([$input['nombre'], $input['password']]);

    $user = $stmt->fetch();

    if ($user) {
        echo json_encode([
            "ok" => true,
            "id" => $user['id'],
            "nombre" => $user['nombre']
        ]);
    } else {
        echo json_encode(["ok" => false]);
    }
}

// ─── REGISTER ──────────────────────────
if (strpos($path, "/register") !== false && $method === "POST") {

    // verificar si existe
    $check = $pdo->prepare("SELECT id FROM usuarios WHERE nombre=?");
    $check->execute([$input['nombre']]);

    if ($check->fetch()) {
        echo json_encode(["ok" => false, "error" => "nombre_en_uso"]);
        exit;
    }

    $stmt = $pdo->prepare("INSERT INTO usuarios (id, nombre, password) VALUES (UUID(), ?, ?)");
    $stmt->execute([$input['nombre'], $input['password']]);

    echo json_encode(["ok" => true]);
}

// ─── GET USERS ─────────────────────────
if (strpos($path, "/users") !== false && $method === "GET") {

    $res = $pdo->query("SELECT id, nombre FROM usuarios");
    echo json_encode($res->fetchAll());
}

// ─── VERIFY ADMIN ──────────────────────
if (strpos($path, "/verify-admin") !== false && $method === "POST") {

    $stmt = $pdo->prepare("SELECT * FROM usuarios WHERE nombre='admin' AND password=?");
    $stmt->execute([$input['password']]);

    echo json_encode(["ok" => $stmt->fetch() ? true : false]);
}

// ─── VER INFO USUARIO ──────────────────
if (strpos($path, "/admin/user-info") !== false && $method === "POST") {

    $stmt = $pdo->prepare("SELECT nombre, password FROM usuarios WHERE id=?");
    $stmt->execute([$input['id']]);

    echo json_encode($stmt->fetch());
}

// ─── DELETE USER ───────────────────────
if (strpos($path, "/admin/delete-user") !== false && $method === "POST") {

    $stmt = $pdo->prepare("DELETE FROM usuarios WHERE id=?");
    $stmt->execute([$input['id']]);

    echo json_encode(["ok" => true]);
}
