import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { calculateMonth } from '@/lib/calculator';

let prisma;

export async function GET(request) {
  if (!prisma) prisma = new PrismaClient();

  try {
    const { searchParams } = new URL(request.url);
    const isGlobal = searchParams.get('global') === 'true';

    const fixedExpenses = await prisma.fixedExpense.findMany({ include: { payer: true } });
    
    let sharedExpenses = await prisma.sharedExpense.findMany({ include: { payer: true }, orderBy: { date: 'desc' } });
    
    const currentMonth = new Date().toISOString().slice(0, 7);
    let monthRecord = await prisma.monthRecord.findUnique({ 
      where: { yearMonth: currentMonth },
      include: { chatMessages: { orderBy: { date: 'asc' } } }
    });
    
    let monthData = monthRecord || { salaryDavid: 1800, salaryLeo: 1426, chatMessages: [], cancelledFixedExpenses: "[]", modifiedFixedExpenses: "{}" };

    let modifiedFixed = {};
    try {
      if (monthData.modifiedFixedExpenses) {
        modifiedFixed = JSON.parse(monthData.modifiedFixedExpenses);
      }
    } catch(e) {}

    // Apply temporary modifications for this month
    fixedExpenses.forEach(exp => {
      if (modifiedFixed[exp.name] !== undefined) {
        exp.amount = modifiedFixed[exp.name];
        exp.isModifiedThisMonth = true;
      }
    });

    const calculation = calculateMonth(monthData, fixedExpenses, sharedExpenses);

    const pieData = {};
    fixedExpenses.forEach(exp => {
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
      sharedExpenses,
      fixedExpenses,
      monthData
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
