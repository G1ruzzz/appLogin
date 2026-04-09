FROM dunglas/frankenphp:latest-php8.3-alpine

# Extensiones MySQL
RUN install-php-extensions pdo_mysql mysqli



COPY . .

EXPOSE 8080

CMD ["frankenphp", "run", "--config", "/Caddyfile"]
