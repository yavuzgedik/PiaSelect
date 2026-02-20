class PiaSelect {
            constructor(selector, options = {}) {
                // Eğer string olarak css seçici geldiyse elementi bul, element geldiyse direkt kullan
                this.originalSelect = typeof selector === 'string' ? document.querySelector(selector) : selector;
                
                if (!this.originalSelect) {
                    console.error('PiaSelect: Element bulunamadı:', selector);
                    return;
                }

                if (this.originalSelect.dataset.piaInitialized) {
                    return; // Zaten başlatılmışsa tekrar kurma
                }

                // Dışarıdan erişim (reload vb. işlemler) için referans bağla
                this.originalSelect._piaSelect = this;

                // Varsayılan Metinler
                const defaultTexts = {
                    searchPlaceholder: 'Ara...',
                    selectAll: 'Tümünü Seç',
                    deselectAll: 'Seçimi Temizle',
                    emptySearch: 'Sonuç bulunamadı',
                    selectedCount: '{count} öğe seçildi'
                };

                // HTML Data özelliklerini (Data Attributes) oku
                const dataset = this.originalSelect.dataset;
                const dataOptions = {};
                const dataTexts = {};
                
                if (dataset.title !== undefined) dataOptions.title = dataset.title;
                if (dataset.searchable !== undefined) dataOptions.searchable = dataset.searchable === 'true';
                if (dataset.showActions !== undefined) dataOptions.showActions = dataset.showActions === 'true';
                if (dataset.maxVisible !== undefined) dataOptions.maxVisibleSelected = parseInt(dataset.maxVisible, 10);

                // Texts için Data Attribute Okumaları
                if (dataset.textSearchPlaceholder !== undefined) dataTexts.searchPlaceholder = dataset.textSearchPlaceholder;
                if (dataset.textSelectAll !== undefined) dataTexts.selectAll = dataset.textSelectAll;
                if (dataset.textDeselectAll !== undefined) dataTexts.deselectAll = dataset.textDeselectAll;
                if (dataset.textEmptySearch !== undefined) dataTexts.emptySearch = dataset.textEmptySearch;
                if (dataset.textSelectedCount !== undefined) dataTexts.selectedCount = dataset.textSelectedCount;

                // Varsayılan ayarlar, Data Attributes ve JS ayarlarını birleştir 
                // Öncelik Sırası: JS Options > HTML Data Attributes > Varsayılanlar
                this.options = Object.assign({
                    searchable: true,
                    showActions: this.originalSelect.hasAttribute('multiple'), // Multiple ise varsayılan true
                    title: 'Seçim Yapınız',
                    maxVisibleSelected: 2 // Butonda isimleri gösterilecek maksimum öğe sayısı
                }, dataOptions, options);

                // Texts objesini daha derin (deep) birleştir (Olası silinmeleri önlemek için)
                this.options.texts = Object.assign({}, defaultTexts, dataTexts, options.texts || {});

                this.isMultiple = this.originalSelect.hasAttribute('multiple');
                this.optionsList = [];
                
                // MutationObserver durumu (kendi güncellemelerimizde sonsuz döngüyü önlemek için)
                this.isReloading = false;
                
                this.injectCSS();
                this.init();
                this.setupObserver(); // Otomatik DOM değişiklik izleyicisi
            }

            // Gerekli CSS'i sayfaya sadece 1 kez ekler
            injectCSS() {
                if (document.getElementById('pia-select-styles')) return;

                const style = document.createElement('style');
                style.id = 'pia-select-styles';
                style.innerHTML = `
                    .pia-select-wrapper { position: relative; width: 100%; }
                    .pia-select-btn { text-align: left; display: flex; justify-content: space-between; align-items: center; width: 100%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
                    .pia-select-btn::after { margin-left: auto; }
                    .pia-dropdown { width: 100%; padding: 0.5rem; border-radius: 0.5rem; box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15); border: 1px solid rgba(0,0,0,.1); margin-top:0.25rem;}
                    .pia-options-list { max-height: 250px; overflow-y: auto; margin-bottom: 0; padding-left: 0; list-style: none; }
                    .pia-option-item { padding: 0.4rem 0.8rem; cursor: pointer; border-radius: 0.25rem; transition: background-color 0.15s; display: flex; align-items: center; font-size: 0.95rem; }
                    .pia-option-item:hover { background-color: #f8f9fa; }
                    .pia-option-item.selected { background-color: #e9ecef; color: #0d6efd; font-weight: 500; }
                    .pia-option-item.selected::after { content: ''; display: block; width: 12px; height: 12px; margin-left: auto; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='none' stroke='%230d6efd' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 8l4 4 8-8'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: center; }
                    .pia-search-box { margin-bottom: 0.5rem; position: sticky; top: 0; z-index: 2; background: white; }
                    .pia-actions { display: flex; justify-content: space-between; margin-bottom: 0.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid #dee2e6; }
                    .pia-actions button { padding: 0; font-size: 0.85rem; }
                    .pia-empty-state { padding: 1rem; text-align: center; color: #6c757d; font-size: 0.9rem; display: none; }
                    
                    /* Scrollbar Styling for Webkit */
                    .pia-options-list::-webkit-scrollbar { width: 6px; }
                    .pia-options-list::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
                    .pia-options-list::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 4px; }
                    .pia-options-list::-webkit-scrollbar-thumb:hover { background: #a8a8a8; }
                `;
                document.head.appendChild(style);
            }

            init() {
                // Orijinal select'i gizle
                this.originalSelect.style.display = 'none';
                this.originalSelect.dataset.piaInitialized = 'true';

                // Tarayıcının otomatik ilk elemanı seçmesini iptal et (Özel "selected" niteliği yoksa)
                if (!this.isMultiple) {
                    const hasSelectedAttr = Array.from(this.originalSelect.options).some(opt => opt.hasAttribute('selected'));
                    if (!hasSelectedAttr) {
                        this.originalSelect.selectedIndex = -1; // Hiçbir şeyi seçili yapma
                    }
                }

                // Ana sarmalayıcı (Wrapper)
                this.wrapper = document.createElement('div');
                this.wrapper.className = 'pia-select-wrapper dropdown';

                // Buton (Tetikleyici)
                this.button = document.createElement('button');
                this.button.className = 'form-select pia-select-btn bg-white text-dark';
                this.button.type = 'button';
                this.button.setAttribute('data-bs-toggle', 'dropdown');
                
                if (this.isMultiple) {
                    this.button.setAttribute('data-bs-auto-close', 'outside');
                }

                // Dropdown Menü
                this.dropdownMenu = document.createElement('div');
                this.dropdownMenu.className = 'dropdown-menu pia-dropdown';

                // Arama Kutusu
                if (this.options.searchable) {
                    const searchBox = document.createElement('div');
                    searchBox.className = 'pia-search-box';
                    this.searchInput = document.createElement('input');
                    this.searchInput.type = 'text';
                    this.searchInput.className = 'form-control form-control-sm';
                    this.searchInput.placeholder = this.options.texts.searchPlaceholder;
                    searchBox.appendChild(this.searchInput);
                    this.dropdownMenu.appendChild(searchBox);

                    // Arama eventi
                    this.searchInput.addEventListener('input', (e) => this.filterOptions(e.target.value));
                }

                // Aksiyon Butonları (Tümünü Seç / İptal)
                if (this.isMultiple && this.options.showActions) {
                    const actionsDiv = document.createElement('div');
                    actionsDiv.className = 'pia-actions';
                    
                    const selectAllBtn = document.createElement('button');
                    selectAllBtn.className = 'btn btn-link text-decoration-none';
                    selectAllBtn.type = 'button';
                    selectAllBtn.innerText = this.options.texts.selectAll;
                    selectAllBtn.addEventListener('click', () => this.selectAll(true));

                    const deselectAllBtn = document.createElement('button');
                    deselectAllBtn.className = 'btn btn-link text-decoration-none text-danger';
                    deselectAllBtn.type = 'button';
                    deselectAllBtn.innerText = this.options.texts.deselectAll;
                    deselectAllBtn.addEventListener('click', () => this.selectAll(false));

                    actionsDiv.appendChild(selectAllBtn);
                    actionsDiv.appendChild(deselectAllBtn);
                    this.dropdownMenu.appendChild(actionsDiv);
                }

                // Seçenekler Listesi (UL)
                this.ul = document.createElement('ul');
                this.ul.className = 'pia-options-list';
                
                // Boş Durum
                this.emptyState = document.createElement('div');
                this.emptyState.className = 'pia-empty-state';
                this.emptyState.innerText = this.options.texts.emptySearch;

                this.dropdownMenu.appendChild(this.ul);
                this.dropdownMenu.appendChild(this.emptyState);

                // Elemanları dom'a ekle
                this.wrapper.appendChild(this.button);
                this.wrapper.appendChild(this.dropdownMenu);
                this.originalSelect.parentNode.insertBefore(this.wrapper, this.originalSelect.nextSibling);

                // Seçenekleri Oku ve Oluştur
                this.buildOptions();
                this.updateButtonText();

                // Dropdown açıldığında arama kutusuna odaklan
                this.wrapper.addEventListener('shown.bs.dropdown', () => {
                    if (this.searchInput) {
                        this.searchInput.focus();
                    }
                });
                
                // Menü kapandığında aramayı sıfırla
                this.wrapper.addEventListener('hidden.bs.dropdown', () => {
                   if(this.searchInput) {
                       this.searchInput.value = '';
                       this.filterOptions('');
                   }
                });

                // Orijinal select'in değişmesini dinle (dışarıdan js ile değiştirilirse diye)
                this.originalSelect.addEventListener('change', () => {
                    // Kendi tetiklediğimiz change eventlerinde döngüye girmemesi için
                    if(this.isReloading) return;
                    this.syncFromOriginal();
                });
            }

            // Orijinal Select'teki DOM değişikliklerini otomatik izler
            setupObserver() {
                this.observer = new MutationObserver((mutations) => {
                    if (this.isReloading) return; // Kendi yaptığımız değişiklikleri izleme
                    this.reload(); // Option eklendiğinde/silindiğinde otomatik yenile
                });

                // Option'ların eklenmesi/silinmesi, textlerinin veya attribute'larının değişmesini izle
                this.observer.observe(this.originalSelect, { 
                    childList: true, 
                    subtree: true,
                    attributes: true, 
                    attributeFilter: ['selected', 'disabled'] 
                });
            }

            buildOptions() {
                this.ul.innerHTML = '';
                this.optionsList = [];
                
                Array.from(this.originalSelect.options).forEach((opt, index) => {
                    // Boş option değerlerini (placeholder için olanları) atla
                    if(opt.value === '' && !this.isMultiple) {
                        if(opt.text && this.options.title === 'Seçim Yapınız') {
                            this.options.title = opt.text; // Title'ı ilk boş option'dan al
                        }
                        return;
                    }

                    const li = document.createElement('li');
                    li.className = `pia-option-item ${opt.selected ? 'selected' : ''}`;
                    li.innerText = opt.text;
                    li.dataset.value = opt.value;
                    li.dataset.index = index;

                    li.addEventListener('click', (e) => {
                        this.handleOptionClick(opt, li);
                    });

                    this.ul.appendChild(li);
                    this.optionsList.push({ element: li, text: opt.text.toLowerCase() });
                });
            }

            handleOptionClick(originalOption, liElement) {
                this.isReloading = true; // İzleyiciyi geçici sustur

                if (this.isMultiple) {
                    originalOption.selected = !originalOption.selected;
                    liElement.classList.toggle('selected');
                } else {
                    // Tekli seçimde diğerlerini temizle
                    Array.from(this.originalSelect.options).forEach(opt => opt.selected = false);
                    this.optionsList.forEach(item => item.element.classList.remove('selected'));
                    
                    originalOption.selected = true;
                    liElement.classList.add('selected');
                    
                    // Tekli seçimde menüyü kapat (Bootstrap metodu ile)
                    const bsDropdown = bootstrap.Dropdown.getInstance(this.button);
                    if (bsDropdown) bsDropdown.hide();
                }

                // Orijinal select için change eventi tetikle
                this.triggerChange();
                this.updateButtonText();

                // Küçük bir gecikme ile izleyici engelini kaldır
                setTimeout(() => { this.isReloading = false; }, 10);
            }

            selectAll(select) {
                this.isReloading = true;

                Array.from(this.originalSelect.options).forEach((opt) => {
                    if (opt.value !== '') opt.selected = select;
                });
                
                this.optionsList.forEach(item => {
                    if (select) {
                        item.element.classList.add('selected');
                    } else {
                        item.element.classList.remove('selected');
                    }
                });

                this.triggerChange();
                this.updateButtonText();

                setTimeout(() => { this.isReloading = false; }, 10);
            }

            filterOptions(query) {
                query = query.toLowerCase().trim();
                let visibleCount = 0;

                this.optionsList.forEach(item => {
                    if (item.text.includes(query)) {
                        item.element.style.display = 'flex';
                        visibleCount++;
                    } else {
                        item.element.style.display = 'none';
                    }
                });

                this.emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
            }

            updateButtonText() {
                const selectedOptions = Array.from(this.originalSelect.selectedOptions).filter(opt => opt.value !== '');
                
                if (selectedOptions.length === 0) {
                    this.button.innerHTML = `<span class="text-muted">${this.options.title}</span>`;
                } else if (this.isMultiple) {
                    if (selectedOptions.length <= this.options.maxVisibleSelected) {
                        const texts = selectedOptions.map(opt => opt.text).join(', ');
                        this.button.innerText = texts;
                    } else {
                        const text = this.options.texts.selectedCount.replace('{count}', selectedOptions.length);
                        this.button.innerHTML = `<span class="fw-bold text-primary">${text}</span>`;
                    }
                } else {
                    this.button.innerText = selectedOptions[0].text;
                }
            }

            syncFromOriginal() {
                Array.from(this.originalSelect.options).forEach((opt, index) => {
                    const li = this.ul.querySelector(`[data-index="${index}"]`);
                    if(li) {
                        if(opt.selected) li.classList.add('selected');
                        else li.classList.remove('selected');
                    }
                });
                this.updateButtonText();
            }

            triggerChange() {
                const event = new Event('change', { bubbles: true });
                this.originalSelect.dispatchEvent(event);
            }

            // Orijinal select içindeki option'lar Javascript ile sonradan değiştirildiğinde,
            // PiaSelect arayüzünü güncellemek için kullanılır. (Artık MutationObserver sayesinde manuel kullanıma gerek yok)
            reload() {
                this.isReloading = true; // Döngüleri engellemek için
                
                this.buildOptions();
                this.updateButtonText();
                
                if (this.searchInput) {
                    this.searchInput.value = '';
                    this.filterOptions('');
                }

                setTimeout(() => { this.isReloading = false; }, 10);
            }

            // Eklentiyi tamamen yok edip, orijinal select'i geri getirmek için (İsteğe bağlı)
            destroy() {
                if (this.observer) this.observer.disconnect();
                this.wrapper.remove();
                this.originalSelect.style.display = '';
                delete this.originalSelect.dataset.piaInitialized;
                delete this.originalSelect._piaSelect;
            }
        }

        // ==========================================
        // OTOMATİK BAŞLATMA FONKSİYONU
        // ==========================================
        document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('select.PiaSelect, select.pia-select').forEach(el => {
                new PiaSelect(el);
            });
        });