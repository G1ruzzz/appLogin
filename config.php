<?php
// Obtener la URL de conexión de Railway
$databaseUrl = getenv('MYSQL_URL');

// Separar la URL
$parts = parse_url($databaseUrl);

// Datos de conexión (FORZADOS con los de tu imagen)
$host = "mysql.railway.internal";
$user = "root";
$pass = "TZUpVXtPdCeXaSvmqxqFowbDbqnTwzXN";
$db   = "railway";
$port = 3306;

// Crear conexión
$conn = new mysqli($host, $user, $pass, $db, $port);

// Verificar conexión
if ($conn->connect_error) {
    die("Error de conexión: " . $conn->connect_error);
}

// Opcional: charset para evitar errores con acentos
$conn->set_charset("utf8mb4");
?>
