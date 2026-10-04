# =============================================================================
# DNS Module — Route 53 Records
# =============================================================================

# Busca a hosted zone existente
data "aws_route53_zone" "main" {
  name         = var.domain_name
  private_zone = false
}

# --- Record: dev.iselftoken.com → ALB ---

resource "aws_route53_record" "frontend" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "${var.environment}.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# --- Record: api-dev.iselftoken.com → ALB ---

resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api-${var.environment}.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}
