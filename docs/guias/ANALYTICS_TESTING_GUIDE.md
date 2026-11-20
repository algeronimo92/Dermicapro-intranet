# Analytics System - Testing Guide

## 🧪 Quick Testing Checklist

### Backend Testing

#### 1. Test Authentication
```bash
# Should return: {"error":"No token provided"}
curl http://localhost:5001/api/analytics/executive
```

#### 2. Get Admin Token
```bash
# Login as admin
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'

# Copy the "token" value from response
```

#### 3. Test Executive Summary Endpoint
```bash
# Replace YOUR_TOKEN with actual token from step 2
curl http://localhost:5001/api/analytics/executive?period=month \
  -H "Authorization: Bearer YOUR_TOKEN" | json_pp

# Expected response structure:
# {
#   "kpis": {
#     "totalRevenue": <number>,
#     "totalAppointments": <number>,
#     "attendanceRate": <number>,
#     "pendingCommissions": <number>
#   },
#   "revenueTrend": [
#     { "month": "2026-01", "value": <number> },
#     ...
#   ],
#   "topServices": [
#     {
#       "id": "<uuid>",
#       "name": "<service_name>",
#       "count": <number>,
#       "revenue": <number>
#     },
#     ...
#   ],
#   "appointmentsByStatus": [
#     {
#       "status": "reserved|attended|cancelled|no_show",
#       "count": <number>,
#       "percentage": <number>
#     },
#     ...
#   ]
# }
```

#### 4. Test Different Period Filters
```bash
# Today
curl "http://localhost:5001/api/analytics/executive?period=today" \
  -H "Authorization: Bearer YOUR_TOKEN"

# This week
curl "http://localhost:5001/api/analytics/executive?period=week" \
  -H "Authorization: Bearer YOUR_TOKEN"

# This year
curl "http://localhost:5001/api/analytics/executive?period=year" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 5. Test Other Endpoints (Should Return Placeholders)
```bash
# Financial (placeholder)
curl "http://localhost:5001/api/analytics/financial?period=month" \
  -H "Authorization: Bearer YOUR_TOKEN"
# Expected: {"message":"Financial analytics - coming soon"}

# Operations (placeholder)
curl "http://localhost:5001/api/analytics/operations?period=month" \
  -H "Authorization: Bearer YOUR_TOKEN"
# Expected: {"message":"Operations analytics - coming soon"}

# Sales (placeholder)
curl "http://localhost:5001/api/analytics/sales?period=month" \
  -H "Authorization: Bearer YOUR_TOKEN"
# Expected: {"message":"Sales analytics - coming soon"}

# Customers (placeholder)
curl "http://localhost:5001/api/analytics/customers?period=month" \
  -H "Authorization: Bearer YOUR_TOKEN"
# Expected: {"message":"Customer analytics - coming soon"}

# Services (placeholder)
curl "http://localhost:5001/api/analytics/services?period=month" \
  -H "Authorization: Bearer YOUR_TOKEN"
# Expected: {"message":"Service analytics - coming soon"}
```

---

### Frontend Testing

#### 1. Access Analytics Page
```bash
# Open browser to analytics
open http://localhost:5173/analytics

# Or manually navigate to:
# http://localhost:5173/analytics
```

#### 2. Login Requirements
- Must be logged in as admin user
- If not logged in, you'll be redirected to login page
- If logged in as non-admin, you'll see "Acceso Denegado" message

#### 3. Visual Checks

**Page Header:**
- [ ] "Analytics" title visible
- [ ] Period selector buttons: Hoy | Semana | Mes | Año
- [ ] "Mes" button is active by default

**Tabs:**
- [ ] 6 tabs visible: Resumen Ejecutivo | Finanzas | Operaciones | Ventas | Clientes | Servicios
- [ ] "Resumen Ejecutivo" tab is active by default
- [ ] Active tab has blue underline and bold text

**Executive Summary Dashboard:**
- [ ] 4 KPI cards in a responsive grid
  - [ ] "Ingresos Totales" with green left border (PEN currency format)
  - [ ] "Citas del Período" with blue left border
  - [ ] "Tasa de Asistencia" with purple left border (% format)
  - [ ] "Comisiones Pendientes" with orange left border (PEN currency)

- [ ] Revenue trend chart
  - [ ] Title: "Tendencia de Ingresos"
  - [ ] Line chart with green line
  - [ ] X-axis shows months (YYYY-MM format)
  - [ ] Y-axis shows currency values

- [ ] Appointments pie chart
  - [ ] Title: "Citas por Estado"
  - [ ] Multiple colored segments
  - [ ] Labels show: status name and percentage
  - [ ] Legend at bottom

- [ ] Top 5 services table
  - [ ] Title: "Top 5 Servicios"
  - [ ] Columns: # | Name | Ventas | Revenue
  - [ ] Numbered 1-5
  - [ ] Revenue formatted as currency

#### 4. Interactive Testing

**Period Selector:**
- [ ] Click "Hoy" - Dashboard should reload with today's data
- [ ] Click "Semana" - Dashboard should show this week's data
- [ ] Click "Año" - Dashboard should show this year's data
- [ ] Click "Mes" - Dashboard should return to monthly view
- [ ] Active button has blue background

**Tab Navigation:**
- [ ] Click "Finanzas" tab - Should show "Finanzas - Coming soon"
- [ ] Click "Operaciones" tab - Should show "Operaciones - Coming soon"
- [ ] Click "Ventas" tab - Should show "Ventas - Coming soon"
- [ ] Click "Clientes" tab - Should show "Clientes - Coming soon"
- [ ] Click "Servicios" tab - Should show "Servicios - Coming soon"
- [ ] Click "Resumen Ejecutivo" - Should return to dashboard

#### 5. Responsive Design Testing

**Desktop (1920px):**
- [ ] 4 KPI cards in one row
- [ ] Charts side by side (2/3 + 1/3 width)
- [ ] Table full width

**Tablet (768px):**
- [ ] KPI cards wrap to 2 per row
- [ ] Charts stack vertically
- [ ] Table scrollable horizontally if needed

**Mobile (375px):**
- [ ] KPI cards stack (1 per row)
- [ ] Charts full width
- [ ] Tabs scrollable horizontally

#### 6. Loading States

To test loading:
1. Open browser DevTools (F12)
2. Go to Network tab
3. Set throttling to "Slow 3G"
4. Reload analytics page
5. Should see "Cargando..." message briefly

#### 7. Error States

To test error handling:
1. Stop the backend: `docker stop dermicapro-backend`
2. Reload analytics page
3. Should see red error message: "Error: ..."
4. Start backend: `docker start dermicapro-backend`
5. Reload page - should work again

---

### Integration Testing

#### Scenario 1: New Admin User
1. Login as admin
2. Navigate to /analytics
3. See Executive Summary with real data
4. Change period to "Week"
5. Verify data updates
6. Click through all tabs
7. Return to Executive Summary

#### Scenario 2: Non-Admin User
1. Login as nurse or sales user
2. Navigate to /analytics
3. Should see "Acceso Denegado" message
4. Analytics menu item should still be visible in sidebar (for admin roles)

#### Scenario 3: Data Verification
1. Check database for recent appointments/payments
2. View Executive Summary
3. Verify KPI numbers match database
4. Check that revenue trend shows correct monthly totals
5. Verify top services match most popular services

---

### Performance Testing

#### Backend Response Times
```bash
# Measure API response time
time curl "http://localhost:5001/api/analytics/executive?period=month" \
  -H "Authorization: Bearer YOUR_TOKEN" -o /dev/null -s

# Should be < 2 seconds for typical datasets
```

#### Frontend Load Time
1. Open DevTools Performance tab
2. Start recording
3. Navigate to /analytics
4. Stop recording
5. Check metrics:
   - [ ] Time to Interactive < 3s
   - [ ] First Contentful Paint < 1s
   - [ ] Largest Contentful Paint < 2.5s

---

### Browser Compatibility

Test in multiple browsers:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

---

### Common Issues & Solutions

**Issue 1: "No token provided" error in frontend**
- Solution: Check localStorage has valid token
- Run: `localStorage.getItem('token')` in console
- If null, login again

**Issue 2: Charts not rendering**
- Solution: Check Recharts is installed
- Run: `npm list recharts` in frontend directory
- If missing: `npm install recharts`

**Issue 3: Empty data / all zeros**
- Solution: Check database has sample data
- Run SQL queries to verify appointments and payments exist

**Issue 4: 403 Forbidden error**
- Solution: Check user role
- User must have 'admin' role
- Verify: `req.user.roleName === 'admin'`

**Issue 5: TypeScript errors in frontend**
- Solution: Ensure types are properly imported
- Check: `import { ExecutiveSummaryData } from '../../types/analytics.types'`

---

## ✅ Success Criteria

The analytics system is working correctly if:

1. ✅ Backend endpoint returns valid JSON with all required fields
2. ✅ Authentication is enforced (401 without token, 403 for non-admins)
3. ✅ Period filtering changes the data returned
4. ✅ Frontend loads without console errors
5. ✅ Charts render with real data
6. ✅ KPI cards display formatted numbers
7. ✅ Tab navigation works smoothly
8. ✅ Period selector updates dashboard
9. ✅ Responsive design works on mobile/tablet/desktop
10. ✅ Loading and error states display correctly

---

## 📊 Sample Data Validation

If you see zeros or empty charts, your database might need sample data:

```sql
-- Check if you have data
SELECT COUNT(*) FROM appointments;
SELECT COUNT(*) FROM payments;
SELECT COUNT(*) FROM orders;
SELECT COUNT(*) FROM commissions;

-- If counts are 0, you need to create sample appointments and payments
-- See the seed script or create test data manually
```

---

## 🐛 Debug Mode

Enable detailed logging:

**Backend:**
```typescript
// In ExecutiveSummaryStrategy.ts
console.log('Date range:', dateRange);
console.log('KPIs:', kpis);
console.log('Revenue trend:', revenueTrend);
```

**Frontend:**
```typescript
// In ExecutiveSummary.tsx
console.log('Filters:', filters);
console.log('Data:', data);
console.log('Loading:', isLoading);
console.log('Error:', error);
```

---

## 🎯 Next Testing Phase

After Days 6-7 implementation (Financial Analytics):
- Test revenue by payment method breakdown
- Test cash flow daily data
- Test accounts receivable aging
- Test top debtors list

---

**Last Updated:** January 2026  
**Status:** Days 1-5 Testing Complete ✓
