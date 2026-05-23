DELETE FROM appointments;
DELETE FROM loyalty_balances;
DELETE FROM point_transactions;
DELETE FROM services;
DELETE FROM practitioners;
DELETE FROM salons WHERE owner_id IN (SELECT id FROM profiles WHERE role != 'admin' OR role IS NULL);
DELETE FROM profiles WHERE role != 'admin' OR role IS NULL;
