const fs = require('fs');

let pageContent = fs.readFileSync('src/app/page.js', 'utf8');

const replacement = `                              <div className="space-y-3 px-1">
                                {groupedResponsibility[person].banks[bankName].commun.length > 0 && (
                                  <div>
                                    <div className="text-[10px] uppercase font-bold text-gray-400 mb-1 ml-1">Charges Communes</div>
                                    <div className="space-y-1">
                                      {groupedResponsibility[person].banks[bankName].commun.map((exp, i) => (
                                        <div key={\`com-\${i}\`} className={\`flex justify-between items-center text-sm border-b border-gray-100 pb-1 last:border-0 last:pb-0 transition-colors \${checkedItems[\`\${person}-\${bankName}-\${exp.name}\`] ? 'bg-green-50 p-1 rounded-md' : ''}\`}>
                                          <label className="flex items-center gap-2 cursor-pointer flex-1">
                                            <input type="checkbox" className="rounded text-green-600 focus:ring-green-500" checked={checkedItems[\`\${person}-\${bankName}-\${exp.name}\`] || false} onChange={(e) => { const newChecked = { ...checkedItems, [\`\${person}-\${bankName}-\${exp.name}\`]: e.target.checked }; setCheckedItems(newChecked); localStorage.setItem('compta_checked_items_' + new Date().toISOString().slice(0, 7), JSON.stringify(newChecked)); }} />
                                            <span className={checkedItems[\`\${person}-\${bankName}-\${exp.name}\`] ? "text-green-700 font-medium" : "text-gray-600"}>{exp.name}</span>
                                          </label>
                                          <span className={checkedItems[\`\${person}-\${bankName}-\${exp.name}\`] ? "font-bold text-green-700" : "font-medium text-gray-800"}>{Math.round(exp.amount)} €</span>
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
                                        <div key={\`per-\${i}\`} className={\`flex justify-between items-center text-sm border-b border-gray-100 pb-1 last:border-0 last:pb-0 transition-colors \${checkedItems[\`\${person}-\${bankName}-\${exp.name}\`] ? 'bg-green-50 p-1 rounded-md' : ''}\`}>
                                          <label className="flex items-center gap-2 cursor-pointer flex-1">
                                            <input type="checkbox" className="rounded text-green-600 focus:ring-green-500" checked={checkedItems[\`\${person}-\${bankName}-\${exp.name}\`] || false} onChange={(e) => { const newChecked = { ...checkedItems, [\`\${person}-\${bankName}-\${exp.name}\`]: e.target.checked }; setCheckedItems(newChecked); localStorage.setItem('compta_checked_items_' + new Date().toISOString().slice(0, 7), JSON.stringify(newChecked)); }} />
                                            <span className={checkedItems[\`\${person}-\${bankName}-\${exp.name}\`] ? "text-green-700 font-medium" : "text-gray-600"}>{exp.name}</span>
                                          </label>
                                          <span className={checkedItems[\`\${person}-\${bankName}-\${exp.name}\`] ? "font-bold text-green-700" : "font-medium text-gray-800"}>{Math.round(exp.amount)} €</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>`;

pageContent = pageContent.replace(/<div className="space-y-2 px-1">[\s\S]*?<\/div>\s*<\/div>\s*\)\)\}\s*<\/div>/, replacement + '\n                            </div>\n                          ))}\n                        </div>');

fs.writeFileSync('src/app/page.js', pageContent, 'utf8');
