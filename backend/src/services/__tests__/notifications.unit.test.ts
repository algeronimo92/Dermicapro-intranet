import prisma from '../../config/database';
import { getModuleAccess } from '../moduleAccess.service';
import { getUserNotifications } from '../notifications.service';

jest.mock('../../config/database', () => ({ __esModule: true, default: {
  product: { count: jest.fn(), findMany: jest.fn(), fields: { minStock: 'min_stock' } },
} }));
jest.mock('../moduleAccess.service', () => ({ getModuleAccess: jest.fn() }));

const db = prisma as unknown as { product: Record<string, jest.Mock> };
const access = getModuleAccess as jest.Mock;
const canView = (view: boolean) => ({ inventory: { view } });

beforeEach(() => {
  jest.resetAllMocks();
  db.product.count.mockResolvedValue(2);
  db.product.findMany.mockResolvedValue([{ id: 'p1', name: 'Sérum', stock: 0, minStock: 2 }]);
  access.mockResolvedValue(canView(true));
});

describe('aviso de stock bajo', () => {
  it.each(['sales', 'assistant', 'medical_staff', 'accountant'])('%s no lo recibe y no se consultan productos', async role => {
    expect(await getUserNotifications('u1', role)).toEqual({ lowStock: null });
    expect(db.product.count).not.toHaveBeenCalled();
  });

  it('inventario sin acceso a Inventario tampoco lo recibe', async () => {
    access.mockResolvedValue(canView(false));
    expect(await getUserNotifications('u1', 'inventory')).toEqual({ lowStock: null });
    expect(db.product.count).not.toHaveBeenCalled();
  });

  it.each(['admin', 'inventory'])('%s recibe cuántos y cuáles, agotados primero', async role => {
    const result = await getUserNotifications('u1', role);
    expect(result.lowStock?.count).toBe(2);
    expect(result.lowStock?.items).toHaveLength(1);
    const query = db.product.findMany.mock.calls[0][0];
    expect(query.where).toEqual({ isActive: true, stock: { lte: 'min_stock' } });
    expect(query.orderBy[0]).toEqual({ stock: 'asc' });
  });
});
