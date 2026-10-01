import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key");
const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });

export async function parseTricountExpense(text, currentUser = "inconnu", context = {}) {
  const { monthData, fixedExpenses, rawDavidBalance, rawLeoBalance } = context;
  
  const prompt = `
Tu es l'assistant financier d'un couple (David et Léo). Tu as une discussion avec eux.
L'utilisateur actuel qui te parle est : ${currentUser}. S'il dit "j'ai payé", "je", etc, il s'agit de ${currentUser}.

CONTEXTE FINANCIER DU MOIS:
- Salaires: David (${monthData?.salaryDavid || 1800}€), Léo (${monthData?.salaryLeo || 1426}€).
- Virement prévu à la fin du mois vers le compte commun: David doit envoyer ${Math.round(rawDavidBalance || 0)}€, Léo doit envoyer ${Math.round(rawLeoBalance || 0)}€.
- Charges fixes (liste abrégée): ${fixedExpenses?.map(f => f.name).join(', ')}

L'utilisateur peut t'informer de dépenses, ou te dire qu'il ne paiera pas une charge fixe ce mois-ci ("je ne paie pas le loyer", "pas de spotify ce mois-ci").

TA TÂCHE :
Analyse la demande et retourne un objet JSON avec DEUX champs :
1. "reply": Un message sympathique, clair et conversationnel (comme un chatbot).
   - SI l'utilisateur annule une charge, confirme-le.
   - ALERTE: Analyse le reste-à-vivre. Si un virement semble trop lourd par rapport au salaire, ou si l'un d'eux est en difficulté, mets un petit avertissement bienveillant (ex: "Attention Léo, tes dépenses s'accumulent...").
2. "actions": Un tableau d'actions (peut être vide).

Actions possibles :
1. "EXPENSE" : Dépense ponctuelle. Fournir "amount", "category" (Maison, Nourriture/Hygiène/Maison, Transport, Animaux, Plaisir, Sortie), "payer" ("david" ou "leo"), "description".
2. "UPDATE_FIXED" : Modification d'une charge FIXE récurrente. Fournir "targetName" (ex: Loyer) et "newAmount".
3. "UPDATE_SALARY" : Modification du salaire perçu par l'un d'eux ce mois-ci. Fournir "target" ("david" ou "leo") et "amount".
4. "CANCEL_FIXED" : L'utilisateur signale qu'une charge fixe ne sera PAS payée ce mois-ci. Fournir "targetName" (le nom de la charge fixe annulée).

Phrase de l'utilisateur : "${text}"

RÈGLES STRICTES :
Réponds UNIQUEMENT avec un objet JSON pur, sans balises markdown.

Exemple :
{
  "reply": "C'est noté ! J'ai ajouté le resto de 50€. Attention David, tes charges s'élèvent déjà à 1200€ ce mois-ci.",
  "actions": [
    { "action": "EXPENSE", "amount": 50, "category": "Sortie", "payer": "david", "description": "Resto" }
  ]
}
`;

  let retries = 3;
  while (retries > 0) {
    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();
      const cleanJson = responseText.replace(/```json/gi, '').replace(/```/gi, '').trim();
      return JSON.parse(cleanJson);
    } catch (error) {
      console.error(`Erreur Gemini Parse (Reste ${retries-1} essais):`, error.message);
      retries -= 1;
      if (retries === 0) return null;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
