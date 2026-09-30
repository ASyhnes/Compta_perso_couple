import { NextResponse } from 'next/server';
import { parseTricountExpense } from '@/lib/gemini';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Texte manquant" }, { status: 400 });
    }

    // 1. Analyse IA avec Gemini
    const expenseData = await parseTricountExpense(text);

    if (!expenseData || !expenseData.amount || !expenseData.category) {
      return NextResponse.json({ error: "L'IA n'a pas réussi à comprendre la dépense." }, { status: 400 });
    }

    // 2. Déduction de l'utilisateur
    // Dans un vrai système avec Auth, on utiliserait le token de session.
    // Ici, si l'IA l'a déduit du texte on l'utilise, sinon on fallback sur un default ou on renvoie une erreur.
    let username = expenseData.payer?.toLowerCase();
    if (username !== 'david' && username !== 'leo') {
      // Fallback temporaire pour la démo
      username = 'david';
    }

    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // 3. Sauvegarde en Base de Données
    const newExpense = await prisma.sharedExpense.create({
      data: {
        description: expenseData.description || text.substring(0, 50),
        amount: Number(expenseData.amount),
        category: expenseData.category,
        payerId: user.id
      }
    });

    return NextResponse.json({ success: true, data: newExpense });
  } catch (error) {
    console.error("API Tricount Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
