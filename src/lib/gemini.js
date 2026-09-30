import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function parseTricountExpense(text) {
  const prompt = `
Tu es l'assistant financier d'un couple (David et Léo).
Analyse la phrase suivante pour déterminer si l'utilisateur veut ajouter une dépense ponctuelle OU modifier/ajouter une charge fixe (abonnement, loyer, etc.).

Phrase : "${text}"

RÈGLES STRICTES :
Réponds UNIQUEMENT avec un objet JSON pur (sans balises markdown, sans texte avant ou après).

Format si c'est une dépense ponctuelle (courses, essence occasionnelle, sortie, etc) :
{
  "action": "EXPENSE",
  "amount": <nombre>,
  "category": <"Nourriture/Hygiène/Maison" | "Transport" | "Bricolage" | "Animaux" | "Plaisir" | "Sortie">,
  "payer": <"david" | "leo" | null>,
  "description": <"court résumé">
}

Format si c'est une modification d'une charge fixe (ex: "Désormais le loyer est à 800", "Change le prix de la box à 50") :
{
  "action": "UPDATE_FIXED",
  "targetName": <"Loyer" | "Box Bouygues" | "Assurance auto" | etc... essaie de deviner la cible existante>,
  "newAmount": <nombre>
}
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
