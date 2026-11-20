/**
 * Datos de demostración para dashboards y gráficos.
 *
 * Genera ~6 meses de actividad realista: pacientes, ventas de paquetes,
 * órdenes de pago, pagos (con distintos métodos), citas en todos los estados
 * (incluidas las de hoy y las próximas) y comisiones.
 *
 * Todo cuelga de pacientes marcados como demo (email @demo.dermicapro.test),
 * así que se puede borrar sin tocar datos reales:
 *
 *   npm run seed:demo            → borra la demo anterior y la vuelve a crear
 *   npm run seed:demo -- --clean → solo borra la demo
 *
 * Requiere el seed base (usuarios, roles y servicios con paquetes).
 * Es determinista: la misma ejecución produce los mismos datos.
 */
import { randomUUID } from "crypto";
import { PrismaClient, AppointmentStatus, PaymentMethod, Sex } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL!),
});

const DEMO_EMAIL_DOMAIN = "demo.dermicapro.test";
const DAYS_BACK = 180;
const PATIENT_COUNT = 80;
const LIMA_OFFSET_HOURS = 5; // Lima = UTC-5, sin horario de verano
const DAY_MS = 24 * 60 * 60 * 1000;

// ── Aleatorio determinista ──────────────────────────────────────────────────
let rngState = 20261120;
const rand = () => {
  rngState = (rngState * 1664525 + 1013904223) % 4294967296;
  return rngState / 4294967296;
};
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pick = <T>(items: T[]): T => items[Math.floor(rand() * items.length)];
const weighted = <T>(options: Array<[T, number]>): T => {
  const total = options.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [value, w] of options) {
    if ((r -= w) <= 0) return value;
  }
  return options[options.length - 1][0];
};
const round2 = (n: number) => Math.round(n * 100) / 100;

// ── Fechas en hora de la clínica ────────────────────────────────────────────
const now = new Date();
const todayLima = (() => {
  const lima = new Date(now.getTime() - LIMA_OFFSET_HOURS * 3600 * 1000);
  return { y: lima.getUTCFullYear(), m: lima.getUTCMonth(), d: lima.getUTCDate() };
})();

/** Fecha a `daysFromToday` días de hoy, a la hora local de Lima indicada */
const limaDate = (daysFromToday: number, hour: number, minute = 0) =>
  new Date(Date.UTC(todayLima.y, todayLima.m, todayLima.d + daysFromToday, hour + LIMA_OFFSET_HOURS, minute));

/** Días hacia atrás con más peso en lo reciente, para que el último mes tenga movimiento */
const recentBiasedDaysAgo = (maxDays: number) => Math.floor(Math.pow(rand(), 1.6) * maxDays);

const isWorkingDay = (date: Date) => {
  const dow = new Date(date.getTime() - LIMA_OFFSET_HOURS * 3600 * 1000).getUTCDay();
  return dow !== 0; // la clínica no atiende domingos
};

// ── Nombres ─────────────────────────────────────────────────────────────────
const FIRST_F = ["María", "Lucía", "Valeria", "Camila", "Sofía", "Daniela", "Andrea", "Fiorella", "Rosa", "Milagros", "Carmen", "Ximena", "Gabriela", "Paola", "Karla", "Natalia"];
const FIRST_M = ["José", "Luis", "Carlos", "Jorge", "Miguel", "Diego", "Renzo", "Bruno", "Martín", "Óscar"];
const LAST = ["Quispe", "Flores", "Rodríguez", "Sánchez", "García", "Rojas", "Mendoza", "Chávez", "Vásquez", "Ramírez", "Torres", "Castillo", "Vargas", "Gutiérrez", "Díaz", "Alvarado", "Reyes", "Paredes", "Valverde", "Salazar"];

async function cleanDemo() {
  const patients = await prisma.patient.findMany({
    where: { email: { endsWith: `@${DEMO_EMAIL_DOMAIN}` } },
    select: { id: true },
  });
  const patientIds = patients.map((p) => p.id);
  if (patientIds.length === 0) {
    console.log("No había datos demo.");
    return;
  }

  const appointments = await prisma.appointment.findMany({ where: { patientId: { in: patientIds } }, select: { id: true } });
  const appointmentIds = appointments.map((a) => a.id);
  const instances = await prisma.serviceInstance.findMany({ where: { patientId: { in: patientIds } }, select: { id: true } });
  const instanceIds = instances.map((i) => i.id);

  // Orden inverso a las dependencias
  await prisma.commission.deleteMany({
    where: { OR: [{ appointmentId: { in: appointmentIds } }, { serviceInstanceId: { in: instanceIds } }] },
  });
  await prisma.payment.deleteMany({ where: { patientId: { in: patientIds } } });
  await prisma.session.deleteMany({ where: { appointmentId: { in: appointmentIds } } });
  await prisma.patientRecord.deleteMany({ where: { patientId: { in: patientIds } } });
  await prisma.appointmentNote.deleteMany({ where: { appointmentId: { in: appointmentIds } } });
  await prisma.appointmentAttendee.deleteMany({ where: { appointmentId: { in: appointmentIds } } });
  await prisma.appointment.deleteMany({ where: { id: { in: appointmentIds } } });
  await prisma.serviceInstance.deleteMany({ where: { id: { in: instanceIds } } });
  await prisma.paymentOrder.deleteMany({ where: { patientId: { in: patientIds } } });
  await prisma.patient.deleteMany({ where: { id: { in: patientIds } } });

  console.log(`Demo anterior borrada: ${patientIds.length} pacientes y todo lo asociado.`);
}

async function createDemo() {
  const usersByRole = async (role: string) =>
    prisma.user.findMany({ where: { role: { name: role }, isActive: true }, select: { id: true } });

  const [admins, sales, assistants, medical] = await Promise.all([
    usersByRole("admin"), usersByRole("sales"), usersByRole("assistant"), usersByRole("medical_staff"),
  ]);
  if (admins.length === 0) throw new Error("No hay usuario admin. Corre primero el seed base (npm run prisma:seed).");
  const sellers = sales.length > 0 ? sales : admins;
  const attendants = [...assistants, ...medical].length > 0 ? [...assistants, ...medical] : admins;
  const admin = admins[0];

  const packages = await prisma.servicePackage.findMany({
    where: { isActive: true, deletedAt: null, price: { gt: 0 }, service: { isActive: true, deletedAt: null } },
    select: {
      id: true, sessions: true, price: true, serviceId: true,
      service: { select: { commissionRate: true } },
    },
  });
  if (packages.length === 0) throw new Error("No hay paquetes con precio. Corre primero el seed base (npm run prisma:seed).");

  // Algunos servicios se venden mucho más que otros, como en la realidad
  const popular = packages.slice(0, Math.min(8, packages.length));

  const patients: any[] = [];
  const instances: any[] = [];
  const orders: any[] = [];
  const payments: any[] = [];
  const appointments: any[] = [];
  const sessions: any[] = [];
  const commissions: any[] = [];

  const methodWeights: Array<[PaymentMethod, number]> = [
    ["yape", 32], ["cash", 24], ["card", 20], ["plin", 14], ["transfer", 10],
  ];

  for (let p = 0; p < PATIENT_COUNT; p++) {
    const sex: Sex = rand() < 0.82 ? "F" : "M";
    const firstName = sex === "F" ? pick(FIRST_F) : pick(FIRST_M);
    const lastName = `${pick(LAST)} ${pick(LAST)}`;
    const createdAt = limaDate(-recentBiasedDaysAgo(DAYS_BACK), randInt(9, 18), randInt(0, 59));
    const patientId = randomUUID();
    const seller = pick(sellers);

    patients.push({
      id: patientId,
      firstName,
      lastName,
      dni: String(90000000 + p),
      dateOfBirth: new Date(Date.UTC(randInt(1965, 2004), randInt(0, 11), randInt(1, 28))),
      sex,
      phone: `9${randInt(10000000, 99999999)}`,
      email: `paciente${p + 1}@${DEMO_EMAIL_DOMAIN}`,
      createdById: seller.id,
      createdAt,
    });

    const purchases = rand() < 0.3 ? 2 : 1;
    for (let k = 0; k < purchases; k++) {
      const pkg = rand() < 0.7 ? pick(popular) : pick(packages);
      const daysSinceCreated = Math.floor((now.getTime() - createdAt.getTime()) / DAY_MS);
      const saleDaysAgo = Math.max(0, daysSinceCreated - randInt(0, Math.min(30, daysSinceCreated)));
      let saleDate = limaDate(-saleDaysAgo, randInt(9, 18), randInt(0, 59));
      if (saleDate > now) saleDate = new Date(now.getTime() - randInt(1, 120) * 60 * 1000);

      const originalPrice = Number(pkg.price);
      const discount = rand() < 0.2 ? round2(originalPrice * 0.1) : 0;
      const finalPrice = round2(originalPrice - discount);
      const instanceId = randomUUID();
      const orderId = randomUUID();

      // Cobro: la mayoría paga completo; algunos a cuenta; pocos todavía no pagan
      const payPlan = weighted<"full" | "partial" | "none">([["full", 62], ["partial", 26], ["none", 12]]);
      let paid = 0;
      if (payPlan === "full") {
        const installments = rand() < 0.35 ? 2 : 1;
        for (let i = 0; i < installments; i++) {
          const amount = i === installments - 1 ? round2(finalPrice - paid) : round2(finalPrice * 0.5);
          const date = new Date(Math.min(now.getTime(), saleDate.getTime() + i * randInt(5, 20) * DAY_MS));
          payments.push(makePayment(patientId, orderId, amount, date, pick(sellers).id, weighted(methodWeights)));
          paid += amount;
        }
      } else if (payPlan === "partial") {
        const amount = round2(finalPrice * (0.3 + rand() * 0.4));
        payments.push(makePayment(patientId, orderId, amount, saleDate, seller.id, weighted(methodWeights)));
        paid = amount;
      }
      const orderStatus = paid >= finalPrice ? "paid" : paid > 0 ? "partial" : "pending";

      orders.push({
        id: orderId,
        patientId,
        totalAmount: finalPrice,
        status: orderStatus,
        dueDate: new Date(saleDate.getTime() + 30 * DAY_MS),
        createdById: seller.id,
        createdAt: saleDate,
      });

      // Sesiones del paquete: una cada ~2 semanas desde la venta
      let completed = 0;
      let firstAttended: { appointmentId: string; attendedAt: Date } | null = null;
      for (let n = 1; n <= pkg.sessions; n++) {
        const offsetDays = (n - 1) * randInt(10, 18) + randInt(0, 3);
        let scheduled = new Date(saleDate.getTime() + offsetDays * DAY_MS);
        const hour = randInt(9, 18);
        scheduled = limaDate(Math.round((scheduled.getTime() - limaDate(0, 0).getTime()) / DAY_MS), hour, pick([0, 30]));
        if (!isWorkingDay(scheduled)) scheduled = new Date(scheduled.getTime() + DAY_MS);
        if (scheduled.getTime() > now.getTime() + 21 * DAY_MS) break; // solo agenda las próximas 3 semanas

        const inPast = scheduled.getTime() < now.getTime() - 60 * 60 * 1000;
        const status: AppointmentStatus = inPast
          ? weighted<AppointmentStatus>([["attended", 80], ["cancelled", 12], ["no_show", 8]])
          : "reserved";

        const appointmentId = randomUUID();
        const attendedAt = status === "attended" ? new Date(scheduled.getTime() + 50 * 60 * 1000) : null;
        appointments.push({
          id: appointmentId,
          patientId,
          scheduledDate: scheduled,
          durationMinutes: pick([45, 60, 60, 90]),
          status,
          createdById: seller.id,
          attendedById: attendedAt ? pick(attendants).id : null,
          attendedAt,
          createdAt: new Date(Math.min(saleDate.getTime(), scheduled.getTime())),
        });
        sessions.push({
          id: randomUUID(),
          appointmentId,
          serviceInstanceId: instanceId,
          sessionNumber: n,
          createdAt: saleDate,
        });

        if (status === "attended") {
          completed++;
          if (!firstAttended && attendedAt) firstAttended = { appointmentId, attendedAt };
        }
        // Si cancela una sesión, la siguiente se corre una semana
        if (status === "cancelled") saleDate = new Date(saleDate.getTime() + 7 * DAY_MS);
      }

      instances.push({
        id: instanceId,
        patientId,
        serviceId: pkg.serviceId,
        servicePackageId: pkg.id,
        totalSessions: pkg.sessions,
        completedSessions: completed,
        originalPrice,
        discount,
        finalPrice,
        paymentOrderId: orderId,
        createdById: seller.id,
        createdAt: orders[orders.length - 1].createdAt,
      });

      // La comisión nace cuando se atiende la primera sesión
      if (firstAttended) {
        const rate = Number(pkg.service.commissionRate ?? 0.1) || 0.1;
        const age = (now.getTime() - firstAttended.attendedAt.getTime()) / DAY_MS;
        const status = age > 45 ? "paid" : age > 15 ? "approved" : "pending";
        commissions.push({
          id: randomUUID(),
          salesPersonId: seller.id,
          appointmentId: firstAttended.appointmentId,
          serviceInstanceId: instanceId,
          serviceId: pkg.serviceId,
          servicePackageId: pkg.id,
          commissionRate: rate,
          baseAmount: finalPrice,
          commissionAmount: round2(finalPrice * rate),
          status,
          approvedAt: status !== "pending" ? new Date(firstAttended.attendedAt.getTime() + 7 * DAY_MS) : null,
          approvedById: status !== "pending" ? admin.id : null,
          paidAt: status === "paid" ? new Date(firstAttended.attendedAt.getTime() + 20 * DAY_MS) : null,
          paidById: status === "paid" ? admin.id : null,
          paymentMethod: status === "paid" ? "transfer" : null,
          createdAt: firstAttended.attendedAt,
        });
      }
    }
  }

  // Agenda de hoy: que el dashboard y la cola del día tengan algo que mostrar
  const todaySlots: Array<[number, AppointmentStatus]> = [
    [9, "attended"], [10, "attended"], [11, "no_show"], [12, "in_progress"], [15, "reserved"], [16, "reserved"], [17, "reserved"],
  ];
  const candidates = instances.filter((i) => i.completedSessions < i.totalSessions);
  for (const [hour, status] of todaySlots) {
    const instance = candidates.shift();
    if (!instance) break;
    const scheduled = limaDate(0, hour);
    const appointmentId = randomUUID();
    const attendedAt = status === "attended" ? new Date(scheduled.getTime() + 50 * 60 * 1000) : null;
    const usedNumbers = sessions.filter((s) => s.serviceInstanceId === instance.id).map((s) => s.sessionNumber);
    const nextNumber = Math.max(0, ...usedNumbers) + 1;
    if (nextNumber > instance.totalSessions) continue;

    appointments.push({
      id: appointmentId,
      patientId: instance.patientId,
      scheduledDate: scheduled,
      durationMinutes: 60,
      status,
      createdById: instance.createdById,
      attendedById: attendedAt ? pick(attendants).id : null,
      attendedAt,
      createdAt: new Date(now.getTime() - 3 * DAY_MS),
    });
    sessions.push({ id: randomUUID(), appointmentId, serviceInstanceId: instance.id, sessionNumber: nextNumber, createdAt: scheduled });
    if (status === "attended") instance.completedSessions++;
  }

  // Inserción por tablas, respetando dependencias
  await prisma.patient.createMany({ data: patients });
  await prisma.paymentOrder.createMany({ data: orders });
  await prisma.serviceInstance.createMany({ data: instances });
  await prisma.appointment.createMany({ data: appointments });
  await prisma.session.createMany({ data: sessions });
  await prisma.payment.createMany({ data: payments });
  await prisma.commission.createMany({ data: commissions });

  const sold = instances.reduce((s, i) => s + i.finalPrice, 0);
  const collected = payments.reduce((s, p) => s + p.amountPaid, 0);
  console.log("Demo creada:");
  console.log(`  ${patients.length} pacientes, ${instances.length} paquetes vendidos (S/ ${sold.toFixed(0)})`);
  console.log(`  ${orders.length} órdenes de pago, ${payments.length} pagos (S/ ${collected.toFixed(0)} cobrados)`);
  console.log(`  ${appointments.length} citas (${appointments.filter((a) => a.status === "reserved").length} por venir), ${commissions.length} comisiones`);
}

function makePayment(patientId: string, paymentOrderId: string, amount: number, date: Date, createdById: string, method: PaymentMethod) {
  return {
    id: randomUUID(),
    patientId,
    paymentOrderId,
    amountPaid: amount,
    paymentMethod: method,
    paymentType: "payment_order_payment" as const,
    paymentDate: date,
    createdById,
    createdAt: date,
  };
}

async function main() {
  const onlyClean = process.argv.includes("--clean");
  await cleanDemo();
  if (!onlyClean) await createDemo();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
