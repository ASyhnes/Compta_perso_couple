# 🚀 Déployer les Corrections en Production

## Étape 1️⃣ : Commiter et Pousser les Changements (VS Code)

### Dans VS Code :

1. **Ouvrir le panneau Source Control**
   - Cliquez sur l'icône 🔀 dans la barre latérale gauche
   - Ou appuyez sur `Ctrl+Shift+G`

2. **Vérifier les fichiers modifiés**
   Vous devriez voir :
   - ✅ `database/json-db.js` (MODIFIÉ - corrections des graphiques)
   - ✅ `DIAGNOSTIC_ET_CORRECTIONS.md` (NOUVEAU)
   - ✅ `DEPLOYER_LES_CORRECTIONS.md` (NOUVEAU - ce fichier)

3. **Stager tous les fichiers**
   - Cliquez sur le `+` à côté de "Changes"
   - Ou cliquez sur chaque fichier individuellement

4. **Créer le commit**
   - Dans le champ "Message", écrivez :
   ```
   🐛 Fix: Correction des graphiques vides
   
   - Ajout des requêtes SQL manquantes dans json-db.js
   - Support des agrégations (virements, charges, dépenses)
   - Support de UPDATE expenses
   - Tous les graphiques fonctionnent maintenant
   ```
   
5. **Commiter**
   - Cliquez sur le bouton `✓ Commit` (ou `Ctrl+Enter`)

6. **Pousser vers GitHub**
   - Cliquez sur `⋯` (menu) → `Push`
   - Ou cliquez sur le bouton "☁️ Sync Changes"
   - Si demandé, confirmez avec vos identifiants GitHub

---

## Étape 2️⃣ : Se Connecter au Serveur

Ouvrez **PowerShell** ou **Windows Terminal** :

```powershell
ssh root@152.228.133.44
```

Entrez votre mot de passe quand demandé.

---

## Étape 3️⃣ : Mettre à Jour l'Application sur le Serveur

Une fois connecté au serveur :

```bash
# Aller dans le dossier de l'application
cd /var/www/Compta_perso_couple

# Récupérer les dernières modifications depuis GitHub
git pull origin main
# (ou "git pull origin master" selon votre branche)

# Si vous avez ajouté de nouvelles dépendances npm (pas le cas ici)
# npm install --production

# Redémarrer l'application avec PM2
pm2 restart compta-couple

# Vérifier que tout fonctionne
pm2 status
pm2 logs compta-couple --lines 20
```

---

## Étape 4️⃣ : Vérifier en Production

Ouvrez votre navigateur et allez sur :
```
http://152.228.133.44
```

Ou si nginx n'est pas configuré :
```
http://152.228.133.44:3000
```

1. **Connectez-vous** (david/david)
2. **Rechargez la page** avec `Ctrl+Shift+R` (hard refresh)
3. **Vérifiez les graphiques** :
   - ✅ Répartition par Type (devait déjà fonctionner)
   - ✅ Dépenses par Personne (devrait afficher David 505€)
   - ✅ Couple vs Perso (devrait afficher données)
   - ✅ Salaire vs Dépenses (devrait afficher salaire David)

4. **Ouvrez la console du navigateur** (F12)
   - Vérifiez qu'il n'y a pas d'erreurs
   - Cherchez les logs `📊 [updateCharts]`

---

## ✅ Checklist de Déploiement

- [ ] Fichiers commitées dans VS Code
- [ ] Changements poussés sur GitHub
- [ ] Connecté au serveur SSH
- [ ] `git pull` exécuté sur le serveur
- [ ] Application redémarrée avec `pm2 restart`
- [ ] Application testée sur http://152.228.133.44
- [ ] Les 4 graphiques s'affichent correctement
- [ ] Aucune erreur dans la console navigateur

---

## 🆘 En Cas de Problème

### Git pull échoue avec un conflit
```bash
# Voir les fichiers en conflit
git status

# Annuler les modifications locales et forcer la mise à jour
git fetch origin
git reset --hard origin/main  # ou origin/master
```

### PM2 n'est pas installé
```bash
sudo npm install -g pm2
cd /var/www/Compta_perso_couple
pm2 start server.js --name "compta-couple"
pm2 save
```

### L'application ne démarre pas
```bash
# Voir les logs détaillés
pm2 logs compta-couple --lines 50

# Vérifier les erreurs Node.js
cd /var/www/Compta_perso_couple
node server.js
# (Ctrl+C pour arrêter, puis relancer avec pm2)
```

### Les graphiques sont toujours vides
1. Vérifiez que le fichier `database/json-db.js` a bien été mis à jour
2. Assurez-vous d'avoir fait un hard refresh (Ctrl+Shift+R)
3. Videz le cache du navigateur
4. Vérifiez les logs : `pm2 logs compta-couple`

---

## 📱 Après le Déploiement

N'oubliez pas de :
1. **Tester sur mobile** si vous utilisez l'app installée
2. **Vider le cache** de l'app mobile si nécessaire
3. **Ajouter des données** (salaires, virements, charges) pour tester tous les graphiques

---

## 🎯 Commandes Rapides pour les Prochains Déploiements

```bash
# Sur votre PC (VS Code)
# → Commit + Push via l'interface

# Sur le serveur
ssh root@152.228.133.44
cd /var/www/Compta_perso_couple && git pull && pm2 restart compta-couple
```

C'est tout! 🚀

---

## 📝 Notes

- **"En prod"** = production = version en ligne accessible publiquement ✅
- Les corrections sont maintenant dans le code
- Le serveur tourne déjà, vous n'avez qu'à mettre à jour et redémarrer
- Si vous n'avez pas encore déployé l'app, consultez `DEPLOIEMENT_RAPIDE.md`
