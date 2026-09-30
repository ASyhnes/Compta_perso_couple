// Moteur financier de la comptabilité du foyer
// Calcule les répartitions, le pro-rata, et génère la To-Do list de fin de mois.

export function calculateMonth(monthData, fixedExpenses, sharedExpenses) {
  const salaryDavid = monthData.salaryDavid || 1800;
  const salaryLeo = monthData.salaryLeo || 1426;
  const totalSalary = salaryDavid + salaryLeo;

  const prorataDavid = totalSalary > 0 ? salaryDavid / totalSalary : 0.5;
  const prorataLeo = totalSalary > 0 ? salaryLeo / totalSalary : 0.5;

  let davidOwesToCommun = 0;
  let leoOwesToCommun = 0;
  
  // 1. Calcul des charges fixes (ex: Loyer, Box, etc.)
  fixedExpenses.forEach(exp => {
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
      if (exp.payer.username === 'david') partDavid = exp.amount;
      if (exp.payer.username === 'leo') partLeo = exp.amount;
    }

    // Si la charge est prélevée sur le compte commun
    if (exp.payer.username === 'commun') {
      davidOwesToCommun += partDavid;
      leoOwesToCommun += partLeo;
    } else {
      // Si la charge (commune) est prélevée sur un compte perso
      if (exp.payer.username === 'david') {
        // David a payé pour Léo
        davidOwesToCommun -= partLeo; // on déduit ce que Léo lui doit
        leoOwesToCommun += partLeo;
      } else if (exp.payer.username === 'leo') {
        // Léo a payé pour David
        leoOwesToCommun -= partDavid;
        davidOwesToCommun += partDavid;
      }
    }
  });

  // 2. Calcul des charges Tricount (ad-hoc)
  sharedExpenses.forEach(exp => {
    // Par défaut, nourriture = 2/3, reste = prorata
    let partDavid = 0;
    let partLeo = 0;

    if (exp.category === 'Nourriture/Hygiène/Maison') {
      partDavid = exp.amount * (2/3);
      partLeo = exp.amount * (1/3);
    } else {
      partDavid = exp.amount * prorataDavid;
      partLeo = exp.amount * prorataLeo;
    }

    if (exp.payer.username === 'david') {
      davidOwesToCommun -= partLeo;
      leoOwesToCommun += partLeo;
    } else if (exp.payer.username === 'leo') {
      leoOwesToCommun -= partDavid;
      davidOwesToCommun += partDavid;
    }
  });

  // Sécuriser les montants (pas de virement négatif, compensation directe)
  // En général, davidOwesToCommun et leoOwesToCommun sont positifs et représentent le virement final vers le compte commun.
  
  return {
    prorataDavid: prorataDavid * 100,
    prorataLeo: prorataLeo * 100,
    davidOwesToCommun: Math.max(0, davidOwesToCommun),
    leoOwesToCommun: Math.max(0, leoOwesToCommun),
    rawDavidBalance: davidOwesToCommun,
    rawLeoBalance: leoOwesToCommun
  };
}
