# 📦 Guide d'Installation - Compta Couple

## 🚀 Démarrage Rapide

### 1. Installer les dépendances Node.js

Ouvrez un terminal dans le dossier du projet et exécutez :

```bash
npm install
```

Cette commande installera :
- Express (serveur web)
- SQLite (base de données)
- bcryptjs (cryptage des mots de passe)
- express-session (gestion des sessions)
- dotenv (variables d'environnement)

### 2. Créer les icônes PWA

Les icônes PWA doivent être créées et placées dans le dossier `public/` :

**Option A : Créer des icônes simples (pour tester)**
- Créez deux fichiers PNG simples nommés `icon-192.png` et `icon-512.png`
- Placez-les dans le dossier `public/`

**Option B : Générer des icônes professionnelles**
- Utilisez un générateur d'icônes PWA en ligne comme :
  - https://realfavicongenerator.net/
  - https://www.pwabuilder.com/imageGenerator
- Téléchargez et placez `icon-192.png` et `icon-512.png` dans `public/`

**Option C : Utiliser un emoji comme icône temporaire**
Pour une icône temporaire rapide, créez une image avec l'emoji 💰

### 3. Démarrer l'application

```bash
npm start
```

Ou pour le développement avec rechargement automatique :

```bash
npm run dev
```

### 4. Accéder à l'application

Ouvrez votre navigateur et accédez à :
```
http://localhost:3000
```

## 🔐 Connexion

**Utilisateurs par défaut :**
- Username: `david` / Password: `david`
- Username: `leo` / Password: `leo`

⚠️ **Sécurité** : Changez ces mots de passe en production !

## 📱 Installer sur Mobile

### Android (Chrome)
1. Ouvrez `http://[votre-ip]:3000` sur votre smartphone
2. Menu Chrome → "Ajouter à l'écran d'accueil"
3. L'app s'installe comme une application native

### iOS (Safari)
1. Ouvrez l'URL dans Safari
2. Bouton Partager → "Sur l'écran d'accueil"
3. L'icône apparaît sur votre écran d'accueil

## 🌐 Accès depuis le réseau local

Pour accéder depuis d'autres appareils sur le même réseau :

1. Trouvez votre adresse IP locale :
   - Windows : `ipconfig`
   - Mac/Linux : `ifconfig` ou `ip addr`

2. Accédez depuis un autre appareil :
   ```
   http://[votre-ip]:3000
   ```
   Exemple : `http://192.168.1.100:3000`

## ✅ Vérification de l'installation

Après le démarrage, vous devriez voir :
```
╔════════════════════════════════════════════════╗
║   💰 Application de Comptabilité de Couple    ║
║                                                ║
║   🌐 Serveur démarré sur:                     ║
║      http://localhost:3000                     ║
║                                                ║
║   👥 Utilisateurs par défaut:                 ║
║      - david / david                           ║
║      - leo / leo                               ║
║                                                ║
║   📊 Base de données: SQLite                   ║
╚════════════════════════════════════════════════╝
```

## 🔧 Résolution de Problèmes

### Erreur "Port 3000 déjà utilisé"
Modifiez le port dans `.env` :
```
PORT=3001
```

### Erreur "Cannot find module"
Réinstallez les dépendances :
```bash
rm -rf node_modules package-lock.json
npm install
```

### La base de données ne se crée pas
Vérifiez que le dossier `database/` existe et que vous avez les droits d'écriture.

### Les icônes PWA ne s'affichent pas
Créez des fichiers `icon-192.png` et `icon-512.png` basiques dans le dossier `public/`.

## 📊 Première Utilisation

1. **Connectez-vous** avec david ou leo
2. **Configurez les salaires** (onglet Salaires)
3. **Ajoutez des dépenses** (onglet Nouvelle Dépense)
4. **Consultez le tableau de bord** pour voir les graphiques et l'équilibre

## 🎯 Fonctionnalités à Tester

- [ ] Connexion avec les deux utilisateurs
- [ ] Ajout de salaires mensuels
- [ ] Création de dépenses (Couple et Perso)
- [ ] Visualisation des graphiques
- [ ] Jauge d'équilibre (mode Équité et Égalité)
- [ ] Suppression de dépenses
- [ ] Changement de période (Mois / Total)
- [ ] Installation en PWA sur mobile

## 💡 Conseils

- Configurez d'abord les salaires avant d'analyser l'équilibre
- Utilisez le mode Équité pour un ratio basé sur les salaires
- Utilisez le mode Égalité pour la règle des 2/3 (David 1.66x Léo)
- Les dépenses "Couple" sont visibles par tous, "Perso" uniquement par le créateur
