# 🔧 Commandes à exécuter sur le serveur

## ✅ Vous êtes connecté! Maintenant tapez ces commandes:

```bash
# 1. Vérifier si une app PM2 existe déjà
pm2 list

# 2. Si l'app n'existe pas, la démarrer
pm2 start server.js --name compta-couple

# 3. Sauvegarder la configuration PM2
pm2 save

# 4. Vérifier que l'app tourne
pm2 status

# 5. Voir les logs
pm2 logs compta-couple --lines 20
```

---

## Si l'app existe déjà sous un autre nom:

```bash
# Voir toutes les apps
pm2 list

# Si vous voyez une app (ex: "index" ou "server" ou "0")
pm2 restart 0
# ou
pm2 restart le-nom-de-votre-app
```

---

## 🌐 Tester ensuite

Ouvrez: **http://152.228.133.44**
- Faites **Ctrl+Shift+R** (vider le cache)
- Connectez-vous (david/david)
- Les graphiques devraient maintenant s'afficher! 🎉

---

## ⚠️ Si port 3000 déjà utilisé

```bash
# Tuer le processus qui utilise le port 3000
sudo lsof -ti:3000 | xargs kill -9

# Puis redémarrer
pm2 start server.js --name compta-couple
```
