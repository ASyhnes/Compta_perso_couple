import { NextResponse } from 'next/server';
import { parseTricountExpense } from '@/lib/gemini';
import { PrismaClient } from '@prisma/client';

let prisma;

export async function POST(request) {
  if (!prisma) prisma = new PrismaClient();
  
  try {
    const { text, currentUser, context } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Texte manquant" }, { status: 400 });
    }

    // 1. Get or create current MonthRecord
    const currentMonth = new Date().toISOString().slice(0, 7);
    let record = await prisma.monthRecord.findUnique({ where: { yearMonth: currentMonth } });
    if (!record) {
      record = await prisma.monthRecord.create({
        data: { yearMonth: currentMonth, salaryDavid: 1800, salaryLeo: 1426 }
      });
    }

    // 2. Save User message
    await prisma.chatMessage.create({
      data: {
        text,
        sender: currentUser,
        monthId: record.id
      }
    });

    // 3. Call AI
    const aiResponse = await parseTricountExpense(text, currentUser, context || {});

    if (!aiResponse || !aiResponse.reply) {
      return NextResponse.json({ error: "L'IA n'a pas réussi à comprendre la demande." }, { status: 400 });
    }

    let messages = [];

    if (aiResponse.actions && Array.isArray(aiResponse.actions)) {
      for (const act of aiResponse.actions) {
        if (act.action === 'UPDATE_FIXED') {
          const fixedExpenses = await prisma.fixedExpense.findMany();
          const target = fixedExpenses.find(e => e.name.toLowerCase().includes(act.targetName.toLowerCase()) || act.targetName.toLowerCase().includes(e.name.toLowerCase()));
          
          if (target) {
            await prisma.fixedExpense.update({
              where: { id: target.id },
              data: { amount: Number(act.newAmount) }
            });
          }
        }
        else if (act.action === 'EXPENSE') {
          let username = act.payer?.toLowerCase();
          if (username !== 'david' && username !== 'leo') username = currentUser;

          const user = await prisma.user.findUnique({ where: { username } });
          if (user) {
            await prisma.sharedExpense.create({
              data: {
                description: act.description || "Dépense",
                amount: Number(act.amount),
                category: act.category || "Maison",
                payerId: user.id,
                monthId: record.id
              }
            });
          }
        }
        else if (act.action === 'UPDATE_SALARY') {
          const updateData = act.target.toLowerCase() === 'leo' 
            ? { salaryLeo: Number(act.amount) } 
            : { salaryDavid: Number(act.amount) };

          await prisma.monthRecord.update({
            where: { id: record.id },
            data: updateData
          });
        }
        else if (act.action === 'CANCEL_FIXED') {
          const fixedExpenses = await prisma.fixedExpense.findMany();
          const target = fixedExpenses.find(e => e.name.toLowerCase().includes(act.targetName.toLowerCase()) || act.targetName.toLowerCase().includes(e.name.toLowerCase()));
          
          if (target) {
            let cancelledList = [];
            try { cancelledList = JSON.parse(record.cancelledFixedExpenses); } catch(e) {}
            if (!cancelledList.includes(target.name)) {
              cancelledList.push(target.name);
            }
            await prisma.monthRecord.update({
              where: { id: record.id },
              data: { cancelledFixedExpenses: JSON.stringify(cancelledList) }
            });
          }
        }
      }
    }

    // 4. Save AI message
    await prisma.chatMessage.create({
      data: {
        text: aiResponse.reply,
        sender: 'ai',
        monthId: record.id
      }
    });

    return NextResponse.json({ success: true, message: aiResponse.reply });

  } catch (error) {
    console.error("API Tricount Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
