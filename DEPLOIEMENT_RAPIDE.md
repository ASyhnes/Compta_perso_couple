# 🚀 Guide de Déploiement Rapide - Serveur 152.228.133.44

## 📋 Étape 1 : Se Connecter au Serveur

```bash
ssh root@152.228.133.44
# Ou si vous avez un autre utilisateur :
ssh votre_utilisateur@152.228.133.44
```

---

## 🔍 Étape 2 : Vérifier et Installer Node.js

### Vérifier si Node.js est installé
```bash
node --version
npm --version
```

### Si Node.js n'est PAS installé :
```bash
# Mettre à jour les paquets
sudo apt update

# Installer Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Vérifier l'installation
node --version  # Doit afficher v18.x.x
npm --version   # Doit afficher 9.x.x ou supérieur
```

---

## 📤 Étape 3 : Transférer l'Application sur le Serveur

### Option A : Via Git (RECOMMANDÉ si vous avez poussé sur GitHub)

```bash
# Sur le serveur
cd /var/www
sudo git clone https://github.com/ASyhnes/Compta_perso_couple.git
cd Compta_perso_couple
sudo npm install --production
```

### Option B : Via SCP (si pas encore sur GitHub)

**Sur votre PC Windows** (ouvrir PowerShell ou CMD) :
```powershell
# Transférer tous les fichiers
scp -r C:\Users\Hora\Desktop\Code\Apli_compta root@152.228.133.44:/var/www/Compta_perso_couple

# Ensuite, sur le serveur :
ssh root@152.228.133.44
cd /var/www/Compta_perso_couple
npm install --production
```

---

## ⚙️ Étape 4 : Configurer l'Application

### Modifier le fichier .env sur le serveur
```bash
cd /var/www/Compta_perso_couple
nano .env
```

**Contenu du fichier .env :**
```env
PORT=3000
NODE_ENV=production
SESSION_SECRET=CHANGEZ_CETTE_CLE_SECRETE_ICI
DATABASE_PATH=./database/compta.json
```

Pour générer une clé secrète sécurisée :
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copiez le résultat et remplacez `CHANGEZ_CETTE_CLE_SECRETE_ICI` dans le .env

**Sauvegarder le fichier : `Ctrl+X`, puis `Y`, puis `Entrée`**

---

## 🚀 Étape 5 : Installer et Configurer PM2

PM2 permet de garder votre application en ligne 24/7

```bash
# Installer PM2 globalement
sudo npm install -g pm2

# Démarrer l'application
cd /var/www/Compta_perso_couple
pm2 start server.js --name "compta-couple"

# Configurer PM2 pour démarrer au boot
pm2 save
pm2 startup
# Copiez et exécutez la commande affichée
```

### Commandes PM2 utiles :
```bash
pm2 status              # Voir l'état de l'application
pm2 logs compta-couple  # Voir les logs en temps réel
pm2 restart compta-couple  # Redémarrer
pm2 stop compta-couple     # Arrêter
pm2 delete compta-couple   # Supprimer
```

---

## 🌐 Étape 6 : Configurer le Firewall

```bash
# Installer ufw si pas déjà installé
sudo apt install ufw

# Autoriser SSH (IMPORTANT !)
sudo ufw allow ssh
sudo ufw allow 22/tcp

# Autoriser HTTP et HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Autoriser le port 3000 temporairement (pour tester)
sudo ufw allow 3000/tcp

# Activer le firewall
sudo ufw enable

# Vérifier le statut
sudo ufw status
```

---

## ✅ Étape 7 : Tester l'Application

Ouvrez votre navigateur et allez sur :
```
http://152.228.133.44:3000
```

Vous devriez voir la page de connexion ! 🎉

Connectez-vous avec :
- **Username:** david ou leo
- **Password:** david ou leo

---

## 🔒 Étape 8 : Installer nginx (Proxy Inverse) - OPTIONNEL mais RECOMMANDÉ

nginx permet d'accéder à l'app via le port 80 (sans :3000 dans l'URL)

```bash
# Installer nginx
sudo apt update
sudo apt install nginx

# Créer la configuration
sudo nano /etc/nginx/sites-available/compta-couple
```

**Coller ce contenu :**
```nginx
server {
    listen 80;
    server_name 152.228.133.44;

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

**Sauvegarder : `Ctrl+X`, puis `Y`, puis `Entrée`**

```bash
# Activer la configuration
sudo ln -s /etc/nginx/sites-available/compta-couple /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Si OK, redémarrer nginx
sudo systemctl restart nginx

# Activer nginx au démarrage
sudo systemctl enable nginx
```

Maintenant vous pouvez accéder à l'app via :
```
http://152.228.133.44
```
(Sans le :3000 !)

---

## 📱 Étape 9 : Installer l'Application sur votre Téléphone

### Sur Android (Chrome) :
1. Ouvrez `http://152.228.133.44` dans Chrome
2. Appuyez sur Menu (⋮) → "Ajouter à l'écran d'accueil"
3. L'icône apparaîtra sur votre écran d'accueil

### Sur iOS (Safari) :
1. Ouvrez `http://152.228.133.44` dans Safari
2. Appuyez sur le bouton Partager → "Sur l'écran d'accueil"
3. L'icône apparaîtra sur votre écran

**Note :** Pour iOS, vous aurez besoin de HTTPS (voir étape suivante)

---

## 🔐 Étape 10 : Installer SSL/HTTPS (OPTIONNEL - si vous avez un nom de domaine)

Si vous avez un nom de domaine pointant vers 152.228.133.44 :

```bash
# Installer Certbot
sudo apt install certbot python3-certbot-nginx

# Obtenir un certificat SSL
sudo certbot --nginx -d votre-domaine.com

# Suivre les instructions
```

Le certificat se renouvelle automatiquement !

---

## 🔄 Mettre à Jour l'Application

Quand vous modifiez le code sur votre PC :

### Via Git :
```bash
ssh root@152.228.133.44
cd /var/www/Compta_perso_couple
git pull
npm install --production
pm2 restart compta-couple
```

### Via SCP :
```powershell
# Sur votre PC
scp -r C:\Users\Hora\Desktop\Code\Apli_compta\* root@152.228.133.44:/var/www/Compta_perso_couple/

# Sur le serveur
ssh root@152.228.133.44
cd /var/www/Compta_perso_couple
pm2 restart compta-couple
```

---

## 🛡️ Sécurité : Changer les Mots de Passe

**IMPORTANT** : Une fois l'application déployée, allez dans :
```
Paramètres → Sécurité → Changer le mot de passe
```

Changez les mots de passe de david ET leo !

---

## 💾 Sauvegarder la Base de Données

### Sauvegarde manuelle :
```bash
cd /var/www/Compta_perso_couple/database
cp compta.json compta-backup-$(date +%Y%m%d).json
```

### Sauvegarde automatique quotidienne :
```bash
crontab -e
# Ajouter cette ligne :
0 2 * * * cp /var/www/Compta_perso_couple/database/compta.json /root/backup-compta-$(date +\%Y\%m\%d).json
```

---

## ❓ Dépannage

### L'application ne démarre pas
```bash
pm2 logs compta-couple  # Voir les erreurs
```

### Le port 3000 est déjà utilisé
```bash
sudo netstat -tlnp | grep 3000  # Voir quel processus utilise le port
sudo kill -9 <PID>  # Tuer le processus
```

### nginx ne fonctionne pas
```bash
sudo nginx -t  # Tester la configuration
sudo systemctl status nginx  # Voir le statut
sudo journalctl -xe  # Voir les logs détaillés
```

### Impossible de se connecter au serveur
```bash
# Sur le serveur, vérifier le firewall
sudo ufw status

# Vérifier que l'app tourne
pm2 status
```

---

## 📊 Monitoring

### Voir les logs en temps réel :
```bash
pm2 logs compta-couple
```

### Voir les métriques (CPU, RAM, etc.) :
```bash
pm2 monit
```

### Informations détaillées :
```bash
pm2 show compta-couple
```

---

## 🎯 Checklist de Déploiement

- [ ] Connexion SSH au serveur réussie
- [ ] Node.js et npm installés
- [ ] Application transférée sur le serveur
- [ ] Dépendances installées (`npm install --production`)
- [ ] Fichier .env configuré avec clé secrète
- [ ] PM2 installé et application démarrée
- [ ] Firewall configuré
- [ ] Application accessible via http://152.228.133.44:3000
- [ ] nginx installé et configuré (optionnel)
- [ ] Application accessible via http://152.228.133.44
- [ ] Mots de passe par défaut changés
- [ ] Sauvegarde automatique configurée

---

## 🆘 Besoin d'Aide ?

Si vous rencontrez des problèmes, envoyez-moi :
1. Les logs : `pm2 logs compta-couple --lines 50`
2. Le statut : `pm2 status`
3. Le message d'erreur exact

Bonne chance ! 🚀
