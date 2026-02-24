class SessionTimeout {
  constructor(options = {}) {
    this.timeoutMinutes = options.timeoutMinutes || 120;
    this.warningMinutes = options.warningMinutes || 2; 
    this.checkInterval = options.checkInterval || 60000; 
    this.warningShown = false;
    this.lastActivity = Date.now();
    this.timeoutId = null;
    this.warningTimeoutId = null;
    this.isMonitoring = false;
    
    this.init();
  }

  init() {
    const activityEvents = [
      'mousedown', 'mousemove', 'keypress', 'scroll', 
      'touchstart', 'click', 'keydown'
    ];

    activityEvents.forEach(event => {
      document.addEventListener(event, () => this.updateActivity(), true);
    });
    
    this.startInactivityDetection();
  }

  updateActivity() {
    const now = Date.now();
    this.lastActivity = now;
    this.warningShown = false;
    
    if (this.isMonitoring || this.inactivityTimeoutId) {
      this.stopMonitoring();
      this.startInactivityDetection();
    }
  }

  startInactivityDetection() {
    const inactivityDelay = 5000; 
    
    this.inactivityTimeoutId = setTimeout(() => {
      this.startMonitoring();
    }, inactivityDelay);
  }

  stopMonitoring() {
    this.isMonitoring = false;
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.warningTimeoutId) {
      clearTimeout(this.warningTimeoutId);
      this.warningTimeoutId = null;
    }
    if (this.inactivityTimeoutId) {
      clearTimeout(this.inactivityTimeoutId);
      this.inactivityTimeoutId = null;
    }
  }

  startMonitoring() {
    this.isMonitoring = true;
    const warningTime = (this.timeoutMinutes - this.warningMinutes) * 60 * 1000;
    const timeoutTime = this.timeoutMinutes * 60 * 1000;
    
    this.warningTimeoutId = setTimeout(() => {
      this.showWarning();
    }, warningTime);
    
    this.timeoutId = setTimeout(() => {
      this.logout();
    }, timeoutTime);
  }

  showWarning() {
    if (this.warningShown) {
      return;
    }
    
    this.warningShown = true;
    const modal = document.createElement('div');
    modal.id = 'session-warning-modal';
    modal.innerHTML = `
      <div class="modal fade show" style="display: block; background: rgba(0,0,0,0.5);" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header bg-warning text-dark">
              <h5 class="modal-title">
                <i class="fas fa-exclamation-triangle"></i> Sessão Expirando
              </h5>
            </div>
            <div class="modal-body">
              <p>Sua sessão expirará em <strong id="countdown">${this.warningMinutes}</strong> ${this.warningMinutes === 1 ? 'minuto' : 'minutos'} devido à inatividade.</p>
              <p>Clique em "Continuar" para manter sua sessão ativa.</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-primary" id="continue-session">
                <i class="fas fa-check"></i> Continuar
              </button>
              <button type="button" class="btn btn-secondary" id="logout-now">
                <i class="fas fa-sign-out-alt"></i> Fazer Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    let timeLeft = this.warningMinutes * 60;
    const countdownElement = document.getElementById('countdown');
    
    const countdown = setInterval(() => {
      timeLeft--;
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      countdownElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      
      if (timeLeft <= 0) {
        clearInterval(countdown);
        this.logout();
      }
    }, 1000);
    document.getElementById('continue-session').addEventListener('click', () => {
      clearInterval(countdown);
      document.body.removeChild(modal);
      this.updateActivity();
    });

    document.getElementById('logout-now').addEventListener('click', () => {
      clearInterval(countdown);
      this.logout();
    });
  }

  logout() {
    const modal = document.getElementById('session-warning-modal');
    if (modal) {
      document.body.removeChild(modal);
    }

    const logoutModal = document.createElement('div');
    logoutModal.innerHTML = `
      <div class="modal fade show" style="display: block; background: rgba(0,0,0,0.5);" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header bg-danger text-white">
              <h5 class="modal-title">
                <i class="fas fa-sign-out-alt"></i> Sessão Expirada
              </h5>
            </div>
            <div class="modal-body">
              <p>Sua sessão expirou devido à inatividade. Você será redirecionado para a página de login.</p>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(logoutModal);

    setTimeout(() => {
      window.location.href = '/loginPage?timeout=true';
    }, 2000);
  }
  updateConfig(newConfig) {
    Object.assign(this, newConfig);
    this.stopMonitoring();
    this.startInactivityDetection();
  }
}
document.addEventListener('DOMContentLoaded', function() {
  const body = document.body;
  const sessionTimeout = parseInt(body.getAttribute('data-session-timeout')) || 120;
  const warningMinutes = parseInt(body.getAttribute('data-warning-minutes')) || 2;
  
  window.sessionTimeoutManager = new SessionTimeout({
    timeoutMinutes: sessionTimeout,
    warningMinutes: warningMinutes
  });
});
