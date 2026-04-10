<?php
// ═══════════════════════════════════════════════
// SUBE ESTE ARCHIVO A RAILWAY Y VISITA:
// https://tuapp.up.railway.app/test.php
// LUEGO BÓRRALO (tiene info sensible)
// ═══════════════════════════════════════════════

header('Content-Type: application/json');

echo json_encode([
    'MYSQLHOST'     => getenv('MYSQLHOST'),
    'MYSQLPORT'     => getenv('MYSQLPORT'),
    'MYSQLDATABASE' => getenv('MYSQLDATABASE'),
    'MYSQL_DATABASE'=> getenv('MYSQL_DATABASE'),
    'MYSQLUSER'     => getenv('MYSQLUSER'),
    'MYSQLPASSWORD' => getenv('MYSQLPASSWORD') ? '***OK***' : 'VACÍO',
    'MYSQL_URL'     => getenv('MYSQL_URL') ? 'existe' : 'no existe',
    'DATABASE_URL'  => getenv('DATABASE_URL') ? 'existe' : 'no existe',
    'all_env_keys'  => array_keys($_ENV),
], JSON_PRETTY_PRINT);
