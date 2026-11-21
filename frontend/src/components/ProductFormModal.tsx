import React, { useEffect, useState } from 'react';
import { Camera, ImageUp, X } from 'lucide-react';
import { Modal } from './Modal';
import { CameraCaptureModal } from './CameraCaptureModal';
import { isTouchDevice } from '../utils/device';
import { Select } from './Select';
import {
  CATEGORY_LABELS,
  apiErrorMessage,
  inventoryService,
  Product,
  ProductCategory,
} from '../services/inventory.service';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (product: Product) => void;
  product?: Product | null;
  brands?: string[];
}

const EMPTY_FORM = {
  name: '',
  brand: '',
  category: 'other' as ProductCategory,
  presentation: '',
  salePrice: '',
  minStock: '2',
  barcode: '',
  initialStock: '0',
  isActive: true,
};

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }));
const PHOTO_TYPES = 'image/jpeg,image/png,image/webp';


export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  product,
  brands = [],
}) => {
  const isEdit = !!product;
  const [form, setForm] = useState(EMPTY_FORM);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setPhoto(null);
    setPreview(product?.photoUrl ?? null);
    setForm(product ? {
      name: product.name,
      brand: product.brand ?? '',
      category: product.category,
      presentation: product.presentation ?? '',
      salePrice: String(Number(product.salePrice)),
      minStock: String(product.minStock),
      barcode: product.barcode ?? '',
      initialStock: '0',
      isActive: product.isActive,
    } : EMPTY_FORM);
  }, [isOpen, product]);

  // Libera la URL temporal de la vista previa cuando cambia la foto.
  useEffect(() => () => {
    if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
  }, [preview]);

  const set = (field: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));

  const applyPhoto = (file: File) => {
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo
    if (file) applyPhoto(file);
  };

  const removePhoto = () => {
    setPhoto(null);
    setPreview(product?.photoUrl ?? null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const salePrice = Number(form.salePrice);
    const minStock = Number(form.minStock);
    const initialStock = Number(form.initialStock);
    if (!form.name.trim()) return setError('El nombre es requerido');
    if (form.salePrice === '' || !Number.isFinite(salePrice) || salePrice < 0) {
      return setError('Ingresa un precio de venta válido');
    }
    if (!Number.isInteger(minStock) || minStock < 0) return setError('El stock mínimo debe ser un entero ≥ 0');
    if (!isEdit && (!Number.isInteger(initialStock) || initialStock < 0)) {
      return setError('El stock inicial debe ser un entero ≥ 0');
    }

    const payload = {
      name: form.name.trim(),
      brand: form.brand.trim() || null,
      category: form.category,
      presentation: form.presentation.trim() || null,
      salePrice,
      minStock,
      barcode: form.barcode.trim() || null,
      isActive: form.isActive,
    };

    setSaving(true);
    try {
      let saved = isEdit
        ? await inventoryService.updateProduct(product!.id, payload)
        : await inventoryService.createProduct({ ...payload, initialStock });
      if (photo) saved = await inventoryService.uploadPhoto(saved.id, photo);
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudo guardar el producto'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Editar producto' : 'Nuevo producto'} size="medium">
      <form onSubmit={handleSubmit}>
        {error && <div className="alert alert-error" style={{ marginBottom: 'var(--spacing-md)' }}>{error}</div>}

        <div className="product-form">
          <div className="product-form__photo-block">
            <div className="product-form__photo">
              {preview ? <img src={preview} alt="Foto del producto" /> : <span>Sin foto</span>}
              {photo && (
                <button type="button" className="product-form__photo-clear" onClick={removePhoto} aria-label="Quitar la foto nueva">
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="product-form__photo-actions">
              <label className="product-form__photo-btn">
                <ImageUp size={16} aria-hidden /> Subir foto
                <input type="file" accept={PHOTO_TYPES} onChange={handlePhoto} hidden />
              </label>
              {isTouchDevice() ? (
                <label className="product-form__photo-btn">
                  <Camera size={16} aria-hidden /> Tomar foto
                  <input type="file" accept={PHOTO_TYPES} capture="environment" onChange={handlePhoto} hidden />
                </label>
              ) : (
                <button type="button" className="product-form__photo-btn" onClick={() => setCameraOpen(true)}>
                  <Camera size={16} aria-hidden /> Tomar foto
                </button>
              )}
            </div>
          </div>

          <div className="product-form__fields">
            <div>
              <label className="field-label">Nombre *</label>
              <input
                type="text" value={form.name} onChange={set('name')}
                placeholder="Ej: Cicalfate+ Crema reparadora"
                className="filter-select-modern" style={{ width: '100%' }} maxLength={150}
              />
            </div>
            <div className="product-form__row">
              <div>
                <label className="field-label">Marca</label>
                <input
                  type="text" value={form.brand} onChange={set('brand')}
                  placeholder="Ej: Avène" list="product-brands"
                  className="filter-select-modern" style={{ width: '100%' }} maxLength={80}
                />
                <datalist id="product-brands">
                  {brands.map(b => <option key={b} value={b} />)}
                </datalist>
              </div>
              <div>
                <label className="field-label">Presentación</label>
                <input
                  type="text" value={form.presentation} onChange={set('presentation')}
                  placeholder="Ej: 50 ml, 40 g, Talla M"
                  className="filter-select-modern" style={{ width: '100%' }} maxLength={60}
                />
              </div>
            </div>
            <Select
              label="Categoría"
              options={CATEGORY_OPTIONS}
              value={form.category}
              onChange={set('category')}
            />
          </div>
        </div>

        <div className="product-form__row product-form__row--3" style={{ marginTop: 'var(--spacing-md)' }}>
          <div>
            <label className="field-label">Precio de venta (S/) *</label>
            <input
              type="number" min="0" step="0.01" value={form.salePrice} onChange={set('salePrice')}
              className="filter-select-modern" style={{ width: '100%' }} placeholder="0.00"
            />
          </div>
          <div>
            <label className="field-label">Stock mínimo</label>
            <input
              type="number" min="0" step="1" value={form.minStock} onChange={set('minStock')}
              className="filter-select-modern" style={{ width: '100%' }}
            />
          </div>
          {isEdit ? (
            <div>
              <label className="field-label">Stock actual</label>
              <div className="product-form__readonly">{product!.stock} und.</div>
            </div>
          ) : (
            <div>
              <label className="field-label">Stock inicial</label>
              <input
                type="number" min="0" step="1" value={form.initialStock} onChange={set('initialStock')}
                className="filter-select-modern" style={{ width: '100%' }}
              />
            </div>
          )}
        </div>

        <div style={{ marginTop: 'var(--spacing-md)' }}>
          <label className="field-label">Código de barras (opcional)</label>
          <input
            type="text" value={form.barcode} onChange={set('barcode')}
            className="filter-select-modern" style={{ width: '100%' }} maxLength={64}
          />
        </div>

        {isEdit && (
          <>
            <p className="product-form__hint">
              El stock no se edita aquí: usa «Registrar movimiento» para entradas, salidas o ajustes.
            </p>
            <label className="checkbox-modern" style={{ cursor: 'pointer', marginTop: 'var(--spacing-sm)' }}>
              <input
                type="checkbox" checked={form.isActive}
                onChange={(e) => setForm(f => ({ ...f, isActive: e.target.checked }))}
              />
              <span className="checkbox-custom" />
              <span style={{ fontSize: 'var(--font-size-sm)' }}>Producto activo</span>
            </label>
          </>
        )}

        <div className="modal-actions">
          <button type="button" className="action-btn secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="action-btn primary" disabled={saving}>
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </div>
      </form>

      <CameraCaptureModal
        isOpen={cameraOpen}
        title="Tomar foto del producto"
        filePrefix="producto"
        onClose={() => setCameraOpen(false)}
        onCapture={(file) => { applyPhoto(file); setCameraOpen(false); }}
      />
    </Modal>
  );
};
