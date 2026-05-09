# 📦 Guide pour Pousser sur GitHub

## Option 1 : Utiliser Visual Studio Code (Recommandé - Plus Simple)

Visual Studio Code a Git intégré. C'est la méthode la plus simple !

### Étapes dans VS Code :

1. **Ouvrir le panneau Source Control**
   - Cliquez sur l'icône de contrôle de source (3ème icône dans la barre latérale gauche)
   - Ou utilisez `Ctrl+Shift+G`

2. **Initialiser le dépôt**
   - Cliquez sur "Initialize Repository"
   - Tous vos fichiers apparaîtront dans "Changes"

3. **Staged tous les fichiers**
   - Cliquez sur le "+" à côté de "Changes" pour tout ajouter
   - Ou cliquez sur le "+" de chaque fichier individuellement

4. **Faire le commit**
   - Entrez un message dans la zone de texte en haut : "Initial commit: Application de comptabilité de couple"
   - Cliquez sur le bouton "Commit" (✓)

5. **Ajouter le remote GitHub**
   - Ouvrez le terminal intégré dans VS Code (`Ctrl+ù`)
   - Tapez : 
   ```bash
   git remote add origin https://github.com/ASyhnes/Compta_perso_couple.git
   ```

6. **Pousser sur GitHub**
   - Dans le panneau Source Control, cliquez sur "..." (menu)
   - Sélectionnez "Push to..."
   - Choisissez "origin" puis "main"
   - Entrez vos identifiants GitHub si demandé

---

## Option 2 : Installer Git et Utiliser le Terminal

### 1. Télécharger et Installer Git

1. Allez sur : https://git-scm.com/download/win
2. Téléchargez Git pour Windows
3. Installez avec les options par défaut
4. Redémarrez VS Code après l'installation

### 2. Configurer Git (première fois seulement)

Ouvrez un terminal et configurez votre identité :

```bash
git config --global user.name "Votre Nom"
git config --global user.email "votre.email@example.com"
```

### 3. Pousser sur GitHub

Dans le terminal de VS Code (`Ctrl+ù`), exécutez :

```bash
# Initialiser le dépôt
git init

# Ajouter tous les fichiers
git add .

# Faire le commit
git commit -m "Initial commit: Application de comptabilité de couple avec dark theme et changement de mot de passe"

# Renommer la branche en main
git branch -M main

# Ajouter le remote
git remote add origin https://github.com/ASyhnes/Compta_perso_couple.git

# Pousser sur GitHub
git push -u origin main
```

### Si le dépôt existe déjà sur GitHub :

Si vous avez déjà des fichiers sur GitHub, utilisez plutôt :

```bash
git pull origin main --allow-unrelated-histories
git push -u origin main
```

---

## 🔐 Authentification GitHub

### Si on vous demande un mot de passe :

GitHub n'accepte plus les mots de passe classiques. Vous devez utiliser un **Personal Access Token** :

1. Allez sur GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Cliquez "Generate new token (classic)"
3. Donnez un nom : "Apli_compta"
4. Cochez : `repo` (accès complet au dépôt)
5. Cliquez "Generate token"
6. **COPIEZ LE TOKEN** (vous ne le reverrez plus jamais !)
7. Utilisez ce token comme mot de passe quand Git vous le demande

### Sauvegarder vos identifiants :

Pour ne pas avoir à entrer vos identifiants à chaque fois :

```bash
git config --global credential.helper store
```

---

## ✅ Vérification

Une fois poussé, vérifiez sur GitHub :
```
https://github.com/ASyhnes/Compta_perso_couple
```

Vous devriez voir tous vos fichiers !

---

## 🔄 Pour les Mises à Jour Futures

Après avoir modifié des fichiers :

### Avec VS Code :
1. Panneau Source Control (`Ctrl+Shift+G`)
2. Staged les fichiers modifiés
3. Commit avec un message
4. Push

### Avec le terminal :
```bash
git add .
git commit -m "Description des changements"
git push
```

---

## ❓ Problèmes Courants

### "fatal: remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/ASyhnes/Compta_perso_couple.git
```

### "fatal: refusing to merge unrelated histories"
```bash
git pull origin main --allow-unrelated-histories
```

### "Permission denied"
Vérifiez votre Personal Access Token ou vos identifiants SSH.

---

## 📝 Fichiers à NE PAS Pousser

Le fichier `.gitignore` est déjà configuré pour ignorer :
- `node_modules/` (dépendances)
- `.env` (variables sensibles)
- `database/*.db` et `database/*.json` (données privées)

**IMPORTANT** : Ne commitez jamais vos mots de passe ou la base de données !
