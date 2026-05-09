# 💰 Application de Comptabilité de Couple

Application web Progressive Web App (PWA) de gestion de budget pour deux utilisateurs (David et Léo), permettant de suivre les dépenses communes et personnelles avec des calculs d'équité et d'égalité.

## 🎯 Fonctionnalités

### Authentification
- Système de connexion sécurisé pour deux utilisateurs (David et Léo)
- Sessions persistantes avec cookies sécurisés
- Mots de passe par défaut : `david` / `leo`

### Gestion des Dépenses
- **Formulaire de saisie simplifié** :
  - Montant (numérique)
  - Date (par défaut : jour actuel)
  - Magasin (champ texte libre)
  - Type : Nourriture, Maison, Bricolage, Plaisir, Botanique
  - Bénéficiaire : Couple ou Perso (toggle intuitif)

### Tableau de Bord Interactif
- **Deux modes de visualisation** :
  - Récapitulatif mensuel (mois en cours)
  - Récapitulatif total (historique complet)

### Logique Métier : Équité vs Égalité

#### Mode Équitabilité
Calcule le ratio de dépense au prorata du salaire de chacun. Chaque utilisateur devrait dépenser proportionnellement à son salaire.

#### Mode Égalité (Règle 2/3)
Applique une règle spécifique : l'équilibre est atteint quand **David dépense 1.66x plus que Léo** (ratio 1.66:1), reflétant l'écart de salaire et de consommation.

### Visualisations Graphiques (Chart.js)
1. **Répartition par Type** : Diagramme circulaire des dépenses par catégorie
2. **Dépenses par Personne** : Graphique en barres comparant David et Léo
3. **Couple vs Perso** : Répartition entre dépenses communes et personnelles
4. **Salaire vs Dépenses** : Comparaison des revenus et dépenses mensuelles
5. **Jauge d'équilibre** : Visualisation dynamique de l'équilibre selon le mode choisi

### Progressive Web App (PWA)
- Interface mobile-first optimisée pour smartphone
- Installable sur l'écran d'accueil
- Fonctionne hors ligne (service worker)
- Navigation intuitive avec onglets

## 🛠️ Installation

### Prérequis
- Node.js (version 14 ou supérieure)
- npm ou yarn

### Étapes d'installation

1. **Cloner ou télécharger le projet**

2. **Installer les dépendances**
```bash
npm install
```

3. **Démarrer l'application**
```bash
npm start
```

Pour le développement avec rechargement automatique :
```bash
npm run dev
```

4. **Accéder à l'application**
Ouvrez votre navigateur et accédez à :
```
http://localhost:3000
```

## 📁 Structure du Projet

```
Apli_compta/
├── database/
│   ├── init.js              # Initialisation de la base de données
│   └── compta.db            # Base de données SQLite (généré automatiquement)
├── public/
│   ├── index.html           # Page de connexion
│   ├── app.html             # Application principale
│   ├── style.css            # Styles CSS (mobile-first)
│   ├── app.js               # Logique JavaScript principale
│   ├── manifest.json        # Manifest PWA
│   ├── service-worker.js    # Service Worker pour mode hors ligne
│   ├── icon-192.png         # Icône PWA 192x192
│   └── icon-512.png         # Icône PWA 512x512
├── .env                     # Variables d'environnement
├── .gitignore              # Fichiers à ignorer par Git
├── package.json            # Dépendances Node.js
├── server.js               # Serveur Express
└── README.md               # Ce fichier
```

## 🔒 Sécurité

- Mots de passe hashés avec bcrypt
- Sessions sécurisées avec express-session
- Protection CSRF
- Variables sensibles dans `.env` (non versionnées)
- Validation côté serveur

## 📊 Base de Données

L'application utilise SQLite avec trois tables principales :

### `users`
- Stockage des utilisateurs (David et Léo)
- Mots de passe hashés

### `salaries`
- Salaires mensuels par utilisateur
- Utilisé pour les calculs d'équité

### `expenses`
- Toutes les dépenses enregistrées
- Relations avec les utilisateurs
- Historique complet des transactions

## 🎨 Interface

### Design Mobile-First
- Optimisé pour les écrans de smartphone
- Navigation par onglets
- Formulaires ergonomiques
- Graphiques responsives
- Thème moderne avec dégradés

### Couleurs
- Primaire : Bleu indigo (#6366f1)
- Secondaire : Vert (#10b981)
- Danger : Rouge (#ef4444)
- Arrière-plan : Gris clair (#f8fafc)

## 🚀 Déploiement

### Déploiement sur serveur privé

1. **Configurer les variables d'environnement**
```bash
# Éditer le fichier .env
PORT=3000
NODE_ENV=production
SESSION_SECRET=<générer_une_clé_secrète_forte>
DATABASE_PATH=./database/compta.db
```

2. **Installer les dépendances de production**
```bash
npm install --production
```

3. **Démarrer avec PM2 (recommandé)**
```bash
npm install -g pm2
pm2 start server.js --name "compta-couple"
pm2 save
pm2 startup
```

4. **Configurer un proxy inverse (nginx)**
```nginx
server {
    listen 80;
    server_name votre-domaine.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

5. **Configurer SSL avec Let's Encrypt (recommandé)**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d votre-domaine.com
```

## 📱 Installation sur Mobile

### Android
1. Ouvrez l'application dans Chrome
2. Menu → "Ajouter à l'écran d'accueil"
3. L'application s'installe comme une app native

### iOS
1. Ouvrez l'application dans Safari
2. Appuyez sur le bouton "Partager"
3. Sélectionnez "Sur l'écran d'accueil"

## 🔧 Personnalisation

### Changer les utilisateurs
Modifiez le fichier `database/init.js` pour ajouter ou modifier les utilisateurs.

### Ajouter des types de dépenses
Éditez `public/app.html` dans la section du formulaire de dépense.

### Modifier les ratios
Ajustez les calculs dans `public/app.js` dans les fonctions `calculateEquityBalance` et `calculateEqualityBalance`.

## 🐛 Dépannage

### La base de données ne se crée pas
Vérifiez que le dossier `database/` existe et que l'application a les droits d'écriture.

### Erreur de connexion
Vérifiez que le port 3000 n'est pas déjà utilisé :
```bash
netstat -ano | findstr :3000  # Windows
lsof -i :3000                  # Linux/Mac
```

### Les graphiques ne s'affichent pas
Vérifiez votre connexion internet (Chart.js est chargé depuis un CDN).

## 📝 Licence

MIT License - Libre d'utilisation et de modification.

## 👥 Support

Pour toute question ou problème, consultez la documentation ou contactez l'administrateur.

---

**Développé avec ❤️ pour David & Léo**
