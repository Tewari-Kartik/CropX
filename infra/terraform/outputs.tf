output "server_public_ip" {
  description = "Static Public IPv4 address of the CropX EC2 instance"
  value       = aws_eip.cropx_ip.public_ip
}

output "ssh_connection_command" {
  description = "Command to SSH directly into the instance"
  value       = "ssh -i infra/terraform/cropx_key.pem ubuntu@${aws_eip.cropx_ip.public_ip}"
}

output "dns_setup_instructions" {
  description = "Instructions for pointing your .click domain to the server"
  value       = <<EOT
============================================================
🌐 DNS SETUP INSTRUCTIONS FOR YOUR .CLICK DOMAIN:
1. Go to your domain registrar (Namecheap, GoDaddy, Cloudflare, etc.).
2. Add a DNS 'A' Record:
   - Type: A
   - Name/Host: @ (or root)
   - Value: ${aws_eip.cropx_ip.public_ip}
   - TTL: Auto / 300 seconds
3. Add a CNAME Record for www (optional):
   - Type: CNAME
   - Name/Host: www
   - Value: ${var.domain_name}
============================================================
EOT
}

output "github_secrets_instructions" {
  description = "Secrets to add to GitHub Repo Settings -> Secrets and variables -> Actions"
  value       = <<EOT
============================================================
🔑 GITHUB ACTIONS CI/CD SECRETS TO ADD:
1. HOST: ${aws_eip.cropx_ip.public_ip}
2. USERNAME: ubuntu
3. SSH_PRIVATE_KEY: (Copy contents of infra/terraform/cropx_key.pem)
4. ENV_FILE: (Contents of your production server/.env)
============================================================
EOT
}
