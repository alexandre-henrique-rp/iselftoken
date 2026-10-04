# =============================================================================
# Security Module — Security Groups + Key Pair (PROD)
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

  ingress {
    description      = "SSH (IPv6)"
    from_port        = 22
    to_port          = 22
    protocol         = "tcp"
    ipv6_cidr_blocks = [var.my_ip]
  }

  ingress {
    description = "SSH (IPv4)"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.my_ipv4]
  }

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

  egress {
    description      = "All outbound IPv6"
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    ipv6_cidr_blocks = ["::/0"]
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

  ingress {
    description      = "SSH (IPv6)"
    from_port        = 22
    to_port          = 22
    protocol         = "tcp"
    ipv6_cidr_blocks = [var.my_ip]
  }

  ingress {
    description = "SSH (IPv4)"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.my_ipv4]
  }

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

  egress {
    description      = "All outbound IPv6"
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    ipv6_cidr_blocks = ["::/0"]
  }

  tags = merge(var.common_tags, {
    Name = "${var.project}-${var.environment}-sg-ec2-frontend"
  })
}


