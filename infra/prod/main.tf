# =============================================================================
# IselfToken — Infraestrutura PROD (AWS)
# =============================================================================
# Arquitetura:
#   - VPC dedicada com 2 subnets públicas (multi-AZ)
#   - EC2 API (t3.small): NestJS + Nginx + Redis + RabbitMQ (Docker) + SQLite
#   - EC2 Frontend (t3.micro): React SSR + Nginx
#   - ALB: HTTPS termination com certificado ACM
#   - S3: Bucket para uploads (KYC, termos, etc.)
#   - Route 53: iselftoken.com + api.iselftoken.com
#   - Sem RDS — banco SQLite local no container
#   - Sem scheduler — roda 24/7
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }

  # Backend S3 (descomentar quando tiver bucket para state)
  # backend "s3" {
  #   bucket         = "iselftoken-terraform-state"
  #   key            = "prod/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "iselftoken-terraform-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.common_tags
  }
}

locals {
  common_tags = {
    Project     = var.project
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# =============================================================================
# Módulos
# =============================================================================

# --- Network ---
module "network" {
  source = "./network"

  project     = var.project
  environment = var.environment
  aws_region  = var.aws_region
  common_tags = local.common_tags
}

# --- Security ---
module "security" {
  source = "./security"

  project     = var.project
  environment = var.environment
  vpc_id      = module.network.vpc_id
  my_ip       = var.my_ip
  my_ipv4     = var.my_ipv4
  common_tags = local.common_tags
}

# --- EC2 API ---
module "ec2_api" {
  source = "./ec2-api"

  project           = var.project
  environment       = var.environment
  instance_type     = "t4g.large"
  subnet_id         = module.network.subnet_public_a_id
  security_group_id = module.security.sg_ec2_api_id
  key_pair_name     = module.security.key_pair_name
  common_tags       = local.common_tags
}

# --- EC2 Frontend ---
module "ec2_frontend" {
  source = "./ec2-frontend"

  project           = var.project
  environment       = var.environment
  instance_type     = "t4g.medium"
  subnet_id         = module.network.subnet_public_a_id
  security_group_id = module.security.sg_ec2_frontend_id
  key_pair_name     = module.security.key_pair_name
  common_tags       = local.common_tags
}

# --- Route 53 Hosted Zone (criada primeiro para validação ACM) ---
resource "aws_route53_zone" "main" {
  name    = var.domain_name
  comment = "IselfToken PROD — delegado da conta Neswork"

  tags = merge(local.common_tags, {
    Name = "${var.project}-${var.environment}-zone"
  })
}

# --- ALB ---
module "alb" {
  source = "./alb"

  project                  = var.project
  environment              = var.environment
  vpc_id                   = module.network.vpc_id
  subnet_ids               = module.network.public_subnet_ids
  security_group_id        = module.security.sg_alb_id
  ec2_api_instance_id      = module.ec2_api.instance_id
  ec2_frontend_instance_id = module.ec2_frontend.instance_id
  domain_name              = var.domain_name
  route53_zone_id          = aws_route53_zone.main.zone_id
  common_tags              = local.common_tags
}

# --- DNS (A records — depende do ALB) ---
module "dns" {
  source = "./dns"

  project      = var.project
  environment  = var.environment
  domain_name  = var.domain_name
  zone_id      = aws_route53_zone.main.zone_id
  alb_dns_name = module.alb.alb_dns_name
  alb_zone_id  = module.alb.alb_zone_id
  common_tags  = local.common_tags
}

# --- S3 ---
module "s3" {
  source = "./s3"

  project     = var.project
  environment = var.environment
  bucket_name = var.s3_bucket_name
  dev_ip      = var.my_ip
  common_tags = local.common_tags
}
