import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key_pour_build");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * Analyse une phrase pour extraire une dépense Tricount.
 * @param {string} text - Ex: "J'ai payé 45 euros de courses ce matin (David)"
 */
export async function parseTricountExpense(text) {
  const prompt = `
Tu es un assistant financier strict. Analyse la phrase suivante et extrais les informations de la dépense.
Catégories autorisées UNIQUEMENT : "Nourriture/Hygiène/Maison", "Transport", "Bricolage", "Animaux", "Plaisir", "Sortie".

Phrase : "${text}"

Réponds UNIQUEMENT avec un objet JSON pur (sans balises markdown) contenant :
- amount (nombre, montant de la dépense)
- category (string, une des catégories autorisées)
- payer (string, "david" ou "leo" en minuscules. Déduis-le de la phrase si mentionné, sinon mets null)
- description (string, court résumé de 3 à 5 mots maximum)
`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    // Nettoyage au cas où l'IA renverrait quand même des balises Markdown (ex: ```json ... ```)
    const cleanJson = responseText.replace(/```json/gi, '').replace(/```/gi, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Erreur Gemini Parse:", error);
    return null;
  }
}
