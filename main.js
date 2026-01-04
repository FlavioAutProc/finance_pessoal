/**
 * ============================================
 * SISTEMA DE CONTROLE FINANCEIRO PESSOAL
 * Versão 4.3 - Correção Completa da Importação
 * ============================================
 */

// ============================================
// CLASSE PRINCIPAL: AppController
// ============================================
class AppController {
    constructor() {
        this.database = new DatabaseService();
        this.transactionTable = new TransactionTable(this.database);
        this.transactionForm = new TransactionForm(this.database, this);
        this.dashboardController = new DashboardController(this.database, this);
        this.chartsController = new ChartsController(this.database, this);
        this.importExportService = new ImportExportService(this.database, this);
        this.settingsManager = new SettingsManager(this.database, this);
        this.investmentManager = new InvestmentManager(this.database, this);
        this.themeManager = new ThemeManager();
        this.stateManager = new StateManager(this);
        
        this.currentPage = 'dashboard';
        this.currentTransactionId = null;
        this.init();
    }

    /**
     * Inicializa a aplicação
     */
    async init() {
        try {
            await this.database.init();
            await this.settingsManager.loadSettings();
            this.setupEventListeners();
            this.setupNavigation();
            await this.loadInitialData();
            this.themeManager.init();
            this.stateManager.init();
            this.setupMobileMenu();
            console.log('Aplicação inicializada com sucesso');
        } catch (error) {
            console.error('Erro na inicialização:', error);
            this.showNotification('Erro ao inicializar aplicação: ' + error.message, 'error');
        }
    }

    /**
     * Configura o menu mobile
     */
    setupMobileMenu() {
        const menuToggle = document.getElementById('menuToggle');
        const closeMenu = document.getElementById('closeMenu');
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.add('active');
                overlay.classList.add('active');
            });
        }
        
        if (closeMenu) {
            closeMenu.addEventListener('click', () => {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            });
        }
        
        if (overlay) {
            overlay.addEventListener('click', () => {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            });
        }
    }

    /**
     * Configura os listeners de eventos da aplicação
     */
    setupEventListeners() {
        // Navegação
        document.addEventListener('click', (e) => {
            const navLink = e.target.closest('.nav-link');
            if (navLink && !navLink.classList.contains('active')) {
                e.preventDefault();
                const page = navLink.getAttribute('data-page');
                if (page) {
                    this.navigateTo(page);
                }
            }
            
            // Quick actions
            const quickAction = e.target.closest('.quick-action-card');
            if (quickAction) {
                e.preventDefault();
                const page = quickAction.getAttribute('data-page');
                if (page) {
                    this.navigateTo(page);
                }
            }
        });

        // Botões de ação
        document.getElementById('backupBtn')?.addEventListener('click', () => this.showBackupModal());
        document.getElementById('mobileBackupBtn')?.addEventListener('click', () => this.showBackupModal());
        document.getElementById('cancelBtn')?.addEventListener('click', () => this.navigateTo('transactions'));
        document.getElementById('addLimitBtn')?.addEventListener('click', () => this.addNewLimit());
        
        // Botões do welcome state
        document.getElementById('welcomeAddTransaction')?.addEventListener('click', () => this.navigateTo('add-transaction'));
        document.getElementById('welcomeImportData')?.addEventListener('click', () => this.navigateTo('import-export'));

        // Filtros da tabela
        document.getElementById('filterType')?.addEventListener('change', () => this.transactionTable.filterTransactions());
        document.getElementById('filterMonth')?.addEventListener('change', () => this.transactionTable.filterTransactions());
        document.getElementById('filterCategory')?.addEventListener('change', () => this.transactionTable.filterTransactions());

        // Modal de edição
        document.getElementById('closeEditModal')?.addEventListener('click', () => this.closeModal('editModal'));
        document.getElementById('cancelEditBtn')?.addEventListener('click', () => this.closeModal('editModal'));
        document.getElementById('saveEditBtn')?.addEventListener('click', () => this.saveEditedTransaction());

        // Modal de confirmação
        document.getElementById('closeConfirmModal')?.addEventListener('click', () => this.closeModal('confirmModal'));
        document.getElementById('cancelDeleteBtn')?.addEventListener('click', () => this.closeModal('confirmModal'));
        document.getElementById('confirmDeleteBtn')?.addEventListener('click', () => this.confirmDeleteTransaction());

        // Modal de backup
        document.getElementById('closeBackupModal')?.addEventListener('click', () => this.closeModal('backupModal'));

        // Modal de investimento
        document.getElementById('addInvestmentBtn')?.addEventListener('click', () => this.showNewInvestmentModal());
        document.getElementById('closeInvestmentModal')?.addEventListener('click', () => this.closeModal('investmentModal'));
        document.getElementById('cancelInvestmentBtn')?.addEventListener('click', () => this.closeModal('investmentModal'));
        document.getElementById('saveInvestmentBtn')?.addEventListener('click', () => this.saveInvestment());

        // Importação/Exportação
        document.getElementById('importBtn')?.addEventListener('click', () => this.importExportService.handleImport());
        document.getElementById('exportBtn')?.addEventListener('click', () => this.importExportService.handleExport());
        document.getElementById('exportDateRange')?.addEventListener('change', (e) => {
            document.getElementById('customDateRange').style.display = 
                e.target.value === 'custom' ? 'block' : 'none';
        });
         // NOVA FUNÇÃO: Exportar relatório completo
        document.getElementById('exportReportBtn')?.addEventListener('click', () => {
            this.importExportService.exportCompleteReport();
        });

        // Configurações
        document.getElementById('addTypeBtn')?.addEventListener('click', () => this.settingsManager.addType());
        document.getElementById('addCategoryBtn')?.addEventListener('click', () => this.settingsManager.addCategory());
        document.getElementById('addClassificationBtn')?.addEventListener('click', () => this.settingsManager.addClassification());
        document.getElementById('categoryTypeFilter')?.addEventListener('change', () => this.settingsManager.filterCategoriesByType());

        // Área de drop para importação
        const dropArea = document.getElementById('importDropArea');
        const importFileInput = document.getElementById('importFile');
        
        if (dropArea && importFileInput) {
            // Click na área de drop
            dropArea.addEventListener('click', (e) => {
                e.preventDefault();
                importFileInput.click();
            });
            
            // Eventos de drag and drop
            dropArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropArea.style.borderColor = 'var(--primary-color)';
                dropArea.style.background = 'rgba(67, 97, 238, 0.05)';
            });
            
            dropArea.addEventListener('dragleave', () => {
                dropArea.style.borderColor = '';
                dropArea.style.background = '';
            });
            
            dropArea.addEventListener('drop', (e) => {
                e.preventDefault();
                dropArea.style.borderColor = '';
                dropArea.style.background = '';
                
                if (e.dataTransfer.files.length > 0) {
                    // Atribuir arquivos ao input
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(e.dataTransfer.files[0]);
                    importFileInput.files = dataTransfer.files;
                    
                    // Disparar evento change para processamento
                    importFileInput.dispatchEvent(new Event('change'));
                }
            });
            
            // Listener para mudança no input file
            importFileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    const file = e.target.files[0];
                    this.importExportService.showImportStatus(
                        `Arquivo selecionado: ${file.name} (${this.formatFileSize(file.size)})`, 
                        'info'
                    );
                }
            });
        }

        // Evento para botões dentro da tabela (delegação)
        document.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.edit-transaction');
            if (editBtn) {
                e.preventDefault();
                const id = parseInt(editBtn.getAttribute('data-id'));
                this.handleEditTransaction(id);
            }

            const deleteBtn = e.target.closest('.delete-transaction');
            if (deleteBtn) {
                e.preventDefault();
                const id = parseInt(deleteBtn.getAttribute('data-id'));
                this.showDeleteModal(id);
            }

            const editInvestmentBtn = e.target.closest('.edit-investment');
            if (editInvestmentBtn) {
                e.preventDefault();
                const id = parseInt(editInvestmentBtn.getAttribute('data-id'));
                this.editInvestment(id);
            }

            const deleteInvestmentBtn = e.target.closest('.delete-investment');
            if (deleteInvestmentBtn) {
                e.preventDefault();
                const id = parseInt(deleteInvestmentBtn.getAttribute('data-id'));
                this.deleteInvestment(id);
            }

            // Botões de configurações
            const deleteTypeBtn = e.target.closest('.delete-type');
            if (deleteTypeBtn) {
                e.preventDefault();
                const id = deleteTypeBtn.getAttribute('data-id');
                if (confirm('Deseja realmente excluir este tipo? Esta ação afetará todas as transações deste tipo.')) {
                    this.settingsManager.deleteType(id);
                }
            }

            const deleteCategoryBtn = e.target.closest('.delete-category');
            if (deleteCategoryBtn) {
                e.preventDefault();
                const id = deleteCategoryBtn.getAttribute('data-id');
                if (confirm('Deseja realmente excluir esta categoria? Esta ação afetará todas as transações desta categoria.')) {
                    this.settingsManager.deleteCategory(id);
                }
            }

            const deleteClassificationBtn = e.target.closest('.delete-classification');
            if (deleteClassificationBtn) {
                e.preventDefault();
                const id = deleteClassificationBtn.getAttribute('data-id');
                if (confirm('Deseja realmente excluir esta classificação?')) {
                    this.settingsManager.deleteClassification(id);
                }
            }
        });
    }

    /**
     * Formata tamanho do arquivo
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Configura a navegação inicial
     */
    setupNavigation() {
        // Garantir que apenas a dashboard esteja visível inicialmente
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        
        const initialPage = document.getElementById('dashboard');
        if (initialPage) {
            initialPage.classList.add('active');
        }
        
        const initialLink = document.querySelector('[data-page="dashboard"]');
        if (initialLink) {
            initialLink.classList.add('active');
        }
    }

    /**
     * Navega para uma página específica
     */
    async navigateTo(page) {
        console.log(`Navegando para: ${page}`);
        
        // Validar se a página existe
        const pageElement = document.getElementById(page);
        if (!pageElement) {
            console.error(`Página "${page}" não encontrada`);
            return;
        }
        
        // 1. Esconder todas as páginas
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });
        
        // 2. Remover classe active de todos os links do menu
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // 3. Mostrar página selecionada
        pageElement.classList.add('active');
        
        // 4. Ativar link correspondente no menu
        const navLink = document.querySelector(`[data-page="${page}"]`);
        if (navLink) {
            navLink.classList.add('active');
        }
        
        // 5. Atualizar título da página
        const titles = {
            'dashboard': 'Dashboard',
            'transactions': 'Transações',
            'investments': 'Investimentos',
            'add-transaction': 'Nova Transação',
            'import-export': 'Importar/Exportar',
            'limits': 'Alertas',
            'settings': 'Configurações'
        };
        
        const subtitles = {
            'dashboard': 'Visão geral das suas finanças',
            'transactions': 'Gerencie seu histórico de transações',
            'investments': 'Gerencie seus investimentos financeiros',
            'add-transaction': 'Adicione uma nova receita, despesa ou investimento',
            'import-export': 'Importe ou exporte seus dados',
            'limits': 'Configure alertas para seus gastos',
            'settings': 'Personalize categorias, tipos e classificações'
        };
        
        // Atualizar título desktop
        const titleElement = document.getElementById('pageTitle');
        const subtitleElement = document.getElementById('pageSubtitle');
        
        if (titleElement && titles[page]) {
            titleElement.textContent = titles[page];
        }
        
        if (subtitleElement && subtitles[page]) {
            subtitleElement.textContent = subtitles[page];
        }
        
        // Atualizar título mobile
        const mobileTitle = document.getElementById('mobileTitle');
        if (mobileTitle && titles[page]) {
            mobileTitle.textContent = titles[page];
        }
        
        // 6. Fechar menu no mobile
        document.querySelector('.sidebar').classList.remove('active');
        document.getElementById('sidebarOverlay').classList.remove('active');
        
        // 7. Atualizar página atual
        this.currentPage = page;
        
        // 8. Carregar dados específicos da página
        await this.loadPageData(page);
    }

    /**
     * Carrega dados específicos para a página atual
     */
    async loadPageData(page) {
        try {
            switch(page) {
                case 'dashboard':
                    await this.dashboardController.updateDashboard();
                    await this.chartsController.updateAllCharts();
                    break;
                case 'transactions':
                    await this.transactionTable.loadTransactions();
                    break;
                case 'investments':
                    await this.investmentManager.loadInvestments();
                    break;
                case 'add-transaction':
                    if (this.transactionForm && this.transactionForm.resetForm) {
                        this.transactionForm.resetForm();
                    }
                    break;
                case 'limits':
                    await this.loadLimits();
                    break;
                case 'settings':
                    await this.settingsManager.loadSettingsUI();
                    break;
            }
        } catch (error) {
            console.error(`Erro ao carregar dados da página ${page}:`, error);
            this.showNotification(`Erro ao carregar dados: ${error.message}`, 'error');
        }
    }

    /**
     * Carrega dados iniciais da aplicação
     */
    async loadInitialData() {
        try {
            // Verificar se há transações
            const count = await this.database.getTransactionCount();
            console.log(`Total de transações: ${count}`);
            
            // Atualizar dashboard
            await this.dashboardController.updateDashboard();
            
            // Carregar gráficos se houver dados
            await this.chartsController.updateAllCharts();
            
            // Carregar transações
            await this.transactionTable.loadTransactions();
            
            // Carregar limites
            await this.loadLimits();
            
            // Carregar investimentos
            await this.investmentManager.loadInvestments();
            
            console.log('Dados iniciais carregados com sucesso');
        } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
            this.showNotification('Erro ao carregar dados iniciais', 'error');
        }
    }

    /**
     * Carrega e exibe os limites configurados
     */
    async loadLimits() {
        try {
            const limits = await this.database.getAllLimits();
            const container = document.getElementById('limitsContainer');
            
            if (!container) return;
            
            if (limits.length === 0) {
                container.innerHTML = `
                    <div class="card-empty">
                        <div class="card-empty-icon">
                            <i class="fas fa-bell-slash"></i>
                        </div>
                        <p class="card-empty-text">Nenhum alerta configurado</p>
                        <p style="color: var(--gray-color); margin-bottom: 20px;">
                            Configure limites para categorias de despesas para receber alertas
                        </p>
                        <button class="btn btn-primary" id="firstLimitBtn">
                            <i class="fas fa-plus"></i> Criar Primeiro Alerta
                        </button>
                    </div>
                `;
                
                // Re-attach event listener
                document.getElementById('firstLimitBtn')?.addEventListener('click', () => this.addNewLimit());
                return;
            }

            let html = '';
            for (const limit of limits) {
                const currentSpent = await this.database.getCategorySpentThisMonth(limit.category);
                const percentage = (currentSpent / limit.limit) * 100;
                const alertClass = percentage > 100 ? 'alert-danger' : percentage > 80 ? 'alert-warning' : 'alert-success';
                const icon = percentage > 100 ? 'exclamation-triangle' : percentage > 80 ? 'exclamation-circle' : 'check-circle';
                
                html += `
                    <div class="card" style="margin-bottom: 20px;">
                        <div class="card-header">
                            <h3 class="card-title">${limit.category}</h3>
                            <button class="btn-icon btn-delete delete-limit" data-id="${limit.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                        <div class="card-value" style="font-size: 2rem;">Limite: R$ ${this.formatCurrency(limit.limit)}</div>
                        <p style="margin: 10px 0; color: var(--gray-color);">
                            Gasto este mês: <strong style="color: var(--dark-color);">R$ ${this.formatCurrency(currentSpent)}</strong> (${percentage.toFixed(1)}%)
                        </p>
                        <div style="height: 12px; background: var(--gray-light); border-radius: 6px; margin: 15px 0; overflow: hidden;">
                            <div style="height: 100%; width: ${Math.min(percentage, 100)}%; 
                                 background: ${percentage > 100 ? 'var(--danger-color)' : percentage > 80 ? 'var(--warning-color)' : 'var(--success-color)'}; 
                                 border-radius: 6px; transition: width 0.5s ease;"></div>
                        </div>
                        <div class="alert ${alertClass}" style="margin-top: 15px;">
                            <i class="fas fa-${icon}"></i>
                            <div>
                                <div class="alert-title">
                                    ${percentage > 100 ? 'Limite ultrapassado!' : percentage > 80 ? 'Limite próximo!' : 'Dentro do limite'}
                                </div>
                                <div class="alert-message">
                                    ${percentage > 100 ? 
                                        `Você gastou R$ ${this.formatCurrency(currentSpent - limit.limit)} acima do limite` : 
                                        percentage > 80 ? 
                                        `Restam R$ ${this.formatCurrency(limit.limit - currentSpent)} do seu limite` :
                                        `Você ainda pode gastar R$ ${this.formatCurrency(limit.limit - currentSpent)}`
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            container.innerHTML = html;
            
            // Adicionar listeners para botões de exclusão
            container.querySelectorAll('.delete-limit').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = parseInt(e.currentTarget.getAttribute('data-id'));
                    if (confirm('Deseja realmente excluir este limite?')) {
                        await this.database.deleteLimit(id);
                        await this.loadLimits();
                        await this.dashboardController.updateDashboard();
                        this.showNotification('Limite excluído com sucesso!', 'success');
                    }
                });
            });
        } catch (error) {
            console.error('Erro ao carregar limites:', error);
            this.showNotification('Erro ao carregar limites', 'error');
        }
    }

    /**
     * Adiciona um novo limite
     */
    async addNewLimit() {
        // Primeiro, pegar categorias de despesas existentes
        const transactions = await this.database.getAllTransactions();
        const expenseCategories = [...new Set(transactions
            .filter(t => t.type === 'Despesa')
            .map(t => t.category))].sort();
        
        if (expenseCategories.length === 0) {
            this.showNotification('Adicione despesas antes de configurar limites.', 'warning');
            return;
        }
        
        let category = '';
        if (expenseCategories.length === 1) {
            category = expenseCategories[0];
        } else {
            category = prompt(`Escolha uma categoria:\n${expenseCategories.join('\n')}`);
            if (!expenseCategories.includes(category)) {
                this.showNotification('Categoria inválida!', 'error');
                return;
            }
        }
        
        const limitStr = prompt(`Digite o valor limite mensal para ${category} (R$):`);
        const limit = this.parseCurrency(limitStr);
        
        if (isNaN(limit) || limit <= 0) {
            this.showNotification('Valor inválido! Digite um número maior que zero.', 'error');
            return;
        }
        
        try {
            await this.database.addLimit({ category, limit });
            await this.loadLimits();
            await this.dashboardController.updateDashboard();
            
            this.showNotification('Limite adicionado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao adicionar limite:', error);
            this.showNotification('Erro ao adicionar limite: ' + error.message, 'error');
        }
    }

    /**
     * Mostra modal para novo investimento
     */
    async showNewInvestmentModal() {
        document.getElementById('investmentModalTitle').textContent = 'Novo Investimento';
        document.getElementById('investmentForm').reset();
        
        // Definir data atual
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('investmentDate').value = today;
        
        this.showModal('investmentModal');
    }

    /**
     * Salva um novo investimento
     */
    async saveInvestment() {
        try {
            const investment = {
                name: document.getElementById('investmentName').value,
                type: document.getElementById('investmentType').value,
                date: document.getElementById('investmentDate').value,
                value: this.parseCurrency(document.getElementById('investmentValue').value),
                quantity: document.getElementById('investmentQuantity').value ? 
                         parseFloat(document.getElementById('investmentQuantity').value) : null,
                currentValue: document.getElementById('investmentCurrentValue').value ? 
                             this.parseCurrency(document.getElementById('investmentCurrentValue').value) : null,
                description: document.getElementById('investmentDescription').value
            };
            
            if (!investment.name || !investment.type || !investment.date || isNaN(investment.value) || investment.value <= 0) {
                this.showNotification('Preencha todos os campos obrigatórios corretamente.', 'error');
                return;
            }
            
            await this.database.addInvestment(investment);
            this.closeModal('investmentModal');
            
            // Atualizar interface
            await this.investmentManager.loadInvestments();
            await this.dashboardController.updateDashboard();
            
            this.showNotification('Investimento salvo com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao salvar investimento:', error);
            this.showNotification('Erro ao salvar investimento: ' + error.message, 'error');
        }
    }

    /**
     * Edita um investimento existente
     */
    async editInvestment(id) {
        try {
            const investment = await this.database.getInvestmentById(id);
            if (!investment) {
                this.showNotification('Investimento não encontrado.', 'error');
                return;
            }
            
            document.getElementById('investmentModalTitle').textContent = 'Editar Investimento';
            document.getElementById('investmentName').value = investment.name;
            document.getElementById('investmentType').value = investment.type;
            document.getElementById('investmentDate').value = investment.date;
            document.getElementById('investmentValue').value = this.formatCurrencyInput(investment.value);
            document.getElementById('investmentQuantity').value = investment.quantity || '';
            document.getElementById('investmentCurrentValue').value = investment.currentValue ? 
                this.formatCurrencyInput(investment.currentValue) : '';
            document.getElementById('investmentDescription').value = investment.description || '';
            
            // Armazenar ID do investimento
            document.getElementById('investmentForm').dataset.id = id;
            
            this.showModal('investmentModal');
        } catch (error) {
            console.error('Erro ao carregar investimento:', error);
            this.showNotification('Erro ao carregar investimento: ' + error.message, 'error');
        }
    }

    /**
     * Exclui um investimento
     */
    async deleteInvestment(id) {
        if (!confirm('Deseja realmente excluir este investimento?')) {
            return;
        }
        
        try {
            await this.database.deleteInvestment(id);
            await this.investmentManager.loadInvestments();
            await this.dashboardController.updateDashboard();
            
            this.showNotification('Investimento excluído com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao excluir investimento:', error);
            this.showNotification('Erro ao excluir investimento: ' + error.message, 'error');
        }
    }

    /**
     * Manipula a edição de transação
     */
    async handleEditTransaction(id) {
        try {
            const transaction = await this.database.getTransactionById(id);
            if (transaction) {
                this.showEditModal(transaction);
            }
        } catch (error) {
            console.error('Erro ao carregar transação para edição:', error);
            this.showNotification('Erro ao carregar transação para edição', 'error');
        }
    }

    /**
     * Mostra modal para edição de transação
     */
    async showEditModal(transaction) {
        this.currentTransactionId = transaction.id;
        
        document.getElementById('editId').value = transaction.id;
        document.getElementById('editDate').value = transaction.date;
        document.getElementById('editValue').value = this.formatCurrencyInput(transaction.value);
        document.getElementById('editDescription').value = transaction.description || '';
        document.getElementById('editNote').value = transaction.note || '';
        
        // Carregar tipos e categorias dinâmicas
        await this.settingsManager.populateTypeSelect(document.getElementById('editType'), transaction.type);
        await this.settingsManager.populateCategorySelect(
            document.getElementById('editCategory'), 
            transaction.type, 
            transaction.category
        );
        
        this.showModal('editModal');
    }

    /**
     * Salva a transação editada
     */
    async saveEditedTransaction() {
        try {
            const type = document.getElementById('editType').value;
            const category = document.getElementById('editCategory').value;
            const value = this.parseCurrency(document.getElementById('editValue').value);
            
            if (!type || !category || isNaN(value) || value <= 0) {
                this.showNotification('Preencha todos os campos obrigatórios corretamente.', 'error');
                return;
            }
            
            const updatedTransaction = {
                date: document.getElementById('editDate').value,
                type: type,
                category: category,
                value: value,
                description: document.getElementById('editDescription').value,
                note: document.getElementById('editNote').value,
                month: new Date(document.getElementById('editDate').value).toLocaleString('pt-BR', { month: 'long' }),
                year: new Date(document.getElementById('editDate').value).getFullYear(),
                subcategory: '',
                classification: 'Variável'
            };
            
            await this.database.updateTransaction(this.currentTransactionId, updatedTransaction);
            this.closeModal('editModal');
            
            // Atualizar interface
            await this.transactionTable.loadTransactions();
            await this.dashboardController.updateDashboard();
            await this.chartsController.updateAllCharts();
            
            this.showNotification('Transação atualizada com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao salvar transação editada:', error);
            this.showNotification('Erro ao salvar transação: ' + error.message, 'error');
        }
    }

    /**
     * Mostra modal de confirmação para exclusão
     */
    showDeleteModal(id) {
        this.currentTransactionId = id;
        this.showModal('confirmModal');
    }

    /**
     * Confirma e executa a exclusão da transação
     */
    async confirmDeleteTransaction() {
        try {
            await this.database.deleteTransaction(this.currentTransactionId);
            this.closeModal('confirmModal');
            
            // Atualizar interface
            await this.transactionTable.loadTransactions();
            await this.dashboardController.updateDashboard();
            await this.chartsController.updateAllCharts();
            
            this.showNotification('Transação excluída com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao excluir transação:', error);
            this.showNotification('Erro ao excluir transação: ' + error.message, 'error');
        }
    }

    /**
     * Mostra modal de backup/restauração
     */
    showBackupModal() {
        document.getElementById('backupModalTitle').textContent = 'Backup de Dados';
        document.getElementById('backupModalBody').innerHTML = `
            <div style="text-align: center; padding: 20px 0;">
                <i class="fas fa-database" style="font-size: 3rem; color: var(--primary-color); margin-bottom: 20px;"></i>
                <p style="margin-bottom: 10px; font-size: 1.1rem;">Faça backup completo dos seus dados financeiros</p>
                <p style="color: var(--gray-color); margin-bottom: 30px;">Seus dados serão baixados como um arquivo JSON seguro</p>
                <button class="btn btn-primary" id="generateBackupBtn" style="width: 100%; padding: 15px; font-size: 1.1rem;">
                    <i class="fas fa-download"></i> Gerar Backup Agora
                </button>
                <p style="margin-top: 20px; color: var(--gray-color); font-size: 0.9rem;">
                    <i class="fas fa-info-circle"></i> Recomendamos fazer backup regularmente
                </p>
            </div>
        `;
        
        this.showModal('backupModal');
        
        document.getElementById('generateBackupBtn').addEventListener('click', async () => {
            try {
                await this.importExportService.generateBackup();
                this.closeModal('backupModal');
            } catch (error) {
                this.showNotification(`Erro ao gerar backup: ${error.message}`, 'error');
            }
        });
    }

    /**
     * Formata valor monetário para exibição
     */
    formatCurrency(value) {
        if (typeof value !== 'number') {
            value = parseFloat(value) || 0;
        }
        return value.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    /**
     * Formata valor monetário para input
     */
    formatCurrencyInput(value) {
        if (typeof value !== 'number') {
            value = parseFloat(value) || 0;
        }
        return value.toFixed(2).replace('.', ',');
    }

    /**
     * Converte string monetária para número
     */
    /**
 * Converte string monetária para número - CORRIGIDO
 */
    parseCurrency(value) {
        if (!value) return 0;
        
        // Se já for número, retornar como está
        if (typeof value === 'number') return value;
        
        // Converter para string
        let strValue = value.toString().trim();
        
        console.log('parseCurrency input:', strValue); // Debug
        
        // Remover tudo que não é número, vírgula ou ponto
        strValue = strValue.replace(/[^\d,.-]/g, '');
        
        console.log('parseCurrency após limpeza:', strValue); // Debug
        
        // Se estiver vazio, retornar 0
        if (!strValue) return 0;
        
        // VERIFICAR FORMATO:
        // Se tem vírgula E ponto = possível formato internacional (1.234,56)
        // Se tem só vírgula = formato brasileiro (1234,56)
        // Se tem só ponto = formato americano (1234.56)
        
        if (strValue.includes(',') && strValue.includes('.')) {
            // Formato: 1.234,56 (milhares separados por ponto, decimal por vírgula)
            // Remover pontos dos milhares, substituir vírgula por ponto
            strValue = strValue.replace(/\./g, '').replace(',', '.');
        } else if (strValue.includes(',') && !strValue.includes('.')) {
            // Formato: 1234,56 ou 1.234,56 (sem ponto nos milhares)
            // Verificar se a vírgula é separador decimal
            const parts = strValue.split(',');
            if (parts[1] && parts[1].length <= 2) {
                // Vírgula é separador decimal (centavos)
                // Substituir vírgula por ponto
                strValue = strValue.replace(',', '.');
            } else {
                // Vírgula pode ser separador de milhares (formato europeu)
                // Tratar como número inteiro
                strValue = strValue.replace(/,/g, '');
            }
        }
        // Se tem só ponto, manter como está (formato americano)
        
        console.log('parseCurrency após tratamento:', strValue); // Debug
        
        const parsed = parseFloat(strValue);
        
        console.log('parseCurrency resultado:', parsed, isNaN(parsed) ? 'INVÁLIDO' : 'VÁLIDO'); // Debug
        
        return isNaN(parsed) ? 0 : parsed;
    }
    /**
     * Mostra uma notificação
     */
    showNotification(message, type = 'info') {
        const colors = {
            success: 'var(--success-color)',
            error: 'var(--danger-color)',
            warning: 'var(--warning-color)',
            info: 'var(--primary-color)'
        };
        
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        
        // Criar notificação
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 30px;
            right: 30px;
            background: white;
            color: var(--dark-color);
            padding: 20px 25px;
            border-radius: var(--border-radius);
            box-shadow: var(--box-shadow);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            border-left: 4px solid ${colors[type]};
            min-width: 300px;
            max-width: 400px;
            display: flex;
            align-items: flex-start;
            gap: 15px;
        `;
        
        notification.innerHTML = `
            <i class="fas fa-${icons[type]}" style="color: ${colors[type]}; font-size: 1.2rem; margin-top: 2px;"></i>
            <div style="flex: 1;">
                <div style="font-weight: 600; margin-bottom: 5px;">${type === 'success' ? 'Sucesso!' : type === 'error' ? 'Erro!' : type === 'warning' ? 'Atenção!' : 'Informação'}</div>
                <div style="color: var(--gray-color); font-size: 0.95rem;">${message}</div>
            </div>
            <button class="notification-close" style="background: none; border: none; color: var(--gray-color); cursor: pointer; font-size: 1.1rem;">
                &times;
            </button>
        `;
        
        document.body.appendChild(notification);
        
        // Adicionar animação CSS se não existir
        if (!document.querySelector('#notification-animations')) {
            const style = document.createElement('style');
            style.id = 'notification-animations';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Fechar notificação
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        });
        
        // Auto-fechar após 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    /**
     * Mostra um modal
     */
    showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }

    /**
     * Fecha um modal
     */
    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    /**
     * Notifica outros componentes sobre mudanças nos dados
     */
    async notifyDataChange() {
        await this.dashboardController.updateDashboard();
        await this.chartsController.updateAllCharts();
        await this.transactionTable.loadTransactions();
        await this.investmentManager.loadInvestments();
        await this.loadLimits();
        await this.stateManager.notifyDataChange();
    }
}

// ============================================
// CLASSE: StateManager
// Gerencia o estado da aplicação (vazio/com dados)
// ============================================
class StateManager {
    constructor(app) {
        this.app = app;
        this.hasData = false;
    }

    /**
     * Inicializa o gerenciador de estado
     */
    async init() {
        await this.checkDataState();
    }

    /**
     * Verifica se há dados na aplicação
     */
    async checkDataState() {
        try {
            const transactions = await this.app.database.getAllTransactions();
            const investments = await this.app.database.getAllInvestments();
            this.hasData = transactions.length > 0 || investments.length > 0;
            this.updateUIState();
            return this.hasData;
        } catch (error) {
            console.error('Erro ao verificar estado dos dados:', error);
            return false;
        }
    }

    /**
     * Atualiza a UI baseado no estado dos dados
     */
    updateUIState() {
        const welcomeState = document.getElementById('welcomeState');
        const quickActions = document.getElementById('quickActions');
        const dashboardCards = document.getElementById('dashboardCards');
        const chartsContainer = document.getElementById('chartsContainer');
        const emptyChartsContainer = document.getElementById('emptyChartsContainer');
        
        if (this.hasData) {
            // Mostrar interface com dados
            if (welcomeState) welcomeState.style.display = 'none';
            if (quickActions) quickActions.style.display = 'grid';
            if (dashboardCards) dashboardCards.style.display = 'grid';
            
            // Verificar se há dados suficientes para gráficos
            this.updateChartsState();
        } else {
            // Mostrar interface vazia
            if (welcomeState) welcomeState.style.display = 'block';
            if (quickActions) quickActions.style.display = 'none';
            if (dashboardCards) dashboardCards.style.display = 'none';
            if (chartsContainer) chartsContainer.style.display = 'none';
            if (emptyChartsContainer) emptyChartsContainer.style.display = 'none';
        }
    }

    /**
     * Atualiza o estado dos gráficos
     */
    async updateChartsState() {
        const chartsContainer = document.getElementById('chartsContainer');
        const emptyChartsContainer = document.getElementById('emptyChartsContainer');
        
        if (!chartsContainer || !emptyChartsContainer) return;
        
        try {
            const transactions = await this.app.database.getAllTransactions();
            const expenses = transactions.filter(t => t.type === 'Despesa');
            const hasEnoughData = expenses.length >= 2;
            
            if (hasEnoughData) {
                chartsContainer.style.display = 'grid';
                emptyChartsContainer.style.display = 'none';
            } else {
                chartsContainer.style.display = 'none';
                emptyChartsContainer.style.display = 'grid';
            }
        } catch (error) {
            console.error('Erro ao verificar estado dos gráficos:', error);
        }
    }

    /**
     * Notifica sobre mudanças nos dados
     */
    async notifyDataChange() {
        await this.checkDataState();
    }
}

// ============================================
// CLASSE: DatabaseService
// ============================================
class DatabaseService {
    constructor() {
        this.db = null;
        this.dbName = 'PersonalFinanceDB';
        this.dbVersion = 2;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Transações
                if (!db.objectStoreNames.contains('transactions')) {
                    const transactionStore = db.createObjectStore('transactions', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    
                    transactionStore.createIndex('date', 'date', { unique: false });
                    transactionStore.createIndex('month', 'month', { unique: false });
                    transactionStore.createIndex('year', 'year', { unique: false });
                    transactionStore.createIndex('category', 'category', { unique: false });
                    transactionStore.createIndex('type', 'type', { unique: false });
                }
                
                // Limites
                if (!db.objectStoreNames.contains('limits')) {
                    const limitStore = db.createObjectStore('limits', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    
                    limitStore.createIndex('category', 'category', { unique: true });
                }
                
                // Configurações
                if (!db.objectStoreNames.contains('settings')) {
                    const settingsStore = db.createObjectStore('settings', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    
                    settingsStore.createIndex('type', 'type', { unique: false });
                    settingsStore.createIndex('name', 'name', { unique: true });
                }
                
                // Investimentos
                if (!db.objectStoreNames.contains('investments')) {
                    const investmentStore = db.createObjectStore('investments', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    
                    investmentStore.createIndex('date', 'date', { unique: false });
                    investmentStore.createIndex('type', 'type', { unique: false });
                }
            };
        });
    }

    // Métodos para transações
    async getTransactionCount() {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error('Banco não inicializado'));
            const transaction = this.db.transaction(['transactions'], 'readonly');
            const store = transaction.objectStore('transactions');
            const request = store.count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async addTransaction(transaction) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error('Banco não inicializado'));
            
            const transactionDB = this.db.transaction(['transactions'], 'readwrite');
            const store = transactionDB.objectStore('transactions');
            
            // Garantir que a data seja válida
            if (!transaction.date) {
                transaction.date = new Date().toISOString().split('T')[0];
            }
            
            // Extrair mês e ano da data
            const date = new Date(transaction.date);
            transaction.month = date.toLocaleString('pt-BR', { month: 'long' });
            transaction.year = date.getFullYear();
            
            // Garantir que o valor seja um número
            if (typeof transaction.value === 'string') {
                transaction.value = parseFloat(transaction.value.replace(',', '.'));
            }
            transaction.value = parseFloat(transaction.value);
            
            const request = store.add(transaction);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllTransactions() {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error('Banco não inicializado'));
            const transaction = this.db.transaction(['transactions'], 'readonly');
            const store = transaction.objectStore('transactions');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async getFilteredTransactions(filters = {}) {
        try {
            const allTransactions = await this.getAllTransactions();
            let filtered = [...allTransactions];
            
            if (filters.type && filters.type !== '') {
                filtered = filtered.filter(t => t.type === filters.type);
            }
            
            if (filters.month && filters.month !== '') {
                filtered = filtered.filter(t => t.month === filters.month);
            }
            
            if (filters.category && filters.category !== '') {
                filtered = filtered.filter(t => t.category === filters.category);
            }
            
            return filtered;
        } catch (error) {
            console.error('Erro ao filtrar transações:', error);
            return [];
        }
    }

    async updateTransaction(id, updates) {
        return new Promise(async (resolve, reject) => {
            if (!this.db) return reject(new Error('Banco não inicializado'));
            
            try {
                const existing = await this.getTransactionById(id);
                if (!existing) return reject(new Error('Transação não encontrada'));
                
                const updatedTransaction = { ...existing, ...updates };
                const transaction = this.db.transaction(['transactions'], 'readwrite');
                const store = transaction.objectStore('transactions');
                const request = store.put(updatedTransaction);
                
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    async getTransactionById(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error('Banco não inicializado'));
            const transaction = this.db.transaction(['transactions'], 'readonly');
            const store = transaction.objectStore('transactions');
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteTransaction(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error('Banco não inicializado'));
            const transaction = this.db.transaction(['transactions'], 'readwrite');
            const store = transaction.objectStore('transactions');
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getFinancialTotals() {
        try {
            const transactions = await this.getAllTransactions();
            const investments = await this.getAllInvestments();
            
            let totalIncome = 0;
            let totalExpenses = 0;
            let totalInvestments = 0;
            let thisMonthIncome = 0;
            let thisMonthExpenses = 0;
            
            const currentDate = new Date();
            const currentMonth = currentDate.toLocaleString('pt-BR', { month: 'long' });
            const currentYear = currentDate.getFullYear();
            
            transactions.forEach(transaction => {
                if (transaction.type === 'Receita') {
                    totalIncome += transaction.value;
                    if (transaction.month === currentMonth && transaction.year === currentYear) {
                        thisMonthIncome += transaction.value;
                    }
                } else if (transaction.type === 'Despesa') {
                    totalExpenses += transaction.value;
                    if (transaction.month === currentMonth && transaction.year === currentYear) {
                        thisMonthExpenses += transaction.value;
                    }
                }
            });
            
            // Calcular total investido
            investments.forEach(investment => {
                totalInvestments += investment.value;
            });
            
            const currentBalance = totalIncome - totalExpenses;
            const monthlyAverage = transactions.length > 0 ? 
                (totalIncome + totalExpenses) / (transactions.length / 2) : 0;
            
            // Calcular mês anterior
            const monthNames = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 
                               'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
            const currentMonthIndex = monthNames.indexOf(currentMonth.toLowerCase());
            const lastMonthIndex = currentMonthIndex === 0 ? 11 : currentMonthIndex - 1;
            const lastMonth = monthNames[lastMonthIndex];
            const lastMonthYear = currentMonthIndex === 0 ? currentYear - 1 : currentYear;
            
            let lastMonthIncome = 0;
            let lastMonthExpenses = 0;
            
            transactions.forEach(transaction => {
                if (transaction.month === lastMonth && transaction.year === lastMonthYear) {
                    if (transaction.type === 'Receita') {
                        lastMonthIncome += transaction.value;
                    } else if (transaction.type === 'Despesa') {
                        lastMonthExpenses += transaction.value;
                    }
                }
            });
            
            return {
                totalIncome,
                totalExpenses,
                totalInvestments,
                currentBalance,
                monthlyAverage,
                thisMonthIncome,
                thisMonthExpenses,
                lastMonthIncome,
                lastMonthExpenses
            };
        } catch (error) {
            console.error('Erro ao calcular totais:', error);
            return {
                totalIncome: 0,
                totalExpenses: 0,
                totalInvestments: 0,
                currentBalance: 0,
                monthlyAverage: 0,
                thisMonthIncome: 0,
                thisMonthExpenses: 0,
                lastMonthIncome: 0,
                lastMonthExpenses: 0
            };
        }
    }

    async getUniqueCategories() {
        try {
            const transactions = await this.getAllTransactions();
            const categories = [...new Set(transactions.map(t => t.category))];
            return categories.sort();
        } catch (error) {
            console.error('Erro ao obter categorias:', error);
            return [];
        }
    }

    async getUniqueMonths() {
        try {
            const transactions = await this.getAllTransactions();
            const months = [...new Set(transactions.map(t => t.month))];
            const monthOrder = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 
                               'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
            return months.sort((a, b) => {
                return monthOrder.indexOf(a.toLowerCase()) - monthOrder.indexOf(b.toLowerCase());
            });
        } catch (error) {
            console.error('Erro ao obter meses:', error);
            return [];
        }
    }

    async getExpensesByCategory(month = null, year = null) {
        try {
            const transactions = await this.getAllTransactions();
            let expenses = transactions.filter(t => t.type === 'Despesa');
            
            if (month) expenses = expenses.filter(t => t.month === month);
            if (year) expenses = expenses.filter(t => t.year === year);
            
            const grouped = {};
            expenses.forEach(expense => {
                if (!grouped[expense.category]) {
                    grouped[expense.category] = 0;
                }
                grouped[expense.category] += expense.value;
            });
            
            return grouped;
        } catch (error) {
            console.error('Erro ao obter despesas por categoria:', error);
            return {};
        }
    }

    async getBalanceEvolution() {
        try {
            const transactions = await this.getAllTransactions();
            const grouped = {};
            
            transactions.forEach(transaction => {
                const key = `${transaction.month}/${transaction.year}`;
                if (!grouped[key]) {
                    grouped[key] = { income: 0, expenses: 0, balance: 0 };
                }
                
                if (transaction.type === 'Receita') {
                    grouped[key].income += transaction.value;
                } else if (transaction.type === 'Despesa') {
                    grouped[key].expenses += transaction.value;
                }
                
                grouped[key].balance = grouped[key].income - grouped[key].expenses;
            });
            
            const result = Object.keys(grouped).map(key => {
                const [month, year] = key.split('/');
                return {
                    month,
                    year: parseInt(year),
                    income: grouped[key].income,
                    expenses: grouped[key].expenses,
                    balance: grouped[key].balance
                };
            });
            
            const monthOrder = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 
                               'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
            
            return result.sort((a, b) => {
                if (a.year !== b.year) return a.year - b.year;
                return monthOrder.indexOf(a.month.toLowerCase()) - monthOrder.indexOf(b.month.toLowerCase());
            });
        } catch (error) {
            console.error('Erro ao obter evolução do saldo:', error);
            return [];
        }
    }

    // Métodos para limites
    async addLimit(limit) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error('Banco não inicializado'));
            const transaction = this.db.transaction(['limits'], 'readwrite');
            const store = transaction.objectStore('limits');
            const request = store.add(limit);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllLimits() {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error('Banco não inicializado'));
            const transaction = this.db.transaction(['limits'], 'readonly');
            const store = transaction.objectStore('limits');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteLimit(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error('Banco não inicializado'));
            const transaction = this.db.transaction(['limits'], 'readwrite');
            const store = transaction.objectStore('limits');
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getCategorySpentThisMonth(category) {
        try {
            const transactions = await this.getAllTransactions();
            const currentDate = new Date();
            const currentMonth = currentDate.toLocaleString('pt-BR', { month: 'long' });
            const currentYear = currentDate.getFullYear();
            
            const categoryTransactions = transactions.filter(t => 
                t.category === category && 
                t.type === 'Despesa' &&
                t.month === currentMonth &&
                t.year === currentYear
            );
            
            return categoryTransactions.reduce((total, t) => total + t.value, 0);
        } catch (error) {
            console.error('Erro ao obter gasto da categoria:', error);
            return 0;
        }
    }

    async getFinancialAlerts() {
        try {
            const limits = await this.getAllLimits();
            const alerts = [];
            
            for (const limit of limits) {
                const spent = await this.getCategorySpentThisMonth(limit.category);
                const percentage = (spent / limit.limit) * 100;
                
                if (percentage > 100) {
                    alerts.push({
                        type: 'danger',
                        category: limit.category,
                        message: `Limite ultrapassado em ${limit.category}!`,
                        percentage: percentage
                    });
                } else if (percentage > 80) {
                    alerts.push({
                        type: 'warning',
                        category: limit.category,
                        message: `Limite próximo em ${limit.category}!`,
                        percentage: percentage
                    });
                }
            }
            
            return alerts;
        } catch (error) {
            console.error('Erro ao obter alertas:', error);
            return [];
        }
    }

    // Métodos para configurações
    async getSettings(type = null) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error('Banco não inicializado'));
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = type ? 
                store.index('type').getAll(type) : 
                store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async addSetting(setting) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error('Banco não inicializado'));
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            const request = store.add(setting);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async updateSetting(id, updates) {
        return new Promise(async (resolve, reject) => {
            if (!this.db) return reject(new Error('Banco não inicializado'));
            
            try {
                const transaction = this.db.transaction(['settings'], 'readwrite');
                const store = transaction.objectStore('settings');
                const request = store.get(id);
                
                request.onsuccess = () => {
                    const existing = request.result;
                    if (!existing) {
                        reject(new Error('Configuração não encontrada'));
                        return;
                    }
                    
                    const updated = { ...existing, ...updates };
                    const updateRequest = store.put(updated);
                    updateRequest.onsuccess = () => resolve(updateRequest.result);
                    updateRequest.onerror = () => reject(updateRequest.error);
                };
                
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    async deleteSetting(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error('Banco não inicializado'));
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Métodos para investimentos
    async addInvestment(investment) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error('Banco não inicializado'));
            
            const transaction = this.db.transaction(['investments'], 'readwrite');
            const store = transaction.objectStore('investments');
            
            // Garantir que os valores sejam números
            if (typeof investment.value === 'string') {
                investment.value = parseFloat(investment.value.replace(',', '.'));
            }
            investment.value = parseFloat(investment.value);
            
            if (investment.currentValue && typeof investment.currentValue === 'string') {
                investment.currentValue = parseFloat(investment.currentValue.replace(',', '.'));
            }
            
            const request = store.add(investment);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllInvestments() {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error('Banco não inicializado'));
            const transaction = this.db.transaction(['investments'], 'readonly');
            const store = transaction.objectStore('investments');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async getInvestmentById(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error('Banco não inicializado'));
            const transaction = this.db.transaction(['investments'], 'readonly');
            const store = transaction.objectStore('investments');
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteInvestment(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error('Banco não inicializado'));
            const transaction = this.db.transaction(['investments'], 'readwrite');
            const store = transaction.objectStore('investments');
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Métodos para exportação/importação
    async exportAllData() {
        try {
            const transactions = await this.getAllTransactions();
            const limits = await this.getAllLimits();
            const settings = await this.getSettings();
            const investments = await this.getAllInvestments();
            
            return {
                transactions,
                limits,
                settings,
                investments,
                exportDate: new Date().toISOString(),
                version: '4.3'
            };
        } catch (error) {
            console.error('Erro ao exportar dados:', error);
            throw error;
        }
    }

    async importData(data) {
        return new Promise(async (resolve, reject) => {
            if (!this.db) return reject(new Error('Banco não inicializado'));
            
            try {
                // Limpar dados existentes
                await this.clearAllData();
                
                // Importar transações
                if (data.transactions && Array.isArray(data.transactions)) {
                    for (const transaction of data.transactions) {
                        await this.addTransaction(transaction);
                    }
                }
                
                // Importar limites
                if (data.limits && Array.isArray(data.limits)) {
                    for (const limit of data.limits) {
                        await this.addLimit(limit);
                    }
                }
                
                // Importar configurações
                if (data.settings && Array.isArray(data.settings)) {
                    for (const setting of data.settings) {
                        await this.addSetting(setting);
                    }
                }
                
                // Importar investimentos
                if (data.investments && Array.isArray(data.investments)) {
                    for (const investment of data.investments) {
                        await this.addInvestment(investment);
                    }
                }
                
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    async clearAllData() {
        return new Promise(async (resolve, reject) => {
            if (!this.db) return reject(new Error('Banco não inicializado'));
            
            const transaction = this.db.transaction(
                ['transactions', 'limits', 'settings', 'investments'], 
                'readwrite'
            );
            
            const clearStore = (storeName) => {
                return new Promise((resolveStore, rejectStore) => {
                    const store = transaction.objectStore(storeName);
                    const request = store.clear();
                    request.onsuccess = () => resolveStore();
                    request.onerror = () => rejectStore(request.error);
                });
            };
            
            try {
                await clearStore('transactions');
                await clearStore('limits');
                await clearStore('settings');
                await clearStore('investments');
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }
}

// ============================================
// CLASSE: SettingsManager - VERSÃO COMPLETA ATUALIZADA
// ============================================
class SettingsManager {
    constructor(database, app) {
        this.database = database;
        this.app = app;
        this.settings = {
            types: [],
            categories: [],
            classifications: []
        };
    }

    /**
     * Carrega configurações do banco
     */
    async loadSettings() {
        try {
            const allSettings = await this.database.getSettings();
            
            // Separar por tipo
            this.settings.types = allSettings.filter(s => s.type === 'type');
            this.settings.categories = allSettings.filter(s => s.type === 'category');
            this.settings.classifications = allSettings.filter(s => s.type === 'classification');
            
            // Se não houver configurações, criar padrões
            if (this.settings.types.length === 0) {
                await this.createDefaultSettings();
            }
            
            return this.settings;
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
            await this.createDefaultSettings();
            return this.settings;
        }
    }

    /**
     * Obtém configurações do banco de dados
     */
    async getSettings() {
        try {
            if (!this.database || !this.database.db) {
                console.warn('Database not initialized, returning cached settings');
                return this.getAllSettingsAsArray();
            }
            
            const settings = await this.database.getSettings();
            console.log('Settings loaded from database:', settings.length);
            return settings;
        } catch (error) {
            console.error('Error loading settings from database:', error);
            return this.getAllSettingsAsArray();
        }
    }

    /**
     * Retorna todas as configurações como array (fallback)
     */
    getAllSettingsAsArray() {
        return [
            ...this.settings.types,
            ...this.settings.categories,
            ...this.settings.classifications
        ];
    }

    /**
     * Cria configurações padrão
     */
    async createDefaultSettings() {
        const defaultTypes = [
            { type: 'type', name: 'Receita' },
            { type: 'type', name: 'Despesa' },
            { type: 'type', name: 'Investimento' }
        ];
        
        const defaultCategories = [
            { type: 'category', name: 'Salário', parentType: 'Receita' },
            { type: 'category', name: 'Freelance', parentType: 'Receita' },
            { type: 'category', name: 'Investimentos', parentType: 'Receita' },
            { type: 'category', name: 'Alimentação', parentType: 'Despesa' },
            { type: 'category', name: 'Transporte', parentType: 'Despesa' },
            { type: 'category', name: 'Moradia', parentType: 'Despesa' },
            { type: 'category', name: 'Saúde', parentType: 'Despesa' },
            { type: 'category', name: 'Educação', parentType: 'Despesa' },
            { type: 'category', name: 'Lazer', parentType: 'Despesa' },
            { type: 'category', name: 'Outros', parentType: 'Despesa' },
            { type: 'category', name: 'Renda Fixa', parentType: 'Investimento' },
            { type: 'category', name: 'Renda Variável', parentType: 'Investimento' },
            { type: 'category', name: 'Serviços', parentType: 'Despesa' },
            { type: 'category', name: 'Fundo Imobiliário', parentType: 'Investimento' }
        ];
        
        const defaultClassifications = [
            { type: 'classification', name: 'Fixa' },
            { type: 'classification', name: 'Variável' },
            { type: 'classification', name: 'Ocasionais' }
        ];
        
        try {
            // Salvar tipos
            for (const type of defaultTypes) {
                await this.database.addSetting(type);
            }
            
            // Salvar categorias
            for (const category of defaultCategories) {
                await this.database.addSetting(category);
            }
            
            // Salvar classificações
            for (const classification of defaultClassifications) {
                await this.database.addSetting(classification);
            }
            
            // Recarregar configurações
            await this.loadSettings();
            
            console.log('Configurações padrão criadas com sucesso');
        } catch (error) {
            console.error('Erro ao criar configurações padrão:', error);
        }
    }

    /**
     * Carrega configurações na UI
     */
    async loadSettingsUI() {
        await this.populateTypesList();
        await this.populateCategoriesList();
        await this.populateClassificationsList();
        await this.populateTypeFilter();
        
        // Configurar listeners para edição e exclusão
        this.setupSettingsEventListeners();
    }

    /**
     * Popula lista de tipos com botões de ação
     */
    async populateTypesList() {
        const container = document.getElementById('typesList');
        if (!container) return;
        
        let html = '';
        if (this.settings.types.length === 0) {
            html = '<p style="color: var(--gray-color); padding: 20px; text-align: center;">Nenhum tipo configurado</p>';
        } else {
            this.settings.types.forEach(type => {
                html += `
                    <div class="settings-item" data-id="${type.id}" data-type="type">
                        <div class="settings-item-content">
                            <div class="settings-item-name">${type.name}</div>
                            <div class="settings-item-subtitle">Tipo de Transação</div>
                        </div>
                        <div class="settings-item-actions" style="display: flex; gap: 8px;">
                            <button class="btn-icon btn-edit edit-setting" data-id="${type.id}" data-type="type" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon btn-delete delete-setting" data-id="${type.id}" data-type="type" title="Excluir">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
        }
        
        container.innerHTML = html;
    }

    /**
     * Popula lista de categorias
     */
    async populateCategoriesList() {
        const container = document.getElementById('categoriesList');
        if (!container) return;
        
        const filterType = document.getElementById('categoryTypeFilter')?.value || '';
        let filteredCategories = this.settings.categories;
        
        if (filterType) {
            filteredCategories = filteredCategories.filter(cat => cat.parentType === filterType);
        }
        
        let html = '';
        if (filteredCategories.length === 0) {
            html = '<p style="color: var(--gray-color); padding: 20px; text-align: center;">Nenhuma categoria configurada</p>';
        } else {
            filteredCategories.forEach(category => {
                html += `
                    <div class="settings-item" data-id="${category.id}" data-type="category">
                        <div class="settings-item-content">
                            <div class="settings-item-name">${category.name}</div>
                            <div class="settings-item-subtitle">Tipo: ${category.parentType}</div>
                        </div>
                        <div class="settings-item-actions" style="display: flex; gap: 8px;">
                            <button class="btn-icon btn-edit edit-setting" data-id="${category.id}" data-type="category" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon btn-delete delete-setting" data-id="${category.id}" data-type="category" title="Excluir">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
        }
        
        container.innerHTML = html;
    }

    /**
     * Popula lista de classificações
     */
    async populateClassificationsList() {
        const container = document.getElementById('classificationsList');
        if (!container) return;
        
        let html = '';
        if (this.settings.classifications.length === 0) {
            html = '<p style="color: var(--gray-color); padding: 20px; text-align: center;">Nenhuma classificação configurada</p>';
        } else {
            this.settings.classifications.forEach(classification => {
                html += `
                    <div class="settings-item" data-id="${classification.id}" data-type="classification">
                        <div class="settings-item-content">
                            <div class="settings-item-name">${classification.name}</div>
                            <div class="settings-item-subtitle">Classificação</div>
                        </div>
                        <div class="settings-item-actions" style="display: flex; gap: 8px;">
                            <button class="btn-icon btn-edit edit-setting" data-id="${classification.id}" data-type="classification" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon btn-delete delete-setting" data-id="${classification.id}" data-type="classification" title="Excluir">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
        }
        
        container.innerHTML = html;
    }

    /**
     * Popula filtro de tipo e select do formulário
     */
    async populateTypeFilter() {
        const filter = document.getElementById('categoryTypeFilter');
        const newCategoryType = document.getElementById('newCategoryType');
        
        if (filter) {
            let html = '<option value="">Todos os tipos</option>';
            this.settings.types.forEach(type => {
                html += `<option value="${type.name}">${type.name}</option>`;
            });
            filter.innerHTML = html;
        }
        
        // Popular também o select do formulário de nova categoria
        if (newCategoryType) {
            let html = '<option value="">Selecione o tipo</option>';
            this.settings.types.forEach(type => {
                html += `<option value="${type.name}">${type.name}</option>`;
            });
            newCategoryType.innerHTML = html;
        }
    }

    /**
     * Filtra categorias por tipo
     */
    async filterCategoriesByType() {
        await this.populateCategoriesList();
    }

    /**
     * Configura listeners para edição e exclusão
     */
    setupSettingsEventListeners() {
        // Usar delegação de eventos para elementos dinâmicos
        document.addEventListener('click', async (e) => {
            // Botões de edição
            const editBtn = e.target.closest('.edit-setting');
            if (editBtn) {
                e.preventDefault();
                const id = parseInt(editBtn.getAttribute('data-id'));
                const type = editBtn.getAttribute('data-type');
                this.enableEditMode(id, type);
                return;
            }
            
            // Botões de exclusão
            const deleteBtn = e.target.closest('.delete-setting');
            if (deleteBtn) {
                e.preventDefault();
                const id = parseInt(deleteBtn.getAttribute('data-id'));
                const type = deleteBtn.getAttribute('data-type');
                await this.confirmDelete(id, type);
                return;
            }
            
            // Botões de salvar edição
            const saveBtn = e.target.closest('.save-edit');
            if (saveBtn) {
                e.preventDefault();
                const id = parseInt(saveBtn.getAttribute('data-id'));
                const type = saveBtn.getAttribute('data-type');
                await this.saveEdit(id, type);
                return;
            }
            
            // Botões de cancelar edição
            const cancelBtn = e.target.closest('.cancel-edit');
            if (cancelBtn) {
                e.preventDefault();
                const type = cancelBtn.getAttribute('data-type');
                await this.cancelEdit(type);
                return;
            }
        });
    }

    /**
     * Habilita modo de edição para um item
     */
    enableEditMode(id, type) {
        let item;
        let settingsList;
        
        switch(type) {
            case 'type':
                item = this.settings.types.find(t => t.id === id);
                settingsList = 'typesList';
                break;
            case 'category':
                item = this.settings.categories.find(c => c.id === id);
                settingsList = 'categoriesList';
                break;
            case 'classification':
                item = this.settings.classifications.find(c => c.id === id);
                settingsList = 'classificationsList';
                break;
            default:
                return;
        }
        
        if (!item) return;
        
        const container = document.getElementById(settingsList);
        if (!container) return;
        
        const itemElement = container.querySelector(`[data-id="${id}"]`);
        if (!itemElement) return;
        
        let editHtml = '';
        
        switch(type) {
            case 'type':
                editHtml = this.getTypeEditHtml(item);
                break;
            case 'category':
                editHtml = this.getCategoryEditHtml(item);
                break;
            case 'classification':
                editHtml = this.getClassificationEditHtml(item);
                break;
        }
        
        itemElement.innerHTML = editHtml;
        
        // Focar no campo de edição
        const input = itemElement.querySelector('input, select');
        if (input) {
            input.focus();
            if (input.tagName === 'INPUT') {
                input.select();
            }
        }
    }

    /**
     * Retorna HTML para edição de tipo
     */
    getTypeEditHtml(type) {
        return `
            <div class="settings-item-content" style="flex: 1;">
                <input type="text" class="settings-edit-input" value="${type.name}" 
                       placeholder="Nome do tipo" style="width: 100%; padding: 8px; border-radius: 5px; border: 1px solid var(--primary-color);">
            </div>
            <div class="settings-item-actions" style="display: flex; gap: 8px;">
                <button class="btn-icon btn-success save-edit" data-id="${type.id}" data-type="type" title="Salvar">
                    <i class="fas fa-check"></i>
                </button>
                <button class="btn-icon btn-outline cancel-edit" data-type="type" title="Cancelar">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }

    /**
     * Retorna HTML para edição de categoria
     */
    getCategoryEditHtml(category) {
        // Gerar opções de tipos
        let typeOptions = '';
        this.settings.types.forEach(type => {
            const selected = type.name === category.parentType ? 'selected' : '';
            typeOptions += `<option value="${type.name}" ${selected}>${type.name}</option>`;
        });
        
        return `
            <div class="settings-item-content" style="flex: 1;">
                <div style="margin-bottom: 10px;">
                    <input type="text" class="settings-edit-input" value="${category.name}" 
                           placeholder="Nome da categoria" style="width: 100%; padding: 8px; border-radius: 5px; border: 1px solid var(--primary-color);">
                </div>
                <div>
                    <select class="settings-edit-select" style="width: 100%; padding: 8px; border-radius: 5px; border: 1px solid var(--primary-color);">
                        <option value="">Selecione o tipo</option>
                        ${typeOptions}
                    </select>
                </div>
            </div>
            <div class="settings-item-actions" style="display: flex; gap: 8px;">
                <button class="btn-icon btn-success save-edit" data-id="${category.id}" data-type="category" title="Salvar">
                    <i class="fas fa-check"></i>
                </button>
                <button class="btn-icon btn-outline cancel-edit" data-type="category" title="Cancelar">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }

    /**
     * Retorna HTML para edição de classificação
     */
    getClassificationEditHtml(classification) {
        return `
            <div class="settings-item-content" style="flex: 1;">
                <input type="text" class="settings-edit-input" value="${classification.name}" 
                       placeholder="Nome da classificação" style="width: 100%; padding: 8px; border-radius: 5px; border: 1px solid var(--primary-color);">
            </div>
            <div class="settings-item-actions" style="display: flex; gap: 8px;">
                <button class="btn-icon btn-success save-edit" data-id="${classification.id}" data-type="classification" title="Salvar">
                    <i class="fas fa-check"></i>
                </button>
                <button class="btn-icon btn-outline cancel-edit" data-type="classification" title="Cancelar">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }

    /**
     * Salva edição de um item
     */
    async saveEdit(id, type) {
        let container;
        let itemElement;
        let updates = {};
        
        switch(type) {
            case 'type':
                container = document.getElementById('typesList');
                itemElement = container?.querySelector(`[data-id="${id}"]`);
                if (!itemElement) return;
                
                const typeInput = itemElement.querySelector('.settings-edit-input');
                const newName = typeInput?.value.trim();
                
                if (!newName) {
                    this.app.showNotification('O nome não pode estar vazio.', 'error');
                    return;
                }
                
                // Verificar se já existe
                const existingType = this.settings.types.find(t => 
                    t.name.toLowerCase() === newName.toLowerCase() && t.id !== id);
                if (existingType) {
                    this.app.showNotification('Já existe um tipo com esse nome.', 'error');
                    return;
                }
                
                updates = { name: newName };
                break;
                
            case 'category':
                container = document.getElementById('categoriesList');
                itemElement = container?.querySelector(`[data-id="${id}"]`);
                if (!itemElement) return;
                
                const catInput = itemElement.querySelector('.settings-edit-input');
                const catSelect = itemElement.querySelector('.settings-edit-select');
                const catName = catInput?.value.trim();
                const parentType = catSelect?.value;
                
                if (!catName || !parentType) {
                    this.app.showNotification('Preencha todos os campos.', 'error');
                    return;
                }
                
                // Verificar se já existe
                const existingCategory = this.settings.categories.find(c => 
                    c.name.toLowerCase() === catName.toLowerCase() && 
                    c.parentType === parentType && 
                    c.id !== id);
                if (existingCategory) {
                    this.app.showNotification('Já existe uma categoria com esse nome e tipo.', 'error');
                    return;
                }
                
                // Buscar ID do tipo
                const typeObj = this.settings.types.find(t => t.name === parentType);
                if (!typeObj) {
                    this.app.showNotification('Tipo não encontrado.', 'error');
                    return;
                }
                
                updates = { 
                    name: catName, 
                    parentType: parentType,
                    parentTypeId: typeObj.id 
                };
                break;
                
            case 'classification':
                container = document.getElementById('classificationsList');
                itemElement = container?.querySelector(`[data-id="${id}"]`);
                if (!itemElement) return;
                
                const classInput = itemElement.querySelector('.settings-edit-input');
                const className = classInput?.value.trim();
                
                if (!className) {
                    this.app.showNotification('O nome não pode estar vazio.', 'error');
                    return;
                }
                
                // Verificar se já existe
                const existingClass = this.settings.classifications.find(c => 
                    c.name.toLowerCase() === className.toLowerCase() && c.id !== id);
                if (existingClass) {
                    this.app.showNotification('Já existe uma classificação com esse nome.', 'error');
                    return;
                }
                
                updates = { name: className };
                break;
        }
        
        try {
            await this.database.updateSetting(id, updates);
            
            // Atualizar localmente
            switch(type) {
                case 'type':
                    const typeIndex = this.settings.types.findIndex(t => t.id === id);
                    if (typeIndex !== -1) {
                        this.settings.types[typeIndex] = { ...this.settings.types[typeIndex], ...updates };
                    }
                    break;
                case 'category':
                    const catIndex = this.settings.categories.findIndex(c => c.id === id);
                    if (catIndex !== -1) {
                        this.settings.categories[catIndex] = { ...this.settings.categories[catIndex], ...updates };
                    }
                    break;
                case 'classification':
                    const classIndex = this.settings.classifications.findIndex(c => c.id === id);
                    if (classIndex !== -1) {
                        this.settings.classifications[classIndex] = { ...this.settings.classifications[classIndex], ...updates };
                    }
                    break;
            }
            
            // Recarregar UI
            await this.loadSettingsUI();
            
            // Atualizar selects dependentes
            await this.updateAllSelects();
            
            this.app.showNotification(`${type === 'type' ? 'Tipo' : type === 'category' ? 'Categoria' : 'Classificação'} atualizado com sucesso!`, 'success');
            
        } catch (error) {
            console.error(`Erro ao atualizar ${type}:`, error);
            this.app.showNotification(`Erro ao atualizar: ${error.message}`, 'error');
        }
    }

    /**
     * Cancela modo de edição
     */
    async cancelEdit(type) {
        await this.loadSettingsUI();
    }

    /**
     * Confirma exclusão de um item
     */
    async confirmDelete(id, type) {
        let itemName = '';
        let itemTypeName = '';
        
        switch(type) {
            case 'type':
                const typeItem = this.settings.types.find(t => t.id === id);
                if (!typeItem) return;
                itemName = typeItem.name;
                itemTypeName = 'tipo';
                
                // Verificar se há categorias usando este tipo
                const categoriesUsingType = this.settings.categories.filter(c => c.parentType === itemName);
                if (categoriesUsingType.length > 0) {
                    this.app.showNotification(
                        `Não é possível excluir este tipo pois existem ${categoriesUsingType.length} categorias vinculadas a ele.`, 
                        'error'
                    );
                    return;
                }
                break;
                
            case 'category':
                const categoryItem = this.settings.categories.find(c => c.id === id);
                if (!categoryItem) return;
                itemName = categoryItem.name;
                itemTypeName = 'categoria';
                break;
                
            case 'classification':
                const classItem = this.settings.classifications.find(c => c.id === id);
                if (!classItem) return;
                itemName = classItem.name;
                itemTypeName = 'classificação';
                break;
        }
        
        const confirmMessage = `Deseja realmente excluir a ${itemTypeName} "${itemName}"?`;
        
        if (confirm(confirmMessage)) {
            await this.deleteItem(id, type);
        }
    }

    /**
     * Exclui um item
     */
    async deleteItem(id, type) {
        try {
            await this.database.deleteSetting(id);
            
            // Remover localmente
            switch(type) {
                case 'type':
                    this.settings.types = this.settings.types.filter(t => t.id !== id);
                    break;
                case 'category':
                    this.settings.categories = this.settings.categories.filter(c => c.id !== id);
                    break;
                case 'classification':
                    this.settings.classifications = this.settings.classifications.filter(c => c.id !== id);
                    break;
            }
            
            // Recarregar UI
            await this.loadSettingsUI();
            
            // Atualizar selects dependentes
            await this.updateAllSelects();
            
            this.app.showNotification(`${type === 'type' ? 'Tipo' : type === 'category' ? 'Categoria' : 'Classificação'} excluído com sucesso!`, 'success');
            
        } catch (error) {
            console.error(`Erro ao excluir ${type}:`, error);
            this.app.showNotification(`Erro ao excluir: ${error.message}`, 'error');
        }
    }

    /**
     * Adiciona um novo tipo
     */
    async addType() {
        const input = document.getElementById('newType');
        const name = input.value.trim();
        
        if (!this.validateName(name, 'tipo')) {
            return;
        }
        
        // Verificar se já existe
        if (this.settings.types.some(t => t.name.toLowerCase() === name.toLowerCase())) {
            this.app.showNotification('Este tipo já existe.', 'error');
            return;
        }
        
        try {
            const newType = { type: 'type', name };
            const id = await this.database.addSetting(newType);
            newType.id = id;
            this.settings.types.push(newType);
            
            input.value = '';
            await this.loadSettingsUI();
            await this.updateAllSelects();
            
            this.app.showNotification('Tipo adicionado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao adicionar tipo:', error);
            this.app.showNotification('Erro ao adicionar tipo: ' + error.message, 'error');
        }
    }

    /**
     * Adiciona uma nova categoria
     */
    async addCategory() {
        const nameInput = document.getElementById('newCategory');
        const typeInput = document.getElementById('newCategoryType');
        
        const name = nameInput.value.trim();
        const parentType = typeInput.value;
        
        if (!this.validateName(name, 'categoria') || !this.validateParentType(parentType)) {
            return;
        }
        
        // Verificar se já existe
        if (this.settings.categories.some(c => 
            c.name.toLowerCase() === name.toLowerCase() && c.parentType === parentType)) {
            this.app.showNotification('Esta categoria já existe para este tipo.', 'error');
            return;
        }
        
        try {
            // Buscar ID do tipo
            const typeObj = this.settings.types.find(t => t.name === parentType);
            if (!typeObj) {
                this.app.showNotification('Tipo não encontrado.', 'error');
                return;
            }
            
            const newCategory = { 
                type: 'category', 
                name, 
                parentType,
                parentTypeId: typeObj.id 
            };
            
            const id = await this.database.addSetting(newCategory);
            newCategory.id = id;
            this.settings.categories.push(newCategory);
            
            nameInput.value = '';
            await this.loadSettingsUI();
            await this.updateAllSelects();
            
            this.app.showNotification('Categoria adicionada com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao adicionar categoria:', error);
            this.app.showNotification('Erro ao adicionar categoria: ' + error.message, 'error');
        }
    }

    /**
     * Adiciona uma nova classificação
     */
    async addClassification() {
        const input = document.getElementById('newClassification');
        const name = input.value.trim();
        
        if (!this.validateName(name, 'classificação')) {
            return;
        }
        
        // Verificar se já existe
        if (this.settings.classifications.some(c => c.name.toLowerCase() === name.toLowerCase())) {
            this.app.showNotification('Esta classificação já existe.', 'error');
            return;
        }
        
        try {
            const newClassification = { type: 'classification', name };
            const id = await this.database.addSetting(newClassification);
            newClassification.id = id;
            this.settings.classifications.push(newClassification);
            
            input.value = '';
            await this.loadSettingsUI();
            await this.updateAllSelects();
            
            this.app.showNotification('Classificação adicionada com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao adicionar classificação:', error);
            this.app.showNotification('Erro ao adicionar classificação: ' + error.message, 'error');
        }
    }

    /**
     * Valida nome de item
     */
    validateName(name, itemType) {
        if (!name || !name.trim()) {
            this.app.showNotification(`Digite um nome para a ${itemType}.`, 'error');
            return false;
        }
        
        if (name.length < 2) {
            this.app.showNotification(`O nome da ${itemType} deve ter pelo menos 2 caracteres.`, 'error');
            return false;
        }
        
        if (name.length > 50) {
            this.app.showNotification(`O nome da ${itemType} deve ter no máximo 50 caracteres.`, 'error');
            return false;
        }
        
        return true;
    }

    /**
     * Valida tipo pai para categoria
     */
    validateParentType(parentType) {
        if (!parentType) {
            this.app.showNotification('Selecione um tipo para a categoria.', 'error');
            return false;
        }
        
        return true;
    }

    /**
     * Atualiza todos os selects do sistema
     */
    async updateAllSelects() {
        await this.updateAllTypeSelects();
        await this.updateAllCategorySelects();
        await this.updateAllClassificationSelects();
    }

    /**
     * Atualiza todos os selects de tipo no sistema
     */
    async updateAllTypeSelects() {
        const selects = [
            document.getElementById('type'),
            document.getElementById('editType'),
            document.getElementById('filterType'),
            document.getElementById('newCategoryType'),
            document.getElementById('categoryTypeFilter')
        ];
        
        for (const select of selects) {
            if (select) {
                const currentValue = select.value;
                await this.populateTypeSelect(select, currentValue);
            }
        }
    }

    /**
     * Atualiza todos os selects de categoria no sistema
     */
    async updateAllCategorySelects() {
        const selects = [
            document.getElementById('category'),
            document.getElementById('editCategory'),
            document.getElementById('filterCategory')
        ];
        
        for (const select of selects) {
            if (select) {
                const typeSelectId = select.id === 'editCategory' ? 'editType' : 'type';
                const typeSelect = document.getElementById(typeSelectId);
                const type = typeSelect ? typeSelect.value : '';
                const currentValue = select.value;
                await this.populateCategorySelect(select, type, currentValue);
            }
        }
    }

    /**
     * Atualiza todos os selects de classificação no sistema
     */
    async updateAllClassificationSelects() {
        const selects = [
            document.getElementById('classification')
        ];
        
        for (const select of selects) {
            if (select) {
                const currentValue = select.value;
                await this.populateClassificationSelect(select, currentValue);
            }
        }
    }

    /**
     * Popula select de tipos
     */
    async populateTypeSelect(selectElement, selectedValue = '') {
        if (!selectElement) return;
        
        let html = '<option value="">Selecione o tipo</option>';
        this.settings.types.forEach(type => {
            const selected = type.name === selectedValue ? 'selected' : '';
            html += `<option value="${type.name}" ${selected}>${type.name}</option>`;
        });
        
        selectElement.innerHTML = html;
        
        // Adicionar listener para atualizar categorias quando tipo mudar
        if (selectElement.id === 'type' || selectElement.id === 'editType') {
            selectElement.addEventListener('change', (e) => {
                this.updateCategorySelect(e.target.value);
            });
        }
    }

    /**
     * Popula select de categorias
     */
    async populateCategorySelect(selectElement, type = '', selectedValue = '') {
        if (!selectElement) return;
        
        let categories = this.settings.categories;
        if (type) {
            categories = categories.filter(c => c.parentType === type);
        }
        
        let html = '<option value="">Selecione uma categoria</option>';
        categories.forEach(category => {
            const selected = category.name === selectedValue ? 'selected' : '';
            html += `<option value="${category.name}" ${selected}>${category.name}</option>`;
        });
        
        selectElement.innerHTML = html;
        
        // Habilitar/desabilitar select
        if (type) {
            selectElement.disabled = false;
        } else {
            selectElement.disabled = true;
        }
    }

    /**
     * Popula select de classificações
     */
    async populateClassificationSelect(selectElement, selectedValue = '') {
        if (!selectElement) return;
        
        let html = '<option value="">Selecione a classificação</option>';
        this.settings.classifications.forEach(classification => {
            const selected = classification.name === selectedValue ? 'selected' : '';
            html += `<option value="${classification.name}" ${selected}>${classification.name}</option>`;
        });
        
        selectElement.innerHTML = html;
    }

    /**
     * Atualiza select de categorias baseado no tipo selecionado
     */
    async updateCategorySelect(type) {
        const categorySelect = document.getElementById('category');
        if (categorySelect) {
            await this.populateCategorySelect(categorySelect, type);
        }
    }

    /**
     * Obtém todos os tipos
     */
    getTypes() {
        return this.settings.types.map(t => t.name);
    }

    /**
     * Obtém categorias por tipo
     */
    getCategoriesByType(type) {
        return this.settings.categories
            .filter(c => c.parentType === type)
            .map(c => c.name);
    }

    /**
     * Obtém todas as classificações
     */
    getClassifications() {
        return this.settings.classifications.map(c => c.name);
    }

    /**
     * Busca um tipo pelo ID
     */
    getTypeById(id) {
        return this.settings.types.find(t => t.id === id);
    }

    /**
     * Busca uma categoria pelo ID
     */
    getCategoryById(id) {
        return this.settings.categories.find(c => c.id === id);
    }

    /**
     * Busca uma classificação pelo ID
     */
    getClassificationById(id) {
        return this.settings.classifications.find(c => c.id === id);
    }
}

// ============================================
// CLASSE: TransactionTable
// ============================================
class TransactionTable {
    constructor(database) {
        this.database = database;
        this.currentSort = { column: 'date', direction: 'desc' };
        this.currentFilters = {};
    }

    async loadTransactions() {
        try {
            const transactions = await this.database.getFilteredTransactions(this.currentFilters);
            transactions.sort(this.getSortFunction());
            this.renderTable(transactions);
            await this.updateFilterOptions();
            this.updateSortIndicators();
        } catch (error) {
            console.error('Erro ao carregar transações:', error);
            throw error;
        }
    }

    renderTable(transactions) {
        const container = document.getElementById('transactionsTableContainer');
        if (!container) return;
        
        if (transactions.length === 0) {
            container.innerHTML = `
                <div class="table-empty">
                    <div class="table-empty-icon">
                        <i class="fas fa-receipt"></i>
                    </div>
                    <h3 class="table-empty-title">Nenhuma transação encontrada</h3>
                    <p class="table-empty-text">
                        ${this.currentFilters.type || this.currentFilters.month || this.currentFilters.category ? 
                            'Nenhuma transação corresponde aos filtros aplicados.' : 
                            'Adicione sua primeira transação para começar a controlar suas finanças.'}
                    </p>
                    ${!this.currentFilters.type && !this.currentFilters.month && !this.currentFilters.category ? `
                        <button class="btn btn-primary" id="addFirstTransactionBtn">
                            <i class="fas fa-plus"></i> Adicionar Primeira Transação
                        </button>
                    ` : ''}
                </div>
            `;
            
            // Adicionar listener ao botão
            const addBtn = document.getElementById('addFirstTransactionBtn');
            if (addBtn) {
                addBtn.addEventListener('click', () => {
                    if (window.app) window.app.navigateTo('add-transaction');
                });
            }
            
            return;
        }
        
        let html = `
            <table class="transactions-table">
                <thead>
                    <tr>
                        <th data-sort="date">Data <span class="sort-indicator"></span></th>
                        <th data-sort="type">Tipo <span class="sort-indicator"></span></th>
                        <th data-sort="category">Categoria <span class="sort-indicator"></span></th>
                        <th data-sort="value">Valor (R$) <span class="sort-indicator"></span></th>
                        <th>Descrição</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        transactions.forEach(transaction => {
            const valueClass = transaction.type === 'Receita' ? 'income' : 
                             transaction.type === 'Investimento' ? 'investment' : 'expense';
            const valuePrefix = transaction.type === 'Receita' ? '+' : 
                               transaction.type === 'Investimento' ? '↗' : '-';
            
            html += `
                <tr>
                    <td>${this.formatDate(transaction.date)}</td>
                    <td>${transaction.type}</td>
                    <td>${transaction.category}</td>
                    <td class="${valueClass}">${valuePrefix} R$ ${this.formatCurrency(transaction.value)}</td>
                    <td>${transaction.description || '-'}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon btn-edit edit-transaction" data-id="${transaction.id}" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon btn-delete delete-transaction" data-id="${transaction.id}" title="Excluir">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        container.innerHTML = html;
        
        // Adicionar listeners para ordenação
        const headers = container.querySelectorAll('th[data-sort]');
        headers.forEach(th => {
            th.addEventListener('click', () => {
                const column = th.getAttribute('data-sort');
                this.sortTable(column);
            });
        });
    }

    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-BR');
        } catch (error) {
            return dateString;
        }
    }

    formatCurrency(value) {
        return value.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    async updateFilterOptions() {
        try {
            const transactions = await this.database.getAllTransactions();
            
            // SOLUÇÃO SEGURA - Não depende do settingsManager
            let types = ['Receita', 'Despesa', 'Investimento']; // Valores padrão
            
            // Tentar obter do settingsManager se disponível
            if (window.app && window.app.settingsManager) {
                try {
                    const settings = await window.app.settingsManager.getSettings();
                    const typeSettings = settings.filter(s => s.type === 'type');
                    if (typeSettings.length > 0) {
                        types = typeSettings.map(t => t.name);
                    }
                } catch (error) {
                    console.warn('Could not load types from settingsManager, using defaults:', error);
                }
            }
            
            const categories = [...new Set(transactions.map(t => t.category))].sort();
            const months = await this.database.getUniqueMonths();
            
            // Atualizar filtro de tipos
            const typeFilter = document.getElementById('filterType');
            if (typeFilter) {
                let options = '<option value="">Todos os Tipos</option>';
                types.forEach(type => {
                    const selected = this.currentFilters.type === type ? 'selected' : '';
                    options += `<option value="${type}" ${selected}>${type}</option>`;
                });
                typeFilter.innerHTML = options;
            }
            
            // Atualizar filtro de categorias
            const categoryFilter = document.getElementById('filterCategory');
            if (categoryFilter) {
                let options = '<option value="">Todas as Categorias</option>';
                categories.forEach(category => {
                    const selected = this.currentFilters.category === category ? 'selected' : '';
                    options += `<option value="${category}" ${selected}>${category}</option>`;
                });
                categoryFilter.innerHTML = options;
            }
            
            // Atualizar filtro de meses
            const monthFilter = document.getElementById('filterMonth');
            if (monthFilter) {
                let options = '<option value="">Todos os Meses</option>';
                months.forEach(month => {
                    const selected = this.currentFilters.month === month ? 'selected' : '';
                    options += `<option value="${month}" ${selected}>${month}</option>`;
                });
                monthFilter.innerHTML = options;
            }
            
            console.log('Filtros atualizados:', { types, categories: categories.length, months: months.length });
        } catch (error) {
            console.error('Erro ao atualizar filtros:', error);
            // Fallback básico para evitar quebrar a interface
            this.setupBasicFilters();
        }
    }

    /**
     * Configura filtros básicos em caso de erro
     */
    setupBasicFilters() {
        const basicTypes = ['Receita', 'Despesa', 'Investimento'];
        
        const typeFilter = document.getElementById('filterType');
        if (typeFilter) {
            typeFilter.innerHTML = '<option value="">Todos os Tipos</option>' +
                basicTypes.map(t => `<option value="${t}">${t}</option>`).join('');
        }
        
        const categoryFilter = document.getElementById('filterCategory');
        if (categoryFilter) {
            categoryFilter.innerHTML = '<option value="">Todas as Categorias</option>';
        }
        
        const monthFilter = document.getElementById('filterMonth');
        if (monthFilter) {
            monthFilter.innerHTML = '<option value="">Todos os Meses</option>';
        }
    }

    filterTransactions() {
        this.currentFilters = {
            type: document.getElementById('filterType')?.value || '',
            month: document.getElementById('filterMonth')?.value || '',
            category: document.getElementById('filterCategory')?.value || ''
        };
        
        this.loadTransactions();
    }

    sortTable(column) {
        if (this.currentSort.column === column) {
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.column = column;
            this.currentSort.direction = 'asc';
        }
        
        this.loadTransactions();
    }

    getSortFunction() {
        return (a, b) => {
            let aValue = a[this.currentSort.column];
            let bValue = b[this.currentSort.column];
            
            if (this.currentSort.column === 'date') {
                aValue = new Date(aValue);
                bValue = new Date(bValue);
            }
            
            if (this.currentSort.column === 'value') {
                aValue = parseFloat(aValue);
                bValue = parseFloat(bValue);
            }
            
            if (aValue < bValue) {
                return this.currentSort.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return this.currentSort.direction === 'asc' ? 1 : -1;
            }
            return 0;
        };
    }

    updateSortIndicators() {
        document.querySelectorAll('.transactions-table th .sort-indicator').forEach(indicator => {
            indicator.textContent = '';
        });
        
        const currentTh = document.querySelector(`.transactions-table th[data-sort="${this.currentSort.column}"] .sort-indicator`);
        if (currentTh) {
            currentTh.textContent = this.currentSort.direction === 'asc' ? ' ↑' : ' ↓';
        }
    }
}

// ============================================
// CLASSE: TransactionForm
// ============================================
class TransactionForm {
    constructor(database, app) {
        this.database = database;
        this.app = app;
        this.initializeForm();
    }

    async initializeForm() {
        // Configurar data atual como padrão, mas permitir qualquer data
        const dateInput = document.getElementById('date');
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = today;
            dateInput.min = '2000-01-01';
            dateInput.max = '2100-12-31'; // Permitir datas futuras
        }
        
        // Configurar formatação do valor
        const valueInput = document.getElementById('value');
        if (valueInput) {
            valueInput.addEventListener('input', (e) => {
                let value = e.target.value;
                
                // Permitir apenas números, vírgula e ponto
                value = value.replace(/[^\d,.-]/g, '');
                
                // Substituir múltiplos pontos ou vírgulas
                if ((value.match(/,/g) || []).length > 1) {
                    value = value.replace(/,.*/, ',');
                }
                if ((value.match(/\./g) || []).length > 1) {
                    value = value.replace(/\.(?=.*\.)/g, '');
                }
                
                // Garantir apenas 2 casas decimais
                const parts = value.split(/[,.]/);
                if (parts.length > 1 && parts[1].length > 2) {
                    value = parts[0] + ',' + parts[1].substring(0, 2);
                }
                
                e.target.value = value;
            });
            
            valueInput.addEventListener('blur', () => {
                if (valueInput.value) {
                    const value = this.app.parseCurrency(valueInput.value);
                    if (!isNaN(value)) {
                        valueInput.value = value.toFixed(2).replace('.', ',');
                    }
                }
            });
        }
        
        // Configurar selects dinâmicos
        await this.populateSelects();
        
        // Configurar envio do formulário
        const form = document.getElementById('transactionForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSubmit();
            });
        }
    }

    async populateSelects() {
        if (!this.app.settingsManager) return;
        
        // Popular tipo
        await this.app.settingsManager.populateTypeSelect(document.getElementById('type'));
        
        // Popular classificação
        await this.app.settingsManager.populateClassificationSelect(document.getElementById('classification'));
        
        // Adicionar listener para atualizar categorias quando tipo mudar
        const typeSelect = document.getElementById('type');
        if (typeSelect) {
            typeSelect.addEventListener('change', async (e) => {
                await this.app.settingsManager.updateCategorySelect(e.target.value);
            });
        }
    }

    async handleSubmit() {
        if (!this.validateForm()) return;
        
        const transaction = {
            date: document.getElementById('date').value,
            type: document.getElementById('type').value,
            category: document.getElementById('category').value,
            classification: document.getElementById('classification').value,
            value: this.app.parseCurrency(document.getElementById('value').value),
            subcategory: document.getElementById('subcategory').value || '',
            description: document.getElementById('description').value || '',
            note: document.getElementById('note').value || ''
        };
        
        try {
            await this.database.addTransaction(transaction);
            this.resetForm();
            
            // Notificar mudanças
            await this.app.notifyDataChange();
            
            // Navegar para transações
            this.app.navigateTo('transactions');
            
            // Mostrar notificação
            this.app.showNotification('Transação adicionada com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao salvar transação:', error);
            this.app.showNotification('Erro ao salvar transação: ' + error.message, 'error');
        }
    }

    validateForm() {
        const requiredFields = ['date', 'type', 'category', 'classification', 'value'];
        let isValid = true;
        
        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field && !field.value.trim()) {
                this.showFieldError(field, 'Este campo é obrigatório');
                isValid = false;
            } else if (field) {
                this.clearFieldError(field);
            }
        });
        
        const valueField = document.getElementById('value');
        if (valueField && valueField.value) {
            const value = this.app.parseCurrency(valueField.value);
            if (isNaN(value) || value <= 0) {
                this.showFieldError(valueField, 'Valor deve ser maior que zero');
                isValid = false;
            }
        }
        
        // Validar data
        const dateField = document.getElementById('date');
        if (dateField && dateField.value) {
            const date = new Date(dateField.value);
            if (isNaN(date.getTime())) {
                this.showFieldError(dateField, 'Data inválida');
                isValid = false;
            }
        }
        
        return isValid;
    }

    showFieldError(field, message) {
        this.clearFieldError(field);
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.style.color = 'var(--danger-color)';
        errorDiv.style.fontSize = '0.85rem';
        errorDiv.style.marginTop = '5px';
        errorDiv.textContent = message;
        
        field.parentNode.appendChild(errorDiv);
        field.style.borderColor = 'var(--danger-color)';
    }

    clearFieldError(field) {
        if (!field || !field.parentNode) return;
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) existingError.remove();
        field.style.borderColor = '';
    }

    async resetForm() {
        const form = document.getElementById('transactionForm');
        if (!form) return;
        
        form.reset();
        
        // Resetar data para hoje
        const dateInput = document.getElementById('date');
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = today;
        }
        
        // Resetar selects
        await this.populateSelects();
        
        // Limpar erros
        document.querySelectorAll('.field-error').forEach(error => error.remove());
        document.querySelectorAll('input, select, textarea').forEach(field => {
            field.style.borderColor = '';
        });
    }
}

// ============================================
// CLASSE: DashboardController
// ============================================
class DashboardController {
    constructor(database, app) {
        this.database = database;
        this.app = app;
    }

    async updateDashboard() {
        await this.updateCards();
        await this.updateAlerts();
    }

    async updateCards() {
        try {
            const totals = await this.database.getFinancialTotals();
            
            // Atualizar cards
            this.updateElement('totalIncome', `R$ ${this.app.formatCurrency(totals.totalIncome)}`);
            this.updateElement('totalExpenses', `R$ ${this.app.formatCurrency(totals.totalExpenses)}`);
            this.updateElement('currentBalance', `R$ ${this.app.formatCurrency(totals.currentBalance)}`);
            this.updateElement('totalInvested', `R$ ${this.app.formatCurrency(totals.totalInvestments)}`);
            this.updateElement('lastMonthIncome', `R$ ${this.app.formatCurrency(totals.lastMonthIncome)}`);
            this.updateElement('lastMonthExpenses', `R$ ${this.app.formatCurrency(totals.lastMonthExpenses)}`);
            
            // Colorir saldo
            const balanceElement = document.getElementById('currentBalance');
            if (balanceElement) {
                if (totals.currentBalance < 0) {
                    balanceElement.classList.remove('card-positive');
                    balanceElement.classList.add('card-negative');
                } else {
                    balanceElement.classList.remove('card-negative');
                    balanceElement.classList.add('card-positive');
                }
            }
        } catch (error) {
            console.error('Erro ao atualizar cards:', error);
            this.app.showNotification('Erro ao atualizar dashboard', 'error');
        }
    }

    updateElement(id, text) {
        const element = document.getElementById(id);
        if (element) element.textContent = text;
    }

    async updateAlerts() {
        try {
            const alerts = await this.database.getFinancialAlerts();
            const container = document.getElementById('alertsContainer');
            
            if (!container) return;
            
            if (alerts.length === 0) {
                container.innerHTML = '';
                return;
            }
            
            let html = '';
            alerts.forEach(alert => {
                html += `
                    <div class="alert ${alert.type === 'danger' ? 'alert-danger' : 'alert-warning'}">
                        <i class="fas fa-${alert.type === 'danger' ? 'exclamation-triangle' : 'exclamation-circle'}"></i>
                        <div>
                            <div class="alert-title">Alerta Financeiro</div>
                            <div class="alert-message">${alert.message}</div>
                        </div>
                    </div>
                `;
            });
            
            container.innerHTML = html;
        } catch (error) {
            console.error('Erro ao atualizar alertas:', error);
        }
    }
}

// ============================================
// CLASSE: ChartsController
// ============================================
class ChartsController {
    constructor(database, app) {
        this.database = database;
        this.app = app;
        this.charts = {
            expenses: null,
            incomeVsExpenses: null
        };
    }

    async updateAllCharts() {
        try {
            await this.updateExpensesChart();
            await this.updateIncomeVsExpensesChart();
        } catch (error) {
            console.error('Erro ao atualizar gráficos:', error);
        }
    }

    // main.js - Na classe ChartsController, MODIFIQUE o método updateExpensesChart():
async updateExpensesChart() {
    try {
        const expensesByCategory = await this.database.getExpensesByCategory();
        const categories = Object.keys(expensesByCategory);
        const values = Object.values(expensesByCategory);
        
        if (categories.length === 0 || values.length === 0) {
            if (this.charts.expenses) {
                this.charts.expenses.destroy();
                this.charts.expenses = null;
            }
            return;
        }
        
        const canvas = document.getElementById('expensesChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        if (this.charts.expenses) {
            this.charts.expenses.destroy();
        }
        
        // CORREÇÃO: Obter cor do texto baseado no tema
        const isDarkMode = document.body.classList.contains('dark-mode');
        const textColor = isDarkMode ? '#e9ecef' : '#212529';
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        
        this.charts.expenses = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categories,
                datasets: [{
                    data: values,
                    backgroundColor: this.generateColors(categories.length),
                    borderWidth: 1,
                    borderColor: getComputedStyle(document.documentElement).getPropertyValue('--light-color')
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: textColor, // CORREÇÃO: Usar cor dinâmica
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: R$ ${value.toFixed(2)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Erro ao atualizar gráfico de despesas:', error);
    }
}

    // ADIÇÃO: Modificar também o método updateIncomeVsExpensesChart():
    async updateIncomeVsExpensesChart() {
        try {
            const totals = await this.database.getFinancialTotals();
            
            const canvas = document.getElementById('incomeVsExpensesChart');
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            
            if (this.charts.incomeVsExpenses) {
                this.charts.incomeVsExpenses.destroy();
            }
            
            // CORREÇÃO: Obter cor do texto baseado no tema
            const isDarkMode = document.body.classList.contains('dark-mode');
            const textColor = isDarkMode ? '#e9ecef' : '#212529';
            const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
            
            this.charts.incomeVsExpenses = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Receitas', 'Despesas', 'Investimentos'],
                    datasets: [{
                        label: 'Valores (R$)',
                        data: [totals.totalIncome, totals.totalExpenses, totals.totalInvestments],
                        backgroundColor: [
                            'rgba(76, 201, 240, 0.7)',
                            'rgba(247, 37, 133, 0.7)',
                            'rgba(67, 97, 238, 0.7)'
                        ],
                        borderColor: [
                            'rgb(76, 201, 240)',
                            'rgb(247, 37, 133)',
                            'rgb(67, 97, 238)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: textColor, // CORREÇÃO: Usar cor dinâmica
                                callback: function(value) {
                                    return 'R$ ' + value.toLocaleString('pt-BR', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    });
                                }
                            },
                            grid: {
                                color: gridColor // CORREÇÃO: Usar cor dinâmica
                            }
                        },
                        x: {
                            ticks: {
                                color: textColor // CORREÇÃO: Usar cor dinâmica
                            },
                            grid: {
                                display: false
                            }
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `R$ ${context.raw.toFixed(2)}`;
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Erro ao atualizar gráfico receita vs despesa:', error);
        }
    }

    async updateIncomeVsExpensesChart() {
        try {
            const totals = await this.database.getFinancialTotals();
            
            const canvas = document.getElementById('incomeVsExpensesChart');
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            
            if (this.charts.incomeVsExpenses) {
                this.charts.incomeVsExpenses.destroy();
            }
            
            this.charts.incomeVsExpenses = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Receitas', 'Despesas', 'Investimentos'],
                    datasets: [{
                        label: 'Valores (R$)',
                        data: [totals.totalIncome, totals.totalExpenses, totals.totalInvestments],
                        backgroundColor: [
                            'rgba(76, 201, 240, 0.7)',
                            'rgba(247, 37, 133, 0.7)',
                            'rgba(67, 97, 238, 0.7)'
                        ],
                        borderColor: [
                            'rgb(76, 201, 240)',
                            'rgb(247, 37, 133)',
                            'rgb(67, 97, 238)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--dark-color'),
                                callback: function(value) {
                                    return 'R$ ' + value.toFixed(2);
                                }
                            },
                            grid: {
                                color: 'rgba(0, 0, 0, 0.1)'
                            }
                        },
                        x: {
                            ticks: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--dark-color')
                            },
                            grid: {
                                display: false
                            }
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `R$ ${context.raw.toFixed(2)}`;
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Erro ao atualizar gráfico receita vs despesa:', error);
        }
    }

    generateColors(count) {
        const colors = [
            'rgba(247, 37, 133, 0.7)',
            'rgba(76, 201, 240, 0.7)',
            'rgba(248, 150, 30, 0.7)',
            'rgba(67, 97, 238, 0.7)',
            'rgba(58, 12, 163, 0.7)',
            'rgba(45, 212, 191, 0.7)',
            'rgba(255, 203, 5, 0.7)',
            'rgba(108, 92, 231, 0.7)',
            'rgba(255, 107, 107, 0.7)'
        ];
        
        if (count > colors.length) {
            for (let i = colors.length; i < count; i++) {
                colors.push(`rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.7)`);
            }
        }
        
        return colors.slice(0, count);
    }
}

// ============================================
// CLASSE: InvestmentManager
// ============================================
class InvestmentManager {
    constructor(database, app) {
        this.database = database;
        this.app = app;
    }

    async loadInvestments() {
        try {
            const investments = await this.database.getAllInvestments();
            this.renderInvestmentsTable(investments);
        } catch (error) {
            console.error('Erro ao carregar investimentos:', error);
            this.renderInvestmentsTable([]);
        }
    }

    renderInvestmentsTable(investments) {
        const container = document.getElementById('investmentsTableContainer');
        if (!container) return;
        
        if (investments.length === 0) {
            container.innerHTML = `
                <div class="table-empty">
                    <div class="table-empty-icon">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <h3 class="table-empty-title">Nenhum investimento encontrado</h3>
                    <p class="table-empty-text">
                        Comece a registrar seus investimentos para acompanhar seu crescimento.
                    </p>
                    <button class="btn btn-primary" id="addFirstInvestmentBtn">
                        <i class="fas fa-plus"></i> Adicionar Primeiro Investimento
                    </button>
                </div>
            `;
            
            // Adicionar listener ao botão
            const addBtn = document.getElementById('addFirstInvestmentBtn');
            if (addBtn) {
                addBtn.addEventListener('click', () => {
                    if (window.app) window.app.showNewInvestmentModal();
                });
            }
            
            return;
        }
        
        let html = `
            <table class="transactions-table">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Tipo</th>
                        <th>Data</th>
                        <th>Valor Investido (R$)</th>
                        <th>Valor Atual (R$)</th>
                        <th>Rentabilidade</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        let totalInvested = 0;
        let totalCurrent = 0;
        
        investments.forEach(investment => {
            const currentValue = investment.currentValue || investment.value;
            const profit = currentValue - investment.value;
            const profitPercentage = (profit / investment.value) * 100;
            
            totalInvested += investment.value;
            totalCurrent += currentValue;
            
            const profitClass = profit >= 0 ? 'income' : 'expense';
            const profitSymbol = profit >= 0 ? '+' : '';
            
            html += `
                <tr>
                    <td>${investment.name}</td>
                    <td>${investment.type}</td>
                    <td>${this.formatDate(investment.date)}</td>
                    <td>R$ ${this.app.formatCurrency(investment.value)}</td>
                    <td>R$ ${this.app.formatCurrency(currentValue)}</td>
                    <td class="${profitClass}">
                        ${profitSymbol}R$ ${this.app.formatCurrency(profit)} 
                        (${profitSymbol}${profitPercentage.toFixed(2)}%)
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon btn-edit edit-investment" data-id="${investment.id}" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon btn-delete delete-investment" data-id="${investment.id}" title="Excluir">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        // Adicionar linha de totais
        const totalProfit = totalCurrent - totalInvested;
        const totalProfitPercentage = (totalProfit / totalInvested) * 100;
        const totalProfitClass = totalProfit >= 0 ? 'income' : 'expense';
        const totalProfitSymbol = totalProfit >= 0 ? '+' : '';
        
        html += `
                </tbody>
                <tfoot>
                    <tr style="background-color: var(--gray-light); font-weight: 600;">
                        <td colspan="3" style="text-align: right;">TOTAIS:</td>
                        <td>R$ ${this.app.formatCurrency(totalInvested)}</td>
                        <td>R$ ${this.app.formatCurrency(totalCurrent)}</td>
                        <td class="${totalProfitClass}">
                            ${totalProfitSymbol}R$ ${this.app.formatCurrency(totalProfit)} 
                            (${totalProfitSymbol}${totalProfitPercentage.toFixed(2)}%)
                        </td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
        `;
        
        container.innerHTML = html;
    }

    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-BR');
        } catch (error) {
            return dateString;
        }
    }
}

// ============================================
// CLASSE: ImportExportService
// ============================================
class ImportExportService {
    constructor(database, app) {
        this.database = database;
        this.app = app;
    }

    async handleImport() {
        const fileInput = document.getElementById('importFile');
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            this.showImportStatus('Por favor, selecione um arquivo.', 'error');
            return;
        }
        
        const file = fileInput.files[0];
        const importType = document.getElementById('importType').value;
        
        console.log(`Iniciando importação do arquivo: ${file.name} (${file.size} bytes, tipo: ${importType})`);
        
        this.showImportStatus('Processando arquivo...', 'processing');
        
        try {
            let transactions = [];
            
            if (importType === 'csv') {
                transactions = await this.readCSVFile(file);
            } else if (importType === 'xlsx') {
                transactions = await this.readExcelFile(file);
            } else {
                throw new Error('Tipo de importação não suportado');
            }
            
            console.log(`Arquivo processado. ${transactions.length} transações extraídas.`);
            
            if (transactions.length === 0) {
                this.showImportStatus('Nenhuma transação válida encontrada no arquivo.', 'error');
                return;
            }
            
            // Importar transações usando o método existente
            const importResult = await this.importTransactions(transactions);
            
            if (importResult.success > 0) {
                this.showImportStatus(
                    `Importação concluída! ${importResult.success} transações importadas com sucesso.`, 
                    'success'
                );
            } else {
                this.showImportStatus('Nenhuma transação foi importada.', 'error');
            }
            
        } catch (error) {
            console.error('Erro na importação:', error);
            this.showImportStatus(`Erro: ${error.message}`, 'error');
        }
    }

    /**
     * Lê arquivo CSV usando FileReader
     */
    readCSVFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const csvText = event.target.result;
                    console.log('CSV raw text (first 500 chars):', csvText.substring(0, 500));
                    
                    const transactions = this.parseCSV(csvText);
                    console.log('Transações parseadas do CSV:', transactions.length);
                    
                    if (transactions.length > 0) {
                        console.log('Primeira transação parseada:', transactions[0]);
                    }
                    
                    resolve(transactions);
                } catch (error) {
                    console.error('Erro no parse do CSV:', error);
                    reject(new Error(`Erro ao processar CSV: ${error.message}`));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Erro ao ler arquivo CSV'));
            };
            
            reader.readAsText(file, 'UTF-8');
        });
    }

    /**
     * Lê arquivo Excel usando SheetJS
     */
    readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const data = new Uint8Array(event.target.result);
                    const transactions = this.parseXLSX(data);
                    console.log('Transações parseadas do Excel:', transactions.length);
                    
                    if (transactions.length > 0) {
                        console.log('Primeira transação parseada:', transactions[0]);
                    }
                    
                    resolve(transactions);
                } catch (error) {
                    console.error('Erro no parse do Excel:', error);
                    reject(new Error(`Erro ao processar Excel: ${error.message}`));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Erro ao ler arquivo Excel'));
            };
            
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Parse CSV text to transactions - MELHORADO
     */
    parseCSV(csvText) {
        // Remover BOM se existir
        if (csvText.charCodeAt(0) === 0xFEFF) {
            csvText = csvText.substr(1);
        }
        
        // Normalizar quebras de linha
        csvText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        const lines = csvText.split('\n').filter(line => line.trim() !== '');
        if (lines.length < 2) {
            console.warn('CSV tem menos de 2 linhas');
            return [];
        }
        
        // Detectar delimitador
        const firstLine = lines[0];
        let delimiter = ',';
        if (firstLine.includes(';') && !firstLine.includes(',')) {
            delimiter = ';';
        }
        
        console.log(`Delimitador detectado: "${delimiter}"`);
        
        // Parsear headers
        const headers = firstLine.split(delimiter).map(h => {
            // Remover aspas e espaços extras
            return h.replace(/"/g, '').trim().toLowerCase();
        });
        
        console.log('Headers detectados:', headers);
        
        const transactions = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Parsear linha considerando aspas
            let values = [];
            let inQuotes = false;
            let currentValue = '';
            
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === delimiter && !inQuotes) {
                    values.push(currentValue);
                    currentValue = '';
                } else {
                    currentValue += char;
                }
            }
            values.push(currentValue); // Último valor
            
            // Limpar valores
            values = values.map(v => v.replace(/^"|"$/g, '').trim());
            
            if (values.length < headers.length) {
                console.warn(`Linha ${i + 1} tem menos valores que headers:`, values);
                continue;
            }
            
            const transaction = {};
            headers.forEach((header, index) => {
                transaction[header] = values[index] || '';
            });
            
            // Mapear campos com várias opções de nomes
            const mappedTransaction = this.mapTransactionFields(transaction);
            
            // Validar transação básica
            if (this.isValidTransaction(mappedTransaction)) {
                transactions.push(mappedTransaction);
            } else {
                console.warn(`Transação inválida na linha ${i + 1}:`, mappedTransaction);
            }
        }
        
        console.log(`Total de transações parseadas válidas: ${transactions.length}`);
        return transactions;
    }

    /**
     * Mapeia campos de transação com várias opções de nomes
     */
    mapTransactionFields(transaction) {
        // Mapeamento flexível de campos
        const date = transaction.data || transaction.date || transaction.data_transacao || '';
        const type = transaction.tipo || transaction.type || transaction.categoria || '';
        const category = transaction.categoria || transaction.category || transaction.classificacao || 'Outros';
        const subcategory = transaction.subcategoria || transaction.subcategory || '';
        const classification = transaction.classificacao || transaction.classification || 'Variável';
        
        // Extrair valor de vários campos possíveis
        let value = 0;
        const valueFields = ['valor', 'value', 'preco', 'price', 'valor_total'];
        for (const field of valueFields) {
            if (transaction[field]) {
                value = this.app.parseCurrency(transaction[field]);
                break;
            }
        }
        
        const description = transaction.descricao || transaction.description || transaction.detalhes || '';
        const note = transaction.observacao || transaction.note || transaction.obs || '';
        
        return {
            date: date,
            type: this.normalizeType(type),
            category: category,
            subcategory: subcategory,
            classification: classification,
            value: value,
            description: description,
            note: note
        };
    }

    /**
     * Normaliza tipo de transação
     */
    normalizeType(type) {
        if (!type) return '';
        
        type = type.toLowerCase().trim();
        
        if (type.includes('receita') || type.includes('income') || type.includes('entrada') || type === 'r') {
            return 'Receita';
        } else if (type.includes('despesa') || type.includes('expense') || type.includes('saída') || type === 'd') {
            return 'Despesa';
        } else if (type.includes('investimento') || type.includes('investment') || type === 'i') {
            return 'Investimento';
        }
        
        return type.charAt(0).toUpperCase() + type.slice(1);
    }

    /**
     * Valida transação básica
     */
    isValidTransaction(transaction) {
        // Verificar data
        if (!transaction.date) {
            console.warn('Transação sem data:', transaction);
            return false;
        }
        
        // Tentar parsear data
        const date = new Date(transaction.date);
        if (isNaN(date.getTime())) {
            console.warn('Data inválida:', transaction.date);
            return false;
        }
        
        // Verificar tipo
        if (!transaction.type) {
            console.warn('Transação sem tipo:', transaction);
            return false;
        }
        
        // Verificar valor
        if (isNaN(transaction.value) || transaction.value <= 0) {
            console.warn('Valor inválido:', transaction.value);
            return false;
        }
        
        return true;
    }

    /**
     * Parse XLSX data to transactions
     */
    parseXLSX(data) {
        try {
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Converter para JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            if (jsonData.length < 2) {
                console.warn('Planilha Excel vazia ou com apenas cabeçalho');
                return [];
            }
            
            // Primeira linha são os headers
            const headers = jsonData[0].map(h => {
                if (h === null || h === undefined) return '';
                return h.toString().toLowerCase().trim();
            });
            
            console.log('Headers Excel:', headers);
            
            const transactions = [];
            
            // Processar linhas de dados
            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0) continue;
                
                const transaction = {};
                headers.forEach((header, index) => {
                    if (header && index < row.length) {
                        transaction[header] = row[index] !== null && row[index] !== undefined ? 
                            row[index].toString().trim() : '';
                    }
                });
                
                // Mapear campos
                const mappedTransaction = this.mapTransactionFields(transaction);
                
                // Validar transação
                if (this.isValidTransaction(mappedTransaction)) {
                    transactions.push(mappedTransaction);
                } else {
                    console.warn(`Transação Excel inválida na linha ${i + 1}:`, mappedTransaction);
                }
            }
            
            console.log(`Total de transações Excel parseadas válidas: ${transactions.length}`);
            return transactions;
        } catch (error) {
            console.error('Erro ao parsear XLSX:', error);
            return [];
        }
    }

    async handleExport() {
        const format = document.getElementById('exportFormat').value;
        const dateRange = document.getElementById('exportDateRange').value;
        
        try {
            let transactions = await this.database.getAllTransactions();
            
            if (dateRange !== 'all') {
                transactions = this.filterTransactionsByDateRange(transactions, dateRange);
            }
            
            if (transactions.length === 0) {
                this.app.showNotification('Nenhuma transação encontrada para o período selecionado.', 'warning');
                return;
            }
            
            if (format === 'csv') {
                await this.exportToCSV(transactions);
            } else if (format === 'xlsx') {
                await this.exportToXLSX(transactions);
            } else if (format === 'pdf') {
                await this.exportToPDF(transactions);
            }
        } catch (error) {
            console.error('Erro na exportação:', error);
            this.app.showNotification(`Erro na exportação: ${error.message}`, 'error');
        }
    }

    /**
     * Importa transações validadas para o banco de dados - CORRIGIDO
     */
    async importTransactions(transactions) {
        console.log('Iniciando importação de transações...');
        console.log('Total de transações recebidas:', transactions.length);
        
        // Log detalhado das primeiras transações para debug
        if (transactions.length > 0) {
            console.log('Exemplo de transações recebidas:');
            transactions.slice(0, 3).forEach((t, i) => {
                console.log(`  [${i}]`, {
                    date: t.date,
                    type: t.type,
                    category: t.category,
                    value: t.value,
                    hasDescription: !!t.description,
                    hasNote: !!t.note
                });
            });
        }
        
        const importResults = {
            total: transactions.length,
            success: 0,
            failed: 0,
            errors: []
        };
        
        // Importar em lotes para melhor performance
        const batchSize = 10;
        const batches = [];
        
        for (let i = 0; i < transactions.length; i += batchSize) {
            batches.push(transactions.slice(i, i + batchSize));
        }
        
        console.log(`Processando em ${batches.length} lotes de ${batchSize} transações cada`);
        
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            console.log(`Processando lote ${batchIndex + 1}/${batches.length} (${batch.length} transações)`);
            
            for (let i = 0; i < batch.length; i++) {
                const transaction = batch[i];
                const globalIndex = batchIndex * batchSize + i;
                
                try {
                    // Preparar transação para o banco de dados
                    const preparedTransaction = this.prepareTransactionForDatabase(transaction);
                    
                    if (!preparedTransaction) {
                        importResults.failed++;
                        importResults.errors.push({
                            index: globalIndex,
                            transaction: transaction,
                            error: 'Transação inválida após preparação'
                        });
                        continue;
                    }
                    
                    // Adicionar ao banco de dados
                    await this.database.addTransaction(preparedTransaction);
                    importResults.success++;
                    
                    // Log progresso a cada 10 transações
                    if (importResults.success % 10 === 0) {
                        console.log(`Progresso: ${importResults.success}/${importResults.total} transações importadas`);
                    }
                    
                } catch (error) {
                    importResults.failed++;
                    importResults.errors.push({
                        index: globalIndex,
                        transaction: transaction,
                        error: error.message
                    });
                    
                    console.error(`Erro ao importar transação ${globalIndex + 1}:`, {
                        data: transaction.date,
                        tipo: transaction.type,
                        categoria: transaction.category,
                        valor: transaction.value,
                        erro: error.message
                    });
                }
            }
        }
        
        // RESUMO DA IMPORTAÇÃO
        console.log('=== RESUMO DA IMPORTAÇÃO ===');
        console.log(`Total processado: ${importResults.total}`);
        console.log(`Importadas com sucesso: ${importResults.success}`);
        console.log(`Falhas: ${importResults.failed}`);
        
        if (importResults.errors.length > 0) {
            console.warn('Erros durante a importação:');
            importResults.errors.slice(0, 3).forEach(err => {
                console.warn(`  Transação ${err.index + 1}: ${err.error}`);
            });
        }
        
        // ATUALIZAR INTERFACE
        if (importResults.success > 0) {
            console.log('Atualizando interface do usuário...');
            try {
                await this.app.notifyDataChange();
                console.log('Interface atualizada com sucesso');
            } catch (error) {
                console.error('Erro ao atualizar interface:', error);
                this.app.showNotification('Importação concluída, mas houve erro ao atualizar a interface', 'warning');
            }
        }
        
        // LIMPAR CAMPOS DO FORMULÁRIO
        const fileInput = document.getElementById('importFile');
        if (fileInput) {
            fileInput.value = '';
        }
        
        return importResults;
    }

    /**
     * Prepara transação para o banco de dados
     */
    prepareTransactionForDatabase(transaction) {
        try {
            // Validar campos obrigatórios
            if (!transaction.date || !transaction.type || !transaction.category) {
                console.warn('Campos obrigatórios faltando:', transaction);
                return null;
            }
            
            // Parsear data
            let dateObj;
            try {
                // Tentar vários formatos de data
                dateObj = new Date(transaction.date);
                if (isNaN(dateObj.getTime())) {
                    // Tentar formato brasileiro DD/MM/YYYY
                    const parts = transaction.date.split('/');
                    if (parts.length === 3) {
                        dateObj = new Date(parts[2], parts[1] - 1, parts[0]);
                    }
                    
                    if (isNaN(dateObj.getTime())) {
                        console.warn('Data inválida:', transaction.date);
                        return null;
                    }
                }
            } catch (error) {
                console.warn('Erro ao parsear data:', transaction.date, error);
                return null;
            }
            
            // Formatar data para YYYY-MM-DD
            const formattedDate = dateObj.toISOString().split('T')[0];
            
            // Validar valor
            const value = typeof transaction.value === 'number' ? 
                transaction.value : 
                this.app.parseCurrency(transaction.value);
            
            if (isNaN(value) || value <= 0) {
                console.warn('Valor inválido:', transaction.value);
                return null;
            }
            
            // Preparar objeto final
            const preparedTransaction = {
                date: formattedDate,
                type: transaction.type,
                category: transaction.category,
                classification: transaction.classification || 'Variável',
                value: value,
                subcategory: transaction.subcategory || '',
                description: transaction.description || '',
                note: transaction.note || ''
            };
            
            return preparedTransaction;
        } catch (error) {
            console.error('Erro ao preparar transação:', error, transaction);
            return null;
        }
    }

    filterTransactionsByDateRange(transactions, range) {
        const now = new Date();
        let startDate, endDate;
        
        switch (range) {
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear(), 11, 31);
                break;
            case 'custom':
                const start = document.getElementById('exportStartDate').value;
                const end = document.getElementById('exportEndDate').value;
                
                if (!start || !end) {
                    throw new Error('Especifique ambas as datas');
                }
                
                startDate = new Date(start);
                endDate = new Date(end);
                break;
            default:
                return transactions;
        }
        
        return transactions.filter(t => {
            try {
                const transactionDate = new Date(t.date);
                return transactionDate >= startDate && transactionDate <= endDate;
            } catch (error) {
                return false;
            }
        });
    }

    async exportToCSV(transactions) {
        const headers = ['Data', 'Tipo', 'Categoria', 'Subcategoria', 'Classificação', 'Valor', 'Descrição', 'Observação'];
        const csvRows = [
            headers.join(','),
            ...transactions.map(t => [
                t.date,
                t.type,
                t.category,
                t.subcategory || '',
                t.classification || 'Variável',
                t.value.toFixed(2).replace('.', ','),
                `"${t.description || ''}"`,
                `"${t.note || ''}"`
            ].map(v => `"${v}"`).join(','))
        ];
        
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `financas_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        this.app.showNotification('Exportação CSV concluída!', 'success');
    }

    async exportToXLSX(transactions) {
        try {
            const data = transactions.map(t => ({
                Data: t.date,
                Tipo: t.type,
                Categoria: t.category,
                Subcategoria: t.subcategory || '',
                Classificação: t.classification || 'Variável',
                Valor: t.value.toFixed(2).replace('.', ','),
                Descrição: t.description || '',
                Observação: t.note || ''
            }));
            
            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Transações');
            
            // Calcular totais
            const totals = {
                Receitas: transactions.filter(t => t.type === 'Receita').reduce((sum, t) => sum + t.value, 0),
                Despesas: transactions.filter(t => t.type === 'Despesa').reduce((sum, t) => sum + t.value, 0),
                Investimentos: transactions.filter(t => t.type === 'Investimento').reduce((sum, t) => sum + t.value, 0)
            };
            
            const totalsData = [
                {},
                { Data: 'TOTAIS:' },
                { Data: 'Receitas:', Valor: totals.Receitas.toFixed(2).replace('.', ',') },
                { Data: 'Despesas:', Valor: totals.Despesas.toFixed(2).replace('.', ',') },
                { Data: 'Investimentos:', Valor: totals.Investimentos.toFixed(2).replace('.', ',') },
                { Data: 'Saldo:', Valor: (totals.Receitas - totals.Despesas).toFixed(2).replace('.', ',') }
            ];
            
            const totalsWorksheet = XLSX.utils.json_to_sheet(totalsData);
            XLSX.utils.book_append_sheet(workbook, totalsWorksheet, 'Resumo');
            
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `financas_${new Date().toISOString().slice(0, 10)}.xlsx`;
            link.click();
            
            setTimeout(() => URL.revokeObjectURL(url), 100);
            
            this.app.showNotification('Exportação Excel concluída!', 'success');
        } catch (error) {
            console.error('Erro ao exportar para Excel:', error);
            throw error;
        }
    }

    async exportToPDF(transactions) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.text('Relatório Financeiro', 20, 20);
        
        doc.setFontSize(10);
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 30);
        
        let totalIncome = 0;
        let totalExpenses = 0;
        let totalInvestments = 0;
        
        transactions.forEach(t => {
            if (t.type === 'Receita') {
                totalIncome += t.value;
            } else if (t.type === 'Despesa') {
                totalExpenses += t.value;
            } else if (t.type === 'Investimento') {
                totalInvestments += t.value;
            }
        });
        
        const balance = totalIncome - totalExpenses;
        
        doc.setFontSize(12);
        doc.text('Resumo:', 20, 45);
        doc.text(`Receitas: R$ ${totalIncome.toFixed(2)}`, 30, 55);
        doc.text(`Despesas: R$ ${totalExpenses.toFixed(2)}`, 30, 65);
        doc.text(`Investimentos: R$ ${totalInvestments.toFixed(2)}`, 30, 75);
        doc.text(`Saldo: R$ ${balance.toFixed(2)}`, 30, 85);
        
        doc.setFontSize(14);
        doc.text('Transações:', 20, 100);
        
        const headers = [['Data', 'Tipo', 'Categoria', 'Valor']];
        const data = transactions.slice(0, 30).map(t => [
            new Date(t.date).toLocaleDateString('pt-BR'),
            t.type,
            t.category,
            `R$ ${t.value.toFixed(2)}`
        ]);
        
        doc.autoTable({
            startY: 105,
            head: headers,
            body: data,
            theme: 'striped',
            headStyles: { fillColor: [67, 97, 238] },
            margin: { horizontal: 20 }
        });
        
        doc.save(`relatorio_financeiro_${new Date().toISOString().slice(0, 10)}.pdf`);
        
        this.app.showNotification('Exportação PDF concluída!', 'success');
    }

    // main.js - Na classe ImportExportService, ADICIONE este método:
    async exportCompleteReport() {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');
            
            // Configurações gerais
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 20;
            const contentWidth = pageWidth - (2 * margin);
            
            // Data do relatório
            const reportDate = new Date().toLocaleDateString('pt-BR');
            
            // 1. CABEÇALHO
            doc.setFillColor(67, 97, 238);
            doc.rect(0, 0, pageWidth, 40, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(24);
            doc.setFont('helvetica', 'bold');
            doc.text('RELATÓRIO FINANCEIRO', pageWidth / 2, 25, { align: 'center' });
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Gerado em: ${reportDate}`, pageWidth / 2, 33, { align: 'center' });
            
            let yPosition = 50;
            
            // 2. RESUMO EXECUTIVO
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('RESUMO EXECUTIVO', margin, yPosition);
            
            yPosition += 10;
            
            // Obter dados
            const transactions = await this.database.getAllTransactions();
            const investments = await this.database.getAllInvestments();
            const limits = await this.database.getAllLimits();
            
            // Calcular totais
            let totalIncome = 0;
            let totalExpenses = 0;
            let totalInvestments = 0;
            const categoryTotals = {};
            const monthlyTotals = {};
            
            transactions.forEach(transaction => {
                if (transaction.type === 'Receita') {
                    totalIncome += transaction.value;
                } else if (transaction.type === 'Despesa') {
                    totalExpenses += transaction.value;
                    
                    // Acumular por categoria
                    if (!categoryTotals[transaction.category]) {
                        categoryTotals[transaction.category] = 0;
                    }
                    categoryTotals[transaction.category] += transaction.value;
                    
                    // Acumular por mês
                    const monthKey = `${transaction.month}/${transaction.year}`;
                    if (!monthlyTotals[monthKey]) {
                        monthlyTotals[monthKey] = { income: 0, expenses: 0 };
                    }
                    monthlyTotals[monthKey].expenses += transaction.value;
                } else if (transaction.type === 'Investimento') {
                    totalInvestments += transaction.value;
                }
                
                // Para receitas também acumular por mês
                if (transaction.type === 'Receita') {
                    const monthKey = `${transaction.month}/${transaction.year}`;
                    if (!monthlyTotals[monthKey]) {
                        monthlyTotals[monthKey] = { income: 0, expenses: 0 };
                    }
                    monthlyTotals[monthKey].income += transaction.value;
                }
            });
            
            const currentBalance = totalIncome - totalExpenses;
            
            // Resumo em tabela
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            
            const summaryData = [
                ['RECEITAS TOTAIS', `R$ ${this.app.formatCurrency(totalIncome)}`],
                ['DESPESAS TOTAIS', `R$ ${this.app.formatCurrency(totalExpenses)}`],
                ['SALDO ATUAL', `R$ ${this.app.formatCurrency(currentBalance)}`],
                ['INVESTIMENTOS', `R$ ${this.app.formatCurrency(totalInvestments)}`],
                ['TOTAL DE TRANSAÇÕES', transactions.length.toString()],
                ['TOTAL DE INVESTIMENTOS', investments.length.toString()]
            ];
            
            summaryData.forEach((row, index) => {
                const y = yPosition + (index * 8);
                doc.text(row[0], margin, y);
                doc.text(row[1], pageWidth - margin, y, { align: 'right' });
                
                // Linha divisória
                if (index === 2) {
                    doc.setDrawColor(200, 200, 200);
                    doc.line(margin, y + 3, pageWidth - margin, y + 3);
                }
            });
            
            yPosition += (summaryData.length * 8) + 15;
            
            // 3. DESPESAS POR CATEGORIA (Top 10)
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('DESPESAS POR CATEGORIA', margin, yPosition);
            
            yPosition += 10;
            
            // Ordenar categorias por valor
            const sortedCategories = Object.entries(categoryTotals)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);
            
            if (sortedCategories.length > 0) {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                
                // Cabeçalho da tabela
                doc.setFillColor(240, 240, 240);
                doc.rect(margin, yPosition - 5, contentWidth, 8, 'F');
                
                doc.setFont('helvetica', 'bold');
                doc.text('CATEGORIA', margin + 5, yPosition);
                doc.text('VALOR', pageWidth - margin - 30, yPosition);
                doc.text('%', pageWidth - margin - 5, yPosition, { align: 'right' });
                
                yPosition += 8;
                
                // Linhas da tabela
                sortedCategories.forEach(([category, value], index) => {
                    const percentage = (value / totalExpenses) * 100;
                    
                    // Alternar cores das linhas
                    if (index % 2 === 0) {
                        doc.setFillColor(250, 250, 250);
                    } else {
                        doc.setFillColor(245, 245, 245);
                    }
                    doc.rect(margin, yPosition - 4, contentWidth, 8, 'F');
                    
                    doc.setFont('helvetica', 'normal');
                    doc.text(category, margin + 5, yPosition);
                    doc.text(`R$ ${this.app.formatCurrency(value)}`, pageWidth - margin - 30, yPosition);
                    doc.text(`${percentage.toFixed(1)}%`, pageWidth - margin - 5, yPosition, { align: 'right' });
                    
                    yPosition += 8;
                    
                    // Verificar se precisa de nova página
                    if (yPosition > 270 && index < sortedCategories.length - 1) {
                        doc.addPage();
                        yPosition = 20;
                    }
                });
                
                yPosition += 10;
            } else {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'italic');
                doc.text('Nenhuma despesa registrada.', margin, yPosition);
                yPosition += 15;
            }
            
            // 4. ANÁLISE MENSAL
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('ANÁLISE MENSAL', margin, yPosition);
            
            yPosition += 10;
            
            const sortedMonths = Object.entries(monthlyTotals)
                .sort((a, b) => {
                    const [monthA, yearA] = a[0].split('/');
                    const [monthB, yearB] = b[0].split('/');
                    const monthOrder = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 
                                    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
                    
                    if (parseInt(yearA) !== parseInt(yearB)) {
                        return parseInt(yearA) - parseInt(yearB);
                    }
                    return monthOrder.indexOf(monthA.toLowerCase()) - monthOrder.indexOf(monthB.toLowerCase());
                });
            
            if (sortedMonths.length > 0) {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                
                // Cabeçalho da tabela
                doc.setFillColor(240, 240, 240);
                doc.rect(margin, yPosition - 5, contentWidth, 8, 'F');
                
                doc.setFont('helvetica', 'bold');
                doc.text('PERÍODO', margin + 5, yPosition);
                doc.text('RECEITAS', margin + 70, yPosition);
                doc.text('DESPESAS', margin + 120, yPosition);
                doc.text('SALDO', pageWidth - margin - 5, yPosition, { align: 'right' });
                
                yPosition += 8;
                
                // Linhas da tabela
                sortedMonths.forEach(([month, totals], index) => {
                    const balance = totals.income - totals.expenses;
                    
                    // Alternar cores das linhas
                    if (index % 2 === 0) {
                        doc.setFillColor(250, 250, 250);
                    } else {
                        doc.setFillColor(245, 245, 245);
                    }
                    doc.rect(margin, yPosition - 4, contentWidth, 8, 'F');
                    
                    doc.setFont('helvetica', 'normal');
                    doc.text(month, margin + 5, yPosition);
                    doc.text(`R$ ${this.app.formatCurrency(totals.income)}`, margin + 70, yPosition);
                    doc.text(`R$ ${this.app.formatCurrency(totals.expenses)}`, margin + 120, yPosition);
                    
                    // Colorir saldo
                    if (balance >= 0) {
                        doc.setTextColor(0, 150, 0); // Verde para positivo
                    } else {
                        doc.setTextColor(200, 0, 0); // Vermelho para negativo
                    }
                    doc.text(`R$ ${this.app.formatCurrency(balance)}`, pageWidth - margin - 5, yPosition, { align: 'right' });
                    
                    doc.setTextColor(0, 0, 0); // Resetar cor
                    
                    yPosition += 8;
                    
                    // Verificar se precisa de nova página
                    if (yPosition > 270 && index < sortedMonths.length - 1) {
                        doc.addPage();
                        yPosition = 20;
                    }
                });
                
                yPosition += 10;
            }
            
            // 5. INVESTIMENTOS
            if (investments.length > 0) {
                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                doc.text('INVESTIMENTOS', margin, yPosition);
                
                yPosition += 10;
                
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                
                // Cabeçalho da tabela
                doc.setFillColor(240, 240, 240);
                doc.rect(margin, yPosition - 5, contentWidth, 8, 'F');
                
                doc.setFont('helvetica', 'bold');
                doc.text('NOME', margin + 5, yPosition);
                doc.text('TIPO', margin + 70, yPosition);
                doc.text('VALOR INVESTIDO', margin + 120, yPosition);
                doc.text('VALOR ATUAL', pageWidth - margin - 30, yPosition);
                doc.text('RENT.', pageWidth - margin - 5, yPosition, { align: 'right' });
                
                yPosition += 8;
                
                // Linhas da tabela
                investments.forEach((investment, index) => {
                    const currentValue = investment.currentValue || investment.value;
                    const profit = currentValue - investment.value;
                    const profitPercentage = (profit / investment.value) * 100;
                    
                    // Alternar cores das linhas
                    if (index % 2 === 0) {
                        doc.setFillColor(250, 250, 250);
                    } else {
                        doc.setFillColor(245, 245, 245);
                    }
                    doc.rect(margin, yPosition - 4, contentWidth, 8, 'F');
                    
                    doc.setFont('helvetica', 'normal');
                    doc.text(investment.name.substring(0, 20), margin + 5, yPosition);
                    doc.text(investment.type.substring(0, 15), margin + 70, yPosition);
                    doc.text(`R$ ${this.app.formatCurrency(investment.value)}`, margin + 120, yPosition);
                    doc.text(`R$ ${this.app.formatCurrency(currentValue)}`, pageWidth - margin - 30, yPosition);
                    
                    // Colorir rentabilidade
                    if (profit >= 0) {
                        doc.setTextColor(0, 150, 0); // Verde para positivo
                    } else {
                        doc.setTextColor(200, 0, 0); // Vermelho para negativo
                    }
                    doc.text(`${profitPercentage.toFixed(1)}%`, pageWidth - margin - 5, yPosition, { align: 'right' });
                    
                    doc.setTextColor(0, 0, 0); // Resetar cor
                    
                    yPosition += 8;
                    
                    // Verificar se precisa de nova página
                    if (yPosition > 270 && index < investments.length - 1) {
                        doc.addPage();
                        yPosition = 20;
                    }
                });
                
                yPosition += 10;
            }
            
            // 6. ALERTAS E LIMITES
            if (limits.length > 0) {
                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                doc.text('ALERTAS E LIMITES CONFIGURADOS', margin, yPosition);
                
                yPosition += 10;
                
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                
                limits.forEach((limit, index) => {
                    const spent = this.app.database.getCategorySpentThisMonth(limit.category);
                    const percentage = (spent / limit.limit) * 100;
                    
                    doc.text(`• ${limit.category}:`, margin + 5, yPosition);
                    doc.text(`Limite: R$ ${this.app.formatCurrency(limit.limit)}`, margin + 50, yPosition);
                    doc.text(`Gasto: R$ ${this.app.formatCurrency(spent)} (${percentage.toFixed(1)}%)`, margin + 120, yPosition);
                    
                    // Indicador visual
                    if (percentage > 100) {
                        doc.setTextColor(200, 0, 0);
                        doc.text('⛔ LIMITE ULTRAPASSADO', pageWidth - margin - 5, yPosition, { align: 'right' });
                    } else if (percentage > 80) {
                        doc.setTextColor(255, 140, 0);
                        doc.text('⚠️ PRÓXIMO DO LIMITE', pageWidth - margin - 5, yPosition, { align: 'right' });
                    } else {
                        doc.setTextColor(0, 150, 0);
                        doc.text('✅ DENTRO DO LIMITE', pageWidth - margin - 5, yPosition, { align: 'right' });
                    }
                    
                    doc.setTextColor(0, 0, 0);
                    yPosition += 8;
                    
                    // Verificar se precisa de nova página
                    if (yPosition > 270 && index < limits.length - 1) {
                        doc.addPage();
                        yPosition = 20;
                    }
                });
                
                yPosition += 10;
            }
            
            // 7. RECOMENDAÇÕES (se houver dados)
            if (transactions.length > 5) {
                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                doc.text('RECOMENDAÇÕES', margin, yPosition);
                
                yPosition += 10;
                
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                
                const recommendations = [];
                
                // Análise de gastos
                const topExpenseCategory = sortedCategories.length > 0 ? sortedCategories[0] : null;
                if (topExpenseCategory && (topExpenseCategory[1] / totalExpenses) > 0.4) {
                    recommendations.push(`• A categoria "${topExpenseCategory[0]}" representa ${((topExpenseCategory[1] / totalExpenses) * 100).toFixed(1)}% dos seus gastos. Considere rever estes custos.`);
                }
                
                // Análise de saldo
                if (currentBalance < 0) {
                    recommendations.push(`• Seu saldo atual é negativo (R$ ${this.app.formatCurrency(currentBalance)}). Recomendamos reduzir despesas ou aumentar receitas.`);
                }
                
                // Análise de poupança
                const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
                if (savingsRate < 10 && savingsRate > 0) {
                    recommendations.push(`• Sua taxa de poupança é de ${savingsRate.toFixed(1)}%. Recomenda-se economizar pelo menos 20% da renda.`);
                } else if (savingsRate >= 20) {
                    recommendations.push(`• Ótimo! Sua taxa de poupança é de ${savingsRate.toFixed(1)}%. Continue assim!`);
                }
                
                // Análise de investimentos
                const investmentRatio = totalIncome > 0 ? (totalInvestments / totalIncome) * 100 : 0;
                if (investmentRatio < 5 && savingsRate > 15) {
                    recommendations.push(`• Considere destinar parte da sua poupança para investimentos para fazer seu dinheiro trabalhar para você.`);
                }
                
                // Adicionar recomendações
                if (recommendations.length > 0) {
                    recommendations.forEach((rec, index) => {
                        const lines = doc.splitTextToSize(rec, contentWidth - 10);
                        lines.forEach(line => {
                            doc.text(line, margin + 5, yPosition);
                            yPosition += 6;
                        });
                        yPosition += 4;
                        
                        // Verificar se precisa de nova página
                        if (yPosition > 270 && index < recommendations.length - 1) {
                            doc.addPage();
                            yPosition = 20;
                        }
                    });
                } else {
                    doc.text('Seus hábitos financeiros estão saudáveis. Continue com o bom trabalho!', margin, yPosition);
                    yPosition += 15;
                }
            }
            
            // 8. RODAPÉ
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(100, 100, 100);
            doc.text('Relatório gerado pelo Sistema de Finanças Pessoais v4.3', pageWidth / 2, 285, { align: 'center' });
            doc.text('Confidencial - Uso interno', pageWidth / 2, 290, { align: 'center' });
            
            // Salvar PDF
            doc.save(`relatorio_financeiro_completo_${new Date().toISOString().slice(0, 10)}.pdf`);
            
            this.app.showNotification('Relatório PDF gerado com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro ao gerar relatório:', error);
            this.app.showNotification(`Erro ao gerar relatório: ${error.message}`, 'error');
        }
    }

    async generateBackup() {
        try {
            const data = await this.database.exportAllData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `backup_financas_${new Date().toISOString().slice(0, 10)}.json`;
            link.click();
            
            setTimeout(() => URL.revokeObjectURL(url), 100);
            
            this.app.showNotification('Backup gerado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao gerar backup:', error);
            throw error;
        }
    }

    showImportStatus(message, type) {
        const statusElement = document.getElementById('importStatus');
        if (!statusElement) return;
        
        const color = type === 'success' ? 'var(--success-color)' : 
                     type === 'error' ? 'var(--danger-color)' : 
                     'var(--warning-color)';
        
        const icon = type === 'success' ? 'check-circle' : 
                    type === 'error' ? 'exclamation-circle' : 
                    'sync-alt';
        
        statusElement.innerHTML = `
            <div class="alert ${type === 'success' ? 'alert-success' : type === 'error' ? 'alert-danger' : 'alert-warning'}">
                <i class="fas fa-${icon}"></i>
                <div>
                    <div class="alert-title">${type === 'success' ? 'Sucesso!' : type === 'error' ? 'Erro!' : 'Processando...'}</div>
                    <div class="alert-message">${message}</div>
                </div>
            </div>
        `;
    }
}

// ============================================
// CLASSE: ThemeManager
// ============================================
class ThemeManager {
    constructor() {
        this.isDarkMode = false;
    }

    init() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            this.enableDarkMode();
        } else {
            this.disableDarkMode();
        }
        
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
            this.updateToggleButton();
        }
    }

    toggleTheme() {
        if (this.isDarkMode) {
            this.disableDarkMode();
        } else {
            this.enableDarkMode();
        }
        
        this.updateToggleButton();
        localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
    }

    enableDarkMode() {
        document.body.classList.add('dark-mode');
        this.isDarkMode = true;
    }

    disableDarkMode() {
        document.body.classList.remove('dark-mode');
        this.isDarkMode = false;
    }

    updateToggleButton() {
        const themeToggle = document.getElementById('themeToggle');
        if (!themeToggle) return;
        
        const icon = themeToggle.querySelector('i');
        const text = themeToggle.querySelector('span');
        
        if (this.isDarkMode) {
            if (text) text.textContent = 'Modo Claro';
            if (icon) icon.className = 'fas fa-sun';
        } else {
            if (text) text.textContent = 'Modo Escuro';
            if (icon) icon.className = 'fas fa-moon';
        }
    }
}

// ============================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ============================================

let app = null;

document.addEventListener('DOMContentLoaded', () => {
    try {
        app = new AppController();
        window.app = app;
        
        // Adicionar estilos CSS adicionais
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
            
            .page {
                display: none;
                animation: fadeIn 0.3s ease;
            }
            
            .page.active {
                display: block;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .sort-indicator {
                display: inline-block;
                margin-left: 5px;
                font-size: 0.8em;
                opacity: 0.7;
            }
            
            .action-buttons {
                display: flex;
                gap: 8px;
            }
            
            .settings-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 15px;
                background: var(--gray-light);
                border-radius: var(--border-radius);
                margin-bottom: 10px;
                transition: var(--transition);
            }
            
            .dark-mode .settings-item {
                background: #2d2d2d;
            }
            
            .settings-item:hover {
                background: rgba(67, 97, 238, 0.05);
            }
            
            .settings-item-content {
                flex: 1;
            }
            
            .settings-item-name {
                font-weight: 600;
                margin-bottom: 5px;
            }
            
            .settings-item-subtitle {
                font-size: 0.85rem;
                color: var(--gray-color);
            }
            
            .settings-section {
                margin-bottom: 40px;
            }
            
            .investment {
                color: var(--primary-color);
                font-weight: 600;
            }
            
            @media (max-width: 768px) {
                .action-buttons {
                    flex-direction: column;
                }
                
                .settings-item {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 10px;
                }
                
                .settings-item-content {
                    width: 100%;
                }
            }
        `;
        document.head.appendChild(style);
        
        console.log('Sistema de Finanças Pessoais v4.3 inicializado com sucesso!');
    } catch (error) {
        console.error('Erro na inicialização:', error);
        alert('Erro ao inicializar o sistema: ' + error.message);
    }
});