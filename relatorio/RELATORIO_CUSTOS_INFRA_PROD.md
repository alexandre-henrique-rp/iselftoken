# Relatório de Custos — Infraestrutura AWS (Ambiente PROD)

**Data:** 21/08/2026  
**Cotação USD/BRL utilizada:** R$ 5,17 (comercial — 21/08/2026)  
**Região AWS:** us-east-1 (N. Virginia)  
**Modo:** 24/7 (sem schedule)

---

## Arquitetura Produção

| # | Recurso | Tipo/Config | Função |
|---|---------|-------------|--------|
| 1 | EC2 - API | t3.small (2 vCPU, 2GB RAM) | NestJS + Nginx (Docker) |
| 2 | EC2 - Cache | t3.small (2 vCPU, 2GB RAM) | Redis + RabbitMQ (Docker) |
| 3 | EC2 - Frontend | t3.micro (2 vCPU, 1GB RAM) | React SSR + Nginx (Docker) |
| 4 | RDS MySQL | db.t3.micro, 20GB gp3, Single-AZ | Banco principal (privado) |
| 5 | ALB | Application Load Balancer + 2 Target Groups | HTTPS termination |
| 6 | S3 | Bucket uploads (criptografado, lifecycle Glacier) | Documentos KYC, termos |
| 7 | Elastic IP | 3 unidades (API, Cache, Frontend) | IP fixo para SSH |
| 8 | Route 53 | Records A (iselftoken.com, www, api) | DNS |
| 9 | ACM | Wildcard + raiz | Certificado SSL (grátis com ALB) |
| 10 | VPC | Dedicada, 2 subnets públicas (multi-AZ) | Rede isolada |

### URLs
- **Frontend:** `iselftoken.com` / `www.iselftoken.com` → ALB → EC2 Frontend
- **API:** `api.iselftoken.com` → ALB → EC2 API

---

## Detalhamento de Custos (24/7 = 730h/mês)

| Recurso | Preço/hora (USD) | Horas/mês | USD/mês | BRL/mês |
|---------|-----------------|-----------|---------|---------|
| EC2 t3.small (API) | $0.0208 | 730 | $15.18 | R$ 78,48 |
| EC2 t3.small (Cache) | $0.0208 | 730 | $15.18 | R$ 78,48 |
| EC2 t3.micro (Frontend) | $0.0104 | 730 | $7.59 | R$ 39,24 |
| RDS db.t3.micro (MySQL) | $0.026 | 730 | $18.98 | R$ 98,13 |
| RDS Storage (20GB gp3) | — | — | $2.30 | R$ 11,89 |
| ALB (fixo por hora) | $0.0252 | 730 | $18.40 | R$ 95,13 |
| ALB LCU (tráfego estimado) | ~$0.008/LCU | ~5 LCU | $2.50 | R$ 12,93 |
| Elastic IP × 3 (IPv4) | $0.005 | 730 × 3 | $10.95 | R$ 56,61 |
| S3 (5GB estimado) | — | — | $0.12 | R$ 0,62 |
| S3 requests (1000 PUT + 5000 GET) | — | — | $0.03 | R$ 0,16 |
| Route 53 (hosted zone — existente) | — | — | $0.00 | R$ 0,00 |
| Route 53 (queries ~500k) | — | — | $0.20 | R$ 1,03 |
| ACM (certificados) | — | — | $0.00 | R$ 0,00 |
| VPC / Subnets / IGW | — | — | $0.00 | R$ 0,00 |
| EBS 16GB gp3 (API) | — | — | $1.44 | R$ 7,44 |
| EBS 8GB gp3 × 2 (Cache + Frontend) | — | — | $1.44 | R$ 7,44 |
| **TOTAL** | | | **$94.31** | **R$ 487,58** |

---

## Comparativo DEV vs PROD

| Item | DEV (schedule 12h) | PROD (24/7) |
|------|---------------------|-------------|
| EC2s | 2 instâncias | 3 instâncias |
| S3 | Não | Sim |
| RDS | Público | Privado |
| Scheduler | Sim | Não |
| Deletion protection | Não | Sim |
| **Custo/mês** | **R$ 232** | **R$ 488** |
| **Custo total (dev+prod)** | | **R$ 720/mês** |

---

## Diferenças de Segurança DEV → PROD

| Aspecto | DEV | PROD |
|---------|-----|------|
| RDS público | ✅ (acesso local) | ❌ (só via EC2 API) |
| Deletion protection RDS | Desabilitado | **Habilitado** |
| Final snapshot RDS | Skip | **Obrigatório** |
| ALB deletion protection | Desabilitado | **Habilitado** |
| S3 acesso público | — | **Bloqueado** |
| S3 versionamento | — | **Habilitado** |
| S3 criptografia | — | **SSE-S3** |
| Nginx client_max_body_size | Default | **50MB** |

---

## Projeção de Crescimento

| Cenário | Mudança | Impacto/mês |
|---------|---------|-------------|
| Tráfego 2x | LCU sobe | +~R$ 10 |
| S3 50GB | Storage | +~R$ 5 |
| RDS Multi-AZ | Alta disponibilidade | +R$ 98 |
| EC2 API → t3.medium | Mais memória | +R$ 38 |

---

## Fontes de Preço

- [EC2 On-Demand Pricing](https://aws.amazon.com/ec2/pricing/on-demand/) — t3.micro: $0.0104/h, t3.small: $0.0208/h
- [RDS MySQL Pricing](https://www.economize.cloud/resources/aws/pricing/rds/db.t3.micro/) — db.t3.micro: ~$0.026/h
- [ALB Pricing](https://cloudchipr.com/blog/aws-load-balancer-pricing) — $0.0252/h + $0.008/LCU-h
- [Public IPv4 Pricing](https://repost.aws/knowledge-center/vpc-optimize-ipv4-usage) — $0.005/IP/h
- [S3 Pricing](https://aws.amazon.com/s3/pricing/) — ~$0.023/GB/mês (Standard)
- Cotação USD/BRL: R$ 5,17 (21/08/2026)

*Content was rephrased for compliance with licensing restrictions.*
