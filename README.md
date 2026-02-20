# PiaSelect.js

Bootstrap 5 uyumlu, harici CSS gerektirmeyen, mobil dostu, hafif ve esnek "Select" (Seçim Kutusu) eklentisi.

## Özellikler

* 📦 **Sıfır Bağımlılık (CSS için):** Kendi stilini otomatik oluşturur. Sadece Bootstrap 5 gerektirir.
* 📱 **Mobil Dostu:** Bootstrap'in standart dropdown yapısını kullandığı için mobil cihazlarda ekran dışına taşmaz ve dokunmatik ekranlara tam uyumludur.
* 🔍 **Hızlı Arama:** Çoklu veya tekli seçimlerde liste içinde anında metin filtreleme.
* ✔️ **Gelişmiş Çoklu Seçim (Multiple):** Form yapısındaki `<select multiple>` etiketini algılar, seçim yapıldığında menü kapanmaz.
* ⚡ **Data-Attributes Desteği:** JavaScript kodu yazmadan doğrudan HTML etiketleri ile yönetilebilir.
* 🔄 **MutationObserver ile Otomatik Algılama:** AJAX veya JS ile `select` içine sonradan eklenen/silinen verileri otomatik fark eder ve kendini yeniler (`reload` yazmanıza gerek kalmaz).

## Kurulum

PiaSelect, özel bir CSS dosyasına ihtiyaç duymaz. Projenizde **Bootstrap 5 (CSS ve JS Bundle)** yüklü olması yeterlidir. Script dosyasını sayfanıza dahil edin:

```html
<!-- Bootstrap 5 -->
<link href="[https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css](https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css)" rel="stylesheet">
<script src="[https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js](https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js)"></script>

<!-- PiaSelect -->
<script src="PiaSelect.js"></script>
```

## Kullanım

**1. Otomatik Başlatma (Sıfır JS Kodu)**

Select etiketinize `PiaSelect` sınıfını eklemeniz, eklentinin otomatik olarak çalışması için yeterlidir. Tüm ayarları `data-*` nitelikleri ile yapabilirsiniz.

```html
<select class="form-select PiaSelect" multiple 
    data-title="Sebzeleri Seçiniz" 
    data-searchable="true" 
    data-show-actions="true" 
    data-max-visible="2">
    <option value="domates">Domates</option>
    <option value="biber">Biber</option>
    <option value="patlican">Patlıcan</option>
</select>
```

**2. JavaScript ile Başlatma**

İsterseniz HTML tarafını temiz bırakıp tüm ayarları JavaScript üzerinden yapılandırabilirsiniz:

```html
<select id="mySelect" class="form-select" multiple>
    <option value="1">Seçenek 1</option>
    <option value="2">Seçenek 2</option>
</select>

<script>
    new PiaSelect('#mySelect', {
        searchable: true,          // Arama kutusunu açar
        showActions: true,         // Tümünü Seç / Temizle butonlarını açar
        title: 'Lütfen Seçiniz',   // Varsayılan boş metin
        maxVisibleSelected: 3,     // Butonda maksimum kaç eleman ismi görünecek
        texts: {
            searchPlaceholder: 'Ara...',
            selectAll: 'Tümünü Seç',
            deselectAll: 'Seçimi Temizle',
            emptySearch: 'Sonuç bulunamadı',
            selectedCount: '{count} öğe seçildi' // 3'ten fazla seçilirse çıkacak metin
        }
    });
</script>
```

## Dinamik Veri Ekleme (AJAX Uyumlu)

PiaSelect, içerisinde **MutationObserver** barındırır. AJAX ile veya saf JavaScript ile orijinal `select` etiketinize yeni `<option>` eklerseniz, hiçbir ekstra tetikleyici koda ihtiyaç duymadan arayüz anında güncellenir.

```html
// Standart şekilde option ekleyin
const selectBox = document.getElementById('mySelect');
selectBox.insertAdjacentHTML('beforeend', '<option value="yeni">Yeni Seçenek</option>');

// PiaSelect bu değişikliği görecek ve arayüzü saniyesinde güncelleyecektir.
```

## Lisans

Bu proje MIT Lisansı ile lisanslanmıştır. Dilediğiniz gibi kullanabilir, değiştirebilir ve dağıtabilirsiniz.

