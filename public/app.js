// ========================================
// APPLICATION DE COMPTABILITÉ DE COUPLE
// David & Léo
// ========================================

// Variables globales
let currentUser = null;
let currentPeriod = 'month'; // 'month' ou 'total'
let balanceMode = 'equity'; // 'equity' ou 'equality'
let charts = {};

// ========================================
// INITIALISATION
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
  // Vérifier l'authentification
  const session = await checkSession();
  if (!session.authenticated) {
    window.location.href = '/index.html';
    return;
  }

  currentUser = session.user;
  document.getElementById('currentUser').textContent = `👤 ${currentUser.displayName}`;

  // Initialiser l'interface
  initNavigation();
  initExpenseForm();
  initSalaryForm();
  initPeriodSelector();
  initBalanceModeToggle();
  initSettings();
  initLogout();

  // Charger les données initiales
  await loadDashboard();
  
  // Définir le mois actuel par défaut
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  document.getElementById('salaryMonth').value = currentMonth;
  
  // Définir la date du jour par défaut dans le formulaire de dépense
  const today = now.toISOString().split('T')[0];
  document.getElementById('date').value = today;
});

// ========================================
// AUTHENTIFICATION
// ========================================

async function checkSession() {
  const response = await fetch('/api/session');
  return await response.json();
}

function initLogout() {
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/index.html';
  });
}

// ========================================
// NAVIGATION
// ========================================

function initNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');
  
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const viewName = btn.dataset.view;
      
      // Mettre à jour les boutons actifs
      navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Afficher la vue correspondante
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.getElementById(`${viewName}-view`).classList.add('active');
      
      // Charger les données selon la vue
      if (viewName === 'dashboard') {
        loadDashboard();
      } else if (viewName === 'salaries') {
        loadSalariesHistory();
      } else if (viewName === 'settings') {
        document.getElementById('settingsUsername').textContent = currentUser.displayName;
      }
    });
  });
}

// ========================================
// SÉLECTEUR DE PÉRIODE
// ========================================

function initPeriodSelector() {
  document.getElementById('periodMonth').addEventListener('click', async () => {
    currentPeriod = 'month';
    document.getElementById('periodMonth').classList.add('active');
    document.getElementById('periodTotal').classList.remove('active');
    await loadDashboard();
  });

  document.getElementById('periodTotal').addEventListener('click', async () => {
    currentPeriod = 'total';
    document.getElementById('periodTotal').classList.add('active');
    document.getElementById('periodMonth').classList.remove('active');
    await loadDashboard();
  });
}

// ========================================
// MODE ÉQUILIBRE (ÉQUITÉ VS ÉGALITÉ)
// ========================================

function initBalanceModeToggle() {
  const toggle = document.getElementById('balanceModeToggle');
  const description = document.getElementById('modeDescription');
  
  toggle.addEventListener('change', () => {
    if (toggle.checked) {
      balanceMode = 'equality';
      description.textContent = 'Mode Égalité : David dépense 2/3 de plus que Léo (ratio 1.66:1)';
    } else {
      balanceMode = 'equity';
      description.textContent = 'Mode Équitabilité : Ratio au prorata du salaire';
    }
    
    // Recalculer l'équilibre
    updateBalanceDisplay();
  });
}

// ========================================
// TABLEAU DE BORD
// ========================================

async function loadDashboard() {
  try {
    // Paramètres de période
    const params = new URLSearchParams();
    if (currentPeriod === 'month') {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      params.append('month', currentMonth);
    }

    // Charger les statistiques
    const [stats, expenses, salaries] = await Promise.all([
      fetch(`/api/stats?${params}`).then(r => r.json()),
      fetch(`/api/expenses?${params}`).then(r => r.json()),
      fetch(`/api/salaries/${getCurrentMonth()}`).then(r => r.json())
    ]);

    // Mettre à jour l'affichage
    updateSalariesInfo(salaries);
    updateCharts(stats);
    updateExpensesList(expenses);
    updateBalanceDisplay(stats, salaries);
  } catch (error) {
    console.error('Erreur chargement dashboard:', error);
  }
}

// ========================================
// INFORMATIONS SALAIRES
// ========================================

function updateSalariesInfo(salaries) {
  const infoDiv = document.getElementById('salariesInfo');
  const davidSalary = salaries.find(s => s.username === 'david')?.amount || 0;
  const leoSalary = salaries.find(s => s.username === 'leo')?.amount || 0;

  if (davidSalary > 0 && leoSalary > 0) {
    infoDiv.className = 'salaries-info has-salaries';
    infoDiv.innerHTML = `
      <p class="info-text">
        ✅ Salaires configurés - David: ${formatMoney(davidSalary)} / Léo: ${formatMoney(leoSalary)}
      </p>
    `;
  } else {
    infoDiv.className = 'salaries-info';
    infoDiv.innerHTML = `
      <p class="info-text">⚠️ Configurez les salaires du mois pour voir les ratios</p>
    `;
  }
}

// ========================================
// JAUGE D'ÉQUILIBRE
// ========================================

function updateBalanceDisplay(stats, salaries) {
  if (!stats) return;

  const davidData = stats.totalByUser.find(u => u.username === 'david') || { total: 0 };
  const leoData = stats.totalByUser.find(u => u.username === 'leo') || { total: 0 };
  
  const davidTotal = davidData.total || 0;
  const leoTotal = leoData.total || 0;
  const total = davidTotal + leoTotal;

  // Affichage des montants
  document.getElementById('davidAmount').textContent = formatMoney(davidTotal);
  document.getElementById('leoAmount').textContent = formatMoney(leoTotal);

  // Calcul du pourcentage pour la jauge
  const davidPercentage = total > 0 ? (davidTotal / total) * 100 : 50;
  const gaugeBar = document.getElementById('gaugeBar');
  gaugeBar.style.width = `${davidPercentage}%`;

  // Calcul de l'équilibre selon le mode
  const statusDiv = document.getElementById('balanceStatus');
  
  if (total === 0) {
    statusDiv.textContent = 'Aucune dépense enregistrée';
    statusDiv.className = 'balance-status';
    return;
  }

  if (balanceMode === 'equity') {
    // Mode Équitabilité : basé sur le ratio des salaires
    calculateEquityBalance(salaries, davidTotal, leoTotal, statusDiv);
  } else {
    // Mode Égalité : règle des 2/3 (David dépense 1.66x plus que Léo)
    calculateEqualityBalance(davidTotal, leoTotal, statusDiv);
  }
}

function calculateEquityBalance(salaries, davidTotal, leoTotal, statusDiv) {
  const davidSalary = salaries?.find(s => s.username === 'david')?.amount || 0;
  const leoSalary = salaries?.find(s => s.username === 'leo')?.amount || 0;

  if (davidSalary === 0 || leoSalary === 0) {
    statusDiv.textContent = '⚠️ Configurez les salaires pour calculer l\'équitabilité';
    statusDiv.className = 'balance-status';
    return;
  }

  const totalSalary = davidSalary + leoSalary;
  const davidExpectedRatio = davidSalary / totalSalary;
  const leoExpectedRatio = leoSalary / totalSalary;

  const totalExpenses = davidTotal + leoTotal;
  const davidActualRatio = totalExpenses > 0 ? davidTotal / totalExpenses : 0;
  const leoActualRatio = totalExpenses > 0 ? leoTotal / totalExpenses : 0;

  const davidDiff = ((davidActualRatio - davidExpectedRatio) * 100).toFixed(1);
  const leoDiff = ((leoActualRatio - leoExpectedRatio) * 100).toFixed(1);

  // Marge d'équilibre de 5%
  if (Math.abs(davidDiff) < 5) {
    statusDiv.textContent = `✅ Équilibre atteint ! Ratios respectés au prorata des salaires`;
    statusDiv.className = 'balance-status equilibrium';
  } else if (davidDiff > 0) {
    statusDiv.textContent = `📊 David dépense ${Math.abs(davidDiff)}% de plus que son ratio de salaire`;
    statusDiv.className = 'balance-status david-ahead';
  } else {
    statusDiv.textContent = `📊 Léo dépense ${Math.abs(leoDiff)}% de plus que son ratio de salaire`;
    statusDiv.className = 'balance-status leo-ahead';
  }
}

function calculateEqualityBalance(davidTotal, leoTotal, statusDiv) {
  // Règle des 2/3 : David devrait dépenser 1.66x plus que Léo
  const targetRatio = 1.66;
  
  if (leoTotal === 0) {
    statusDiv.textContent = 'Léo n\'a pas encore de dépenses';
    statusDiv.className = 'balance-status';
    return;
  }

  const actualRatio = davidTotal / leoTotal;
  const diffPercent = ((actualRatio - targetRatio) / targetRatio * 100).toFixed(1);

  // Marge d'équilibre de 10%
  if (Math.abs(diffPercent) < 10) {
    statusDiv.textContent = `✅ Équilibre atteint ! Ratio respecté (David: ${actualRatio.toFixed(2)}x Léo)`;
    statusDiv.className = 'balance-status equilibrium';
  } else if (diffPercent > 0) {
    statusDiv.textContent = `📊 David dépense ${Math.abs(diffPercent).toFixed(0)}% de plus que la cible (${actualRatio.toFixed(2)}x vs ${targetRatio}x)`;
    statusDiv.className = 'balance-status david-ahead';
  } else {
    statusDiv.textContent = `📊 David devrait dépenser ${Math.abs(diffPercent).toFixed(0)}% de plus (${actualRatio.toFixed(2)}x vs ${targetRatio}x)`;
    statusDiv.className = 'balance-status leo-ahead';
  }
}

// ========================================
// GRAPHIQUES CHART.JS
// ========================================

function updateCharts(stats) {
  updateTypeChart(stats.totalByType);
  updateUserChart(stats.totalByUser);
  updateBeneficiaryChart(stats.totalByBeneficiary);
  updateSalaryVsExpensesChart(stats);
}

function updateTypeChart(data) {
  const ctx = document.getElementById('typeChart');
  
  if (charts.typeChart) {
    charts.typeChart.destroy();
  }

  const typeIcons = {
    'Nourriture': '🍔',
    'Maison': '🏠',
    'Bricolage': '🔧',
    'Plaisir': '🎉',
    'Botanique': '🌱'
  };

  const labels = data.map(d => `${typeIcons[d.type] || '📦'} ${d.type}`);
  const values = data.map(d => d.total || 0);

  charts.typeChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: [
          '#ef4444',
          '#f59e0b',
          '#10b981',
          '#6366f1',
          '#8b5cf6'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom'
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || '';
              const value = context.parsed || 0;
              return `${label}: ${formatMoney(value)}`;
            }
          }
        }
      }
    }
  });
}

function updateUserChart(data) {
  const ctx = document.getElementById('userChart');
  
  if (charts.userChart) {
    charts.userChart.destroy();
  }

  const labels = data.map(d => d.display_name);
  const values = data.map(d => d.total || 0);

  charts.userChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Dépenses totales',
        data: values,
        backgroundColor: ['#6366f1', '#10b981']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              return `${formatMoney(context.parsed.y)}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => formatMoney(value)
          }
        }
      }
    }
  });
}

function updateBeneficiaryChart(data) {
  const ctx = document.getElementById('beneficiaryChart');
  
  if (charts.beneficiaryChart) {
    charts.beneficiaryChart.destroy();
  }

  const labels = data.map(d => d.beneficiary === 'Couple' ? '👫 Couple' : '🙋 Perso');
  const values = data.map(d => d.total || 0);

  charts.beneficiaryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: ['#6366f1', '#f59e0b']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom'
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || '';
              const value = context.parsed || 0;
              return `${label}: ${formatMoney(value)}`;
            }
          }
        }
      }
    }
  });
}

async function updateSalaryVsExpensesChart(stats) {
  const ctx = document.getElementById('salaryVsExpensesChart');
  
  if (charts.salaryVsExpensesChart) {
    charts.salaryVsExpensesChart.destroy();
  }

  // Récupérer les salaires du mois actuel
  const salaries = await fetch(`/api/salaries/${getCurrentMonth()}`).then(r => r.json());
  
  const users = ['David', 'Léo'];
  const salaryData = [
    salaries.find(s => s.username === 'david')?.amount || 0,
    salaries.find(s => s.username === 'leo')?.amount || 0
  ];
  const expenseData = [
    stats.totalByUser.find(u => u.username === 'david')?.total || 0,
    stats.totalByUser.find(u => u.username === 'leo')?.total || 0
  ];

  charts.salaryVsExpensesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: users,
      datasets: [
        {
          label: 'Salaire',
          data: salaryData,
          backgroundColor: '#10b981'
        },
        {
          label: 'Dépenses',
          data: expenseData,
          backgroundColor: '#ef4444'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom'
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              return `${context.dataset.label}: ${formatMoney(context.parsed.y)}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => formatMoney(value)
          }
        }
      }
    }
  });
}

// ========================================
// LISTE DES DÉPENSES
// ========================================

function updateExpensesList(expenses) {
  const listDiv = document.getElementById('expensesList');
  
  if (expenses.length === 0) {
    listDiv.innerHTML = '<div class="expenses-empty">Aucune dépense enregistrée</div>';
    return;
  }

  listDiv.innerHTML = expenses.map(expense => `
    <div class="expense-item" data-id="${expense.id}">
      <div class="expense-info">
        <div class="expense-header">
          <span class="expense-store">${expense.store}</span>
          <span class="expense-type">${expense.type}</span>
        </div>
        <div class="expense-details">
          ${expense.display_name} • ${formatDate(expense.date)} • ${expense.beneficiary}
        </div>
      </div>
      <div class="expense-actions">
        <div class="expense-amount">${formatMoney(expense.amount)}</div>
        <div class="expense-buttons">
          <button class="expense-edit" onclick="editExpense(${expense.id})" title="Modifier">✏️</button>
          <button class="expense-delete" onclick="deleteExpense(${expense.id})" title="Supprimer">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');
}

async function editExpense(id) {
  try {
    // Récupérer la dépense
    const response = await fetch(`/api/expenses/${id}`);
    const expense = await response.json();

    if (!expense) {
      alert('Dépense non trouvée');
      return;
    }

    // Passer à l'onglet "Nouvelle Dépense"
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-view="add-expense"]').classList.add('active');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('add-expense-view').classList.add('active');

    // Remplir le formulaire
    document.getElementById('amount').value = expense.amount;
    document.getElementById('date').value = expense.date;
    document.getElementById('store').value = expense.store;
    document.getElementById('type').value = expense.type;
    document.getElementById('beneficiary').value = expense.beneficiary;

    // Mettre à jour les toggle buttons
    const toggleButtons = document.querySelectorAll('#add-expense-view .toggle-btn');
    toggleButtons.forEach(btn => {
      if (btn.dataset.value === expense.beneficiary) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Changer le bouton et stocker l'ID
    const submitBtn = document.querySelector('#expenseForm button[type="submit"]');
    submitBtn.textContent = '💾 Modifier la dépense';
    submitBtn.dataset.editId = id;
  } catch (error) {
    console.error('Erreur édition dépense:', error);
    alert('Erreur lors du chargement de la dépense');
  }
}

async function deleteExpense(id) {
  if (!confirm('Supprimer cette dépense ?')) return;

  try {
    const response = await fetch(`/api/expenses/${id}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      await loadDashboard();
    } else {
      alert('Erreur lors de la suppression');
    }
  } catch (error) {
    console.error('Erreur suppression:', error);
    alert('Erreur lors de la suppression');
  }
}

// ========================================
// FORMULAIRE DE DÉPENSE
// ========================================

function initExpenseForm() {
  // Toggle bénéficiaire
  const toggleButtons = document.querySelectorAll('#add-expense-view .toggle-btn');
  const beneficiaryInput = document.getElementById('beneficiary');

  toggleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      toggleButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      beneficiaryInput.value = btn.dataset.value;
    });
  });

  // Soumission du formulaire
  document.getElementById('expenseForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
      amount: parseFloat(document.getElementById('amount').value),
      date: document.getElementById('date').value,
      store: document.getElementById('store').value,
      type: document.getElementById('type').value,
      beneficiary: document.getElementById('beneficiary').value
    };

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const editId = submitBtn.dataset.editId;

    try {
      let response;
      if (editId) {
        // Mode modification
        response = await fetch(`/api/expenses/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      } else {
        // Mode création
        response = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      }

      const data = await response.json();

      if (data.success) {
        showMessage('expenseSuccess', editId ? '✅ Dépense modifiée avec succès !' : '✅ Dépense enregistrée avec succès !');
        document.getElementById('expenseForm').reset();
        
        // Réinitialiser la date à aujourd'hui
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;
        
        // Réinitialiser le toggle
        toggleButtons.forEach(b => b.classList.remove('active'));
        toggleButtons[0].classList.add('active');
        document.getElementById('beneficiary').value = 'Couple';

        // Réinitialiser le bouton
        submitBtn.textContent = '✅ Enregistrer la dépense';
        delete submitBtn.dataset.editId;

        // Recharger le dashboard
        await loadDashboard();
      } else {
        showMessage('expenseError', data.error || 'Erreur lors de l\'enregistrement');
      }
    } catch (error) {
      console.error('Erreur enregistrement dépense:', error);
      showMessage('expenseError', 'Erreur de connexion au serveur');
    }
  });
}

// ========================================
// FORMULAIRE DE SALAIRE
// ========================================

function initSalaryForm() {
  document.getElementById('salaryForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
      month: document.getElementById('salaryMonth').value,
      amount: parseFloat(document.getElementById('salaryAmount').value)
    };

    try {
      const response = await fetch('/api/salary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        showMessage('salarySuccess', '✅ Salaire enregistré avec succès !');
        await loadSalariesHistory();
        await loadDashboard();
      } else {
        showMessage('salaryError', data.error || 'Erreur lors de l\'enregistrement');
      }
    } catch (error) {
      console.error('Erreur enregistrement salaire:', error);
      showMessage('salaryError', 'Erreur de connexion au serveur');
    }
  });
}

async function loadSalariesHistory() {
  try {
    // Récupérer les salaires des 6 derniers mois
    const months = getLast6Months();
    const historyDiv = document.getElementById('salariesHistory');
    
    const allSalaries = await Promise.all(
      months.map(month => fetch(`/api/salaries/${month}`).then(r => r.json()))
    );

    const userSalaries = allSalaries.map((salaries, index) => {
      const userSalary = salaries.find(s => s.username === currentUser.username);
      return {
        month: months[index],
        amount: userSalary?.amount || 0
      };
    }).filter(s => s.amount > 0);

    if (userSalaries.length === 0) {
      historyDiv.innerHTML = '<p class="expenses-empty">Aucun salaire enregistré</p>';
      return;
    }

    historyDiv.innerHTML = userSalaries.map(s => `
      <div class="salary-item">
        <span class="salary-month">${formatMonth(s.month)}</span>
        <span class="salary-amount">${formatMoney(s.amount)}</span>
      </div>
    `).join('');
  } catch (error) {
    console.error('Erreur chargement historique salaires:', error);
  }
}

// ========================================
// PARAMÈTRES
// ========================================

function initSettings() {
  // Charger le thème sauvegardé
  const savedTheme = localStorage.getItem('theme');
  const darkThemeToggle = document.getElementById('darkThemeToggle');
  
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
    darkThemeToggle.checked = true;
  }

  // Toggle du thème
  darkThemeToggle.addEventListener('change', () => {
    if (darkThemeToggle.checked) {
      document.body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
    }
  });

  // Afficher le username dans les paramètres
  document.getElementById('settingsUsername').textContent = currentUser.displayName;

  // Formulaire de changement de mot de passe
  document.getElementById('passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validation
    if (newPassword !== confirmPassword) {
      showMessage('passwordError', 'Les mots de passe ne correspondent pas');
      return;
    }

    if (newPassword.length < 4) {
      showMessage('passwordError', 'Le mot de passe doit contenir au moins 4 caractères');
      return;
    }

    try {
      const response = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: currentPassword,
          newPassword: newPassword
        })
      });

      const data = await response.json();

      if (data.success) {
        showMessage('passwordSuccess', '✅ Mot de passe modifié avec succès !');
        document.getElementById('passwordForm').reset();
      } else {
        showMessage('passwordError', data.error || 'Erreur lors du changement de mot de passe');
      }
    } catch (error) {
      console.error('Erreur changement mot de passe:', error);
      showMessage('passwordError', 'Erreur de connexion au serveur');
    }
  });
}

// ========================================
// UTILITAIRES
// ========================================

function formatMoney(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount || 0);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

function formatMonth(monthString) {
  const [year, month] = monthString.split('-');
  const date = new Date(year, parseInt(month) - 1);
  return new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric'
  }).format(date);
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getLast6Months() {
  const months = [];
  const now = new Date();
  
  for (let i = 0; i < 6; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }
  
  return months;
}

function showMessage(elementId, message) {
  const element = document.getElementById(elementId);
  element.textContent = message;
  element.style.display = 'block';
  
  setTimeout(() => {
    element.style.display = 'none';
  }, 5000);
}
