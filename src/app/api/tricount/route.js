import { NextResponse } from 'next/server';
import { parseTricountExpense } from '@/lib/gemini';
import { PrismaClient } from '@prisma/client';

let prisma;

export async function POST(request) {
  if (!prisma) prisma = new PrismaClient();
  
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Texte manquant" }, { status: 400 });
    }

    // 1. Analyse IA avec Gemini
    const aiResponse = await parseTricountExpense(text);

    if (!aiResponse || !aiResponse.action) {
      return NextResponse.json({ error: "L'IA n'a pas réussi à comprendre la demande." }, { status: 400 });
    }

    if (aiResponse.action === 'UPDATE_FIXED') {
      // Rechercher la charge fixe qui ressemble (insensible à la casse)
      const fixedExpenses = await prisma.fixedExpense.findMany();
      const target = fixedExpenses.find(e => e.name.toLowerCase().includes(aiResponse.targetName.toLowerCase()) || aiResponse.targetName.toLowerCase().includes(e.name.toLowerCase()));
      
      if (!target) {
        return NextResponse.json({ error: `Charge fixe "${aiResponse.targetName}" introuvable.` }, { status: 404 });
      }

      await prisma.fixedExpense.update({
        where: { id: target.id },
        data: { amount: Number(aiResponse.newAmount) }
      });

      return NextResponse.json({ success: true, message: `La charge ${target.name} a été mise à jour à ${aiResponse.newAmount}€.` });
    }

    if (aiResponse.action === 'EXPENSE') {
      let username = aiResponse.payer?.toLowerCase();
      if (username !== 'david' && username !== 'leo') {
        username = 'david'; // fallback
      }

      const user = await prisma.user.findUnique({
        where: { username }
      });

      if (!user) return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });

      const newExpense = await prisma.sharedExpense.create({
        data: {
          description: aiResponse.description || text.substring(0, 50),
          amount: Number(aiResponse.amount),
          category: aiResponse.category,
          payerId: user.id
        }
      });

      return NextResponse.json({ success: true, data: newExpense, message: "Dépense ajoutée avec succès." });
    }

    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });

  } catch (error) {
    console.error("API Tricount Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
