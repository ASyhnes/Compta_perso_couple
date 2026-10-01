const fs = require('fs');
let content = fs.readFileSync('src/app/page.js', 'utf8');

// 1. Add MessageSquare icon import
if (!content.includes('MessageSquare')) {
    content = content.replace('import { Loader2 }', 'import { Loader2, MessageSquare }');
}

// 2. Add chat state and parse cancelled items
const beforeLoadData = `  const [expenseText, setExpenseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);`;
const afterLoadData = `  const [expenseText, setExpenseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const chatMessages = data.monthData?.chatMessages || [];
  
  let cancelledFixed = [];
  try {
    if (data.monthData?.cancelledFixedExpenses) {
      cancelledFixed = JSON.parse(data.monthData.cancelledFixedExpenses);
    }
  } catch(e) {}`;
content = content.replace(beforeLoadData, afterLoadData);

// 3. API call to Tricount 
// We must pass context (monthData, fixedExpenses)
const beforeApi = `      const res = await fetch('/api/tricount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: expenseText, currentUser })
      });`;
const afterApi = `      const res = await fetch('/api/tricount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: expenseText, 
          currentUser,
          context: { 
            monthData: data.monthData,
            fixedExpenses: data.fixedExpenses,
            rawDavidBalance: data.calculation?.davidOwesToCommun,
            rawLeoBalance: data.calculation?.leoOwesToCommun
          }
        })
      });`;
content = content.replace(beforeApi, afterApi);

// 3. Update Tricount tab render
const tricountRegex = /\{activeTab === 'tricount' && \([\s\S]*?<\/div>\n              \)\}/;
const newTricount = `{activeTab === 'tricount' && (
                <div className="flex flex-col h-full bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {chatMessages.length === 0 ? (
                      <div className="text-center text-gray-400 italic text-sm mt-10">Aucun message ce mois-ci.</div>
                    ) : (
                      chatMessages.map(msg => {
                        const isAI = msg.sender === 'ai';
                        const isMe = msg.sender === currentUser;
                        return (
                          <div key={msg.id} className={\`flex \${isAI ? 'justify-start' : (isMe ? 'justify-end' : 'justify-end')}\`}>
                            <div className={\`max-w-[80%] rounded-2xl p-3 text-sm \${isAI ? 'bg-white text-gray-800 rounded-tl-none border border-gray-200' : (isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-300 text-gray-800 rounded-tr-none')}\`}>
                              {!isAI && !isMe && <div className="text-xs font-bold text-gray-500 mb-1 capitalize">{msg.sender}</div>}
                              {isAI && <div className="text-[10px] font-bold text-blue-500 mb-1 uppercase">Assistant IA</div>}
                              {msg.text}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="bg-white p-3 border-t border-gray-200 flex gap-2">
                    <input 
                      type="text"
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Ex: Je ne paie pas le loyer..."
                      value={expenseText}
                      onChange={(e) => setExpenseText(e.target.value)}
                      disabled={isSubmitting}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddExpense()}
                    />
                    <button 
                      onClick={handleAddExpense}
                      disabled={isSubmitting || !expenseText}
                      className="bg-blue-600 disabled:bg-blue-300 text-white p-2 rounded-full hover:bg-blue-700 transition flex items-center justify-center w-10 h-10"
                    >
                      {isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : <MessageSquare className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}`;
content = content.replace(tricountRegex, newTricount);

// 4. Highlight cancelled items in red
const greenCheckRegex1 = /\$\{checkedItems\[\`\$\{person\}\-\$\{bankName\}\-\$\{exp\.name\}\`\] \? 'bg\-green\-50 p\-1 rounded\-md' \: ''\}/g;
const replacedRedCheck = `\${cancelledFixed.includes(exp.name) ? 'bg-red-50 p-1 rounded-md line-through text-red-500' : (checkedItems[\`\${person}-\${bankName}-\${exp.name}\`] ? 'bg-green-50 p-1 rounded-md' : '')}`;

content = content.replace(greenCheckRegex1, replacedRedCheck);

fs.writeFileSync('src/app/page.js', content, 'utf8');
