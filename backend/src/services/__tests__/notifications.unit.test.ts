import prisma from '../../config/database';
import { getModuleAccess } from '../moduleAccess.service';
import { getNotificationSettings, getUserNotifications, setNotificationSettings } from '../notifications.service';

jest.mock('../../config/database', () => ({ __esModule: true, default: {
  systemSetting: { findMany: jest.fn(), upsert: jest.fn() },
  product: { count: jest.fn(), findMany: jest.fn(), fields: { minStock: 'min_stock' } },
} }));
jest.mock('../moduleAccess.service', () => ({ getModuleAccess: jest.fn() }));

const db = prisma as unknown as {
  systemSetting: Record<string, jest.Mock>;
  product: Record<string, jest.Mock>;
};
const access = getModuleAccess as jest.Mock;
const canView = (view: boolean) => ({ inventory: { view } });

beforeEach(() => {
  jest.resetAllMocks();
  db.systemSetting.findMany.mockResolvedValue([]);
  db.product.count.mockResolvedValue(2);
  db.product.findMany.mockResolvedValue([{ id: 'p1', name: 'Sérum', stock: 0, minStock: 2 }]);
  access.mockResolvedValue(canView(true));
});

describe('configuración', () => {
  it('sin configurar: admin e inventario reciben el stock bajo', async () => {
    expect(await getNotificationSettings()).toEqual({ lowStock: ['admin', 'inventory'] });
  });

  it('usa lo guardado e ignora roles desconocidos', async () => {
    db.systemSetting.findMany.mockResolvedValue([
      { key: 'notifications.low_stock.roles', value: '["assistant","hacker"]' },
    ]);
    expect(await getNotificationSettings()).toEqual({ lowStock: ['assistant'] });
  });

  it('rechaza un rol inválido al guardar', async () => {
    await expect(setNotificationSettings({ lowStock: ['admin', 'otro'] }, 'u1')).rejects.toMatchObject({ statusCode: 400 });
    expect(db.systemSetting.upsert).not.toHaveBeenCalled();
  });

  it('guarda los roles sin repetir', async () => {
    await setNotificationSettings({ lowStock: ['sales', 'sales', 'admin'] }, 'u1');
    expect(db.systemSetting.upsert.mock.calls[0][0].update.value).toBe('["sales","admin"]');
  });
});

describe('notificaciones de la persona', () => {
  it('un rol que no la recibe no consulta productos', async () => {
    expect(await getUserNotifications('u1', 'sales')).toEqual({ lowStock: null });
    expect(db.product.count).not.toHaveBeenCalled();
  });

  it('un rol marcado pero sin acceso a Inventario tampoco la recibe', async () => {
    db.systemSetting.findMany.mockResolvedValue([{ key: 'notifications.low_stock.roles', value: '["accountant"]' }]);
    access.mockResolvedValue(canView(false));
    expect(await getUserNotifications('u1', 'accountant')).toEqual({ lowStock: null });
    expect(db.product.count).not.toHaveBeenCalled();
  });

  it('devuelve cuántos productos están en alerta y los primeros, agotados primero', async () => {
    const result = await getUserNotifications('u1', 'inventory');
    expect(result.lowStock?.count).toBe(2);
    expect(result.lowStock?.items).toHaveLength(1);
    const query = db.product.findMany.mock.calls[0][0];
    expect(query.where).toEqual({ isActive: true, stock: { lte: 'min_stock' } });
    expect(query.orderBy[0]).toEqual({ stock: 'asc' });
  });
});
