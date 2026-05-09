# 🚀 Guide de Déploiement sur Serveur

## Prérequis Serveur

Votre serveur doit avoir :
- Ubuntu/Debian (ou autre distribution Linux)
- Node.js installé (v14 ou supérieur)
- Accès SSH
- Nom de domaine (optionnel mais recommandé)

## 📋 Étape 1 : Préparer le Serveur

### Se connecter au serveur via SSH
```bash
ssh votre_utilisateur@votre_serveur.com
```

### Installer Node.js (si pas déjà installé)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Installer PM2 (gestionnaire de processus)
```bash
sudo npm install -g pm2
```

### Installer nginx (proxy inverse)
```bash
sudo apt update
sudo apt install nginx
```

## 📤 Étape 2 : Transférer l'Application

### Option A : Via Git (recommandé)
```bash
# Sur votre serveur
cd /var/www
sudo git clone https://github.com/VOTRE_USERNAME/Apli_compta.git
cd Apli_compta
sudo npm install --production
```

### Option B : Via SCP (transfert direct)
```bash
# Sur votre ordinateur local
scp -r c:\Users\Hora\Desktop\Code\Apli_compta votre_utilisateur@votre_serveur:/var/www/

# Puis sur le serveur
cd /var/www/Apli_compta
npm install --production
```

## ⚙️ Étape 3 : Configuration

### Éditer le fichier .env sur le serveur
```bash
cd /var/www/Apli_compta
nano .env
```

Modifiez :
```env
PORT=3000
NODE_ENV=production
SESSION_SECRET=GENEREZ_UNE_CLE_SECRETE_FORTE_ICI
DATABASE_PATH=./database/compta.json
```

Pour générer une clé secrète forte :
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🚀 Étape 4 : Démarrer avec PM2

```bash
cd /var/www/Apli_compta
pm2 start server.js --name "compta-couple"
pm2 save
pm2 startup
```

Copiez et exécutez la commande affichée par `pm2 startup`.

### Commandes PM2 utiles
```bash
pm2 status              # Voir l'état
pm2 logs compta-couple  # Voir les logs
pm2 restart compta-couple  # Redémarrer
pm2 stop compta-couple     # Arrêter
```

## 🌐 Étape 5 : Configurer nginx

### Créer le fichier de configuration
```bash
sudo nano /etc/nginx/sites-available/compta-couple
```

Ajoutez :
```nginx
server {
    listen 80;
    server_name votre-domaine.com;  # Remplacez par votre domaine

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Activer la configuration
```bash
sudo ln -s /etc/nginx/sites-available/compta-couple /etc/nginx/sites-enabled/
sudo nginx -t  # Tester la configuration
sudo systemctl restart nginx
```

## 🔒 Étape 6 : Installer SSL (HTTPS)

### Installer Certbot
```bash
sudo apt install certbot python3-certbot-nginx
```

### Obtenir un certificat SSL
```bash
sudo certbot --nginx -d votre-domaine.com
```

Suivez les instructions. Certbot configurera automatiquement nginx pour HTTPS.

### Renouvellement automatique
```bash
sudo certbot renew --dry-run  # Tester
```

Le renouvellement automatique est déjà configuré.

## 📱 Étape 7 : Accéder depuis le Téléphone

### Avec nom de domaine
Ouvrez sur votre téléphone :
```
https://votre-domaine.com
```

### Sans nom de domaine (IP directe)
```
http://ADRESSE_IP_SERVEUR:3000
```

### Installer la PWA sur téléphone

**Android (Chrome):**
1. Ouvrez l'URL dans Chrome
2. Menu (⋮) → "Ajouter à l'écran d'accueil"
3. L'application s'installe

**iOS (Safari):**
1. Ouvrez l'URL dans Safari
2. Bouton Partager → "Sur l'écran d'accueil"
3. L'icône apparaît sur votre écran

## 🔥 Firewall (Important !)

### Ouvrir les ports nécessaires
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow ssh
sudo ufw enable
```

## 🔄 Mettre à Jour l'Application

### Via Git
```bash
cd /var/www/Apli_compta
git pull
npm install --production
pm2 restart compta-couple
```

### Via SCP
```bash
# Sur votre ordinateur
scp -r c:\Users\Hora\Desktop\Code\Apli_compta/* votre_utilisateur@votre_serveur:/var/www/Apli_compta/

# Sur le serveur
pm2 restart compta-couple
```

## 📊 Monitoring

### Voir les logs
```bash
pm2 logs compta-couple
```

### Voir les métriques
```bash
pm2 monit
```

## 🛡️ Sécurité Supplémentaire

### Changer les mots de passe par défaut
Une fois connecté, allez dans Paramètres → Sécurité et changez les mots de passe.

### Sauvegarder la base de données
```bash
# Créer une sauvegarde
cp /var/www/Apli_compta/database/compta.json ~/backup-compta-$(date +%Y%m%d).json

# Automatiser avec cron (sauvegarde quotidienne)
crontab -e
# Ajouter : 0 2 * * * cp /var/www/Apli_compta/database/compta.json ~/backup-compta-$(date +\%Y\%m\%d).json
```

## ❓ Dépannage

### L'application ne démarre pas
```bash
pm2 logs compta-couple  # Voir les erreurs
```

### Erreur de port
Vérifiez que le port 3000 est libre :
```bash
sudo netstat -tlnp | grep 3000
```

### nginx ne fonctionne pas
```bash
sudo nginx -t  # Tester la config
sudo systemctl status nginx  # Voir le statut
```

## 📞 Support

Pour toute question, consultez les logs :
```bash
pm2 logs compta-couple --lines 100
```
