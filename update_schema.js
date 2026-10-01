const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

schema = schema.replace(
  /model MonthRecord \{/,
  `model MonthRecord {\n  cancelledFixedExpenses String @default("[]")`
);

schema += `\nmodel ChatMessage {\n  id        String   @id @default(uuid())\n  text      String\n  sender    String   // "david", "leo", or "ai"\n  date      DateTime @default(now())\n  monthId   String\n  month     MonthRecord @relation(fields: [monthId], references: [id])\n}\n`;

fs.writeFileSync('prisma/schema.prisma', schema, 'utf8');
