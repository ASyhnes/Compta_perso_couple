import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { calculateMonth } from '@/lib/calculator';

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const isGlobal = searchParams.get('global') === 'true';

    // 1. Récupérer les charges fixes
    const fixedExpenses = await prisma.fixedExpense.findMany({ include: { payer: true } });
    
    // 2. Récupérer les dépenses partagées (Tricount)
    let sharedExpenses;
    let monthData = { salaryDavid: 1800, salaryLeo: 1426 }; // Salaires par défaut

    if (isGlobal) {
      sharedExpenses = await prisma.sharedExpense.findMany({ include: { payer: true }, orderBy: { date: 'desc' } });
    } else {
      // Pour le mois en cours (simplifié pour la démo: on prend tout ce qui n'a pas de monthId spécifique ou le mois courant)
      sharedExpenses = await prisma.sharedExpense.findMany({ include: { payer: true }, orderBy: { date: 'desc' } });
    }

    // 3. Calculer les répartitions avec le moteur financier
    const calculation = calculateMonth(monthData, fixedExpenses, sharedExpenses);

    // 4. Agréger les données pour le Camembert
    const pieData = {};
    fixedExpenses.forEach(exp => {
      // Regrouper par nom ou catégorie globale
      pieData[exp.name] = (pieData[exp.name] || 0) + exp.amount;
    });
    sharedExpenses.forEach(exp => {
      pieData[exp.category] = (pieData[exp.category] || 0) + exp.amount;
    });

    const formattedPieData = Object.keys(pieData)
      .filter(key => pieData[key] > 0)
      .map(key => ({ name: key, value: pieData[key] }));

    return NextResponse.json({
      calculation,
      pieData: formattedPieData,
      sharedExpenses
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
