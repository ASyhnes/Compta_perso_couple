# 🌐 Déployer via Console Web (Sans SSH)

## ⚠️ Situation Actuelle
- ✅ **Code corrigé et poussé sur GitHub** 
- ✅ **Serveur local fonctionne** (http://localhost:3000)
- ❌ **Serveur production PAS mis à jour** (port SSH 22 bloqué)

---

## 🎯 Solution: Console Web de votre hébergeur

### Étape 1: Accéder à la console web

Selon votre hébergeur, allez dans:

#### **OVH Cloud:**
1. Connectez-vous à https://www.ovh.com/manager/
2. Cliquez sur votre VPS/serveur
3. Allez dans l'onglet **"Console"** ou **"KVM"**
4. Cliquez sur **"Console web"** ou **"Ouvrir la console"**

#### **Scaleway:**
1. https://console.scaleway.com
2. Cliquez sur votre instance
3. Cliquez sur **"Console"** dans le menu

#### **DigitalOcean:**
1. https://cloud.digitalocean.com/
2. Cliquez sur votre droplet
3. Cliquez sur **"Console"** en haut à droite

#### **Autres (Contabo, Hetzner, etc.):**
1. Connectez-vous à votre panneau
2. Cherchez **"Console"**, **"Terminal"**, **"VNC"** ou **"KVM"**

---

### Étape 2: Une fois dans la console

**Tapez ces commandes une par une:**

```bash
# 1. Aller dans le dossier de l'application
cd /var/www/Compta_perso_couple

# 2. Vérifier qu'on est dans le bon dossier
pwd
ls

# 3. Récupérer les dernières modifications depuis GitHub
git pull origin main

# 4. Vérifier que le fichier a bien été mis à jour
head -20 database/json-db.js

# 5. Redémarrer l'application
pm2 restart compta-couple

# 6. Vérifier que l'app tourne bien
pm2 status
pm2 logs compta-couple --lines 10
```

---

### Étape 3: Tester en production

1. Ouvrez: **http://152.228.133.44**
2. Faites un **Ctrl+Shift+R** (hard refresh)
3. Connectez-vous (david/david)
4. **Vérifiez les graphiques** → Ils devraient maintenant s'afficher! 🎉

---

## 🔒 Alternative: Corriger le problème SSH

Si vous voulez corriger l'accès SSH pour les prochaines fois:

### Option A: Vérifier le port SSH
Le serveur utilise peut-être un port différent:

```powershell
# Essayer différents ports
ssh -p 2222 syhnes@152.228.133.44
ssh -p 2200 syhnes@152.228.133.44
ssh -p 22022 syhnes@152.228.133.44
```

### Option B: Ouvrir le port 22 dans le firewall

**Via console web:**
```bash
# Vérifier le firewall
sudo ufw status

# Si le port 22 n'est pas ouvert
sudo ufw allow 22/tcp
sudo ufw reload

# Vérifier que SSH tourne
sudo systemctl status ssh
sudo systemctl restart ssh
```

### Option C: Vérifier la configuration SSH

```bash
# Dans la console web
cat /etc/ssh/sshd_config | grep Port
cat /etc/ssh/sshd_config | grep PermitRootLogin
```

Si `Port` est différent de 22, utilisez ce port.
Si `PermitRootLogin no`, utilisez l'utilisateur `syhnes` au lieu de `root`.

---

## 📝 Résumé

**Le plus simple et rapide: Utiliser la console web de votre hébergeur!**

En 2 minutes vous pouvez:
1. Ouvrir la console web
2. Taper: `cd /var/www/Compta_perso_couple && git pull && pm2 restart compta-couple`
3. Tester: http://152.228.133.44

**C'est tout!** ✅
