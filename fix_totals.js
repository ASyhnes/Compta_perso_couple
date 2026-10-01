const fs = require('fs');
let content = fs.readFileSync('src/app/page.js', 'utf8');

const regexDavid = /if \(\!groupedResponsibility\.david\.banks\[bank\]\) groupedResponsibility\.david\.banks\[bank\] = \{ total: 0, commun: \[\], perso: \[\] \};\n\s*groupedResponsibility\.david\.banks\[bank\]\[type\]\.push\(\{ name: exp\.distributionRule \!\=\= 'PERSONAL' \? "Part de " \+ exp\.name : exp\.name, amount: partDavid, isPaid: false \}\);\n\s*groupedResponsibility\.david\.banks\[bank\]\.total \+\= partDavid;\n\s*groupedResponsibility\.david\.total \+\= partDavid;/;

const replacementDavid = `if (!groupedResponsibility.david.banks[bank]) groupedResponsibility.david.banks[bank] = { total: 0, commun: [], perso: [] };
        const isCancelled = cancelledFixed.includes(exp.name);
        groupedResponsibility.david.banks[bank][type].push({ name: exp.distributionRule !== 'PERSONAL' ? "Part de " + exp.name : exp.name, amount: partDavid, isPaid: false, isCancelled, originalName: exp.name });
        if (!isCancelled) {
          groupedResponsibility.david.banks[bank].total += partDavid;
          groupedResponsibility.david.total += partDavid;
        }`;

content = content.replace(regexDavid, replacementDavid);

const regexLeo = /if \(\!groupedResponsibility\.leo\.banks\[bank\]\) groupedResponsibility\.leo\.banks\[bank\] = \{ total: 0, commun: \[\], perso: \[\] \};\n\s*groupedResponsibility\.leo\.banks\[bank\]\[type\]\.push\(\{ name: exp\.distributionRule \!\=\= 'PERSONAL' \? "Part de " \+ exp\.name : exp\.name, amount: partLeo, isPaid: false \}\);\n\s*groupedResponsibility\.leo\.banks\[bank\]\.total \+\= partLeo;\n\s*groupedResponsibility\.leo\.total \+\= partLeo;/;

const replacementLeo = `if (!groupedResponsibility.leo.banks[bank]) groupedResponsibility.leo.banks[bank] = { total: 0, commun: [], perso: [] };
        const isCancelled = cancelledFixed.includes(exp.name);
        groupedResponsibility.leo.banks[bank][type].push({ name: exp.distributionRule !== 'PERSONAL' ? "Part de " + exp.name : exp.name, amount: partLeo, isPaid: false, isCancelled, originalName: exp.name });
        if (!isCancelled) {
          groupedResponsibility.leo.banks[bank].total += partLeo;
          groupedResponsibility.leo.total += partLeo;
        }`;

content = content.replace(regexLeo, replacementLeo);

// We must also update the red check code in JSX because exp.name has "Part de " attached. We need to use originalName or exp.originalName
const greenRed1 = /\$\{cancelledFixed\.includes\(exp\.name\) \? 'bg\-red\-50/g;
content = content.replace(greenRed1, "${exp.isCancelled ? 'bg-red-50");

fs.writeFileSync('src/app/page.js', content, 'utf8');
