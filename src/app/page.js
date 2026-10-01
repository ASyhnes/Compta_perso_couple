'use client';
import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { PieChart as ChartIcon, PlusCircle, List, Loader2 } from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [expenseText, setExpenseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [data, setData] = useState({ calculation: null, pieData: [], sharedExpenses: [] });
  const [isLoading, setIsLoading] = useState(true);

  // Authentification
  const [currentUser, setCurrentUser] = useState('');
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Checklist pour To-Do List
  const [checkedItems, setCheckedItems] = useState({});

  useEffect(() => {
    const savedUser = localStorage.getItem('compta_user');
    if (savedUser) setCurrentUser(savedUser);
    
    // Charger les items cochés pour le mois en cours
    const monthKey = 'compta_checked_items_' + new Date().toISOString().slice(0, 7);
    const savedChecked = localStorage.getItem(monthKey);
    if (savedChecked) {
      try { setCheckedItems(JSON.parse(savedChecked)); } catch(e) {}
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    const u = loginInput.toLowerCase().trim();
    const p = passwordInput.toLowerCase().trim();
    
    if ((u === 'david' && p === 'david') || (u === 'léo' && p === 'leo') || (u === 'leo' && p === 'leo')) {
      const user = u === 'léo' ? 'leo' : u;
      setCurrentUser(user);
      localStorage.setItem('compta_user', user);
      setLoginError('');
    } else {
      setLoginError('Identifiants incorrects');
    }
  };

  const handleLogout = () => {
    setCurrentUser('');
    localStorage.removeItem('compta_user');
  };

  const fetchData = async () => {
    setIsLoading(true);
    const isGlobal = activeTab === 'global';
    try {
      const res = await fetch(`/compta/api/dashboard?global=${isGlobal}`);
      const json = await res.json();
      if (json.calculation) setData(json);
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleAddExpense = async () => {
    if (!expenseText) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/compta/api/tricount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: expenseText, currentUser })
      });
      const json = await res.json();
      if (res.ok) {
        setExpenseText('');
        alert(json.message || "Dépense ajoutée !");
        fetchData(); // Rafraîchir les données
      } else {
        alert(json.error || "Erreur lors de l'analyse avec Gemini.");
      }
    } catch (e) {
      console.error(e);
    }
    setIsSubmitting(false);
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a855f7', '#ec4899', '#ef4444', '#14b8a6'];

  // Fonction de couleur pour la jauge
  const getColors = (eff1, eff2) => {
    const diff = Math.abs(eff1 - eff2);
    if (diff < 5) return ['#22c55e', '#22c55e'];
    return eff1 > eff2 ? ['#86efac', '#ef4444'] : ['#ef4444', '#86efac'];
  };

  let mockGaugeData = [];
  if (data.calculation) {
    // Calcul de l'effort : ce qu'ils ont vraiment payé (ou équilibre du solde) vs pro-rata théorique
    // Pour simplifier l'affichage: 100 = équilibre parfait.
    // Plus davidOwesToCommun est faible par rapport à ce qu'il devrait être, plus son "effort" est grand.
    const effDavid = 100 + (data.calculation.rawLeoBalance - data.calculation.rawDavidBalance) * 0.1;
    const effLeo = 100 + (data.calculation.rawDavidBalance - data.calculation.rawLeoBalance) * 0.1;
    const [cDavid, cLeo] = getColors(effDavid, effLeo);
    mockGaugeData = [
      { name: 'David', effort: effDavid, fill: cDavid },
      { name: 'Léo', effort: effLeo, fill: cLeo }
    ];
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white p-6 rounded-xl shadow-md w-full max-w-sm space-y-4">
          <h1 className="text-xl font-bold text-center text-gray-800">Connexion Compta</h1>
          {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Utilisateur</label>
            <input type="text" value={loginInput} onChange={e => setLoginInput(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-blue-500" placeholder="David ou Léo" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:border-blue-500" placeholder="••••" required />
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white font-medium py-2 rounded hover:bg-blue-700">Se connecter</button>
        </form>
      </div>
    );
  }

  const salaryDavid = data.monthData?.salaryDavid || 1800;
  const salaryLeo = data.monthData?.salaryLeo || 1426;
  const totalSalary = salaryDavid + salaryLeo;
  const prorataDavid = totalSalary > 0 ? salaryDavid / totalSalary : 0.5;
  const prorataLeo = totalSalary > 0 ? salaryLeo / totalSalary : 0.5;

  const groupedResponsibility = {
    david: { total: 0, banks: {} },
    leo: { total: 0, banks: {} }
  };

  if (data.fixedExpenses) {
    data.fixedExpenses.forEach(exp => {
      let partDavid = 0;
      let partLeo = 0;

      if (exp.distributionRule === 'PRO_RATA') {
        partDavid = exp.amount * prorataDavid;
        partLeo = exp.amount * prorataLeo;
      } else if (exp.distributionRule === 'TWO_THIRDS') {
        partDavid = exp.amount * (2/3);
        partLeo = exp.amount * (1/3);
      } else if (exp.distributionRule === 'FIFTY_FIFTY') {
        partDavid = exp.amount * 0.5;
        partLeo = exp.amount * 0.5;
      } else if (exp.distributionRule === 'PERSONAL') {
        if (exp.payer?.username === 'david') partDavid = exp.amount;
        if (exp.payer?.username === 'leo') partLeo = exp.amount;
      }

      const bank = exp.bankAccount || 'Compte Principal';
      const type = exp.distributionRule === 'PERSONAL' ? 'perso' : 'commun';

      // Assign David's responsibility
      if (partDavid > 0) {
        if (!groupedResponsibility.david.banks[bank]) groupedResponsibility.david.banks[bank] = { total: 0, commun: [], perso: [] };
        groupedResponsibility.david.banks[bank][type].push({ name: exp.distributionRule !== 'PERSONAL' ? "Part de " + exp.name : exp.name, amount: partDavid, isPaid: false });
        groupedResponsibility.david.banks[bank].total += partDavid;
        groupedResponsibility.david.total += partDavid;
      }

      // Assign Leo's responsibility
      if (partLeo > 0) {
        if (!groupedResponsibility.leo.banks[bank]) groupedResponsibility.leo.banks[bank] = { total: 0, commun: [], perso: [] };
        groupedResponsibility.leo.banks[bank][type].push({ name: exp.distributionRule !== 'PERSONAL' ? "Part de " + exp.name : exp.name, amount: partLeo, isPaid: false });
        groupedResponsibility.leo.banks[bank].total += partLeo;
        groupedResponsibility.leo.total += partLeo;
      }
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
      <header className="bg-white shadow-sm p-4 sticky top-0 z-10 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">
          {activeTab === 'dashboard' ? 'Budget du Mois' : 
           activeTab === 'tricount' ? 'Dépenses Communes' : 'Bilan Cumulé'}
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500 capitalize">{currentUser}</span>
          <button onClick={handleLogout} className="text-xs text-red-500 border border-red-500 rounded px-2 py-1">Déco</button>
        </div>
      </header>

      <main className="flex-1 p-4 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-48 text-gray-400">Chargement...</div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wider">Jauge d'Équilibre</h2>
                  <p className="text-xs text-gray-400 mb-4">Objectif: 100% pour les deux (aligné sur pro-rata).</p>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={mockGaugeData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{fill: '#6b7280', fontSize: 12}} />
                        <YAxis domain={[0, 150]} tick={{fill: '#6b7280', fontSize: 12}} />
                        <Tooltip cursor={{fill: 'transparent'}} />
                        <Bar dataKey="effort" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-center">
                    Virement de fin de mois :<br/>
                    David ➔ Commun : <b>{Math.round(data.calculation?.davidOwesToCommun || 0)} €</b><br/>
                    Léo ➔ Commun : <b>{Math.round(data.calculation?.leoOwesToCommun || 0)} €</b>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wider">Répartition des charges</h2>
                  <div className="h-48 flex justify-center items-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={data.pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
                          {data.pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'global' && (
              <div className="space-y-6">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Salaires du Mois</h2>
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="text-gray-600">David</span>
                    <span className="font-medium">{data.monthData?.salaryDavid || 1800} €</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Léo</span>
                    <span className="font-medium">{data.monthData?.salaryLeo || 1426} €</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">To-Do List : Financement (Ce mois-ci)</h2>
                  
                  {['david', 'leo'].map(person => (
                    <div key={person} className="mb-6 last:mb-0">
                      <div className="flex justify-between items-center mb-3 border-b-2 border-gray-200 pb-1">
                        <h3 className="text-base font-bold text-gray-800 capitalize">{person}</h3>
                        <span className="text-sm font-semibold text-blue-600">{Math.round(groupedResponsibility[person].total)} €</span>
                      </div>
                      
                      <div className="space-y-4">
                        {Object.keys(groupedResponsibility[person].banks).map(bankName => (
                          <div key={bankName} className="bg-gray-50 p-2 rounded-lg">
                            <h4 className="text-xs font-bold text-gray-500 uppercase border-b border-gray-200 pb-1 mb-2 flex justify-between">
                              A mettre sur {bankName}
                              <span className="text-gray-600">{Math.round(groupedResponsibility[person].banks[bankName].total)} €</span>
                            </h4>
                                                          <div className="space-y-3 px-1">
                                {groupedResponsibility[person].banks[bankName].commun.length > 0 && (
                                  <div>
                                    <div className="text-[10px] uppercase font-bold text-gray-400 mb-1 ml-1">Charges Communes</div>
                                    <div className="space-y-1">
                                      {groupedResponsibility[person].banks[bankName].commun.map((exp, i) => (
                                        <div key={`com-${i}`} className={`flex justify-between items-center text-sm border-b border-gray-100 pb-1 last:border-0 last:pb-0 transition-colors ${checkedItems[`${person}-${bankName}-${exp.name}`] ? 'bg-green-50 p-1 rounded-md' : ''}`}>
                                          <label className="flex items-center gap-2 cursor-pointer flex-1">
                                            <input type="checkbox" className="rounded text-green-600 focus:ring-green-500" checked={checkedItems[`${person}-${bankName}-${exp.name}`] || false} onChange={(e) => { const newChecked = { ...checkedItems, [`${person}-${bankName}-${exp.name}`]: e.target.checked }; setCheckedItems(newChecked); localStorage.setItem('compta_checked_items_' + new Date().toISOString().slice(0, 7), JSON.stringify(newChecked)); }} />
                                            <span className={checkedItems[`${person}-${bankName}-${exp.name}`] ? "text-green-700 font-medium" : "text-gray-600"}>{exp.name}</span>
                                          </label>
                                          <span className={checkedItems[`${person}-${bankName}-${exp.name}`] ? "font-bold text-green-700" : "font-medium text-gray-800"}>{Math.round(exp.amount)} €</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {groupedResponsibility[person].banks[bankName].perso.length > 0 && (
                                  <div>
                                    <div className="text-[10px] uppercase font-bold text-gray-400 mb-1 ml-1 mt-2">Charges Personnelles</div>
                                    <div className="space-y-1">
                                      {groupedResponsibility[person].banks[bankName].perso.map((exp, i) => (
                                        <div key={`per-${i}`} className={`flex justify-between items-center text-sm border-b border-gray-100 pb-1 last:border-0 last:pb-0 transition-colors ${checkedItems[`${person}-${bankName}-${exp.name}`] ? 'bg-green-50 p-1 rounded-md' : ''}`}>
                                          <label className="flex items-center gap-2 cursor-pointer flex-1">
                                            <input type="checkbox" className="rounded text-green-600 focus:ring-green-500" checked={checkedItems[`${person}-${bankName}-${exp.name}`] || false} onChange={(e) => { const newChecked = { ...checkedItems, [`${person}-${bankName}-${exp.name}`]: e.target.checked }; setCheckedItems(newChecked); localStorage.setItem('compta_checked_items_' + new Date().toISOString().slice(0, 7), JSON.stringify(newChecked)); }} />
                                            <span className={checkedItems[`${person}-${bankName}-${exp.name}`] ? "text-green-700 font-medium" : "text-gray-600"}>{exp.name}</span>
                                          </label>
                                          <span className={checkedItems[`${person}-${bankName}-${exp.name}`] ? "font-bold text-green-700" : "font-medium text-gray-800"}>{Math.round(exp.amount)} €</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Historique Complet</h2>
                  {data.sharedExpenses?.length > 0 ? (
                    <div className="space-y-3">
                      {data.sharedExpenses.map(exp => (
                        <div key={exp.id} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                          <div>
                            <p className="font-medium text-gray-800">{exp.description}</p>
                            <p className="text-xs text-gray-400">{new Date(exp.date).toLocaleDateString('fr-FR')} • {exp.payer?.username}</p>
                          </div>
                          <span className="font-medium text-blue-600">{exp.amount} €</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm italic">Aucune dépense ponctuelle.</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'tricount' && (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100">
                  <label className="text-sm font-semibold text-gray-700 block mb-2">Ajouter une dépense (via IA)</label>
                  <textarea 
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    rows="3"
                    placeholder="Ex: J'ai acheté 45€ de courses ce matin (David)"
                    value={expenseText}
                    onChange={(e) => setExpenseText(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <button 
                    onClick={handleAddExpense}
                    disabled={isSubmitting || !expenseText}
                    className="w-full mt-3 bg-blue-600 disabled:bg-blue-300 text-white font-medium py-2 rounded-lg hover:bg-blue-700 transition flex justify-center"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : 'Analyser avec Gemini'}
                  </button>
                </div>

                <div className="space-y-2 mt-6">
                  <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Historique Récent</h2>
                  {data.sharedExpenses.length === 0 ? (
                    <p className="text-gray-400 text-sm italic">Aucune dépense partagée.</p>
                  ) : (
                    data.sharedExpenses.slice(0, 5).map(exp => (
                      <div key={exp.id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-50 flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{exp.description}</p>
                          <p className="text-xs text-gray-400 capitalize">{exp.category} • Payé par {exp.payer?.username}</p>
                        </div>
                        <span className="font-bold text-blue-600">{exp.amount} €</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <nav className="bg-white border-t border-gray-200 fixed bottom-0 w-full px-6 py-3 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-gray-400'}`}>
          <ChartIcon className="h-6 w-6 mb-1" />
          <span className="text-[10px] font-medium">Dashboard</span>
        </button>
        <button onClick={() => setActiveTab('tricount')} className={`flex flex-col items-center ${activeTab === 'tricount' ? 'text-blue-600' : 'text-gray-400'}`}>
          <PlusCircle className="h-6 w-6 mb-1" />
          <span className="text-[10px] font-medium">Tricount</span>
        </button>
        <button onClick={() => setActiveTab('global')} className={`flex flex-col items-center ${activeTab === 'global' ? 'text-blue-600' : 'text-gray-400'}`}>
          <List className="h-6 w-6 mb-1" />
          <span className="text-[10px] font-medium">Bilan</span>
        </button>
      </nav>
    </div>
  );
}
