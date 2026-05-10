// ========================================
// APPLICATION DE COMPTABILITÉ DE COUPLE
// David & Léo
// ========================================

// Variables globales
let currentUser = null;
let currentPeriod = 'month'; // 'month' ou 'total'
let balanceMode = 'equity'; // 'equity' ou 'equality'
let charts = {};
let latestStats = null;

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
  initVirementForm();
  initChargeForm();
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
  document.getElementById('virementDate').value = now.toISOString().split('T')[0];
  document.getElementById('chargeDate').value = now.toISOString().split('T')[0];
  
  // Définir la date du jour par défaut dans le formulaire de dépense
  const today = now.toISOString().split('T')[0];
  document.getElementById('date').value = today;

  // Version check pour rechargement auto
  await checkVersionAndReload();
  setInterval(checkVersionAndReload, 30000);
});

// ========================================
// AUTHENTIFICATION
// ========================================

async function checkSession() {
  const response = await fetch('/api/session', { credentials: 'same-origin' });
  return await response.json();
}

function initLogout() {
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
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
      } else if (viewName === 'virements') {
        loadVirements();
      } else if (viewName === 'charges-hors-compte') {
        loadCharges();
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
    console.log('📊 [loadDashboard] Starting...');
    // Paramètres de période
    const params = new URLSearchParams();
    if (currentPeriod === 'month') {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      params.append('month', currentMonth);
      console.log('📊 [loadDashboard] Monthly filter:', currentMonth);
    }

    // Charger les statistiques
    console.log('📊 [loadDashboard] Fetching stats, expenses, salaries...');
    const [stats, expenses, salaries] = await Promise.all([
      fetch(`/api/stats?${params}`, { credentials: 'same-origin' }).then(r => r.json()).then(d => { console.log('✅ /api/stats returned:', d); return d; }),
      fetch(`/api/expenses?${params}`, { credentials: 'same-origin' }).then(r => r.json()).then(d => { console.log('✅ /api/expenses returned:', d); return d; }),
      fetch(`/api/salaries/${getCurrentMonth()}`, { credentials: 'same-origin' }).then(r => r.json()).then(d => { console.log('✅ /api/salaries returned:', d); return d; })
    ]);

    // Mettre à jour l'affichage
    console.log('📊 [loadDashboard] Updating display with stats...');
    latestStats = stats;
    updateSalariesInfo(salaries);

    // Si la période est 'month' et qu'aucune donnée par utilisateur n'est renvoyée,
    // récupérer les stats globales (sans filtre month) en fallback pour alimenter les graphiques.
    let statsForCharts = stats;
    if (currentPeriod === 'month' && Array.isArray(stats.totalByUser) && stats.totalByUser.length === 0) {
      console.info('📊 [loadDashboard] Monthly stats empty, fetching global fallback...');
      try {
        const globalStats = await fetch('/api/stats', { credentials: 'same-origin' }).then(r => r.json());
        statsForCharts = globalStats;
        console.info('✅ Using global stats fallback for charts.');
      } catch (err) {
        console.warn('❌ Impossible de récupérer les stats globales en fallback:', err);
      }
    }

    console.log('📊 [loadDashboard] Calling updateCharts with statsForCharts:', statsForCharts);
    updateCharts(statsForCharts);
    console.log('📊 [loadDashboard] Calling updateExpensesList...');
    updateExpensesList(expenses);
    console.log('📊 [loadDashboard] Calling updateBalanceDisplay...');
    updateBalanceDisplay(statsForCharts, salaries);
    console.log('✅ [loadDashboard] Completed successfully!');
  } catch (error) {
    console.error('❌ [loadDashboard] Error:', error);
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
  // Utiliser contributions (virements + loyer) si disponibles via latestStats
  const contributions = latestStats?.contributionsByUser || salaries;
  const davidContrib = contributions?.find(s => s.username === 'david')?.contributions || contributions?.find(s => s.username === 'david')?.amount || 0;
  const leoContrib = contributions?.find(s => s.username === 'leo')?.contributions || contributions?.find(s => s.username === 'leo')?.amount || 0;

  if (davidContrib === 0 || leoContrib === 0) {
    statusDiv.textContent = '⚠️ Configurez les salaires ou contributions pour calculer l\'équitabilité';
    statusDiv.className = 'balance-status';
    return;
  }

  const totalContrib = davidContrib + leoContrib;
  const davidExpectedRatio = davidContrib / totalContrib;
  const leoExpectedRatio = leoContrib / totalContrib;

  const totalExpenses = davidTotal + leoTotal;
  const davidActualRatio = totalExpenses > 0 ? davidTotal / totalExpenses : 0;
  const leoActualRatio = totalExpenses > 0 ? leoTotal / totalExpenses : 0;

  const davidDiff = ((davidActualRatio - davidExpectedRatio) * 100).toFixed(1);
  const leoDiff = ((leoActualRatio - leoExpectedRatio) * 100).toFixed(1);

  // Marge d'équilibre de 5%
  if (Math.abs(davidDiff) < 5) {
    statusDiv.textContent = `✅ Équilibre atteint ! Ratios respectés au prorata des contributions`;
    statusDiv.className = 'balance-status equilibrium';
  } else if (davidDiff > 0) {
    statusDiv.textContent = `📊 David dépense ${Math.abs(davidDiff)}% de plus que son ratio attendu`;
    statusDiv.className = 'balance-status david-ahead';
  } else {
    statusDiv.textContent = `📊 Léo dépense ${Math.abs(leoDiff)}% de plus que son ratio attendu`;
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
  // Debug log: afficher stats reçues côté client
  try {
    console.log('📊 [updateCharts] Received stats:', stats);
    window.__compta_debug_stats = stats;
  } catch (e) {
    console.warn('❌ [updateCharts] logging failed', e);
  }

  // Validate stats object
  if (!stats) {
    console.error('❌ [updateCharts] stats is null/undefined!');
    return;
  }

  console.log('📊 [updateCharts] Updating typeChart with:', stats.totalByType);
  updateTypeChart(stats.totalByType || []);
  console.log('📊 [updateCharts] Updating userChart with:', stats.totalByUser);
  updateUserChart(stats.totalByUser || []);
  
  // Afficher les dépenses perso par utilisateur si disponibles
  if (stats.personalByUser && Array.isArray(stats.personalByUser) && stats.personalByUser.length > 0) {
    console.log('📊 [updateCharts] Updating beneficiaryChart with personalByUser...');
    updateBeneficiaryChart(stats.personalByUser);
  } else if (stats.totalByBeneficiary && Array.isArray(stats.totalByBeneficiary)) {
    console.log('📊 [updateCharts] Updating beneficiaryChart with totalByBeneficiary...');
    updateBeneficiaryChart(stats.totalByBeneficiary);
  } else {
    console.warn('⚠️  [updateCharts] No beneficiary data available');
  }
  
  console.log('📊 [updateCharts] Updating salaryVsExpensesChart...');
  updateSalaryVsExpensesChart(stats);
}

function updateTypeChart(data) {
  const ctx = document.getElementById('typeChart');
  
  if (charts.typeChart) {
    charts.typeChart.destroy();
  }

  // Guard: ensure data is a non-empty array
  if (!Array.isArray(data) || data.length === 0) {
    console.warn('⚠️  [updateTypeChart] data is not an array or is empty:', data);
    return;
  }

  const typeIcons = {
    'Nourriture': '🍔',
    'Maison': '🏠',
    'Bricolage': '🔧',
    'Plaisir': '🎉',
    'Botanique': '🌱'
  };

  const labels = data.map(d => `${typeIcons[d.type] || '📦'} ${d.type}`);
  const values = data.map(d => Number(d.total) || 0);
  console.log('📊 [updateTypeChart] labels:', labels, 'values:', values);

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

  // Guard: ensure data is a non-empty array
  if (!Array.isArray(data) || data.length === 0) {
    console.warn('⚠️  [updateUserChart] data is not an array or is empty:', data);
    return;
  }

  console.log('📊 [updateUserChart] Processing data:', data);
  const labels = data.map(d => d.display_name || d.username || 'Unknown');
  const values = data.map(d => Number(d.total) || 0);
  console.log('📊 [updateUserChart] labels:', labels, 'values:', values);

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
      onClick: (event, activeElements) => {
        if (activeElements.length > 0) {
          const index = activeElements[0].index;
          const username = data[index].username;
          showUserExpenseDetails(username, data[index].display_name);
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              return `${formatMoney(context.parsed.y)} - Cliquez pour voir le détail`;
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
// DÉTAIL DES DÉPENSES PAR UTILISATEUR
// ========================================

async function showUserExpenseDetails(username, displayName) {
  try {
    // Récupérer les paramètres de période actuels (MÊME filtre que le graphique)
    const params = new URLSearchParams();
    let periodLabel = 'Total';
    if (currentPeriod === 'month') {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      params.append('month', currentMonth);
      periodLabel = `Mois en cours (${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })})`;
    }

    // Récupérer toutes les dépenses avec le MÊME filtre que le graphique
    const expenses = await fetch(`/api/expenses?${params}`, { credentials: 'same-origin' }).then(r => r.json());
    
    // Filtrer pour l'utilisateur sélectionné
    const userExpenses = expenses.filter(e => e.username === username);
    
    // Créer un résumé par type
    const byType = {};
    const byBeneficiary = {};
    let total = 0;
    
    userExpenses.forEach(e => {
      total += parseFloat(e.amount);
      
      if (!byType[e.type]) {
        byType[e.type] = { total: 0, count: 0 };
      }
      byType[e.type].total += parseFloat(e.amount);
      byType[e.type].count++;
      
      if (!byBeneficiary[e.beneficiary]) {
        byBeneficiary[e.beneficiary] = { total: 0, count: 0 };
      }
      byBeneficiary[e.beneficiary].total += parseFloat(e.amount);
      byBeneficiary[e.beneficiary].count++;
    });
    
    // Construire le HTML
    let html = `
      <div class="expense-details-overlay" onclick="closeExpenseDetails()">
        <div class="expense-details-modal" onclick="event.stopPropagation()">
          <div class="expense-details-header">
            <h3>📊 Détail des dépenses de ${displayName}</h3>
            <button class="close-btn" onclick="closeExpenseDetails()">✕</button>
          </div>
          <div class="expense-details-content">
            <div class="expense-summary">
              <div class="summary-item">
                <span class="summary-label">Total:</span>
                <span class="summary-value">${formatMoney(total)}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Nombre de dépenses:</span>
                <span class="summary-value">${userExpenses.length}</span>
              </div>
            </div>
            
            <div class="expense-breakdown">
              <h4>Par Type</h4>
              ${Object.entries(byType).map(([type, data]) => `
                <div class="breakdown-item">
                  <span class="breakdown-label">${type}</span>
                  <span class="breakdown-value">${formatMoney(data.total)} (${data.count})</span>
                </div>
              `).join('')}
            </div>
            
            <div class="expense-breakdown">
              <h4>Par Bénéficiaire</h4>
              ${Object.entries(byBeneficiary).map(([ben, data]) => `
                <div class="breakdown-item">
                  <span class="breakdown-label">${ben === 'Couple' ? '👫 Couple' : '🙋 Perso'}</span>
                  <span class="breakdown-value">${formatMoney(data.total)} (${data.count})</span>
                </div>
              `).join('')}
            </div>
            
            <div class="expense-list-section">
              <h4>Liste des dépenses</h4>
              <div class="expense-details-list">
                ${userExpenses.map(e => `
                  <div class="expense-detail-item">
                    <div class="expense-detail-info">
                      <span class="expense-detail-store">${e.store}</span>
                      <span class="expense-detail-date">${formatDate(e.date)}</span>
                    </div>
                    <div class="expense-detail-meta">
                      <span class="expense-detail-type">${e.type}</span>
                      <span class="expense-detail-beneficiary">${e.beneficiary}</span>
                    </div>
                    <div class="expense-detail-amount">${formatMoney(e.amount)}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Ajouter au DOM
    document.body.insertAdjacentHTML('beforeend', html);
    
  } catch (error) {
    console.error('Erreur chargement détails:', error);
    alert('Erreur lors du chargement des détails');
  }
}

function closeExpenseDetails() {
  const overlay = document.querySelector('.expense-details-overlay');
  if (overlay) {
    overlay.remove();
  }
}

function updateBeneficiaryChart(data) {
  const ctx = document.getElementById('beneficiaryChart');
  
  if (charts.beneficiaryChart) {
    charts.beneficiaryChart.destroy();
  }

  // Guard: ensure data is a non-empty array
  if (!Array.isArray(data) || data.length === 0) {
    console.warn('⚠️  [updateBeneficiaryChart] data is not an array or is empty:', data);
    return;
  }

  let labels = [];
  let values = [];

  if (data.length > 0 && data[0].personal !== undefined) {
    // personalByUser format
    console.log('📊 [updateBeneficiaryChart] Using personalByUser format');
    labels = data.map(d => d.display_name || d.username);
    values = data.map(d => Number(d.personal) || 0);
  } else if (data.length > 0 && data[0].beneficiary !== undefined) {
    // totalByBeneficiary format
    console.log('📊 [updateBeneficiaryChart] Using totalByBeneficiary format');
    labels = data.map(d => d.beneficiary === 'Couple' ? '👫 Couple' : '🙋 Perso');
    values = data.map(d => Number(d.total) || 0);
  } else {
    console.warn('⚠️  [updateBeneficiaryChart] Unknown data format:', data);
    return;
  }
  console.log('📊 [updateBeneficiaryChart] labels:', labels, 'values:', values);

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

  // Guard: ensure stats.totalByUser exists and is an array
  if (!stats || !Array.isArray(stats.totalByUser) || stats.totalByUser.length === 0) {
    console.warn('⚠️  [updateSalaryVsExpensesChart] stats.totalByUser is invalid:', stats?.totalByUser);
    return;
  }

  // Récupérer les salaires du mois actuel
  let salaries = [];
  try {
    salaries = await fetch(`/api/salaries/${getCurrentMonth()}`, { credentials: 'same-origin' }).then(r => r.json());
    console.log('📊 [updateSalaryVsExpensesChart] salaries fetched:', salaries);
    window.__compta_debug_salaries = salaries;
  } catch (e) {
    console.warn('⚠️  [updateSalaryVsExpensesChart] fetch salaries failed:', e);
  }
  
  const users = stats.totalByUser.map(u => u.display_name || u.username);
  const salaryData = stats.totalByUser.map(u => Number((salaries.find(s => s.username === u.username)?.amount) || 0));
  const expenseData = stats.totalByUser.map(u => Number(u.total) || 0);
  console.log('📊 [updateSalaryVsExpensesChart] users:', users, 'salaryData:', salaryData, 'expenseData:', expenseData);

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
    const response = await fetch(`/api/expenses/${id}`, { credentials: 'same-origin' });
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
      method: 'DELETE',
      credentials: 'same-origin'
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
      beneficiary: document.getElementById('beneficiary').value,
      account: document.getElementById('account').value
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
          credentials: 'same-origin',
          body: JSON.stringify(formData)
        });
      } else {
        // Mode création
        response = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
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
// VIREMENTS COMPTE COMMUN
// ========================================

function initVirementForm() {
  // Soumission du formulaire
  document.getElementById('virementForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
      amount: parseFloat(document.getElementById('virementAmount').value),
      date: document.getElementById('virementDate').value
    };

    try {
      const response = await fetch('/api/virement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        showMessage('virementSuccess', '✅ Virement enregistré avec succès !');
        document.getElementById('virementForm').reset();
        
        // Réinitialiser la date à aujourd'hui
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('virementDate').value = today;

        // Recharger le dashboard et la liste
        await loadDashboard();
        await loadVirements();
      } else {
        showMessage('virementError', data.error || 'Erreur lors de l\'enregistrement');
      }
    } catch (error) {
      console.error('Erreur enregistrement virement:', error);
      showMessage('virementError', 'Erreur de connexion au serveur');
    }
  });
}

async function loadVirements() {
  try {
    const params = new URLSearchParams();
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    params.append('month', currentMonth);

    const response = await fetch(`/api/virements?${params}`, { credentials: 'same-origin' });
    const virements = await response.json();

    const virementsList = document.getElementById('virementsList');
    virementsList.innerHTML = '';

    if (virements.length === 0) {
      virementsList.innerHTML = '<p style="text-align: center; color: #666;">Aucun virement enregistré ce mois-ci</p>';
      return;
    }

    virements.forEach(v => {
      const row = document.createElement('div');
      row.className = 'transaction-row';
      row.innerHTML = `
        <div class="transaction-info">
          <div class="transaction-user">${v.display_name}</div>
          <div class="transaction-date">${new Date(v.date).toLocaleDateString('fr-FR')}</div>
        </div>
        <div class="transaction-amount">${formatMoney(v.amount)}</div>
        <button class="btn-delete" onclick="deleteVirement(${v.id})">🗑️</button>
      `;
      virementsList.appendChild(row);
    });
  } catch (error) {
    console.error('Erreur chargement virements:', error);
  }
}

async function deleteVirement(id) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce virement ?')) return;

  try {
    const response = await fetch(`/api/virement/${id}`, {
      method: 'DELETE',
      credentials: 'same-origin'
    });

    const data = await response.json();
    if (data.success) {
      await loadDashboard();
      await loadVirements();
    }
  } catch (error) {
    console.error('Erreur suppression virement:', error);
  }
}

// ========================================
// CHARGES HORS COMPTE
// ========================================

function initChargeForm() {
  // Afficher/masquer le champ description selon la catégorie
  document.getElementById('chargeCategory').addEventListener('change', (e) => {
    const descriptionGroup = document.getElementById('chargeDescriptionGroup');
    if (e.target.value === 'autre') {
      descriptionGroup.style.display = 'block';
      document.getElementById('chargeDescription').required = true;
    } else {
      descriptionGroup.style.display = 'none';
      document.getElementById('chargeDescription').required = false;
    }
  });

  // Soumission du formulaire
  document.getElementById('chargeForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
      amount: parseFloat(document.getElementById('chargeAmount').value),
      date: document.getElementById('chargeDate').value,
      category: document.getElementById('chargeCategory').value,
      description: document.getElementById('chargeDescription').value || null
    };

    try {
      const response = await fetch('/api/charge-hors-compte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        showMessage('chargeSuccess', '✅ Charge enregistrée avec succès !');
        document.getElementById('chargeForm').reset();
        
        // Réinitialiser la date à aujourd'hui
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('chargeDate').value = today;

        // Masquer le champ description
        document.getElementById('chargeDescriptionGroup').style.display = 'none';

        // Recharger le dashboard et la liste
        await loadDashboard();
        await loadCharges();
      } else {
        showMessage('chargeError', data.error || 'Erreur lors de l\'enregistrement');
      }
    } catch (error) {
      console.error('Erreur enregistrement charge:', error);
      showMessage('chargeError', 'Erreur de connexion au serveur');
    }
  });
}

async function loadCharges() {
  try {
    const params = new URLSearchParams();
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    params.append('month', currentMonth);

    const response = await fetch(`/api/charges-hors-compte?${params}`, { credentials: 'same-origin' });
    const charges = await response.json();

    const chargesList = document.getElementById('chargesList');
    chargesList.innerHTML = '';

    if (charges.length === 0) {
      chargesList.innerHTML = '<p style="text-align: center; color: #666;">Aucune charge enregistrée ce mois-ci</p>';
      return;
    }

    charges.forEach(c => {
      const categoryLabel = {
        'loyer': '🏠 Loyer',
        'loyer_garage': '🚗 Loyer Garage',
        'autre': '📌 Autre'
      }[c.category] || c.category;

      const row = document.createElement('div');
      row.className = 'transaction-row';
      row.innerHTML = `
        <div class="transaction-info">
          <div class="transaction-user">${c.display_name} - ${categoryLabel}</div>
          <div class="transaction-date">${new Date(c.date).toLocaleDateString('fr-FR')}</div>
          ${c.description ? `<div class="transaction-desc">${c.description}</div>` : ''}
        </div>
        <div class="transaction-amount">${formatMoney(c.amount)}</div>
        <button class="btn-delete" onclick="deleteCharge(${c.id})">🗑️</button>
      `;
      chargesList.appendChild(row);
    });
  } catch (error) {
    console.error('Erreur chargement charges:', error);
  }
}

async function deleteCharge(id) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cette charge ?')) return;

  try {
    const response = await fetch(`/api/charge-hors-compte/${id}`, {
      method: 'DELETE',
      credentials: 'same-origin'
    });

    const data = await response.json();
    if (data.success) {
      await loadDashboard();
      await loadCharges();
    }
  } catch (error) {
    console.error('Erreur suppression charge:', error);
  }
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

  // Charger et afficher les utilisateurs
  loadUsers();

  // Gestion ajout utilisateur
  document.getElementById('addUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('newUsername').value.trim();
    const displayName = document.getElementById('newDisplayName').value.trim() || username;
    const password = document.getElementById('newUserPassword').value || '';

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ username, password, display_name: displayName })
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('addUserForm').reset();
        await loadUsers();
      } else {
        showMessage('passwordError', data.error || 'Erreur création utilisateur');
      }
    } catch (err) {
      console.error('Erreur création utilisateur:', err);
      showMessage('passwordError', 'Erreur serveur');
    }
  });

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

// Chargement et gestion des utilisateurs (settings)
async function loadUsers() {
  try {
    const res = await fetch('/api/users', { credentials: 'same-origin' });
    const users = await res.json();
    const container = document.getElementById('usersList');
    container.innerHTML = '';

    users.forEach(u => {
      const row = document.createElement('div');
      row.className = 'user-row';
      row.innerHTML = `
        <input type="text" value="${u.display_name}" data-id="${u.id}" class="user-display-input" />
        <button class="btn btn-sm" data-id="${u.id}">💾</button>
      `;
      container.appendChild(row);
    });

    // Attach save handlers
    container.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        const input = container.querySelector(`input[data-id='${id}']`);
        const displayName = input.value.trim();
        try {
          await fetch(`/api/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ display_name: displayName })
          });
          await loadUsers();
        } catch (err) {
          console.error('Erreur mise à jour user:', err);
        }
      });
    });
  } catch (error) {
    console.error('Erreur chargement users:', error);
  }
}

// Auto-reload client when server version changes
let _clientVersion = null;
async function checkVersionAndReload() {
  try {
    const res = await fetch('/api/version');
    const data = await res.json();
    if (_clientVersion && data.version && data.version !== _clientVersion) {
      console.log('Nouvelle version détectée, rechargement...');
      window.location.reload(true);
    }
    _clientVersion = data.version;
  } catch (err) {
    // ignore
  }
}

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
