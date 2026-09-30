const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding initial data...')
  
  await prisma.sharedExpense.deleteMany()
  await prisma.fixedExpense.deleteMany()
  await prisma.monthRecord.deleteMany()
  await prisma.user.deleteMany()

  const david = await prisma.user.create({
    data: { username: 'david', password: 'david_password', defaultSalary: 1800 }
  })

  const leo = await prisma.user.create({
    data: { username: 'leo', password: 'leo_password', defaultSalary: 1426 }
  })

  const communUser = await prisma.user.create({
    data: { username: 'commun', password: 'n/a', defaultSalary: 0 }
  })

  const expenses = [
    { name: 'Essence', amount: 300, distributionRule: 'PRO_RATA', bankAccount: 'Boursorama', payerId: david.id },
    { name: 'Forfait Bouygues Box', amount: 45, distributionRule: 'PRO_RATA', bankAccount: 'Boursorama', payerId: david.id },
    { name: 'Part Amaury', amount: 150, distributionRule: 'PERSONAL', bankAccount: 'Boursorama', payerId: david.id },
    { name: 'Forfait tel perso', amount: 60, distributionRule: 'PERSONAL', bankAccount: 'Boursorama', payerId: david.id },
    { name: 'Spotify', amount: 21, distributionRule: 'PERSONAL', bankAccount: 'Boursorama', payerId: david.id },
    { name: 'Hostinger', amount: 11, distributionRule: 'PERSONAL', bankAccount: 'Boursorama', payerId: david.id },
    { name: 'Marge de sécurité', amount: 50, distributionRule: 'PERSONAL', bankAccount: 'Boursorama', payerId: david.id },
    { name: 'Abonnement Google', amount: 100, distributionRule: 'PERSONAL', bankAccount: 'Trade Republic', payerId: david.id },
    { name: 'Investissement', amount: 250, distributionRule: 'PERSONAL', bankAccount: 'Trade Republic', payerId: david.id },
    { name: 'Crédit', amount: 220, distributionRule: 'PERSONAL', bankAccount: 'Revolut', payerId: david.id },
    { name: 'Assurance perso', amount: 75, distributionRule: 'PERSONAL', bankAccount: 'Compte Perso', payerId: leo.id },
    { name: 'Loyer', amount: 750, distributionRule: 'PRO_RATA', bankAccount: 'Compte Commun', payerId: communUser.id },
    { name: 'Garage', amount: 80, distributionRule: 'PRO_RATA', bankAccount: 'Compte Commun', payerId: communUser.id },
    { name: 'Nourriture & courses', amount: 450, distributionRule: 'TWO_THIRDS', bankAccount: 'Compte Commun', payerId: communUser.id },
  ]

  for (const exp of expenses) {
    await prisma.fixedExpense.create({ data: exp })
  }

  console.log('Seed completed successfully!')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(async () => { await prisma.() })
