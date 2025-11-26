class AuthManager {
  constructor() {
    this.currentUser = null;
    this.isAdmin = false;
    this.isMember = false;
    this.loadUserFromStorage();
  }

  loadUserFromStorage() {
    const memberUser = localStorage.getItem('user');
    const currentUser = localStorage.getItem('currentUser');
    
    if (memberUser) {
      try {
        this.currentUser = JSON.parse(memberUser);
        this.isAdmin = false;
        this.isMember = this.currentUser.is_admin === false;
      } catch (error) {
        console.error('Error parsing member user:', error);
        this.clearAuth();
      }
    } else if (currentUser) {
      try {
        this.currentUser = JSON.parse(currentUser);
        this.isAdmin = this.currentUser.is_admin === true;
        this.isMember = this.currentUser.is_admin === false;
      } catch (error) {
        console.error('Error parsing app1 user:', error);
        this.clearAuth();
      }
    }
  }

  isUserAdmin() {
    return this.isAdmin && this.currentUser && this.currentUser.is_admin === true;
  }

  isUserMember() {
    return this.isMember && this.currentUser && this.currentUser.is_admin === false;
  }

  isAuthenticated() {
    return this.currentUser !== null;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  canAccessMemberRoutes() {
    return this.isUserMember();
  }

  clearAuth() {
    this.currentUser = null;
    this.isAdmin = false;
    this.isMember = false;
    localStorage.removeItem('user');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('isLoggedIn');
  }
}

const authManager = new AuthManager();

// Función para verificar acceso a rutas protegidas
function checkRouteAccess(route) {
  const memberRoutes = [
    '/parties',
    '/member-dashboard',
    '/profile',
    '/edit-profile',
    '/event-details'
  ];

  const publicRoutes = [
    '/welcome',
    '/',
    '/login',
    '/register'
  ];

  // Si es una ruta pública, permitir acceso
  if (publicRoutes.includes(route)) {
    return true;
  }

  // Si es una ruta de miembro, solo permitir a miembros
  if (memberRoutes.includes(route)) {
    if (!authManager.canAccessMemberRoutes()) {
      return false;
    }
    return true;
  }

  // Para cualquier otra ruta, verificar que el usuario esté autenticado
  if (!authManager.isAuthenticated()) {
    return false;
  }

  return true;
}

// Función para manejar redirecciones no autorizadas
function handleUnauthorizedAccess(route) {
  // Si el usuario es admin, redirigir a app2
  if (authManager.isUserAdmin()) {
    console.log('Admin detected in app1, redirecting to app2');
    window.location.href = '/app2/admin-dashboard';
    return;
  }
  
  // Si no hay usuario autenticado, ir a welcome
  if (!authManager.isAuthenticated()) {
    window.location.href = '/welcome';
    return;
  }
  
  // Si es miembro, redirigir a member-dashboard
  if (authManager.isUserMember()) {
    window.location.href = '/member-dashboard';
  } else {
    window.location.href = '/welcome';
  }
}

// Interceptor para prevenir que admins accedan a app1
function preventAdminAccess() {
  if (authManager.isUserAdmin()) {
    console.log('Admin detected in app1, redirecting to app2');
    window.location.href = '/app2/admin-dashboard';
    return;
  }
}

// Ejecutar verificación al cargar la página
preventAdminAccess();

// Eliminado intervalo de redirección automática

export { authManager, checkRouteAccess, handleUnauthorizedAccess };
