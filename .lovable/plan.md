

## Upgrade Trace Boş Görünme Hatası Düzeltmesi

### Sorun
Garage'da yapılan upgrade'ler (Block HP, Star pip, Brew vb.) doğru çalışıyor ve coin düşüyor, ancak Run Summary telemetrisinde "No upgrades purchased" yazıyor. Bunun nedeni: `clearPurchaseLog()` fonksiyonu hem run başında hem de run summary kapatılınca çağrılıyor. Run başındaki çağrı, Garage'da yapılan tüm upgrade log'unu siliyor.

### Akış (Mevcut - Hatalı)
```text
Garage'da upgrade al --> log'a yazilir
Play'e bas --> startRun() --> clearPurchaseLog() --> LOG SILINDI!
Run biter --> getPurchaseLog() --> bos array --> "No upgrades purchased"
Run Summary kapat --> clearPurchaseLog() (tekrar, gereksiz)
```

### Akış (Düzeltilmiş)
```text
Garage'da upgrade al --> log'a yazilir
Play'e bas --> startRun() --> log KORUNUR
Run biter --> getPurchaseLog() --> upgrade'ler gorulur
Run Summary kapat --> clearPurchaseLog() --> log temizlenir
```

### Teknik Detay

**Dosya:** `src/game/CoffeeRushGame.tsx`

**Degisiklik:** Satir 336'daki `clearPurchaseLog()` cagrisini kaldir. Log zaten satir 1946'da Run Summary kapatilinca temizleniyor, bu yeterli.

Mevcut (satir 336):
```text
clearPurchaseLog();
```
Bu satir silinecek (veya yoruma alinacak).

### Etki
- Garage'da yapilan tum upgrade'ler Run Summary'de gorunecek
- Log, Run Summary kapatildiginda temizlenmeye devam edecek
- Oyun mekanikleri, spawn degerleri, Gate HP degismez
- Sadece tek bir satir kaldirilacak

