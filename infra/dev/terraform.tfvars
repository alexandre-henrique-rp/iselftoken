# =============================================================================
# Valores das Variáveis — Ambiente DEV
# =============================================================================

aws_region  = "us-east-1"
project     = "iselftoken"
environment = "dev"
domain_name = "iselftoken.com"

# ATENÇÃO: Substitua pelo seu IP público (use: curl ifconfig.me)
my_ip = "SEU_IP_AQUI/32"

# RDS MySQL
db_name     = "iselftoken_dev"
db_username = "admin"
# db_password é definida via variável de ambiente: TF_VAR_db_password

# Schedule (UTC) — seg-sex 08:00-20:00 BRT
schedule_start = "cron(0 11 ? * MON-FRI *)"
schedule_stop  = "cron(0 23 ? * MON-FRI *)"
