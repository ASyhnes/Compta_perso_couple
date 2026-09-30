const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding initial data...')
  
  // Clean DB
  await prisma.sharedExpense.deleteMany()
  await prisma.fixedExpense.deleteMany()
  await prisma.monthRecord.deleteMany()
  await prisma.user.deleteMany()

  // 1. Create Users
  const david = await prisma.user.create({
    data: {
      username: 'david',
      password: 'david_password', // to change in production
      defaultSalary: 1800,
    }
  })

  const leo = await prisma.user.create({
    data: {
      username: 'leo',
      password: 'leo_password', // to change in production
      defaultSalary: 1426, // SMIC Net
    }
  })

  // 2. Create Fixed Expenses for David
  const davidExpenses = [
    { name: 'Garage', amount: 80, distributionRule: 'PRO_RATA' },
    { name: 'Box Bouygues', amount: 48, distributionRule: 'PRO_RATA' },
    { name: 'Revolut Crédit', amount: 220, distributionRule: 'PERSONAL' },
    { name: 'Espèces Amaury', amount: 150, distributionRule: 'PERSONAL' },
    { name: 'Forfait Bouygues', amount: 60, distributionRule: 'PERSONAL' },
    { name: 'Spotify', amount: 21, distributionRule: 'PERSONAL' },
    { name: 'Mutuelle', amount: 15, distributionRule: 'PERSONAL' },
    { name: 'Hostinger', amount: 11, distributionRule: 'PERSONAL' },
    { name: 'Marge', amount: 50, distributionRule: 'PERSONAL' },
    { name: 'Abonnement Google', amount: 100, distributionRule: 'PERSONAL' },
    { name: 'Investissement', amount: 250, distributionRule: 'PERSONAL' },
  ]

  for (const exp of davidExpenses) {
    await prisma.fixedExpense.create({
      data: {
        ...exp,
        payerId: david.id,
      }
    })
  }

  // 3. Create Fixed Expenses for Léo
  const leoExpenses = [
    { name: 'Assurance auto', amount: 48, distributionRule: 'PRO_RATA' },
  ]

  for (const exp of leoExpenses) {
    await prisma.fixedExpense.create({
      data: {
        ...exp,
        payerId: leo.id,
      }
    })
  }

  // 4. Create Compte Commun Fixed Expenses (we assign a dummy user or assign to david/leo with a special rule)
  // Since they are paid FROM the Compte Commun, they don't generate a "compensation" in the final transfer (just lower the shared pool).
  // But wait, they are part of the target pool. The target pool is what needs to be funded.
  // Actually we can assign them to a virtual "Commum" user or just distribute them.
  const communUser = await prisma.user.create({
    data: {
      username: 'commun',
      password: 'n/a',
      defaultSalary: 0,
    }
  })

  const sharedCharges = [
    { name: 'Nourriture & courses', amount: 450, distributionRule: 'TWO_THIRDS' },
    { name: 'Loyer', amount: 750, distributionRule: 'PRO_RATA' },
    { name: 'Essence', amount: 300, distributionRule: 'PRO_RATA' },
  ]

  for (const exp of sharedCharges) {
    await prisma.fixedExpense.create({
      data: {
        ...exp,
        payerId: communUser.id,
      }
    })
  }

  console.log('Seed completed successfully!')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
