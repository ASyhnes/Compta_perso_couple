// Serveur Express pour l'application de comptabilité de couple
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const path = require('path');
const { initDatabase } = require('./database/json-db');

const app = express();
const PORT = process.env.PORT || 3000;

// When running behind a reverse proxy (nginx) and using secure cookies,
// enable trust proxy so Express sees the original protocol (HTTPS).
app.set('trust proxy', 1);
// Initialisation de la base de données
const db = initDatabase(process.env.DATABASE_PATH || './database/compta.db');

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Configuration des sessions
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: { 
    secure: 'auto',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 jours
  }
}));

// Middleware d'authentification
function requireAuth(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Non authentifié' });
  }
}

// ============================================
// ROUTES D'AUTHENTIFICATION
// ============================================

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    req.session.regenerate((regenError) => {
      if (regenError) {
        console.error('Erreur regeneration session:', regenError);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.displayName = user.display_name;

      req.session.save((saveError) => {
        if (saveError) {
          console.error('Erreur sauvegarde session:', saveError);
          return res.status(500).json({ error: 'Erreur serveur' });
        }

        res.json({ 
          success: true, 
          user: { 
            id: user.id, 
            username: user.username, 
            displayName: user.display_name 
          } 
        });
      });
    });
  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Vérification de session
app.get('/api/session', (req, res) => {
  if (req.session.userId) {
    res.json({ 
      authenticated: true,
      user: {
        id: req.session.userId,
        username: req.session.username,
        displayName: req.session.displayName
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

// ============================================
// ROUTES DES SALAIRES
// ============================================

// Sauvegarder ou mettre à jour le salaire du mois
app.post('/api/salary', requireAuth, (req, res) => {
  const { month, amount } = req.body;
  const userId = req.session.userId;

  try {
    const stmt = db.prepare(`
      INSERT INTO salaries (user_id, month, amount) 
      VALUES (?, ?, ?)
      ON CONFLICT(user_id, month) 
      DO UPDATE SET amount = excluded.amount
    `);
    
    stmt.run(userId, month, amount);
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur salaire:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer les salaires du mois pour les deux utilisateurs
app.get('/api/salaries/:month', requireAuth, (req, res) => {
  const { month } = req.params;

  try {
    const salaries = db.prepare(`
      SELECT u.username, u.display_name, s.amount, s.month
      FROM users u
      LEFT JOIN salaries s ON u.id = s.user_id AND s.month = ?
      ORDER BY u.id
    `).all(month);

    res.json(salaries);
  } catch (error) {
    console.error('Erreur récupération salaires:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================
// ROUTES DES DÉPENSES
// ============================================

// Créer une nouvelle dépense
app.post('/api/expenses', requireAuth, (req, res) => {
  const { amount, date, store, type, beneficiary, account } = req.body;
  const userId = req.session.userId;

  try {
    const stmt = db.prepare(`
      INSERT INTO expenses (user_id, amount, date, store, type, beneficiary, account)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const acct = account || 'commun';
    const result = stmt.run(userId, amount, date, store, type, beneficiary, acct);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    console.error('Erreur création dépense:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer toutes les dépenses (avec filtres optionnels)
app.get('/api/expenses', requireAuth, (req, res) => {
  const { startDate, endDate, month } = req.query;

  try {
    let query = `
      SELECT e.*, u.username, u.display_name
      FROM expenses e
      JOIN users u ON e.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (month) {
      query += ` AND strftime('%Y-%m', e.date) = ?`;
      params.push(month);
    } else {
      if (startDate) {
        query += ` AND e.date >= ?`;
        params.push(startDate);
      }
      if (endDate) {
        query += ` AND e.date <= ?`;
        params.push(endDate);
      }
    }

    query += ` ORDER BY e.date DESC, e.created_at DESC`;

    const expenses = db.prepare(query).all(...params);
    res.json(expenses);
  } catch (error) {
    console.error('Erreur récupération dépenses:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer une dépense par ID
app.get('/api/expenses/:id', requireAuth, (req, res) => {
  const { id } = req.params;

  try {
    const expense = db.prepare('SELECT user_id FROM expenses WHERE id = ?').get(id);
    
    if (!expense) {
      return res.status(404).json({ error: 'Dépense non trouvée' });
    }

    res.json(expense);
  } catch (error) {
    console.error('Erreur récupération dépense:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Modifier une dépense
app.put('/api/expenses/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { amount, date, store, type, beneficiary, account } = req.body;
  const userId = req.session.userId;

  try {
    // Vérifier que la dépense appartient à l'utilisateur
    const expense = db.prepare('SELECT user_id FROM expenses WHERE id = ?').get(id);
    
    if (!expense) {
      return res.status(404).json({ error: 'Dépense non trouvée' });
    }

    if (expense.user_id !== userId) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    // Mettre à jour la dépense
    db.prepare(`
      UPDATE expenses 
      SET amount = ?, date = ?, store = ?, type = ?, beneficiary = ?, account = ?
      WHERE id = ?
    `).run(amount, date, store, type, beneficiary, account || 'commun', id);

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur modification dépense:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer une dépense
app.delete('/api/expenses/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const userId = req.session.userId;

  try {
    // Vérifier que la dépense appartient à l'utilisateur
    const expense = db.prepare('SELECT user_id FROM expenses WHERE id = ?').get(id);
    
    if (!expense) {
      return res.status(404).json({ error: 'Dépense non trouvée' });
    }

    if (expense.user_id !== userId) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression dépense:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Statistiques par période
app.get('/api/stats', requireAuth, (req, res) => {
  const { startDate, endDate, month } = req.query;

  try {
    // Construire condition de date pour différentes tables
    let vCondition = '1=1';
    let eCondition = '1=1';
    let cCondition = '1=1';
    const vParams = [];
    const eParams = [];
    const cParams = [];

    if (month) {
      vCondition = `strftime('%Y-%m', v.date) = ?`;
      eCondition = `strftime('%Y-%m', e.date) = ?`;
      cCondition = `strftime('%Y-%m', c.date) = ?`;
      vParams.push(month); eParams.push(month); cParams.push(month);
    } else if (startDate && endDate) {
      vCondition = 'v.date BETWEEN ? AND ?';
      eCondition = 'e.date BETWEEN ? AND ?';
      cCondition = 'c.date BETWEEN ? AND ?';
      vParams.push(startDate, endDate); eParams.push(startDate, endDate); cParams.push(startDate, endDate);
    }

    // Récupérer utilisateurs
    const users = db.prepare('SELECT id, username, display_name FROM users ORDER BY id').all();

    // Virements par utilisateur
    const virementsRows = db.prepare(`
      SELECT v.user_id, COALESCE(SUM(v.amount),0) as virements
      FROM virements_compte_commun v
      WHERE ${vCondition}
      GROUP BY v.user_id
    `).all(...vParams);

    // Charges loyer/garage par utilisateur
    const chargesRows = db.prepare(`
      SELECT c.user_id, COALESCE(SUM(c.amount),0) as charges_loyer
      FROM charges_hors_compte c
      WHERE ${cCondition} AND c.category IN ('loyer','loyer_garage')
      GROUP BY c.user_id
    `).all(...cParams);

    // Dépenses du compte commun par utilisateur
    const sharedRows = db.prepare(`
      SELECT e.user_id, COALESCE(SUM(e.amount),0) as shared_spent
      FROM expenses e
      WHERE ${eCondition} AND e.account = 'commun'
      GROUP BY e.user_id
    `).all(...eParams);

    // Dépenses personnelles (depuis compte commun) par utilisateur
    const personalRows = db.prepare(`
      SELECT e.user_id, COALESCE(SUM(e.amount),0) as personal_spent
      FROM expenses e
      WHERE ${eCondition} AND e.account = 'commun' AND e.beneficiary = 'Perso'
      GROUP BY e.user_id
    `).all(...eParams);

    // Construire maps
    const virementsMap = Object.fromEntries(virementsRows.map(r => [r.user_id, r.virements]));
    const chargesMap = Object.fromEntries(chargesRows.map(r => [r.user_id, r.charges_loyer]));
    const sharedMap = Object.fromEntries(sharedRows.map(r => [r.user_id, r.shared_spent]));
    const personalMap = Object.fromEntries(personalRows.map(r => [r.user_id, r.personal_spent]));

    // Initial adjusted spent = shared_spent
    const adjusted = {};
    users.forEach(u => adjusted[u.id] = sharedMap[u.id] || 0);

    const n = users.length;
    // Réattribuer les excédents : si un utilisateur dépense plus que son virement,
    // la différence est considérée payée par les autres (répartition égale entre les autres)
    users.forEach(u => {
      const vid = u.id;
      const vire = virementsMap[vid] || 0;
      const spent = adjusted[vid] || 0;
      if (spent > vire) {
        const excess = spent - vire;
        adjusted[vid] = vire; // on ramène au montant viré
        const perOther = n > 1 ? excess / (n - 1) : 0;
        users.forEach(ou => {
          if (ou.id !== vid) adjusted[ou.id] = (adjusted[ou.id] || 0) + perOther;
        });
      }
    });

    // Ajouter les charges loyer/garage (ces montants ont été payés par l'utilisateur)
    users.forEach(u => {
      adjusted[u.id] = (adjusted[u.id] || 0) + (chargesMap[u.id] || 0);
    });

    // Construire tableaux de sortie
    const totalByUser = users.map(u => ({
      username: u.username,
      display_name: u.display_name,
      total: +(adjusted[u.id] || 0)
    }));

    const contributionsByUser = users.map(u => ({
      username: u.username,
      display_name: u.display_name,
      contributions: +((virementsMap[u.id] || 0) + (chargesMap[u.id] || 0))
    }));

    // Totaux classiques pour graphes
    const totalByType = db.prepare(`
      SELECT type, SUM(amount) as total, COUNT(*) as count
      FROM expenses
      WHERE ${eCondition}
      GROUP BY type
    `).all(...eParams);

    const totalByBeneficiary = db.prepare(`
      SELECT e.beneficiary, SUM(e.amount) as total, COUNT(*) as count
      FROM expenses e
      WHERE ${eCondition}
      GROUP BY e.beneficiary
    `).all(...eParams);

    const detailByUserAndBeneficiary = db.prepare(`
      SELECT u.username, u.display_name, e.beneficiary, SUM(e.amount) as total
      FROM users u
      LEFT JOIN expenses e ON u.id = e.user_id AND ${eCondition}
      GROUP BY u.id, e.beneficiary
      ORDER BY u.id
    `).all(...eParams);

    const personalByUser = users.map(u => ({
      username: u.username,
      display_name: u.display_name,
      personal: +(personalMap[u.id] || 0)
    }));

    res.json({
      totalByUser,
      contributionsByUser,
      totalByType,
      totalByBeneficiary,
      detailByUserAndBeneficiary: detailByUserAndBeneficiary,
      personalByUser
    });
  } catch (error) {
    console.error('Erreur récupération stats:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================
// ROUTES VIREMENTS COMPTE COMMUN
// ============================================

// Créer un virement vers le compte commun
app.post('/api/virement', requireAuth, (req, res) => {
  const { amount, date } = req.body;
  const userId = req.session.userId;

  try {
    const stmt = db.prepare(`
      INSERT INTO virements_compte_commun (user_id, amount, date)
      VALUES (?, ?, ?)
    `);
    
    const result = stmt.run(userId, amount, date);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    console.error('Erreur création virement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer les virements (avec filtres optionnels)
app.get('/api/virements', requireAuth, (req, res) => {
  const { startDate, endDate, month } = req.query;

  try {
    let query = `
      SELECT v.*, u.username, u.display_name
      FROM virements_compte_commun v
      JOIN users u ON v.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (month) {
      query += ` AND strftime('%Y-%m', v.date) = ?`;
      params.push(month);
    } else {
      if (startDate) {
        query += ` AND v.date >= ?`;
        params.push(startDate);
      }
      if (endDate) {
        query += ` AND v.date <= ?`;
        params.push(endDate);
      }
    }

    query += ` ORDER BY v.date DESC, v.created_at DESC`;

    const virements = db.prepare(query).all(...params);
    res.json(virements);
  } catch (error) {
    console.error('Erreur récupération virements:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un virement
app.delete('/api/virement/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const userId = req.session.userId;

  try {
    const virement = db.prepare('SELECT user_id FROM virements_compte_commun WHERE id = ?').get(id);
    
    if (!virement) {
      return res.status(404).json({ error: 'Virement non trouvé' });
    }

    if (virement.user_id !== userId) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    db.prepare('DELETE FROM virements_compte_commun WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression virement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================
// ROUTES CHARGES HORS COMPTE
// ============================================

// Créer une charge hors compte
app.post('/api/charge-hors-compte', requireAuth, (req, res) => {
  const { amount, date, category, description } = req.body;
  const userId = req.session.userId;

  try {
    const stmt = db.prepare(`
      INSERT INTO charges_hors_compte (user_id, amount, date, category, description)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(userId, amount, date, category, description || null);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    console.error('Erreur création charge:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer les charges hors compte (avec filtres optionnels)
app.get('/api/charges-hors-compte', requireAuth, (req, res) => {
  const { startDate, endDate, month, category } = req.query;

  try {
    let query = `
      SELECT c.*, u.username, u.display_name
      FROM charges_hors_compte c
      JOIN users u ON c.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (month) {
      query += ` AND strftime('%Y-%m', c.date) = ?`;
      params.push(month);
    } else {
      if (startDate) {
        query += ` AND c.date >= ?`;
        params.push(startDate);
      }
      if (endDate) {
        query += ` AND c.date <= ?`;
        params.push(endDate);
      }
    }

    if (category) {
      query += ` AND c.category = ?`;
      params.push(category);
    }

    query += ` ORDER BY c.date DESC, c.created_at DESC`;

    const charges = db.prepare(query).all(...params);
    res.json(charges);
  } catch (error) {
    console.error('Erreur récupération charges:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer une charge
app.delete('/api/charge-hors-compte/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const userId = req.session.userId;

  try {
    const charge = db.prepare('SELECT user_id FROM charges_hors_compte WHERE id = ?').get(id);
    
    if (!charge) {
      return res.status(404).json({ error: 'Charge non trouvée' });
    }

    if (charge.user_id !== userId) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    db.prepare('DELETE FROM charges_hors_compte WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression charge:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================
// CHANGEMENT DE MOT DE PASSE
// ============================================

app.post('/api/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.session.userId;

  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(req.session.username);

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Vérifier le mot de passe actuel
    const validPassword = bcrypt.compareSync(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
    }

    // Hasher le nouveau mot de passe
    const newPasswordHash = bcrypt.hashSync(newPassword, 10);

    // Mettre à jour dans la base de données JSON
    const userIndex = db.data.users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      db.data.users[userIndex].password = newPasswordHash;
      db.save();
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur changement mot de passe:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================
// ROUTES UTILISATEURS
// ============================================

// Récupérer les utilisateurs
app.get('/api/users', requireAuth, (req, res) => {
  try {
    const users = db.prepare('SELECT id, username, display_name FROM users ORDER BY id').all();
    res.json(users);
  } catch (error) {
    console.error('Erreur récupération utilisateurs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer un utilisateur
app.post('/api/users', requireAuth, (req, res) => {
  const { username, password, display_name } = req.body;
  try {
    const hash = bcrypt.hashSync(password || username, 10);
    const stmt = db.prepare('INSERT INTO users (username, password, display_name) VALUES (?, ?, ?)');
    const result = stmt.run(username, hash, display_name || username);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (error) {
    console.error('Erreur création utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mettre à jour le display_name d'un utilisateur
app.put('/api/users/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { display_name } = req.body;
  try {
    db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(display_name, id);
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur mise à jour utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Version simple pour rechargement automatique (mtime de server.js)
const fs = require('fs');
app.get('/api/version', (req, res) => {
  try {
    const stat = fs.statSync(path.resolve(__dirname, 'server.js'));
    res.json({ version: stat.mtimeMs });
  } catch (error) {
    res.json({ version: Date.now() });
  }
});

// ============================================
// DÉMARRAGE DU SERVEUR
// ============================================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║   💰 Application de Comptabilité de Couple    ║
║                                                ║
║   🌐 Serveur démarré sur:                     ║
║      http://localhost:${PORT}                      ║
║                                                ║
║   👥 Utilisateurs par défaut:                 ║
║      - david / david                           ║
║      - leo / leo                               ║
║                                                ║
║   📊 Base de données: SQLite                   ║
╚════════════════════════════════════════════════╝
  `);
});
