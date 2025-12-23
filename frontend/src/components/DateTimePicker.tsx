/**
 * DateTimePicker Component
 *
 * A user-friendly date and time picker following UX best practices:
 * - Separates date and time selection for clarity
 * - Visual calendar picker for intuitive date selection
 * - Time slot picker with common intervals for medical appointments
 * - Clear visual feedback and validation
 * - Mobile-friendly and accessible
 *
 * @pattern Strategy - Uses DateStrategy for timezone-safe operations
 * @see UX Research: https://www.smashingmagazine.com/2017/07/designing-perfect-date-time-picker/
 * @see Time Picker Best Practices: https://www.eleken.co/blog-posts/time-picker-ux
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { dateStrategy } from '../utils/dateStrategy';

interface DateTimePickerProps {
  label?: string;
  value: string; // ISO 8601 datetime string (YYYY-MM-DDTHH:MM)
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  minDate?: Date; // Minimum selectable date
  timeSlotInterval?: 15 | 30 | 60; // Time slot interval in minutes (default: 30)
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  label,
  value,
  onChange,
  error,
  disabled = false,
  minDate,
  timeSlotInterval = 30,
}) => {
  // Parse the value into date and time parts using Strategy Pattern
  const parseValue = (val: string) => {
    return dateStrategy.parseDateTime(val);
  };

  const { date: initialDate, time: initialTime } = parseValue(value);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedTime, setSelectedTime] = useState(initialTime);
  const [showCalendar, setShowCalendar] = useState(false);
  const [timeError, setTimeError] = useState<string>('');

  const dateButtonRef = useRef<HTMLButtonElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Update parent when date or time changes
  useEffect(() => {
    if (selectedDate && selectedTime) {
      onChange(`${selectedDate}T${selectedTime}`);
    } else if (selectedDate) {
      // If only date is selected, don't update yet
    }
  }, [selectedDate, selectedTime]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dateButtonRef.current &&
        !dateButtonRef.current.contains(target) &&
        calendarRef.current &&
        !calendarRef.current.contains(target)
      ) {
        setShowCalendar(false);
      }
    };

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCalendar]);

  // Generate time slots based on interval
  const generateTimeSlots = () => {
    const slots: string[] = [];
    const hours = 24;
    const slotsPerHour = 60 / timeSlotInterval;

    for (let h = 0; h < hours; h++) {
      for (let s = 0; s < slotsPerHour; s++) {
        const minutes = s * timeSlotInterval;
        const hour = String(h).padStart(2, '0');
        const minute = String(minutes).padStart(2, '0');
        slots.push(`${hour}:${minute}`);
      }
    }

    return slots;
  };

  const timeSlots = generateTimeSlots();

  /**
   * Calculate minimum allowed time for today
   * Rules:
   * - Current time + 1 hour minimum
   * - Round up to next 30-minute interval
   * Examples:
   * - 11:00 -> 12:00
   * - 12:00 -> 13:00
   * - 12:01 -> 13:30
   * - 13:31 -> 15:00
   */
  const calculateMinimumTime = (): string => {
    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    // Add 1 hour
    let minHours = currentHours + 1;
    let minMinutes = currentMinutes;

    // Round up to next 30-minute interval
    if (minMinutes > 0 && minMinutes <= 30) {
      minMinutes = 30;
    } else if (minMinutes > 30) {
      minMinutes = 0;
      minHours += 1;
    }

    // Handle overflow
    if (minHours >= 24) {
      minHours = 23;
      minMinutes = 30;
    }

    return `${String(minHours).padStart(2, '0')}:${String(minMinutes).padStart(2, '0')}`;
  };

  /**
   * Check if selected date is today
   */
  const isSelectedDateToday = (): boolean => {
    if (!selectedDate) return false;
    const today = new Date();
    const [year, month, day] = selectedDate.split('-').map(Number);
    return (
      day === today.getDate() &&
      month - 1 === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  /**
   * Validate if a time is allowed for the selected date
   */
  const isTimeValid = (timeStr: string): boolean => {
    if (!isSelectedDateToday()) return true;

    const minTime = calculateMinimumTime();
    return timeStr >= minTime;
  };

  // Calendar generation
  const generateCalendar = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const calendar: (number | null)[][] = [];
    let week: (number | null)[] = new Array(startingDayOfWeek).fill(null);

    for (let day = 1; day <= daysInMonth; day++) {
      week.push(day);
      if (week.length === 7) {
        calendar.push(week);
        week = [];
      }
    }

    if (week.length > 0) {
      while (week.length < 7) {
        week.push(null);
      }
      calendar.push(week);
    }

    return calendar;
  };

  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(
    selectedDate ? new Date(selectedDate).getMonth() : today.getMonth()
  );
  const [currentYear, setCurrentYear] = useState(
    selectedDate ? new Date(selectedDate).getFullYear() : today.getFullYear()
  );

  const calendar = generateCalendar(currentYear, currentMonth);

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const handleDateSelect = (day: number) => {
    const month = String(currentMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${currentYear}-${month}-${dayStr}`;

    // Check if date is in the past (compare dates only, not time)
    if (minDate) {
      // Use Strategy Pattern to avoid timezone issues
      const selected = dateStrategy.createLocalDate(currentYear, currentMonth, day);
      selected.setHours(0, 0, 0, 0);
      const minCompareDate = new Date(minDate);
      minCompareDate.setHours(0, 0, 0, 0);

      if (selected < minCompareDate) {
        return; // Don't allow past dates
      }
    }

    setSelectedDate(dateStr);

    // If selecting today, auto-set minimum allowed time
    const today = new Date();
    const isToday = (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );

    if (isToday) {
      const minTime = calculateMinimumTime();
      setSelectedTime(minTime);
      setTimeError('');
    }

    setShowCalendar(false);
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const isDateDisabled = (day: number | null) => {
    if (!day || !minDate) return false;

    // Use Strategy Pattern to create date without timezone issues
    const selected = dateStrategy.createLocalDate(currentYear, currentMonth, day);

    // Reset hours to midnight for date-only comparison (fixes day 6 being blocked)
    selected.setHours(0, 0, 0, 0);
    const minCompareDate = new Date(minDate);
    minCompareDate.setHours(0, 0, 0, 0);

    return selected < minCompareDate;
  };

  const isToday = (day: number | null) => {
    if (!day) return false;
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  };

  const isSelected = (day: number | null) => {
    if (!day || !selectedDate) return false;
    // Use Strategy Pattern for date comparison
    return dateStrategy.isDateSelected(day, selectedDate, currentMonth, currentYear);
  };

  const formatDisplayDate = (dateStr: string) => {
    // Use Strategy Pattern for date formatting
    return dateStrategy.formatDate(dateStr, monthNames);
  };

  const formatDisplayTime = (timeStr: string) => {
    if (!timeStr) return 'Seleccionar hora';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  /**
   * Handle time change with validation
   */
  const handleTimeChange = (newTime: string) => {
    // Validate if time is allowed for selected date
    if (!isTimeValid(newTime)) {
      const minTime = calculateMinimumTime();
      setTimeError(`Para citas de hoy, la hora debe ser al menos ${formatDisplayTime(minTime)}`);
      setSelectedTime(minTime);
    } else {
      setTimeError('');
      setSelectedTime(newTime);
    }
  };

  return (
    <div className="datetime-picker">
      {label && <label className="input-label">{label}</label>}

      <div className="datetime-picker-container">
        {/* Date Picker */}
        <div className="datetime-date-section">
          <label className="datetime-sublabel">Fecha</label>
          <div className="datetime-input-wrapper">
            <button
              ref={dateButtonRef}
              type="button"
              className={`datetime-input-button ${error ? 'datetime-input-error' : ''}`}
              onClick={() => !disabled && setShowCalendar(!showCalendar)}
              disabled={disabled}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span className={selectedDate ? 'datetime-input-selected' : 'datetime-input-placeholder'}>
                {formatDisplayDate(selectedDate)}
              </span>
            </button>

            {/* Calendar Dropdown */}
            {showCalendar && !disabled && dateButtonRef.current && createPortal(
              <div
                ref={calendarRef}
                className="datetime-calendar-dropdown"
                style={{
                  position: 'fixed',
                  top: `${dateButtonRef.current.getBoundingClientRect().bottom + 4}px`,
                  left: `${dateButtonRef.current.getBoundingClientRect().left}px`,
                  zIndex: 9999
                }}
              >
                {/* Calendar Header */}
                <div className="datetime-calendar-header">
                  <button
                    type="button"
                    className="datetime-calendar-nav"
                    onClick={handlePrevMonth}
                  >
                    ‹
                  </button>
                  <span className="datetime-calendar-month">
                    {monthNames[currentMonth]} {currentYear}
                  </span>
                  <button
                    type="button"
                    className="datetime-calendar-nav"
                    onClick={handleNextMonth}
                  >
                    ›
                  </button>
                </div>

                {/* Day Names */}
                <div className="datetime-calendar-days-header">
                  {dayNames.map(day => (
                    <div key={day} className="datetime-calendar-day-name">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="datetime-calendar-grid">
                  {calendar.map((week, weekIdx) => (
                    <div key={weekIdx} className="datetime-calendar-week">
                      {week.map((day, dayIdx) => (
                        <button
                          key={dayIdx}
                          type="button"
                          className={`datetime-calendar-day ${
                            day === null ? 'datetime-calendar-day-empty' : ''
                          } ${
                            isToday(day) ? 'datetime-calendar-day-today' : ''
                          } ${
                            isSelected(day) ? 'datetime-calendar-day-selected' : ''
                          } ${
                            isDateDisabled(day) ? 'datetime-calendar-day-disabled' : ''
                          }`}
                          onClick={() => day !== null && !isDateDisabled(day) && handleDateSelect(day)}
                          disabled={day === null || isDateDisabled(day)}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>,
              document.body
            )}
          </div>
        </div>

        {/* Time Picker */}
        <div className="datetime-time-section">
          <label className="datetime-sublabel">Hora</label>
          <div className="datetime-input-wrapper">
            <select
              className={`datetime-time-select ${(error || timeError) ? 'datetime-input-error' : ''} ${
                selectedTime ? 'datetime-input-selected' : 'datetime-input-placeholder'
              }`}
              value={selectedTime}
              onChange={(e) => handleTimeChange(e.target.value)}
              disabled={disabled || !selectedDate}
            >
              <option value="" disabled>
                Seleccionar hora
              </option>
              {timeSlots.map(slot => (
                <option key={slot} value={slot}>
                  {formatDisplayTime(slot)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Show error message */}
      {error && <span className="input-error-message">{error}</span>}
      {timeError && <span className="input-error-message">{timeError}</span>}
    </div>
  );
};
