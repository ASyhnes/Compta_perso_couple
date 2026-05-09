// Base de données JSON simple (alternative à SQLite)
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

class JsonDatabase {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.data = {
      users: [],
      salaries: [],
      expenses: []
    };
    this.load();
  }

  load() {
    // Créer le dossier si nécessaire
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Charger les données si le fichier existe
    if (fs.existsSync(this.dbPath)) {
      try {
        const fileContent = fs.readFileSync(this.dbPath, 'utf8');
        this.data = JSON.parse(fileContent);
      } catch (error) {
        console.error('Erreur chargement DB:', error);
        this.save(); // Créer un fichier vide
      }
    } else {
      // Initialiser avec les utilisateurs par défaut
      this.initializeDefaultUsers();
      this.save();
    }
  }

  save() {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (error) {
      console.error('Erreur sauvegarde DB:', error);
    }
  }

  initializeDefaultUsers() {
    const davidPassword = bcrypt.hashSync('david', 10);
    const leoPassword = bcrypt.hashSync('leo', 10);

    this.data.users = [
      {
        id: 1,
        username: 'david',
        password: davidPassword,
        display_name: 'David',
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        username: 'leo',
        password: leoPassword,
        display_name: 'Léo',
        created_at: new Date().toISOString()
      }
    ];

    console.log('✅ Utilisateurs créés : david / leo');
  }

  // Méthodes pour simuler l'API SQLite
  prepare(query) {
    return {
      get: (...params) => this.executeGet(query, params),
      run: (...params) => this.executeRun(query, params),
      all: (...params) => this.executeAll(query, params)
    };
  }

  executeGet(query, params) {
    // SELECT user WHERE username = ?
    if (query.includes('SELECT * FROM users WHERE username')) {
      const username = params[0];
      return this.data.users.find(u => u.username === username);
    }

    // SELECT expense WHERE id = ?
    if (query.includes('SELECT user_id FROM expenses WHERE id')) {
      const id = params[0];
      return this.data.expenses.find(e => e.id === parseInt(id));
    }

    return null;
  }

  executeRun(query, params) {
    // INSERT INTO salaries
    if (query.includes('INSERT INTO salaries')) {
      const [userId, month, amount] = params;
      const existing = this.data.salaries.findIndex(
        s => s.user_id === userId && s.month === month
      );

      if (existing !== -1) {
        this.data.salaries[existing].amount = amount;
      } else {
        this.data.salaries.push({
          id: this.data.salaries.length + 1,
          user_id: userId,
          month: month,
          amount: amount,
          created_at: new Date().toISOString()
        });
      }
      this.save();
      return { lastInsertRowid: this.data.salaries.length };
    }

    // INSERT INTO expenses
    if (query.includes('INSERT INTO expenses')) {
      const [userId, amount, date, store, type, beneficiary] = params;
      const newExpense = {
        id: this.data.expenses.length + 1,
        user_id: userId,
        amount: amount,
        date: date,
        store: store,
        type: type,
        beneficiary: beneficiary,
        created_at: new Date().toISOString()
      };
      this.data.expenses.push(newExpense);
      this.save();
      return { lastInsertRowid: newExpense.id };
    }

    // DELETE FROM expenses
    if (query.includes('DELETE FROM expenses WHERE id')) {
      const id = params[0];
      const index = this.data.expenses.findIndex(e => e.id === parseInt(id));
      if (index !== -1) {
        this.data.expenses.splice(index, 1);
        this.save();
      }
      return { changes: 1 };
    }

    return { changes: 0 };
  }

  executeAll(query, params) {
    // SELECT salaries for month
    if (query.includes('SELECT u.username, u.display_name, s.amount, s.month')) {
      const month = params[0];
      return this.data.users.map(user => {
        const salary = this.data.salaries.find(
          s => s.user_id === user.id && s.month === month
        );
        return {
          username: user.username,
          display_name: user.display_name,
          amount: salary ? salary.amount : null,
          month: month
        };
      });
    }

    // SELECT expenses with filters
    if (query.includes('SELECT e.*, u.username, u.display_name')) {
      let expenses = [...this.data.expenses];

      // Filter by month if specified
      if (params.length > 0 && params[0]) {
        const month = params[0];
        expenses = expenses.filter(e => e.date.startsWith(month));
      }

      // Join with users
      return expenses.map(expense => {
        const user = this.data.users.find(u => u.id === expense.user_id);
        return {
          ...expense,
          username: user ? user.username : '',
          display_name: user ? user.display_name : ''
        };
      }).sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // Stats - Total by user
    if (query.includes('SELECT') && query.includes('SUM(e.amount) as total') && query.includes('GROUP BY u.id')) {
      let expenses = [...this.data.expenses];

      // Filter by date if params provided
      if (params.length > 0 && params[0]) {
        const month = params[0];
        expenses = expenses.filter(e => e.date.startsWith(month));
      }

      return this.data.users.map(user => {
        const userExpenses = expenses.filter(e => e.user_id === user.id);
        return {
          username: user.username,
          display_name: user.display_name,
          total: userExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0),
          count: userExpenses.length
        };
      });
    }

    // Stats - Total by type
    if (query.includes('SELECT type, SUM(amount) as total')) {
      let expenses = [...this.data.expenses];

      if (params.length > 0 && params[0]) {
        const month = params[0];
        expenses = expenses.filter(e => e.date.startsWith(month));
      }

      const types = {};
      expenses.forEach(e => {
        if (!types[e.type]) {
          types[e.type] = { type: e.type, total: 0, count: 0 };
        }
        types[e.type].total += parseFloat(e.amount || 0);
        types[e.type].count++;
      });

      return Object.values(types);
    }

    // Stats - Total by beneficiary
    if (query.includes('SELECT beneficiary, SUM(amount) as total')) {
      let expenses = [...this.data.expenses];

      if (params.length > 0 && params[0]) {
        const month = params[0];
        expenses = expenses.filter(e => e.date.startsWith(month));
      }

      const beneficiaries = {};
      expenses.forEach(e => {
        if (!beneficiaries[e.beneficiary]) {
          beneficiaries[e.beneficiary] = { beneficiary: e.beneficiary, total: 0, count: 0 };
        }
        beneficiaries[e.beneficiary].total += parseFloat(e.amount || 0);
        beneficiaries[e.beneficiary].count++;
      });

      return Object.values(beneficiaries);
    }

    // Stats - Detail by user and beneficiary
    if (query.includes('e.beneficiary') && query.includes('GROUP BY u.id, e.beneficiary')) {
      let expenses = [...this.data.expenses];

      if (params.length > 0 && params[0]) {
        const month = params[0];
        expenses = expenses.filter(e => e.date.startsWith(month));
      }

      const result = [];
      this.data.users.forEach(user => {
        const userExpenses = expenses.filter(e => e.user_id === user.id);
        const byBeneficiary = {};

        userExpenses.forEach(e => {
          if (!byBeneficiary[e.beneficiary]) {
            byBeneficiary[e.beneficiary] = 0;
          }
          byBeneficiary[e.beneficiary] += parseFloat(e.amount || 0);
        });

        Object.keys(byBeneficiary).forEach(beneficiary => {
          result.push({
            username: user.username,
            display_name: user.display_name,
            beneficiary: beneficiary,
            total: byBeneficiary[beneficiary]
          });
        });
      });

      return result;
    }

    return [];
  }
}

function initDatabase(dbPath) {
  const db = new JsonDatabase(dbPath);
  console.log('✅ Base de données JSON initialisée');
  return db;
}

module.exports = { initDatabase };
