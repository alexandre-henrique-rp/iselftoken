# =============================================================================
# Security Module — Security Groups + Key Pair
# =============================================================================

# --- Key Pair SSH (compartilhada) ---

resource "tls_private_key" "main" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "main" {
  key_name   = "${var.project}-${var.environment}-key"
  public_key = tls_private_key.main.public_key_openssh

  tags = merge(var.common_tags, {
    Name = "${var.project}-${var.environment}-key"
  })
}

# Salva a chave privada localmente
resource "local_file" "private_key" {
  content         = tls_private_key.main.private_key_pem
  filename        = "${path.module}/../../keys/${var.project}-${var.environment}.pem"
  file_permission = "0400"
}

# --- Security Group: ALB ---

resource "aws_security_group" "alb" {
  name        = "${var.project}-${var.environment}-sg-alb"
  description = "ALB - permite HTTP/HTTPS do mundo"
  vpc_id      = var.vpc_id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.common_tags, {
    Name = "${var.project}-${var.environment}-sg-alb"
  })
}

# --- Security Group: EC2 API ---

resource "aws_security_group" "ec2_api" {
  name        = "${var.project}-${var.environment}-sg-ec2-api"
  description = "EC2 API - SSH do dev + trafego do ALB"
  vpc_id      = var.vpc_id

  # SSH apenas do IP do desenvolvedor
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.my_ip]
  }

  # HTTP do ALB (Nginx na porta 80)
  ingress {
    description     = "HTTP from ALB"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.common_tags, {
    Name = "${var.project}-${var.environment}-sg-ec2-api"
  })
}

# --- Security Group: EC2 Frontend ---

resource "aws_security_group" "ec2_frontend" {
  name        = "${var.project}-${var.environment}-sg-ec2-frontend"
  description = "EC2 Frontend - SSH do dev + trafego do ALB"
  vpc_id      = var.vpc_id

  # SSH apenas do IP do desenvolvedor
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.my_ip]
  }

  # HTTP do ALB (Nginx na porta 80)
  ingress {
    description     = "HTTP from ALB"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.common_tags, {
    Name = "${var.project}-${var.environment}-sg-ec2-frontend"
  })
}

# --- Security Group: RDS ---

resource "aws_security_group" "rds" {
  name        = "${var.project}-${var.environment}-sg-rds"
  description = "RDS - acesso das EC2s + IP do dev"
  vpc_id      = var.vpc_id

  # MySQL da EC2 API
  ingress {
    description     = "MySQL from EC2 API"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2_api.id]
  }

  # MySQL do IP do desenvolvedor (acesso local)
  ingress {
    description = "MySQL from developer"
    from_port   = 3306
    to_port     = 3306
    protocol    = "tcp"
    cidr_blocks = [var.my_ip]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.common_tags, {
    Name = "${var.project}-${var.environment}-sg-rds"
  })
}
