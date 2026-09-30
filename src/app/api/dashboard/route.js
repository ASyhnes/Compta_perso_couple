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
    
    let sharedExpenses;
    let monthData = { salaryDavid: 1800, salaryLeo: 1426 };

    if (isGlobal) {
      sharedExpenses = await prisma.sharedExpense.findMany({ include: { payer: true }, orderBy: { date: 'desc' } });
    } else {
      sharedExpenses = await prisma.sharedExpense.findMany({ include: { payer: true }, orderBy: { date: 'desc' } });
    }

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
      sharedExpenses
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
