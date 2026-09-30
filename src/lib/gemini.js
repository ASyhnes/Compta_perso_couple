import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function parseTricountExpense(text) {
  const prompt = `
Tu es l'assistant financier d'un couple (David et Léo). L'utilisateur peut te donner plusieurs informations d'un coup (ex: payer une dépense, modifier le salaire d'un mois, modifier une charge fixe).
Analyse la phrase et retourne un tableau d'actions.

Phrase : "${text}"

RÈGLES STRICTES :
Réponds UNIQUEMENT avec un objet JSON pur contenant un tableau "actions", sans balises markdown.

Exemple de structure attendue :
{
  "actions": [
    {
      "action": "EXPENSE",
      "amount": 750,
      "category": "Maison",
      "payer": "david",
      "description": "Deuxième loyer exceptionnel"
    },
    {
      "action": "UPDATE_SALARY",
      "target": "leo",
      "amount": 1200
    }
  ]
}

Actions possibles :
1. "EXPENSE" : Dépense ponctuelle. Fournir "amount", "category" (Maison, Nourriture, Transport, Animaux, Plaisir, Sortie), "payer" ("david" ou "leo"), "description".
2. "UPDATE_FIXED" : Modification d'une charge FIXE récurrente. Fournir "targetName" (ex: Loyer) et "newAmount".
3. "UPDATE_SALARY" : Modification du salaire perçu par l'un d'eux ce mois-ci. Fournir "target" ("david" ou "leo") et "amount".
`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    const cleanJson = responseText.replace(/```json/gi, '').replace(/```/gi, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Erreur Gemini Parse:", error);
    return null;
  }
}
