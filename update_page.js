const fs = require('fs');

let pageContent = fs.readFileSync('src/app/page.js', 'utf8');

const replacement = \
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

      // Assign David's responsibility
      if (partDavid > 0) {
        if (!groupedResponsibility.david.banks[bank]) groupedResponsibility.david.banks[bank] = { total: 0, items: [] };
        groupedResponsibility.david.banks[bank].items.push({ name: exp.distributionRule !== 'PERSONAL' ? "Part de " + exp.name : exp.name, amount: partDavid, isPaid: false });
        groupedResponsibility.david.banks[bank].total += partDavid;
        groupedResponsibility.david.total += partDavid;
      }

      // Assign Leo's responsibility
      if (partLeo > 0) {
        if (!groupedResponsibility.leo.banks[bank]) groupedResponsibility.leo.banks[bank] = { total: 0, items: [] };
        groupedResponsibility.leo.banks[bank].items.push({ name: exp.distributionRule !== 'PERSONAL' ? "Part de " + exp.name : exp.name, amount: partLeo, isPaid: false });
        groupedResponsibility.leo.banks[bank].total += partLeo;
        groupedResponsibility.leo.total += partLeo;
      }
    });
  }
\;

pageContent = pageContent.replace(/const groupedFixedExpenses[\s\S]*?\} \: \{\};/, replacement);

const jsxReplacement = \
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
                            <div className="space-y-2 px-1">
                              {groupedResponsibility[person].banks[bankName].items.map((exp, i) => (
                                <div key={i} className="flex justify-between items-center text-sm border-b border-gray-100 pb-1 last:border-0 last:pb-0">
                                  <span className="text-gray-600">{exp.name}</span>
                                  <span className="font-medium text-gray-800">{Math.round(exp.amount)} €</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
\;

pageContent = pageContent.replace(/<div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">\s*<h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Charges Fixes<\/h2>[\s\S]*?<\/div>/, jsxReplacement);

fs.writeFileSync('src/app/page.js', pageContent, 'utf8');
