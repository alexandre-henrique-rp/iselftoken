# =============================================================================
# ALB Module — Application Load Balancer — PROD
# ACM criado mas HTTPS listener só é adicionado quando o cert validar.
# Por enquanto ALB roda em HTTP para não bloquear o deploy.
# =============================================================================

# --- Certificado SSL (ACM) — criado, validação DNS em andamento ---

resource "aws_acm_certificate" "main" {
  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(var.common_tags, {
    Name = "${var.project}-${var.environment}-cert"
  })
}

# Records DNS para validação do certificado ACM
resource "aws_route53_record" "acm_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = var.route53_zone_id
}

# NOTE: aws_acm_certificate_validation removido temporariamente.
# Quando o certificado ficar ISSUED, descomentar o bloco HTTPS abaixo
# e rodar terraform apply novamente.

# --- Application Load Balancer ---

resource "aws_lb" "main" {
  name               = "${var.project}-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.security_group_id]
  subnets            = var.subnet_ids
  ip_address_type    = "dualstack"

  enable_deletion_protection = false

  tags = merge(var.common_tags, {
    Name = "${var.project}-${var.environment}-alb"
  })
}

# --- Target Groups ---

resource "aws_lb_target_group" "api" {
  name     = "${var.project}-${var.environment}-tg-api"
  port     = 80
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    enabled             = true
    path                = "/health"
    port                = "traffic-port"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = merge(var.common_tags, {
    Name = "${var.project}-${var.environment}-tg-api"
  })
}

resource "aws_lb_target_group" "frontend" {
  name     = "${var.project}-${var.environment}-tg-front"
  port     = 80
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    enabled             = true
    path                = "/health"
    port                = "traffic-port"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = merge(var.common_tags, {
    Name = "${var.project}-${var.environment}-tg-frontend"
  })
}

# --- Target Group Attachments ---

resource "aws_lb_target_group_attachment" "api" {
  target_group_arn = aws_lb_target_group.api.arn
  target_id        = var.ec2_api_instance_id
  port             = 80
}

resource "aws_lb_target_group_attachment" "frontend" {
  target_group_arn = aws_lb_target_group.frontend.arn
  target_id        = var.ec2_frontend_instance_id
  port             = 80
}

# --- Listeners ---

# HTTP Listener — roteia por host header (temporário até HTTPS funcionar)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  # Default: Frontend
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

# Regra HTTP: api.iselftoken.com → Target Group API
resource "aws_lb_listener_rule" "api_http" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  condition {
    host_header {
      values = ["api.${var.domain_name}"]
    }
  }
}

# =============================================================================
# HTTPS (descomentar quando ACM estiver ISSUED e rodar terraform apply)
# =============================================================================
# resource "aws_acm_certificate_validation" "main" {
#   certificate_arn         = aws_acm_certificate.main.arn
#   validation_record_fqdns = [for record in aws_route53_record.acm_validation : record.fqdn]
# }
#
# resource "aws_lb_listener" "https" {
#   load_balancer_arn = aws_lb.main.arn
#   port              = 443
#   protocol          = "HTTPS"
#   ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
#   certificate_arn   = aws_acm_certificate_validation.main.certificate_arn
#
#   default_action {
#     type             = "forward"
#     target_group_arn = aws_lb_target_group.frontend.arn
#   }
# }
#
# resource "aws_lb_listener_rule" "api_https" {
#   listener_arn = aws_lb_listener.https.arn
#   priority     = 100
#
#   action {
#     type             = "forward"
#     target_group_arn = aws_lb_target_group.api.arn
#   }
#
#   condition {
#     host_header {
#       values = ["api.${var.domain_name}"]
#     }
#   }
# }
