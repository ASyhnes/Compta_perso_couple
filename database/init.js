// Initialisation de la base de données SQLite
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

/**
 * Initialise la base de données avec les tables nécessaires
 * @param {string} dbPath - Chemin vers le fichier de base de données
 */
function initDatabase(dbPath) {
  // Créer le dossier database s'il n'existe pas
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  // Table des utilisateurs
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Table des salaires mensuels
  db.exec(`
    CREATE TABLE IF NOT EXISTS salaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      month TEXT NOT NULL,
      amount REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, month)
    )
  `);

  // Table des dépenses (compte commun - non nominatif)
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      store TEXT NOT NULL,
      type TEXT NOT NULL,
      beneficiary TEXT NOT NULL,
      account TEXT NOT NULL DEFAULT 'commun',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Table des virements vers le compte commun
  db.exec(`
    CREATE TABLE IF NOT EXISTS virements_compte_commun (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Table des charges hors compte (loyer, loyer garage, autres dépenses pour le couple)
  db.exec(`
    CREATE TABLE IF NOT EXISTS charges_hors_compte (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Index pour optimiser les requêtes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
    CREATE INDEX IF NOT EXISTS idx_salaries_month ON salaries(month);
    CREATE INDEX IF NOT EXISTS idx_virements_user ON virements_compte_commun(user_id);
    CREATE INDEX IF NOT EXISTS idx_virements_date ON virements_compte_commun(date);
    CREATE INDEX IF NOT EXISTS idx_charges_user ON charges_hors_compte(user_id);
    CREATE INDEX IF NOT EXISTS idx_charges_date ON charges_hors_compte(date);
    CREATE INDEX IF NOT EXISTS idx_charges_category ON charges_hors_compte(category);
  `);

  // Vérifier si les utilisateurs existent
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  
  if (userCount.count === 0) {
    console.log('🔧 Création des utilisateurs par défaut...');
    
    // Hash des mots de passe par défaut
    const davidPassword = bcrypt.hashSync('david', 10);
    const leoPassword = bcrypt.hashSync('leo', 10);

    // Insertion des utilisateurs David et Léo
    const insertUser = db.prepare(`
      INSERT INTO users (username, password, display_name) 
      VALUES (?, ?, ?)
    `);

    insertUser.run('david', davidPassword, 'David');
    insertUser.run('leo', leoPassword, 'Léo');

    console.log('✅ Utilisateurs créés : david / leo (mots de passe identiques aux usernames)');
  }

  console.log('✅ Base de données initialisée');
  // S'assurer que la colonne `account` existe dans `expenses` (migration légère)
  try {
    const cols = db.prepare(`PRAGMA table_info('expenses')`).all();
    const hasAccount = cols.some(c => c.name === 'account');
    if (!hasAccount) {
      db.exec(`ALTER TABLE expenses ADD COLUMN account TEXT NOT NULL DEFAULT 'commun'`);
      console.log('🔧 Colonne `account` ajoutée à la table `expenses`');
    }
  } catch (e) {
    console.warn('Impossible d\'ajouter la colonne account:', e.message);
  }
  return db;
}

module.exports = { initDatabase };
