import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { BodyMeasurement } from '../types';

interface BodyMeasurementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    weight?: number | null;
    bodyMeasurement?: BodyMeasurement;
    healthNotes?: string;
  }) => Promise<void>;
  initialData?: {
    weight?: number | null;
    bodyMeasurement?: BodyMeasurement;
    healthNotes?: string;
  };
  lastMeasurement?: {
    weight?: number | null;
    height?: number | null;
  };
}

export const BodyMeasurementsModal: React.FC<BodyMeasurementsModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  lastMeasurement,
}) => {
  const [weight, setWeight] = useState<string>('');
  const [healthNotes, setHealthNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Medidas básicas en cm
  const [height, setHeight] = useState<string>('');

  // Medidas corporales en cm
  const [waist, setWaist] = useState<string>('');
  const [chest, setChest] = useState<string>('');
  const [hips, setHips] = useState<string>('');
  const [leftArm, setLeftArm] = useState<string>('');
  const [rightArm, setRightArm] = useState<string>('');
  const [leftThigh, setLeftThigh] = useState<string>('');
  const [rightThigh, setRightThigh] = useState<string>('');
  const [leftCalf, setLeftCalf] = useState<string>('');
  const [rightCalf, setRightCalf] = useState<string>('');

  // Grosor de piel/grasa en mm
  const [abdomen, setAbdomen] = useState<string>('');
  const [triceps, setTriceps] = useState<string>('');
  const [subscapular, setSubscapular] = useState<string>('');
  const [suprailiac, setSuprailiac] = useState<string>('');
  const [thigh, setThigh] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      // Usar initialData si existe, sino usar lastMeasurement para peso y altura
      setWeight(initialData?.weight?.toString() || lastMeasurement?.weight?.toString() || '');
      setHealthNotes(initialData?.healthNotes || '');

      const bm = initialData?.bodyMeasurement;
      if (bm) {
        setHeight(bm.height?.toString() || lastMeasurement?.height?.toString() || '');
        setWaist(bm.waist?.toString() || '');
        setChest(bm.chest?.toString() || '');
        setHips(bm.hips?.toString() || '');
        setLeftArm(bm.leftArm?.toString() || '');
        setRightArm(bm.rightArm?.toString() || '');
        setLeftThigh(bm.leftThigh?.toString() || '');
        setRightThigh(bm.rightThigh?.toString() || '');
        setLeftCalf(bm.leftCalf?.toString() || '');
        setRightCalf(bm.rightCalf?.toString() || '');
        setAbdomen(bm.abdomen?.toString() || '');
        setTriceps(bm.triceps?.toString() || '');
        setSubscapular(bm.subscapular?.toString() || '');
        setSuprailiac(bm.suprailiac?.toString() || '');
        setThigh(bm.thigh?.toString() || '');
      } else if (lastMeasurement?.height) {
        // Si no hay bodyMeasurement pero hay altura histórica, usarla
        setHeight(lastMeasurement.height.toString());
      }
    }
  }, [isOpen, initialData, lastMeasurement]);

  // Calcular IMC
  const calculateBMI = (): number | null => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    if (!w || !h || h === 0) return null;
    // IMC = peso(kg) / (altura(m))^2
    const heightInMeters = h / 100;
    return w / (heightInMeters * heightInMeters);
  };

  const getBMICategory = (bmi: number): { label: string; color: string; bg: string } => {
    if (bmi < 18.5) return { label: 'Bajo peso', color: '#3b82f6', bg: '#eff6ff' };
    if (bmi < 25) return { label: 'Peso normal', color: '#10b981', bg: '#f0fdf4' };
    if (bmi < 30) return { label: 'Sobrepeso', color: '#f59e0b', bg: '#fef3c7' };
    return { label: 'Obesidad', color: '#ef4444', bg: '#fee2e2' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const bodyMeasurement: BodyMeasurement = {};

      // Solo incluir valores que no estén vacíos
      if (height) bodyMeasurement.height = parseFloat(height);
      if (waist) bodyMeasurement.waist = parseFloat(waist);
      if (chest) bodyMeasurement.chest = parseFloat(chest);
      if (hips) bodyMeasurement.hips = parseFloat(hips);
      if (leftArm) bodyMeasurement.leftArm = parseFloat(leftArm);
      if (rightArm) bodyMeasurement.rightArm = parseFloat(rightArm);
      if (leftThigh) bodyMeasurement.leftThigh = parseFloat(leftThigh);
      if (rightThigh) bodyMeasurement.rightThigh = parseFloat(rightThigh);
      if (leftCalf) bodyMeasurement.leftCalf = parseFloat(leftCalf);
      if (rightCalf) bodyMeasurement.rightCalf = parseFloat(rightCalf);
      if (abdomen) bodyMeasurement.abdomen = parseFloat(abdomen);
      if (triceps) bodyMeasurement.triceps = parseFloat(triceps);
      if (subscapular) bodyMeasurement.subscapular = parseFloat(subscapular);
      if (suprailiac) bodyMeasurement.suprailiac = parseFloat(suprailiac);
      if (thigh) bodyMeasurement.thigh = parseFloat(thigh);

      await onSubmit({
        weight: weight ? parseFloat(weight) : null,
        bodyMeasurement: Object.keys(bodyMeasurement).length > 0 ? bodyMeasurement : undefined,
        healthNotes: healthNotes.trim() || undefined,
      });

      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al guardar medidas');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Medidas Corporales">
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px',
            color: '#991b1b',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {/* Peso y Altura */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Peso (kg)
            </label>
            <input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="Ej: 70.5"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Altura (cm)
            </label>
            <input
              type="number"
              step="0.1"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="Ej: 165.5"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit'
              }}
            />
          </div>
        </div>

        {/* Indicador de IMC */}
        {(() => {
          const bmi = calculateBMI();
          if (!bmi) return null;

          const category = getBMICategory(bmi);

          return (
            <div style={{
              background: category.bg,
              border: `2px solid ${category.color}`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  color: category.color,
                  marginBottom: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Índice de Masa Corporal (IMC)
                </div>
                <div style={{
                  fontSize: '14px',
                  color: category.color,
                  fontWeight: '600'
                }}>
                  {category.label}
                </div>
              </div>
              <div style={{
                fontSize: '28px',
                fontWeight: '700',
                color: category.color
              }}>
                {bmi.toFixed(1)}
              </div>
            </div>
          );
        })()}

        {/* Medidas Corporales en cm */}
        <div style={{
          background: '#eff6ff',
          border: '2px solid #3b82f6',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: '700',
            color: '#1e40af',
            marginBottom: '16px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Medidas Corporales (cm)
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px'
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Cintura
              </label>
              <input
                type="number"
                step="0.1"
                value={waist}
                onChange={(e) => setWaist(e.target.value)}
                placeholder="cm"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #bfdbfe',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Pecho
              </label>
              <input
                type="number"
                step="0.1"
                value={chest}
                onChange={(e) => setChest(e.target.value)}
                placeholder="cm"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #bfdbfe',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Cadera
              </label>
              <input
                type="number"
                step="0.1"
                value={hips}
                onChange={(e) => setHips(e.target.value)}
                placeholder="cm"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #bfdbfe',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Brazo Izq.
              </label>
              <input
                type="number"
                step="0.1"
                value={leftArm}
                onChange={(e) => setLeftArm(e.target.value)}
                placeholder="cm"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #bfdbfe',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Brazo Der.
              </label>
              <input
                type="number"
                step="0.1"
                value={rightArm}
                onChange={(e) => setRightArm(e.target.value)}
                placeholder="cm"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #bfdbfe',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Muslo Izq.
              </label>
              <input
                type="number"
                step="0.1"
                value={leftThigh}
                onChange={(e) => setLeftThigh(e.target.value)}
                placeholder="cm"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #bfdbfe',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Muslo Der.
              </label>
              <input
                type="number"
                step="0.1"
                value={rightThigh}
                onChange={(e) => setRightThigh(e.target.value)}
                placeholder="cm"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #bfdbfe',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Pantorrilla Izq.
              </label>
              <input
                type="number"
                step="0.1"
                value={leftCalf}
                onChange={(e) => setLeftCalf(e.target.value)}
                placeholder="cm"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #bfdbfe',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Pantorrilla Der.
              </label>
              <input
                type="number"
                step="0.1"
                value={rightCalf}
                onChange={(e) => setRightCalf(e.target.value)}
                placeholder="cm"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #bfdbfe',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>
        </div>

        {/* Grosor de Piel/Grasa en mm */}
        <div style={{
          background: '#fef3c7',
          border: '2px solid #f59e0b',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: '700',
            color: '#92400e',
            marginBottom: '16px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Grosor de Piel/Grasa (mm)
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px'
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Abdomen
              </label>
              <input
                type="number"
                step="0.1"
                value={abdomen}
                onChange={(e) => setAbdomen(e.target.value)}
                placeholder="mm"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #fde68a',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Tríceps
              </label>
              <input
                type="number"
                step="0.1"
                value={triceps}
                onChange={(e) => setTriceps(e.target.value)}
                placeholder="mm"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #fde68a',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Subescapular
              </label>
              <input
                type="number"
                step="0.1"
                value={subscapular}
                onChange={(e) => setSubscapular(e.target.value)}
                placeholder="mm"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #fde68a',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Suprailiaco
              </label>
              <input
                type="number"
                step="0.1"
                value={suprailiac}
                onChange={(e) => setSuprailiac(e.target.value)}
                placeholder="mm"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #fde68a',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Muslo
              </label>
              <input
                type="number"
                step="0.1"
                value={thigh}
                onChange={(e) => setThigh(e.target.value)}
                placeholder="mm"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid #fde68a',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>
        </div>

        {/* Notas de Salud */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Notas de Salud
          </label>
          <textarea
            value={healthNotes}
            onChange={(e) => setHealthNotes(e.target.value)}
            placeholder="Observaciones generales sobre el estado de salud del paciente..."
            rows={4}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <Button
            type="button"
            onClick={onClose}
            variant="secondary"
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : 'Guardar Medidas'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
