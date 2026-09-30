import { NextResponse } from 'next/server';
import { parseTricountExpense } from '@/lib/gemini';
import { PrismaClient } from '@prisma/client';

let prisma;

export async function POST(request) {
  if (!prisma) prisma = new PrismaClient();
  
  try {
    const { text, currentUser } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Texte manquant" }, { status: 400 });
    }

    const aiResponse = await parseTricountExpense(text, currentUser);

    if (!aiResponse || !aiResponse.actions || !Array.isArray(aiResponse.actions)) {
      return NextResponse.json({ error: "L'IA n'a pas réussi à comprendre la demande." }, { status: 400 });
    }

    let messages = [];

    // On traite chaque action de manière séquentielle
    for (const act of aiResponse.actions) {
      if (act.action === 'UPDATE_FIXED') {
        const fixedExpenses = await prisma.fixedExpense.findMany();
        const target = fixedExpenses.find(e => e.name.toLowerCase().includes(act.targetName.toLowerCase()) || act.targetName.toLowerCase().includes(e.name.toLowerCase()));
        
        if (target) {
          await prisma.fixedExpense.update({
            where: { id: target.id },
            data: { amount: Number(act.newAmount) }
          });
          messages.push(`Charge fixe ${target.name} modifiée à ${act.newAmount}€.`);
        }
      }

      else if (act.action === 'EXPENSE') {
        let username = act.payer?.toLowerCase();
        if (username !== 'david' && username !== 'leo') username = 'david';

        const user = await prisma.user.findUnique({ where: { username } });
        if (user) {
          await prisma.sharedExpense.create({
            data: {
              description: act.description || "Dépense",
              amount: Number(act.amount),
              category: act.category || "Maison",
              payerId: user.id
            }
          });
          messages.push(`Dépense de ${act.amount}€ (${act.category}) par ${username} ajoutée.`);
        }
      }

      else if (act.action === 'UPDATE_SALARY') {
        // Enregistrer temporairement le salaire du mois en cours
        const currentMonth = new Date().toISOString().slice(0, 7);
        let record = await prisma.monthRecord.findUnique({ where: { yearMonth: currentMonth } });
        
        const updateData = act.target.toLowerCase() === 'leo' 
          ? { salaryLeo: Number(act.amount) } 
          : { salaryDavid: Number(act.amount) };

        if (record) {
          await prisma.monthRecord.update({
            where: { id: record.id },
            data: updateData
          });
        } else {
          await prisma.monthRecord.create({
            data: {
              yearMonth: currentMonth,
              salaryDavid: 1800, // default
              salaryLeo: 1426, // default
              ...updateData
            }
          });
        }
        messages.push(`Salaire de ${act.target} mis à jour à ${act.amount}€ pour ce mois.`);
      }
    }

    return NextResponse.json({ success: true, message: messages.join('\n') });

  } catch (error) {
    console.error("API Tricount Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
