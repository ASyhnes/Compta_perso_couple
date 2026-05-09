# fix-tls.ps1
# Script to inspect and (optionally) regenerate Let's Encrypt cert on remote VPS
# Edit the variables below if needed before running.

$remoteUser = "syhnes"
$server = "152-228-133-44.sslip.io"
$email = "syhnes@gmail.com"


Write-Host "== Inspect: files in /etc/letsencrypt for $server =="
ssh -t $remoteUser@$server "sudo ls -l /etc/letsencrypt/live/$server* 2>/dev/null || true; sudo ls -l /etc/letsencrypt/archive/$server* 2>/dev/null || true; sudo openssl x509 -in /etc/letsencrypt/live/$server/fullchain.pem -noout -text | sed -n '1,20p' 2>/dev/null || true"

Write-Host "`n== Inspect: certificate chain served by nginx =="
ssh -t $remoteUser@$server "sudo openssl s_client -connect $server:443 -servername $server -showcerts </dev/null" | Out-Host

$confirm = Read-Host "`nDo you want to remove possible bogus files and force a new cert with certbot? (y/n)"
if ($confirm -ne "y") {
    Write-Host "Aborted by user. No changes made."
    exit 0
}


Write-Host "\n== Removing possible bad files and requesting new certificate =="
ssh -t $remoteUser@$server "sudo rm -rf /etc/letsencrypt/live/$server* /etc/letsencrypt/archive/$server* /etc/letsencrypt/renewal/$server* 2>/dev/null || true && sudo certbot certonly --webroot -w /var/www/html -d $server --agree-tos --no-eff-email -m $email --non-interactive --force-renewal"

Write-Host "\n== Verify new cert files and reload nginx =="
ssh -t $remoteUser@$server "sudo ls -l /etc/letsencrypt/live/$server; sudo openssl x509 -in /etc/letsencrypt/live/$server/fullchain.pem -noout -text | sed -n '1,20p'; sudo nginx -t && sudo systemctl reload nginx" | Out-Host

Write-Host "\nDone. Test from your machine with:\n"
Write-Host "curl -Iv https://$server/"
