<?php
// Obtener la URL de conexión de Railway
$databaseUrl = getenv('MYSQL_URL');

if (!$databaseUrl) {
    die("Error: MYSQL_URL no está definida");
}

// Separar la URL
$parts = parse_url($databaseUrl);

// Datos de conexión
$host = $parts['host'];
$user = $parts['user'];
$pass = $parts['pass'];
$db   = ltrim($parts['path'], '/');
$port = $parts['port'];

// Crear conexión
$conn = new mysqli($host, $user, $pass, $db, $port);

// Verificar conexión
if ($conn->connect_error) {
    die("Error de conexión: " . $conn->connect_error);
}

// Opcional: charset para evitar errores con acentos
$conn->set_charset("utf8mb4");
?>
