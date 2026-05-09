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
  const { amount, date, store, type, beneficiary } = req.body;
  const userId = req.session.userId;

  try {
    const stmt = db.prepare(`
      INSERT INTO expenses (user_id, amount, date, store, type, beneficiary)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(userId, amount, date, store, type, beneficiary);
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
  const { amount, date, store, type, beneficiary } = req.body;
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
    const expenseIndex = db.data.expenses.findIndex(e => e.id === parseInt(id));
    if (expenseIndex !== -1) {
      db.data.expenses[expenseIndex] = {
        ...db.data.expenses[expenseIndex],
        amount: amount,
        date: date,
        store: store,
        type: type,
        beneficiary: beneficiary
      };
      db.save();
    }

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
    let dateCondition = '1=1';
    const params = [];

    if (month) {
      dateCondition = `strftime('%Y-%m', date) = ?`;
      params.push(month);
    } else {
      if (startDate && endDate) {
        dateCondition = 'date BETWEEN ? AND ?';
        params.push(startDate, endDate);
      }
    }

    // Total par utilisateur
    const totalByUser = db.prepare(`
      SELECT 
        u.username,
        u.display_name,
        SUM(e.amount) as total,
        COUNT(e.id) as count
      FROM users u
      LEFT JOIN expenses e ON u.id = e.user_id AND ${dateCondition}
      GROUP BY u.id
      ORDER BY u.id
    `).all(...params);

    // Total par type
    const totalByType = db.prepare(`
      SELECT type, SUM(amount) as total, COUNT(*) as count
      FROM expenses
      WHERE ${dateCondition}
      GROUP BY type
    `).all(...params);

    // Total par bénéficiaire
    const totalByBeneficiary = db.prepare(`
      SELECT beneficiary, SUM(amount) as total, COUNT(*) as count
      FROM expenses
      WHERE ${dateCondition}
      GROUP BY beneficiary
    `).all(...params);

    // Détail par utilisateur et bénéficiaire
    const detailByUserAndBeneficiary = db.prepare(`
      SELECT 
        u.username,
        u.display_name,
        e.beneficiary,
        SUM(e.amount) as total
      FROM users u
      LEFT JOIN expenses e ON u.id = e.user_id AND ${dateCondition}
      GROUP BY u.id, e.beneficiary
      ORDER BY u.id
    `).all(...params);

    res.json({
      totalByUser,
      totalByType,
      totalByBeneficiary,
      detailByUserAndBeneficiary
    });
  } catch (error) {
    console.error('Erreur récupération stats:', error);
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
