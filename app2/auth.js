class AuthManager {
  constructor() {
    this.currentUser = null;
    this.isAdmin = false;
    this.isMember = false;
    this.loadUserFromStorage();
  }

  loadUserFromStorage() {
    const adminUser = localStorage.getItem('adminUser');
    if (adminUser) {
      try {
        this.currentUser = JSON.parse(adminUser);
        this.isAdmin = this.currentUser.is_admin === true;
        this.isMember = false;
      } catch (error) {
        console.error('Error parsing admin user:', error);
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

  setAdminUser(userData) {
    this.currentUser = userData;
    this.isAdmin = true;
    this.isMember = false;
    localStorage.setItem('adminUser', JSON.stringify(userData));
  }

  setMemberUser(userData) {
    this.currentUser = userData;
    this.isAdmin = false;
    this.isMember = true;
    localStorage.setItem('user', JSON.stringify(userData));
  }

  clearAuth() {
    this.currentUser = null;
    this.isAdmin = false;
    this.isMember = false;
    localStorage.removeItem('adminUser');
  }

  canAccessAdminRoutes() {
    return this.isUserAdmin();
  }

  canAccessMemberRoutes() {
    return this.isUserMember();
  }

  redirectBasedOnUserType() {
    if (this.isUserAdmin()) {
      return '/my-parties';
    } else if (this.isUserMember()) {
      return '/screen1';
    } else {
      return '/admin-login';
    }
  }
}

const authManager = new AuthManager();

// Interceptor global para prevenir acceso a app1 desde app2
function preventApp1Access() {
  // Verificar si estamos en app2 y el usuario es admin
  if (window.location.pathname.includes('/app2') && authManager.isUserAdmin()) {
    // Si el usuario intenta navegar a app1, redirigir a admin-dashboard
    if (window.location.pathname.includes('/app1') || 
        window.location.href.includes('/app1/')) {
      console.log('Admin attempting to access app1, redirecting to admin-dashboard');
      window.location.href = '/admin-dashboard';
      return;
    }
  }
}

// Función para interceptar navegación a app1
function interceptApp1Navigation() {
  // Verificar si el usuario es admin
  if (authManager.isUserAdmin()) {
    // Interceptar cualquier navegación a app1
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      const url = args[2];
      if (url && (url.includes('/app1') || url.includes('app1'))) {
        console.log('Admin attempting to navigate to app1, redirecting to admin-dashboard');
        window.location.href = '/admin-dashboard';
        return;
      }
      return originalPushState.apply(this, args);
    };
    
    history.replaceState = function(...args) {
      const url = args[2];
      if (url && (url.includes('/app1') || url.includes('app1'))) {
        console.log('Admin attempting to replace state to app1, redirecting to admin-dashboard');
        window.location.href = '/admin-dashboard';
        return;
      }
      return originalReplaceState.apply(this, args);
    };
  }
}

// Ejecutar verificación al cargar la página
preventApp1Access();
interceptApp1Navigation();

// Interceptar cambios de URL
window.addEventListener('beforeunload', preventApp1Access);
window.addEventListener('popstate', preventApp1Access);

// Interceptar cualquier cambio de URL
setInterval(() => {
  if (authManager.isUserAdmin() && window.location.href.includes('/app1')) {
    console.log('Admin detected on app1, redirecting to admin-dashboard');
    window.location.href = '/admin-dashboard';
  }
}, 100);

function checkRouteAccess(route) {
  const adminRoutes = [
    '/admin-dashboard',
    '/create-party',
    '/manage-party',
    '/guests-summary',
    '/profile',
    '/edit-profile',
    '/my-parties'
  ];

  const memberRoutes = [
    '/screen1',
    '/screen2',
    '/profile',
    '/edit-profile'
  ];

  const loginRoutes = [
    '/admin-login',
    '/admin-register'
  ];

  const publicRoutes = [
    '/welcome',
    '/'
  ];

  // Si es una ruta pública, permitir acceso
  if (publicRoutes.includes(route)) {
    return true;
  }

  // Si es una ruta de login y ya hay sesión, denegar
  if (loginRoutes.includes(route)) {
    if (authManager.isAuthenticated()) {
      return false;
    }
    return true;
  }

  // Si es una ruta de admin, solo permitir a administradores
  if (adminRoutes.includes(route)) {
    if (!authManager.canAccessAdminRoutes()) {
      return false;
    }
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

function handleUnauthorizedAccess(route) {
  const loginRoutes = ['/admin-login', '/admin-register'];
  const adminRoutes = ['/admin-dashboard', '/create-party', '/manage-party', '/guests-summary'];
  const memberRoutes = ['/screen1', '/screen2', '/profile', '/edit-profile'];
  
  // Si es una ruta de login y ya hay sesión, redirigir según el tipo de usuario
  if (loginRoutes.includes(route) && authManager.isAuthenticated()) {
    if (authManager.isUserAdmin()) {
      window.location.href = '/admin-dashboard';
    } else if (authManager.isUserMember()) {
      window.location.href = 'https://app1-rumbify.vercel.app/dashboard';
    }
    return;
  }
  
  // Si es una ruta de admin y el usuario es miembro, redirigir a su dashboard
  if (adminRoutes.includes(route) && authManager.isUserMember()) {
    window.location.href = 'https://app1-rumbify.vercel.app/dashboard';
    return;
  }
  
  // Si es una ruta de miembro y el usuario es admin, redirigir a my-parties
  if (memberRoutes.includes(route) && authManager.isUserAdmin()) {
    window.location.href = '/my-parties';
    return;
  }
  
  // Si no hay usuario autenticado, ir a login
  if (!authManager.isAuthenticated()) {
    window.location.href = '/admin-login';
    return;
  }
  
  // NUNCA permitir que admin acceda a app1
  if (authManager.isUserAdmin()) {
    window.location.href = '/my-parties';
  } else if (authManager.isUserMember()) {
    window.location.href = 'https://app1-rumbify.vercel.app/dashboard';
  } else {
    window.location.href = '/admin-login';
  }
}

export { authManager, checkRouteAccess, handleUnauthorizedAccess };
