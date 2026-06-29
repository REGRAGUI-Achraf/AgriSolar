const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const quote = await prisma.quote.findFirst({ orderBy: { createdAt: 'desc' } });
  console.log(JSON.stringify(quote, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
