variable "aws_region" {
  description = "AWS region for deployment (Mumbai for India lowest latency)"
  type        = string
  default     = "ap-south-1"
}

variable "instance_type" {
  description = "Cost-efficient EC2 instance type (t4g.small ARM64 Graviton2: 2 vCPU, 2GB RAM)"
  type        = string
  default     = "t4g.small"
}

variable "project_name" {
  description = "Project name tag"
  type        = string
  default     = "cropx"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "domain_name" {
  description = "Your custom .click domain (e.g. cropx.click) or placeholder"
  type        = string
  default     = "cropx.click"
}

variable "admin_email" {
  description = "Email for Let's Encrypt SSL certificate alerts"
  type        = string
  default     = "admin@cropx.click"
}
