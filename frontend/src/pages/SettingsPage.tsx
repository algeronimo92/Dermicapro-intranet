import React from 'react';
import { useTheme, ThemeMode } from '../contexts/ThemeContext';

const SettingsPage: React.FC = () => {
  const { mode, resolvedTheme, setMode } = useTheme();

  const handleThemeChange = (newMode: ThemeMode) => {
    setMode(newMode);
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1 className="settings-title">Configuración</h1>
        <p className="settings-subtitle">Personaliza la apariencia y preferencias de DermicaPro</p>
      </div>

      <div className="settings-content">
        {/* Sección de Apariencia */}
        <section className="settings-section">
          <div className="settings-section-header">
            <h2 className="settings-section-title">Apariencia</h2>
            <p className="settings-section-description">
              Personaliza cómo se ve DermicaPro en tu dispositivo
            </p>
          </div>

          <div className="settings-group">
            <label className="settings-label">Tema</label>
            <p className="settings-hint">
              Selecciona el tema de color de la interfaz
              {mode === 'auto' && (
                <span className="settings-hint-accent">
                  {' '}(Actualmente usando: {resolvedTheme === 'dark' ? 'Oscuro' : 'Claro'})
                </span>
              )}
            </p>

            <div className="theme-options">
              {/* Opción: Claro */}
              <button
                type="button"
                className={`theme-option ${mode === 'light' ? 'theme-option-active' : ''}`}
                onClick={() => handleThemeChange('light')}
              >
                <div className="theme-option-preview theme-option-preview-light">
                  <div className="theme-preview-header"></div>
                  <div className="theme-preview-sidebar"></div>
                  <div className="theme-preview-content">
                    <div className="theme-preview-card"></div>
                    <div className="theme-preview-card"></div>
                  </div>
                </div>
                <div className="theme-option-info">
                  <span className="theme-option-icon">☀️</span>
                  <div>
                    <div className="theme-option-name">Claro</div>
                    <div className="theme-option-desc">Tema con colores claros</div>
                  </div>
                </div>
                {mode === 'light' && (
                  <div className="theme-option-check">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        fill="currentColor"
                      />
                    </svg>
                  </div>
                )}
              </button>

              {/* Opción: Oscuro */}
              <button
                type="button"
                className={`theme-option ${mode === 'dark' ? 'theme-option-active' : ''}`}
                onClick={() => handleThemeChange('dark')}
              >
                <div className="theme-option-preview theme-option-preview-dark">
                  <div className="theme-preview-header"></div>
                  <div className="theme-preview-sidebar"></div>
                  <div className="theme-preview-content">
                    <div className="theme-preview-card"></div>
                    <div className="theme-preview-card"></div>
                  </div>
                </div>
                <div className="theme-option-info">
                  <span className="theme-option-icon">🌙</span>
                  <div>
                    <div className="theme-option-name">Oscuro</div>
                    <div className="theme-option-desc">Tema con colores oscuros</div>
                  </div>
                </div>
                {mode === 'dark' && (
                  <div className="theme-option-check">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        fill="currentColor"
                      />
                    </svg>
                  </div>
                )}
              </button>

              {/* Opción: Automático */}
              <button
                type="button"
                className={`theme-option ${mode === 'auto' ? 'theme-option-active' : ''}`}
                onClick={() => handleThemeChange('auto')}
              >
                <div className="theme-option-preview theme-option-preview-auto">
                  <div className="theme-preview-split">
                    <div className="theme-preview-half theme-preview-half-light">
                      <div className="theme-preview-header"></div>
                      <div className="theme-preview-content">
                        <div className="theme-preview-card"></div>
                      </div>
                    </div>
                    <div className="theme-preview-half theme-preview-half-dark">
                      <div className="theme-preview-header"></div>
                      <div className="theme-preview-content">
                        <div className="theme-preview-card"></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="theme-option-info">
                  <span className="theme-option-icon">🌓</span>
                  <div>
                    <div className="theme-option-name">Automático</div>
                    <div className="theme-option-desc">Sigue la configuración del sistema</div>
                  </div>
                </div>
                {mode === 'auto' && (
                  <div className="theme-option-check">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        fill="currentColor"
                      />
                    </svg>
                  </div>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Sección de Información */}
        <section className="settings-section">
          <div className="settings-section-header">
            <h2 className="settings-section-title">Información</h2>
            <p className="settings-section-description">
              Detalles sobre la aplicación
            </p>
          </div>

          <div className="settings-info-grid">
            <div className="settings-info-item">
              <span className="settings-info-label">Versión</span>
              <span className="settings-info-value">1.0.0</span>
            </div>
            <div className="settings-info-item">
              <span className="settings-info-label">Aplicación</span>
              <span className="settings-info-value">DermicaPro</span>
            </div>
            <div className="settings-info-item">
              <span className="settings-info-label">Última actualización</span>
              <span className="settings-info-value">Diciembre 2025</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsPage;
