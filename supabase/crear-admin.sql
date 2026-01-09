-- ============================================
-- CREAR USUARIO ADMIN
-- ============================================
-- INSTRUCCIONES:
-- 1. Primero crea tu cuenta en la aplicación (ve a /login y regístrate)
-- 2. Luego ejecuta este script reemplazando 'tu_email@ejemplo.com' con tu email
-- 3. Después de ejecutar, cierra sesión y vuelve a iniciar sesión
-- ============================================

-- Reemplaza 'tu_email@ejemplo.com' con el email que usaste al registrarte
UPDATE user_profiles 
SET user_role = 'admin' 
WHERE email = 'tu_email@ejemplo.com';

-- Verificar que se actualizó correctamente
SELECT id, email, full_name, user_role 
FROM user_profiles 
WHERE email = 'tu_email@ejemplo.com';
